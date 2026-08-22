# Creator First Player MVP

Vue 3とTypeScriptによるGateway専用Playerです。標準の`mock`モードは、合成試験音、Mock Platform Session、Mock Supporter SBTだけを扱います。Navidrome、実Token、実Contractへ直接接続しません。

```sh
npm ci
npm run player:dev
```

表示されたローカルURLを開くと、Walletなしで基本楽曲を再生できます。Supporter限定曲、Wallet接続、SIWE、EIP-712 Support Intentを試す場合はEIP-1193対応Walletが必要です。Mock Support Intentは署名を要求しますが、Transactionを送信せず、JPYC移転やToken Approvalを含みません。

`http://127.0.0.1:5173/#/register`を開くとTest User登録画面を表示します。Aliasだけを使用し、実名、メール、電話番号またはPasswordを入力しないでください。

実装済みの同一Origin Gatewayへ接続する場合は、別Terminalで`npm run gateway:dev`を起動してから次を実行します。

```sh
npm run player:dev:gateway
```

`VITE_GATEWAY_BASE`は同一OriginのPathだけを許可します。PlayerはGatewayが発行した`/v1/streams/` URLのみ再生し、保護音源、Playback Session、Wallet署名、秘密鍵を永続保存しません。

## Commands

- `npm run player:dev`: generate synthetic audio and start the local Player
- `npm run player:test`: verify stream URL and Gateway boundary rules
- `npm run player:build`: type-check and create `dist/player`
- `npm run player:validate`: validate build artifacts and source boundaries

This MVP is not a production wallet, subscription service, token issuer, or rights-cleared music service. Replace the Mock adapter only after the relevant Protocol decisions and Gateway controls are approved.
