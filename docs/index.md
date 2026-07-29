---
layout: home

hero:
  name: "Creator First Platform"
  text: "Creator と User が共同で統治する音楽プラットフォーム"
  actions:
    - theme: brand
      text: Whitepaper を読む
      link: /whitepaper/01-vision
    - theme: alt
      text: CFP 一覧を見る
      link: /proposals/
    - theme: alt
      text: ADR 一覧を見る
      link: /adr/

features:
  - title: Whitepaper
    details: Creator First Platform の理念、権利、経済、技術、ガバナンス、法務、セキュリティ、インフラ、ロードマップをまとめた基本文書です。
    link: /whitepaper/01-vision
  - title: Creator First Proposal
    details: Creator と User が Platform の制度や Protocol の変更・拡張を提案し、議論と熟議につなげる公開提案制度です。
    link: /proposals/
  - title: 設計決定
    details: ADR（Architecture Decision Record）として、重要な設計判断、その理由、代替案、影響を記録し、Protocol Specification と実装へ接続します。
    link: /adr/
  - title: Governance
    details: Creator House と User House を抽選代表によって構成し、熟議を経て Protocol Specification を形成する統治モデルです。
    link: /whitepaper/07-governance
---

<div class="homepage-symbol">
  <img src="/creator-first-platform-symbol.png" alt="Creator First Platform symbol" />
</div>

<div class="document-meta">

<div class="document-meta__version">Whitepaper v1.0</div>

<div class="document-meta__row">
  <span class="document-meta__label">Publication Date</span>
  <span>2026-07-27</span>
</div>

<div class="document-meta__row">
  <span class="document-meta__label">Author</span>
  <span>山崎重一郎 (Shigeichiro Yamasaki)</span>
</div>

</div>

# Creator First Platform

Creator First Platform は、音楽を中心とするデジタルコンテンツの流通において、  
**Creator の権利と持続可能な活動、User の自由で豊かな利用体験、公正で検証可能なエコシステム**を中心に据えるプラットフォームです。

---

## Creator / User が Protocol を統治する

Creator First Platform の Governance は、単純な Token Voting ではありません。

> **Creator/User → 抽選議会 → 熟議 → Protocol Specification → Smart Contract → 自動執行**

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

---

## Whitepaper

Whitepaper は、Creator First Platform の現時点における基本設計をまとめた文書です。

[Whitepaper を読む →](/whitepaper/01-vision)

---

# Creator First Proposals

**Creator First Proposal（CFP）** は、Creator First Platform の制度、経済モデル、技術、Governance、Protocol などについて、変更や新しい仕組みを提案するための公開提案制度です。

[CFP 一覧を見る →](/proposals/)

---

# 設計決定 — Architecture Decision Records

ADR（Architecture Decision Record）は、Creator First Platform における重要な技術・制度設計について、

- どの設計を採用したか
- なぜその設計を選んだか
- どの代替案を検討したか
- どのような影響や制約があるか

を記録するための文書です。

```mermaid
flowchart LR
    WP[Whitepaper]
    CFP[CFP]
    GOV[Governance Decision]
    ADR[ADR]
    SPEC[Protocol Specification]
    ISSUE[GitHub Issue]
    CODE[Implementation]

    WP --> CFP --> GOV --> ADR --> SPEC --> ISSUE --> CODE
```

[設計決定を見る →](/adr/)

---

## Platform の4つの入口

```mermaid
flowchart TD
    TOP[Creator First Platform]

    TOP --> WP[Whitepaper]
    TOP --> CFP[CFP]
    TOP --> ADR[設計決定 / ADR]
    TOP --> GOV[Governance]

    WP --> CURRENT[現在の基本設計]
    CFP --> CHANGE[変更・拡張の提案]
    ADR --> DESIGN[採用した設計と理由]
    GOV --> DECISION[正統な意思決定]
```

### Whitepaper

**何を目指すか、Platform はどのような原則で設計されるか**を説明します。

### CFP

**何を変更・拡張したいか**を提案します。

### Governance

**どの提案を採用するか**を Creator / User の正統なプロセスで決定します。

### ADR

**なぜその設計を採用したのか**を記録し、Protocol Specification と実装へ接続します。

---

## Whitepaper から実装まで

```mermaid
flowchart TD
    VISION[Vision]
    WP[Whitepaper]
    CFP[CFP]
    GOV[Governance Decision]
    ADR[ADR]
    SPEC[Protocol Specification]
    ISSUE[GitHub Issue]
    AI[AI Agent]
    CODE[Code + Tests]
    PR[Pull Request]
    RELEASE[Release]

    VISION --> WP --> CFP --> GOV --> ADR --> SPEC --> ISSUE --> AI --> CODE --> PR --> RELEASE
```

---

## 目指すもの

Creator と User が Platform の構成主体となり、

- 価値を創る
- 音楽を利用する
- 新しい Creator を発見する
- Creator を支援する
- Platform のルール形成に参加する

ことができる環境を作ります。

**Creator First Platform は、音楽を出発点として、企業・Creator・User・Code の関係を再設計するプロジェクトです。**

<div class="site-copyright">
  © 2026 Creator First Platform
</div>
