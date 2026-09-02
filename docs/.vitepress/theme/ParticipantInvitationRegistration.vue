<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createWalletClient, custom, getAddress } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { AMOY_CHAIN_ID, switchProviderToAmoy } from './testnet-user-demo.js'

type Enrollment = {
  state: string
  approvalTransactionHash?: string | null
  fundingTransactionHash?: string | null
  initialFundingAmountAtomic?: string | null
  errorMessage?: string | null
}

type Invitation = {
  invitationId: string
  displayName: string
  roles: number
  state: 'CREATED' | 'SENT' | 'CLAIMED' | 'REVOKED'
  expiresAt: string
  expired: boolean
  enrollment: Enrollment
  flowVersion: string
  consentVersion: string
}

const USER_ROLE = 1
const CREATOR_ROLE = 2
const token = ref('')
const invitation = ref<Invitation | null>(null)
const wallet = ref('')
const acceptedParticipation = ref(false)
const message = ref('')
const error = ref('')
const busy = ref(false)
const interactionPhase = ref<'idle' | 'network' | 'account' | 'signature' | 'verification' | 'registration'>('idle')
const waitingLongerThanExpected = ref(false)
const returnedFromWallet = ref(false)
let waitingTimer: ReturnType<typeof setTimeout> | undefined
let enrollmentStatusTimer: ReturnType<typeof setInterval> | undefined

const isClaimed = computed(() => invitation.value?.state === 'CLAIMED')
const isUnavailable = computed(() => Boolean(invitation.value?.expired || invitation.value?.state === 'REVOKED'))
const hasUserRole = computed(() => Boolean((invitation.value?.roles ?? 0) & USER_ROLE))
const hasCreatorRole = computed(() => Boolean((invitation.value?.roles ?? 0) & CREATOR_ROLE))
const enrollmentFunded = computed(() => invitation.value?.enrollment?.state === 'FUNDED')
const roleLabel = computed(() => hasUserRole.value && hasCreatorRole.value
  ? 'ユーザ／音楽クリエータ'
  : hasCreatorRole.value ? '音楽クリエータ' : 'ユーザ')
const stateLabel = computed(() => {
  if (invitation.value?.expired) return '期限切れ'
  return ({ CREATED: '準備中', SENT: '受付中', CLAIMED: '本人登録済み', REVOKED: '無効' } as const)[invitation.value?.state ?? 'CREATED']
})
const nextActionTitle = computed(() => {
  if (interactionPhase.value === 'network' || interactionPhase.value === 'account' || interactionPhase.value === 'signature') return 'MetaMaskの確認を待っています'
  if (interactionPhase.value === 'verification') return '仮想通貨ワレットを確認しています'
  if (interactionPhase.value === 'registration') return '参加登録を保存しています'
  if (!token.value) return '招待メールを開く'
  if (!invitation.value) return '招待を確認中'
  if (isUnavailable.value) return '運営に連絡する'
  if (isClaimed.value && enrollmentFunded.value) return '実験を始める準備ができました'
  if (isClaimed.value) return '本人登録が完了しました'
  if (!wallet.value) return '仮想通貨ワレットをつなぐ'
  return '内容を確認して登録する'
})
const nextActionIcon = computed(() => {
  if (walletConfirmationPending.value) return '🦊'
  if (interactionPhase.value === 'verification' || interactionPhase.value === 'registration') return '⏳'
  if (!token.value) return '✉️'
  if (!invitation.value) return '🔎'
  if (isUnavailable.value) return '⚠️'
  if (isClaimed.value) return '✅'
  if (!wallet.value) return '🦊'
  return '✍️'
})
const nextAction = computed(() => {
  if (interactionPhase.value === 'network') return 'MetaMaskを開き、練習用ネットワークへの切替を確認してください。'
  if (interactionPhase.value === 'account') return 'MetaMaskを開き、このページへの接続を確認してください。'
  if (interactionPhase.value === 'signature') return 'MetaMaskを開き、支払いを伴わない本人確認の署名を確認してください。'
  if (interactionPhase.value === 'verification') return '署名をサーバで確認しています。MetaMaskでの追加操作はありません。'
  if (interactionPhase.value === 'registration') return '登録内容をサーバへ保存しています。MetaMaskでの追加操作はありません。'
  if (!token.value) return '運営から届いた招待メールのリンクを開いてください。'
  if (!invitation.value) return '招待内容を確認しています。'
  if (isUnavailable.value) return 'この招待は利用できません。運営へお問い合わせください。'
  if (isClaimed.value && enrollmentFunded.value) return '運営のオンチェーン承認と初回POL配布が完了しました。'
  if (isClaimed.value) return '本人登録は完了しています。運営がオンチェーン承認と初回POL配布を行います。'
  if (!wallet.value) return 'オレンジ色のキツネが目印の仮想通貨ワレットを開きます。'
  return '確認事項を読み、本人登録を完了してください。'
})

