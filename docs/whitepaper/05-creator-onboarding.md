---
description: クリエイター本人、作品の権利、配信許諾、報酬受取先を確認する登録・審査・更新プロセス。
---

# 5. クリエイター登録 — Creator Onboarding

## Testnetで検証する最小Creator Journey

公開Testnetでは、仮名Profileを現在のTabへ保存し、利用者が明示接続したSepolia WalletからCreator Commitmentと作品の権利自己申告Commitmentを登録する。公開Chainへ実名、作品名、音源、契約書、権利資料、税務情報または秘密情報は保存しない。

この登録は本人確認、Rights Holder確認、Payee審査、配信許諾または作品公開ではない。作品状態は常に`SELF_DECLARED_UNVERIFIED`から始まり、将来の法人によるEvidence確認、Rights Review、契約および異議申立てを経なければRights Registryの`VERIFIED`／`ACTIVE`へ進まない。Creatorが指定したPayout候補Walletも、本人・Wallet Link・税務・制裁・支払承認が完了するまで報酬送金先として使用しない。

[Test Creator Journey](/demo/creator-workspace)ではこの分離を合成データとEthereum Sepoliaで確認できる。

## 5.1 本章の目的

Creator First Platform におけるクリエイター登録は、単なるアカウント作成ではない。

音楽を配信し、その利用に基づく報酬を受け取るためには、

- 誰が登録しているのか
- 誰が作品の権利を持っているのか
- 誰が配信を許諾できるのか
- 誰へ報酬を分配すべきか

を確認する必要がある。

一方、確認手続を過度に複雑にすれば、新人や独立系クリエイターほど参加しにくくなる。

したがって Creator First Platform では、

> **参加のしやすさと権利確認の厳格さを分離し、段階的な登録・検証モデルを採用する。**

```mermaid
flowchart LR
    APPLY[Creator Application]
    ACCOUNT[Account]
    ID[Identity Verification]
    RIGHTS[Rights Declaration]
    REVIEW[Rights Verification]
    CONTRACT[Agreement]
    REGISTER[Rights Registry]
    RELEASE[Release]

    APPLY --> ACCOUNT
    ACCOUNT --> ID
    ID --> RIGHTS
    RIGHTS --> REVIEW
    REVIEW --> CONTRACT
    CONTRACT --> REGISTER
    REGISTER --> RELEASE
```

本章では、クリエイターが参加してから作品を公開し、報酬を受け取るまでの基本構造を定義する。

---

## 5.2 Creator First の入口

Creator First Platform は、既に大きな実績を持つアーティストだけを対象としない。

特に、

- 新人アーティスト
- 独立系ミュージシャン
- 小規模レーベル
- 地域で活動するクリエイター
- ニッチジャンルの制作者
- 作詞家・作曲家
- 実演家
- 自主制作を行うグループ

が参加できる環境を重視する。

```mermaid
flowchart TD
    CFP[Creator First Platform]

    INDIE[Independent Artist] --> CFP
    NEW[New Creator] --> CFP
    BAND[Band / Group] --> CFP
    LABEL[Independent Label] --> CFP
    WRITER[Songwriter / Composer] --> CFP
    PERF[Performer] --> CFP
```

「新人であること」や「再生実績が少ないこと」を登録上の不利益にはしない。

ただし、**参加しやすいことと、権利確認を省略することは別である。**

---

## 5.3 登録の基本原則

クリエイター登録は次の原則に従う。

### Low Barrier

参加手続は可能な限り簡潔にする。

### Rights before Distribution

権利関係を確認できない作品について、自動的に報酬分配を確定しない。

### Progressive Verification

最初からすべての確認を要求せず、利用する機能に応じて検証レベルを上げる。

### Creator Control

クリエイター自身が登録情報、権利情報、分配情報を確認できるようにする。

### Explainable Review

登録拒否、保留、権利確認要求などの理由を可能な範囲で説明する。

### Human Appeal

自動判定だけで最終的な権利判断を行わず、人による異議申立て経路を設ける。

---

## 5.4 段階的オンボーディング

