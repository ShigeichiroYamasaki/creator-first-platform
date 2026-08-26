# Wallet Linking and Unlinking

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** account / identity  
**Specification ID:** SPEC-ACCOUNT-002  
**Last Updated:** 2026-08-26

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/05-creator-onboarding.md`
- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- ADR: `docs/adr/ADR-0008-account-wallet-identity-strategy.md`
- ADR: `docs/adr/ADR-0019-jpki-passkey-wallet-binding-testnet.md`
- Standard: [ERC-4361 Sign-In with Ethereum](https://eips.ethereum.org/EIPS/eip-4361)
- Standard: [ERC-1271 Standard Signature Validation Method for Contracts](https://eips.ethereum.org/EIPS/eip-1271)
- Standard: [EIP-712 Typed Structured Data Hashing and Signing](https://eips.ethereum.org/EIPS/eip-712)

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/subscription-settlement-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define a secure, replay-resistant process for proving control of an EVM wallet and linking it to a Platform Account for explicitly approved purposes without treating the wallet as the person's complete identity.

## Current Implementation Conformance

The ADR-0019 local pilot issues an EIP-712 `WalletBindingIntent` only after Mock JPKI and server-verified WebAuthn registration have advanced the same short-lived binding transaction. It binds an opaque account-subject commitment, checksummed wallet, Polygon Amoy chain ID `80002`, random nonce, issue time, deadline, purpose and policy version, then recovers and compares the signer before recording `WALLET_BOUND` and `ACTIVE`. Tests reject CSRF mismatch, state/challenge replay, a non-Amoy chain and a different signer.

This is an EOA-only, local test profile. It does not implement ERC-1271, production Platform Account sessions, unlinking, purpose expansion, recovery, active-dependency migration, rate limiting, durable idempotency across process restart or public deployment. It therefore provides partial evidence only and does not meet this specification's complete acceptance criteria.

## Scope

This specification covers:

- wallet-link challenge creation;
- human-readable signature authorization;
- EOA and contract-wallet signature verification;
- atomic challenge consumption and link creation;
- link purpose, status, removal and revocation;
- account recovery and active-dependency safeguards;
- audit, privacy and abuse controls.

## Out of Scope

- creation or custody of private keys;
- recovery of blockchain assets from a lost wallet;
- legal-identity, Creator, Rights Holder or Governance eligibility verification;
- payment authorization and subscription settlement;
- chain-specific smart-account modules beyond signature verification;
- social recovery protocol design.

## Actors

- **Account Holder:** an authenticated actor authorized to manage a Platform Account.
- **Platform Account:** the application-level account receiving the Wallet Link.
- **Candidate Wallet:** the wallet whose current control is being proved.
- **Wallet Provider:** the user-controlled software or device requesting a signature.
- **Account Service:** the authoritative service for Account and Wallet Link state.
- **Challenge Service:** creates, stores and consumes Wallet Link Challenges.
- **Signature Verifier:** verifies EOA or contract-wallet authorization on the specified chain.
- **Security Operator:** may revoke or restrict a Wallet Link under an approved incident process.

## Definitions

- **Wallet Link:** a versioned relationship between one Platform Account and one wallet for specified purposes and chains.
- **Wallet Link Challenge:** a short-lived, single-use authorization request bound to an account session, operation, wallet, chain and relying-party domain.
- **Link Purpose:** an explicit permission category such as `PAYMENT`, `DISTRIBUTION`, `GOVERNANCE` or `LOGIN`.
- **Proof of Wallet Control:** valid authorization for the exact Wallet Link Challenge under the applicable EOA or contract-wallet verification method.
- **Sensitive Link Operation:** linking, unlinking, purpose expansion, distribution-address change, governance authorization or another operation designated by security policy.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Browser input, wallet-provider metadata, RPC responses and signatures are untrusted until validated.
- A valid signature proves control under the verification method at the verification context; it does not prove a unique human, ownership of the wallet's history, or legal authority beyond the signed operation.
- Contract-wallet signature validity may depend on chain state, modules, owners and time; verification context MUST be recorded.
- The Account session authenticates access to the Platform Account but does not prove Candidate Wallet control.
- The Candidate Wallet signature proves the signed link operation but does not by itself authorize unrelated account changes.

## Inputs

### Wallet Link Request

- `account_id`
- `wallet_address`
- `network_namespace`
- `chain_id`
- `requested_purposes`
- `idempotency_key`

### Wallet Link Challenge

- `challenge_id`
- opaque `account_binding`
- `operation`
- `domain`
- `uri`
- `statement`
- `wallet_address`
- `network_namespace`
- `chain_id`
- `nonce`
- `issued_at`
- `not_before` (optional)
- `expires_at`
- `request_id`
- `requested_purposes`
- `terms_version` (if acceptance is required)
- `message_format` and `message_version`

Client-supplied domain, URI, timestamps, purposes and account binding MUST NOT override authoritative Challenge Service values.

## Outputs

- immutable Wallet Link Challenge and status;
- signature-verification result and method;
- Wallet Link and active purposes;
- stable error identifier;
- auditable lifecycle events.

## State

### Challenge State

```text
ISSUED → CONSUMED
   ├──→ EXPIRED
   └──→ REJECTED
