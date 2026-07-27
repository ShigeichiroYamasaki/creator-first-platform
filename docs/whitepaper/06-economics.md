# 6. 経済モデル — Economic Model

## 6.1 本章の目的

Creator First Platform の経済モデルは、単に「1再生あたりいくら支払うか」を決めるものではない。

プラットフォームには、

- クリエイターへの公正な還元
- 新人・未発見クリエイターの成長機会
- 利用者の満足度
- 権利者への適切な支払い
- インフラ・法務・運営費用
- 不正利用への耐性
- 長期的な事業継続性

を同時に成立させる必要がある。

したがって本プラットフォームでは、

> **利用実績による基本分配、利用者による明示的な支持、成長支援、持続可能な運営を分離し、複数の経済メカニズムを組み合わせる。**

```mermaid
flowchart TD
    SUB[Subscription Revenue]
    SUB --> COST[Required Costs]
    COST --> NET[Distributable Revenue]

    NET --> U[Usage-based Pool]
    NET --> G[Growth Pool]
    NET --> O[Operation Pool]

    U --> CREATOR[Creators / Rights Holders]
    G --> EMERGING[Emerging Creators]
    O --> PLATFORM[Platform Sustainability]
```

---

## 6.2 経済モデルの基本原則

### Creator Sustainability

クリエイターが継続的に創作できる経済環境を目指す。

### User Value

クリエイター支援のために利用者の利便性や満足度を犠牲にしない。

### Transparent Rules

分配ルール、控除項目、主要パラメータを可能な限り明確にする。

### Fair Opportunity

人気の平等ではなく、発見される機会と参加機会の公平性を重視する。

### Rights First

権利関係を無視して経済的効率だけを追求しない。

### Sustainable Platform

運営費を極端に削減してサービスの品質、安全性、法令遵守を損なわない。

### Governed Economics

重要な経済パラメータを運営企業だけの裁量で変更しない。

---

## 6.3 サブスクリプションモデル

基本的な収益源は月額サブスクリプションを想定する。

利用者にとっては、既存の音楽ストリーミングサービスに近い単純な料金体系を基本とする。

```mermaid
flowchart LR
    USER[Listener]
    PLAN[Subscription Plan]
    ACCESS[Music Access]
    ECON[Creator Economy]

    USER --> PLAN
    PLAN --> ACCESS
    PLAN --> ECON
```

初期段階では複雑なトークン経済を利用者へ要求せず、法定通貨による通常の決済を中心とする。

将来的には複数プランや追加的なCreator Support機能を検討できるが、基本アクセスと投機的トークン保有を結び付けない。

---

## 6.4 売上と分配可能額

利用者が支払ったサブスクリプション料金全額を、そのままスマートコントラクトへ送るわけではない。

概念的には、

\[
R_d = R_g - T - P - C_r - C_o
\]

と表せる。

ここで、

- \(R_g\)：総収入
- \(T\)：税等
- \(P\)：決済関連費用
- \(C_r\)：契約・権利処理上必要な費用
- \(C_o\)：その他、分配前に必要となる明示的費用
- \(R_d\)：分配設計の対象となる純額

とする。

::: info 透明性の対象
重要なのは「手数料ゼロ」を約束することではなく、**どの費用が、なぜ、どの段階で控除されるかを説明できること**である。
:::

---

## 6.5 三つの主要プール

分配可能額を、目的の異なる複数のプールへ配分する。

```mermaid
flowchart TD
    NET[Distributable Revenue]

    NET --> U[Usage-based Pool]
    NET --> G[Growth Pool]
    NET --> O[Operation Pool]

    U --> U1[利用に基づく権利者還元]
    G --> G1[新人・発見・成長支援]
    O --> O1[運営・開発・法務・安全性]
```

比率を、

\[
\alpha + \beta + \gamma = 1
\]

とし、

\[
U = \alpha R_d,\quad
G = \beta R_d,\quad
O = \gamma R_d
\]

