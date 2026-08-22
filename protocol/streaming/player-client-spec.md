# Player Client and Gateway Interaction

**Status:** Draft
**Version:** 0.1.0
**Protocol Domain:** streaming / client
**Specification ID:** SPEC-STREAMING-002
**Last Updated:** 2026-08-22

## Related Documents

### Higher-level Sources

- Whitepaper: `docs/whitepaper/04-platform-architecture.md`
- Whitepaper: `docs/whitepaper/08-discovery-community.md`
- ADR: `docs/adr/ADR-0008-account-wallet-identity-strategy.md`
- ADR: `docs/adr/ADR-0009-navidrome-streaming-gateway.md`
- ADR: `docs/adr/ADR-0010-early-supporter-sbt-privileges.md`
- ADR: `docs/adr/ADR-0011-integrated-player-client.md`

### Related Specifications

- `protocol/account/account-lifecycle-spec.md`
- `protocol/account/wallet-linking-spec.md`
- `protocol/account/early-supporter-credential-spec.md`
- `protocol/streaming/playback-authorization-spec.md`
- `protocol/usage/playback-verification-spec.md`

## Goal

Define a safe and replaceable Player Client that integrates catalog browsing, Navidrome-backed playback, Platform Account sessions, Wallet operations, Supporter Credentials and Community capabilities without bypassing Gateway authorization or making the client authoritative for Protocol state.

## Scope

- Browser Player behavior and state;
- Gateway catalog and playback interaction;
- Playback Session lifecycle from the client perspective;
- Range playback, seek, reconnect, cancellation and media controls;
- Wallet interaction boundaries;
- general Supporter and Early Supporter presentation and consent;
- local storage, service-worker and telemetry boundaries;
- accessibility, failure states and Testnet Demo constraints.

## Out of Scope

- Navidrome administration and media ingestion;
- server-side authorization policy evaluation;
- Smart Contract implementation and upgrade governance;
- final Credential qualification or issuance authority;
- Rights verification, Verified Usage and Creator Distribution;
- DRM, offline protected downloads and production CDN design;
- final visual design system or choice of frontend framework.

## Actors

- **User:** controls playback and explicitly approves Wallet operations.
- **Player Client:** untrusted PWA or future native client using only approved Gateway APIs.
- **Platform Account Service:** authenticates the application Account and Platform Session.
- **Wallet Provider:** external or embedded signing interface controlled by the User.
- **Streaming Authorization Gateway:** authoritative public application and playback boundary.
- **Credential Service / Relayer:** processes consent, qualification and Credential transactions.
- **Media Adapter:** private replaceable delivery component such as Navidrome.
- **Usage Verification Layer:** evaluates evidence independently of client progress claims.

## Definitions

- **Player Client:** an untrusted user-facing application that presents catalog, playback, Wallet and Community capabilities without holding server or relayer authority.
- **Audio Engine:** the client abstraction controlling one browser or native media playback instance.
- **Player Operation:** play, pause, seek, queue mutation, next, previous or ordinary playback recovery.
- **Wallet Operation:** an operation requiring proof of Wallet control, message signature or transaction authorization.
- **Support Intent:** a purpose-bound, idempotent request by a User to become a supporter of one Canonical Creator scope.
- **Community Capability View:** a non-authoritative client projection of server-approved Community capabilities and their freshness.

Common terms follow `protocol/glossary.md` and `protocol/conventions.md`.

## Trust Boundaries

- Player code, local storage, browser extensions, client clocks, progress events, Wallet claims and UI state are untrusted.
- The Player can request but cannot grant Subscription, Rights, Credential, Community, playback or Governance authority.
- Navidrome and any OpenSubsonic endpoint remain behind the Gateway and are not discoverable client configuration.
- A successful Wallet signature proves only its declared purpose and does not prove that a Credential transaction finalized.
- Audio bytes and Client Playback Events are distinct from Verified Usage.
- Service workers, analytics and error-reporting systems are separate data recipients and require explicit allowlists and redaction.

## Inputs

- authenticated Platform Session reference;
- Canonical Artist, Album and Track identifiers returned by Gateway;
- server-issued Playback Session, stream URL, expiry and bounded media capabilities;
- server-issued Wallet challenge, purpose, domain, chain, nonce and expiry;
- Support Intent and Credential consent presentation supplied by approved policy;
- Credential and Community capability records with status, policy version, source and freshness;
- user media commands and browser capability information;
- client-generated idempotency keys and privacy-bounded playback observations.

