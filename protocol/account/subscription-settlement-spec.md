# Subscription Settlement and Activation

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** account / payment  
**Specification ID:** SPEC-ACCOUNT-001  
**Last Updated:** 2026-08-19

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/03-rights-and-money.md`
- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0007-blockchain-l2-strategy.md`
- ADR: `docs/adr/ADR-0008-account-wallet-identity-strategy.md`
- ADR: `docs/adr/ADR-0009-navidrome-streaming-gateway.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/wallet-linking-spec.md`
- `protocol/blockchain/settlement-asset-registry-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define the minimum interoperable behavior for accepting an approved settlement asset such as an eligible JPYC product, finalizing a subscription payment, and activating the corresponding Platform Account subscription exactly once.

## Scope

This specification covers:

- creation of a subscription payment intent;
- validation of an approved settlement asset and plan price;
- authorization and submission of a payment;
- chain finality and duplicate-payment handling;
- subscription activation, renewal, cancellation and expiry;
- audit records and privacy boundaries.

## Out of Scope

- card and bank-transfer processing;
- issuer-specific redemption;
- exchange between settlement assets;
- legal classification of a token or payment flow;
- creator revenue allocation and payout;
- tax calculation, withholding and invoicing;
- wallet linking and account recovery details;
- chargeback or court-ordered recovery policy beyond state recording.

These items require separate specifications or an approved implementation policy.

## Actors

- **Subscriber:** the person using the service through a Platform Account.
- **Platform Account:** the application-level account receiving subscription entitlement.
- **Payment Wallet:** a linked or transaction-scoped wallet that authorizes asset transfer.
- **Subscription Service:** the authoritative off-chain service for subscription state.
- **Settlement Adapter:** the chain-specific component that submits or observes settlement.
- **Settlement Contract:** an optional smart contract receiving and recording payment.
- **Finality Provider:** the configured source of canonical chain and finality information.
- **Asset Registry Operator:** an authorized role applying approved asset-registry changes.
- **Legal and Governance Review:** the off-chain process authorizing asset and policy versions.

## Definitions

- **Approved Settlement Asset:** a versioned asset-registry entry permitted for a stated plan, chain and activation period.
- **Payment Intent:** an immutable request binding one account, plan, period, asset, amount and expiration.
- **Payment Reference:** the canonical transaction and event reference used for duplicate detection.
- **Finalized Payment:** a matching payment that satisfies the configured chain-finality policy.
- **Entitlement Period:** the half-open UTC interval `[starts_at, ends_at)` during which access is active.

Common terms and representations follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Subscriber clients, wallet software, RPC responses and callback payloads are untrusted inputs.
- A wallet signature proves control for the signed operation; it does not prove human identity, legal identity or account ownership.
- The Asset Registry Operator may apply, but may not unilaterally invent, an approved asset or policy version.
- The Finality Provider is security-critical and MUST be replaceable and independently monitored.
- The Subscription Service is authoritative for application entitlement, while public settlement records are authoritative only for the transfers they prove.
- Legal eligibility of an asset or payment flow is established off-chain and referenced by version; a smart contract MUST NOT infer it from a token symbol or brand.

## Inputs

### Subscription Plan

- `plan_id`
- `plan_version`
- `period_seconds`
- `price.asset_id`
- `price.amount`

### Approved Settlement Asset Entry

- `asset_id`
- `registry_version`
- `chain_id`
- `contract_address`
- `token_standard`
- `decimals`
- `status`
- `effective_from`
- `effective_until` (optional)
- `legal_review_reference`
- `governance_reference`

### Payment Intent Request

- `account_id`
- `plan_id`
- `asset_id`
- `payment_wallet`
- `idempotency_key`

Client-supplied price, decimals, contract address, period and timestamps MUST NOT override authoritative plan or registry data.

## Outputs

- immutable Payment Intent;
- Payment Intent state and canonical Payment Reference;
- subscription state and Entitlement Period;
- stable error identifier;
- auditable transition events.

## State

### Payment Intent State

```text
CREATED → AUTHORIZED → SUBMITTED → FINALIZED
   │           │            │
   └───────────┴────────────┴→ FAILED
   └─────────────────────────→ EXPIRED
