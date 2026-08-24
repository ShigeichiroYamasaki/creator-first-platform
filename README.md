# Creator First Platform

Creator First Platform は、クリエイターの持続可能な活動と利用者の利便性を中心に据えた、音楽サブスクリプション基盤の公開設計プロジェクトです。

- 公開サイト: <https://shigeichiroyamasaki.github.io/creator-first-platform/>
- ホワイトペーパー: [`docs/whitepaper/`](docs/whitepaper/)
- 設計判断（ADR）: [`docs/adr/`](docs/adr/)
- 実装仕様: [`protocol/`](protocol/)

現在はホワイトペーパー、ガバナンス、権利管理、JPYC等による決済、STOを含む資金調達の仕様を整備し、Testnet専用Smart Contractの最初の実装を追加しています。法務・税務に関する記述は一般的な設計資料であり、個別案件では専門家による確認を前提とします。

## ローカルで確認する

Node.js 24 と npm を使用します。

対応するバージョン管理ツールでは、リポジトリ直下の`.node-version`を利用できます。

```sh
npm ci
npm run docs:dev
```

本番用サイトを検証する場合は次を実行します。

```sh
npm run validate
npm run docs:preview
```

## ローカル音楽ストリーミング

DockerとNavidromeを使ったローカル開発用の音楽ストリーミングサーバーを起動できます。

```sh
npm run streaming:up
npm run streaming:verify
```

[http://127.0.0.1:4533](http://127.0.0.1:4533)で最初のローカル管理者を作成し、生成された試験音を再生します。停止は`npm run streaming:down`です。構成、安全境界、音源の扱いは[ローカル音楽ストリーミング手順](docs/demo/local-streaming.md)を参照してください。

## ローカルPlayer MVP

Vue 3製のPlayerを合成音源とMock Gatewayで起動できます。

```sh
npm run player:dev
```

既定では`127.0.0.1`だけで待ち受けます。基本再生、Queue、Seek、EIP-1193 Wallet接続、SIWE、Supporter登録同意、EIP-712署名、Mock SBT TierとCommunity Capability表示を確認できます。Mockは実Transaction、実JPYC、実SBTを扱いません。詳細は[`apps/player/README.md`](apps/player/README.md)を参照してください。

Gatewayを通した再生は、2つのTerminalで`npm run gateway:dev`と`npm run player:dev:gateway`を起動します。短命Playback Session、Range配信、SIWE／EIP-712検証、Mock SBT資格およびDelivery Evidenceを確認できます。詳細は[`apps/gateway/README.md`](apps/gateway/README.md)を参照してください。

## Testnet Smart Contract

Hardhat 3でMockJPYC、サブスクリプション、資金庫、一般／初期サポーターSBT、自己申告コミットメントだけを扱う音楽クリエーター登録台帳、およびテストネット版二院制ガバナーをローカル検証できます。

```sh
npm run contracts:compile
npm run contracts:test
npm run governance:test
npm run governance:validate
```

ソースコミット`9e46420ebf68a0dbe4175b43e6501a5ee0ca34a7`までの構成をEthereum Sepoliaへデプロイ済みです。二院制ガバナーと無価値のデモポリシー実行対象は実装済みですが、公開Sepoliaデプロイにはまだ含まれません。`npm run contracts:verify:sepolia`は公開RPC上のバイトコード、コントラクト接続、プラン、プロキシ実装先、音楽クリエーター登録台帳の注意表示に加え、ガバナンスアドレス公開後はチェーン拘束、タイムロック順序、実行対象との接続も検証します。アドレスと安全境界は[`docs/demo/testnet-contracts.md`](docs/demo/testnet-contracts.md)を参照してください。

## 文書から実装まで

設計と実装の追跡可能性を保つため、原則として次の順序で更新します。

1. Whitepaper または CFP で目的・変更案を記述する
2. Governance Decision と ADR で採用理由を記録する
3. Protocol Specification に要件、不変条件、テスト条件を定義する
4. GitHub Issue、実装、テスト、Pull Requestへ接続する

詳細は[Protocol Specification](protocol/README.md)を参照してください。

変更を提案する場合は[Contributing Guide](CONTRIBUTING.md)、公開運用は[Deployment Guide](DEPLOYMENT.md)、非公開で扱うべき脆弱性については[Security Policy](SECURITY.md)を参照してください。

## 変更時の確認

- 内部リンクとナビゲーションが正しいこと
- Mermaid図と数式がビルドできること
- 図、画像、操作要素に意味のあるラベルまたはテキスト代替があること
- Protocolの必須メタデータ、Related Documents、要件ID、Global／仕様固有Invariant ID、テスト参照が整合していること
- Protocol検証器の正常系・失敗系回帰テストが成功すること
- `docs/status.md`の基準日、ADR件数・Status、Protocol件数・Status・Versionが各ソースと一致すること
- canonical URL、OG URL、noindex、サイトマップが生成ページと一致すること
- Mermaid等の重い依存関係が共通アプリへ再混入せず、検索索引がraw解析量とgzip転送量の両予算内であること
- GitHub Actionsが完全なcommit SHAへ固定され、checkout認証情報を残さないこと
- 法制度、サービス仕様、料金など変化し得る情報に基準日と一次資料があること
- 秘密鍵、ウォレット情報、個人情報をコミットしないこと
- `npm run validate` が成功すること

`main` ブランチへの反映後、GitHub ActionsがGitHub Pagesへ自動公開します。Pull Requestではビルド検証が自動実行されます。公開前後の確認、失敗時の判断、切り戻しは[Deployment Guide](DEPLOYMENT.md)に従います。
