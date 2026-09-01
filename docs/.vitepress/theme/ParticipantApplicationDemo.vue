<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { resolveCloudDemoTarget } from './cloud-demo-runtime.js'

type ApplicationState =
  | 'EMAIL_VERIFICATION_REQUIRED'
  | 'UNDER_REVIEW'
  | 'APPROVED_INVITATION_SENT'
  | 'INVITATION_CLAIMED'
  | 'REJECTED'
  | 'APPROVAL_DELIVERY_FAILED'

type Application = {
  applicationId: string
  displayName: string
  roles: number
  state: ApplicationState
  emailHint: string
  createdAt: string
  verifiedAt?: string | null
  reviewedAt?: string | null
  rejectionCode?: string | null
}

const props = withDefaults(defineProps<{ displayName?: string; role?: number; statusOnly?: boolean }>(), {
  displayName: '',
  role: 1,
  statusOnly: false
})

const email = ref('')
const enteredDisplayName = ref('')
const acceptedPrivacyNotice = ref(false)
const acknowledgedTestOnly = ref(false)
const application = ref<Application | null>(null)
const message = ref('')
const error = ref('')
const busy = ref(false)
const serviceAvailable = ref(true)

const effectiveDisplayName = computed(() => props.displayName.trim() || enteredDisplayName.value.trim().normalize('NFKC'))
const displayNameValid = computed(() => /^[\p{L}\p{N}_ -]{2,80}$/u.test(effectiveDisplayName.value))
const canSubmit = computed(() => (
  displayNameValid.value &&
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) &&
  acceptedPrivacyNotice.value &&
  acknowledgedTestOnly.value &&
  serviceAvailable.value &&
  !busy.value
))

const stateView = computed(() => ({
  EMAIL_VERIFICATION_REQUIRED: {
    icon: '✉️', title: '確認メールを開いてください',
    text: `${application.value?.emailHint ?? '登録したメールアドレス'}へ確認メールを送りました。メールのリンクを開くと、運営の確認へ進みます。`
  },
  UNDER_REVIEW: {
    icon: '🔎', title: '運営が申請を確認しています',
    text: '確認が終わると、承認された方へ参加登録用のメールが届きます。現在行う操作はありません。'
  },
  APPROVED_INVITATION_SENT: {
    icon: '✅', title: '申請が承認されました',
    text: '参加登録用のメールを送りました。メールの「参加登録を始める」リンクから、本人が使う仮想通貨ワレットを登録してください。'
  },
  INVITATION_CLAIMED: {
    icon: '⏳', title: '本人による参加登録が完了しました',
    text: '運営が練習用残高と参加資格を準備しています。利用開始の連絡が届くまでお待ちください。'
  },
  REJECTED: {
    icon: '📋', title: '今回の参加登録は完了していません',
    text: '募集人数や対象条件により、今回の実験には参加できません。次回募集がある場合は、募集案内から改めて申し込めます。'
  },
  APPROVAL_DELIVERY_FAILED: {
    icon: '⚠️', title: '承認メールの送信を確認しています',
    text: '申請内容は失われていません。運営がメール送信を再確認しているため、しばらくお待ちください。'
  }
} as const)[application.value?.state ?? 'EMAIL_VERIFICATION_REQUIRED'])

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers }
  })
  const text = await response.text()
  let body: Record<string, unknown> = {}
  try { body = text ? JSON.parse(text) : {} } catch { /* handled below */ }
  if (!response.ok) throw new Error(typeof body.message === 'string' ? body.message : `申請受付へ接続できません（HTTP ${response.status}）`)
  return body
}

async function loadCurrent(silent = false) {
  if (!silent) error.value = ''
  try {
    const body = await api('/v1/participant-applications/current')
    application.value = (body.application ?? null) as Application | null
    serviceAvailable.value = true
  } catch (cause) {
    serviceAvailable.value = false
    if (!silent) error.value = cause instanceof Error ? cause.message : '申請状況を確認できませんでした'
  }
}

async function submitApplication() {
  if (!canSubmit.value) return
  busy.value = true
  error.value = ''
  message.value = ''
  try {
    application.value = await api('/v1/participant-applications', {
      method: 'POST',
      body: JSON.stringify({
        email: email.value.trim(),
        displayName: effectiveDisplayName.value,
        roles: props.role,
        acceptedPrivacyNotice: acceptedPrivacyNotice.value,
        acknowledgedTestOnly: acknowledgedTestOnly.value
      })
    }) as Application
    message.value = '申請を受け付け、確認メールを送りました。'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '申請を送信できませんでした'
  } finally {
    busy.value = false
  }
}

async function resendVerification() {
  busy.value = true
  error.value = ''
  try {
    application.value = await api('/v1/participant-applications/current/resend', { method: 'POST' }) as Application
    message.value = '確認メールを再送しました。'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '確認メールを再送できませんでした'
  } finally {
    busy.value = false
  }
}

async function verifyFromEmail(token: string) {
  busy.value = true
  error.value = ''
  try {
    application.value = await api(`/v1/participant-applications/verify/${encodeURIComponent(token)}`, { method: 'POST' }) as Application
    message.value = 'メールアドレスを確認しました。申請は運営確認中です。'
    history.replaceState(null, '', `${location.pathname}${location.search}`)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'メールアドレスを確認できませんでした'
  } finally {
    busy.value = false
  }
}

