<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { resolveCloudAdminTarget } from './cloud-demo-runtime.js'
import { participantEnrollmentAction } from './participantEnrollmentUi.js'

type Enrollment = { state: string; approvalTransactionHash?: string | null; fundingTransactionHash?: string | null; initialFundingAmountAtomic?: string | null; errorMessage?: string | null }
type Invitation = { invitationId: string; email: string; displayName: string; roles: number; state: string; expiresAt: string; invitationUri?: string; token?: string; sentAt?: string | null; claimedWallet?: string | null; enrollment: Enrollment }
type Application = { applicationId: string; email: string; displayName: string; roles: number; state: string; createdAt: string; invitationId?: string | null; rejectionCode?: string | null }

const adminToken = ref('')
const email = ref('')
const displayName = ref('')
const roles = ref(1)
const expiresInHours = ref(72)
const sendImmediately = ref(true)
const invitations = ref<Invitation[]>([])
const applications = ref<Application[]>([])
const lastInvitationUri = ref('')
const lastMailPreview = ref('')
const error = ref('')
const busy = ref(false)
const processingInvitationId = ref('')
const operationMessage = ref('')
const connectingToCloud = ref(false)

onMounted(async () => {
  if (location.origin !== 'https://shigeichiroyamasaki.github.io') return
  connectingToCloud.value = true
  try {
    const target = await resolveCloudAdminTarget(new URL(withBase('/demo-runtime.json'), location.origin).href)
    location.replace(target)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'クラウド版の運営画面へ接続できませんでした'
    connectingToCloud.value = false
  }
})

async function api(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken.value}`, ...init.headers }
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`)
  return body
}

async function loadInvitations() {
  error.value = ''
  busy.value = true
  try {
    const [applicationResult, invitationResult] = await Promise.all([
      api('/v1/admin/participant-applications'),
      api('/v1/admin/participant-invitations')
    ])
    applications.value = applicationResult.applications
    invitations.value = invitationResult.invitations
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '一覧を取得できませんでした'
  } finally {
    busy.value = false
  }
}

function roleLabel(roles: number) {
  return roles === 1 ? '音楽リスナー' : roles === 2 ? '音楽クリエータ' : '両方'
}

function applicationStateLabel(state: string) {
  return ({
    EMAIL_VERIFICATION_REQUIRED: 'メール確認待ち',
    UNDER_REVIEW: '審査待ち',
    APPROVED_INVITATION_SENT: '承認・招待送信済み',
    INVITATION_CLAIMED: '本人登録済み',
    REJECTED: '今回は不承認',
    APPROVAL_DELIVERY_FAILED: '承認メール送信要確認'
  } as Record<string, string>)[state] ?? state
}

function enrollmentStateLabel(invitation: Invitation) {
  if (invitation.state !== 'CLAIMED') return '本人のワレット登録待ち'
  return ({
    OPERATOR_DISABLED: '運営ワーカー未設定',
    READY_AFTER_WALLET_CLAIM: '運営処理を開始できます',
    READY_FOR_APPROVAL: 'オンチェーン承認待ち',
    APPROVAL_SUBMITTED: 'オンチェーン承認確認中',
    APPROVED: '初回POL配布待ち',
    FUNDING_SUBMITTED: '初回POL配布確認中',
    APPROVAL_FAILED: 'オンチェーン承認を再実行できます',
    FUNDING_FAILED: '初回POL配布を再実行できます',
    FUNDED: 'オンチェーン承認・初回POL配布済み'
  } as Record<string, string>)[invitation.enrollment?.state] ?? invitation.enrollment?.state ?? '状態不明'
}

