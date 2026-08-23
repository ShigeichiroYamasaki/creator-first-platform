# Creator Distribution Calculation and Allocation

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** distribution / accounting  
**Specification ID:** SPEC-DISTRIBUTION-001  
**Last Updated:** 2026-08-23

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/03-rights-and-money.md`
- Whitepaper: `docs/whitepaper/06-economics.md`
- Whitepaper: `docs/whitepaper/11-legal-sto-tax.md`
- ADR: `docs/adr/ADR-0003-rights-registry.md`
- ADR: `docs/adr/ADR-0004-creator-distribution-model.md`
- ADR: `docs/adr/ADR-0005-usage-oracle.md`
- ADR: `docs/adr/ADR-0013-treasury-flow-transparency.md`

### Related Specifications

- `protocol/account/subscription-settlement-spec.md`
- `protocol/blockchain/settlement-asset-registry-spec.md`
- `protocol/rights/rights-registry-spec.md`
- `protocol/usage/playback-verification-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define deterministic, auditable and rights-aware calculation of Creator Distribution Allocations from an approved Revenue Snapshot, finalized Usage Snapshot, exact Rights Snapshot and versioned Distribution Policy, while keeping legal ownership, tax treatment, custody and payment execution outside the calculation engine.

## Scope

This specification covers:

- Revenue Snapshot intake and reconciliation;
- explicit deduction and pool allocation categories;
- User-Centric content allocation from finalized Verified Usage;
- Rights-aware recipient allocation;
- disputed, incomplete and minimum-payout balances;
- integer arithmetic, rounding and residual treatment;
- Distribution Result finalization, challenge and correction;
- public commitments and privacy-safe Creator explanations;
- exact instructions passed to later settlement execution.

## Out of Scope

- deciding copyright ownership, contractual validity or Rights disputes;
- verifying raw Playback Events;
- accepting subscription payments or determining payment finality;
- custody, transfer, redemption or exchange of settlement assets;
- calculating individual tax liability, withholding or invoice treatment;
- selecting a production Distribution Policy or percentage;
- promising a fixed Creator return or asset value;
- executing an STO, shareholder return or Protocol Governance reward.

## Actors

- **Revenue Authority:** supplies and approves the reconciled Revenue Snapshot under corporate accounting controls.
- **Distribution Policy Authority:** approves a versioned Distribution Policy under the applicable governance phase.
- **Distribution Operator:** executes the approved deterministic calculation without changing inputs or policy.
- **Distribution Reviewer:** independently verifies inputs, arithmetic, commitments and exception treatment.
- **Rights Holder:** a recipient represented by the exact Rights Snapshot; it is not inferred from upload, Account or Wallet status.
- **Creator:** a creative participant who may also be a Rights Holder or contractual recipient, but the roles remain distinct.
- **Settlement Consumer:** receives finalized allocation instructions for later approved payment execution.
- **Challenger:** raises a scoped calculation, input or policy-application challenge.

## Definitions

