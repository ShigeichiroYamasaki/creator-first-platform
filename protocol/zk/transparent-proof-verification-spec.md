# Transparent Zero-Knowledge Proof Verification

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** zk / privacy / verification  
**Specification ID:** SPEC-ZK-001  
**Last Updated:** 2026-08-24

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- Whitepaper: `docs/whitepaper/13-roadmap.md`
- ADR: `docs/adr/ADR-0005-usage-oracle.md`
- ADR: `docs/adr/ADR-0006-zero-knowledge-proof-strategy.md`
- ADR: `docs/adr/ADR-0017-transparent-zk-testnet-mainnet-boundary.md`

### Related Specifications

- `protocol/usage/playback-verification-spec.md`
- `protocol/distribution/creator-allocation-spec.md`
- `protocol/governance/contract-change-governance-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define a proof-system-neutral envelope, verifier-profile lifecycle and testnet-to-mainnet boundary for transparent zero-knowledge proofs without allowing a mock proof, verifier success or on-chain receipt to replace input authenticity, Rights, Distribution finality, governance or legal approval.

## Current Implementation Conformance

`CreatorFirstTransparentZKRegistry` and `CreatorFirstTransparentZKMockVerifier` implement only a Sepolia-capable integration fixture for verifier registration, domain-bound receipt identity, replay rejection, deprecation, pause and events. The mock verifier performs a deterministic digest comparison and explicitly does not implement zero knowledge, soundness or a production proof system. It is permitted only under `MOCK-ASSUMPTION-002` and does not satisfy the mainnet acceptance criteria of this specification.

The contracts are included in the `CreatorFirstTestnet` Ignition module but are not a public Sepolia deployment until their addresses, deployment transactions and source commit appear in the reviewed public deployment manifest.

## Scope

- transparent proof-system profile registration and lifecycle;
- canonical proof envelope and public-input commitment;
- testnet mock labeling and prohibited uses;
- mainnet verifier routing and immutable receipts;
- replay, cross-chain and cross-domain separation;
- governance, corporate approval, emergency pause and migration;
- audit, privacy and failure evidence.

## Out of Scope

- selecting the final proof system, library or proving virtual machine;
- defining the complete Usage, Distribution, Rights or Governance statement;
- asserting that source events or real-world Rights are true;
- production key ceremonies, prover hardware procurement or final chain selection;
- treating a proof receipt as statutory accounting, tax, legal or contractual evidence by itself.

## Actors

- **Proof Program Author:** implements the versioned statement and constraints.
- **Proof Producer:** generates a proof from private witness data and public inputs.
- **Verifier Profile Authority:** proposes and manages verifier profiles under approved governance.
- **Proof Router:** validates the envelope and dispatches to the exact verifier profile.
- **Verifier Contract:** checks one proof system and program version.
- **Proof Consumer:** uses an accepted receipt as one input to a domain-specific state transition.
- **Security Guardian:** may pause new verification under limited emergency authority.
- **Protocol Governance:** approves protocol-significant program, verifier and policy changes.
- **Operating Company:** performs legal, security, operational and fiduciary approval for mainnet activation.
- **Challenger / Auditor:** reproduces, challenges and reviews proof artifacts and receipts.

## Definitions

- **Transparent Proof System:** a zero-knowledge proof system that requires no trusted setup.
- **Verifier Profile:** an immutable identity for a proof system, verifier bytecode, program, public-input schema, cryptographic assumptions and lifecycle policy.
- **Proof Envelope:** canonical metadata and proof bytes submitted for one domain statement.
- **Program Hash:** content commitment to the exact proof program and constraints.
- **Public Inputs Hash:** canonical commitment to the public inputs consumed by the verifier and domain consumer.
- **Verification Receipt:** immutable evidence that one exact verifier profile accepted one exact envelope at a chain location.
- **Testnet Mock Profile:** a profile that validates integration behavior but provides no cryptographic zero-knowledge or soundness claim.

## Trust Boundaries

- Proof Producers, clients, relayers and submitted proof bytes are untrusted.
- Verifier success establishes only the statement encoded by the exact approved program and public inputs.
- Input collection, User identity, Rights, event authenticity and Distribution finality remain owned by their domain specifications.
- Governance approval does not substitute for cryptographic review, and corporate approval does not rewrite protocol evidence.
- Testnet contracts, addresses, keys, profiles, receipts and mock proofs are never mainnet authority.

## Inputs

### Verifier Profile

- `profile_id`
- proof system and version
- verifier address and bytecode hash
- `program_hash`
- public-input schema and canonicalization version
- setup model and cryptographic assumptions
- security level and resource limits
- audit, source, build and governance references
- activation, deprecation and emergency policy
- environment and chain scope

### Proof Envelope

- protocol domain and statement type
- chain ID and router address
- `profile_id` and `program_hash`
- external statement ID and target snapshot/version
- `public_inputs_hash`
- proof bytes or content-addressed proof reference
- expiry or applicable finality boundary
- submission idempotency key

## Outputs

- accepted or rejected verification result with stable reason;
- immutable Verification Receipt ID;
- profile, program, public-input and proof commitments;
- chain location, submitter, verifier and time;
- audit and challenge references without private witness data.

## State

```text
PROPOSED → TESTED → APPROVED → ACTIVE → DEPRECATED
                         │          │
                         └──────────┴→ PAUSED → ACTIVE or DEPRECATED
