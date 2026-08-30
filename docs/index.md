---
layout: home
description: 音楽クリエーターとユーザが、将来の音楽サービスの価値と使いやすさをともに確かめる無償版運用実験と専門資料の入口。

hero:
  name: "Creator First Platform"
  text: "音楽クリエーターとユーザが、ともにつくる音楽プラットフォーム"
  tagline: "本番サービスを始める前に、公開実験を通じて価値・使いやすさ・運営方法を確かめます。"
  actions:
    - theme: alt
      text: English
      link: /en/
    - theme: brand
      text: 無償版運用実験を開く
      link: /demo/
    - theme: alt
      text: ホワイトペーパーを読む
      link: /whitepaper/01-vision
    - theme: alt
      text: CFP 一覧を見る
      link: /proposals/
    - theme: alt
      text: ADR一覧を見る
      link: /adr/
    - theme: alt
      text: スマートコントラクト仕様を見る
      link: /protocol/
    - theme: alt
      text: GitHubを見る
      link: https://github.com/ShigeichiroYamasaki/creator-first-platform

features:
  - title: 無償版運用実験
    details: 本番実装の前に、金銭的価値を持たないテスト環境と合成データで再生・決済・権利・利用証跡・分配の最小構成を検証します。
    link: /demo/

  - title: 音楽クリエータ院議会デモ
    details: Polygon Amoy上の音楽クリエータ院議会で、CFP、議員資格、院別集計、投票クレジットと承認投票を確認します。
    link: /demo/creator-house

  - title: ユーザ院議会デモ
    details: Polygon Amoy上のユーザ院議会で、CFP、議員資格、院別集計、投票クレジットと承認投票を確認します。
    link: /demo/user-house

  - title: 現在の状況
    details: 公開文書、草案仕様、未実装範囲、専門家確認が必要な事項を区別して示します。
    link: /status

  - title: ホワイトペーパー
    details: Creator First Platform の理念、権利、経済、技術、ガバナンス、法務、セキュリティ、インフラ、ロードマップをまとめた基本文書です。
    link: /whitepaper/01-vision

  - title: CFP文書
    details: 音楽クリエーターとユーザが制度やプロトコルの変更・拡張を提案し、議論と熟議につなげる公開提案制度です。
    link: /proposals/

  - title: ガバナンス
    details: 音楽クリエータ院議会とユーザ院議会を抽選代表によって構成し、熟議を経てプロトコル仕様を形成する統治モデルです。
    link: /whitepaper/07-governance

  - title: ADR一覧
    details: 重要な設計判断、その理由、代替案、影響を記録し、プロトコル仕様と実装へ接続します。
    link: /adr/

  - title: プロトコル仕様・スマートコントラクト仕様
    details: ADRで決定された設計を、実装要件、不変条件、インターフェース、エラー条件、テスト条件へ落とし込んだ仕様です。
    link: /protocol/

  - title: 本番サービス設計
    details: ユーザ登録、音楽クリエーター登録、利用、コミュニティ、ガバナンス、分配を独立した正本と本番ゲートで接続します。
    link: /adr/ADR-0018-production-service-architecture
---

<nav class="homepage-language-switch" aria-label="Language selection">
  <strong>Language / 言語</strong>
  <span aria-current="page">日本語</span>
  <a href="/creator-first-platform/en/" lang="en">English</a>
</nav>

<div class="homepage-symbol">
  <img src="/creator-first-platform-symbol.png" alt="Creator First Platformのシンボル" />
</div>

::: warning 現在は公開実験の段階です
これは稼働中の本番音楽配信サービス、決済サービス、投資または証券の募集ではありません。デモで使う資産や資格に実際の金銭的価値はありません。
:::

## 無償版運用実験の目的

Creator First Platform は、完成した仕組みを一方的に提供するのではなく、**音楽クリエーターとユーザが実際に試し、感じたことを次の設計へ反映する**ことを重視しています。

公開実験では、主に次の点を確かめます。

<div class="experiment-purpose-grid">
  <div class="experiment-purpose-card">
    <span aria-hidden="true">💡</span>
    <h3>価値が伝わるか</h3>
    <p>音楽クリエーターを応援しながら音楽を楽しむという考え方が、実験参加者にとって魅力的かを確かめます。</p>
  </div>
  <div class="experiment-purpose-card">
    <span aria-hidden="true">🧭</span>
    <h3>迷わず使えるか</h3>
    <p>初めて使う人でも、登録から利用まで直感的に進められるかを確かめます。</p>
  </div>
  <div class="experiment-purpose-card">
    <span aria-hidden="true">🤝</span>
    <h3>公平に参加できるか</h3>
    <p>ユーザと音楽クリエーターの双方が、支援やルール形成に無理なく参加できるかを確かめます。</p>
  </div>
  <div class="experiment-purpose-card">
    <span aria-hidden="true">🛡️</span>
    <h3>安全に運営できるか</h3>
    <p>誤操作や不正利用を防ぎ、実験参加者が安心して試せる運営方法を確かめます。</p>
  </div>
