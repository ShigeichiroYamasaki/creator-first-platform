<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, formatUnits, keccak256, toHex, zeroHash, type Address, type EIP1193Provider, type Hash } from 'viem'
import { polygonAmoy } from 'viem/chains'
import {
  createSupporterTypedData,
  createTestToneWav,
  DEMO_SUPPORTER_CREATOR_ID,
  getAmoyTransactionFees,
  hasActiveSupporterRegistration,
  hasActiveParticipantRegistry,
  mockJpycAbi,
  AMOY_CHAIN_ID,
  supporterRegistrationAdapterAbi,
  supporterSbtAbi,
  subscriptionAbi,
  participantRegistryAbi,
  TESTNET_USER_ENROLLMENT_CONSENT_VERSION,
  TESTNET_USER_ROLE,
  validateDeploymentManifest,
  validateSupporterMetadata,
  switchProviderToAmoy
} from './testnet-user-demo.js'

type DemoProfile = { registered: true; testUserId: string; displayName: string; state: 'TESTNET_DEMO_PROFILE'; createdAt: string }
type DemoProvider = EIP1193Provider & {
  on?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
  removeListener?: (event: 'accountsChanged' | 'chainChanged', listener: (value: Address[] | string) => void) => void
}
type Deployment = {
  active: boolean
  status: 'not-deployed' | 'active'
  chainId: number
  networkName: string
  sourceCommit: string | null
  contracts: {
    mockJpyc: Address | null
    subscription: Address | null
    treasury: Address | null
    supporterSbt: Address | null
    supporterRegistrationAdapter?: Address | null
    participantRegistry?: Address | null
  }
}
type Track = { id: string; title: string; artist: string; frequency: number; subscriberOnly: boolean }
type SupporterMetadata = { name: string; description: string; image: string; attributes: Array<{ trait_type: string; value: string }> }

const storageKey = 'creator-first-testnet-test-user-v2'
const tracks: Track[] = [
  { id: 'preview', title: 'First Light — Preview', artist: 'Synthetic Demo Artist', frequency: 261.63, subscriberOnly: false },
  { id: 'subscriber', title: 'Creator Signal — Subscriber Track', artist: 'Synthetic Demo Artist', frequency: 329.63, subscriberOnly: true }
]
const profile = ref<DemoProfile>()
const deployment = ref<Deployment>()
const manifestError = ref('')
const walletAddress = ref<Address>()
const walletChainId = ref<number>()
const walletMessage = ref('')
const participantId = ref<Hash>(zeroHash)
const approvedParticipantRoles = ref(0)
const registeredParticipantRoles = ref(0)
const participantApprovalExpiresAt = ref(0n)
const participantActive = ref(false)
const initialFundingCompleted = ref(false)
const busyAction = ref('')
const balance = ref(0n)
const allowance = ref(0n)
const planPrice = ref(0n)
const planVersion = ref(0n)
const planEnabled = ref(false)
const subscriptionActive = ref(false)
const activeUntil = ref(0n)
const lastTransaction = ref<Hash>()
const lastSbtTransaction = ref<Hash>()
const supporterTokenId = ref(0n)
const supporterTier = ref(0)
const supporterTokenUri = ref('')
const supporterMetadata = ref<SupporterMetadata>()
const supporterMessage = ref('好きな音楽クリエーターを応援した証明書を、この画面から受け取れます。')
const selectedTrack = ref(tracks[0])
const toneUrls = new Map<string, string>()
const audioElement = ref<HTMLAudioElement>()
const playerMessage = ref('合成試聴音源を選んで再生できます。')
let provider: DemoProvider | undefined
let listenersAttached = false

