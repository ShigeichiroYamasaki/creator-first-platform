# Protocol Glossary

## Participant

A natural person or legal entity that interacts with Creator First Platform in one or more roles.

## Person

A natural person.

A Person MUST NOT be identified solely by a Wallet Address.

## Legal Entity

An organization recognized as a legal or contractual entity under an applicable jurisdiction.

## Account

A persistent application-level identity used to access Creator First Platform services.

An Account is not equivalent to a Wallet, Person or Legal Identity.

## Wallet

A cryptographic control interface capable of signing messages or authorizing blockchain asset operations.

A Wallet may be implemented as an externally owned account, smart account or another approved mechanism.

Wallet ≠ Person.

## Wallet Link

A versioned relationship between an Account and a Wallet for explicitly approved purposes and chain contexts.

A Wallet Link records Proof of Wallet Control for a specific operation. It does not establish Person, Legal Identity, Creator status, Rights Ownership or Governance eligibility.

## Wallet Link Challenge

A short-lived, single-use authorization request bound to an Account operation, Wallet, chain, relying-party domain, purpose, nonce and validity period.

## Link Purpose

An explicit permission category assigned to a Wallet Link, such as payment, distribution, governance or login. One Link Purpose MUST NOT silently authorize another.

## Legal Identity

Identity information used when legal, contractual, tax or regulatory verification is required.

Legal Identity MUST remain logically distinct from Account and Wallet.

## Governance Identity

The identity and eligibility context used for governance participation.

Governance Identity MUST NOT be derived solely from Wallet ownership, token holdings or economic power.

## Credential

A verifiable assertion issued by an authorized issuer concerning an Account, Participant, role, qualification or eligibility condition.

A Credential MUST have a defined issuer, type, version, status and lifecycle.

## User

A Participant who uses Creator First Platform services.

## Governance Eligible User

A User who satisfies the requirements for participation in User House sortition.

## Eligible Community

The finalized set of Participants eligible for a specified governance selection process.

## Governance Member

A temporary representative selected from an Eligible Community to participate in deliberative governance.

## Creator House

The temporary deliberative governance body composed of representatives selected from the eligible Creator community.

## User House

The temporary deliberative governance body composed of representatives selected from the eligible User community.

## Creator

A Participant substantially involved in the creation or production of Content distributed through the platform.

## Rights Holder

A Person or Legal Entity that legally or contractually holds rights associated with Content.

Creator and Rights Holder are not necessarily the same Participant.

## Content

A generic protocol-level reference to material distributed or managed through the platform.

A domain specification MUST identify whether Content refers to a Work, Recording or another content type.

## Work

An underlying creative work, such as a musical composition.

## Recording

A particular recorded performance or production associated with a Work.

Work and Recording are logically distinct rights objects.

## Rights Claim

A claim that a Participant owns or controls a specified right.

## Verified Rights

Rights information that has passed the applicable verification process.

## Rights Ownership

A verified legal or contractual relationship between a Rights Holder and a specified right.

Creator registration MUST NOT be treated as Rights Ownership.

## Usage Event

A recorded event representing Content usage observed by the platform.

## Verified Usage

Usage that has passed the applicable verification rules and may be used for distribution calculations.

## Usage Snapshot

A finalized set or aggregate of Verified Usage for a defined Distribution Period.

## Distribution Period

A defined time period for which revenue, Usage, Rights State and Distribution Policy are evaluated.

## Distribution Pool

A defined amount of revenue allocated for distribution under a specified Distribution Period and Distribution Policy.

## Creator Distribution

A reproducible allocation of a finalized Distribution Pool to eligible Creators or Rights Holders.

## Distribution Policy

A versioned set of rules used to calculate Creator Distribution.

## Rights State

The versioned state of applicable Verified Rights, claims, disputes and distribution instructions at a defined effective time.

## Finalized State

Protocol state that has completed the applicable verification, challenge and finalization process.

## Approved Settlement Asset

An exact versioned asset deployment authorized by the applicable Protocol Specification and approval process for a defined scope and Activation Window.

An Approved Settlement Asset MUST NOT be identified by symbol, display name or brand alone.

## Asset Entry

An immutable versioned record containing the technical identity, approval state, evidence references, scope and Activation Window of a settlement asset.

## Activation Window

The half-open UTC interval during which a versioned approval is effective for new operations.

## Consumer Snapshot

The exact registry and Asset Entry versions bound to a consuming operation so that the operation remains reproducible after later registry changes.

## Commitment

A cryptographic value binding an implementation to data or state without necessarily revealing that data or state.

## Proof

Cryptographic or procedural evidence that a defined statement or transition satisfies specified verification rules.

## Nullifier

A context-specific value used to prevent repeated use of the same eligible Credential or private input.

A Nullifier MUST NOT be reused as a cross-context tracking identifier.

## Protocol Specification

A normative document defining implementation requirements.

## ADR

Architecture Decision Record.

An ADR explains why an important design decision was made.
