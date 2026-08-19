# Creator First Platform Protocol

This directory contains implementation-oriented specifications
for Creator First Platform.

## Purpose

The protocol documents define requirements that implementations
must satisfy.

They are intended to be readable by both human developers
and AI coding agents.

## Source of Truth

The project follows this hierarchy:

1. Three Charters
2. Whitepaper
3. Accepted CFP / Governance Decisions
4. ADR
5. Protocol Specification
6. Implementation Code

If implementation behavior conflicts with an approved
Protocol Specification, the specification takes precedence.

## Development Flow

Whitepaper
→ CFP
→ Governance Decision
→ ADR
→ Protocol Specification
→ GitHub Issue
→ Implementation
→ Tests
→ Pull Request

## Specification Domains

Planned domains include:

- account
- governance
- rights
- distribution
- usage
- zk
- blockchain
- security

## Current Specifications

| Specification | Domain | Status | Version |
| --- | --- | --- | --- |
| [SPEC-ACCOUNT-001 Subscription Settlement and Activation](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/account/subscription-settlement-spec.md) | account / payment | Draft | 0.1.0 |
| [SPEC-ACCOUNT-002 Wallet Linking and Unlinking](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/account/wallet-linking-spec.md) | account / identity | Draft | 0.1.0 |
| [SPEC-ACCOUNT-003 Account Lifecycle, Authentication and Recovery](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/account/account-lifecycle-spec.md) | account / identity | Draft | 0.1.0 |
| [SPEC-BLOCKCHAIN-001 Approved Settlement Asset Registry](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/blockchain/settlement-asset-registry-spec.md) | blockchain / payment | Draft | 0.1.0 |
| [SPEC-RIGHTS-001 Rights Registry and Versioned Rights State](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/rights/rights-registry-spec.md) | rights / content | Draft | 0.1.0 |
| [SPEC-USAGE-001 Playback Event Verification and Usage Snapshot](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/usage/playback-verification-spec.md) | usage / privacy | Draft | 0.1.0 |
| [SPEC-DISTRIBUTION-001 Creator Distribution Calculation and Allocation](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/distribution/creator-allocation-spec.md) | distribution / accounting | Draft | 0.1.0 |

## Validation

`npm run protocol:validate` verifies:

- unique Specification, Requirement, Global Invariant and specification invariant identifiers;
- existing repository-relative Whitepaper, ADR and related specification references;
- references from each specification to known Global Invariants;
- local ownership of Test Requirements references; and
- Test Requirements coverage for every MUST and MUST NOT requirement;
- stable Open Question identifiers, Decision owners and blocked gates.

## AI Agent Rule

Before implementing a feature, read:

1. AGENTS.md
2. related ADRs
3. related protocol specifications
4. existing implementation
5. existing tests
