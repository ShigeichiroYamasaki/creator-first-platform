---
layout: home

hero:
  name: "Creator First Platform"
  text: "Creator と User が共同で統治する音楽プラットフォーム"
  tagline: "Creator/User → 抽選議会 → 熟議 → Protocol Specification → Smart Contract → 自動執行"
  actions:
    - theme: brand
      text: Whitepaper を読む
      link: /whitepaper/01-vision
    - theme: alt
      text: CFP 一覧を見る
      link: /proposals/
    - theme: alt
      text: Governance を見る
      link: /whitepaper/07-governance

features:
  - title: Whitepaper
    details: Creator First Platform の理念、権利、経済、技術、ガバナンス、法務、セキュリティ、インフラ、ロードマップをまとめた基本文書です。
    link: /whitepaper/01-vision

  - title: Creator First Proposal
    details: Creator と User が Platform の制度や Protocol の変更・拡張を提案し、議論と熟議につなげる公開提案制度です。
    link: /proposals/

  - title: Governance
    details: Creator House と User House を抽選代表によって構成し、熟議を経て Protocol Specification を形成する統治モデルです。
    link: /whitepaper/07-governance

  - title: Creator Economy
    details: 再生実績、権利、Growth Pool、Community Support を組み合わせ、Creator の持続可能な活動を支える経済モデルです。
    link: /whitepaper/06-economics

  - title: Verifiable Platform
    details: Usage Oracle、Commitment、Zero-Knowledge Proof を用いて、重要な分配計算を第三者が検証可能にする構造を目指します。
    link: /whitepaper/09-technology

  - title: Roadmap
    details: Music MVP から Creator Economy、Governance Pilot、Protocol Governance、STO、国際展開までを Stage-Gate 方式で進めます。
    link: /whitepaper/13-roadmap
---

# Creator First Platform

Creator First Platform は、音楽を中心とするデジタルコンテンツの流通において、  
**Creator の権利と持続可能な活動、User の自由で豊かな利用体験、公正で検証可能なエコシステム**を中心に据えるプラットフォームです。

従来のプラットフォームでは、推薦、収益分配、利用条件、データ利用などの重要なルールを運営企業が内部で決定することが一般的です。

Creator First Platform は、この関係を再設計します。

```mermaid
flowchart LR
    CREATOR[Creator]
    USER[User]
    PLATFORM[Creator First Platform]

    CREATOR --> PLATFORM
    USER --> PLATFORM

    PLATFORM --> CREATOR
    PLATFORM --> USER
```

Platform は Creator と User の上位に立つ主体ではなく、  
**両者が価値を創り、利用し、ルール形成に参加するための制度・技術基盤**として位置付けます。

---

## Creator / User が Protocol を統治する

Creator First Platform の Governance は、単純な Token Voting ではありません。

基本構造は、

> **Creator/User → 抽選議会 → 熟議 → Protocol Specification → Smart Contract → 自動執行**

です。

```mermaid
flowchart LR
    CU[Creator / User]
    ELIGIBLE[Eligible Community]
    SORT[Verifiable Sortition]
    HOUSE[Creator House / User House]
    DELIB[Deliberation]
    SPEC[Protocol Specification]
    CODE[Verified Smart Contract]
    EXEC[Automatic Execution]

    CU --> ELIGIBLE --> SORT --> HOUSE --> DELIB --> SPEC --> CODE --> EXEC
```

Creator House と User House は、Creator / User Community から抽選された一時的な代表によって構成されます。

議会は主権者そのものではなく、Creator / User から一定期間だけ統治機能を委ねられた **熟議機関**です。

3つの憲章の変更など、Platform の根本原則に関わる重大事項では、Creator / User Community 全体による Referendum を想定します。

---

## Whitepaper

Whitepaper は、Creator First Platform の現時点における基本設計をまとめた文書です。

主なテーマは、

- Vision
- 市場と課題
- 権利と資金
- Platform Architecture
- Creator Onboarding
- Economic Model
- Governance
- Discovery & Community
- Technology
- Security
- Legal / STO / Tax
- Infrastructure & Cost
- Roadmap

です。

[Whitepaper を読む →](/whitepaper/01-vision)

---

# Creator First Proposals

