---
title: Protocol Decision Queue
description: Draft Protocol Specificationに残るOpen Questionsの責任主体、停止中の開発ゲート、解決手順を追跡する入口。
---

# Protocol Decision Queue

Draft Protocol Specificationに残るOpen Questionsは、実装者が暗黙に決めてよい項目ではありません。各質問には安定した`OQ-...` ID、役割としてのDecision owner、解決まで停止する`Blocks`を付けています。

::: warning Decision ownerは未任命の役割です
現在記載しているDecision ownerは、Draft段階で判断責任を割り当てるための役割案です。実在する担当者・法人機関の任命、承認権限または専門家レビューの完了を示すものではありません。
:::

## 仕様別の決定待ち

| Specification | 主な決定領域 | Open Questions |
| --- | --- | --- |
| [Account Lifecycle](/protocol/specs/account-lifecycle#open-questions) | 登録、認証、Recovery、状態、保存期間 | `OQ-ACCOUNT-LIFECYCLE-...` |
| [Wallet Linking](/protocol/specs/wallet-linking#open-questions) | Step-up、Wallet共有、Challenge、解除、証跡 | `OQ-WALLET-LINKING-...` |
| [Subscription Settlement](/protocol/specs/subscription-settlement#open-questions) | Chain、決済商品、資金フロー、会計、返金、更新 | `OQ-SUBSCRIPTION-...` |
| [Settlement Asset Registry](/protocol/specs/settlement-asset-registry#open-questions) | 承認主体、証憑、Network、停止、監視、公開範囲 | `OQ-ASSET-REGISTRY-...` |
| [Rights Registry](/protocol/specs/rights-registry#open-questions) | Work・Recording、権利主張、審査、証憑、紛争、Rights Snapshot | `OQ-RIGHTS-REGISTRY-...` |
| [Playback Authorization](/protocol/specs/playback-authorization#open-questions) | Playback Session、権利・購読認可、Media Adapter、Range配信、証跡 | `OQ-STREAMING-...` |
| [Playback Verification](/protocol/specs/playback-verification#open-questions) | Event Schema、重複、検証Policy、Fraud Review、Usage Snapshot、Privacy | `OQ-USAGE-ORACLE-...` |
| [Creator Distribution](/protocol/specs/creator-distribution#open-questions) | Revenue、控除、Pool、User-Centric計算、Rights保留、端数、説明 | `OQ-DISTRIBUTION-...` |

## Decision ownerの責任分界

- **Operating Company**は、法人として契約、法務、会計・税務、利用者対応、運用および規制対応に責任を持つ。
- **Protocol Governance**は、Protocolの技術的・制度的ルールを提案・審議する。法令、契約または株式会社の法的義務を上書きしない。
- **Legal、Compliance、Tax、Privacy、Security等の表記**は、必要な専門レビュー領域を示す。レビュー完了の証明ではない。
- 複数領域にまたがる判断は、一つの役割による単独決定として扱わず、必要な承認と反対意見を記録する。

## 解決手順

1. [`Protocol Decision` Issue Form](https://github.com/ShigeichiroYamasaki/creator-first-platform/issues/new?template=protocol-decision.yml)で`OQ-...` IDを参照し、具体的な選択肢と対象範囲を記述する。
2. Decision ownerとなる実在の担当者または機関と、必要な専門レビューを確定する。
3. 法務、Creator、User、Rights Holder、セキュリティ、運用への影響を比較する。
4. 決定と根拠をCFP、Governance DecisionまたはADRへ記録する。
5. 該当Protocol Specificationを更新し、必要な要件・Invariant・Test Requirementsへ反映する。
6. Open Questionを削除する場合も、決定記録への参照を残してVersionとStatusを更新する。

自動検証は、Open Question IDの重複、Decision owner、Blocks、Questionの欠落を拒否します。ただし、記載された判断が妥当であることや、実在の権限者が承認したことまでは保証しません。