- **Revenue Snapshot:** an immutable period record of finalized eligible receipts, reversals, approved deductions and reconciliation evidence in one exact asset and unit.
- **Distribution Policy:** a versioned set of pool ratios, eligibility rules, Usage weighting, rounding, residual, hold and minimum-payout rules.
- **User Contribution:** the eligible amount attributable to one subscription or User calculation context after approved allocation rules, represented without exposing public User identity.
- **Content Allocation:** the amount assigned to one content object from eligible User Contributions and finalized Usage.
- **Recipient Allocation:** the amount assigned from a Content Allocation to a Rights Holder or approved contractual recipient under an exact Rights Snapshot.
- **Held Allocation:** an amount not payable because Rights, fraud, compliance, accounting or operational conditions are unresolved.
- **Distribution Result:** an immutable versioned set of pools, Content Allocations, Recipient Allocations, holds, residuals and commitments for one Distribution Period.
- **Settlement Instruction:** an authorized output referencing a finalized Recipient Allocation, approved settlement asset and recipient payment profile; it is not itself payment finality.
- **Treasury Transparency Snapshot:** a versioned explanatory Read Model that reconciles period flows, ending asset locations and ending obligations, approved reserves and unallocated remainder from referenced authoritative sources; it is not a statutory financial statement or payment authority.
- **Asset Location:** the reconciled custody or accounting location of an ending balance, such as an identified Contract, corporate custody account or receivable ledger.
- **Purpose or Obligation:** a transparency category identifying an approved obligation, reserve, budget or unallocated remainder without determining its statutory accounting classification.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Revenue system exports are inputs requiring reconciliation and approval, not self-authenticating truth.
- A finalized Usage Snapshot proves only the scoped usage result under its policy; it does not identify Rights Holders or determine payout policy.
- A Rights Snapshot supplies scoped Rights and Distribution Instructions; it does not prove payment eligibility, tax status or Wallet control.
- The Distribution Operator can execute one policy version but cannot authorize deductions, rewrite Rights or redirect held amounts.
- Public commitments can prove result integrity but must not expose User-level listening, payment or identity data.
- Settlement systems may fail, delay or reject instructions; calculation finality and payment finality remain separate.

## Inputs

### Revenue Snapshot

- `period_id`
- `revenue_snapshot_id` and `version`
- `asset_id`, `asset_version` and integer `unit`
- finalized eligible receipt references;
- reversals, refunds and charge-adjustment references;
- each deduction category, amount, authority and evidence;
- gross, deducted and net totals;
- source-ledger and reconciliation references;
- approval reference and finalized time.

### Distribution Policy

- `policy_id` and immutable version;
- activation interval and applicable plans or regions;
- eligible revenue and deduction categories;
- pool allocation ratios;
- User Contribution rule;
- Usage weighting rule and required Usage Snapshot profile;
- Rights allocation and incomplete-share treatment;
- hold, rounding, residual and minimum-payout rules;
- transparency and privacy thresholds;
- approval and migration references.

### Finalized Snapshots

- exact finalized Usage Snapshot ID and version;
- exact Rights Snapshot ID and version for each content allocation;
- approved settlement-asset entry when producing Settlement Instructions;
- prior carried balances and their provenance.

### Treasury Transparency Inputs

- opening balance and prior finalized Treasury Transparency Snapshot;
- finalized receipt, reversal and outflow references;
- exact Contract balances with Network, Block and finality evidence;
- corporate custody, receivable, payable and tax-accounting references;
- finalized Distribution Results and settlement-state references;
- approved operations, promotion and community budget references;
- adjustment authority, evidence and applicable disclosure policy.

## Outputs

- immutable candidate and finalized Distribution Result versions;
- revenue, deduction and pool reconciliation;
- Content and Recipient Allocations in integer asset units;
- held, residual and carried-balance records;
- result commitment and verification report;
- privacy-safe public and Creator explanation records;
- Settlement Instructions referencing exact finalized allocations.
- versioned Treasury Transparency Snapshots with period-flow, asset-location and purpose-or-obligation reconciliation;
- privacy-safe public Treasury summaries and authorized Creator explanations.

## State

```text
DRAFT → INPUTS_FROZEN → CALCULATED → REVIEW_PENDING → FINALIZED
  │          │              │              │              │
  └──────────┴──────────────┴──────────────┴──────────────┼→ ABORTED
                                                         ├→ CHALLENGED
                                                         └→ CORRECTED (new version)
```

- `DRAFT` collects references and cannot produce payment instructions.
- `INPUTS_FROZEN` binds exact Revenue, Usage, Rights and Policy versions.
- `CALCULATED` is reproducible but not approved.
- `REVIEW_PENDING` exposes reconciliation and approved challenge evidence.
- `FINALIZED` is immutable and may produce Settlement Instructions.
- `CHALLENGED` holds affected unsettled instructions according to policy.
- `CORRECTED` requires a new Distribution Result version and impact record.

