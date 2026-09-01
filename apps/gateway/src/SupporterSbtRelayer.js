import { createHash } from 'node:crypto'
import {
  createPublicClient,
  createWalletClient,
  fallback,
  getAddress,
  http,
  parseAbi,
  recoverTypedDataAddress
} from 'viem'
import { polygonAmoy } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const AMOY_MIN_PRIORITY_FEE = 25_000_000_000n
const MAX_INTENT_LIFETIME_SECONDS = 15n * 60n
const TESTNET_USER_ROLE = 1

const supporterSbtAbi = parseAbi([
  'function RELAYER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
  'function nonces(address holder) view returns (uint256)',
  'function activeTokenOf(bytes32 creatorId,address holder) view returns (uint256)',
  'function getSupporterTier(bytes32 creatorId,address holder) view returns (uint8)',
  'function registerSupporterWithSignature(bytes32 creatorId,address holder,uint256 nonce,uint256 deadline,bytes32 consentVersion,bytes signature) returns (uint256 tokenId,uint8 tier)'
])

const participantRegistryAbi = parseAbi([
  'function isRegistered(address wallet,uint8 role) view returns (bool)'
])

export class SupporterSbtRelayError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

function typedData({ chainId, supporterSbt, creatorId, holder, nonce, deadline, consentVersion }) {
  return {
    domain: {
      name: 'Creator First Supporter SBT',
      version: '1',
      chainId,
      verifyingContract: supporterSbt
    },
    types: {
      SupportIntent: [
        { name: 'creatorId', type: 'bytes32' },
        { name: 'holder', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'consentVersion', type: 'bytes32' }
      ]
    },
    primaryType: 'SupportIntent',
    message: { creatorId, holder, nonce, deadline, consentVersion }
  }
}

function bytes32(value, name) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new SupporterSbtRelayError(400, `INVALID_${name}`, `${name} must be a bytes32 value`)
  }
  return value
}

function unsignedInteger(value, name) {
  try {
    const parsed = BigInt(value)
    if (parsed < 0n) throw new Error('negative')
    return parsed
  } catch {
    throw new SupporterSbtRelayError(400, `INVALID_${name}`, `${name} must be an unsigned integer`)
  }
}

function safeChainMessage(error) {
  const values = []
  let current = error
  for (let depth = 0; current && depth < 5; depth += 1) {
    for (const key of ['shortMessage', 'message', 'details']) {
      if (typeof current[key] === 'string') values.push(current[key])
    }
    current = current.cause
  }
  const message = values.find((value) => value.length <= 240) ?? 'Polygon Amoy Supporter SBT relay failed'
  return message.replace(/0x[0-9a-f]{64}/gi, '[transaction]').slice(0, 240)
}

export class AmoySupporterSbtChain {
  constructor({ rpcUrls, supporterSbtAddress, participantRegistryAddress, relayerPrivateKey }) {
    this.supporterSbtAddress = getAddress(supporterSbtAddress)
    this.participantRegistryAddress = getAddress(participantRegistryAddress)
    this.account = privateKeyToAccount(relayerPrivateKey)
    const transport = () => fallback(rpcUrls.map((rpcUrl) => http(rpcUrl, { timeout: 20_000 })))
    this.publicClient = createPublicClient({ chain: polygonAmoy, transport: transport() })
    this.walletClient = createWalletClient({ account: this.account, chain: polygonAmoy, transport: transport() })
  }

  get relayerAddress() {
    return this.account.address
  }

  async transactionFees() {
    const block = await this.publicClient.getBlock()
    const baseFee = block.baseFeePerGas ?? 0n
    return {
      maxPriorityFeePerGas: AMOY_MIN_PRIORITY_FEE,
      maxFeePerGas: baseFee * 2n + AMOY_MIN_PRIORITY_FEE
    }
  }

  async status(holder, creatorId) {
    const [registered, nonce, tokenId, tier] = await Promise.all([
      this.publicClient.readContract({
        address: this.participantRegistryAddress,
        abi: participantRegistryAbi,
        functionName: 'isRegistered',
        args: [holder, TESTNET_USER_ROLE]
      }),
      this.publicClient.readContract({
        address: this.supporterSbtAddress,
        abi: supporterSbtAbi,
        functionName: 'nonces',
        args: [holder]
      }),
      this.publicClient.readContract({
        address: this.supporterSbtAddress,
        abi: supporterSbtAbi,
        functionName: 'activeTokenOf',
        args: [creatorId, holder]
      }),
      this.publicClient.readContract({
        address: this.supporterSbtAddress,
        abi: supporterSbtAbi,
        functionName: 'getSupporterTier',
        args: [creatorId, holder]
      })
    ])
    return { registered, nonce, tokenId, tier: Number(tier) }
  }

  async ready() {
    const role = await this.publicClient.readContract({
      address: this.supporterSbtAddress,
      abi: supporterSbtAbi,
      functionName: 'RELAYER_ROLE'
    })
    const [hasRole, balance] = await Promise.all([
      this.publicClient.readContract({
        address: this.supporterSbtAddress,
        abi: supporterSbtAbi,
        functionName: 'hasRole',
        args: [role, this.account.address]
      }),
      this.publicClient.getBalance({ address: this.account.address })
    ])
    return hasRole && balance > 0n
  }

