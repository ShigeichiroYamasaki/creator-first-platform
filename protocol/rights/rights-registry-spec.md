# Rights Registry and Versioned Rights State

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** rights / content  
**Specification ID:** SPEC-RIGHTS-001  
**Last Updated:** 2026-08-19

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/03-rights-and-money.md`
- Whitepaper: `docs/whitepaper/05-creator-onboarding.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0003-rights-registry.md`
- ADR: `docs/adr/ADR-0004-creator-distribution-model.md`
- ADR: `docs/adr/ADR-0009-navidrome-streaming-gateway.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define the minimum interoperable behavior for recording content identity, receiving scoped Rights Claims, producing a versioned Rights State after authorized review, preserving disputes and history, and supplying an exact Rights Snapshot to later usage and distribution processes without treating registry data as the source of legal Rights.

## Scope

This specification covers:

- separate identity for Works and Recordings;
- Rights Claim submission and evidence references;
- review, verification, activation, dispute, suspension and supersession;
- multiple Rights Types, parties, shares, territories, uses and effective periods;
- separation of Legal Rights, Platform Permissions and Distribution Instructions;
- immutable history and exact Rights Snapshots;
- public, restricted and on-chain data boundaries;
- consumer behavior when Rights State is missing, disputed or stale.

## Out of Scope

- creating, transferring or extinguishing copyright or related rights by registry operation;
- making a final legal determination about ownership or contractual validity;
- replacing contracts, courts, ADR, collective-management organizations or other rights-management systems;
- defining the Creator Distribution formula;
- verifying Playback Events or producing Usage Snapshots;
- holding or paying funds;
- selecting a blockchain, storage vendor or jurisdiction-specific contract form.

## Actors

- **Content Submitter:** proposes a Work or Recording identity and supplies descriptive metadata.
- **Claimant:** asserts a scoped Rights Claim and provides evidence.
- **Rights Reviewer:** reviews evidence within an explicitly authorized legal, contractual and operational scope.
- **Rights Authority:** the authorized corporate body or approved governance process that accepts a review outcome for Platform use.
- **Registry Operator:** applies authorized transitions without changing the decision or evidence.
- **Rights Holder:** a party represented in a verified Rights Interest; this role is not inferred from Account, Creator or Wallet status.
- **Challenger:** submits a supported dispute or correction request.
- **Registry Consumer:** a catalog, availability, usage, distribution or settlement component that binds an exact Rights Snapshot.

## Definitions

- **Work:** the abstract musical composition and lyrics, distinct from any particular Recording.
- **Recording:** a fixed performance or master recording, distinct from the underlying Work.
- **Content Identity:** a stable Platform identifier plus external identifiers and fingerprints used as evidence, not as sole proof of ownership.
- **Rights Claim:** a claimant's assertion about a specific Rights Type, content object, scope, share and effective period.
- **Rights Interest:** a reviewed representation of one party's scoped legal or contractual interest.
- **Platform Permission:** the Platform's documented permission to perform a specified use; it is related to but not identical with ownership.
- **Distribution Instruction:** a versioned instruction for allocating an amount after a Distribution Policy has calculated it; it MUST NOT silently redefine Legal Rights.
- **Rights State:** the complete versioned set of Rights Interests, Platform Permissions, restrictions, disputes and Distribution Instructions applicable to a content object at a time.
- **Rights Snapshot:** an immutable reference to the exact Rights State version consumed by another operation.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Creator registration, upload access, Account status, Wallet control and self-description are untrusted as proof of Rights Ownership.
- Metadata, identifiers, fingerprints and external database matches are evidence signals, not final legal determinations.
- Reviewers attest only to the stated scope, sources, jurisdiction, date and limitations of their review.
- Registry Operators can record an authorized outcome but cannot manufacture missing consent, evidence or authority.
- Smart contracts can enforce a versioned Rights Snapshot but cannot determine contractual validity, authorship or ownership from code alone.
- Restricted contracts, identity records and dispute evidence remain under Operating Company access controls.

## Inputs

### Content Record

- `content_id`
- `content_type` (`WORK` or `RECORDING`)
- `content_version`
- `title`
- `contributors` (descriptive, not proof of Rights)
- `external_identifiers` (optional)
- `fingerprint_references` (optional)
- `recording_of_work_ids` (required for a Recording when known and verified)
- `metadata_evidence_references`
- `created_at`

### Rights Claim

