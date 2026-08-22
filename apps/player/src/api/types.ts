export type PlayerMode = 'mock' | 'gateway'
export type PlaybackState = 'IDLE' | 'AUTHORIZING' | 'READY' | 'PLAYING' | 'PAUSED' | 'ERROR'
export type SupporterTier = 'NONE' | 'SUPPORTER' | 'EARLY_SUPPORTER'
export type SupportStatus =
  | 'NOT_SUPPORTER'
  | 'SIGNATURE_REQUIRED'
  | 'RELAY_QUEUED'
  | 'TRANSACTION_SUBMITTED'
  | 'CONFIRMING'
  | 'SBT_ACTIVE'
  | 'FAILED'
  | 'REVOKED'
  | 'BURNED'

export interface Track {
  trackId: string
  artistId: string
  title: string
  artistName: string
  albumTitle: string
  durationSeconds: number
  accent: string
  requiredCapability?: 'BASE_PLAN' | 'SUPPORTER' | 'EARLY_SUPPORTER'
}

export interface PlaybackSession {
  playbackSessionId: string
  streamUrl: string
  expiresAt: string
}

export interface WalletChallenge {
  challengeId: string
  message: string
  expiresAt: string
}

export interface PlatformSessionView {
  authenticated: boolean
  accountLabel: string
}

export interface TestUserView {
  registered: boolean
  testUserId?: string
  displayName?: string
  state?: 'TEST_ONLY'
  createdAt?: string
  termsVersion?: string
  privacyNoticeVersion?: string
}

export interface TestUserRegistration {
  displayName: string
  termsVersion: 'demo-terms-v1'
  privacyNoticeVersion: 'demo-privacy-v1'
  acceptedTerms: true
  acceptedPrivacyNotice: true
  acknowledgedTestOnly: true
  idempotencyKey: string
}

export interface TypedData {
  domain: Record<string, unknown>
  primaryType: string
  types: Record<string, Array<{ name: string; type: string }>>
  message: Record<string, unknown>
}

export interface SupportIntent {
  requestId: string
  typedData: TypedData
  disclosure: {
    creatorName: string
    publicCredential: boolean
    nonTransferable: boolean
    gasSponsored: boolean
    paymentAuthorizationIncluded: false
  }
}

export interface SupportRegistration {
  requestId: string
  status: SupportStatus
  tier: SupporterTier
  transactionHash?: string
  policyVersion?: number
}

export interface CommunityCapability {
  allowed: boolean
  tier: SupporterTier
  reason: string
  policyVersion: number
  freshness: 'FRESH' | 'STALE'
}

export interface GatewayPort {
  getTestUser(): Promise<TestUserView>
  registerTestUser(input: TestUserRegistration): Promise<TestUserView>
  listTracks(): Promise<Track[]>
  createPlaybackSession(trackId: string, idempotencyKey: string): Promise<PlaybackSession>
  closePlaybackSession(playbackSessionId: string): Promise<void>
  createWalletChallenge(address: string, chainId: number): Promise<WalletChallenge>
  verifyWalletChallenge(challengeId: string, message: string, signature: string): Promise<PlatformSessionView>
  createSupportIntent(artistId: string, address: string, idempotencyKey: string): Promise<SupportIntent>
  submitSupportAuthorization(requestId: string, signature: string): Promise<SupportRegistration>
  getSupportRegistration(requestId: string): Promise<SupportRegistration>
  getCommunityCapability(artistId: string): Promise<CommunityCapability>
}
