---
title: テストユーザ利用フローデモ
description: テストユーザ登録、Sepolia Wallet、mockJPYC Subscription、合成音源Playerを順番に試せるTestnetデモ。
---

# テストユーザ利用フローデモ

このページはGitHub Pages上で利用でき、テストユーザ登録、EIP-1193 Wallet接続、Ethereum Sepolia上のmockJPYC取得・利用承認・Subscription、合成音源Player操作を一続きで検証する入口です。

::: warning Testnet専用です
SepoliaのContract AddressとSource Commitを公開し、mockJPYCの取得・Approve・Subscriptionを有効化しました。tJPYCは無価値・償還不可で実在JPYCではなく、Sepolia ETHはGasにだけ使用します。Gateway、Navidrome、本番Accountまたは本番決済とは未接続です。
:::

<ClientOnly>
  <TestnetUserJourneyDemo />
</ClientOnly>

## データと資産の境界

| 項目 | この公開Journey | ローカルGateway連携版 |
| --- | --- | --- |
| Profile | AliasとテストユーザIDを現在のタブだけに保存 | GatewayのDemo PrincipalとCookie Session |
| Wallet | ユーザが明示接続。AddressとTransactionは公開Chainに記録 | SIWE／EIP-712署名境界をローカル検証 |
| 支払資産 | 無価値・償還不可の`tJPYC`だけ。Sepolia ETHはGasのみ | 固定Mock Subscription |
| Player | ページ内で生成する短い合成WAV。PreviewとSubscription限定Track | Gateway経由の合成音源、Range、短命Playback Session |
| Streaming認可 | Sepolia SubscriptionによるUI解放だけ | Gateway CapabilityとDelivery Evidence |
| Navidrome | 未接続 | 明示Mapping型Adapterを選択可能 |

公開JourneyのSubscription状態は、まだGatewayのPlayback AuthorizationやNavidromeへ接続されません。API、Cookie、Range、Concurrency、監査境界を含む検証は[ローカルStreaming Gateway](/demo/local-gateway)を参照してください。

## 操作順序

1. 個人情報を含まないAliasでテストユーザプロフィールを登録する。
2. Walletを明示的に接続し、Chain ID `11155111`のSepoliaへ切り替える。
3. 公開済みManifestが`active`の場合だけ、一回限りの`2,000 tJPYC`を取得する。
4. Plan価格だけをSubscription ContractへApproveし、Subscriptionを開始する。
5. Preview Trackを操作し、有効なSubscriptionでは限定合成Trackが解放されることを確認する。

Seed Phraseや秘密鍵は入力しません。本番Wallet、本番資金、Mainnet Asset、実在JPYC、実在楽曲または個人情報を使わないでください。
