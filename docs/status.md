---
title: 現在の状況
description: Creator First Platformの公開文書、Draft仕様、未実装範囲、専門家確認事項と次の成立条件。
---

# 現在の状況

> **基準日: 2026-08-22**

Creator First Platformは現在、**構想、公開文書、設計判断、Protocol Specificationを整備している段階**です。本ページは、将来像と現在成立しているものを区別するための状態表示です。

::: warning サービスはまだ稼働していません
本サイトは、音楽ストリーミング、JPYC等によるサブスクリプション決済、クリエイター分配、DAOガバナンスまたはSTOが現在利用・申込可能であることを示すものではありません。
:::

## 成熟度一覧

| 対象 | 現在の状態 | 現在確認できるもの | 次の成立条件 |
| --- | --- | --- | --- |
| Whitepaper | 公開・策定継続中 | 理念、権利、経済、技術、ガバナンス、法務、ロードマップ | 利害関係者レビューと継続改訂 |
| CFP | Draft | 提案プロセス案とCFP-0001 | 採択主体・手続・記録方式の確定 |
| ADR | Proposed | 11件の設計判断案 | レビュー、採否決定、Status更新 |
| Protocol | Draft 0.1.0 | Account、Wallet、Supporter Credential／Early Tier、決済、決済資産台帳、Rights、Streaming Authorization、Player、Usage、Distributionの10仕様 | Open Questions解決、法務・セキュリティ・ガバナンス承認 |
| Testnetデモ | 準備中 | [利用入口と本番移行条件](/demo/)、[ブラウザ内Test User登録](/demo/test-user-registration)、Vertical Slice実装計画 | Gateway公開、Testnet選定、公開URL・Contract・Source Commitの検証 |
| アプリケーション | ローカルPlayback Slice（部分実装） | [Navidrome Docker Server](/demo/local-streaming)、[Streaming Gateway Mock](/demo/local-gateway)、認可に使わないBrowser／Gateway Test-only Profile、Vue Player PWA、SIWE／EIP-712署名検証、Delivery Evidence | Account lifecycle／Authenticator、MockJPYC、Navidrome非公開Network、Rights／Credential Read Model、Playback Event集約、Testnet Contract、Security Review |
| Smart Contract | 未実装 | Subscription、Rights、Early Supporter SBT等の要件・不変条件 | チェーン選定、脅威分析、実装、監査、段階的デプロイ |
| ステーブルコイン決済 | 未提供 | 決済・資産審査のDraft仕様 | 対象商品・ネットワーク・取扱形態の法務／技術審査 |
| DAOガバナンス | 未稼働 | 抽選議会と熟議の構想 | Community形成、適格性、抽選、異議申立て、実証 |
| STO | 未実施 | 資金調達手段としての検討事項 | 発行設計、法的分類、取扱事業者、開示、投資家保護の専門家確認 |
| 株式会社・契約 | 構想・確認事項 | 法人が権利、税務、雇用、法令対応を担う責任分界案 | 法人・契約・規程の具体化と専門家レビュー |

## 現在公開している成果物

- [Whitepaper](/whitepaper/)
- [Creator First Proposal](/proposals/)
- [Architecture Decision Records](/adr/)
- [Protocol Specification](/protocol/)
- [Testnetデモ入口](/demo/)
- [ローカル音楽ストリーミング手順](/demo/local-streaming)
- GitHub上のProtocol検証、文書ビルド、公開前メタデータ検査

Protocolの10仕様は公開して読める状態ですが、すべてDraftです。要件IDとテスト対応の自動検証は、仕様の完全性、安全性、法令適合性または本番承認を意味しません。

## 現在公開・本番提供していないもの

- 実音源を用いた公開環境でのアップロード、再生、検索またはレコメンド機能
- 利用者アカウント、Creator登録またはRights Holder審査
- サブスクリプション契約または決済受付
- JPYCその他のトークンの販売、交換、媒介または保管
- クリエイター報酬の計算、支払または税務処理
- Security Tokenの募集、売出し、勧誘または取扱い
- DAOへの参加登録、投票、抽選議会または資金管理
- 本番Smart Contract、監査済みコントラクトアドレスまたは公式ウォレット

第三者が本プロジェクト名を用いて送金、秘密鍵・シードフレーズ、トークン購入または投資を求めても、本サイトの公開文書だけを根拠に応じないでください。セキュリティ上の問題は[Security Policy](https://github.com/ShigeichiroYamasaki/creator-first-platform/security/policy)を確認してください。

## 専門家確認が必要な領域

次の事項は、文書やSmart Contractだけでは確定できません。

- 著作権、著作隣接権、原盤権、実演家の権利と契約
- 利用規約、プライバシーポリシー、個人情報、消費者保護
- ステーブルコインの対象商品、ネットワーク、移転・保管・償還と事業者規制
- STOの法的分類、募集・開示・勧誘・取扱いと投資家保護
- 法人税、消費税、源泉徴収、会計、暗号資産・電子決済手段等の税務処理
- 雇用、業務委託、社会保険、労務管理
- 海外提供時の準拠法、ライセンス、制裁、データ移転

詳細は[法務・STO・税務](/whitepaper/11-legal-sto-tax)を参照してください。個別案件では、弁護士、公認会計士・税理士、金融規制、セキュリティおよび関係事業者による確認が必要です。

## 次の開発ゲート

次の段階は、単にコードが書けることではなく、以下を満たしてから進みます。

1. [Draft仕様のOpen Questionsと責任主体](/protocol/open-questions)を確定する
2. 法務・権利・税務・プライバシー・セキュリティの専門レビュー条件を定義する
3. [Vertical Slice Implementation Plan](/protocol/implementation-plan)のBlocking Decisionを解決し、Mock Work Packageへ着手する
4. [Testnetデモ](/demo/)で失敗、再試行、重複、取消し、監査、緊急停止を検証し、Network・Contract・Source Commitを公開する
5. Testnetデモの成立後、本番用の鍵、権限、インフラ、契約、監視、復旧を別実装する
6. 本番資金を扱う前に独立レビュー、監査、運用手順、インシデント対応を完了する

段階的な全体計画は[ロードマップ](/whitepaper/13-roadmap)を参照してください。

## 状態表示の更新ルール

本ページは、次のいずれかが変わった場合に更新します。

- 文書や仕様のStatusまたはVersion
- 実装、監査、テスト、デプロイの状態
- 法人、契約、決済、STOまたはガバナンスの成立状態
- 利用者またはCreatorが実際に利用できる機能
- 重要な法務・セキュリティ上の前提

将来の計画を「提供中」と表示せず、成立条件を満たした証拠へのリンクとともに状態を更新します。
