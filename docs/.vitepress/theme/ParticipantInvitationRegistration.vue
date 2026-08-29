<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createWalletClient, custom, getAddress } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { AMOY_CHAIN_ID, switchProviderToAmoy } from './testnet-user-demo.js'

type Invitation = {
  invitationId: string
  displayName: string
  roles: number
  state: 'CREATED' | 'SENT' | 'CLAIMED' | 'REVOKED'
  expiresAt: string
  expired: boolean
}

const USER_ROLE = 1
const CREATOR_ROLE = 2
const token = ref('')
const invitation = ref<Invitation | null>(null)
const wallet = ref('')
const acceptedTerms = ref(false)
const acknowledgedTestOnly = ref(false)
const message = ref('')
const error = ref('')
const busy = ref(false)

const isClaimed = computed(() => invitation.value?.state === 'CLAIMED')
const isUnavailable = computed(() => Boolean(invitation.value?.expired || invitation.value?.state === 'REVOKED'))
const hasUserRole = computed(() => Boolean((invitation.value?.roles ?? 0) & USER_ROLE))
const hasCreatorRole = computed(() => Boolean((invitation.value?.roles ?? 0) & CREATOR_ROLE))
const roleLabel = computed(() => hasUserRole.value && hasCreatorRole.value
  ? 'ユーザ／音楽クリエーター'
  : hasCreatorRole.value ? '音楽クリエーター' : 'ユーザ')
const stateLabel = computed(() => {
  if (invitation.value?.expired) return '期限切れ'
  return ({ CREATED: '準備中', SENT: '受付中', CLAIMED: '本人登録済み', REVOKED: '無効' } as const)[invitation.value?.state ?? 'CREATED']
})
const nextActionTitle = computed(() => {
  if (!token.value) return '招待メールを開く'
  if (!invitation.value) return '招待を確認中'
  if (isUnavailable.value) return '運営に連絡する'
  if (isClaimed.value) return '登録できました'
  if (!wallet.value) return '財布アプリをつなぐ'
  return '内容を確認して登録する'
})
const nextActionIcon = computed(() => {
  if (!token.value) return '✉️'
  if (!invitation.value) return '🔎'
  if (isUnavailable.value) return '⚠️'
  if (isClaimed.value) return '✅'
  if (!wallet.value) return '🦊'
  return '✍️'
})
const nextAction = computed(() => {
  if (!token.value) return '運営から届いた招待メールのリンクを開いてください。'
  if (!invitation.value) return '招待内容を確認しています。'
  if (isUnavailable.value) return 'この招待は利用できません。運営へお問い合わせください。'
  if (isClaimed.value) return '本人登録は完了しています。運営の処理を待ってください。'
  if (!wallet.value) return 'オレンジ色のキツネが目印の財布アプリを開きます。'
  return '2項目を確認し、本人登録を完了してください。'
})

async function gateway(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers }
  })
  const text = await response.text()
  let body: Record<string, unknown> = {}
  try { body = text ? JSON.parse(text) : {} } catch { /* handled below */ }
  if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : `招待サービスへ接続できません（HTTP ${response.status}）`)
  return body
}

async function inspect() {
  error.value = ''
  if (!token.value) return
  try {
    invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}`) as Invitation
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '招待を確認できませんでした'
  }
}

async function connectAndVerifyWallet() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const ethereum = (window as unknown as { ethereum?: { request: (value: unknown) => Promise<unknown> } }).ethereum
    if (!ethereum) throw new Error('財布アプリ（MetaMask）が見つかりません。インストールしてから、もう一度お試しください。')
    await switchProviderToAmoy(ethereum)
    const chainId = await ethereum.request({ method: 'eth_chainId' })
    if (Number(chainId) !== AMOY_CHAIN_ID) throw new Error('財布アプリを練習用ネットワーク（Polygon Amoy）へ切り替えてください。')
    const client = createWalletClient({ chain: polygonAmoy, transport: custom(ethereum) })
    const [address] = await client.requestAddresses()
    wallet.value = getAddress(address)
    const challenge = await gateway('/v1/auth/siwe/nonce', {
      method: 'POST',
      body: JSON.stringify({ address: wallet.value, chainId: AMOY_CHAIN_ID })
    })
    const signature = await client.signMessage({
      account: wallet.value as `0x${string}`,
      message: String(challenge.message)
    })
    await gateway('/v1/auth/siwe/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.challengeId, message: challenge.message, signature })
    })
    message.value = 'ウォレットを確認しました。'
  } catch (cause) {
    wallet.value = ''
    error.value = cause instanceof Error ? cause.message : 'ウォレットを確認できませんでした'
  } finally {
    busy.value = false
  }
}

async function claim() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}/claim`, {
      method: 'POST',
      body: JSON.stringify({ acceptedTerms: acceptedTerms.value, acknowledgedTestOnly: acknowledgedTestOnly.value })
    }) as Invitation
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '本人登録を完了できませんでした'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  token.value = new URLSearchParams(location.hash.slice(1)).get('invite') ?? ''
  inspect()
})
</script>

