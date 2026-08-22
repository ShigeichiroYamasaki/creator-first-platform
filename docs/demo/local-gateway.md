---
title: ローカルStreaming Gateway
description: 合成音源、Mock Subscription、Mock RightsおよびWallet署名を使ってPlayerからGateway経由の再生を検証する手順。
search: false
---

# ローカルStreaming Gateway

Creator First PlayerとStreaming Gatewayを同一Originの開発Proxyで接続し、短命Playback Session、SBT資格、Range配信、Owner BindingおよびDelivery Evidenceを検証できます。

::: warning Local Mock専用です
実JPYC、実SBT、実Subscription、実Rightsまたは価値のある特権を扱いません。既定のMedia AdapterはRepositoryが生成する5秒の合成WAVだけを読みます。InternetやLANへ公開しないでください。
:::

Test User登録はAlias表示とNotice確認のUIを検証するTest-only Profileです。Gatewayが自動生成する合成Demo Principalとは別のProfileであり、Protocol上のPlatform Account、Authenticator、Wallet Link、SubscriptionまたはSBT資格を作成しません。登録の有無は再生認可を変更しません。

## 起動

Node.js 24を使用し、Repository Rootで依存関係を準備します。

```sh
nvm use 24
npm ci
```

2つのTerminalを開きます。

```sh
# Terminal 1
npm run gateway:dev
```

```sh
# Terminal 2
npm run player:dev:gateway
```

`http://127.0.0.1:5173`を開きます。Viteの`/api` Proxyだけが`127.0.0.1:8787`のGatewayへ接続し、PlayerはMedia Adapter URLまたは内部IDを受け取りません。

## 確認シナリオ

1. `First Light`を選び、Gatewayが発行した短命Playback Sessionで合成音を再生する。
2. 未登録状態で`Supporter Signal`を選び、`SUPPORTER_REQUIRED`で拒否されることを確認する。
3. EIP-1193対応Walletを接続し、SIWE messageへ署名する。
4. Support Intentの公開範囲、譲渡不能性、Creator、Gas SponsorshipおよびJPYCを含まないことを確認してEIP-712へ署名する。
5. Mock `EARLY_SUPPORTER`がActiveになった後、限定曲とCommunity Capabilityを確認する。

通常再生ではWallet署名を要求しません。秘密鍵はPlayerまたはGatewayへ渡しません。

## 実装済みの境界

- Canonical Trackと非公開Media Referenceの分離
- 固定Mock Subscription／Rightsを前提とするfail-closed Policy評価
- 5分のOpaque Playback SessionとAccount Owner Binding
- Accountあたり1本のConcurrency Lease
- 単一HTTP Range、`206 Partial Content`、SeekおよびClient切断時の中断
- SIWE署名とEIP-712 Support Intent署名の復元検証
- Alias限定Test User Profileと、同意Versionを含むローカル監査記録（Account登録・Authenticatorではない）
- SQLiteへのAuthorization Decision、SessionおよびDelivery Evidence記録
- 月間800 MiB到達後の新規Session停止
- 任意Upstream URL、内部Media ID、Query token、`Remote-User`および複数Rangeの拒否

## Navidromeとの接続

GatewayにはNavidrome Media Adapterも実装されています。ただし利用には、Gateway専用Navidrome User、非公開Network、Rights確認済みCanonical MappingおよびCredential管理が必要です。設定例と制限はRepositoryの[`apps/gateway/README.md`](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/apps/gateway/README.md)を参照してください。

現段階ではAAC等の実楽曲を登録せず、合成試験音でGateway境界を検証します。