</div>

## プロジェクトにおける位置づけ

無償版運用実験は本番サービスの縮小版ではなく、**本番化する価値があるか、何を改善すべきかを判断するための公開実験**です。

<div class="experiment-journey" aria-label="プロジェクトの進行段階">
  <div class="experiment-phase"><span>1</span><strong>構想</strong><small>目指す価値を定める</small></div>
  <div class="experiment-arrow" aria-hidden="true">→</div>
  <div class="experiment-phase experiment-phase--current"><span>2</span><strong>公開実験</strong><small>現在地：実験参加者と試す</small></div>
  <div class="experiment-arrow" aria-hidden="true">→</div>
  <div class="experiment-phase"><span>3</span><strong>評価と改善</strong><small>結果を公開して見直す</small></div>
  <div class="experiment-arrow" aria-hidden="true">→</div>
  <div class="experiment-phase"><span>4</span><strong>本番化の判断</strong><small>法務・運営面も含めて判断する</small></div>
</div>

実験で得た利用状況、意見、問題点を記録し、改善後にもう一度検証します。本番化は、使いやすさ、安全性、音楽クリエーターへの有益性、法務・運営上の条件を満たせると判断した後の別段階です。

## 実験参加者に試してほしいこと

公開実験への参加には、運営による事前登録と招待メールが必要です。募集時に案内されるフォームまたはメールから申し込み、招待を受け取ってから各体験へ進みます。詳しくは[事前登録から参加までの流れ](/demo/)を確認してください。

<div class="participant-path-grid">
  <div class="participant-path-card">
    <span class="participant-path-icon" aria-hidden="true">🎧</span>
    <div>
      <h3>音楽リスナーとして参加</h3>
      <p>音楽サブスクリプションサービスの利用、音楽クリエータの応援、サービス改善や経営への参加などを試します。</p>
      <a href="/creator-first-platform/demo/user-services">ユーザ向けデモへ →</a>
    </div>
  </div>
  <div class="participant-path-card">
    <span class="participant-path-icon" aria-hidden="true">🎵</span>
    <div>
      <h3>音楽クリエータとして参加</h3>
      <p>音源などの登録、ファンからの応援や交流、収益分配ルールづくりへの参加を試します。</p>
      <a href="/creator-first-platform/demo/creator-services">音楽クリエーター向けデモへ →</a>
    </div>
  </div>
</div>

## この実験だけでは決まらないこと

- 本人、著作権、原盤権、配信許諾などの法的な確認
- 本番サービスにおける契約、料金、報酬または投資上の権利
- 本番で採用する最終的な運営体制やサービス仕様
- 個々の実験参加者や作品の商業的な評価

実験への参加は、本番サービスへの加入、採用、投資または将来の利益を約束するものではありません。

<div class="home-demo-cta">
  <span aria-hidden="true">🧪</span>
  <div><h2>公開実験を体験する</h2><p>初めての方には、準備と参加手順を順番に案内します。</p></div>
  <a href="/creator-first-platform/demo/">無償版運用実験を開く</a>
</div>

## プロジェクトについて詳しく知る

- [ホワイトペーパー](/whitepaper/01-vision)：目指す価値、権利、経済、ガバナンスと本番化までの考え方
- [CFP文書](/proposals/)：実験参加者を含むコミュニティが制度の変更や新しい仕組みを提案するための公開文書
- [ADR一覧](/adr/)：技術・制度設計の判断、その理由、代替案と影響の記録
- [プロトコル仕様・スマートコントラクト仕様](/protocol/)：実装要件、不変条件、インターフェースとテスト条件
- [GitHub](https://github.com/ShigeichiroYamasaki/creator-first-platform)：文書、ソースコード、変更履歴
- [現在の状況](/status)：公開済み、検証中、未実装、専門家確認が必要な事項の区別

<div class="document-meta">
  <div class="document-meta__version">ホワイトペーパー v1.0</div>
  <div class="document-meta__row"><span class="document-meta__label">Publication 日付</span><span>2026-07-27</span></div>
  <div class="document-meta__row"><span class="document-meta__label">Revision 日付</span><span>2026-08-30</span></div>
  <div class="document-meta__row"><span class="document-meta__label">Author</span><span>山崎重一郎 (Shigeichiro Yamasaki)</span></div>
</div>

<div class="site-copyright">© 2026 Creator First Platform</div>