<template>
  <section class="registration" aria-live="polite">
    <header class="hero-card">
      <span class="eyebrow">{{ invitation?.displayName ? `${invitation.displayName} さんの次の操作` : '公開実験への参加' }}</span>
      <div class="hero-action">
        <span class="hero-icon" aria-hidden="true">{{ nextActionIcon }}</span>
        <div>
          <h2>{{ nextActionTitle }}</h2>
          <p>{{ nextAction }}</p>
        </div>
      </div>
    </header>

    <div v-if="!token" class="action-card notice">
      <span class="action-icon mail-icon" aria-hidden="true">✉️</span>
      <div>
        <h3>招待メールを確認</h3>
        <p>メールにある「参加登録を始める」ボタンを押してください。このページを直接開いただけでは登録できません。</p>
      </div>
    </div>

    <template v-if="invitation">
      <div class="invite-summary">
        <span><i aria-hidden="true">{{ hasCreatorRole ? '🎵' : '🎧' }}</i>{{ roleLabel }}</span>
        <span :class="{ bad: isUnavailable }"><i aria-hidden="true">📋</i>{{ stateLabel }}</span>
        <span><i aria-hidden="true">📅</i>{{ new Date(invitation.expiresAt).toLocaleDateString('ja-JP') }}まで</span>
      </div>

      <ol class="progress" aria-label="登録の進捗">
        <li class="done"><b aria-hidden="true">✉</b><span><em>1</em> 招待</span></li>
        <li :class="{ done: Boolean(wallet) || isClaimed, current: !wallet && !isClaimed && !isUnavailable }"><b aria-hidden="true">🦊</b><span><em>2</em> 財布アプリ</span></li>
        <li :class="{ done: isClaimed, current: Boolean(wallet) && !isClaimed && !isUnavailable }"><b aria-hidden="true">✓</b><span><em>3</em> 登録</span></li>
      </ol>

      <div v-if="isUnavailable" class="action-card error-card">
        <span class="action-icon" aria-hidden="true">⚠️</span>
        <div><h3>登録できません</h3><p>招待が期限切れまたは無効です。運営へ新しい招待を依頼してください。</p></div>
      </div>

      <div v-else-if="!wallet && !isClaimed" class="action-card current-card">
        <span class="action-icon fox-icon" aria-hidden="true">🦊</span>
        <div>
          <h3>財布アプリをつなぐ</h3>
          <p>オレンジ色のキツネが目印のアプリを開きます。練習用ネットワークへの切替は自動で案内します。</p>
          <div class="term-chips" aria-label="使用する技術">
            <span><i aria-hidden="true">🦊</i> 財布アプリ <small>MetaMask</small></span>
            <span><i aria-hidden="true">🧪</i> 練習用ネットワーク <small>Polygon Amoy</small></span>
          </div>
          <button class="primary-button" type="button" :disabled="busy" @click="connectAndVerifyWallet">
            <span aria-hidden="true">🦊</span>
            <span>{{ busy ? '確認しています…' : '財布アプリを開く' }}<small v-if="!busy">MetaMask</small></span>
          </button>
          <p class="no-payment"><span aria-hidden="true">🛡️</span> この操作では支払いは発生しません</p>
        </div>
      </div>

      <div v-else-if="!isClaimed" class="action-card current-card">
        <span class="action-icon" aria-hidden="true">✍️</span>
        <div>
          <h3>内容を確認して登録</h3>
          <p class="wallet"><span aria-hidden="true">✅</span> 財布アプリを確認しました <code>{{ wallet }}</code></p>
          <label class="check-row"><input v-model="acceptedTerms" type="checkbox" /><span aria-hidden="true">📄</span><span>公開実験の利用条件に同意します</span></label>
          <label class="check-row"><input v-model="acknowledgedTestOnly" type="checkbox" /><span aria-hidden="true">🧪</span><span>練習用で、実際のお金ではないことを確認します</span></label>
          <button class="primary-button" type="button" :disabled="!acceptedTerms || !acknowledgedTestOnly || busy" @click="claim">
            <span aria-hidden="true">✓</span><span>{{ busy ? '登録しています…' : 'この内容で登録する' }}</span>
          </button>
        </div>
      </div>

      <div v-else class="action-card success-card">
        <span class="action-icon success-icon" aria-hidden="true">✅</span>
        <div>
          <h3>登録できました</h3>
          <p><span aria-hidden="true">⏳</span> 現在は運営の処理待ちです。実験参加者による操作はありません。</p>
          <ul class="roles">
            <li v-if="hasUserRole"><b><i aria-hidden="true">🎧</i> ユーザ向け参加</b><span>運営承認後に利用できます</span></li>
            <li v-if="hasCreatorRole"><b><i aria-hidden="true">🎵</i> 音楽クリエーター向け参加</b><span>運営承認後に利用できます</span></li>
          </ul>
        </div>
      </div>

      <details class="safety">
        <summary><span aria-hidden="true">🛡️</span> 安全に関する注意</summary>
        <ul>
          <li>この操作で送金、トークン承認、課金は行いません。</li>
          <li>シードフレーズや秘密鍵を入力することはありません。</li>
          <li>メールアドレスは公開ページやブロックチェーンに記録しません。</li>
        </ul>
      </details>
    </template>

    <p v-if="message" class="feedback success-message">{{ message }}</p>
    <div v-if="error" class="feedback error-message">
      <span>{{ error }}</span>
      <button v-if="token && !invitation" type="button" @click="inspect">再試行</button>
    </div>
  </section>
