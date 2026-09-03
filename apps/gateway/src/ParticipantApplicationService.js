import { createHash, randomBytes, randomUUID } from 'node:crypto'
import {
  PARTICIPANT_ALL_ROLES,
  PARTICIPANT_CONSENT_V2,
  PARTICIPANT_CREATOR_ROLE,
  PARTICIPANT_FLOW_V1,
  PARTICIPANT_FLOW_V2,
  PARTICIPANT_USER_ROLE
} from './ParticipantInvitationService.js'

export class ParticipantApplicationError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function tokenHash(token) {
  return createHash('sha256').update(token).digest('hex')
}

function emailHint(email) {
  const [local, domain] = email.split('@')
  return `${local.slice(0, 1)}***@${domain}`
}

function publicApplication(row, participantView = null) {
  return {
    applicationId: row.application_id,
    displayName: row.display_name,
    roles: row.role_bits,
    state: row.state,
    emailHint: emailHint(row.email),
    createdAt: row.created_at,
    verifiedAt: row.verified_at ?? null,
    reviewedAt: row.reviewed_at ?? null,
    rejectionCode: row.rejection_code ?? null,
    flowVersion: row.flow_version,
    consentVersion: row.consent_version,
    participantView
  }
}

const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000
const VERIFICATION_RESEND_COOLDOWN_MS = 60 * 1000

function adminApplication(row) {
  return {
    ...publicApplication(row),
    email: row.email,
    invitationId: row.invitation_id ?? null
  }
}

function validateApplication(body) {
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim().normalize('NFKC') : ''
  const roles = Number(body.roles)
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    throw new ParticipantApplicationError(400, 'INVALID_APPLICATION_EMAIL', 'A valid email address is required')
  }
  if (displayName.length < 2 || displayName.length > 80) {
    throw new ParticipantApplicationError(400, 'INVALID_APPLICATION_NAME', 'Display name must be 2–80 characters')
  }
  if (![PARTICIPANT_USER_ROLE, PARTICIPANT_CREATOR_ROLE, PARTICIPANT_ALL_ROLES].includes(roles)) {
    throw new ParticipantApplicationError(400, 'INVALID_APPLICATION_ROLES', 'Listener, creator or both roles are required')
  }
  if (body.acceptedParticipation !== true) {
    throw new ParticipantApplicationError(400, 'APPLICATION_CONSENT_REQUIRED', 'The participation acknowledgement is required')
  }
  return { email, displayName, roles }
}

export class ParticipantApplicationService {
  constructor({ config, store, mailer, invitations }) {
    this.config = config
    this.store = store
    this.mailer = mailer
    this.invitations = invitations
  }

  participantView(row) {
    if (!row) return null
    if (row.state === 'UNDER_REVIEW') return {
      status: 'UNDER_REVIEW', phase: 'REVIEW', title: '運営が申請を確認しています',
      guidance: '申請直後のメール送信はありません。承認された場合だけ、参加登録用メールが1通届きます。', primaryAction: null,
      actionOwner: 'NONE', completedSummary: ['参加申請'], recoveryAction: null, refreshAfterSeconds: 15
    }
    if (row.state === 'APPROVED_INVITATION_SENT') {
      const invitation = row.invitation_id ? this.store.participantInvitationById(row.invitation_id) : null
      if (invitation?.state === 'CLAIMED') return { status: 'REGISTRATION_CONFIRMED', primaryAction: null, recoveryAction: null }
      const resend = invitation ? this.invitations.resendStatus(invitation.invitation_id) : null
      return {
        status: 'INVITATION_SENT', phase: 'CHECK_EMAIL', title: '参加登録用メールを確認してください',
        guidance: 'メールのリンクから本人登録を始めてください。', primaryAction: null,
        actionOwner: 'PARTICIPANT', completedSummary: ['参加申請', '運営審査'],
        recoveryAction: resend?.available ? 'RESEND_INVITATION' : null,
        recoveryAvailableAt: resend?.availableAt ?? null,
        resendAttemptsRemaining: resend?.attemptsRemaining ?? 0, refreshAfterSeconds: 15
      }
    }
    if (row.state === 'INVITATION_CLAIMED') return {
      status: 'REGISTRATION_CONFIRMED', phase: 'PREPARING', title: '本人登録が完了しました',
      guidance: '運営が参加資格と初回POLを準備しています。', primaryAction: null, actionOwner: 'OPERATOR',
      completedSummary: ['参加申請', '運営審査', '本人登録'], recoveryAction: null, refreshAfterSeconds: 15
    }
    if (row.state === 'APPROVAL_DELIVERY_FAILED') return {
      status: 'DELIVERY_FAILED', phase: 'RECOVERY', title: 'メール送信を確認しています',
      guidance: '運営が再処理します。参加者の操作はありません。', primaryAction: null, actionOwner: 'OPERATOR',
      completedSummary: ['参加申請', '運営審査'], recoveryAction: null, refreshAfterSeconds: 15
    }
    if (row.state === 'REJECTED') return {
      status: 'REJECTED', phase: 'RECOVERY', title: '今回の参加登録は完了していません',
      guidance: '次回募集がある場合は募集案内から申し込めます。', primaryAction: null, actionOwner: 'NONE',
      completedSummary: ['参加申請', '運営審査'], recoveryAction: null, refreshAfterSeconds: 0
    }
    return {
      status: row.state, phase: 'CHECK_EMAIL', title: '旧確認メールを確認してください',
      guidance: '既存申請の確認リンクを開いてください。', primaryAction: null, actionOwner: 'PARTICIPANT',
      completedSummary: ['参加申請'], recoveryAction: row.flow_version === PARTICIPANT_FLOW_V1 ? 'RESEND_VERIFICATION' : null,
      refreshAfterSeconds: 15
    }
  }

