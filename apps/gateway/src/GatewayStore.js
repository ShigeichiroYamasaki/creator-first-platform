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
    `)
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

  close() {
    this.database.close()
  }
}
