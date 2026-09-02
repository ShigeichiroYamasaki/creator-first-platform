import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { getAddress } from 'viem'

export const PARTICIPANT_USER_ROLE = 1
export const PARTICIPANT_CREATOR_ROLE = 2
export const PARTICIPANT_ALL_ROLES = 3
export const PARTICIPANT_FLOW_V1 = 'PARTICIPANT_ENROLLMENT_V1'
export const PARTICIPANT_FLOW_V2 = 'PARTICIPANT_ENROLLMENT_V2'
export const PARTICIPANT_CONSENT_V1 = 'participant-experiment-v1'
export const PARTICIPANT_CONSENT_V2 = 'participant-experiment-v2'

const FIRST_RESEND_DELAY_MS = 5 * 60_000
const RESEND_COOLDOWN_MS = 10 * 60_000
const RESEND_WINDOW_MS = 24 * 60 * 60_000
const MAX_RESENDS_PER_WINDOW = 3

export class ParticipantInvitationError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function safeTokenEqual(actual, expected) {
  const actualHash = createHash('sha256').update(actual ?? '').digest()
  const expectedHash = createHash('sha256').update(expected ?? '').digest()
  return timingSafeEqual(actualHash, expectedHash)
}

function publicInvitation(row, enrollment) {
  return {
    invitationId: row.invitation_id,
    displayName: row.display_name,
    roles: row.role_bits,
    state: row.state,
    expiresAt: row.expires_at,
    flowVersion: row.flow_version,
    consentVersion: row.consent_version,
    enrollment
  }
}

function adminInvitation(row, enrollment) {
  return {
    ...publicInvitation(row, enrollment),
    email: row.email,
    claimedWallet: row.claimed_wallet ?? null,
    createdAt: row.created_at,
    sentAt: row.sent_at ?? null,
    claimedAt: row.claimed_at ?? null,
    resendCount: row.resend_count ?? 0,
    lastResendAt: row.last_resend_at ?? null
  }
}

function consentAccepted(row, body) {
  if (row.flow_version === PARTICIPANT_FLOW_V2) return body.acceptedParticipation === true
  return body.acceptedParticipation === true || (body.acceptedTerms === true && body.acknowledgedTestOnly === true)
}

function resendAvailability(row, now = Date.now()) {
  if (!row || row.state !== 'SENT' || Date.parse(row.expires_at) <= now) {
    return { available: false, availableAt: null, attemptsRemaining: 0 }
  }
  const storedWindowStart = row.resend_window_started_at ? Date.parse(row.resend_window_started_at) : Number.NaN
  const windowExpired = !Number.isFinite(storedWindowStart) || storedWindowStart + RESEND_WINDOW_MS <= now
  const windowStart = windowExpired ? now : storedWindowStart
  const resendCount = windowExpired ? 0 : Number(row.resend_count ?? 0)
  if (resendCount >= MAX_RESENDS_PER_WINDOW) {
    return {
      available: false,
      availableAt: new Date(windowStart + RESEND_WINDOW_MS).toISOString(),
      attemptsRemaining: 0
    }
  }
  const lastSend = Date.parse(row.last_resend_at ?? row.sent_at ?? row.created_at)
  const delay = row.last_resend_at ? RESEND_COOLDOWN_MS : FIRST_RESEND_DELAY_MS
  const availableAtMs = lastSend + delay
  return {
    available: now >= availableAtMs,
    availableAt: new Date(availableAtMs).toISOString(),
    attemptsRemaining: MAX_RESENDS_PER_WINDOW - resendCount,
    windowStartedAt: new Date(windowStart).toISOString(),
    resendCount
  }
}

export class ParticipantInvitationService {
  constructor({ config, store, mailer, enrollmentOperator }) {
    this.config = config
    this.store = store
    this.mailer = mailer
    this.enrollmentOperator = enrollmentOperator
  }

  publicView(row) {
    return publicInvitation(row, this.enrollmentOperator.statusForInvitation(row.invitation_id))
  }

  adminView(row) {
    return adminInvitation(row, this.enrollmentOperator.statusForInvitation(row.invitation_id))
  }

  requireAdministrator(request) {
    if (!this.config.adminToken) {
      throw new ParticipantInvitationError(503, 'ADMIN_API_DISABLED', 'Administrator API is disabled')
    }
    const authorization = request.headers.authorization ?? ''
    const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
    if (!safeTokenEqual(supplied, this.config.adminToken)) {
      throw new ParticipantInvitationError(401, 'ADMIN_AUTHENTICATION_REQUIRED', 'A valid administrator token is required')
    }
  }

