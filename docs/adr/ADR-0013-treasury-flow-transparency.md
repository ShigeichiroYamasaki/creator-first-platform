---
title: ADR-0013 Treasury Flow Transparency Read Model
description: オンチェーン残高、法人会計、分配、支払、税務および予算を突合し、資金フローを説明するRead Modelの設計判断。
---

# ADR-0013: Treasury Flow Transparency Read Model

**Status:** Proposed  
**Date:** 2026-08-23  
**Last Updated:** 2026-08-23

## Context

> **Implementation note (2026-08-23):** Testnet専用`CreatorFirstTreasury`はMockJPYC残高と、分類・金額・受取先・一意な参照を持つ支出Eventを提供する。これは将来のRead Model入力候補であり、現在のBrowser Dashboardとは未接続で、法定会計、税務、予算承認または本番支払の正本ではない。

サブスクリプション課金、サポーター支援、スマートコントラクト内資産、音楽クリエーター分配、システム維持、納税、プロモーションおよびコミュニティ運営を、ユーザと音楽クリエーターが理解できる形で可視化する必要がある。

一方、Wallet残高は売上・利益・分配可能額を直接表さない。スマートコントラクト、決済、法人会計、税務、分配計算、支払実行およびGovernance予算には別々の責任主体と正本がある。可視化画面を新たな会計台帳や支払承認機能にすると、二重管理と責任の曖昧化を生む。

## Decision

複数の正本から期間・資産・基準時点を固定して生成する、追記・訂正型の **Treasury Transparency Read Model** を採用する。このRead Modelは説明・監査補助用であり、法定会計帳簿、財務諸表、税務申告または支払承認の正本ではない。

### 二段階の照合

期間フローは、同一Asset IDと整数単位で次を満たす。

```text
opening_balance + finalized_inflows - finalized_outflows
  + approved_adjustments = ending_balance
```

期末時点では、次の二つの合計を同じ `ending_balance` へ照合する。

```text
contract_custody + corporate_custody + receivables + other_assets
  = creator_payables + tax_reserves_or_payables + operations_reserve
  + promotion_budget + community_budget + other_approved_purposes
  + net_unallocated_reserve
```

この右側分類は透明性のための資金用途・負担表示であり、会計基準上の負債・純資産分類を決定しない。

### 正本と責任主体

| 対象 | 正本または承認主体 | Read Modelの責任 |
| --- | --- | --- |
| 課金、返金、取消、手数料 | 決済台帳・法人会計 | 期間、確定性、証憑を固定して収入へ反映 |
| Contract内資産 | 対象Network・Contract・確定性Indexer | Asset、Block、Finalityを固定して所在別残高へ反映 |
| 法人管理資産・未収金 | 株式会社の会計・資金管理 | 締め状態と照合証跡を保持 |
| 音楽クリエーター分配・未払 | Finalized Distribution Result・支払台帳 | 計算、保留、指図、支払済みを分離 |
| 税金・公租公課 | 株式会社と税務・会計専門家 | 見積、準備、未払、支払済みを区別 |
| 維持・Promotion予算 | 法人の承認済み予算・会計 | 予算、コミット、実支出を区別 |
| Community予算 | Governance決定と法人会計 | 決定参照と実執行を突合 |

株式会社は権利、契約、税務、雇用、会計および法令対応を担う。DAOまたはプロトコルガバナンスは規程上認められた予算・Policyの提案と承認に関与できるが、法人の法的義務または専門家判断を置き換えない。

### Snapshotと状態

各Snapshotは少なくとも次を持つ。

- `period_id`、`snapshot_id`、Version、基準時刻、生成時刻
- 正確なAsset ID、Network、整数単位
- 期首、収入、支出、調整、期末の各合計と内訳
- 所在別資産、および負担・準備・残余の各合計と内訳
- 各行のSource Reference、Authority、Evidence、Policy Version
- `ESTIMATED`、`PENDING`、`RECONCILED`、`FINALIZED`または`CORRECTED`の状態
- 公開範囲、Privacy Threshold、CommitmentまたはAudit Reference

確定済みSnapshotは上書きしない。訂正は新Versionとして、原因、承認、変更前後の差分と影響する下流参照を残す。異なるAssetを換算根拠なしに相殺・合算しない。

### 公開範囲

公開画面は期間・Category別の集計と照合状態を示す。音楽クリエーター向け画面は権限のある受取人について計算、保留、支払指図、支払済みを説明できる。個人の支払履歴、視聴履歴、本人情報、非公開の契約・税務情報は公開しない。

### Testnet Demo

最初のDemoはブラウザ内の固定MockJPYC Fixtureだけを使う。外部Wallet、Contract、銀行、会計または税務システムへ接続せず、資金移動も実行しない。UIは二つの照合式とTest-only境界を明示し、後にSource Adapterを段階的に置換できる構造とする。

## Consequences

### Positive

- 課金から音楽クリエーター還元と運営支出までを一つの期間で説明できる。
- Contract残高と会計上の収益・負担を混同しにくい。
- 音楽クリエーター、ユーザ、Governance、法人Financeが同じ照合結果を異なる権限で確認できる。
- 訂正履歴とSource Referenceを保った監査が可能になる。

### Negative

- Chain、決済、会計、分配、税務、予算の締め時刻と粒度を調整する必要がある。
- 公開の即時性と、会計・税務上の確定性には時間差が生じる。
- Asset、Network、Privacy Threshold、会計Categoryの誤設定が誤解を招くため、独立Reviewが必要になる。

## Alternatives Considered

### Contract残高だけを公開する

簡単だが、未払音楽クリエーター分、法人管理資産、返金、税金、未収金を説明できず不採用。

### 法人会計だけを公開する

法定処理には必要だが、On-chain残高とProtocol上の分配・Governance決定をユーザが検証しにくいため、単独案として不採用。

### Dashboardを支払台帳兼承認システムにする

表示層が資金移動権限を持ち、責任分離と障害分離を損なうため不採用。

## Acceptance Criteria

- 期首残高、確定収入、確定支出、承認済み調整と期末残高がAsset単位で一致する。
- 期末残高と所在別資産合計が一致し、所在別資産合計と負担・準備・残余合計が一致する。
- Contract移転を自動的に売上または費用と扱わず、Source・Authority・Evidence・状態を保持する。
- 未確定・推定値を確定値として表示せず、訂正は新Versionと差分を残す。
- Dashboardから支払、予算執行または税務確定を実行できない。
- Finance、Accounting、Tax、Legal、Security、Privacyおよび音楽クリエーター代表のReviewを経る。

## Related Documents

- [Whitepaper 6.36 資金フローと財務透明性](/whitepaper/06-economics#_6-36-資金フローと財務透明性)
- [ADR-0004 音楽クリエーター分配 Model](./ADR-0004-creator-distribution-model.md)
- [音楽クリエーター分配仕様](/protocol/specs/creator-distribution)
- [資金フロー可視化デモ](/demo/treasury-dashboard)
