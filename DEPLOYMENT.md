# GitHub Pages Deployment

Creator First Platformの公開サイトは、`main`ブランチの内容をGitHub Actionsで検証し、GitHub Pagesへデプロイします。ローカルの`docs/.vitepress/dist`を直接公開したり、生成物をリポジトリへコミットしたりしません。

## 公開経路

```text
Pull Request
  -> Validate documentation
  -> Review / Merge
  -> mainへのpush
  -> Deploy VitePress site to Pages / build
  -> github-pages artifact
  -> Deploy VitePress site to Pages / deploy
  -> Deploy VitePress site to Pages / verify
  -> 公開後確認
```

- Pull Requestでは`.github/workflows/validate-docs.yml`が`npm run validate`を実行します。
- `main`へのpushでは`.github/workflows/deploy-pages.yml`が同じ検証を再実行します。
- build jobに成功したartifactだけが、`github-pages` environmentを使用するdeploy jobへ渡ります。
- `workflow_dispatch`は再実行や障害調査のための入口であり、未レビュー変更を公開する承認経路ではありません。

## 初回または設定変更時の前提

GitHubリポジトリの管理者が次を確認します。

1. **Settings → Pages → Build and deployment → Source** が **GitHub Actions** である
2. Actionsが有効である
3. `github-pages` environmentの保護規則と承認者が意図した設定である
4. `main`のbranch protectionまたはrulesetで、Pull Requestと`Validate documentation`の成功を要求する
5. Actionsの既定権限を広げず、workflow内のjob単位権限を使用する

リポジトリ設定はコードだけでは保証できないため、管理者変更後と公開障害時に再確認します。

## 公開前チェック

Node.js 24で次を実行します。

```sh
npm ci
npm run validate
git diff --check
```

さらに、Pull Requestで次を確認します。

- 変更目的、上位文書、利用者・Creator・権利者への影響が説明されている
- Protocol、法務、セキュリティ、プライバシーに必要なレビューが完了している
- Draft、未実装、専門家確認待ちを本番稼働済みと誤認させる表現がない
- 秘密鍵、Wallet情報、個人情報、契約書、税務資料、`.env`、生成済みサイトが含まれていない
- `docs/status.md`が公開内容の成熟度と一致している
- 変更対象ページをローカルpreviewで確認している

## 公開

通常公開は、承認済みPull Requestを`main`へmergeして開始します。デプロイ中は次の2 jobを区別して確認します。

1. **build** — dependency install、Protocol検証、Status整合性検証、サイト回帰テスト、VitePress build、生成物検査、artifact upload
2. **deploy** — `github-pages` environmentへのartifact公開
3. **verify** — 主要URL、サイトマップ、公開commit SHAを再試行付きで検証

buildが成功してdeployが失敗した場合、検証済みartifactは作成されていますが公開完了ではありません。deployが成功してもverifyが失敗した場合、公開内容またはCDN反映を確認する必要があります。verify jobと公開URLを確認するまで完了と扱いません。

## 公開後チェック

Actionsのdeploy jobが成功し、出力された`page_url`と次の公開URLを確認します。

- <https://shigeichiroyamasaki.github.io/creator-first-platform/>
- <https://shigeichiroyamasaki.github.io/creator-first-platform/status>
- <https://shigeichiroyamasaki.github.io/creator-first-platform/protocol/>
- <https://shigeichiroyamasaki.github.io/creator-first-platform/sitemap.xml>
- <https://shigeichiroyamasaki.github.io/creator-first-platform/build-info.json>

確認項目は次のとおりです。

- HTTP 200で表示される
- ホームからStatus、Whitepaper、Protocol、CFP、ADRへ移動できる
- 今回追加・変更したページが公開されている
- `build-info.json`の`commit`が、成功したdeploy workflowのcommit SHAと一致する
- 日本語検索が結果を返し、検索結果から該当見出しへ移動できる
- Mermaid図、数式、ダーク／ライトテーマ、モバイルメニューが動作する
- canonical URLとOG URLが公開URLを指す
- sitemapにインデックス対象ページが含まれ、noindexページが含まれない
- ブラウザのconsoleに新しいerrorがない

GitHub PagesやCDNの反映待ちを考慮し、古い内容が表示される場合はActionsのdeploy完了時刻を確認してから、キャッシュを避けて再確認します。

## 失敗時の判断

| 状況 | 対応 |
| --- | --- |
| Pull Request検証失敗 | mergeせず、最初に失敗した検証を修正する |
| build失敗 | deployされていない。ログとローカル`npm run validate`を比較する |
| artifact upload失敗 | Actions／Pages設定、容量、権限を確認する |
| deploy失敗 | `github-pages` environment、Pages設定、権限、GitHub Statusを確認する |
| deploy成功だが表示が古い | deploy対象SHA、公開URL、CDN反映、ブラウザキャッシュを確認する |
| deploy成功だが表示が壊れている | 影響を評価し、必要なら直ちにrevertする |

## 切り戻し

公開済み変更を戻す場合は、履歴を書き換えず、問題を導入したcommitまたはmerge commitをrevertするPull Requestを作成します。

1. 影響範囲と戻すcommitを特定する
2. revertを作成する
3. `npm run validate`を実行する
4. 緊急度に応じたレビューを受ける
5. `main`へ反映し、通常のPages workflowで再公開する
6. 公開後チェックを再実行する

秘密情報が公開された場合、revertだけでは履歴やartifactから消えません。先に認証情報を失効・ローテーションし、`SECURITY.md`に従って非公開で対応します。

## 公開記録

公開判断を追跡できるよう、Pull Requestまたは関連Issueへ次を残します。

- 公開対象commit SHA
- Actions runへのリンク
- 実行したローカル検証
- 公開後に確認したURLと結果
- 既知の警告、未解決事項、専門家確認待ち
- 切り戻しが必要になった場合のIssueまたはrevert Pull Request
