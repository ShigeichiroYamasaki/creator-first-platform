<script setup lang="ts">
import { startAuthentication, startRegistration } from '@simplewebauthn/browser'
import { computed, onMounted, ref } from 'vue'
import { createWalletClient, custom, getAddress, type Address, type EIP1193Provider } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { AMOY_CHAIN_ID, switchProviderToAmoy } from './testnet-user-demo.js'

type TestProfile = { registered: true; testUserId: string; displayName: string }
type BindingTransaction = {
  bindingId: string
  state: string
  csrfToken: string
  expiresAt: string
  mockJpki: { challenge: string; mode: string; disclosure: string }
}
type TrustStatus = {
  mode: string
  rpId: string
  expectedOrigin: string
  chainId: number
  passkeyAuthenticated: boolean
  binding: null | {
    bindingId: string
    state: string
    assuranceLevel: string
    walletAddress?: Address
    passkeyRegistered: boolean
    updatedAt: string
  }
}

const API_BASE = '/api'
const PROFILE_KEY = 'creator-first-testnet-test-user-v2'
const localHost = typeof window !== 'undefined' && ['127.0.0.1', 'localhost'].includes(window.location.hostname)
const enabled = localHost || import.meta.env.VITE_ACCOUNT_TRUST_DEMO_ENABLED === 'true'
const status = ref<TrustStatus>()
const transaction = ref<BindingTransaction>()
const busy = ref('')
const message = ref('接続状態を確認しています。')
const errorMessage = ref('')
const mockConsent = ref(false)
const testOnlyAcknowledged = ref(false)

const currentState = computed(() => transaction.value?.state ?? status.value?.binding?.state ?? '未開始')
const isActive = computed(() => currentState.value === 'ACTIVE')
const passkeySupported = computed(() => typeof window !== 'undefined' && Boolean(window.PublicKeyCredential))

function profile(): TestProfile | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(PROFILE_KEY) ?? 'null')
    return value?.registered && value?.testUserId && value?.displayName ? value : undefined
  } catch {
    return undefined
  }
}

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'same-origin',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers }
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(body.message ?? body.code ?? `HTTP ${response.status}`)
  return body
}

async function run(action: string, operation: () => Promise<void>) {
  busy.value = action
  errorMessage.value = ''
  try {
    await operation()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '操作に失敗しました。'
  } finally {
    busy.value = ''
  }
}

async function refreshStatus() {
  if (!enabled) {
    message.value = 'GitHub Pagesは文書と入口のみです。ローカル同一オリジン環境またはCFP専用HTTPSドメインで実行してください。'
    return
  }
  status.value = await request('/v1/account-trust/status')
  message.value = status.value.binding
    ? `結合状態を取得しました: ${status.value.binding.state}`
    : 'テストユーザ登録後にアカウント結合を開始できます。'
}

async function ensureGatewayUser(value: TestProfile) {
  const current = await request('/v1/demo/user')
  if (current.registered) return
  await request('/v1/demo/users', {
    method: 'POST',
    body: JSON.stringify({
      displayName: value.displayName,
      termsVersion: 'demo-terms-v1',
      privacyNoticeVersion: 'demo-privacy-v1',
      acceptedTerms: true,
      acceptedPrivacyNotice: true,
      acknowledgedTestOnly: true,
      idempotencyKey: `account-trust-${value.testUserId}`
    })
  })
}

function beginBinding() {
  return run('begin', async () => {
    const value = profile()
    if (!value) throw new Error('先にこのページ上部でテストユーザを登録してください。')
    await ensureGatewayUser(value)
    transaction.value = await request('/v1/account-trust/bindings', { method: 'POST' })
    message.value = '追加確認を開始しました。次の確認へ進んでください。'
  })
}

