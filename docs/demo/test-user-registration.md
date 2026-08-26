---
title: テストユーザ利用フローデモ
description: テストユーザ登録、Polygon Amoy ウォレット、mockJPYC サブスクリプション、合成音源プレーヤーとサポータSBTを順番に試せるテストネットデモ。
---

# テストユーザ利用フローデモ

このページはGitHub Pages上で利用でき、テストユーザ登録、EIP-1193 ウォレット接続、Polygon Amoy上のmockJPYC取得・利用承認・サブスクリプション、合成音源プレーヤー操作、サポータ登録とSBT確認を一続きで検証する入口です。

::: warning テストネット専用です
Polygon Amoyのコントラクトアドレスとソースコミットを公開し、mockJPYCの取得・Approve・サブスクリプションを有効化しました。tJPYCは無価値・償還不可で実在JPYCではなく、Amoy POLはガスにだけ使用します。ゲートウェイ、Navidrome、本番アカウントまたは本番決済とは未接続です。
:::

<ClientOnly>
  <TestnetUserJourneyDemo />
</ClientOnly>

## JPKI・パスキー・MetaMask結合

次のデモは、上で登録した仮名テストユーザに、モックJPKI結果、FIDO2／WebAuthnパスキー、Polygon AmoyのMetaMaskウォレットを順番に結び付けます。公開GitHub Pagesでは安全なRP境界と状態を持つAPIがないため操作を無効にし、ローカル同一オリジン構成またはCFP専用HTTPSドメインでだけ有効にします。

```mermaid
flowchart LR
    CARD[マイナンバーカード＋NFC読取<br/>管理された実カード試験のみ]
    PASSKEY[端末内認証器／FIDO2キー<br/>パスキー秘密鍵]
    BROWSER[ブラウザ<br/>WebAuthn]
    WALLET[MetaMask<br/>ウォレット秘密鍵]
    TRUST[アカウント・トラストサービス<br/>短命結合状態・監査]
    JPKI[JPKIアダプター<br/>現在はモック]
    VERIFY[WebAuthn／EIP-712検証]
    AMOY[Polygon Amoy]

    CARD -. 将来の管理試験 .-> JPKI
    PASSKEY --> BROWSER
    WALLET --> BROWSER
    BROWSER --> TRUST
    TRUST --> JPKI
    TRUST --> VERIFY
    VERIFY --> BROWSER
    WALLET -->|ユーザが承認した取引のみ| AMOY
```

現在必要なハードウェアは、WebAuthn対応ブラウザ、端末内認証器またはFIDO2セキュリティキー、MetaMaskを利用できる端末です。マイナンバーカードとNFC対応スマートフォン／ICカードリーダーは、認定事業者の試験接続を行う段階でだけ必要になります。

<ClientOnly>
  <AccountTrustDemo />
</ClientOnly>

## データと資産の境界

| 項目 | この公開利用フロー | ローカルゲートウェイ連携版 |
| --- | --- | --- |
| プロフィール | AliasとテストユーザIDを現在のタブだけに保存 | ゲートウェイのデモ PrincipalとCookie セッション |
| ウォレット | ユーザが明示接続。アドレスとトランザクションは公開チェーンに記録 | SIWE／EIP-712署名境界をローカル検証 |
| 支払資産 | 無価値・償還不可の`tJPYC`だけ。Amoy POLはガスのみ | 固定モックサブスクリプション |
| プレーヤー | ページ内で生成する短い合成WAV。プレビューとサブスクリプション限定楽曲 | ゲートウェイ経由の合成音源、範囲、短命再生セッション |
| サポータ登録 | EIP-712意思表示に署名し、デモ専用アダプターから公開・譲渡不能なSBTを発行 | EIP-712署名を検証し、リレイヤー・インデクサー経由で確定状態を反映 |
| ストリーミング認可 | Polygon Amoy サブスクリプションによるUI解放だけ | ゲートウェイ Capabilityと配信証跡 |
| Navidrome | 未接続 | 明示対応付け型アダプターを選択可能 |

公開利用フローのサブスクリプション状態は、まだゲートウェイの再生認可やNavidromeへ接続されません。API、Cookie、範囲、Concurrency、監査境界を含む検証は[ローカルストリーミングゲートウェイ](/demo/local-gateway)を参照してください。

## 操作順序

1. 個人情報を含まないAliasでテストユーザプロフィールを登録する。
2. ウォレットを明示的に接続し、チェーン ID `80002`のPolygon Amoyへ切り替える。
3. 公開済みマニフェストが`active`の場合だけ、一回限りの`2,000 tJPYC`を取得する。
4. 計画価格だけをサブスクリプションコントラクトへApproveし、サブスクリプションを開始する。
5. プレビュー楽曲を操作し、有効なサブスクリプションでは限定合成楽曲が解放されることを確認する。
6. プレーヤーの「サポータになってSBTを得る」から短期EIP-712意思表示に署名し、Polygon AmoyでSBT発行トランザクションを確定する。
7. トークン ID、一般／初期サポータ区分、メタデータとPolygonscan上のトランザクションを確認する。

サポータ登録は支援意思の公開記録であり、mockJPYCの移転、トークン Approvalまたは継続課金を含みません。デモ専用登録アダプターが未デプロイ、または公開マニフェストで検証できない間は、書込みボタンを無効にします。

Seed Phraseや秘密鍵は入力しません。本番ウォレット、本番資金、Mainnet 資産、実在JPYC、実在楽曲または個人情報を使わないでください。
