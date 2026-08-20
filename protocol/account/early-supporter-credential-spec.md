# Early Supporter Credential and Privilege

**Status:** Draft
**Version:** 0.1.0
**Protocol Domain:** account / credential / entitlement
**Specification ID:** SPEC-ACCOUNT-004
**Last Updated:** 2026-08-20

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/04-platform-architecture.md`
- Whitepaper: `docs/whitepaper/08-discovery-community.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0008-account-wallet-identity-strategy.md`
- ADR: `docs/adr/ADR-0010-early-supporter-sbt-privileges.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/wallet-linking-spec.md`
- `protocol/account/subscription-settlement-spec.md`
- `protocol/rights/rights-registry-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define an implementation-independent lifecycle for a consensual, non-transferable Early Supporter Credential and convert its verified state into bounded, versioned service privileges without replacing Subscription, Rights or Account authorization.

## Scope

This specification covers:

- qualification, consent, issuance, uniqueness and non-transferability;
- issuer and deployment approval;
- active, revoked and burned status;
- Wallet Link binding, recovery and reissuance;
- reorganization-aware Credential Read Models;
- versioned Privilege Policy inputs for Streaming Authorization;
- privacy, audit, incident suspension and STO separation.

## Out of Scope

- defining financial instruments, STO offering terms or shareholder rights;
- Subscription payment and activation;
- determining Rights Ownership or content license validity;
- direct media delivery and Playback Session transport;
- Governance eligibility or voting power;
- monetary Creator Distribution;
- guaranteeing one Wallet or Account per Person.

## Actors

- **Candidate Supporter:** requests or accepts issuance after satisfying a Qualification Policy.
- **Credential Issuer:** authorized role that verifies qualification and issues, revokes or participates in recovery under policy.
- **Account Service:** maintains Platform Account, Wallet Link and recovery state.
- **Credential Contract:** approved non-transferable token deployment emitting lifecycle events.
- **Credential Indexer:** constructs a confirmed, reorganization-aware Credential Read Model.
- **Privilege Policy Authority:** activates versioned mappings from eligible Credential classes to bounded service privileges.
- **Playback Authorization Gateway:** consumes Credential and Privilege snapshots together with Subscription and Rights inputs.
- **Operating Company:** owns legal terms, consumer support, privacy, accounting, tax and regulatory controls.

## Definitions

- **Early Supporter Credential:** an issuer assertion that a linked Wallet satisfied an approved early-support condition for a bounded Creator or Community scope.
- **Qualification Policy:** versioned rules defining eligible action, evidence, interval, scope, uniqueness, abuse treatment and appeal.
- **Credential Deployment:** exact Chain ID, Contract Address, bytecode or implementation version, token standard profile and approved issuer configuration.
- **Credential Status:** `PENDING_CONSENT`, `ACTIVE`, `REVOKED` or `BURNED` with an effective version and time.
- **Privilege Policy:** versioned authorization overlay mapping eligible Credential classes and scopes to bounded product capabilities.
- **Credential Read Model:** off-chain projection of confirmed Credential events and approved policy state, including source and freshness evidence.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- A Wallet signature proves control only in the verified context; it does not prove a Person, qualification or continuing entitlement.
- Token ownership returned by an arbitrary contract or chain is untrusted until the exact Credential Deployment and issuer are approved.
- Client claims, token metadata, block-explorer labels and Navidrome user records are not authorization authorities.
- Indexer state may be stale, reorganized, incomplete or derived from a superseded Contract or Policy.
- Operating roles may make mistakes or be compromised; issuance, revocation and policy changes require least privilege and audit.

## Inputs

- authenticated Platform Session and Account state;
- purpose-bound active Wallet Link and proof context;
- Candidate Wallet, approved Credential Deployment and receiver consent;
- Qualification Policy ID, version, Creator or Community scope and evidence reference;
- confirmed Contract events with block provenance and finality classification;
- Privilege Policy ID, version, activation window and bounded capability definition;
- recovery, revocation, burn, incident and appeal decisions from authorized actors.

## Outputs

- immutable qualification and consent decision;
- Credential issuance, revocation, burn or reissuance event reference;
- versioned Credential Record and Credential Read Model snapshot;
- active or denied Privilege Evaluation input with stable reason code;
- privacy-restricted audit reference.

## State

```text
PENDING_CONSENT → ACTIVE → REVOKED
                     └──→ BURNED

REVOKED or BURNED → new PENDING_CONSENT record for recovery reissuance
```

Reissuance creates a new Credential identity. It MUST NOT reactivate or transfer the old Token ID.

## Requirements

### MUST

