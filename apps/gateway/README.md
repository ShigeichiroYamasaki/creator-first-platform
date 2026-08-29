# Creator First Streaming Gateway MVP

Node.js 24の組込みHTTP ServerとSQLiteを使うローカルデモ用Gatewayです。PlayerへCanonical Trackだけを公開し、Subscription、Rights、Supporter Tier、短命Playback Session、同時再生Lease、Range配信およびDelivery EvidenceをGateway境界で評価します。

## Local demo

Repository Rootから2つのTerminalを使います。

```sh
# Terminal 1
npm run gateway:dev

# Terminal 2
npm run player:dev:gateway
```

Playerは`http://127.0.0.1:5173`、Gateway healthは`http://127.0.0.1:8787/api/v1/health`です。既定のFile Media AdapterはRepositoryが生成する5秒の合成WAVだけを読みます。

JPKI・パスキー・MetaMask結合デモは、Gatewayと文書サイトを別ターミナルで起動します。

```sh
# Terminal 1
npm run gateway:dev

# Terminal 2
npm run docs:dev
```

`http://127.0.0.1:5173/creator-first-platform/demo/test-user-registration`を開きます。VitePressの`/api`プロキシによりWebAuthn画面とGatewayが同一オリジンになり、ローカルRP ID `127.0.0.1`でパスキーを登録できます。

参加者の事前登録管理を試す場合は、高エントロピーの管理トークンをシェルだけに設定してGatewayを起動します。

```sh
GATEWAY_ADMIN_TOKEN='ローカル試験用に生成した十分長いランダム値' npm run gateway:dev
```

参加希望者はユーザまたは音楽クリエータの体験ページでメールアドレスを入力して申請し、最初に届く確認リンクを開きます。確認リンクは仮名・仮想通貨ワレット・音楽機能を含まない専用の`/creator-first-platform/demo/participant-application-status`へ遷移し、メール確認と審査待ち状態だけを表示します。次に`http://127.0.0.1:5173/creator-first-platform/admin/participant-invitations`を開くと、管理者はメール確認済みの申請を審査できます。承認すると、参加者のEOAを知らない状態でユーザ／音楽クリエーター資格と期限を持つ一回限りの招待URIがメール送信されます。参加者は招待URIからMetaMaskを接続し、SIWE署名後に本人登録します。管理者による個別招待は例外対応として利用できます。管理ページは公開ナビゲーションへ載せず`noindex`としていますが、URL秘匿は認証ではありません。

既定の`GATEWAY_MAIL_MODE=outbox`はメールを外部送信せず、テスト用Outboxへ保存します。メール送信事業者へ接続する場合は、秘密情報をブラウザへ置かず、Gatewayから認証付きWebhookを呼びます。

```sh
GATEWAY_ADMIN_TOKEN='十分長いランダム値' \
GATEWAY_MAIL_MODE=webhook \
GATEWAY_MAIL_WEBHOOK_URL='https://mail-adapter.example/api/send' \
GATEWAY_MAIL_WEBHOOK_TOKEN='メールアダプター専用トークン' \
GATEWAY_APPLICATION_STATUS_PUBLIC_URL='https://public.example/creator-first-platform/demo/participant-application-status' \
npm run gateway:dev
```

少人数の無償版運用実験では、`11rou.yamasaki@gmail.com`を送信元とするGmail SMTPモードも選択できます。Googleアカウントの通常パスワードは使用せず、2段階認証を有効にしたうえでこのゲートウェー専用に発行したアプリパスワードだけを使います。アプリパスワードはチャット、Git、ブラウザ、VMメタデータへ恒久保存せず、実行環境の秘密情報として設定します。

```sh
GATEWAY_ADMIN_TOKEN='十分長いランダム値' \
GATEWAY_MAIL_MODE=gmail-smtp \
GATEWAY_GMAIL_ADDRESS='11rou.yamasaki@gmail.com' \
GATEWAY_GMAIL_APP_PASSWORD='専用アプリパスワード' \
npm run gateway:dev
```

コンテナやVMでは、秘密を環境変数へ展開せず、権限を制限したファイルを指定します。

```sh
GATEWAY_ADMIN_TOKEN_FILE=/run/secrets/admin-token \
GATEWAY_MAIL_MODE=gmail-smtp \
GATEWAY_GMAIL_ADDRESS='11rou.yamasaki@gmail.com' \
GATEWAY_GMAIL_APP_PASSWORD_FILE=/run/secrets/gmail-app-password \
npm run gateway:dev
```

