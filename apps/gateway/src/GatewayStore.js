import { mkdirSync } from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

export class GatewayStore {
  constructor(databasePath) {
    if (databasePath !== ':memory:') mkdirSync(path.dirname(databasePath), { recursive: true })
    this.database = new DatabaseSync(databasePath)
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS authorization_decisions (
        decision_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        allowed INTEGER NOT NULL,
        reason_code TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        rights_version TEXT NOT NULL,
        decided_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS playback_sessions (
        session_id TEXT PRIMARY KEY,
        decision_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        adapter_ref TEXT NOT NULL,
        state TEXT NOT NULL,
        issued_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL,
        lease_released INTEGER NOT NULL DEFAULT 0,
        bytes_delivered INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS idempotency_keys (
        owner_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        request_hash TEXT NOT NULL,
        response_json TEXT NOT NULL,
        PRIMARY KEY (owner_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS delivery_evidence (
        evidence_id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        decision_id TEXT NOT NULL,
        track_id TEXT NOT NULL,
        response_status INTEGER NOT NULL,
        range_summary TEXT NOT NULL,
        bytes_delivered INTEGER NOT NULL,
        started_at TEXT NOT NULL,
        completed_at TEXT NOT NULL,
        evidence_version TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS demo_user_registrations (
        registration_id TEXT PRIMARY KEY,
        test_user_id TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL UNIQUE,
        terms_version TEXT NOT NULL,
        privacy_notice_version TEXT NOT NULL,
        registered_at TEXT NOT NULL,
        context TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_trust_bindings (
        binding_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        account_subject_commitment TEXT NOT NULL,
        state TEXT NOT NULL,
        passkey_credential_id TEXT,
        wallet_address TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        expires_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS active_account_trust_owner
        ON account_trust_bindings(owner_id)
        WHERE state = 'ACTIVE';
      CREATE TABLE IF NOT EXISTS webauthn_credentials (
        credential_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        public_key TEXT NOT NULL,
        counter INTEGER NOT NULL,
        transports_json TEXT NOT NULL,
        device_type TEXT NOT NULL,
        backed_up INTEGER NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS account_trust_audit_events (
        event_id TEXT PRIMARY KEY,
        binding_id TEXT NOT NULL,
        owner_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        detail_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS participant_invitations (
        invitation_id TEXT PRIMARY KEY,
        token_hash TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role_bits INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        sent_at TEXT,
        claimed_at TEXT,
        claimed_wallet TEXT,
        flow_version TEXT NOT NULL DEFAULT 'PARTICIPANT_ENROLLMENT_V1',
        consent_version TEXT NOT NULL DEFAULT 'participant-experiment-v1',
        resend_count INTEGER NOT NULL DEFAULT 0,
        resend_window_started_at TEXT,
        last_resend_at TEXT
      );
      CREATE TABLE IF NOT EXISTS participant_invitation_audit_events (
        event_id TEXT PRIMARY KEY,
        invitation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        detail_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS participant_invitation_resend_requests (
        invitation_id TEXT NOT NULL,
        idempotency_key TEXT NOT NULL,
        created_at TEXT NOT NULL,
        response_json TEXT NOT NULL,
        PRIMARY KEY (invitation_id, idempotency_key)
      );
      CREATE TABLE IF NOT EXISTS participant_applications (
        application_id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL UNIQUE,
        verification_token_hash TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role_bits INTEGER NOT NULL,
        state TEXT NOT NULL,
        created_at TEXT NOT NULL,
        verification_expires_at TEXT NOT NULL,
        verification_sent_at TEXT,
        verified_at TEXT,
        reviewed_at TEXT,
        invitation_id TEXT,
        rejection_code TEXT,
        flow_version TEXT NOT NULL DEFAULT 'PARTICIPANT_ENROLLMENT_V1',
        consent_version TEXT NOT NULL DEFAULT 'participant-experiment-v1'
      );
      CREATE TABLE IF NOT EXISTS participant_application_audit_events (
        event_id TEXT PRIMARY KEY,
        application_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        detail_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS participant_enrollments (
        invitation_id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL UNIQUE,
        operation_id TEXT NOT NULL UNIQUE,
        wallet_address TEXT NOT NULL,
        role_bits INTEGER NOT NULL,
        state TEXT NOT NULL,
        approval_expires_at TEXT NOT NULL,
        approval_tx_hash TEXT,
        approval_confirmed_at TEXT,
        funding_tx_hash TEXT,
        funding_confirmed_at TEXT,
        initial_funding_amount_atomic TEXT,
        last_error_code TEXT,
        last_error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS participant_enrollment_audit_events (
        event_id TEXT PRIMARY KEY,
        invitation_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        occurred_at TEXT NOT NULL,
        detail_json TEXT NOT NULL
      );
    `)
    const applicationColumns = new Set(this.database.prepare('PRAGMA table_info(participant_applications)').all().map((column) => column.name))
    if (!applicationColumns.has('verification_expires_at')) {
      this.database.exec("ALTER TABLE participant_applications ADD COLUMN verification_expires_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00.000Z'")
    }
    if (!applicationColumns.has('verification_sent_at')) {
      this.database.exec('ALTER TABLE participant_applications ADD COLUMN verification_sent_at TEXT')
    }
    if (!applicationColumns.has('flow_version')) {
      this.database.exec("ALTER TABLE participant_applications ADD COLUMN flow_version TEXT NOT NULL DEFAULT 'PARTICIPANT_ENROLLMENT_V1'")
    }
    if (!applicationColumns.has('consent_version')) {
      this.database.exec("ALTER TABLE participant_applications ADD COLUMN consent_version TEXT NOT NULL DEFAULT 'participant-experiment-v1'")
    }
    const invitationColumns = new Set(this.database.prepare('PRAGMA table_info(participant_invitations)').all().map((column) => column.name))
    if (!invitationColumns.has('flow_version')) {
      this.database.exec("ALTER TABLE participant_invitations ADD COLUMN flow_version TEXT NOT NULL DEFAULT 'PARTICIPANT_ENROLLMENT_V1'")
    }
    if (!invitationColumns.has('consent_version')) {
      this.database.exec("ALTER TABLE participant_invitations ADD COLUMN consent_version TEXT NOT NULL DEFAULT 'participant-experiment-v1'")
    }
    if (!invitationColumns.has('resend_count')) {
      this.database.exec('ALTER TABLE participant_invitations ADD COLUMN resend_count INTEGER NOT NULL DEFAULT 0')
    }
    if (!invitationColumns.has('resend_window_started_at')) {
      this.database.exec('ALTER TABLE participant_invitations ADD COLUMN resend_window_started_at TEXT')
    }
    if (!invitationColumns.has('last_resend_at')) {
      this.database.exec('ALTER TABLE participant_invitations ADD COLUMN last_resend_at TEXT')
    }
  }

  recordDecision(value) {
    this.database.prepare(`
      INSERT INTO authorization_decisions VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      value.decisionId,
      value.ownerId,
      value.trackId,
      value.allowed ? 1 : 0,
      value.reasonCode,
      value.policyVersion,
      value.rightsVersion,
      value.decidedAt
    )
  }

  activeSessionForOwner(ownerId, now) {
    return this.database.prepare(`
      SELECT session_id FROM playback_sessions
      WHERE owner_id = ? AND state IN ('AUTHORIZED', 'STARTED', 'ACTIVE') AND expires_at > ?
      LIMIT 1
    `).get(ownerId, now)
  }

  createSession(value) {
    this.database.prepare(`
      INSERT INTO playback_sessions (
        session_id, decision_id, owner_id, track_id, adapter_ref, state, issued_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, 'AUTHORIZED', ?, ?)
    `).run(
      value.sessionId,
      value.decisionId,
      value.ownerId,
      value.trackId,
      value.adapterRef,
      value.issuedAt,
      value.expiresAt
    )
  }

  session(sessionId) {
    return this.database.prepare('SELECT * FROM playback_sessions WHERE session_id = ?').get(sessionId)
  }

  setSessionState(sessionId, state) {
    this.database.prepare('UPDATE playback_sessions SET state = ? WHERE session_id = ?').run(state, sessionId)
  }

  closeSession(sessionId, ownerId) {
    return this.database.prepare(`
      UPDATE playback_sessions
      SET state = 'CLOSED', lease_released = 1
      WHERE session_id = ? AND owner_id = ? AND state NOT IN ('CLOSED', 'REVOKED', 'EXPIRED')
    `).run(sessionId, ownerId).changes
  }

  expireSession(sessionId) {
    this.database.prepare(`
      UPDATE playback_sessions SET state = 'EXPIRED', lease_released = 1 WHERE session_id = ?
    `).run(sessionId)
  }

  idempotentResponse(ownerId, key) {
    return this.database.prepare(`
      SELECT request_hash, response_json FROM idempotency_keys WHERE owner_id = ? AND idempotency_key = ?
    `).get(ownerId, key)
  }

  saveIdempotentResponse(ownerId, key, requestHash, response) {
    this.database.prepare(`
      INSERT INTO idempotency_keys VALUES (?, ?, ?, ?)
    `).run(ownerId, key, requestHash, JSON.stringify(response))
  }

  recordEvidence(value) {
    this.database.exec('BEGIN IMMEDIATE')
    try {
      this.database.prepare(`
        INSERT OR IGNORE INTO delivery_evidence VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        value.evidenceId,
        value.sessionId,
        value.decisionId,
        value.trackId,
        value.responseStatus,
        value.rangeSummary,
        value.bytesDelivered,
        value.startedAt,
        value.completedAt,
        'delivery-evidence-v1'
      )
      this.database.prepare(`
        UPDATE playback_sessions
        SET bytes_delivered = bytes_delivered + ?, state = 'ACTIVE'
        WHERE session_id = ? AND state NOT IN ('CLOSED', 'REVOKED', 'EXPIRED')
      `).run(value.bytesDelivered, value.sessionId)
      this.database.exec('COMMIT')
    } catch (error) {
      this.database.exec('ROLLBACK')
      throw error
    }
  }

  deliveredBytesSince(isoStart) {
    return this.database.prepare(`
      SELECT COALESCE(SUM(bytes_delivered), 0) AS total
      FROM delivery_evidence WHERE completed_at >= ?
    `).get(isoStart).total
  }

  evidenceForSession(sessionId) {
    return this.database.prepare(`
      SELECT * FROM delivery_evidence WHERE session_id = ? ORDER BY completed_at
    `).all(sessionId)
  }

  recordDemoUserRegistration(value) {
    this.database.prepare(`
      INSERT INTO demo_user_registrations VALUES (?, ?, ?, ?, ?, ?, 'local-test-only')
    `).run(
      value.registrationId,
      value.testUserId,
      value.ownerId,
      value.termsVersion,
      value.privacyNoticeVersion,
      value.registeredAt
    )
  }

  demoUserRegistration(ownerId) {
    return this.database.prepare(`
      SELECT * FROM demo_user_registrations WHERE owner_id = ?
    `).get(ownerId)
  }

  demoUserRegistrationCount() {
    return this.database.prepare('SELECT COUNT(*) AS total FROM demo_user_registrations').get().total
  }

  createParticipantInvitation(value) {
    this.database.prepare(`
      INSERT INTO participant_invitations (
        invitation_id, token_hash, email, display_name, role_bits, state, created_at, expires_at,
        flow_version, consent_version
      ) VALUES (?, ?, ?, ?, ?, 'CREATED', ?, ?, ?, ?)
    `).run(
      value.invitationId,
      value.tokenHash,
      value.email,
      value.displayName,
      value.roleBits,
      value.createdAt,
      value.expiresAt,
      value.flowVersion,
      value.consentVersion
    )
  }

  participantInvitationById(invitationId) {
    return this.database.prepare('SELECT * FROM participant_invitations WHERE invitation_id = ?').get(invitationId)
  }

  participantInvitationByTokenHash(tokenHash) {
    return this.database.prepare('SELECT * FROM participant_invitations WHERE token_hash = ?').get(tokenHash)
  }

  participantInvitations() {
    return this.database.prepare('SELECT * FROM participant_invitations ORDER BY created_at DESC').all()
  }

  markParticipantInvitationSent(invitationId, sentAt) {
    return this.database.prepare(`
      UPDATE participant_invitations SET state = 'SENT', sent_at = ?
      WHERE invitation_id = ? AND state IN ('CREATED', 'SENT')
    `).run(sentAt, invitationId).changes
  }

  rotateParticipantInvitationToken(invitationId, tokenDigest, expiresAt) {
    return this.database.prepare(`
      UPDATE participant_invitations
      SET token_hash = ?, expires_at = ?
      WHERE invitation_id = ? AND state = 'SENT'
    `).run(tokenDigest, expiresAt, invitationId).changes
  }

  markParticipantInvitationResent(invitationId, sentAt, windowStartedAt, resendCount) {
    return this.database.prepare(`
      UPDATE participant_invitations
      SET sent_at = ?, last_resend_at = ?, resend_window_started_at = ?, resend_count = ?
      WHERE invitation_id = ? AND state = 'SENT'
    `).run(sentAt, sentAt, windowStartedAt, resendCount, invitationId).changes
  }

  claimParticipantInvitation(invitationId, walletAddress, claimedAt) {
    return this.database.prepare(`
      UPDATE participant_invitations
      SET state = 'CLAIMED', claimed_wallet = ?, claimed_at = ?
      WHERE invitation_id = ? AND state IN ('CREATED', 'SENT') AND expires_at > ?
    `).run(walletAddress, claimedAt, invitationId, claimedAt).changes
  }

  recordParticipantInvitationEvent(value) {
    this.database.prepare(`
      INSERT INTO participant_invitation_audit_events VALUES (?, ?, ?, ?, ?)
    `).run(value.eventId, value.invitationId, value.eventType, value.occurredAt, JSON.stringify(value.detail ?? {}))
  }

  participantInvitationEvents(invitationId) {
    return this.database.prepare(`
      SELECT event_type, occurred_at, detail_json
      FROM participant_invitation_audit_events WHERE invitation_id = ? ORDER BY occurred_at, rowid
    `).all(invitationId)
  }

  participantInvitationResendRequest(invitationId, idempotencyKey) {
    const row = this.database.prepare(`
      SELECT response_json FROM participant_invitation_resend_requests
      WHERE invitation_id = ? AND idempotency_key = ?
    `).get(invitationId, idempotencyKey)
    return row ? JSON.parse(row.response_json) : null
  }

  recordParticipantInvitationResendRequest(invitationId, idempotencyKey, createdAt, response) {
    this.database.prepare(`
      INSERT INTO participant_invitation_resend_requests VALUES (?, ?, ?, ?)
    `).run(invitationId, idempotencyKey, createdAt, JSON.stringify(response))
  }

  createParticipantEnrollment(value) {
    this.database.prepare(`
      INSERT OR IGNORE INTO participant_enrollments (
        invitation_id, participant_id, operation_id, wallet_address, role_bits,
        state, approval_expires_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, 'READY_FOR_APPROVAL', ?, ?, ?)
    `).run(
      value.invitationId,
      value.participantId,
      value.operationId,
      value.walletAddress,
      value.roleBits,
      value.approvalExpiresAt,
      value.createdAt,
      value.createdAt
    )
    return this.participantEnrollment(value.invitationId)
  }

  participantEnrollment(invitationId) {
    return this.database.prepare('SELECT * FROM participant_enrollments WHERE invitation_id = ?').get(invitationId)
  }

  markParticipantEnrollmentApprovalSubmitted(invitationId, transactionHash, updatedAt) {
    return this.database.prepare(`
      UPDATE participant_enrollments
      SET state = 'APPROVAL_SUBMITTED', approval_tx_hash = ?,
          last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE invitation_id = ? AND state IN ('READY_FOR_APPROVAL', 'APPROVAL_FAILED')
    `).run(transactionHash, updatedAt, invitationId).changes
  }

  markParticipantEnrollmentApproved(invitationId, transactionHash, confirmedAt) {
    return this.database.prepare(`
      UPDATE participant_enrollments
      SET state = 'APPROVED', approval_tx_hash = COALESCE(?, approval_tx_hash),
          approval_confirmed_at = ?, last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE invitation_id = ? AND state != 'FUNDED'
    `).run(transactionHash, confirmedAt, confirmedAt, invitationId).changes
  }

  markParticipantEnrollmentFundingSubmitted(invitationId, transactionHash, updatedAt) {
    return this.database.prepare(`
      UPDATE participant_enrollments
      SET state = 'FUNDING_SUBMITTED', funding_tx_hash = ?,
          last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE invitation_id = ? AND state IN ('APPROVED', 'FUNDING_FAILED')
    `).run(transactionHash, updatedAt, invitationId).changes
  }

  markParticipantEnrollmentFunded(invitationId, transactionHash, amountAtomic, confirmedAt) {
    return this.database.prepare(`
      UPDATE participant_enrollments
      SET state = 'FUNDED', funding_tx_hash = COALESCE(?, funding_tx_hash),
          funding_confirmed_at = ?, initial_funding_amount_atomic = ?,
          last_error_code = NULL, last_error_message = NULL, updated_at = ?
      WHERE invitation_id = ?
    `).run(transactionHash, confirmedAt, amountAtomic, confirmedAt, invitationId).changes
  }

  failParticipantEnrollment(invitationId, phase, code, message, updatedAt) {
    const state = phase === 'approval' ? 'APPROVAL_FAILED' : 'FUNDING_FAILED'
    return this.database.prepare(`
      UPDATE participant_enrollments
      SET state = ?, last_error_code = ?, last_error_message = ?, updated_at = ?
      WHERE invitation_id = ? AND state != 'FUNDED'
    `).run(state, code, message, updatedAt, invitationId).changes
  }

  recordParticipantEnrollmentEvent(value) {
    this.database.prepare(`
      INSERT INTO participant_enrollment_audit_events VALUES (?, ?, ?, ?, ?)
    `).run(value.eventId, value.invitationId, value.eventType, value.occurredAt, JSON.stringify(value.detail ?? {}))
  }

  participantEnrollmentEvents(invitationId) {
    return this.database.prepare(`
      SELECT event_type, occurred_at, detail_json
      FROM participant_enrollment_audit_events WHERE invitation_id = ? ORDER BY occurred_at, rowid
    `).all(invitationId)
  }

  createParticipantApplication(value) {
    this.database.prepare(`
      INSERT INTO participant_applications (
        application_id, owner_id, verification_token_hash, email, display_name,
        role_bits, state, created_at, verification_expires_at, flow_version, consent_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      value.applicationId,
      value.ownerId,
      value.verificationTokenHash,
      value.email,
      value.displayName,
      value.roleBits,
      value.state,
      value.createdAt,
      value.verificationExpiresAt,
      value.flowVersion,
      value.consentVersion
    )
  }

  participantApplicationById(applicationId) {
    return this.database.prepare('SELECT * FROM participant_applications WHERE application_id = ?').get(applicationId)
  }

  participantApplicationByOwnerId(ownerId) {
    return this.database.prepare('SELECT * FROM participant_applications WHERE owner_id = ?').get(ownerId)
  }

  participantApplicationByVerificationTokenHash(tokenHash) {
    return this.database.prepare('SELECT * FROM participant_applications WHERE verification_token_hash = ?').get(tokenHash)
  }

  participantApplications() {
    return this.database.prepare(`
      SELECT * FROM participant_applications ORDER BY created_at DESC
    `).all()
  }

  rotateParticipantApplicationVerificationToken(applicationId, verificationTokenHash, verificationExpiresAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET verification_token_hash = ?, verification_expires_at = ?, verification_sent_at = NULL
      WHERE application_id = ? AND state = 'EMAIL_VERIFICATION_REQUIRED'
    `).run(verificationTokenHash, verificationExpiresAt, applicationId).changes
  }

  markParticipantApplicationVerificationSent(applicationId, sentAt) {
    return this.database.prepare(`
      UPDATE participant_applications SET verification_sent_at = ?
      WHERE application_id = ? AND state = 'EMAIL_VERIFICATION_REQUIRED'
    `).run(sentAt, applicationId).changes
  }

  verifyParticipantApplication(applicationId, verifiedAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET state = 'UNDER_REVIEW', verified_at = ?
      WHERE application_id = ? AND state = 'EMAIL_VERIFICATION_REQUIRED'
    `).run(verifiedAt, applicationId).changes
  }

  approveParticipantApplication(applicationId, invitationId, reviewedAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET state = 'APPROVED_INVITATION_SENT', invitation_id = ?, reviewed_at = ?, rejection_code = NULL
      WHERE application_id = ? AND state IN ('UNDER_REVIEW', 'APPROVAL_DELIVERY_FAILED')
    `).run(invitationId, reviewedAt, applicationId).changes
  }

  failParticipantApplicationApproval(applicationId, invitationId, reviewedAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET state = 'APPROVAL_DELIVERY_FAILED', invitation_id = ?, reviewed_at = ?
      WHERE application_id = ? AND state IN ('UNDER_REVIEW', 'APPROVAL_DELIVERY_FAILED')
    `).run(invitationId, reviewedAt, applicationId).changes
  }

  rejectParticipantApplication(applicationId, rejectionCode, reviewedAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET state = 'REJECTED', rejection_code = ?, reviewed_at = ?
      WHERE application_id = ? AND state = 'UNDER_REVIEW'
    `).run(rejectionCode, reviewedAt, applicationId).changes
  }

  markParticipantApplicationInvitationClaimed(invitationId, claimedAt) {
    return this.database.prepare(`
      UPDATE participant_applications
      SET state = 'INVITATION_CLAIMED', verified_at = COALESCE(verified_at, ?), reviewed_at = COALESCE(reviewed_at, ?)
      WHERE invitation_id = ? AND state = 'APPROVED_INVITATION_SENT'
    `).run(claimedAt, claimedAt, invitationId).changes
  }

  recordParticipantApplicationEvent(value) {
    this.database.prepare(`
      INSERT INTO participant_application_audit_events VALUES (?, ?, ?, ?, ?)
    `).run(value.eventId, value.applicationId, value.eventType, value.occurredAt, JSON.stringify(value.detail ?? {}))
  }

  participantApplicationEvents(applicationId) {
    return this.database.prepare(`
      SELECT event_type, occurred_at, detail_json
      FROM participant_application_audit_events WHERE application_id = ? ORDER BY occurred_at, rowid
    `).all(applicationId)
  }

  createTrustBinding(value) {
    this.database.prepare(`
      INSERT INTO account_trust_bindings (
        binding_id, owner_id, account_subject_commitment, state, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      value.bindingId,
      value.ownerId,
      value.accountSubjectCommitment,
      value.state,
      value.createdAt,
      value.createdAt,
      value.expiresAt
    )
  }

  updateTrustBinding(value) {
    this.database.prepare(`
      UPDATE account_trust_bindings
      SET state = ?,
          passkey_credential_id = COALESCE(?, passkey_credential_id),
          wallet_address = COALESCE(?, wallet_address),
          updated_at = ?
      WHERE binding_id = ?
    `).run(
      value.state,
      value.passkeyCredentialId ?? null,
      value.walletAddress ?? null,
      value.updatedAt,
      value.bindingId
    )
  }

  activeTrustBinding(ownerId) {
    return this.database.prepare(`
      SELECT * FROM account_trust_bindings
      WHERE owner_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `).get(ownerId)
  }

  recordTrustAuditEvent(value) {
    this.database.prepare(`
      INSERT INTO account_trust_audit_events VALUES (?, ?, ?, ?, ?, ?)
    `).run(value.eventId, value.bindingId, value.ownerId, value.eventType, value.occurredAt, value.detail)
  }

  trustAuditEvents(bindingId) {
    return this.database.prepare(`
      SELECT * FROM account_trust_audit_events WHERE binding_id = ? ORDER BY occurred_at, rowid
    `).all(bindingId)
  }

  saveWebauthnCredential(value) {
    this.database.prepare(`
      INSERT INTO webauthn_credentials VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      value.credentialId,
      value.ownerId,
      value.publicKey,
      value.counter,
      value.transports,
      value.deviceType,
      value.backedUp ? 1 : 0,
      value.createdAt
    )
  }

  webauthnCredentials(ownerId) {
    return this.database.prepare(`
      SELECT * FROM webauthn_credentials WHERE owner_id = ? ORDER BY created_at
    `).all(ownerId)
  }

  webauthnCredential(credentialId, ownerId) {
    return this.database.prepare(`
      SELECT * FROM webauthn_credentials WHERE credential_id = ? AND owner_id = ?
    `).get(credentialId, ownerId)
  }

  updateWebauthnCounter(credentialId, counter) {
    this.database.prepare(`
      UPDATE webauthn_credentials SET counter = ? WHERE credential_id = ?
    `).run(counter, credentialId)
  }

  close() {
    this.database.close()
  }
}
