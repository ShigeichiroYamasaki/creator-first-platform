---
description: CreatorとUserの代表者を検証可能かつ操作耐性のある方法で抽選するSortition Protocolの設計案。
---

# ADR-0002: Verifiable Sortition

**Status:** Proposed  
**Date:** 2026-07-29
**Last Updated:** 2026-08-20

## 1. Context

Creator First Platform は、Creator と User を Protocol Governance の正統性の源泉とする。

ADR-0001 では、Creator / User Community から代表者を抽選し、

> **Creator / User → 抽選議会 → 熟議 → Protocol Specification → Smart Contract → 自動執行**

という Governance Model を採用する。

しかし、単に「ランダムに代表者を選ぶ」だけでは十分ではない。

抽選を Platform 運営者や株式会社が内部システムで実施した場合、

- 特定の候補者を意図的に選択する
- 特定の候補者を除外する
- 都合のよい乱数が得られるまで抽選をやり直す
- 抽選対象となる Eligible Community を事後的に変更する
- 抽選結果そのものを書き換える

といった Governance Manipulation の可能性を排除できない。

したがって Creator First Platform の抽選議会には、

**Verifiable Sortition（検証可能な抽選）**

が必要である。

---

## 2. Decision

Creator First Platform は、Creator House および User House の代表者選出に **Verifiable Sortition** を採用する。

抽選は、少なくとも次の性質を満たさなければならない。

### Fairness

同一カテゴリー内のすべての Eligible Member は、原則として等しい選出機会を持つ。

資産保有量、Token保有量、知名度、フォロワー数、再生回数、Platformへの支払額などによって抽選確率を増加させない。

### Unpredictability

抽選結果は、抽選条件が確定する前に予測できてはならない。

### Verifiability

抽選結果が正しいことを、Platform運営者以外の第三者が検証できなければならない。

### Non-manipulability

Platform運営者、候補者、その他の参加者が抽選結果を恣意的に操作できてはならない。

### Reproducibility

確定した Eligible Set、公開されたRandomness、および同一のSortition Algorithmから、第三者が同一の抽選結果を再計算できなければならない。

---

## 3. Governance Population

抽選対象は全Wallet Addressではない。

各Houseについて、事前に定義されたEligibility Rulesを満たすCommunity Memberのみを対象とする。

```text
Creator Community
        ↓
Creator Eligibility
        ↓
Eligible Creator Set
        ↓
Verifiable Sortition
        ↓
Creator House
```

```text
User Community
        ↓
User Eligibility
        ↓
Eligible User Set
        ↓
Verifiable Sortition
        ↓
User House
```

Creator Eligibility と User Eligibility の詳細は別Specificationで定義する。

---

## 4. One Person / One Eligibility Principle

Creator First Platform のSortitionはToken-weighted selectionを採用しない。

基本原則は、

> **One Eligible Person = One Sortition Opportunity**

とする。

したがって、

```text
100 JPYCを保有するUser
```

と、

```text
100,000 JPYCを保有するUser
```

が同一のEligibility条件を満たしている場合、資産量を理由として後者の抽選確率を高くしない。

同様にCreatorについても、人気、収益、再生回数等を直接的な抽選Weightとして使用しない。

これはGovernance PowerとEconomic Powerの集中を分離するためである。

---

## 5. Sybil Resistance

One Person / One Eligibilityを成立させるためには、単純なWallet Addressを抽選単位にしてはならない。

一人のUserが、

```text
Wallet A
Wallet B
Wallet C
...
Wallet N
```

を作成することで抽選確率を増加させるSybil Attackを防止する必要がある。

したがって、

> Wallet ≠ Governance Identity

とする。

Governance Eligibilityは、Walletとは独立したIdentity / Credential Layerによって管理する。

ただし、Identity Verificationの具体的方法は本ADRでは決定しない。

Privacy-preserving credentials、Proof of Personhood、Platform activity credentials等を候補として別ADRで検討する。

---

## 6. Eligible Set Commitment

抽選前にEligible Setを確定する。

抽選対象集合を、

$$
E = \{e_1,e_2,\ldots,e_n\}
$$

とする。

Platformは抽選Randomnessが確定する**前に**Eligible SetへのCommitmentを公開する。

例えば、

$$
C_E = H(\operatorname{MerkleRoot}(E))
$$

のようなCommitmentを利用できる。

これによってRandomnessを見た後で、

- 候補者を追加する
- 候補者を削除する

ことを防止する。

---

## 7. Public Randomness

抽選には、Platform運営者が単独で決定できないRandomness Sourceを使用する。

概念的には、

```text
Eligible Set
      ↓
Commitment
      ↓
Future Public Randomness
      ↓
Deterministic Sortition
      ↓
Selected Members
      ↓
Public Verification
```

とする。

Randomness Sourceの候補には、

- public randomness beacon
- blockchain randomness
- distributed randomness
- VRF-based mechanism

