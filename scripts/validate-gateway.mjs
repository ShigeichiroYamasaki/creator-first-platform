import { readFile } from 'node:fs/promises'

const requiredFiles = [
  'apps/gateway/src/server.js',
  'apps/gateway/src/AccountTrustService.js',
  'apps/gateway/src/ParticipantInvitationService.js',
  'apps/gateway/src/InvitationMailer.js',
  'apps/gateway/src/GatewayStore.js',
  'apps/gateway/src/media/FileMediaAdapter.js',
  'apps/gateway/src/media/NavidromeMediaAdapter.js',
  'apps/gateway/test/gateway.test.mjs'
]

const contents = await Promise.all(requiredFiles.map((file) => readFile(file, 'utf8')))
const source = contents.join('\n')
const requirements = [
  ['/v1/playback-sessions', 'Playback Session API'],
  ['/v1/streams/', 'opaque stream API'],
  ['Remote-User', 'forged identity negative test'],
  ['recoverMessageAddress', 'SIWE signature recovery'],
  ['recoverTypedDataAddress', 'EIP-712 signature recovery'],
  ['Content-Range', 'Range delivery'],
  ['delivery_evidence', 'Delivery Evidence store'],
  ['CATALOG_MAPPING_UNAVAILABLE', 'fail-closed mapping'],
  ['SUBSCRIPTION_INACTIVE', 'subscription decision'],
  ['SUPPORTER_REQUIRED', 'credential overlay decision'],
  ['/v1/demo/users', 'Test User registration API'],
  ['demo_user_registrations', 'Test User audit record'],
  ['/v1/account-trust/bindings', 'Account Trust binding API'],
  ['verifyRegistrationResponse', 'WebAuthn registration verification'],
  ['verifyAuthenticationResponse', 'WebAuthn authentication verification'],
  ['WALLET_BINDING_SIGNER_MISMATCH', 'Wallet binding signer check'],
  ['account_trust_audit_events', 'Account Trust audit record'],
  ['/v1/admin/participant-invitations', 'administrator invitation API'],
  ['participant_invitation_audit_events', 'participant invitation audit record'],
  ['INVITATION_ALREADY_CLAIMED', 'single-use invitation enforcement']
]

const missing = requirements.filter(([needle]) => !source.includes(needle))
if (missing.length) {
  throw new Error(`Gateway validation failed: ${missing.map(([, label]) => label).join(', ')}`)
}

const consistencyRequirements = [
  ['docs/adr/ADR-0009-navidrome-streaming-gateway.md', '/v1/demo/users', 'ADR-0009 Test Harness API'],
  ['docs/adr/ADR-0011-integrated-player-client.md', '登録の有無は認可を変更しない', 'ADR-0011 authorization isolation'],
  ['protocol/account/account-lifecycle-spec.md', 'cannot satisfy `REQ-ACCOUNT-068`–`REQ-ACCOUNT-114` acceptance as a whole', 'Account specification boundary'],
  ['protocol/streaming/player-client-spec.md', 'MUST NOT satisfy any authentication or authorization precondition', 'Player specification boundary'],
  ['decisions/mock-assumptions.yaml', 'is never an authorization input', 'Mock assumption boundary'],
  ['docs/demo/index.md', '再生、ウォレット連携、サブスクリプションまたはSBT資格の認可条件にも使用しません', 'Demo user-facing boundary'],
  ['docs/protocol/vertical-slice.md', 'エンドツーエンド最小縦断実装は未成立', 'Vertical Slice status'],
  ['docs/status.md', 'ローカル再生・アカウント結合部分実装', 'Project status'],
  ['docs/adr/ADR-0019-jpki-passkey-wallet-binding-testnet.md', 'SimpleWebAuthnによる登録・認証検証', 'ADR-0019 implementation boundary'],
  ['docs/demo/test-user-registration.md', '<AccountTrustDemo />', 'Account Trust demo UI'],
  ['docs/adr/ADR-0020-wallet-agnostic-participant-invitations.md', '一回限りトークン', 'ADR-0020 invitation boundary'],
  ['protocol/account/account-lifecycle-spec.md', 'REQ-ACCOUNT-123', 'Account invitation requirements'],
  ['docs/admin/participant-invitations.md', '<ParticipantAdminDemo />', 'participant administrator UI'],
  ['docs/demo/participant-registration.md', '<ParticipantInvitationRegistration />', 'participant invitation claim UI']
]

const consistencyContents = new Map(await Promise.all(
  [...new Set(consistencyRequirements.map(([file]) => file))].map(async (file) => [file, await readFile(file, 'utf8')])
))
const inconsistent = consistencyRequirements.filter(([file, needle]) => !consistencyContents.get(file).includes(needle))
if (inconsistent.length) {
  throw new Error(`Gateway documentation consistency failed: ${inconsistent.map(([, , label]) => label).join(', ')}`)
}

console.log(`Gateway validation passed: ${requiredFiles.length} source/test files, ${requirements.length} boundaries and ${consistencyRequirements.length} implementation/design consistency checks.`)