const correctChain = computed(() => walletChainId.value === AMOY_CHAIN_ID)
const contractsReady = computed(() => Boolean(deployment.value?.active && deployment.value.contracts.mockJpyc && deployment.value.contracts.subscription))
const participantRegistryReady = computed(() => hasActiveParticipantRegistry(deployment.value))
const userPreApproved = computed(() => participantActive.value && (approvedParticipantRoles.value & TESTNET_USER_ROLE) !== 0 && participantApprovalExpiresAt.value >= BigInt(Math.floor(Date.now() / 1000)))
const userRegistered = computed(() => participantActive.value && (registeredParticipantRoles.value & TESTNET_USER_ROLE) !== 0)
const participantSelfRegistrationReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && participantRegistryReady.value && userPreApproved.value && initialFundingCompleted.value && !userRegistered.value && !busyAction.value))
const chainActionsReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && contractsReady.value && (!participantRegistryReady.value || userRegistered.value) && !busyAction.value))
const supporterRegistrationReady = computed(() => hasActiveSupporterRegistration(deployment.value))
const supporterActionReady = computed(() => Boolean(
  profile.value && walletAddress.value && correctChain.value && supporterRegistrationReady.value &&
  supporterTokenId.value === 0n && !busyAction.value
))
const allowanceEnough = computed(() => planPrice.value > 0n && allowance.value >= planPrice.value)
const balanceLabel = computed(() => `${formatUnits(balance.value, 18)} tJPYC`)
const priceLabel = computed(() => planPrice.value ? `${formatUnits(planPrice.value, 18)} tJPYC` : '未取得')
const canPlaySelected = computed(() => !selectedTrack.value.subscriberOnly || subscriptionActive.value)
const supporterTierLabel = computed(() => ({ 0: '未登録', 1: '一般サポータ', 2: '初期サポータ' })[supporterTier.value] ?? '不明')

