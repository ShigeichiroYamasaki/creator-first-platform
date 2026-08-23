<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { withBase } from 'vitepress'
import { createPublicClient, createWalletClient, custom, formatUnits, keccak256, toHex, type Address, type EIP1193Provider, type Hash } from 'viem'
import { sepolia } from 'viem/chains'
import { createTestToneWav, mockJpycAbi, SEPOLIA_CHAIN_ID, subscriptionAbi, validateDeploymentManifest } from './testnet-user-demo.js'

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
  contracts: { mockJpyc: Address | null; subscription: Address | null; treasury: Address | null; supporterSbt: Address | null }
}
type Track = { id: string; title: string; artist: string; frequency: number; subscriberOnly: boolean }

const storageKey = 'creator-first-testnet-test-user-v2'
const tracks: Track[] = [
  { id: 'preview', title: 'First Light — Preview', artist: 'Synthetic Demo Artist', frequency: 261.63, subscriberOnly: false },
  { id: 'subscriber', title: 'Creator Signal — Subscriber Track', artist: 'Synthetic Demo Artist', frequency: 329.63, subscriberOnly: true }
]
const alias = ref('')
const acceptedTerms = ref(false)
const acceptedPrivacy = ref(false)
const acknowledgedTestOnly = ref(false)
const profile = ref<DemoProfile>()
const deployment = ref<Deployment>()
const manifestError = ref('')
const walletAddress = ref<Address>()
const walletChainId = ref<number>()
const walletMessage = ref('')
const busyAction = ref('')
const balance = ref(0n)
const allowance = ref(0n)
const planPrice = ref(0n)
const planVersion = ref(0n)
const planEnabled = ref(false)
const subscriptionActive = ref(false)
const activeUntil = ref(0n)
const lastTransaction = ref<Hash>()
const selectedTrack = ref(tracks[0])
const toneUrls = new Map<string, string>()
const audioElement = ref<HTMLAudioElement>()
const playerMessage = ref('合成試聴音源を選んで再生できます。')
let provider: DemoProvider | undefined
let listenersAttached = false

const normalizedAlias = computed(() => alias.value.trim().normalize('NFKC'))
const aliasValid = computed(() => /^[\p{L}\p{N}_ -]{2,24}$/u.test(normalizedAlias.value))
const ready = computed(() => aliasValid.value && acceptedTerms.value && acceptedPrivacy.value && acknowledgedTestOnly.value)
const correctChain = computed(() => walletChainId.value === SEPOLIA_CHAIN_ID)
const contractsReady = computed(() => Boolean(deployment.value?.active && deployment.value.contracts.mockJpyc && deployment.value.contracts.subscription))
const chainActionsReady = computed(() => Boolean(profile.value && walletAddress.value && correctChain.value && contractsReady.value && !busyAction.value))
const allowanceEnough = computed(() => planPrice.value > 0n && allowance.value >= planPrice.value)
const balanceLabel = computed(() => `${formatUnits(balance.value, 18)} tJPYC`)
const priceLabel = computed(() => planPrice.value ? `${formatUnits(planPrice.value, 18)} tJPYC` : '未取得')
const canPlaySelected = computed(() => !selectedTrack.value.subscriberOnly || subscriptionActive.value)

