import { createHash, randomBytes, randomUUID } from 'node:crypto'
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server'
import { getAddress, recoverTypedDataAddress } from 'viem'

const POLICY_VERSION = 1
const PURPOSE = 'CFP_TESTNET_ACCOUNT_WALLET_BINDING'

const defaultWebAuthn = {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
}

export class AccountTrustError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function bytes32() {
  return `0x${randomBytes(32).toString('hex')}`
}

function requireValue(condition, status, code, message) {
  if (!condition) throw new AccountTrustError(status, code, message)
}

function credentialView(credential) {
  return {
    id: credential.credential_id,
    publicKey: new Uint8Array(Buffer.from(credential.public_key, 'base64url')),
    counter: credential.counter,
    transports: JSON.parse(credential.transports_json),
    deviceType: credential.device_type,
    backedUp: Boolean(credential.backed_up)
  }
}

export class AccountTrustService {
  constructor({ config, store, webauthn = defaultWebAuthn, now = () => Date.now() }) {
    this.config = config
    this.store = store
    this.webauthn = webauthn
    this.now = now
    this.transactions = new Map()
  }

  #transaction(account, bindingId, expectedState) {
    const transaction = this.transactions.get(bindingId)
    requireValue(
      transaction && transaction.ownerId === account.accountId,
      404,
      'TRUST_BINDING_NOT_FOUND',
      'Account binding transaction was not found'
    )
    requireValue(transaction.expiresAt > this.now(), 410, 'TRUST_BINDING_EXPIRED', 'Account binding transaction expired')
    if (expectedState) {
      requireValue(
        transaction.state === expectedState,
        409,
        'TRUST_BINDING_STATE_INVALID',
        `Account binding must be in ${expectedState} state`
      )
    }
    return transaction
  }

  #csrf(transaction, token) {
    requireValue(
      typeof token === 'string' && token === transaction.csrfToken,
      403,
      'TRUST_CSRF_INVALID',
      'Account binding CSRF token is invalid'
    )
  }

  #transition(transaction, state, detail = {}) {
    transaction.state = state
    transaction.updatedAt = new Date(this.now()).toISOString()
    this.store.updateTrustBinding({
      bindingId: transaction.bindingId,
      state,
      walletAddress: detail.walletAddress,
      passkeyCredentialId: detail.passkeyCredentialId,
      updatedAt: transaction.updatedAt
    })
    this.store.recordTrustAuditEvent({
      eventId: randomUUID(),
      bindingId: transaction.bindingId,
      ownerId: transaction.ownerId,
      eventType: state,
      occurredAt: transaction.updatedAt,
      detail: JSON.stringify({ mode: 'test-only', ...detail })
    })
  }

  status(account) {
    const binding = this.store.activeTrustBinding(account.accountId)
    return {
      mode: 'MOCK_JPKI_TEST_ONLY',
      rpId: this.config.webauthnRpId,
      expectedOrigin: this.config.webauthnOrigin,
      chainId: this.config.chainId,
      binding: binding
        ? {
            bindingId: binding.binding_id,
            state: binding.state,
            assuranceLevel: binding.state === 'ACTIVE' ? 'WALLET_BOUND' : binding.state,
            walletAddress: binding.wallet_address,
            passkeyRegistered: Boolean(binding.passkey_credential_id),
            updatedAt: binding.updated_at
          }
        : null,
      passkeyAuthenticated: account.passkeyAuthenticated === true
    }
  }

  begin(account) {
    requireValue(account.demoUser?.registered, 403, 'TEST_USER_REQUIRED', 'Register a Test User before account binding')
    const existing = this.store.activeTrustBinding(account.accountId)
    requireValue(!existing || existing.state !== 'ACTIVE', 409, 'TRUST_BINDING_ALREADY_ACTIVE', 'An active binding already exists')
    requireValue(
      !existing || Date.parse(existing.expires_at) <= this.now(),
      409,
      'TRUST_BINDING_IN_PROGRESS',
      'An account binding transaction is already in progress'
    )

    const createdAt = new Date(this.now()).toISOString()
    const bindingId = randomUUID()
    const transaction = {
      bindingId,
      ownerId: account.accountId,
      state: 'CREATED',
      csrfToken: randomBytes(24).toString('base64url'),
      jpkiChallenge: randomBytes(18).toString('base64url'),
      accountSubjectCommitment: bytes32(),
      createdAt,
      updatedAt: createdAt,
      expiresAt: this.now() + this.config.trustBindingTtlMs,
      registrationChallenge: undefined,
      walletIntent: undefined
    }
    this.transactions.set(bindingId, transaction)
    this.store.createTrustBinding({
      bindingId,
      ownerId: account.accountId,
      accountSubjectCommitment: transaction.accountSubjectCommitment,
      state: transaction.state,
      createdAt,
      expiresAt: new Date(transaction.expiresAt).toISOString()
    })
    this.store.recordTrustAuditEvent({
      eventId: randomUUID(), bindingId, ownerId: account.accountId, eventType: 'CREATED', occurredAt: createdAt,
      detail: JSON.stringify({ mode: 'test-only' })
    })
    return {
      bindingId,
      state: transaction.state,
      csrfToken: transaction.csrfToken,
      expiresAt: new Date(transaction.expiresAt).toISOString(),
      mockJpki: {
        challenge: transaction.jpkiChallenge,
        mode: 'MOCK_JPKI_TEST_ONLY',
        disclosure: '実在するマイナンバーカード、電子証明書、氏名、住所またはマイナンバーを使用しません。'
      }
    }
  }

  assertMockJpki(account, bindingId, body) {
    const transaction = this.#transaction(account, bindingId, 'CREATED')
    this.#csrf(transaction, body.csrfToken)
    requireValue(
      body.challenge === transaction.jpkiChallenge,
      401,
      'MOCK_JPKI_CHALLENGE_INVALID',
      'Mock JPKI challenge is invalid'
    )
    requireValue(
      body.acknowledgedTestOnly === true && body.consentToBinding === true,
      400,
      'MOCK_JPKI_CONSENT_REQUIRED',
      'Test-only acknowledgement and binding consent are required'
    )
    transaction.jpkiChallenge = undefined
    this.#transition(transaction, 'JPKI_ASSERTED', { adapter: 'mock-jpki-v1' })
    return { bindingId, state: transaction.state, assuranceLevel: 'JPKI_VERIFIED', mode: 'MOCK_JPKI_TEST_ONLY' }
  }

  async registrationOptions(account, bindingId, body) {
    const transaction = this.#transaction(account, bindingId, 'JPKI_ASSERTED')
    this.#csrf(transaction, body.csrfToken)
    const options = await this.webauthn.generateRegistrationOptions({
      rpName: this.config.webauthnRpName,
      rpID: this.config.webauthnRpId,
      userID: new TextEncoder().encode(account.accountId),
      userName: account.demoUser.testUserId,
      userDisplayName: account.demoUser.displayName,
      timeout: 60_000,
      attestationType: 'none',
      excludeCredentials: this.store.webauthnCredentials(account.accountId).map((credential) => ({
        id: credential.credential_id,
        transports: JSON.parse(credential.transports_json)
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'required'
      }
    })
    transaction.registrationChallenge = options.challenge
    return options
  }

  async verifyRegistration(account, bindingId, body) {
    const transaction = this.#transaction(account, bindingId, 'JPKI_ASSERTED')
    this.#csrf(transaction, body.csrfToken)
    requireValue(transaction.registrationChallenge, 409, 'PASSKEY_OPTIONS_REQUIRED', 'Passkey registration options are required')
    let verification
    try {
      verification = await this.webauthn.verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: transaction.registrationChallenge,
        expectedOrigin: this.config.webauthnOrigin,
        expectedRPID: this.config.webauthnRpId,
        requireUserPresence: true,
        requireUserVerification: true
      })
    } catch {
      throw new AccountTrustError(401, 'PASSKEY_REGISTRATION_INVALID', 'Passkey registration could not be verified')
    }
    requireValue(verification.verified && verification.registrationInfo, 401, 'PASSKEY_REGISTRATION_INVALID', 'Passkey registration could not be verified')
    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo
    this.store.saveWebauthnCredential({
      credentialId: credential.id,
      ownerId: account.accountId,
      publicKey: Buffer.from(credential.publicKey).toString('base64url'),
      counter: credential.counter,
      transports: JSON.stringify(credential.transports ?? body.response?.response?.transports ?? []),
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      createdAt: new Date(this.now()).toISOString()
    })
    transaction.registrationChallenge = undefined
    account.passkeyAuthenticated = true
    this.#transition(transaction, 'PASSKEY_REGISTERED', { passkeyCredentialId: credential.id })
    return { bindingId, state: transaction.state, passkeyRegistered: true, userVerified: true }
  }

  async authenticationOptions(account) {
    const credentials = this.store.webauthnCredentials(account.accountId)
    requireValue(credentials.length > 0, 404, 'PASSKEY_NOT_REGISTERED', 'No passkey is registered')
    const options = await this.webauthn.generateAuthenticationOptions({
      rpID: this.config.webauthnRpId,
      timeout: 60_000,
      userVerification: 'required',
      allowCredentials: credentials.map((credential) => ({
        id: credential.credential_id,
        transports: JSON.parse(credential.transports_json)
      }))
    })
    account.authenticationChallenge = options.challenge
    return options
  }

  async verifyAuthentication(account, body) {
    requireValue(account.authenticationChallenge, 409, 'PASSKEY_OPTIONS_REQUIRED', 'Passkey authentication options are required')
    const stored = this.store.webauthnCredential(body.response?.id, account.accountId)
    requireValue(stored, 401, 'PASSKEY_CREDENTIAL_UNKNOWN', 'Passkey credential is unknown')
    let verification
    try {
      verification = await this.webauthn.verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: account.authenticationChallenge,
        expectedOrigin: this.config.webauthnOrigin,
        expectedRPID: this.config.webauthnRpId,
        credential: credentialView(stored),
        requireUserVerification: true
      })
    } catch {
      throw new AccountTrustError(401, 'PASSKEY_AUTHENTICATION_INVALID', 'Passkey authentication could not be verified')
    }
    requireValue(verification.verified, 401, 'PASSKEY_AUTHENTICATION_INVALID', 'Passkey authentication could not be verified')
    this.store.updateWebauthnCounter(stored.credential_id, verification.authenticationInfo.newCounter)
    account.authenticationChallenge = undefined
    account.passkeyAuthenticated = true
    return { authenticated: true, assuranceLevel: 'PASSKEY_ACCOUNT' }
  }

  walletOptions(account, bindingId, body) {
    const transaction = this.#transaction(account, bindingId, 'PASSKEY_REGISTERED')
    this.#csrf(transaction, body.csrfToken)
    requireValue(account.passkeyAuthenticated === true, 401, 'PASSKEY_AUTHENTICATION_REQUIRED', 'Passkey authentication is required')
    let walletAddress
    try {
      walletAddress = getAddress(body.walletAddress)
    } catch {
      throw new AccountTrustError(400, 'INVALID_WALLET_ADDRESS', 'Wallet address is invalid')
    }
    requireValue(body.chainId === this.config.chainId, 400, 'CHAIN_NOT_ALLOWED', 'Only Polygon Amoy is allowed')
    const issuedAt = Math.floor(this.now() / 1000)
    const deadline = issuedAt + 300
    const typedData = {
      domain: { name: 'Creator First Account Trust Demo', version: '1', chainId: this.config.chainId },
      primaryType: 'WalletBindingIntent',
      types: {
        WalletBindingIntent: [
          { name: 'accountSubjectCommitment', type: 'bytes32' },
          { name: 'walletAddress', type: 'address' },
          { name: 'chainId', type: 'uint256' },
          { name: 'bindingNonce', type: 'bytes32' },
          { name: 'issuedAt', type: 'uint64' },
          { name: 'deadline', type: 'uint64' },
          { name: 'purpose', type: 'string' },
          { name: 'policyVersion', type: 'uint32' }
        ]
      },
      message: {
        accountSubjectCommitment: transaction.accountSubjectCommitment,
        walletAddress,
        chainId: String(this.config.chainId),
        bindingNonce: bytes32(),
        issuedAt: String(issuedAt),
        deadline: String(deadline),
        purpose: PURPOSE,
        policyVersion: POLICY_VERSION
      }
    }
    transaction.walletIntent = { typedData, walletAddress, deadline, used: false }
    return { bindingId, typedData, disclosure: { paymentAuthorizationIncluded: false, transactionIncluded: false, testOnly: true } }
  }

  async verifyWallet(account, bindingId, body) {
    const transaction = this.#transaction(account, bindingId, 'PASSKEY_REGISTERED')
    this.#csrf(transaction, body.csrfToken)
    const intent = transaction.walletIntent
    requireValue(intent && !intent.used && intent.deadline > this.now() / 1000, 410, 'WALLET_INTENT_EXPIRED', 'Wallet binding intent expired')
    let recovered
    try {
      recovered = await recoverTypedDataAddress({ ...intent.typedData, signature: body.signature })
    } catch {
      throw new AccountTrustError(401, 'WALLET_BINDING_SIGNATURE_INVALID', 'Wallet binding signature is invalid')
    }
    requireValue(getAddress(recovered) === intent.walletAddress, 401, 'WALLET_BINDING_SIGNER_MISMATCH', 'Wallet binding signer does not match')
    intent.used = true
    account.walletAddress = intent.walletAddress
    this.#transition(transaction, 'WALLET_BOUND', { walletAddress: intent.walletAddress })
    this.#transition(transaction, 'ACTIVE', { walletAddress: intent.walletAddress })
    return {
      bindingId,
      state: transaction.state,
      assuranceLevel: 'WALLET_BOUND',
      walletAddress: intent.walletAddress,
      chainId: this.config.chainId,
      testOnly: true
    }
  }
}
