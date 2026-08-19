# Decision Baseline

This directory implements the source-controlled baseline for
[IMP-001](../docs/protocol/implementation-plan.md#imp-001-decision-baseline).

## Files

- `decision-register.yaml` references every current Protocol Specification. Its
  safe defaults keep every tracked Open Question `UNASSIGNED`, `OPEN` and
  implementation-blocking until public decision evidence is recorded.
- `mock-assumptions.yaml` contains bounded assumptions that may be used only by
  named Mock or Testnet Work Packages. It is intentionally empty initially.

The owning Protocol Specification remains the source of truth for an Open
Question's ID, decision-owner role, blocked gate and question text. The
register stores assignment and decision state without duplicating that text.

## State rules

- `OPEN` and `DEFERRED` questions remain `BLOCKED` and have no decision record.
- `DECIDED` questions require a public assignee, decision record, decision date
  and `ALLOWED` or `BLOCKED` implementation state.
- `WITHDRAWN` questions require a public record explaining the withdrawal and
  remain `BLOCKED`.
- A Mock assumption never changes its source Open Question to `DECIDED`.
- Secret information, personal data, contracts, Rights evidence, tax records
  and production credentials must not be stored in these public files.

Run `npm run decisions:validate` or the complete `npm run validate` gate after
every change.
