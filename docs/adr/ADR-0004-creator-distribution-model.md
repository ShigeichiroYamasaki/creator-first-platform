---
description: 利用者中心の利用実績を基礎に、人気集中を抑えながらCreatorへ収益を分配する経済モデルの設計案。
---

# ADR-0004: Creator Distribution Model

**Status:** Proposed  
**Date:** 2026-07-29
**Last Updated:** 2026-08-23

資金の所在、期間収支、Creator未払、税・運営・Promotion・Community予算および残余の横断的な照合は、[ADR-0013](./ADR-0013-treasury-flow-transparency.md)で定義する。

## 1. Context

Creator First Platform は、Platform の利益最大化ではなく、Creator の権利と持続可能な創作活動を中心に据える。

Subscription 等によって得られた利用収入を Creator へ分配する際、単純な総再生回数比例モデルを採用すると、

- 人気作品への分配集中
- 大規模カタログ保有者への集中
- 新人・ニッチCreatorの発見機会低下
- Botや不正再生による分配操作
- Userの実際の支持と分配結果の乖離

が生じる可能性がある。

一方、Creator First Platform は、Rights Registry、検証可能なUsage情報、Governanceを組み合わせることによって、透明性と監査可能性を持つ分配モデルを構築できる。

したがって、Creator Distribution Model は単なる「1再生あたり単価」ではなく、

> **User Contribution → Verified Usage → Rights State → Distribution Policy → Creator Distribution**

として設計する必要がある。

---

## 2. Decision

Creator First Platform は、Creatorへの分配に **User-Centric Distribution を基本原則とするHybrid Distribution Model** を採用する。

各Userの分配対象額は、原則としてそのUser自身の検証済み利用実績に基づいて配分する。

同時に、Creator Diversity、Discovery、新人Creator支援等の公共的目的に使用するCommunity Allocationを分離して設ける。

概念的には、

```mermaid
flowchart LR
    SUB[Subscription Revenue]
    COST[Taxes / Fees / Required Costs]
    NET[Net Distributable Revenue]
    USER[User-Centric Pool]
    COMMUNITY[Community Pool]
    USAGE[Verified Usage]
    RIGHTS[Rights Registry]
    POLICY[Distribution Policy]
    PAY[Creator / Rights Holder Payment]

    SUB --> COST --> NET
    NET --> USER
    NET --> COMMUNITY
    USAGE --> POLICY
    RIGHTS --> POLICY
    USER --> POLICY
    COMMUNITY --> POLICY
    POLICY --> PAY
```

具体的な比率、閾値、重み等はProtocol SpecificationおよびGovernanceによって管理する。

---

## 3. Distribution Layers

Subscription等から得られる収入を、概念的に次の層へ分ける。

```text
Gross Revenue
      ↓
Mandatory Deductions
      ↓
Net Distributable Revenue
      ├── User-Centric Pool
      ├── Community / Discovery Pool
      └── Other Approved Allocations
```

Mandatory Deductionsには、適用される制度や契約に応じて、

- 税
- 決済手数料
- Blockchain transaction cost
- 法的に必要な控除
- Governanceによって承認されたPlatform運営費

等が含まれ得る。

これらの項目は明示的に区分し、Creator DistributionとPlatform Revenueを不透明に混在させない。

---

## 4. User-Centric Distribution

User $u$ のあるDistribution Periodにおける分配対象額を $D_u$ とする。

Userが利用した作品集合を $C_u$ とし、作品 $c$ に対する検証済み利用Weightを $w_{u,c}$ とする。

基本配分は、

$$
d_{u,c}
=
D_u
\frac{w_{u,c}}
{\sum_{j \in C_u} w_{u,j}}
$$

とする。

したがってUserが支払った分配対象額は、そのUser自身が実際に利用したCreator群へ配分される。

例えばUser Aがある期間に、

```text
Creator X : 60%
Creator Y : 30%
Creator Z : 10%
```

