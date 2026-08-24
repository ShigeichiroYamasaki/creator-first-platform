---
description: 一般SupporterとEarly Supporterを一つの非金銭的SBT Credentialとして発行し、版管理された特権へ安全に接続する設計判断。
---

# ADR-0010: Supporter SBT and Privileges

**Status:** Proposed
**Date:** 2026-08-20
**Last Updated:** 2026-08-23

## 1. Context

> **Implementation note (2026-08-23):** Testnet専用の`SupporterSBTUpgradeable`をHardhat 3で実装した。EIP-712 Support Intent、Holder nonce／deadline、Contract-side Early判定、音楽クリエーターごとの版管理Policyと人数上限、一Scope・Holderあたり一つのActive Credential、ERC-5192、移転拒否、失効・Burn、役割分離およびERC-1967／UUPSをローカルテストし、Ethereum SepoliaへImplementationとProxyをデプロイした。Relayer／Indexer／Gateway未接続、Bootstrap Role未分離、監査前であり、本番CredentialまたはProtocol適合完了を意味しない。

Whitepaperは、Playerから音楽クリエーターを支援する意思を表明したユーザを一般Supporterとして記録し、そのうち版管理された初期条件を満たしたユーザをEarly Supporterとして可視化する方針を示している。いずれも金銭的リターンではなくCommunity Reputationとして扱う。

一方、Streaming Gatewayの現行設計はActive SubscriptionとRights Stateを必須とし、Wallet ControlまたはToken Balanceだけで再生を許可しない。Early Supporter SBTを単純なToken Gateとして追加すると、Account、Subscription、Rights、CredentialおよびSTOの責務が混在する。

## 2. Decision

Creator First PlatformはSupporter SBTを、ユーザの明示的なSupport Intentに基づいて正規Issuerが発行する、譲渡不能かつ失効可能なCommunity Credentialとして扱う。一般SupporterとEarly Supporterは別Tokenを重複発行せず、原則として一つの音楽クリエーター対象範囲とHolder Walletにつき一つのSBTへ`SUPPORTER`または`EARLY_SUPPORTER`のTierを確定して記録する。

Early Tierは発行Transaction内で、承認済みの版管理されたQualification Policyから決定する。Player、GatewayまたはRelayerはEarly Tierを自己申告、先取り表示または上書きしない。

SBTは通常のSubscriptionを置き換えず、Active SubscriptionとActive Rightsの範囲内で追加される限定的なPrivilegeの入力とする。

```text
playback_allowed =
  account_session_active
  AND wallet_link_active
  AND subscription_active
  AND rights_active
  AND (
    base_plan_allows_content
    OR (
      early_supporter_credential_active
      AND privilege_policy_allows_content
      AND creator_scope_matches
    )
  )
```

SBT単独でSubscription、Rights、本人性、唯一の人間、投資家資格、音楽クリエーター資格またはGovernance Eligibilityを証明しない。

## 3. Credential Model

Supporter Credentialは少なくとも次を版管理する。

- Chain IDおよびContract Address
- Token ID、Credential TypeおよびSupporter Tier
- Authorized Issuer
- Qualification Policy ID、Versionおよび発行時に確定したTier
- 音楽クリエーター対象範囲またはCommunity Scope
- Issuance Event、Source BlockおよびFinality Reference
- Active、RevokedまたはBurnedのStatus
- Status Effective TimeおよびStatus Version
- Holder WalletとPlatform Accountを結ぶWallet Link Version
- 再発行時の旧Credential参照

個人情報、支援金額、詳細な視聴履歴、Legal Identityおよび秘密情報はPublic Blockchainへ記録しない。

## 4. Token Standard

