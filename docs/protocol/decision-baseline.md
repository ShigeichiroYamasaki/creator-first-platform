---
title: Decision Baseline
description: Open Question、公開Decision、Mock専用仮定を分離し、後続Work Packageの開始条件を検証するIMP-001基盤。
---

# Decision Baseline

IMP-001は、未決定事項を実装値へ暗黙に変換しないためのDecision境界です。11個のDraft プロトコル仕様を正規Sourceとして参照し、各Open Questionの割当、状態、実装可否、公開Decision証拠を検証します。

::: warning Open Questionは未決定です
全Open Questionには`UNASSIGNED / OPEN / BLOCKED`を適用します。ローカルPlayer MVP用のMock Assumptionが1件ありますが、本番の技術、法務、Rights、税務、Privacy、SecurityまたはOSS License判断を承認するものではありません。
:::

## Source-derived Register

Question ID、Decision owner role、Blocks、Question本文は、各プロトコル仕様をSource of Truthとします。Registerは仕様本文を複製せず、対象Specification ID、Version、Pathを固定します。

- [Decision Register](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/decision-register.yaml)
- [Mock Assumption Register](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/mock-assumptions.yaml)
- [運用規則](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/decisions/README.md)
- [IMP-001追跡Issue](https://github.com/ShigeichiroYamasaki/creator-first-platform/issues/9)

仕様へOpen Questionが追加されたのにRegisterのSourceが欠ける場合、Specification ID・Version・Pathが一致しない場合、存在しないQuestionをOverrideする場合はCIが失敗します。

## Decision State

| State | Decision evidence | Implementation |
| --- | --- | --- |
| `OPEN` | なし | `BLOCKED` |
| `DEFERRED` | なし | `BLOCKED` |
| `DECIDED` | Public assignment、Decision Record、Decision Dateが必須 | Decision Recordに従い`ALLOWED`または`BLOCKED` |
| `WITHDRAWN` | 取下げ理由を示すPublic Recordが必須 | `BLOCKED` |

Mock AssumptionはOpen Questionを`DECIDED`へ変更しません。Mock／Testnet Work Packageの範囲、参照Question、値、禁止用途、失効条件を明記した場合だけ登録できます。

## Validation

```sh
nvm exec 24 npm run decisions:test
nvm exec 24 npm run decisions:validate
```

完全な公開前Gateである`npm run validate`にも同じ検証を組み込んでいます。

## 次の成立条件

1. 公開可能なDecision assignmentを記録する。
2. Mock実装に必要な値だけを、期限と禁止用途を持つMock Assumptionとして提案する。
3. 採用判断をADR、CFPまたはガバナンス決定へ記録する。
4. 後続の各`IMP-...`がDecision IDまたはMock Assumption IDを参照する。

実在する個人情報、秘密情報、契約書、Rights証憑、税務資料、秘密鍵または本番Credentialは公開Registerへ保存しません。