## Requirements

### MUST

- **REQ-DISTRIBUTION-001:** Every Distribution Result MUST identify a stable Period ID, result version, exact asset identity and integer unit.
- **REQ-DISTRIBUTION-002:** Calculation MUST bind one exact finalized Revenue Snapshot, Usage Snapshot, Distribution Policy version and the exact Rights Snapshot used for every content allocation.
- **REQ-DISTRIBUTION-003:** The Revenue Snapshot MUST reconcile gross eligible receipts, reversals, approved deductions, net distributable revenue and source-ledger evidence in the same asset unit.
- **REQ-DISTRIBUTION-004:** Every deduction MUST identify category, amount, authority, evidence and applicable policy rule before it reduces distributable revenue.
- **REQ-DISTRIBUTION-005:** Pool allocation MUST use explicit versioned ratios or integer amounts and MUST reconcile exactly to net distributable revenue after deterministic residual treatment.
- **REQ-DISTRIBUTION-006:** Creator Distribution, Community or Discovery allocation, Platform revenue and other approved allocations MUST remain distinguishable in calculation and audit records.
- **REQ-DISTRIBUTION-007:** User-Centric calculation MUST derive each eligible User Contribution from the approved revenue and policy context without exposing public User identity.
- **REQ-DISTRIBUTION-008:** A User Contribution with eligible Verified Usage MUST allocate only across content in the bound finalized Usage Snapshot under the exact Usage weighting rule.
- **REQ-DISTRIBUTION-009:** The denominator, zero-usage treatment, caps, exclusions and weight units for User-Centric allocation MUST be explicit in the Distribution Policy.
- **REQ-DISTRIBUTION-010:** Content Allocations MUST sum to the applicable User-Centric Pool after the approved zero-usage, rounding and residual rules.
- **REQ-DISTRIBUTION-011:** Each Content Allocation MUST resolve an exact effective Rights Snapshot for the relevant Rights Type, territory, use and period.
- **REQ-DISTRIBUTION-012:** Recipient Allocation MUST use integer numerator and denominator shares scoped by the bound Rights Snapshot and MUST use deterministic arithmetic.
- **REQ-DISTRIBUTION-013:** Recipient shares MUST reconcile to the allocable whole or place every incomplete, excess, unknown or disputed portion into an explicit Held Allocation.
- **REQ-DISTRIBUTION-014:** Held Allocations MUST retain content, Rights scope, amount, reason, source snapshot, authority and release conditions.
- **REQ-DISTRIBUTION-015:** Release of a Held Allocation MUST bind an authorized resolution and new applicable Rights or policy version without rewriting the original hold record.
- **REQ-DISTRIBUTION-016:** All monetary calculation MUST use integers in the declared asset unit and MUST define overflow, division, ordering and rounding behavior.
- **REQ-DISTRIBUTION-017:** Every rounding residual MUST be recorded and handled by one approved deterministic rule; it MUST remain part of reconciliation.
- **REQ-DISTRIBUTION-018:** A balance below the approved minimum-payout threshold MUST be carried with exact recipient, asset, amount, origin periods and policy provenance unless lawfully resolved otherwise.
- **REQ-DISTRIBUTION-019:** Carried balances MUST remain separate by asset identity and MUST NOT be converted or netted across assets without a separately authorized conversion process.
- **REQ-DISTRIBUTION-020:** The same frozen inputs, policy version, canonical ordering and implementation-conformance profile MUST produce byte-equivalent canonical Distribution Result content.
- **REQ-DISTRIBUTION-021:** Finalization MUST require independent verification of input finality, reconciliation, arithmetic, commitments, holds and policy authorization.
- **REQ-DISTRIBUTION-022:** Finalization authority MUST be separated from the sole Distribution Operator under production controls appropriate to the governance phase.
- **REQ-DISTRIBUTION-023:** A finalized Distribution Result MUST identify result commitment, input commitments, calculation software or conformance version, approval reference and finalization time.
- **REQ-DISTRIBUTION-024:** Settlement Instructions MUST reference an exact finalized Recipient Allocation, result version, approved asset entry and authorized recipient payment profile.
- **REQ-DISTRIBUTION-025:** Settlement status, transaction reference, failure and retry MUST be recorded separately from allocation calculation state.
- **REQ-DISTRIBUTION-026:** Total Settlement Instructions plus held, carried, residual and already settled amounts MUST reconcile to the finalized Recipient Allocations.
- **REQ-DISTRIBUTION-027:** A challenge MUST identify the result version, affected allocation or pool, evidence, requester standing, requested remedy and submission time.
- **REQ-DISTRIBUTION-028:** A material unresolved challenge MUST hold affected unsettled instructions without freezing unrelated finalized allocations unless the approved policy requires it.
- **REQ-DISTRIBUTION-029:** A correction MUST create a new Distribution Result version and record cause, authority, changed inputs, deltas and every affected downstream instruction.
- **REQ-DISTRIBUTION-030:** Public period transparency MUST include privacy-safe revenue, deduction, pool, policy, Usage, Rights, hold, residual, commitment and settlement-completion summaries.
- **REQ-DISTRIBUTION-031:** A Creator or Rights Holder explanation MUST trace an authorized recipient's amount through pool, usage allocation, Rights split, hold, carry and settlement status without exposing another User's private data.
- **REQ-DISTRIBUTION-032:** Input or dependency unavailability MUST stop affected finalization or instruction generation rather than substitute estimates as finalized amounts.
- **REQ-DISTRIBUTION-052:** Every Treasury Transparency Snapshot MUST identify a stable Period ID, Snapshot version, exact Asset ID and integer unit, source cutoff, as-of time, generation time and reconciliation state.
- **REQ-DISTRIBUTION-053:** A Treasury Transparency Snapshot MUST reconcile opening balance plus finalized inflows minus finalized outflows plus or minus approved adjustments to ending balance in one exact asset unit.
- **REQ-DISTRIBUTION-054:** Ending balance MUST reconcile to evidence-backed Asset Locations, including each applicable Contract custody, corporate custody, receivable and other approved asset category.
- **REQ-DISTRIBUTION-055:** Ending Asset Locations MUST reconcile to separately identified Creator payables, tax reserves or payables, operations reserve, promotion budget, community budget, other approved purposes and net unallocated reserve.
- **REQ-DISTRIBUTION-056:** Every Treasury flow, location and purpose-or-obligation row MUST identify category, amount, source reference, authority, evidence, status and applicable policy or accounting-period reference.
- **REQ-DISTRIBUTION-057:** A correction to a finalized Treasury Transparency Snapshot MUST create a new version with cause, authority, changed source references, line and total deltas and affected published commitments.