登録を一度に完了させるのではなく、段階的に行う。

```mermaid
flowchart LR
    L0[Level 0<br/>Account]
    L1[Level 1<br/>Creator Profile]
    L2[Level 2<br/>Identity Verified]
    L3[Level 3<br/>Rights Verified]
    L4[Level 4<br/>Distribution Enabled]

    L0 --> L1 --> L2 --> L3 --> L4
```

### Level 0 — Account

基本アカウントを作成する。

### Level 1 — Creator Profile

アーティスト名、プロフィール、ジャンル等を登録する。

### Level 2 — Identity Verified

本人または法人・団体の確認を行う。

### Level 3 — Rights Verified

作品ごとの配信権限や権利情報を確認する。

### Level 4 — Distribution Enabled

報酬受取に必要な情報を確認し、分配を有効化する。

この方式により、プロフィール作成段階から過剰な書類提出を要求することを避ける。

---

## 5.5 アカウントと公開プロフィール

クリエイターの内部アカウント情報と、利用者に表示する公開プロフィールは分離する。

```mermaid
flowchart TD
    ACCOUNT[Creator Account]

    ACCOUNT --> PRIVATE[Private Information]
    ACCOUNT --> PUBLIC[Public Profile]

    PRIVATE --> ID[Identity]
    PRIVATE --> CONTRACT[Contracts]
    PRIVATE --> PAYMENT[Payment Information]

    PUBLIC --> NAME[Artist Name]
    PUBLIC --> BIO[Biography]
    PUBLIC --> GENRE[Genre]
    PUBLIC --> RELEASES[Releases]
    PUBLIC --> SUPPORT[Support / Community]
```

本人確認情報や税務・支払情報を公開プロフィールへ表示しない。

---

## 5.6 本人確認

報酬を受け取るクリエイターについては、法令、決済、税務、不正防止等の要件に応じて本人確認を行う。

登録主体によって必要な確認は異なる。

```mermaid
flowchart TD
    CREATOR[Creator]

    CREATOR --> PERSON[Individual]
    CREATOR --> ORG[Organization]

    PERSON --> KYC[Identity Verification]
    ORG --> KYB[Organization Verification]

    KYC --> VERIFIED[Verified Creator]
    KYB --> VERIFIED
```

確認情報は必要最小限とし、安全なオフチェーン環境で管理する。

本人確認済みであることと、作品の著作権・マスター権を保有していることは別の問題であるため、次に権利確認を行う。

---

## 5.7 作品登録

クリエイターは作品ごとに基本情報を登録する。

想定する情報には次が含まれる。

- 作品名
- アーティスト名
- 音源
- 作詞者
- 作曲者
- 実演家
- レコード製作者
- 音楽出版社等
- ISRC等の識別子
- リリース情報
- 配信可能地域
- 権利管理状況
- 分配先
- 分配比率

```mermaid
flowchart LR
    UPLOAD[Track Upload]
    META[Metadata]
    RIGHTS[Rights Declaration]
    AUDIO[Audio File]

    UPLOAD --> META
    UPLOAD --> RIGHTS
    UPLOAD --> AUDIO

    META --> REVIEW[Registration Review]
    RIGHTS --> REVIEW
    AUDIO --> REVIEW
```

独立系クリエイター向けには、複雑な権利用語を理解していなくても入力できるガイド型UIを用意する。

---

## 5.8 権利申告

作品登録時には、「自分が作者である」という一つの質問だけでは不十分である。

例えば、

```mermaid
flowchart TD
    Q[この作品について]

    Q --> Q1[作詞したか]
    Q --> Q2[作曲したか]
    Q --> Q3[演奏したか]
    Q --> Q4[マスターを保有するか]
    Q --> Q5[出版社・管理事業者がいるか]
    Q --> Q6[共同権利者がいるか]
```

のように、役割を分けて申告する。

これにより、クリエイター自身にも権利構造を理解しやすくする。

---

## 5.9 権利確認

すべての作品について同じ審査を行う必要はない。

リスクに応じた確認方式を採用する。

