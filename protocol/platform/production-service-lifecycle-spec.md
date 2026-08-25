# Production Service Lifecycle and Cross-Domain Orchestration

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** platform / production / orchestration  
**Specification ID:** SPEC-PLATFORM-001  
**Last Updated:** 2026-08-24

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/04-platform-architecture.md`
- Whitepaper: `docs/whitepaper/05-creator-onboarding.md`
- Whitepaper: `docs/whitepaper/07-governance.md`
- Whitepaper: `docs/whitepaper/08-discovery-community.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- Whitepaper: `docs/whitepaper/13-roadmap.md`
- ADR: `docs/adr/ADR-0018-production-service-architecture.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/wallet-linking-spec.md`
- `protocol/account/subscription-settlement-spec.md`
- `protocol/account/early-supporter-credential-spec.md`
- `protocol/rights/rights-registry-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/streaming/player-client-spec.md`
- `protocol/usage/playback-verification-spec.md`
- `protocol/distribution/creator-allocation-spec.md`
- `protocol/governance/contract-change-governance-spec.md`
- `protocol/zk/transparent-proof-verification-spec.md`
- `protocol/conventions.md`
- `protocol/invariants.md`

## Goal

Define the production lifecycle that connects User registration, Creator onboarding, Rights-approved catalog publication, Subscription use, Supporter and Community participation, Usage verification, Distribution and bicameral Governance without collapsing their authorities or sources of truth.

## Current Implementation Conformance

The GitHub Pages demos, local Player/Gateway/Navidrome stack and Polygon Amoy contracts are test-only partial implementations. They do not implement this specification: they lack production Account authentication and recovery, verified Creator and Rights operations, production payment and accounting, Community moderation, governance eligibility and sortition, end-to-end indexing, operational key separation, disaster recovery and independent audit. Testnet records MUST NOT be imported as production authority.

## Scope

- production service boundaries and authoritative records;
- cross-domain lifecycle coordination and consistency;
- User, Creator, content, Subscription, playback, Supporter and Community journeys;
- governance eligibility and execution hand-off;
- event delivery, reconciliation, failure isolation and audit;
- production deployment, migration and launch gates.

## Out of Scope

- final vendor, cloud, chain, L2, identity provider or media-server selection;
- jurisdiction-specific contract wording, taxes or retention periods;
- detailed recommendation algorithms and Community content policy;
- final governance seat counts, thresholds or election schedule;
- final fee, distribution or Subscription price parameters.

## Actors

- **User:** an Account Holder using discovery, playback, support and Community functions.
- **Creator Applicant:** an Account Holder applying for Creator functions.
- **Creator:** an approved artist-direct Creator with a current scoped credential.
- **Rights Operator:** the Operating Company role reviewing Rights and release authority.
- **Community Member:** an Account Holder with current scope-specific Community eligibility.
- **Governance Member and Representative:** an eligible person or term-limited selected legislator.
- **Operating Company:** the corporation responsible for contracts, rights operations, accounting, tax, employment, privacy, support and legal compliance.
- **Domain Services:** Account, Creator, Rights, Catalog, Subscription, Community, Usage, Distribution and Governance services.
- **Gateway:** the only public authorization boundary for application and media access.
- **Indexer and Reconciliation Service:** derives read models and detects cross-domain divergence.

## Authoritative Records

| Record | Authority | Required distinction |
| --- | --- | --- |
| Platform Account and authenticators | Account Service | not Wallet, Person or Legal Identity |
| Legal Identity, contracts and tax evidence | restricted Operating Company systems | not public-chain data |
| Creator status | Creator Service | not Rights ownership |
| Rights State and release permission | Rights Registry | not Creator registration |
| Subscription State | Subscription Service after approved settlement | not client or token balance alone |
| Community membership and moderation state | Community Service | not SBT possession alone |
| Governance eligibility and term | Eligibility Registry and Governance protocol | not economic holdings |
| Verified Usage Snapshot | Usage Service | not raw client events |
| Distribution obligation and payment | Distribution Ledger and corporate accounting | not proof acceptance alone |

## Lifecycle

```text
Account ACTIVE
  ├─ Subscription ACTIVE → authorized playback → verified usage
  ├─ Creator application → Creator APPROVED → Rights VERIFIED → Release PUBLISHED
  ├─ support intent → Credential ACTIVE → Community capability
  └─ eligibility → selection/participation → Governance execution

Verified usage + finalized revenue + Rights snapshot
  → Distribution obligation → corporate settlement → public reconciliation
```

Each branch has an independent state machine. A transition in one branch MUST NOT silently advance another branch.

## Requirements

### MUST