相当の検証済み利用を行った場合、User Aに対応する分配対象額も原則として同じ比率を基礎に配分する。

これは全Platformの総再生回数だけで分配するMarket-Centric Modelとは区別される。

---

## 5. Verified Usage Only

Distribution計算には、検証済みのUsage Eventのみを使用する。

```text
Playback
   ↓
Usage Evidence
   ↓
Validation / Proof
   ↓
Verified Usage
   ↓
Distribution
```

単純なClient自己申告だけを分配根拠として使用してはならない。

Usage Verificationは、将来的に、

- signed playback events
- device / session integrity
- server-side verification
- anomaly detection
- cryptographic commitment
- zero-knowledge proof

等を組み合わせる。

Usage Oracleの具体方式は別ADRまたはSpecificationで定義する。

---

## 6. Usage Weight Is Not Necessarily Raw Play Count

$w_{u,c}$ は単純なPlay Countだけに固定しない。

例えば、

- 有効再生時間
- 完了率
- 重複・短時間連続再生
- Userによる明示的な支持
- 不正検知結果

等を考慮できる。

ただし、Distribution Algorithmが恣意的な「おすすめ評価」やCreatorの知名度を使って分配額を操作してはならない。

Weighting Ruleは公開されたProtocol SpecificationとしてVersion管理する。

---

## 7. Anti-Concentration Principle

Creator First Platformは、人気Creatorへの分配集中を目的としたProtocolを採用しない。

ただし、実際のUser支持によって人気Creatorへの分配が大きくなること自体を禁止するものではない。

区別すべきなのは、

> **User Choiceによる集中**

と、

> **Platform Algorithmによる恣意的な集中**

である。

User-Centric Poolでは、Userの検証済み利用選択を基本的に尊重する。

新人・ニッチCreatorへの支援はUser-Centric Poolを歪めるのではなく、原則としてCommunity / Discovery Poolによって実現する。

---

## 8. Community / Discovery Pool

Net Distributable Revenueの一部を、Governanceによって承認されたCommunity / Discovery Poolへ割り当てることができる。

目的には、

- 新人Creator支援
- Discovery
- 多様性確保
- 小規模ジャンル支援
- 公共的・文化的価値
- Creator育成
- Community活動

等を含めることができる。

```mermaid
flowchart TD
    CP[Community Pool]
    NEW[Emerging Creators]
    DISC[Discovery]
    DIVERSE[Diversity]
    COMMUNITY[Community Projects]

    CP --> NEW
    CP --> DISC
    CP --> DIVERSE
    CP --> COMMUNITY
```

Community Poolの配分ルールは、Platform運営者が自由に変更できるものとせず、Governance Processによって決定する。

---

## 9. No Pay-to-Govern Distribution Advantage

Creatorが、

- Governance Tokenを大量保有している
- Platform株式を保有している
- Platformへ多額の資金を提供している
- 広告費等を支払っている

ことを理由としてCreator Distribution Weightを増加させてはならない。

```text
Capital Power
    ≠
Distribution Privilege
```

STO、株式、Governance Participation、Creator Distributionは、それぞれ異なる制度として扱う。

---

## 10. Rights-Aware Distribution

作品への配分額が決定した後、その金額を単純にUploaderへ送金してはならない。

ADR-0003 Rights Registryで確定したRights StateとDistribution Instructionsを使用する。

作品 $c$ に割り当てられた額を $D_c$、権利者 $i$ の有効な分配Shareを $s_{c,i}$ とすると、

$$
P_{c,i} = D_c s_{c,i}
$$

とする。

完全に確定した分配構成では、

$$
\sum_i s_{c,i} = 1
$$

を原則とする。

