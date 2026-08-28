---
description: Threat model, identity and wallet security, media protection, contract controls, privacy and incident recovery.
---

# 10. Security

## Security model

The design applies least privilege, defence in depth, separation of duties, privacy by design, verifiability and recoverability. Threats include account takeover, wallet phishing, creator impersonation, rights fraud, destination-address substitution, media leakage, replayed usage events, Sybil participation, oracle manipulation, contract upgrade abuse and operational compromise.

## Identity and wallet binding

Passkeys authenticate a platform account. Wallet control is proven separately with a domain-bound, nonce-based EIP-712 signature. A future JPKI flow would require an authorised platform provider or account-trust service; the free public demo uses a clearly labelled mock and provides no official identity assurance. Account recovery must not silently transfer assets or credentials.

## Service boundaries

The streaming gateway validates identity, entitlement, rights state and session lifetime. Navidrome and object storage are not directly trusted by the browser. Administrative APIs use strong authentication, network restriction, audit logs and dual control for high-impact actions.

Contract administration uses multisignature or role-separated accounts, timelocks, pause capability and published deployment manifests. Secrets never reside in the GitHub Pages bundle. RPC endpoints are treated as untrusted availability dependencies and are monitored or diversified.

## Detection and response

Fraud detection produces reviewable signals, not unappealable judgments. Incidents follow detect, contain, preserve evidence, notify, recover and retrospectively review. Production launch requires threat modelling, independent contract audit, dependency review, key-management rehearsal, backup restoration tests and a documented vulnerability process.