- **REQ-EARLY-SUPPORTER-001:** Every Credential Record MUST bind the exact Credential Deployment, Token ID, issuer, Credential type, Qualification Policy ID and version, scope, holder Wallet, source event, status version and effective time.
- **REQ-EARLY-SUPPORTER-002:** Issuance, revocation, burn and reissuance MUST be accepted only from roles authorized for the exact Credential Deployment and Policy version.
- **REQ-EARLY-SUPPORTER-003:** Qualification MUST use a versioned Policy defining eligible evidence, interval, Creator or Community scope, uniqueness, abuse treatment and appeal path.
- **REQ-EARLY-SUPPORTER-004:** Issuance MUST require an authenticated Account, active purpose-bound Wallet Link, current proof of Wallet control and an explicit receiver consent record describing public visibility, metadata, burn authority and recovery behavior.
- **REQ-EARLY-SUPPORTER-005:** Issuance MUST be idempotent for the same Credential type, Qualification identity, scope, Policy version and recipient; conflicting duplicate issuance MUST fail.
- **REQ-EARLY-SUPPORTER-006:** An active Early Supporter SBT MUST be non-transferable, and conformance tests MUST verify both its declared interface and rejection of every applicable transfer path.
- **REQ-EARLY-SUPPORTER-007:** Credential Status transitions MUST be monotonic for one Token ID, versioned, time-bound and auditable; a revoked or burned Token ID MUST NOT return to `ACTIVE`.
- **REQ-EARLY-SUPPORTER-008:** A Credential used for a Platform Account MUST bind an active Wallet Link with the approved access-privilege purpose and exact chain context.
- **REQ-EARLY-SUPPORTER-009:** Wallet recovery or rotation MUST revoke or burn the old Credential before a replacement becomes active and MUST link old and new records through a privacy-restricted audit reference.
- **REQ-EARLY-SUPPORTER-010:** The Credential Indexer MUST retain Chain ID, Contract Address, block number, block hash, transaction hash, log index, finality, ingestion time and reorganization status for every derived lifecycle state.
- **REQ-EARLY-SUPPORTER-011:** Every Privilege Policy MUST be independently versioned and bind eligible Credential type, issuer, scope, Plan constraints, content or capability scope, territory, activation interval and emergency suspension state.
- **REQ-EARLY-SUPPORTER-012:** A Privilege Evaluation MUST bind the exact Account, Wallet Link, Credential Record version, Privilege Policy version, evaluation time and requested capability.
- **REQ-EARLY-SUPPORTER-013:** A Streaming privilege MUST be evaluated only together with an active Subscription and applicable active Rights State; the Credential MUST NOT replace either authority.
- **REQ-EARLY-SUPPORTER-014:** New Privilege Evaluations MUST fail closed when Account, Wallet Link, Credential, Contract approval, Policy, Subscription or Rights state is unavailable, stale beyond policy, suspended or reorganization-unsafe.
- **REQ-EARLY-SUPPORTER-015:** Credential and Privilege audit data MUST minimize personal data, separate public chain facts from restricted Account mappings and follow approved retention and access controls.

### MUST NOT

- **REQ-EARLY-SUPPORTER-016:** Personal information, Legal Identity, support amount, detailed listening history, authentication secrets or private recovery evidence MUST NOT be stored in public token metadata or public Contract events.
- **REQ-EARLY-SUPPORTER-017:** Wallet control, SBT ownership, token balance, client claims or a media-server account MUST NOT by itself authorize playback or another protected service operation.
- **REQ-EARLY-SUPPORTER-018:** The Credential MUST NOT represent or automatically grant Security Token rights, shareholder rights, repayment, revenue distribution, monetary return or Protocol Governance voting power.
- **REQ-EARLY-SUPPORTER-019:** A later Qualification or Privilege Policy version MUST NOT silently rewrite the meaning or audit interpretation of a historical issuance or authorization decision.
- **REQ-EARLY-SUPPORTER-020:** Reissuance, multiple Wallets or multiple Accounts MUST NOT silently multiply one Qualification into concurrent active privileges beyond the approved uniqueness policy.
- **REQ-EARLY-SUPPORTER-021:** Navidrome, another Media Adapter, a CDN or an arbitrary token contract MUST NOT become the authority for Credential validity or Privilege activation.

### SHOULD

- **REQ-EARLY-SUPPORTER-022:** An EVM SBT implementation SHOULD expose the final ERC-5192 interface unless a documented alternative provides equivalent non-transferability detection and tests.
- **REQ-EARLY-SUPPORTER-023:** Deployments SHOULD evaluate ERC-5484 where receiver consent, immutable burn authorization and key rotation semantics fit the approved lifecycle.
- **REQ-EARLY-SUPPORTER-024:** Playback paths SHOULD consume a reorganization-aware Credential Read Model rather than perform synchronous chain RPC for every request.
- **REQ-EARLY-SUPPORTER-025:** Metrics SHOULD expose issuance, denial, revocation and propagation health without public Account, Wallet-to-listening-history or protected Creator-affinity labels.

