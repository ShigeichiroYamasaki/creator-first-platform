---
title: Creator Workspaceデモ
description: Test Creatorが作品Draft、権利申告状態、確認Task、合成Analyticsと未確定収益表示をブラウザ内で試すページ。
---

# Creator Workspaceデモ

最小のCreator Journeyとして、Creator登録後に作品Draftを作成し、Rights、本人確認、報酬受取の状態が別々であることを確認できます。

::: warning Browser fixture
データは現在のタブのSession Storageだけに保存されます。作品を公開せず、音源をUploadせず、Rightsを検証せず、再生数や報酬を確定しません。表示されるSupporter数とMockJPYC見込額は固定の合成値です。
:::

<ClientOnly>
  <CreatorWorkspaceDemo />
</ClientOnly>

本番候補ではWorkspaceを操作面、Creator API／BFFを認証・権限境界とし、Catalog、Media、Rights、Usage、DistributionおよびSettlementのSource of Truthを分離します。

