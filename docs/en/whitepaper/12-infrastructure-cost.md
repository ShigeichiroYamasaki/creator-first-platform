---
description: Testnet infrastructure, Polygon Amoy funding controls, streaming service levels, capacity and production cost gates.
---

# 12. Infrastructure, Demonstration and Cost

## User experience and service levels

Infrastructure requirements begin with playback startup, continuity and account recovery rather than blockchain throughput alone. The production design measures p95 and p99 latency, error rate, media start time, cache efficiency, event backlog, proof delay and settlement completion.

Audio delivery uses object storage and CDN or an equivalent media stack; events flow through an authenticated API, queue, validation pipeline and aggregate store. Individual plays are not sent directly on-chain. Batch commitments and claim-based distribution control cost.

## Public-testnet environment

Polygon Amoy, chain ID **80002**, is the sole public CFP testnet. Test POL pays network fees and MockJPYC simulates a settlement asset. Neither has an intended production value. RPC, explorer and faucet services are external dependencies and may impose their own rate, eligibility and availability limits.

Polygon's [current faucet documentation](https://docs.polygon.technology/tools/gas/matic-faucet) says that its former official faucet is no longer available and lists third-party services instead. Any support request must identify the actual provider and must not imply Polygon approval.

### Controlled participant funding

The public experiment is invitation or pre-registration based. It is not an open anonymous faucet. After approval and wallet-binding proof, an off-chain distributor may top a participant up toward approximately **0.6 Test POL**, counted once per person across user and creator roles. A person who already has enough Test POL receives no additional amount.

Required controls are:

- participant approval and purpose limitation;
- EIP-712 wallet-binding proof and nonce expiry;
- one-person and one-wallet accounting with duplicate review;
- target-balance top-up, global budget, velocity and daily caps;
- transaction, decision and failure logs;
- separation of hot-wallet authority from the static website;
- monitoring, low-balance alerts and an emergency stop; and
- a published statement that test assets create no refund, reward or future entitlement.

A 20-person experiment therefore needs at most about 12 Test POL under the nominal cap; 50 people need at most about 30 Test POL, before allowing for retries and operator transactions. The actual request should use measured median gas and a safety margin rather than assuming every participant consumes the full cap.

## Cost gates

Free tiers can support development presentations, but not a reliable public service. Before expansion the project measures media egress, storage, RPC calls, relayer gas, logs, database growth, support time and abuse losses. Production requires a capacity plan, vendor exit plan, backups, observability, incident staffing and a funded reserve.