async function processEnrollment(invitation: Invitation) {
  error.value = ''
  operationMessage.value = ''
  if (processingInvitationId.value === invitation.invitationId) {
    operationMessage.value = 'この実験参加者の運営処理はすでに進行中です。完了するまでそのままお待ちください。'
    return
  }
  if (invitation.enrollment?.state === 'FUNDED') {
    operationMessage.value = `${invitation.displayName}さんは、すでにオンチェーン承認と初回POL配布が完了しています。`
    return
  }
  if (invitation.state !== 'CLAIMED') {
    error.value = '実験参加者はまだ招待リンクから仮想通貨ワレットを登録していません。本人登録完了後に一覧を再取得してください。'
    return
  }
  if (!invitation.claimedWallet) {
    error.value = '本人登録に対応する仮想通貨ワレット情報が取得できません。一覧を再取得し、改善しない場合はゲートウェーの状態を確認してください。'
    return
  }
  if (invitation.enrollment?.state === 'OPERATOR_DISABLED') {
    error.value = '公開サーバの参加者登録運営ワーカーが無効です。サーバの設定を有効にしてから再実行してください。'
    return
  }
  busy.value = true
  processingInvitationId.value = invitation.invitationId
  try {
    const enrollment = await api(`/v1/admin/participant-invitations/${invitation.invitationId}/enrollment`, { method: 'POST' }) as Enrollment
    operationMessage.value = enrollment.state === 'FUNDED'
      ? `${invitation.displayName}さんのオンチェーン承認と初回POL配布が完了しました。`
      : `${invitation.displayName}さんの運営処理を受け付けました。`
    await loadInvitations()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'オンチェーン承認と初回POL配布を完了できませんでした'
  } finally {
    processingInvitationId.value = ''
    busy.value = false
  }
}

async function reviewApplication(applicationId: string, decision: 'approve' | 'reject') {
  error.value = ''
  busy.value = true
  try {
    await api(`/v1/admin/participant-applications/${applicationId}/${decision}`, {
      method: 'POST',
      body: JSON.stringify(decision === 'reject' ? { rejectionCode: 'NOT_IN_CURRENT_COHORT' } : {})
    })
    await loadInvitations()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '審査結果を保存できませんでした'
  } finally {
    busy.value = false
  }
}

async function createInvitation() {
  error.value = ''
  lastInvitationUri.value = ''
  lastMailPreview.value = ''
  busy.value = true
  try {
    const invitation = await api('/v1/admin/participant-invitations', {
      method: 'POST',
      body: JSON.stringify({ email: email.value, displayName: displayName.value, roles: roles.value, expiresInHours: expiresInHours.value })
    }) as Invitation
    lastInvitationUri.value = invitation.invitationUri ?? ''
    if (sendImmediately.value) {
      const sent = await api(`/v1/admin/participant-invitations/${invitation.invitationId}/send`, {
        method: 'POST', body: JSON.stringify({ token: invitation.token })
      })
      lastMailPreview.value = sent.delivery?.mode === 'outbox'
        ? 'ローカルOutboxへ保存しました。本番送信にはWebhookメール設定が必要です。'
        : 'メール送信Webhookが受理しました。'
    }
    email.value = ''
    displayName.value = ''
    await loadInvitations()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '招待を作成できませんでした'
  } finally {
    busy.value = false
  }
}

async function copyUri() {
  await navigator.clipboard.writeText(lastInvitationUri.value)
}
</script>