```mermaid
flowchart LR
    AMOUNT[Content Allocation]
    RIGHTS[Rights Registry]
    SPLIT[Rights-aware Split]
    A[Creator]
    B[Rights Holder]
    C[Other Contractual Recipient]

    AMOUNT --> SPLIT
    RIGHTS --> SPLIT
    SPLIT --> A
    SPLIT --> B
    SPLIT --> C
```

---

## 11. Disputed Rights

Rights RegistryでDisputedとなっている部分については、通常の自動分配を行わない。

```text
Distribution Amount
       ↓
Rights State
   ├── Verified → Payment
   └── Disputed → Hold / Escrow
```

紛争解決後、確定したRights Stateに従って保留額を分配する。

Platform運営者が恣意的に受取人を選択してはならない。

---

## 12. Distribution Period

分配は明示的なDistribution Period単位で計算する。

例えば、

```text
2026-07 Distribution Period
```

について、

- Eligible Revenue
- Verified Usage
- Rights Snapshot
- Distribution Policy Version
- Calculated Allocation
- Payment Status

を関連付ける。

過去のDistributionを再計算できるよう、計算時に使用したVersionとSnapshotを保存する。

---

## 13. Deterministic Calculation

同じ入力、

```text
Revenue Snapshot
Verified Usage Snapshot
Rights Snapshot
Distribution Policy Version
```

からは、同じDistribution Resultが得られなければならない。

概念的に、

$$
D =
F(R,U,G,P)
$$

とする。

ここで、

- $R$ = Revenue Snapshot
- $U$ = Verified Usage Snapshot
- $G$ = Rights Registry Snapshot
- $P$ = Distribution Policy

である。

計算処理は監査可能かつ再現可能にする。

---

## 14. Rounding and Residual Amounts

Tokenの最小単位等によって端数が発生する場合、その処理方法をProtocol Specificationで明示する。

端数処理によってPlatform運営者へ不透明な利益が発生してはならない。

Residual Amountについては、

- 次期Distributionへ繰越
- Community Poolへ移動
- deterministic rounding rule

等の方法をGovernanceで定義する。

---

## 15. Minimum Payout

Blockchain Feeや決済コストが支払額を上回る場合に備え、Minimum Payout Thresholdを設定できる。

Threshold未満のCreator Balanceは失効させず、原則として次期以降へ繰り越す。

```text
Creator Balance
      ↓
Below Threshold → Carry Forward
      ↓
At / Above Threshold → Payment
```

Threshold値はProtocol Parameterとして管理する。

---

## 16. Stablecoin Settlement

Creator First Platformは、JPYC等の適切なStablecoinを決済・分配手段として利用できる。

ただしCreator Distribution Modelは特定Tokenへ固定しない。

```text
Distribution Amount
        ↓
Settlement Asset
        ↓
JPYC / Approved Stablecoin
```

使用可能なSettlement Assetは、

- 法的適合性
- 流動性
- Smart Contract Risk
- Reserve / Issuer Risk
- Network Cost
- User / Creator Accessibility

等を評価し、Governanceおよび法務要件に従って決定する。

---

## 17. On-chain / Off-chain Separation

全Usage Eventや詳細なUser行動をPublic Blockchainへ記録してはならない。

基本構造は、

```mermaid
flowchart LR
    USAGE[Private Usage Data]
    VERIFY[Usage Verification]
    COMMIT[Commitment / Proof]
    CALC[Distribution Calculation]
    CONTRACT[Distribution Contract]
    PAY[Settlement]

    USAGE --> VERIFY --> COMMIT --> CALC --> CONTRACT --> PAY
```

Public Blockchainには必要に応じて、

- Distribution Root
- Period Identifier
- Policy Version
- Commitment
- Payment State

等を記録する。

個々のUserの視聴履歴を公開しない。

---

## 18. Privacy

User-Centric DistributionではUserごとの利用情報を扱うため、Privacyを重要な設計要件とする。

第三者が、

> 特定UserがどのCreatorをどれだけ利用したか

をPublic Blockchainから復元できる構造を避ける。