```mermaid
flowchart TD
    DECLARE[Rights Declaration]
    RISK[Risk Assessment]

    DECLARE --> RISK

    RISK --> LOW[Low Risk]
    RISK --> MED[Medium Risk]
    RISK --> HIGH[High Risk]

    LOW --> AUTO[Automated Checks]
    MED --> DOC[Additional Evidence]
    HIGH --> HUMAN[Human Review]

    AUTO --> RESULT[Decision]
    DOC --> RESULT
    HUMAN --> RESULT
```

確認には、登録情報、既存識別子、契約資料、外部権利情報、重複登録、権利者からの申立て等を利用できる。

---

## 5.10 Rights Registry への登録

権利確認が完了した作品は、第3章で定義した Rights Registry と接続する。

```mermaid
flowchart LR
    CREATOR[Creator]
    VERIFY[Rights Verification]
    REG[Rights Registry]
    STREAM[Streaming Platform]
    SC[Distribution Contract]

    CREATOR --> VERIFY
    VERIFY --> REG
    REG --> STREAM
    REG --> SC
```

Rights Registry は「著作権そのもの」を作るものではなく、プラットフォームが配信と分配に利用する検証済み権利情報を管理する。

---

## 5.11 共同制作作品

現代の音楽制作では、複数のクリエイターが一つの作品へ関与することが多い。

そのため、登録者一人の申告だけで全権利を確定する設計にはしない。

```mermaid
flowchart TD
    TRACK[Track]

    TRACK --> A[Creator A]
    TRACK --> B[Creator B]
    TRACK --> C[Creator C]

    A --> SPLIT[Rights / Revenue Split]
    B --> SPLIT
    C --> SPLIT

    SPLIT --> CONFIRM[Confirmation]
    CONFIRM --> REG[Rights Registry]
```

可能な場合には共同権利者へ確認を求め、分配比率を明示する。

未確認の部分が存在する場合には、その状態を Registry に記録する。

---

## 5.12 分配先の登録

権利者と実際の支払先が同一とは限らない。

例えば、

- 個人クリエイター
- バンド
- レーベル
- 出版社
- 制作会社
- 共同制作者

など複数の分配先が存在し得る。

```mermaid
flowchart TD
    TRACK[Track Revenue]
    TRACK --> SPLIT[Distribution Split]

    SPLIT --> A[Creator A]
    SPLIT --> B[Creator B]
    SPLIT --> LABEL[Label]
    SPLIT --> PUB[Publisher / Rights Entity]
```

スマートコントラクトを利用する場合でも、分配先変更には適切な認証・確認手続を要求する。

---

## 5.13 配信契約

作品公開前に、運営株式会社とクリエイターまたは権利者との間で配信に必要な契約関係を成立させる。

契約では少なくとも、

- 配信許諾の範囲
- 対象地域
- 契約期間
- 報酬・分配
- 権利保証
- 権利侵害時の対応
- 公開停止
- 契約終了
- 登録情報変更
- ガバナンスとの関係

などを明確化する。

```mermaid
flowchart LR
    RIGHTS[Verified Rights]
    TERMS[Distribution Terms]
    CONSENT[Creator Consent]
    CONTRACT[Agreement]
    RELEASE[Release]

    RIGHTS --> CONTRACT
    TERMS --> CONTRACT
    CONSENT --> CONTRACT
    CONTRACT --> RELEASE
```

ガバナンスによってプロトコルルールが変更される場合にも、既存契約や法令との整合性を確認する。

---

## 5.14 公開前チェック

作品公開前に、最低限の技術的・権利的チェックを行う。

```mermaid
flowchart TD
    READY[Release Candidate]

    READY --> META[Metadata Check]
    READY --> AUDIO[Audio Check]
    READY --> RIGHTS[Rights Status]
    READY --> POLICY[Platform Policy]
    READY --> REGION[Territory / Date]

    META --> OK{Ready?}
    AUDIO --> OK
    RIGHTS --> OK
    POLICY --> OK
    REGION --> OK

    OK -->|Yes| PUBLISH[Publish]
    OK -->|No| FIX[Creator Action / Review]
```