## Outputs

- Gateway catalog and playback requests using canonical identifiers;
- bounded media Range requests under a Playback Session;
- explicit Playback Session close or cancellation requests;
- privacy-bounded Client Playback Events treated as claims;
- purpose-bound Wallet approvals or rejections;
- idempotent Support Intent and Credential consent requests;
- accessible UI states for pending, confirmed, denied, expired, unavailable, revoked and recoverable outcomes.

## State

### Player Playback State

```text
IDLE → AUTHORIZING → READY → PLAYING ↔ PAUSED
           │            │        │        │
           └────────────┴────────┴────────┼→ RECOVERING
                                         ├→ ENDED
                                         └→ ERROR
```

UI playback state is not Protocol authorization state. `READY`, `PLAYING` or `PAUSED` never extends the server-side Playback Session expiry or scope.

### Support Presentation State

```text
NOT_SUPPORTER → CONSENT_PENDING → SUBMITTED → CONFIRMING → ACTIVE
                       │              │             │          │
                       └──────────────┴─────────────┴──────────┼→ FAILED
                                                              ├→ REVOKED
                                                              └→ BURNED
```

General Supporter and Early Supporter are independently rendered tiers of one Supporter Credential. `SUBMITTED` or `CONFIRMING` is not `ACTIVE`, and an Early result is not final until the authoritative Contract event is finalized and indexed.

## Requirements

### MUST

- **REQ-PLAYER-001:** The Player MUST communicate with media, catalog, Account, Wallet Link, Support Intent and Credential capabilities only through approved Gateway application interfaces for the active environment.
- **REQ-PLAYER-002:** The Player MUST request playback by Canonical Track ID and MUST treat the returned Playback Session and stream URL as opaque, short-lived and content-scoped values.
- **REQ-PLAYER-003:** Before attaching a stream to the Audio Engine, the Player MUST obtain a successful current Authorization Decision represented by a Playback Session for the active Account and Track.
- **REQ-PLAYER-004:** Every stream, seek and reconnect request MUST remain bound to the same Playback Session scope until the Gateway requires a new authorization; expiry or revocation MUST return the Player to authorization rather than extend access locally.
- **REQ-PLAYER-005:** The Audio Engine MUST support play, pause, seek, end, cancellation and replacement of an active source without allowing abandoned upstream delivery to continue indefinitely.
- **REQ-PLAYER-006:** The Player MUST correctly handle approved `200` and `206 Partial Content` responses, supported byte ranges, unsatisfied ranges, transient upstream failure and content-type mismatch.
- **REQ-PLAYER-007:** The Player MUST close or cancel the applicable Playback Session on explicit stop, logout, Account change or source abandonment when the Gateway interface permits it.
- **REQ-PLAYER-008:** Ordinary Player Operations MUST use the active Platform Session and MUST NOT require a new Wallet signature or blockchain transaction.
- **REQ-PLAYER-009:** Before a Wallet Operation, the Player MUST display its purpose and all applicable relying-party domain, chain, Contract, asset, amount, Creator scope, public disclosure, nonce or expiry information in a human-reviewable form.
- **REQ-PLAYER-010:** The Player MUST distinguish Wallet connection, request submission, relayer acceptance, transaction confirmation, indexed Credential state and effective capability state.
- **REQ-PLAYER-011:** A Support Intent MUST bind Account, Canonical Creator scope, intent version, consent version and idempotency key, and the Player MUST render general Supporter and Early Supporter results independently.
- **REQ-PLAYER-012:** The Player MUST render Credential status and Community capability from a server-approved Read Model with freshness and policy version, and MUST refresh after confirmed issuance, revocation, burn, Wallet rotation or policy invalidation.
- **REQ-PLAYER-013:** Protected audio, Playback Session values, authorization responses, Wallet signatures, private keys, seed phrases and relayer credentials MUST be excluded from persistent client caches and offline storage.
- **REQ-PLAYER-014:** Client logs, analytics, crash reports and telemetry MUST redact authentication values, Playback Session values, Wallet signatures, internal topology and detailed individual listening history.
- **REQ-PLAYER-015:** Client Playback Events MUST be authenticated when submitted, idempotent, privacy bounded and explicitly treated as untrusted evidence rather than Verified Usage.
- **REQ-PLAYER-016:** Logout and Account switching MUST stop active playback, clear in-memory protected session state, close applicable sessions and prevent one Account's Credential or Community view from appearing under another Account.
- **REQ-PLAYER-017:** The Player MUST provide non-sensitive and actionable UI states for authentication, authorization, Rights, Subscription, Credential, Range, upstream, offline and unsupported-media failures.
- **REQ-PLAYER-018:** The Player MUST provide keyboard-operable playback controls, programmatic labels, visible focus, sufficient contrast and status announcements for material asynchronous Wallet, Credential and playback outcomes.
- **REQ-PLAYER-019:** The Testnet Demo MUST identify its environment, chain and test assets, and MUST distinguish MockJPYC and Test ETH from production money or a subscription price.
- **REQ-PLAYER-020:** The Testnet Demo MUST serve the PWA and Gateway API from an approved same-origin boundary unless an alternative CORS, cookie and signing-domain threat review is recorded.
- **REQ-PLAYER-039:** Before Supporter registration, the Player MUST disclose Creator, public non-transferable SBT, chain, Contract, nonce or deadline, consent version and Gas sponsor, then sign and submit only unchanged Gateway-issued typed data for the active Wallet Link.
- **REQ-PLAYER-040:** The Player MUST NOT select Early tier and MUST distinguish signature, relay, submitted, confirming, finalized general or Early tier, effective privilege, failure, revocation and burn from authoritative state.
- **REQ-PLAYER-041:** Community and Streaming privileges MUST use Gateway-issued bounded capabilities, remain distinct by general or Early tier, and fail closed when stale or inactive; metadata, images, route guards and Wallet claims MUST NOT grant authority.
- **REQ-PLAYER-042:** Supporter registration consent or signature MUST NOT combine JPYC transfer, token approval, Subscription purchase or another Wallet operation.

