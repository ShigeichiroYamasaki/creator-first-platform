# Playback Event Verification and Usage Snapshot

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** usage / privacy  
**Specification ID:** SPEC-USAGE-001  
**Last Updated:** 2026-08-19

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/04-platform-architecture.md`
- Whitepaper: `docs/whitepaper/06-economics.md`
- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- ADR: `docs/adr/ADR-0004-creator-distribution-model.md`
- ADR: `docs/adr/ADR-0005-usage-oracle.md`
- ADR: `docs/adr/ADR-0009-navidrome-streaming-gateway.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/rights/rights-registry-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define the minimum interoperable behavior for receiving Playback Events, verifying them under a versioned policy, preventing duplicate inclusion, producing deterministic privacy-preserving Usage Snapshots and making finalized evidence available to a later Distribution Engine without treating a client or fraud model as the authority.

## Scope

This specification covers:

- authenticated Playback Event envelopes and stable event identity;
- ingestion, schema validation, replay protection and evidence binding;
- versioned verification outcomes and reason codes;
- duplicate, anomaly and fraud-review boundaries;
- deterministic aggregation by Distribution Period;
- challenge windows, correction and Usage Snapshot finalization;
- privacy, retention, audit and consumer availability behavior;
- commitments and optional proofs over verified inputs and aggregates.

## Out of Scope

- determining Rights Ownership or resolving Rights disputes;
- defining subscription entitlement or payment finality;
- selecting the Creator Distribution formula, weighting or payout amount;
- making a final legal or disciplinary judgment from anomaly detection;
- requiring a specific zero-knowledge system, blockchain or storage vendor;
- publishing User-level listening histories;
- defining recommendation or discovery ranking.

## Actors

- **Player Client:** emits playback observations and client evidence; it is not authoritative.
- **Session Authority:** confirms the applicable Account session or privacy-preserving credential context.
- **Usage Ingestion Gateway:** validates envelopes, rate limits and records accepted observations.
- **Usage Verifier:** evaluates an immutable event version against a versioned Verification Policy.
- **Fraud Reviewer:** investigates supported anomalies without silently changing the policy or evidence.
- **Snapshot Operator:** aggregates only eligible event versions and proposes a Usage Snapshot.
- **Snapshot Authority:** authorizes finalization or correction under the approved governance phase.
- **Challenger:** submits a scoped challenge with evidence.
- **Usage Consumer:** reads an exact finalized Usage Snapshot for distribution, reporting or audit.

## Definitions

- **Playback Event:** an immutable observation that a defined content version was presented in a playback session during a bounded time interval.
- **Event ID:** a privacy-preserving stable identifier used to detect replay and duplicate inclusion within defined contexts.
- **Event Evidence:** authenticated server, delivery, session, client-integrity and sequence evidence bound to an event version.
- **Verification Policy:** the versioned deterministic rules, thresholds, evidence requirements and reason-code taxonomy used to classify an event.
- **Verified Usage:** a Playback Event version eligible for aggregation under a specific Verification Policy version.
- **Distribution Period:** a half-open UTC interval `[period_start, period_end)` identified by a stable Period ID.
- **Usage Snapshot:** a versioned finalized aggregate and commitment over the exact eligible event set for one Distribution Period.
- **Correction Record:** an append-only authorized record that relates a replacement snapshot to the affected prior version without rewriting history.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Player Client timestamps, counters, duration and completion claims are untrusted until corroborated by the applicable evidence policy.
- Session validity proves an authorized Platform context, not a unique human, Wallet owner or absence of fraud.
- CDN, player, queue, database and analytics logs are evidence sources and may be delayed, duplicated, reordered or compromised.
- Fraud and anomaly models provide review signals; their outputs are not irreversible adjudications.
- Snapshot Operators can execute approved algorithms but cannot invent missing events, evidence or authority.
- Public commitments and proofs must not reveal User-level listening histories or stable cross-context identifiers.

## Inputs

### Playback Event Envelope

