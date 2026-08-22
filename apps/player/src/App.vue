<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { HttpGatewayClient } from './api/HttpGatewayClient'
import { MockGatewayClient } from './api/MockGatewayClient'
import { resolveStreamUrl } from './api/url-policy.js'
import type {
  GatewayPort,
  PlaybackSession,
  PlaybackState,
  PlayerMode,
  SupportIntent,
  SupportStatus,
  SupporterTier,
  Track
} from './api/types'
import { AudioEngine } from './audio/AudioEngine'
import { Eip1193WalletAdapter, type WalletConnection } from './wallet/Eip1193WalletAdapter'

const mode: PlayerMode = import.meta.env.VITE_GATEWAY_MODE === 'gateway' ? 'gateway' : 'mock'
const playerIconUrl = `${import.meta.env.BASE_URL}player-icon.svg`
const gateway: GatewayPort = mode === 'gateway'
  ? new HttpGatewayClient(import.meta.env.VITE_GATEWAY_BASE)
  : new MockGatewayClient()

const audioElement = ref<HTMLAudioElement>()
const tracks = ref<Track[]>([])
const selectedTrack = ref<Track>()
const playbackSession = ref<PlaybackSession>()
const playbackState = ref<PlaybackState>('IDLE')
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(0.72)
const loadingCatalog = ref(true)
const message = ref('')
const error = ref('')
const wallet = ref<WalletConnection>()
const platformAuthenticated = ref(false)
const accountLabel = ref('')
const supportIntent = ref<SupportIntent>()
const supportStatus = ref<SupportStatus>('NOT_SUPPORTER')
const supporterTier = ref<SupporterTier>('NONE')
const capabilityMessage = ref('')

let audioEngine: AudioEngine | undefined
let walletAdapter: Eip1193WalletAdapter | undefined

const isPlaying = computed(() => playbackState.value === 'PLAYING')
const activeArtist = computed(() => selectedTrack.value?.artistName ?? tracks.value[0]?.artistName ?? 'Creator')
const activeArtistId = computed(() => selectedTrack.value?.artistId ?? tracks.value[0]?.artistId)
const progress = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
const shortAddress = computed(() => wallet.value
  ? `${wallet.value.address.slice(0, 6)}…${wallet.value.address.slice(-4)}`
  : '')
const tierLabel = computed(() => ({
  NONE: '未登録',
  SUPPORTER: 'Supporter',
  EARLY_SUPPORTER: 'Early Supporter'
})[supporterTier.value])

function newOperationId(): string {
  return crypto.randomUUID()
}

function formatTime(value: number): string {
  if (!Number.isFinite(value)) return '0:00'
  const minutes = Math.floor(value / 60)
  const seconds = Math.floor(value % 60).toString().padStart(2, '0')
  return `${minutes}:${seconds}`
}

function clearNotices(): void {
  error.value = ''
  message.value = ''
}

async function closePlaybackSession(): Promise<void> {
  const sessionId = playbackSession.value?.playbackSessionId
  playbackSession.value = undefined
  if (sessionId) await gateway.closePlaybackSession(sessionId).catch(() => undefined)
}

async function playTrack(track: Track): Promise<void> {
  clearNotices()
  playbackState.value = 'AUTHORIZING'
  try {
    await closePlaybackSession()
    const session = await gateway.createPlaybackSession(track.trackId, newOperationId())
    const source = resolveStreamUrl(session.streamUrl, window.location.href, mode === 'mock')
    selectedTrack.value = track
    playbackSession.value = session
    audioEngine?.load(source)
    updateMediaSession(track)
    playbackState.value = 'READY'
    await audioEngine?.play()
    playbackState.value = 'PLAYING'
  } catch (cause) {
    playbackState.value = 'ERROR'
    error.value = cause instanceof Error ? cause.message : '再生を開始できません'
  }
}

async function togglePlayback(): Promise<void> {
  if (!selectedTrack.value) {
    if (tracks.value[0]) await playTrack(tracks.value[0])
    return
  }
  if (!playbackSession.value) {
    await playTrack(selectedTrack.value)
    return
  }
  if (isPlaying.value) {
    audioEngine?.pause()
    playbackState.value = 'PAUSED'
  } else {
    try {
      await audioEngine?.play()
      playbackState.value = 'PLAYING'
    } catch {
      playbackState.value = 'ERROR'
      error.value = '音声を再開できません'
    }
  }
}

