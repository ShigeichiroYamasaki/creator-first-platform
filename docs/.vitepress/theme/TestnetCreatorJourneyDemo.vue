<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import CreatorRegistrationDemo from './CreatorRegistrationDemo.vue'
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
const participantSelfRegistrationReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && participantRegistryReady.value && creatorPreApproved.value && initialFundingCompleted.value && !creatorParticipantRegistered.value && !busyAction.value))
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
function handleProfileRegistered(value: CreatorProfile): void {
  profile.value = value
  message.value = '仮の活動情報を登録しました。次に仮想通貨ワレットをつないでください。'
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
    <header><p class="kicker">実在作品を使わない公開実験</p><h2 id="creator-journey-title">音楽クリエータの活動体験</h2><p>仮の活動情報とテスト作品を使い、登録から権利確認、配信、ファンとの関係、収益分配、ルールづくりまでの活動全体を確認します。</p><p class="safety"><strong>重要:</strong> 本人、作品の権利、配信許可、報酬の受取資格を確認するものではありません。実在情報を入力しないでください。</p></header>
    <ol class="steps"><li :class="{ done: profile }">1. 活動情報</li><li :class="{ done: walletAddress && correctChain }">2. 仮想通貨ワレット</li><li :class="{ done: creatorParticipantRegistered }">3. 参加確認</li><li :class="{ done: registeredOnchain }">4. 活動登録</li><li :class="{ done: creatorReleaseCount > 0n }">5. テスト作品</li></ol>

    <details class="optional-details">
      <summary>音楽クリエータ活動の全体像を見る</summary>
      <section class="activity-map" aria-labelledby="activity-map-title">
      <div class="section-heading"><div><p class="kicker">ホワイトペーパーの活動像</p><h3 id="activity-map-title">作品がファンへ届き、活動へ還元されるまで</h3></div><span class="experiment-badge">説明＋一部実動</span></div>
      <div class="activity-flow" aria-label="音楽クリエータの活動の流れ">
        <article><span aria-hidden="true">🎼</span><strong>1. 作品を登録</strong><small>作品情報と関係者を整理</small></article>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <article><span aria-hidden="true">🧾</span><strong>2. 権利を確認</strong><small>著作権・原盤権・契約範囲</small></article>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <article><span aria-hidden="true">🎧</span><strong>3. 配信する</strong><small>許諾済みの作品だけを公開</small></article>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <article><span aria-hidden="true">🤝</span><strong>4. ファンとつながる</strong><small>応援・コミュニティ・利用実績</small></article>
        <span class="flow-arrow" aria-hidden="true">→</span>
        <article><span aria-hidden="true">📊</span><strong>5. 還元を確認</strong><small>分配根拠と支払状態を透明化</small></article>
      </div>
      <p class="boundary-note"><strong>現在実際に動く範囲:</strong> このページでは「活動情報」と「未確認の作品自己申告」をPolygon Amoyへ記録できます。その後の権利処理・配信・集計・支払いは、将来の本番運用で株式会社が責任を持って行う範囲です。</p>
      </section>
    </details>

    <CreatorRegistrationDemo v-if="!profile" @registered="handleProfileRegistered" />
    <p v-else class="completed-step"><span aria-hidden="true">✓</span><strong>仮の活動情報を登録しました</strong><small>{{ profile.artistName }}</small></p>

    <section v-if="profile && (!walletAddress || !correctChain)" class="panel current-step"><h3>2. 仮想通貨ワレットをつなぐ</h3><div class="status-grid"><div><span>練習用ネットワーク</span><strong>{{ walletChainId ? '切替が必要' : '未接続' }}</strong></div><div><span>仮想通貨ワレット</span><strong>{{ shortAddress(walletAddress) }}</strong></div></div><p v-if="manifestError" class="error">{{ manifestError }}</p><div class="actions"><button v-if="!walletAddress" class="primary" type="button" :disabled="busyAction === 'wallet'" @click="connectWallet">仮想通貨ワレットをつなぐ</button><button v-else-if="!correctChain" class="primary" type="button" :disabled="busyAction === 'network'" @click="switchToAmoy">練習用ネットワークへ切り替える</button></div></section>
    <p v-else-if="profile && walletAddress && correctChain" class="completed-step"><span aria-hidden="true">✓</span><strong>仮想通貨ワレットを接続しました</strong><small>{{ shortAddress(walletAddress) }}</small></p>

    <section v-if="walletAddress && correctChain && !creatorParticipantRegistered" class="panel current-step"><h3>3. 音楽クリエータの利用資格を登録</h3><div class="status-grid"><div><span>運営の確認</span><strong>{{ creatorPreApproved ? '確認済み' : participantId !== zeroHash ? '期限切れ／停止' : '確認待ち' }}</strong></div><div><span>初回POL</span><strong>{{ initialFundingCompleted ? '受取済み' : '準備待ち' }}</strong></div></div><p v-if="!participantRegistryReady" class="safety">参加資格を記録する準備を進めています。</p><p v-else-if="!creatorPreApproved" class="safety">招待登録に使ったものと同じ仮想通貨ワレットか確認してください。</p><p v-else-if="!initialFundingCompleted" class="safety">初回POLの準備が完了するまでお待ちください。</p><p v-else>音楽クリエータとしての参加を記録します。</p><a v-if="!creatorPreApproved" class="secondary link" :href="withBase('/demo/creator-participation')">実験参加の準備へ戻る</a><button v-else class="primary" type="button" :disabled="!participantSelfRegistrationReady" @click="registerCreatorParticipant">音楽クリエータとして登録</button></section>
    <p v-else-if="creatorParticipantRegistered" class="completed-step"><span aria-hidden="true">✓</span><strong>音楽クリエータとして登録済みです</strong></p>

    <section v-if="creatorParticipantRegistered && !registeredOnchain" class="panel current-step"><h3>4. 活動したことを記録</h3><p>活動情報そのものを公開せず、登録した事実だけを練習用ネットワークへ記録します。</p><button class="primary" type="button" :disabled="!chainReady" @click="registerOnchain">活動したことを記録する</button></section>
    <p v-else-if="registeredOnchain" class="completed-step"><span aria-hidden="true">✓</span><strong>活動情報を記録済みです</strong><small>登録番号 {{ creatorId.toString() }}</small></p>

    <section v-if="registeredOnchain" class="panel current-step"><h3>5. テスト作品を自己申告</h3><form class="release-form" @submit.prevent="declareRelease"><label for="testnet-release-title">架空の作品名</label><input id="testnet-release-title" v-model="title" type="text" minlength="2" maxlength="60" autocomplete="off" placeholder="Synthetic First Song" required><label for="testnet-release-type">作品の形式</label><select id="testnet-release-type" v-model="releaseType"><option value="SINGLE">シングル</option><option value="EP">EP</option><option value="ALBUM">アルバム</option></select><label class="check"><input v-model="rightsAcknowledged" type="checkbox"> これは権利確認や作品公開ではないテスト記録です</label><button class="primary" type="submit" :disabled="!releaseReady">テスト作品を自己申告する</button></form><p v-if="!creatorActive" class="error">活動を停止している間は新しい作品を申告できません。</p><ul v-if="releases.length" class="release-list"><li v-for="release in releases" :key="release.releaseId"><div><strong>#{{ release.releaseId }} {{ release.title }}</strong><span>{{ release.releaseType }} · 未確認の自己申告</span></div><a :href="`https://amoy.polygonscan.com/tx/${release.transactionHash}`" target="_blank" rel="noopener noreferrer">操作記録</a></li></ul></section>

    <details v-if="registeredOnchain" class="optional-details">
      <summary>将来の活動管理画面を見る</summary>
      <section class="activity-dashboard" aria-labelledby="activity-dashboard-title">
      <div class="section-heading"><div><p class="kicker">活動全体の現在地</p><h3 id="activity-dashboard-title">登録後に管理する五つの領域</h3></div><span class="experiment-badge">実験用表示</span></div>
      <div class="domain-grid">
        <article>
          <div class="domain-title"><span aria-hidden="true">🎼</span><h4>作品・権利</h4></div>
          <dl><div><dt>作品自己申告</dt><dd>{{ creatorReleaseCount.toString() }}件</dd></div><div><dt>権利確認</dt><dd class="pending">未実施</dd></div><div><dt>配信許可</dt><dd class="pending">未取得</dd></div></dl>
          <p>本番では作詞・作曲、実演、原盤、共同権利者、管理事業者、地域・期間を分けて確認します。</p>
        </article>
        <article>
          <div class="domain-title"><span aria-hidden="true">📡</span><h4>配信・利用実績</h4></div>
          <dl><div><dt>ストリーミング</dt><dd class="pending">未接続</dd></div><div><dt>利用実績</dt><dd class="pending">集計なし</dd></div><div><dt>管理団体への報告</dt><dd class="pending">未実施</dd></div></dl>
          <p>確認済み作品だけを配信し、利用実績をJASRAC・NexTone等への報告や分配計算へつなぎます。</p>
        </article>
        <article>
          <div class="domain-title"><span aria-hidden="true">🤝</span><h4>ファン・コミュニティ</h4></div>
          <dl><div><dt>サポーター</dt><dd class="pending">集計未接続</dd></div><div><dt>ファン指定配分</dt><dd class="pending">説明段階</dd></div><div><dt>交流機能</dt><dd class="pending">未実装</dd></div></dl>
          <p>ファン登録は応援関係を示し、月額料金のうち上限付きの一部を配分する意思と分けて扱います。</p>
        </article>
        <article>
          <div class="domain-title"><span aria-hidden="true">💴</span><h4>収益・支払い</h4></div>
          <dl><div><dt>計算済み報酬</dt><dd>0 tJPYC</dd></div><div><dt>支払い</dt><dd class="pending">行いません</dd></div><div><dt>会計との照合</dt><dd class="pending">未接続</dd></div></dl>
          <p>本番では利用実績、ファン指定、権利処理費、税・保留額を分離し、根拠と状態を表示します。</p>
          <a class="domain-link" :href="withBase('/demo/treasury-dashboard')">資金フローの画面見本を見る</a>
        </article>
        <article>
          <div class="domain-title"><span aria-hidden="true">🏛️</span><h4>ルールづくり</h4></div>
          <dl><div><dt>音楽クリエータ院議会</dt><dd>別画面で体験</dd></div><div><dt>正式な議員資格</dt><dd class="pending">付与されません</dd></div></dl>
          <p>権利、分配、制作活動に関する提案を審議します。株式会社の法的責任を議決で置き換えるものではありません。</p>
          <a class="domain-link" :href="withBase('/demo/creator-house')">音楽クリエータ院議会を開く</a>
        </article>
      </div>
      <p class="boundary-note">画面にある未接続・未実施の項目は、ホワイトペーパーの将来設計を示すものです。JASRAC・NexToneとの契約、権利照合、報告、実際の収益・支払いを完了したという表示ではありません。</p>
      </section>
    </details>
    <p v-if="lastTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直前の操作記録を確認</a></p><p aria-live="polite">{{ message }}</p>
  </section>
</template>

<style scoped>
.creator-journey { margin: 1.75rem 0; }.kicker { margin: 0; color: var(--vp-c-brand-1); font-size: .82rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }.safety,.panel,.activity-map,.activity-dashboard { padding: 1rem; border: 1px solid var(--vp-c-divider); border-radius: 14px; background: var(--vp-c-bg-soft); }.safety { border-color: var(--vp-c-warning-1); }.steps { display: grid; grid-template-columns: repeat(5,minmax(0,1fr)); gap: .5rem; padding: 0; list-style: none; }.steps li { padding: .65rem; border-radius: 9px; background: var(--vp-c-bg-soft); text-align: center; }.steps li.done { background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-weight: 700; }.current-step{border:2px solid var(--vp-c-brand-1)}.completed-step{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:1rem 0;padding:.75rem 1rem;border-radius:12px;background:var(--vp-c-brand-soft)}.completed-step>span{display:grid;width:1.6rem;height:1.6rem;place-items:center;border-radius:50%;background:var(--vp-c-brand-1);color:white;font-weight:800}.completed-step small{margin-left:auto;color:var(--vp-c-text-2)}.optional-details{margin:1rem 0;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}.optional-details>summary{padding:.85rem 1rem;cursor:pointer;font-weight:700}.optional-details[open]>summary{border-bottom:1px solid var(--vp-c-divider)}.optional-details .activity-map,.optional-details .activity-dashboard{margin:0;border:0;border-radius:0 0 12px 12px}.panel,.activity-map,.activity-dashboard { margin: 1rem 0; }.panel h3,.section-heading h3 { margin-top: 0; }.section-heading { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: start; gap: .75rem; }.section-heading h3 { margin: .2rem 0 0; }.experiment-badge { padding: .3rem .65rem; border-radius: 999px; background: var(--vp-c-brand-soft); color: var(--vp-c-brand-1); font-size: .82rem; font-weight: 700; }.activity-flow { display: grid; grid-template-columns: repeat(9,auto); gap: .4rem; align-items: stretch; margin: 1rem 0; }.activity-flow article { display: grid; align-content: start; gap: .35rem; min-width: 0; padding: .8rem; border: 1px solid var(--vp-c-divider); border-radius: 11px; background: var(--vp-c-bg); }.activity-flow article > span { font-size: 1.45rem; }.activity-flow small { color: var(--vp-c-text-2); }.flow-arrow { align-self: center; color: var(--vp-c-brand-1); font-size: 1.25rem; font-weight: 700; }.boundary-note { padding: .85rem; border-left: 4px solid var(--vp-c-warning-1); border-radius: 7px; background: var(--vp-c-bg); color: var(--vp-c-text-2); }.status-grid { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: .75rem; }.status-grid div { display: grid; gap: .2rem; min-width: 0; }.status-grid span,.release-list span { color: var(--vp-c-text-2); font-size: .86rem; }.status-grid strong { overflow-wrap: anywhere; }.actions { display: flex; flex-wrap:wrap;gap:.65rem;margin-top:1rem}.primary,.secondary{min-height:44px;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;font:inherit;font-weight:700;cursor:pointer}.primary{background:var(--vp-c-brand-1);color:var(--vp-c-white)}.secondary{background:transparent;color:var(--vp-c-brand-1)}.primary:disabled,.secondary:disabled{cursor:not-allowed;opacity:.5}.link{display:inline-flex;align-items:center;text-decoration:none}.release-form{display:grid;gap:.75rem}.release-form>label:not(.check){font-weight:700}.release-form input[type='text'],.release-form select{width:100%;min-height:44px;padding:.65rem .8rem;border:1px solid var(--vp-c-divider);border-radius:9px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}.check{display:grid;grid-template-columns:1.25rem minmax(0,1fr);gap:.65rem}.check input{width:1.1rem;height:1.1rem}.release-list{display:grid;gap:.65rem;padding:0;list-style:none}.release-list li{display:flex;justify-content:space-between;gap:.75rem;padding:.7rem;border:1px solid var(--vp-c-divider);border-radius:9px;background:var(--vp-c-bg)}.release-list li div{display:grid}.domain-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.8rem;margin-top:1rem}.domain-grid article{padding:1rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg)}.domain-grid article:last-child{grid-column:1/-1}.domain-title{display:flex;align-items:center;gap:.55rem}.domain-title>span{font-size:1.45rem}.domain-title h4{margin:0;font-size:1rem}.domain-grid dl{margin:.8rem 0}.domain-grid dl div{display:flex;justify-content:space-between;gap:1rem;padding:.35rem 0;border-bottom:1px solid var(--vp-c-divider)}.domain-grid dt,.domain-grid dd{margin:0}.domain-grid dd{text-align:right;font-weight:700}.domain-grid .pending{color:var(--vp-c-text-2)}.domain-grid p{color:var(--vp-c-text-2);font-size:.9rem}.domain-link{display:inline-flex;min-height:44px;align-items:center;font-weight:700}.error{color:var(--vp-c-danger-1)}@media(max-width:880px){.activity-flow{grid-template-columns:1fr}.flow-arrow{transform:rotate(90deg);justify-self:center}}@media(max-width:720px){.status-grid,.steps,.domain-grid{grid-template-columns:1fr 1fr}.domain-grid article:last-child{grid-column:auto}}@media(max-width:540px){.actions,.release-list li{display:grid}.primary,.secondary{width:100%}.status-grid,.steps,.domain-grid{grid-template-columns:1fr}.completed-step small{width:100%;margin-left:2.1rem}}
</style>