- **REQ-PLATFORM-001:** Production MUST use accounts, keys, networks, contracts, storage, credentials, roles and monitoring separated from every testnet environment.
- **REQ-PLATFORM-002:** Each authoritative record MUST have one named owning service, stable identifier, schema version, state version and auditable lifecycle.
- **REQ-PLATFORM-003:** Cross-domain references MUST use opaque stable identifiers and explicit versions rather than email addresses, Wallet addresses, file paths or vendor identifiers as shared primary keys.
- **REQ-PLATFORM-004:** Account activation MUST satisfy `SPEC-ACCOUNT-003` before paid, Creator, Community or Governance application functions are enabled.
- **REQ-PLATFORM-005:** Wallet linking MUST remain optional for ordinary Account registration and playback and MUST follow `SPEC-ACCOUNT-002` for every on-chain operation.
- **REQ-PLATFORM-006:** Creator approval MUST separately verify current Account state, artist-direct eligibility, Legal Identity, applicable contract, payout beneficiary and tax/compliance readiness under versioned policies.
- **REQ-PLATFORM-007:** Creator approval MUST NOT activate a release until Work, Recording, contributor, territorial, temporal and distribution Rights are verified under `SPEC-RIGHTS-001`.
- **REQ-PLATFORM-008:** Catalog publication MUST bind the exact Rights State, media version, metadata version, availability policy and takedown state used for authorization.
- **REQ-PLATFORM-009:** Subscription activation MUST follow approved-asset settlement and finality rules and MUST reconcile the protocol receipt, Subscription Service and corporate accounting record.
- **REQ-PLATFORM-010:** Playback MUST be authorized by the Gateway from current Account, Subscription, Rights, Credential and policy state and MUST use short-lived scope-bound media access.
- **REQ-PLATFORM-011:** Public clients MUST access private media only through the Gateway and MUST NOT receive reusable Navidrome or media-origin credentials.
- **REQ-PLATFORM-012:** Supporter credential issuance MUST require explicit scoped intent and consent, and Community capability MUST evaluate current credential, revocation, scope, moderation state and policy version.
- **REQ-PLATFORM-013:** Community membership, roles, posting, moderation, appeal and exit MUST have an auditable lifecycle independent from token ownership.
- **REQ-PLATFORM-014:** Governance eligibility MUST derive from current approved Community and identity rules, prevent duplicate-person influence and remain separate from Subscription, SBT and economic holdings.
- **REQ-PLATFORM-015:** A Representative credential or SBT MUST be term-limited, publicly interpretable, revocable and display-only unless the Governance protocol independently confirms current authority.
- **REQ-PLATFORM-016:** Governance execution MUST require the exact bicamerally approved manifest, implementation evidence, required corporate legal review and timelock controls defined by `SPEC-GOVERNANCE-001`.
- **REQ-PLATFORM-017:** Playback evidence MUST be deduplicated, fraud-reviewed and finalized under `SPEC-USAGE-001` before normal Distribution input.
- **REQ-PLATFORM-018:** Distribution MUST bind finalized revenue, Verified Usage, Rights State, policy and accounting period and MUST reconcile each obligation, hold, tax treatment and payment status.
- **REQ-PLATFORM-019:** Every cross-domain command MUST carry an idempotency key, actor, authorization context, correlation identifier, source state version and policy version.
- **REQ-PLATFORM-020:** Every authoritative mutation MUST atomically persist its state change and durable event intent, and every consumer MUST deduplicate redelivery.
- **REQ-PLATFORM-021:** Read models and blockchain indexers MUST identify source, chain, contract, block/finality, schema and last reconciled position and MUST expose stale or uncertain state.
- **REQ-PLATFORM-022:** Reconciliation MUST detect and quarantine divergence among settlement, Subscription, Rights, Usage, Distribution, treasury and corporate accounting records without silently rewriting finalized history.
- **REQ-PLATFORM-023:** Personal data, contracts, tax records, authenticator secrets, detailed listening history, Community private content and moderation evidence MUST remain in access-controlled systems under retention and legal-hold policies.
- **REQ-PLATFORM-024:** Production roles and keys MUST apply least privilege and separation of duties so no single ordinary operator can both approve and execute contract upgrades, treasury transfers or finalized Distribution changes.
- **REQ-PLATFORM-025:** Production launch MUST pass approved legal, rights, tax, privacy, security, operational, accessibility, load, recovery, incident-response and independent-audit gates with public non-sensitive evidence.

### MUST NOT

