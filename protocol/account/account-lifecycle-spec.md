# Account Lifecycle, Authentication and Recovery

**Status:** Draft  
**Version:** 0.1.0
**Protocol Domain:** account / identity  
**Specification ID:** SPEC-ACCOUNT-003  
**Last Updated:** 2026-09-03

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/01-vision.md`
- Whitepaper: `docs/whitepaper/05-creator-onboarding.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0008-account-wallet-identity-strategy.md`
- ADR: `docs/adr/ADR-0019-jpki-passkey-wallet-binding-testnet.md`
- ADR: `docs/adr/ADR-0020-wallet-agnostic-participant-invitations.md`
- Standard: [W3C Web Authentication Level 3](https://www.w3.org/TR/webauthn-3/)
- Guidance: [NIST SP 800-63B-4 Authentication and Lifecycle Management](https://pages.nist.gov/800-63-4/sp800-63b.html)

### Related Specifications

- `protocol/account/wallet-linking-spec.md`
- `protocol/account/subscription-settlement-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define a durable Platform Account lifecycle with secure authenticator binding, sessions, authorization, recovery, restriction and closure so that content access, Wallet Links, Creator functions and governance references depend on explicit Account state rather than an email address or wallet.

## Current Implementation Conformance

The local `POST /v1/demo/users` implementation alone is not an implementation of Account registration defined by this specification. It attaches an ephemeral Alias profile and notice-version record to an automatically generated synthetic Demo Principal, and its registration state MUST NOT be used as Account, Subscription, Wallet Link, Credential or legal-identity authorization input.

The current ADR-0020 participant-invitation pilot implements a separate pre-registration boundary. An authorized operator creates a time-bounded role invitation without knowing a Wallet address; only a token digest is retained, while the one-time token is delivered in a URL fragment. The invited person later selects a Polygon Amoy Wallet and proves control with a server-verified SIWE signature bound to the invitation identifier, approved role set, consent version and chain identifier before the invitation can be claimed. A generic sign-in signature cannot claim an invitation. After the claim, the operator separately records the on-chain approval and supplies the bounded initial Test POL; the bound Wallet separately activates each approved User or Creator role from its role-specific service page. This claim and these testnet roles are test-participant evidence only: they are not a production Platform Account, legal identity, Creator verification, Rights verification, payee verification or production eligibility.

ADR-0020's simplified public-experiment flow is implemented: an application enters human review before its contact email is verified; approval produces the normal accepted path's only email; and the single-use invitation token plus an invitation-bound SIWE proof jointly confirm email reachability, the selected Wallet and the versioned participation acknowledgement. The authoritative service retains distinct audit states, while the participant view renders only the current primary action. After Wallet claim, the operator-owned on-chain approval and initial Test POL funding run automatically and are reconciled after transient failure or process restart without a normal administrator execution button.

The ADR-0019 Account Trust pilot adds a bounded `CREATED → JPKI_ASSERTED → PASSKEY_REGISTERED → WALLET_BOUND → ACTIVE` binding transaction. It verifies WebAuthn registration and authentication server-side, stores only public-key credential metadata, verifies an operation-bound Polygon Amoy EIP-712 wallet signature and records state transitions. Its JPKI result is explicitly non-cryptographic Mock data, `ACTIVE` is a pilot binding state rather than the production Platform Account state, and it supplies no recovery, restriction, closure, rate-limit, notification or production retention implementation. It therefore gives local test evidence for parts of `REQ-ACCOUNT-068`, `REQ-ACCOUNT-069`, `REQ-ACCOUNT-078`, `REQ-ACCOUNT-099`, `REQ-ACCOUNT-101` and `REQ-ACCOUNT-105`, but cannot satisfy `REQ-ACCOUNT-068`–`REQ-ACCOUNT-114` acceptance as a whole. It remains a bounded fixture under `MOCK-ASSUMPTION-001` while the production Open Questions remain open.

## Scope

This specification covers:

- Account registration and activation;
- authentication-method binding and removal;
- session creation, renewal and termination;
- step-up authentication for sensitive operations;
- recovery initiation and completion;
- restriction, suspension, closure, retention and audit;
- logical separation from Wallet, Legal Identity and role credentials.

## Out of Scope