function assertMockJpki() {
  return run('jpki', async () => {
    const value = transaction.value
    if (!value || !mockConsent.value || !testOnlyAcknowledged.value) {
      throw new Error('本人確認ではないテストであることと、同じ手続きへの関連付けを確認してください。')
    }
    const result = await request(`/v1/account-trust/bindings/${value.bindingId}/mock-jpki`, {
      method: 'POST',
      body: JSON.stringify({
        csrfToken: value.csrfToken,
        challenge: value.mockJpki.challenge,
        acknowledgedTestOnly: true,
        consentToBinding: true
      })
    })
    value.state = result.state
    message.value = 'テスト用のカード確認結果を同じ手続きへ関連付けました。'
  })
}

function registerPasskey() {
  return run('passkey', async () => {
    const value = transaction.value
    if (!value) throw new Error('追加確認が開始されていません。')
    if (!passkeySupported.value) throw new Error('このブラウザは端末の画面ロックや指紋を使う認証に対応していません。')
    const optionsJSON = await request(`/v1/account-trust/bindings/${value.bindingId}/passkeys/registration/options`, {
      method: 'POST', body: JSON.stringify({ csrfToken: value.csrfToken })
    })
    const response = await startRegistration({ optionsJSON })
    const result = await request(`/v1/account-trust/bindings/${value.bindingId}/passkeys/registration/verify`, {
      method: 'POST', body: JSON.stringify({ csrfToken: value.csrfToken, response })
    })
    value.state = result.state
    message.value = 'パスキーのorigin、RP ID、challenge、署名、ユーザ検証をサーバで確認しました。'
  })
}

function bindWallet() {
  return run('wallet', async () => {
    const value = transaction.value
    if (!value) throw new Error('追加確認が開始されていません。')
    const provider = (window as Window & { ethereum?: EIP1193Provider }).ethereum
    if (!provider) throw new Error('財布アプリが見つかりません。MetaMaskを準備してください。')
    await switchProviderToAmoy(provider)
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    const walletAddress = getAddress(accounts[0])
    const walletClient = createWalletClient({ account: walletAddress, chain: polygonAmoy, transport: custom(provider) })
    const intent = await request(`/v1/account-trust/bindings/${value.bindingId}/wallet/options`, {
      method: 'POST',
      body: JSON.stringify({ csrfToken: value.csrfToken, walletAddress, chainId: AMOY_CHAIN_ID })
    })
    const signature = await walletClient.signTypedData(intent.typedData)
    const result = await request(`/v1/account-trust/bindings/${value.bindingId}/wallet/verify`, {
      method: 'POST', body: JSON.stringify({ csrfToken: value.csrfToken, signature })
    })
    value.state = result.state
    await refreshStatus()
    message.value = `パスキー認証済みアカウントと ${result.walletAddress} を結合しました。資金移動はありません。`
  })
}

function authenticatePasskey() {
  return run('authenticate', async () => {
    const optionsJSON = await request('/v1/account-trust/passkeys/authentication/options', { method: 'POST' })
    const response = await startAuthentication({ optionsJSON })
    await request('/v1/account-trust/passkeys/authentication/verify', {
      method: 'POST', body: JSON.stringify({ response })
    })
    await refreshStatus()
    message.value = '登録済みパスキーで通常認証しました。'
  })
}

onMounted(() => run('status', refreshStatus))
</script>

