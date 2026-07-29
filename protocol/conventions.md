# Protocol Conventions

## Requirement Keywords

The following keywords are normative.

### MUST

The implementation is required to satisfy this requirement.

### MUST NOT

The implementation is prohibited from performing this behavior.

### SHOULD

The implementation should satisfy this requirement unless
there is a documented reason not to.

### MAY

The implementation may support this behavior.

## Identifiers

Identifiers MUST be stable within their protocol domain.

Examples:

- account_id
- wallet_id
- usage_event_id
- distribution_period_id
- rights_snapshot_id

## Time

Protocol timestamps SHOULD use UTC.

Externally serialized timestamps SHOULD use ISO 8601.

Example:

2026-07-29T12:00:00Z

## Monetary Amounts

Token amounts MUST NOT use floating-point arithmetic.

Amounts SHOULD be represented using integer smallest units.

Token metadata MUST define:

- asset identifier
- contract address where applicable
- decimals
- chain identifier

## Versions

Protocol specifications use semantic versioning:

MAJOR.MINOR.PATCH

Example:

0.1.0

## Errors

Protocol errors SHOULD use stable machine-readable identifiers.

Example:

INVALID_SIGNATURE
EXPIRED_CHALLENGE
DUPLICATE_EVENT
INSUFFICIENT_BALANCE

## Privacy

Personal information MUST NOT be placed on a public blockchain
unless explicitly required by an approved protocol specification
and applicable law.