```

Receipts are append-only and remain bound to the profile state and artifacts applicable at acceptance time.

## Requirements

### MUST

- **REQ-ZK-001:** Every Verifier Profile MUST have an immutable unique ID and identify proof system, version, verifier bytecode hash, Program Hash, public-input schema, setup model, cryptographic assumptions, environment and chain scope.
- **REQ-ZK-002:** A production profile claiming transparency MUST require no trusted setup and MUST publish enough setup and parameter-generation information for independent verification.
- **REQ-ZK-003:** The Proof Router MUST bind chain ID, router address, protocol domain, statement type, profile ID, Program Hash, external statement ID, target snapshot/version and Public Inputs Hash before accepting a proof.
- **REQ-ZK-004:** Proof Envelope and public-input serialization MUST be canonical, versioned and covered by published positive and negative test vectors.
- **REQ-ZK-005:** The Proof Router MUST call only the exact verifier address and bytecode version registered for the active profile.
- **REQ-ZK-006:** A Verification Receipt MUST commit to the profile, program, public inputs, proof, submitter, chain location and acceptance time without storing private witness data.
- **REQ-ZK-007:** Receipt identity MUST prevent replay across chain, router, profile, domain, statement and target snapshot/version boundaries.
- **REQ-ZK-008:** Profile registration, approval, activation, pause, resumption and deprecation MUST require explicitly separated authorized roles and auditable events.
- **REQ-ZK-009:** Protocol-significant Program, schema, verifier, cryptographic-assumption or setup-model changes MUST use a new profile and the applicable bicameral governance process.
- **REQ-ZK-010:** Mainnet activation MUST bind the exact governance manifest, corporate approval, timelock, source commit, reproducible build, deployed bytecode and independent audit evidence.
- **REQ-ZK-011:** A Proof Consumer MUST verify current domain state, receipt profile, statement scope, snapshot/version, challenge status and applicable finality before acting.
- **REQ-ZK-012:** A proof used for Distribution MUST bind the exact finalized Usage, Rights, revenue and Distribution Policy versions required by the Distribution specification.
- **REQ-ZK-013:** A proof used for eligibility or governance MUST bind the exact eligibility snapshot, uniqueness domain, nullifier policy and revocation boundary required by the owning specification.
- **REQ-ZK-014:** Emergency pause MUST stop new acceptance promptly while preserving prior receipts, profile history, audit access and authorized challenge or wind-down operations.
- **REQ-ZK-015:** Profile deprecation and replacement MUST preserve verification of historical receipts under their original profile and MUST define consumer migration and rollback behavior.
- **REQ-ZK-016:** Production prover and verifier services MUST enforce measured proof-size, verification-gas, execution-time, memory, recursion-depth and request-rate limits.
- **REQ-ZK-017:** Private witness data MUST remain access-controlled, encrypted and subject to approved minimization, retention, deletion and incident procedures.
- **REQ-ZK-018:** Mainnet deployment MUST use new production keys, roles, addresses, profiles, program artifacts and manifests distinct from every testnet environment.
- **REQ-ZK-019:** Every rejection, unavailable verifier, resource-limit breach, pause, challenge and migration MUST produce a stable reason and auditable evidence.
- **REQ-ZK-020:** Independent reviewers MUST be able to reproduce program artifacts and verify deployed bytecode, profile metadata, public inputs and accepted receipts from published information.

### MUST NOT

- **REQ-ZK-021:** A Testnet Mock Profile or its receipt MUST NOT be represented as a cryptographic zero-knowledge proof, production audit result, verified Usage, Rights, eligibility or Distribution authority.
- **REQ-ZK-022:** A successful proof verification MUST NOT by itself establish that real-world input events, identity, Rights, contracts, accounting or tax treatment are true.
- **REQ-ZK-023:** A Proof Consumer MUST NOT accept an inactive, paused, deprecated-for-new-use, unknown-chain, wrong-domain, expired or schema-incompatible profile.
- **REQ-ZK-024:** A verifier upgrade or router change MUST NOT mutate, reinterpret or silently invalidate a historical Verification Receipt.
- **REQ-ZK-025:** Emergency authority MUST NOT activate a new verifier, replace a Program Hash, alter a receipt or transfer funds.
- **REQ-ZK-026:** Private witness data, detailed User listening history, stable cross-context identifiers, secrets or proving keys MUST NOT be placed in public calldata, events or receipts.
- **REQ-ZK-027:** Sepolia keys, addresses, receipts, mock proof data or bootstrap role assignments MUST NOT be copied into or trusted by mainnet.
- **REQ-ZK-028:** Governance approval, AI review or test passage alone MUST NOT be described as independent cryptographic or security audit approval.

### SHOULD

- **REQ-ZK-029:** Verifier Profiles SHOULD prefer small immutable verifier adapters over a single broadly upgradeable verifier.
- **REQ-ZK-030:** At least two independently operated Proof Producers SHOULD be able to generate equivalent valid proofs for the same canonical inputs before mainnet activation.
- **REQ-ZK-031:** Proof generation and verification SHOULD have independent reference implementations or differential test paths where practical.
- **REQ-ZK-032:** Public profile metadata SHOULD include benchmark results for representative and adversarial workloads.
- **REQ-ZK-033:** A profile SHOULD define an overlap period in which consumers can validate old and replacement profiles before final deprecation.
- **REQ-ZK-034:** Proof bytes SHOULD be kept off-chain when their full publication is unnecessary, while an integrity commitment and durable availability policy remain public.
- **REQ-ZK-035:** User-facing explanations SHOULD distinguish proof acceptance, source-data confidence, challenge status and final domain outcome.

### MAY

- **REQ-ZK-036:** A Proof Router MAY support recursive or wrapped proofs when every inner profile, program and public input remains traceable.
- **REQ-ZK-037:** A domain MAY require multiple independent proofs or a proof plus non-ZK audit evidence before finalization.
- **REQ-ZK-038:** A testnet implementation MAY use an explicit deterministic mock verifier only under a bounded Mock assumption and a machine-readable test-only notice.

## Invariants

- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-PRIVACY-003`
- `INV-USAGE-001`
- `INV-USAGE-002`
- `INV-DISTRIBUTION-001`
- `INV-DISTRIBUTION-004`
- `INV-GOVERNANCE-004`
- `INV-GOVERNANCE-005`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- **SPEC-INV-ZK-001:** One receipt always resolves to one immutable verifier profile, program, public-input commitment, proof commitment, domain and chain context.
- **SPEC-INV-ZK-002:** Testnet Mock acceptance never becomes production cryptographic or domain authority.
- **SPEC-INV-ZK-003:** Verifier replacement never changes the meaning of a historical receipt.
- **SPEC-INV-ZK-004:** Proof success never replaces source-data and domain finality requirements.
- **SPEC-INV-ZK-005:** Emergency authority can reduce availability but cannot create a new accepted proof policy or move value.

