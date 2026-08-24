---
title: Sepolia スマートコントラクトデモ
description: Hardhat 3、Infura、SepoliaでCreator First PlatformのMockJPYC決済、サポーター SBT、音楽クリエーター登録台帳を検証する手順。
---

# Sepolia スマートコントラクトデモ

Hardhat 3とViemを使い、次のテストネット専用コントラクトをEthereum Sepoliaへデプロイしました。公開構成はソースコミット `9e46420ebf68a0dbe4175b43e6501a5ee0ca34a7`で再現できます。

二院制ガバナーとデモポリシー実行対象はリポジトリへ実装済みですが、このページに記載する既存デプロイにはまだ含まれません。[ガバナンスデモ](/demo/governance)は、両方のアドレスと新しいソースコミットが公開マニフェストへ登録されるまで書込みを無効にします。

| コントラクト | テストネット上の責務 | 本番境界 |
| --- | --- | --- |
| `MockJPYC` | 無価値・償還不可の`tJPYC`を発行し、各アドレスへ一回限り`2,000 tJPYC`を配布する | 実在JPYC、交換、販売、償還を扱わない。公開 `claim()`はテストネット専用 |
| `CreatorFirstSubscription` | 固定計画の`tJPYC`移転成功と同じトランザクションでサブスクリプション期限を更新する | 法的な契約成立、返金、会計・税務判断を行わない |
| `CreatorFirstTreasury` | テスト資産を保有し、分類・一意な参照付きで支出イベントを出す | 法定会計帳簿、税務申告、ガバナンス承認の正本ではない |
| `SupporterSBTUpgradeable` | EIP-712 支援意思を検証し、一般／初期階層をコントラクト内で確定する | サブスクリプション、権利、STO、配当・収益請求権を表さない |
| `SupporterSBTProxy` | ERC-1967 プロキシからUUPS実装を呼び出す | アップグレードは監査・タイムロック・複数承認を経る本番設計へ置換する |
| `CreatorFirstCreatorRegistry` | 仮名音楽クリエーターと作品／権利自己申告のsalt付きコミットメント、状態、イベントを記録する | 本人、権利、受取人、カタログ、配信許諾、分配または支払を承認しない |

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

チェーン IDは`11155111`です。[公開マニフェスト](/testnet/deployment.json)と[トランザクションを含むデプロイ記録](/testnet/deployment-record.json)を機械可読JSONで提供します。次のコマンドは公開Sepolia RPCからBytecode、MockJPYC 通知／主張額、サブスクリプションの資産／資金庫／計画、ERC-1967 実装スロットおよび音楽クリエーター登録台帳のテストネット通知を再検証します。

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

テストは、MockJPYCの一回限りの自己取得と移転、決済／支出参照の重複拒否、EIP-712 nonceのreplay拒否、初期上限、ERC-5192、SBT移転拒否、一ウォレット一音楽クリエーター、コミットメント重複拒否、リリース自己申告と音楽クリエーター限定取消しを確認します。

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

初回の非公開デモデプロイでは、Ignitionが全役割をデプロイ専用アカウントへBootstrapします。公開前に各コントラクトの`grantRole`で運用アカウントへ権限を付与し、動作確認後にBootstrap アカウントの不要役割を`revokeRole`で外します。`DEFAULT_ADMIN_ROLE`を先に失わないこと、`POLICY_ROLE`と`UPGRADER_ROLE`を同じ単独鍵へ残さないこと、本番ではマルチシグ／タイムロックを含む別のデプロイポリシーを採用することが必要です。

`hardhat.config.ts`はチェーン IDを`11155111`へ固定するため、Infura Endpointが別ネットワークを返す場合は停止します。Ignitionのデプロイ Journalはローカル生成物としてGit対象外です。公開デモとして扱う前に、コントラクトアドレス、トランザクション、ソースコミット、Compiler、Constructor／Initializer引数、役割付与、Bootstrap 役割移管結果、プロキシ実装アドレスを別の公開デプロイ記録へ記録します。

## 現在未接続の範囲

ゲートウェイとプレーヤーはまだローカルモック資格を利用しており、このコントラクトイベントを読むインデクサー／参照モデル、リレイヤー、ガス代支援、Reorganization／ファイナリティ処理には接続されていません。したがって、この実装だけでストリーミング認可、音楽クリエーター分配、法的権利、法定会計または本番決済は成立しません。