</template>

<style scoped>
.registration {
  display: grid;
  gap: 1rem;
  max-width: 760px;
  margin: 1.5rem auto;
}

.hero-card,
.action-card,
.invite-summary,
.safety,
.feedback {
  border: 1px solid var(--vp-c-divider);
  border-radius: 16px;
  background: var(--vp-c-bg-soft);
}

.hero-card {
  padding: 1.25rem 1.4rem;
  border: 2px solid var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .06);
}

.eyebrow {
  color: var(--vp-c-brand-1);
  font-size: .8rem;
  font-weight: 800;
  letter-spacing: .04em;
}

.hero-action {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: .55rem;
}

.hero-icon,
.action-icon {
  display: grid;
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  place-items: center;
  border-radius: 16px;
  background: var(--vp-c-bg);
  box-shadow: 0 4px 12px rgba(0, 0, 0, .08);
  font-size: 2rem;
}

.hero-card h2,
.action-card h3 {
  margin: 0 0 .3rem;
  padding: 0;
  border: 0;
}

.hero-card h2 { font-size: 1.45rem; }
.hero-card p,
.action-card p { margin: 0; }
.hero-card p { font-size: 1rem; font-weight: 600; }

.invite-summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: .55rem 1rem;
  padding: .7rem 1rem;
  color: var(--vp-c-text-2);
  font-size: .9rem;
}

.invite-summary span {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
}

.invite-summary i,
.roles i { font-style: normal; }
.bad { color: var(--vp-c-danger-1); font-weight: 700; }

.progress {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  margin: .2rem 0;
  padding: 0;
  list-style: none;
}

.progress li {
  position: relative;
  display: grid;
  justify-items: center;
  gap: .35rem;
  color: var(--vp-c-text-3);
  font-size: .8rem;
}

.progress li:not(:last-child)::after {
  position: absolute;
  top: 20px;
  left: calc(50% + 25px);
  width: calc(100% - 50px);
  height: 3px;
  background: var(--vp-c-divider);
  content: "";
}

.progress b {
  display: grid;
  z-index: 1;
  width: 42px;
  height: 42px;
  place-items: center;
  border: 2px solid var(--vp-c-divider);
  border-radius: 50%;
  background: var(--vp-c-bg);
  font-size: 1.2rem;
}