function newTestUserId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return [...crypto.getRandomValues(new Uint8Array(16))].map((value) => value.toString(16).padStart(2, '0')).join('')
}
function saveProfile(): void {
  if (!ready.value) return
  const value: DemoProfile = { registered: true, testUserId: newTestUserId(), displayName: normalizedAlias.value, state: 'TESTNET_DEMO_PROFILE', createdAt: new Date().toISOString() }
  sessionStorage.setItem(storageKey, JSON.stringify(value))
  profile.value = value
  walletMessage.value = `${value.displayName} をTestnet Demo Profileとして登録しました。次にWalletを接続できます。`
}
function resetProfile(): void {
  sessionStorage.removeItem(storageKey)
  profile.value = undefined
  alias.value = ''
  acceptedTerms.value = false
  acceptedPrivacy.value = false
  acknowledgedTestOnly.value = false
  walletMessage.value = 'このタブのProfileだけを削除しました。Wallet接続やBlockchain上の履歴は削除されません。'
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
}
const handleAccountsChanged = async (value: Address[] | string): Promise<void> => {
  const accounts = Array.isArray(value) ? value : []
  walletAddress.value = accounts[0]
  clearOnchainState()
  walletMessage.value = accounts[0] ? 'Wallet Accountが変更されました。状態を再確認します。' : 'Wallet接続が解除されました。'
  if (accounts[0] && correctChain.value && contractsReady.value) await refreshOnchainState(true)
}
const handleChainChanged = async (value: Address[] | string): Promise<void> => {
  walletChainId.value = typeof value === 'string' ? Number.parseInt(value, 16) : undefined
  clearOnchainState()
  walletMessage.value = correctChain.value ? 'Sepoliaへ変更されました。状態を再確認します。' : '対象外Networkへ変更されたため、Contract操作と限定Trackを停止しました。'
  if (correctChain.value && walletAddress.value && contractsReady.value) await refreshOnchainState(true)
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
    walletMessage.value = 'EIP-1193対応Walletが見つかりません。Walletをインストールしてから明示的に接続してください。'
    return
  }
  busyAction.value = 'wallet'
  try {
    const accounts = await provider.request({ method: 'eth_requestAccounts' }) as Address[]
    walletAddress.value = accounts[0]
    attachProviderListeners()
    await readChainId()
    walletMessage.value = correctChain.value ? 'WalletをSepoliaへ接続しました。' : 'Walletを接続しました。Sepoliaへ切り替えてください。'
    if (correctChain.value && contractsReady.value) await refreshOnchainState(true)
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : 'Wallet接続が拒否されました。'
  } finally { busyAction.value = '' }
}
async function switchToSepolia(): Promise<void> {
  if (!provider) return
  busyAction.value = 'network'
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0xaa36a7' }] })
    await readChainId()
    walletMessage.value = 'Ethereum Sepoliaへ切り替えました。'
    if (contractsReady.value) await refreshOnchainState(true)
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : 'Sepoliaへの切替が拒否されました。'
  } finally { busyAction.value = '' }
}
function clients() {
  if (!provider || !walletAddress.value || !deployment.value?.contracts.mockJpyc || !deployment.value.contracts.subscription) throw new Error('Walletまたは検証済みContract Addressが利用できません。')
  const transport = custom(provider)
  return {
    publicClient: createPublicClient({ chain: sepolia, transport }),
    walletClient: createWalletClient({ account: walletAddress.value, chain: sepolia, transport }),
    mockJpyc: deployment.value.contracts.mockJpyc,
    subscription: deployment.value.contracts.subscription
  }
}
async function refreshOnchainState(force = false): Promise<void> {
  if (!force && !chainActionsReady.value) return
  const { publicClient, mockJpyc, subscription } = clients()
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
}
async function transact(action: string, submit: () => Promise<Hash>): Promise<void> {
  busyAction.value = action
  lastTransaction.value = undefined
  try {
    const hash = await submit()
    lastTransaction.value = hash
    walletMessage.value = `${action} transactionを送信しました。確定を待っています。`
    const { publicClient } = clients()
    const receipt = await publicClient.waitForTransactionReceipt({ hash })
    if (receipt.status !== 'success') throw new Error(`${action} transactionがrevertしました。`)
    await refreshOnchainState(true)
    walletMessage.value = `${action} transactionがSepoliaで確定しました。`
  } catch (error) {
    walletMessage.value = error instanceof Error ? error.message : `${action}に失敗しました。`
  } finally { busyAction.value = '' }
}
async function claimMockJpyc(): Promise<void> {
  await transact('MockJPYC取得', async () => {
    const { walletClient, mockJpyc } = clients()
    return walletClient.writeContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'claim' })
  })
}
async function approveSubscription(): Promise<void> {
  await transact('利用承認', async () => {
    const { walletClient, mockJpyc, subscription } = clients()
    return walletClient.writeContract({ address: mockJpyc, abi: mockJpycAbi, functionName: 'approve', args: [subscription, planPrice.value] })
  })
}
async function subscribe(): Promise<void> {
  if (!profile.value) return
  const paymentReference = keccak256(toHex(`${profile.value.testUserId}:${Date.now()}`))
  await transact('Subscription', async () => {
    const { walletClient, subscription } = clients()
    return walletClient.writeContract({ address: subscription, abi: subscriptionAbi, functionName: 'subscribe', args: [paymentReference, planVersion.value] })
  })
}
async function selectTrack(track: Track): Promise<void> {
  selectedTrack.value = track
  await nextTick()
  if (!audioElement.value) return
  audioElement.value.pause()
  audioElement.value.src = toneUrls.get(track.id) ?? ''
  audioElement.value.load()
  playerMessage.value = track.subscriberOnly && !subscriptionActive.value ? 'この合成Trackは有効なTestnet Subscriptionがある場合だけ再生できます。' : `${track.title} を選択しました。`
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
    if (!response.ok) throw new Error(`Deployment manifest HTTP ${response.status}`)
    deployment.value = validateDeploymentManifest(await response.json()) as Deployment
  } catch (error) { manifestError.value = error instanceof Error ? error.message : 'Deployment manifestを検証できません。' }
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
      <p class="kicker">Sepolia · mockJPYC · synthetic audio</p>
      <h2 id="testnet-journey-title">Test User Journey</h2>
      <p>匿名Demo Profileの登録から、Wallet接続、test-only課金、Player操作までを順番に確認します。</p>
      <p class="safety"><strong>重要:</strong> tJPYCは無価値・償還不可で、実在JPYCではありません。ETHはSepolia Gasにだけ使い、秘密鍵やSeed Phraseは入力しません。</p>
    </header>
    <ol class="steps" aria-label="Test User Journey steps">
      <li :class="{ done: profile }">1. Profile</li><li :class="{ done: walletAddress && correctChain }">2. Wallet</li><li :class="{ done: subscriptionActive }">3. Subscription</li><li>4. Player</li>
    </ol>

    <section class="panel" aria-labelledby="profile-title">
      <h3 id="profile-title">1. Test User登録</h3>
      <div v-if="profile" class="profile-summary">
        <span class="badge success">登録済み</span><strong>{{ profile.displayName }}</strong><code>{{ profile.testUserId }}</code>
        <p>AliasとIDはこのタブのSession Storageだけに保存され、Platform Accountや本人確認にはなりません。</p>
        <button class="secondary" type="button" @click="resetProfile">Profileを削除</button>
      </div>
      <form v-else class="registration" @submit.prevent="saveProfile">
        <label for="demo-alias">デモ表示用Alias</label>
        <input id="demo-alias" v-model="alias" type="text" minlength="2" maxlength="24" autocomplete="off" placeholder="Demo Listener 01" required>
        <small>実名、メール、電話番号、Password、Wallet Addressは入力しないでください。</small>
        <p v-if="alias && !aliasValid" class="error" role="alert">2〜24文字の文字・数字・空白・_・-を使ってください。</p>
        <fieldset><legend>Demo利用条件・Privacy Notice v2</legend>
          <label><input v-model="acceptedTerms" type="checkbox"> 金銭的価値や継続利用を保証しないTestnet Demo条件に同意します</label>
          <label><input v-model="acceptedPrivacy" type="checkbox"> Aliasはこのタブ内だけに保存され、Wallet AddressはBlockchain上で公開されることを確認しました</label>
          <label><input v-model="acknowledgedTestOnly" type="checkbox"> tJPYCは実在JPYCではなく、Sepolia ETHはGasにだけ使うことを理解しました</label>
        </fieldset>
        <button class="primary" type="submit" :disabled="!ready">Test Userを登録</button>
      </form>
    </section>

    <section class="panel" aria-labelledby="wallet-title">
      <h3 id="wallet-title">2. WalletとSepolia</h3>
      <div class="status-grid">
        <div><span>Deployment</span><strong>{{ manifestError ? '無効' : deployment?.active ? '公開済み' : '未デプロイ' }}</strong></div>
        <div><span>Network</span><strong>{{ walletChainId ?? '未接続' }}<template v-if="walletChainId"> / {{ correctChain ? 'Sepolia' : '対象外' }}</template></strong></div>
        <div><span>Wallet</span><strong>{{ shortAddress(walletAddress) }}</strong></div>
        <div><span>Source Commit</span><strong>{{ deployment?.sourceCommit?.slice(0, 12) ?? '未公開' }}</strong></div>
      </div>
      <p v-if="manifestError" class="error" role="alert">{{ manifestError }} 書込み操作を停止しました。</p>
      <p v-else-if="deployment && !deployment.active" class="notice">Sepolia Contract Addressがまだ公開されていないため、Wallet接続は試せますが、tJPYC取得・承認・課金は無効です。Addressを手入力して回避することはできません。</p>
      <div class="actions"><button class="primary" type="button" :disabled="!profile || busyAction === 'wallet'" @click="connectWallet">{{ walletAddress ? 'Walletを再接続' : 'Walletを接続' }}</button><button class="secondary" type="button" :disabled="!walletAddress || correctChain || busyAction === 'network'" @click="switchToSepolia">Sepoliaへ切替</button><button class="secondary" type="button" :disabled="!chainActionsReady" @click="refreshOnchainState()">状態を更新</button></div>
    </section>

    <section class="panel" aria-labelledby="payment-title">
      <h3 id="payment-title">3. mockJPYC課金</h3>
      <div class="status-grid">
        <div><span>tJPYC残高</span><strong>{{ balanceLabel }}</strong></div><div><span>Plan価格</span><strong>{{ priceLabel }}</strong></div><div><span>Allowance</span><strong>{{ allowanceEnough ? '承認済み' : '未承認' }}</strong></div><div><span>Subscription</span><strong>{{ subscriptionActive ? `有効 / ${formatDate(activeUntil)}` : '無効' }}</strong></div>
      </div>
      <div class="actions"><button class="primary" type="button" :disabled="!chainActionsReady" @click="claimMockJpyc">2,000 tJPYCを1回取得</button><button class="secondary" type="button" :disabled="!chainActionsReady || !planEnabled || balance < planPrice" @click="approveSubscription">Plan価格だけ承認</button><button class="primary" type="button" :disabled="!chainActionsReady || !planEnabled || !allowanceEnough || balance < planPrice" @click="subscribe">Subscriptionを開始</button></div>
      <p class="notice">各ボタンは確認画面をWalletに表示します。自動署名・無制限Approve・ETHによる料金支払いは行いません。</p>
      <p v-if="lastTransaction"><a :href="`https://sepolia.etherscan.io/tx/${lastTransaction}`" target="_blank" rel="noopener noreferrer">直近TransactionをSepolia Etherscanで確認</a></p>
      <p aria-live="polite">{{ walletMessage }}</p>
    </section>

    <section class="panel" aria-labelledby="player-title">
      <h3 id="player-title">4. 音楽プレーヤー操作</h3>
      <p>このページ内で生成した短い合成音だけを使います。Navidrome、Gateway、実在楽曲または再生証跡には接続しません。</p>
      <div class="track-list"><button v-for="track in tracks" :key="track.id" type="button" :class="{ selected: selectedTrack.id === track.id }" @click="selectTrack(track)"><strong>{{ track.title }}</strong><span>{{ track.artist }}</span><small>{{ track.subscriberOnly ? 'Subscription限定' : '誰でも試聴可' }}</small></button></div>
      <div class="now-playing"><span class="art" aria-hidden="true">♪</span><div><strong>{{ selectedTrack.title }}</strong><span>{{ selectedTrack.artist }}</span></div></div>
      <audio ref="audioElement" controls preload="metadata" :aria-label="`${selectedTrack.title} player`" />
      <div class="actions"><button class="primary" type="button" :disabled="!canPlaySelected" @click="playSelected">再生</button><button class="secondary" type="button" @click="pauseSelected">一時停止</button></div>
      <p v-if="!canPlaySelected" class="notice">Subscriber TrackはSepolia上の有効なSubscriptionを確認後に解放されます。Preview Trackはいつでも操作できます。</p>
      <p aria-live="polite">{{ playerMessage }}</p>
    </section>
  </section>
