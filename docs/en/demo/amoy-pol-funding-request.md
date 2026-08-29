---
title: Amoy Test POL Funding Request Evidence
description: Public technical evidence and bounded-use policy for a Creator First Platform Amoy Test POL support request.
---

# Amoy Test POL Funding Request Evidence

[日本語の無償版運用実験](/demo/)

This page is the public evidence package for a Polygon ecosystem-support or listed third-party faucet request. Polygon's current [test-token faucet documentation](https://docs.polygon.technology/tools/gas/matic-faucet) states that the former official Polygon Faucet is no longer available. This project therefore does not represent this page as an application to a currently operating official Polygon Faucet.

## Request summary

| Field | Public value |
| --- | --- |
| Project | Creator First Platform |
| Purpose | Closed, pre-registered public experiment for a creator-first music subscription, supporter-credential and bicameral-governance flow |
| Network | Polygon Amoy, chain ID `80002` |
| Requested allocation | `65 Test POL` |
| Expected experiment | Approximately 100 pre-registered participants and 5,000 on-chain transactions |
| Participant distribution pool | Up to `50 Test POL`, funded in controlled tranches to `0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE` |
| Operator gas reserve | Up to `15 Test POL` at treasury EOA `0x67dF94e6eD03d533c9c63D582F5e20447db3c803` |
| Destination types | Capped testnet-only distributor contract and separately accounted testnet operator EOA |
| Explorer | [Distributor on Amoy Polygonscan](https://amoy.polygonscan.com/address/0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE) |
| Deployment transaction | [`0x0f356550…cede2e9`](https://amoy.polygonscan.com/tx/0x0f356550ffd775f9e93c0c4f42671f8c8287d0711646397fe0a97d312cede2e9) |
| Source commit | [`19987da6ca367635f18da8e753782c87318e678c`](https://github.com/ShigeichiroYamasaki/creator-first-platform/commit/19987da6ca367635f18da8e753782c87318e678c) |
| Repository | [ShigeichiroYamasaki/creator-first-platform](https://github.com/ShigeichiroYamasaki/creator-first-platform) |
| Public deployment manifest | [deployment.json](/testnet/deployment.json) |
| Test asset status | Test POL has no intended monetary value, redemption, reward or production entitlement |

The requested amount is a maximum experiment budget, not an amount automatically distributed to participants. The deployed contract permits no more than `0.5 Test POL` cumulatively for one approved participant ID, so 100 participants create an absolute participant-pool ceiling of `50 Test POL`. The remaining `15 Test POL` is separately accounted operator gas for contract deployment and integration, participant registration, controlled distribution calls, governance administration, demonstrations, monitoring, retries and incident handling. It is not added to any participant's allowance.

At the `0.02 Test POL` initial target, onboarding 100 wallets requires at most `2 Test POL` of participant distributions. Because the contract also limits total distributions to `1 Test POL` per daily epoch, initial onboarding requires at least two daily windows and exhausting the full `50 Test POL` participant ceiling would require at least 50 daily windows. Funding and replenishment will therefore be staged, measured and publicly auditable; unused Test POL remains testnet-only treasury inventory and is not treated as an economic asset.

## Enforced on-chain controls

The deployed `CreatorFirstTestnetPolDistributor` enforces:

- one opaque pre-approved participant ID bound to one wallet;
- an initial wallet target of `0.02 Test POL`;
- a maximum target and per-distribution amount of `0.05 Test POL`;
- a cumulative lifetime cap of `0.5 Test POL` per registered participant ID;
- a ten-minute replenishment cooldown;
- a global daily distribution budget of `1 Test POL`;
- one-time operation IDs to prevent replay;
- role-restricted registration, distribution and pause operations; and
- emergency withdrawal only while distribution is paused.

The contract was deployed with `0.02 Test POL`. Its current balance and all transfers are publicly observable. The contract cannot determine whether a human has registered through another identity, estimate future gas, or initiate its own transaction. A separately secured operator must verify the pre-registration record, bind an approved operation, estimate gas and submit the transaction. The static GitHub Pages site contains no distributor key. If the support provider can fund only one address, the treasury EOA is the requested receipt address and will transfer the participant-pool portion to the distributor in controlled, auditable tranches; otherwise the provider may fund the two stated allocations directly.

## Application text

> Creator First Platform requests 65 Amoy Test POL for a closed experiment with approximately 100 pre-registered participants and 5,000 expected on-chain transactions. The budget consists of up to 50 Test POL for participant gas, bounded by the deployed distributor's cumulative 0.5 POL cap per approved participant, and up to 15 Test POL for separately accounted operator gas covering deployment, integration, registration, distribution, governance administration, demonstrations and retries. The distributor is deployed at 0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE from public source commit 19987da6ca367635f18da8e753782c87318e678c. It enforces a 0.02 POL initial target, a 0.05 POL per-transfer and target ceiling, a ten-minute cooldown, a 1 POL daily global budget, replay protection, role control and emergency pause. The operator treasury EOA is 0x67dF94e6eD03d533c9c63D582F5e20447db3c803. Test POL will be used only for approved wallet registration, MockJPYC subscription, supporter SBT and governance transactions; it has no monetary value or production entitlement. Balances, distribution events and measured gas will remain publicly auditable.

## Known operational limitation

The initial test deployment bootstraps administrator, registrar, distributor and pauser roles to one test-only deployer account. This is acceptable only for the small closed pilot. Before broader participation, operational roles must be moved to reviewed separate accounts, alerts and approval logs must be enabled, and the bootstrap authority must be reduced. The contract and surrounding operator have not received an independent security audit.