async function moveTrack(offset: number): Promise<void> {
  if (!tracks.value.length) return
  const index = Math.max(0, tracks.value.findIndex((track) => track.trackId === selectedTrack.value?.trackId))
  const next = tracks.value[(index + offset + tracks.value.length) % tracks.value.length]
  await playTrack(next)
}

function seek(event: Event): void {
  const target = event.target as HTMLInputElement
  const seconds = (Number(target.value) / 100) * duration.value
  audioEngine?.seek(seconds)
}

function changeVolume(event: Event): void {
  volume.value = Number((event.target as HTMLInputElement).value)
  audioEngine?.setVolume(volume.value)
}

function updateMediaSession(track: Track): void {
  if (!('mediaSession' in navigator)) return
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.title,
    artist: track.artistName,
    album: track.albumTitle
  })
}

async function connectWallet(): Promise<void> {
  clearNotices()
  try {
    walletAdapter = new Eip1193WalletAdapter()
    wallet.value = await walletAdapter.connect()
    platformAuthenticated.value = false
    accountLabel.value = ''
    message.value = 'Walletを接続しました。通常再生に署名は不要です。'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Walletへ接続できません'
  }
}

async function signInWithWallet(): Promise<void> {
  if (!wallet.value || !walletAdapter) return
  clearNotices()
  let signature = ''
  try {
    const challenge = await gateway.createWalletChallenge(wallet.value.address, wallet.value.chainId)
    signature = await walletAdapter.signMessage(wallet.value.address, challenge.message)
    const session = await gateway.verifyWalletChallenge(challenge.challengeId, challenge.message, signature)
    platformAuthenticated.value = session.authenticated
    accountLabel.value = session.accountLabel
    message.value = 'Platform Sessionを確認しました。'
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'SIWEログインに失敗しました'
  } finally {
    signature = ''
  }
}

async function prepareSupportIntent(): Promise<void> {
  if (!platformAuthenticated.value || !wallet.value || !activeArtistId.value) {
    error.value = 'Supporter登録にはWallet接続とSIWEログインが必要です'
    return
  }
  clearNotices()
  try {
    supportIntent.value = await gateway.createSupportIntent(
      activeArtistId.value,
      wallet.value.address,
      newOperationId()
    )
    supportStatus.value = 'SIGNATURE_REQUIRED'
  } catch (cause) {
    supportStatus.value = 'FAILED'
    error.value = cause instanceof Error ? cause.message : 'Support Intentを作成できません'
  }
}

async function signSupportIntent(): Promise<void> {
  if (!wallet.value || !walletAdapter || !supportIntent.value) return
  clearNotices()
  let signature = ''
  try {
    const expectedChain = Number(supportIntent.value.typedData.domain.chainId)
    if (wallet.value.chainId !== expectedChain) {
      throw new Error(`WalletをChain ID ${expectedChain}へ切り替えてください`)
    }
    signature = await walletAdapter.signTypedData(wallet.value.address, supportIntent.value.typedData)
    const submitted = await gateway.submitSupportAuthorization(supportIntent.value.requestId, signature)
    supportStatus.value = submitted.status
    supportIntent.value = undefined
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const current = await gateway.getSupportRegistration(submitted.requestId)
      supportStatus.value = current.status
      supporterTier.value = current.tier
      if (['SBT_ACTIVE', 'FAILED', 'REVOKED', 'BURNED'].includes(current.status)) break
      await new Promise((resolve) => window.setTimeout(resolve, 1_000))
    }
    message.value = supportStatus.value === 'SBT_ACTIVE'
      ? `${tierLabel.value} SBTを確認しました。`
      : 'SBTはまだ確定していません。'
  } catch (cause) {
    supportStatus.value = 'FAILED'
    error.value = cause instanceof Error ? cause.message : 'Supporter登録に失敗しました'
  } finally {
    signature = ''
  }
}

async function checkCommunityCapability(): Promise<void> {
  if (!activeArtistId.value) return
  clearNotices()
  try {
    const capability = await gateway.getCommunityCapability(activeArtistId.value)
    capabilityMessage.value = capability.allowed
      ? `${capability.tier}資格でCommunity Accessが許可されました（Policy v${capability.policyVersion}）。`
      : `Community Accessは拒否されました: ${capability.reason}`
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Capabilityを確認できません'
  }
}

function cancelSupportIntent(): void {
  supportIntent.value = undefined
  supportStatus.value = 'NOT_SUPPORTER'
}

