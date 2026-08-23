---
title: Sepolia Smart Contract Demo
description: Hardhat 3、Infura、SepoliaでCreator First PlatformのMockJPYC決済、Supporter SBT、Creator Registryを検証する手順。
---

# Sepolia Smart Contract Demo

Hardhat 3とViemを使い、次のTestnet専用コントラクトをEthereum Sepoliaへデプロイしました。公開構成はSource Commit `9e46420ebf68a0dbe4175b43e6501a5ee0ca34a7`で再現できます。

| Contract | Testnet上の責務 | 本番境界 |
| --- | --- | --- |
| `MockJPYC` | 無価値・償還不可の`tJPYC`を発行し、各Addressへ一回限り`2,000 tJPYC`を配布する | 実在JPYC、交換、販売、償還を扱わない。Public `claim()`はTestnet専用 |
| `CreatorFirstSubscription` | 固定Planの`tJPYC`移転成功と同じTransactionでSubscription期限を更新する | 法的な契約成立、返金、会計・税務判断を行わない |
| `CreatorFirstTreasury` | Test Assetを保有し、分類・一意な参照付きで支出Eventを出す | 法定会計帳簿、税務申告、Governance承認の正本ではない |
| `SupporterSBTUpgradeable` | EIP-712 Support Intentを検証し、一般／Early TierをContract内で確定する | Subscription、Rights、STO、配当・収益請求権を表さない |
| `SupporterSBTProxy` | ERC-1967 ProxyからUUPS実装を呼び出す | Upgradeは監査・Timelock・複数承認を経る本番設計へ置換する |
| `CreatorFirstCreatorRegistry` | 仮名Creatorと作品／権利自己申告のsalt付きCommitment、状態、Eventを記録する | 本人、Rights、Payee、Catalog、配信許諾、分配または支払を承認しない |

SBTはERC-5192の`locked(tokenId)`を公開し、MintとBurn以外の移転を拒否します。Early条件の`POLICY_ROLE`、実装更新の`UPGRADER_ROLE`、署名済みIntentを送る`RELAYER_ROLE`を分離し、発行済みTierを後日のPolicy更新で書き換えません。

## 公開Deployment

| Contract | Sepolia Address |
| --- | --- |
| MockJPYC | [`0xBc89…5f49`](https://sepolia.etherscan.io/address/0xBc89cF411Fe4fEc602e854fF32E78BBD131F5f49) |
| CreatorFirstSubscription | [`0x7bEe…3d90`](https://sepolia.etherscan.io/address/0x7bEeD194032a8D655cF72E61889896eef97F3d90) |
| CreatorFirstTreasury | [`0x57a9…4215`](https://sepolia.etherscan.io/address/0x57a93F06dE83617f59bF31DD8FfbDA6FeB984215) |
| SupporterSBT Proxy | [`0x2D01…0923`](https://sepolia.etherscan.io/address/0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923) |
| SupporterSBT Implementation | [`0x350a…7a66`](https://sepolia.etherscan.io/address/0x350a9FfcDBafA2982D28b29610CA09EDA65b7a66) |
| CreatorFirstCreatorRegistry | [`0x5676…e6E9`](https://sepolia.etherscan.io/address/0x5676d34d7C41849311b99932d8272af58b63e6E9) |

Chain IDは`11155111`です。[公開Manifest](/testnet/deployment.json)と[Transactionを含むDeployment Record](/testnet/deployment-record.json)を機械可読JSONで提供します。次のコマンドは公開Sepolia RPCからBytecode、MockJPYC Notice／Claim額、SubscriptionのAsset／Treasury／Plan、ERC-1967 Implementation SlotおよびCreator RegistryのTestnet Noticeを再検証します。

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

テストは、MockJPYCの一回限りの自己取得と移転、Payment／支出Referenceの重複拒否、EIP-712 nonceのreplay拒否、Early上限、ERC-5192、SBT移転拒否、一Wallet一Creator、Commitment重複拒否、Release自己申告とCreator限定取消しを確認します。

## InfuraとSepoliaの設定

InfuraでEthereum Sepolia用API Keyを作成し、完全なHTTPS Endpointとデプロイ専用Sepolia秘密鍵をHardhat 3の暗号化Keystoreへ保存します。

```sh
npx hardhat keystore set SEPOLIA_RPC_URL
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

`SEPOLIA_RPC_URL`には`https://sepolia.infura.io/v3/<API_KEY>`形式のEndpointを入力します。秘密鍵は`0x`から始まる32-byte値です。Keystoreの値、`.env`、Seed Phrase、本番鍵をGitへ追加しないでください。

再デプロイ前に次を確認します。

- 対象Chain IDがSepoliaの`11155111`である
- デプロイ鍵には少量のSepolia ETHだけがあり、本番資産がない
- 初回Bootstrap後に`admin`、`policyManager`、`relayer`、`revoker`、`upgrader`、`treasuryDisburser`、`planManager`を分離する手順と担当アドレスがレビュー済みである
- Metadata URIが公開前に取得可能で、画像や説明がTestnet SBTであることを明示する

## Sepoliaへデプロイ

既定値でデプロイする場合は次を実行します。

```sh
npm run contracts:deploy:sepolia
```

初回の非公開Demo Deploymentでは、Ignitionが全Roleをデプロイ専用AccountへBootstrapします。公開前に各Contractの`grantRole`で運用Accountへ権限を付与し、動作確認後にBootstrap Accountの不要Roleを`revokeRole`で外します。`DEFAULT_ADMIN_ROLE`を先に失わないこと、`POLICY_ROLE`と`UPGRADER_ROLE`を同じ単独鍵へ残さないこと、本番ではMultisig／Timelockを含む別のDeployment Policyを採用することが必要です。

`hardhat.config.ts`はChain IDを`11155111`へ固定するため、Infura Endpointが別Networkを返す場合は停止します。IgnitionのDeployment Journalはローカル生成物としてGit対象外です。公開デモとして扱う前に、Contract Address、Transaction、Source Commit、Compiler、Constructor／Initializer引数、役割付与、Bootstrap Role移管結果、Proxy Implementation Addressを別の公開Deployment Recordへ記録します。

## 現在未接続の範囲

GatewayとPlayerはまだローカルMock資格を利用しており、このContract Eventを読むIndexer／Read Model、Relayer、Gas Sponsorship、Reorganization／Finality処理には接続されていません。したがって、この実装だけでStreaming認可、Creator分配、法的Rights、法定会計または本番決済は成立しません。