function newTestUserId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return [...crypto.getRandomValues(new Uint8Array(16))].map((value) => value.toString(16).padStart(2, '0')).join('')
}
function ensureSessionProfile(): void {
  if (profile.value) return
  const value: DemoProfile = { registered: true, testUserId: newTestUserId(), displayName: '実験参加者', state: 'TESTNET_DEMO_PROFILE', createdAt: new Date().toISOString() }
  sessionStorage.setItem(storageKey, JSON.stringify(value))
  profile.value = value
}
function providerFromWindow(): DemoProvider | undefined {
  return (window as Window & { ethereum?: DemoProvider }).ethereum
}
function clearOnchainState(): void {
  balance.value = 0n
  allowance.value = 0n
  planPrice.value = 0n
  planVersion.value = 0n
  planEnabled.value = false
  subscriptionActive.value = false
  activeUntil.value = 0n
  supporterTokenId.value = 0n
  supporterTier.value = 0
  supporterTokenUri.value = ''
  supporterMetadata.value = undefined
  participantId.value = zeroHash
  approvedParticipantRoles.value = 0
  registeredParticipantRoles.value = 0
  participantApprovalExpiresAt.value = 0n
  participantActive.value = false
  initialFundingCompleted.value = false
}
const handleAccountsChanged = async (value: Address[] | string): Promise<void> => {
  const accounts = Array.isArray(value) ? value : []
  walletAddress.value = accounts[0]
  clearOnchainState()
  walletMessage.value = accounts[0] ? '仮想通貨ワレットのアカウントが変わりました。状態を確認します。' : '仮想通貨ワレットの接続が解除されました。'
  if (accounts[0] && correctChain.value) await refreshOnchainState(true)
}
const handleChainChanged = async (value: Address[] | string): Promise<void> => {
  walletChainId.value = typeof value === 'string' ? Number.parseInt(value, 16) : undefined
  clearOnchainState()
  walletMessage.value = correctChain.value ? '練習用ネットワークへ切り替わりました。状態を確認します。' : '別のネットワークへ切り替わったため、記録操作と限定音源を停止しました。'
  if (correctChain.value && walletAddress.value) await refreshOnchainState(true)
}
function attachProviderListeners(): void {
  if (!provider?.on || listenersAttached) return
  provider.on('accountsChanged', handleAccountsChanged)
  provider.on('chainChanged', handleChainChanged)
  listenersAttached = true
}
async function readChainId(): Promise<void> {
  if (!provider) return
  walletChainId.value = Number.parseInt(await provider.request({ method: 'eth_chainId' }) as string, 16)
}
async function connectWallet(): Promise<void> {
  provider = providerFromWindow()
  if (!provider) {
    walletMessage.value = '仮想通貨ワレットが見つかりません。MetaMaskをインストールしてから接続してください。'
    return
  }
  busyAction.value = 'wallet'
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    walletAddress.value = accounts[0]
    attachProviderListeners()
    await readChainId()
    walletMessage.value = correctChain.value ? '仮想通貨ワレットを練習用ネットワークへ接続しました。' : '仮想通貨ワレットを接続しました。練習用ネットワークへ切り替えてください。'
    if (correctChain.value) await refreshOnchainState(true)
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : '仮想通貨ワレットの接続がキャンセルされました。'
  } finally { busyAction.value = '' }
}
async function switchToAmoy(): Promise<void> {
  if (!provider) return
  busyAction.value = 'network'
  try {
    await switchProviderToAmoy(provider)
    await readChainId()
    walletMessage.value = '練習用ネットワークへ切り替えました。'
    await refreshOnchainState(true)
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : '練習用ネットワークへの切替がキャンセルされました。'
  } finally { busyAction.value = '' }
}
function clients() {
  if (!provider || !walletAddress.value || !deployment.value?.contracts.mockJpyc || !deployment.value.contracts.subscription) throw new Error('仮想通貨ワレットまたは練習用の記録先を利用できません。')
  const transport = custom(provider)
  return {
    publicClient: createPublicClient({ chain: polygonAmoy, transport }),
    walletClient: createWalletClient({ account: walletAddress.value, chain: polygonAmoy, transport }),
    mockJpyc: deployment.value.contracts.mockJpyc,
    subscription: deployment.value.contracts.subscription
  }
}
async function refreshParticipantEnrollment(publicClient: ReturnType<typeof createPublicClient>): Promise<void> {
  const registry = deployment.value?.contracts.participantRegistry
  const account = walletAddress.value
  if (!registry || !account || !participantRegistryReady.value) return
  const nextParticipantId = await publicClient.readContract({
    address: registry,
    abi: participantRegistryAbi,
    functionName: 'participantIdByWallet',
    args: [account]
  }) as Hash
  participantId.value = nextParticipantId
  if (nextParticipantId === zeroHash) return
  const record = await publicClient.readContract({
    address: registry,
    abi: participantRegistryAbi,
    functionName: 'participants',
    args: [nextParticipantId]
  }) as readonly [Address, number, number, bigint, bigint, boolean, boolean]
  approvedParticipantRoles.value = Number(record[1])
  registeredParticipantRoles.value = Number(record[2])
  participantApprovalExpiresAt.value = record[4]
  participantActive.value = record[5]
  initialFundingCompleted.value = record[6]
}
async function refreshOnchainState(force = false): Promise<void> {
  if (!walletAddress.value || !correctChain.value || !contractsReady.value) return
  if (!force && !chainActionsReady.value) return
  const { publicClient, mockJpyc, subscription } = clients()
  await refreshParticipantEnrollment(publicClient)
  const account = walletAddress.value as Address
  const [nextBalance, nextAllowance, plan, nextActive, nextUntil] = await Promise.all([
    publicClient.readContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'balanceOf', args: [account] }),
    publicClient.readContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'allowance', args: [account, subscription] }),
    publicClient.readContract({ address: subscription, abi: subscriptionAbi, functionName: 'plan' }),
    publicClient.readContract({ address: subscription, abi: subscriptionAbi, functionName: 'isActive', args: [account] }),
    publicClient.readContract({ address: subscription, abi: subscriptionAbi, functionName: 'subscriptionActiveUntil', args: [account] })
  ])
  const planValue = plan as readonly [bigint, bigint, bigint, boolean]
  balance.value = nextBalance as bigint
  allowance.value = nextAllowance as bigint
  planPrice.value = planValue[0]
  planVersion.value = planValue[2]
  planEnabled.value = planValue[3]
  subscriptionActive.value = nextActive as boolean
  activeUntil.value = nextUntil as bigint
  if (deployment.value?.contracts.supporterSbt) {
    const supporterSbt = deployment.value.contracts.supporterSbt
    const [nextTokenId, nextTier] = await Promise.all([
      publicClient.readContract({
        address: supporterSbt,
        abi: supporterSbtAbi,
        functionName: 'activeTokenOf',
        args: [DEMO_SUPPORTER_CREATOR_ID, account]
      }),
      publicClient.readContract({
        address: supporterSbt,
        abi: supporterSbtAbi,
        functionName: 'getSupporterTier',
        args: [DEMO_SUPPORTER_CREATOR_ID, account]
      })
    ])
    supporterTokenId.value = nextTokenId as bigint
    supporterTier.value = Number(nextTier)
    supporterTokenUri.value = supporterTokenId.value > 0n
      ? await publicClient.readContract({
          address: supporterSbt,
          abi: supporterSbtAbi,
          functionName: 'tokenURI',
          args: [supporterTokenId.value]
        }) as string
      : ''
    supporterMetadata.value = undefined
    if (supporterTokenUri.value) {
      try {
        const metadataResponse = await fetch(supporterTokenUri.value, { cache: 'no-store' })
        if (!metadataResponse.ok) throw new Error(`応援の証明書情報を取得できません（HTTP ${metadataResponse.status}）`)
        supporterMetadata.value = validateSupporterMetadata(
          await metadataResponse.json(),
          supporterTokenUri.value
        ) as SupporterMetadata
      } catch (error) {
        supporterMessage.value = error instanceof Error ? error.message : '応援の証明書情報を取得できません。'
      }
    }
  }
}
async function registerUserParticipant(): Promise<void> {
  const registry = deployment.value?.contracts.participantRegistry
  if (!registry) return
  await transact('音楽リスナーとしての実験参加登録', async () => {
    const { publicClient, walletClient } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({
      address: registry,
      abi: participantRegistryAbi,
      functionName: 'registerSelf',
      args: [TESTNET_USER_ROLE, TESTNET_USER_ENROLLMENT_CONSENT_VERSION],
      ...fees
    })
  })
}
async function transact(action: string, submit: () => Promise<Hash>): Promise<void> {
  busyAction.value = action
  lastTransaction.value = undefined
  try {
    const hash = await submit()
    lastTransaction.value = hash
    walletMessage.value = `${action}の操作を送信しました。完了を待っています。`
    const { publicClient } = clients()
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error(`${action}の操作が完了しませんでした。`)
    await refreshOnchainState(true)
    walletMessage.value = `${action}が完了しました。`
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : `${action}に失敗しました。`
  } finally { busyAction.value = '' }
}
async function claimMockJpyc(): Promise<void> {
  await transact('練習用のお金の受取り', async () => {
    const { publicClient, walletClient, mockJpyc } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'claim', ...fees })
  })
}
async function approveSubscription(): Promise<void> {
  await transact('今回使う金額の確認', async () => {
    const { publicClient, walletClient, mockJpyc, subscription } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'approve', args: [subscription, planPrice.value], ...fees })
  })
}
async function subscribe(): Promise<void> {
  if (!profile.value) return
  const paymentReference = keccak256(toHex(`${profile.value.testUserId}:${Date.now()}`))
  await transact('月額利用の開始', async () => {
    const { publicClient, walletClient, subscription } = clients()
    const fees = await getAmoyTransactionFees(publicClient)
    return walletClient.writeContract({ address: subscription, abi: subscriptionAbi, functionName: 'subscribe', args: [paymentReference, planVersion.value], ...fees })
  })
}
async function registerAsSupporter(): Promise<void> {
  if (!provider || !walletAddress.value || !deployment.value?.contracts.supporterSbt || !deployment.value.contracts.supporterRegistrationAdapter) return
  busyAction.value = 'Supporter SBT'
  lastSbtTransaction.value = undefined
  try {
    const { publicClient, walletClient } = clients()
    const supporterSbt = deployment.value.contracts.supporterSbt
    const adapter = deployment.value.contracts.supporterRegistrationAdapter
    const [nonce, block] = await Promise.all([
      publicClient.readContract({ address: supporterSbt, abi: supporterSbtAbi, functionName: 'nonces', args: [walletAddress.value] }),
      publicClient.getBlock()
    ])
    const deadline = block.timestamp + 10n * 60n
    const typedData = createSupporterTypedData({
      supporterSbt,
      holder: walletAddress.value,
      nonce: nonce as bigint,
      deadline
    })
    supporterMessage.value = '仮想通貨ワレットで、応援の証明書を受け取ることを確認してください。'
    const signature = await walletClient.signTypedData({ account: walletAddress.value, ...typedData })
    const fees = await getAmoyTransactionFees(publicClient)
    const hash = await walletClient.writeContract({
      account: walletAddress.value,
      address: adapter,
      abi: supporterRegistrationAdapterAbi,
      functionName: 'registerSelf',
      args: [DEMO_SUPPORTER_CREATOR_ID, nonce as bigint, deadline, typedData.message.consentVersion, signature],
      ...fees
    })
    lastSbtTransaction.value = hash
    supporterMessage.value = '応援の証明書を受け取る操作を送信しました。完了を待っています。'
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error('応援の証明書を受け取る操作が完了しませんでした。')
    await refreshOnchainState(true)
    if (supporterTokenId.value === 0n) throw new Error('操作は完了しましたが、有効な応援の証明書を確認できません。')
    supporterMessage.value = `${supporterTierLabel.value}の応援証明書 #${supporterTokenId.value} を受け取りました。`
  } catch (error) {
    supporterMessage.value = error instanceof Error ? error.message : '応援の証明書を受け取れませんでした。'
  } finally { busyAction.value = '' }
}
async function selectTrack(track: Track): Promise<void> {
  selectedTrack.value = track
  await nextTick()
  if (!audioElement.value) return
  audioElement.value.pause()
  audioElement.value.src = toneUrls.get(track.id) ?? ''
  audioElement.value.load()
  playerMessage.value = track.subscriberOnly && !subscriptionActive.value ? 'このテスト音は、練習用の月額利用を開始すると再生できます。' : `${track.title} を選択しました。`
}
async function playSelected(): Promise<void> {
  if (!audioElement.value || !canPlaySelected.value) return
  try {
    await audioElement.value.play()
    playerMessage.value = `${selectedTrack.value.title} を再生中です。`
  } catch { playerMessage.value = 'ブラウザが再生を停止しました。再生ボタンをもう一度押してください。' }
}
function pauseSelected(): void { audioElement.value?.pause(); playerMessage.value = '一時停止しました。' }
function formatDate(timestamp: bigint): string { return timestamp > 0n ? new Date(Number(timestamp) * 1000).toLocaleString('ja-JP') : '未契約' }
function shortAddress(value: string | null | undefined): string { return value ? `${value.slice(0, 8)}…${value.slice(-6)}` : '未公開' }
async function loadDeployment(): Promise<void> {
  try {
    const response = await fetch(withBase('/testnet/deployment.json'), { cache: 'no-store' })
    if (!response.ok) throw new Error(`実験の公開情報を取得できません（HTTP ${response.status}）`)
    deployment.value = validateDeploymentManifest(await response.json()) as Deployment
  } catch (error) { manifestError.value = error instanceof Error ? error.message : '実験の公開情報を確認できません。' }
}
function restoreProfile(): void {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return
    const value = JSON.parse(stored) as Partial<DemoProfile>
    if (value.registered === true && value.state === 'TESTNET_DEMO_PROFILE' && typeof value.testUserId === 'string' && typeof value.displayName === 'string' && typeof value.createdAt === 'string') profile.value = value as DemoProfile
  } catch { sessionStorage.removeItem(storageKey) }
}
onMounted(async () => {
  restoreProfile()
  ensureSessionProfile()
  for (const track of tracks) toneUrls.set(track.id, URL.createObjectURL(new Blob([createTestToneWav(track.frequency)], { type: 'audio/wav' })))
  await selectTrack(tracks[0])
  await loadDeployment()
})
onBeforeUnmount(() => {
  for (const url of toneUrls.values()) URL.revokeObjectURL(url)
  if (provider?.removeListener && listenersAttached) {
    provider.removeListener('accountsChanged', handleAccountsChanged)
    provider.removeListener('chainChanged', handleChainChanged)
  }
})
</script>