- `claim_id`
- `content_id` and `content_version`
- `claimant_party_id`
- `rights_type`
- `territory_scope`
- `use_scope`
- `share_numerator` and `share_denominator` where applicable
- `effective_from` and optional `effective_until`
- `evidence_references`
- `contract_or_authority_reference` where applicable
- `submitted_at`

### Rights Review

- reviewer identity and authority;
- review scope, jurisdiction and Rights Type;
- evidence versions reviewed;
- conclusion, limitations and unresolved conflicts;
- review and expiry time;
- decision reference and required follow-up.

## Outputs

- immutable Content Record version;
- immutable Rights Claim and review history;
- versioned Rights State and exact Rights Snapshot;
- authorized lifecycle event;
- stable conflict, unavailable, stale or unauthorized error;
- restricted evidence reference suitable for audit without public disclosure.

## State

```text
DRAFT → CLAIMED → REVIEW_PENDING → VERIFIED → ACTIVE → SUPERSEDED
   │        │            │             │         │
   ├────────┴────────────┴─────────────┴─────────┼→ REJECTED
   └─────────────────────────────────────────────┼→ WITHDRAWN
                                                 ├→ DISPUTED
                                                 └→ SUSPENDED

DISPUTED → VERIFIED | ACTIVE | SUPERSEDED | REJECTED
SUSPENDED → ACTIVE | SUPERSEDED | REJECTED
```

- `DRAFT`, `CLAIMED` and `REVIEW_PENDING` are not verified Rights States.
- `VERIFIED` means the scoped review and decision are complete but Platform use is not yet active.
- `ACTIVE` may be consumed only within its effective scope and time.
- `DISPUTED` preserves the challenged scope and stops affected automatic use according to the approved dispute policy.
- `SUSPENDED` is a temporary safety, legal or operational hold.
- `SUPERSEDED`, `REJECTED` and `WITHDRAWN` remain historically retrievable.

## Requirements

### MUST

- **REQ-RIGHTS-001:** The registry MUST assign distinct stable identities and version histories to Works and Recordings.
- **REQ-RIGHTS-002:** A Recording MUST reference each known and verified underlying Work relationship without merging the two Rights objects.
- **REQ-RIGHTS-003:** Every Rights Claim MUST identify the claimant, content version, Rights Type, territory, use, effective period, evidence versions and submission time.
- **REQ-RIGHTS-004:** A share-bearing Rights Claim MUST use integer numerator and denominator values, MUST have a positive denominator, and MUST define the scope in which the share applies.
- **REQ-RIGHTS-005:** Rights Claim creation MUST be idempotent under a stable client request identifier and MUST detect conflicting retries.
- **REQ-RIGHTS-006:** Before `VERIFIED`, a Rights Review MUST identify reviewer authority, scope, jurisdiction, evidence versions, conclusion, limitations, time and decision reference.
- **REQ-RIGHTS-007:** Verification MUST require an authorized Rights Authority decision separate from the claimant and Registry Operator for production activation.
- **REQ-RIGHTS-008:** The registry MUST represent Rights Interests by Rights Type and MUST support multiple parties and non-identical scopes for the same content.
- **REQ-RIGHTS-009:** Legal Rights, Platform Permissions and Distribution Instructions MUST remain distinguishable records with independent provenance.
- **REQ-RIGHTS-010:** A Rights State MUST identify its immutable version, effective time, included Rights Claim and review versions, applicable restrictions and superseded predecessor.
- **REQ-RIGHTS-011:** A Registry Consumer MUST bind the exact Rights Snapshot used for content availability, usage acceptance, distribution or settlement.
- **REQ-RIGHTS-012:** Rights history MUST be append-only or equivalently tamper-evident, and every prior version used by a finalized operation MUST remain retrievable.
- **REQ-RIGHTS-013:** State transitions MUST record previous state, next state, actor or authority, effective time, reason, evidence references and correlation identifier.
- **REQ-RIGHTS-014:** Conflicting claims, overlapping shares or incompatible permissions MUST produce an explicit conflict state and MUST NOT be silently resolved by last-write-wins behavior.
- **REQ-RIGHTS-015:** A supported dispute MUST identify the challenged content, Rights Type, scope, version, evidence and requested remedy.
- **REQ-RIGHTS-016:** Affected automatic distribution or new Platform use MUST stop or be held when the approved dispute policy requires it, without erasing unaffected Rights Interests.
- **REQ-RIGHTS-017:** Emergency suspension MUST use a least-privilege role, create an auditable event, preserve the prior state and require a time-bounded follow-up review.
- **REQ-RIGHTS-018:** Supersession MUST create a new Rights State version with a non-ambiguous effective boundary and MUST preserve interpretation of prior operations.
- **REQ-RIGHTS-019:** The registry MUST validate that share totals do not exceed the defined whole within the same Rights Type, territory, use and effective interval, unless an explicit conflict state prevents activation.
- **REQ-RIGHTS-020:** The registry MUST expose whether a required scope is complete, partial, disputed, expired, unavailable or not reviewed; absence MUST NOT be interpreted as permission.
- **REQ-RIGHTS-021:** Restricted identity, contracts, signatures and dispute evidence MUST use access-controlled storage and integrity-protected references.
- **REQ-RIGHTS-022:** Public records and commitments MUST minimize personal and confidential data while retaining enough identifiers to verify version and integrity.
- **REQ-RIGHTS-023:** External rights-management data MUST retain source, retrieval time, license or authority, transformation and conflict provenance.
- **REQ-RIGHTS-024:** Consumers MUST fail closed for the affected new use when the required Rights Snapshot, integrity evidence, applicable permission or current state cannot be verified.

