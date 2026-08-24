<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, type Address, type EIP1193Provider, type Hash } from 'viem'
import { sepolia } from 'viem/chains'
import { governanceAbi, governanceStateLabels, quadraticCost, validateGovernanceDeployment } from './testnet-governance-demo.js'

type DemoProvider = EIP1193Provider & {
  on?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
  removeListener?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
}
type GovernanceDeployment = {
  governanceReady: boolean
  governor: Address | null
  governedPolicy: Address | null
  sourceCommit: string | null
}
type ProposalView = {
  sessionId: bigint; state: number; contentHash: string; specificationHash: string; manifestHash: string
  target: Address; votingStartsAt: bigint; votingEndsAt: bigint; executableAt: bigint; expiresAt: bigint
  creatorScore: bigint; userScore: bigint; creatorParticipants: number; userParticipants: number
  creatorApproved: boolean; userApproved: boolean; reviewed: boolean
}

const deployment = ref<GovernanceDeployment>()
const deploymentError = ref('')
const walletAddress = ref<Address>()
const walletChainId = ref<number>()
const message = ref('公開マニフェストとウォレット状態を確認してください。')
const busy = ref(false)
const proposalId = ref(1)
const proposalCount = ref(0n)
const proposal = ref<ProposalView>()
const house = ref(0)
const remainingCredits = ref(0)
const selectedIntensity = ref(1)
const lastTransaction = ref<Hash>()
let provider: DemoProvider | undefined
let listenersAttached = false

const correctChain = computed(() => walletChainId.value === 11155111)
const ready = computed(() => Boolean(deployment.value?.governanceReady && deployment.value.governor))
const voteCost = computed(() => quadraticCost(selectedIntensity.value))
const canVote = computed(() => ready.value && correctChain.value && walletAddress.value && proposal.value?.state === 2 && house.value > 0 && !busy.value)
const houseLabel = computed(() => ['議員資格なし', '音楽クリエータ院議会', 'ユーザ院議会'][house.value] ?? '不明')