onMounted(async () => {
  if (audioElement.value) {
    audioEngine = new AudioEngine(audioElement.value)
    audioEngine.setVolume(volume.value)
  }
  if ('mediaSession' in navigator) {
    navigator.mediaSession.setActionHandler('play', () => void togglePlayback())
    navigator.mediaSession.setActionHandler('pause', () => void togglePlayback())
    navigator.mediaSession.setActionHandler('previoustrack', () => void moveTrack(-1))
    navigator.mediaSession.setActionHandler('nexttrack', () => void moveTrack(1))
  }
  try {
    tracks.value = await gateway.listTracks()
    selectedTrack.value = tracks.value[0]
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Catalogを取得できません'
  } finally {
    loadingCatalog.value = false
  }
})

onBeforeUnmount(() => {
  audioEngine?.close()
  void closePlaybackSession()
})
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <div class="brand">
        <img :src="playerIconUrl" alt="" width="38" height="38" />
        <div>
          <p class="eyebrow">Creator First Platform</p>
          <h1>Player</h1>
        </div>
      </div>
      <div class="environment" :class="mode">
        <span class="status-dot" aria-hidden="true"></span>
        {{ mode === 'mock' ? 'LOCAL MOCK' : 'GATEWAY' }}
      </div>
    </header>

    <p v-if="mode === 'mock'" class="mock-banner">
      合成試験音とMock資格だけを使用します。実JPYC、実SBT、Blockchain Transactionは発生しません。
    </p>

    <section class="content-grid">
      <aside class="library panel" aria-labelledby="library-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Library</p>
            <h2 id="library-title">試験カタログ</h2>
          </div>
          <span>{{ tracks.length }} tracks</span>
        </div>

        <p v-if="loadingCatalog" class="muted">Catalogを読み込んでいます…</p>
        <ol v-else class="track-list">
          <li v-for="(track, index) in tracks" :key="track.trackId">
            <button
              type="button"
              class="track-button"
              :class="{ active: selectedTrack?.trackId === track.trackId }"
              :aria-label="`${track.title} — ${track.artistName}を再生`"
              @click="playTrack(track)"
            >
              <span class="track-index">{{ String(index + 1).padStart(2, '0') }}</span>
              <span class="track-copy">
                <strong>{{ track.title }}</strong>
                <small>{{ track.artistName }} · {{ track.albumTitle }}</small>
              </span>
              <span class="capability-tag">{{ track.requiredCapability?.replace('_', ' ') }}</span>
              <span>{{ formatTime(track.durationSeconds) }}</span>
            </button>
          </li>
        </ol>
      </aside>

      <section class="now-playing panel" aria-labelledby="now-playing-title">
        <div
          class="album-art"
          :style="{ '--accent': selectedTrack?.accent ?? '#8b5cf6' }"
          role="img"
          :aria-label="selectedTrack ? `${selectedTrack.albumTitle}の抽象アートワーク` : 'アートワーク'"
        >
          <span>CF</span>
          <i aria-hidden="true"></i>
        </div>
        <p class="eyebrow">Now playing</p>
        <h2 id="now-playing-title">{{ selectedTrack?.title ?? 'Trackを選択' }}</h2>
        <p class="artist-name">{{ selectedTrack?.artistName }} · {{ selectedTrack?.albumTitle }}</p>

        <audio
          ref="audioElement"
          preload="metadata"
          @timeupdate="currentTime = audioElement?.currentTime ?? 0"
          @durationchange="duration = audioElement?.duration ?? 0"
          @play="playbackState = 'PLAYING'"
          @pause="playbackState = playbackSession ? 'PAUSED' : 'IDLE'"
          @ended="moveTrack(1)"
          @error="playbackState = 'ERROR'"
        ></audio>

        <div class="timeline">
          <input
            type="range"
            min="0"
            max="100"
            :value="progress"
            aria-label="再生位置"
            @input="seek"
          />
          <div><span>{{ formatTime(currentTime) }}</span><span>{{ formatTime(duration || selectedTrack?.durationSeconds || 0) }}</span></div>
        </div>

        <div class="transport" aria-label="再生コントロール">
          <button type="button" class="icon-button" aria-label="前の曲" @click="moveTrack(-1)">‹</button>
          <button type="button" class="play-button" :aria-label="isPlaying ? '一時停止' : '再生'" @click="togglePlayback">
            {{ isPlaying ? 'Ⅱ' : '▶' }}
          </button>
          <button type="button" class="icon-button" aria-label="次の曲" @click="moveTrack(1)">›</button>
        </div>

        <label class="volume-control">
          <span>音量</span>
          <input type="range" min="0" max="1" step="0.01" :value="volume" @input="changeVolume" />
        </label>
        <p class="playback-state">{{ playbackState }}</p>
      </section>

      <aside class="identity-stack">
        <section class="panel wallet-panel" aria-labelledby="wallet-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Identity</p>
              <h2 id="wallet-title">Wallet</h2>
            </div>
            <span :class="['pill', wallet ? 'success' : '']">{{ wallet ? 'CONNECTED' : 'OFFLINE' }}</span>
          </div>
          <template v-if="wallet">
            <dl class="identity-details">
              <div><dt>Address</dt><dd>{{ shortAddress }}</dd></div>
              <div><dt>Chain</dt><dd>{{ wallet.chainId }}</dd></div>
              <div><dt>Session</dt><dd>{{ platformAuthenticated ? accountLabel : '未認証' }}</dd></div>
            </dl>
            <button v-if="!platformAuthenticated" type="button" class="secondary-button" @click="signInWithWallet">
              SIWEでログイン
            </button>
          </template>
          <button v-else type="button" class="primary-button" @click="connectWallet">Walletを接続</button>
          <p class="fine-print">秘密鍵はPlayerへ渡りません。通常再生ではWallet署名を要求しません。</p>
        </section>

        <section class="panel supporter-panel" aria-labelledby="supporter-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Community</p>
              <h2 id="supporter-title">{{ activeArtist }}を支援</h2>
            </div>
            <span :class="['pill', supporterTier !== 'NONE' ? 'supporter' : '']">{{ tierLabel }}</span>
          </div>
          <p>意思表示を公開・譲渡不能なSupporter SBTとして記録します。Early TierはContractが判定します。</p>
          <button
            type="button"
            class="primary-button"
            :disabled="supporterTier !== 'NONE'"
            @click="prepareSupportIntent"
          >
            {{ supporterTier === 'NONE' ? 'サポーターになる' : '登録済み' }}
          </button>
          <button type="button" class="text-button" @click="checkCommunityCapability">
            Community資格を確認
          </button>
          <p v-if="capabilityMessage" class="capability-result">{{ capabilityMessage }}</p>
          <p class="fine-print">Supporter登録署名にJPYC移転やToken Approvalは含みません。</p>
        </section>
      </aside>
    </section>

    <div class="notices" aria-live="polite" aria-atomic="true">
      <p v-if="message" class="notice success-notice">{{ message }}</p>
      <p v-if="error" class="notice error-notice">{{ error }}</p>
    </div>

    <div v-if="supportIntent" class="dialog-backdrop" @click.self="cancelSupportIntent">
      <section class="consent-dialog" role="dialog" aria-modal="true" aria-labelledby="consent-title">
        <p class="eyebrow">Wallet signature</p>
        <h2 id="consent-title">Supporter SBTを受け取る</h2>
        <dl>
          <div><dt>Creator</dt><dd>{{ supportIntent.disclosure.creatorName }}</dd></div>
          <div><dt>Chain ID</dt><dd>{{ supportIntent.typedData.domain.chainId }}</dd></div>
          <div><dt>Contract</dt><dd class="contract-value">{{ supportIntent.typedData.domain.verifyingContract }}</dd></div>
          <div><dt>公開SBT</dt><dd>{{ supportIntent.disclosure.publicCredential ? 'はい' : 'いいえ' }}</dd></div>
          <div><dt>譲渡</dt><dd>{{ supportIntent.disclosure.nonTransferable ? '不可' : '可' }}</dd></div>
          <div><dt>Gas</dt><dd>{{ supportIntent.disclosure.gasSponsored ? 'Relayerが負担' : '利用者負担' }}</dd></div>
          <div><dt>JPYC承認</dt><dd>{{ supportIntent.disclosure.paymentAuthorizationIncluded ? '含む' : '含まない' }}</dd></div>
        </dl>
        <p class="dialog-warning">署名後も、確定済みEventがIndexerへ反映されるまで特権は有効になりません。</p>
        <div class="dialog-actions">
          <button type="button" class="secondary-button" @click="cancelSupportIntent">キャンセル</button>
          <button type="button" class="primary-button" @click="signSupportIntent">内容を確認して署名</button>
        </div>
      </section>
    </div>
  </main>
</template>
