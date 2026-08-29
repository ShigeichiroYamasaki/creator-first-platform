<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, keccak256, parseEventLogs, toHex, zeroHash, type Address, type EIP1193Provider, type Hash } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { AMOY_CHAIN_ID, creatorRegistryAbi, getAmoyTransactionFees, hasActiveCreatorRegistry, hasActiveParticipantRegistry, participantRegistryAbi, switchProviderToAmoy, TESTNET_CREATOR_ENROLLMENT_CONSENT_VERSION, TESTNET_CREATOR_ROLE, validateDeploymentManifest } from './testnet-user-demo.js'

type CreatorProfile = { registered: true; creatorId: string; artistName: string; entityType: string; genre: string; state: 'BROWSER_DEMO_ONLY'; createdAt: string }
type DemoProvider = EIP1193Provider & {
  on?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
  removeListener?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
}
type Deployment = { active: boolean; chainId: number; sourceCommit: string | null; contracts: { creatorRegistry?: Address | null; participantRegistry?: Address | null } }
type ReleaseSummary = { releaseId: string; title: string; releaseType: string; transactionHash: Hash; declaredAt: string }

const profileKey = 'creator-first-browser-creator-v1'
const releasesKey = 'creator-first-testnet-creator-releases-v1'
const profile = ref<CreatorProfile>()
const deployment = ref<Deployment>()
const manifestError = ref('')
const walletAddress = ref<Address>()
const walletChainId = ref<number>()
const participantId = ref<Hash>(zeroHash)
const approvedParticipantRoles = ref(0)
const registeredParticipantRoles = ref(0)
const participantApprovalExpiresAt = ref(0n)
const participantActive = ref(false)
const initialFundingCompleted = ref(false)
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
const participantRegistryReady = computed(() => hasActiveParticipantRegistry(deployment.value))
const creatorPreApproved = computed(() => participantActive.value && (approvedParticipantRoles.value & TESTNET_CREATOR_ROLE) !== 0 && participantApprovalExpiresAt.value >= BigInt(Math.floor(Date.now() / 1000)))
const creatorParticipantRegistered = computed(() => participantActive.value && (registeredParticipantRoles.value & TESTNET_CREATOR_ROLE) !== 0)
const participantSelfRegistrationReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && participantRegistryReady.value && creatorPreApproved.value && !creatorParticipantRegistered.value && !busyAction.value))
const chainReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && registryReady.value && (!participantRegistryReady.value || creatorParticipantRegistered.value) && !busyAction.value))
const registeredOnchain = computed(() => creatorId.value > 0n)
const normalizedTitle = computed(() => title.value.trim().normalize('NFKC'))
const titleValid = computed(() => /^[\p{L}\p{N}_ .,'’&()!-]{2,60}$/u.test(normalizedTitle.value))
const releaseReady = computed(() => chainReady.value && registeredOnchain.value && creatorActive.value && titleValid.value && rightsAcknowledged.value)

function providerFromWindow(): DemoProvider | undefined { return (window as Window & { ethereum?: DemoProvider }).ethereum }
function shortAddress(value?: string | null): string { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '未公開' }
function entityLabel(value: string): string {
  return ({ INDIVIDUAL: '個人・ソロ', GROUP: 'グループ', COLLECTIVE: '共同制作チーム' } as Record<string, string>)[value] ?? value
}
function profileCommitment(): Hash {
  if (!profile.value) throw new Error('仮の活動情報がありません。')
  return keccak256(toHex(JSON.stringify({
    domain: 'CREATOR_FIRST_TESTNET_PROFILE_V1', salt: profile.value.creatorId,
    artistName: profile.value.artistName, entityType: profile.value.entityType, genre: profile.value.genre
  })))
}
function releaseCommitments() {
  if (!profile.value || !walletAddress.value) throw new Error('仮の活動情報または仮想通貨ワレットの接続がありません。')
  const nonce = crypto.randomUUID()
  return {
    metadata: keccak256(toHex(JSON.stringify({ domain: 'CREATOR_FIRST_TESTNET_RELEASE_V1', nonce, title: normalizedTitle.value, releaseType: releaseType.value }))),
    rights: keccak256(toHex(JSON.stringify({ domain: 'SELF_DECLARED_UNVERIFIED_V1', nonce, creator: profile.value.creatorId, account: walletAddress.value })))
  }
}
function clients() {
  const registry = deployment.value?.contracts.creatorRegistry
  if (!provider || !walletAddress.value || !registry || !registryReady.value) throw new Error('活動の記録先または仮想通貨ワレットを利用できません。')
  const transport = custom(provider)
  return {
    registry,
    publicClient: createPublicClient({ chain: polygonAmoy, transport }),
    walletClient: createWalletClient({ account: walletAddress.value, chain: polygonAmoy, transport })
  }
}
function clearOnchainState(): void {
  creatorId.value = 0n; creatorReleaseCount.value = 0n; creatorActive.value = false; payoutAddress.value = undefined
  participantId.value = zeroHash; approvedParticipantRoles.value = 0; registeredParticipantRoles.value = 0
  participantApprovalExpiresAt.value = 0n; participantActive.value = false; initialFundingCompleted.value = false
}
async function refreshOnchainState(): Promise<void> {
  if (!walletAddress.value || !correctChain.value || !registryReady.value) return
  const { publicClient, registry } = clients()
  const enrollmentRegistry = deployment.value?.contracts.participantRegistry
  if (enrollmentRegistry && participantRegistryReady.value) {
    participantId.value = await publicClient.readContract({ address: enrollmentRegistry, abi: participantRegistryAbi, functionName: 'participantIdByWallet', args: [walletAddress.value] }) as Hash
    if (participantId.value !== zeroHash) {
      const participant = await publicClient.readContract({ address: enrollmentRegistry, abi: participantRegistryAbi, functionName: 'participants', args: [participantId.value] }) as readonly [Address, number, number, bigint, bigint, boolean, boolean]
      approvedParticipantRoles.value = Number(participant[1]); registeredParticipantRoles.value = Number(participant[2])
      participantApprovalExpiresAt.value = participant[4]; participantActive.value = participant[5]; initialFundingCompleted.value = participant[6]
    }
  }
  creatorId.value = await publicClient.readContract({ address: registry, abi: creatorRegistryAbi, functionName: 'creatorIdByAccount', args: [walletAddress.value] }) as bigint
  if (creatorId.value === 0n) { creatorReleaseCount.value = 0n; creatorActive.value = false; payoutAddress.value = undefined; return }
  const record = await publicClient.readContract({ address: registry, abi: creatorRegistryAbi, functionName: 'creators', args: [creatorId.value] }) as readonly [Address, Address, Hash, bigint, number, boolean]
  payoutAddress.value = record[1]
  creatorReleaseCount.value = BigInt(record[4])
  creatorActive.value = record[5]
}
const handleAccountsChanged = async (value: Address[] | string): Promise<void> => {
  walletAddress.value = Array.isArray(value) ? value[0] : undefined
  clearOnchainState(); message.value = walletAddress.value ? '仮想通貨ワレットのアカウントが変わりました。状態を確認します。' : '仮想通貨ワレットの接続が解除されました。'
  if (walletAddress.value) await refreshOnchainState()
}
const handleChainChanged = async (value: Address[] | string): Promise<void> => {
  walletChainId.value = typeof value === 'string' ? Number.parseInt(value, 16) : undefined
  clearOnchainState(); message.value = correctChain.value ? '練習用ネットワークへ切り替わりました。' : '別のネットワークでは記録操作を停止します。'
  if (correctChain.value) await refreshOnchainState()
}
function attachListeners(): void {
  if (!provider?.on || listenersAttached) return
  provider.on('accountsChanged', handleAccountsChanged); provider.on('chainChanged', handleChainChanged); listenersAttached = true
}
async function connectWallet(): Promise<void> {
  provider = providerFromWindow()
  if (!provider) { message.value = '仮想通貨ワレットが見つかりません。MetaMaskをインストールしてください。'; return }
  busyAction.value = 'wallet'
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    walletAddress.value = accounts[0]
    walletChainId.value = Number.parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16)
    attachListeners(); message.value = correctChain.value ? '仮想通貨ワレットを練習用ネットワークへ接続しました。' : '練習用ネットワークへ切り替えてください。'
    await refreshOnchainState()
  } catch (error) { message.value = error instanceof Error ? error.message : '仮想通貨ワレットを接続できませんでした。' }
  finally { busyAction.value = '' }
}
async function switchToAmoy(): Promise<void> {
  if (!provider) return
  busyAction.value = 'network'
  try {
    await switchProviderToAmoy(provider)
    walletChainId.value = AMOY_CHAIN_ID; await refreshOnchainState(); message.value = '練習用ネットワークへ切り替えました。'
  } catch (error) { message.value = error instanceof Error ? error.message : '練習用ネットワークへ切り替えられませんでした。' }
  finally { busyAction.value = '' }
}
async function submit(action: string, write: () => Promise<Hash>) {
  busyAction.value = action; lastTransaction.value = undefined
  try {
    const hash = await write(); lastTransaction.value = hash; message.value = `${action}の操作を送信しました。完了を待っています。`
    const receipt = await clients().publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error(`${action}の操作が完了しませんでした。`)
    await refreshOnchainState(); message.value = `${action}が完了しました。`
    return receipt
  } catch (error) { message.value = error instanceof Error ? error.message : `${action}に失敗しました。`; return undefined }
  finally { busyAction.value = '' }
}
async function registerOnchain(): Promise<void> {
  await submit('活動したことの記録', async () => {
    const { publicClient, walletClient, registry } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: registry, abi: creatorRegistryAbi, functionName: 'registerCreator', args: [profileCommitment(), walletAddress.value as Address], ...fees })
  })
}
async function registerCreatorParticipant(): Promise<void> {
  const enrollmentRegistry = deployment.value?.contracts.participantRegistry
  if (!enrollmentRegistry) return
  await submit('音楽クリエータとしての実験参加登録', async () => {
    const { publicClient, walletClient } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: enrollmentRegistry, abi: participantRegistryAbi, functionName: 'registerSelf', args: [TESTNET_CREATOR_ROLE, TESTNET_CREATOR_ENROLLMENT_CONSENT_VERSION], ...fees })
  })
}
async function declareRelease(): Promise<void> {
  if (!releaseReady.value) return
  const commitments = releaseCommitments()
  const receipt = await submit('作品自己申告', async () => {
    const { publicClient, walletClient, registry } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: registry, abi: creatorRegistryAbi, functionName: 'declareRelease', args: [commitments.metadata, commitments.rights], ...fees })
  })
  if (!receipt || !lastTransaction.value) return
  const event = parseEventLogs({ abi: creatorRegistryAbi, logs: receipt.logs, eventName: 'ReleaseDeclared' })[0]
  const releaseId = event?.args?.releaseId
  if (typeof releaseId !== 'bigint') { message.value = '操作は完了しましたが、テスト作品の登録番号を取得できませんでした。'; return }
  releases.value = [{ releaseId: releaseId.toString(), title: normalizedTitle.value, releaseType: releaseType.value, transactionHash: lastTransaction.value, declaredAt: new Date().toISOString() }, ...releases.value].slice(0, 8)
  sessionStorage.setItem(releasesKey, JSON.stringify(releases.value))
  title.value = ''; releaseType.value = 'SINGLE'; rightsAcknowledged.value = false
}
async function loadDeployment(): Promise<void> {
  try {
    const response = await fetch(withBase('/testnet/deployment.json'), { cache: 'no-store' })
    if (!response.ok) throw new Error(`実験の公開情報を取得できません（HTTP ${response.status}）`)
    deployment.value = validateDeploymentManifest(await response.json()) as Deployment
  } catch (error) { manifestError.value = error instanceof Error ? error.message : '実験の公開情報を確認できません。' }
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
    <header><p class="kicker">実在作品を使わない公開実験</p><h2 id="creator-journey-title">音楽クリエータの活動体験</h2><p>仮の活動情報、仮想通貨ワレット、実験参加の確認、テスト作品の自己申告を順番に試します。</p><p class="safety"><strong>重要:</strong> 本人、作品の権利、配信許可、報酬の受取資格を確認するものではありません。実在情報を入力しないでください。</p></header>
    <ol class="steps"><li :class="{ done: profile }">1. 活動情報</li><li :class="{ done: walletAddress && correctChain }">2. 仮想通貨ワレット</li><li :class="{ done: creatorParticipantRegistered }">3. 参加確認</li><li :class="{ done: registeredOnchain }">4. 活動登録</li><li :class="{ done: creatorReleaseCount > 0n }">5. テスト作品</li></ol>

    <section v-if="!profile" class="panel"><h3>1. 仮の活動情報</h3><p>このタブに活動情報がありません。先に個人情報を含まない仮の活動情報を作成してください。</p><a class="primary link" :href="withBase('/demo/creator-registration')">仮の活動情報を登録</a></section>
    <section v-else class="panel"><h3>1. 仮の活動情報</h3><div class="status-grid"><div><span>活動名</span><strong>{{ profile.artistName }}</strong></div><div><span>活動形態</span><strong>{{ entityLabel(profile.entityType) }}</strong></div><div><span>音楽の分野</span><strong>{{ profile.genre }}</strong></div><div><span>保存場所</span><strong>現在のタブのみ</strong></div></div></section>

    <section class="panel"><h3>2. 仮想通貨ワレットをつなぐ</h3><div class="status-grid"><div><span>実験の準備</span><strong>{{ manifestError ? '利用停止中' : registryReady ? '利用できます' : '準備中' }}</strong></div><div><span>練習用ネットワーク</span><strong>{{ walletChainId ? (correctChain ? '接続済み' : '切替が必要') : '未接続' }}</strong></div><div><span>仮想通貨ワレット</span><strong>{{ shortAddress(walletAddress) }}</strong></div><div><span>記録先</span><strong>{{ deployment?.contracts.creatorRegistry ? '確認済み' : '準備中' }}</strong></div></div><p v-if="manifestError" class="error">{{ manifestError }}</p><div class="actions"><button class="primary" type="button" :disabled="!profile || busyAction === 'wallet'" @click="connectWallet">仮想通貨ワレットをつなぐ</button><button class="secondary" type="button" :disabled="!walletAddress || correctChain || busyAction === 'network'" @click="switchToAmoy">練習用ネットワークへ切り替える</button><button class="secondary" type="button" :disabled="!chainReady" @click="refreshOnchainState">表示を更新</button></div></section>

    <section class="panel"><h3>3. 実験参加登録を確認</h3><div class="status-grid"><div><span>実験参加の受付</span><strong>{{ participantRegistryReady ? '利用できます' : '準備中' }}</strong></div><div><span>運営の確認</span><strong>{{ creatorPreApproved ? '確認済み' : participantId !== zeroHash ? '期限切れ／停止' : '確認待ち' }}</strong></div><div><span>本人による登録</span><strong>{{ creatorParticipantRegistered ? '登録済み' : '未登録' }}</strong></div><div><span>練習用の手数料残高</span><strong>{{ initialFundingCompleted ? '受取済み' : '準備待ち' }}</strong></div></div><p v-if="!participantRegistryReady" class="safety">実験参加登録の受付を準備しています。申請受付サーバが公開されるまで、入力内容は送信されません。</p><p v-else-if="!creatorPreApproved && !creatorParticipantRegistered" class="safety">まだ招待されていない場合は、この画面から実験参加を申請できます。メール確認と運営の承認後に届く招待リンクから登録を続けてください。</p><p v-else>本人が仮想通貨ワレットで確認し、音楽クリエータとしての実験参加を記録します。これは本人、権利者、報酬の受取人または配信許可の確認ではありません。</p><ParticipantApplicationDemo v-if="!creatorPreApproved && !creatorParticipantRegistered" :display-name="profile?.artistName ?? ''" :role="2" /><button v-if="creatorPreApproved && !creatorParticipantRegistered" class="primary" type="button" :disabled="!participantSelfRegistrationReady" @click="registerCreatorParticipant">音楽クリエータとして登録</button><p v-else-if="creatorParticipantRegistered"><strong>実験参加登録は完了しています。</strong></p></section>

    <section class="panel"><h3>4. 活動したことを記録</h3><div class="status-grid"><div><span>実験用登録番号</span><strong>{{ registeredOnchain ? creatorId.toString() : '未登録' }}</strong></div><div><span>状態</span><strong>{{ registeredOnchain ? creatorActive ? '利用中' : '停止中' : '未登録' }}</strong></div><div><span>接続した仮想通貨ワレット</span><strong>{{ shortAddress(payoutAddress) }}</strong></div><div><span>テスト作品数</span><strong>{{ creatorReleaseCount.toString() }}</strong></div></div><p>活動情報そのものを公開せず、その時点で登録したことだけを確認できる形で記録します。本人確認、報酬の受取確認または送金は行いません。</p><button class="primary" type="button" :disabled="!chainReady || registeredOnchain" @click="registerOnchain">活動したことを記録する</button></section>

    <section class="panel"><h3>5. テスト作品を自己申告</h3><form class="release-form" @submit.prevent="declareRelease"><label for="testnet-release-title">架空の作品名</label><input id="testnet-release-title" v-model="title" type="text" minlength="2" maxlength="60" autocomplete="off" placeholder="Synthetic First Song" required><label for="testnet-release-type">作品の形式</label><select id="testnet-release-type" v-model="releaseType"><option value="SINGLE">シングル</option><option value="EP">EP</option><option value="ALBUM">アルバム</option></select><label class="check"><input v-model="rightsAcknowledged" type="checkbox"> この記録は権利確認、配信許可、作品公開ではなく、取り下げ可能な自己申告であることを確認しました</label><button class="primary" type="submit" :disabled="!releaseReady">テスト作品を自己申告する</button></form><p v-if="registeredOnchain && !creatorActive" class="error">活動を停止している間は新しい作品を申告できません。</p><ul v-if="releases.length" class="release-list"><li v-for="release in releases" :key="release.releaseId"><div><strong>#{{ release.releaseId }} {{ release.title }}</strong><span>{{ release.releaseType }} · 未確認の自己申告</span></div><a :href="`https://amoy.polygonscan.com/tx/${release.transactionHash}`" target="_blank" rel="noopener noreferrer">操作記録</a></li></ul></section>
    <p v-if="lastTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直前の操作記録を確認</a></p><p aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.creator-journey { margin: 1.75rem 0; }.kicker { margin: 0; color: var(--vp-c-brand-1); font-size: .82rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.safety,.panel { padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }.safety { border-color: var(--vp-c-warning-1); }.steps { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .5rem; padding: 0; list-style: none; }.steps li { padding: .65rem; border-radius: 9px; background: var(--vp-c-bg-soft); text-align: center; }.steps li.done { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; }.panel { margin: 1rem 0; }.panel h3 { margin-top: 0; }.status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .75rem; }.status-grid div { display: grid; gap: .2rem; min-width: 0; }.status-grid span,.release-list span { color: var(--vp-c-text-2); font-size: .86rem; }.status-grid strong { overflow-wrap: anywhere; }.actions { display: flex; flex-wrap: wrap; gap: .65rem; margin-top: 1rem; }.primary,.secondary { min-height: 44px; padding: .6rem .9rem; border: 1px solid var(--vp-c-brand-1); border-radius: 9px; font: inherit; font-weight: 700; cursor: pointer; }.primary { background: var(--vp-c-brand-1); color: var(--vp-c-white); }.secondary { background: transparent; color: var(--vp-c-brand-1); }.primary:disabled,.secondary:disabled { cursor: not-allowed; opacity: .5; }.link { display: inline-flex; align-items: center; text-decoration: none; }.release-form { display: grid; gap: .75rem; }.release-form > label:not(.check) { font-weight: 700; }.release-form input[type='text'],.release-form select { width: 100%; min-height: 44px; padding: .65rem .8rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); color: var(--vp-c-text-1); font: inherit; }.check { display: grid; grid-template-columns: 1.25rem minmax(0,1fr); gap: .65rem; }.check input { width: 1.1rem; height: 1.1rem; }.release-list { display: grid; gap: .65rem; padding: 0; list-style: none; }.release-list li { display: flex; justify-content: space-between; gap: .75rem; padding: .7rem; border: 1px solid var(--vp-c-divider); border-radius: 9px; background: var(--vp-c-bg); }.release-list li div { display: grid; }.error { color: var(--vp-c-danger-1); }@media(max-width:720px){.status-grid,.steps{grid-template-columns:1fr 1fr}}@media(max-width:540px){.actions,.release-list li{display:grid}.primary,.secondary{width:100%}}
</style>