- `event_id`
- `event_version`
- `content_id` and `content_version`
- `session_context_id` or privacy-preserving credential reference
- `playback_started_at`
- `observed_at`
- `position_start_ms` and `position_end_ms`
- `played_duration_ms`
- `completion_code`
- `sequence_number` or equivalent ordering evidence
- `delivery_evidence_reference`
- `client_evidence_reference` (optional by policy)
- `schema_version`
- `idempotency_key`

### Verification Context

- Verification Policy version;
- applicable Distribution Period;
- session and entitlement evidence version;
- content availability and Rights Snapshot references when required;
- server observation and delivery evidence;
- known duplicate and replay context;
- anomaly signals and manual-review records;
- trusted processing time and software version.

## Outputs

- immutable event observation and evidence references;
- versioned verification outcome and reason codes;
- duplicate or related-event relation;
- deterministic aggregate records;
- finalized Usage Snapshot and commitment;
- challenge, correction and supersession records;
- privacy-preserving User and Creator transparency evidence where approved.

## Event State

```text
OBSERVED → VALIDATION_PENDING → VERIFIED
    │              │              │
    ├──────────────┴──────────────┼→ REJECTED
    └─────────────────────────────┼→ DISPUTED
                                  └→ SUPERSEDED
```

- `OBSERVED` records receipt without eligibility.
- `VALIDATION_PENDING` may await evidence or review and is not eligible for finalized aggregation.
- `VERIFIED` is eligible only under the bound Verification Policy and Distribution Period.
- `REJECTED` records stable reason codes and preserves audit history.
- `DISPUTED` is excluded from normal finalization unless an approved policy explicitly defines a reversible hold treatment.
- `SUPERSEDED` relates a correction to a prior version without deleting it.

## Snapshot State

```text
OPEN → CLOSING → CHALLENGE_WINDOW → FINALIZED
  │        │             │             │
  └────────┴─────────────┴─────────────┼→ ABORTED
                                       └→ CORRECTED (new version)
```

- `OPEN` accepts observations for the period subject to late-arrival policy.
- `CLOSING` freezes the candidate event boundary and performs reconciliation.
- `CHALLENGE_WINDOW` exposes approved aggregate evidence without exposing private event histories.
- `FINALIZED` is immutable and consumable by Distribution.
- `CORRECTED` requires a new snapshot version and Correction Record.

## Requirements

### MUST

