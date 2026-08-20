# Streaming Authorization and Playback Session

**Status:** Draft
**Version:** 0.1.0
**Protocol Domain:** streaming / authorization
**Specification ID:** SPEC-STREAMING-001
**Last Updated:** 2026-08-19

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/04-platform-architecture.md`
- Whitepaper: `docs/whitepaper/09-technology.md`
- Whitepaper: `docs/whitepaper/10-security.md`
- Whitepaper: `docs/whitepaper/12-infrastructure-cost.md`
- ADR: `docs/adr/ADR-0009-navidrome-streaming-gateway.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/subscription-settlement-spec.md`
- `protocol/account/early-supporter-credential-spec.md`
- `protocol/rights/rights-registry-spec.md`
- `protocol/usage/playback-verification-spec.md`
- `protocol/conventions.md`
- `protocol/glossary.md`
- `protocol/invariants.md`

## Goal

Define the implementation-independent boundary that converts an authenticated Platform Session, active Subscription, optional bounded Credential privilege and applicable Rights State into a short-lived Playback Session, authorizes media delivery without exposing an internal Media Adapter and emits evidence that can be verified by the Usage domain.

## Scope

This specification covers:

- playback authorization inputs and deterministic reason codes;
- bounded Credential and Privilege Policy overlays that never replace Subscription or Rights;
- short-lived Playback Session creation, use, expiry and revocation;
- canonical Track identity and Media Adapter mapping;
- allowed media request and response behavior, including byte ranges;
- trust boundaries for an externalized-authentication adapter;
- concurrency, rate, territory and license-window enforcement;
- server-side delivery evidence and Usage handoff;
- dependency failure, cache freshness, audit and migration behavior.

## Out of Scope

- Account registration, authentication recovery or Wallet linking;
- payment authorization, settlement finality or Subscription activation;
- determining Rights Ownership or resolving a Rights dispute;
- defining valid-playback duration, fraud adjudication or Usage Snapshot finality;
- selecting a specific media server, CDN, cloud, programming language or framework;
- DRM guarantees or prevention of all client-side copying;
- Creator Distribution calculation or settlement.

## Actors

- **Player Client:** requests playback and consumes authorized media; its identity headers and progress claims are untrusted.
- **Session Authority:** validates the Platform Session and Account state.
- **Subscription Read Authority:** serves a versioned view of finalized Subscription entitlement.
- **Rights Read Authority:** serves the applicable versioned content availability and Rights State.
- **Playback Authorization Gateway:** evaluates policy, creates Playback Sessions and is the only public media-authorization boundary.
- **Catalog Mapping Authority:** maps canonical Track identity to a versioned Media Adapter reference.
- **Media Adapter:** provides metadata, byte-range delivery and optional transcoding behind a private boundary.
- **Playback Evidence Producer:** records authenticated server-side authorization and delivery observations.
- **Usage Verifier:** consumes evidence but independently decides Verified Usage under SPEC-USAGE-001.
- **Operator:** manages approved configuration without becoming the authority for Subscription, Rights or Usage.

## Definitions

- **Canonical Track ID:** stable Creator First identifier used across Rights, Usage and Distribution independently of a media server.
- **Media Adapter:** replaceable internal component that resolves or delivers media, such as a Navidrome adapter or a signed-CDN adapter.
- **Media Adapter Reference:** versioned private mapping from Canonical Track ID to an adapter-specific object identifier.
- **Authorization Decision:** immutable allow or deny result bound to exact inputs, policy version, reason code and decision time.
- **Playback Session:** short-lived, revocable authorization to request one approved content version under bounded delivery parameters.
- **Concurrency Lease:** time-bounded record reserving an allowed simultaneous playback slot.
- **Delivery Evidence:** authenticated server-side observation of an authorized media response, range, byte summary and timing; it does not by itself prove Verified Usage.
- **Authorization Read Model:** versioned off-chain projection of confirmed Account, Subscription and Rights inputs used to keep synchronous chain RPC outside the playback critical path.
- **Credential Privilege Snapshot:** versioned input containing an approved Credential Record, active Privilege Policy, source provenance and freshness classification as defined by SPEC-ACCOUNT-004.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Player-supplied identity, internal adapter identifier, target URL, range, territory and progress claims are untrusted.
- Authentication proves a Platform Session, not Subscription, Rights, geographic eligibility, unique humanity or valid usage.
- Subscription and Rights caches are derived views whose source version, freshness and reorganization status must be known.
- A Media Adapter performs delivery functions but cannot grant Subscription, Rights or Usage eligibility.
- Header-based adapter authentication is safe only when identity headers are sanitized and the adapter cannot be reached outside the trusted gateway path.
- Delivery Evidence may be missing, duplicated, delayed, reordered or produced by a compromised component and requires Usage verification.

## Inputs

### Playback Authorization Request

- authenticated Platform Session reference and version;
- Account ID and state version;
- Canonical Track ID and requested content version;
- Plan and active Subscription reference;
- optional Credential and Privilege claim requested by the client, treated as an untrusted selector rather than proof;
- requested format and maximum bitrate;
- trusted or policy-approved territory context;
- request time and idempotency key;
- optional device-class and accessibility context allowed by policy.

### Authorization Context

- Playback Authorization Policy version;
- Subscription Read Model version, source block and freshness status;
- approved Credential Deployment, Credential Record, Wallet Link, Privilege Policy, source version and freshness status when a privilege is required;
- content publication state and Rights Snapshot version;
- license use, territory and effective interval;
- Catalog Mapping version and Media Adapter state;
- Account restriction, concurrency and rate-limit state;
- dependency-health and emergency-suspension state.

## Outputs

- immutable Authorization Decision and reason code;
- short-lived Playback Session or denial response;
- Concurrency Lease;
- private Media Adapter Request;
- Delivery Evidence envelope and audit reference;
- revocation, expiry and dependency-failure records.

## State

### Playback Session

```text
AUTHORIZED → STARTED → ACTIVE → CLOSED
     │           │        │
     ├───────────┴────────┼→ REVOKED
     └────────────────────┴→ EXPIRED
