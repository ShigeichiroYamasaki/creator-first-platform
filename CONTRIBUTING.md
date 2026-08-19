# Contributing

Creator First Platformへの提案・修正に関心を持っていただき、ありがとうございます。

このリポジトリでは、理念、制度、法務、Protocol Specification、将来の実装を追跡可能な形で接続することを重視します。変更の種類に応じて、参照すべき上位文書と承認手順が異なります。

## 変更の入口

| 変更内容 | 最初の入口 |
| --- | --- |
| 誤字、リンク、説明の明確化 | Pull RequestまたはIssue |
| 基本理念・経済・権利・ガバナンスの変更 | CFP |
| 重要な技術・制度上の選択 | ADR |
| ProtocolのOpen Question解決 | `Protocol Decision` Issue Form |
| Vertical SliceのMock実装 | `Implementation Work Package` Issue Form |
| 承認済み設計の実装要件 | Protocol Specification |
| 仕様に沿ったコード・テスト | GitHub IssueとPull Request |
| 非公開の脆弱性情報 | `SECURITY.md`の手順 |

上位文書との矛盾が見つかった場合、実装だけで解釈を確定せず、矛盾と影響を明記してください。

## 開発環境

Node.js 24とnpmを使用します。

```sh
npm ci
npm run validate
```

`npm run validate`は、GitHub Actionsの固定参照・checkout設定、Issue Formの構文と必須意思決定項目、Protocol検証器の回帰テスト、必須メタデータ、Related Documentsの存在、要件IDとInvariant IDの一意性、Global Invariant参照、要件とテストの双方向参照、StatusページとADR・Protocolソースの成熟度表示、VitePress本番ビルド、サイト検査の失敗系回帰テスト、内部・外部リンク、アクセシビリティ構造、canonical URL・OG URL・JSON-LD・noindex・サイトマップの整合性、および用途別サイズ予算を検査します。個別には`npm run community:test`、`npm run protocol:test`、`npm run status:test`、`npm run status:validate`、`npm run site:test`、`npm run site:validate`を使用できます。

## Protocol Specificationを変更する場合

1. `protocol/conventions.md`、`protocol/glossary.md`、`protocol/invariants.md`を確認する
2. 関連するWhitepaper、CFP、Governance Decision、ADRを確認する
3. テンプレート `protocol/templates/protocol-spec-template.md` に従う
4. Related Documentsに存在するWhitepaper、ADR、関連仕様のリポジトリ相対パスを記載する
5. 各規範要件に安定した `REQ-<DOMAIN>-NNN` を付ける
6. MUSTとMUST NOTの各要件をTest Requirementsへ対応付ける
7. 適用するGlobal Invariantを`INV-<DOMAIN>-NNN`で参照し、仕様固有Invariantへ一意の`SPEC-INV-<DOMAIN>-NNN`を付ける
8. 未決定事項を安定した`OQ-...` ID、Decision owner、BlocksとともにOpen Questionsへ残し、実装で黙って決定しない
9. `npm run protocol:validate`を実行する

仕様のStatusがDraftである間は、採用済みの本番ルールとして扱わないでください。

## 法務・金融・税務の記述

- 法律、監督指針、税務、事業者登録、商品仕様など変化し得る情報には確認日を付ける
- 可能な限り政府機関・規制当局・発行者等の一次資料を使用する
- 一般的な設計資料と個別案件への専門的助言を区別する
- トークンの名称やブランドだけから法的分類、価値、償還可能性を断定しない
- 重要な判断には法務・税務・セキュリティ等の専門レビュー条件を残す

## Pull Request

Pull Requestは一つのレビュー可能な目的に絞り、次を説明してください。

- 何を変更したか
- なぜ必要か
- どの上位文書・要件に対応するか
- 利用者、クリエイター、権利者、運営への影響
- セキュリティ、プライバシー、法務、移行への影響
- 実行した検証
- 未解決事項

生成済みサイト、`node_modules`、秘密鍵、ウォレット情報、個人情報、契約書、税務資料をコミットしないでください。

公開手順と切り戻しは[Deployment Guide](DEPLOYMENT.md)を参照してください。

## レビュー基準

- Creator Firstの原則とUserの利便性を両立している
- 株式会社、Protocol Governance、STO投資家の責任・権限を混同していない
- 著作権、著作隣接権、Creator、Rights Holderを混同していない
- Account、Wallet、Legal Identity、Governance Identityを混同していない
- 金額に浮動小数点を使用せず、資産と単位が明示されている
- 個人情報や詳細な視聴履歴をパブリックチェーンへ保存しない
- 失敗、再試行、重複、監査、移行、緊急停止が考慮されている
- 文書内リンクと本番ビルドが正常である
- 図や画像の内容を、視覚だけに依存せずラベルまたはテキスト代替から確認できる