  async relay(value) {
    const fees = await this.transactionFees()
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.supporterSbtAddress,
      abi: supporterSbtAbi,
      functionName: 'registerSupporterWithSignature',
      args: [value.creatorId, value.holder, value.nonce, value.deadline, value.consentVersion, value.signature],
      ...fees
    })
    const transactionHash = await this.walletClient.writeContract(request)
    // Return as soon as Amoy accepts the transaction. Waiting for multiple
    // confirmations here can outlive the public HTTPS proxy and incorrectly
    // surface a 502 even though the transaction is still progressing.
    return { transactionHash, submitted: true }
  }
}

export class SupporterSbtRelayer {
  constructor({ chain, chainId = 80002, supporterSbtAddress, allowedCreatorIds = [] }) {
    this.chain = chain
    this.chainId = chainId
    this.supporterSbtAddress = getAddress(supporterSbtAddress)
    this.allowedCreatorIds = new Set(allowedCreatorIds.map((value) => value.toLowerCase()))
    this.operations = new Map()
    this.availabilityCache = { checkedAt: 0, value: false }
  }

  get enabled() {
    return Boolean(this.chain)
  }

  async available() {
    if (Date.now() - this.availabilityCache.checkedAt < 30_000) return this.availabilityCache.value
    let value = false
    try {
      value = await this.chain.ready()
    } catch {
      value = false
    }
    this.availabilityCache = { checkedAt: Date.now(), value }
    return value
  }

  async relay(input) {
    if (!await this.available()) {
      throw new SupporterSbtRelayError(503, 'SUPPORTER_RELAYER_NOT_READY', 'Sponsored Supporter SBT registration is not ready')
    }
    let holder
    try {
      holder = getAddress(input.holder)
    } catch {
      throw new SupporterSbtRelayError(400, 'INVALID_HOLDER', 'Supporter wallet address is invalid')
    }
    const creatorId = bytes32(input.creatorId, 'CREATOR_ID')
    const consentVersion = bytes32(input.consentVersion, 'CONSENT_VERSION')
    if (!this.allowedCreatorIds.has(creatorId.toLowerCase())) {
      throw new SupporterSbtRelayError(403, 'CREATOR_NOT_SPONSORED', 'This creator is not enabled for sponsored registration')
    }
    const nonce = unsignedInteger(input.nonce, 'NONCE')
    const deadline = unsignedInteger(input.deadline, 'DEADLINE')
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (deadline < now || deadline > now + MAX_INTENT_LIFETIME_SECONDS) {
      throw new SupporterSbtRelayError(400, 'INVALID_DEADLINE', 'Support intent deadline is expired or too far in the future')
    }
    if (typeof input.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(input.signature)) {
      throw new SupporterSbtRelayError(400, 'INVALID_SIGNATURE', 'Support intent signature is invalid')
    }
    if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) {
      throw new SupporterSbtRelayError(400, 'INVALID_IDEMPOTENCY_KEY', 'A valid idempotency key is required')
    }

    const operationHash = createHash('sha256').update(JSON.stringify({
      holder,
      creatorId: creatorId.toLowerCase(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
      consentVersion: consentVersion.toLowerCase(),
      signature: input.signature.toLowerCase()
    })).digest('hex')
    const operationKey = `${holder}:${input.idempotencyKey}`
    const prior = this.operations.get(operationKey)
    if (prior) {
      if (prior.hash !== operationHash) {
        throw new SupporterSbtRelayError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was reused for another support intent')
      }
      return prior.promise
    }

    const operation = this.#relay({ holder, creatorId, nonce, deadline, consentVersion, signature: input.signature })
    if (this.operations.size >= 512) this.operations.delete(this.operations.keys().next().value)
    this.operations.set(operationKey, { hash: operationHash, promise: operation })
    try {
      return await operation
    } catch (error) {
      this.operations.delete(operationKey)
      throw error
    }
  }

  async #relay(value) {
    let recovered
    try {
      recovered = await recoverTypedDataAddress({
        ...typedData({ chainId: this.chainId, supporterSbt: this.supporterSbtAddress, ...value }),
        signature: value.signature
      })
    } catch {
      throw new SupporterSbtRelayError(401, 'SUPPORT_SIGNATURE_INVALID', 'Support intent signature is invalid')
    }
    if (getAddress(recovered) !== value.holder) {
      throw new SupporterSbtRelayError(401, 'SUPPORT_SIGNER_MISMATCH', 'Support intent signer does not match the holder')
    }

    const before = await this.chain.status(value.holder, value.creatorId)
    if (!before.registered) {
      throw new SupporterSbtRelayError(403, 'PARTICIPANT_REGISTRATION_REQUIRED', 'The wallet is not registered as a test listener')
    }
    if (before.tokenId > 0n) return this.#result(value.holder, undefined, before, true)
    if (before.nonce !== value.nonce) {
      throw new SupporterSbtRelayError(409, 'SUPPORT_NONCE_MISMATCH', 'Support intent nonce is no longer current')
    }

    try {
      const result = await this.chain.relay(value)
      if (result.submitted) {
        return {
          status: 'SBT_SUBMITTED',
          holder: value.holder,
          transactionHash: result.transactionHash
        }
      }
      if (result.tokenId === 0n) throw new Error('Supporter SBT was not active after confirmation')
      return this.#result(value.holder, result.transactionHash, result, false)
    } catch (error) {
      if (error instanceof SupporterSbtRelayError) throw error
      throw new SupporterSbtRelayError(502, 'SUPPORTER_RELAY_FAILED', safeChainMessage(error))
    }
  }

  #result(holder, transactionHash, status, alreadyActive) {
    return {
      status: 'SBT_ACTIVE',
      holder,
      tokenId: status.tokenId.toString(),
      tier: status.tier,
      transactionHash: transactionHash ?? null,
      alreadyActive
    }
  }
}