### MAY

- **REQ-EARLY-SUPPORTER-026:** A future implementation MAY replace public ownership disclosure with a privacy-preserving Credential proof if it preserves issuer, status, uniqueness, scope, expiry, revocation and audit requirements.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-IDENTITY-003`
- `INV-IDENTITY-004`
- `INV-GOVERNANCE-001`
- `INV-PRIVACY-001`
- `INV-PRIVACY-003`
- `INV-DELIVERY-001`
- `INV-DELIVERY-002`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- **SPEC-INV-EARLY-SUPPORTER-001:** One Token ID never returns to active after revocation or burn.
- **SPEC-INV-EARLY-SUPPORTER-002:** One qualification never creates more concurrent active privilege than its approved uniqueness rule.
- **SPEC-INV-EARLY-SUPPORTER-003:** Credential ownership never replaces Subscription or Rights authorization.
- **SPEC-INV-EARLY-SUPPORTER-004:** Recovery creates a new Credential while preserving an auditable invalidation boundary for the old Credential.
- **SPEC-INV-EARLY-SUPPORTER-005:** STO, revenue and governance rights never arise solely from this Credential.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Candidate / Account Service | authenticated Account, Wallet Link, Qualification, disclosure | `PENDING_CONSENT` | `CredentialConsentRequested` | create no issuance authority |
| `PENDING_CONSENT` | Candidate / Issuer | exact consent, current Wallet proof, approved deployment and issuer | `ACTIVE` | `EarlySupporterCredentialIssued` | reject without partial activation |
| `ACTIVE` | authorized revoker | applicable policy or incident decision | `REVOKED` | `EarlySupporterCredentialRevoked` | preserve active state if command is unauthorized |
| `ACTIVE` | authorized burner | approved burn authority and exact Token ID | `BURNED` | Contract burn plus indexed status event | preserve active state if burn fails |
| `REVOKED` or `BURNED` | Candidate / Issuer | completed recovery, old invalidation, new Wallet Link and consent | new `PENDING_CONSENT` record | `CredentialReissuanceRequested` | old Credential remains invalid |

## Interfaces

Equivalent operations MUST be available to authorized components:

```text
requestCredentialConsent(account_id, wallet_link_id, qualification_ref, policy_version)
issueCredential(consent_id, deployment_id, idempotency_key)
revokeCredential(credential_id, reason, authorization)
burnCredential(credential_id, reason, authorization)
requestCredentialReissuance(old_credential_id, new_wallet_link_id, recovery_ref)
getCredentialSnapshot(account_id, credential_type, scope)
evaluatePrivilege(account_id, requested_capability, policy_version)
```

## Error Conditions

| Error ID | Condition | Required behavior |
| --- | --- | --- |
| `CONSENT_REQUIRED` | valid receiver consent is missing or mismatched | deny issuance |
| `QUALIFICATION_INVALID` | evidence, scope or interval does not satisfy Policy | deny issuance |
| `DUPLICATE_QUALIFICATION` | uniqueness rule would be exceeded | return existing result or reject conflict |
| `TRANSFER_PROHIBITED` | a transfer path is invoked | revert or reject without changing ownership |
| `CREDENTIAL_INACTIVE` | Credential is revoked, burned or unknown | deny privilege |
| `CREDENTIAL_STATE_STALE` | Read Model freshness or reorganization safety fails | fail closed for new privilege |
| `PRIVILEGE_SCOPE_MISMATCH` | Creator, content, Plan, territory, interval or capability differs | deny with non-sensitive reason |
| `RECOVERY_INCOMPLETE` | old Credential is not invalidated or new Wallet Link is not approved | deny reissuance activation |

## Security Requirements

- Issuer, revoker, burner, deployment approver and Privilege Policy roles MUST use least privilege and separate emergency controls where practical.
- Contract upgrades or deployment replacements MUST NOT cause arbitrary contracts with matching method names to become trusted.
- Indexer ingestion MUST detect removed logs, duplicate logs, finality regressions and Contract replacement.
- Client-supplied Contract, Token ID, Wallet identity, internal reason or Privilege value MUST be ignored in favor of approved server-side context.
- Rate limits and abuse detection MUST cover consent, qualification, issuance, recovery and repeated authorization attempts.

## Privacy Requirements

- Consent disclosure MUST state that a public SBT can correlate a Wallet with an Early Supporter attribute.
- Restricted Account-to-Wallet and recovery mappings MUST NOT be published as token metadata.
- Qualification evidence MUST use opaque references or commitments where public disclosure is unnecessary.
- Public profile display MUST be separately optional from possession and service authorization.

## Failure Handling

- Chain, RPC or Indexer outage never creates a new active Credential or Privilege.
- Reorganization removes or quarantines derived state until the approved finality and replay procedure completes.
- Failed revocation propagation raises an operational incident and blocks new affected privileges when safe status cannot be established.
- Failed reissuance leaves the old Credential invalid and does not create two active entitlements.

## Idempotency and Replay Protection

- Consent Challenges and Wallet proofs are short-lived, purpose-bound and single-use.
- Issuance idempotency binds Qualification, Policy version, scope, recipient and Credential Deployment.
- Lifecycle events are keyed by Chain ID, Contract Address, transaction hash and log index.
- Repeated revocation, burn or reissuance commands cannot reactivate or duplicate a Credential.

## Audit Requirements

Audit records cover qualification decision, disclosure version, consent, issuer authorization, Contract event provenance, Read Model transition, Privilege Policy activation, allow or deny evaluation, revocation propagation, recovery and reissuance. Public records and restricted Account records remain separated.

## Versioning and Migration

- Credential Deployment, Qualification Policy, consent disclosure, status schema, Read Model and Privilege Policy are independently versioned.
- A Contract replacement requires explicit migration, source checkpoint, overlap or cutoff rule, replay plan and rollback.
- Historical issuance and authorization decisions remain interpretable under their original versions.
- A Policy migration never changes the status of a historical Token ID without an explicit lifecycle transition.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-EARLY-SUPPORTER-001–005 | Unit / integration / idempotency | exact deployment, issuer, policy, scope, consent and uniqueness are required for one issuance |
| REQ-EARLY-SUPPORTER-006–010 | Contract / lifecycle / recovery / reorganization | transfer fails, lifecycle is monotonic, recovery invalidates old state and indexed provenance remains complete |
| REQ-EARLY-SUPPORTER-011–015 | Policy / end-to-end / outage / privacy | privilege is versioned and bounded, requires Subscription and Rights, fails closed and protects restricted mappings |
| REQ-EARLY-SUPPORTER-016–021 | Negative / privacy / authority boundary | public data excludes prohibited fields and Credential never creates financial, governance or standalone playback authority |
| REQ-EARLY-SUPPORTER-022–025 | Conformance | implemented SHOULD behavior is tested or deviation is documented under conventions |
| REQ-EARLY-SUPPORTER-026 | Optional privacy conformance | a private proof preserves status, uniqueness, scope, revocation and audit semantics |

Adversarial tests include arbitrary look-alike contracts, forged Wallet Links, duplicate Qualification, transfer attempts, stale and reorganized events, issuer compromise simulation, replayed consent, concurrent reissuance, old-Wallet use, scope widening, Policy rollback and direct Media Adapter access.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- The Testnet fixture issues only after consent and rejects every applicable transfer route.
- Active Subscription, active Rights and an eligible Credential unlock only the exact bounded privilege.
- Credential ownership without Subscription or Rights never produces a Playback Session.
- Revocation, burn and Wallet recovery stop new use within the approved propagation bound without creating duplicate entitlement.
- Reorganized or stale source state fails closed.
- Public Contract data contains no direct personal data, support amount or detailed listening history.
- Security Token, revenue and governance rights are absent from the Contract and Privilege Policy fixture.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-EARLY-SUPPORTER-001:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** first Qualification Policy; **Question:** Which support actions, cutoff interval, Creator scope, uniqueness rule and appeal process qualify for the first Early Supporter Credential?
- **OQ-EARLY-SUPPORTER-002:** **Decision owner:** Operating Company / Legal, Privacy, Security and Product; **Blocks:** SBT issuance and consent flow; **Question:** Which token standard, burn authorization, metadata, disclosure and receiver-consent profile should the first deployment use?
- **OQ-EARLY-SUPPORTER-003:** **Decision owner:** Operating Company / Product, Rights Operations and Creator Representatives; **Blocks:** first Privilege Policy; **Question:** Which limited content and product capabilities may the Credential unlock without exceeding Subscription terms or Rights licenses?
- **OQ-EARLY-SUPPORTER-004:** **Decision owner:** Operating Company / Security and Account Operations; **Blocks:** Wallet recovery and reissuance; **Question:** Which recovery evidence, old-Credential invalidation and propagation bounds are required before replacement issuance?
- **OQ-EARLY-SUPPORTER-005:** **Decision owner:** Operating Company / Legal, Finance, Tax and Compliance; **Blocks:** any economically valuable or investor-linked privilege; **Question:** Which legal, disclosure, accounting, tax and consumer-protection approvals are required before any fee benefit or STO-investor linkage is offered?
- **OQ-EARLY-SUPPORTER-006:** **Decision owner:** Operating Company / Platform Engineering and Security; **Blocks:** Credential Indexer production profile; **Question:** Which chain, finality threshold, freshness bound, reorganization procedure and Contract upgrade policy should the first Read Model use?