```

- `AUTHORIZED` permits bounded media requests but does not prove delivery.
- `STARTED` records the first accepted media response.
- `ACTIVE` may cover multiple legitimate Range requests for the same bounded session.
- `CLOSED` releases the lease and records an ordinary terminal state.
- `REVOKED` prevents new delivery after an applicable invalidating event.
- `EXPIRED` prevents use after the bound expiry.

## Requirements

### MUST

- **REQ-STREAMING-001:** Every Authorization Decision MUST have a stable decision ID, policy version, trusted decision time, input-version references and allow or deny reason code.
- **REQ-STREAMING-002:** Authorization MUST validate an authenticated, unexpired and non-revoked Platform Session for the same Account as the request.
- **REQ-STREAMING-003:** Authorization MUST require an active Subscription whose Plan, effective interval and entitlement scope permit the requested playback.
- **REQ-STREAMING-004:** Authorization MUST bind the exact Subscription Read Model version, source finality reference and freshness classification used for the decision.
- **REQ-STREAMING-005:** Authorization MUST require a published Canonical Track ID and the exact content version requested.
- **REQ-STREAMING-006:** Authorization MUST bind the applicable Rights Snapshot version, use, territory, effective interval and dispute or suspension treatment.
- **REQ-STREAMING-007:** Authorization MUST reject a request outside the approved Plan, territory, license window or content state with a stable non-sensitive reason code.
- **REQ-STREAMING-008:** A successful decision MUST create a unique Playback Session bound to Account, Canonical Track ID, content version, Subscription, Plan, applicable Credential and Privilege versions, Rights Snapshot, policy version, format limits, issue time and expiry.
- **REQ-STREAMING-009:** Playback Session identifiers MUST be unguessable, time bounded, revocable and scoped so that possession alone does not authorize another Account or content version.
- **REQ-STREAMING-010:** Playback Session creation MUST be idempotent for the same authorized Account, request key and canonical request; conflicting replay MUST fail.
- **REQ-STREAMING-011:** Every media request MUST revalidate Playback Session ownership, state, expiry, bounded content and allowed delivery parameters.
- **REQ-STREAMING-012:** Concurrency and rate-limit decisions MUST use versioned policy, atomic lease behavior and auditable reason codes.
- **REQ-STREAMING-013:** Canonical Track ID MUST remain distinct from every Media Adapter Reference and file path.
- **REQ-STREAMING-014:** Catalog Mapping MUST be versioned and MUST bind Canonical Track ID, content version, adapter type, private adapter reference and activation interval.
- **REQ-STREAMING-015:** The Gateway MUST expose only approved catalog and playback operations and validate every path, method, query and forwarded header against an allowlist.
- **REQ-STREAMING-016:** The Gateway MUST remove every client-supplied trusted identity or internal-routing header before constructing an adapter request.
- **REQ-STREAMING-017:** An externalized-authentication adapter request MUST use a Gateway-derived pseudonymous identity and MUST originate only through an isolated trusted path.
- **REQ-STREAMING-018:** The Media Adapter MUST NOT be reachable through a public route that bypasses Gateway authorization.
- **REQ-STREAMING-019:** Range delivery MUST validate supported range syntax and preserve required partial-content status and headers without disclosing internal credentials or paths.
- **REQ-STREAMING-020:** Media bytes MUST be streamed with bounded buffering and backpressure; client cancellation MUST terminate or detach upstream work according to a documented resource policy.
- **REQ-STREAMING-021:** Upstream host, adapter and resource selection MUST come from approved configuration and Catalog Mapping rather than a client-supplied URL.
- **REQ-STREAMING-022:** Download, public-share, administrative and unrestricted adapter operations MUST be disabled or separately denied for subscription playback unless explicitly specified by another approved policy.
- **REQ-STREAMING-023:** Every accepted delivery response MUST produce idempotent Delivery Evidence bound to Playback Session, Authorization Decision, Canonical Track ID, content version, Rights Snapshot, range summary, byte summary, response status and trusted timestamps.
- **REQ-STREAMING-024:** Delivery Evidence MUST authenticate its producer, schema and evidence version and MUST support duplicate, delayed and reordered ingestion.
- **REQ-STREAMING-025:** Closing, revoking or expiring a Playback Session MUST release its Concurrency Lease exactly once or expose a recoverable reconciliation state.
- **REQ-STREAMING-026:** Account restriction, Wallet Link restriction, Subscription cancellation, Credential revocation or burn, Privilege suspension, Rights suspension and emergency media suspension MUST have documented cache invalidation and new-request enforcement behavior.
- **REQ-STREAMING-027:** New Playback Session creation MUST fail closed when required Account, Wallet Link, Subscription, Credential, Privilege, Rights, Catalog Mapping or policy state is unavailable, stale beyond policy or reorganization-unsafe.
- **REQ-STREAMING-028:** Any grace behavior for an already active stream MUST be explicitly versioned, bounded and auditable by reason and MUST NOT permit a new Playback Session.
- **REQ-STREAMING-029:** Authorization and Delivery Evidence records MUST be access controlled, encrypted where applicable, retained by approved schedule and redact direct personal data from routine logs.
- **REQ-STREAMING-030:** Protocol conformance MUST remain possible with a replacement Media Adapter without changing Canonical Track IDs, Rights references, Playback Session semantics or Usage evidence semantics.
- **REQ-STREAMING-047:** A Credential-derived privilege MUST require an active purpose-bound Wallet Link and a Credential Privilege Snapshot approved for the exact Account, issuer, Credential type, scope and chain context.
- **REQ-STREAMING-048:** A Credential-derived privilege MUST be evaluated only as an overlay on an active Subscription and applicable Rights State; it MUST NOT replace either prerequisite.
- **REQ-STREAMING-049:** Privilege evaluation MUST bind the exact Credential status version, Privilege Policy version, Creator or Community scope, Plan constraints, content scope, territory, activation interval and decision time.
- **REQ-STREAMING-050:** The Gateway MUST ignore client-supplied Credential authority, Contract address, Token ID, Privilege value and internal scope in favor of approved Read Model and Policy inputs.
- **REQ-STREAMING-051:** Credential revocation, burn, Wallet Link restriction or Privilege suspension MUST reject new Playback Sessions within the approved propagation bound.
- **REQ-STREAMING-052:** Delivery Evidence for a Credential-derived privilege MUST record privacy-restricted Credential and Privilege version references sufficient to reproduce the decision without publishing Wallet ownership or supporter affinity.

### MUST NOT

- **REQ-STREAMING-031:** Wallet control, token balance, payment amount or a Media Adapter user record MUST NOT by itself authorize playback.
- **REQ-STREAMING-032:** A Media Adapter, CDN, Player Client or reverse proxy MUST NOT become the authority for Subscription activation or Rights validity.
- **REQ-STREAMING-033:** Navidrome or another product-specific identifier MUST NOT be used as the canonical Rights, Usage or Distribution content identifier.
- **REQ-STREAMING-034:** A client-supplied `Remote-User`, forwarding header, internal media ID or upstream URL MUST NOT be trusted or forwarded without replacement and validation.
- **REQ-STREAMING-035:** Playback authorization or byte delivery alone MUST NOT classify an event as Verified Usage or determine payout.
- **REQ-STREAMING-036:** A dependency outage MUST NOT be treated as evidence that Subscription or Rights are active.
- **REQ-STREAMING-037:** A denied request MUST NOT reveal protected Rights evidence, another Account, internal topology, adapter credential or fraud-control detail.
- **REQ-STREAMING-038:** A Playback Session MUST NOT silently expand to another Account, Track, content version, Plan, territory, Rights Snapshot or delivery quality.
- **REQ-STREAMING-053:** SBT ownership, Credential possession or Wallet control MUST NOT authorize playback when Subscription or Rights is inactive.
- **REQ-STREAMING-054:** A Credential privilege MUST NOT expand to another issuer, Credential type, Creator or Community scope, Privilege Policy, Account or Wallet Link.
- **REQ-STREAMING-055:** Navidrome, another Media Adapter or a client-provided token Contract MUST NOT determine Credential validity or Privilege activation.

### SHOULD

- **REQ-STREAMING-039:** Implementations SHOULD keep synchronous blockchain RPC outside the playback critical path by using a reorganization-aware Authorization Read Model.
- **REQ-STREAMING-040:** Authorization SHOULD publish privacy-safe latency and denial metrics without Account, Wallet, Track-listening history or Playback Session labels.
- **REQ-STREAMING-041:** Media delivery SHOULD support direct play and bounded transcoding profiles selected by capability and Plan policy.
- **REQ-STREAMING-042:** Gateway relay SHOULD define measured scale triggers for migration to signed object or CDN delivery while preserving authorization semantics.
- **REQ-STREAMING-043:** Playback Session and Evidence schemas SHOULD use canonical serialization and collision-resistant digests where cross-system verification is required.
- **REQ-STREAMING-044:** Security review SHOULD verify network isolation, header sanitization, SSRF resistance, range handling, cancellation, resource exhaustion and credential leakage.

### MAY

- **REQ-STREAMING-045:** An implementation MAY use Navidrome as a Media Adapter when it satisfies every normative boundary in this specification.
- **REQ-STREAMING-046:** An implementation MAY use short-lived signed CDN or object-storage URLs when they remain bound to the same Playback Session and evidence rules.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-004`
- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-RIGHTS-005`
- `INV-USAGE-001`
- `INV-USAGE-003`
- `INV-DELIVERY-001`
- `INV-DELIVERY-002`
- `INV-DELIVERY-003`
- `INV-DELIVERY-004`
- `INV-DELIVERY-005`
- `INV-EVOLUTION-001`
- `INV-EVOLUTION-003`
- **SPEC-INV-STREAMING-001:** No media delivery path bypasses the applicable Gateway authorization boundary.
- **SPEC-INV-STREAMING-002:** A Playback Session never grants broader Account, content, Rights, Plan, territory, time or quality scope than its Authorization Decision.
- **SPEC-INV-STREAMING-003:** Media Adapter identity never replaces Canonical Track identity.
- **SPEC-INV-STREAMING-004:** Delivery Evidence never becomes Verified Usage without SPEC-USAGE-001 verification.
- **SPEC-INV-STREAMING-005:** A dependency failure never creates a new authorization grant.
- **SPEC-INV-STREAMING-006:** Replacement of a conforming Media Adapter does not change protocol-level Playback Session or evidence semantics.
- **SPEC-INV-STREAMING-007:** Credential-derived privilege never creates playback authorization without an active Subscription and applicable Rights State.
- **SPEC-INV-STREAMING-008:** Credential or Privilege invalidation never broadens an existing or new Playback Session.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| none | Playback Authorization Gateway | canonical request, authenticated session, active entitlement, Rights and mapping | `AUTHORIZED` | `PlaybackAuthorized` | emit stable denial; create no session or lease |
| `AUTHORIZED` | Gateway / Media Adapter | first accepted adapter response and evidence key | `STARTED` | `PlaybackStarted` | remain authorized or close with upstream reason |
| `STARTED` | Gateway | valid subsequent range or progress within bound session | `ACTIVE` | `PlaybackDeliveryObserved` | reject conflicting request without broadening scope |
| `AUTHORIZED`, `STARTED` or `ACTIVE` | Account / Subscription / Rights invalidation authority | applicable invalidating event and policy | `REVOKED` | `PlaybackSessionRevoked` | reconcile lease and preserve evidence |
| any non-terminal state | Gateway clock / expiry processor | trusted time at or after expiry | `EXPIRED` | `PlaybackSessionExpired` | reject later delivery |
| `STARTED` or `ACTIVE` | Gateway / Client | clean stop, end of content or bounded termination | `CLOSED` | `PlaybackSessionClosed` | reconcile lease idempotently |

## Interfaces

Equivalent operations MUST be available to authorized components:

```text
authorizePlayback(request)
getAuthorizationDecision(decision_id)
getPlaybackSession(session_id)
requestMedia(session_id, range, capabilities)
revokePlaybackSession(session_id, reason)
closePlaybackSession(session_id, reason)
submitDeliveryEvidence(evidence)
getCatalogMapping(track_id, content_version, mapping_version)
```

Implementations MAY expose different transport or method names, but authorization, privacy, idempotency and state semantics MUST remain equivalent.

## Error Handling

Stable categories MUST distinguish at least:

- unauthenticated, expired, revoked or Account-mismatched session;
- inactive, expired, cancelled, stale or unavailable Subscription;
- inactive, revoked, burned, scope-mismatched, stale or unavailable Credential or Privilege;
- unpublished, disputed, suspended, territory-denied or window-denied content;
- unknown Track, content version, Catalog Mapping or Media Adapter;
- Plan, format, bitrate, concurrency or rate-limit denial;
- expired, revoked, owner-mismatched or scope-mismatched Playback Session;
- invalid or unsatisfiable Range;
- upstream unavailable, timeout, cancellation or transcode exhaustion;
- conflicting idempotency replay;
- stale, reorganization-unsafe or unavailable Read Model.

Errors exposed to the Player MUST use non-sensitive categories and correlation references rather than internal topology or protected evidence.

## Idempotency and Replay Protection

- Authorization idempotency MUST bind Account, canonical request, policy version and request key.
- Playback Session use MUST bind owner, scope, state and expiry on every request.
- Delivery Evidence idempotency MUST distinguish retry from a new logical observation.
- Lease acquisition and release MUST be atomic or reconciled to an exactly-once effect.
- Revocation, expiry and close commands MUST be safe to repeat without restoring access.

## Audit Requirements

Audit records MUST cover:

- allow and deny decisions with input versions and reason codes;
- Playback Session creation, first use, range use, close, expiry and revocation;
- Concurrency Lease acquisition, renewal, release and reconciliation;
- Catalog Mapping and policy activation;
- Account, Wallet Link, Subscription, Credential, Privilege, Rights and emergency invalidation receipt;
- adapter request status, sanitized delivery summary and failure category;
- privileged configuration, network-boundary and trusted-source changes;
- Delivery Evidence acceptance, conflict and handoff to Usage.

Audit records MUST separate restricted Account-level history from privacy-safe operational metrics.

## Versioning and Migration

- Authorization Policy, Credential / Privilege binding, Playback Session schema, Catalog Mapping, adapter interface, reason taxonomy and Delivery Evidence schema MUST be independently versioned.
- Policy activation MUST define behavior for existing Playback Sessions and new requests.
- Media Adapter migration MUST preserve Canonical Track identity and define mapping overlap, rollback and evidence continuity.
- Read Model migration MUST define source checkpoint, replay, reorganization and freshness behavior.
- Historical Authorization Decisions and Delivery Evidence MUST remain interpretable for the approved audit period.

## Test Requirements

| Requirement ID | Test type | Expected result |
| --- | --- | --- |
| REQ-STREAMING-001–010 | Authorization / versioning / idempotency | Decisions bind exact inputs; only eligible requests create one scoped Playback Session |
| REQ-STREAMING-011–018 | Session / policy / network security | Every request revalidates scope; identity headers and private adapter boundary cannot be bypassed |
| REQ-STREAMING-019–025 | Range / streaming / evidence / lease | Partial delivery streams safely, records idempotent evidence and releases leases exactly once |
| REQ-STREAMING-026–030 | Invalidation / outage / privacy / portability | New grants fail closed, grace is bounded, records are protected and adapter replacement preserves semantics |
| REQ-STREAMING-031–038 | Negative / authority boundary | Wallet, adapter, client, outage and session reuse never expand authorization or create Verified Usage |
| REQ-STREAMING-047–052 | Credential privilege / end-to-end / privacy | Exact active Credential and Policy overlay an active Subscription and Rights decision, propagate invalidation and preserve restricted auditability |
| REQ-STREAMING-053–055 | Credential negative / authority boundary | Credential ownership never bypasses Subscription or Rights and no client or adapter selects Credential authority |
| REQ-STREAMING-039–044 | Conformance | Implemented SHOULD behavior is tested or deviation is documented under conventions |
| REQ-STREAMING-045–046 | Optional conformance | Navidrome or signed-CDN adapters satisfy the same authorization and evidence boundary |

Property and adversarial tests MUST include forged identity headers, direct adapter access, guessed session IDs, owner mismatch, scope widening, replay, concurrent lease races, cancellation, overlapping and invalid ranges, upstream timeout, stale and reorganized Read Models, Subscription cancellation, Credential revocation, Wallet rotation, Privilege suspension, look-alike token Contracts, Rights suspension, territory and time boundaries, mapping migration, evidence duplication and adapter credential leakage.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- An Account with an active Subscription can receive bytes only for a Track, Rights version, Plan, territory, time and quality allowed by the exact decision.
- Direct Media Adapter access and forged trusted headers fail in automated network and integration tests.
- Seek, reconnect, cancellation and multiple legitimate Range requests remain within one bounded Playback Session.
- Subscription cancellation and Rights suspension reject new sessions within the approved propagation bound.
- Credential ownership without an active Subscription and applicable Rights never creates a Playback Session.
- Eligible Early Supporter privilege unlocks only its exact Creator, content, Plan, territory, interval and quality scope.
- Credential revocation, burn, Wallet Link restriction and Privilege suspension reject new sessions within the approved propagation bound.
- Dependency outages never synthesize entitlement or Rights approval.
- Delivery Evidence is correlated with the exact Authorization Decision yet cannot alone become Verified Usage.
- A fixture can replace a Navidrome adapter with a mock signed-object adapter without changing protocol-level IDs or evidence semantics.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-STREAMING-001:** **Decision owner:** Operating Company / Product, Security and Platform Engineering; **Blocks:** first Playback Authorization Policy; **Question:** What Playback Session TTL, renewal rule, concurrency limit and active-stream grace window should the Music MVP use?
- **OQ-STREAMING-002:** **Decision owner:** Operating Company / Legal, Rights Operations and Product; **Blocks:** territory and license-window enforcement; **Question:** Which territory source, confidence rule, correction process and existing-listener treatment are approved for initial launch?
- **OQ-STREAMING-003:** **Decision owner:** Operating Company / Platform Engineering and Security; **Blocks:** Navidrome adapter implementation; **Question:** Which Navidrome version, external-authentication topology, endpoint allowlist and network isolation profile will the first adapter use?
- **OQ-STREAMING-004:** **Decision owner:** Operating Company / Privacy, Security and Trust and Safety; **Blocks:** Delivery Evidence schema; **Question:** Which range, byte, timing, session and device-class fields are necessary evidence without collecting excessive listening data?
- **OQ-STREAMING-005:** **Decision owner:** Protocol Governance / Product and Creator and User Representatives; **Blocks:** first eligible playback experience; **Question:** Which formats, bitrate ceilings, accessibility exceptions and Plan capabilities are protocol policy rather than product configuration?
- **OQ-STREAMING-006:** **Decision owner:** Operating Company / Infrastructure, Finance and Product; **Blocks:** production media scaling plan; **Question:** Which measured latency, concurrency, bandwidth and unit-cost thresholds trigger migration from Gateway relay to signed CDN delivery?
- **OQ-STREAMING-007:** **Decision owner:** Operating Company / Legal and Open Source Compliance; **Blocks:** production Navidrome use; **Question:** What deployment, modification, notice, source-offer and upgrade controls satisfy the applicable Navidrome and dependency licenses?
- **OQ-STREAMING-008:** **Decision owner:** Operating Company / Product, Rights Operations, Security and Creator Representatives; **Blocks:** Credential-derived Playback Policy; **Question:** Which Credential and Privilege fields, propagation bound, denial reasons and active-stream treatment should the Gateway apply for the first Early Supporter experience?