<template>
  <section class="participant-admin">
    <div v-if="connectingToCloud" class="panel"><h2>クラウド版の運営画面へ接続しています</h2><p>申請データが保存されているGoogle クラウドVMへ移動します。</p></div>
    <p class="warning">管理者専用です。管理トークン、実験参加者のメールアドレス、招待URIを公開リポジトリやブラウザ保存領域へ保存しないでください。</p>
    <div class="panel">
      <h2>管理者認証</h2>
      <label>Gateway管理トークン<input v-model="adminToken" type="password" autocomplete="off" /></label>
      <button type="button" :disabled="!adminToken || busy" @click="loadInvitations">認証して一覧を取得</button>
      <p>トークンはこの画面のメモリ内だけで使用し、再読み込みすると消去されます。</p>
    </div>
    <form class="panel" @submit.prevent="createInvitation">
      <h2>運営から個別に招待する</h2>
      <label>実験参加者名<input v-model="displayName" required minlength="2" maxlength="80" /></label>
      <label>メールアドレス<input v-model="email" required type="email" autocomplete="off" /></label>
      <label>参加資格<select v-model.number="roles"><option :value="1">ユーザ</option><option :value="2">音楽クリエーター</option><option :value="3">両方</option></select></label>
      <label>有効時間<input v-model.number="expiresInHours" type="number" min="1" max="720" /></label>
      <label class="check"><input v-model="sendImmediately" type="checkbox" />作成後に招待メールを送信する</label>
      <button type="submit" :disabled="!adminToken || busy">招待を作成</button>
    </form>
    <div v-if="lastInvitationUri" class="panel result">
      <h2>発行結果</h2>
      <code>{{ lastInvitationUri }}</code>
      <button type="button" @click="copyUri">URIをコピー</button>
      <p v-if="lastMailPreview">{{ lastMailPreview }}</p>
      <p>完全なURIは作成時だけ返されます。メール送信後は管理画面にも再表示しません。</p>
    </div>
    <p v-if="error" class="error">{{ error }}</p>
    <p v-if="operationMessage" class="success">{{ operationMessage }}</p>
    <div class="panel">
      <h2>実験参加申請</h2>
      <p>「審査待ち」の申請を確認します。承認すると、本人登録用の一回限りリンクを含む参加メールが1通送られます。</p>
      <div v-if="applications.length" class="record-list">
        <article v-for="item in applications" :key="item.applicationId" class="record-card">
          <header class="record-header"><div><h3>{{ item.displayName }}</h3><small>{{ item.email }}</small></div><span class="role-badge">{{ roleLabel(item.roles) }}</span></header>
          <dl class="record-details"><div><dt>申請状態</dt><dd>{{ applicationStateLabel(item.state) }}</dd></div><div><dt>申請日時</dt><dd>{{ new Date(item.createdAt).toLocaleString('ja-JP') }}</dd></div></dl>
          <div v-if="['UNDER_REVIEW', 'APPROVAL_DELIVERY_FAILED'].includes(item.state)" class="review-actions"><button type="button" :disabled="busy" @click="reviewApplication(item.applicationId, 'approve')">{{ item.state === 'APPROVAL_DELIVERY_FAILED' ? 'メール送信を再試行' : '承認して参加メールを送信' }}</button><button v-if="item.state === 'UNDER_REVIEW'" type="button" class="danger" :disabled="busy" @click="reviewApplication(item.applicationId, 'reject')">今回は不承認</button></div>
        </article>
      </div>
      <p v-else class="empty-state">申請はありません</p>
    </div>
    <div class="panel">
      <h2>招待状況</h2>
      <p>本人が仮想通貨ワレットを登録すると、運営ワーカーがオンチェーン承認と初回POL配布を自動実行します。失敗または中断した場合だけ、この画面から同じ参加者IDと操作IDで安全に再実行します。氏名やメールアドレスはブロックチェーンへ記録しません。</p>
      <div v-if="invitations.length" class="record-list invitation-list">
        <article v-for="item in invitations" :key="item.invitationId" class="record-card invitation-card">
          <header class="record-header"><div><h3>{{ item.displayName }}</h3><small>{{ item.email }}</small></div><span class="role-badge">{{ roleLabel(item.roles) }}</span></header>
          <dl class="record-details">
            <div><dt>招待状態</dt><dd>{{ item.state }}</dd></div>
            <div><dt>登録した仮想通貨ワレット</dt><dd><code>{{ item.claimedWallet ?? '未選択' }}</code></dd></div>
            <div><dt>オンチェーン準備</dt><dd><strong>{{ enrollmentStateLabel(item) }}</strong></dd></div>
            <div><dt>招待期限</dt><dd>{{ new Date(item.expiresAt).toLocaleString('ja-JP') }}</dd></div>
          </dl>
          <small v-if="item.enrollment?.errorMessage" class="error-detail">{{ item.enrollment.errorMessage }}</small>
          <span class="tx-links">
            <a v-if="item.enrollment?.approvalTransactionHash" :href="`https://amoy.polygonscan.com/tx/${item.enrollment.approvalTransactionHash}`" target="_blank" rel="noopener noreferrer">承認記録</a>
            <a v-if="item.enrollment?.fundingTransactionHash" :href="`https://amoy.polygonscan.com/tx/${item.enrollment.fundingTransactionHash}`" target="_blank" rel="noopener noreferrer">POL配布記録</a>
          </span>
          <div class="operation-cell">
            <span v-if="participantEnrollmentAction(item).disabled" class="completion-badge">{{ participantEnrollmentAction(item).label }}</span>
            <button v-else type="button" :aria-busy="processingInvitationId === item.invitationId" @click="processEnrollment(item)">{{ processingInvitationId === item.invitationId ? '処理しています…' : participantEnrollmentAction(item).label }}</button>
            <small>{{ participantEnrollmentAction(item).hint }}</small>
          </div>
        </article>
      </div>
      <p v-else class="empty-state">招待はありません</p>
    </div>
  </section>