const walletConfirmationPending = computed(() => ['network', 'account', 'signature'].includes(interactionPhase.value))
const walletConnectionInProgress = computed(() => walletConfirmationPending.value || interactionPhase.value === 'verification')
const walletPhaseLabel = computed(() => ({
  network: '練習用ネットワークへの切替',
  account: 'このページへの接続',
  signature: '本人確認の署名'
} as Record<string, string>)[interactionPhase.value] ?? '')

function beginPhase(phase: typeof interactionPhase.value) {
  if (waitingTimer) clearTimeout(waitingTimer)
  interactionPhase.value = phase
  waitingLongerThanExpected.value = false
  returnedFromWallet.value = false
  if (['network', 'account', 'signature', 'registration'].includes(phase)) {
    waitingTimer = setTimeout(() => { waitingLongerThanExpected.value = true }, 8000)
  }
}

function finishInteraction() {
  if (waitingTimer) clearTimeout(waitingTimer)
  waitingTimer = undefined
  interactionPhase.value = 'idle'
  waitingLongerThanExpected.value = false
  returnedFromWallet.value = false
}

function walletErrorMessage(cause: unknown) {
  const messages: string[] = []
  let current: unknown = cause
  let code: number | undefined
  for (let depth = 0; current && depth < 5; depth += 1) {
    const value = current as { code?: unknown; message?: unknown; shortMessage?: unknown; details?: unknown; cause?: unknown }
    if (typeof value.code === 'number') code = value.code
    for (const candidate of [value.message, value.shortMessage, value.details]) {
      if (typeof candidate === 'string') messages.push(candidate)
    }
    current = value.cause
  }
  const detail = messages.join(' ').toLowerCase()
  if (code === 4001 || detail.includes('user rejected') || detail.includes('user denied')) {
    return 'MetaMaskで確認がキャンセルされました。もう一度「MetaMaskを開く」を押してやり直してください。'
  }
  if (code === -32002 || detail.includes('already pending') || detail.includes('request already pending')) {
    return 'MetaMaskに未処理の確認画面があります。ブラウザ右上のMetaMaskアイコンを開き、確認またはキャンセルしてください。'
  }
  return cause instanceof Error ? cause.message : '仮想通貨ワレットを確認できませんでした。'
}

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

