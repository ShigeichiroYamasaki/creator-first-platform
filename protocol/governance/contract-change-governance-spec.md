# Contract Change Governance

**Status:** Draft
**Version:** 0.1.0
**Protocol Domain:** governance / voting / contract evolution
**Specification ID:** SPEC-GOVERNANCE-001
**Last Updated:** 2026-08-25

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/07-governance.md`
- Governance UI: `docs/governance/index.md`
- ADR: `docs/adr/ADR-0001-governance-model.md`
- ADR: `docs/adr/ADR-0002-verifiable-sortition.md`
- ADR: `docs/adr/ADR-0016-bicameral-quadratic-governance.md`
- CFP records: `docs/proposals/record-management.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/wallet-linking-spec.md`
- `protocol/invariants.md`
- `protocol/conventions.md`
- `protocol/glossary.md`

## Goal

Define an implementation-independent, auditable process that binds a contract-change proposal to separate Creator House and User House quadratic votes, reviewed implementation evidence, a timelocked execution manifest and the resulting on-chain state.

## Scope

- Governance session and House membership snapshots;
- CFP intake, risk classification and immutable proposal revision;
- equal, non-economic Voice Credit and quadratic vote accounting;
- independent House quorum and approval;
- legal, security and implementation review;
- execution manifest, timelock, upgrade and policy activation;
- emergency cancellation, reasoned return, challenge and audit records.

## Out of Scope

- choosing the first production personhood provider or sortition randomness source;
- corporate shareholder voting and STO investor rights;
- defining legal, tax, accounting or employment obligations;
- granting Governance eligibility through Supporter SBTs;
- deploying the production Governor or migrating existing administrator keys;
- setting final seat, credit, quorum, threshold or timelock values.

## Actors

- **Proposer:** submits a CFP revision and required evidence.
- **Creator House Member:** selected representative of the committed Eligible Creator set.
- **User House Member:** selected representative of the committed Eligible User set.
- **Governance Registrar:** validates proposal structure without choosing its outcome.
- **Review Authorities:** perform scoped legal, security, rights, finance and implementation review.
- **Bicameral Governor:** finalizes the independent outcome of both Houses.
- **Timelock Controller:** queues and executes the exact approved manifest after delay.
- **Emergency Guardian:** may pause or cancel narrowly authorized execution but cannot create an upgrade.
- **Independent Verifier:** recomputes eligibility, vote accounting, manifest bindings and deployment evidence.
- **Operating Company:** performs legal obligations and issues a public Reasoned Return when execution is not lawful or feasible.

## Definitions

- **Governance Session:** bounded term with fixed House rules, membership commitments and Voice Credit budget.
- **House Membership Snapshot:** commitment to eligible selected members, House, Session, seat and uniqueness context.
- **Voice Credit:** equal, session-bound, non-transferable accounting capacity used to express vote intensity; it is not money or a tokenized asset.
- **Quadratic Ballot:** signed intensity $v$ for a Proposal at cost $v^2$ Voice Credits.
- **Proposal Revision:** immutable version of CFP content, impact analysis, Specification reference and execution intent.
- **Change Class:** `P0_PRODUCT`, `P1_PARAMETER`, `P2_UPGRADE`, `P3_CONSTITUTIONAL` or `EMERGENCY`.
- **House Result:** finalized quorum, approval, score and evidence for exactly one House and Proposal Revision.
- **Joint Approval:** result that exists only when both required House Results independently pass the same Proposal Revision and Rule Version.
- **Execution Manifest:** exact Chain ID, target, value, calldata hash, predecessor, salt, Specification hash, source commit, artifact and expected code or state hash.
- **Reasoned Return:** signed, published decision that an approved proposal cannot proceed because of identified legal, contractual, security or technical constraints.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Wallet control is not proof of one Person, House eligibility or valid selection.
- Off-chain discussion, UI labels, GitHub branches, audit labels and block-explorer metadata are not execution authority.
- A vote aggregator, Relayer, Registrar, Operating Company or Emergency Guardian may be faulty or compromised.
- Proposal prose and executable calldata are different artifacts and must be cryptographically bound.
- Creator House and User House have separate legitimacy; one House cannot manufacture the other House result.
- A Proxy implementation address with a familiar interface is untrusted until its artifact and code hash match approved evidence.

## Inputs

- Governance Session ID, Rule Version and activation interval;
- Creator House and User House membership commitments;
- immutable Proposal Revision and CFP evidence;
- Specification, ADR, impact, migration, rollback, test and audit references;
- signed or privacy-preserving ballots and uniqueness/nullifier evidence;
- Review decisions and challenge records;
- Execution Manifest and deployment verification evidence.

## Outputs

- accepted or rejected Proposal Revision;
- separate finalized Creator House and User House Results;
- Joint Approval or rejection reason;
- reviewed Execution Manifest and Timelock operation ID;
- execution, cancellation, expiry, return or rollback evidence;
- public, privacy-minimized audit bundle.

## State

```text
DRAFT → REVIEW_READY → CANDIDATE_VERIFIED → DELIBERATION → VOTING
      → JOINT_APPROVED → CONTRACT_TESTED → IMPLEMENTATION_VERIFIED
      → TIMELOCKED → EXECUTED

