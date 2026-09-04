<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, formatUnits, keccak256, toHex, zeroHash, type Address, type EIP1193Provider, type Hash } from 'viem'
import { polygonAmoy } from 'viem/chains'
import { resolveCloudDemoTarget } from './cloud-demo-runtime.js'
import {
  createSupporterTypedData,
  createTestToneWav,
  DEMO_SUPPORT_TARGETS,
  getAmoyTransactionFees,
  hasActiveSupporterRegistration,
  hasActiveParticipantRegistry,
  mockJpycAbi,
  AMOY_CHAIN_ID,
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
    creatorRegistry?: Address | null
  }
}
type Track = { id: string; title: string; artist: string; frequency: number; subscriberOnly: boolean }
type SupporterMetadata = { name: string; description: string; image: string; attributes: Array<{ trait_type: string; value: string }> }
type SupportTarget = { creatorId: Hash; name: string; style: string; description: string; registryCreatorId?: string; source?: 'DEMO_FIXTURE' | 'REGISTERED_CREATOR' }

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
const selectedSupportTarget = ref<SupportTarget>()
const supportTargets = ref<SupportTarget[]>(DEMO_SUPPORT_TARGETS.map((target) => ({ ...target, source: 'DEMO_FIXTURE' })))
const supporterRelayAvailable = ref(false)
const supporterMessage = ref('まず、応援したい音楽クリエータを選んでください。')
const supporterStage = ref<'IDLE' | 'AWAITING_WALLET' | 'RELAYING' | 'SUBMITTED' | 'CHECKING' | 'COMPLETE' | 'ERROR'>('IDLE')
const connectingToCloud = ref(false)
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
const supporterRegistrationReady = computed(() => hasActiveSupporterRegistration(deployment.value) && supporterRelayAvailable.value)
const supporterActionReady = computed(() => Boolean(
  profile.value && walletAddress.value && correctChain.value && userRegistered.value && supporterRegistrationReady.value &&
  selectedSupportTarget.value && supporterTokenId.value === 0n && !lastSbtTransaction.value && !busyAction.value
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
  clearSupporterState()
  participantId.value = zeroHash
  approvedParticipantRoles.value = 0
  registeredParticipantRoles.value = 0
  participantApprovalExpiresAt.value = 0n
  participantActive.value = false
  initialFundingCompleted.value = false
}
function clearSupporterState(): void {
  supporterTokenId.value = 0n
  supporterTier.value = 0
  supporterTokenUri.value = ''
  supporterMetadata.value = undefined
  lastSbtTransaction.value = undefined
  supporterStage.value = 'IDLE'
}
async function selectSupportTarget(target: SupportTarget): Promise<void> {
  if (busyAction.value || selectedSupportTarget.value?.creatorId === target.creatorId) return
  selectedSupportTarget.value = target
  clearSupporterState()
  supporterMessage.value = `${target.name}を応援する対象として選びました。内容を確認してからトークンを受け取れます。`
  if (walletAddress.value && correctChain.value && contractsReady.value) {
    try { await refreshOnchainState(true) } catch {
      supporterMessage.value = `${target.name}を選びましたが、現在のトークン保有状態を確認できませんでした。`
    }
  }
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
  if (deployment.value?.contracts.supporterSbt && selectedSupportTarget.value) {
    const supporterSbt = deployment.value.contracts.supporterSbt
    const creatorId = selectedSupportTarget.value.creatorId
    const [nextTokenId, nextTier] = await Promise.all([
      publicClient.readContract({
        address: supporterSbt,
        abi: supporterSbtAbi,
        functionName: 'activeTokenOf',
        args: [creatorId, account]
      }),
      publicClient.readContract({
        address: supporterSbt,
        abi: supporterSbtAbi,
        functionName: 'getSupporterTier',
        args: [creatorId, account]
      })
    ])
    supporterTokenId.value = nextTokenId as bigint
    supporterTier.value = Number(nextTier)
    if (supporterTokenId.value > 0n) {
      supporterStage.value = 'COMPLETE'
      supporterMessage.value = `${supporterTierLabel.value}トークン #${supporterTokenId.value} を受け取りました。`
    }
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
        if (!metadataResponse.ok) throw new Error(`サポータートークンの公開情報を取得できません（HTTP ${metadataResponse.status}）`)
        supporterMetadata.value = validateSupporterMetadata(
          await metadataResponse.json(),
          supporterTokenUri.value
        ) as SupporterMetadata
      } catch (error) {
        supporterMessage.value = error instanceof Error ? error.message : 'サポータートークンの公開情報を取得できません。'
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
  if (!provider || !walletAddress.value || !deployment.value?.contracts.supporterSbt || !supporterRelayAvailable.value || !selectedSupportTarget.value) return
  const supportTarget = selectedSupportTarget.value
  busyAction.value = 'Supporter SBT'
  lastSbtTransaction.value = undefined
  supporterStage.value = 'AWAITING_WALLET'
  try {
    const { publicClient, walletClient } = clients()
    const supporterSbt = deployment.value.contracts.supporterSbt
    const [nonce, block] = await Promise.all([
      publicClient.readContract({ address: supporterSbt, abi: supporterSbtAbi, functionName: 'nonces', args: [walletAddress.value] }),
      publicClient.getBlock()
    ])
    const deadline = block.timestamp + 10n * 60n
    const typedData = createSupporterTypedData({
      supporterSbt,
      holder: walletAddress.value,
      creatorId: supportTarget.creatorId,
      nonce: nonce as bigint,
      deadline
    })
    supporterMessage.value = `仮想通貨ワレットの確認画面を開き、${supportTarget.name}のサポータートークン（SBT）の受取りに署名してください。送金や支払いの署名ではありません。`
    const signature = await walletClient.signTypedData({ account: walletAddress.value, ...typedData })
    supporterStage.value = 'RELAYING'
    supporterMessage.value = '署名を受け付けました。運営が操作手数料を負担して、サポータートークンを発行しています。'
    const response = await fetch('/api/v1/testnet/supporter-registrations', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        holder: walletAddress.value,
        creatorId: supportTarget.creatorId,
        ...(supportTarget.registryCreatorId ? { registryCreatorId: supportTarget.registryCreatorId } : {}),
        nonce: (nonce as bigint).toString(),
        deadline: deadline.toString(),
        consentVersion: typedData.message.consentVersion,
        signature,
        idempotencyKey: typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : newTestUserId()
      })
    })
    const responseText = await response.text()
    let result: { status?: string; transactionHash?: Hash | null; tokenId?: string; tier?: number; alreadyActive?: boolean; code?: string; message?: string } = {}
    try { result = responseText ? JSON.parse(responseText) : {} } catch { /* handled as an unavailable relay below */ }
    if (!response.ok) {
      const relayMessages: Record<string, string> = {
        SUPPORTER_RELAYER_NOT_READY: '現在、運営のトークン発行サービスを利用できません。時間をおいて再試行してください。',
        PARTICIPANT_REGISTRATION_REQUIRED: 'この仮想通貨ワレットの音楽リスナー登録を確認できません。利用資格の登録状態を更新してください。',
        SUPPORT_NONCE_MISMATCH: '別の応援操作が先に処理されています。状態を更新してから再試行してください。',
        SUPPORT_SIGNATURE_INVALID: '仮想通貨ワレットの署名を確認できませんでした。接続中のアカウントを確認してください。',
        SUPPORT_SIGNER_MISMATCH: '登録された仮想通貨ワレットと署名したアカウントが一致しません。',
        CREATOR_NOT_REGISTERED: '選んだ音楽クリエータの活動登録が現在有効ではありません。支援先一覧を更新してください。',
        SUPPORTER_RELAY_FAILED: 'Polygon Amoyでトークン発行を完了できませんでした。運営が発行サービスを確認します。'
      }
      throw new Error((result.code && relayMessages[result.code]) || result.message || `サポータートークンを発行できません（HTTP ${response.status}）`)
    }
    if (result.status === 'SBT_SUBMITTED') {
      if (!result.transactionHash) throw new Error('Polygon Amoyへの送信記録を確認できません。')
      lastSbtTransaction.value = result.transactionHash
      supporterStage.value = 'CHECKING'
      supporterMessage.value = 'Polygon Amoyへトークン発行を送信しました。完了を確認しています。この画面を閉じずにお待ちください。'
      try {
        const receipt = await publicClient.waitForTransactionReceipt({
          hash: result.transactionHash,
          confirmations: 1,
          timeout: 120_000
        })
        if (receipt.status !== 'success') throw new Error('Polygon Amoy上でトークン発行が取り消されました。')
        await refreshOnchainState(true)
        if (supporterTokenId.value === 0n) throw new Error('発行処理は完了しましたが、トークン情報の反映を確認できません。')
        return
      } catch (error) {
        supporterStage.value = 'SUBMITTED'
        supporterMessage.value = error instanceof Error && error.message.includes('取り消されました')
          ? error.message
          : 'トークン発行はPolygon Amoyへ送信済みです。処理中の可能性があるため、再発行せず、しばらくして「トークンの状態を更新」を押してください。'
        return
      }
    }
    if (result.status !== 'SBT_ACTIVE' || !result.tokenId || !/^\d+$/.test(result.tokenId)) throw new Error('サポータートークンの発行完了を確認できません。')
    lastSbtTransaction.value = result.transactionHash ?? undefined
    supporterTokenId.value = BigInt(result.tokenId)
    supporterTier.value = Number(result.tier ?? 0)
    supporterStage.value = 'CHECKING'
    supporterMessage.value = 'トークン発行は完了しました。Polygon Amoy上の保有状態と画像を確認しています。'
    try { await refreshOnchainState(true) } catch {
      supporterStage.value = 'COMPLETE'
      supporterMessage.value = `サポータートークン #${result.tokenId} は発行済みです。公開情報の表示に時間がかかっているため、しばらくして「トークンの状態を更新」を押してください。`
      return
    }
    if (supporterTokenId.value === 0n) throw new Error('発行処理は完了しましたが、Polygon Amoy上の有効なサポータートークンを確認できません。')
    supporterStage.value = 'COMPLETE'
    supporterMessage.value = `${supporterTierLabel.value}トークン #${supporterTokenId.value} を受け取りました。`
  } catch (error) {
    supporterStage.value = 'ERROR'
    supporterMessage.value = error instanceof Error ? error.message : 'サポータートークンを受け取れませんでした。'
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
async function loadSupporterRelayStatus(): Promise<void> {
  try {
    const response = await fetch('/api/v1/health', { cache: 'no-store', credentials: 'include' })
    if (!response.ok) return
    const status = await response.json() as { supporterRelay?: string }
    supporterRelayAvailable.value = status.supporterRelay === 'enabled'
  } catch {
    supporterRelayAvailable.value = false
  }
}
async function loadRegisteredSupportTargets(): Promise<void> {
  try {
    const response = await fetch('/api/v1/testnet/support-targets', { cache: 'no-store', credentials: 'include' })
    if (!response.ok) return
    const value = await response.json() as { creators?: SupportTarget[] }
    const registered = (value.creators ?? []).filter((target) => (
      /^0x[0-9a-fA-F]{64}$/.test(target.creatorId) && /^\d+$/.test(target.registryCreatorId ?? '')
    ))
    supportTargets.value = [
      ...DEMO_SUPPORT_TARGETS.map((target) => ({ ...target, source: 'DEMO_FIXTURE' as const })),
      ...registered
    ]
  } catch {
    // The fixed fictional targets remain available when the public directory is temporarily unavailable.
  }
}
function restoreProfile(): void {
  try {
    const stored = sessionStorage.getItem(storageKey)
    if (!stored) return
    const value = JSON.parse(stored) as Partial<DemoProfile>
    if (value.registered === true && value.state === 'TESTNET_DEMO_PROFILE' && typeof value.testUserId === 'string' && typeof value.displayName === 'string' && typeof value.createdAt === 'string') profile.value = value as DemoProfile
  } catch { sessionStorage.removeItem(storageKey) }
}
async function redirectStaticSiteToCloud(): Promise<boolean> {
  if (location.origin !== 'https://shigeichiroyamasaki.github.io') return false
  connectingToCloud.value = true
  try {
    const requestedPath = `${location.pathname}${location.search}${location.hash}`
    const target = await resolveCloudDemoTarget(
      new URL(withBase('/demo-runtime.json'), location.origin).href,
      requestedPath
    )
    location.replace(target)
  } catch {
    connectingToCloud.value = false
    manifestError.value = 'クラウド版の音楽サービスへ接続できません。トークン発行を含む操作は開始していません。'
  }
  return true
}
onMounted(async () => {
  if (await redirectStaticSiteToCloud()) return
  restoreProfile()
  ensureSessionProfile()
  for (const track of tracks) toneUrls.set(track.id, URL.createObjectURL(new Blob([createTestToneWav(track.frequency)], { type: 'audio/wav' })))
  await selectTrack(tracks[0])
  await loadDeployment()
  await loadSupporterRelayStatus()
  await loadRegisteredSupportTargets()
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
    <p v-if="connectingToCloud" class="notice" role="status">Google クラウド上の音楽サービスへ接続しています。</p>
    <header class="journey-heading">
      <p class="kicker">実際のお金を使わない公開実験</p>
      <h2 id="testnet-journey-title">音楽を楽しむ体験</h2>
      <p>初回POLを受け取った仮想通貨ワレットで、練習用の月額利用、音楽プレーヤー、サポータートークン（SBT）を順番に試します。</p>
      <p class="safety"><strong>重要:</strong> 表示される残高は換金できない練習用です。実際のお金、秘密鍵、復旧用の単語列は使いません。</p>
    </header>
    <ol class="steps" aria-label="音楽リスナーとして参加する手順">
      <li :class="{ done: walletAddress && correctChain }">1. 仮想通貨ワレット</li><li :class="{ done: userRegistered }">2. 利用資格</li><li :class="{ done: subscriptionActive }">3. 月額利用</li><li>4. 音楽</li><li :class="{ done: supporterTokenId > 0n }">5. 応援トークン</li>
    </ol>

    <section v-if="!walletAddress || !correctChain" class="panel current-step" aria-labelledby="wallet-title">
      <h3 id="wallet-title">1. 仮想通貨ワレットをつなぐ</h3>
      <div class="status-grid">
        <div><span>実験の準備</span><strong>{{ manifestError ? '利用停止中' : deployment?.active ? '利用できます' : '準備中' }}</strong></div>
        <div><span>練習用ネットワーク</span><strong>{{ walletChainId ? (correctChain ? '接続済み' : '切替が必要') : '未接続' }}</strong></div>
        <div><span>仮想通貨ワレット</span><strong>{{ shortAddress(walletAddress) }}</strong></div>
        <div><span>公開内容の確認</span><strong>{{ deployment?.sourceCommit ? '確認済み' : '準備中' }}</strong></div>
      </div>
      <p v-if="manifestError" class="error" role="alert">{{ manifestError }} 書込み操作を停止しました。</p>
      <p v-else-if="deployment && !deployment.active" class="notice">練習用の記録先を準備しています。仮想通貨ワレットの接続だけ試せますが、その先の操作はできません。</p>
      <div class="actions"><button v-if="!walletAddress" class="primary" type="button" :disabled="!profile || busyAction === 'wallet'" @click="connectWallet">仮想通貨ワレットをつなぐ</button><button v-else-if="!correctChain" class="primary" type="button" :disabled="busyAction === 'network'" @click="switchToAmoy">練習用ネットワークへ切り替える</button></div>
    </section>
    <p v-else class="completed-step"><span aria-hidden="true">✓</span><strong>仮想通貨ワレットを接続しました</strong><small>{{ shortAddress(walletAddress) }}</small></p>

    <section v-if="walletAddress && correctChain && !userRegistered" class="panel current-step" aria-labelledby="enrollment-title">
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
      <p v-else>音楽リスナーとしての参加を記録します。実際のお金を購入する必要はありません。</p>
      <a v-if="!userPreApproved && !userRegistered" class="secondary link" :href="withBase('/demo/listener-participation')">実験参加の準備へ戻る</a>
      <button v-if="userPreApproved && !userRegistered" class="primary" type="button" :disabled="!participantSelfRegistrationReady" @click="registerUserParticipant">音楽リスナーとして登録</button>
    </section>
    <p v-else-if="userRegistered" class="completed-step"><span aria-hidden="true">✓</span><strong>音楽リスナーとして登録済みです</strong></p>

    <section v-if="userRegistered && !subscriptionActive" class="panel current-step" aria-labelledby="payment-title">
      <h3 id="payment-title">3. 練習用のお金で月額利用を試す</h3>
      <div class="status-grid">
        <div><span>練習用の残高</span><strong>{{ balanceLabel }}</strong></div><div><span>月額利用の練習価格</span><strong>{{ priceLabel }}</strong></div><div><span>利用の確認</span><strong>{{ allowanceEnough ? '確認済み' : '未確認' }}</strong></div><div><span>月額利用</span><strong>{{ subscriptionActive ? `利用中 / ${formatDate(activeUntil)}` : '未開始' }}</strong></div>
      </div>
      <div class="actions"><button v-if="balance < planPrice" class="primary" type="button" :disabled="!chainActionsReady" @click="claimMockJpyc">練習用のお金を受け取る</button><button v-else-if="!allowanceEnough" class="primary" type="button" :disabled="!chainActionsReady || !planEnabled" @click="approveSubscription">今回使う金額を確認</button><button v-else class="primary" type="button" :disabled="!chainActionsReady || !planEnabled" @click="subscribe">月額利用を始める</button></div>
      <p class="notice">表示されたボタンを一つずつ進めます。実際のお金による支払いは行いません。</p>
      <p v-if="lastTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直前の操作記録を確認</a></p>
      <p aria-live="polite">{{ walletMessage }}</p>
    </section>
    <p v-else-if="subscriptionActive" class="completed-step"><span aria-hidden="true">✓</span><strong>月額利用を開始しました</strong><small>{{ formatDate(activeUntil) }}まで</small></p>

    <section v-if="userRegistered" class="panel" aria-labelledby="player-title">
      <h3 id="player-title">4. 音楽プレーヤー操作</h3>
      <p>このページで作った短いテスト音だけを使います。実在する楽曲の配信ではありません。</p>
      <div class="track-list"><button v-for="track in tracks" :key="track.id" type="button" :class="{ selected: selectedTrack.id === track.id }" @click="selectTrack(track)"><strong>{{ track.title }}</strong><span>{{ track.artist }}</span><small>{{ track.subscriberOnly ? '月額利用中だけ再生可能' : 'いつでも試聴可能' }}</small></button></div>
      <div class="now-playing"><span class="art" aria-hidden="true">♪</span><div><strong>{{ selectedTrack.title }}</strong><span>{{ selectedTrack.artist }}</span></div></div>
      <audio ref="audioElement" controls preload="metadata" :aria-label="`${selectedTrack.title} player`" />
      <div class="actions"><button class="primary" type="button" :disabled="!canPlaySelected" @click="playSelected">再生</button><button class="secondary" type="button" @click="pauseSelected">一時停止</button></div>
      <p v-if="!canPlaySelected" class="notice">このテスト音は、練習用の月額利用を開始すると再生できます。試聴用のテスト音はいつでも再生できます。</p>
      <p aria-live="polite">{{ playerMessage }}</p>
      <div class="supporter-action">
        <h4 id="supporter-registration-title">5. 支援したい音楽クリエータを選ぶ</h4>
        <p>応援したい相手を一人選びます。架空のテスト対象に加え、Polygon Amoyへ活動登録した実験参加者も表示します。</p>
        <div class="support-target-summary">
          <strong>{{ supportTargets.length }}組から選択</strong>
          <span>一覧の中をスクロールできます</span>
        </div>
        <div class="support-target-list" role="group" aria-label="支援したい音楽クリエータ" tabindex="0">
          <button
            v-for="target in supportTargets"
            :key="target.creatorId"
            type="button"
            :class="{ selected: selectedSupportTarget?.creatorId === target.creatorId }"
            :aria-pressed="selectedSupportTarget?.creatorId === target.creatorId"
            :disabled="Boolean(busyAction)"
            @click="selectSupportTarget(target)"
          >
            <span class="creator-avatar" aria-hidden="true">♫</span>
            <span class="support-target-copy">
              <strong>{{ target.name }}</strong>
              <small>{{ target.style }}</small>
              <span class="support-target-description">{{ target.description }}</span>
              <span v-if="target.source === 'REGISTERED_CREATOR'" class="registered-source">登録済み・自己申告</span>
            </span>
            <b>{{ selectedSupportTarget?.creatorId === target.creatorId ? '選択中' : 'この人を選ぶ' }}</b>
          </button>
        </div>
        <p class="directory-note">「登録済み」は公開実験のオンチェーン自己申告が有効であることだけを示します。本人確認、権利確認または報酬受取資格の確認ではありません。</p>

        <div v-if="selectedSupportTarget" class="selected-support-target">
          <h4>{{ selectedSupportTarget.name }}を応援する</h4>
          <p>選んだ相手への応援を、他人へ渡せないサポータートークン（SBT）として記録します。トークンには選んだ相手の識別情報が記録されます。支払いまたは継続課金はなく、発行に必要な操作手数料は運営が負担します。</p>
          <div class="status-grid">
            <div><span>支援する相手</span><strong>{{ selectedSupportTarget.name }}</strong></div>
            <div><span>応援の状態</span><strong>{{ supporterTierLabel }}</strong></div>
            <div><span>トークン番号</span><strong>{{ supporterTokenId || '未発行' }}</strong></div>
          </div>
          <p v-if="!supporterRegistrationReady" class="notice">サポータートークンを発行する運営サービスを準備しているため、現在この操作は利用できません。</p>
          <p v-if="supporterStage === 'AWAITING_WALLET'" class="wallet-confirmation" role="status"><strong>仮想通貨ワレットを開いてください</strong><span>選んだ相手を確認して「署名」すると発行へ進みます。送金や支払いは行いません。</span></p>
          <p v-else-if="supporterStage === 'RELAYING' || supporterStage === 'SUBMITTED' || supporterStage === 'CHECKING'" class="notice" role="status">{{ supporterMessage }}</p>
          <p v-else-if="supporterStage === 'ERROR'" class="error" role="alert">{{ supporterMessage }}</p>
          <div class="actions">
            <button class="primary" type="button" :disabled="!supporterActionReady" @click="registerAsSupporter">
              {{ supporterTokenId > 0n ? 'サポータートークン取得済み' : lastSbtTransaction ? 'トークン発行を送信済み' : busyAction === 'Supporter SBT' ? '確認・発行中…' : `${selectedSupportTarget.name}を応援してトークンを受け取る` }}
            </button>
            <button class="secondary" type="button" :disabled="!walletAddress || !correctChain || !contractsReady || Boolean(busyAction)" @click="refreshOnchainState(true)">トークンの状態を更新</button>
          </div>
          <figure v-if="supporterMetadata" class="credential-card">
            <img :src="supporterMetadata.image" :alt="`${supporterMetadata.name}のトークン画像`" width="360" height="360">
            <figcaption><strong>{{ supporterMetadata.name }}</strong><span>支援する相手: {{ selectedSupportTarget.name }}</span><span>{{ supporterMetadata.description }}</span></figcaption>
          </figure>
          <p v-if="supporterTokenUri"><a :href="supporterTokenUri" target="_blank" rel="noopener noreferrer">トークンの公開情報を確認</a></p>
          <p v-if="lastSbtTransaction"><a :href="`https://amoy.polygonscan.com/tx/${lastSbtTransaction}`" target="_blank" rel="noopener noreferrer">トークンを受け取った記録を確認</a></p>
          <p v-if="!['AWAITING_WALLET', 'RELAYING', 'SUBMITTED', 'CHECKING', 'ERROR'].includes(supporterStage)" aria-live="polite">{{ supporterMessage }}</p>
        </div>
        <p v-else class="notice">まず、上の一覧から支援したい音楽クリエータを選んでください。選ぶまでトークンは発行されません。</p>
      </div>
    </section>
  </section>
</template>

<style scoped>
.testnet-journey{display:grid;gap:1.25rem;margin:1.75rem 0}.journey-heading,.panel{padding:clamp(1rem,3vw,1.6rem);border:1px solid var(--vp-c-divider);border-radius:16px;background:var(--vp-c-bg-soft)}.journey-heading h2,.panel h3{margin-top:.25rem;border:0}.kicker{margin:0;color:var(--vp-c-brand-1);font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.safety,.notice{padding:.8rem 1rem;border-left:4px solid var(--vp-c-warning-1);border-radius:6px;background:var(--vp-c-warning-soft)}.wallet-confirmation{display:grid;gap:.25rem;padding:1rem;border:2px solid var(--vp-c-brand-1);border-radius:10px;background:var(--vp-c-brand-soft);color:var(--vp-c-text-1)}.steps{display:grid;grid-template-columns:repeat(6,1fr);gap:.5rem;padding:0;list-style:none}.steps li{padding:.65rem .4rem;border:1px solid var(--vp-c-divider);border-radius:999px;text-align:center;font-size:.85rem;font-weight:700}.steps li.done{border-color:var(--vp-c-brand-1);color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.current-step{border:2px solid var(--vp-c-brand-1)}.completed-step{display:flex;flex-wrap:wrap;align-items:center;gap:.5rem;margin:0;padding:.75rem 1rem;border-radius:12px;background:var(--vp-c-brand-soft);color:var(--vp-c-text-1)}.completed-step>span{display:grid;width:1.6rem;height:1.6rem;place-items:center;border-radius:50%;background:var(--vp-c-brand-1);color:white;font-weight:800}.completed-step small{margin-left:auto;color:var(--vp-c-text-2)}.registration,.profile-summary{display:grid;gap:.8rem}.registration>label,legend{font-weight:700}.registration input[type=text]{min-height:44px;padding:.65rem .8rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}fieldset{display:grid;gap:.65rem;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:10px}fieldset label{display:grid;grid-template-columns:1.2rem 1fr;gap:.6rem;align-items:start}input[type=checkbox]{width:1rem;height:1rem;margin-top:.25rem}.actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1rem}button{min-height:44px;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;font:inherit;font-weight:700;cursor:pointer}button.primary{color:var(--vp-c-white);background:var(--vp-c-brand-1)}button.secondary{color:var(--vp-c-brand-1);background:transparent}button:disabled{cursor:not-allowed;opacity:.45}.badge{width:fit-content;padding:.25rem .55rem;border-radius:999px;font-size:.8rem;font-weight:700}.badge.success{color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.status-grid>div{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg)}.status-grid span,.track-list span,.now-playing span{color:var(--vp-c-text-2);font-size:.85rem}.error{color:var(--vp-c-danger-1)}.track-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.track-list button{display:grid;gap:.2rem;text-align:left;color:var(--vp-c-text-1);background:var(--vp-c-bg);border-color:var(--vp-c-divider)}.track-list button.selected{border-color:var(--vp-c-brand-1);box-shadow:0 0 0 2px var(--vp-c-brand-soft)}.track-list small{color:var(--vp-c-brand-1)}.now-playing{display:flex;gap:.8rem;align-items:center;margin:1rem 0 .6rem}.now-playing>div{display:grid}.art{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;color:var(--vp-c-white);background:linear-gradient(135deg,var(--vp-c-brand-1),#7c3aed);font-size:1.4rem}.supporter-action{margin-top:1.25rem;padding-top:1rem;border-top:1px solid var(--vp-c-divider)}.supporter-action h4{margin:.25rem 0;border:0}.support-target-summary{display:flex;justify-content:space-between;gap:.75rem;margin:.8rem 0 .4rem;color:var(--vp-c-text-2);font-size:.85rem}.support-target-summary strong{color:var(--vp-c-text-1)}.support-target-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;max-height:min(22rem,55vh);margin:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:.3rem;border:1px solid var(--vp-c-divider);border-radius:12px;background:var(--vp-c-bg-soft)}.support-target-list:focus-visible{outline:3px solid var(--vp-c-brand-1);outline-offset:2px}.support-target-list button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:.65rem;align-items:center;min-height:74px;padding:.55rem .65rem;text-align:left;color:var(--vp-c-text-1);background:var(--vp-c-bg);border-color:var(--vp-c-divider)}.support-target-list button.selected{border-color:var(--vp-c-brand-1);box-shadow:0 0 0 2px var(--vp-c-brand-soft)}.support-target-copy{display:grid;min-width:0;gap:.08rem}.support-target-copy strong,.support-target-copy small,.support-target-description{overflow:hidden;text-overflow:ellipsis}.support-target-copy small,.support-target-description{color:var(--vp-c-text-2);font-size:.78rem}.support-target-description{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2}.support-target-list b{white-space:nowrap;color:var(--vp-c-brand-1);font-size:.78rem}.registered-source{width:fit-content;margin-top:.12rem;padding:.1rem .35rem;border-radius:999px;background:var(--vp-c-brand-soft);color:var(--vp-c-brand-1)!important;font-size:.7rem!important}.creator-avatar{display:grid;width:2rem;height:2rem;place-items:center;border-radius:50%;background:var(--vp-c-brand-soft);font-size:1rem}.directory-note{margin:.55rem 0;color:var(--vp-c-text-2);font-size:.78rem}.selected-support-target{margin-top:1rem;padding:1rem;border:1px solid var(--vp-c-brand-1);border-radius:12px;background:var(--vp-c-bg)}.credential-card{display:grid;grid-template-columns:minmax(120px,180px) 1fr;gap:1rem;align-items:center;margin:1rem 0;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:14px;background:var(--vp-c-bg)}.credential-card img{width:100%;height:auto;border-radius:12px}.credential-card figcaption{display:grid;gap:.5rem}.credential-card figcaption span{color:var(--vp-c-text-2);font-size:.9rem}audio{width:100%}code{overflow-wrap:anywhere}@media(max-width:720px){.steps{grid-template-columns:repeat(3,1fr)}.support-target-list{grid-template-columns:1fr;max-height:min(24rem,60vh)}}@media(max-width:640px){.steps,.status-grid,.track-list,.credential-card{grid-template-columns:1fr}.actions button{width:100%}.completed-step small{width:100%;margin-left:2.1rem}.support-target-summary{display:grid;gap:.1rem}.support-target-list button{grid-template-columns:auto minmax(0,1fr)}.support-target-list b{grid-column:2}}
.steps{grid-template-columns:repeat(5,1fr)}
</style>