```

Every Challenge terminal state is irreversible. A new attempt requires a new nonce and `challenge_id`.

### Wallet Link State

```text
ACTIVE → REMOVAL_PENDING → UNLINKED
   │
   ├──→ RESTRICTED → ACTIVE
   └──→ REVOKED
```

`UNLINKED` and `REVOKED` are historical terminal records. Relinking creates a new Wallet Link version.

## Requirements

### MUST

- **REQ-ACCOUNT-031:** A Wallet Link Challenge MUST be issued only within an authenticated Account session authorized to perform the requested Sensitive Link Operation.
- **REQ-ACCOUNT-032:** The Challenge Service MUST generate each nonce with a cryptographically secure random source and MUST enforce single use within the relying-party domain.
- **REQ-ACCOUNT-033:** A Challenge MUST bind the account operation, opaque account binding, wallet address, network namespace, chain ID, relying-party domain, URI, nonce, issue time, expiration, request ID, requested purposes and message version.
- **REQ-ACCOUNT-034:** Challenge validity duration and trusted-clock tolerance MUST be defined by versioned security policy; verification after `expires_at` or before `not_before` MUST fail.
- **REQ-ACCOUNT-035:** The verifier MUST parse the signed message with the selected standard's exact grammar or schema before interpreting any field.
- **REQ-ACCOUNT-036:** Verification MUST compare every security-relevant signed field with the authoritative stored Challenge and expected relying-party configuration.
- **REQ-ACCOUNT-037:** EOA verification MUST recover and validate the signer using the exact signed bytes, approved signature scheme and chain-specific address normalization.
- **REQ-ACCOUNT-038:** Contract-wallet verification MUST call the approved ERC-1271-compatible method on the signed `chain_id` and require its defined valid return value.
- **REQ-ACCOUNT-039:** Contract-wallet verification MUST record chain, block reference, contract code identity where available, verification method and result because validity may depend on chain state.
- **REQ-ACCOUNT-040:** Challenge consumption and Wallet Link creation MUST be atomic so concurrent submissions cannot create duplicate links or reuse authorization.
- **REQ-ACCOUNT-041:** The Account Service MUST apply an explicit, versioned cardinality policy for wallets linked to multiple Accounts and MUST NOT infer a unique Person from that policy.
- **REQ-ACCOUNT-042:** Each Wallet Link MUST list its approved Link Purposes; adding a purpose MUST require a new purpose-bound authorization and applicable step-up authentication.
- **REQ-ACCOUNT-043:** Every Challenge and Wallet Link transition MUST record actor or service, prior and resulting state, message/policy versions, event and observation time, correlation ID and reason code.
- **REQ-ACCOUNT-044:** After linking, the Account Holder MUST receive a confirmation showing normalized wallet, chain context, purposes and instructions for removal or incident reporting.
- **REQ-ACCOUNT-045:** Unlinking or purpose reduction MUST require an authenticated, authorized Account operation with step-up authentication appropriate to the affected purposes.
- **REQ-ACCOUNT-046:** The system MUST prevent an unlink operation from silently removing the only usable authentication or recovery method; an approved alternative or explicit recovery workflow is required.
- **REQ-ACCOUNT-047:** Before unlinking, the system MUST identify active dependencies such as pending payment, distribution destination or governance authorization and apply the approved dependency-specific transition policy.
- **REQ-ACCOUNT-048:** Revocation or restriction MUST stop new authorization through the affected Wallet Link at its effective time without deleting earlier audit records.
- **REQ-ACCOUNT-049:** Relinking a previously unlinked or revoked wallet MUST create a new Wallet Link version and new proof; historical states MUST remain immutable.
- **REQ-ACCOUNT-050:** Challenge creation and verification MUST enforce account-, session-, wallet-, IP/device-risk- and global abuse controls under an approved security policy.
- **REQ-ACCOUNT-051:** Address parsing, checksum display, canonical comparison and chain context MUST be deterministic and tested for every supported network namespace.
- **REQ-ACCOUNT-052:** Successful linking, unlinking, restriction, revocation or sensitive-purpose change MUST rotate or re-evaluate affected sessions and authorization caches.
- **REQ-ACCOUNT-053:** Signature-verification errors returned to an unauthenticated or insufficiently authorized client MUST avoid disclosing whether a wallet is linked to another Account.

### MUST NOT

- **REQ-ACCOUNT-054:** A wallet address entered or observed without valid Challenge authorization MUST NOT create a Wallet Link.
- **REQ-ACCOUNT-055:** A Challenge or signature MUST NOT be accepted for a different domain, URI, chain, wallet, Account binding, operation, purpose or message version.
- **REQ-ACCOUNT-056:** A consumed, expired, rejected or unknown nonce MUST NOT be accepted again.
- **REQ-ACCOUNT-057:** Wallet control MUST NOT be treated as proof of unique human identity, Legal Identity, Creator status, Rights ownership or Governance eligibility.
- **REQ-ACCOUNT-058:** The system MUST NOT request a transaction, asset approval, asset transfer or unrestricted opaque signature when only Wallet Link authorization is intended.
- **REQ-ACCOUNT-059:** Private keys, seed phrases, raw authentication secrets, complete Legal Identity or unnecessary personal information MUST NOT be collected in the Wallet Linking flow or stored on-chain.
- **REQ-ACCOUNT-060:** An operator MUST NOT silently link, unlink, expand purposes or replace Wallet Link history without the distinct authorized adjustment or incident process.

### SHOULD

- **REQ-ACCOUNT-061:** EVM Wallet Linking SHOULD use ERC-4361 where its semantics fit; a different format requires documented domain separation, human-readable intent and equivalent replay protection.
- **REQ-ACCOUNT-062:** Structured authorization SHOULD use established formats such as EIP-712 when applicable, while adding separate nonce and replay controls because EIP-712 alone does not provide replay protection.
- **REQ-ACCOUNT-063:** The wallet UI SHOULD clearly display the Platform name, domain, wallet, chain, purpose, expiration and statement that the operation does not transfer assets.
- **REQ-ACCOUNT-064:** High-risk purpose additions and distribution-address changes SHOULD require phishing-resistant Account step-up authentication independent of the Candidate Wallet.
- **REQ-ACCOUNT-065:** Contract-wallet verification SHOULD use independently operated RPC sources or an equivalent documented integrity control.
- **REQ-ACCOUNT-066:** Account Holders SHOULD be able to view active and historical Wallet Links, purposes, last security-relevant use and revocation controls.

### MAY

- **REQ-ACCOUNT-067:** An approved implementation MAY support non-EVM wallet namespaces through separate versioned message and signature profiles that preserve all common invariants.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-IDENTITY-003`
- `INV-PRIVACY-001`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- **SPEC-INV-ACCOUNT-005:** Every active Wallet Link is backed by exactly one successfully consumed purpose-bound Challenge or an explicitly identified authorized migration record.
- **SPEC-INV-ACCOUNT-006:** A Challenge can authorize no more than one successful state transition.
- **SPEC-INV-ACCOUNT-007:** Wallet Link history never establishes that two Accounts represent the same or different Persons.
- **SPEC-INV-ACCOUNT-008:** Unlinking changes Platform authorization but does not claim to move or recover blockchain assets.