- detailed legal-identity or age-verification procedures;
- Creator and Rights verification;
- governance eligibility;
- Wallet signature verification details;
- payment, subscription and distribution calculations;
- customer-support staffing and jurisdiction-specific retention periods;
- a final choice of identity provider or authentication vendor.

## Actors

- **Applicant:** a person initiating Account registration.
- **Account Holder:** an actor authenticated to an active Platform Account.
- **Account Service:** authoritative owner of Account state and identifiers.
- **Authentication Service:** binds and verifies approved authenticators.
- **Session Service:** creates and terminates authenticated sessions.
- **Recovery Service:** applies approved Account recovery policy.
- **Authorization Service:** evaluates roles, credentials, Account state and operation policy.
- **Security Operator:** applies authorized restrictions or suspension.
- **Privacy and Legal Operator:** executes approved access, retention, closure and legal-hold processes.

## Definitions

- **Platform Account:** the persistent application-level identity defined in `protocol/glossary.md`.
- **Authenticator:** a secret, key, device, passkey or federated mechanism bound under an approved authentication profile.
- **Authentication Profile:** a versioned policy defining acceptable authenticators, combinations, assurance and reauthentication for a class of operation.
- **Account Session:** a time-bounded continuity mechanism established after successful authentication.
- **Step-up Authentication:** a new authentication event satisfying a stronger or fresher Authentication Profile for a sensitive operation.
- **Recovery Case:** an auditable, time-bounded process for binding replacement authenticators when ordinary authentication is unavailable.
- **Account Closure:** the transition that ends ordinary service use while preserving only data and obligations required by approved retention, legal, accounting, rights or security policy.

## Trust Boundaries

- Client state, browser storage, device signals, contact addresses and federation assertions are untrusted until verified.
- Authentication proves control of approved authenticators under a profile; it does not by itself prove Legal Identity, Creator status, Rights ownership or governance eligibility.
- Session possession is authorization input, not permanent proof of the Account Holder's presence.
- Recovery is a separate, high-risk lifecycle process and MUST NOT be treated as a convenient alternative login.
- Support and Security Operators require explicit scoped authority; privileged access MUST NOT substitute for Account Holder authentication without an auditable approved process.

## Inputs

### Registration Request

- `idempotency_key`
- accepted `terms_version` and `privacy_notice_version`
- selected authentication method and ceremony result
- required contact or eligibility attributes under the approved registration policy
- locale and accessibility preferences (optional)

### Authentication Request

- opaque Account lookup or discoverable credential context
- Authentication Profile identifier
- authenticator response
- server-generated challenge and request context

### Sensitive Lifecycle Operation

- `account_id`
- operation and requested change
- Account Session and required Step-up Authentication result
- idempotency key
- reason and evidence references where policy requires

Client-supplied Account state, roles, assurance level, timestamps or policy version MUST NOT override authoritative service data.

## Outputs

- opaque `account_id` and immutable Account history;
- Account state and version;
- authenticator-binding records without secret material;
- Account Session with assurance and expiry metadata;
- Recovery Case or lifecycle transition result;
- stable error and audit identifiers.

## State

```text
PENDING → ACTIVE → RESTRICTED → ACTIVE
              │         │
              ├─────────┴→ SUSPENDED → ACTIVE
              │
              └→ CLOSURE_PENDING → CLOSED
```

- `PENDING` cannot access paid or privileged functions except those required to complete registration.
- `RESTRICTED` permits only the explicitly approved limited operations.
- `SUSPENDED` denies ordinary authentication or authorization until an approved review resolves it.
- `CLOSURE_PENDING` permits cancellation, export, settlement and other approved wind-down operations only.
- `CLOSED` is terminal for the Account version; identifiers MUST NOT be reassigned.

## Requirements

### MUST