### MUST NOT

- **REQ-PLAYER-021:** The Player MUST NOT receive, persist or expose a Navidrome password, Navidrome session, private OpenSubsonic base URL, private Media Adapter identifier, trusted identity header or arbitrary upstream URL.
- **REQ-PLAYER-022:** The Player MUST NOT call Navidrome, OpenSubsonic, a storage object or another Media Adapter directly for protected playback.
- **REQ-PLAYER-023:** Client-visible state, route guards, hidden controls, Wallet connection, token ownership claims or a locally cached capability MUST NOT grant Subscription, Rights, Credential, Community or playback authority.
- **REQ-PLAYER-024:** A pending, submitted, relayed or unconfirmed SBT transaction MUST NOT be shown or used as an active Credential.
- **REQ-PLAYER-025:** The Player MUST NOT request a general-purpose Wallet signature when a purpose-bound challenge or authorization is required.
- **REQ-PLAYER-026:** The Player MUST NOT cache protected audio for offline replay or expose a download path unless a separately approved Rights and security specification authorizes it.
- **REQ-PLAYER-027:** The Player MUST NOT send direct personal data, detailed listening history or supporter affinity to a public blockchain, public metric label or unauthorized analytics recipient.
- **REQ-PLAYER-028:** The Player MUST NOT treat byte receipt, local progress, media completion, Navidrome play count or client scrobble as Verified Usage or payout eligibility.

### SHOULD

- **REQ-PLAYER-029:** A Browser implementation SHOULD use one standards-based audio element abstraction and Media Session integration rather than duplicating decoder or queue state across UI components.
- **REQ-PLAYER-030:** Static application assets and approved public cover art SHOULD be cacheable independently of authenticated APIs and protected media.
- **REQ-PLAYER-031:** Queue, theme, volume and explicitly saved preferences SHOULD remain usable after a UI reload without persisting protected authorization state.
- **REQ-PLAYER-032:** The Player SHOULD use stable error categories and correlation references returned by Gateway while hiding internal topology and policy evidence.
- **REQ-PLAYER-033:** Open-source code reuse SHOULD record component version, license, modifications, notices, source location, security review and replacement boundary.
- **REQ-PLAYER-034:** Testnet implementation SHOULD use a static PWA rather than an additional resident Player application server on the constrained e2-micro environment.
- **REQ-PLAYER-035:** Wallet loading and blockchain state refresh SHOULD remain outside the critical path for an already authorized ordinary Player Operation.

### MAY

