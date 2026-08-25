<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, keccak256, parseEventLogs, toHex, type Address, type EIP1193Provider, type Hash } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { AMOY_CHAIN_ID, creatorRegistryAbi, hasActiveCreatorRegistry, switchProviderToAmoy, validateDeploymentManifest } from './testnet-user-demo.js'

type CreatorProfile = { registered: true; creatorId: string; artistName: string; entityType: string; genre: string; state: 'BROWSER_DEMO_ONLY'; createdAt: string }
type DemoProvider = EIP1193Provider & {
  on?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
  removeListener?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
}
type Deployment = { active: boolean; chainId: number; sourceCommit: string | null; contracts: { creatorRegistry?: Address | null } }
type ReleaseSummary = { releaseId: string; title: string; releaseType: string; transactionHash: Hash; declaredAt: string }

const profileKey = 'creator-first-browser-creator-v1'
const releasesKey = 'creator-first-testnet-creator-releases-v1'
const profile = ref<CreatorProfile>()
const deployment = ref<Deployment>()
const manifestError = ref('')
const walletAddress = ref<Address>()
const walletChainId = ref<number>()
const creatorId = ref(0n)
const creatorReleaseCount = ref(0n)
const creatorActive = ref(false)
const payoutAddress = ref<Address>()
const message = ref('')
const busyAction = ref('')
const lastTransaction = ref<Hash>()
const title = ref('')
const releaseType = ref('SINGLE')
const rightsAcknowledged = ref(false)
const releases = ref<ReleaseSummary[]>([])
let provider: DemoProvider | undefined
let listenersAttached = false

