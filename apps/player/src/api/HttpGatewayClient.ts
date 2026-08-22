import { normalizeGatewayBase } from './url-policy.js'
import type {
  CommunityCapability,
  GatewayPort,
  PlatformSessionView,
  PlaybackSession,
  SupportIntent,
  SupportRegistration,
  TestUserRegistration,
  TestUserView,
  Track,
  WalletChallenge
} from './types'

export class GatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code = 'GATEWAY_REQUEST_FAILED'
  ) {
    super(message)
  }
}

export class HttpGatewayClient implements GatewayPort {
  private readonly base: string

  constructor(base = '') {
    this.base = normalizeGatewayBase(base)
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!path.startsWith('/v1/')) throw new Error('Only versioned Gateway APIs are allowed')
    const response = await fetch(`${this.base}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers
      }
    })
    if (!response.ok) {
      const body = await response.json().catch(() => ({})) as { code?: string; message?: string }
      throw new GatewayError(body.message ?? 'Gateway request failed', response.status, body.code)
    }
    if (response.status === 204) return undefined as T
    return response.json() as Promise<T>
  }

  async listTracks(): Promise<Track[]> {
    const response = await this.request<{ tracks: Track[] }>('/v1/catalog/home')
    return response.tracks
  }

  getTestUser(): Promise<TestUserView> {
    return this.request('/v1/demo/user')
  }

  registerTestUser(input: TestUserRegistration): Promise<TestUserView> {
    return this.request('/v1/demo/users', {
      method: 'POST',
      body: JSON.stringify(input)
    })
  }

  createPlaybackSession(trackId: string, idempotencyKey: string): Promise<PlaybackSession> {
    return this.request('/v1/playback-sessions', {
      method: 'POST',
      body: JSON.stringify({ trackId, idempotencyKey })
    })
  }

  closePlaybackSession(playbackSessionId: string): Promise<void> {
    return this.request(`/v1/playback-sessions/${encodeURIComponent(playbackSessionId)}`, {
      method: 'DELETE',
      keepalive: true
    })
  }

  createWalletChallenge(address: string, chainId: number): Promise<WalletChallenge> {
    return this.request('/v1/auth/siwe/nonce', {
      method: 'POST',
      body: JSON.stringify({ address, chainId })
    })
  }

  verifyWalletChallenge(
    challengeId: string,
    message: string,
    signature: string
  ): Promise<PlatformSessionView> {
    return this.request('/v1/auth/siwe/verify', {
      method: 'POST',
      body: JSON.stringify({ challengeId, message, signature })
    })
  }

  createSupportIntent(artistId: string, address: string, idempotencyKey: string): Promise<SupportIntent> {
    return this.request(`/v1/artists/${encodeURIComponent(artistId)}/support`, {
      method: 'POST',
      body: JSON.stringify({ address, consentVersion: 1, idempotencyKey })
    })
  }

  submitSupportAuthorization(requestId: string, signature: string): Promise<SupportRegistration> {
    return this.request(`/v1/support-intents/${encodeURIComponent(requestId)}/submit`, {
      method: 'POST',
      body: JSON.stringify({ signature })
    })
  }

  getSupportRegistration(requestId: string): Promise<SupportRegistration> {
    return this.request(`/v1/support-registrations/${encodeURIComponent(requestId)}`)
  }

  getCommunityCapability(artistId: string): Promise<CommunityCapability> {
    return this.request(`/v1/artists/${encodeURIComponent(artistId)}/community-capability`)
  }
}
