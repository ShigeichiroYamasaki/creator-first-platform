import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { createServer } from 'node:http'
import { getAddress, recoverMessageAddress, recoverTypedDataAddress } from 'viem'
import { catalog, publicTrack } from './catalog.js'
import { AccountTrustError, AccountTrustService } from './AccountTrustService.js'
import { GatewayStore } from './GatewayStore.js'
import { InvitationMailer } from './InvitationMailer.js'
import { ParticipantApplicationError, ParticipantApplicationService } from './ParticipantApplicationService.js'
import {
  AmoyParticipantEnrollmentChain,
  ParticipantEnrollmentError,
  ParticipantEnrollmentOperator
} from './ParticipantEnrollmentOperator.js'
import {
  PARTICIPANT_FLOW_V2,
  ParticipantInvitationError,
  ParticipantInvitationService
} from './ParticipantInvitationService.js'
import {
  AmoySupporterSbtChain,
  SupporterSbtRelayError,
  SupporterSbtRelayer
} from './SupporterSbtRelayer.js'
import {
  AmoyGovernanceVoteChain,
  GovernanceVoteRelayError,
  GovernanceVoteRelayer
} from './GovernanceVoteRelayer.js'

const COOKIE_NAME = 'cfp_demo_session'
const POLICY_VERSION = 'gateway-demo-policy-v1'
const SUPPORT_POLICY_VERSION = 1
const DEMO_TERMS_VERSION = 'demo-terms-v1'
const DEMO_PRIVACY_VERSION = 'demo-privacy-v1'
const MAX_BODY_BYTES = 64 * 1024
const VERIFYING_CONTRACT = '0x0000000000000000000000000000000000005192'

class GatewayHttpError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie ?? '')
      .split(';')
      .map((part) => part.trim().split('='))
      .filter(([name, value]) => name && value)
  )
}

async function readJson(request) {
  let size = 0
  const chunks = []
  for await (const chunk of request) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw new GatewayHttpError(413, 'REQUEST_TOO_LARGE', 'Request body is too large')
    chunks.push(chunk)
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
  } catch {
    throw new GatewayHttpError(400, 'INVALID_JSON', 'Request body must be valid JSON')
  }
}

function sendJson(response, status, body, extraHeaders = {}) {
  const encoded = Buffer.from(JSON.stringify(body))
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': String(encoded.length),
    'Cache-Control': 'no-store',
    ...extraHeaders
  })
  response.end(encoded)
}

function monthStart(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
}

function requestHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex')
}

function capabilityAllows(required, tier) {
  if (required === 'BASE_PLAN') return true
  if (required === 'SUPPORTER') return tier === 'SUPPORTER' || tier === 'EARLY_SUPPORTER'
  return tier === 'EARLY_SUPPORTER'
}

