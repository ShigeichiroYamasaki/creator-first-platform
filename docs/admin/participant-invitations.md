---
title: 公開実験 参加申請・招待管理
description: 管理者がユーザおよび音楽クリエーターの参加申請を審査し、承認招待とメール送信状況を管理する非公開運用画面
robots: noindex, nofollow
search: false
outline: false
aside: false
---

# 公開実験 参加申請・招待管理

このページは公開実験の運営担当者専用です。実験参加申請を審査し、承認すると一回限りの本人登録リンクを含む参加メールを1通送ります。個別対応が必要な場合に限り、運営から直接招待を作成できます。URLを知っていることは管理者認証になりません。操作にはゲートウェーで設定した管理トークンが必要です。

## アクセス方法

1. この固定URLを開きます。GitHub Pagesから、申請データが保存されている現在のGoogle クラウドVMへ自動的に移動します。
2. 運営用Macのターミナルで`deployment/gcp/copy-admin-token.sh`を実行します。macOSキーチェーンから管理トークンがクリップボードへ一時的にコピーされ、90秒後に消去されます。
3. 「Gateway管理トークン」へ貼り付けます。
4. 「認証して一覧を取得」を押し、「審査待ち」の申請を確認します。
5. 承認する場合は「承認してメール送信」を押します。参加登録用の一回限りリンクが本人へメール送信されます。
6. 本人が招待リンクで仮想通貨ワレットを登録すると、運営ワーカーがPolygon Amoy上の参加承認と初回Test POL配布を自動的に開始します。
7. 一覧を再取得し、「オンチェーン承認・初回POL配布済み」と、承認記録およびPOL配布記録の両方が表示されたことを確認します。
8. 自動処理が失敗または中断した場合だけ、「運営処理を再実行」または「運営処理を再開」を押します。同じ参加者IDと操作IDを使うため、完了済みの段階を重複実行しません。

管理トークンをメール、チャット、Git、ブラウザのパスワード保存機能へ登録しないでください。このページを再読み込みすると、入力したトークンは消去されます。VMには同じ値を権限制限した秘密ファイルとして保存し、VMメタデータへ渡すのは初回配置時だけとし、起動確認後にメタデータから削除します。

## Gateway管理トークンの準備

通常のログインでは、新しいトークンを生成しません。リポジトリのルートで次を実行し、すでにmacOSキーチェーンに保存されている値を90秒間だけクリップボードへコピーします。

```bash
deployment/gcp/copy-admin-token.sh
```

初回構築または管理トークンを失った場合だけ、次の生成スクリプトを使用します。既存のキーチェーン項目がある場合は上書きせず、トークン本体もターミナルへ表示しません。

<<< ../../deployment/gcp/create-gateway-admin-token.sh{bash}

新しく生成したトークンは、そのままではVMの値と一致しません。次の順番でVMへ反映します。これは管理権限を変更する復旧操作であり、通常のログイン時には実行しません。

```bash
deployment/gcp/create-gateway-admin-token.sh
deployment/gcp/provision-gateway-admin-token.sh creator-first-navidrome-demo us-west1-b
gcloud compute instances reset creator-first-navidrome-demo --zone us-west1-b
# VMのhealthy表示と管理者APIの認証成功を確認した後に実行
gcloud compute instances remove-metadata creator-first-navidrome-demo \
  --zone us-west1-b \
  --keys gateway-admin-token
```

VMへ一時的に渡す処理の実体は次のスクリプトです。秘密値は一時ファイルから渡し、終了時に上書きして削除します。

<<< ../../deployment/gcp/provision-gateway-admin-token.sh{bash}

運営ワーカーの秘密鍵は管理トークンとは別のPolygon Amoy専用鍵です。氏名、メールアドレスまたはその単純なハッシュをブロックチェーンへ記録せず、暗号学的にランダムな参加者IDだけを使用します。本人の招待取得、オンチェーン承認、初回POL配布および役割の本人登録は別々の監査状態として扱います。

<ParticipantAdminDemo />