### MUST NOT

- **REQ-DISTRIBUTION-033:** Unverified Usage or a non-finalized Usage Snapshot MUST NOT contribute to normal finalized Creator Distribution.
- **REQ-DISTRIBUTION-034:** Upload, Creator registration, Account control or Wallet control MUST NOT cause an amount to bypass the applicable Rights Snapshot.
- **REQ-DISTRIBUTION-035:** A disputed, incomplete or suspended Rights portion MUST NOT be paid as if it were an unrestricted verified Recipient Allocation.
- **REQ-DISTRIBUTION-036:** Platform operators MUST NOT add an unapproved deduction or redirect Creator Distribution Pool funds after input freeze.
- **REQ-DISTRIBUTION-037:** Token holdings, shareholder status, STO investment, Governance participation, advertising spend or recommendation rank MUST NOT increase Creator Distribution weight unless an approved higher-level rule explicitly changes this invariant-compatible policy.
- **REQ-DISTRIBUTION-038:** A finalized Distribution Result MUST NOT be overwritten, silently recomputed or served under the same version with different content.
- **REQ-DISTRIBUTION-039:** Rounding, residual or minimum-payout handling MUST NOT create undocumented Platform revenue or cause an authorized recipient balance to disappear.
- **REQ-DISTRIBUTION-040:** User-level listening history, payment history, identity or per-User Content Allocation MUST NOT be published on a public blockchain or Creator-facing aggregate view.
- **REQ-DISTRIBUTION-041:** A Settlement Instruction MUST NOT be represented as completed payment before the applicable settlement-finality evidence exists.
- **REQ-DISTRIBUTION-042:** Distribution calculation MUST NOT determine legal Rights, tax status, withholding duty, sanctions eligibility or payment-account ownership.
- **REQ-DISTRIBUTION-058:** A Treasury Transparency Snapshot MUST NOT be represented as a statutory balance sheet, income statement, accounting ledger, tax return, payment instruction or budget-execution authority.
- **REQ-DISTRIBUTION-059:** An implementation MUST NOT treat a Wallet or Contract balance as revenue, profit, distributable cash or beneficial ownership, or net different assets, unless supported by the applicable authoritative accounting, Rights and conversion records.
- **REQ-DISTRIBUTION-060:** Estimated, pending, stale or unreconciled source data MUST NOT be displayed as finalized Treasury amounts or silently mixed into finalized totals.

