---
title: 決定基準
description: 未解決事項、公開決定、モック専用仮定を分離し、後続作業パッケージの開始条件を検証するIMP-001基盤。
---

# 決定基準

IMP-001は、未決定事項を実装値へ暗黙に変換しないための決定境界です。11個の草案プロトコル仕様を正規ソースとして参照し、各未解決事項の割当、状態、実装可否、公開決定証拠を検証します。

::: warning 未解決事項は未決定です
全未解決事項には`UNASSIGNED / OPEN / BLOCKED`を適用します。ローカルプレーヤー MVP用のモック仮定が1件ありますが、本番の技術、法務、権利、税務、プライバシー、セキュリティまたはOSS License判断を承認するものではありません。
:::

## ソースから導出した登録簿

事項 ID、決定責任者 role、Blocks、事項本文は、各プロトコル仕様を正本とします。登録簿は仕様本文を複製せず、対象仕様 ID、版、Pathを固定します。

- [決定登録簿](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/decision-register.yaml)
- [モック仮定登録簿](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/mock-assumptions.yaml)
- [運用規則](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/README.md)
- [IMP-001追跡課題](https://github.com/ShigeichiroYamasaki/creator-first-platform/issues/9)

仕様へ未解決事項が追加されたのに登録簿のソースが欠ける場合、仕様 ID・版・Pathが一致しない場合、存在しない事項をOverrideする場合はCIが失敗します。

## 決定状態

| 状態 | 決定 evidence | 実装 |
| --- | --- | --- |
| `OPEN` | なし | `BLOCKED` |
| `DEFERRED` | なし | `BLOCKED` |
| `DECIDED` | 公開 assignment、決定記録、決定日付が必須 | 決定記録に従い`ALLOWED`または`BLOCKED` |
| `WITHDRAWN` | 取下げ理由を示す公開記録が必須 | `BLOCKED` |

モック仮定は未解決事項を`DECIDED`へ変更しません。モック／テストネット作業パッケージの範囲、参照事項、値、禁止用途、失効条件を明記した場合だけ登録できます。

## 検証

```sh
nvm exec 24 npm run decisions:test
nvm exec 24 npm run decisions:validate
```

完全な公開前ゲートである`npm run validate`にも同じ検証を組み込んでいます。

## 次の成立条件

1. 公開可能な決定 assignmentを記録する。
2. モック実装に必要な値だけを、期限と禁止用途を持つモック仮定として提案する。
3. 採用判断をADR、CFPまたはガバナンス決定へ記録する。
4. 後続の各`IMP-...`が決定 IDまたはモック仮定 IDを参照する。

実在する個人情報、秘密情報、契約書、権利証憑、税務資料、秘密鍵または本番資格証明は公開登録簿へ保存しません。
