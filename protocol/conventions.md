# Protocol Conventions

## Requirement Keywords

The keywords MUST, MUST NOT, SHOULD, SHOULD NOT and MAY are normative.

### MUST

An implementation is required to satisfy this requirement.

### MUST NOT

An implementation is prohibited from performing this behavior.

### SHOULD

An implementation is expected to satisfy this requirement unless there is a documented and reviewable reason not to.

### SHOULD NOT

An implementation is expected to avoid this behavior unless there is a documented and reviewable reason not to.

### MAY

An implementation may support this behavior.

A deviation from a SHOULD or SHOULD NOT requirement MUST:

1. be documented;
2. identify the affected requirement;
3. explain the reason and consequences;
4. be covered by appropriate tests.

## Normative Hierarchy

The normative hierarchy is:

1. Three Charters
2. Whitepaper
3. Accepted CFP / Governance Decision
4. ADR
5. Protocol Specification
6. Implementation and Tests

A lower-level document MUST NOT override a higher-level requirement.

When a conflict is discovered:

1. the implementation MUST NOT silently choose one interpretation;
2. the conflict MUST be documented;
3. implementation SHOULD be paused for the affected behavior;
4. the conflict MUST be resolved through the applicable governance and documentation process.

## Identifiers

Identifiers MUST be stable within their protocol domain.

Examples:

- account_id
- wallet_id
- usage_event_id
- distribution_period_id
- rights_snapshot_id

Specifications and invariants SHOULD use stable machine-readable identifiers.

## Time

Protocol timestamps MUST represent time in UTC.

Externally serialized timestamps MUST use ISO 8601 with an explicit UTC designator.

Example:

```text
2026-07-29T12:00:00Z
```

A specification MUST define whether a timestamp represents:

- event occurrence time;
- observation time;
- acceptance time;
- effective time;
- finalization time.

Security-sensitive expiration decisions MUST NOT rely solely on a client-provided clock.

## Monetary Amounts

Monetary and token amounts MUST NOT use floating-point arithmetic.

Amounts MUST be represented as integer smallest units.

Every monetary amount MUST be associated with:

- asset_id;
- amount;
- decimals;
- chain_id where applicable;
- contract_address where applicable.

A Protocol Specification MUST define:

- rounding method;
- residual amount handling;
- overflow limits;
- minimum and maximum valid amounts.

Rounding MUST be deterministic and reproducible.

## Versions

Protocol specifications use semantic versioning:

```text
MAJOR.MINOR.PATCH
```

Example:

```text
0.1.0
```

A specification change MUST identify whether it is backward compatible and whether migration is required.

## Errors

Protocol errors SHOULD use stable machine-readable identifiers.

Examples:

```text
INVALID_SIGNATURE
EXPIRED_CHALLENGE
DUPLICATE_EVENT
INSUFFICIENT_BALANCE
```

A specification SHOULD define the condition, required behavior and externally visible information for each error.

## Privacy

Personal information MUST NOT be stored on a public blockchain.

A Protocol Specification MUST NOT create an exception to this rule.

Where public verifiability is required, implementations SHOULD use:

- commitments;
- zero-knowledge proofs;
- pseudonymous identifiers;
- aggregated data;
- encrypted off-chain records with access control.

Hashes of directly identifying or easily enumerable personal information MUST NOT be treated as anonymized personal information.