function providerFromWindow(): DemoProvider | undefined {
  return (window as Window & { ethereum?: DemoProvider }).ethereum
}
function short(value: string | null | undefined): string { return value ? `${value.slice(0, 10)}…${value.slice(-8)}` : '未公開' }
function date(value: bigint): string { return value > 0n ? new Date(Number(value) * 1000).toLocaleString('ja-JP') : '未設定' }
function clients() {
  if (!provider || !walletAddress.value || !deployment.value?.governor) throw new Error('ウォレットまたはガバナンスコントラクトを利用できません。')
  const transport = custom(provider)
  return {
    publicClient: createPublicClient({ chain: sepolia, transport }),
    walletClient: createWalletClient({ account: walletAddress.value, chain: sepolia, transport }),
    governor: deployment.value.governor
  }
}
async function readChainId(): Promise<void> {
  if (provider) walletChainId.value = Number.parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16)
}
const handleAccountsChanged = async (value: Address[] | string): Promise<void> => {
  walletAddress.value = Array.isArray(value) ? value[0] : undefined
  proposal.value = undefined
  if (walletAddress.value && correctChain.value && ready.value) await refresh()
}
const handleChainChanged = async (value: Address[] | string): Promise<void> => {
  walletChainId.value = typeof value === 'string' ? Number.parseInt(value, 16) : undefined
  proposal.value = undefined
  if (walletAddress.value && correctChain.value && ready.value) await refresh()
}
function attachListeners(): void {
  if (!provider?.on || listenersAttached) return
  provider.on('accountsChanged', handleAccountsChanged)
  provider.on('chainChanged', handleChainChanged)
  listenersAttached = true
}
async function connectWallet(): Promise<void> {
  provider = providerFromWindow()
  if (!provider) { message.value = 'EIP-1193対応ウォレットが見つかりません。'; return }
  busy.value = true
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    walletAddress.value = accounts[0]
    attachListeners()
    await readChainId()
    message.value = correctChain.value ? 'Sepoliaへ接続しました。' : 'Sepoliaへ切り替えてください。'
    if (correctChain.value && ready.value) await refresh()
  } catch (error) { message.value = error instanceof Error ? error.message : 'ウォレット接続に失敗しました。' }
  finally { busy.value = false }
}
async function switchToSepolia(): Promise<void> {
  if (!provider) return
  await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
  await readChainId()
  if (walletAddress.value && ready.value) await refresh()
}
async function refresh(): Promise<void> {
  if (!ready.value || !correctChain.value || !walletAddress.value) return
  busy.value = true
  try {
    const { publicClient, governor } = clients()
    proposalCount.value = await publicClient.readContract({ address: governor, abi: governanceAbi, functionName: 'proposalCount' }) as bigint
    if (proposalId.value < 1 || BigInt(proposalId.value) > proposalCount.value) {
      proposal.value = undefined
      message.value = `提案IDは1から${proposalCount.value}の範囲で指定してください。`
      return
    }
    const id = BigInt(proposalId.value)
    const [raw, state] = await Promise.all([
      publicClient.readContract({ address: governor, abi: governanceAbi, functionName: 'proposals', args: [id] }),
      publicClient.readContract({ address: governor, abi: governanceAbi, functionName: 'proposalState', args: [id] })
    ]) as [readonly unknown[], number]
    const sessionId = raw[0] as bigint
    const [nextHouse, nextRemaining] = await Promise.all([
      publicClient.readContract({ address: governor, abi: governanceAbi, functionName: 'memberHouse', args: [sessionId, walletAddress.value] }),
      publicClient.readContract({ address: governor, abi: governanceAbi, functionName: 'remainingVoiceCredits', args: [sessionId, walletAddress.value] })
    ])
    house.value = Number(nextHouse)
    remainingCredits.value = Number(nextRemaining)
    proposal.value = {
      sessionId, state: Number(state), contentHash: raw[1] as string, specificationHash: raw[2] as string,
      manifestHash: raw[3] as string, target: raw[5] as Address, votingStartsAt: raw[7] as bigint,
      votingEndsAt: raw[8] as bigint, executableAt: raw[9] as bigint, expiresAt: raw[10] as bigint,
      creatorScore: raw[11] as bigint, userScore: raw[12] as bigint,
      creatorParticipants: Number(raw[13]), userParticipants: Number(raw[14]),
      creatorApproved: raw[16] as boolean, userApproved: raw[17] as boolean, reviewed: raw[19] as boolean
    }
    message.value = 'Sepolia上の提案・両院結果・議員資格を更新しました。'
  } catch (error) { message.value = error instanceof Error ? error.message : 'ガバナンス状態を取得できません。' }
  finally { busy.value = false }
}
async function castVote(): Promise<void> {
  if (!canVote.value) return
  busy.value = true
  lastTransaction.value = undefined
  try {
    const { publicClient, walletClient, governor } = clients()
    const hash = await walletClient.writeContract({
      address: governor, abi: governanceAbi, functionName: 'castVote',
      args: [BigInt(proposalId.value), selectedIntensity.value]
    })
    lastTransaction.value = hash
    message.value = '公開投票トランザクションを送信しました。'
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error('投票トランザクションがrevertしました。')
    await refresh()
    message.value = '投票がSepoliaで確定しました。票の差替え時は以前の二乗コストが返却されます。'
  } catch (error) { message.value = error instanceof Error ? error.message : '投票に失敗しました。' }
  finally { busy.value = false }
}
async function loadDeployment(): Promise<void> {
  try {
    const response = await fetch(withBase('/testnet/deployment.json'), { cache: 'no-store' })
    if (!response.ok) throw new Error(`公開マニフェスト HTTP ${response.status}`)
    deployment.value = validateGovernanceDeployment(await response.json()) as GovernanceDeployment
  } catch (error) { deploymentError.value = error instanceof Error ? error.message : '公開マニフェストを検証できません。' }
}
onMounted(loadDeployment)
onBeforeUnmount(() => {
  if (provider?.removeListener && listenersAttached) {
    provider.removeListener('accountsChanged', handleAccountsChanged)
    provider.removeListener('chainChanged', handleChainChanged)
  }
})
</script>