**Creator First Proposal（CFP）** は、Creator First Platform の制度、経済モデル、技術、Governance、Protocol などについて、変更や新しい仕組みを提案するための公開提案制度です。

Whitepaper が、

> **現時点で合意されている Platform の基本設計**

を表すのに対して、CFP は、

> **その設計を変更・拡張するための提案**

を表します。

```mermaid
flowchart LR
    CU[Creator / User]
    CFP[CFP Proposal]
    DISCUSS[Public Discussion]
    PARL[Creator House / User House]
    DELIB[Deliberation]
    SPEC[Protocol Specification]
    CODE[Implementation]

    CU --> CFP --> DISCUSS --> PARL --> DELIB --> SPEC --> CODE
```

---

## CFP で提案できること

CFP の対象には、例えば次のようなものがあります。

- Creator への分配ルール
- Creator House / User House の制度
- 抽選代表の選出方法
- Discovery の基本原則
- Growth Pool
- Rights Registry
- Privacy
- Usage Oracle
- Protocol Parameters
- Smart Contract 仕様
- Treasury
- Governance 制度
- 3つの憲章に関係する提案

CFP は単なる開発 Issue ではありません。

---

## CFP と開発 Issue の違い

```mermaid
flowchart TD
    CFP[CFP]
    DECISION[Governance Decision]
    SPEC[Protocol Specification]
    ISSUE[GitHub Issue]
    PR[Pull Request]
    CODE[Code]

    CFP --> DECISION --> SPEC --> ISSUE --> PR --> CODE
```

CFP は、

> **Platform のルールをどうするか**

を議論する文書です。

GitHub Issue は、

> **承認された仕様を実装するために、何を作業するか**

を管理するためのものです。

---

## CFP のライフサイクル

```mermaid
flowchart LR
    DRAFT[Draft]
    DISCUSSION[Discussion]
    DELIBERATION[Deliberation]
    DECISION[Accepted / Rejected]
    SPEC[Protocol Specification]
    IMPLEMENT[Implementation]
    DONE[Implemented]

    DRAFT --> DISCUSSION --> DELIBERATION --> DECISION
    DECISION -->|Accepted| SPEC --> IMPLEMENT --> DONE
```

想定する Status は、

- Draft
- Discussion
- Deliberation
- Accepted
- Rejected
- Implemented
- Withdrawn

です。

---

## CFP 一覧

現在の CFP は、CFP 一覧ページから確認できます。

[CFP 一覧を見る →](/proposals/)

将来的には、各 CFP について、

- Proposal
- Discussion
- Deliberation
- Decision
- Protocol Specification
- GitHub Issue
- Pull Request
- Release

までを追跡できるようにします。

---

## Platform の3つの入口

```mermaid
flowchart TD
    TOP[Creator First Platform]

    TOP --> WP[Whitepaper]
    TOP --> CFP[CFP]
    TOP --> GOV[Governance]

    WP --> CURRENT[現在の基本設計]
    CFP --> CHANGE[変更・拡張の提案]
    GOV --> DECISION[正統な意思決定]
```

### Whitepaper

現在の Platform がどのような理念・制度・技術で設計されているかを説明します。

### CFP

Platform をどう変更・発展させるかを提案します。

### Governance

Creator / User が、抽選代表と熟議を通じて CFP を Protocol Rule へ変換します。

---

## 目指すもの

Creator First Platform が目指すのは、

> Creator が Platform に従属する世界でも、User が単なる利用データとして扱われる世界でもありません。

Creator と User が Platform の構成主体となり、

- 価値を創る
- 音楽を利用する
- 新しい Creator を発見する
- Creator を支援する
- Platform のルール形成に参加する

ことができる環境を作ります。

```mermaid
flowchart LR
    CREATE[Create]
    DISCOVER[Discover]
    LISTEN[Listen]
    SUPPORT[Support]
    GOVERN[Govern]
    CREATE2[Create Again]

    CREATE --> DISCOVER --> LISTEN --> SUPPORT --> GOVERN --> CREATE2
```

株式会社は現実社会で法的責任を負い、  
Creator / User は Protocol Governance の正統性を生み、  
Smart Contract は承認されたルールを透明かつ検証可能に執行します。

**Creator First Platform は、音楽を出発点として、企業・Creator・User・Code の関係を再設計するプロジェクトです。**
