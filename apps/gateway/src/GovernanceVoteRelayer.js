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

const governorAbi = parseAbi([
  'function RELAYER_ROLE() view returns (bytes32)',
  'function hasRole(bytes32 role,address account) view returns (bool)',
  'function votingNonces(address member) view returns (uint256)',
  'function memberHouse(uint256 sessionId,address member) view returns (uint8)',
  'function ballots(uint256 proposalId,address member) view returns (int8 intensity,uint32 cost,bool cast)',
  'function castCfpApprovalVoteBySig(uint256 proposalId,uint256 sessionId,uint8 house,address member,int8 intensity,uint256 nonce,uint256 deadline,bytes signature)'
])

export class GovernanceVoteRelayError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}

export function governanceBallotTypedData({ chainId, governor, proposalId, sessionId, house, member, intensity, nonce, deadline }) {
  return {
    domain: {
      name: 'Creator First Bicameral Governor',
      version: '1',
      chainId,
      verifyingContract: governor
    },
    types: {
      CfpBallot: [
        { name: 'proposalId', type: 'uint256' },
        { name: 'sessionId', type: 'uint256' },
        { name: 'house', type: 'uint8' },
        { name: 'member', type: 'address' },
        { name: 'intensity', type: 'int8' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    },
    primaryType: 'CfpBallot',
    message: { proposalId, sessionId, house, member, intensity, nonce, deadline }
  }
}

function uint(value, name) {
  try {
    const parsed = BigInt(value)
    if (parsed < 0n) throw new Error('negative')
    return parsed
  } catch {
    throw new GovernanceVoteRelayError(400, `INVALID_${name}`, `${name} must be an unsigned integer`)
  }
}

function safeChainMessage(error) {
  const messages = []
  let current = error
  for (let depth = 0; current && depth < 5; depth += 1) {
    for (const key of ['shortMessage', 'message', 'details']) {
      if (typeof current[key] === 'string') messages.push(current[key])
    }
    current = current.cause
  }
  return (messages.find((value) => value.length <= 240) ?? 'Polygon Amoy governance relay failed')
    .replace(/0x[0-9a-f]{64}/gi, '[transaction]').slice(0, 240)
}

export class AmoyGovernanceVoteChain {
  constructor({ rpcUrls, governorAddress, relayerPrivateKey }) {
    this.governorAddress = getAddress(governorAddress)
    this.account = privateKeyToAccount(relayerPrivateKey)
    const transport = () => fallback(rpcUrls.map((url) => http(url, { timeout: 20_000 })))
    this.publicClient = createPublicClient({ chain: polygonAmoy, transport: transport() })
    this.walletClient = createWalletClient({ account: this.account, chain: polygonAmoy, transport: transport() })
  }

  get relayerAddress() { return this.account.address }

  async ready() {
    const role = await this.publicClient.readContract({ address: this.governorAddress, abi: governorAbi, functionName: 'RELAYER_ROLE' })
    const [hasRole, balance] = await Promise.all([
      this.publicClient.readContract({ address: this.governorAddress, abi: governorAbi, functionName: 'hasRole', args: [role, this.account.address] }),
      this.publicClient.getBalance({ address: this.account.address })
    ])
    return hasRole && balance > 0n
  }

  async status({ proposalId, sessionId, member }) {
    const [nonce, house, ballot] = await Promise.all([
      this.publicClient.readContract({ address: this.governorAddress, abi: governorAbi, functionName: 'votingNonces', args: [member] }),
      this.publicClient.readContract({ address: this.governorAddress, abi: governorAbi, functionName: 'memberHouse', args: [sessionId, member] }),
      this.publicClient.readContract({ address: this.governorAddress, abi: governorAbi, functionName: 'ballots', args: [proposalId, member] })
    ])
    return { nonce, house: Number(house), intensity: Number(ballot[0]), cost: Number(ballot[1]), cast: ballot[2] }
  }

  async relay(value) {
    const block = await this.publicClient.getBlock()
    const fees = {
      maxPriorityFeePerGas: AMOY_MIN_PRIORITY_FEE,
      maxFeePerGas: (block.baseFeePerGas ?? 0n) * 2n + AMOY_MIN_PRIORITY_FEE
    }
    const args = [value.proposalId, value.sessionId, value.house, value.member, value.intensity, value.nonce, value.deadline, value.signature]
    const { request } = await this.publicClient.simulateContract({
      account: this.account,
      address: this.governorAddress,
      abi: governorAbi,
      functionName: 'castCfpApprovalVoteBySig',
      args,
      ...fees
    })
    const transactionHash = await this.walletClient.writeContract(request)
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 2, timeout: 120_000 })
    if (receipt.status !== 'success') throw new Error('Polygon Amoy governance vote reverted')
    return { transactionHash, blockNumber: receipt.blockNumber, ...await this.status(value) }
  }
}

