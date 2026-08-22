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

`http://127.0.0.1:5173/#/register`では、Aliasだけを使うTest Userを登録できます。これはGateway ProcessとCookie Session内だけで有効なTest-only Profileであり、本番Platform Account、本人確認、AuthenticatorまたはWallet Linkではありません。

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
- Playback SessionはAccount、Track、Rights version、Media mappingおよび5分の期限へBoundする
- Client指定のUpstream URL、Navidrome ID、Trusted Identity Headerおよび複数Rangeを受け付けない
- Delivery Evidenceは`.local/gateway.sqlite`へ保存し、詳細なWallet情報を記録しない
- Node.js組込みSQLite APIはNode 24時点でExperimentalであり、本番Databaseの選定ではない

## Commands

- `npm run gateway:dev`: 合成音源を生成してGatewayを起動
- `npm run gateway:test`: 認可、Owner binding、Range、SIWE、EIP-712、SBT資格を統合テスト
- `npm run gateway:validate`: 必須のGateway境界がSourceとTestに存在することを検査
