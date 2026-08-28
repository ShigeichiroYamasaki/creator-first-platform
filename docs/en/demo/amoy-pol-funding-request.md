---
title: Amoy Test POL Funding Request Evidence
description: Public technical evidence and bounded-use policy for a Creator First Platform Amoy Test POL support request.
---

# Amoy Test POL Funding Request Evidence

[日本語のテストネットデモ](/demo/)

This page is the public evidence package for a Polygon ecosystem-support or listed third-party faucet request. Polygon's current [test-token faucet documentation](https://docs.polygon.technology/tools/gas/matic-faucet) states that the former official Polygon Faucet is no longer available. This project therefore does not represent this page as an application to a currently operating official Polygon Faucet.

## Request summary

| Field | Public value |
| --- | --- |
| Project | Creator First Platform |
| Purpose | Closed, pre-registered public experiment for a creator-first music subscription, supporter-credential and bicameral-governance flow |
| Network | Polygon Amoy, chain ID `80002` |
| Requested initial tranche | `2 Test POL` |
| Funding destination | `0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE` |
| Destination type | Testnet-only capped distributor smart contract; it accepts native Amoy POL |
| Explorer | [Distributor on Amoy Polygonscan](https://amoy.polygonscan.com/address/0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE) |
| Deployment transaction | [`0x0f356550…cede2e9`](https://amoy.polygonscan.com/tx/0x0f356550ffd775f9e93c0c4f42671f8c8287d0711646397fe0a97d312cede2e9) |
| Source commit | [`19987da6ca367635f18da8e753782c87318e678c`](https://github.com/ShigeichiroYamasaki/creator-first-platform/commit/19987da6ca367635f18da8e753782c87318e678c) |
| Repository | [ShigeichiroYamasaki/creator-first-platform](https://github.com/ShigeichiroYamasaki/creator-first-platform) |
| Public deployment manifest | [deployment.json](/testnet/deployment.json) |
| Test asset status | Test POL has no intended monetary value, redemption, reward or production entitlement |

The first tranche is intentionally smaller than the experiment's theoretical maximum. At the `0.02 Test POL` initial target, `2 Test POL` can cover up to 100 initial wallet targets before operator gas, or a smaller group with measured replenishments. Additional support should be requested only after publishing participant count, actual gas consumption, contract balance and distribution-event evidence. For a 20-person pilot, the absolute lifetime ceiling is `10 Test POL`, but incremental allocation is expected to keep actual use materially lower.

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

The contract was deployed with `0.02 Test POL`. Its current balance and all transfers are publicly observable. The contract cannot determine whether a human has registered through another identity, estimate future gas, or initiate its own transaction. A separately secured operator must verify the pre-registration record, bind an approved operation, estimate gas and submit the transaction. The static GitHub Pages site contains no distributor key.

## Application text

> Creator First Platform requests an initial 2 Test POL tranche for a closed Polygon Amoy experiment. Funds should be sent to the capped testnet distributor contract at 0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE. The contract is deployed from public source commit 19987da6ca367635f18da8e753782c87318e678c and enforces pre-registration, a 0.02 POL initial target, a 0.05 POL per-transfer and target ceiling, a 0.5 POL cumulative participant cap, a ten-minute cooldown, a 1 POL daily global budget, replay protection, role control and emergency pause. Test POL will be used only for approved wallet registration, MockJPYC subscription, supporter SBT and governance transactions. It has no monetary value or production entitlement. Distribution events, contract balance and measured gas will be published before any further request.

## Known operational limitation

The initial test deployment bootstraps administrator, registrar, distributor and pauser roles to one test-only deployer account. This is acceptable only for the small closed pilot. Before broader participation, operational roles must be moved to reviewed separate accounts, alerts and approval logs must be enabled, and the bootstrap authority must be reduced. The contract and surrounding operator have not received an independent security audit.
