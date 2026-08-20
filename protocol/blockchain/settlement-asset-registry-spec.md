# Approved Settlement Asset Registry

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** blockchain / payment  
**Specification ID:** SPEC-BLOCKCHAIN-001  
**Last Updated:** 2026-08-20

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/03-rights-and-money.md`
- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0007-blockchain-l2-strategy.md`

### Related Specifications

- `protocol/account/subscription-settlement-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define a versioned and auditable registry that allows payment and distribution protocols to identify an exact settlement asset, prove that required legal, technical, security and governance reviews occurred, and stop new use safely when the asset or its operating conditions change.

## Scope

This specification covers:

- creation and versioning of settlement-asset entries;
- evidence required before activation;
- exact technical identity of an asset on a network;
- scheduled activation, suspension, deprecation and revocation;
- monitoring and consumer behavior;
- historical auditability.

## Out of Scope

- making a legal determination within code;
- issuing, redeeming or exchanging an asset;
- guaranteeing parity with a fiat currency;
- selecting the first production chain or asset;
- custody, treasury, pricing or creator-distribution policy;
- implementing issuer-specific interfaces.

## Actors

- **Registry Proposer:** submits a candidate entry and evidence package.
- **Legal Reviewer:** records the scoped legal and regulatory assessment.
- **Technical Reviewer:** verifies chain, contract and integration behavior.
- **Security Reviewer:** assesses contract, proxy, issuer and operational risks.
- **Approval Authority:** the governance or authorized corporate body that approves activation for the current project phase.
- **Registry Operator:** applies approved transitions without changing their substance.
- **Registry Consumer:** a subscription, distribution or treasury component relying on an entry.
- **Monitor:** observes technical, issuer, market and regulatory change signals.

## Definitions

- **Asset Entry:** an immutable versioned record describing one asset deployment and its approval state.
- **Asset Evidence Package:** off-chain review artifacts referenced by content-addressed identifiers or integrity-protected records.
- **Technical Asset Identity:** the tuple of network namespace, `chain_id`, contract address and deployment identity required to distinguish the asset from similarly named tokens.
- **Activation Window:** the half-open UTC interval `[effective_from, effective_until)` in which an `ACTIVE` entry may be used for new operations.
- **Consumer Snapshot:** the exact registry version and Asset Entry version bound by a consuming operation.
- **Network Fee Asset:** a chain-native asset used to execute a transaction; it is not an Approved Settlement Asset unless separately reviewed and explicitly activated for the consuming operation.
- **Test Asset:** an asset restricted to a named Testnet profile and represented as having no production value, redemption claim or production-asset identity.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Token names, symbols, websites, wallet displays and explorer labels are untrusted descriptive inputs.
- RPC endpoints and block explorers are observation sources, not approval authorities.
- Reviewers attest only to the explicit scope, evidence, jurisdiction, product and date in their review record.
- Registry Operators can apply authorized changes but MUST NOT manufacture missing approval.
- Smart contracts can verify technical identifiers and authorized transitions; they cannot determine legal eligibility or issuer solvency.
- Consumers MUST treat missing, ambiguous, stale or unverifiable registry data as not approved for new operations.

## Inputs

### Asset Entry

- `asset_id`
- `asset_version`
- `registry_version`
- `network_namespace`
- `chain_id`
- `contract_address`
- `deployment_reference`
- `token_standard`
- `decimals`
- `issuer_legal_name`
- `product_name`
- `display_symbol`
- `terms_reference`
- `redemption_characteristics_reference`
- `contract_code_reference`
- `upgradeability_and_admin_reference`
- `finality_policy_reference`
- `legal_review_reference`
- `technical_review_reference`
- `security_review_reference`
- `approval_reference`
- `status`
- `effective_from`
- `effective_until` (optional)
- `allowed_operation_types`
- `environment` (`test` or `production`)
- `test_asset_disclosure_reference` (required for Test Assets)
- `created_at`

References MUST identify immutable or integrity-protected evidence versions. URLs MAY accompany them but MUST NOT be the only integrity mechanism for approval evidence.

## Outputs

- immutable Asset Entry version;
- current registry snapshot and status;
- authorized lifecycle transition event;
- stable rejection or unavailability error;
- evidence and monitoring references usable by auditors and consumers.

## State

```text
DRAFT → REVIEW_PENDING → APPROVED → SCHEDULED → ACTIVE → DEPRECATED
   │          │              │          │          │
   └──────────┴──────────────┴──────────┴──────────┴→ REJECTED
                                               │
                                               ├→ SUSPENDED
                                               └→ REVOKED
