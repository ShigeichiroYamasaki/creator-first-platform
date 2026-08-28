<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { createWalletClient, custom, getAddress } from 'viem'
import { polygonAmoy } from 'viem/chains'

type Invitation = { invitationId: string; displayName: string; roles: number; state: string; expiresAt: string; expired: boolean }
const token = ref('')
const invitation = ref<Invitation | null>(null)
const wallet = ref('')
const acceptedTerms = ref(false)
const acknowledgedTestOnly = ref(false)
const message = ref('')
const error = ref('')
const busy = ref(false)

async function gateway(path: string, init: RequestInit = {}) {
  const response = await fetch(`/api${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init.headers } })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? `HTTP ${response.status}`)
  return body
}

async function inspect() {
  error.value = ''
  if (!token.value) return
  try { invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}`) }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '招待を確認できませんでした' }
}

async function connectAndVerifyWallet() {
  error.value = ''; busy.value = true
  try {
    const ethereum = (window as unknown as { ethereum?: { request: (value: unknown) => Promise<unknown> } }).ethereum
    if (!ethereum) throw new Error('MetaMaskをインストールしてください')
    const client = createWalletClient({ chain: polygonAmoy, transport: custom(ethereum) })
    const [address] = await client.requestAddresses()
    wallet.value = getAddress(address)
    const challenge = await gateway('/v1/auth/siwe/nonce', { method: 'POST', body: JSON.stringify({ address: wallet.value, chainId: 80002 }) })
    const signature = await client.signMessage({ account: wallet.value as `0x${string}`, message: challenge.message })
    await gateway('/v1/auth/siwe/verify', { method: 'POST', body: JSON.stringify({ challengeId: challenge.challengeId, message: challenge.message, signature }) })
    message.value = 'ウォレット所有証明が完了しました。送金やApproveは行っていません。'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'ウォレットを確認できませんでした' }
  finally { busy.value = false }
}

async function claim() {
  error.value = ''; busy.value = true
  try {
    invitation.value = await gateway(`/v1/participant-invitations/${encodeURIComponent(token.value)}/claim`, { method: 'POST', body: JSON.stringify({ acceptedTerms: acceptedTerms.value, acknowledgedTestOnly: acknowledgedTestOnly.value }) })
    message.value = '本人登録が完了しました。オンチェーン資格登録とTest POL配布は運営処理待ちです。'
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '本人登録を完了できませんでした' }
  finally { busy.value = false }
}

onMounted(() => { token.value = new URLSearchParams(location.hash.slice(1)).get('invite') ?? ''; inspect() })
</script>

<template>
  <section class="invitation-registration">
    <div v-if="invitation" class="panel">
      <h2>招待内容</h2><dl><dt>参加者</dt><dd>{{ invitation.displayName }}</dd><dt>資格</dt><dd>{{ invitation.roles === 1 ? 'ユーザ' : invitation.roles === 2 ? '音楽クリエーター' : 'ユーザ／音楽クリエーター' }}</dd><dt>状態</dt><dd>{{ invitation.state }}</dd><dt>期限</dt><dd>{{ new Date(invitation.expiresAt).toLocaleString('ja-JP') }}</dd></dl>
      <p>メールアドレスは公開ページにもブロックチェーンにも表示しません。</p>
    </div>
    <p v-else-if="!error" class="panel">招待URIを確認しています。</p>
    <div v-if="invitation && invitation.state !== 'CLAIMED' && !invitation.expired" class="panel">
      <h2>本人による登録</h2>
      <button type="button" :disabled="busy" @click="connectAndVerifyWallet">MetaMaskを接続して署名</button>
      <p v-if="wallet">確認済みWallet: <code>{{ wallet }}</code></p>
      <label><input v-model="acceptedTerms" type="checkbox" />公開実験の利用条件に同意する</label>
      <label><input v-model="acknowledgedTestOnly" type="checkbox" />Testnet専用で実資産価値がないことを確認する</label>
      <button type="button" :disabled="!wallet || !acceptedTerms || !acknowledgedTestOnly || busy" @click="claim">本人登録を完了</button>
    </div>
    <p v-if="invitation?.state === 'CLAIMED'" class="success">この招待による本人登録は完了しています。</p>
    <p v-if="message" class="success">{{ message }}</p><p v-if="error" class="error">{{ error }}</p>
  </section>
</template>

<style scoped>
.invitation-registration{display:grid;gap:1rem;margin:1.5rem 0}.panel,.success,.error{padding:1rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}dl{display:grid;grid-template-columns:max-content 1fr;gap:.5rem 1rem}dt{color:var(--vp-c-text-2)}dd{margin:0}button{min-height:44px;margin:.4rem;padding:.55rem .8rem;border:1px solid var(--vp-c-brand-1);border-radius:8px;background:var(--vp-c-brand-1);color:white;font:inherit;font-weight:700}label{display:block;margin:.7rem 0}.success{border-color:var(--vp-c-success-1)}.error{border-color:var(--vp-c-danger-1);color:var(--vp-c-danger-1)}code{overflow-wrap:anywhere}
</style>