<template>
  <section class="trust-demo" aria-labelledby="account-trust-title">
    <div class="trust-demo__heading">
      <div>
        <p class="trust-demo__eyebrow">本人確認ではない追加実験</p>
        <h2 id="account-trust-title">カード・端末認証・財布アプリを結び付ける実験</h2>
      </div>
      <span class="trust-demo__state">{{ currentState }}</span>
    </div>

    <p>{{ message }}</p>
    <p v-if="errorMessage" class="trust-demo__error" role="alert">{{ errorMessage }}</p>
    <div v-if="!enabled" class="trust-demo__notice">
      この追加実験は公開ページでは操作できません。通常の音楽体験には必要ありません。
    </div>

    <ol class="trust-demo__steps">
      <li :class="{ complete: currentState !== '未開始' }">
        <strong>追加確認を始める</strong>
        <span>この画面で登録した仮の名前に、一回限りの確認手続きを用意します。</span>
        <button :disabled="!enabled || Boolean(busy) || isActive" @click="beginBinding">開始</button>
      </li>
      <li :class="{ complete: !['未開始', 'CREATED'].includes(currentState) }">
        <strong>テスト用のカード確認</strong>
        <span>本物のマイナンバーカードや個人情報を使わず、確認結果の受け渡しだけを試します。</span>
        <label><input v-model="testOnlyAcknowledged" type="checkbox"> 本人確認ではないテスト結果と理解した</label>
        <label><input v-model="mockConsent" type="checkbox"> 同じ結合処理への関連付けに同意する</label>
        <button :disabled="currentState !== 'CREATED' || Boolean(busy)" @click="assertMockJpki">テスト結果を確認</button>
      </li>
      <li :class="{ complete: ['PASSKEY_REGISTERED', 'ACTIVE'].includes(currentState) }">
        <strong>端末の画面ロックや指紋で確認</strong>
        <span>パソコンやスマートフォンの安全な認証機能を使います。指紋などの情報は外部へ送りません。</span>
        <button :disabled="currentState !== 'JPKI_ASSERTED' || Boolean(busy)" @click="registerPasskey">端末の認証を登録</button>
      </li>
      <li :class="{ complete: isActive }">
        <strong>財布アプリを確認</strong>
        <span>練習用ネットワークで、本人がこの財布アプリを使う意思だけを確認します。残高は移動しません。</span>
        <button :disabled="currentState !== 'PASSKEY_REGISTERED' || Boolean(busy)" @click="bindWallet">財布アプリを結び付ける</button>
      </li>
    </ol>

    <div v-if="isActive" class="trust-demo__active">
      <strong>結合完了</strong>
      <span>カード、端末の認証、財布アプリのテスト用の関連付けが完了しました。</span>
      <span>接続した財布: {{ status?.binding?.walletAddress }}</span>
      <button :disabled="Boolean(busy)" @click="authenticatePasskey">端末の認証でもう一度確認</button>
    </div>
  </section>
</template>

<style scoped>
.trust-demo { margin: 2rem 0; padding: 1.25rem; border: 1px solid var(--vp-c-divider); border-radius: 16px; background: var(--vp-c-bg-soft); }
.trust-demo__heading { display: flex; gap: 1rem; align-items: start; justify-content: space-between; }
.trust-demo__heading h2 { margin: 0; border: 0; padding: 0; }
.trust-demo__eyebrow { margin: 0 0 .35rem; color: var(--vp-c-warning-1); font-weight: 700; font-size: .8rem; letter-spacing: .08em; }
.trust-demo__state { padding: .3rem .65rem; border-radius: 999px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; white-space: nowrap; }
.trust-demo__steps { display: grid; gap: .8rem; padding: 0; list-style: none; counter-reset: trust-step; }
.trust-demo__steps li { display: grid; gap: .55rem; padding: 1rem; border-left: 4px solid var(--vp-c-divider); background: var(--vp-c-bg); counter-increment: trust-step; }
.trust-demo__steps li strong::before { content: counter(trust-step) ". "; }
.trust-demo__steps li.complete { border-left-color: var(--vp-c-green-1); }
.trust-demo button { width: fit-content; padding: .55rem .9rem; border: 0; border-radius: 8px; background: var(--vp-c-brand-1); color: white; font-weight: 700; cursor: pointer; }
.trust-demo button:disabled { cursor: not-allowed; opacity: .45; }
.trust-demo label { display: flex; gap: .45rem; align-items: center; font-size: .9rem; }
.trust-demo__error { color: var(--vp-c-danger-1); font-weight: 700; }
.trust-demo__notice { padding: .8rem; border: 1px solid var(--vp-c-warning-2); border-radius: 8px; }
.trust-demo__active { display: grid; gap: .35rem; padding: 1rem; border: 1px solid var(--vp-c-green-2); border-radius: 10px; }
@media (max-width: 640px) { .trust-demo__heading { flex-direction: column; } }
</style>
