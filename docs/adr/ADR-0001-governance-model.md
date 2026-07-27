# ADR-0001: Governance Model

**Status:** Proposed  
**Date:** 2026-07-27

## Context

Creator First Platformでは、
CreatorとUserをProtocol Governanceの正統性の源泉とする。

資本保有量によるToken Votingではなく、
Creator/User Communityから抽選された代表による
熟議型Governanceを採用する必要がある。

## Decision

Creator First Platformは、

> Creator/User → 抽選議会 → 熟議 → Protocol Specification → Smart Contract → 自動執行

をProtocol Governanceの基本構造として採用する。

Governanceは二院制とし、

- Creator House
- User House

によって構成する。

Governance MemberはEligible Communityから
検証可能な抽選によって選出する。

## Alternatives Considered

### Token Voting

資本保有量がGovernance支配力へ直結するため採用しない。

### Direct Democracy

すべての意思決定への全員参加は、
参加負担と熟議品質の問題がある。

### Election-based Representation

知名度、資金、組織力による代表選出への影響が大きいため、
基本方式として採用しない。

## Consequences

### Positive

- 資本によるGovernance Captureを抑制できる
- 一般Creator/UserがGovernanceへ参加できる
- 熟議を制度化できる

### Negative

- 抽選代表への教育が必要
- Representative Qualityが一定しない
- Governance運営コストが必要

## Constraints

このGovernance Modelは3つの憲章に従う。

重大な憲章変更は、
Creator House / User Houseだけでは決定せず、
Community Referendumを必要とする。

## Related Documents

- Whitepaper: Vision
- Whitepaper: Governance
- Whitepaper: Roadmap

