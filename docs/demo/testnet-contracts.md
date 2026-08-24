---
title: Sepolia スマートコントラクトデモ
description: Hardhat 3、Infura、SepoliaでCreator First PlatformのMockJPYC決済、サポーター SBT、音楽クリエーター登録台帳、二院制ガバナンス、透明型ZK境界を検証する手順。
---

# Sepolia スマートコントラクトデモ

Hardhat 3とViemを使い、公開済みのテストネット専用コントラクトをEthereum Sepoliaへデプロイしました。次の表には、公開済み構成に加えて、次回デプロイ対象としてローカル実装した透明型ZK境界とCFP-0002検証境界も示します。現在の公開構成はソースコミット `b0bfcb73d453d970e0a5c1c432abb9abc6e0d341`で再現できます。

| コントラクト | テストネット上の責務 | 本番境界 |
| --- | --- | --- |
| `MockJPYC` | 無価値・償還不可の`tJPYC`を発行し、各アドレスへ一回限り`2,000 tJPYC`を配布する | 実在JPYC、交換、販売、償還を扱わない。公開 `claim()`はテストネット専用 |
| `CreatorFirstSubscription` | 固定計画の`tJPYC`移転成功と同じトランザクションでサブスクリプション期限を更新する | 法的な契約成立、返金、会計・税務判断を行わない |
| `CreatorFirstTreasury` | テスト資産を保有し、分類・一意な参照付きで支出イベントを出す | 法定会計帳簿、税務申告、ガバナンス承認の正本ではない |
| `SupporterSBTUpgradeable` | EIP-712 支援意思を検証し、一般／初期階層をコントラクト内で確定する | サブスクリプション、権利、STO、配当・収益請求権を表さない |
| `SupporterSBTProxy` | ERC-1967 プロキシからUUPS実装を呼び出す | アップグレードは監査・タイムロック・複数承認を経る本番設計へ置換する |
| `CreatorFirstSupporterRegistrationAdapter` | 呼出者本人の短期EIP-712意思表示をSBTへ転送し、公開プレーヤーからのテスト登録を可能にする | テストネット専用。リレイヤー、ガス代支援、資格判定サービスまたはインデクサーを代替しない |
| `CreatorFirstCreatorRegistry` | 仮名音楽クリエーターと作品／権利自己申告のsalt付きコミットメント、状態、イベントを記録する | 本人、権利、受取人、カタログ、配信許諾、分配または支払を承認しない |
| `CreatorFirstBicameralGovernor` | 二院の独立採決、二次投票、レビュー証拠、変更区分別タイムロック、拘束済み実行データを管理する | 法的な会社機関決定、監査、憲法適合性判断、役員責任を代替しない |
| `CreatorFirstGovernedPolicy` | ガバナーだけが更新できる無価値のデモ設定を保持する | 資金庫、SBT、プロキシまたは本番権限を操作しない |
| `CreatorFirstTransparentZKMockVerifier` | 決定論的ダイジェスト比較で検証者接続だけを試す。暗号学的ZKではない | ゼロ知識性、健全性、利用実績、権利、資格または分配を証明しない |
| `CreatorFirstTransparentZKRegistry` | モック検証者プロファイル、チェーン拘束受付ID、再実行拒否、廃止、停止を検証する | 本番検証者、監査済み証明プログラムまたはmainnet受付台帳ではない |
| `CreatorFirstCreatorRegistrationAdapter` | CFP-0002用の対象IDをテスト音楽クリエーター登録台帳の初期登録時刻へ対応付ける | 自己申告テスト登録であり、本番本人性・音楽クリエーター資格の正本ではない |
| `CreatorFirstCFP0002DeploymentFactory` | 両院承認、レビュー、P2タイムロック後だけ固定saltでCFP-0002ポリシーをデプロイする | 本番デプロイヤー、正式な憲章・法務審査または監査を代替しない |
| `CreatorFirstCFP0002EarlySupporterPolicy` | 初期登録から31,536,000秒未満という排他的時間条件を判定する | SBTを発行せず、配信、金銭、権利または議決権を付与しない |

透明型ZKの2コントラクト、CFP-0002用アダプター／デプロイファクトリー、公開プレーヤー用サポータ登録アダプターはローカル実装とIgnitionモジュールへの追加まで完了していますが、下記の公開Sepoliaマニフェストにはまだ含まれません。CFP-0002ポリシーはガバナンス実行時にだけ作成されます。アドレス、役割付与、初期ポリシーとデプロイトランザクションを公開記録へ追加するまでは公開デプロイ済みと扱いません。

SBTはERC-5192の`locked(tokenId)`を公開し、MintとBurn以外の移転を拒否します。初期条件の`POLICY_ROLE`、実装更新の`UPGRADER_ROLE`、署名済み意思を送る`RELAYER_ROLE`を分離し、発行済み階層を後日のポリシー更新で書き換えません。

## 公開デプロイ {#public-deployment}