.progress em {
  display: inline-grid;
  width: 1.1rem;
  height: 1.1rem;
  place-items: center;
  border-radius: 50%;
  background: var(--vp-c-divider);
  color: var(--vp-c-text-2);
  font-size: .68rem;
  font-style: normal;
  font-weight: 800;
}

.progress .done,
.progress .current { color: var(--vp-c-text-1); }
.progress .done b { border-color: var(--vp-c-brand-1); background: var(--vp-c-brand-soft); }
.progress .current b { border-color: var(--vp-c-brand-1); box-shadow: 0 0 0 4px var(--vp-c-brand-soft); }
.progress .current em,
.progress .done em { background: var(--vp-c-brand-1); color: white; }

.action-card {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 1.25rem;
  box-shadow: 0 5px 18px rgba(0, 0, 0, .04);
}

.action-card > div { flex: 1; min-width: 0; }
.current-card { border: 2px solid var(--vp-c-brand-1); background: var(--vp-c-bg); }
.notice { border: 2px solid var(--vp-c-warning-1); background: var(--vp-c-bg); }
.error-card { border: 2px solid var(--vp-c-danger-1); }
.success-card { border: 2px solid var(--vp-c-success-1); }
.fox-icon { background: #fff1e7; }
.mail-icon { background: #fff8dc; }
.success-icon { background: #e8f8ef; }

.term-chips {
  display: flex;
  flex-wrap: wrap;
  gap: .5rem;
  margin: .9rem 0 .35rem;
}

.term-chips > span {
  display: inline-flex;
  align-items: center;
  gap: .35rem;
  padding: .45rem .65rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
  font-size: .86rem;
  font-weight: 700;
}

.term-chips small {
  color: var(--vp-c-text-2);
  font-size: .72rem;
  font-weight: 500;
}

button {
  min-height: 42px;
  padding: .55rem .85rem;
  border: 0;
  border-radius: 10px;
  background: var(--vp-c-brand-1);
  color: white;
  font: inherit;
  font-weight: 800;
  cursor: pointer;
}

button:disabled { cursor: not-allowed; opacity: .5; }

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: .65rem;
  min-height: 56px;
  margin-top: .75rem;
  padding: .65rem 1.15rem;
  font-size: 1rem;
}

.primary-button > span:first-child { font-size: 1.35rem; }
.primary-button > span:last-child { display: grid; text-align: left; line-height: 1.2; }
.primary-button small { font-size: .68rem; font-weight: 500; opacity: .85; }
.no-payment { margin-top: .6rem !important; color: var(--vp-c-text-2); font-size: .82rem; }

.check-row {
  display: grid;
  grid-template-columns: 1.25rem 1.5rem 1fr;
  align-items: center;
  gap: .35rem;
  margin: .75rem 0;
  padding: .7rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
}

input { width: 1.1rem; height: 1.1rem; }
.wallet { margin: .45rem 0 .8rem !important; color: var(--vp-c-text-2); font-size: .84rem; }
code { overflow-wrap: anywhere; }

.roles {
  display: grid;
  gap: .55rem;
  margin: .8rem 0 0;
  padding: 0;
  list-style: none;
}

.roles li {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: .25rem 1rem;
  padding: .6rem .75rem;
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.roles span { color: var(--vp-c-text-2); font-size: .9rem; }
.safety { padding: .75rem 1rem; }
.safety summary { cursor: pointer; font-weight: 700; }
.safety ul { margin-bottom: 0; padding-left: 1.25rem; color: var(--vp-c-text-2); }

.feedback {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .8rem 1rem;
}

.feedback button { min-height: 36px; padding: .35rem .7rem; }
.success-message { border-color: var(--vp-c-success-1); }
.error-message { border-color: var(--vp-c-danger-1); color: var(--vp-c-danger-1); }

@media (max-width: 520px) {
  .registration { gap: .8rem; }
  .hero-card,
  .action-card { padding: 1rem; }
  .hero-icon,
  .action-icon { width: 48px; height: 48px; border-radius: 13px; font-size: 1.6rem; }
  .hero-action { align-items: flex-start; gap: .75rem; }
  .hero-card h2 { font-size: 1.25rem; }
  .invite-summary { display: grid; justify-content: start; }
  .progress span { font-size: .7rem; }
  .action-card { gap: .75rem; }
  .term-chips { display: grid; }
  .primary-button { display: flex; width: 100%; }
  .roles li { display: grid; }
}
</style>
