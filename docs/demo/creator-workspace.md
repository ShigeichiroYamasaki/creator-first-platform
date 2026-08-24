---
title: テスト音楽クリエーター利用フローデモ
description: テスト音楽クリエーターがSepolia Wallet、音楽クリエーターコミットメント登録、作品の権利自己申告Commitmentを試す公開Testnetデモ。
---

# テスト音楽クリエーター利用フローデモ

最小の音楽クリエーター利用フローとして、仮名Profile登録後にWalletをSepoliaへ接続し、音楽クリエーターコミットメントと作品の権利自己申告Commitmentを登録できます。

::: warning Testnet専用・権利未確認
Profileと作品名は現在のタブだけに保存し、Sepoliaにはsalt付きHash、Wallet Address、状態、Transactionだけを記録します。これは本人確認、Rights Verification、配信許諾、Payee確認、作品公開または報酬確定ではありません。
:::

<ClientOnly>
  <TestnetCreatorJourneyDemo />
</ClientOnly>

本番候補ではWorkspaceを操作面、音楽クリエーターAPI／BFFを認証・権限境界とし、Identity、Catalog、Media、Rights、Usage、DistributionおよびSettlementのSource of Truthを分離します。公開Chain上の自己申告Hashだけで権利や支払を承認しません。