## State Transitions

| Source | Trigger | Preconditions and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | request challenge | authenticated authorized session; valid wallet/chain/purpose request | `ISSUED` | `WalletLinkChallengeIssued` | reject with stable error and abuse signal as appropriate |
| `ISSUED` | submit signature | exact Challenge match; valid EOA or contract-wallet proof; within time | `CONSUMED` and new `ACTIVE` link | `WalletLinkChallengeConsumed`, `WalletLinked` | `REJECTED` or retry under bounded policy |
| `ISSUED` | trusted time reaches expiry | not consumed | `EXPIRED` | `WalletLinkChallengeExpired` | require new Challenge |
| `ACTIVE` | request unlink | step-up authentication; dependency policy satisfied | `REMOVAL_PENDING` or `UNLINKED` | `WalletUnlinkRequested` | remain `ACTIVE` with reason |
| `REMOVAL_PENDING` | dependencies cleared | approved conditions completed | `UNLINKED` | `WalletUnlinked` | remain pending or escalate |
| `ACTIVE` | security restriction | approved risk or incident condition | `RESTRICTED` | `WalletLinkRestricted` | deny affected new authorization |
| `RESTRICTED` | security clearance | approved review and step-up as required | `ACTIVE` | `WalletLinkRestored` | remain restricted |
| `ACTIVE`/`RESTRICTED` | terminal revocation | approved incident or account-security process | `REVOKED` | `WalletLinkRevoked` | deny all new authorization |

