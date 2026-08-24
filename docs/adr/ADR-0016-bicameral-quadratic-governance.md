---
description: 二院制議会の独立承認、本人単位のクアドラティック投票、実行ManifestとTimelockをコントラクト変更へ接続する判断。
---

# ADR-0016: Bicameral Quadratic Governance for Contract Changes

**Status:** Proposed  
**Date:** 2026-08-24  
**Last Updated:** 2026-08-24

## Context

ADR-0001はCreator HouseとUser Houseによる二院制、ADR-0002は代表者の検証可能な抽選を採用した。しかし、Smart Contractの仕様変更について、提案の固定、各院内の投票、両院承認、実装照合、Upgrade権限への接続が未定義だった。

単純なToken Votingは資本支配を招き、一人一票だけでは複数提案に対する意思の強さを表現しにくい。また、説明文だけを承認し、異なるcalldataを実行できる構成はGovernanceの正統性を失わせる。

## Decision

Smart Contract仕様変更には、次を一体として採用する。

1. Creator HouseとUser Houseの会期別Membership snapshot
2. 各議員へ同量・譲渡不能・購入不能・期限付きVoice Creditを付与するQuadratic Voting
3. 両院ごとのQuorum、Approval Thresholdおよび独立承認
4. Specification hash、Target、calldata、Code hash、Chain IDを固定するExecution Manifest
5. 独立Review、再現可能な実装照合、Risk Class別Timelock
6. TimelockだけがUpgradeまたはPolicy activationを実行できる権限分離

Quadratic Votingの費用は$v^2$とし、資金支出ではなく各会期のVoice Credit消費として計算する。JPYC、株式、STO、SBT、再生数または収益額でCreditを追加できない。

通常の重要変更は両院がそれぞれ成立要件を満たす必要がある。票を両院間で合算せず、一方の大差による承認でも他方の否決を上書きしない。

## Decision boundaries

- QVは抽選議員による会期内の提案評価に用いる。抽選自体のWeightには用いない。
- Supporter SBTはGovernance IdentityまたはVoting Powerを付与しない。
- 具体的なVoice Credit、Quorum、Approval Threshold、議席数、投票秘密方式はProtocol Governanceの未決事項とする。
- P3 Constitutional変更には両院特別多数に加え、Creator/User Referendumを要求する。
- 株式会社の法的義務はGovernanceで上書きしない。執行不能時は理由付き差し戻しとし、代替実行を禁止する。
- Emergency権限はPauseまたはTimelock中のcancelに限定し、任意Upgradeを認めない。

## Contract boundary

責任をProposal Registry、House Membership Registry、Quadratic Voting Round、Bicameral Governor、Execution Manifest、Timelock Controllerに分離する。UUPS ProxyのUpgrade権限は段階的にTimelockへ移管する。

投票開始後のTarget、Value、calldata、Specification hash、Code hashまたはRule Version変更は、元提案を無効化して新しい審議を必要とする。

## Alternatives Considered

### Token-weighted voting

経済力をProtocol Governanceへ直結させ、Global Invariantに反するため採用しない。

### One-member one-vote only

単純である一方、複数提案間の優先度と意思の強さを有限予算で表現できないため、初期の唯一方式にはしない。QVの監査可能性や使いやすさが不足する場合のFallback候補として残す。

### Community-wide QV for every change

参加疲れ、Sybil耐性、法務・技術資料の理解負担が大きいため、通常変更では採用しない。重大変更のReferendumは別Ruleで扱う。

### Off-chain result plus administrator execution

迅速だが、承認内容と実行Transactionの置換を技術的に防げないため、本番の最終形として採用しない。

## Consequences

### Positive

- CreatorとUserの双方が独立した拒否・承認能力を持つ
- 資本ではなく本人単位の有限Creditで意思の強さを表現できる
- Proposal、Specification、Code、Transaction、Deploymentを追跡できる
- Upgrade keyの単独支配とGovernance bypassを抑制できる

### Negative

- Identity、抽選、Credit、Commit-Reveal、異議申立ての運用が複雑になる
- 両院合意に時間がかかり、Deadlock解消手続が必要になる
- QVはCollusion、Bribery、Credit代理行使を完全には防がない
- On-chain秘密投票と検証可能性の両立には追加技術が必要になる

## Validation Gates

- 同一Governance Identityが同一会期・同一院でCreditを重複取得できない
- $\sum v^2$がCredit budgetを超える投票を拒否する
- 両院のうち一院だけが承認してもExecutionへ進まない
- 投票開始後にManifestが変わると実行できない
- Timelock以外がUpgradeまたはPolicy activationを実行できない
- Emergency Guardianが任意Upgradeまたは資金移動を実行できない
- 投票、集計、Review、Timelock、Executionを第三者が再検証できる

## Related Documents

- `docs/whitepaper/07-governance.md`
- `docs/governance/index.md`
- `docs/adr/ADR-0001-governance-model.md`
- `docs/adr/ADR-0002-verifiable-sortition.md`
- `protocol/governance/contract-change-governance-spec.md`
- `protocol/invariants.md`
