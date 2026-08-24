---
record_schema: cfp-record/v1
description: CFP-0002を題材とするユーザ院議会のローカルガバナンス試験用合成議事録。
document_id: MIN-CFP-0002-R0001-USER-001
document_type: house_minutes
cfp_id: CFP-0002
cfp_revision: 1
cfp_revision_hash: pending
house: user_house
session_id: TEST-SESSION-CFP-0002
meeting_id: USER-001
held_at: 2026-08-24T11:00:00+09:00
created_at: 2026-08-24
status: test_fixture
record_profile: testnet_fixture
chair_id: TEST-USER-A
recorder_id: TEST-CLERK
membership_snapshot_hash: pending
agenda_hash: pending
evidence_index_path: docs/proposals/records/CFP-0002/revision-0001/evidence-index.md
source_commit: pending
confirmed_at: null
confirmers: []
privacy_class: public
search: false
---

# CFP-0002 ユーザ院議会 合成議事録

## 会議情報

ローカルHardhat試験の状態遷移を検証する合成会議であり、実在する議員または議会による会議ではない。

## 出席・定足数

テスト議員2名を登録し、テスト用定足数2名を満たすシナリオとした。本人性、抽選および任期は検証していない。

## 利益相反

実在人物、資産またはユーザとの関係を持たない合成アカウントだけを使用した。

## 使用資料

- CFP-0002 Revision 1
- 憲章整合性レビュー
- 法務実行可能性レビュー
- コントラクト試験証跡

## 審議した論点

- 締切時刻と確定待ちをユーザへ説明する方法
- 公開SBTによるウォレットと支援対象の関連付け
- 金額、人気または先着人数で資格を変えない公平性

## 憲章・法務上の確認

正式な三憲章が未採択であるため、条件付きテスト判断に限定した。`ISSUE-CFP-0002-R0001-0001`は未解決である。

## 修正案

確定待ち表示、SBTを受領しない選択肢、誤判定への異議申立ておよびウォレット回復を付帯条件とした。

## 議論の要約

予測可能で金額に依存しない条件には賛成意見がある一方、プライバシー、同意および締切直前の遅延説明が必要との条件が示された。

## 少数意見

合成テストでは少数意見を生成していない。これは実在議会で少数意見が存在しないことを意味しない。

## 議決

テスト議員2名が賛成スコアを記録するシナリオである。正式な院別議決ではない。

## 継続対応

正式な憲章採択、実在議員による熟議、アクセシビリティ・理解度試験および独立レビューを必要とする。

## 議事録の確認

状態は`test_fixture`であり、確認者による`confirmed`または`hash_bound`への移行を禁止する。