審査は作品の芸術的価値を評価するためのものではない。

原則として、法令、権利、技術要件、プラットフォームの明示的ルールへの適合を確認する。

---

## 5.15 新人を不利にしない審査

過去の再生数、SNSフォロワー数、レーベル所属、知名度などを、権利確認の代替指標にしない。

```mermaid
flowchart LR
    POP[Popularity]
    RIGHTS[Rights Validity]
    QUALITY[Technical Requirements]

    POP -.->|判定基準にしない| APPROVE[Release Decision]
    RIGHTS --> APPROVE
    QUALITY --> APPROVE
```

Creator First Platform における登録審査は、

> **人気があるか**

ではなく、

> **正当に配信できる作品か**

を中心に判断する。

---

## 5.16 発見機会への接続

登録された新人クリエイターが、単に巨大なカタログの中へ埋もれるだけでは Creator First とは言えない。

登録後は Discovery Layer と接続する。

```mermaid
flowchart LR
    NEW[New Creator]
    VERIFY[Verified Release]
    DISC[Discovery System]
    USERS[Listeners]
    SUPPORT[Support / Growth]

    NEW --> VERIFY
    VERIFY --> DISC
    DISC --> USERS
    USERS --> SUPPORT
    SUPPORT --> NEW
```

ただし、新人であるという理由だけで強制的に利用者へ推薦するのではなく、利用者の利便性・選択権と公平な発見機会を両立させる。

詳細は第8章「発見とコミュニティ」で扱う。

---

## 5.17 「推し活」と Early Support

Creator First Platform では、利用者が新人を発見し、その成長を支える体験を重要な価値の一つとして設計できる。

例えば、

- Follow
- Early Support
- Growth Pool
- Community Recommendation
- 新人発見プレイリスト
- 成長履歴の可視化

などが考えられる。

```mermaid
flowchart LR
    DISCOVER[Discover]
    FOLLOW[Follow]
    SUPPORT[Support]
    GROW[Creator Growth]
    COMMUNITY[Community]

    DISCOVER --> FOLLOW
    FOLLOW --> SUPPORT
    SUPPORT --> GROW
    GROW --> COMMUNITY
    COMMUNITY --> DISCOVER
```

ただし、金銭的支援の大きさが推薦順位やガバナンス権力をそのまま購入できる仕組みにはしない。

---

## 5.18 AI生成音楽への対応

生成AIによって制作された音楽については、単純な全面禁止または無条件許可ではなく、権利・透明性・市場健全性の観点からルールを設計する必要がある。

確認すべき事項には、

- 登録者が配信に必要な権利を持つか
- 第三者の権利を侵害していないか
- AI利用の表示が必要か
- 大量自動生成によるスパムではないか
- なりすましや声の無断利用がないか

などがある。

```mermaid
flowchart TD
    AI[AI-assisted / Generated Track]
    AI --> RIGHTS[Rights Check]
    AI --> DISCLOSE[Disclosure Rules]
    AI --> ABUSE[Spam / Abuse Detection]

    RIGHTS --> REVIEW[Review]
    DISCLOSE --> REVIEW
    ABUSE --> REVIEW
```

AIを利用したという事実だけでクリエイターを排除するのではなく、権利と透明性を中心に扱う。

---

## 5.19 権利侵害申立て

公開後に第三者から権利侵害の申立てが行われる場合がある。

```mermaid
flowchart TD
    CLAIM[Rights Claim]
    CLAIM --> TRIAGE[Initial Review]

    TRIAGE --> CLEAR[Clearly Invalid]
    TRIAGE --> REVIEW[Needs Investigation]
    TRIAGE --> URGENT[Urgent / Serious]

    REVIEW --> CREATOR[Creator Response]
    URGENT --> HOLD[Temporary Measures]

    CREATOR --> DECISION[Decision]
    HOLD --> DECISION

    DECISION --> KEEP[Keep / Restore]
    DECISION --> UPDATE[Rights Update]
    DECISION --> REMOVE[Remove / Restrict]
```