と定義できる。

\(\alpha,\beta,\gamma\) はホワイトペーパー段階では固定しない。

市場環境、事業コスト、クリエイターへの還元、利用者価値を検証した上で決定し、重要な変更はガバナンス対象とする。

---

## 6.6 Usage-based Pool

Usage-based Pool は、実際に利用された作品と、その権利者への基本的な還元を担う。

最も単純なモデルでは、作品 \(i\) の有効利用量を \(p_i\) とすると、

\[
D_i =
U \frac{p_i}{\sum_j p_j}
\]

となる。

しかし、Creator First Platform では、生の再生回数をそのまま \(p_i\) とすることを前提にしない。

```mermaid
flowchart LR
    RAW[Raw Plays]
    VALID[Valid Usage]
    FRAUD[Fraud Filtering]
    WEIGHT[Usage Weight]
    DIST[Distribution]

    RAW --> FRAUD
    FRAUD --> VALID
    VALID --> WEIGHT
    WEIGHT --> DIST
```

再生時間、不正判定、重複、権利状態などを考慮した **Valid Usage** を利用する。

---

## 6.7 「1再生 = 固定単価」ではない

サブスクリプション型サービスでは、毎月の収入、利用量、契約条件などが変化する。

そのため、

> **すべての再生に恒久的な固定単価を保証する**

というモデルは採用しない。

代わりに、

- 当該期間の分配可能額
- 有効利用量
- 権利比率
- 適用されたルール

から分配額を計算する。

クリエイターダッシュボードでは、単に金額だけではなく、計算根拠を確認できるようにする。

---

## 6.8 User-Centric な要素

全利用者の再生を一つの巨大なプールへ集約する方式だけでなく、

> **ある利用者が支払った価値を、その利用者が実際に支持したクリエイターへより強く結び付ける**

User-Centric 的な考え方を導入できる。

利用者 \(u\) の分配対象額を \(B_u\)、その利用者による作品 \(i\) の有効利用重みを \(w_{u,i}\) とすると、

\[
D_{u,i}
=
B_u
\frac{w_{u,i}}
{\sum_j w_{u,j}}
\]

のように表せる。

```mermaid
flowchart TD
    USER[User Subscription Share]
    USER --> A[Artist A]
    USER --> B[Artist B]
    USER --> C[Artist C]

    A -->|その利用者の利用比率| DIST[Creator Distribution]
    B -->|その利用者の利用比率| DIST
    C -->|その利用者の利用比率| DIST
```

ただし、完全なUser-Centric方式が常に最適とは限らないため、実証データをもとに評価する。

---

## 6.9 明示的な「推し」支援

利用者の再生行動だけでなく、

> **このクリエイターを応援したい**

という意思を反映する仕組みを設けることができる。

例えばサブスクリプション内の一部を、利用者がSupport Allocationとして指定する方式である。

```mermaid
flowchart TD
    VALUE[User Economic Contribution]
    VALUE --> LISTEN[Listening-based]
    VALUE --> SUPPORT[Explicit Support]

    LISTEN --> C1[Creators listened to]
    SUPPORT --> C2[Creators selected by user]
```

これにより、「たくさん聴いた」と「応援したい」を別のシグナルとして扱える。

---

## 6.10 Growth Pool

再生実績だけで分配すると、すでに大きな利用量を持つ作品へ資金が集中しやすい。

そこで、Usage-based Poolとは別に **Growth Pool** を設ける。

Growth Pool の目的は、

> **人気を人工的に平等化することではなく、まだ十分に発見されていないクリエイターに成長機会を提供すること**

である。

```mermaid
flowchart LR
    G[Growth Pool]
    G --> NEW[New Creators]
    G --> DISC[Discovery]
    G --> COMMUNITY[Community Support]
    G --> PROJECT[Creative Projects]
```

---

## 6.11 Growth Score