  publicView(row) {
    return publicApplication(row, this.participantView(row))
  }

  create(account, body) {
    const value = validateApplication(body)
    const existing = this.store.participantApplicationByOwnerId(account.accountId)
    if (existing) {
      if (existing.email === value.email && existing.display_name === value.displayName && existing.role_bits === value.roles) {
        return { application: this.publicView(existing) }
      }
      throw new ParticipantApplicationError(409, 'APPLICATION_ALREADY_EXISTS', 'This browser session already has an application')
    }
    const applicationId = randomUUID()
    const verificationToken = randomBytes(32).toString('base64url')
    const createdAt = new Date().toISOString()
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString()
    this.store.createParticipantApplication({
      applicationId,
      ownerId: account.accountId,
      verificationTokenHash: tokenHash(verificationToken),
      email: value.email,
      displayName: value.displayName,
      roleBits: value.roles,
      createdAt,
      verificationExpiresAt,
      state: 'UNDER_REVIEW',
      flowVersion: PARTICIPANT_FLOW_V2,
      consentVersion: PARTICIPANT_CONSENT_V2
    })
    this.store.recordParticipantApplicationEvent({
      eventId: randomUUID(), applicationId, eventType: 'APPLICATION_CREATED', occurredAt: createdAt,
      detail: { roles: value.roles }
    })
    return { application: this.publicView(this.store.participantApplicationById(applicationId)) }
  }

  current(account) {
    const row = this.store.participantApplicationByOwnerId(account.accountId)
    return { application: row ? this.publicView(row) : null }
  }

  async createAndSend(account, body) {
    const created = this.create(account, body)
    return created.application
  }