VOTING → REJECTED
JOINT_APPROVED → REASONED_RETURN → DELIBERATION
TIMELOCKED → SECURITY_CANCELLED → REMEDIATION
Any non-final state → EXPIRED when its approved deadline elapses
```

## Requirements

### MUST

- **REQ-GOVERNANCE-001:** Every Governance Session MUST bind a unique Session ID, start and end, Rule Version, both House membership commitments, seat policy, Voice Credit budget, quorum rule, approval rule, challenge window and applicable Change Classes before voting begins.
- **REQ-GOVERNANCE-002:** Every counted member MUST prove current inclusion in exactly one applicable House Membership Snapshot and MUST consume a session- and House-specific uniqueness value that prevents duplicate membership or voting.
- **REQ-GOVERNANCE-003:** Each eligible member in the same House and Session MUST receive the same Voice Credit budget independent of assets, payments, popularity, usage, revenue, SBTs, shares or STO participation.
- **REQ-GOVERNANCE-004:** For every member, the sum of squared signed ballot intensities across the applicable budget scope MUST NOT exceed the issued Voice Credit budget, and rejected or replaced ballots MUST have deterministic accounting.
- **REQ-GOVERNANCE-005:** A ballot MUST bind Proposal ID, immutable Revision, House, Session, Rule Version, signed intensity, voter uniqueness context, nonce and deadline.
- **REQ-GOVERNANCE-006:** Creator House and User House quorum, score, approval and challenge status MUST be calculated and finalized separately from committed snapshots and the same Proposal Revision.
- **REQ-GOVERNANCE-007:** Joint Approval MUST require every mandatory House Result to pass its own quorum and approval rule; a score or surplus from one House MUST NOT compensate for rejection or missing quorum in the other House.
- **REQ-GOVERNANCE-008:** A Proposal Revision MUST bind purpose, current and proposed Specification, Creator and User impact, economic, rights, privacy, legal and security impact, migration, rollback, tests, requested Change Class and execution intent.
- **REQ-GOVERNANCE-009:** Target, value, calldata, chain, Specification hash, source commit, artifact, expected code or state hash, Rule Version or Change Class changes after voting begins MUST create a new Proposal Revision and invalidate execution under the earlier vote.
- **REQ-GOVERNANCE-010:** Every P1, P2 or P3 Joint Approval MUST pass the review authorities required by its immutable Change Class before it becomes `IMPLEMENTATION_VERIFIED`.
- **REQ-GOVERNANCE-011:** A P2 upgrade MUST bind independent security review, applicable test evidence, migration and rollback evidence, exact implementation artifact and deployed runtime code hash before queueing.
- **REQ-GOVERNANCE-012:** A P3 constitutional change MUST require the approved Creator and User referendum evidence in addition to both House results.
- **REQ-GOVERNANCE-013:** A queued Timelock operation MUST bind exactly one approved Execution Manifest and MUST be executable only after the Change Class delay and before its expiry.
- **REQ-GOVERNANCE-014:** Upgrade, verifier change, settlement-asset activation, policy activation and other protected operations MUST be authorized only through the approved Timelock or a narrower authority explicitly allowed by an invariant-compatible Specification.
- **REQ-GOVERNANCE-015:** Execution MUST verify the operation ID and all available preconditions, then record transaction, block, resulting implementation or state hash and the exact Joint Approval and Manifest references.
- **REQ-GOVERNANCE-016:** An Emergency Guardian action MUST be limited to enumerated pause, key-disable or pending-operation cancellation powers, bind an incident record and expiry, and enter mandatory retrospective review.
- **REQ-GOVERNANCE-017:** A Reasoned Return MUST identify the exact legal, contractual, security or technical blocking basis, evidence authority, affected Proposal Revision and remediation path without substituting a different execution.
- **REQ-GOVERNANCE-018:** Proposal, membership, ballot, House Result, review, challenge, Timelock and execution records MUST preserve versioned provenance sufficient for an independent verifier to reproduce every public decision while minimizing personal data.
- **REQ-GOVERNANCE-019:** Conflict-of-interest declarations, recusals, vacancies, replacements and abstentions MUST be recorded under the fixed Session Rule and reflected in quorum and result calculation.
- **REQ-GOVERNANCE-020:** A challenge MUST bind its claimant eligibility or public-interest basis, challenged artifact, reason, evidence and deadline, and a pending material challenge MUST prevent execution until resolved or expired under the approved rule.
- **REQ-GOVERNANCE-033:** Before voting, every Proposal Revision MUST bind a versioned Charter compatibility assessment and a scoped legal-executability assessment; a missing or failed mandatory assessment MUST prevent deliberation completion and ballot acceptance.
- **REQ-GOVERNANCE-034:** Creator House and User House MUST each bind distinct deliberation evidence to the same immutable Proposal Revision before legislators of either House can vote.
- **REQ-GOVERNANCE-035:** When an approved operation deploys a new contract, the Execution Manifest MUST bind the deployment factory, creation artifact, constructor inputs, deterministic salt or expected address, runtime-code expectation and proof that no deployment occurred before Joint Approval and Timelock execution.
- **REQ-GOVERNANCE-036:** Before implementation review, queueing or deployment, every CFP contract operation MUST bind passing test evidence for the exact approved source, compiled artifact, test suite and calldata. Missing, failed or mismatched evidence MUST prevent progression to `IMPLEMENTATION_VERIFIED`.
- **REQ-GOVERNANCE-037:** Before voting, every CFP contract operation MUST publish an executable candidate bundle that traces each normative requirement to test code, candidate source, expected behavior and execution intent, and both Houses MUST deliberate on the same bundle hashes.
- **REQ-GOVERNANCE-038:** Human- or AI-assisted generation of specifications, tests or code MUST record the tool and version, input evidence hashes, generated artifact hashes and human review decision; the generation environment MUST NOT possess Timelock, deployment or production administration authority.
- **REQ-GOVERNANCE-039:** Every CFP Revision MUST maintain a versioned evidence index that binds unique document IDs for issues, applicable reviews, separate Creator House and User House minutes and decisions, implementation evidence, Execution Manifest and execution evidence to the same CFP ID and Revision.
- **REQ-GOVERNANCE-040:** An unresolved issue marked as blocking, missing final minutes or decision from either mandatory House, a test fixture, or unverified mandatory evidence MUST prevent voting activation, implementation verification and deployment authorization.
- **REQ-GOVERNANCE-041:** Confirmed or hash-bound minutes and decisions MUST be append-only; a correction MUST preserve the original document ID and hash, identify approvers and create a new Proposal Revision whenever execution meaning changes.
- **REQ-GOVERNANCE-042:** Before sortition randomness is knowable, each House MUST bind an immutable eligibility snapshot hash, indexed eligibility Merkle root, population size, primary seat count, alternate count, eligibility close time, claim schedule and algorithm version to exactly one Governance Session.
- **REQ-GOVERNANCE-043:** Production sortition randomness MUST bind a unique precommitted request ID, be unavailable before eligibility closes, have publicly verifiable origin and finality, and prevent the Operating Company, Registrar, candidate or randomness provider from choosing among multiple valid results.
- **REQ-GOVERNANCE-044:** The published sortition algorithm MUST deterministically produce the same ordered, duplicate-free primary and alternate candidate indices from the same Session, House, committed population and finalized randomness.
- **REQ-GOVERNANCE-045:** A selected candidate MUST prove inclusion of its candidate index, context-specific Governance Identity commitment and Session voting wallet in the committed House root before House membership is registered.
- **REQ-GOVERNANCE-046:** One Governance Identity commitment MUST NOT claim more than one seat or House in the same Session, and the credential issuer MUST prevent one person from obtaining multiple valid commitments for that sortition context.
- **REQ-GOVERNANCE-047:** Alternate activation MUST follow the precomputed order, bind public vacancy or recusal evidence, preserve the skipped and claimed history and MUST NOT allow an operator to nominate an unselected replacement.
- **REQ-GOVERNANCE-048:** Sortition contracts, eligibility issuers, randomness providers and the Bicameral Governor MUST use separately revocable roles; no one role alone may alter the eligibility set after close, choose randomness and register an arbitrary member.
- **REQ-GOVERNANCE-049:** Public sortition records MUST exclude legal identity and identity evidence while preserving the snapshot, roots, request, randomness, algorithm, selected indices, claims, alternates and resulting House membership needed for independent verification.
- **REQ-GOVERNANCE-050:** A testnet self-registration adapter MAY use an active test subscription for User House or an active unverified test Creator registration for Creator House only when it is conspicuously test-only, session-bound, non-portable to production and still subject to the Governor's one-House and registration-deadline checks.

### MUST NOT

- **REQ-GOVERNANCE-021:** JPYC, another Settlement Asset, Governance Token, share, STO security, Supporter SBT, payment amount, revenue, playback count or follower count MUST NOT purchase, transfer, multiply or determine Voice Credit or House membership.
- **REQ-GOVERNANCE-022:** A Wallet, Account, SBT, token balance or client assertion MUST NOT by itself establish a unique Governance Identity, House eligibility or valid ballot.
- **REQ-GOVERNANCE-023:** Voice Credit MUST NOT be transferred, sold, delegated, borrowed, pooled between members or Houses, carried into another Session or redeemed for economic value.
- **REQ-GOVERNANCE-024:** The Operating Company, Registrar, reviewer, deployer, Relayer, multisig or Emergency Guardian MUST NOT fabricate a House Result, waive a mandatory House, alter an approved Manifest or execute an unapproved upgrade.
- **REQ-GOVERNANCE-025:** A review failure or Reasoned Return MUST NOT silently convert into a permanent corporate veto; it MUST remain reviewable through the disclosed remediation, re-deliberation and applicable legal dispute process.
- **REQ-GOVERNANCE-026:** A committed or revealed ballot MUST NOT expose unnecessary Legal Identity, Account linkage, listening history, payment history or other personal data.

### SHOULD

- **REQ-GOVERNANCE-027:** Voting SHOULD use a commit-reveal or privacy-preserving proof mechanism where it materially reduces coercion and bandwagon effects without sacrificing uniqueness and public result verification.
- **REQ-GOVERNANCE-028:** Proposal UI SHOULD render human-readable Specification and transaction diffs, simulate execution and display a blocking warning when the approved and executable artifacts differ.
- **REQ-GOVERNANCE-029:** Governance metrics SHOULD disclose participation, representation, concentration, challenge, return, timelock and execution latency without publishing individual protected behavior.
- **REQ-GOVERNANCE-030:** The system SHOULD support a tested one-member-one-vote fallback that requires a new Rule Version when quadratic accounting is unavailable or unsafe.

### MAY

- **REQ-GOVERNANCE-031:** A House MAY use quadratic score to prioritize competing proposals before a binary approval round if both stages, budgets and effects are fixed before participation.
- **REQ-GOVERNANCE-032:** Production membership and voting MAY use zero-knowledge membership and nullifier proofs if public verification, revocation, recovery and challenge requirements remain satisfied.

## Invariants

- `INV-GOVERNANCE-001`
- `INV-GOVERNANCE-002`
- `INV-GOVERNANCE-003`
- `INV-GOVERNANCE-004`
- `INV-GOVERNANCE-005`
- `INV-GOVERNANCE-006`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- `INV-PRIVACY-001`
- **SPEC-INV-GOVERNANCE-001:** Economic power never creates Protocol Governance power.
- **SPEC-INV-GOVERNANCE-002:** No contract change executes without the same required House approvals that bind its exact immutable Revision and Manifest.
- **SPEC-INV-GOVERNANCE-003:** Each member spends at most one equal Voice Credit budget within one House and budget scope.
- **SPEC-INV-GOVERNANCE-004:** Emergency authority can reduce immediate risk but cannot create a new Protocol rule, upgrade or asset transfer.
- **SPEC-INV-GOVERNANCE-005:** Historical Proposal, vote and execution interpretation remains bound to the Rule and Specification Versions effective at that time.

## State Transitions

| Source | Triggering actor | Required validation | Result | Failure behavior |
| --- | --- | --- | --- | --- |
| none | Proposer | complete CFP and immutable Revision | `DRAFT` | create no voting authority |
| `DRAFT` | Registrar | structure, dependencies and review plan | `REVIEW_READY` | return actionable defects |
| `REVIEW_READY` | Review and Engineering Authorities | passing pre-vote review, requirement-to-test traceability, candidate source, test and simulation evidence | `CANDIDATE_VERIFIED` | reasoned return or remediation |
| `CANDIDATE_VERIFIED` | both House facilitators | fixed Revision hashes, Session, rules and hearing schedule | `DELIBERATION` | remain pending |
| `DELIBERATION` | Bicameral Governor | voting window and frozen Revision | `VOTING` | reject mutable or incomplete input |
| `VOTING` | each House | finality, quorum, accounting and challenges | House Result | do not infer the other House result |
| `VOTING` | Bicameral Governor | both mandatory House Results pass | `JOINT_APPROVED` | `REJECTED` or remain pending |
| `JOINT_APPROVED` | Test Authority | clean rebuild and exact-source test evidence pass for approved calldata | `CONTRACT_TESTED` | `REASONED_RETURN` or remediation |
| `CONTRACT_TESTED` | Review Authorities | class-specific review and exact Manifest validation | `IMPLEMENTATION_VERIFIED` | `REASONED_RETURN` or remediation |
| `IMPLEMENTATION_VERIFIED` | Timelock | exact operation and required delay | `TIMELOCKED` | queue nothing |
| `TIMELOCKED` | Timelock | delay, expiry, no material challenge, preconditions | `EXECUTED` | preserve prior state and evidence |
| `TIMELOCKED` | Emergency Guardian | enumerated incident authority | `SECURITY_CANCELLED` | deny any replacement execution |

## Interfaces

Equivalent operations MUST be provided by the selected on-chain and off-chain components:

```text
createSession(rule_version, creator_house_root, user_house_root, time_bounds)
registerCfpProposal(cfp_id_hash, revision, content_hash, change_class, specification_hash, manifest_hash)
openVoting(proposal_id, revision, session_id)
commitBallot(proposal_id, house, commitment, nullifier)
revealBallot(proposal_id, house, intensity, salt, proof)
finalizeHouseResult(proposal_id, house)
finalizeJointApproval(proposal_id)
recordContractTestEvidence(proposal_id, source_hash, artifact_hash, test_suite_hash, test_report_hash, tested_calldata_hash, passed)
recordReview(proposal_id, authority, decision, evidence_hash)
bindExecutionManifest(proposal_id, manifest_hash)
queueApprovedOperation(proposal_id, manifest)
executeApprovedOperation(proposal_id, manifest)
cancelPendingOperation(operation_id, incident_ref)
challengeArtifact(proposal_id, artifact_ref, reason, evidence_ref)
getGovernanceAuditBundle(proposal_id)
```

## Error Conditions

| Error ID | Condition | Required behavior |
| --- | --- | --- |
| `SESSION_RULE_MISMATCH` | ballot or proposal uses another Session or Rule Version | reject without spending Credit |
| `HOUSE_MEMBERSHIP_INVALID` | inclusion, selection, House or uniqueness proof fails | reject ballot |
| `VOICE_CREDIT_EXCEEDED` | cumulative quadratic cost exceeds budget | reject replacement or new ballot atomically |
| `BALLOT_REPLAYED` | nonce, nullifier or commitment was consumed | reject without double count |
| `HOUSE_QUORUM_NOT_MET` | unique participation is below fixed threshold | finalize House as not approved |
| `BICAMERAL_APPROVAL_MISSING` | either mandatory House is absent or failed | prevent review queue and execution |
| `PROPOSAL_REVISION_MISMATCH` | content, rule or Manifest binding differs | require new Revision and vote |
| `REVIEW_INCOMPLETE` | required class-specific evidence is absent or failed | prevent Timelock queue |
| `MANIFEST_MISMATCH` | operation differs by chain, target, value, calldata or hashes | reject queue or execution |
| `TIMELOCK_NOT_MATURE` | operation delay has not elapsed | reject execution |
| `MATERIAL_CHALLENGE_PENDING` | approved challenge blocks execution | retain queued state without execution |
| `EMERGENCY_SCOPE_EXCEEDED` | guardian requests an upgrade, transfer or unlisted operation | reject and alert |

## Security Requirements

- Session creation, membership commitment, result finalization, review and execution roles must be separated and independently revocable.
- Ballot replacement must atomically refund the prior quadratic cost and charge the new cost within one fixed budget.
- Commit-reveal deadlines must prevent late commitment, premature reveal and unrevealed ballot counting.
- Manifest simulation must run against the declared chain state or an identified fork and record assumptions.
- UUPS authorization must reject every caller except the approved Timelock after authority migration.
- Contract implementations must preserve storage layout and rollback or migration invariants.
- Bribery, collusion, coercion, Sybil behavior, denial of service and governance front-running require monitoring and incident procedures.

## Privacy Requirements

- Public records use House-specific pseudonymous membership evidence where feasible.
- Legal Identity and Account-to-Wallet mappings remain restricted and separately governed.
- Public audit proves one eligible ballot and correct aggregate without requiring unnecessary disclosure of the voter.
- Conflict disclosures publish only the minimum facts necessary to assess recusal.

## Failure Handling

- Failure in one House never becomes approval through the other House.
- Indexer or UI disagreement never changes canonical committed state; clients display freshness and source.
- Lost or compromised voting keys require the approved recovery and replacement procedure without restoring spent Credit or enabling a duplicate ballot.
- Review or deployment failure returns to remediation; it does not authorize an administrator to edit the operation.
- A failed on-chain execution preserves the Timelock and Proposal evidence and requires a new approved Revision when calldata or implementation must change.

## Observability and Audit

The audit bundle records Session, membership roots, Proposal Revision, Rule Version, ballot commitments or proofs, House Results, challenges, exact-source contract test evidence, reviews, Manifest, Timelock operation, execution receipt and resulting state hashes. Public dashboards distinguish proposed, approved, test failed, tested, reviewed, queued, executable, executed, returned, cancelled and expired states.

## Testnet Implementation Profile

The first executable profile is implemented by `CreatorFirstBicameralGovernor` and the harmless `CreatorFirstGovernedPolicy` target. It binds a CFP identifier hash and revision to the immutable proposal payload, validates session-bound equal Voice Credit, quadratic replacement accounting, separate Creator House and User House outcomes, joint approval, exact calldata binding, review evidence, P3 referendum-evidence presence, class-based delay, execution expiry and guardian cancellation. Separate public House routes may filter write controls by the connected member's committed House, but UI routing never establishes membership or changes the canonical on-chain result.

`CreatorFirstTestnetLegislatorRegistrationAdapter` is the bounded test membership profile. It accepts only an active test subscription for User House or an active unverified test Creator registry entry for Creator House, and delegates final one-House and deadline enforcement to the Governor. The public UI MUST keep registration disabled until the adapter address and role grant are present in the reviewed Sepolia deployment manifest.

`CreatorFirstVerifiableSortition` is the production-oriented implementation candidate for REQ-GOVERNANCE-042–049. It commits indexed House eligibility roots before randomness, consumes a unique external-randomness request, computes an ordered partial Fisher-Yates selection, verifies selected Merkle leaves, prevents one Governance Identity commitment from claiming both Houses, activates alternates sequentially with evidence and registers successful claims through the Governor. It is not production-ready until the eligibility credential, one-person issuance, VRF or beacon integration, challenge process, key separation, audit and production deployment gates are complete.

This profile uses public ballots. A P3 proposal binds a referendum evidence hash but the referendum mechanism is not implemented. The profile does not claim production compliance with personhood, cross-session uniqueness, commit-reveal, zero-knowledge privacy, conflict and recusal adjudication, material challenges, Reasoned Return, audit approval or migration of production upgrade authority.

## Test Requirements

- REQ-GOVERNANCE-001–020: lifecycle tests cover fixed Sessions, unique membership, equal budgets, quadratic accounting, immutable revisions, separate House outcomes, review, Manifest, Timelock, emergency, return, conflicts, challenges and reproducible evidence.
- REQ-GOVERNANCE-021–026: negative tests attempt asset-weighted Credit, SBT eligibility, transfer or pooling, House bypass, Manifest substitution, corporate or guardian upgrade and personal-data disclosure.
- Property tests for REQ-GOVERNANCE-003–007 generate members, signed intensities, ballot replacements, orderings and both House outcomes and prove budget conservation and bicameral independence.
- Integration tests for REQ-GOVERNANCE-009–016 bind a mock UUPS upgrade to its Specification and runtime code hash, reject every modified Manifest and verify Timelock-only authorization and emergency limits.
- Privacy review for REQ-GOVERNANCE-002, REQ-GOVERNANCE-005, REQ-GOVERNANCE-018, REQ-GOVERNANCE-020, REQ-GOVERNANCE-022 and REQ-GOVERNANCE-026 verifies minimization, unlinkability goals and restricted mappings.
- Integration tests for REQ-GOVERNANCE-033–038 reject failed or missing pre-vote review, either House's missing deliberation evidence, missing or failed contract tests and mismatched tested calldata, then prove that only the exact tested, jointly approved and timelocked deployment creates runtime code at the predicted address. Static governance validation checks candidate-bundle traceability and generation-authority separation until those attestations are implemented on-chain.
- Document-management tests for REQ-GOVERNANCE-039–041 validate unique IDs, CFP path and Revision binding, mandatory minutes sections, evidence references, unresolved blocking issues, production-versus-fixture separation, final House records and verified evidence hashes.
- Contract tests for REQ-GOVERNANCE-042–050 freeze House roots before randomness, reject early or unauthorized randomness, reproduce duplicate-free House selections, verify selected eligibility leaves, reject wallet and cross-House identity reuse, preserve Governor membership checks and distinguish the testnet eligibility adapter from production sortition.

## Acceptance Criteria

- A deterministic test vector reproduces Voice Credit accounting and both House Results.
- One failed or absent House makes Joint Approval and execution impossible.
- A one-byte calldata or code-hash change after voting makes queueing or execution impossible.
- Missing, failed or differently bound contract test evidence makes implementation review, queueing and deployment impossible.
- Timelock is the only authorized caller for the protected test upgrade.
- Emergency Guardian can cancel the queued test operation but cannot upgrade or transfer assets.
- The public audit bundle links the CFP, Revision, Specification, votes, review, Manifest, transaction and resulting code hash.

## Open Questions

- **OQ-GOVERNANCE-001:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** first Governance Session; **Question:** What seat count, equal Voice Credit budget, budget scope, quorum and approval thresholds should each House use?
- **OQ-GOVERNANCE-002:** **Decision owner:** Protocol Governance / Privacy and Security; **Blocks:** production ballot privacy; **Question:** Should the first binding vote use public ballots, commit-reveal or a zero-knowledge voting system?
- **OQ-GOVERNANCE-003:** **Decision owner:** Protocol Governance / Legal, Security and Engineering; **Blocks:** Change Class activation; **Question:** Which operations belong to P0, P1, P2, P3 and Emergency and what reviews and Timelock delay apply to each?
- **OQ-GOVERNANCE-004:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** bicameral deadlock handling; **Question:** What mediation, cooling-off and resubmission rules apply when one House approves and the other rejects?
- **OQ-GOVERNANCE-005:** **Decision owner:** Protocol Governance / Identity, Privacy and Security; **Blocks:** binding House membership; **Question:** Which Governance Identity, recovery, recusal and cross-House uniqueness mechanism should production use?
- **OQ-GOVERNANCE-006:** **Decision owner:** Protocol Governance / Operating Company and Independent Reviewers; **Blocks:** Reasoned Return procedure; **Question:** What evidence standard, response deadline and appeal path prevent both unlawful execution and an unreviewable corporate veto?