Growth Pool の配分に単純な再生数ランキングを使えば、Usage-based Pool と同じ集中が起きる。

そこで、複数の要素を使った Growth Score を検討する。

例えば、

\[
G_i =
f(
S_i,
N_i,
E_i,
C_i,
Q_i
)
\]

とする。

ここで、

- \(S_i\)：利用者からの支持
- \(N_i\)：新規性・活動段階
- \(E_i\)：継続的なエンゲージメント
- \(C_i\)：コミュニティからの支持
- \(Q_i\)：不正耐性を含む適格性

などである。

この式は固定仕様ではなく、ガバナンスと実証を通じて設計する。

---

## 6.12 Quadratic Funding

Growth Pool の一部では、Quadratic Funding の考え方を利用できる。

基本的な発想は、

> **一人の大口支援者から大きな金額を集めたプロジェクトより、多数の独立した利用者から支持されたプロジェクトを強く評価する**

ことである。

概念的には、プロジェクト \(i\) への個々の支援額を \(c_{u,i}\) としたとき、

\[
Q_i =
\left(
\sum_u \sqrt{c_{u,i}}
\right)^2
\]

のような指標を利用できる。

```mermaid
flowchart LR
    U1[User 1] --> P[Creator / Project]
    U2[User 2] --> P
    U3[User 3] --> P
    U4[User 4] --> P

    P --> QF[Quadratic Funding]
    QF --> MATCH[Growth Pool Match]
```

ただしSybil攻撃に弱いため、本人性・アカウント信頼性・不正検出と組み合わせる必要がある。

---

## 6.13 Early Support

利用者が新人クリエイターを早期に発見し、応援すること自体をプラットフォーム体験の一部にする。

```mermaid
flowchart LR
    DISCOVER[Early Discovery]
    FOLLOW[Follow]
    SUPPORT[Support]
    GROWTH[Creator Growth]

    DISCOVER --> FOLLOW --> SUPPORT --> GROWTH
```

ただしEarly Supportを金融投資化しない。

「将来人気になれば金銭的リターンが得られる」ことを中心にすると、音楽発見ではなく投機市場になる。

Creator First Platform では、支援と証券的・投機的インセンティブを明確に分離する。

---

## 6.14 Support Reputation

初期から新人を発見した利用者に、金銭ではなくコミュニティ上の評価を与えることは考えられる。

例えば、

- Early Supporter
- Discovery Contributor
- Community Curator

などの履歴である。

```mermaid
flowchart LR
    USER[User]
    EARLY[Early Support]
    CREATOR[Creator Growth]
    REP[Reputation]

    USER --> EARLY
    EARLY --> CREATOR
    CREATOR --> REP
    REP --> USER
```

ただし、Reputation がガバナンス権力や推薦操作へ直接変換される場合には慎重な設計が必要になる。

---

## 6.15 Operation Pool

Creator First Platform が長期的に存続するには、運営費用が必要である。

Operation Pool は例えば、

- クラウド・CDN
- ソフトウェア開発
- セキュリティ
- 権利管理
- 法務
- 会計・税務
- カスタマーサポート
- 不正対策
- ガバナンス運営
- 監査

などに利用する。

```mermaid
flowchart TD
    OPS[Operation Pool]

    OPS --> CLOUD[Infrastructure]
    OPS --> DEV[Development]
    OPS --> SEC[Security]
    OPS --> RIGHTS[Rights / Legal]
    OPS --> SUPPORT[Support]
    OPS --> AUDIT[Audit]
```

Creator First は「運営会社が利益を得てはいけない」という意味ではない。

重要なのは、

> **プラットフォームの利益最大化が、クリエイターと利用者の利益より常に優先される構造にしないこと**

である。

---

## 6.16 株式会社の利益

運営株式会社には、継続的な事業運営、研究開発、人材採用、リスク負担のための利益が必要である。

したがって経済モデルでは、

