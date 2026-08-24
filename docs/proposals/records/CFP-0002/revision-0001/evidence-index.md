---
record_schema: cfp-record/v1
description: CFP-0002 Revision 1に関連する公開審査、合成議事録およびコントラクト試験証拠のテスト用索引。
document_id: EVIDENCE-CFP-0002-R0001
document_type: evidence_index
cfp_id: CFP-0002
cfp_revision: 1
status: test_fixture
record_profile: testnet_fixture
created_at: 2026-08-24
privacy_class: public
bundle_root: pending
source_commit: pending
evidence_items:
  - evidence_id: CFP
    document_path: docs/proposals/CFP-0002-early-supporter-one-year-rule.md
    content_hash: pending
    classification: public
    status: candidate
  - evidence_id: CHARTER-REVIEW
    document_path: docs/proposals/reviews/CFP-0002-charter-review.md
    content_hash: pending
    classification: public
    status: candidate
  - evidence_id: LEGAL-REVIEW
    document_path: docs/proposals/reviews/CFP-0002-legal-review.md
    content_hash: pending
    classification: public_summary
    status: candidate
  - evidence_id: CREATOR-MINUTES
    document_path: docs/proposals/records/CFP-0002/revision-0001/creator-house/minutes-001.md
    content_hash: pending
    classification: public
    status: candidate
  - evidence_id: USER-MINUTES
    document_path: docs/proposals/records/CFP-0002/revision-0001/user-house/minutes-001.md
    content_hash: pending
    classification: public
    status: candidate
  - evidence_id: CONTRACT-TEST
    document_path: docs/proposals/reviews/CFP-0002-contract-test-evidence.md
    content_hash: pending
    classification: public
    status: candidate
search: false
---

# CFP-0002 Revision 1 証拠索引

## 対象

この索引はCFP文書管理システムを検証するテストネット用fixtureであり、正式な議会、法律意見、監査または本番デプロイの証拠束ではない。

## 公開証拠

frontmatterの`evidence_items`を機械検証の正本とする。現在の内容hashとbundle rootは未確定であり、投票またはデプロイの本番ゲートには使用できない。

## 制限証拠

このfixtureは個人情報、秘密投票、秘密通信または未公開脆弱性を含まない。将来の制限証拠は本文をGitHubへ保存せず、公開要約と安全なコミットメントだけを登録する。

## 証拠束の確定

状態は`test_fixture`である。実在議員による確認、正式な憲章版、専門家レビュー、確定commitおよび内容hashがそろうまで`hash_bound`へ変更しない。
