---
description: 音楽クリエーターとユーザの抽選代表による二院制の熟議を、プロトコル仕様と自動執行へ接続するガバナンス設計案。
---

# ADR-0001: Governance Model

**Status:** Proposed  
**Date:** 2026-07-27
**Last Updated:** 2026-08-24

## Context

Creator First Platformでは、
音楽クリエーターとユーザをプロトコルガバナンスの正統性の源泉とする。

資本保有量によるToken Votingではなく、
音楽クリエーター／ユーザコミュニティから抽選された代表による
熟議型Governanceを採用する必要がある。

## Decision

Creator First Platformは、

> 音楽クリエーター／ユーザ → 抽選議会 → 熟議 → プロトコル仕様 → スマートコントラクト → 自動執行

をプロトコルガバナンスの基本構造として採用する。

Governanceは二院制とし、

- 音楽クリエータ院議会
- ユーザ院議会

によって構成する。

ガバナンス議員はEligible Communityから
検証可能な抽選によって選出する。

各院内のProposal評価には、各議員へ同量の購入不能・譲渡不能なVoice Creditを付与するQuadratic Votingを採用する。重要変更は両院の票を合算せず、各院が独立したQuorumとApproval Thresholdを満たす必要がある。具体的なContract変更手続と実行境界はADR-0016およびGovernance プロトコル仕様で定義する。

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
- 一般音楽クリエーター／ユーザがGovernanceへ参加できる
- 熟議を制度化できる

### Negative

- 抽選代表への教育が必要
- Representative Qualityが一定しない
- Governance運営コストが必要

## Constraints

このGovernance Modelは3つの憲章に従う。

重大な憲章変更は、
音楽クリエータ院議会 / ユーザ院議会だけでは決定せず、
Community Referendumを必要とする。

## Related Documents

- Whitepaper: Vision
- Whitepaper: Governance
- Whitepaper: Roadmap
- ADR-0016: Bicameral Quadratic Governance for Contract Changes
- Protocol: Contract Change Governance
