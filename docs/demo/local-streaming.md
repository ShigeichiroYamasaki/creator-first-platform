---
title: ローカル音楽ストリーミング
description: Docker ComposeとNavidromeでCreator First Platformのローカル音楽ストリーミングサーバーを起動する手順。
---

# ローカル音楽ストリーミング

Creator First Platformの最初の実装として、Navidrome `0.63.2`をDocker Composeでローカル起動できます。この手順ではNavidrome自体のライブラリスキャン、管理画面、検索、再生を独立して検証します。Streaming Gateway Mockは別途実装済みですが、この管理用Composeには接続せず、Subscription、Rights、WalletまたはSmart Contractの権限をNavidromeへ持たせません。

::: warning ローカル開発専用です
Navidromeは`127.0.0.1`だけで待ち受けます。実在する未公開音源、個人情報、本番Credentialまたは本番資金を投入しないでください。LAN、InternetまたはTunnelへ公開しないでください。
:::

## 必要な環境

- Docker DesktopまたはDocker Engine
- Docker Compose v2以降
- Node.js 24とnpm
- Host側のPort `4533`

確認します。

```sh
docker --version
docker compose version
node --version
```

## 起動

Repository Rootで実行します。

```sh
npm run streaming:up
npm run streaming:verify
```

`streaming:up`は、著作権上安全な5秒間の440 Hz試験音`docker/navidrome/music/local-test-tone.wav`を生成し、Compose設定を検査してからNavidromeを起動します。

Browserで`http://127.0.0.1:4533`を開き、最初のローカルAdministrator Accountを作成します。PasswordはRepositoryへ保存しないでください。初回Scan後、`local-test-tone`を再生できます。

## 自分で権利を確認した音源を追加する

配信・複製・検証利用の権利を自分で確認した音源だけを、次のDirectoryへ配置します。

```text
docker/navidrome/music/
```

このDirectoryはContainerの`/music`へread-onlyでMountされます。生成音源を除き、音源ファイルはGitへCommitしません。Scannerは起動時と1分間隔で変更を確認します。

## 運用コマンド

| 操作 | コマンド |
| --- | --- |
| Compose設定検査 | `npm run streaming:config` |
| 起動 | `npm run streaming:up` |
| HTTP応答検証 | `npm run streaming:verify` |
| 状態表示 | `npm run streaming:ps` |
| Log追跡 | `npm run streaming:logs` |
| 停止 | `npm run streaming:down` |

通常の停止ではDatabaseと設定を保持するNamed Volumeを削除しません。

## Security Boundary

- Host Portは`127.0.0.1:4533`だけにBindする
- Music Volumeはread-onlyにする
- Navidrome本体はnon-rootで実行する。Networkを持たない一時Init Serviceだけが、起動前にNamed Volumeの所有権を設定して終了する
- Linux CapabilityをすべてDropし、`no-new-privileges`を有効にする
- Sharing、Download、External Service、Anonymous Insightsを無効にする
- 明示的なbridge Networkを使い、Host公開はloopbackだけに制限する。Navidrome Adapterを有効化する構成ではHost Portを削除し、GatewayとNavidromeだけの`internal` Networkへ変更する
- Imageを`deluan/navidrome:0.63.2`へ固定する

これは[ADR-0009](/adr/ADR-0009-navidrome-streaming-gateway)の最終Topologyではありません。[ローカルStreaming Gateway](/demo/local-gateway)は既定で合成音源File Adapterを使用します。Navidrome Adapterを有効化する段階でHost Portを削除し、ClientからNavidromeへの直接到達を廃止します。

## 現段階の成立条件

1. `npm run streaming:config`が成功する
2. `npm run streaming:up`でContainerがhealthyになる
3. `npm run streaming:verify`がHTTP 200とNavidrome Applicationを確認する
4. Administratorを作成し、合成試験音をBrowserで再生できる
5. `npm run streaming:down`後もNamed Volumeに設定が保持される

英語版は[Local music streaming](/en/local-streaming)を参照してください。
