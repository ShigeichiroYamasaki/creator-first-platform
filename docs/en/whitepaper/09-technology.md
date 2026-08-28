---
description: Open protocol, off-chain media, verifiable usage, transparent zero-knowledge proofs and governed upgrades.
---

# 9. Technology

## Design principles

The platform uses decentralisation where it improves verifiability or user control, not as an end in itself. Core principles are open specifications, privacy by design, technological neutrality, explicit trust boundaries, reproducible evidence and governed upgradeability.

Audio and personal listening histories remain off-chain. Content identifiers and versioned rights references can connect media, rights and settlement evidence without publishing the media itself.

## Usage verification

The player and gateway produce replay-resistant events associated with short-lived playback sessions. A usage pipeline validates timing, entitlement, content and duplicate conditions, then commits an aggregate snapshot. Raw events are retained only under a defined purpose and period.

Transparent zero-knowledge proof systems may later prove properties of an aggregate calculation without revealing every listening event. No single proof technology is constitutionally fixed. Each verifier profile defines its statement, public inputs, circuit or execution representation, security assumptions, performance limits and version.

## Smart contracts

Contracts implement bounded state transitions for approved assets, subscriptions, credentials, governance and settlement. Upgradeable contracts use separated proposer, reviewer, timelock and emergency roles. A proxy is not permission for unilateral policy changes; implementation hashes and approvals must be public.

## Current testnet

The current public demonstration uses Polygon Amoy only. It validates interfaces and evidence paths with MockJPYC, Test POL and test credentials. It does not establish the safety, legal validity, performance or economics of production.