- **REQ-PLATFORM-026:** Testnet Accounts, profiles, balances, credentials, SBTs, governance membership, votes, proofs, keys or contract addresses MUST NOT become production authority.
- **REQ-PLATFORM-027:** Creator registration MUST NOT be treated as Rights ownership, release authorization, payout approval or governance eligibility.
- **REQ-PLATFORM-028:** A Wallet signature, token balance, SBT, client flag, Community role or blockchain event alone MUST NOT authorize every related off-chain capability.
- **REQ-PLATFORM-029:** Failure or uncertainty in payment, Rights, entitlement, governance execution or Distribution authority MUST NOT fail open.
- **REQ-PLATFORM-030:** Accepted proofs, successful playback, media byte delivery or raw Usage Events MUST NOT alone create a Distribution or payment obligation.
- **REQ-PLATFORM-031:** Emergency authority MUST NOT replace an approved manifest, change a verifier or Rights/Distribution result, transfer unrestricted funds or erase audit history.
- **REQ-PLATFORM-032:** A production migration MUST NOT claim completion while unresolved references, in-flight financial operations, unreconciled events, legal holds or untested rollback/forward-repair paths remain.

### SHOULD

- **REQ-PLATFORM-033:** Public application traffic SHOULD use a CDN/WAF and API Gateway, while domain services and media origins remain on private networks.
- **REQ-PLATFORM-034:** High-risk services SHOULD use independent deployment cells, queues and circuit breakers to limit cascading failure.
- **REQ-PLATFORM-035:** Users and Creators SHOULD receive a unified activity view that distinguishes pending, verified, finalized, disputed, revoked and paid states.
- **REQ-PLATFORM-036:** Community and recommendation services SHOULD minimize cross-context tracking and offer understandable control, appeal and export paths.

### MAY

- **REQ-PLATFORM-037:** Gas sponsorship or account abstraction MAY hide routine blockchain complexity when limits, abuse controls, receipts and user consent remain explicit.
- **REQ-PLATFORM-038:** Multiple media adapters, payment networks or proof systems MAY coexist behind versioned profiles without changing canonical Account, Track, Rights, Usage or Distribution identifiers.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-IDENTITY-004`
- `INV-GOVERNANCE-001`
- `INV-GOVERNANCE-004`
- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-RIGHTS-001`
- `INV-RIGHTS-002`
- `INV-USAGE-001`
- `INV-DELIVERY-001`
- `INV-DISTRIBUTION-001`
- `INV-EVOLUTION-001`
- **SPEC-INV-PLATFORM-001:** No cross-domain lifecycle transition silently grants authority owned by another domain.
- **SPEC-INV-PLATFORM-002:** Every production financial result is reconcilable to corporate accounting and its applicable protocol evidence.
- **SPEC-INV-PLATFORM-003:** Testnet state never becomes production authority through migration, configuration or operator action.
- **SPEC-INV-PLATFORM-004:** Public transparency never requires publishing personal data, contracts, tax evidence or detailed listening history.
- **SPEC-INV-PLATFORM-005:** A degraded dependency never broadens payment, Rights, playback, Community, Governance or Distribution authorization.

## Cross-Domain Transitions

| Trigger | Required authoritative states | Result | Failure behavior |
| --- | --- | --- | --- |
| complete User registration | Account registration policy and authenticator verified | Account `ACTIVE` | remain non-active |
| approve Creator | Account active; identity, contract, beneficiary and compliance complete | Creator `APPROVED` | keep application pending/rejected |
| publish release | Creator current; Rights and media versions approved | Release `PUBLISHED` | quarantine; no stream access |
| activate Subscription | approved asset settlement final; accounting reference created | Subscription `ACTIVE` | pending/failed; no paid access |
| authorize playback | Account, Subscription, Rights and applicable capability current | short-lived Playback Session | deny or safe retry |
| join Community | Account current; scope policy and required consent satisfied | membership/capabilities issued | no capability |
| exercise governance | eligibility and current term independently confirmed | vote/proposal action accepted | reject and audit |
| finalize Distribution | revenue, usage, Rights and policy snapshots finalized | immutable obligation set | hold period; no payout |

## Interfaces

Equivalent orchestration and query operations MUST be available:

```text
getJourneyState(subject_id, journey_type)
requestCreatorReview(account_id, application_version, idempotency_key)
requestReleasePublication(release_id, rights_version, media_version, idempotency_key)
activateSubscription(settlement_reference, idempotency_key)
issuePlaybackSession(account_session, track_id, capability_context)
requestCommunityMembership(account_id, community_scope, policy_version)
resolveGovernanceAuthority(account_id, session_id, action)
finalizeDistribution(period_id, revenue_version, usage_version, rights_version, policy_version)
reconcileDomain(reference_type, reference_id)
getAuditTimeline(correlation_id)
```

## Failure Handling

- Account or authorization uncertainty denies new protected actions.
- Rights uncertainty disables new publication and playback for the affected scope while preserving evidence and appeal.
- Payment uncertainty remains pending and cannot activate Subscription twice.
- Media-origin failure may retry or fail over without weakening authorization or fabricating Usage.
- Community-service failure denies new privileged actions but does not silently revoke unrelated Subscription access.
- Indexer lag is displayed and prevents finality-dependent operations.
- Distribution or accounting divergence places affected amounts on hold and never reallocates them silently.
- Governance service failure cannot execute an unverified or substituted operation.