async function redirectStaticSiteToCloud() {
  if (location.origin !== 'https://shigeichiroyamasaki.github.io') return false
  try {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`
    const target = await resolveCloudDemoTarget(
      new URL(withBase('/demo-runtime.json'), location.origin).href,
      requestedPath
    )
    location.replace(target)
  } catch {
    serviceAvailable.value = false
    error.value = 'クラウド版の接続先を確認できませんでした。入力内容は送信されていません。'
  }
  return true
}

onMounted(async () => {
  if (await redirectStaticSiteToCloud()) return
  const verificationToken = new URLSearchParams(location.hash.slice(1)).get('verify-application')
  if (verificationToken) await verifyFromEmail(verificationToken)
  else await loadCurrent()
})
</script>

<template>
  <div class="participant-application">
    <div v-if="application" class="application-state" :data-state="application.state">
      <span class="state-icon" aria-hidden="true">{{ stateView.icon }}</span>
      <div>
        <h4>{{ stateView.title }}</h4>
        <p>{{ stateView.text }}</p>
        <div class="application-actions">
          <button v-if="application.state === 'EMAIL_VERIFICATION_REQUIRED'" type="button" :disabled="busy" @click="resendVerification">確認メールを再送する</button>
          <button type="button" class="secondary" :disabled="busy" @click="loadCurrent()">現在の状態を確認する</button>
        </div>
      </div>
    </div>

    <div v-else-if="statusOnly" class="application-state application-empty">
      <span class="state-icon" aria-hidden="true">📭</span>
      <div><h4>このブラウザには確認中の申請がありません</h4><p>確認メールに記載されたリンクを開いてください。新しく申請する場合は、音楽リスナーまたは音楽クリエータの参加ページから始めます。</p></div>
    </div>

    <form v-else class="application-form" @submit.prevent="submitApplication">
      <div class="application-intro">
        <span aria-hidden="true">📨</span>
        <div><h4>実験参加者として申請する</h4><p>メール確認と運営の承認後に、参加登録用のメールが届きます。仮想通貨ワレットのアドレスを申請フォームへ入力する必要はありません。</p></div>
      </div>
      <label v-if="!props.displayName.trim()">
        {{ props.role === 2 ? '実験で使う仮の活動名' : '実験で使う仮の名前' }}
        <input v-model="enteredDisplayName" type="text" minlength="2" maxlength="80" autocomplete="off" :placeholder="props.role === 2 ? 'Demo Artist 01' : 'Demo Listener 01'" required>
        <small>本名や連絡先を含めず、2〜80文字の文字・数字・空白・_・-を使ってください。</small>
      </label>
      <label>確認メールを受け取るメールアドレス<input v-model="email" type="email" autocomplete="email" required placeholder="name@example.com"></label>
      <label class="check"><input v-model="acceptedPrivacyNotice" type="checkbox"><span>メールアドレスを申請確認、審査結果、参加案内のために利用することを確認しました</span></label>
      <label class="check"><input v-model="acknowledgedTestOnly" type="checkbox"><span>実際のお金や本番サービスの権利を得る申請ではないことを確認しました</span></label>
      <button type="submit" :disabled="!canSubmit">{{ busy ? '申請しています…' : '参加者登録を申請する' }}</button>
      <p class="privacy-note">パスワード、秘密鍵、復旧用の単語列、本人確認書類、銀行情報は入力しないでください。</p>
    </form>

    <div v-if="!serviceAvailable" class="application-error"><p>現在、申請受付サーバへ接続できません。入力内容は送信されていません。運営の募集案内をご確認ください。</p><button type="button" class="secondary" :disabled="busy" @click="loadCurrent()">接続を再確認する</button></div>
    <p v-else-if="error" class="application-error">{{ error }}</p>
    <p v-if="message" class="application-message" aria-live="polite">{{ message }}</p>
  </div>
</template>

<style scoped>
.participant-application{display:grid;gap:.8rem;margin-top:1rem}.application-form,.application-state{display:grid;gap:.85rem;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg)}.application-intro,.application-state{grid-template-columns:auto minmax(0,1fr);align-items:start}.application-intro{display:grid;gap:.8rem}.application-intro>span,.state-icon{font-size:1.8rem}.application-intro h4,.application-state h4{margin:0 0 .25rem;border:0}.application-intro p,.application-state p{margin:0;color:var(--vp-c-text-2)}label{display:grid;gap:.4rem;font-weight:700}label small{color:var(--vp-c-text-2);font-weight:400}input[type=email],input[type=text]{min-height:44px;padding:.65rem .75rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg-soft);color:var(--vp-c-text-1);font:inherit}.check{grid-template-columns:1.2rem minmax(0,1fr);align-items:start;font-weight:400}.check input{width:1rem;height:1rem;margin-top:.25rem}button{min-height:44px;width:fit-content;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;background:var(--vp-c-brand-1);color:white;font:inherit;font-weight:700;cursor:pointer}button.secondary{background:transparent;color:var(--vp-c-brand-1)}button:disabled{cursor:not-allowed;opacity:.5}.application-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:.8rem}.privacy-note{margin:0;color:var(--vp-c-text-2);font-size:.88rem}.application-error{display:grid;gap:.6rem;padding:.75rem;border-left:4px solid var(--vp-c-danger-1);background:var(--vp-c-danger-soft);color:var(--vp-c-danger-1)}.application-error p{margin:0}.application-message{color:var(--vp-c-brand-1);font-weight:700}@media(max-width:560px){.application-actions{display:grid}.application-actions button,.application-form>button{width:100%}}
</style>
