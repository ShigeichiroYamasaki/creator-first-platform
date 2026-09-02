---
description: Creator First Platformの重要な技術・制度設計について、採用判断、理由、代替案、影響を記録するADR一覧。
---

# アーキテクチャ意思決定記録

公開文書の参加主体と議会名称は、[正規用語表](../terminology.md)に従います。コード識別子と英語の規範仕様は同ページに定める例外を適用します。

アーキテクチャ決定記録（ADR）は、
Creator First Platform における重要な設計判断と、
その判断に至った理由を記録する文書です。

## ADRの役割

Creator First Platformでは、次の流れで
理念から実装までを追跡可能にします。

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

| ADR                                                        | Design 決定                      | 状態   | 日付       | Last 更新済み |
| :--------------------------------------------------------- | :----------------------------------- | :------- | :--------- | :----------- |
| [ADR-0001](./ADR-0001-governance-model.md)                 | ガバナンスモデル                     | 提案 | 2026-07-27 | 2026-08-24   |
| [ADR-0002](./ADR-0002-verifiable-sortition.md)             | 検証可能抽選                 | 提案 | 2026-07-29 | 2026-08-25   |
| [ADR-0003](./ADR-0003-rights-registry.md)                  | 権利登録台帳                      | 提案 | 2026-07-29 | 2026-09-02   |
| [ADR-0004](./ADR-0004-creator-distribution-model.md)       | 音楽クリエーター分配モデル           | 提案 | 2026-07-29 | 2026-08-20   |
| [ADR-0005](./ADR-0005-usage-oracle.md)                     | 利用実績オラクル                         | 提案 | 2026-07-29 | 2026-08-24   |
| [ADR-0006](./ADR-0006-zero-knowledge-proof-strategy.md)    | ゼロ知識証明戦略        | 提案 | 2026-07-29 | 2026-08-24   |
| [ADR-0007](./ADR-0007-blockchain-l2-strategy.md)           | ブロックチェーン / L2 戦略             | 提案 | 2026-07-29 | 2026-09-01   |
| [ADR-0008](./ADR-0008-account-wallet-identity-strategy.md) | アカウント / ウォレット / アイデンティティ戦略 | 提案 | 2026-07-29 | 2026-08-26   |
| [ADR-0009](./ADR-0009-navidrome-streaming-gateway.md)      | Navidrome / ストリーミングゲートウェイ        | 提案 | 2026-08-19 | 2026-08-26   |
| [ADR-0010](./ADR-0010-early-supporter-sbt-privileges.md)   | サポーター SBT・特権         | 提案 | 2026-08-20 | 2026-08-26   |
| [ADR-0011](./ADR-0011-integrated-player-client.md)         | 統合プレーヤークライアント             | 提案 | 2026-08-21 | 2026-08-26   |
| [ADR-0013](./ADR-0013-treasury-flow-transparency.md)      | 資金庫フロー透明性参照モデル | 提案 | 2026-08-23 | 2026-08-23   |
| [ADR-0014](./ADR-0014-public-testnet-user-journey.md)     | 公開テストネットユーザ利用フロー           | 提案 | 2026-08-23 | 2026-09-01   |
| [ADR-0015](./ADR-0015-public-testnet-creator-journey.md)  | 公開テストネット音楽クリエーター利用フロー        | 提案 | 2026-08-23 | 2026-09-01   |
| [ADR-0016](./ADR-0016-bicameral-quadratic-governance.md) | Bicameral 二次ガバナンス        | 提案 | 2026-08-24 | 2026-09-01   |
| [ADR-0017](./ADR-0017-transparent-zk-testnet-mainnet-boundary.md) | 透明型ゼロ知識証明のテストネット／本番境界 | 提案 | 2026-08-24 | 2026-08-26 |
| [ADR-0018](./ADR-0018-production-service-architecture.md) | 本番サービス全体アーキテクチャ | 提案 | 2026-08-24 | 2026-08-26 |
| [ADR-0019](./ADR-0019-jpki-passkey-wallet-binding-testnet.md) | JPKI・パスキー・ウォレット結合テストネット | 提案 | 2026-08-26 | 2026-08-26 |
| [ADR-0020](./ADR-0020-wallet-agnostic-participant-invitations.md) | ウォレット未確定型の事前登録と本人登録 | 提案 | 2026-08-28 | 2026-08-31 |
| [ADR-0021](./ADR-0021-relayer-gas-sponsorship.md) | リレイヤーによるユーザ・音楽クリエーターのガス代負担 | 提案 | 2026-09-01 | 2026-09-01 |
| [ADR-0022](./ADR-0022-collective-rights-integration.md) | JASRAC・NexTone権利処理連携 | 提案 | 2026-09-02 | 2026-09-02 |

各ADRは初回作成日の`Date`と、内容またはメタデータを最後に変更した`Last Updated`を分けて記録します。
