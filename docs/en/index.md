---
layout: home
title: Creator First Platform — English
description: Creator First Platform is an open, creator-first music platform concept with a Polygon Amoy public testnet demonstration.

hero:
  name: "Creator First Platform"
  text: "A music platform governed jointly by independent creators and users"
  tagline: "Open specifications, verifiable testnet experiments, and a staged path toward creator-sustainable music services."
  actions:
    - theme: brand
      text: Read the whitepaper
      link: /en/whitepaper/
    - theme: alt
      text: Read the protocol
      link: /en/protocol/
    - theme: alt
      text: Open the testnet demo
      link: /demo/
    - theme: alt
      text: 日本語
      link: /
    - theme: alt
      text: View GitHub
      link: https://github.com/ShigeichiroYamasaki/creator-first-platform

features:
  - title: Creator-first purpose
    details: The project prioritizes sustainable creator activity and user convenience over maximising corporate profit.
    link: /en/whitepaper/01-vision
  - title: Polygon Amoy experiment
    details: Public demonstrations use chain ID 80002, Test POL and MockJPYC. They do not create production rights or monetary value.
    link: /en/whitepaper/12-infrastructure-cost
  - title: Open protocol
    details: Draft requirements, invariants, interfaces and test conditions are published for independent review.
    link: /en/protocol/
  - title: Joint governance
    details: Separate creator and user houses are designed to deliberate and approve governed protocol changes.
    link: /en/whitepaper/07-governance
---

<div class="homepage-symbol">
  <img src="/creator-first-platform-symbol.png" alt="Creator First Platform symbol" />
</div>

<div class="document-meta">

<div class="document-meta__version">Whitepaper v1.0 — English application edition</div>

<div class="document-meta__row">
  <span class="document-meta__label">First publication</span>
  <span>2026-07-27</span>
</div>

<div class="document-meta__row">
  <span class="document-meta__label">English edition</span>
  <span>2026-08-28</span>
</div>

<div class="document-meta__row">
  <span class="document-meta__label">Author</span>
  <span>Shigeichiro Yamasaki</span>
</div>

</div>

::: warning Development and public-testnet stage
This website describes a design and a partially implemented testnet demonstration. It is not a production music service, payment service, DAO, securities offering, or investment solicitation. MockJPYC is not JPYC and Test POL has no intended monetary value. Legal, financial and tax statements require professional review before production use.
:::

## What the project is

Creator First Platform (CFP) is an open design for a subscription music service that places **independent, artist-direct music creators**, their rights and sustainable activity at the centre. Users receive a convenient player, transparent service rules, discovery choices and a voice in governance.

The operating legal entity is intended to be a Japanese corporation. It would execute contracts, copyright and neighbouring-rights processes, accounting, tax, employment and regulated activities. Protocol governance does not replace statutory corporate duties.

## Public experiment and faucet purpose

The public experiment uses **Polygon Amoy (chain ID 80002)**. Approved participants register in advance; registration is not an anonymous automated faucet. The planned onboarding service verifies a participant record and wallet binding, then may top the wallet up toward a capped test balance of approximately **0.6 Test POL per person across all roles**. It may also issue MockJPYC for payment-flow testing.

Polygon's current [test-token faucet documentation](https://docs.polygon.technology/tools/gas/matic-faucet) states that the former official Polygon Faucet is no longer available and directs developers to listed third-party faucets. Accordingly, these English materials support a third-party faucet, ecosystem-support or community review request; they must not describe a submission as an application to an operating “official Polygon Faucet” unless Polygon introduces a new official programme.

The policy is designed to support only these bounded activities:

- connecting a wallet and registering a test account;
- approving MockJPYC and starting a simulated subscription;
- registering as a supporter and receiving a non-transferable test credential;
- participating in creator and user governance demonstrations; and
- submitting observable failures and usability feedback.

The distributor must enforce participant approval, one-person caps, replay protection, rate limits, an auditable transaction log and an emergency stop. Private keys and distributor authority must never be embedded in this static GitHub Pages site. Test assets do not represent production funds, refunds, rewards or future entitlements.

## Evidence and implementation status

The source, contracts, deployment manifests, protocol specifications and test code are public on [GitHub](https://github.com/ShigeichiroYamasaki/creator-first-platform). The [English protocol index](/en/protocol/) distinguishes draft requirements from deployed demonstrations. The Japanese [testnet demo](/demo/) is the current interactive interface; English user-interface coverage is still in progress.

## Document authority

The [Japanese edition](/whitepaper/) remains the detailed working document. This English edition preserves its architecture, governance, legal boundaries, risk statements and staged roadmap in a review-oriented form. If translations diverge, the discrepancy must be recorded and resolved before a production decision; neither language overrides applicable law, contracts or approved governance records.