  create(body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim().normalize('NFKC') : ''
    const roles = Number(body.roles)
    const flowVersion = body.flowVersion === PARTICIPANT_FLOW_V2 ? PARTICIPANT_FLOW_V2 : PARTICIPANT_FLOW_V1
    const consentVersion = flowVersion === PARTICIPANT_FLOW_V2 ? PARTICIPANT_CONSENT_V2 : PARTICIPANT_CONSENT_V1
    const expiresInHours = Number(body.expiresInHours ?? 72)
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new ParticipantInvitationError(400, 'INVALID_INVITATION_EMAIL', 'A valid email address is required')
    }
    if (displayName.length < 2 || displayName.length > 80) {
      throw new ParticipantInvitationError(400, 'INVALID_INVITATION_NAME', 'Display name must be 2–80 characters')
    }
    if (![PARTICIPANT_USER_ROLE, PARTICIPANT_CREATOR_ROLE, PARTICIPANT_ALL_ROLES].includes(roles)) {
      throw new ParticipantInvitationError(400, 'INVALID_INVITATION_ROLES', 'User, creator or both roles are required')
    }
    if (!Number.isSafeInteger(expiresInHours) || expiresInHours < 1 || expiresInHours > 24 * 30) {
      throw new ParticipantInvitationError(400, 'INVALID_INVITATION_EXPIRY', 'Expiry must be between 1 and 720 hours')
    }