## State Transitions

| Source | Triggering actor | Preconditions and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Verifier Profile Authority | complete immutable metadata; unique ID | `PROPOSED` | `VerifierProfileProposed` | reject without partial profile |
| `PROPOSED` | Test Operator / Auditor | vectors, benchmarks and review evidence | `TESTED` | `VerifierProfileTested` | remain `PROPOSED` with findings |
| `TESTED` | Protocol Governance + Operating Company | exact manifest, approvals, audit and timelock | `APPROVED` | `VerifierProfileApproved` | remain non-active |
| `APPROVED` | Timelock Executor | activation time and deployed bytecode match | `ACTIVE` | `VerifierProfileActivated` | fail closed |
| `ACTIVE` | Proof Submitter | canonical envelope; verifier succeeds; no replay | receipt recorded | `VerificationReceiptRecorded` | reject with stable reason |
| `ACTIVE` | Security Guardian | defined emergency condition | `PAUSED` | `VerifierProfilePaused` | new acceptance denied |
| `PAUSED` | authorized recovery process | incident resolved; required approval | `ACTIVE` | `VerifierProfileResumed` | remain paused |
| `ACTIVE` or `PAUSED` | Protocol Governance | replacement and migration plan approved | `DEPRECATED` | `VerifierProfileDeprecated` | historical receipts remain available |