```

`FINALIZED`, `FAILED` and `EXPIRED` are terminal for a Payment Intent. A chain reorganization discovered after `FINALIZED` is recorded as a separate incident and MUST NOT silently rewrite the audit history.

### Subscription State

```text
INACTIVE → PAYMENT_PENDING → ACTIVE
                             │   │
                             │   └→ CANCEL_AT_PERIOD_END → EXPIRED
                             └→ RENEWAL_PENDING → ACTIVE
                                      └──────────→ PAST_DUE → EXPIRED
```

An implementation MAY omit `PAST_DUE` and expire directly when no grace-period policy is approved.

## Requirements

### MUST

- **REQ-ACCOUNT-001:** The system MUST resolve plan price and asset metadata from immutable, versioned authoritative records when creating a Payment Intent.
- **REQ-ACCOUNT-002:** A Payment Intent MUST bind `payment_intent_id`, `account_id`, `plan_id`, `plan_version`, `asset_id`, `registry_version`, `chain_id`, `contract_address`, integer `amount`, `decimals`, `payment_wallet`, `created_at` and `expires_at`.
- **REQ-ACCOUNT-003:** The accepted amount MUST use integer smallest units and MUST equal the bound plan price exactly unless an approved pricing policy explicitly defines another deterministic rule.
- **REQ-ACCOUNT-004:** The selected asset MUST be `ACTIVE` for the selected chain, plan and Payment Intent creation time.
- **REQ-ACCOUNT-005:** Asset approval MUST satisfy `SPEC-BLOCKCHAIN-001` and reference its recorded legal review and governance or authorized corporate approval appropriate to the current project phase.
- **REQ-ACCOUNT-006:** Payment authorization MUST be bound to the Payment Intent, chain, asset, amount, wallet, nonce and expiration.
- **REQ-ACCOUNT-007:** The system MUST verify authorization and transaction evidence independently of client claims.
- **REQ-ACCOUNT-008:** A subscription MUST become `ACTIVE` only after a matching payment reaches the configured finality threshold.
- **REQ-ACCOUNT-009:** One Payment Reference MUST activate at most one account entitlement and one entitlement period.
- **REQ-ACCOUNT-010:** Repeated requests with the same account and idempotency key MUST return the original Payment Intent or an equivalent stable result without creating a second payable obligation.
- **REQ-ACCOUNT-011:** A successful activation MUST define a half-open UTC Entitlement Period and record the policy used to calculate it.
- **REQ-ACCOUNT-012:** Renewal MUST extend from the later of the current `ends_at` or the finalized renewal policy anchor; it MUST NOT shorten an existing paid Entitlement Period.
- **REQ-ACCOUNT-013:** Cancellation MUST stop future renewal authorization but MUST preserve already-paid access until `ends_at`, unless a separately approved refund or legal-remedy policy applies.
- **REQ-ACCOUNT-014:** Every state transition MUST record actor or service identity, previous state, next state, event time, observation time, policy versions and correlation identifier.
- **REQ-ACCOUNT-015:** A registry suspension or deactivation MUST prevent new Payment Intents at or after its effective time while preserving auditability of earlier finalized payments.
- **REQ-ACCOUNT-016:** Failed, expired, underpaid, overpaid, wrong-asset and wrong-chain transfers MUST enter an exception workflow without automatic subscription activation.
- **REQ-ACCOUNT-017:** Upgrade, emergency-stop and registry-administration capabilities MUST use least privilege, multi-party control appropriate to risk, and an auditable delay or documented emergency exception.
- **REQ-ACCOUNT-018:** The implementation MUST provide a reconciliation process linking each finalized entitlement to exactly one accepted Payment Reference and ledger entry.

### MUST NOT

- **REQ-ACCOUNT-019:** The system MUST NOT identify an asset by token symbol, display name or brand alone.
- **REQ-ACCOUNT-020:** The system MUST NOT treat wallet control as proof of unique human identity, Creator status, Rights ownership or Governance eligibility.
- **REQ-ACCOUNT-021:** The system MUST NOT store legal identity, email address, tax data, raw authentication material or detailed listening history on a public blockchain.
- **REQ-ACCOUNT-022:** The system MUST NOT silently change price, asset, decimals, chain, period or policy versions after Payment Intent creation.
- **REQ-ACCOUNT-023:** The system MUST NOT activate access from a pending transaction, untrusted webhook or client screenshot.
- **REQ-ACCOUNT-024:** An operator MUST NOT manually create paid entitlement without a distinct, authorized adjustment record and reason code.

### SHOULD

- **REQ-ACCOUNT-025:** The Subscriber SHOULD receive a human-readable preview containing amount, asset product, network, period and expiration before authorization.
- **REQ-ACCOUNT-026:** Finality SHOULD be established from at least two independently operated data sources or a documented equivalent control.
- **REQ-ACCOUNT-027:** The payment path SHOULD avoid long-term Platform custody where commercially and legally appropriate.
- **REQ-ACCOUNT-028:** Asset-registry entries SHOULD include issuer, product name, terms reference, redemption characteristics and supported-network evidence in off-chain review metadata.

### MAY

- **REQ-ACCOUNT-029:** An approved implementation MAY support permit-style token authorization, direct transfer observation or a dedicated Settlement Contract.
- **REQ-ACCOUNT-030:** An approved policy MAY define a grace period, promotional entitlement or refund flow, provided it uses separate reason codes and does not represent unpaid access as finalized payment.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-PRIVACY-001`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- **SPEC-INV-ACCOUNT-001:** A Payment Reference activates no more than one paid Entitlement Period.
- **SPEC-INV-ACCOUNT-002:** An active paid Entitlement Period is reproducible from finalized payment, plan version and activation policy version.
- **SPEC-INV-ACCOUNT-003:** A registry change never changes the interpretation of a previously finalized payment.
- **SPEC-INV-ACCOUNT-004:** Subscription access never begins before the accepted payment's finalization time, except for a separately identified non-paid entitlement.

