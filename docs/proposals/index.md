---
description: 制度、経済、技術、ガバナンス、Protocolの変更や拡張を提案・議論する音楽クリエーター中心提案制度。
---

# 音楽クリエーター中心提案s

音楽クリエーター中心提案（CFP）は、Creator First Platform の制度、経済モデル、技術、Governance、Protocol などについて、変更や新しい仕組みを提案するための公開提案制度です。

Whitepaper が、

> **現時点で合意されている Platform の基本設計**

を表すのに対し、CFP は、

> **その設計を変更・拡張するための提案**

を表します。

## CFP Process

```mermaid
flowchart LR
    CU[音楽クリエーター／ユーザ]
    CFP[CFP Proposal]
    DISCUSS[Discussion]
    PARL[音楽クリエータ院議会 / ユーザ院議会]
    DELIB[Deliberation]
    SPEC[プロトコル仕様]
    CODE[Implementation]

    CU --> CFP --> DISCUSS --> PARL --> DELIB --> SPEC --> CODE
```

CFPは単なる開発Issueではありません。

```mermaid
flowchart TD
    CFP[CFP]
    DECISION[ガバナンス決定]
    SPEC[プロトコル仕様]
    ISSUE[GitHub Issue]
    PR[Pull Request]
    CODE[Code]

    CFP --> DECISION --> SPEC --> ISSUE --> PR --> CODE
```

CFPは「Platformのルールをどうするか」を議論し、GitHub Issueは「承認された仕様をどう実装するか」を管理します。

## Status

CFPでは、次のStatusを使用します。

| Status | 意味 |
| --- | --- |
| Draft | 提案作成中 |
| Discussion | 公開議論中 |
| Deliberation | Governanceによる熟議中 |
| Accepted | 採択 |
| Rejected | 否決 |
| Implemented | 実装済み |
| Withdrawn | 提案者による撤回 |

## CFP一覧

現時点ではCFP制度そのものを整備している段階です。

| CFP | Title | Status |
| --- | --- | --- |
| CFP-0001 | 音楽クリエーター中心提案 Process | Draft |

今後、抽選議会、音楽クリエータ院議会 / ユーザ院議会、Economic Model、Rights Registry、Usage Oracleなどの変更提案をCFPとして記録します。

## CFPの基本原則

CFPは次の原則に従います。

- 音楽クリエーターとユーザが提案できる開かれた制度であること
- 提案、議論、決定理由を追跡できること
- 3つの憲章と整合すること
- 重要な変更は音楽クリエータ院議会 / ユーザ院議会による熟議を経ること
- 採択された内容をプロトコル仕様へ変換すること
- Specificationと実装Codeを追跡可能にすること

## Whitepaperとの関係

```mermaid
flowchart LR
    WP[Whitepaper]
    CFP[CFP]
    GOV[Governance]
    SPEC[プロトコル仕様]
    IMPL[Implementation]

    WP --> CFP --> GOV --> SPEC --> IMPL
```

Whitepaperは現在の設計を記述し、CFPはその設計を変更する提案を記録します。

採択されたCFPによってWhitepaperやプロトコル仕様が更新される場合、その変更履歴をVersion管理します。

## Governanceとの関係

将来的には、

> **音楽クリエーター／ユーザ → CFP → 抽選議会 → 熟議 → プロトコル仕様 → スマートコントラクト → 自動執行**

という流れを形成します。

重大な憲章変更などについては、抽選議会の承認だけでなく、音楽クリエーター／ユーザコミュニティ全体によるReferendumを必要とする制度を想定しています。