- **REQ-PLAYER-036:** A Player MAY use React, Vue or another reviewed TypeScript framework when the Protocol behavior and test requirements remain equivalent.
- **REQ-PLAYER-037:** Feishin, Supersonic or another OpenSubsonic client MAY be used for local compatibility tests, UX reference or a bounded prototype, but public deployment remains subject to the Gateway and license requirements.
- **REQ-PLAYER-038:** A future native client MAY implement the same interfaces when secure storage, deep-link, background-media and platform-review controls receive a separate threat review.

## Invariants

- `INV-IDENTITY-001`
- `INV-IDENTITY-002`
- `INV-IDENTITY-004`
- `INV-PRIVACY-001`
- `INV-PRIVACY-002`
- `INV-USAGE-003`
- `INV-DELIVERY-001`
- `INV-DELIVERY-002`
- `INV-DELIVERY-003`
- `INV-DELIVERY-004`
- `INV-DELIVERY-005`
- `INV-EVOLUTION-001`
- **SPEC-INV-PLAYER-001:** No Player route, local state, Wallet state or Media Adapter detail can broaden a Gateway Authorization Decision.
- **SPEC-INV-PLAYER-002:** An ordinary Player Operation never requires a new Wallet signature or blockchain transaction.
- **SPEC-INV-PLAYER-003:** Protected audio and authorization material never become persistent offline client content.
- **SPEC-INV-PLAYER-004:** General Supporter, Early Supporter and effective Community capability states remain distinguishable and independently verifiable.
- **SPEC-INV-PLAYER-005:** Client playback observation never becomes authoritative Verified Usage.

## State Transitions

| Source | Triggering actor | Required inputs and validation | Result | Event | Failure behavior |
| --- | --- | --- | --- | --- | --- |
| `IDLE` | User / Player | Canonical Track ID and active Platform Session | `AUTHORIZING` | `PlaybackRequested` | show authentication or request error |
| `AUTHORIZING` | Gateway | scoped unexpired Playback Session | `READY` | `PlaybackPrepared` | show stable denial and create no media source |
| `READY`, `PAUSED` | User / Audio Engine | valid session and playable response | `PLAYING` | `ClientPlaybackStarted` | enter recoverable error without expanding scope |
| `PLAYING` | User / Audio Engine | pause command | `PAUSED` | `ClientPlaybackPaused` | preserve bounded session only while valid |
| `PLAYING`, `PAUSED` | User / Audio Engine | bounded seek or reconnect | same or `RECOVERING` | `ClientPlaybackRangeRequested` | request new authorization after expiry; never extend locally |
| any active playback state | User / Account Service | stop, logout, Account change or source replacement | `IDLE` | `ClientPlaybackClosed` | clear protected state and reconcile close idempotently |
| `CONFIRMING` | Credential Read Model | finalized and indexed Credential status | `ACTIVE` | `CredentialViewActivated` | remain pending or show failure; grant no capability |
| `ACTIVE` | Credential / Wallet / Policy invalidation | approved refreshed status | `REVOKED` or `BURNED` | `CredentialViewInvalidated` | remove capability and require authoritative refresh |

## Interfaces

Equivalent Gateway operations MUST be available to the Player:

```text
getCatalogHome()
searchCatalog(query)
getArtist(canonical_artist_id)
getAlbum(canonical_album_id)
getTrack(canonical_track_id)
createPlaybackSession(canonical_track_id, capabilities, idempotency_key)
requestStream(playback_session_id, range)
submitClientPlaybackEvent(event)
closePlaybackSession(playback_session_id, reason)
createWalletChallenge(purpose, chain_context)
verifyWalletApproval(challenge, signature_or_authorization)
createSupportIntent(canonical_creator_id, consent_version, idempotency_key)
submitSupportAuthorization(support_intent_id, typed_signature)
getSupportRegistrationStatus(support_intent_id)
getSupporterCredentials(account_id)
getCommunityCapabilities(account_id, creator_scope)
requestCommunityAccess(canonical_creator_id, capability_id)
```

Transport names MAY differ. Responses MUST use canonical public identifiers, stable status categories, version and freshness fields where required, and MUST NOT disclose adapter credentials or topology.

## Error Conditions