```

- `DRAFT`, `REVIEW_PENDING`, `APPROVED` and `SCHEDULED` MUST NOT be consumed as active approval.
- `SUSPENDED` stops new use temporarily or pending investigation.
- `DEPRECATED` stops new use at a scheduled time while preserving historical interpretation.
- `REVOKED` is terminal for the Asset Entry version.
- Resuming after `SUSPENDED` requires an authorized transition with current evidence; a materially changed deployment or product requires a new Asset Entry version.

## Requirements

### MUST

- **REQ-BLOCKCHAIN-001:** Every Asset Entry MUST identify the exact Technical Asset Identity and an immutable `asset_version`.
- **REQ-BLOCKCHAIN-002:** The registry MUST reject duplicate active identity claims for the same network, chain and contract address unless an approved migration explicitly relates the versions without overlapping activation windows.
- **REQ-BLOCKCHAIN-003:** Before `APPROVED`, independent evidence MUST verify contract address, deployment, token standard, decimals, transfer behavior, code or proxy implementation, and administrative authority.
- **REQ-BLOCKCHAIN-004:** Before `APPROVED`, the entry MUST reference scoped legal, technical and security reviews and the applicable Approval Authority decision.
- **REQ-BLOCKCHAIN-005:** Review records MUST identify reviewer, scope, jurisdiction or network as applicable, evidence version, conclusion, limitations and review time.
- **REQ-BLOCKCHAIN-006:** Activation MUST use a UTC `effective_from`, MUST NOT occur before approval, and MUST be reproducible from the authorized transition record.
- **REQ-BLOCKCHAIN-007:** Consumers MUST resolve approval by exact `asset_id`, `asset_version`, `registry_version`, network, chain and contract address.
- **REQ-BLOCKCHAIN-008:** A consuming financial operation MUST bind a Consumer Snapshot that remains auditable after later registry changes.
- **REQ-BLOCKCHAIN-009:** Suspension, deprecation or revocation MUST prevent new operations at or after its effective time while preserving prior finalized operation records.
- **REQ-BLOCKCHAIN-010:** Emergency suspension MUST be available to a least-privilege role and MUST create an immediate auditable event, reason code and required follow-up review.
- **REQ-BLOCKCHAIN-011:** Non-emergency activation, resumption, deprecation and revocation MUST require multi-party authorization appropriate to the approved governance phase.
- **REQ-BLOCKCHAIN-012:** Every state transition MUST record previous state, next state, effective time, actor or authority, evidence references and correlation identifier.
- **REQ-BLOCKCHAIN-013:** Registry history MUST be append-only or provide equivalent tamper-evident version history; finalized historical entries MUST remain retrievable.
- **REQ-BLOCKCHAIN-014:** Consumers MUST fail closed for new operations when the registry, required evidence, chain identity or entry status cannot be verified.
- **REQ-BLOCKCHAIN-015:** Monitoring MUST cover contract code or proxy changes, administrative-key changes, issuer or product changes, terms changes, operational incidents and regulatory-review triggers.
- **REQ-BLOCKCHAIN-016:** A material monitored change MUST create a review event and MUST trigger suspension when the approved risk policy requires it.
- **REQ-BLOCKCHAIN-017:** The registry MUST distinguish legal/product review metadata from publicly executable technical fields and protect restricted evidence with access control.
- **REQ-BLOCKCHAIN-018:** Migration to a replacement asset or deployment MUST define non-overlapping new-operation windows and preserve the original Consumer Snapshots.
- **REQ-BLOCKCHAIN-019:** Registry serialization, address normalization and comparison MUST be deterministic and defined per supported network namespace.
- **REQ-BLOCKCHAIN-020:** An entry MUST identify the finality policy required before its transfers may be treated as finalized by a consumer.
- **REQ-BLOCKCHAIN-034:** Every Asset Entry MUST bind its allowed operation types and environment; a Subscription consumer MUST reject an entry not approved for Subscription Payment in the current environment.
- **REQ-BLOCKCHAIN-035:** A Network Fee Asset MUST be modeled separately and MUST NOT become an Approved Settlement Asset from chain-native status, Gas payment or Wallet balance alone.
- **REQ-BLOCKCHAIN-036:** A Test Asset entry named `MockJPYC` or similar MUST use a Testnet identity, disclose that it has no monetary value or redemption claim, and remain technically and operationally isolated from every production JPYC entry.
- **REQ-BLOCKCHAIN-037:** Promotion from Testnet to production MUST require a new production Asset Entry and full legal, technical, security and approval evidence; changing an environment flag is insufficient.

### MUST NOT

- **REQ-BLOCKCHAIN-021:** The registry MUST NOT identify or approve an asset from its symbol, display name, brand, logo or website alone.
- **REQ-BLOCKCHAIN-022:** The registry MUST NOT assume that two assets have equal value because they reference the same fiat currency or use similar names.
- **REQ-BLOCKCHAIN-023:** An operator MUST NOT alter contract address, decimals, issuer, product, review references or effective history in an existing Asset Entry version.
- **REQ-BLOCKCHAIN-024:** The registry MUST NOT represent legal review as a permanent guarantee; its scope, date, limitations and re-review triggers MUST remain visible.
- **REQ-BLOCKCHAIN-025:** Restricted legal identity, contractual, security or personal data MUST NOT be stored on a public blockchain.
- **REQ-BLOCKCHAIN-026:** Suspension or revocation MUST NOT silently invalidate or reinterpret a previously finalized operation.
- **REQ-BLOCKCHAIN-038:** The registry MUST NOT infer production approval, issuer endorsement, redemption or value from a Test Asset's name, symbol, decimals or interface similarity.

### SHOULD

- **REQ-BLOCKCHAIN-027:** Technical verification SHOULD use multiple independently operated sources and direct contract calls at a recorded block reference.
- **REQ-BLOCKCHAIN-028:** Evidence references SHOULD use cryptographic digests or content-addressed storage in addition to durable human-readable locations.
- **REQ-BLOCKCHAIN-029:** Activation SHOULD include a review-validity window and explicit triggers for mandatory re-review.
- **REQ-BLOCKCHAIN-030:** Registry Consumers SHOULD cache only a signed or integrity-protected snapshot with a short, documented freshness limit.
- **REQ-BLOCKCHAIN-031:** Monitoring SHOULD include issuer notices, reserve/redemption disclosures where applicable, liquidity and transfer availability without treating those signals as a guaranteed peg.

### MAY

- **REQ-BLOCKCHAIN-032:** An implementation MAY anchor registry versions or evidence commitments on-chain while retaining restricted evidence off-chain.
- **REQ-BLOCKCHAIN-033:** The Approval Authority MAY limit an active entry to specified plans, operation types, amounts, regions, wallets or time windows.

## Invariants

- `INV-PRIVACY-001`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- `INV-EVOLUTION-003`
- **SPEC-INV-BLOCKCHAIN-001:** A Token symbol or brand never constitutes Technical Asset Identity.
- **SPEC-INV-BLOCKCHAIN-002:** A finalized operation always resolves to the exact Asset Entry and registry snapshot it consumed.
- **SPEC-INV-BLOCKCHAIN-003:** No registry transition retroactively changes the meaning of a finalized operation.
- **SPEC-INV-BLOCKCHAIN-004:** Only an entry that is `ACTIVE` within its Activation Window is eligible for a new operation.
- **SPEC-INV-BLOCKCHAIN-005:** Legal approval evidence and technical contract verification are both necessary and neither substitutes for the other.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Registry Proposer | complete candidate identity and evidence manifest | `DRAFT` | `AssetEntryDrafted` | reject malformed or conflicting identity |
| `DRAFT` | Registry Proposer | review assignments and frozen candidate version | `REVIEW_PENDING` | `AssetReviewRequested` | remain `DRAFT` |
| `REVIEW_PENDING` | Approval Authority | required reviews complete; limitations accepted | `APPROVED` | `AssetEntryApproved` | `REJECTED` or remain pending |
| `APPROVED` | Registry Operator | authorized future activation time | `SCHEDULED` | `AssetActivationScheduled` | reject unauthorized or retroactive time |
| `SCHEDULED` | Registry | trusted time reaches `effective_from`; no blocking signal | `ACTIVE` | `AssetActivated` | `SUSPENDED` if blocking signal exists |
| `ACTIVE` | Emergency role | approved emergency condition and reason | `SUSPENDED` | `AssetSuspended` | fail closed if transition status is uncertain |
| `SUSPENDED` | Approval Authority | follow-up reviews and resumption decision | `ACTIVE` | `AssetResumed` | remain `SUSPENDED` or become `REVOKED` |
| `ACTIVE` | Approval Authority | deprecation decision and future effective time | `DEPRECATED` at effective time | `AssetDeprecated` | remain `ACTIVE` until effective time |
| any non-terminal | Approval Authority | revocation decision or terminal safety/legal condition | `REVOKED` | `AssetRevoked` | fail closed for new use |

## Interfaces

Equivalent read operations MUST be available to Registry Consumers:

```text
getAssetEntry(asset_id, asset_version)
getRegistrySnapshot(registry_version)
resolveActiveAsset(network_namespace, chain_id, contract_address, operation_type, at_time)
getAssetHistory(asset_id)
```

Equivalent controlled transitions MUST be available to authorized actors:

```text
proposeAssetEntry(candidate, evidence_manifest)
submitReview(asset_id, asset_version, review_type, review_reference)
approveAssetEntry(asset_id, asset_version, approval_reference)
scheduleActivation(asset_id, asset_version, effective_from)
suspendAsset(asset_id, asset_version, reason_code, evidence_reference)
resumeAsset(asset_id, asset_version, approval_reference, effective_from)
deprecateAsset(asset_id, asset_version, effective_until, approval_reference)
revokeAsset(asset_id, asset_version, reason_code, approval_reference)
```

Read results MUST include a schema version and integrity mechanism. Write interfaces MUST enforce authorization, idempotency and optimistic concurrency or an equivalent protection against lost updates.

## Error Conditions

| Error ID | Condition | Required behavior |
| :--- | :--- | :--- |
| `ASSET_IDENTITY_INCOMPLETE` | Required technical identity field is missing | Reject proposal |
| `ASSET_IDENTITY_CONFLICT` | Active identity or activation window conflicts | Reject transition and identify conflicting version |
| `ASSET_EVIDENCE_INCOMPLETE` | Required review or evidence is absent | Do not approve |
| `ASSET_EVIDENCE_STALE` | Review validity policy or trigger requires re-review | Do not activate; suspend if policy requires |
| `ASSET_TECHNICAL_MISMATCH` | On-chain observation differs from entry | Reject or suspend and raise security incident |
| `ASSET_NOT_ACTIVE` | Entry is not active at requested time | Reject new operation |
| `ASSET_SCOPE_NOT_APPROVED` | Operation exceeds approved plan, amount, region or use | Reject new operation |
| `REGISTRY_VERSION_UNAVAILABLE` | Requested snapshot cannot be verified | Fail closed for new operation |
| `REGISTRY_TRANSITION_UNAUTHORIZED` | Actor lacks required authority | Reject and audit security signal |
| `REGISTRY_CONCURRENCY_CONFLICT` | Entry changed since command was authorized | Reject; require refresh and reauthorization |
| `INVALID_EFFECTIVE_TIME` | Transition is retroactive or window is invalid | Reject transition |
| `ASSET_ENVIRONMENT_MISMATCH` | Test or production environment differs from the consuming operation | Reject new operation |
| `NATIVE_FEE_AS_SETTLEMENT` | A consumer attempts to treat Gas payment as Subscription settlement | Reject and record an integration defect |

## Security Requirements

- Approval and operation roles MUST be separated where practical.
- High-impact transitions MUST use threshold or multi-party authorization and protected keys.
- Emergency suspension credentials MUST be narrowly scoped and regularly tested.
- Registry reads used for financial operations MUST be integrity-checked against an authoritative version.
- Contract verification MUST account for proxies, implementation changes, metamorphic deployment risk and chain-specific address semantics.
- Monitoring and transition events MUST be delivered to incident-response systems.

## Privacy Requirements

- Public records MAY contain organizational reviewer roles and evidence commitments but MUST NOT expose restricted personal or contractual details.
- Off-chain evidence access MUST be role-based, logged and retained according to approved policy.
- Public evidence hashes MUST NOT be derived directly from easily enumerable personal information.

## Failure Handling

- Registry unavailability or unverifiable state fails closed for new financial operations.
- Existing subscription entitlement and finalized distribution records remain readable during registry outage.
- Conflicting or partially applied transitions require reconciliation against the authoritative append-only history.
- Emergency suspension takes priority over cached `ACTIVE` state once the authorized event is observable under the freshness policy.
- Recovery MUST NOT delete incident, suspension or prior-version history.

## Idempotency and Replay Protection

- Each proposal and transition command MUST carry an idempotency key scoped to entry, version and operation.
- Approval signatures MUST bind the entry digest, target transition, effective time, evidence manifest and registry domain.
- An approval for one asset, chain, version or transition MUST NOT authorize another.
- Replaying a completed command MUST return the stable existing transition result.

## Audit Requirements

The audit history MUST allow an independent reviewer to reconstruct:

- who proposed, reviewed, approved and applied each version;
- the exact technical and product identity reviewed;
- evidence versions, conclusions, limitations and timestamps;
- every state and scope transition;
- all monitoring signals that caused mandatory review or suspension;
- every Consumer Snapshot used by a finalized operation.

## Versioning and Migration

- Material changes to deployment, proxy implementation, issuer, product, terms, redemption characteristics or legal classification require a new Asset Entry version or a documented review decision under the approved change policy.
- Existing entry versions remain immutable and addressable.
- Registry schema migrations require deterministic conversion, integrity verification and rollback evidence.
- Consumer migrations MUST prevent overlapping or ambiguous active identity and MUST preserve original snapshots.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-BLOCKCHAIN-001–002 | Unit / property | Exact identity and version are required; conflicting active windows are rejected |
| REQ-BLOCKCHAIN-003–006 | Review workflow / integration | Approval and activation fail without verified technical fields, scoped reviews or valid effective time |
| REQ-BLOCKCHAIN-007–009 | Consumer / historical property | Exact snapshot is bound; later transitions stop new use without changing finalized records |
| REQ-BLOCKCHAIN-010–012 | Authorization / state machine | Emergency and ordinary transitions enforce roles and emit complete audit events |
| REQ-BLOCKCHAIN-013–014 | Integrity / resilience | History remains retrievable; unavailable or unverifiable state fails closed |
| REQ-BLOCKCHAIN-015–016 | Monitoring / incident | Material changes create review signals and policy-required suspension |
| REQ-BLOCKCHAIN-017–020 | Privacy / migration / serialization | Restricted evidence is separated; migration and normalization are deterministic; finality policy is present |
| REQ-BLOCKCHAIN-021 | Negative / adversarial | Look-alike tokens with same symbol, name, logo or URL are never approved by resemblance |
| REQ-BLOCKCHAIN-022 | Property | Same fiat reference does not imply value equality or interchangeability |
| REQ-BLOCKCHAIN-023–024 | Mutation / review | Existing versions cannot be rewritten and review limitations remain visible |
| REQ-BLOCKCHAIN-025–026 | Privacy / historical property | Prohibited data stays off-chain; suspension never rewrites finalized meaning |
| REQ-BLOCKCHAIN-027–031 | Conformance / operational | Implemented SHOULD behavior is evidenced or deviations are documented under conventions |
| REQ-BLOCKCHAIN-032–033 | Optional conformance | Anchoring or scoped approval preserves every MUST, MUST NOT and invariant |
| REQ-BLOCKCHAIN-034–038 | Environment / negative / migration | Operation scope is enforced; Gas is not settlement; MockJPYC cannot imply or migrate into production approval |

Property and adversarial tests MUST include address casing, chain-ID mismatch, proxy upgrade, duplicate symbol, overlapping windows, stale cache, concurrent transition, replayed approval, emergency suspension, Testnet/Mainnet substitution and Native Fee misuse.

## Acceptance Criteria

- Every production Asset Entry has complete legal, technical, security and approval evidence.
- All MUST and MUST NOT requirements have implementation and passing test traceability.
- At least one adversarial look-alike token test proves that symbol and brand cannot select an asset.
- Consumer integration proves exact snapshot binding and fail-closed behavior.
- Suspension exercises prove new operations stop within the approved freshness limit while historical records remain interpretable.
- Migration tests prove no ambiguous active identity or retroactive change.
- Operational owners and review-expiry or change triggers are documented.

## Open Questions

- **OQ-ASSET-REGISTRY-001:** **Decision owner:** Operating Company / Board and Protocol Governance; **Blocks:** interim Approval Authority; **Question:** Which governance or corporate body is the Approval Authority before the full DAO process exists?
- **OQ-ASSET-REGISTRY-002:** **Decision owner:** Operating Company / Security and Compliance; **Blocks:** review evidence publication; **Question:** Which evidence store and digest format will be authoritative?
- **OQ-ASSET-REGISTRY-003:** **Decision owner:** Protocol Governance / Blockchain Engineering; **Blocks:** first network adapter; **Question:** Which network namespace and address-normalization standards will be supported first?
- **OQ-ASSET-REGISTRY-004:** **Decision owner:** Operating Company / Security and Operations; **Blocks:** suspension service level; **Question:** What cache freshness and emergency-suspension propagation limit is acceptable?
- **OQ-ASSET-REGISTRY-005:** **Decision owner:** Operating Company / Legal, Security and Compliance; **Blocks:** production approval lifecycle; **Question:** What review validity periods and material-change triggers apply to legal, technical and security reviews?
- **OQ-ASSET-REGISTRY-006:** **Decision owner:** Operating Company / Security and Compliance; **Blocks:** production monitoring; **Question:** Which monitoring sources are independent enough for production use?
- **OQ-ASSET-REGISTRY-007:** **Decision owner:** Operating Company / Privacy, Legal and Protocol Engineering; **Blocks:** registry data architecture; **Question:** Which fields belong on-chain, in a public repository or in restricted corporate records?
