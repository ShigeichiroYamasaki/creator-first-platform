<script setup lang="ts">
import { ref } from 'vue'

type Invitation = { invitationId: string; email: string; displayName: string; roles: number; state: string; expiresAt: string; invitationUri?: string; token?: string; sentAt?: string | null; claimedWallet?: string | null }

const adminToken = ref('')
const email = ref('')
const displayName = ref('')
const roles = ref(1)
const expiresInHours = ref(72)
const sendImmediately = ref(true)
const invitations = ref<Invitation[]>([])
const lastInvitationUri = ref('')
const lastMailPreview = ref('')
const error = ref('')
const busy = ref(false)

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
    invitations.value = (await api('/v1/admin/participant-invitations')).invitations
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : '一覧を取得できませんでした'
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
    <p class="warning">管理者専用です。管理トークン、実験参加者のメールアドレス、招待URIを公開リポジトリやブラウザ保存領域へ保存しないでください。</p>
    <div class="panel">
      <h2>管理者認証</h2>
      <label>Gateway管理トークン<input v-model="adminToken" type="password" autocomplete="off" /></label>
      <button type="button" :disabled="!adminToken || busy" @click="loadInvitations">認証して一覧を取得</button>
      <p>トークンはこの画面のメモリ内だけで使用し、再読み込みすると消去されます。</p>
    </div>
    <form class="panel" @submit.prevent="createInvitation">
      <h2>事前登録用URIを発行</h2>
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
    <div class="panel">
      <h2>招待状況</h2>
      <div class="table-wrap"><table><thead><tr><th>実験参加者</th><th>資格</th><th>状態</th><th>本人選択Wallet</th><th>期限</th></tr></thead><tbody><tr v-for="item in invitations" :key="item.invitationId"><td>{{ item.displayName }}<br><small>{{ item.email }}</small></td><td>{{ item.roles === 1 ? 'ユーザ' : item.roles === 2 ? '音楽クリエーター' : '両方' }}</td><td>{{ item.state }}</td><td><code>{{ item.claimedWallet ?? '未選択' }}</code></td><td>{{ new Date(item.expiresAt).toLocaleString('ja-JP') }}</td></tr></tbody></table></div>
    </div>
  </section>
</template>

<style scoped>
.participant-admin{display:grid;gap:1rem;margin:1.5rem 0}.panel,.warning{padding:1rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}.warning{border-color:var(--vp-c-warning-1)}form,label{display:grid;gap:.4rem}form{gap:.9rem}input,select,button{min-height:44px;padding:.55rem .7rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}button{border-color:var(--vp-c-brand-1);background:var(--vp-c-brand-1);color:white;font-weight:700;cursor:pointer}button:disabled{opacity:.5}.check{grid-template-columns:auto 1fr;align-items:center}.check input{min-height:auto}.result code{display:block;overflow-wrap:anywhere;padding:.75rem}.error{color:var(--vp-c-danger-1)}.table-wrap{overflow:auto}table{min-width:620px}small{color:var(--vp-c-text-2)}
</style>