<template>
  <section class="testnet-journey" aria-labelledby="testnet-journey-title">
    <header class="journey-heading">
      <p class="kicker">実際のお金を使わない公開実験</p>
      <h2 id="testnet-journey-title">音楽を楽しむ体験</h2>
      <p>初回POLを受け取った仮想通貨ワレットで、練習用の月額利用、音楽プレーヤー、応援の証明書を順番に試します。</p>
      <p class="safety"><strong>重要:</strong> 表示される残高は換金できない練習用です。実際のお金、秘密鍵、復旧用の単語列は使いません。</p>
    </header>
    <ol class="steps" aria-label="音楽リスナーとして参加する手順">
      <li :class="{ done: walletAddress && correctChain }">1. 仮想通貨ワレット</li><li :class="{ done: userRegistered }">2. 利用資格</li><li :class="{ done: subscriptionActive }">3. 月額利用</li><li>4. 音楽</li><li :class="{ done: supporterTokenId > 0n }">5. 応援証明</li>
    </ol>

    <section class="panel" aria-labelledby="wallet-title">
      <h3 id="wallet-title">1. 仮想通貨ワレットをつなぐ</h3>
      <div class="status-grid">
        <div><span>実験の準備</span><strong>{{ manifestError ? '利用停止中' : deployment?.active ? '利用できます' : '準備中' }}</strong></div>
        <div><span>練習用ネットワーク</span><strong>{{ walletChainId ? (correctChain ? '接続済み' : '切替が必要') : '未接続' }}</strong></div>
        <div><span>仮想通貨ワレット</span><strong>{{ shortAddress(walletAddress) }}</strong></div>
        <div><span>公開内容の確認</span><strong>{{ deployment?.sourceCommit ? '確認済み' : '準備中' }}</strong></div>
      </div>
      <p v-if="manifestError" class="error" role="alert">{{ manifestError }} 書込み操作を停止しました。</p>
      <p v-else-if="deployment && !deployment.active" class="notice">練習用の記録先を準備しています。仮想通貨ワレットの接続だけ試せますが、その先の操作はできません。</p>
      <div class="actions"><button class="primary" type="button" :disabled="!profile || busyAction === 'wallet'" @click="connectWallet">{{ walletAddress ? '仮想通貨ワレットをつなぎ直す' : '仮想通貨ワレットをつなぐ' }}</button><button class="secondary" type="button" :disabled="!walletAddress || correctChain || busyAction === 'network'" @click="switchToAmoy">練習用ネットワークへ切り替える</button><button class="secondary" type="button" :disabled="!chainActionsReady" @click="refreshOnchainState()">表示を更新</button></div>
    </section>

    <section class="panel" aria-labelledby="enrollment-title">
      <h3 id="enrollment-title">2. 音楽リスナーの利用資格を登録</h3>
      <div class="status-grid">
        <div><span>実験参加の受付</span><strong>{{ participantRegistryReady ? '利用できます' : '準備中' }}</strong></div>
        <div><span>運営の確認</span><strong>{{ userPreApproved ? '確認済み' : participantId !== zeroHash ? '期限切れ／停止' : '確認待ち' }}</strong></div>
        <div><span>本人による登録</span><strong>{{ userRegistered ? '登録済み' : '未登録' }}</strong></div>
        <div><span>練習用の手数料残高</span><strong>{{ initialFundingCompleted ? '受取済み' : '準備待ち' }}</strong></div>
      </div>
      <p v-if="!participantRegistryReady" class="notice">参加資格を記録する準備を進めています。時間をおいて表示を更新してください。</p>
      <p v-else-if="!userPreApproved && !userRegistered" class="notice">この仮想通貨ワレットでは、運営の承認と初回POL受領を確認できません。招待登録に使ったものと同じ仮想通貨ワレットか確認してください。</p>
      <p v-else-if="userPreApproved && !initialFundingCompleted" class="notice">運営の承認は確認できましたが、初回POLの準備が完了していません。招待ページの表示が更新されるまでお待ちください。</p>
      <p v-else>本人が仮想通貨ワレットで確認し、音楽リスナーとしての実験参加を記録します。実際のお金を購入する必要はありません。</p>
      <a v-if="!userPreApproved && !userRegistered" class="secondary link" :href="withBase('/demo/listener-participation')">実験参加の準備へ戻る</a>
      <button v-if="userPreApproved && !userRegistered" class="primary" type="button" :disabled="!participantSelfRegistrationReady" @click="registerUserParticipant">音楽リスナーとして登録</button>
      <p v-else-if="userRegistered" class="badge success">音楽リスナーとしての参加登録が完了しています</p>
    </section>

    <section class="panel" aria-labelledby="payment-title">
      <h3 id="payment-title">3. 練習用のお金で月額利用を試す</h3>
      <div class="status-grid">
        <div><span>練習用の残高</span><strong>{{ balanceLabel }}</strong></div><div><span>月額利用の練習価格</span><strong>{{ priceLabel }}</strong></div><div><span>利用の確認</span><strong>{{ allowanceEnough ? '確認済み' : '未確認' }}</strong></div><div><span>月額利用</span><strong>{{ subscriptionActive ? `利用中 / ${formatDate(activeUntil)}` : '未開始' }}</strong></div>
      </div>
      <div class="actions"><button class="primary" type="button" :disabled="!chainActionsReady" @click="claimMockJpyc">練習用のお金を受け取る</button><button class="secondary" type="button" :disabled="!chainActionsReady || !planEnabled || balance < planPrice" @click="approveSubscription">今回使う金額を確認</button><button class="primary" type="button" :disabled="!chainActionsReady || !planEnabled || !allowanceEnough || balance < planPrice" @click="subscribe">月額利用を始める</button></div>
      <p class="notice">各ボタンを押すと仮想通貨ワレットに確認画面が出ます。表示額を超える利用や実際のお金による支払いは行いません。</p>
      <p v-if="lastTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直前の操作記録を確認</a></p>
      <p aria-live="polite">{{ walletMessage }}</p>
    </section>

    <section class="panel" aria-labelledby="player-title">
      <h3 id="player-title">4. 音楽プレーヤー操作</h3>
      <p>このページで作った短いテスト音だけを使います。実在する楽曲の配信ではありません。</p>
      <div class="track-list"><button v-for="track in tracks" :key="track.id" type="button" :class="{ selected: selectedTrack.id === track.id }" @click="selectTrack(track)"><strong>{{ track.title }}</strong><span>{{ track.artist }}</span><small>{{ track.subscriberOnly ? '月額利用中だけ再生可能' : 'いつでも試聴可能' }}</small></button></div>
      <div class="now-playing"><span class="art" aria-hidden="true">♪</span><div><strong>{{ selectedTrack.title }}</strong><span>{{ selectedTrack.artist }}</span></div></div>
      <audio ref="audioElement" controls preload="metadata" :aria-label="`${selectedTrack.title} player`" />
      <div class="actions"><button class="primary" type="button" :disabled="!canPlaySelected" @click="playSelected">再生</button><button class="secondary" type="button" @click="pauseSelected">一時停止</button></div>
      <p v-if="!canPlaySelected" class="notice">このテスト音は、練習用の月額利用を開始すると再生できます。試聴用のテスト音はいつでも再生できます。</p>
      <p aria-live="polite">{{ playerMessage }}</p>
      <div class="supporter-action">
        <h4 id="supporter-registration-title">テスト用音楽クリエーターを応援する</h4>
        <p>応援する気持ちを、他人へ渡せないデジタル証明書として記録します。支払いまたは継続課金はありません。</p>
        <div class="status-grid">
          <div><span>応援の状態</span><strong>{{ supporterTierLabel }}</strong></div>
          <div><span>証明書番号</span><strong>{{ supporterTokenId || '未発行' }}</strong></div>
        </div>
        <p v-if="!supporterRegistrationReady" class="notice">応援の証明書を用意しているため、現在この操作は利用できません。</p>
        <div class="actions">
          <button class="primary" type="button" :disabled="!supporterActionReady" @click="registerAsSupporter">
            {{ supporterTokenId > 0n ? '応援の証明書を取得済み' : busyAction === 'Supporter SBT' ? '確認・発行中…' : '応援して証明書を受け取る' }}
          </button>
          <button class="secondary" type="button" :disabled="!walletAddress || !correctChain || !contractsReady || Boolean(busyAction)" @click="refreshOnchainState(true)">証明書の状態を更新</button>
        </div>
        <figure v-if="supporterMetadata" class="credential-card">
          <img :src="supporterMetadata.image" :alt="`${supporterMetadata.name}の資格証明画像`" width="360" height="360">
          <figcaption><strong>{{ supporterMetadata.name }}</strong><span>{{ supporterMetadata.description }}</span></figcaption>
        </figure>
        <p v-if="supporterTokenUri"><a :href="supporterTokenUri" target="_blank" rel="noopener noreferrer">証明書の公開情報を確認</a></p>
        <p v-if="lastSbtTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastSbtTransaction}`" target="_blank" rel="noopener noreferrer">証明書を受け取った記録を確認</a></p>
        <p aria-live="polite">{{ supporterMessage }}</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.testnet-journey{display:grid;gap:1.25rem;margin:1.75rem 0}.journey-heading,.panel{padding:clamp(1rem,3vw,1.6rem);border:1px solid var(--vp-c-divider);border-radius:16px;background:var(--vp-c-bg-soft)}.journey-heading h2,.panel h3{margin-top:.25rem;border:0}.kicker{margin:0;color:var(--vp-c-brand-1);font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.safety,.notice{padding:.8rem 1rem;border-left:4px solid var(--vp-c-warning-1);border-radius:6px;background:var(--vp-c-warning-soft)}.steps{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;padding:0;list-style:none}.steps li{padding:.65rem .4rem;border:1px solid var(--vp-c-divider);border-radius:999px;text-align:center;font-size:.85rem;font-weight:700}.steps li.done{border-color:var(--vp-c-brand-1);color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.registration,.profile-summary{display:grid;gap:.8rem}.registration>label,legend{font-weight:700}.registration input[type=text]{min-height:44px;padding:.65rem .8rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}fieldset{display:grid;gap:.65rem;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:10px}fieldset label{display:grid;grid-template-columns:1.2rem 1fr;gap:.6rem;align-items:start}input[type=checkbox]{width:1rem;height:1rem;margin-top:.25rem}.actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1rem}button{min-height:44px;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;font:inherit;font-weight:700;cursor:pointer}button.primary{color:var(--vp-c-white);background:var(--vp-c-brand-1)}button.secondary{color:var(--vp-c-brand-1);background:transparent}button:disabled{cursor:not-allowed;opacity:.45}.badge{width:fit-content;padding:.25rem .55rem;border-radius:999px;font-size:.8rem;font-weight:700}.badge.success{color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.status-grid>div{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg)}.status-grid span,.track-list span,.now-playing span{color:var(--vp-c-text-2);font-size:.85rem}.error{color:var(--vp-c-danger-1)}.track-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.track-list button{display:grid;gap:.2rem;text-align:left;color:var(--vp-c-text-1);background:var(--vp-c-bg);border-color:var(--vp-c-divider)}.track-list button.selected{border-color:var(--vp-c-brand-1);box-shadow:0 0 0 2px var(--vp-c-brand-soft)}.track-list small{color:var(--vp-c-brand-1)}.now-playing{display:flex;gap:.8rem;align-items:center;margin:1rem 0 .6rem}.now-playing>div{display:grid}.art{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;color:var(--vp-c-white);background:linear-gradient(135deg,var(--vp-c-brand-1),#7c3aed);font-size:1.4rem}.supporter-action{margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--vp-c-divider)}.supporter-action h4{margin:.25rem 0;border:0}.credential-card{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:1rem;align-items:center;margin:1rem 0;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg)}.credential-card img{width:100%;height:auto;border-radius:12px}.credential-card figcaption{display:grid;gap:.5rem}.credential-card figcaption span{color:var(--vp-c-text-2);font-size:.9rem}audio{width:100%}code{overflow-wrap:anywhere}@media(max-width:720px){.steps{grid-template-columns:repeat(3,1fr)}}@media(max-width:640px){.steps,.status-grid,.track-list,.credential-card{grid-template-columns:1fr}.actions button{width:100%}}
.steps{grid-template-columns:repeat(5,1fr)}
</style>