## Interfaces

Equivalent operations MUST be exposed:

```text
createWalletLinkChallenge(account_id, wallet_address, chain_id, requested_purposes, idempotency_key)
verifyAndConsumeWalletLinkChallenge(challenge_id, signed_message, signature)
listWalletLinks(account_id)
requestWalletUnlink(account_id, wallet_link_id, purposes, idempotency_key)
restrictWalletLink(wallet_link_id, reason_code, authorization)
revokeWalletLink(wallet_link_id, reason_code, authorization)
```

Verification results MUST distinguish EOA and contract-wallet methods and include a stable verifier/profile version. Transport and session mechanisms are implementation-defined but MUST preserve the normative bindings.

## Error Conditions

| Error ID | Condition | Required behavior |
| :--- | :--- | :--- |
| `ACCOUNT_SESSION_REQUIRED` | No sufficiently authenticated Account session | Reject without Challenge |
| `WALLET_ADDRESS_INVALID` | Address is malformed for namespace/chain | Reject without normalization guess |
| `WALLET_LINK_CHALLENGE_MISMATCH` | Signed field differs from authoritative Challenge | Reject and audit security signal |
| `WALLET_LINK_CHALLENGE_EXPIRED` | Trusted time outside validity window | Reject and require new Challenge |
| `WALLET_LINK_CHALLENGE_REPLAYED` | Challenge or nonce was consumed or terminated | Reject without state change |
| `WALLET_SIGNATURE_INVALID` | EOA or contract signature is invalid | Reject without revealing unrelated Account data |
| `CONTRACT_WALLET_VERIFICATION_UNAVAILABLE` | Chain or ERC-1271 verification cannot be trusted | Fail closed and retry safely |
| `WALLET_LINK_POLICY_CONFLICT` | Cardinality or purpose policy disallows link | Reject with authorized-user-safe explanation |
| `WALLET_LINK_DEPENDENCY_ACTIVE` | Unlink would break an active dependency | Apply transition policy; do not silently remove |
| `RECOVERY_METHOD_REQUIRED` | Unlink would remove sole authentication/recovery path | Reject until approved alternative exists |
| `WALLET_LINK_STATE_CONFLICT` | Concurrent or invalid lifecycle transition | Return current state and correlation ID |
| `RATE_LIMITED` | Abuse threshold reached | Delay or reject without leaking linkage status |