### MUST NOT

- **REQ-RIGHTS-025:** The registry MUST NOT treat Creator registration, Account control, upload ability or Wallet control as proof of Rights Ownership.
- **REQ-RIGHTS-026:** Registry submission, verification or on-chain anchoring MUST NOT be represented as creating, transferring or finally determining legal Rights.
- **REQ-RIGHTS-027:** An unverified, rejected, withdrawn, disputed or suspended claim MUST NOT be exposed as an unrestricted active Rights Interest.
- **REQ-RIGHTS-028:** A content fingerprint, identifier, metadata match or third-party database result MUST NOT by itself establish Rights Ownership.
- **REQ-RIGHTS-029:** A Distribution Instruction MUST NOT silently change the recorded Legal Rights or Platform Permission from which it derives.
- **REQ-RIGHTS-030:** A Rights State change MUST NOT retroactively reinterpret a finalized usage, distribution or settlement operation that bound an earlier Rights Snapshot.
- **REQ-RIGHTS-031:** Personal information, full contracts, identity documents, tax information or confidential dispute materials MUST NOT be stored on a public blockchain.
- **REQ-RIGHTS-032:** The registry MUST NOT discard or conceal a material dissent, limitation, conflict or dispute from the state and audit history available to authorized reviewers.

### SHOULD

- **REQ-RIGHTS-033:** Content identity SHOULD use appropriate external identifiers and fingerprints from independent sources while preserving their provenance and limitations.
- **REQ-RIGHTS-034:** Rights Reviews SHOULD define expiry or material-change triggers for mandatory re-review.
- **REQ-RIGHTS-035:** Claimants and affected Rights Holders SHOULD receive state-change and dispute notifications through verified private channels.
- **REQ-RIGHTS-036:** Authorized parties SHOULD be able to inspect a human-readable explanation of the Rights State and the evidence scope without exposing restricted evidence publicly.
- **REQ-RIGHTS-037:** Rights Snapshot serialization and hashing SHOULD be deterministic across conforming implementations.
- **REQ-RIGHTS-038:** External-system reconciliation SHOULD detect missing, duplicated, stale and conflicting Rights records before activation.

### MAY

- **REQ-RIGHTS-039:** An implementation MAY anchor a Rights Snapshot commitment on-chain while retaining restricted source evidence off-chain.
- **REQ-RIGHTS-040:** A Rights Authority MAY approve a Rights Interest for only specified plans, regions, uses, amounts or time windows.
- **REQ-RIGHTS-041:** A consumer MAY continue an already-finalized user entitlement during a new Rights dispute only when the approved legal and operational policy explicitly permits it and blocks prohibited new use or distribution.

## Invariants