| Error ID | Condition | Required behavior |
| :--- | :--- | :--- |
| `PLAYER_SESSION_REQUIRED` | Platform Session missing or expired | stop protected playback and request authentication |
| `PLAYER_PLAYBACK_DENIED` | Gateway denies the requested content | display non-sensitive reason and create no media source |
| `PLAYER_PLAYBACK_EXPIRED` | Playback Session expired or revoked | stop delivery and request a fresh decision only after valid Account state |
| `PLAYER_RANGE_UNSATISFIABLE` | requested range is invalid or unavailable | restore a safe position or report non-sensitive failure; do not widen request |
| `PLAYER_UPSTREAM_UNAVAILABLE` | Gateway or Media Adapter unavailable | stop retry storm, preserve safe queue state and offer bounded retry |
| `PLAYER_WALLET_REJECTED` | User rejects or Wallet fails an operation | preserve Account playback where otherwise valid and grant no Wallet-derived effect |
| `PLAYER_CREDENTIAL_PENDING` | transaction is not finalized or indexed | display pending and grant no active capability |
| `PLAYER_CAPABILITY_STALE` | Credential or Community view exceeds freshness bound | hide or disable protected capability and refresh from Gateway |
| `PLAYER_PRIVILEGE_DENIED` | active Credential does not satisfy the current bounded Privilege Policy | issue no protected route, stream or community token and show a non-sensitive reason |
| `PLAYER_MEDIA_UNSUPPORTED` | Browser cannot play the approved representation | offer an allowed alternative profile or accessible error |
| `PLAYER_OFFLINE` | Gateway cannot be reached | retain only approved preferences and public static assets; do not replay protected media |

## Security Requirements

- Content Security Policy and connection allowlists MUST limit network destinations to approved origins.
- Browser storage and service-worker rules MUST be tested against accidental token and audio persistence.
- Wallet challenges MUST be purpose-bound, origin-bound, short-lived and resistant to replay according to SPEC-ACCOUNT-002.
- Player dependencies and copied OSS code MUST be pinned, scanned and covered by a documented update and license process.
- Player-generated identifiers MUST use sufficient entropy and MUST NOT be accepted as authority without server validation.
- Retry, prefetch, Range and queue behavior MUST be bounded to prevent bandwidth, transcode and session exhaustion.

## Privacy Requirements

- The Player MUST default to the minimum supporter and Wallet information required for the current operation.
- Public SBT disclosure MUST be explained before consent, including Creator scope, metadata, revocation, burn and recovery behavior.
- Listening history, Wallet affinity and Community membership MUST NOT be exposed through URLs, public analytics, referrers or public error reports.
- Accessibility announcements MUST avoid reading secret values or full Wallet signatures.

## Failure Handling

- Playback authorization denial is terminal for that request and MUST NOT fall back to direct Navidrome access.
- On transient stream failure, retry uses bounded backoff and the same valid scope; an expired session requires a new authorization.
- Account change or logout cancels playback even if the media element could continue from buffered bytes.
- Wallet or RPC failure outside a Wallet Operation does not invalidate an otherwise active Platform Session, but no new Wallet-derived capability is synthesized.
- Credential status uncertainty is fail closed for protected Community and playback capabilities.
- Unsupported browser capabilities produce an accessible error or request an allowed server-selected media representation.

## Idempotency and Replay Protection

- Playback Session creation, close, Client Playback Events and Support Intent submission MUST use operation-specific idempotency keys.
- A repeated client request MUST NOT create duplicate support records, Credential issuance or Usage evidence.
- Wallet nonce and Payment Authorization replay rules remain governed by the related Account specifications.
- Client-side retry MUST retain the original operation identity unless the Gateway explicitly requires a new request after an expired authorization.

## Audit Requirements

Server-side audit records MUST correlate privacy-restricted references for:

- Player build and Protocol compatibility version;
- Playback Session request, response category, close and client cancellation;
- Wallet Operation purpose and outcome without persisting full signatures in routine logs;
- Support Intent, consent version, Credential pending and confirmed state;
- capability refresh, stale-state denial and Account-switch clearing;
- client error category and correlation reference;
- OSS component version, license, modification and deployment artifact.

Client logs are diagnostic claims and MUST NOT replace authoritative server audit records.

## Versioning and Migration

- Gateway API, Player compatibility range, Client Playback Event, Support Intent, Credential presentation and error taxonomy MUST be independently versioned.
- A Player update MUST define cache invalidation for static assets without retaining protected responses.
- Gateway MUST reject unsupported Player Protocol versions with an actionable, non-sensitive upgrade response.
- Media Adapter replacement MUST NOT require the Player to migrate Canonical Track IDs or learn a new adapter identifier.
- Framework or OSS-client replacement MUST preserve these interfaces, invariants and test evidence.

## Test Requirements