  async resend(account, idempotencyKey) {
    const row = this.store.participantApplicationByOwnerId(account.accountId)
    if (!row) throw new ParticipantApplicationError(404, 'APPLICATION_NOT_FOUND', 'Application was not found')
    if (row.flow_version === PARTICIPANT_FLOW_V2) {
      if (row.state !== 'APPROVED_INVITATION_SENT' || !row.invitation_id) {
        throw new ParticipantApplicationError(409, 'INVITATION_RESEND_NOT_AVAILABLE', 'Invitation resend is not available')
      }
      await this.invitations.resend(row.invitation_id, idempotencyKey)
      return this.publicView(this.store.participantApplicationById(row.application_id))
    }
    if (row.state !== 'EMAIL_VERIFICATION_REQUIRED') {
      throw new ParticipantApplicationError(409, 'APPLICATION_EMAIL_ALREADY_VERIFIED', 'Email verification is no longer pending')
    }
    if (row.verification_sent_at && Date.now() - Date.parse(row.verification_sent_at) < VERIFICATION_RESEND_COOLDOWN_MS) {
      return this.publicView(row)
    }
    const verificationToken = randomBytes(32).toString('base64url')
    const verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_MS).toISOString()
    this.store.rotateParticipantApplicationVerificationToken(row.application_id, tokenHash(verificationToken), verificationExpiresAt)
    await this.sendVerification(row.application_id, verificationToken)
    return this.publicView(this.store.participantApplicationById(row.application_id))
  }

  async sendVerification(applicationId, verificationToken) {
    const row = this.store.participantApplicationById(applicationId)
    const verificationUri = `${this.config.applicationStatusPublicUrl}#verify-application=${verificationToken}`
    const delivery = await this.mailer.sendApplicationVerification({
      applicationId,
      to: row.email,
      displayName: row.display_name,
      verificationUri
    })
    const sentAt = new Date().toISOString()
    this.store.markParticipantApplicationVerificationSent(applicationId, sentAt)
    this.store.recordParticipantApplicationEvent({
      eventId: randomUUID(), applicationId, eventType: 'VERIFICATION_EMAIL_SENT', occurredAt: sentAt,
      detail: { deliveryMode: delivery.mode, deliveryId: delivery.deliveryId }
    })
    return delivery
  }

  verify(token) {
    if (typeof token !== 'string' || token.length < 32 || token.length > 128) {
      throw new ParticipantApplicationError(404, 'APPLICATION_VERIFICATION_NOT_FOUND', 'Verification request was not found')
    }
    const row = this.store.participantApplicationByVerificationTokenHash(tokenHash(token))
    if (!row) throw new ParticipantApplicationError(404, 'APPLICATION_VERIFICATION_NOT_FOUND', 'Verification request was not found')
    if (row.flow_version !== PARTICIPANT_FLOW_V1) {
      throw new ParticipantApplicationError(409, 'APPLICATION_NOT_VERIFIABLE', 'This application does not use email pre-verification')
    }
    if (row.state === 'UNDER_REVIEW') return this.publicView(row)
    if (row.state !== 'EMAIL_VERIFICATION_REQUIRED') {
      throw new ParticipantApplicationError(409, 'APPLICATION_NOT_VERIFIABLE', 'Application cannot be verified in its current state')
    }
    if (Date.parse(row.verification_expires_at) <= Date.now()) {
      throw new ParticipantApplicationError(410, 'APPLICATION_VERIFICATION_EXPIRED', 'Verification request has expired; request a new email')
    }
    const verifiedAt = new Date().toISOString()
    this.store.verifyParticipantApplication(row.application_id, verifiedAt)
    this.store.recordParticipantApplicationEvent({
      eventId: randomUUID(), applicationId: row.application_id, eventType: 'EMAIL_VERIFIED', occurredAt: verifiedAt
    })
    return this.publicView(this.store.participantApplicationById(row.application_id))
  }

  list() {
    return this.store.participantApplications().map(adminApplication)
  }

  async approve(applicationId) {
    const row = this.store.participantApplicationById(applicationId)
    if (!row) throw new ParticipantApplicationError(404, 'APPLICATION_NOT_FOUND', 'Application was not found')
    if (!['UNDER_REVIEW', 'APPROVAL_DELIVERY_FAILED'].includes(row.state)) {
      throw new ParticipantApplicationError(409, 'APPLICATION_NOT_REVIEWABLE', 'Application is not awaiting approval')
    }
    const invitation = this.invitations.create({
      email: row.email,
      displayName: row.display_name,
      roles: row.role_bits,
      expiresInHours: 72,
      flowVersion: PARTICIPANT_FLOW_V2
    })
    const reviewedAt = new Date().toISOString()
    try {
      await this.invitations.send(invitation.invitationId, { token: invitation.token })
    } catch (error) {
      this.store.failParticipantApplicationApproval(applicationId, invitation.invitationId, reviewedAt)
      this.store.recordParticipantApplicationEvent({
        eventId: randomUUID(), applicationId, eventType: 'APPROVAL_EMAIL_FAILED', occurredAt: reviewedAt,
        detail: { invitationId: invitation.invitationId }
      })
      throw error
    }
    this.store.approveParticipantApplication(applicationId, invitation.invitationId, reviewedAt)
    this.store.recordParticipantApplicationEvent({
      eventId: randomUUID(), applicationId, eventType: 'APPLICATION_APPROVED', occurredAt: reviewedAt,
      detail: { invitationId: invitation.invitationId }
    })
    return adminApplication(this.store.participantApplicationById(applicationId))
  }

  async reject(applicationId, body) {
    const rejectionCode = typeof body.rejectionCode === 'string' ? body.rejectionCode : ''
    if (!['NOT_IN_CURRENT_COHORT', 'DUPLICATE_APPLICATION', 'INFORMATION_INCOMPLETE'].includes(rejectionCode)) {
      throw new ParticipantApplicationError(400, 'INVALID_REJECTION_CODE', 'A supported rejection code is required')
    }
    const row = this.store.participantApplicationById(applicationId)
    if (!row) throw new ParticipantApplicationError(404, 'APPLICATION_NOT_FOUND', 'Application was not found')
    const reviewedAt = new Date().toISOString()
    if (this.store.rejectParticipantApplication(applicationId, rejectionCode, reviewedAt) !== 1) {
      throw new ParticipantApplicationError(409, 'APPLICATION_NOT_REVIEWABLE', 'Application is not awaiting review')
    }
    await this.mailer.sendApplicationDecision({
      applicationId,
      to: row.email,
      displayName: row.display_name,
      approved: false
    })
    this.store.recordParticipantApplicationEvent({
      eventId: randomUUID(), applicationId, eventType: 'APPLICATION_REJECTED', occurredAt: reviewedAt,
      detail: { rejectionCode }
    })
    return adminApplication(this.store.participantApplicationById(applicationId))
  }
}