などがある。

具体的なRandomness SourceはProtocol Specificationまたは別ADRで決定する。

---

## 8. Deterministic Sortition

確定したEligible Setを $E$、公開Randomnessを $R$、選出人数を $k$ とすると、

$$
S = \operatorname{Sortition}(E,R,k)
$$

によってSelected Member Set $S$ を決定する。

Algorithmは公開され、

$$
E,R,k
$$

が同一であれば、誰が計算しても同一の $S$ が得られなければならない。

---

## 9. Verification

抽選後、少なくとも次の情報を公開する。

- Eligible Set Commitment
- Eligibility Snapshot identifier
- Randomness Source
- Randomness Value
- Sortition Algorithm Version
- Number of seats
- Selected Member identifiers or privacy-preserving credentials
- Verification data

第三者は、

```text
Eligibility Snapshot
        +
Randomness
        +
Algorithm
        ↓
Independent Verification
        ↓
Same Result
```

を確認できる。

---

## 10. Privacy

VerifiabilityのためにCreator/Userの個人情報を公開してはならない。

特に、

- 氏名
- 住所
- 生年月日
- 電話番号
- 本人確認資料

等をBlockchain上へ記録しない。

公開するのは、抽選の正当性を検証するために必要なCommitment、Credential、Proof等に限定する。

将来的にはZero-Knowledge Proofを利用し、

> 「このMemberは抽選時点でEligible Setに属していた」

ことを、Identityそのものを公開せずに証明できる構造を検討する。

---

## 11. Replacement Members

選出されたMemberが、

- 辞退
- 利益相反
- Eligibility喪失
- 長期不参加
- その他の失格条件

によって議員になれない場合に備え、Sortitionでは補欠順位も決定する。

例えば定数 $k$ の議席に対して、

$$
k+r
$$

人を順序付きで抽選し、後続 $r$ 人をReplacement Poolとする。

運営者が任意の代替Memberを指名してはならない。

---

## 12. Auditability

各Sortition Roundには一意のIdentifierを付与する。

例：

```text
USER-HOUSE-2026-001
CREATOR-HOUSE-2026-001
```

各Roundについて、

```text
Sortition Round
├── Eligibility Snapshot
├── Eligible Set Commitment
├── Randomness
├── Algorithm Version
├── Selected Members
├── Replacement Order
└── Verification Result
```

を追跡可能にする。

---

## 13. Alternatives Considered

### Token-weighted Voting / Sortition

資本量がGovernance Powerへ変換されるため採用しない。

### Operator-controlled Random Selection

Platform運営者による操作可能性を排除できないため採用しない。

### Election-only Representation

知名度、資金、組織力等が代表選出に強く影響する可能性があるため、基本方式として採用しない。

### Pure Direct Democracy

すべての意思決定への全員参加は、参加負担と熟議品質の問題があるため、通常のProtocol Governanceには採用しない。

ただし、憲章変更等の重大事項ではCommunity Referendumを併用する。

---

## 14. Consequences

### Positive

- Governance Powerの固定化を抑制できる
- 資本量と政治的影響力を分離できる
- 一般Creator/UserがGovernanceへ参加できる
- 抽選操作を第三者が検証できる
- Platform運営者への信頼依存を低減できる
- 抽選議会の正統性を技術的に補強できる

### Negative

- Sybil Resistanceが必要になる
- Eligibility設計が複雑になる
- Randomness Infrastructureが必要になる
- PrivacyとTransparencyの両立が必要になる
- 選出されたMemberへの教育・支援が必要になる
- 暗号技術の変更に対応する必要がある

---

## 15. Security Considerations

Sortition Systemは少なくとも次の攻撃を考慮する。

- Sybil Attack
- Eligible Set Manipulation
- Randomness Manipulation
- Grinding Attack
- Selective Disclosure
- Replacement Manipulation
- Credential Theft
- Collusion
- Privacy Leakage

具体的なThreat ModelはProtocol Specificationで定義する。

---

## 16. Relationship to ADR-0001

ADR-0001は、

> **抽選議会を採用する**

というGovernance Architectureを決定する。

ADR-0002は、

> **その抽選がどのような性質を満たすべきか**

を決定する。

したがって、

```text
ADR-0001 Governance Model
            ↓
ADR-0002 Verifiable Sortition
            ↓
Protocol Sortition Specification
            ↓
Implementation
```

という関係になる。

---

## 17. Related Documents

- ADR-0001: Governance Model
- Whitepaper: Vision
- Whitepaper: Governance
- Whitepaper: Technology
- Whitepaper: Security

## 18. Follow-up Specifications

本ADRの採択後、少なくとも次のSpecificationを作成する。

- `protocol/sortition-spec.md`
- `protocol/governance-eligibility-spec.md`
- `protocol/randomness-spec.md`

Identity / Sybil Resistanceについては、必要に応じて独立したADRを作成する。