初期候補はERC-721互換の[ERC-5192](https://eips.ethereum.org/EIPS/eip-5192)とし、`locked(tokenId) == true`かつ移転操作が失敗することを検証する。一般SupporterとEarly Supporterの表示画像は、同じSBTの確定済みTierに応じたMetadataで切り替える。

発行前同意、Burn権限およびWallet Rotationをより明確に表現する場合は[ERC-5484](https://eips.ethereum.org/EIPS/eip-5484)を評価する。採用Standard、Burn Authorization、Metadataの不変性およびRecovery手順はContract Deploymentごとに固定する。

## 5. Qualification and Issuance

Qualification Policyは、対象音楽クリエーター、対象Action、判定期間、最大Early人数その他のEarly条件、SnapshotまたはEvent Source、重複排除、Bot対策、異議申立ておよびIssuer権限を定義する。一般Supporter登録はSupport Intentと受領同意を必要とし、Early Tierは同じ発行操作内でContractが決定する。

JPYC等による初期SubscriptionまたはSupportを対象Actionにする場合、Qualificationは承認済みAsset、Payment Intent、Finalityおよび一回限りのPayment Referenceを参照する。支払額をPublic Metadataへ記録せず、未確定、誤Asset、誤Chain、重複または取消済みPaymentから発行しない。

ユーザの受領意思を確認せずにPublic WalletへSBTを送り付けない。発行操作は同じQualificationとPolicy Versionに対して冪等にし、同一Credentialの二重発行を拒否する。

Early Supporterの資格をSTOへの申込額、Security Token保有量、音楽クリエーターの将来人気、将来収益または投機的価値へ連動させない。

一般ユーザへSBT発行用Native Gas Tokenを要求しない。明示的同意とEIP-712等による目的限定Wallet署名の後、最小権限のRelayerが発行Transactionを送信できる。署名は少なくともHolder Wallet、Canonical 音楽クリエーター対象範囲、Credential Deployment、Nonce、Deadline、ConsentまたはTerms Versionおよび許可するMint操作をBindする。Supporter登録をJPYC支払、Token ApprovalまたはSubscription購入と同じ署名へ混在させない。

Relayer受付、Gas支払またはTransaction送信は発行成功ではなく、確定済みCredential EventをIndexerが取り込んだ時点でCredentialを`ACTIVE`とする。

登録は`Player -> Gateway Intent -> Wallet署名 -> Relayer -> Contract Tier判定 -> Indexer`と進み、各状態を区別する。ProxyのUpgradeとPolicy権限は分離してTimelock管理し、既発行Tierを暗黙に変更しない。

## 6. Privilege Policy

PrivilegeはSBT Metadataへ永久に埋め込まず、Operating Companyが権利者との許諾および利用規約に基づいて版管理するPolicyとして定義する。

Credentialは支援ScopeとTierを証明し、Privilege Policyは現在許可する操作を定義する。Early認定条件と特権内容は別々に版管理する。

対象候補は次のとおりとする。

- 音楽クリエーターと権利者が許諾した先行試聴
- 限定Recordingまたは限定イベント
- Beta機能
- Community BadgeまたはProfile表示
- Subscription Plan内の限定的な品質・機能拡張

Privilegeは対象音楽クリエーター、Canonical Track、Content Version、Territory、License Window、Plan、品質、開始・終了時刻および緊急停止条件でBoundする。

Off-chain特権はGatewayがRead Modelを評価して限定Streaming Session、Community Tokenまたは期限付き招待を発行する。On-chain特権は対象Contractが承認済みSBTのHolder、Scope、TierおよびPolicyを検証する。Client申告やMetadataを権限根拠にしない。

## 7. Authentication and Wallet Linking

Wallet署名はWallet Controlの証明にのみ利用し、SBT保有と再生認可を同一視しない。Platform Session内で、目的を明示したWallet Linkを確立し、Account RecoveryとWallet RotationをAccount Serviceが管理する。

Wallet紛失時は、旧CredentialをRevokedまたはBurnedにしてから、新Walletへ新Token IDを再発行する。秘密鍵の譲渡またはWallet売買による実質的移転をSBTだけで完全に防げないため、Account Security、利用規約、異常検知および再発行監査を組み合わせる。

## 8. Authorization Read Model

Gatewayは再生Requestごとに同期RPCを行わない。Credential Indexerが確認済みEventからReorganization-awareなCredential / Privilege Read Modelを構築する。

Read ModelはSource Block、Block Hash、Transaction Hash、Log Index、Finality、Contract Version、Credential Status、Policy VersionおよびFreshnessを保持する。

Credential、Subscription、Rights、Wallet LinkまたはPolicyが不明、期限切れ、失効、再編成中または許容範囲を超えて古い場合、新しいPlayback SessionをFail Closedで拒否する。

## 9. Playback Session Binding

認可成功時の短時間Playback Sessionは次をBindingする。

- AccountおよびPlatform Session
- Wallet Link Version
- SubscriptionおよびPlan
- Early Supporter Credential IDとStatus Version
- Privilege Policy IDとVersion
- Canonical Track IDとContent Version
- Rights Snapshot、TerritoryおよびLicense Window
- Format、Bitrate、Issue TimeおよびExpiry

CredentialまたはPrivilegeの取消しは、定義された伝播時間内に新規Playback Sessionを拒否する。進行中StreamのGrace BehaviorはSubscriptionおよびRightsの規則を超えて拡張しない。

## 10. STO and Legal Boundary

Early Supporter SBTはSecurity Token、株主権、投資元本、配当、収益分配、換金請求権またはプロトコルガバナンス Voting Powerを表さない。

SBT Contract、発行条件、利用規約、表示、会計および監査証跡をSTOから分離する。STO投資家だけへの付与、投資額連動、料金減免その他の経済的価値を導入する場合は、実装または募集前にOperating Companyが金融規制、会計・税務、消費者保護および開示を専門家と確認する。

## 11. Privacy and ユーザ制御

Public SBTはWalletとEarly Supporter属性の関連を第三者に公開する。発行前に公開範囲、Metadata、Burn権限、失効、再発行およびAccount連携を説明し、明示的な受領意思を取得する。

表示名、メッセージ、支援額、視聴履歴またはLegal IdentityをToken Metadataへ保存しない。将来Privacy要求が高まる場合は、非公開CredentialまたはZero-Knowledge Proofへの移行を別ADRで検討する。

## 12. Alternatives Considered

### SBT alone grants all streaming

SubscriptionとRightsの境界を迂回し、永久かつ過大な権利と誤認されるため採用しない。

### Query blockchain synchronously for every media request

RPC停止、Latency、Rate LimitおよびChain ReorganizationがPlayback Pathへ直接影響するため採用しない。

### Store privileges permanently in token metadata

Rights、Territory、License Window、Planおよび法的条件の変更へ安全に対応できないため採用しない。

### Give the SBT governance or revenue rights

Community Reputationを投資・経済力・Protocol支配へ変換し、Whitepaperの目的とGlobal Invariantsに反するため採用しない。

## 13. Consequences

### Positive

- 一般SupporterとEarly Supporterを重複Tokenではなく一つの監査可能なTierモデルで表現できる
- Early Supportを譲渡不能な履歴として可視化できる
- SubscriptionとRightsの既存境界を維持できる
- NavidromeをCredentialまたはPolicyのSource of Truthにしない
- PrivilegeをRightsと利用規約に応じて更新・停止できる
- STO、Revenue DistributionおよびGovernanceから分離できる

### Trade-offs

- Credential IndexerとRead Modelが追加される
- Wallet紛失、Account Recoveryおよび再発行の運用が必要になる
- Public WalletとCommunity属性のPrivacyリスクが生じる
- 特権の経済的価値に応じて法務、税務、会計および消費者対応が必要になる

## 14. Testnet Acceptance Criteria

1. 金銭的価値を持たないDemo SBTをTestnetへDeployする
2. ユーザの同意後だけ一つのQualificationにつき一つ発行する
3. Transfer操作を拒否する
4. Active Subscription、Active Rights、Active SBTおよび一致するPrivilegeで限定試験音を再生できる
5. SBTがなくても通常Planで許可された試験音は再生できる
6. SBTだけでSubscriptionまたはRightsを迂回できない
7. 音楽クリエーター対象範囲、Policy Version、TerritoryまたはContent Version不一致を拒否する
8. RevokeまたはBurn後、定義された時間内に新規Playback Sessionを拒否する
9. staleまたはreorganization-unsafeなCredential Read ModelでFail Closedになる
10. Wallet Recovery時に旧Credentialが無効化され、新Credentialとの監査Linkが残る
11. NavidromeへGatewayを迂回して到達できない
12. Token Metadata、LogおよびDelivery Evidenceに個人情報、支援額または詳細な公開視聴履歴を含めない
13. `MockJPYC`の確定済みPaymentをQualificationに使う場合、誤Asset、誤Chain、未確定および重複Paymentから発行しない
14. ユーザがTest ETHを保持しなくてもRelayer経由で発行でき、Gas Sponsorshipを支払・資格または発行成功として扱わない
15. Relayer、Issuer、RevokerおよびDeployerの権限と鍵を分離し、Repositoryや公開Logへ秘密を残さない

## 15. Related Documents

- [Whitepaper: Platform Architecture](/whitepaper/04-platform-architecture)
- [Whitepaper: Discovery and Community](/whitepaper/08-discovery-community)
- [Whitepaper: Legal, STO and Tax](/whitepaper/11-legal-sto-tax)
- [ADR-0008 Account / Wallet / Identity Strategy](./ADR-0008-account-wallet-identity-strategy.md)
- [ADR-0009 Navidrome / Streaming Gateway](./ADR-0009-navidrome-streaming-gateway.md)
- [SPEC-ACCOUNT-004 Supporter Credential, Early Tier and Privilege](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/account/early-supporter-credential-spec.md)
- [SPEC-STREAMING-001 Playback Authorization](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/streaming/playback-authorization-spec.md)
- [SPEC-STREAMING-002 Player Client and Gateway Interaction](https://github.com/ShigeichiroYamasaki/creator-first-platform/blob/main/protocol/streaming/player-client-spec.md)