- **REQ-ACCOUNT-068:** The Account Service MUST create an opaque, non-guessable, immutable `account_id` that is not an email address, phone number, username, Wallet address or external-provider subject.
- **REQ-ACCOUNT-069:** Account, Wallet, Person, Legal Identity, Creator, Rights Holder and Governance Identity MUST remain logically distinct records connected only by explicit versioned relationships.
- **REQ-ACCOUNT-070:** Registration MUST be idempotent and MUST prevent concurrent requests from creating unintended duplicate Accounts under the approved deduplication policy.
- **REQ-ACCOUNT-071:** Account activation MUST require completion of the approved registration policy, including at least one verified authenticator and recorded acceptance of applicable terms and privacy notice versions.
- **REQ-ACCOUNT-072:** Consent and notice records MUST include version, effective text reference, event time, Account reference and collection context without claiming consent where another legal basis applies.
- **REQ-ACCOUNT-073:** Every Account state change MUST use an allowed transition, optimistic concurrency or equivalent serialization, and a stable reason code.
- **REQ-ACCOUNT-074:** Every authentication and sensitive operation MUST identify the Authentication Profile, required assurance, authenticator result and authentication time used.
- **REQ-ACCOUNT-075:** The Account Service MUST support binding more than one approved authenticator or an equivalently resilient recovery design before high-risk functions are enabled.
- **REQ-ACCOUNT-076:** Binding or replacing an authenticator after activation MUST require a recent authorized session plus Step-up Authentication, or an approved Recovery Case.
- **REQ-ACCOUNT-077:** Authenticator secrets MUST be protected with method-appropriate storage; plaintext passwords, private keys, seed phrases and reusable recovery secrets MUST NOT be stored.
- **REQ-ACCOUNT-078:** WebAuthn registration and authentication, when supported, MUST verify challenge, origin, RP ID, ceremony type, credential identity, signature, user presence/verification requirements and signature-counter or backup-state policy as applicable.
- **REQ-ACCOUNT-079:** Session secrets MUST be generated using a cryptographically secure random source, be opaque to clients where practical, and have sufficient entropy under the approved security policy.
- **REQ-ACCOUNT-080:** Browser session cookies MUST be transmitted only over HTTPS, scoped to the minimum practical host/path, inaccessible to JavaScript, and configured with approved `SameSite`, expiry and host-prefix controls.
- **REQ-ACCOUNT-081:** Every Account Session MUST have absolute and inactivity lifetimes, an authentication time, assurance context and server-enforced termination policy.
- **REQ-ACCOUNT-082:** Authentication, recovery, privilege change, authenticator change, Wallet Link security change and other designated high-risk transitions MUST rotate or terminate affected Session secrets and authorization caches.
- **REQ-ACCOUNT-083:** Account Holders and authorized Security Operators MUST be able to terminate individual sessions and all Account sessions, with prompt server-side enforcement.
- **REQ-ACCOUNT-084:** Sensitive operations MUST require recent Step-up Authentication under an operation-specific profile and MUST bind approval to the exact operation parameters.
- **REQ-ACCOUNT-085:** Recovery MUST follow a versioned risk-based policy that is not materially weaker than the protected Account functions and MUST require independent evidence or factors defined by that policy.
- **REQ-ACCOUNT-086:** Recovery initiation, authenticator addition/removal, material profile change, restriction, suspension and closure MUST generate notifications through established safe channels when available.
- **REQ-ACCOUNT-087:** High-risk Recovery Cases MUST support policy-defined delay, review, cancellation and protective restriction before new authenticators receive full sensitive permissions.
- **REQ-ACCOUNT-088:** Successful recovery MUST terminate or restrict pre-recovery sessions and authenticators according to policy, rotate recovery material and record every surviving authorization path.
- **REQ-ACCOUNT-089:** Authorization MUST evaluate current Account state, role/credential status, operation policy and authentication context; successful authentication alone MUST NOT grant every capability.
- **REQ-ACCOUNT-090:** Creator, Rights Holder, Governance and corporate-operator capabilities MUST require separate current credentials or roles and MUST NOT arise automatically from Account activation.
- **REQ-ACCOUNT-091:** Restriction or suspension MUST fail closed for affected operations while preserving access to approved safety, appeal, export or wind-down functions.
- **REQ-ACCOUNT-092:** Closure MUST identify active subscriptions, financial records, Wallet Links, rights claims, disputes, governance duties, legal holds and other dependencies before final state transition.
- **REQ-ACCOUNT-093:** Data retention, deletion, anonymization and legal-hold decisions MUST use versioned policies by data category and MUST leave auditable evidence of execution.
- **REQ-ACCOUNT-094:** Every registration, authentication, session, authenticator, recovery, authorization denial and lifecycle event MUST have integrity-protected audit data appropriate to its risk.
- **REQ-ACCOUNT-095:** Registration, authentication, recovery and Account lookup MUST enforce layered rate limiting and abuse detection without enabling Account enumeration.
- **REQ-ACCOUNT-096:** Personal data collection and disclosure MUST be limited to defined purposes and separated from public protocol identifiers and on-chain data.
- **REQ-ACCOUNT-097:** Account access, correction, export, appeal and redress requests MUST route through an authenticated or otherwise verified process with status and audit records.