</template>

<style scoped>
.participant-admin{display:grid;min-width:0;max-width:100%;gap:1rem;margin:1.5rem 0}.panel,.warning{min-width:0;max-width:100%;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}.warning{border-color:var(--vp-c-warning-1)}form,label{display:grid;gap:.4rem}form{gap:.9rem}input,select,button{min-height:44px;padding:.55rem .7rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}button{border-color:var(--vp-c-brand-1);background:var(--vp-c-brand-1);color:white;font-weight:700;cursor:pointer}button.danger{border-color:var(--vp-c-danger-1);background:transparent;color:var(--vp-c-danger-1)}button:disabled{opacity:.5}.check{grid-template-columns:auto 1fr;align-items:center}.check input{min-height:auto}.result code{display:block;overflow-wrap:anywhere;padding:.75rem}.error{color:var(--vp-c-danger-1)}.success{padding:.8rem 1rem;border:1px solid var(--vp-c-success-1);border-radius:10px;background:var(--vp-c-bg-soft);color:var(--vp-c-success-1);font-weight:700}.record-list{display:grid;gap:1rem}.record-card{display:grid;min-width:0;gap:.9rem;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg)}.record-header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}.record-header h3{margin:0 0 .2rem;font-size:1.05rem}.role-badge{flex:none;padding:.25rem .55rem;border-radius:999px;background:var(--vp-c-brand-soft);color:var(--vp-c-brand-1);font-size:.78rem;font-weight:700}.record-details{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.75rem;margin:0}.record-details div{min-width:0;padding:.65rem;border-radius:8px;background:var(--vp-c-bg-soft)}.record-details dt{margin-bottom:.2rem;color:var(--vp-c-text-2);font-size:.75rem;font-weight:700}.record-details dd{min-width:0;margin:0;overflow-wrap:anywhere}.record-details code{font-size:.78rem;white-space:normal}.empty-state{padding:1rem;text-align:center;color:var(--vp-c-text-2)}small{color:var(--vp-c-text-2)}.review-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.5rem}.operation-cell{display:grid;gap:.45rem;padding-top:.85rem;border-top:1px solid var(--vp-c-divider)}.operation-cell button,.completion-badge{width:100%}.operation-cell small{display:block;line-height:1.45}.completion-badge{display:inline-flex;box-sizing:border-box;min-height:44px;align-items:center;justify-content:center;padding:.55rem .7rem;border:1px solid var(--vp-c-success-1);border-radius:8px;color:var(--vp-c-success-1);font-weight:700}.error-detail{display:block;color:var(--vp-c-danger-1)}.tx-links{display:flex;flex-wrap:wrap;gap:.65rem;font-size:.85rem}@media (max-width:640px){.record-header{display:grid}.record-details,.review-actions{grid-template-columns:1fr}.role-badge{justify-self:start}}
</style>