async function inspect(silent = false) {
  if (!silent) error.value = ''
  if (!token.value) return
  try {
    invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}`) as Invitation
    scheduleEnrollmentStatusRefresh()
  } catch (cause) {
    if (!silent) error.value = cause instanceof Error ? cause.message : '招待を確認できませんでした'
  }
}

async function connectAndVerifyWallet() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    const ethereum = (window as unknown as { ethereum?: { request: (value: unknown) => Promise<unknown> } }).ethereum
    if (!ethereum) throw new Error('仮想通貨ワレット（MetaMask）が見つかりません。インストールしてから、もう一度お試しください。')
    beginPhase('network')
    await switchProviderToAmoy(ethereum)
    const chainId = await ethereum.request({ method: 'eth_chainId' })
    if (Number(chainId) !== AMOY_CHAIN_ID) throw new Error('仮想通貨ワレットを練習用ネットワーク（Polygon Amoy）へ切り替えてください。')
    const client = createWalletClient({ chain: polygonAmoy, transport: custom(ethereum) })
    beginPhase('account')
    const [address] = await client.requestAddresses()
    wallet.value = getAddress(address)
    beginPhase('verification')
    const challenge = await gateway('/v1/auth/siwe/nonce', {
      method: 'POST',
      body: JSON.stringify({
        address: wallet.value,
        chainId: AMOY_CHAIN_ID,
        invitationToken: token.value,
        acceptedParticipation: acceptedParticipation.value,
        acceptedTerms: acceptedParticipation.value,
        acknowledgedTestOnly: acceptedParticipation.value
      })
    })
    beginPhase('signature')
    const signature = await client.signMessage({
      account: wallet.value as `0x${string}`,
      message: String(challenge.message)
    })
    beginPhase('verification')
    await gateway('/v1/auth/siwe/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId: challenge.challengeId, message: challenge.message, signature })
    })
    message.value = 'ウォレットを確認しました。'
  } catch (cause) {
    wallet.value = ''
    error.value = walletErrorMessage(cause)
  } finally {
    finishInteraction()
    busy.value = false
  }
}

async function claim() {
  error.value = ''
  message.value = ''
  busy.value = true
  try {
    beginPhase('registration')
    invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}/claim`, {
      method: 'POST',
      body: JSON.stringify({
        acceptedParticipation: acceptedParticipation.value,
        acceptedTerms: acceptedParticipation.value,
        acknowledgedTestOnly: acceptedParticipation.value
      })
    }) as Invitation
    scheduleEnrollmentStatusRefresh()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '本人登録を完了できませんでした'
  } finally {
    finishInteraction()
    busy.value = false
  }
}

onMounted(() => {
  token.value = new URLSearchParams(location.hash.slice(1)).get('invite') ?? ''
  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('focus', handleWindowFocus)
  inspect()
})

