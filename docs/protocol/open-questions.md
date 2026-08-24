---
title: プロトコル決定一覧
description: 草案プロトコル仕様に残る未解決事項の責任主体、停止中の開発ゲート、解決手順を追跡する入口。
---

# プロトコル決定一覧

草案プロトコル仕様に残る未解決事項は、実装者が暗黙に決めてよい項目ではありません。各質問には安定した`OQ-...` ID、役割としての決定責任者、解決まで停止する`Blocks`を付けています。

::: warning 決定責任者は未任命の役割です
現在記載している決定責任者は、草案段階で判断責任を割り当てるための役割案です。実在する担当者・法人機関の任命、承認権限または専門家レビューの完了を示すものではありません。
:::

## 仕様別の決定待ち

| 仕様 | 主な決定領域 | 未解決事項 |
| --- | --- | --- |
| [アカウントライフサイクル](/protocol/specs/account-lifecycle#open-questions) | 登録、認証、復旧、状態、保存期間 | `OQ-ACCOUNT-LIFECYCLE-...` |
| [ウォレット連携](/protocol/specs/wallet-linking#open-questions) | Step-up、ウォレット共有、異議申立て、解除、証跡 | `OQ-WALLET-LINKING-...` |
| [初期サポーター資格証明](/protocol/specs/early-supporter-credential#open-questions) | 資格、同意、SBT発行・失効、ウォレット回復、特権、STO分離 | `OQ-EARLY-SUPPORTER-...` |
| [サブスクリプション精算](/protocol/specs/subscription-settlement#open-questions) | チェーン、決済商品、資金フロー、会計、返金、更新 | `OQ-SUBSCRIPTION-...` |
| [精算資産登録台帳](/protocol/specs/settlement-asset-registry#open-questions) | 承認主体、証憑、ネットワーク、停止、監視、公開範囲 | `OQ-ASSET-REGISTRY-...` |
| [権利登録台帳](/protocol/specs/rights-registry#open-questions) | 作業・原盤、権利主張、審査、証憑、紛争、権利スナップショット | `OQ-RIGHTS-REGISTRY-...` |
| [再生認可](/protocol/specs/playback-authorization#open-questions) | 再生セッション、権利・購読認可、メディアアダプター、範囲配信、証跡 | `OQ-STREAMING-...` |
| [プレーヤークライアント](/protocol/specs/player-client#open-questions) | PWA基盤、ウォレット統合順序、OSS再利用、クライアントイベント、Codec・Accessibility、コミュニティ表示 | `OQ-PLAYER-...` |
| [再生検証](/protocol/specs/playback-verification#open-questions) | イベント Schema、重複、検証ポリシー、不正レビュー、利用実績スナップショット、プライバシー | `OQ-USAGE-ORACLE-...` |
| [音楽クリエーター分配](/protocol/specs/creator-distribution#open-questions) | 収益、控除、プール、ユーザ中心計算、権利保留、端数、説明 | `OQ-DISTRIBUTION-...` |
| [コントラクト変更ガバナンス](/protocol/specs/governance-change#open-questions) | 議席、投票クレジット、定足数、投票秘密、変更区分、膠着、アイデンティティ、理由付き差戻し | `OQ-GOVERNANCE-...` |

## 決定責任者の責任分界

- **Operating Company**は、法人として契約、法務、会計・税務、ユーザ対応、運用および規制対応に責任を持つ。
- **プロトコルガバナンス**は、プロトコルの技術的・制度的ルールを提案・審議する。法令、契約または株式会社の法的義務を上書きしない。
- **法務、法令遵守、税務、プライバシー、セキュリティ等の表記**は、必要な専門レビュー領域を示す。レビュー完了の証明ではない。
- 複数領域にまたがる判断は、一つの役割による単独決定として扱わず、必要な承認と反対意見を記録する。

## 解決手順

1. [`Protocol Decision` 課題フォーム](https://github.com/ShigeichiroYamasaki/creator-first-platform/issues/new?template=protocol-decision.yml)で`OQ-...` IDを参照し、具体的な選択肢と対象範囲を記述する。
2. 決定責任者となる実在の担当者または機関と、必要な専門レビューを確定する。
3. 法務、音楽クリエーター、ユーザ、権利者、セキュリティ、運用への影響を比較する。
4. 決定と根拠をCFP、ガバナンス決定またはADRへ記録する。
5. 該当プロトコル仕様を更新し、必要な要件・不変条件・テスト要件へ反映する。
6. 未解決事項を削除する場合も、決定記録への参照を残して版と状態を更新する。

自動検証は、未解決事項 IDの重複、決定責任者、Blocks、事項の欠落を拒否します。ただし、記載された判断が妥当であることや、実在の権限者が承認したことまでは保証しません。