| コントラクト | Sepolia アドレス |
| --- | --- |
| MockJPYC | [`0xBc89…5f49`](https://sepolia.etherscan.io/address/0xBc89cF411Fe4fEc602e854fF32E78BBD131F5f49) |
| CreatorFirstSubscription | [`0x7bEe…3d90`](https://sepolia.etherscan.io/address/0x7bEeD194032a8D655cF72E61889896eef97F3d90) |
| CreatorFirstTreasury | [`0x57a9…4215`](https://sepolia.etherscan.io/address/0x57a93F06dE83617f59bF31DD8FfbDA6FeB984215) |
| SupporterSBT プロキシ | [`0x2D01…0923`](https://sepolia.etherscan.io/address/0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923) |
| SupporterSBT 実装 | [`0x350a…7a66`](https://sepolia.etherscan.io/address/0x350a9FfcDBafA2982D28b29610CA09EDA65b7a66) |
| CreatorFirstCreatorRegistry | [`0x5676…e6E9`](https://sepolia.etherscan.io/address/0x5676d34d7C41849311b99932d8272af58b63e6E9) |
| CreatorFirstBicameralGovernor | [`0xE8D4…84b7`](https://sepolia.etherscan.io/address/0xE8D4BB558A69736375D8D5e4a7349D38B22584b7) |
| CreatorFirstGovernedPolicy | [`0xE789…94F7`](https://sepolia.etherscan.io/address/0xE7891c8edFF943eB7f203A34d76f51b8157094F7) |

チェーン IDは`11155111`です。[公開マニフェスト](/testnet/deployment.json)と[トランザクションを含むデプロイ記録](/testnet/deployment-record.json)を機械可読JSONで提供します。次のコマンドは公開Sepolia RPCからBytecode、MockJPYC 通知／主張額、サブスクリプションの資産／資金庫／計画、ERC-1967 実装スロット、音楽クリエーター登録台帳のテストネット通知、ガバナーのチェーン／タイムロック設定およびデモポリシーとの接続を再検証します。

```sh
npm run contracts:verify:sepolia
```

## ローカル検証

Node.js 24を使用します。

```sh
npm ci
npm run contracts:compile
npm run contracts:test
```

テストは、MockJPYCの一回限りの自己取得と移転、決済／支出参照の重複拒否、EIP-712 nonceのreplay拒否、初期上限、ERC-5192、SBT移転拒否、一ウォレット一音楽クリエーター、コミットメント重複拒否、リリース自己申告と音楽クリエーター限定取消し、透明型ZK境界に加え、CFP-0002の投票前適合性審査、両院熟議、別集計、共同承認、事後レビュー、P2タイムロック、完全一致デプロイおよび365日境界を確認します。

## InfuraとSepoliaの設定

InfuraでEthereum Sepolia用API 鍵を作成し、完全なHTTPS Endpointとデプロイ専用Sepolia秘密鍵をHardhat 3の暗号化Keystoreへ保存します。

```sh
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

`SEPOLIA_RPC_URL`には`https://sepolia.infura.io/v3/<API_KEY>`形式のEndpointを入力します。秘密鍵は`0x`から始まる32-byte値です。Keystoreの値、`.env`、Seed Phrase、本番鍵をGitへ追加しないでください。

再デプロイ前に次を確認します。

- 対象チェーン IDがSepoliaの`11155111`である
- デプロイ鍵には少量のSepolia ETHだけがあり、本番資産がない
- 初回Bootstrap後に`admin`、`policyManager`、`relayer`、`revoker`、`upgrader`、`treasuryDisburser`、`planManager`を分離する手順と担当アドレスがレビュー済みである
- メタデータ URIが公開前に取得可能で、画像や説明がテストネット SBTであることを明示する

## Sepoliaへデプロイ

既定値でデプロイする場合は次を実行します。

```sh
npm run contracts:deploy:sepolia
```

既存公開SBTへサポータ登録アダプターだけを追加する場合は、総合モジュールではなく次の専用コマンドを使います。既定の接続先は公開済みSBTプロキシ`0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923`で、アダプターのデプロイと`RELAYER_ROLE`付与だけを実行します。

```sh
npm run contracts:deploy:supporter-adapter:sepolia
```

実行アカウントが既存SBTの`DEFAULT_ADMIN_ROLE`を失っている場合、役割付与は停止します。その場合は権限を持つ承認済み管理主体から別途付与し、エラーを迂回するために新しい管理鍵を追加しません。

初回の非公開デモデプロイでは、Ignitionが全役割をデプロイ専用アカウントへBootstrapします。公開前に各コントラクトの`grantRole`で運用アカウントへ権限を付与し、動作確認後にBootstrap アカウントの不要役割を`revokeRole`で外します。`DEFAULT_ADMIN_ROLE`を先に失わないこと、`POLICY_ROLE`と`UPGRADER_ROLE`を同じ単独鍵へ残さないこと、本番ではマルチシグ／タイムロックを含む別のデプロイポリシーを採用することが必要です。

`hardhat.config.ts`はチェーン IDを`11155111`へ固定するため、Infura Endpointが別ネットワークを返す場合は停止します。Ignitionのデプロイ Journalはローカル生成物としてGit対象外です。公開デモとして扱う前に、コントラクトアドレス、トランザクション、ソースコミット、Compiler、Constructor／Initializer引数、役割付与、Bootstrap 役割移管結果、プロキシ実装アドレスを別の公開デプロイ記録へ記録します。

## 現在未接続の範囲

ゲートウェイとプレーヤーはまだローカルモック資格を利用しており、このコントラクトイベントを読むインデクサー／参照モデル、リレイヤー、ガス代支援、Reorganization／ファイナリティ処理には接続されていません。したがって、この実装だけでストリーミング認可、音楽クリエーター分配、法的権利、法定会計または本番決済は成立しません。
