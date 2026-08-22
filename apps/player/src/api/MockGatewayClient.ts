import type {
  CommunityCapability,
  GatewayPort,
  PlatformSessionView,
  PlaybackSession,
  SupportIntent,
  SupportRegistration,
  SupporterTier,
  TestUserRegistration,
  TestUserView,
  Track,
  WalletChallenge
} from './types'

const tracks: Track[] = [
  {
    trackId: 'track-mock-001',
    artistId: 'artist-ao',
    title: 'First Light',
    artistName: 'AO',
    albumTitle: 'Synthetic Dawn',
    durationSeconds: 5,
    accent: '#8b5cf6',
    requiredCapability: 'BASE_PLAN'
  },
  {
    trackId: 'track-mock-002',
    artistId: 'artist-ao',
    title: 'Supporter Signal',
    artistName: 'AO',
    albumTitle: 'Synthetic Dawn',
    durationSeconds: 5,
    accent: '#22d3ee',
    requiredCapability: 'SUPPORTER'
  },
  {
    trackId: 'track-mock-003',
    artistId: 'artist-lumen',
    title: 'Early Echo',
    artistName: 'Lumen',
    albumTitle: 'Five Second Studies',
    durationSeconds: 5,
    accent: '#f59e0b',
    requiredCapability: 'EARLY_SUPPORTER'
  }
]

const wait = (milliseconds: number) => new Promise((resolve) => window.setTimeout(resolve, milliseconds))

export class MockGatewayClient implements GatewayPort {
  private registrations = new Map<string, SupportRegistration>()
  private tier: SupporterTier = 'NONE'
  private testUser: TestUserView = { registered: false }

  async getTestUser(): Promise<TestUserView> {
    await wait(40)
    return this.testUser
  }

  async registerTestUser(input: TestUserRegistration): Promise<TestUserView> {
    await wait(120)
    if (this.testUser.registered) return this.testUser
    this.testUser = {
      registered: true,
      testUserId: crypto.randomUUID(),
      displayName: input.displayName.trim(),
      state: 'TEST_ONLY',
      createdAt: new Date().toISOString(),
      termsVersion: input.termsVersion,
      privacyNoticeVersion: input.privacyNoticeVersion
    }
    return this.testUser
  }

  async listTracks(): Promise<Track[]> {
    await wait(120)
    return tracks
  }

  async createPlaybackSession(trackId: string): Promise<PlaybackSession> {
    const track = tracks.find((candidate) => candidate.trackId === trackId)
    if (!track) throw new Error('Unknown mock track')
    if (track.requiredCapability === 'SUPPORTER' && this.tier === 'NONE') {
      throw new Error('この試験音にはSupporter SBTが必要です')
    }
    if (track.requiredCapability === 'EARLY_SUPPORTER' && this.tier !== 'EARLY_SUPPORTER') {
      throw new Error('この試験音にはEarly Supporter SBTが必要です')
    }
    await wait(160)
    return {
      playbackSessionId: crypto.randomUUID(),
      streamUrl: './demo-tone.wav',
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString()
    }
  }

  async closePlaybackSession(): Promise<void> {
    await wait(20)
  }

  async createWalletChallenge(address: string, chainId: number): Promise<WalletChallenge> {
    const challengeId = crypto.randomUUID()
    return {
      challengeId,
      message: [
        `${window.location.host} wants you to sign in with your Ethereum account:`,
        address,
        '',
        'Creator First Player local mock sign-in.',
        '',
        `URI: ${window.location.origin}`,
        'Version: 1',
        `Chain ID: ${chainId}`,
        `Nonce: ${challengeId.replaceAll('-', '').slice(0, 16)}`,
        `Issued At: ${new Date().toISOString()}`
      ].join('\n'),
      expiresAt: new Date(Date.now() + 5 * 60_000).toISOString()
    }
  }

  async verifyWalletChallenge(
    _challengeId: string,
    _message: string,
    signature: string
  ): Promise<PlatformSessionView> {
    if (!signature.startsWith('0x')) throw new Error('Mock signature is invalid')
    return { authenticated: true, accountLabel: 'Mock Platform Account' }
  }

  async createSupportIntent(artistId: string, address: string): Promise<SupportIntent> {
    const requestId = crypto.randomUUID()
    return {
      requestId,
      typedData: {
        domain: {
          name: 'Creator First Supporter Mock',
          version: '1',
          chainId: 84532,
          verifyingContract: '0x0000000000000000000000000000000000005192'
        },
        primaryType: 'SupportIntent',
        types: {
          SupportIntent: [
            { name: 'supporter', type: 'address' },
            { name: 'artistId', type: 'string' },
            { name: 'nonce', type: 'bytes32' },
            { name: 'deadline', type: 'uint256' },
            { name: 'consentVersion', type: 'uint32' }
          ]
        },
        message: {
          supporter: address,
          artistId,
          nonce: `0x${crypto.randomUUID().replaceAll('-', '').padEnd(64, '0')}`,
          deadline: Math.floor(Date.now() / 1000) + 300,
          consentVersion: 1
        }
      },
      disclosure: {
        creatorName: tracks.find((track) => track.artistId === artistId)?.artistName ?? artistId,
        publicCredential: true,
        nonTransferable: true,
        gasSponsored: true,
        paymentAuthorizationIncluded: false
      }
    }
  }

  async submitSupportAuthorization(requestId: string, signature: string): Promise<SupportRegistration> {
    if (!signature.startsWith('0x')) throw new Error('Mock authorization is invalid')
    const registration: SupportRegistration = {
      requestId,
      status: 'CONFIRMING',
      tier: 'NONE',
      transactionHash: `0x${requestId.replaceAll('-', '').padEnd(64, '0')}`,
      policyVersion: 1
    }
    this.registrations.set(requestId, registration)
    await wait(350)
    this.tier = 'EARLY_SUPPORTER'
    this.registrations.set(requestId, { ...registration, status: 'SBT_ACTIVE', tier: this.tier })
    return registration
  }

  async getSupportRegistration(requestId: string): Promise<SupportRegistration> {
    await wait(100)
    return this.registrations.get(requestId) ?? { requestId, status: 'FAILED', tier: 'NONE' }
  }

  async getCommunityCapability(): Promise<CommunityCapability> {
    return {
      allowed: this.tier !== 'NONE',
      tier: this.tier,
      reason: this.tier === 'NONE' ? 'SUPPORTER_REQUIRED' : 'MOCK_POLICY_ALLOWED',
      policyVersion: 1,
      freshness: 'FRESH'
    }
  }
}
