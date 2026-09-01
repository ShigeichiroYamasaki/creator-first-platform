---
title: Polygon Amoy スマートコントラクトデモ
description: Hardhat 3、Viem、Polygon AmoyでCreator First PlatformのMockJPYC決済、サポーター SBT、音楽クリエーター登録台帳、二院制ガバナンス、透明型ZK境界を検証する手順。
---

# Polygon Amoy スマートコントラクトデモ

Hardhat 3とViemを使い、公開済みのテストネット専用コントラクトをPolygon Amoyへデプロイしました。次の表には、公開済み構成に加えて、本番向け抽選候補も示します。統合公開記録のソースコミットは`19987da6ca367635f18da8e753782c87318e678c`です。各コントラクトの元のデプロイトランザクションとソースコミットは公開デプロイ記録で区別します。

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
| `CreatorFirstTestnetLegislatorRegistrationAdapter` | 有効なmockJPYCサブスクリプションまたは活動中のテスト音楽クリエーター登録を簡略資格として、接続ウォレットを該当院へ自己登録する | テストネット専用。本人性、一人性、抽選または正式な議員資格を証明しない |
| `CreatorFirstVerifiableSortition` | 各院の索引付き適格者root、外部乱数、重複しない抽選順位、本人による議席取得、順序付き補欠有効化を拘束する | 本番向け監査候補。資格発行、root異議申立て、VRF接続、秘密性、運用統制と監査が完了するまで本番権限を与えない |
| `CreatorFirstTransparentZKMockVerifier` | 決定論的ダイジェスト比較で検証者接続だけを試す。暗号学的ZKではない | ゼロ知識性、健全性、利用実績、権利、資格または分配を証明しない |
| `CreatorFirstTransparentZKRegistry` | モック検証者プロファイル、チェーン拘束受付ID、再実行拒否、廃止、停止を検証する | 本番検証者、監査済み証明プログラムまたはmainnet受付台帳ではない |
| `CreatorFirstCreatorRegistrationAdapter` | CFP-0002用の対象IDをテスト音楽クリエーター登録台帳の初期登録時刻へ対応付ける | 自己申告テスト登録であり、本番本人性・音楽クリエーター資格の正本ではない |
| `CreatorFirstCFP0002DeploymentFactory` | 両院承認、レビュー、P2タイムロック後だけ固定saltでCFP-0002ポリシーをデプロイする | 本番デプロイヤー、正式な憲章・法務審査または監査を代替しない |
| `CreatorFirstCFP0002EarlySupporterPolicy` | 初期登録から31,536,000秒未満という排他的時間条件を判定する | SBTを発行せず、配信、金銭、権利または議決権を付与しない |
| `CreatorFirstTestnetPolDistributor` | 事前承認済み実験参加者のウォレットへ、初回最小額と承認済み操作に必要な追加テストPOLを上限付きで配布する | Amoy専用。本人性、自動判断、Faucet、報酬、本番ガス代または金銭的権利を作らない |

透明型ZKの2コントラクト、CFP-0002用音楽クリエーター登録アダプター／デプロイファクトリー、テスト議員登録アダプターを統合モジュールからPolygon Amoyへデプロイしました。`REGISTRAR_ROLE`と`RELAYER_ROLE`の付与、公開デモ会期1、透明型ZKモックプロファイルの登録まで公開RPCで検証済みです。本番向け検証可能抽選候補はローカル実装・監査前のためデプロイしていません。CFP-0002の実ポリシーは両院承認とレビュー後のガバナンス実行時にだけ作成されます。

SBTはERC-5192の`locked(tokenId)`を公開し、MintとBurn以外の移転を拒否します。初期条件の`POLICY_ROLE`、実装更新の`UPGRADER_ROLE`、署名済み意思を送る`RELAYER_ROLE`を分離し、発行済み階層を後日のポリシー更新で書き換えません。

一般サポータと初期サポータの`tokenURI`は、それぞれ[supporter.json](/sbt/supporter.json)と[early-supporter.json](/sbt/early-supporter.json)を返します。どちらもPolygon Amoy テストネット表示、公開画像、譲渡不能属性および非金銭的資格証明である旨を含み、個人情報、支援額または視聴履歴を含みません。