### SHOULD

- **REQ-DISTRIBUTION-043:** Independent implementations SHOULD reproduce canonical calculation fixtures and commitments before a policy version is activated.
- **REQ-DISTRIBUTION-044:** Public summaries SHOULD provide machine-readable policy, input and result references alongside human-readable explanations.
- **REQ-DISTRIBUTION-045:** Privacy thresholds SHOULD prevent sparse Creator aggregates from enabling User re-identification.
- **REQ-DISTRIBUTION-046:** Reconciliation SHOULD detect duplicate receipts, missing reversals, asset mismatch, impossible shares and downstream double instruction before finalization.
- **REQ-DISTRIBUTION-047:** Settlement batching SHOULD preserve per-allocation provenance and idempotency while minimizing fees under the approved policy.
- **REQ-DISTRIBUTION-048:** Creator-facing explanations SHOULD distinguish calculated, held, carried, instructed, settled and failed amounts.
- **REQ-DISTRIBUTION-061:** Treasury public summaries SHOULD provide machine-readable Snapshot, source, policy, status and commitment references alongside human-readable period-flow and ending-balance explanations.
- **REQ-DISTRIBUTION-062:** Treasury disclosure SHOULD apply privacy and commercial-confidentiality thresholds while preserving enough aggregated evidence for Creator, User and Governance oversight.

### MAY

- **REQ-DISTRIBUTION-049:** An implementation MAY publish an on-chain Distribution Result commitment or allocation root without publishing User-level inputs.
- **REQ-DISTRIBUTION-050:** A conforming policy MAY allocate an approved Community or Discovery Pool using a separately versioned rule that preserves all applicable Rights, privacy and audit requirements.
- **REQ-DISTRIBUTION-051:** A Settlement Consumer MAY support pull-based claims, push payments or controlled off-chain payment when each path preserves exact allocation provenance and applicable authorization.

## Invariants

- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-RIGHTS-003`
- `INV-RIGHTS-005`
- `INV-USAGE-001`
- `INV-USAGE-002`
- `INV-DISTRIBUTION-001`
- `INV-DISTRIBUTION-002`
- `INV-DISTRIBUTION-003`
- `INV-DISTRIBUTION-004`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-002`
- `INV-EVOLUTION-003`
- **SPEC-INV-DISTRIBUTION-001:** Every finalized amount reconciles exactly to Revenue Snapshot inputs through pools, recipients, holds, carries and residuals.
- **SPEC-INV-DISTRIBUTION-002:** The same frozen inputs and policy always produce the same canonical Distribution Result.
- **SPEC-INV-DISTRIBUTION-003:** No disputed or incomplete Rights portion becomes an unrestricted payment instruction.
- **SPEC-INV-DISTRIBUTION-004:** Platform revenue never silently absorbs Creator residual, held or carried balances.
- **SPEC-INV-DISTRIBUTION-005:** Finalized result content never changes under the same version.
- **SPEC-INV-DISTRIBUTION-006:** Public verification never exposes User-level listening or payment history.
- **SPEC-INV-DISTRIBUTION-007:** Every finalized Treasury period flow and both ending-balance views reconcile exactly in one declared asset unit.
- **SPEC-INV-DISTRIBUTION-008:** A transparency view never replaces an authoritative accounting, tax, custody, distribution, settlement or governance record and never authorizes movement of funds.

## Calculation Model

For a User calculation context `u`, let `D_u` be the eligible User Contribution and `w_(u,c)` the finalized usage weight for content `c`:

```text
content_allocation(u, c) = floor_policy(
  D_u * w_(u,c) / sum_j(w_(u,j))
)
```

The exact multiplication order, wide-integer behavior, division, tie-breaking and residual rule MUST be defined by the Distribution Policy conformance profile.

For Content Allocation `A_c` and Rights share `n_(c,r) / d_(c,r)`:

```text
recipient_allocation(c, r) = floor_policy(
  A_c * n_(c,r) / d_(c,r)
)
```

Every unit not assigned by these operations MUST appear as an explicit residual or Held Allocation. Floating-point arithmetic is non-conforming for monetary results.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Distribution Operator | valid Period ID and candidate references | `DRAFT` | `DistributionDrafted` | reject malformed or overlapping period |
| `DRAFT` | Distribution Operator | exact finalized inputs and policy activation verified | `INPUTS_FROZEN` | `DistributionInputsFrozen` | remain `DRAFT` |
| `INPUTS_FROZEN` | Distribution Operator | deterministic calculation and complete reconciliation | `CALCULATED` | `DistributionCalculated` | `ABORTED` or remain frozen with error |
| `CALCULATED` | Distribution Reviewer | independent verification package and candidate commitment | `REVIEW_PENDING` | `DistributionReviewRequested` | return to calculation with recorded defect |
| `REVIEW_PENDING` | Finalization authority | review passed; challenges resolved; approval complete | `FINALIZED` | `DistributionFinalized` | remain pending or `ABORTED` |
| `FINALIZED` | Challenger / authority | supported material challenge before affected settlement | `CHALLENGED` | `DistributionChallenged` | unaffected allocations continue per policy |
| `FINALIZED` or `CHALLENGED` | Finalization authority | approved correction and downstream impact plan | `CORRECTED` plus new version | `DistributionCorrected` | prior result remains immutable |

## Interfaces

Equivalent controlled operations MUST be available:

```text
createDistributionDraft(period_id, policy_version)
freezeDistributionInputs(revenue_snapshot, usage_snapshot, rights_snapshot_set)
calculateDistribution(result_id, expected_input_commitment)
verifyDistribution(result_id, result_version)
challengeDistribution(result_id, challenge)
finalizeDistribution(result_id, result_version)
correctDistribution(result_id, correction)
getDistributionResult(result_id, result_version)
getRecipientExplanation(result_id, authorized_recipient)
createSettlementInstructions(result_id, result_version)
createTreasuryTransparencySnapshot(period_id, asset_id, source_cutoffs)
verifyTreasuryTransparencySnapshot(snapshot_id, snapshot_version)
getTreasuryTransparencySnapshot(snapshot_id, snapshot_version, disclosure_profile)
correctTreasuryTransparencySnapshot(snapshot_id, correction)
```

