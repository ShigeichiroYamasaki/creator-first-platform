# Global Protocol Invariants

These invariants apply across Creator First Platform unless explicitly superseded by an approved higher-level rule.

A lower-level Protocol Specification or implementation MUST NOT override these invariants.

## Identity

- **INV-IDENTITY-001**  
  A Wallet Address MUST NOT be treated as a unique human identity.

- **INV-IDENTITY-002**  
  Account, Wallet, Legal Identity and Governance Identity MUST remain logically distinct concepts.

- **INV-IDENTITY-003**  
  Control of a Wallet MUST NOT by itself prove that its controller is a Creator, Rights Holder or Governance Eligible Person.

- **INV-IDENTITY-004**
  Control of a Wallet or possession of a Credential Token MUST NOT by itself authorize Subscription service, content Rights, monetary distribution or Protocol Governance.

## Governance

- **INV-GOVERNANCE-001**  
  Token holdings and economic assets MUST NOT directly determine Protocol Governance power.

- **INV-GOVERNANCE-002**  
  Governance Members MUST derive legitimacy from the applicable Creator or User Eligible Community.

- **INV-GOVERNANCE-003**  
  The same governance eligibility MUST NOT create more than one selection opportunity in the same sortition context.

## Privacy

- **INV-PRIVACY-001**  
  Personal information MUST NOT be stored on a public blockchain.

- **INV-PRIVACY-002**  
  Detailed individual listening history MUST NOT be publicly exposed.

- **INV-PRIVACY-003**  
  Public commitments, Proofs and Nullifiers MUST NOT unnecessarily enable cross-context identification or tracking.

## Rights

- **INV-RIGHTS-001**  
  Creator registration MUST NOT be treated as proof of Rights Ownership.

- **INV-RIGHTS-002**  
  Unverified Rights Claims MUST NOT be treated as Verified Rights.

- **INV-RIGHTS-003**  
  Disputed Rights MUST NOT be automatically distributed as if the Rights State were settled.

- **INV-RIGHTS-004**  
  Work and Recording rights MUST NOT be treated as the same rights object.

- **INV-RIGHTS-005**  
  A Rights State used for distribution MUST identify its effective version and time.

## Usage

- **INV-USAGE-001**  
  Unverified Usage MUST NOT be used for normal Creator Distribution.

- **INV-USAGE-002**  
  The same Usage Event MUST NOT be counted more than once in the same applicable calculation context.

- **INV-USAGE-003**  
  Client-reported Usage MUST NOT be accepted as authoritative without the applicable verification process.

## Media Delivery

- **INV-DELIVERY-001**
  A media delivery path MUST NOT bypass the applicable Subscription and Rights authorization boundary.

- **INV-DELIVERY-002**
  A Playback Session MUST bind the exact Account context, content version, Subscription scope, applicable Credential and Privilege versions, Rights State, policy version and expiry used to authorize it.

- **INV-DELIVERY-003**
  A Media Adapter identifier, file path or vendor-specific object identifier MUST NOT replace the Canonical Track identity used by Rights, Usage or Distribution.

- **INV-DELIVERY-004**
  Authorization, byte delivery, Media Adapter counters or client progress alone MUST NOT establish Verified Usage.

- **INV-DELIVERY-005**
  A service privilege derived from a Credential MUST NOT broaden or replace the applicable Subscription and Rights authorization boundary.

## Distribution

- **INV-DISTRIBUTION-001**  
  Distribution calculations MUST be reproducible from the same finalized inputs, Rights State and Distribution Policy version.

- **INV-DISTRIBUTION-002**  
  Platform operators MUST NOT arbitrarily remove funds from a finalized Creator Distribution Pool.

- **INV-DISTRIBUTION-003**  
  Rounding and residual allocation MUST be deterministic and auditable.

- **INV-DISTRIBUTION-004**  
  A finalized Distribution result MUST NOT be silently recalculated using a different policy or Rights State.

## Protocol Evolution

- **INV-EVOLUTION-001**  
  Important Protocol behavior changes MUST be traceable to an accepted Governance Decision, ADR or approved Specification change.

- **INV-EVOLUTION-002**  
  Historical Protocol Specifications, policy versions and verification rules used for finalized operations MUST remain auditable.

- **INV-EVOLUTION-003**  
  A lower-level Protocol Specification or implementation MUST NOT override a higher-level normative requirement.