## Interfaces

### Verifier

```text
verifyProof(program_hash, public_inputs_hash, proof_bytes) -> valid | invalid
```

### Proof Router

```text
verifyAndRecord(profile_id, domain, statement_type,
                external_statement_id, target_version,
                public_inputs_hash, proof_bytes) -> receipt_id
```

### Receipt

```text
receipt_id
profile_id
program_hash
domain / statement_type
external_statement_id / target_version
public_inputs_hash / proof_hash
chain_id / router_address
submitter / block_number / accepted_at
```

## Error Conditions

| Error ID | Condition | Required behavior |
| --- | --- | --- |
| `UNKNOWN_PROFILE` | Profile is absent | Reject without verifier call |
| `PROFILE_NOT_ACTIVE` | Profile is proposed, paused or deprecated | Reject new acceptance |
| `ENVELOPE_MISMATCH` | Chain, router, program, schema, domain or target differs | Reject and audit reason |
| `INVALID_PROOF` | Exact verifier rejects proof | Reject without receipt |
| `REPLAYED_RECEIPT` | Receipt identity already exists | Return prior idempotent result or reject; never duplicate effects |
| `RESOURCE_LIMIT` | Proof or verification exceeds approved bounds | Fail closed and rate-limit |
| `VERIFIER_UNAVAILABLE` | Verifier or dependency cannot complete | Hold domain finalization; do not synthesize success |

## Security Requirements

Verifier bytecode, program artifacts, canonicalization libraries and router integration are security-critical. Tests MUST include malformed encodings, wrong-chain and wrong-domain replay, profile substitution, old-program proofs, oversized proof data, gas exhaustion, reentrancy where applicable, verifier reverts, concurrent duplicate submissions, pause races and migration overlap.

## Privacy Requirements

Public inputs and receipts MUST use the minimum disclosure needed for independent verification. Cohort and nullifier design MUST prevent practical reconstruction of detailed User listening histories or stable tracking across unrelated contexts. Witness retention and proving logs MUST be separately reviewed because zero knowledge on-chain does not make the proving environment private.