- **REQ-USAGE-001:** Every accepted Playback Event MUST have a stable Event ID, immutable event version, schema version and idempotency key.
- **REQ-USAGE-002:** Event ID generation and exposure MUST use a documented scope that prevents unnecessary cross-User, cross-device or cross-context tracking.
- **REQ-USAGE-003:** Ingestion MUST authenticate the submitting component, enforce size and rate limits, validate canonical schema and record trusted receipt time.
- **REQ-USAGE-004:** Replaying the same idempotency key with the same canonical envelope MUST return the original result or equivalent reference; a different envelope MUST fail as a conflict.
- **REQ-USAGE-005:** Verification MUST bind the exact event version, Verification Policy version, evidence versions, processing version and outcome time.
- **REQ-USAGE-006:** A `VERIFIED` outcome MUST require the event schema, session context, content identity, time bounds, required evidence and duplicate checks defined by the applicable Verification Policy.
- **REQ-USAGE-007:** The verifier MUST distinguish `REJECTED`, `DISPUTED`, missing-evidence and temporarily unavailable outcomes with stable reason categories.
- **REQ-USAGE-008:** Duplicate detection MUST prevent one logical playback from being included more than once in the same applicable calculation context, including retries and multi-source observations.
- **REQ-USAGE-009:** A duplicate relation MUST preserve every received observation and identify the canonical included event version without deleting evidence.
- **REQ-USAGE-010:** Verification Policy thresholds and evidence rules MUST be versioned and MUST define activation time, applicable event scope and migration behavior.
- **REQ-USAGE-011:** Policy changes MUST NOT silently reclassify events already included in a finalized Usage Snapshot.
- **REQ-USAGE-012:** Manual review MUST record reviewer authority, evidence scope, reason, outcome, time and conflict-of-interest controls.
- **REQ-USAGE-013:** Automated anomaly or fraud signals MUST be reproducible from a recorded model or rule version and input feature version where technically feasible.
- **REQ-USAGE-014:** Events pending material fraud or integrity review MUST be held from normal finalization unless an approved reversible policy explicitly permits inclusion.
- **REQ-USAGE-015:** Every Distribution Period MUST use a stable Period ID, UTC half-open time interval and documented late-arrival boundary.
- **REQ-USAGE-016:** Snapshot closing MUST freeze an exact candidate event set and reconcile ingestion, verification, duplicate and dispute counts.
- **REQ-USAGE-017:** Aggregation MUST be deterministic for the same eligible event versions, Verification Policy, Aggregation Algorithm version and configuration.
- **REQ-USAGE-018:** Integer or fixed-point arithmetic, units, overflow behavior, ordering and rounding MUST be explicit and deterministic.
- **REQ-USAGE-019:** A Usage Snapshot MUST identify Period ID, snapshot version, event-set commitment, Verification Policy version, Aggregation Algorithm version, aggregate commitment, proof or audit reference, state and finalization time.
- **REQ-USAGE-020:** Snapshot finalization MUST require authorized multi-party or governance approval appropriate to the project phase and separation from the sole Snapshot Operator.
- **REQ-USAGE-021:** A Usage Consumer MUST bind the exact finalized Usage Snapshot version and MUST reject `OPEN`, `CLOSING`, `CHALLENGE_WINDOW`, `ABORTED` or unverifiable snapshots.
- **REQ-USAGE-022:** Finalized snapshots and their input, policy, algorithm, challenge and approval references MUST remain retrievable for the approved audit period.
- **REQ-USAGE-023:** A correction MUST create a new Usage Snapshot version and Correction Record that identifies cause, affected scope, authority and relationship to every prior consumer.
- **REQ-USAGE-024:** A challenge MUST identify snapshot version, challenged aggregate or event relation, evidence, requester authority or standing, requested remedy and submission time.
- **REQ-USAGE-025:** Challenge resolution MUST record evidence reviewed, decision, authority, effective treatment and appeal or escalation path.
- **REQ-USAGE-026:** Oracle or dependency unavailability MUST hold the affected period from finalization rather than synthesize missing usage or accept incomplete data as complete.
- **REQ-USAGE-027:** Raw User-level events, session references and device evidence MUST use access-controlled storage, encryption and an approved retention schedule.
- **REQ-USAGE-028:** Public aggregates, commitments, proofs and Creator views MUST prevent access to another User's detailed listening history.
- **REQ-USAGE-029:** User transparency evidence MUST reveal only the requesting User's authorized inclusion status and MUST NOT expose another User or protected fraud controls.
- **REQ-USAGE-030:** Creator transparency evidence MUST be limited to approved content-level or higher aggregates and MUST NOT enable User re-identification through sparse groups.
- **REQ-USAGE-048:** Delivery Evidence consumed from SPEC-STREAMING-001 MUST bind Playback Session ID, Authorization Decision ID, Canonical Track ID, content version, Rights Snapshot version, authenticated producer, evidence schema, bounded range or byte summary and trusted timestamps.
- **REQ-USAGE-049:** Verification MUST reject or hold an event when its Playback Session, Authorization Decision, content identity, Rights version or Delivery Evidence bindings conflict or cannot be verified.
- **REQ-USAGE-050:** Verification MUST distinguish authorization, delivery start, byte delivery, client progress and Verified Usage as separate states and evidence claims.

### MUST NOT

- **REQ-USAGE-031:** A Player Client's self-report MUST NOT be the sole authority for `VERIFIED` usage.
- **REQ-USAGE-032:** Wallet control, token holdings or payment amount MUST NOT by itself prove playback identity or valid usage.
- **REQ-USAGE-033:** An unverified, rejected, disputed or missing event MUST NOT be counted as normal Verified Usage in a finalized snapshot.
- **REQ-USAGE-034:** The same logical Playback Event MUST NOT contribute more than once to the same applicable aggregate.
- **REQ-USAGE-035:** A finalized Usage Snapshot MUST NOT be overwritten, silently recomputed or served under the same version with different content.
- **REQ-USAGE-036:** Detailed User-level listening history, stable session identifiers or raw device evidence MUST NOT be written to a public blockchain.
- **REQ-USAGE-037:** The Usage Oracle MUST NOT decide Rights Ownership, Rights shares, Distribution Policy or payout amount.
- **REQ-USAGE-038:** AI, anomaly score or fraud model output alone MUST NOT cause irreversible forfeiture, Account closure or Rights determination without the approved review and appeal process.
- **REQ-USAGE-051:** A Navidrome or other Media Adapter play count, scrobble, response, byte count or log entry MUST NOT be the sole authority for Verified Usage.