## Security Requirements

- Nonces and challenge identifiers MUST be unpredictable and stored with atomic terminal-state enforcement.
- Domain and URI allowlists MUST prevent subdomain, port, scheme and internationalized-domain confusion under the approved normalization policy.
- Signature verification MUST protect against malleability and invalid-curve or chain-specific equivalent issues through vetted libraries.
- Contract-wallet calls MUST use bounded resources and treat revert, unexpected return value or unavailable canonical state as invalid or unavailable, never valid.
- Link-management endpoints MUST use CSRF protection where cookie sessions are used and MUST rotate session identifiers after security-sensitive state changes.
- Logs MUST redact signatures when retention is unnecessary and MUST never contain session secrets, private keys or seed phrases.
- Account takeover, SIM/email compromise, malicious browser extension, phishing domain, replay, RPC compromise and compromised operator credentials MUST be included in threat modeling.

## Privacy Requirements

- Public blockchain writes are not required for Wallet Linking and SHOULD be avoided unless a separate approved specification requires them.
- The Account-to-wallet relationship MUST be access-controlled and disclosed only for defined purposes.
- Public APIs MUST prevent wallet-address enumeration of Account membership.
- Retention of rejected Challenges, signatures, device/IP risk data and Wallet Link history MUST follow documented necessity and retention policies.

## Failure Handling

- Challenge or verifier dependency failure fails closed and does not consume the Challenge unless the final atomic transition succeeds.
- Retrying with the same creation idempotency key returns the original unexpired Challenge or a stable terminal result.
- Ambiguous verification outcome does not create a Wallet Link.
- Partial unlink failure leaves the link in a restrictive, auditable state rather than reporting success.
- Recovery from data-store failure MUST preserve nonce-consumption and link-history uniqueness.

## Idempotency and Replay Protection

- Challenge creation idempotency is scoped to Account, operation and idempotency key.
- Challenge consumption uniqueness is scoped to relying-party domain, Challenge ID and nonce.
- Signed authorization MUST be useless across account bindings, domains, chains, wallets, operations, purposes and message versions.
- Link and unlink commands MUST use optimistic concurrency or an equivalent serializable transition control.

## Audit Requirements

Audit records MUST include:

- pseudonymous account, Challenge and Wallet Link identifiers;
- normalized wallet, namespace and chain;
- requested and resulting purposes;
- message, verifier and policy versions;
- EOA or contract-wallet verification method and contract verification block reference;
- state transition, actor/service, timestamps, correlation ID and reason code;
- step-up authentication class without storing authentication secrets.

Audit access is restricted. Public transparency MUST use aggregation or privacy-preserving evidence rather than publishing the Account-to-wallet graph.

## Versioning and Migration