const correctChain = computed(() => walletChainId.value === AMOY_CHAIN_ID)
const registryReady = computed(() => hasActiveCreatorRegistry(deployment.value))
const chainReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && registryReady.value && !busyAction.value))
const registeredOnchain = computed(() => creatorId.value > 0n)
const normalizedTitle = computed(() => title.value.trim().normalize('NFKC'))
const titleValid = computed(() => /^[\p{L}\p{N}_ .,'’&()!-]{2,60}$/u.test(normalizedTitle.value))
const releaseReady = computed(() => chainReady.value && registeredOnchain.value && creatorActive.value && titleValid.value && rightsAcknowledged.value)

function providerFromWindow(): DemoProvider | undefined { return (window as Window & { ethereum?: DemoProvider }).ethereum }
function shortAddress(value?: string | null): string { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '未公開' }
function profileCommitment(): Hash {
  if (!profile.value) throw new Error('Test Creator Profileがありません。')
  return keccak256(toHex(JSON.stringify({
    domain: 'CREATOR_FIRST_TESTNET_PROFILE_V1', salt: profile.value.creatorId,
    artistName: profile.value.artistName, entityType: profile.value.entityType, genre: profile.value.genre
  })))
}
function releaseCommitments() {
  if (!profile.value || !walletAddress.value) throw new Error('ProfileまたはWalletがありません。')
  const nonce = crypto.randomUUID()
  return {
    metadata: keccak256(toHex(JSON.stringify({ domain: 'CREATOR_FIRST_TESTNET_RELEASE_V1', nonce, title: normalizedTitle.value, releaseType: releaseType.value }))),
    rights: keccak256(toHex(JSON.stringify({ domain: 'SELF_DECLARED_UNVERIFIED_V1', nonce, creator: profile.value.creatorId, account: walletAddress.value })))
  }
}
function clients() {
  const registry = deployment.value?.contracts.creatorRegistry
  if (!provider || !walletAddress.value || !registry || !registryReady.value) throw new Error('検証済みCreator RegistryまたはWalletを利用できません。')
  const transport = custom(provider)
  return {
    registry,
    publicClient: createPublicClient({ chain: polygonAmoy, transport }),
    walletClient: createWalletClient({ account: walletAddress.value, chain: polygonAmoy, transport })
  }
}
function clearOnchainState(): void { creatorId.value = 0n; creatorReleaseCount.value = 0n; creatorActive.value = false; payoutAddress.value = undefined }
async function refreshOnchainState(): Promise<void> {
  if (!walletAddress.value || !correctChain.value || !registryReady.value) return
  const { publicClient, registry } = clients()
  creatorId.value = await publicClient.readContract({ address: registry, abi: creatorRegistryAbi, functionName: 'creatorIdByAccount', args: [walletAddress.value] }) as bigint
  if (creatorId.value === 0n) { creatorReleaseCount.value = 0n; creatorActive.value = false; payoutAddress.value = undefined; return }
  const record = await publicClient.readContract({ address: registry, abi: creatorRegistryAbi, functionName: 'creators', args: [creatorId.value] }) as readonly [Address, Address, Hash, bigint, number, boolean]
  payoutAddress.value = record[1]
  creatorReleaseCount.value = BigInt(record[4])
  creatorActive.value = record[5]
}
const handleAccountsChanged = async (value: Address[] | string): Promise<void> => {
  walletAddress.value = Array.isArray(value) ? value[0] : undefined
  clearOnchainState(); message.value = walletAddress.value ? 'Wallet Accountが変わりました。状態を再取得します。' : 'Wallet接続が解除されました。'
  if (walletAddress.value) await refreshOnchainState()
}
const handleChainChanged = async (value: Address[] | string): Promise<void> => {
  walletChainId.value = typeof value === 'string' ? Number.parseInt(value, 16) : undefined
  clearOnchainState(); message.value = correctChain.value ? 'Polygon Amoyへ切り替わりました。' : '対象外Networkでは書込みを停止します。'
  if (correctChain.value) await refreshOnchainState()
}
function attachListeners(): void {
  if (!provider?.on || listenersAttached) return
  provider.on('accountsChanged', handleAccountsChanged); provider.on('chainChanged', handleChainChanged); listenersAttached = true
}
async function connectWallet(): Promise<void> {
  provider = providerFromWindow()
  if (!provider) { message.value = 'EIP-1193対応Walletが見つかりません。'; return }
  busyAction.value = 'wallet'
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    walletAddress.value = accounts[0]
    walletChainId.value = Number.parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16)
    attachListeners(); message.value = correctChain.value ? 'WalletをPolygon Amoyへ接続しました。' : 'Polygon Amoyへ切り替えてください。'
    await refreshOnchainState()
  } catch (error) { message.value = error instanceof Error ? error.message : 'Wallet接続に失敗しました。' }
  finally { busyAction.value = '' }
}
async function switchToAmoy(): Promise<void> {
  if (!provider) return
  busyAction.value = 'network'
  try {
    await switchProviderToAmoy(provider)
    walletChainId.value = AMOY_CHAIN_ID; await refreshOnchainState(); message.value = 'Polygon Amoyへ切り替えました。'
  } catch (error) { message.value = error instanceof Error ? error.message : 'Polygon Amoyへの切替に失敗しました。' }
  finally { busyAction.value = '' }
}
async function submit(action: string, write: () => Promise<Hash>) {
  busyAction.value = action; lastTransaction.value = undefined
  try {
    const hash = await write(); lastTransaction.value = hash; message.value = `${action} transactionの確定を待っています。`
    const receipt = await clients().publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error(`${action} transactionがrevertしました。`)
    await refreshOnchainState(); message.value = `${action} transactionがPolygon Amoyで確定しました。`
    return receipt
  } catch (error) { message.value = error instanceof Error ? error.message : `${action}に失敗しました。`; return undefined }
  finally { busyAction.value = '' }
}
async function registerOnchain(): Promise<void> {
  await submit('Creator登録', async () => {
    const { walletClient, registry } = clients()
    return walletClient.writeContract({ address: registry, abi: creatorRegistryAbi, functionName: 'registerCreator', args: [profileCommitment(), walletAddress.value as Address] })
  })
}
async function declareRelease(): Promise<void> {
  if (!releaseReady.value) return
  const commitments = releaseCommitments()
  const receipt = await submit('作品自己申告', async () => {
    const { walletClient, registry } = clients()
    return walletClient.writeContract({ address: registry, abi: creatorRegistryAbi, functionName: 'declareRelease', args: [commitments.metadata, commitments.rights] })
  })
  if (!receipt || !lastTransaction.value) return
  const event = parseEventLogs({ abi: creatorRegistryAbi, logs: receipt.logs, eventName: 'ReleaseDeclared' })[0]
  const releaseId = event?.args?.releaseId
  if (typeof releaseId !== 'bigint') { message.value = 'Transactionは成功しましたがRelease IDを取得できませんでした。'; return }
  releases.value = [{ releaseId: releaseId.toString(), title: normalizedTitle.value, releaseType: releaseType.value, transactionHash: lastTransaction.value, declaredAt: new Date().toISOString() }, ...releases.value].slice(0, 8)
  sessionStorage.setItem(releasesKey, JSON.stringify(releases.value))
  title.value = ''; releaseType.value = 'SINGLE'; rightsAcknowledged.value = false
}
async function loadDeployment(): Promise<void> {
  try {
    const response = await fetch(withBase('/testnet/deployment.json'), { cache: 'no-store' })
    if (!response.ok) throw new Error(`Deployment manifest HTTP ${response.status}`)
    deployment.value = validateDeploymentManifest(await response.json()) as Deployment
  } catch (error) { manifestError.value = error instanceof Error ? error.message : 'Deployment manifestを検証できません。' }
}
function restoreLocalState(): void {
  try {
    const storedProfile = sessionStorage.getItem(profileKey)
    if (storedProfile) {
      const value = JSON.parse(storedProfile) as Partial<CreatorProfile>
      if (value.registered === true && value.state === 'BROWSER_DEMO_ONLY' && typeof value.creatorId === 'string' && typeof value.artistName === 'string') profile.value = value as CreatorProfile
    }
    const storedReleases = sessionStorage.getItem(releasesKey)
    if (storedReleases) releases.value = (JSON.parse(storedReleases) as ReleaseSummary[]).filter((item) => /^\d+$/.test(item.releaseId) && /^0x[0-9a-f]{64}$/i.test(item.transactionHash)).slice(0, 8)
  } catch { sessionStorage.removeItem(releasesKey) }
}
onMounted(async () => { restoreLocalState(); await loadDeployment() })
onBeforeUnmount(() => {
  if (provider?.removeListener && listenersAttached) { provider.removeListener('accountsChanged', handleAccountsChanged); provider.removeListener('chainChanged', handleChainChanged) }
})
</script>