<template>
  <section class="governance-demo" aria-labelledby="governance-demo-title">
    <header class="panel">
      <p class="kicker">Sepolia・二院制・二次投票・タイムロック</p>
      <h2 id="governance-demo-title">テストネット版ガバナンス</h2>
      <p>公開マニフェストに登録されたコントラクトだけを読み込み、議員資格、提案、両院結果、投票クレジットを検証します。</p>
      <p class="warning"><strong>テスト専用:</strong> 投票は公開されます。議員登録はテスト運営者が行い、本人性・抽選・秘密投票・法的承認を実装した本番ガバナンスではありません。</p>
    </header>

    <section class="panel">
      <h3>1. 公開デプロイとウォレット</h3>
      <div class="grid"><div><span>ガバナー</span><strong>{{ short(deployment?.governor) }}</strong></div><div><span>実行対象</span><strong>{{ short(deployment?.governedPolicy) }}</strong></div><div><span>ネットワーク</span><strong>{{ correctChain ? 'Sepolia' : walletChainId ?? '未接続' }}</strong></div><div><span>ウォレット</span><strong>{{ short(walletAddress) }}</strong></div></div>
      <p v-if="deploymentError" class="error">{{ deploymentError }}</p>
      <p v-else-if="deployment && !deployment.governanceReady" class="warning">コントラクト実装は完了していますが、公開Sepoliaマニフェストにはまだガバナンスアドレスが登録されていません。デプロイ完了まで書込み操作は無効です。</p>
      <div class="actions"><button type="button" @click="connectWallet" :disabled="busy">ウォレット接続</button><button type="button" class="secondary" @click="switchToSepolia" :disabled="!walletAddress || correctChain">Sepoliaへ切替</button></div>
    </section>

    <section class="panel">
      <h3>2. 提案と両院結果</h3>
      <div class="proposal-picker"><label for="proposal-id">提案ID</label><input id="proposal-id" v-model.number="proposalId" type="number" min="1"><button type="button" class="secondary" @click="refresh" :disabled="!ready || !correctChain || !walletAddress || busy">状態を更新</button></div>
      <div v-if="proposal" class="grid"><div><span>状態</span><strong>{{ governanceStateLabels[proposal.state] }}</strong></div><div><span>会期</span><strong>#{{ proposal.sessionId }}</strong></div><div><span>投票期間</span><strong>{{ date(proposal.votingStartsAt) }}〜{{ date(proposal.votingEndsAt) }}</strong></div><div><span>対象</span><strong>{{ short(proposal.target) }}</strong></div><div><span>音楽クリエータ院議会</span><strong>{{ proposal.creatorScore }}点・{{ proposal.creatorParticipants }}人・{{ proposal.creatorApproved ? '承認' : '未承認' }}</strong></div><div><span>ユーザ院議会</span><strong>{{ proposal.userScore }}点・{{ proposal.userParticipants }}人・{{ proposal.userApproved ? '承認' : '未承認' }}</strong></div></div>
      <p v-if="proposal"><code>内容 {{ proposal.contentHash }}</code><br><code>仕様 {{ proposal.specificationHash }}</code><br><code>実行マニフェスト {{ proposal.manifestHash }}</code></p>
    </section>

    <section class="panel">
      <h3>3. 二次投票</h3>
      <div class="grid"><div><span>議員資格</span><strong>{{ houseLabel }}</strong></div><div><span>残り投票クレジット</span><strong>{{ remainingCredits }}</strong></div><div><span>投票強度</span><strong>{{ selectedIntensity > 0 ? '+' : '' }}{{ selectedIntensity }}</strong></div><div><span>二乗コスト</span><strong>{{ voteCost }}</strong></div></div>
      <label for="vote-intensity">反対 -3〜賛成 +3</label><input id="vote-intensity" v-model.number="selectedIntensity" type="range" min="-3" max="3" step="1">
      <div class="actions"><button type="button" @click="castVote" :disabled="!canVote">この強度で公開投票</button></div>
      <p class="warning">同じ提案へ再投票すると票を差し替えます。会期内の全提案について二乗コストの合計が共通予算を超える投票はコントラクトが拒否します。</p>
      <p v-if="lastTransaction"><a :href="`https://sepolia.etherscan.io/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">投票トランザクションを確認</a></p>
      <p aria-live="polite">{{ message }}</p>
    </section>
  </section>
</template>

<style scoped>
.governance-demo{display:grid;gap:1rem;margin:1.5rem 0}.panel{padding:clamp(1rem,3vw,1.5rem);border:1px solid var(--vp-c-divider);border-radius:16px;background:var(--vp-c-bg-soft)}.panel h2,.panel h3{margin-top:.2rem;border:0}.kicker{margin:0;color:var(--vp-c-brand-1);font-size:.82rem;font-weight:800;letter-spacing:.07em}.warning{padding:.75rem 1rem;border-left:4px solid var(--vp-c-warning-1);background:var(--vp-c-warning-soft);border-radius:6px}.error{color:var(--vp-c-danger-1)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.grid>div{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg)}.grid span{color:var(--vp-c-text-2);font-size:.82rem}.actions,.proposal-picker{display:flex;flex-wrap:wrap;align-items:center;gap:.65rem;margin-top:1rem}button,input{min-height:42px}button{padding:.55rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:8px;color:white;background:var(--vp-c-brand-1);font:inherit;font-weight:700}button.secondary{color:var(--vp-c-brand-1);background:transparent}button:disabled{opacity:.45}input[type=number]{width:7rem;padding:.4rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1)}input[type=range]{width:100%}code{overflow-wrap:anywhere}@media(max-width:640px){.grid{grid-template-columns:1fr}.actions button{width:100%}}
</style>
