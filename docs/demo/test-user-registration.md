---
title: Test User登録デモ
description: サーバー、Wallet、送金なしで、Test UserのAlias登録とTest-only境界をブラウザ内だけで試せるデモ。
---

# Test User登録デモ

このページはGitHub Pages上でそのまま利用できます。ローカルサーバーの起動やWallet接続は不要です。

::: warning ブラウザ内のUIシミュレーションです
このデモは入力を現在のタブのSession Storageだけに保存します。Gateway、Blockchain、Smart Contract、Navidromeまたは外部サービスへ送信せず、Platform Account、本人確認、Subscription、Wallet Link、SBTまたは再生権限を作成しません。
:::

<ClientOnly>
  <TestUserRegistrationDemo />
</ClientOnly>

## Gateway連携版との違い

| 項目 | このページ | ローカルGateway連携版 |
| --- | --- | --- |
| 事前準備 | 不要 | Node.js 24でPlayerとGatewayを起動 |
| 保存先 | 現在のタブのSession Storage | Gateway ProcessとローカルSQLite監査記録 |
| Network送信 | なし | 同一OriginのローカルGatewayだけ |
| 用途 | Alias登録、Notice、状態表示の体験 | API、Cookie Session、Idempotency、監査境界の開発検証 |
| 認可への影響 | なし | なし |

APIを含む開発者向け検証は[ローカルStreaming Gateway](/demo/local-gateway)を参照してください。