\[
\text{Corporate Profit}
\neq 0
\]

を前提とする。

一方で、

```mermaid
flowchart LR
    REV[Revenue]
    REV --> CREATOR[Creator Economy]
    REV --> SERVICE[Service Sustainability]
    SERVICE --> PROFIT[Corporate Profit]
```

利益率や運営費がブラックボックス化し、クリエイターへの還元を一方的に圧縮できる構造は避ける。

運営会社の利益とプロトコル上の分配ルールの境界を明確にする。

---

## 6.17 不正再生への経済的耐性

再生数が金銭に変換される以上、不正再生には経済的インセンティブが生じる。

```mermaid
flowchart LR
    BOT[Bot / Fraud]
    BOT --> FAKE[Fake Usage]
    FAKE --> MONEY[Illicit Distribution]

    VERIFY[Usage Verification] --> FAKE
```

そのため、

- Usage Oracle
- Bot検出
- レート制限
- 異常行動検出
- 支払い保留
- 監査
- 異議申立て

を組み合わせる。

不正判定アルゴリズム自体がクリエイターを不当に排除しないよう、説明・救済手続も設ける。

---

## 6.18 人気集中への対応

人気作品が多くの収益を得ること自体は自然である。

問題は、人気が推薦、再生、収益、さらに推薦という自己強化ループを形成し、新しい作品が参入できなくなることである。

```mermaid
flowchart TD
    POP[Popularity]
    POP --> REC[Recommendation]
    REC --> PLAY[More Plays]
    PLAY --> MONEY[More Revenue]
    MONEY --> VIS[More Visibility]
    VIS --> POP
```

これに対し、

- Usage-based Pool は実利用を尊重する
- Growth Pool は成長機会を補完する
- Discoveryは推薦機会を多様化する
- 利用者は推薦モードを選択できる

という複数レイヤーで対応する。

---

## 6.19 推薦と資金分配を完全には同一化しない

推薦アルゴリズムがそのまま収益分配アルゴリズムになると、プラットフォームが推薦を通じて資金配分を操作できる。

そこで、

```mermaid
flowchart LR
    REC[Recommendation System]
    USAGE[Actual Usage]
    DIST[Distribution]

    REC --> USAGE
    USAGE --> DIST

    REC -.->|直接決定しない| DIST
```

推薦は利用行動へ影響するが、推薦順位そのものを直接の報酬指標にはしない。

推薦と経済モデルの関係は監査対象とする。

---

## 6.20 クリエイターへの追加支払い

サブスクリプション分配とは別に、利用者が任意でクリエイターを支援できる仕組みも検討する。

```mermaid
flowchart TD
    USER[User]

    USER --> SUB[Subscription]
    USER --> TIP[Direct Support]
    USER --> PROJECT[Project Support]

    SUB --> ECON[Platform Economy]
    TIP --> CREATOR[Creator]
    PROJECT --> CREATOR
```

法的・決済上の要件を確認した上で、

- Tip
- Project Support
- Membership的支援
- 限定イベント等

を将来的な機能として検討できる。

---

## 6.21 トークンを経済モデルの前提にしない

Creator First Platform は、独自トークンの価格上昇によって成立する経済モデルを採用しない。

```mermaid
flowchart LR
    MUSIC[Music Economy]
    TOKEN[Token Price]

    TOKEN -.->|依存しない| MUSIC
```

ガバナンスや技術上の必要性からトークンを検討する場合でも、

- 音楽サービスの利用価値
- クリエイター報酬
- 株式会社の事業収益

をトークン価格から分離する。

---

## 6.22 STOとの分離

運営株式会社が将来的にSTOによって資金調達する場合でも、STOは音楽利用者への報酬分配とは別のレイヤーで扱う。