    const invitationId = randomUUID()
    const token = randomBytes(32).toString('base64url')
    const createdAt = new Date().toISOString()
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60_000).toISOString()
    this.store.createParticipantInvitation({ invitationId, tokenHash: tokenHash(token), email, displayName, roleBits: roles, createdAt, expiresAt, flowVersion, consentVersion })
    this.store.recordParticipantInvitationEvent({ eventId: randomUUID(), invitationId, eventType: 'CREATED', occurredAt: createdAt, detail: { roles, expiresAt } })
    return {
      ...this.adminView(this.store.participantInvitationById(invitationId)),
      invitationUri: `${this.config.invitationPublicUrl}#invite=${token}`,
      token
    }
  }

  list() {
    return this.store.participantInvitations().map((row) => this.adminView(row))
  }

  async send(invitationId, body = {}) {
    const row = this.store.participantInvitationById(invitationId)
    if (!row) throw new ParticipantInvitationError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    if (row.state === 'CLAIMED' || row.state === 'REVOKED' || row.expires_at <= new Date().toISOString()) {
      throw new ParticipantInvitationError(409, 'INVITATION_NOT_SENDABLE', 'Invitation is claimed, revoked or expired')
    }
    const token = typeof body.token === 'string' ? body.token : ''
    if (!token || tokenHash(token) !== row.token_hash) {
      throw new ParticipantInvitationError(400, 'INVITATION_TOKEN_REQUIRED', 'The one-time token returned at creation is required to send this invitation')
    }
    const invitationUri = `${this.config.invitationPublicUrl}#invite=${token}`
    const delivery = await this.mailer.sendInvitation({
      invitationId,
      to: row.email,
      displayName: row.display_name,
      roles: row.role_bits,
      expiresAt: row.expires_at,
      invitationUri
    })
    const sentAt = new Date().toISOString()
    this.store.markParticipantInvitationSent(invitationId, sentAt)
    this.store.recordParticipantInvitationEvent({ eventId: randomUUID(), invitationId, eventType: 'EMAIL_SENT', occurredAt: sentAt, detail: { deliveryMode: delivery.mode, deliveryId: delivery.deliveryId } })
    return { invitationId, state: 'SENT', sentAt, delivery }
  }

  resendStatus(invitationId) {
    return resendAvailability(this.store.participantInvitationById(invitationId))
  }

  async resend(invitationId, idempotencyKey) {
    if (typeof idempotencyKey !== 'string' || idempotencyKey.length < 8 || idempotencyKey.length > 160) {
      throw new ParticipantInvitationError(400, 'INVALID_IDEMPOTENCY_KEY', 'A valid Idempotency-Key header is required')
    }
    const replay = this.store.participantInvitationResendRequest(invitationId, idempotencyKey)
    if (replay) return replay
    const row = this.store.participantInvitationById(invitationId)
    if (!row) throw new ParticipantInvitationError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    const availability = resendAvailability(row)
    if (!availability.available) {
      throw new ParticipantInvitationError(429, 'INVITATION_RESEND_NOT_AVAILABLE', 'Invitation email cannot be resent yet')
    }
    const token = randomBytes(32).toString('base64url')
    if (this.store.rotateParticipantInvitationToken(invitationId, tokenHash(token), row.expires_at) !== 1) {
      throw new ParticipantInvitationError(409, 'INVITATION_NOT_SENDABLE', 'Invitation is claimed, revoked or expired')
    }
    const attemptedAt = new Date().toISOString()
    const nextCount = Number(availability.resendCount ?? 0) + 1
    this.store.markParticipantInvitationResent(invitationId, attemptedAt, availability.windowStartedAt, nextCount)
    const invitationUri = `${this.config.invitationPublicUrl}#invite=${token}`
    try {
      const delivery = await this.mailer.sendInvitation({
        invitationId,
        to: row.email,
        displayName: row.display_name,
        roles: row.role_bits,
        expiresAt: row.expires_at,
        invitationUri
      })
      this.store.recordParticipantInvitationEvent({ eventId: randomUUID(), invitationId, eventType: 'EMAIL_RESENT', occurredAt: attemptedAt, detail: { deliveryMode: delivery.mode, deliveryId: delivery.deliveryId, resendCount: nextCount } })
      const result = { invitationId, state: 'SENT', sentAt: attemptedAt, delivery }
      this.store.recordParticipantInvitationResendRequest(invitationId, idempotencyKey, attemptedAt, result)
      return result
    } catch (error) {
      this.store.recordParticipantInvitationEvent({ eventId: randomUUID(), invitationId, eventType: 'EMAIL_RESEND_FAILED', occurredAt: attemptedAt, detail: { resendCount: nextCount } })
      throw error
    }
  }

  inspect(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
      throw new ParticipantInvitationError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    }
    const row = this.store.participantInvitationByTokenHash(tokenHash(token))
    if (!row) throw new ParticipantInvitationError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    return { ...this.publicView(row), expired: row.expires_at <= new Date().toISOString() }
  }

  claim(token, account, body) {
    if (!account.walletAddress) {
      throw new ParticipantInvitationError(401, 'WALLET_LINK_REQUIRED', 'Connect and verify the invited wallet first')
    }
    const row = this.store.participantInvitationByTokenHash(tokenHash(token))
    if (!row) throw new ParticipantInvitationError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    if (row.state === 'CLAIMED') {
      if (row.claimed_wallet === account.walletAddress) return this.publicView(row)
      throw new ParticipantInvitationError(409, 'INVITATION_ALREADY_CLAIMED', 'Invitation has already been claimed')
    }
    if (!consentAccepted(row, body)) {
      throw new ParticipantInvitationError(400, 'INVITATION_CONSENT_REQUIRED', 'The current participation acknowledgement is required')
    }
    const proof = account.participantInvitationProof
    if (
      !proof ||
      proof.invitationId !== row.invitation_id ||
      proof.roles !== row.role_bits ||
      proof.consentVersion !== row.consent_version
    ) {
      throw new ParticipantInvitationError(
        401,
        'INVITATION_SIGNATURE_REQUIRED',
        'Sign the exact invitation, role set and consent before claiming it'
      )
    }
    let wallet
    try {
      wallet = getAddress(account.walletAddress)
    } catch {
      throw new ParticipantInvitationError(400, 'INVALID_WALLET_ADDRESS', 'Wallet address is invalid')
    }
    const claimedAt = new Date().toISOString()
    if (this.store.claimParticipantInvitation(row.invitation_id, wallet, claimedAt) !== 1) {
      throw new ParticipantInvitationError(409, 'INVITATION_NOT_CLAIMABLE', 'Invitation is expired or unavailable')
    }
    this.store.recordParticipantInvitationEvent({ eventId: randomUUID(), invitationId: row.invitation_id, eventType: 'CLAIMED', occurredAt: claimedAt, detail: { wallet } })
    this.store.markParticipantApplicationInvitationClaimed(row.invitation_id, claimedAt)
    account.participantInvitationProof = undefined
    return this.publicView(this.store.participantInvitationById(row.invitation_id))
  }
}