export class GovernanceVoteRelayer {
  constructor({ chain, chainId = 80002, governorAddress }) {
    this.chain = chain
    this.chainId = chainId
    this.governorAddress = getAddress(governorAddress)
    this.operations = new Map()
    this.availabilityCache = { checkedAt: 0, value: false }
  }

  async available() {
    if (Date.now() - this.availabilityCache.checkedAt < 30_000) return this.availabilityCache.value
    let value = false
    try { value = await this.chain.ready() } catch { value = false }
    this.availabilityCache = { checkedAt: Date.now(), value }
    return value
  }

  async relay(input) {
    if (!await this.available()) throw new GovernanceVoteRelayError(503, 'GOVERNANCE_RELAYER_NOT_READY', 'Sponsored governance voting is not ready')
    let member
    try { member = getAddress(input.member) } catch { throw new GovernanceVoteRelayError(400, 'INVALID_MEMBER', 'Member wallet address is invalid') }
    const proposalId = uint(input.proposalId, 'PROPOSAL_ID')
    const sessionId = uint(input.sessionId, 'SESSION_ID')
    const nonce = uint(input.nonce, 'NONCE')
    const deadline = uint(input.deadline, 'DEADLINE')
    const house = Number(input.house)
    const intensity = Number(input.intensity)
    if (![1, 2].includes(house)) throw new GovernanceVoteRelayError(400, 'INVALID_HOUSE', 'House must be creator or user')
    if (!Number.isInteger(intensity) || intensity < -9 || intensity > 9) throw new GovernanceVoteRelayError(400, 'INVALID_INTENSITY', 'Vote intensity must be an integer from -9 to 9')
    const now = BigInt(Math.floor(Date.now() / 1000))
    if (deadline < now || deadline > now + MAX_INTENT_LIFETIME_SECONDS) throw new GovernanceVoteRelayError(400, 'INVALID_DEADLINE', 'Ballot deadline is expired or too far in the future')
    if (typeof input.signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(input.signature)) throw new GovernanceVoteRelayError(400, 'INVALID_SIGNATURE', 'Ballot signature is invalid')
    if (typeof input.idempotencyKey !== 'string' || input.idempotencyKey.length < 8 || input.idempotencyKey.length > 160) throw new GovernanceVoteRelayError(400, 'INVALID_IDEMPOTENCY_KEY', 'A valid idempotency key is required')
    const value = { proposalId, sessionId, house, member, intensity, nonce, deadline, signature: input.signature }
    let recovered
    try { recovered = await recoverTypedDataAddress({ ...governanceBallotTypedData({ chainId: this.chainId, governor: this.governorAddress, ...value }), signature: value.signature }) }
    catch { throw new GovernanceVoteRelayError(401, 'BALLOT_SIGNATURE_INVALID', 'Ballot signature is invalid') }
    if (getAddress(recovered) !== member) throw new GovernanceVoteRelayError(401, 'BALLOT_SIGNER_MISMATCH', 'Ballot signer does not match the member')
    const operationHash = createHash('sha256').update(JSON.stringify({ ...value, proposalId: proposalId.toString(), sessionId: sessionId.toString(), nonce: nonce.toString(), deadline: deadline.toString() })).digest('hex')
    const operationKey = `${member}:${input.idempotencyKey}`
    const prior = this.operations.get(operationKey)
    if (prior) {
      if (prior.hash !== operationHash) throw new GovernanceVoteRelayError(409, 'IDEMPOTENCY_CONFLICT', 'Idempotency key was reused for another ballot')
      return prior.promise
    }
    const operation = this.#relay(value)
    if (this.operations.size >= 512) this.operations.delete(this.operations.keys().next().value)
    this.operations.set(operationKey, { hash: operationHash, promise: operation })
    try { return await operation } catch (error) { this.operations.delete(operationKey); throw error }
  }

  async #relay(value) {
    const before = await this.chain.status(value)
    if (before.house !== value.house) throw new GovernanceVoteRelayError(403, 'MEMBERSHIP_MISMATCH', 'Wallet is not a member of the selected House')
    if (before.nonce !== value.nonce) throw new GovernanceVoteRelayError(409, 'BALLOT_NONCE_MISMATCH', 'Ballot nonce is no longer current')
    try {
      const result = await this.chain.relay(value)
      return { status: 'VOTE_CONFIRMED', member: value.member, proposalId: value.proposalId.toString(), house: result.house, intensity: result.intensity, cost: result.cost, transactionHash: result.transactionHash }
    } catch (error) {
      if (error instanceof GovernanceVoteRelayError) throw error
      throw new GovernanceVoteRelayError(502, 'GOVERNANCE_RELAY_FAILED', safeChainMessage(error))
    }
  }
}