### SHOULD

- **REQ-USAGE-039:** Verification SHOULD combine independently produced session, delivery, server and client-integrity evidence appropriate to the threat model.
- **REQ-USAGE-040:** Event and aggregate commitments SHOULD use canonical serialization and a documented collision-resistant hash construction.
- **REQ-USAGE-041:** Snapshot reconciliation SHOULD publish privacy-safe totals for observed, verified, rejected, disputed, duplicate and late events by reason category.
- **REQ-USAGE-042:** Fraud review SHOULD use sampling, reviewer-quality checks and bias monitoring appropriate to Creator and User impact.
- **REQ-USAGE-043:** Retention SHOULD minimize raw events while preserving commitments, aggregate inputs, policy versions and audit evidence needed for correction and dispute.
- **REQ-USAGE-044:** Usage Consumers SHOULD verify snapshot integrity locally or through independently operated verification infrastructure.

### MAY

- **REQ-USAGE-045:** An implementation MAY publish an on-chain Usage Snapshot commitment without publishing raw events or User-level aggregates.
- **REQ-USAGE-046:** An implementation MAY provide Merkle or zero-knowledge inclusion evidence when it preserves privacy and binds the exact finalized snapshot.
- **REQ-USAGE-047:** A Verification Policy MAY support offline or delayed playback evidence with explicit freshness, replay and reconciliation rules.

## Invariants