将来の会期別議員資格SBT用メタデータ原案として、[音楽クリエータ院議会ガバナー](/sbt/creator-house-governor.json)と[ユーザ院議会ガバナー](/sbt/user-house-governor.json)も公開します。各JSONは対応する公開画像、院、役割、譲渡不能属性、テストネット表示を持ちますが、現時点では議員資格SBTコントラクトおよび会期別`tokenURI`には未接続です。表示用SBTだけで投票権や会社権限を成立させません。

## 公開デプロイ {#public-deployment}

| コントラクト | Polygon Amoy アドレス |
| --- | --- |
| MockJPYC | [`0xC2D1…66aA`](https://amoy.polygonscan.com/address/0xC2D1fAC9517544A839D35e67008c76A1839366aA) |
| CreatorFirstSubscription | [`0xFFbB…F2BD`](https://amoy.polygonscan.com/address/0xFFbB494c89cBDDB7F2aeC85E14019f793416F2BD) |
| CreatorFirstTreasury | [`0x239f…51D7`](https://amoy.polygonscan.com/address/0x239f51DDbB1D5249865088126ff40D34734151D7) |
| SupporterSBT プロキシ | [`0x0406…AB18`](https://amoy.polygonscan.com/address/0x0406Cf42Ab5d3529ceAe869b6F05A3876379AB18) |
| SupporterSBT 実装 | [`0x42d2…593b`](https://amoy.polygonscan.com/address/0x42d2B3A45C4Ce37De7960642eBD52aBd450B593b) |
| サポータ登録アダプター | [`0x7A5b…9dd1`](https://amoy.polygonscan.com/address/0x7A5b305Bd64Be6070cfa5168C860F945f1D59dd1) |
| CreatorFirstCreatorRegistry | [`0x7823…F63c`](https://amoy.polygonscan.com/address/0x7823e12075Ab59DE11eaa1044345906C062bF63c) |
| 音楽クリエーター登録アダプター | [`0x9F74…8472`](https://amoy.polygonscan.com/address/0x9F745D597f9f0531044510051056981AE37C8472) |
| CreatorFirstBicameralGovernor V3（署名投票対応） | [`0x57a9…4215`](https://amoy.polygonscan.com/address/0x57a93F06dE83617f59bF31DD8FfbDA6FeB984215) |
| CreatorFirstGovernedPolicy V3 | [`0x5676…e6E9`](https://amoy.polygonscan.com/address/0x5676d34d7C41849311b99932d8272af58b63e6E9) |
| テスト議員登録アダプター V3 | [`0x5614…e19E`](https://amoy.polygonscan.com/address/0x5614b86D98C3AcAA25dE9135476be8014a68e19E) |
| CFP-0002デプロイファクトリー V3 | [`0x2D01…0923`](https://amoy.polygonscan.com/address/0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923) |
| 透明型ZKモック検証者 | [`0x2d61…a80f`](https://amoy.polygonscan.com/address/0x2d61d67cBe34208b524980F815358184858ba80f) |
| 透明型ZK受付台帳 | [`0x4378…cCc3`](https://amoy.polygonscan.com/address/0x4378586fE4835C4dEbe86084426f4ac98fBfcCc3) |
| テストPOL段階補充コントラクト | [`0x8a0B…12BE`](https://amoy.polygonscan.com/address/0x8a0B3F08EC1Bd4231be92320381a1bAc56D112BE) |

チェーン IDは`80002`です。[公開マニフェスト](/testnet/deployment.json)と[トランザクションを含むデプロイ記録](/testnet/deployment-record.json)を機械可読JSONで提供します。次のコマンドは公開Polygon Amoy RPCからBytecode、MockJPYC 通知／主張額、サブスクリプションの資産／資金庫／計画、ERC-1967 実装スロット、音楽クリエーター登録台帳のテストネット通知、ガバナーのチェーン／タイムロック設定およびデモポリシーとの接続を再検証します。

```sh
npm run contracts:verify:amoy
```

## ローカル検証

Node.js 24を使用します。

```sh
npm ci
npm run contracts:compile
npm run contracts:test
```

テストは、MockJPYCの一回限りの自己取得と移転、決済／支出参照の重複拒否、EIP-712 nonceのreplay拒否、初期上限、ERC-5192、SBT移転拒否、一ウォレット一音楽クリエーター、コミットメント重複拒否、リリース自己申告と音楽クリエーター限定取消し、透明型ZK境界に加え、テストPOLの初回最小配布、残高目標、操作ID再利用拒否、クールダウン、累計上限、停止・緊急回収、テスト議員の院別資格と会期締切、本番向け抽選の適格者固定、乱数権限、重複しない抽選順位、本人請求、一人一院、補欠順序、CFP-0002の投票前適合性審査、両院熟議、別集計、共同承認、事後レビュー、P2タイムロック、完全一致デプロイおよび365日境界を確認します。

## RPCとPolygon Amoyの設定

既定では検証済みの公開PublicNode RPCを使用します。専用Infura／Alchemy RPCを使う場合だけ、完全なHTTPS Endpointを実行時環境変数`AMOY_RPC_URL`へ設定します。デプロイ専用秘密鍵はHardhat 3の暗号化Keystoreへ保存します。

```sh
npx hardhat keystore set DEPLOYER_PRIVATE_KEY
```

秘密鍵は`0x`から始まる32-byte値です。Keystoreの値、`.env`、Seed Phrase、本番鍵をGitへ追加しないでください。公開RPCはレート制限や一時障害があるため、再デプロイ時はIgnition journalと残高を確認し、必要に応じて専用RPCへ切り替えます。

再デプロイ前に次を確認します。

- 対象チェーン IDがPolygon Amoyの`80002`である
- デプロイ鍵には少量のAmoy POLだけがあり、本番資産がない
- 初回Bootstrap後に`admin`、`policyManager`、`relayer`、`revoker`、`upgrader`、`treasuryDisburser`、`planManager`を分離する手順と担当アドレスがレビュー済みである
- メタデータ URIが公開前に取得可能で、画像や説明がテストネット SBTであることを明示する

## Polygon Amoyへデプロイ

既定値でデプロイする場合は次を実行します。

```sh
npm run contracts:deploy:amoy
```

同じ`amoy-creator-first-testnet`デプロイIDで再実行すると、Ignitionはjournalを読み、確定済み処理を重複送信せず未完了分だけを再開します。公開デモ会期1は2026年9月1日15:28 JSTに開始し、2026年10月1日15:28 JSTに終了します。投票クレジットは25、両院の定足数は各1人です。会期ID、規則ハッシュ、時刻、トランザクションは公開デプロイ記録で検証できます。

実行アカウントが既存SBTの`DEFAULT_ADMIN_ROLE`を失っている場合、役割付与は停止します。その場合は権限を持つ承認済み管理主体から別途付与し、エラーを迂回するために新しい管理鍵を追加しません。

初回の非公開デモデプロイでは、Ignitionが全役割をデプロイ専用アカウントへBootstrapします。公開前に各コントラクトの`grantRole`で運用アカウントへ権限を付与し、動作確認後にBootstrap アカウントの不要役割を`revokeRole`で外します。`DEFAULT_ADMIN_ROLE`を先に失わないこと、`POLICY_ROLE`と`UPGRADER_ROLE`を同じ単独鍵へ残さないこと、本番ではマルチシグ／タイムロックを含む別のデプロイポリシーを採用することが必要です。

`hardhat.config.ts`はチェーン IDを`80002`へ固定するため、Infura Endpointが別ネットワークを返す場合は停止します。Ignitionのデプロイ Journalはローカル生成物としてGit対象外です。公開デモとして扱う前に、コントラクトアドレス、トランザクション、ソースコミット、Compiler、Constructor／Initializer引数、役割付与、Bootstrap 役割移管結果、プロキシ実装アドレスを別の公開デプロイ記録へ記録します。

## 現在未接続の範囲

ゲートウェイとプレーヤーはまだローカルモック資格を利用しており、このコントラクトイベントを読むインデクサー／参照モデル、リレイヤー、ガス代支援、Reorganization／ファイナリティ処理には接続されていません。したがって、この実装だけでストリーミング認可、音楽クリエーター分配、法的権利、法定会計または本番決済は成立しません。
