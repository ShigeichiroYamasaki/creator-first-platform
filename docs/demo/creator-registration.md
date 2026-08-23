---
title: Test Creator登録デモ
description: 音楽クリエータ向けの仮名Profile登録と、本人・権利・契約・支払資格を分離する境界をブラウザ内で試すページ。
---

# Test Creator登録デモ

このページはGitHub Pages上で利用できます。登録内容は現在のタブのSession Storageだけに保存されます。

::: danger 入力しない情報
実名、住所、メール、電話番号、本人確認書類、契約、権利資料、税務・銀行情報、Password、秘密鍵、Seed Phrase、Wallet Address、実在作品または未公開音源を入力しないでください。
:::

<ClientOnly>
  <CreatorRegistrationDemo />
</ClientOnly>

Creator Profileの作成は参加申請のUIシミュレーションです。Creator Entity、Legal Identity、Rights Holder、PayeeおよびWallet Controlはそれぞれ独立した審査・記録を必要とします。