## Failure Handling

Verifier rejection is final for the exact envelope but does not erase the source snapshot or prevent a corrected version. Verifier unavailability holds dependent finalization. A discovered verifier or program defect pauses the affected profile, opens an incident and challenge process, identifies every dependent receipt and activates a separately approved replacement only after the required delay.

## Idempotency and Replay Protection

Receipt identity is a canonical hash over chain ID, router address, profile ID, domain, statement type, external statement ID, target version and Public Inputs Hash. Retrying the same envelope cannot create multiple domain effects. A changed proof for the same receipt identity is rejected or recorded only as challenge evidence.

## Audit Requirements

Audit history MUST include profile proposals and state transitions, exact manifests and approvals, source and artifact hashes, build and audit references, every accepted receipt, rejection reason aggregates, pause and incident events, consumer finalization links, challenge outcomes and migration completion.

## Versioning and Migration

Profiles are immutable. A change creates a new profile ID. Consumers declare supported profiles and migration windows. Historical receipts remain resolvable under the original verifier and artifacts. Testnet and mainnet use separate namespaces, manifests and deployments and have no receipt migration path.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-ZK-001–007 | Schema / binding / replay | Exact profile and envelope produce one chain- and domain-bound immutable receipt |
| REQ-ZK-008–010 | Authorization / governance / deployment | Only separated approved roles activate the exact audited mainnet manifest after delay |
| REQ-ZK-011–013 | Consumer integration | Proof success cannot bypass domain state, finality, Rights, Distribution or eligibility bindings |
| REQ-ZK-014–020 | Pause / migration / resources / audit | Incidents fail closed; historical evidence remains reproducible and bounded |
| REQ-ZK-021–028 | Negative / environment separation | Mock, wrong profile, private data, emergency authority and testnet artifacts never gain production authority |
| REQ-ZK-029–035 | Conformance | Implemented SHOULD behavior is tested or deviations are documented |
| REQ-ZK-036–038 | Optional conformance | Recursive, multi-proof or testnet mock behavior preserves all MUST, MUST NOT and invariants |

## Acceptance Criteria

### Testnet profile

- contracts compile and automated tests prove profile authorization, chain-bound receipt identity, invalid-proof rejection, replay rejection, pause and deprecation;
- every UI, event and manifest identifies the verifier as a non-cryptographic testnet mock;
- public deployment is claimed only after Sepolia addresses and transactions are in the reviewed manifest;
- no receipt is consumed by real Distribution, Rights, eligibility or funds.

### Mainnet profile

- every `REQ-ZK-001`–`REQ-ZK-028` test mapping passes against production bytecode;
- proof system selection and all Open Questions are decided with public evidence;
- reproducible builds, independent audits, adversarial benchmarks and incident exercises are complete;
- bicameral governance, corporate approval, timelock, role separation and public manifest bind the exact deployment;
- no testnet key, profile, address, receipt, mock or bootstrap authority exists in production configuration.

## Open Questions

- **OQ-ZK-001:** **Decision owner:** Protocol Governance / Privacy and Security; **Blocks:** production proof profile approval; **Question:** Which transparent proof system, security level, verifier implementation and recursion strategy satisfy measured Usage and Distribution requirements?
- **OQ-ZK-002:** **Decision owner:** Operating Company / Security and Infrastructure; **Blocks:** mainnet deployment; **Question:** Which Ethereum mainnet or approved L2 verification path, prover topology, availability policy and gas budget will be operated?
- **OQ-ZK-003:** **Decision owner:** Protocol Governance / Usage and Distribution; **Blocks:** production statement program; **Question:** Which exact Usage, Rights, revenue and Distribution fields are public inputs, private witness data and independently sourced commitments?
- **OQ-ZK-004:** **Decision owner:** Operating Company / Legal and Privacy; **Blocks:** production witness processing; **Question:** What lawful basis, retention, deletion, processor and incident controls apply to private witness data and proving logs?
