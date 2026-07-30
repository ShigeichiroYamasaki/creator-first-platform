# <Specification Title>

**Status:** Draft  
**Version:** 0.1.0  
**Protocol Domain:** <domain>  
**Specification ID:** <SPEC-DOMAIN-NNN>  
**Last Updated:** <UTC date>

## Related Documents

### Higher-level Sources

- Charter:
- Whitepaper:
- Governance Decision / CFP:
- ADR:

### Related Specifications

- SPEC-...

## Goal

Describe what this specification enables.

## Scope

Define what is covered.

## Out of Scope

Define what is explicitly not covered.

## Actors

List participating actors.

## Definitions

Define only domain-specific terms here.

Common terms MUST reference `protocol/glossary.md`.

## Trust Boundaries

Describe trusted and untrusted actors, services, clients and external systems.

## Inputs

List protocol inputs and their validation requirements.

## Outputs

List protocol outputs.

## State

Describe persistent state, ownership, versioning and finalization.

## Requirements

Every normative requirement SHOULD have a stable requirement identifier.

### MUST

- REQ-<DOMAIN>-001: ...

### MUST NOT

- REQ-<DOMAIN>-002: ...

### SHOULD

- REQ-<DOMAIN>-003: ...

### SHOULD NOT

- REQ-<DOMAIN>-004: ...

### MAY

- REQ-<DOMAIN>-005: ...

## Invariants

Reference global invariants by stable ID and define domain-specific invariants.

- INV-...
- SPEC-INV-...

## State Transitions

For every transition define:

- source state;
- triggering actor;
- required inputs;
- preconditions;
- validation;
- resulting state;
- emitted event;
- failure behavior.

```text
STATE_A
   ↓
STATE_B
```

## Interfaces

Define APIs, contract calls, events and serialization formats.

## Error Conditions

| Error ID | Condition | Required behavior |
| :------- | :-------- | :---------------- |
| ERROR_ID | ...       | ...               |

## Security Requirements

Define authentication, authorization, replay protection, key management and abuse resistance.

## Privacy Requirements

Define data minimization, disclosure boundaries, retention and public-verifiability mechanisms.

## Failure Handling

Define retry, rollback, recovery, partial-failure and unavailable-dependency behavior.

## Idempotency and Replay Protection

Define idempotency keys, nonce handling, duplicate detection and replay boundaries.

## Audit Requirements

Define required audit events, fields, retention and access restrictions.

## Versioning and Migration

Define compatibility, activation, deprecation, migration and rollback requirements.

## Test Requirements

For each MUST and MUST NOT requirement, identify at least one test.

| Requirement ID | Test type | Expected result |
| :------------- | :-------- | :-------------- |
| REQ-...        | ...       | ...             |

## Acceptance Criteria

List objective conditions required for the specification to be considered implemented.

## Open Questions

List unresolved questions that prevent or may change implementation.
