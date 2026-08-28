---
description: English index of the draft Creator First Platform protocol specifications, validation rules and implementation authority.
---

# Protocol Specifications

The protocol converts whitepaper policy, accepted CFP decisions and ADRs into implementation-oriented requirements, invariants, interfaces, errors and test conditions. The canonical specification sources are written in English under the repository's [`protocol/`](https://github.com/ShigeichiroYamasaki/creator-first-platform/tree/main/protocol) directory. The pages below render those same sources; they are not translated forks.

::: warning Draft specifications
These documents are under design and review. They are not approved production specifications and do not authorise handling production money, rights or personal information.
:::

## Current specifications

| Specification | Domain | Purpose |
| --- | --- | --- |
| [SPEC-ACCOUNT-003](/en/protocol/specs/account-lifecycle) | Account / identity | Registration, authentication, recovery, restriction and closure |
| [SPEC-ACCOUNT-002](/en/protocol/specs/wallet-linking) | Account / identity | Wallet proof, linking, unlinking and role separation |
| [SPEC-ACCOUNT-004](/en/protocol/specs/early-supporter-credential) | Credential | Supporter consent, Early tier, revocation and privileges |
| [SPEC-ACCOUNT-001](/en/protocol/specs/subscription-settlement) | Payment | Settlement intent, finality and subscription activation |
| [SPEC-BLOCKCHAIN-001](/en/protocol/specs/settlement-asset-registry) | Blockchain / payment | Asset review, approval, suspension and evidence history |
| [SPEC-RIGHTS-001](/en/protocol/specs/rights-registry) | Rights | Claims, evidence, versions, disputes and rights snapshots |
| [SPEC-STREAMING-001](/en/protocol/specs/playback-authorization) | Streaming | Entitlement, rights and playback-session authorisation |
| [SPEC-STREAMING-002](/en/protocol/specs/player-client) | Client | Player, gateway, wallet, supporter and storage boundaries |
| [SPEC-USAGE-001](/en/protocol/specs/playback-verification) | Usage / privacy | Events, replay control, verification and usage snapshots |
| [SPEC-DISTRIBUTION-001](/en/protocol/specs/creator-distribution) | Distribution | Revenue, allocation, rights splits, holds and reconciliation |
| [SPEC-GOVERNANCE-001](/en/protocol/specs/governance-change) | Governance | Bicameral approval, evidence, timelock and upgrades |
| [SPEC-ZK-001](/en/protocol/specs/transparent-zk-verification) | Privacy / verification | Proof profiles, envelopes and acceptance records |
| [SPEC-PLATFORM-001](/en/protocol/specs/production-service-lifecycle) | Production orchestration | Cross-domain production lifecycle and failure boundaries |

## Source of authority

The intended hierarchy is applicable law and contracts, three charters, whitepaper, accepted CFP and governance evidence, ADR, protocol specification, then implementation. A deployed contract is not authoritative merely because it exists. The source commit, build, tests, approval manifest, chain and bytecode must agree.

## Automated validation

`npm run protocol:validate` checks unique IDs, referenced documents, global invariants, ownership of test requirements, MUST and MUST NOT coverage, and stable open-question gates. `npm run decisions:validate` checks specification coverage and evidence for decisions and bounded mock assumptions.

## Testnet boundary

Polygon Amoy (chain ID 80002) is the only public CFP testnet. Test POL, MockJPYC, credentials and votes have no production value or authority. Production is a separately reviewed and deployed system.