```mermaid
flowchart TD
    COMPANY[Operating Corporation]

    INVESTOR[Investors] -->|STO / Capital| COMPANY
    USERS[Subscribers] -->|Service Revenue| COMPANY

    COMPANY --> SERVICE[Platform Operations]
    SERVICE --> CREATOR[Creator Distribution]

    COMPANY --> INVESTORRETURN[Investor Rights / Returns]
```

投資家の権利と、利用者・クリエイターによるプロトコルガバナンスを混同しないことが重要である。

詳細は第11章で扱う。

---

## 6.23 ガバナンス可能な経済パラメータ

重要な経済パラメータの一部は、Creator House と User House のガバナンス対象とする。

例えば、

- Usage-based Pool 比率
- Growth Pool 比率
- Growth Pool の評価方式
- 不正利用に関するプロトコルルール
- 分配頻度
- 最低分配額
- Support Allocation の範囲
- 主要な分配アルゴリズム

などである。

```mermaid
flowchart TD
    CH[Creator House]
    UH[User House]

    CH --> GOV[Economic Governance]
    UH --> GOV

    GOV --> PARAM[Parameters]
    PARAM --> SC[Smart Contracts]
```

ただし、法定税、既存契約上の義務、法令遵守費用などを多数決で無効化することはできない。

---

## 6.24 経済パラメータの変更

分配ルールを頻繁に変更すると、クリエイターが将来収益を予測できなくなる。

そのため、重要な変更には、

1. 提案
2. シミュレーション
3. 公開レビュー
4. Creator House審議
5. User House審議
6. 法務・会計確認
7. Timelock
8. 適用

という手続きを設ける。

```mermaid
flowchart LR
    PROPOSE[Proposal]
    SIM[Simulation]
    REVIEW[Public Review]
    VOTE[Two-House Approval]
    LEGAL[Legal Check]
    TIME[Timelock]
    APPLY[Apply]

    PROPOSE --> SIM --> REVIEW --> VOTE --> LEGAL --> TIME --> APPLY
```

---

## 6.25 経済シミュレーション

経済モデルの変更前には、過去データや合成データを使って影響をシミュレーションする。

例えば、

- 上位1%への収益集中
- 中位クリエイターへの影響
- 新人への分配
- 1利用者あたりの価値
- Operation Poolの持続可能性
- 不正利用時の損失
- Growth Poolの効果

などを評価する。

```mermaid
flowchart TD
    DATA[Usage / Economic Data]
    MODEL[Candidate Model]
    SIM[Simulation]

    DATA --> SIM
    MODEL --> SIM

    SIM --> CREATOR[Creator Impact]
    SIM --> USER[User Impact]
    SIM --> COMPANY[Platform Impact]
    SIM --> RISK[Risk]
```

---

## 6.26 透明性指標

経済モデルを評価するため、売上額だけではなく複数の指標を公開することを検討する。

例えば、

- クリエイターへの総分配率
- Usage-based Pool の分配
- Growth Pool の分配
- Operation Pool
- 収益集中度
- 新人クリエイターの継続率
- 分配対象クリエイター数
- 利用者のDiscovery利用率
- 不正として除外された利用量

などである。

```mermaid
flowchart LR
    ECON[Platform Economy]
    ECON --> DASH[Transparency Dashboard]

    DASH --> CREATOR[Creator Metrics]
    DASH --> MONEY[Distribution Metrics]
    DASH --> GROWTH[Growth Metrics]
    DASH --> FRAUD[Integrity Metrics]
```

個人情報や企業秘密を無制限に公開するのではなく、制度の健全性を検証できる粒度で公開する。

---

## 6.27 初期段階の経済モデル

MVPでは複雑な数理モデルを最初から導入しない。

```mermaid
flowchart LR
    REV[Revenue]
    REV --> BASIC[Simple Transparent Pools]
    BASIC --> USAGE[Usage Distribution]
    BASIC --> GROWTH[Small Growth Pool]
    BASIC --> OPS[Operations]
```

初期段階では、

