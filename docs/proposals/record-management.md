---
title: CFP文書・議事録管理
description: CFPの論点、院別議事録、議決、審査および実行証拠を版管理し、投票・デプロイ前に機械検証する方法。
search: false
---

# CFP文書・議事録管理

CFP本文だけでは、誰が何を検討し、どの論点を解決し、どのRevisionへ投票し、どのコードを実行したかを再現できない。このため、CFP本文、論点、院別議事録、議決、審査、実装および実行証拠を別文書として管理し、同じCFP IDとRevisionへ結合する。

## 文書の正本と責任

- 公開文書の正本は、保護された`main`ブランチへ統合されたGit commitとする。
- 投票開始時、両院共同承認時および実行時に、対象文書の内容hashまたは証拠束rootを固定する。
- オンチェーンには個人情報や秘密資料の本文を置かず、必要最小限のhash、root、状態および参照だけを記録する。
- 議事録の草案は記録担当が作成し、議長と記録担当以外の確認者が確定する。少数意見がある場合は、その記載を反対・棄権側も確認する。
- 投票結果は手入力を正本とせず、ガバナンスコントラクトまたは検証済み集計証拠と照合する。

## ディレクトリ構造

```text
docs/proposals/
├── CFP-NNNN-*.md
└── records/
    └── CFP-NNNN/
        └── revision-NNNN/
            ├── evidence-index.md
            ├── issues/
            │   └── ISSUE-NNNN.md
            ├── reviews/
            ├── creator-house/
            │   ├── minutes-NNN.md
            │   └── decision.md
            ├── user-house/
            │   ├── minutes-NNN.md
            │   └── decision.md
            ├── implementation/
            └── execution/
```

文書テンプレートは`.github/CFP_RECORD_TEMPLATES/`に置く。新しい記録はテンプレートを複製し、`CFP-NNNN/revision-NNNN`とfrontmatterのID・版を一致させる。

## 文書種類

| `document_type` | 内容 |
| --- | --- |
| `evidence_index` | CFP Revisionに結合する公開・制限証拠の一覧と証拠束root |
| `issue` | 一つの未解決論点、選択肢、担当、停止性、解決条件、決定 |
| `house_minutes` | 音楽クリエータ院議会、ユーザ院議会または合同会議の議事録 |
| `house_decision` | 院別定足数、投票対象hash、集計結果、付帯決議 |
| `review` | 憲章、法務、権利、セキュリティまたは実装審査 |
| `correction` | hash確定済み文書を直接編集せず訂正する追補 |
| `implementation_evidence` | 仕様、テスト、ソース、生成物、calldataの対応 |
| `execution_evidence` | タイムロック、transaction、block、runtime code hash、事後確認 |

## 文書状態

```text
DRAFT → MEMBER_REVIEW → CONFIRMED → HASH_BOUND → SUPERSEDED
```

- `draft`: 記録担当が作成中であり、投票・実行証拠に使用できない。
- `member_review`: 出席議員または指定確認者による確認期間。
- `confirmed`: 必要な確認者が内容を確定した状態。
- `hash_bound`: Git commitまたはオンチェーン状態へ内容hashを結合した状態。
- `superseded`: 訂正文書または新しいRevisionに置き換えられた状態。元文書は削除しない。
- `test_fixture`: 合成議員・合成証拠によるテスト専用記録。本番の議事録または議決として利用できない。

`hash_bound`後に誤りを発見した場合、元文書を書き換えず`correction`を追加する。実行意味が変わる訂正は新しいCFP Revisionとして審査・熟議・投票をやり直す。

## 論点管理

各論点は一文書とし、少なくとも次をfrontmatterへ記録する。

- `issue_id`
- `category`
- `status`
- `blocking`
- `raised_by`
- `owner`
- `created_at`
- `resolved_at`
- `resolution_hash`

`blocking: true`の論点が`open`または`deferred`なら、投票開始、実装確認またはデプロイの対象にできない。単に議事録から論点を削除して解決扱いにしてはならない。

## 公開情報と制限情報

議題、公開資料、論点、議論の要約、利益相反への対応、院別集計、少数意見、理由付き差戻しの公開要約および文書hashは原則公開する。

法的本人確認、個人情報、契約上の秘密、弁護士との秘密通信、未修正の脆弱性詳細および秘密投票と個人を結び付ける情報は、株式会社のアクセス制御された保管庫で管理する。公開証拠索引には文書ID、分類、管理責任者、公開要約、保存期間およびソルト付きコミットメントまたは証拠束rootだけを記録する。

## 機械検証

通常の構造検証は次で実行する。

```bash
npm run records:test
npm run records:validate
```

特定のCFP Revisionを投票またはデプロイのゲートとして検証する場合は次を実行する。

```bash
npm run records:gate -- CFP-NNNN@1
```

ゲートは次を要求する。

1. `blocking: true`の未解決論点がない。
2. 両院に`confirmed`または`hash_bound`の議事録がある。
3. 両院に定足数を満たした承認議決記録がある。
4. 証拠索引が`hash_bound`で、全必須証拠に検証済みhashがある。
5. CFP Revision、議事録、議決および証拠索引のID・版が一致する。
6. `test_fixture`は本番ゲートの証拠として使われていない。

この検証は文書の存在と結合を検査するものであり、議論の質、法律意見、監査の専門的妥当性または議員本人性を自動的に保証しない。

## プルリクエスト運用

1. `records/CFP-NNNN/revision-NNNN`へ文書を追加する。
2. プルリクエストで文書ID、対象Revision、変更理由、確認者および公開・制限区分を示す。
3. CIで構造、重複ID、パスとfrontmatter、必須見出し、論点状態を検査する。
4. 議事録確認後に`confirmed`へ変更する。
5. 投票開始時または承認時のcommitを固定し、hashを証拠索引へ反映する。
6. 確定後の修正は訂正記録または新Revisionとして提出する。

## 関連文書

- [CFP制度](./index.md)
- [二院制議会・ガバナンス](../governance/index.md)
- [ホワイトペーパー 7. ガバナンス](../whitepaper/07-governance.md)
- [ガバナンス変更プロトコル](../protocol/specs/governance-change.md)