- Message-format, domain-separation, signature-verification or purpose-semantics changes require explicit compatibility analysis and may require a new major specification version.
- Existing consumed Challenges and Wallet Link history retain their original verifier and policy versions.
- Migration MUST NOT mark a legacy link active unless its proof or authorized migration record is preserved and its purposes are explicit.
- A migration MUST prove that no nonce becomes reusable and no removed or revoked link becomes active accidentally.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-ACCOUNT-031–034 | Authentication / property | Only authorized sessions receive unique, single-use, time-bounded, fully bound Challenges |
| REQ-ACCOUNT-035–039 | Standards / integration | Exact parsing and field comparison work; EOA and ERC-1271 verification use correct chain/context |
| REQ-ACCOUNT-040–043 | Concurrency / policy / audit | Concurrent submissions create one link; cardinality, purpose and event policies are enforced |
| REQ-ACCOUNT-044–049 | Lifecycle / recovery | Confirmation, step-up, dependency, restriction, unlink and relink behavior preserves safety and history |
| REQ-ACCOUNT-050–053 | Abuse / session / privacy | Rate limits, normalization, session rotation and anti-enumeration behavior are enforced |
| REQ-ACCOUNT-054–056 | Negative / replay | Address-only, cross-context and replay attempts never create a link |
| REQ-ACCOUNT-057–060 | Identity / transaction / privacy / authorization | No identity inference, unintended asset action, prohibited data collection or silent operator mutation occurs |
| REQ-ACCOUNT-061–066 | Standards / UX / security conformance | Implemented SHOULD behavior is verified or deviation is documented under conventions |
| REQ-ACCOUNT-067 | Optional conformance | Non-EVM profile preserves every common MUST, MUST NOT and invariant |

Tests MUST include concurrent consumption, expired/not-before boundaries, altered domain/URI/chain/purpose, Unicode-domain confusion, EOA malleability cases, ERC-1271 valid/revert/wrong-value/state-change cases, stale RPC, session fixation, unlink-with-dependency and account-enumeration attempts.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- ERC-4361 conformance tests cover parsing and all expected-value checks used by the implementation.
- EOA and ERC-1271 test wallets pass positive and adversarial verification suites.
- Concurrency testing proves each Challenge produces at most one successful transition.
- Threat modeling and security review approve domain normalization, session controls, recovery and operator permissions.
- Privacy testing shows unauthenticated clients cannot enumerate Account-to-wallet relationships.
- Operational runbooks cover suspected wallet compromise, Account takeover, verifier outage, erroneous link and emergency revocation.

## Open Questions

- **OQ-WALLET-LINKING-001:** **Decision owner:** Operating Company / Security; **Blocks:** wallet-linking launch; **Question:** Which Account authentication and step-up mechanisms will be used initially?
- **OQ-WALLET-LINKING-002:** **Decision owner:** Operating Company / Product and Security; **Blocks:** authentication scope; **Question:** Is the first wallet signature used only for linking, or also for optional login?
- **OQ-WALLET-LINKING-003:** **Decision owner:** Operating Company / Risk, Product and Privacy; **Blocks:** wallet uniqueness policy; **Question:** What is the exact policy for one wallet linked to multiple Platform Accounts?
- **OQ-WALLET-LINKING-004:** **Decision owner:** Protocol Governance / Security and Product; **Blocks:** Link Purpose authorization; **Question:** Which Link Purposes may coexist on one wallet, and which require separate wallets?
- **OQ-WALLET-LINKING-005:** **Decision owner:** Operating Company / Security; **Blocks:** Challenge implementation; **Question:** What Challenge lifetime and clock tolerance will be approved?
- **OQ-WALLET-LINKING-006:** **Decision owner:** Protocol Governance / Security and Operations; **Blocks:** ERC-1271 production verification; **Question:** Which RPC/finality sources and block-reference policy will ERC-1271 verification use?
- **OQ-WALLET-LINKING-007:** **Decision owner:** Operating Company / Product, Finance and Governance Operations; **Blocks:** safe unlinking; **Question:** How are active subscriptions, distributions and governance actions migrated during unlinking?
- **OQ-WALLET-LINKING-008:** **Decision owner:** Operating Company / Legal, Privacy and Security; **Blocks:** production data policy; **Question:** What retention periods apply to signatures, rejected Challenges and risk metadata?