Implementations MAY expose different transport or method names, but calculation, authorization, privacy, idempotency and audit semantics MUST remain equivalent.

## Error Handling

Stable categories MUST distinguish at least:

- missing, stale, non-final or asset-incompatible input snapshot;
- unauthorized or inactive policy version;
- revenue reconciliation or deduction failure;
- zero or invalid Usage denominator;
- Rights scope missing, disputed, incomplete, excess or expired;
- arithmetic overflow, unit mismatch or residual mismatch;
- non-deterministic result or commitment mismatch;
- unauthorized transition or stale expected version;
- unresolved challenge or downstream instruction conflict;
- unavailable Revenue, Usage, Rights, review or settlement dependency.

Public and recipient-facing errors MUST NOT expose another User's usage, payment, identity or restricted Rights evidence.

## Idempotency and Replay Protection

- Draft, freeze, calculation, finalization, correction and instruction commands MUST bind stable request identifiers and expected versions.
- Repeating a command with the same canonical inputs MUST return the original result or equivalent reference.
- Reusing an identifier with different inputs MUST fail as a conflict.
- A Settlement Instruction idempotency key MUST bind result version, allocation ID, recipient payment profile version, asset and amount.
- Correction replay MUST NOT duplicate deltas, holds, carries or payment instructions.

## Audit Requirements

Audit records MUST cover:

- Revenue Snapshot intake, deductions, reconciliation and approval;
- Distribution Policy activation and parameter versions;
- frozen Usage and Rights input commitments;
- every calculation run, software version, exception and result commitment;
- review, challenge, finalization and correction;
- Content, Recipient, Held, residual and carried-balance provenance;
- Settlement Instruction creation, retry, cancellation and finality reference;
- Treasury source cutoffs, balances, budget references, reconciliation, publication and correction;
- privileged access to recipient explanations and restricted inputs.

Audit records MUST be tamper-evident, access controlled and retained under approved legal, accounting, privacy and operational schedules.

## Versioning and Migration

- Revenue, Policy, Usage, Rights, Distribution Result and Settlement Instruction versions MUST remain independently identifiable.
- Policy migration MUST define activation boundary, in-flight period treatment, compatibility and rollback.
- Material input or calculation changes MUST create a new result version and MUST NOT overwrite a finalized result.
- Carry migration MUST preserve recipient, asset, amount and every origin period.
- Historical calculation software or an equivalent reproducible conformance implementation MUST remain available for audit.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-DISTRIBUTION-001–006 | Revenue / reconciliation | Asset units, deductions and all pools reconcile exactly with explicit authority and provenance |
| REQ-DISTRIBUTION-007–015 | User-Centric / Rights property | Usage creates content amounts; exact Rights create recipient amounts; unresolved portions remain held |
| REQ-DISTRIBUTION-016–023 | Arithmetic / determinism / authorization | Integer calculations and residuals reproduce; independent approval finalizes one immutable result |
| REQ-DISTRIBUTION-024–032 | Settlement boundary / challenge / privacy | Instructions bind exact allocations; corrections and explanations preserve reconciliation and privacy |
| REQ-DISTRIBUTION-033–042 | Negative / separation | Unverified usage, disputed Rights, capital influence, hidden deductions and premature payment claims never affect finalized results |
| REQ-DISTRIBUTION-043–048 | Conformance | Implemented SHOULD behavior is verified or deviation is documented under conventions |
| REQ-DISTRIBUTION-049–051 | Optional conformance | Commitments, community pools and settlement paths preserve every MUST, MUST NOT and invariant |
| REQ-DISTRIBUTION-052–057 | Treasury reconciliation | Period flow, ending Asset Locations and purposes or obligations reconcile with exact source, authority, evidence and correction provenance |
| REQ-DISTRIBUTION-058–060 | Treasury separation / negative | Transparency is never represented as statutory accounting or authority; Wallet balances and unfinished data never become finalized revenue or totals |
| REQ-DISTRIBUTION-061–062 | Treasury disclosure conformance | Human and machine-readable explanations preserve oversight while applying privacy and confidentiality thresholds |

