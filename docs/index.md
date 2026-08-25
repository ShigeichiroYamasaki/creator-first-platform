---
layout: home
description: 音楽クリエーターとユーザの共同統治、権利管理、検証可能な分配を設計する音楽クリエーターファースト音楽プラットフォーム構想。

hero:
  name: "Creator First Platform"
  text: "音楽クリエーターとユーザが共同で統治する音楽プラットフォーム"
  actions:
    - theme: brand
      text: テストネットデモを開く
      link: /demo/
    - theme: alt
      text: ホワイトペーパーを読む
      link: /whitepaper/01-vision
    - theme: alt
      text: CFP 一覧を見る
      link: /proposals/
    - theme: alt
      text: ADR一覧を見る
      link: /adr/
    - theme: alt
      text: スマートコントラクト仕様を見る
      link: /protocol/
    - theme: alt
      text: GitHubを見る
      link: https://github.com/ShigeichiroYamasaki/creator-first-platform

features:
  - title: テストネットデモ
    details: 本番実装の前に、金銭的価値を持たないテストネットと合成データで再生・決済・権利・利用証跡・分配の最小縦断実装を検証します。
    link: /demo/

  - title: 音楽クリエータ院議会デモ
    details: Sepolia上の音楽クリエータ院議会で、CFP、議員資格、院別集計、投票クレジットと承認投票を確認します。
    link: /demo/creator-house

  - title: ユーザ院議会デモ
    details: Sepolia上のユーザ院議会で、CFP、議員資格、院別集計、投票クレジットと承認投票を確認します。
    link: /demo/user-house

  - title: 現在の状況
    details: 公開文書、草案仕様、未実装範囲、専門家確認が必要な事項を区別して示します。
    link: /status

  - title: ホワイトペーパー
    details: Creator First Platform の理念、権利、経済、技術、ガバナンス、法務、セキュリティ、インフラ、ロードマップをまとめた基本文書です。
    link: /whitepaper/01-vision

  - title: CFP文書
    details: 音楽クリエーターとユーザがプラットフォームの制度やプロトコルの変更・拡張を提案し、議論と熟議につなげる公開提案制度です。
    link: /proposals/

  - title: ガバナンス
    details: 音楽クリエータ院議会とユーザ院議会を抽選代表によって構成し、熟議を経てプロトコル仕様を形成する統治モデルです。
    link: /whitepaper/07-governance

  - title: ADR一覧
    details: アーキテクチャ決定記録として、重要な設計判断、その理由、代替案、影響を記録し、プロトコル仕様と実装へ接続します。
    link: /adr/

  - title: プロトコル仕様
    details: ADRで決定された設計を、Codexや開発者が実装できる要件、不変条件、インターフェース、エラー条件、テスト条件へ落とし込んだ仕様です。
    link: /protocol/

  - title: 本番サービス設計
    details: ユーザ登録、音楽クリエーター登録、利用、コミュニティ、ガバナンス、分配を独立した正本と本番ゲートで接続します。
    link: /adr/ADR-0018-production-service-architecture
---

<div class="homepage-symbol">
  <img src="/creator-first-platform-symbol.png" alt="Creator First Platform symbol" />
</div>

<div class="document-meta">

<div class="document-meta__version">ホワイトペーパー v1.0</div>

<div class="document-meta__row">
  <span class="document-meta__label">Publication 日付</span>
  <span>2026-07-27</span>
</div>

<div class="document-meta__row">
  <span class="document-meta__label">Revision 日付</span>
  <span>2026-08-25</span>
</div>

<div class="document-meta__row">
  <span class="document-meta__label">Author</span>
  <span>山崎重一郎 (Shigeichiro Yamasaki)</span>
</div>

</div>

::: warning 現在は設計・公開テストネット検証段階です
本サイトは、稼働中の本番音楽配信サービス、決済サービス、DAOまたはSTOの案内ではありません。プロトコル仕様は草案であり、公開テストネットデモは部分稼働中ですが、本番サービスではありません。法務・金融・税務上の記述は個別案件への専門的助言ではありません。詳しくは[現在の状況](/status)と[テストネットデモ](/demo/)を確認してください。
:::

## Creator First Platform

Creator First Platform は、音楽を中心とするデジタルコンテンツの流通において、
**音楽クリエーターの権利と持続可能な活動、ユーザの自由で豊かな利用体験、公正で検証可能なエコシステム**を中心に据えるプラットフォームです。

ここでいう音楽クリエーターは、メジャーレーベルに属さず、制作・流通・マーケティング等の重要判断を自ら行う**アーティストダイレクト型の独立系アーティスト**です。TuneCore等の専門サービスを利用していても、委託先と契約範囲をアーティスト側が統制していれば対象になり得ます。

---

## 音楽クリエーター／ユーザがプロトコルを統治する

Creator First Platform のガバナンスは、単純なトークン投票ではありません。

> **音楽クリエーター／ユーザ → 抽選議会 → 熟議 → プロトコル仕様 → スマートコントラクト → 自動執行**