## State Transitions

| Source | Trigger | Preconditions | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | create intent | authenticated account; active plan and asset; unique idempotency key | `CREATED` / `PAYMENT_PENDING` | `PaymentIntentCreated` | reject with stable error; create no obligation |
| `CREATED` | valid wallet authorization | unexpired intent; signature/authorization matches bound fields | `AUTHORIZED` | `PaymentAuthorized` | remain `CREATED` or become `FAILED` per reason |
| `AUTHORIZED` | submit or observe transfer | correct chain and transaction format | `SUBMITTED` | `PaymentSubmitted` | become `FAILED` or remain retryable |
| `SUBMITTED` | finality reached | canonical matching transfer; unused Payment Reference | `FINALIZED` / `ACTIVE` | `PaymentFinalized`, `SubscriptionActivated` | enter exception workflow |
| `CREATED`/`AUTHORIZED`/`SUBMITTED` | expiration | trusted time is at or after `expires_at`; not finalized | `EXPIRED` | `PaymentIntentExpired` | late transfer enters exception workflow |
| `ACTIVE` | cancel | authorized account operation | `CANCEL_AT_PERIOD_END` | `SubscriptionCancellationScheduled` | preserve current entitlement |
| `ACTIVE` | renewal intent | renewal window and policy valid | `RENEWAL_PENDING` | `RenewalPaymentIntentCreated` | current entitlement unchanged |
| `RENEWAL_PENDING` | renewal finalized | all payment requirements satisfied | `ACTIVE` with extended period | `SubscriptionRenewed` | `PAST_DUE` or current period expiry |
| `CANCEL_AT_PERIOD_END`/`PAST_DUE` | period end | trusted time is at or after `ends_at`; no extension | `EXPIRED` | `SubscriptionExpired` | deny paid-only access after expiry |

## Interfaces

The transport is implementation-defined. Every implementation MUST expose equivalent operations:

```text
createPaymentIntent(account_id, plan_id, asset_id, payment_wallet, idempotency_key)
getPaymentIntent(payment_intent_id)
submitPaymentReference(payment_intent_id, chain_id, transaction_hash, event_index)
cancelSubscription(account_id, idempotency_key)
getSubscription(account_id)
```

Canonical events MUST contain stable schema versions. A Payment Reference SHOULD be serialized as:

```text
chain_id:transaction_hash:event_index
```

Case normalization and chain-specific transaction rules MUST be defined by the Settlement Adapter and covered by tests.

## Error Conditions