### MUST NOT

- **REQ-ACCOUNT-098:** The Account Service MUST NOT use a Wallet address, email address, phone number or external-provider identifier as the immutable primary Account identifier.
- **REQ-ACCOUNT-099:** A Wallet signature or possession of an active Session alone MUST NOT be treated as Legal Identity verification or continuing physical presence.
- **REQ-ACCOUNT-100:** Authentication and recovery responses MUST NOT reveal whether an Account, email, phone, Wallet Link or external-provider subject exists to an unauthorized requester.
- **REQ-ACCOUNT-101:** Biometric samples or templates used locally by an authenticator MUST NOT be collected by the Platform merely because WebAuthn user verification is used.
- **REQ-ACCOUNT-102:** An Operator MUST NOT activate, recover, merge, suspend, close or reassign an Account outside a distinct authorized and auditable lifecycle process.
- **REQ-ACCOUNT-103:** Account closure MUST NOT erase or release financial, rights, dispute, security or legal records contrary to the applicable approved retention or hold policy.
- **REQ-ACCOUNT-104:** A CLOSED `account_id`, authenticator binding, recovery secret or session identifier MUST NOT be reassigned to another Account.
- **REQ-ACCOUNT-105:** Authentication credentials, session secrets, recovery codes or detailed Account-to-Wallet relationships MUST NOT be stored on a public blockchain.

### SHOULD

- **REQ-ACCOUNT-106:** Phishing-resistant authenticators such as appropriately configured WebAuthn credentials SHOULD be preferred for high-risk functions.
- **REQ-ACCOUNT-107:** Account Holders SHOULD be encouraged to bind at least two independent authentication or recovery means, with clear explanation of availability and attack-surface tradeoffs.
- **REQ-ACCOUNT-108:** Account Holders SHOULD be able to inspect active sessions, authenticators, recent security events, Wallet Links and recovery readiness.
- **REQ-ACCOUNT-109:** Authentication and recovery user experiences SHOULD provide accessible, localized and non-deceptive explanations of consequences and next steps.
- **REQ-ACCOUNT-110:** Risk signals SHOULD trigger proportionate Step-up Authentication or restriction rather than silent permanent denial, subject to fraud and safety constraints.
- **REQ-ACCOUNT-111:** Federated authentication SHOULD minimize attributes and use pairwise or otherwise privacy-preserving subject identifiers where supported.
- **REQ-ACCOUNT-112:** Recovery and closure SHOULD include policy-defined cooling-off or cancellation periods where delay reduces takeover or irreversible-loss risk.

### MAY

- **REQ-ACCOUNT-113:** An implementation MAY support password authentication only under an approved profile with modern salted password hashing, compromised-password screening, rate limiting and migration toward phishing-resistant methods.
- **REQ-ACCOUNT-114:** An implementation MAY support guest or pseudonymous Accounts with reduced capabilities, provided their state and upgrade path are explicit and they cannot bypass eligibility, payment, rights or legal requirements.

### Test participant invitation profile