自動申立てだけで恒久的な削除や報酬没収を確定させない。

---

## 5.20 異議申立て

クリエイターは、

- 登録拒否
- 権利確認保留
- 配信停止
- 分配保留
- 不正判定

などについて異議申立てできる。

```mermaid
flowchart LR
    DECISION[Platform Decision]
    APPEAL[Creator Appeal]
    REVIEW[Independent / Human Review]
    RESULT[Reasoned Result]

    DECISION --> APPEAL
    APPEAL --> REVIEW
    REVIEW --> RESULT
```

Creator First の理念上、**説明可能性と救済手続**は重要な要素となる。

---

## 5.21 権利情報の変更

作品公開後にも、権利関係が変化する場合がある。

例えば、

- 出版契約の変更
- レーベル契約
- 権利譲渡
- 共同制作者の追加
- 分配比率変更
- 相続

などである。

```mermaid
flowchart LR
    OLD[Current Rights State]
    REQUEST[Change Request]
    VERIFY[Verification]
    NEW[New Rights State]

    OLD --> REQUEST
    REQUEST --> VERIFY
    VERIFY --> NEW
    NEW --> HISTORY[Immutable Change History]
```

最新状態を更新しつつ、過去の分配時点でどの権利状態が適用されていたかを追跡できるようにする。

---

## 5.22 アカウントと権利の分離

クリエイターのアカウントが停止・削除された場合でも、作品の法的権利が消えるわけではない。

したがって、

```mermaid
flowchart TD
    ACCOUNT[Creator Account]
    RIGHTS[Legal Rights]
    REG[Rights Registry]

    ACCOUNT --> PROFILE[Platform Access]
    RIGHTS --> REG

    PROFILE -.->|削除されても| RIGHTS
```

アカウント、権利、契約、支払債権を別の概念として管理する。

---

## 5.23 プライバシー

本人確認資料、住所、銀行口座、税務情報、契約書などをパブリックチェーンへ保存しない。

```mermaid
flowchart LR
    PRIVATE[Private Creator Data]
    PRIVATE --> SECURE[Secure Off-chain Storage]

    SECURE --> HASH[Hash / Reference]
    HASH --> CHAIN[On-chain Record]
```

オンチェーンには必要に応じて、

- ID
- 状態
- 公開鍵
- ハッシュ
- 分配アドレス
- 有効期間

など、最小限の情報のみを記録する。

---

## 5.24 クリエイターダッシュボード

クリエイター自身が、自分の作品と経済状態を確認できるダッシュボードを提供する。

```mermaid
flowchart TD
    DASH[Creator Dashboard]

    DASH --> TRACKS[Tracks]
    DASH --> RIGHTS[Rights Status]
    DASH --> USAGE[Usage]
    DASH --> MONEY[Revenue / Distribution]
    DASH --> DISC[Discovery]
    DASH --> GOV[Governance]
```

特に、

> **なぜこの金額になったのか**

を可能な限り追跡できることが重要である。

単なる再生数表示ではなく、利用実績、分配ルール、権利比率、Growth Pool 等との関係を説明できる設計を目指す。

---

## 5.25 Creator House への参加

登録クリエイターが一定の要件を満たした場合、Creator House のガバナンスへ参加できる。

ただし、

> **楽曲を1曲登録すれば無条件で大量の投票アカウントを作れる**

ような仕組みにはしない。

```mermaid
flowchart LR
    REGISTERED[Registered Creator]
    VERIFIED[Verified Creator]
    ELIGIBLE[Governance Eligibility]
    HOUSE[Creator House]

    REGISTERED --> VERIFIED
    VERIFIED --> ELIGIBLE
    ELIGIBLE --> HOUSE
```

本人性、活動実態、Sybil Resistance、公平性などを考慮して参加条件を設計する。

詳細は第7章「ガバナンス」で扱う。

---

## 5.26 登録から分配までの全体フロー