```mermaid
flowchart LR
    CU[音楽クリエーター／ユーザ]
    ELIGIBLE[適格コミュニティ]
    SORT[検証可能抽選]
    HOUSE[音楽クリエータ院議会 / ユーザ院議会]
    DELIB[熟議]
    SPEC[プロトコル仕様]
    CODE[検証済みスマートコントラクト]
    EXEC[自動実行]

    CU --> ELIGIBLE --> SORT --> HOUSE --> DELIB --> SPEC --> CODE --> EXEC
```

---

## ホワイトペーパー

ホワイトペーパーは、Creator First Platform の現時点における基本設計をまとめた文書です。

[ホワイトペーパーを読む →](/whitepaper/01-vision)

---

## CFP文書

**CFP**は、Creator First Platform の制度、経済モデル、技術、ガバナンス、プロトコルなどについて、変更や新しい仕組みを提案するための公開文書制度です。

ホワイトペーパーが、

> **現時点で合意されているプラットフォームの基本設計**

を表すのに対して、CFP は、

> **その設計を変更・拡張するための提案**

を表します。

[CFP 一覧を見る →](/proposals/)

---

## ADR一覧 — アーキテクチャ意思決定記録

ADR（アーキテクチャ決定記録）は、Creator First Platform における重要な技術・制度設計について、

- どの設計を採用したか
- なぜその設計を選んだか
- どの代替案を検討したか
- どのような影響や制約があるか

を記録するための文書です。

ADR は、ホワイトペーパーや CFP と実装コードの間をつなぐ **設計判断の履歴**として機能します。

```mermaid
flowchart LR
    WP[ホワイトペーパー]
    CFP[CFP]
    GOV[ガバナンス決定]
    ADR[ADR]
    SPEC[プロトコル仕様]
    ISSUE[GitHub課題]
    CODE[実装]

    WP --> CFP --> GOV --> ADR --> SPEC --> ISSUE --> CODE
```

[ADR一覧を見る →](/adr/)

---

## プロトコル仕様

プロトコル仕様は、ADRで採用された設計を、**Codexや開発者がそのまま実装作業へつなげられる仕様**へ変換する文書です。

プロトコルでは、例えば次の内容を定義します。

- Actors
- Inputs / Outputs
- 状態
- MUST / MUST NOT / SHOULD
- 不変条件
- 状態 Transitions
- Interfaces
- Error Conditions
- セキュリティ要件
- プライバシー要件
- テスト要件
- 受入基準

```mermaid
flowchart LR
    ADR[ADR]
    SPEC[プロトコル仕様]
    ISSUE[GitHub課題]
    AI[Codex]
    CODE[コード + テスト]
    PR[プルリクエスト]

    ADR --> SPEC --> ISSUE --> AI --> CODE --> PR
```

プロトコル仕様を、人間とAIエージェントの間の **実装契約**として利用します。

[プロトコル仕様を見る →](/protocol/)

---

## プラットフォームの5つの入口

```mermaid
flowchart TD
    TOP[Creator First Platform]

    TOP --> WP[ホワイトペーパー]
    TOP --> CFP[CFP]
    TOP --> GOV[ガバナンス]
    TOP --> ADR[ADR一覧]
    TOP --> PROTOCOL[プロトコル仕様]

    WP --> CURRENT[現在の基本設計]
    CFP --> CHANGE[変更・拡張の提案]
    GOV --> DECISION[正統な意思決定]
    ADR --> DESIGN[採用した設計と理由]
    PROTOCOL --> IMPLEMENT[実装可能な仕様]
```

### ホワイトペーパー

**何を目指すか、プラットフォームをどのような原則で設計するか**を説明します。

### CFP

**何を変更・拡張したいか**を提案します。

### ガバナンス

**どの提案を採用するか**を音楽クリエーター／ユーザの正統なプロセスで決定します。

### ADR一覧

**なぜその設計を採用したのか**を記録します。

### プロトコル仕様

**何を、どの条件で実装するか**を定義し、GitHub課題と Codex に接続します。

---

## ホワイトペーパーから Codex 実装まで

```mermaid
flowchart LR
    VISION[ビジョン]
    WP[ホワイトペーパー]
    CFP[CFP]
    GOV[ガバナンス]
    ADR[ADR]
    SPEC[プロトコル仕様]
    ISSUE[GitHub課題]
    AI[Codex]
    CODE[コード + テスト]
    PR[プルリクエスト]
    REVIEW[レビュー]
    RELEASE[リリース]

    VISION --> WP --> CFP --> GOV --> ADR --> SPEC --> ISSUE --> AI --> CODE --> PR --> REVIEW --> RELEASE
```

この構造によって、人間とガバナンスが、

- 何を目指すか
- 何を変更するか
- どの設計を採用するか

を決め、Codex が、

- 仕様に沿った実装
- テスト
- CI対応
- ドキュメント同期
- プルリクエスト作成

を支援できるようにします。

---

## 目指すもの

音楽クリエーターとユーザがプラットフォームの構成主体となり、

- 価値を創る
- 音楽を利用する
- 新しい音楽クリエーターを発見する
- 音楽クリエーターを支援する
- プラットフォームのルール形成に参加する

ことができる環境を作ります。

**Creator First Platform は、音楽を出発点として、企業・音楽クリエーター・ユーザ・コードの関係を再設計するプロジェクトです。**

<div class="site-copyright">
  © 2026 Creator First Platform
</div>