Property and adversarial tests MUST include zero usage, one-unit pools, maximum integers, share totals below/equal/above one, non-divisible amounts, order permutations, duplicate receipts, stale Rights, disputed shares, concurrent finalization, correction replay, instruction retry, asset mismatch, sparse privacy groups, unavailable dependencies, mismatched Treasury totals, stale chain cutoffs, unapproved adjustments, cross-asset netting and unfinished source data.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- Golden fixtures reproduce identical canonical results and commitments across independent conforming implementations.
- Every test period proves gross revenue equals deductions plus all approved pools, and every Creator pool unit resolves to recipient, hold, carry or residual.
- Rights tests prove no uploader, Account or Wallet bypasses the exact Rights Snapshot.
- Privacy review proves public and Creator-facing records cannot reveal User-level listening or payment history.
- Finance and accounting review approves the concrete Revenue Snapshot, deduction, reconciliation and ledger interfaces.
- Every Treasury test period proves period-flow ending balance equals the Asset Location total, which equals the purpose-or-obligation total in the exact same asset unit.
- Treasury tests prove Wallet or Contract balances do not automatically become revenue, profit, distributable cash or payment authority, and that corrections preserve prior versions and explicit deltas.
- Legal, tax and rights review approves the concrete first-jurisdiction hold, recipient, withholding-boundary and record-retention procedures.
- Security review covers policy tampering, operator collusion, key compromise, arithmetic faults, instruction replay and privacy leakage.
- Operational runbooks cover reconciliation mismatch, disputed Rights, failed settlement, correction, lost recipient access and incident response.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-DISTRIBUTION-001:** **Decision owner:** Operating Company / Finance, Accounting and Tax; **Blocks:** Revenue Snapshot implementation; **Question:** Which ledger is authoritative and which receipt, refund, fee, tax and other deduction categories are eligible in the first jurisdiction?
- **OQ-DISTRIBUTION-002:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** Distribution Policy v0.1.0 activation; **Question:** What initial Creator, Community or Discovery, Platform and other pool allocations should be proposed and approved?
- **OQ-DISTRIBUTION-003:** **Decision owner:** Protocol Governance / Creator and User Representatives; **Blocks:** User-Centric calculation; **Question:** Which finalized Usage weights, zero-usage treatment, caps and anti-concentration rules should the first policy use?
- **OQ-DISTRIBUTION-004:** **Decision owner:** Operating Company / Legal, Rights Operations and Finance; **Blocks:** disputed and incomplete Rights treatment; **Question:** Where and under whose control are Held Allocations recorded until Rights or payment conditions are resolved?
- **OQ-DISTRIBUTION-005:** **Decision owner:** Protocol Governance / Finance and Distribution Engineering; **Blocks:** canonical arithmetic profile; **Question:** Which rounding, tie-breaking, residual and minimum-payout rules apply to the first approved settlement asset?
- **OQ-DISTRIBUTION-006:** **Decision owner:** Operating Company / Legal, Tax, Finance and Creator Operations; **Blocks:** Settlement Instruction creation; **Question:** Which recipient identity, tax, sanctions, invoice and payment-profile checks must be complete before an allocation becomes payable?
- **OQ-DISTRIBUTION-007:** **Decision owner:** Operating Company / Privacy, Product and Creator Relations; **Blocks:** transparency launch; **Question:** Which public totals, Creator explanations and minimum group thresholds provide meaningful auditability without exposing User data?
- **OQ-DISTRIBUTION-008:** **Decision owner:** Protocol Governance / Finance, Security and Creator Representatives; **Blocks:** correction and challenge operations; **Question:** What materiality threshold, challenge window, approval authority and downstream recovery process apply to finalized-result corrections?
