---
title: MetaMaskのインストールとPolygon Amoy接続
description: 初めてのユーザがMetaMaskブラウザ拡張機能を安全にインストールし、Creator First PlatformのテストネットデモでPolygon Amoyへ接続する手順。
---

# MetaMaskのインストールとPolygon Amoy接続

このページでは、パソコンのブラウザへMetaMaskをインストールし、Creator First Platform（CFP）のテストネットデモで使用するPolygon Amoyへ接続するまでを説明します。操作には金銭的価値を持たないテストネットだけを使用します。

::: danger 最初に確認してください
- MetaMaskは必ず[MetaMask公式サイト](https://metamask.io/)からインストールしてください。検索広告や第三者が送ったダウンロードリンクを使用しません。
- シークレットリカバリーフレーズ、秘密鍵、MetaMaskのパスワードは誰にも教えません。CFPが入力、送信または画面共有を求めることもありません。
- 本番資産を保有するウォレットではなく、デモ専用の新しいアカウントを使ってください。
- AmoyのPOLとmockJPYCには金銭的価値がありません。購入、換金または実在JPYCとの交換をしません。
:::

## 1. 準備するもの

- Google Chrome、FirefoxまたはBraveの最新版
- 紙など、シークレットリカバリーフレーズをオフラインで保管できるもの
- CFPの[テストネットデモ](/demo/)

この手順ではパソコン版のMetaMaskブラウザ拡張機能を使用します。共用パソコンや他人のブラウザプロフィールでは操作しないでください。より明確に分離したい場合は、このデモ専用のブラウザプロフィールを作成します。

## 2. MetaMaskをインストールする

1. [MetaMask公式サイト](https://metamask.io/)を開く。
2. `Get MetaMask`を選び、使用しているブラウザの公式拡張機能ストアへ進む。

![MetaMask公式サイト右上のGET METAMASKボタンが強調された画面](/images/guides/metamask/get-metamask.png)

*図1：MetaMask公式サイトでは右上の「GET METAMASK」から公式ストアへ進みます。出典：[MetaMask公式インストール手順](https://support.metamask.io/start/getting-started-with-metamask)、2026年8月28日取得。*

3. Chrome／Braveでは「Chromeに追加」、Firefoxでは「Firefoxへ追加」を選ぶ。
4. ブラウザが表示する権限を確認して、拡張機能の追加を承認する。
5. ブラウザの拡張機能メニューを開き、MetaMaskをツールバーへ固定する。

![Chrome拡張機能ストアにあるMetaMask公式ページとAdd to Chromeボタン](/images/guides/metamask/chrome-store.png)

*図2：Chromeの場合は、提供元がMetaMask公式であることを確認して「Add to Chrome」を選びます。評価数やユーザ数は取得時点の表示であり、真正性の判断をそれだけに依存しません。出典：[MetaMask公式インストール手順](https://support.metamask.io/start/getting-started-with-metamask)、2026年8月28日取得。*

MetaMask公式ヘルプの[インストール手順](https://support.metamask.io/start/getting-started-with-metamask)も確認できます。古い配布ファイルを手動で読み込んだり、非公式ストアからインストールしたりしないでください。

## 3. デモ用ウォレットを準備する

初めてMetaMaskを使う場合は「新しいウォレットを作成」を選び、画面の案内に従います。すでにMetaMaskを使用している場合は、本番資産を保有していないデモ専用アカウントを選びます。

1. 推測されにくく、他サービスで使っていないMetaMask用パスワードを設定する。
2. シークレットリカバリーフレーズを紙などへ正確に記録し、オフラインで保管する。
3. フレーズをスクリーンショット、クラウドメモ、メール、チャットへ保存しない。
4. MetaMaskが求める確認を終え、ウォレット画面を開く。
5. 画面上部のアカウントがデモ用であることを確認する。

パスワードを忘れた場合やブラウザを失った場合、シークレットリカバリーフレーズが復旧手段になります。CFPはこれを保管・復旧できません。

## 4. 推奨手順：デモ画面からPolygon Amoyへ切り替える

1. CFPの[テストユーザ利用フロー](/demo/test-user-registration)を開く。
2. 「ウォレットを接続」を押す。
3. MetaMaskが接続先サイトと接続するアカウントを表示したら、CFPのGitHub Pagesドメインとデモ用アカウントであることを確認して承認する。
4. Polygon Amoyへの切替要求が表示されたら、ネットワーク名、チェーンID、通貨記号を確認して承認する。
5. Amoyが未登録の場合は、MetaMaskがネットワーク追加画面を表示する。次の値と一致することを確認して追加する。

| 項目 | 正しい値 |
| --- | --- |
| ネットワーク名 | Polygon Amoy |
| チェーンID | `80002`（16進表示では`0x13882`） |
| 通貨記号 | `POL` |
| ブロックエクスプローラー | `https://amoy.polygonscan.com/` |

追加後、MetaMaskで接続中のネットワークが「Polygon Amoy」と表示されれば完了です。MetaMaskは接続サイトごとに異なるネットワークを使用できるため、別サイトの表示ではなくCFPデモに接続しているネットワークを確認します。

## 5. 自動追加できない場合：手動で追加する

MetaMaskの画面構成は版によって少し異なります。おおむね次の順に操作します。

1. MetaMask右上のメニューから「ネットワーク」を開く。

![MetaMask右上のメニューとNetworks項目が強調された公式サンプル画面](/images/guides/metamask/networks-menu.png)

*図3：右上のメニューから「Networks」を開きます。画面内のアカウント名・残高・トークンはMetaMask公式ヘルプの説明用サンプルであり、CFPやユーザの情報ではありません。出典：[MetaMask公式ネットワーク追加手順](https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc)、2026年8月28日取得。*

2. 「カスタムネットワークを追加」または同等の項目を選ぶ。

![MetaMaskのManage networks画面下部にあるAdd a custom networkボタン](/images/guides/metamask/add-custom-network.png)

*図4：「Manage networks」の下部にある「Add a custom network」を選びます。出典：[MetaMask公式ネットワーク追加手順](https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc)、2026年8月28日取得。*

3. 次の値を入力する。

![MetaMaskのカスタムネットワーク追加フォーム](/images/guides/metamask/custom-network-form.png)

*図5：ネットワーク名、RPC URL、チェーンID、通貨記号、ブロックエクスプローラーURLを入力する画面です。図は空欄の公式サンプルなので、値は直後の表から入力します。出典：[MetaMask公式ネットワーク追加手順](https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc)、2026年8月28日取得。*

| 入力欄 | 値 |
| --- | --- |
| ネットワーク名 | `Polygon Amoy` |
| RPC URL | `https://polygon-amoy.drpc.org` |
| チェーンID | `80002` |
| 通貨記号 | `POL` |
| ブロックエクスプローラーURL | `https://amoy.polygonscan.com/` |

4. 「保存」を押す。
5. ネットワーク一覧から「Polygon Amoy」を選ぶ。
6. CFPデモへ戻り、「ウォレットを接続」またはネットワーク切替をもう一度実行する。

このネットワーク情報はPolygon公式文書の[RPCエンドポイント](https://docs.polygon.technology/pos/reference/rpc-endpoints)で確認できます。カスタムネットワークはMetaMask自身が真正性を保証するものではないため、追加前に公式情報と照合してください。詳しくはMetaMask公式の[ネットワーク追加手順](https://support.metamask.io/configure/networks/how-to-add-a-custom-network-rpc)と[カスタムネットワークの検証方法](https://support.metamask.io/configure/networks/verifying-custom-network-information)を参照してください。

## 6. 接続を確認する

次のすべてを確認します。

- MetaMaskの接続ネットワークがPolygon Amoyである
- チェーンIDが`80002`である
- CFPデモに表示されたウォレットアドレスとMetaMaskで選択したアドレスが一致する
- CFPの[公開マニフェスト](/testnet/deployment.json)が`networkName: Polygon Amoy`、`chainId: 80002`、`status: active`を示している
- トランザクション確認画面のネットワークがPolygon Amoyである

接続しただけでは送金やSBT発行は行われません。mockJPYCの取得、利用承認、サブスクリプション、サポータ登録、SBT発行はそれぞれ別の操作であり、MetaMaskで内容を確認してから個別に承認します。

## 7. よくある問題

### 「ネットワークがすでに存在します」と表示される

同じチェーンIDのネットワークが登録済みです。新しく重複登録せず、ネットワーク一覧から既存のAmoyを選びます。登録内容が不明な場合は、ネットワークの編集画面でチェーンIDとエクスプローラーURLを上の表と照合します。

### 「チェーンIDを取得できません」またはRPCエラーになる

RPC URLの入力間違い、通信制限またはRPCの一時障害が考えられます。まず末尾の空白がないことを確認します。改善しない場合は、Polygon公式チュートリアルにも掲載されている代替RPC URL `https://rpc-amoy.polygon.technology/`を試します。

### Amoyがネットワーク一覧に見つからない

ネットワーク一覧の「テストネットを表示」を有効にするか、「カスタムネットワークを追加」を開きます。MetaMask公式の[テストネット表示手順](https://support.metamask.io/configure/networks/how-to-view-testnets-in-metamask)も参照してください。

### MetaMaskを接続したのにデモがAmoyにならない

MetaMaskでは接続サイトごとにネットワークが管理される場合があります。CFPデモを開いた状態でMetaMaskの接続サイト表示を確認し、その接続についてPolygon Amoyを選びます。一度ページを再読み込みしてから再接続することも有効です。

### POL残高がゼロで書込み操作ができない

ネットワーク接続だけならPOLは不要ですが、mockJPYC取得やSBT発行などのトランザクションには少量のテストPOLが必要です。Polygon公式文書の[テストトークンFaucet一覧](https://docs.polygon.technology/tools/gas/matic-faucet)から対応するAmoy Faucetを選びます。テストPOLを販売すると称する相手へ支払わないでください。

## 8. 次に試す操作

接続確認が終わったら、[テストネットデモへ戻る](/demo/)か、[テストユーザ利用フローを開始する](/demo/test-user-registration)へ進みます。