## Audit and Reconciliation

Audit evidence MUST reconstruct the initiating actor, Account/role context, exact state and policy versions, approvals, service events, blockchain receipts, retries, reconciliation results and final outcome. Public audit views use commitments and aggregates; restricted evidence remains access-controlled. Reconciliation jobs MUST be repeatable, idempotent and preserve corrections as new versioned entries.

## Production Deployment and Migration

- Production begins from explicit genesis configuration and approved import sets; testnet transaction history is evidence only.
- Every service and contract deployment identifies artifact digest, source commit, environment, approvers, key/role assignment and rollback or forward-repair procedure.
- Database and protocol migrations use compatibility windows, dual-read/write only where proven safe, reconciliation checkpoints and irreversible-step approval.
- Contract upgrades use immutable manifests and timelocks; emergency pause is separate from upgrade and treasury authority.
- Backup restoration, regional failover, queue replay, indexer rebuild and key rotation are exercised before launch and periodically thereafter.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-PLATFORM-001–005 | Environment / identity / integration | Production isolation, authoritative ownership, stable references, Account and Wallet boundaries hold |
| REQ-PLATFORM-006–011 | Creator / Rights / payment / streaming E2E | Creator and Rights stay separate; settlement and Playback Session bind exact approved states |
| REQ-PLATFORM-012–016 | Credential / Community / governance E2E | Consent, moderation, eligibility, term and exact-manifest execution are independently enforced |
| REQ-PLATFORM-017–022 | Usage / Distribution / events / reconciliation | Only finalized inputs distribute; retries deduplicate; divergence is detected and quarantined |
| REQ-PLATFORM-023–025 | Privacy / access / launch gate | Restricted data stays off-chain; duties are separated; launch evidence is complete |
| REQ-PLATFORM-026–029 | Negative migration / authorization / failure | Testnet and single signals never become authority; uncertain protected actions fail closed |
| REQ-PLATFORM-030–032 | Negative financial / emergency / migration | No unsupported obligation, authority expansion or incomplete migration can finalize |
| REQ-PLATFORM-033–036 | Architecture / UX conformance | Implemented SHOULD behavior is tested or deviation documented |
| REQ-PLATFORM-037–038 | Optional profile conformance | Optional sponsorship and adapters preserve all identifiers, controls and invariants |

Tests MUST include duplicate/reordered events, partial outages, stale indexers, reorg/finality changes, Account takeover, Wallet rotation, Rights takedown, payment reversal, Credential revocation, moderation appeal, expired legislative term, manifest substitution, Distribution dispute, backup restoration and regional failover.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has passing traceability across service, contract and operational tests.
- A staging production-like environment completes all lifecycle journeys with synthetic data and isolated keys.
- Failure injection proves no dependency outage broadens authorization or creates duplicate financial effects.
- Reconciliation proves every finalized settlement and Distribution result against corporate accounting records.
- Independent security and privacy reviews close critical and high findings or record approved bounded exceptions.
- Legal, Rights, tax, operations and governance owners approve the launch evidence applicable to their authority.
- Testnet-to-production isolation is demonstrated by configuration, key inventory, database and contract checks.

## Open Questions

- **OQ-PLATFORM-001:** **Decision owner:** Operating Company / Product, Architecture and Security; **Blocks:** production topology; **Question:** Which cloud regions, deployment cells, service boundaries and recovery objectives apply at launch?
- **OQ-PLATFORM-002:** **Decision owner:** Operating Company / Legal, Payments and Accounting; **Blocks:** production Subscription launch; **Question:** Which JPYC product, network, transfer model, refund route and accounting treatment are approved?
- **OQ-PLATFORM-003:** **Decision owner:** Operating Company / Rights and Legal; **Blocks:** Creator and catalog launch; **Question:** Which evidence, contracts, external rights-management relationships and review service levels establish Creator and release readiness?
- **OQ-PLATFORM-004:** **Decision owner:** Protocol Governance / Community, Trust and Safety and Privacy; **Blocks:** Community launch; **Question:** Which Community eligibility, moderation, appeal, privacy and exit policies apply to each scope?
- **OQ-PLATFORM-005:** **Decision owner:** Protocol Governance and Operating Company / Legal and Security; **Blocks:** production governance authority; **Question:** Which eligibility, sortition, term, direct-vote, corporate review and emergency parameters receive production authority first?
- **OQ-PLATFORM-006:** **Decision owner:** Operating Company / Operations, Security and Finance; **Blocks:** production launch; **Question:** What evidence, thresholds and named authorities approve or stop each progressive rollout stage?