| Error ID | Condition | Required behavior |
| :--- | :--- | :--- |
| `PLAN_NOT_ACTIVE` | Plan/version cannot accept a new intent | Reject without creating an intent |
| `ASSET_NOT_APPROVED` | Asset is absent, inactive or outside its activation period | Reject without creating an intent |
| `ASSET_METADATA_MISMATCH` | Chain, address or decimals differ | Reject and record security signal |
| `PAYMENT_INTENT_EXPIRED` | Authorization or submission occurs after expiry | Do not activate; route observed funds to exception handling |
| `INVALID_PAYMENT_AUTHORIZATION` | Signature, permit, nonce or wallet binding is invalid | Reject and rate-limit as appropriate |
| `PAYMENT_AMOUNT_MISMATCH` | Observed amount differs from bound amount | Do not activate; preserve evidence |
| `PAYMENT_REFERENCE_REUSED` | Reference was already accepted | Return the original result; never activate again |
| `PAYMENT_NOT_FINAL` | Transaction is missing, reverted or below finality | Keep pending or fail according to policy |
| `PAYMENT_REORG_DETECTED` | Previously observed transaction leaves canonical chain | Do not silently rewrite; open incident and apply approved remedy |
| `SUBSCRIPTION_STATE_CONFLICT` | Requested transition is invalid for current state | Reject with current state and correlation ID |
| `DEPENDENCY_UNAVAILABLE` | Chain, finality or registry dependency is unavailable | Fail closed for activation and retry safely |

## Security Requirements

- Authorization domains MUST prevent cross-chain, cross-contract, cross-account and cross-intent replay.
- Nonces MUST be single-use within their defined domain.
- Secrets and signing keys MUST NOT appear in logs or public events.
- Settlement adapters MUST verify token contract address and event semantics, not merely transaction success.
- Administrative changes MUST emit versioned audit events before or when becoming effective.
- Rate limits and anomaly detection MUST protect intent creation and transaction-reference submission.
- Emergency pause MUST stop new payment acceptance without deleting existing entitlement or audit records.

## Privacy Requirements

- Public events SHOULD use pseudonymous Payment Intent identifiers rather than Platform Account identifiers.
- The mapping between account, wallet, legal identity and payment history MUST be access-controlled off-chain.
- Retention periods MUST be documented for operational, contractual, accounting and legal purposes.
- User-facing history MUST disclose only the information required for the Subscriber to understand and evidence payment.

## Failure Handling

- Dependency failure before finality MUST fail closed for activation.
- Retrying intent creation with the same idempotency key MUST be safe.
- Retrying finality observation MUST not create a second activation event.
- Late, wrong-asset, wrong-chain, underpaid and overpaid transfers MUST be preserved for reconciliation and handled by an approved exception policy.
- A post-finality incident MUST create compensating records; finalized history MUST remain immutable.

## Idempotency and Replay Protection

- Intent creation idempotency is scoped to `account_id + idempotency_key`.
- Cancellation idempotency is scoped to `account_id + operation + idempotency_key`.
- Payment consumption uniqueness is scoped to the canonical Payment Reference.
- Authorization nonces are scoped to wallet, chain, authorization domain and intent.
- Idempotency records MUST live at least as long as the associated financial and audit records.

## Audit Requirements

Audit records MUST include:

- correlation and schema identifiers;
- Payment Intent and pseudonymous account references;
- authoritative plan, asset-registry and policy versions;
- previous and resulting state;
- canonical Payment Reference when available;
- event, observation and finalization timestamps;
- actor/service identity and authorization method;
- failure or adjustment reason code.

Audit access MUST be role-restricted. Integrity protection and retention MUST satisfy the approved accounting, security and legal policies.

## Versioning and Migration