- **REQ-ACCOUNT-123:** A pre-registration invitation MUST NOT require the operator to know or select the participant Wallet address before the participant claims it.
- **REQ-ACCOUNT-124:** Invitation tokens MUST be generated from a cryptographically secure random source, be single-use and time-bounded, and only a one-way digest MUST be retained after issuance.
- **REQ-ACCOUNT-125:** Contact addresses, legal names, invitation tokens and directly reversible derivatives MUST NOT be written to a public blockchain.
- **REQ-ACCOUNT-126:** Claiming an invitation MUST require server-side verification of control of the Wallet selected by the invited person and MUST bind the result to the invitation, role set, consent context and Polygon Amoy chain identifier.
- **REQ-ACCOUNT-127:** Public invitation inspection MUST NOT disclose the contact address or administrator-only audit data.
- **REQ-ACCOUNT-128:** Administrator invitation operations MUST require server-side authentication; knowledge of an unlisted administrator-page URL MUST NOT grant authority.
- **REQ-ACCOUNT-129:** Email delivery acceptance, Wallet proof, off-chain invitation claim, on-chain role registration and Test POL funding MUST be separately observable states and MUST NOT be represented as one atomic success.
- **REQ-ACCOUNT-130:** A participant invitation or Wallet signature MUST NOT by itself grant production Account, Creator, Rights Holder, payee, legal-identity or governance eligibility.
- **REQ-ACCOUNT-131:** Invitation creation, email delivery, Wallet proof, invitation claim, operator on-chain approval, initial Test POL funding and role self-registration MUST remain distinct authoritative states, while the participant view MUST present only the current primary action and identify whether the participant or operator owns that action.
- **REQ-ACCOUNT-132:** A dual-role invitation MUST reuse one invitation and Wallet proof while preserving independent User and Creator role registration and service-entry states.
- **REQ-ACCOUNT-133:** The participant view MUST present different post-claim procedures and qualification boundaries for User and Creator roles.
- **REQ-ACCOUNT-134:** A participant-facing operation MUST NOT state or imply that an operator-controlled on-chain step, funding step or role activation succeeded unless authoritative evidence confirms that distinct state.
- **REQ-ACCOUNT-135:** A public-experiment application MUST be distinct from an invitation and MUST NOT itself grant any off-chain or on-chain participant role, funding, entitlement or production Account status.
- **REQ-ACCOUNT-136:** The controlled public-experiment profile MAY place an application under human review before contact-email verification, but it MUST label the contact and applicant attributes unverified and MUST NOT grant an invitation, role, funding or production status from the application alone.
- **REQ-ACCOUNT-137:** Approval MUST create a distinct cryptographically random, single-use, time-bounded invitation without requiring the operator to pre-collect or choose the applicant Wallet, and the normal accepted path MUST send one combined participation email rather than separate verification and invitation emails.
- **REQ-ACCOUNT-138:** The combined invitation claim MUST require both possession of the email-delivered token and server-verified control of the selected Wallet, and MUST bind the invitation, role set, acknowledgement bundle version and Polygon Amoy chain identifier.
- **REQ-ACCOUNT-139:** Loading, previewing or security-scanning an invitation URL MUST NOT consume the token or mark the email verified; consumption MUST require an explicit participant action and successful operation-bound Wallet proof.
- **REQ-ACCOUNT-140:** Application review, invitation creation, notification delivery, email reachability confirmation, Wallet proof, invitation claim and every on-chain preparation state MUST be separately auditable; delivery acceptance or URL loading MUST NOT be represented as claim success.
- **REQ-ACCOUNT-141:** A participant-facing page MUST hide completed input forms and unavailable future controls by default, MUST render no more than one primary action for its authoritative current state, and MAY expose completed steps only as a read-only collapsed summary.
- **REQ-ACCOUNT-142:** A resend or retry control MUST be absent until the authoritative service determines that the corresponding recovery action is applicable; disabled presentation alone MUST NOT be the policy enforcement mechanism.
- **REQ-ACCOUNT-143:** Invitation resend MUST enforce server-side state, expiry, cooldown, attempt limit, idempotency and abuse controls, MUST invalidate the prior token when a new token is issued, and MUST return a safe next-eligible time without disclosing unrelated account existence.
- **REQ-ACCOUNT-144:** The required public-experiment acknowledgement SHOULD be presented as one versioned bundle covering the displayed test-only conditions, applicable terms and privacy notice; optional marketing or unrelated processing choices MUST remain separate and MUST NOT be preselected or required for participation.
- **REQ-ACCOUNT-145:** An emailed participation link MUST use a stable HTTPS entry point. Any runtime indirection used before a fixed application hostname is available MUST preserve the URL fragment, validate the destination against published runtime policy and fail closed without exposing the invitation token to logs or an unapproved origin.
- **REQ-ACCOUNT-146:** Human approval MUST schedule the operator-owned preparation flow; once the approved participant claims the invitation and selects a Wallet, on-chain approval and bounded initial Test POL funding MUST execute and recover automatically with stable idempotency identifiers. The normal administrator interface MUST expose status and evidence but MUST NOT require a separate invitation-enrollment execution or retry button.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-IDENTITY-003`
- `INV-PRIVACY-001`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- **SPEC-INV-ACCOUNT-009:** An Account identifier never becomes a Wallet, contact address, authenticator or Legal Identity identifier.
- **SPEC-INV-ACCOUNT-010:** Every active Account has at least one current approved authentication or recovery path.
- **SPEC-INV-ACCOUNT-011:** Recovery never silently grants Creator, Rights, Governance or corporate authority.
- **SPEC-INV-ACCOUNT-012:** A lifecycle transition never silently deletes finalized financial, rights, dispute or security history.
- **SPEC-INV-ACCOUNT-013:** A CLOSED Account identifier is never reused.

## State Transitions

| Source | Trigger | Preconditions and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | register | idempotent request; acceptable policy; authenticator ceremony begins | `PENDING` | `AccountRegistrationStarted` | reject without partial active Account |
| `PENDING` | complete registration | verified authenticator; required policy and notice records | `ACTIVE` | `AccountActivated` | remain `PENDING` or expire registration |
| `ACTIVE` | protective restriction | authorized risk/policy condition | `RESTRICTED` | `AccountRestricted` | deny affected operations if outcome uncertain |
| `RESTRICTED` | review completed | approved remediation or appeal outcome | `ACTIVE` or `SUSPENDED` | `AccountRestrictionResolved` | remain restricted |
| `ACTIVE`/`RESTRICTED` | security/legal suspension | authorized high-impact condition | `SUSPENDED` | `AccountSuspended` | fail closed for ordinary access |
| `SUSPENDED` | review completed | approved restoration and authentication reset as required | `ACTIVE` or `RESTRICTED` | `AccountRestored` | remain suspended |
| `ACTIVE`/`RESTRICTED` | request closure | verified Account Holder or authorized legal process; dependencies assessed | `CLOSURE_PENDING` | `AccountClosureRequested` | reject or remain current state with reasons |
| `CLOSURE_PENDING` | cancel closure | within approved window; authorized request | prior allowed state | `AccountClosureCancelled` | remain pending |
| `CLOSURE_PENDING` | complete wind-down | required settlement, export, holds and retention actions recorded | `CLOSED` | `AccountClosed` | remain pending; never claim closed early |

## Interfaces

Equivalent operations MUST be available:

```text
startRegistration(registration_request)
completeRegistration(registration_id, authenticator_result)
authenticate(authentication_request)
reauthenticate(session_id, profile_id, authenticator_result)
listSessions(account_id)
terminateSession(account_id, session_id)
terminateAllSessions(account_id)
bindAuthenticator(account_id, authenticator_ceremony, idempotency_key)
removeAuthenticator(account_id, authenticator_id, idempotency_key)
startRecovery(recovery_request)
completeRecovery(recovery_case_id, evidence)
requestAccountClosure(account_id, idempotency_key)
getAccountState(account_id)
```

Interfaces MUST return schema and policy versions, stable errors and correlation identifiers. Authorization decisions MUST be made server-side from authoritative current state.

## Error Conditions

| Error ID | Condition | Required behavior |
| :--- | :--- | :--- |
| `REGISTRATION_POLICY_NOT_SATISFIED` | Required registration element is missing | Keep non-active; return safe next action |
| `AUTHENTICATION_FAILED` | Authenticator verification fails | Generic response; rate-limit and audit |
| `AUTHENTICATION_PROFILE_INSUFFICIENT` | Authentication is too weak or stale for operation | Require explicit Step-up Authentication |
| `SESSION_EXPIRED` | Absolute or inactivity lifetime ended | Terminate server-side and require authentication |
| `SESSION_REVOKED` | Session was terminated by holder/operator/event | Reject immediately |
| `AUTHENTICATOR_ALREADY_BOUND` | Binding conflicts with existing state/policy | Return stable existing state or safe conflict |
| `AUTHENTICATOR_REQUIRED` | Removal would leave no approved path | Reject until replacement/recovery path exists |
| `RECOVERY_POLICY_NOT_SATISFIED` | Evidence/factors/delay/review incomplete | Do not bind replacement authenticator |
| `ACCOUNT_RESTRICTED` | Operation is outside restriction allowance | Deny with appeal/redress route when appropriate |
| `ACCOUNT_SUSPENDED` | Ordinary operation attempted while suspended | Deny without revealing sensitive cause |
| `ACCOUNT_DEPENDENCY_ACTIVE` | Closure conflicts with unresolved dependency | Keep `CLOSURE_PENDING` and identify authorized next step |
| `ACCOUNT_STATE_CONFLICT` | Concurrent or invalid transition | Return current state/version and correlation ID |
| `ACCOUNT_NOT_DISCLOSED` | Lookup cannot safely confirm existence | Return uniform privacy-preserving response |

## Security Requirements

- Registration, authentication and recovery challenges MUST be generated server-side, unpredictable, purpose-bound, time-bounded and single-use.
- Authentication libraries and identity providers MUST be pinned, monitored and configured through reviewed profiles.
- Session storage and transport MUST protect confidentiality, integrity, rotation and prompt revocation.
- CSRF, XSS, open redirect, session fixation, credential stuffing, enumeration, recovery takeover, malicious federation and support-operator compromise MUST be covered by threat modeling.
- Privileged lifecycle actions MUST require least privilege, separation of duties appropriate to risk and immutable audit records.
- Recovery and closure runbooks MUST include incident escalation and prevention of irreversible partial state.

## Privacy Requirements

- Account identifiers exposed across contexts SHOULD be pairwise or scoped where global correlation is unnecessary.
- Authentication telemetry, device/IP risk data and recovery evidence MUST have explicit purpose, access and retention policies.
- Account existence and Account-to-Wallet relationships MUST not be publicly enumerable.
- WebAuthn biometric user verification occurs within the authenticator; the Platform stores ceremony results and public-key credential data, not biometric samples.
- Public transparency metrics MUST be aggregated or privacy-preserving.

## Failure Handling

- Authentication, authorization or state-store uncertainty fails closed for protected operations.
- Session-service failure MUST NOT cause sessions to become valid beyond their authoritative lifetime.
- Recovery partial failure leaves the Recovery Case pending or failed and MUST NOT bind an unverified authenticator.
- Closure partial failure remains `CLOSURE_PENDING` and preserves access only to approved wind-down/redress functions.
- Retry uses idempotency and current state versions; it MUST NOT duplicate Accounts, authenticators, notices or terminal transitions.

## Idempotency and Replay Protection

- Registration idempotency is scoped to registration policy and idempotency key, with privacy-preserving duplicate handling.
- Authenticator ceremonies and Recovery Case challenges are single-use and operation-bound.
- Lifecycle commands bind Account, state version, operation, parameters, policy version and idempotency key.
- Replaying a completed request returns a stable result without repeating side effects.

## Audit Requirements

Audit data MUST allow reconstruction of:

- Account creation and every lifecycle state/version;
- notice and terms versions recorded at registration and material updates;
- authenticator binding, removal and method/profile metadata without secrets;
- session issuance, renewal, Step-up Authentication and termination;
- Recovery Case initiation, evidence classes, delay/review and result;
- authorization denials, restriction, suspension, appeal, closure and retention execution;
- actor/service, timestamps, correlation and reason codes.

Audit access MUST be restricted and audited. Retention must balance security, accounting, rights, legal and privacy obligations under explicit policy.

## Versioning and Migration

- Changes to Account identity semantics, state transitions, authentication assurance, recovery or closure behavior require explicit compatibility analysis.
- Account and authenticator identifiers MUST remain stable or have an auditable one-to-one migration mapping.
- Migration MUST preserve state, roles, active dependencies, session invalidation status, notices, holds and audit history.
- A migration MUST prove that CLOSED identifiers, terminated sessions and removed authenticators cannot become active.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-ACCOUNT-068–072 | Registration / identity / concurrency | Opaque IDs and separation hold; duplicate registration is controlled; activation requires authenticator and records |
| REQ-ACCOUNT-073–078 | State machine / authentication standards | Only allowed serialized transitions occur; profiles, binding and WebAuthn checks are enforced |
| REQ-ACCOUNT-079–084 | Session / security / integration | Secrets, cookie controls, lifetimes, rotation, termination and operation-bound Step-up work |
| REQ-ACCOUNT-085–090 | Recovery / authorization | Recovery is risk-based, notified and session-invalidating; roles remain separate |
| REQ-ACCOUNT-091–097 | Lifecycle / privacy / audit | Restriction, suspension, closure, retention, rate limits, minimization and redress follow policy |
| REQ-ACCOUNT-098–100 | Negative identity / enumeration | Contact, wallet and provider IDs are never primary IDs; no presence/identity inference or existence leak |
| REQ-ACCOUNT-101–105 | Privacy / authorization / retention | No biometric collection, silent operator mutation, unlawful erasure, identifier reuse or on-chain secrets |
| REQ-ACCOUNT-106–112 | Security / UX conformance | Implemented SHOULD behavior is tested or deviation is documented under conventions |
| REQ-ACCOUNT-113–114 | Optional conformance | Password or guest profiles preserve every MUST, MUST NOT and invariant |
| REQ-ACCOUNT-123–146 | Participant application / invitation / UX / integration | One-message Wallet-agnostic invitations preserve distinct audit states, bind email reachability and Wallet proof, automatically reconcile operator-owned approval and initial funding, expose only the current action and branch into independent User and Creator procedures |

Tests MUST include registration races, session fixation, stolen/expired session, CSRF, credential stuffing, WebAuthn origin/RP/challenge/signature failures, authenticator-removal orphaning, recovery takeover, concurrent closure, legal hold and enumeration attempts.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- State-machine property tests cover every allowed and forbidden Account transition.
- WebAuthn conformance and adversarial tests pass if WebAuthn is enabled.
- Session tests prove server-side expiry, rotation, all-session termination and no fixation.
- Recovery threat modeling and exercises prove replacement authenticators cannot bypass the approved policy.
- Closure tests prove dependencies, legal holds and retained records are not silently lost.
- Privacy testing proves Account existence and Account-to-Wallet relationships are not publicly enumerable.
- Operational runbooks cover Account takeover, lost authenticators, false-positive restriction, appeal, death/incapacity where applicable, closure and data-rights requests.

## Open Questions

- **OQ-ACCOUNT-LIFECYCLE-001:** **Decision owner:** Operating Company / Product and Legal; **Blocks:** Account MVP registration; **Question:** Which registration attributes are required for a basic User Account in the first jurisdiction?
- **OQ-ACCOUNT-LIFECYCLE-002:** **Decision owner:** Operating Company / Security; **Blocks:** Account MVP authentication; **Question:** Which authentication methods and assurance profiles launch first?
- **OQ-ACCOUNT-LIFECYCLE-003:** **Decision owner:** Operating Company / Security and Product; **Blocks:** Account MVP authentication; **Question:** Is WebAuthn/passkey required, preferred or optional at initial release?
- **OQ-ACCOUNT-LIFECYCLE-004:** **Decision owner:** Operating Company / Security; **Blocks:** privileged-operation controls; **Question:** Which high-risk operations require independent authenticators or multi-party approval?
- **OQ-ACCOUNT-LIFECYCLE-005:** **Decision owner:** Operating Company / Security and Support; **Blocks:** recovery launch; **Question:** What recovery factors, delays, notifications and support review are feasible?
- **OQ-ACCOUNT-LIFECYCLE-006:** **Decision owner:** Operating Company / Product, Legal and Support; **Blocks:** account-state implementation; **Question:** What are the exact Account-state permissions for restricted, suspended and closure-pending states?
- **OQ-ACCOUNT-LIFECYCLE-007:** **Decision owner:** Operating Company / Legal and Privacy; **Blocks:** production data policy; **Question:** Which retention periods and legal-hold rules apply to each data category?
- **OQ-ACCOUNT-LIFECYCLE-008:** **Decision owner:** Operating Company / Legal and Rights Operations; **Blocks:** Creator and Rights Holder recovery policy; **Question:** How are deceased or incapacitated Creator and Rights Holder Accounts handled without conflating Account access and legal Rights transfer?