<template>
  <section class="creator-journey" aria-labelledby="creator-journey-title">
    <header><p class="kicker">Polygon Amoy · creator commitments · test only</p><h2 id="creator-journey-title">Test Creator Journey</h2><p>仮名Profile、Wallet、Creator登録、作品の権利自己申告を順番に検証します。</p><p class="safety"><strong>重要:</strong> 本人確認、権利確認、配信許諾、報酬受取資格、音源登録または作品公開ではありません。実在情報を入力しないでください。</p></header>
    <ol class="steps"><li :class="{ done: profile }">1. Profile</li><li :class="{ done: walletAddress && correctChain }">2. Wallet</li><li :class="{ done: registeredOnchain }">3. Creator</li><li :class="{ done: creatorReleaseCount > 0n }">4. Release</li></ol>

    <section v-if="!profile" class="panel"><h3>1. Test Creator Profile</h3><p>このタブにCreator Profileがありません。先に個人情報を含まない仮名Profileを作成してください。</p><a class="primary link" :href="withBase('/demo/creator-registration')">Test Creatorを登録</a></section>
    <section v-else class="panel"><h3>1. Test Creator Profile</h3><div class="status-grid"><div><span>Artist</span><strong>{{ profile.artistName }}</strong></div><div><span>Entity</span><strong>{{ profile.entityType }}</strong></div><div><span>Genre</span><strong>{{ profile.genre }}</strong></div><div><span>保存</span><strong>現在のタブのみ</strong></div></div></section>

    <section class="panel"><h3>2. WalletとDeployment</h3><div class="status-grid"><div><span>Deployment</span><strong>{{ manifestError ? '無効' : registryReady ? '公開済み' : 'Creator Registry未公開' }}</strong></div><div><span>Network</span><strong>{{ walletChainId ?? '未接続' }}<template v-if="walletChainId"> / {{ correctChain ? 'Polygon Amoy' : '対象外' }}</template></strong></div><div><span>Wallet</span><strong>{{ shortAddress(walletAddress) }}</strong></div><div><span>Registry</span><strong>{{ shortAddress(deployment?.contracts.creatorRegistry) }}</strong></div></div><p v-if="manifestError" class="error">{{ manifestError }}</p><div class="actions"><button class="primary" type="button" :disabled="!profile || busyAction === 'wallet'" @click="connectWallet">Walletを接続</button><button class="secondary" type="button" :disabled="!walletAddress || correctChain || busyAction === 'network'" @click="switchToAmoy">Polygon Amoyへ切替</button><button class="secondary" type="button" :disabled="!chainReady" @click="refreshOnchainState">状態を更新</button></div></section>

    <section class="panel"><h3>3. Creator Commitment登録</h3><div class="status-grid"><div><span>Creator ID</span><strong>{{ registeredOnchain ? creatorId.toString() : '未登録' }}</strong></div><div><span>状態</span><strong>{{ registeredOnchain ? creatorActive ? 'Active' : 'Inactive' : '未登録' }}</strong></div><div><span>Payout候補</span><strong>{{ shortAddress(payoutAddress) }}</strong></div><div><span>Release数</span><strong>{{ creatorReleaseCount.toString() }}</strong></div></div><p>Profile内容そのものではなくsalt付きcommitmentを登録します。Payout候補は接続Walletですが、本人・Payee・税務確認や送金を行いません。</p><button class="primary" type="button" :disabled="!chainReady || registeredOnchain" @click="registerOnchain">CreatorをPolygon Amoyへ登録</button></section>

    <section class="panel"><h3>4. 作品の自己申告Commitment</h3><form class="release-form" @submit.prevent="declareRelease"><label for="testnet-release-title">作品名（合成Demo用）</label><input id="testnet-release-title" v-model="title" type="text" minlength="2" maxlength="60" autocomplete="off" placeholder="Synthetic First Song" required><label for="testnet-release-type">Release種別</label><select id="testnet-release-type" v-model="releaseType"><option>SINGLE</option><option>EP</option><option>ALBUM</option></select><label class="check"><input v-model="rightsAcknowledged" type="checkbox"> ハッシュ登録は権利確認・配信許諾・作品公開ではなく、取消可能な自己申告にすぎないことを確認しました</label><button class="primary" type="submit" :disabled="!releaseReady">作品Commitmentを登録</button></form><p v-if="registeredOnchain && !creatorActive" class="error">Inactive Creatorは新しい作品を申告できません。</p><ul v-if="releases.length" class="release-list"><li v-for="release in releases" :key="release.releaseId"><div><strong>#{{ release.releaseId }} {{ release.title }}</strong><span>{{ release.releaseType }} · SELF_DECLARED_UNVERIFIED</span></div><a :href="`https://amoy.polygonscan.com/tx/${release.transactionHash}`" target="_blank" rel="noopener noreferrer">Transaction</a></li></ul></section>
    <p v-if="lastTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直近TransactionをEtherscanで確認</a></p><p aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.creator-journey { margin: 1.75rem 0; }.kicker { margin: 0; color: var(--vp-c-brand-1); font-size: .82rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.safety,.panel { padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }.safety { border-color: var(--vp-c-warning-1); }.steps { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .5rem; padding: 0; list-style: none; }.steps li { padding: .65rem; border-radius: 9px; background: var(--vp-c-bg-soft); text-align: center; }.steps li.done { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; }.panel { margin: 1rem 0; }.panel h3 { margin-top: 0; }.status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .75rem; }.status-grid div { display: grid; gap: .2rem; min-width: 0; }.status-grid span,.release-list span { color: var(--vp-c-text-2); font-size: .86rem; }.status-grid strong { overflow-wrap: anywhere; }.actions { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1rem; }.primary,.secondary { min-height: 44px; padding: .6rem .9rem; border: 1px solid var(--vp-c-brand-1); border-radius: 9px; font: inherit; font-weight: 700; cursor: pointer; }.primary { background: var(--vp-c-brand-1); color: var(--vp-c-white); }.secondary { background: transparent; color: var(--vp-c-brand-1); }.primary:disabled,.secondary:disabled { cursor: not-allowed; opacity: .5; }.link { display: inline-flex; align-items: center; text-decoration: none; }.release-form { display: grid; gap: .75rem; }.release-form > label:not(.check) { font-weight: 700; }.release-form input[type='text'],.release-form select { width: 100%; min-height: 44px; padding: .65rem .8rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }.check { display: grid; grid-template-columns: 1.25rem minmax(0,1fr); gap: .65rem; }.check input { width: 1.1rem; height: 1.1rem; }.release-list { display: grid; gap: .65rem; padding: 0; list-style: none; }.release-list li { display: flex; justify-content: space-between; gap: .75rem; padding: .7rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); }.release-list li div { display: grid; }.error { color: var(--vp-c-danger-1); }@media(max-width:720px){.status-grid,.steps{grid-template-columns:1fr 1fr}}@media(max-width:540px){.actions,.release-list li{display:grid}.primary,.secondary{width:100%}}
</style>