```mermaid
sequenceDiagram
    participant C as Creator
    participant P as Creator Portal
    participant Corp as Corporation
    participant R as Rights Registry
    participant S as Streaming Platform
    participant O as Usage Oracle
    participant SC as Smart Contract

    C->>P: Create account
    C->>P: Creator profile
    C->>Corp: Identity verification
    C->>P: Upload track / rights declaration
    P->>Corp: Rights review
    Corp->>R: Register verified rights
    Corp->>S: Approve release
    S-->>C: Track published
    S->>O: Verified usage data
    O->>SC: Usage commitment / proof
    R->>SC: Rights / split data
    SC-->>C: Distribution
```

この流れでは、アカウント作成から報酬分配までを一つのブラックボックスにせず、それぞれの段階の状態をクリエイターが確認できるようにする。

---

## 5.27 MVPでの登録方式

初期段階から完全自動の権利判定システムを構築することは現実的ではない。

MVPでは、

```mermaid
flowchart LR
    MVP1[Application]
    MVP2[Identity Check]
    MVP3[Rights Declaration]
    MVP4[Human Review]
    MVP5[Release]
    MVP6[Distribution]

    MVP1 --> MVP2 --> MVP3 --> MVP4 --> MVP5 --> MVP6
```

という比較的単純な構成から開始できる。

初期段階では登録クリエイター数を限定し、人による確認を多く残すことで、実際にどのような権利問題が発生するかを学習する。

その後、定型的な確認から自動化する。

---

## 5.28 将来的な登録方式

プラットフォームが成長した場合には、

- 外部Rights Databaseとの照合
- ISRC等による自動照合
- 電子署名
- Verifiable Credentials
- 組織アカウント
- Rights API
- 自動重複検出
- AIによる審査支援
- オンチェーン証明

などを導入できる。

```mermaid
flowchart LR
    HUMAN[Human Review]
    AUTO[Automated Verification]
    VC[Verifiable Credentials]
    RIGHTSAPI[Rights APIs]
    AI[AI Assistance]

    HUMAN --> HYBRID[Hybrid Rights Verification]
    AUTO --> HYBRID
    VC --> HYBRID
    RIGHTSAPI --> HYBRID
    AI --> HYBRID
```

ただしAIは審査支援に利用しても、権利紛争の最終的な法的判断主体とはしない。

---

## 5.29 3つの憲章との関係

クリエイター登録制度も、プラットフォームの3つの憲章に従う。

登録者を増やすこと、権利審査を効率化すること、収益を最大化することよりも、憲章上の原則を優先する。

```mermaid
flowchart TD
    CONST[3つの憲章]

    CONST --> ONBOARD[Creator Onboarding]
    CONST --> RIGHTS[Rights Review]
    CONST --> DISC[Discovery]
    CONST --> MONEY[Distribution]

    ONBOARD --> PLATFORM[Creator First Platform]
    RIGHTS --> PLATFORM
    DISC --> PLATFORM
    MONEY --> PLATFORM
```

例えば、新人を支援するという目的があっても、第三者の権利を侵害する作品を優遇することはできない。

また、不正防止を理由に、すべてのクリエイターへ不必要な監視や過剰な個人情報提出を要求することも避ける。

---

## 5.30 本章のまとめ

Creator First Platform におけるクリエイター登録は、

> **アカウントを作って音源をアップロードするだけの処理ではない。**

クリエイター、作品、権利、契約、分配、ガバナンスを接続する入口である。

```mermaid
flowchart LR
    CREATOR[Creator]
    ID[Identity]
    RIGHTS[Rights]
    CONTRACT[Contract]
    RELEASE[Release]
    DISCOVERY[Discovery]
    MONEY[Distribution]
    GOV[Governance]

    CREATOR --> ID
    ID --> RIGHTS
    RIGHTS --> CONTRACT
    CONTRACT --> RELEASE
    RELEASE --> DISCOVERY
    RELEASE --> MONEY
    CREATOR --> GOV
```

目指すのは、

> **新人でも参加しやすく、権利者には安全で、利用者には信頼でき、クリエイター自身が自分の権利と収益を理解できる登録制度**

である。

このオンボーディングが、Creator First Platform の経済とガバナンスへ参加するための基盤となる。