- 単純で説明可能
- 会計処理が可能
- クリエイターが理解できる
- 利用者へ説明できる
- 実データを収集できる

ことを優先する。

---

## 6.28 成長段階での経済モデル

利用者とクリエイターが増えた段階で、より高度な仕組みを段階的に導入する。

```mermaid
flowchart LR
    P1[Phase 1<br/>Simple Pools]
    P2[Phase 2<br/>User-Centric Elements]
    P3[Phase 3<br/>Growth / QF]
    P4[Phase 4<br/>Governed Economics]

    P1 --> P2 --> P3 --> P4
```

経済モデルを最初から完成形として固定せず、憲章の範囲内で実証とガバナンスによって改善する。

---

## 6.29 3つの憲章との関係

経済合理性だけで分配ルールを決定しない。

```mermaid
flowchart TD
    CONST[3つの憲章]

    CONST --> CREATOR[Creator Sustainability]
    CONST --> USER[User Value / Autonomy]
    CONST --> FAIR[Fair Discovery]

    CREATOR --> ECON[Economic Model]
    USER --> ECON
    FAIR --> ECON
```

例えば、クリエイターへの分配率を高めるために利用料金を極端に上げ、利用者が離脱すれば持続可能ではない。

逆に、利用料金を下げるためにクリエイター報酬を過度に圧縮すれば Creator First の理念に反する。

Growth Pool を増やしすぎて実際によく聴かれたクリエイターへの還元を大きく損なうことも避ける。

したがって3つの価値の間の緊張関係を、透明なルールとガバナンスによって調整する。

---

## 6.30 経済モデル全体像

```mermaid
flowchart TD
    USER[Listeners]
    USER -->|Subscription| REV[Revenue]

    REV --> REQUIRED[Taxes / Payment / Required Costs]
    REQUIRED --> NET[Distributable Revenue]

    NET --> USAGE[Usage-based Pool]
    NET --> GROWTH[Growth Pool]
    NET --> OPS[Operation Pool]

    USAGE --> ORACLE[Verified Usage]
    ORACLE --> RIGHTS[Rights Splits]
    RIGHTS --> CREATORS[Creators / Rights Holders]

    USER -->|Explicit Support| SUPPORT[Support Signals]
    SUPPORT --> GROWTH

    GROWTH --> EMERGING[Emerging Creators]
    OPS --> PLATFORM[Platform Sustainability]

    GOV[Creator House + User House] --> RULES[Economic Rules]
    RULES --> USAGE
    RULES --> GROWTH
```

この構造では、利用者の支払い、実際の利用、明示的な支持、成長支援、運営費を一つの指標へ押し込めない。

それぞれを分離することで、目的の異なる経済メカニズムを透明に設計する。

---

## 6.31 本章のまとめ

Creator First Platform の経済モデルは、

> **再生回数を最大化するためのモデルではなく、創作・発見・利用・支援が持続的に循環するモデル**

を目指す。

```mermaid
flowchart LR
    CREATE[Create]
    DISCOVER[Discover]
    LISTEN[Listen]
    SUPPORT[Support]
    REWARD[Reward]
    CREATE2[Create Again]

    CREATE --> DISCOVER
    DISCOVER --> LISTEN
    LISTEN --> SUPPORT
    SUPPORT --> REWARD
    REWARD --> CREATE2
```

その中心にあるのは、

- 利用実績に対する正当な還元
- 新人の成長機会
- 利用者の支持の意思
- 持続可能なプラットフォーム
- 検証可能な資金分配
- 当事者による経済ルールの統治

である。

> **Creator First とは、クリエイターだけを最大化することではない。クリエイターが創作を続けられ、利用者が音楽を楽しみ、新しい才能が発見され、その循環を支えるプラットフォームも持続できる経済を設計することである。**

このバランスを、固定された企業内部のアルゴリズムではなく、透明なプロトコルとガバナンスによって維持することが本プラットフォームの経済設計の目標である。