- `INV-PRIVACY-001`
- `INV-RIGHTS-001`
- `INV-RIGHTS-002`
- `INV-RIGHTS-003`
- `INV-RIGHTS-004`
- `INV-RIGHTS-005`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- `INV-EVOLUTION-003`
- **SPEC-INV-RIGHTS-001:** Work and Recording identities never collapse into one Rights object.
- **SPEC-INV-RIGHTS-002:** No unverified Rights Claim becomes an active Rights Interest without scoped review and authorized decision.
- **SPEC-INV-RIGHTS-003:** Every consuming operation can resolve the exact Rights Snapshot and effective scope it used.
- **SPEC-INV-RIGHTS-004:** A dispute or suspension preserves history and never converts an affected claim into unrestricted permission.
- **SPEC-INV-RIGHTS-005:** Registry data never represents itself as the act that creates or finally determines legal Rights.
- **SPEC-INV-RIGHTS-006:** Restricted evidence remains off-chain and access controlled even when a public commitment is published.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Content Submitter | valid content type, metadata and deduplication evidence | `DRAFT` | `ContentDrafted` | reject malformed or conflicting identity |
| `DRAFT` | Claimant | complete scoped claim and evidence manifest | `CLAIMED` | `RightsClaimSubmitted` | remain `DRAFT` with stable error |
| `CLAIMED` | Rights Reviewer | frozen claim version and review assignment | `REVIEW_PENDING` | `RightsReviewRequested` | remain `CLAIMED` |
| `REVIEW_PENDING` | Rights Authority | scoped review complete; no unresolved blocking conflict | `VERIFIED` | `RightsClaimVerified` | remain pending or become `REJECTED` |
| `VERIFIED` | Registry Operator | authorized effective time and complete Rights State version | `ACTIVE` | `RightsStateActivated` | reject unauthorized or ambiguous activation |
| `ACTIVE` | Challenger / Rights Authority | supported challenge and applicable hold policy | `DISPUTED` | `RightsStateDisputed` | retain `ACTIVE` only when challenge threshold is not met |
| `ACTIVE` | Emergency role | approved emergency condition and reason | `SUSPENDED` | `RightsStateSuspended` | fail closed if transition status is uncertain |
| `DISPUTED` or `SUSPENDED` | Rights Authority | resolved evidence, remedy and effective boundary | `ACTIVE`, `SUPERSEDED` or `REJECTED` | `RightsStateResolved` | remain held |
| `ACTIVE` | Rights Authority | authorized replacement version and effective boundary | `SUPERSEDED` | `RightsStateSuperseded` | retain prior active version until boundary |
| pre-activation | Claimant | authorized withdrawal without destruction of history | `WITHDRAWN` | `RightsClaimWithdrawn` | remain in current state |

## Interfaces

Equivalent read operations MUST be available to authorized consumers:

```text
getContent(content_id, content_version)
getRightsClaim(claim_id)
getRightsState(content_id, rights_state_version)
resolveRightsSnapshot(content_id, rights_type, territory, use, at_time)
getRightsHistory(content_id)
getDisputeStatus(content_id, rights_state_version)
```

Equivalent controlled transitions MUST be available to authorized actors:

```text
submitContent(...)
submitRightsClaim(...)
requestRightsReview(...)
recordRightsDecision(...)
activateRightsState(...)
openRightsDispute(...)
suspendRightsState(...)
resolveRightsDispute(...)
supersedeRightsState(...)
```

Implementations MAY expose different transport or method names, but semantics, authorization, idempotency and audit behavior MUST remain equivalent.

## Error Handling

Stable error categories MUST distinguish at least:

- malformed or incomplete content identity;
- duplicate or conflicting content identity;
- malformed Rights Claim or invalid share;
- missing or unverifiable evidence;
- unauthorized reviewer, authority or transition;
- overlapping or conflicting Rights scope;
- incomplete, disputed, suspended, expired or stale Rights State;
- missing required Platform Permission;
- unavailable registry or restricted evidence service;
- version, effective-time or snapshot mismatch.

Errors returned to public or claimant-facing clients MUST NOT expose another party's restricted identity, contract or dispute evidence.

## Idempotency and Replay Protection

- Content and claim submission MUST accept stable request identifiers scoped to the authorized actor.
- Replaying the same request with the same canonical payload MUST return the original result or an equivalent reference.
- Reusing an identifier with a different payload MUST fail as a conflict.
- Review, activation, dispute, suspension and supersession commands MUST bind the expected current version and reject stale replay.
- Transition correlation identifiers MUST remain unique within their operation context.

## Audit Requirements

Audit records MUST cover:

- content identity creation, merge proposals and rejected duplicates;
- claim creation, evidence-version changes and withdrawal;
- reviewer assignment, review result, limitation and expiry;
- authority decisions and operator execution;
- activation, dispute, hold, suspension, resolution and supersession;
- every Rights Snapshot supplied to a consumer;
- restricted-evidence access and export;
- external source ingestion and reconciliation results.

Audit access MUST be role-limited, tamper-evident and retained according to an approved legal, privacy and operational schedule.

## Versioning and Migration

