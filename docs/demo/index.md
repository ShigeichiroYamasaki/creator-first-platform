---
title: Testnet Demo
description: Creator First Platformの本番実装前に、合成データと金銭的価値を持たないTestnetでVertical Sliceを検証するデモ入口。
---

# Testnet Demo

Creator First Platformは、まずTestnet上のデモシステムでProtocol、Streaming Gateway、Smart Contract連携、失敗時の挙動を検証し、その証拠をレビューした後に本番系を実装します。

::: warning 公開デモは現在準備中です
ローカルPlayer MVPは合成試験音とMock資格だけで利用できますが、公開Testnetサービスではありません。公開URL、Network、Contract Address、検証済みCommitが確定するまで、外部サイトが提示する送金先・Token・Wallet接続を公式デモとして扱わないでください。
:::

## 実装順序

```mermaid
flowchart LR
    SPEC[Draft Specification]
    MOCK[Local Mock]
    DEMO[Testnet Demo]
    REVIEW[Security / Rights / Legal Review]
    AUDIT[Independent Audit]
    PROD[Production Implementation]

    SPEC --> MOCK --> DEMO --> REVIEW --> AUDIT --> PROD
```

1. 合成Account、Mock Rights、Mock音源、金銭的価値を持たないTestnet AssetでVertical Sliceを実装する。
2. 正常系だけでなく、replay、duplicate、delay、outage、取消し、権利停止、緊急停止を検証する。
3. 使用Network、Contract Address、Source Commit、既知の制約、データ取扱いを公開する。
4. 法務・Rights・Privacy・SecurityレビューとSmart Contract監査を終える。
5. Testnet成果物をそのまま本番へ流用せず、本番用の鍵、権限、インフラ、契約、監視、復旧手順を別Gateで実装する。

## サービスを選ぶ

利用者向けと音楽クリエータ向けの入口を分離しました。それぞれのページで「登録」と「利用」を選択できます。公開ページのBrowser Demoはサーバー起動、Wallet接続、Tokenまたは送金を必要としません。

<DemoServiceChoices kind="entry" />

Browser Demoの入力は現在のタブのSession Storageだけに保存され、Gateway、Blockchainまたは外部サービスへ送信されません。Test Userの登録はPlayback、Wallet Link、SubscriptionまたはSBT資格の認可条件にも使用しません。Test Creatorの登録もPlatform Account、本人確認、Rights、配信公開または報酬受取資格を作成しません。

## 音楽クリエータ向け機能デモ

音楽クリエータは、実名や実在作品を使わずに仮名のCreator Profileを登録し、Creator Workspaceで作品Draft、Rights申告状態、確認Task、合成Analyticsを試せます。最初に登録画面を試す場合と、登録済みFixtureで機能を利用する場合の入口を分けています。

<DemoServiceChoices kind="creator" />

「登録する」は[Test Creator登録デモ](/demo/creator-registration)、「利用する」は[Creator Workspaceデモ](/demo/creator-workspace)へ移動します。どちらも現在のタブ内だけで動作し、本人確認、権利確認、音源Upload、配信公開、報酬計算または支払処理を行いません。

Gateway APIとCookie Sessionを含む開発者向け検証は、[ローカルStreaming Gateway](/demo/local-gateway)を起動してPlayerを利用します。

## 現在の状態

| 項目 | 状態 |
| --- | --- |
| 公開デモURL | 準備中 |
| 対象Testnet | Sepolia（Infura RPC、デプロイ前） |
| Demo Contract Address | 未デプロイ |
| Streaming Gateway | [ローカルMock実装済み](/demo/local-gateway)、公開環境未デプロイ |
| Navidrome Media Adapter | Adapter実装済み、専用User・非公開Network・Canonical Mapping未設定 |
| Player PWA | ローカルGateway接続済み、公開環境未デプロイ |
| Test Userサービス | GitHub Pagesの登録・合成Catalog導線とローカルGateway版を実装済み、本番Authenticator未実装 |
| Test Creatorサービス | GitHub PagesのCreator Profile登録・作品Draft・確認状態・合成Analyticsを実装済み、本人／権利／公開／支払処理は未実装 |
| Testnet Smart Contract | [Hardhat 3実装・ローカルテスト済み](/demo/testnet-contracts)、Sepolia未デプロイ、Gateway未接続 |
| Testnet決済 | MockJPYC Subscription／Treasuryを実装・ローカルテスト済み、公開決済未提供 |
| Rights / Usage / Distribution | Draft仕様、未実装 |

進捗と成立条件は[現在の状況](/status)、[Vertical Slice Implementation Plan](/protocol/implementation-plan)、[Decision Baseline](/protocol/decision-baseline)で確認できます。

公開Testnetの前段階として、[ローカル音楽ストリーミング](/demo/local-streaming)と[ローカルStreaming Gateway](/demo/local-gateway)で合成試験音を検証できます。

## 本番移行の禁止条件

次の条件が一つでも残る間は、本番資金、実在Rights、未公開音源、個人情報または本番Walletを扱いません。

- Blocking Open Questionまたは未失効のMock Assumptionが残る
- Chain、Asset、Contract、Rights、Usage、Distributionの照合が再現できない
- Threat Model、独立Security Review、Smart Contract監査が完了していない
- 法務・Rights・税務・Privacy・OSS Licenseの承認記録がない
- Incident response、停止、復旧、鍵Rotation、Rollbackが訓練されていない

デモが公開された時点で、このページの「公開デモURL」「対象Testnet」「Contract Address」「Source Commit」を更新します。