Gmail送信は暗黙TLS（465）を優先し、接続できない場合だけSTARTTLS（587）へ切り替えます。公開実験の確認メールと審査結果に限定し、宣伝メールや不特定多数への配信には使用しません。送信量、迷惑メール判定、アカウント停止、アプリパスワード失効の影響を受けるため、本番系では独自ドメインのトランザクションメールサービスへ移行します。

IPv6専用ホスト上のIPv4専用Dockerブリッジでは、ホストの`172.31.0.1:1465`から`smtp.gmail.com:465`のIPv6接続だけへ転送する限定TCP中継を使用します。ゲートウェーには`GATEWAY_GMAIL_CONNECT_HOST=172.31.0.1`、`GATEWAY_GMAIL_IMPLICIT_TLS_PORT=1465`、`GATEWAY_GMAIL_NETWORK_FAMILY=4`を設定します。TLSの検証対象名は中継先でも`smtp.gmail.com`のままで、アプリパスワードを中継プロセスへ渡しません。通常のデュアルスタック環境ではこれらを未設定（自動選択）のままとします。

`http://127.0.0.1:5173/#/register`では、Aliasだけを使うTest Userを登録できます。これはGateway ProcessとCookie Session内だけで有効なTest-only Profileであり、本番Platform Account、本人確認、AuthenticatorまたはWallet Linkではありません。Gatewayは別途、起動時に合成Demo Principalを自動生成してMock認可に使用するため、Test User登録の有無はPlayback、Subscription、WalletまたはSBT資格を変更しません。

## Navidrome adapter

Navidromeを使用する場合は、内部URL、専用User Credential、各Canonical Trackに対応する内部Media IDを明示します。

```sh
GATEWAY_MEDIA_ADAPTER=navidrome \
NAVIDROME_INTERNAL_URL=http://127.0.0.1:4533 \
NAVIDROME_USERNAME=creator-first-gateway \
NAVIDROME_PASSWORD='set-in-the-shell-only' \
NAVIDROME_MEDIA_ID_TRACK_MOCK_001='approved-media-id' \
NAVIDROME_MEDIA_ID_TRACK_MOCK_002='approved-media-id' \
NAVIDROME_MEDIA_ID_TRACK_MOCK_003='approved-media-id' \
npm run gateway:dev
```

Credential、内部Media ID、OpenSubsonic URLまたは`Remote-User`をPlayerへ返しません。Navidrome modeは、専用User、Network Isolation、Rights確認済みMappingを準備した場合だけ使用してください。

## Safety boundary

- 固定のMock SubscriptionとMock RightsをActiveとして扱うローカル試験専用実装
- Wallet署名はSIWE messageとEIP-712 Support Intentに対して復元検証する
- Supporter SBT、Early判定、RelayerおよびBlockchain TransactionはMockであり、JPYCを扱わない
- Test User登録ではAlias、同意版、Opaque IDだけを扱い、メール、電話番号、Passwordまたは法的氏名を収集しない
- 事前登録メールは参加者管理の明示目的でだけGatewayへ保存し、公開招待API、URLおよび公開チェーンへ返さない
- Gmailの通常パスワードは使用せず、専用アプリパスワードをGit、ログ、公開JavaScriptまたはメール監査記録へ保存しない
- 申請、メール確認、運営審査、招待状、メール配信、SIWEによる本人登録、オンチェーン役割登録およびTest POL配布を別状態として監査する
- JPKI連携は明確に表示した非暗号学的モックだけとし、実カード、電子証明書、暗証番号、氏名、住所またはマイナンバーを取得しない
- WebAuthnはchallenge、origin、RP ID、署名、ユーザ検証、資格情報、カウンタおよびバックアップ状態をサーバ側で検証する
- MetaMask結合はPolygon Amoy限定の短命EIP-712意思表示であり、送金、Approve、課金または権利付与を含まない
- Playback SessionはAccount、Track、Rights version、Media mappingおよび5分の期限へBoundする
- Client指定のUpstream URL、Navidrome ID、Trusted Identity Headerおよび複数Rangeを受け付けない
- Delivery Evidenceは`.local/gateway.sqlite`へ保存し、詳細なWallet情報を記録しない
- Node.js組込みSQLite APIはNode 24時点でExperimentalであり、本番Databaseの選定ではない

## Commands

- `npm run gateway:dev`: 合成音源を生成してGatewayを起動
- `npm run gateway:test`: 認可、Owner binding、Range、SIWE、EIP-712、SBT資格を統合テスト
- `npm run gateway:validate`: 必須のGateway境界がSourceとTestに存在することを検査