export function createGatewayServer({
  config,
  mediaAdapter,
  store = new GatewayStore(config.databasePath),
  accountTrustOptions = {},
  participantEnrollmentOptions = {},
  supporterRelayOptions = {},
  governanceRelayOptions = {}
}) {
  const accounts = new Map()
  const challenges = new Map()
  const supportIntents = new Map()
  const supportIdempotency = new Map()
  const accountTrust = new AccountTrustService({ config, store, ...accountTrustOptions })
  const invitationMailer = accountTrustOptions.invitationMailer ?? new InvitationMailer(config)
  const enrollmentChain = participantEnrollmentOptions.chain ?? (
    config.participantRegistryAddress && config.participantOperatorPrivateKey
      ? new AmoyParticipantEnrollmentChain({
          rpcUrls: config.amoyRpcUrls,
          registryAddress: config.participantRegistryAddress,
          operatorPrivateKey: config.participantOperatorPrivateKey
        })
      : undefined
  )
  const participantEnrollment = new ParticipantEnrollmentOperator({ store, chain: enrollmentChain })
  const supporterChain = supporterRelayOptions.chain ?? (
    config.supporterSbtAddress && config.supporterRelayerPrivateKey && config.participantRegistryAddress
      ? new AmoySupporterSbtChain({
          rpcUrls: config.amoyRpcUrls,
          supporterSbtAddress: config.supporterSbtAddress,
          participantRegistryAddress: config.participantRegistryAddress,
          creatorRegistryAddress: config.creatorRegistryAddress,
          relayerPrivateKey: config.supporterRelayerPrivateKey
        })
      : undefined
  )
  const supporterRelayer = supporterChain
    ? new SupporterSbtRelayer({
        chain: supporterChain,
        chainId: config.chainId,
        supporterSbtAddress: config.supporterSbtAddress ?? supporterRelayOptions.supporterSbtAddress,
        allowedCreatorIds: config.supporterCreatorIds?.length
          ? config.supporterCreatorIds
          : supporterRelayOptions.allowedCreatorIds
      })
    : undefined
  const governanceChain = governanceRelayOptions.chain ?? (
    config.governorAddress && config.governanceRelayerPrivateKey
      ? new AmoyGovernanceVoteChain({
          rpcUrls: config.amoyRpcUrls,
          governorAddress: config.governorAddress,
          relayerPrivateKey: config.governanceRelayerPrivateKey
        })
      : undefined
  )
  const governanceRelayer = governanceChain
    ? new GovernanceVoteRelayer({
        chain: governanceChain,
        chainId: config.chainId,
        governorAddress: config.governorAddress ?? governanceRelayOptions.governorAddress
      })
    : undefined
  const participantInvitations = new ParticipantInvitationService({
    config,
    store,
    mailer: invitationMailer,
    enrollmentOperator: participantEnrollment,
    autoProcessEnrollment: config.participantEnrollmentAutoProcess,
    autoProcessIntervalMs: participantEnrollmentOptions.autoProcessIntervalMs
  })
  const participantApplications = new ParticipantApplicationService({
    config,
    store,
    mailer: invitationMailer,
    invitations: participantInvitations
  })
  let closed = false

  function createAccount(response) {
    const platformSessionId = randomBytes(32).toString('base64url')
    const account = {
      platformSessionId,
      accountId: `demo-${randomUUID()}`,
      active: true,
      subscriptionActive: true,
      walletAddress: undefined,
      tiers: new Map(),
      demoUser: undefined,
      demoRegistrationKey: undefined,
      demoRegistrationHash: undefined,
      passkeyAuthenticated: false,
      authenticationChallenge: undefined,
      participantInvitationProof: undefined
    }
    accounts.set(platformSessionId, account)
    response.setHeader(
      'Set-Cookie',
      `${COOKIE_NAME}=${platformSessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=3600${config.webauthnOrigin.startsWith('https://') ? '; Secure' : ''}`
    )
    return account
  }

  function getAccount(request, response) {
    const supplied = cookies(request)[COOKIE_NAME]
    if (supplied && accounts.has(supplied)) return accounts.get(supplied)
    return createAccount(response)
  }

  function replaceAccount(request, response) {
    const supplied = cookies(request)[COOKIE_NAME]
    if (supplied) accounts.delete(supplied)
    return createAccount(response)
  }

  function routePath(request) {
    const url = new URL(request.url, 'http://gateway.invalid')
    if (url.search) throw new GatewayHttpError(400, 'QUERY_NOT_ALLOWED', 'Query parameters are not allowed')
    if (config.basePath && !url.pathname.startsWith(`${config.basePath}/`)) {
      throw new GatewayHttpError(404, 'NOT_FOUND', 'Route not found')
    }
    return config.basePath ? url.pathname.slice(config.basePath.length) : url.pathname
  }

  function adapterReference(track) {
    if (config.adapter === 'file') return track.fileRef
    const reference = config.navidromeMediaIds[track.navidromeIdEnv]
    if (!reference) throw new GatewayHttpError(503, 'CATALOG_MAPPING_UNAVAILABLE', 'Media mapping is unavailable')
    return reference
  }

  function recordDenied(account, track, reasonCode) {
    const decisionId = randomUUID()
    store.recordDecision({
      decisionId,
      ownerId: account.accountId,
      trackId: track.trackId,
      allowed: false,
      reasonCode,
      policyVersion: POLICY_VERSION,
      rightsVersion: track.rightsVersion,
      decidedAt: new Date().toISOString()
    })
    return decisionId
  }

  async function createPlayback(request, response, account) {
    const body = await readJson(request)
    if (
      typeof body.trackId !== 'string' ||
      typeof body.idempotencyKey !== 'string' ||
      body.idempotencyKey.length < 8 ||
      body.idempotencyKey.length > 160
    ) {
      throw new GatewayHttpError(400, 'INVALID_PLAYBACK_REQUEST', 'trackId and idempotencyKey are required')
    }
    const track = catalog.find((candidate) => candidate.trackId === body.trackId)
    if (!track) throw new GatewayHttpError(404, 'TRACK_NOT_FOUND', 'Track was not found')
    const hash = requestHash({ trackId: body.trackId })
    const prior = store.idempotentResponse(account.accountId, body.idempotencyKey)
    if (prior) {
      if (prior.request_hash !== hash) {
        throw new GatewayHttpError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was reused for another request')
      }
      return sendJson(response, 200, JSON.parse(prior.response_json))
    }
    if (!account.active) {
      recordDenied(account, track, 'ACCOUNT_RESTRICTED')
      throw new GatewayHttpError(403, 'ACCOUNT_RESTRICTED', 'Playback is unavailable')
    }
    if (!account.subscriptionActive) {
      recordDenied(account, track, 'SUBSCRIPTION_INACTIVE')
      throw new GatewayHttpError(403, 'SUBSCRIPTION_INACTIVE', 'An active demo subscription is required')
    }
    const tier = account.tiers.get(track.artistId) ?? 'NONE'
    if (!capabilityAllows(track.requiredCapability, tier)) {
      const code = track.requiredCapability === 'EARLY_SUPPORTER'
        ? 'EARLY_SUPPORTER_REQUIRED'
        : 'SUPPORTER_REQUIRED'
      recordDenied(account, track, code)
      throw new GatewayHttpError(403, code, `${track.requiredCapability.replace('_', ' ')} SBT is required`)
    }
    if (store.deliveredBytesSince(monthStart()) >= config.monthlyByteLimit) {
      recordDenied(account, track, 'DELIVERY_BUDGET_EXHAUSTED')
      throw new GatewayHttpError(503, 'DELIVERY_BUDGET_EXHAUSTED', 'Monthly demo delivery budget is exhausted')
    }
    if (store.activeSessionForOwner(account.accountId, Date.now())) {
      recordDenied(account, track, 'CONCURRENCY_LIMIT')
      throw new GatewayHttpError(409, 'CONCURRENCY_LIMIT', 'Close the current playback session first')
    }

    const decisionId = randomUUID()
    const playbackSessionId = randomBytes(32).toString('base64url')
    const issuedAt = Date.now()
    const expiresAt = issuedAt + config.playbackTtlMs
    store.recordDecision({
      decisionId,
      ownerId: account.accountId,
      trackId: track.trackId,
      allowed: true,
      reasonCode: 'AUTHORIZED',
      policyVersion: POLICY_VERSION,
      rightsVersion: track.rightsVersion,
      decidedAt: new Date(issuedAt).toISOString()
    })
    store.createSession({
      sessionId: playbackSessionId,
      decisionId,
      ownerId: account.accountId,
      trackId: track.trackId,
      adapterRef: adapterReference(track),
      issuedAt,
      expiresAt
    })
    const result = {
      playbackSessionId,
      streamUrl: `${config.basePath}/v1/streams/${playbackSessionId}`,
      expiresAt: new Date(expiresAt).toISOString()
    }
    store.saveIdempotentResponse(account.accountId, body.idempotencyKey, hash, result)
    sendJson(response, 201, result)
  }

  async function deliverStream(request, response, account, sessionId) {
    const session = store.session(sessionId)
    if (!session || session.owner_id !== account.accountId) {
      throw new GatewayHttpError(404, 'PLAYBACK_SESSION_NOT_FOUND', 'Playback session was not found')
    }
    if (session.expires_at <= Date.now()) {
      store.expireSession(sessionId)
      throw new GatewayHttpError(410, 'PLAYBACK_SESSION_EXPIRED', 'Playback session has expired')
    }
    if (!['AUTHORIZED', 'STARTED', 'ACTIVE'].includes(session.state)) {
      throw new GatewayHttpError(410, 'PLAYBACK_SESSION_INACTIVE', 'Playback session is inactive')
    }
    const abortController = new AbortController()
    const startedAt = new Date().toISOString()
    let delivery
    try {
      delivery = await mediaAdapter.open(session.adapter_ref, request.headers.range, abortController.signal)
    } catch (error) {
      if (error instanceof RangeError) {
        response.writeHead(416, { 'Content-Range': 'bytes */*', 'Cache-Control': 'no-store' })
        response.end()
        return
      }
      throw new GatewayHttpError(502, 'MEDIA_ADAPTER_FAILURE', 'Media delivery is temporarily unavailable')
    }
    store.setSessionState(sessionId, 'STARTED')
    response.writeHead(delivery.status, {
      ...delivery.headers,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff'
    })
    let bytesDelivered = 0
    let recorded = false
    const record = () => {
      if (recorded) return
      recorded = true
      store.recordEvidence({
        evidenceId: randomUUID(),
        sessionId,
        decisionId: session.decision_id,
        trackId: session.track_id,
        responseStatus: delivery.status,
        rangeSummary: delivery.rangeSummary,
        bytesDelivered,
        startedAt,
        completedAt: new Date().toISOString()
      })
    }
    delivery.body.on('data', (chunk) => { bytesDelivered += chunk.length })
    delivery.body.on('end', record)
    delivery.body.on('error', (error) => response.destroy(error))
    request.on('aborted', () => {
      abortController.abort()
      delivery.body.destroy()
      record()
    })
    response.on('close', record)
    delivery.body.pipe(response)
  }

  async function createChallenge(request, response, account) {
    const body = await readJson(request)
    let address
    try {
      address = getAddress(body.address)
    } catch {
      throw new GatewayHttpError(400, 'INVALID_WALLET_ADDRESS', 'Wallet address is invalid')
    }
    if (body.chainId !== config.chainId) throw new GatewayHttpError(400, 'CHAIN_NOT_ALLOWED', 'Chain is not allowed')
    const challengeId = randomUUID()
    const nonce = randomBytes(12).toString('hex')
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + 5 * 60_000)
    let participantInvitationProof
    if (body.invitationToken !== undefined) {
      const invitation = participantInvitations.inspect(body.invitationToken)
      if (invitation.expired || invitation.state === 'REVOKED') {
        throw new GatewayHttpError(409, 'INVITATION_NOT_CLAIMABLE', 'Invitation is expired or unavailable')
      }
      const accepted = invitation.flowVersion === PARTICIPANT_FLOW_V2
        ? body.acceptedParticipation === true
        : body.acceptedParticipation === true || (body.acceptedTerms === true && body.acknowledgedTestOnly === true)
      if (!accepted) {
        throw new GatewayHttpError(400, 'INVITATION_CONSENT_REQUIRED', 'The current participation acknowledgement is required before signing')
      }
      participantInvitationProof = {
        invitationId: invitation.invitationId,
        roles: invitation.roles,
        consentVersion: invitation.consentVersion
      }
    }
    const message = [
      `${config.publicDomain} wants you to sign in with your Ethereum account:`,
      address,
      '',
      participantInvitationProof
        ? 'Authorize this Creator First public-experiment invitation, role set and consent.'
        : 'Creator First Gateway local demo sign-in.',
      '',
      `URI: ${config.publicUri}`,
      'Version: 1',
      `Chain ID: ${config.chainId}`,
      `Nonce: ${nonce}`,
      `Issued At: ${issuedAt.toISOString()}`,
      `Expiration Time: ${expiresAt.toISOString()}`,
      ...(participantInvitationProof
        ? [
            `Request ID: ${participantInvitationProof.invitationId}`,
            'Resources:',
            `- urn:cfp:participant-invitation:${participantInvitationProof.invitationId}`,
            `- urn:cfp:participant-roles:${participantInvitationProof.roles}`,
            `- urn:cfp:consent:${participantInvitationProof.consentVersion}`
          ]
        : [])
    ].join('\n')
    challenges.set(challengeId, {
      challengeId,
      ownerId: account.accountId,
      address,
      message,
      participantInvitationProof,
      expiresAt: expiresAt.getTime(),
      used: false
    })
    sendJson(response, 201, { challengeId, message, expiresAt: expiresAt.toISOString() })
  }

  function demoUserView(account) {
    return account.demoUser ?? { registered: false }
  }

  async function registerDemoUser(request, response, account) {
    const body = await readJson(request)
    const displayName = typeof body.displayName === 'string'
      ? body.displayName.trim().normalize('NFKC')
      : ''
    if (!/^[\p{L}\p{N}_ -]{2,24}$/u.test(displayName)) {
      throw new GatewayHttpError(
        400,
        'INVALID_TEST_ALIAS',
        'Alias must be 2–24 letters, numbers, spaces, underscores or hyphens'
      )
    }
    if (
      body.termsVersion !== DEMO_TERMS_VERSION ||
      body.privacyNoticeVersion !== DEMO_PRIVACY_VERSION ||
      body.acceptedTerms !== true ||
      body.acceptedPrivacyNotice !== true ||
      body.acknowledgedTestOnly !== true
    ) {
      throw new GatewayHttpError(
        400,
        'DEMO_NOTICE_ACCEPTANCE_REQUIRED',
        'Demo terms, privacy notice and test-only acknowledgement are required'
      )
    }
    if (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 160) {
      throw new GatewayHttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'A valid idempotencyKey is required')
    }
    const registrationHash = requestHash({
      displayName,
      termsVersion: body.termsVersion,
      privacyNoticeVersion: body.privacyNoticeVersion
    })
    if (account.demoUser) {
      if (account.demoRegistrationKey === body.idempotencyKey && account.demoRegistrationHash === registrationHash) {
        return sendJson(response, 200, account.demoUser)
      }
      throw new GatewayHttpError(409, 'TEST_USER_ALREADY_REGISTERED', 'This demo session already has a Test User')
    }

    const registeredAt = new Date().toISOString()
    const value = {
      registered: true,
      testUserId: randomUUID(),
      displayName,
      state: 'TEST_ONLY',
      createdAt: registeredAt,
      termsVersion: DEMO_TERMS_VERSION,
      privacyNoticeVersion: DEMO_PRIVACY_VERSION
    }
    store.recordDemoUserRegistration({
      registrationId: randomUUID(),
      testUserId: value.testUserId,
      ownerId: account.accountId,
      termsVersion: value.termsVersion,
      privacyNoticeVersion: value.privacyNoticeVersion,
      registeredAt
    })
    account.demoUser = value
    account.demoRegistrationKey = body.idempotencyKey
    account.demoRegistrationHash = registrationHash
    sendJson(response, 201, value)
  }

  async function verifyChallenge(request, response, account) {
    const body = await readJson(request)
    const challenge = challenges.get(body.challengeId)
    if (!challenge || challenge.ownerId !== account.accountId || challenge.used || challenge.expiresAt <= Date.now()) {
      throw new GatewayHttpError(401, 'SIWE_CHALLENGE_INVALID', 'Wallet challenge is invalid or expired')
    }
    if (body.message !== challenge.message || typeof body.signature !== 'string') {
      throw new GatewayHttpError(401, 'SIWE_MESSAGE_MISMATCH', 'Signed message does not match the challenge')
    }
    let recovered
    try {
      recovered = await recoverMessageAddress({ message: body.message, signature: body.signature })
    } catch {
      throw new GatewayHttpError(401, 'SIWE_SIGNATURE_INVALID', 'Wallet signature is invalid')
    }
    if (getAddress(recovered) !== challenge.address) {
      throw new GatewayHttpError(401, 'SIWE_SIGNER_MISMATCH', 'Wallet signer does not match the challenge')
    }
    challenge.used = true
    account.walletAddress = challenge.address
    account.participantInvitationProof = challenge.participantInvitationProof
    sendJson(response, 200, { authenticated: true, accountLabel: `Demo ${challenge.address.slice(0, 6)}…${challenge.address.slice(-4)}` })
  }

  async function createSupportIntent(request, response, account, artistId) {
    if (!account.walletAddress) throw new GatewayHttpError(401, 'WALLET_LINK_REQUIRED', 'Connect and verify a Wallet first')
    const body = await readJson(request)
    let address
    try {
      address = getAddress(body.address)
    } catch {
      throw new GatewayHttpError(400, 'INVALID_WALLET_ADDRESS', 'Wallet address is invalid')
    }
    if (address !== account.walletAddress) throw new GatewayHttpError(403, 'WALLET_LINK_MISMATCH', 'Wallet does not match the Platform Session')
    const artist = catalog.find((track) => track.artistId === artistId)
    if (!artist) throw new GatewayHttpError(404, 'ARTIST_NOT_FOUND', 'Artist was not found')
    if (typeof body.idempotencyKey !== 'string' || body.idempotencyKey.length < 8 || body.idempotencyKey.length > 160) {
      throw new GatewayHttpError(400, 'INVALID_IDEMPOTENCY_KEY', 'A valid idempotencyKey is required')
    }
    const idempotencyScope = `${account.accountId}:${body.idempotencyKey}`
    const intentHash = requestHash({ artistId, address, consentVersion: body.consentVersion })
    const priorIntent = supportIdempotency.get(idempotencyScope)
    if (priorIntent) {
      if (priorIntent.hash !== intentHash) {
        throw new GatewayHttpError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was reused for another request')
      }
      return sendJson(response, 200, priorIntent.response)
    }
    const requestId = randomUUID()
    const deadline = Math.floor(Date.now() / 1000) + 300
    const typedData = {
      domain: {
        name: 'Creator First Supporter Demo',
        version: '1',
        chainId: config.chainId,
        verifyingContract: VERIFYING_CONTRACT
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
        nonce: `0x${randomBytes(32).toString('hex')}`,
        deadline: String(deadline),
        consentVersion: 1
      }
    }
    supportIntents.set(requestId, {
      requestId,
      ownerId: account.accountId,
      address,
      artistId,
      typedData,
      deadline,
      status: 'SIGNATURE_REQUIRED',
      tier: 'NONE'
    })
    const result = {
      requestId,
      typedData,
      disclosure: {
        creatorName: artist.artistName,
        publicCredential: true,
        nonTransferable: true,
        gasSponsored: true,
        paymentAuthorizationIncluded: false
      }
    }
    supportIdempotency.set(idempotencyScope, { hash: intentHash, response: result })
    sendJson(response, 201, result)
  }

  async function submitSupport(request, response, account, requestId) {
    const intent = supportIntents.get(requestId)
    if (!intent || intent.ownerId !== account.accountId || intent.deadline <= Date.now() / 1000) {
      throw new GatewayHttpError(404, 'SUPPORT_INTENT_NOT_FOUND', 'Support intent was not found or expired')
    }
    if (intent.status !== 'SIGNATURE_REQUIRED') {
      return sendJson(response, 200, {
        requestId,
        status: intent.status,
        tier: intent.tier,
        policyVersion: SUPPORT_POLICY_VERSION
      })
    }
    const body = await readJson(request)
    let recovered
    try {
      recovered = await recoverTypedDataAddress({ ...intent.typedData, signature: body.signature })
    } catch {
      throw new GatewayHttpError(401, 'SUPPORT_SIGNATURE_INVALID', 'Support signature is invalid')
    }
    if (getAddress(recovered) !== intent.address) throw new GatewayHttpError(401, 'SUPPORT_SIGNER_MISMATCH', 'Support signer does not match')
    intent.status = 'CONFIRMING'
    intent.tier = 'EARLY_SUPPORTER'
    intent.activateAt = Date.now() + 600
    sendJson(response, 202, { requestId, status: intent.status, tier: intent.tier, policyVersion: SUPPORT_POLICY_VERSION })
  }

  function supportRegistration(response, account, requestId) {
    const intent = supportIntents.get(requestId)
    if (!intent || intent.ownerId !== account.accountId) throw new GatewayHttpError(404, 'SUPPORT_REGISTRATION_NOT_FOUND', 'Support registration was not found')
    if (intent.status === 'CONFIRMING' && intent.activateAt <= Date.now()) {
      intent.status = 'SBT_ACTIVE'
      account.tiers.set(intent.artistId, intent.tier)
    }
    sendJson(response, 200, { requestId, status: intent.status, tier: intent.tier, policyVersion: SUPPORT_POLICY_VERSION })
  }

  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff')
    response.setHeader('Referrer-Policy', 'no-referrer')
    response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    try {
      if (request.headers.origin && request.headers.origin !== config.allowedOrigin) {
        throw new GatewayHttpError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed')
      }
      const path = routePath(request)
      const account = getAccount(request, response)
      if (request.method === 'GET' && path === '/v1/health') {
        return sendJson(response, 200, {
          status: 'ok',
          adapter: config.adapter,
          mode: config.runtimeMode,
          participantEnrollment: participantEnrollment.enabled ? 'enabled' : 'disabled',
          participantEnrollmentAutomation: participantEnrollment.enabled && config.participantEnrollmentAutoProcess ? 'enabled' : 'disabled',
          supporterRelay: supporterRelayer && await supporterRelayer.available() ? 'enabled' : 'disabled',
          governanceRelay: governanceRelayer && await governanceRelayer.available() ? 'enabled' : 'disabled'
        })
      }
      if (request.method === 'GET' && path === '/v1/catalog/home') {
        return sendJson(response, 200, { tracks: catalog.map(publicTrack) })
      }
      if (request.method === 'GET' && path === '/v1/testnet/support-targets') {
        if (!supporterRelayer) return sendJson(response, 200, { creators: [] })
        return sendJson(response, 200, { creators: await supporterRelayer.supportTargets() })
      }
      if (request.method === 'GET' && path === '/v1/demo/user') {
        return sendJson(response, 200, demoUserView(account))
      }
      if (request.method === 'POST' && path === '/v1/demo/users') {
        return await registerDemoUser(request, response, account)
      }
      if (request.method === 'GET' && path === '/v1/participant-applications/current') {
        return sendJson(response, 200, participantApplications.current(account))
      }
      if (request.method === 'POST' && path === '/v1/participant-applications/new-session') {
        replaceAccount(request, response)
        return sendJson(response, 200, { application: null })
      }
      if (request.method === 'POST' && path === '/v1/participant-applications') {
        return sendJson(response, 201, await participantApplications.createAndSend(account, await readJson(request)))
      }
      if (request.method === 'POST' && path === '/v1/participant-applications/current/resend') {
        return sendJson(response, 200, await participantApplications.resend(account, request.headers['idempotency-key']))
      }
      const applicationVerificationMatch = /^\/v1\/participant-applications\/verify\/([A-Za-z0-9_-]{32,128})$/.exec(path)
      if (request.method === 'POST' && applicationVerificationMatch) {
        return sendJson(response, 200, participantApplications.verify(applicationVerificationMatch[1]))
      }
      if (request.method === 'GET' && path === '/v1/admin/participant-applications') {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 200, { applications: participantApplications.list() })
      }
      const applicationApproveMatch = /^\/v1\/admin\/participant-applications\/([A-Za-z0-9-]+)\/approve$/.exec(path)
      if (request.method === 'POST' && applicationApproveMatch) {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 200, await participantApplications.approve(applicationApproveMatch[1]))
      }
      const applicationRejectMatch = /^\/v1\/admin\/participant-applications\/([A-Za-z0-9-]+)\/reject$/.exec(path)
      if (request.method === 'POST' && applicationRejectMatch) {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 200, await participantApplications.reject(applicationRejectMatch[1], await readJson(request)))
      }
      if (request.method === 'GET' && path === '/v1/admin/participant-invitations') {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 200, { invitations: participantInvitations.list() })
      }
      if (request.method === 'POST' && path === '/v1/admin/participant-invitations') {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 201, participantInvitations.create(await readJson(request)))
      }
      const invitationSendMatch = /^\/v1\/admin\/participant-invitations\/([A-Za-z0-9-]+)\/send$/.exec(path)
      if (request.method === 'POST' && invitationSendMatch) {
        participantInvitations.requireAdministrator(request)
        return sendJson(response, 200, await participantInvitations.send(invitationSendMatch[1], await readJson(request)))
      }
      const invitationMatch = /^\/v1\/participant-invitations\/([A-Za-z0-9_-]{32,128})$/.exec(path)
      if (request.method === 'GET' && invitationMatch) {
        return sendJson(response, 200, participantInvitations.inspect(invitationMatch[1]))
      }
      const invitationClaimMatch = /^\/v1\/participant-invitations\/([A-Za-z0-9_-]{32,128})\/claim$/.exec(path)
      if (request.method === 'POST' && invitationClaimMatch) {
        return sendJson(response, 200, participantInvitations.claim(invitationClaimMatch[1], account, await readJson(request)))
      }
      if (request.method === 'GET' && path === '/v1/account-trust/status') {
        return sendJson(response, 200, accountTrust.status(account))
      }
      if (request.method === 'POST' && path === '/v1/account-trust/bindings') {
        return sendJson(response, 201, accountTrust.begin(account))
      }
      const mockJpkiMatch = /^\/v1\/account-trust\/bindings\/([A-Za-z0-9-]+)\/mock-jpki$/.exec(path)
      if (request.method === 'POST' && mockJpkiMatch) {
        return sendJson(response, 200, accountTrust.assertMockJpki(account, mockJpkiMatch[1], await readJson(request)))
      }
      const registrationOptionsMatch = /^\/v1\/account-trust\/bindings\/([A-Za-z0-9-]+)\/passkeys\/registration\/options$/.exec(path)
      if (request.method === 'POST' && registrationOptionsMatch) {
        return sendJson(response, 200, await accountTrust.registrationOptions(account, registrationOptionsMatch[1], await readJson(request)))
      }
      const registrationVerifyMatch = /^\/v1\/account-trust\/bindings\/([A-Za-z0-9-]+)\/passkeys\/registration\/verify$/.exec(path)
      if (request.method === 'POST' && registrationVerifyMatch) {
        return sendJson(response, 200, await accountTrust.verifyRegistration(account, registrationVerifyMatch[1], await readJson(request)))
      }
      if (request.method === 'POST' && path === '/v1/account-trust/passkeys/authentication/options') {
        return sendJson(response, 200, await accountTrust.authenticationOptions(account))
      }
      if (request.method === 'POST' && path === '/v1/account-trust/passkeys/authentication/verify') {
        return sendJson(response, 200, await accountTrust.verifyAuthentication(account, await readJson(request)))
      }
      const walletOptionsMatch = /^\/v1\/account-trust\/bindings\/([A-Za-z0-9-]+)\/wallet\/options$/.exec(path)
      if (request.method === 'POST' && walletOptionsMatch) {
        return sendJson(response, 200, accountTrust.walletOptions(account, walletOptionsMatch[1], await readJson(request)))
      }
      const walletVerifyMatch = /^\/v1\/account-trust\/bindings\/([A-Za-z0-9-]+)\/wallet\/verify$/.exec(path)
      if (request.method === 'POST' && walletVerifyMatch) {
        return sendJson(response, 200, await accountTrust.verifyWallet(account, walletVerifyMatch[1], await readJson(request)))
      }
      if (request.method === 'POST' && path === '/v1/playback-sessions') {
        return await createPlayback(request, response, account)
      }
      const streamMatch = /^\/v1\/streams\/([A-Za-z0-9_-]{20,})$/.exec(path)
      if (request.method === 'GET' && streamMatch) {
        return await deliverStream(request, response, account, streamMatch[1])
      }
      const closeMatch = /^\/v1\/playback-sessions\/([A-Za-z0-9_-]{20,})$/.exec(path)
      if (request.method === 'DELETE' && closeMatch) {
        store.closeSession(closeMatch[1], account.accountId)
        response.writeHead(204, { 'Cache-Control': 'no-store' })
        return response.end()
      }
      if (request.method === 'POST' && path === '/v1/auth/siwe/nonce') {
        return await createChallenge(request, response, account)
      }
      if (request.method === 'POST' && path === '/v1/auth/siwe/verify') {
        return await verifyChallenge(request, response, account)
      }
      const supportCreateMatch = /^\/v1\/artists\/([A-Za-z0-9_-]+)\/support$/.exec(path)
      if (request.method === 'POST' && supportCreateMatch) {
        return await createSupportIntent(request, response, account, supportCreateMatch[1])
      }
      const supportSubmitMatch = /^\/v1\/support-intents\/([A-Za-z0-9-]+)\/submit$/.exec(path)
      if (request.method === 'POST' && supportSubmitMatch) {
        return await submitSupport(request, response, account, supportSubmitMatch[1])
      }
      if (request.method === 'POST' && path === '/v1/testnet/supporter-registrations') {
        if (!supporterRelayer) {
          throw new SupporterSbtRelayError(503, 'SUPPORTER_RELAY_DISABLED', 'Sponsored Supporter SBT registration is not configured')
        }
        return sendJson(response, 200, await supporterRelayer.relay(await readJson(request)))
      }
      if (request.method === 'POST' && path === '/v1/testnet/governance-votes') {
        if (!governanceRelayer) {
          throw new GovernanceVoteRelayError(503, 'GOVERNANCE_RELAY_DISABLED', 'Sponsored governance voting is not configured')
        }
        return sendJson(response, 200, await governanceRelayer.relay(await readJson(request)))
      }
      const registrationMatch = /^\/v1\/support-registrations\/([A-Za-z0-9-]+)$/.exec(path)
      if (request.method === 'GET' && registrationMatch) {
        return supportRegistration(response, account, registrationMatch[1])
      }
      const capabilityMatch = /^\/v1\/artists\/([A-Za-z0-9_-]+)\/community-capability$/.exec(path)
      if (request.method === 'GET' && capabilityMatch) {
        if (!catalog.some((track) => track.artistId === capabilityMatch[1])) {
          throw new GatewayHttpError(404, 'ARTIST_NOT_FOUND', 'Artist was not found')
        }
        const tier = account.tiers.get(capabilityMatch[1]) ?? 'NONE'
        const allowed = tier !== 'NONE'
        return sendJson(response, 200, {
          allowed,
          tier,
          reason: allowed ? `Active ${tier} demo credential` : 'Active Supporter credential required',
          policyVersion: SUPPORT_POLICY_VERSION,
          freshness: 'FRESH'
        })
      }
      throw new GatewayHttpError(404, 'NOT_FOUND', 'Route not found')
    } catch (error) {
      if (response.headersSent) return response.destroy(error)
      const knownError = error instanceof GatewayHttpError || error instanceof AccountTrustError || error instanceof ParticipantInvitationError || error instanceof ParticipantApplicationError || error instanceof ParticipantEnrollmentError || error instanceof SupporterSbtRelayError || error instanceof GovernanceVoteRelayError
      const status = knownError ? error.status : 500
      const code = knownError ? error.code : 'INTERNAL_ERROR'
      const message = knownError ? error.message : 'Gateway request failed'
      if (!knownError) console.error(`Gateway request failed: ${error.message}`)
      sendJson(response, status, { code, message })
    }
  })

  return {
    server,
    store,
    invitationMailer,
    participantEnrollment,
    supporterRelayer,
    governanceRelayer,
    async listen(port = config.port, host = config.host) {
      await new Promise((resolve, reject) => {
        server.once('error', reject)
        server.listen(port, host, resolve)
      })
      participantInvitations.startAutoProcessing()
      return server.address()
    },
    async close() {
      if (closed) return
      closed = true
      participantInvitations.stopAutoProcessing()
      if (server.listening) await new Promise((resolve) => server.close(resolve))
      store.close()
    }
  }
}