| Requirement ID | Test type | Expected result |
| :--- | :--- | :--- |
| REQ-PLAYER-001–007 | End-to-end playback | Catalog and audio use Gateway only; playback, seek, reconnect, expiry, cancellation and partial responses remain scoped |
| REQ-PLAYER-008–012 | Wallet / supporter / credential | ordinary playback has no signature prompt; purpose is disclosed; pending, general, Early and active capability states remain distinct |
| REQ-PLAYER-013–016 | Storage / privacy / Account isolation | protected values are absent from persistence and telemetry; logout and Account switch stop and clear protected state |
| REQ-PLAYER-017–020 | UX / accessibility / Testnet | stable failures are actionable; controls and async states are accessible; environment and same-origin boundary are verifiable |
| REQ-PLAYER-021–023 | Boundary adversarial | Navidrome and internal values are absent; direct calls and client-side authority fail |
| REQ-PLAYER-024–028 | Negative credential / privacy / usage | pending SBT, broad signatures, offline protected audio, public history and client progress never create authority |
| REQ-PLAYER-029–035 | Conformance | implemented SHOULD behavior is tested or deviation is documented under conventions |
| REQ-PLAYER-036–038 | Optional conformance | chosen framework, OSS test client or future native client preserves Protocol behavior |
| REQ-PLAYER-039–042 | Supporter registration / privilege exercise | typed consent is disclosed and unchanged; Contract selects one tier; privileges use bounded Gateway capabilities; payment stays separate |

Browser and adversarial tests MUST include direct Navidrome URL attempts, injected internal IDs, forged capability state, stale Credential views, pending transactions, rejected Wallet requests, expired sessions, overlapping and invalid ranges, rapid seek and skip, logout during playback, Account switching, offline reload, service-worker cache inspection, telemetry redaction, keyboard-only use, screen-reader announcements and unsupported codecs.

## Acceptance Criteria

- Every MUST and MUST NOT requirement has implementation and passing test traceability.
- A test browser receives protected audio only through a valid Gateway Playback Session and cannot discover or reach Navidrome directly.
- Play, pause, seek, next, reconnect, expiry and cancellation operate without a Wallet prompt during ordinary playback.
- General Supporter, Early Supporter, pending Credential and effective Community capability are visibly distinct and match authoritative Read Model state.
- No protected audio, Playback Session, Wallet signature or private key remains in persistent client storage after logout or reload.
- Client observations remain untrusted inputs to Usage Verification.
- Testnet chain and assets cannot be mistaken for production payment, and Test ETH is shown only as gas when relevant.
- The e2-micro Demo serves static Player assets without adding a resident Player application server.
- Accessibility tests cover keyboard, focus, programmatic labels, contrast, reduced motion and asynchronous status announcements.
- OSS dependencies and copied code have a recorded version, license, modification and notice trail.
- No unresolved Open Question is silently decided by implementation.

## Open Questions

- **OQ-PLAYER-001:** **Decision owner:** Operating Company / Product and Frontend Engineering; **Blocks:** Player PWA implementation baseline; **Question:** Which frontend framework, browser support matrix and minimum device profile will the first Testnet Player support?
- **OQ-PLAYER-002:** **Decision owner:** Operating Company / Product, Security and Identity Engineering; **Blocks:** integrated Wallet experience; **Question:** Which external Wallet, embedded Wallet and Passkey Smart Account sequence is approved for the first Player release?
- **OQ-PLAYER-003:** **Decision owner:** Operating Company / Legal and Open Source Compliance; **Blocks:** third-party Player code reuse; **Question:** Which Feishin, Supersonic or Navidrome UI code may be copied or modified and which GPL source, notice and distribution controls are required?
- **OQ-PLAYER-004:** **Decision owner:** Operating Company / Privacy, Product and Usage Engineering; **Blocks:** Client Playback Event schema; **Question:** Which client progress, device capability and failure fields are necessary without collecting excessive listening history?
- **OQ-PLAYER-005:** **Decision owner:** Operating Company / Product, Accessibility and Rights Operations; **Blocks:** first media capability policy; **Question:** Which browser, codec, bitrate, accessibility and fallback combinations are required for the first release?
- **OQ-PLAYER-006:** **Decision owner:** Protocol Governance / Product, Creator and User Representatives; **Blocks:** first Community capability view; **Question:** Which general Supporter and Early Supporter capabilities, labels and freshness bounds should the Player present?