- This draft is not an approved production protocol.
- Backward-incompatible state, event or amount-semantics changes require a new major specification version.
- Existing Payment Intents MUST retain the plan, registry and policy versions bound at creation.
- Registry deactivation MUST use an effective timestamp and MUST NOT rewrite earlier entries.
- Migration tooling MUST prove that no Payment Reference becomes reusable and no paid Entitlement Period is shortened.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-ACCOUNT-001–005 | Unit / contract | Intent contains authoritative immutable price and approved asset version; inactive or unreviewed asset is rejected |
| REQ-ACCOUNT-006–007 | Security / integration | Altered chain, amount, wallet, nonce or expiry invalidates authorization; client claims alone fail |
| REQ-ACCOUNT-008 | Integration | Pending or reverted payment does not activate; finalized matching payment activates |
| REQ-ACCOUNT-009–010 | Concurrency / property | Duplicate reference or idempotency key never creates a second obligation or entitlement |
| REQ-ACCOUNT-011–013 | State-machine / property | UTC periods are deterministic; renewal never shortens; cancellation preserves paid access |
| REQ-ACCOUNT-014–015 | Audit / integration | Every transition and registry change is versioned and historical payments remain explainable |
| REQ-ACCOUNT-016 | Negative integration | Wrong/late/under/over payment enters exception handling without activation |
| REQ-ACCOUNT-017 | Authorization / security | Single unauthorized administrator cannot perform protected change |
| REQ-ACCOUNT-018 | Reconciliation / property | Every finalized entitlement has exactly one accepted reference and ledger entry |
| REQ-ACCOUNT-019 | Negative unit | Same symbol with different contract is rejected |
| REQ-ACCOUNT-020–021 | Privacy / data-flow | Identity is not inferred from wallet; prohibited personal data is absent on-chain |
| REQ-ACCOUNT-022–024 | Mutation / authorization | Bound intent cannot be modified; pending evidence and manual edits cannot create paid entitlement |
| REQ-ACCOUNT-025–028 | UX / resilience / review | Preview is accurate; finality control, custody decision and asset evidence are documented |
| REQ-ACCOUNT-029–030 | Conformance | Optional flow preserves all MUST, MUST NOT and invariant requirements |

Property tests MUST cover concurrent callbacks, duplicate events, timestamp boundaries, integer limits and chain reorganizations.

## Acceptance Criteria

- All requirements have implementation traceability to code and tests.
- All MUST and MUST NOT test groups pass on every supported chain and asset adapter.
- Threat modeling covers replay, duplicate activation, malicious token contracts, compromised RPC, reorganization and administrative-key compromise.
- Reconciliation proves a one-to-one relationship among finalized paid entitlement, accepted Payment Reference and ledger entry.
- A legal review approves the concrete payment flow and each production asset entry.
- Security review approves contracts, adapters, administrative controls and emergency procedures.
- Operational runbooks cover dependency outage, late/wrong payment, reorganization and registry suspension.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-SUBSCRIPTION-001:** **Decision owner:** Protocol Governance / Security and Operations; **Blocks:** production payment adapter; **Question:** Which chain and finality policy will the first production adapter use?
- **OQ-SUBSCRIPTION-002:** **Decision owner:** Operating Company / Legal, Compliance and Treasury; **Blocks:** asset review and payment pilot; **Question:** Which exact JPYC or other payment product, issuer and contract will be reviewed first?
- **OQ-SUBSCRIPTION-003:** **Decision owner:** Operating Company / Product and Protocol Engineering; **Blocks:** payment-flow implementation; **Question:** Will the initial flow use direct transfer, permit authorization or a Settlement Contract?
- **OQ-SUBSCRIPTION-004:** **Decision owner:** Operating Company / Legal, Compliance and Finance; **Blocks:** production funds flow; **Question:** What party receives funds before allocation, and does that design create custody or regulated-intermediation obligations?
- **OQ-SUBSCRIPTION-005:** **Decision owner:** Operating Company / Legal, Finance and Support; **Blocks:** payment operations; **Question:** What are the approved refund, mistaken-transfer and post-finality reorganization remedies?
- **OQ-SUBSCRIPTION-006:** **Decision owner:** Operating Company / Finance and Tax; **Blocks:** ledger reconciliation and customer records; **Question:** Which accounting system is authoritative, and how are invoice/receipt requirements represented?
- **OQ-SUBSCRIPTION-007:** **Decision owner:** Operating Company / Product and Legal; **Blocks:** renewal experience; **Question:** Is automatic renewal permitted for the selected wallet flow and user experience?
- **OQ-SUBSCRIPTION-008:** **Decision owner:** Operating Company / Product and Support; **Blocks:** entitlement state policy; **Question:** What grace-period and entitlement-boundary policy should be approved?