function scheduleEnrollmentStatusRefresh() {
  if (enrollmentStatusTimer) clearInterval(enrollmentStatusTimer)
  enrollmentStatusTimer = undefined
  if (invitation.value?.state === 'CLAIMED' && invitation.value.enrollment?.state !== 'FUNDED') {
    enrollmentStatusTimer = setInterval(() => { inspect(true) }, 10_000)
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible' && walletConfirmationPending.value) returnedFromWallet.value = true
}

function handleWindowFocus() {
  if (walletConfirmationPending.value) returnedFromWallet.value = true
}

onBeforeUnmount(() => {
  if (waitingTimer) clearTimeout(waitingTimer)
  if (enrollmentStatusTimer) clearInterval(enrollmentStatusTimer)
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('focus', handleWindowFocus)
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

      <details v-if="wallet || isClaimed" class="completed-steps">
        <summary>完了した操作</summary>
        <ul><li>招待メールを開きました</li><li v-if="wallet || isClaimed">仮想通貨ワレットを確認しました</li><li v-if="isClaimed">本人登録を保存しました</li></ul>
      </details>

      <div v-if="isUnavailable" class="action-card error-card">
        <span class="action-icon" aria-hidden="true">⚠️</span>
        <div><h3>登録できません</h3><p>招待が期限切れまたは無効です。運営へ新しい招待を依頼してください。</p></div>
      </div>

      <div v-else-if="(!wallet || walletConnectionInProgress) && !isClaimed" class="action-card current-card">
        <span class="action-icon fox-icon" aria-hidden="true">🦊</span>
        <div>
          <template v-if="walletConnectionInProgress">
            <h3>{{ walletConfirmationPending ? 'MetaMaskで確認してください' : '署名を確認しています' }}</h3>
            <div v-if="walletConfirmationPending" class="wallet-wait" role="status" aria-live="assertive">
              <p class="wallet-wait-title"><span aria-hidden="true">🦊</span><strong>待っている操作：{{ walletPhaseLabel }}</strong></p>
              <ol>
                <li><strong>ブラウザ右上</strong>のMetaMask（キツネのアイコン）を開く</li>
                <li>表示内容を確認し、MetaMaskの<strong>「確認」「接続」「署名」</strong>のいずれかを押す</li>
                <li>このページへ戻る</li>
              </ol>
              <p v-if="returnedFromWallet">MetaMaskから戻りました。確認結果を待っています。</p>
              <p v-if="waitingLongerThanExpected" class="wait-warning"><strong>まだ完了していません。</strong> MetaMaskが背後に隠れている可能性があります。右上のキツネのアイコンをもう一度開いてください。</p>
            </div>
            <div v-else class="server-wait" role="status" aria-live="polite">
              <span class="spinner" aria-hidden="true"></span>
              <p><strong>署名をサーバで確認しています。</strong><br />MetaMaskでの追加操作はありません。このページを閉じずにお待ちください。</p>
            </div>
          </template>
          <template v-else>
            <h3>仮想通貨ワレットをつなぐ</h3>
            <p>内容を確認してからボタンを押してください。MetaMaskの署名には、この招待、参加する立場、確認内容が含まれます。</p>
            <label class="check-row"><input v-model="acceptedParticipation" type="checkbox" /><span aria-hidden="true">📄</span><span>これは無償の運用実験であり、利用条件と個人情報の取扱いを確認しました</span></label>
            <div class="term-chips" aria-label="使用する技術">
              <span><i aria-hidden="true">🦊</i> 仮想通貨ワレット <small>MetaMask</small></span>
              <span><i aria-hidden="true">🧪</i> 練習用ネットワーク <small>Polygon Amoy</small></span>
            </div>
            <button class="primary-button" type="button" :disabled="busy || !acceptedParticipation" @click="connectAndVerifyWallet">
              <span aria-hidden="true">🦊</span>
              <span>MetaMaskを開く<small>確認画面で操作を続けます</small></span>
            </button>
            <p class="no-payment"><span aria-hidden="true">🛡️</span> この操作では支払いは発生しません</p>
          </template>
        </div>
      </div>

      <div v-else-if="!isClaimed" class="action-card current-card">
        <span class="action-icon" aria-hidden="true">✍️</span>
        <div>
          <h3>内容を確認して登録</h3>
          <p class="wallet"><span aria-hidden="true">✅</span> 仮想通貨ワレットを確認しました <code>{{ wallet }}</code></p>
          <p><span aria-hidden="true">🔏</span> 招待内容と確認事項を含む署名をサーバで確認しました。</p>
          <p class="registration-note"><span aria-hidden="true">ℹ️</span> 次の登録操作ではMetaMaskは開きません。このページ内で登録を保存します。</p>
          <button class="primary-button" type="button" :disabled="!acceptedParticipation || busy" @click="claim">
            <span aria-hidden="true">✓</span><span>{{ busy ? '登録を保存しています…' : 'この内容で登録する' }}</span>
          </button>
          <div v-if="interactionPhase === 'registration'" class="server-wait registration-wait" role="status" aria-live="polite">
            <span class="spinner" aria-hidden="true"></span>
            <p><strong>サーバへ登録しています。</strong><br />MetaMaskの操作はありません。ボタンをもう一度押さずにお待ちください。</p>
          </div>
          <p v-if="interactionPhase === 'registration' && waitingLongerThanExpected" class="wait-warning"><strong>通常より時間がかかっています。</strong> このページを閉じずに、通信結果が表示されるまでお待ちください。</p>
        </div>
      </div>

      <div v-else class="action-card success-card">
        <span class="action-icon success-icon" aria-hidden="true">✅</span>
        <div>
          <h3>{{ enrollmentFunded ? '運営による準備が完了しました' : '本人登録が完了しました' }}</h3>
          <p v-if="!enrollmentFunded"><span aria-hidden="true">⏳</span> 運営がオンチェーン承認と初回POL配布を行います。このページは自動的に状況を更新します。</p>
          <p v-else><span aria-hidden="true">✅</span> オンチェーン承認と初回POL配布が完了しました。次の画面で、参加する立場をMetaMaskから本人登録します。</p>
          <p v-if="invitation?.enrollment?.state === 'APPROVAL_FAILED' || invitation?.enrollment?.state === 'FUNDING_FAILED'" class="wait-warning"><strong>運営側で再処理します。</strong> 実験参加者による操作はありません。</p>
          <div v-if="invitation?.enrollment" class="enrollment-status">
            <span><small>オンチェーン準備</small><strong>{{ enrollmentFunded ? '完了' : '運営処理中' }}</strong></span>
            <a v-if="invitation.enrollment.approvalTransactionHash" :href="`https://amoy.polygonscan.com/tx/${invitation.enrollment.approvalTransactionHash}`" target="_blank" rel="noopener noreferrer">承認記録を見る</a>
            <a v-if="invitation.enrollment.fundingTransactionHash" :href="`https://amoy.polygonscan.com/tx/${invitation.enrollment.fundingTransactionHash}`" target="_blank" rel="noopener noreferrer">POL配布記録を見る</a>
          </div>
          <ul class="roles">
            <li v-if="hasUserRole"><b><i aria-hidden="true">🎧</i> 音楽リスナー向け</b><a v-if="enrollmentFunded" :href="withBase('/demo/test-user-registration')">音楽サービス体験へ進む</a><span v-else>運営処理後に利用できます</span></li>
            <li v-if="hasCreatorRole"><b><i aria-hidden="true">🎵</i> 音楽クリエータ向け</b><a v-if="enrollmentFunded" :href="withBase('/demo/creator-workspace')">音楽クリエータ活動体験へ進む</a><span v-else>運営処理後に利用できます</span></li>
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

.wallet-wait,
.server-wait,
.registration-note {
  margin-top: .8rem;
  padding: .85rem;
  border: 1px solid var(--vp-c-brand-1);
  border-radius: 12px;
  background: var(--vp-c-brand-soft);
}

.wallet-wait-title {
  display: flex;
  align-items: center;
  gap: .45rem;
}

.wallet-wait ol {
  margin: .7rem 0 0;
  padding-left: 1.4rem;
}

.wallet-wait li + li { margin-top: .35rem; }

.wait-warning {
  margin-top: .7rem !important;
  padding: .65rem .75rem;
  border-left: 4px solid var(--vp-c-warning-1);
  border-radius: 6px;
  background: var(--vp-c-bg);
}

.server-wait {
  display: flex;
  align-items: center;
  gap: .75rem;
}

.server-wait p { margin: 0; }
.registration-wait { margin-top: .75rem; }
.registration-note { color: var(--vp-c-text-2); font-size: .86rem; }

.spinner {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  border: 3px solid var(--vp-c-divider);
  border-top-color: var(--vp-c-brand-1);
  border-radius: 50%;
  animation: participant-spin .9s linear infinite;
}

@keyframes participant-spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .spinner { animation: none; border-top-color: var(--vp-c-divider); }
}

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
.roles a { font-size: .9rem; font-weight: 800; }
.enrollment-status { display:flex;flex-wrap:wrap;align-items:center;gap:.55rem 1rem;margin-top:.8rem;padding:.7rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg) }
.enrollment-status span { display:grid }
.enrollment-status small { color:var(--vp-c-text-2);font-size:.72rem }
.enrollment-status a { font-size:.82rem;font-weight:700 }
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