- Content, Claim, Review, Rights State, Platform Permission and Distribution Instruction versions MUST be independently identifiable.
- Material changes MUST create a new version rather than overwrite a finalized record.
- Migration MUST map every prior identifier and effective interval without ambiguous overlap.
- Consumer compatibility MUST be tested before a new serialization or snapshot version becomes active.
- Rollback MUST create a new authorized transition; it MUST NOT delete the failed or superseded history.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-RIGHTS-001–005 | Identity / property / idempotency | Work and Recording remain distinct; scoped shares validate; retries cannot duplicate or mutate claims |
| REQ-RIGHTS-006–013 | Authorization / versioning / audit | Only scoped review and authority create a traceable versioned state and exact snapshot |
| REQ-RIGHTS-014–020 | Conflict / dispute / boundary | Conflicts are explicit, affected use is held, shares and scope fail closed |
| REQ-RIGHTS-021–024 | Privacy / provenance / availability | Restricted evidence stays protected and missing or stale state cannot authorize new use |
| REQ-RIGHTS-025–032 | Negative / legal boundary | Account, Wallet, upload, metadata or anchoring never prove Rights; history and disputes cannot be rewritten or hidden |
| REQ-RIGHTS-033–038 | Conformance | Implemented SHOULD behavior is verified or deviation is documented under conventions |
| REQ-RIGHTS-039–041 | Optional conformance | Anchoring, scoped approval or continuity preserves every MUST, MUST NOT and invariant |

Property and adversarial tests MUST include concurrent claims, duplicate identifiers, overlapping intervals, numerator overflow, zero denominator, total shares above the defined whole, stale-version transitions, reviewer self-approval, restricted-evidence disclosure, dispute races and supersession-boundary replay.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- Work and Recording fixtures prove separate identity, relationship and Rights Types.
- Concurrent and conflicting claim tests never yield silent last-write-wins activation.
- Authorization tests prove claimant, reviewer, Rights Authority and Registry Operator duties are separated for production activation.
- Snapshot tests reproduce historical availability and distribution inputs after later dispute or supersession.
- Privacy review proves public data and on-chain commitments contain no prohibited personal or confidential evidence.
- Legal and rights-operations review approves the concrete first-jurisdiction evidence, permission, dispute and retention procedures.
- Operational runbooks cover duplicate content, false claim, conflicting shares, urgent takedown, dispute, reviewer error, external-system outage and data-rights requests.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-RIGHTS-REGISTRY-001:** **Decision owner:** Operating Company / Legal and Rights Operations; **Blocks:** first-jurisdiction Rights review; **Question:** Which Rights Types, territories, uses and evidence standards will the first catalog support?
- **OQ-RIGHTS-REGISTRY-002:** **Decision owner:** Operating Company / Rights Operations and Product; **Blocks:** content identity ingestion; **Question:** Which Work, Recording, contributor and external identifier fields are mandatory at initial submission?
- **OQ-RIGHTS-REGISTRY-003:** **Decision owner:** Operating Company / Legal, Privacy and Security; **Blocks:** production evidence storage; **Question:** Which evidence classes, retention periods, access roles and legal-hold rules apply in the first jurisdiction?
- **OQ-RIGHTS-REGISTRY-004:** **Decision owner:** Operating Company / Legal and Rights Operations; **Blocks:** production claim verification; **Question:** Which body acts as Rights Authority and what independence or multi-party approval is required before full Protocol Governance exists?
- **OQ-RIGHTS-REGISTRY-005:** **Decision owner:** Operating Company / Legal, Support and Rights Operations; **Blocks:** dispute launch; **Question:** What evidence threshold, response period, temporary hold and appeal process apply to each dispute type?
- **OQ-RIGHTS-REGISTRY-006:** **Decision owner:** Protocol Governance / Rights Operations and Distribution Engineering; **Blocks:** Rights Snapshot consumer contract; **Question:** How are partial, unknown and disputed shares represented for catalog availability and later distribution?
- **OQ-RIGHTS-REGISTRY-007:** **Decision owner:** Operating Company / Legal and External Partnerships; **Blocks:** external rights-system integration; **Question:** Which collective-management, publisher, label or identifier sources are authoritative enough for the first reconciliation adapter?
- **OQ-RIGHTS-REGISTRY-008:** **Decision owner:** Operating Company / Product, Legal and Rights Operations; **Blocks:** existing-listener continuity policy; **Question:** When may existing access continue after a new dispute or suspension, and which new uses or distributions must stop immediately?