- `INV-IDENTITY-001`
- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-PRIVACY-003`
- `INV-USAGE-001`
- `INV-USAGE-002`
- `INV-USAGE-003`
- `INV-DELIVERY-004`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- `INV-EVOLUTION-003`
- **SPEC-INV-USAGE-001:** One logical Playback Event contributes at most once to one applicable finalized aggregate.
- **SPEC-INV-USAGE-002:** No event becomes Verified Usage without the exact versioned policy and required corroborating evidence.
- **SPEC-INV-USAGE-003:** The same finalized event set and aggregation inputs always produce the same Usage Snapshot content.
- **SPEC-INV-USAGE-004:** Finalized Usage Snapshot content never changes under the same version.
- **SPEC-INV-USAGE-005:** Public verification never exposes detailed User-level listening history.
- **SPEC-INV-USAGE-006:** Usage verification never determines Rights Ownership or payout policy.

## State Transitions

### Playback Event

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Usage Ingestion Gateway | authenticated canonical envelope and idempotency check | `OBSERVED` | `PlaybackObserved` | reject malformed, unauthorized or conflicting replay |
| `OBSERVED` | Usage Verifier | required evidence requested and immutable event version | `VALIDATION_PENDING` | `UsageValidationStarted` | remain `OBSERVED` with reason |
| `VALIDATION_PENDING` | Usage Verifier | all policy checks pass; no duplicate or blocking dispute | `VERIFIED` | `UsageVerified` | `REJECTED`, `DISPUTED` or remain pending |
| `VERIFIED` | Fraud Reviewer / Snapshot Authority | supported material challenge | `DISPUTED` | `UsageDisputed` | retain `VERIFIED` only if threshold is not met |
| any non-final event state | Usage Verifier | conclusive failure reason | `REJECTED` | `UsageRejected` | preserve prior state if authorization fails |
| `VERIFIED`, `REJECTED` or `DISPUTED` | Snapshot Authority | authorized correction with new evidence version | `SUPERSEDED` plus new event version | `UsageCorrected` | original remains authoritative until correction activates |

### Usage Snapshot

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Snapshot Operator | valid Period ID and policy versions | `OPEN` | `UsagePeriodOpened` | reject overlap or invalid interval |
| `OPEN` | Snapshot Operator | period end and late-arrival policy reached | `CLOSING` | `UsagePeriodClosing` | remain `OPEN` |
| `CLOSING` | Snapshot Operator | frozen event set, reconciliation and candidate commitment | `CHALLENGE_WINDOW` | `UsageSnapshotProposed` | `ABORTED` on irreconcilable failure |
| `CHALLENGE_WINDOW` | Snapshot Authority | window elapsed; challenges resolved; approvals complete | `FINALIZED` | `UsageSnapshotFinalized` | remain pending or become `ABORTED` |
| `FINALIZED` | Snapshot Authority | approved correction evidence and consumer-impact plan | `CORRECTED` plus new snapshot version | `UsageSnapshotCorrected` | prior snapshot remains immutable |

## Interfaces

Equivalent operations MUST be available to authorized components:

```text
submitPlaybackEvent(event_envelope)
getPlaybackEvent(event_id, event_version)
getVerificationOutcome(event_id, event_version, policy_version)
openUsagePeriod(period_id, interval, policy_versions)
proposeUsageSnapshot(period_id, snapshot_version)
challengeUsageSnapshot(snapshot_id, challenge)
finalizeUsageSnapshot(snapshot_id)
correctUsageSnapshot(snapshot_id, correction)
getUsageSnapshot(snapshot_id, snapshot_version)
verifyUsageSnapshot(snapshot_id, snapshot_version)
```

Implementations MAY expose different transport or method names, but authorization, idempotency, privacy and state semantics MUST remain equivalent.

## Error Handling

Stable categories MUST distinguish at least:

- invalid schema, unit, timestamp, sequence or content identity;
- unauthorized or expired session context;
- conflicting idempotency replay;
- duplicate or related event;
- missing, stale or inconsistent evidence;
- verification rejection and dispute reason;
- unavailable ingestion, evidence, verifier or snapshot service;
- period closed, late event or interval mismatch;
- reconciliation, commitment or proof mismatch;
- unauthorized transition, stale version or unresolved challenge.

Client-visible errors MUST NOT reveal another User's event, identity, listening history or protected fraud signal.

## Idempotency and Replay Protection

- Ingestion idempotency MUST be scoped to the authenticated producer and canonical event payload.
- Verification MUST bind the expected event version and policy version.
- Snapshot transitions MUST bind the expected state, candidate commitment and snapshot version.
- Replayed finalization or correction commands MUST return the original result or fail without producing another finalized version.
- Cross-period or cross-context reuse of an Event ID MUST be detected according to the documented identity scope without creating a public tracking identifier.

## Audit Requirements

Audit records MUST cover:

- ingestion acceptance, rejection, throttling and idempotency conflicts;
- evidence collection and version changes;
- verification, duplicate relation, manual review and dispute;
- policy and processing-software activation;
- period opening, closing, reconciliation and event-set freeze;
- candidate commitment, challenge, approval, finalization and correction;
- snapshot access by Distribution or other privileged consumers;
- raw-event access, export, deletion and legal hold.

Audit records MUST be tamper-evident and access controlled, with public summaries separated from restricted User-level evidence.

## Versioning and Migration

- Event schema, Verification Policy, reason taxonomy, Aggregation Algorithm, commitment and proof formats MUST be independently versioned.
- A migration MUST define accepted old versions, conversion behavior, activation boundary and rollback.
- Material event corrections and every snapshot correction MUST create new versions rather than overwrite prior finalized data.
- Consumer compatibility MUST be tested before a new Usage Snapshot format becomes active.
- Historical verification MUST retain or reproducibly identify the software, configuration and evidence interpretation used.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-USAGE-001–005 | Schema / idempotency / versioning | Event identity is stable, private by scope and bound to exact evidence and policy versions |
| REQ-USAGE-006–014 | Verification / duplicate / fraud | Only corroborated events verify; duplicate, disputed and automated-review paths remain explicit and reversible |
| REQ-USAGE-015–023 | Period / property / authorization | Deterministic snapshots finalize once, bind exact inputs and use append-only correction |
| REQ-USAGE-024–030 | Challenge / availability / privacy | Challenges are traceable; outages hold finalization; User and Creator views preserve privacy |
| REQ-USAGE-031–038 | Negative / boundary | Client, Wallet, disputed data and AI never become unauthorized usage, Rights or disciplinary authority |
| REQ-USAGE-048–050 | Streaming evidence integration | Delivery evidence binds the exact authorization and content context while remaining distinct from Verified Usage |
| REQ-USAGE-051 | Negative / adapter authority | No Media Adapter counter, log or response becomes the sole authority for Verified Usage |
| REQ-USAGE-039–044 | Conformance | Implemented SHOULD behavior is verified or deviation is documented under conventions |
| REQ-USAGE-045–047 | Optional conformance | Commitments, proofs and offline evidence preserve every MUST, MUST NOT and invariant |

Property and adversarial tests MUST include duplicate retries, multi-source duplicates, reordered sequence, clock skew, forged client duration, expired sessions, stale evidence, policy-boundary events, late arrivals, concurrent close, integer overflow, sparse-group privacy, challenge/finalization races, unavailable dependencies and correction replay.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- End-to-end fixtures show one logical playback is included at most once despite retries and multi-source delivery evidence.
- Determinism tests reproduce the same aggregate and commitment across independent implementations for the same finalized inputs.
- Privacy review shows public artifacts and Creator views cannot reveal individual listening histories or stable cross-context identifiers.
- Threat modeling covers forged clients, compromised sessions, queue duplication, evidence tampering, malicious operators, model abuse and snapshot-key compromise.
- A finalized snapshot can be independently verified and consumed with the exact Rights and Distribution inputs kept separate.
- Correction exercises preserve the original snapshot and identify every affected downstream consumer.
- Operational runbooks cover ingestion backlog, evidence outage, fraud spike, missing events, privacy incident, challenge surge and failed finalization.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-USAGE-ORACLE-001:** **Decision owner:** Operating Company / Product, Privacy and Security; **Blocks:** Playback Event schema; **Question:** Which event fields and evidence sources are necessary for the first Music MVP without collecting unnecessary device or identity data?
- **OQ-USAGE-ORACLE-002:** **Decision owner:** Protocol Governance / Product and Creator Representatives; **Blocks:** first Verification Policy; **Question:** Which playback-duration, completion, entitlement and content-availability rules define valid usage for the initial service?
- **OQ-USAGE-ORACLE-003:** **Decision owner:** Operating Company / Security and Platform Engineering; **Blocks:** Event ID implementation; **Question:** Which Event ID scope and derivation prevent duplicate inclusion without enabling cross-context tracking?
- **OQ-USAGE-ORACLE-004:** **Decision owner:** Operating Company / Privacy, Legal and Security; **Blocks:** production data lifecycle; **Question:** What raw-event retention, deletion, legal-hold, access-log and breach-response rules apply in the first jurisdiction?
- **OQ-USAGE-ORACLE-005:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** snapshot finalization; **Question:** What Distribution Period, late-arrival boundary, challenge window and correction materiality threshold should launch first?
- **OQ-USAGE-ORACLE-006:** **Decision owner:** Operating Company / Trust and Safety, Legal and Support; **Blocks:** fraud-review operations; **Question:** What evidence threshold, reviewer independence, notification and appeal process apply before disputed usage is excluded?
- **OQ-USAGE-ORACLE-007:** **Decision owner:** Protocol Governance / Security and Distribution Engineering; **Blocks:** Usage Snapshot consumer interface; **Question:** Which canonical serialization, commitment and independent-verification method will the first Usage Snapshot use?
- **OQ-USAGE-ORACLE-008:** **Decision owner:** Operating Company / Product, Privacy and Creator Relations; **Blocks:** transparency launch; **Question:** Which User inclusion evidence and minimum Creator aggregate size provide useful transparency without enabling re-identification?
- **OQ-USAGE-ORACLE-009:** **Decision owner:** Operating Company / Platform, Privacy and Usage Engineering; **Blocks:** Streaming-to-Usage evidence adapter; **Question:** Which SPEC-STREAMING-001 Delivery Evidence fields and reconciliation rules are required for the first Usage Verification Policy?