将来的にはZero-Knowledge Proofを利用して、

> Distribution計算がProtocol Ruleに従っている

ことを、個々のUserの視聴履歴を公開せず検証可能にすることを検討する。

---

## 19. Fraud Resistance

Distribution Systemは少なくとも、

- Bot Playback
- Self-streaming
- Replay Farming
- Multiple Account Abuse
- Sybil Users
- Fake Content
- Collusive Streaming
- Usage Oracle Manipulation

を考慮する。

疑わしいUsageを単純に削除するだけでなく、

```text
Observed
Verified
Rejected
Disputed
```

等の状態を追跡可能にする。

不正検知Algorithmだけで最終的な権利剥奪を自動決定しない。

---

## 20. Transparency

各Distribution Periodについて、個人情報や機密情報を公開しない範囲で、少なくとも次を検証可能にする。

- Total Eligible Revenue
- Total Distributable Revenue
- Pool Allocation
- Distribution Policy Version
- Rights Snapshot Reference
- Usage Verification Reference
- Distribution Commitment
- Payment Completion Status

Creatorは自身への分配について、

```text
Revenue
↓
Usage Allocation
↓
Rights Split
↓
Fees / Adjustments
↓
Final Payment
```

を追跡できるようにする。

---

## 21. Governance

Distribution PolicyはGovernance対象とする。

例えば、

- User-Centric Pool比率
- Community Pool比率
- Usage Weighting Rule
- Minimum Payout
- Residual Handling
- Fraud Handling Policy
- Settlement Asset

等である。

ただし、Governance変更を過去の確定済みDistribution Periodへ無条件に遡及適用してはならない。

各Distribution Periodは適用されたPolicy Versionを保持する。

---

## 22. Platform Revenue Separation

Platform運営会社の収益とCreator Distribution Poolを会計・Protocol上明確に区分する。

```text
User Payment
     ↓
Revenue Allocation
     ├── Creator Distribution
     ├── Community Allocation
     └── Platform Revenue
```

Platform Revenueの割合や費用構造は明示し、Creator Distribution Poolから事後的・恣意的に資金を移動できない設計を目指す。

具体的な法的・会計上の資金分別方法はLegal / Accounting Specificationで定義する。

---

## 23. Smart Contract Relationship

Distribution Contractは、確定済みDistribution Resultに基づいてSettlementを実行する。

Smart Contract自身が、

- 著作権判断
- Usageの真偽判定
- 不正ユーザー判定
- 法的紛争判断

を行うことを前提としない。

```mermaid
flowchart LR
    REV[Revenue]
    USAGE[Verified Usage]
    RIGHTS[Rights Registry]
    POLICY[Policy]
    ENGINE[Distribution Engine]
    ROOT[Distribution Commitment]
    CONTRACT[Smart Contract]
    CREATOR[Creator / Rights Holder]

    REV --> ENGINE
    USAGE --> ENGINE
    RIGHTS --> ENGINE
    POLICY --> ENGINE
    ENGINE --> ROOT --> CONTRACT --> CREATOR
```

---

## 24. Invariants

### Invariant 1

未検証Usageを通常のCreator Distributionへ使用してはならない。

### Invariant 2

Disputed Rightsに対応する金額を通常の確定Rights Holderへ誤って分配してはならない。

### Invariant 3

Distribution Periodごとに適用されたPolicy Versionを再現可能にしなければならない。

### Invariant 4

Creator Distribution PoolからPlatform運営者が恣意的に資金を取得できてはならない。

### Invariant 5

Token保有量や資本力を理由としてCreator Distribution Weightを増加させてはならない。

### Invariant 6

同じ確定入力と同じPolicy Versionから異なるDistribution Resultが生成されてはならない。

### Invariant 7

Userの詳細な利用履歴をPublic Blockchainへ公開してはならない。

### Invariant 8

Rights Registryを無視してUploaderへ全額を自動送金してはならない。