</template>

<style scoped>
.testnet-journey{display:grid;gap:1.25rem;margin:1.75rem 0}.journey-heading,.panel{padding:clamp(1rem,3vw,1.6rem);border:1px solid var(--vp-c-divider);border-radius:16px;background:var(--vp-c-bg-soft)}.journey-heading h2,.panel h3{margin-top:.25rem;border:0}.kicker{margin:0;color:var(--vp-c-brand-1);font-size:.82rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}.safety,.notice{padding:.8rem 1rem;border-left:4px solid var(--vp-c-warning-1);border-radius:6px;background:var(--vp-c-warning-soft)}.steps{display:grid;grid-template-columns:repeat(4,1fr);gap:.5rem;padding:0;list-style:none}.steps li{padding:.65rem .4rem;border:1px solid var(--vp-c-divider);border-radius:999px;text-align:center;font-size:.85rem;font-weight:700}.steps li.done{border-color:var(--vp-c-brand-1);color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.registration,.profile-summary{display:grid;gap:.8rem}.registration>label,legend{font-weight:700}.registration input[type=text]{min-height:44px;padding:.65rem .8rem;border:1px solid var(--vp-c-divider);border-radius:8px;background:var(--vp-c-bg);color:var(--vp-c-text-1);font:inherit}fieldset{display:grid;gap:.65rem;padding:1rem;border:1px solid var(--vp-c-divider);border-radius:10px}fieldset label{display:grid;grid-template-columns:1.2rem 1fr;gap:.6rem;align-items:start}input[type=checkbox]{width:1rem;height:1rem;margin-top:.25rem}.actions{display:flex;flex-wrap:wrap;gap:.65rem;margin-top:1rem}button{min-height:44px;padding:.6rem .9rem;border:1px solid var(--vp-c-brand-1);border-radius:9px;font:inherit;font-weight:700;cursor:pointer}button.primary{color:var(--vp-c-white);background:var(--vp-c-brand-1)}button.secondary{color:var(--vp-c-brand-1);background:transparent}button:disabled{cursor:not-allowed;opacity:.45}.badge{width:fit-content;padding:.25rem .55rem;border-radius:999px;font-size:.8rem;font-weight:700}.badge.success{color:var(--vp-c-brand-1);background:var(--vp-c-brand-soft)}.status-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.7rem}.status-grid>div{display:grid;gap:.2rem;padding:.75rem;border:1px solid var(--vp-c-divider);border-radius:10px;background:var(--vp-c-bg)}.status-grid span,.track-list span,.now-playing span{color:var(--vp-c-text-2);font-size:.85rem}.error{color:var(--vp-c-danger-1)}.track-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem}.track-list button{display:grid;gap:.2rem;text-align:left;color:var(--vp-c-text-1);background:var(--vp-c-bg);border-color:var(--vp-c-divider)}.track-list button.selected{border-color:var(--vp-c-brand-1);box-shadow:0 0 0 2px var(--vp-c-brand-soft)}.track-list small{color:var(--vp-c-brand-1)}.now-playing{display:flex;gap:.8rem;align-items:center;margin:1rem 0 .6rem}.now-playing>div{display:grid}.art{display:grid;place-items:center;width:48px;height:48px;border-radius:12px;color:var(--vp-c-white);background:linear-gradient(135deg,var(--vp-c-brand-1),#7c3aed);font-size:1.4rem}audio{width:100%}code{overflow-wrap:anywhere}@media(max-width:640px){.steps,.status-grid,.track-list{grid-template-columns:1fr}.actions button{width:100%}}
</style>