---

## 25. Alternatives Considered

### Market-Centric Pro-Rata Model

Platform全体の総再生数に比例して全Subscription Revenueを分配する。

実装は単純だが、人気作品への集中やUserごとの支持と分配結果の乖離が生じやすいため、基本方式として採用しない。

### Equal Distribution to All Creators

全Creatorへ均等配分する。

実際のUser利用・支持との関係が弱いため採用しない。

### Algorithmic Merit Distribution

PlatformがCreatorの「価値」をAIや推薦Algorithmで評価し、分配額を決定する。

Platformによる恣意的な価値判断につながるため、User-Centric Poolの基本方式として採用しない。

### Token-weighted Creator Distribution

CreatorまたはSupporterのToken保有量を分配Weightに利用する。

Economic PowerとCreator Distributionを混同するため採用しない。

### Fully On-chain Usage Accounting

すべてのPlayback EventをPublic Blockchain上で処理する。

Privacy、Cost、Scalabilityの観点から採用しない。

---

## 26. Consequences

### Positive

- Userの支払とCreatorへの分配を対応付けやすい
- Creatorへの分配根拠を説明しやすい
- 人気集中をPlatform全体の総再生数だけで増幅しにくい
- Rights Registryと直接接続できる
- 新人・ニッチCreator支援をCommunity Poolとして明示できる
- Distribution Algorithmを監査・再現可能にできる
- Platform運営収益とCreator Distributionを分離できる

### Negative

- User-Centric計算は単純な総再生比例より複雑になる
- Usage Verification Infrastructureが必要になる
- Privacy-preserving aggregationが必要になる
- Rights Registryとの整合性管理が必要になる
- Fraud Detectionが必要になる
- 小額支払のSettlement Costを考慮する必要がある
- Community PoolのGovernance設計が必要になる

---

## 27. Security Considerations

Distribution Systemは少なくとも次の攻撃・障害を考慮する。

- Fake Playback
- Bot Farming
- Sybil Attack
- Usage Oracle Manipulation
- Rights Registry Manipulation
- Distribution Policy Tampering
- Payment Address Substitution
- Double Payment
- Unauthorized Withdrawal
- Rounding Exploitation
- Smart Contract Vulnerability
- Privacy Leakage
- Stablecoin / Settlement Asset Failure

具体的なThreat ModelはSecurity Specificationで定義する。

---

## 28. Relationship to Other ADRs

ADR-0001はGovernance Architectureを定義する。

ADR-0002はVerifiable Sortitionを定義する。

ADR-0003はRights Registryを定義する。

ADR-0004は、Revenue、Verified Usage、Rights Registry、Distribution Policyを接続し、CreatorおよびRights Holderへの分配をどのように決定するかを定義する。

```text
ADR-0001 Governance Model
ADR-0002 Verifiable Sortition
ADR-0003 Rights Registry
              ↓
ADR-0004 Creator Distribution Model
              ↓
Protocol Specifications
              ↓
Distribution Engine
              ↓
Smart Contract Settlement
```

---

## 29. Related Documents

- Whitepaper: Vision
- Whitepaper: Rights and Funds
- Whitepaper: Platform Architecture
- Whitepaper: Creator Registration
- Whitepaper: Economic Model
- Whitepaper: Governance
- Whitepaper: Technology
- Whitepaper: Security
- Whitepaper: Legal / STO / Tax
- ADR-0003: Rights Registry

---

## 30. Follow-up Specifications

本ADRの採択後、少なくとも次のSpecificationを作成する。

- `protocol/distribution-spec.md`
- `protocol/usage-verification-spec.md`
- `protocol/revenue-allocation-spec.md`
- `protocol/settlement-spec.md`

Community / Discovery Poolの詳細については、必要に応じて独立したADRまたはSpecificationを作成する。

自動分配に使用するSmart Contractについても、Distribution Specification確定後に別途設計する。
