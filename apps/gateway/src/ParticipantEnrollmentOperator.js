import { randomBytes, randomUUID } from 'node:crypto'
import {
  createPublicClient,
  createWalletClient,
  fallback,
  getAddress,
  http,
  parseAbi,
  zeroAddress,
  zeroHash
} from 'viem'
import { polygonAmoy } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

const APPROVAL_TTL_MS = 72 * 60 * 60_000
const AMOY_MIN_PRIORITY_FEE = 25_000_000_000n
const PARTICIPANT_APPROVAL_GAS_LIMIT = 250_000n
const PARTICIPANT_FUNDING_GAS_LIMIT = 250_000n

const participantRegistryAbi = parseAbi([
  'function approveClaimedInvitation(bytes32 participantId,address wallet,uint8 approvedRoles,uint64 approvalExpiresAt)',
  'function fundInitial(bytes32 participantId,bytes32 operationId) returns (uint256 amount)',
  'function participants(bytes32 participantId) view returns (address wallet,uint8 approvedRoles,uint8 registeredRoles,uint64 approvedAt,uint64 approvalExpiresAt,bool active,bool initialFundingCompleted)',
  'function participantIdByWallet(address wallet) view returns (bytes32 participantId)'
])

export class ParticipantEnrollmentError extends Error {
  constructor(status, code, message) {
    super(message)
    this.status = status
    this.code = code
  }
}
function bytes32() {
  return `0x${randomBytes(32).toString('hex')}`
}

function publicEnrollment(row, enabled) {
  if (!row) return { state: enabled ? 'READY_AFTER_WALLET_CLAIM' : 'OPERATOR_DISABLED' }
  return {
    state: row.state,
    participantId: row.participant_id,
    wallet: row.wallet_address,
    roles: row.role_bits,
    approvalExpiresAt: row.approval_expires_at,
    approvalTransactionHash: row.approval_tx_hash ?? null,
    approvalConfirmedAt: row.approval_confirmed_at ?? null,
    fundingTransactionHash: row.funding_tx_hash ?? null,
    fundingConfirmedAt: row.funding_confirmed_at ?? null,
    initialFundingAmountAtomic: row.initial_funding_amount_atomic ?? null,
    errorCode: row.last_error_code ?? null,
    errorMessage: row.last_error_message ?? null,
    updatedAt: row.updated_at
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
  const message = values.find((value) => value.length <= 240) ?? 'Polygon Amoy transaction failed'
  return message.replace(/0x[0-9a-f]{64}/gi, '[transaction]').slice(0, 240)
}

export class AmoyParticipantEnrollmentChain {
  constructor({ rpcUrls, registryAddress, operatorPrivateKey }) {
    this.registryAddress = getAddress(registryAddress)
    this.account = privateKeyToAccount(operatorPrivateKey)
    const transport = () => fallback(rpcUrls.map((rpcUrl) => http(rpcUrl, { timeout: 20_000 })))
    this.publicClient = createPublicClient({ chain: polygonAmoy, transport: transport() })
    this.walletClient = createWalletClient({ account: this.account, chain: polygonAmoy, transport: transport() })
  }

  get operatorAddress() {
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

  async status(participantId, wallet) {
    const [participant, registeredParticipantId, balance] = await Promise.all([
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: participantRegistryAbi,
        functionName: 'participants',
        args: [participantId]
      }),
      this.publicClient.readContract({
        address: this.registryAddress,
        abi: participantRegistryAbi,
        functionName: 'participantIdByWallet',
        args: [wallet]
      }),
      this.publicClient.getBalance({ address: wallet })
    ])
    return {
      wallet: participant[0],
      approvedRoles: Number(participant[1]),
      active: participant[5],
      initialFundingCompleted: participant[6],
      registeredParticipantId,
      balance
    }
  }

  async approve({ participantId, wallet, roles, approvalExpiresAt }) {
    const transactionHash = await this.walletClient.writeContract({
      account: this.account,
      address: this.registryAddress,
      abi: participantRegistryAbi,
      functionName: 'approveClaimedInvitation',
      args: [participantId, wallet, roles, BigInt(Math.floor(Date.parse(approvalExpiresAt) / 1000))],
      gas: PARTICIPANT_APPROVAL_GAS_LIMIT,
      ...(await this.transactionFees())
    })
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 2, timeout: 120_000 })
    if (receipt.status !== 'success') throw new Error('Polygon Amoy participant approval reverted')
    return { transactionHash, blockNumber: receipt.blockNumber }
  }

  async fund({ participantId, operationId, wallet }) {
    const balanceBefore = await this.publicClient.getBalance({ address: wallet })
    const transactionHash = await this.walletClient.writeContract({
      account: this.account,
      address: this.registryAddress,
      abi: participantRegistryAbi,
      functionName: 'fundInitial',
      args: [participantId, operationId],
      gas: PARTICIPANT_FUNDING_GAS_LIMIT,
      ...(await this.transactionFees())
    })
    const receipt = await this.publicClient.waitForTransactionReceipt({ hash: transactionHash, confirmations: 2, timeout: 120_000 })
    if (receipt.status !== 'success') throw new Error('Polygon Amoy initial Test POL funding reverted')
    const balanceAfter = await this.publicClient.getBalance({ address: wallet })
    return {
      transactionHash,
      blockNumber: receipt.blockNumber,
      amount: balanceAfter > balanceBefore ? balanceAfter - balanceBefore : 0n
    }
  }
}

export class ParticipantEnrollmentOperator {
  constructor({ store, chain }) {
    this.store = store
    this.chain = chain
    this.running = new Map()
    this.transactionQueue = Promise.resolve()
  }

  get enabled() {
    return Boolean(this.chain)
  }

  statusForInvitation(invitationId) {
    return publicEnrollment(this.store.participantEnrollment(invitationId), this.enabled)
  }

  async process(invitationId) {
    if (!this.chain) {
      throw new ParticipantEnrollmentError(503, 'PARTICIPANT_ENROLLMENT_OPERATOR_DISABLED', 'On-chain participant enrollment is not configured')
    }
    if (this.running.has(invitationId)) return this.running.get(invitationId)
    const operation = this.transactionQueue.then(() => this.#process(invitationId))
    this.transactionQueue = operation.catch(() => undefined)
    const trackedOperation = operation.finally(() => this.running.delete(invitationId))
    this.running.set(invitationId, trackedOperation)
    return trackedOperation
  }

  async #process(invitationId) {
    const invitation = this.store.participantInvitationById(invitationId)
    if (!invitation) throw new ParticipantEnrollmentError(404, 'INVITATION_NOT_FOUND', 'Invitation was not found')
    if (invitation.state !== 'CLAIMED' || !invitation.claimed_wallet) {
      throw new ParticipantEnrollmentError(409, 'INVITATION_WALLET_NOT_CLAIMED', 'The invited person must verify and register a wallet first')
    }

    const now = new Date().toISOString()
    const wallet = getAddress(invitation.claimed_wallet)
    let enrollment = this.store.participantEnrollment(invitationId)
    if (!enrollment) {
      enrollment = this.store.createParticipantEnrollment({
        invitationId,
        participantId: bytes32(),
        operationId: bytes32(),
        walletAddress: wallet,
        roleBits: invitation.role_bits,
        approvalExpiresAt: new Date(Date.now() + APPROVAL_TTL_MS).toISOString(),
        createdAt: now
      })
      this.#event(invitationId, 'ENROLLMENT_PREPARED', { roles: invitation.role_bits })
    }
    if (enrollment.wallet_address !== wallet || enrollment.role_bits !== invitation.role_bits) {
      throw new ParticipantEnrollmentError(409, 'ENROLLMENT_INVITATION_MISMATCH', 'Stored enrollment no longer matches the claimed invitation')
    }
    if (enrollment.state === 'FUNDED') return publicEnrollment(enrollment, true)

    try {
      let chainStatus = await this.chain.status(enrollment.participant_id, wallet)
      const walletIsApproved = chainStatus.wallet !== zeroAddress
      if (chainStatus.registeredParticipantId !== zeroHash && chainStatus.registeredParticipantId !== enrollment.participant_id) {
        throw new ParticipantEnrollmentError(409, 'WALLET_ALREADY_ENROLLED', 'The wallet is already assigned to another participant identifier')
      }
      if (!walletIsApproved) {
        const approved = await this.chain.approve({
          participantId: enrollment.participant_id,
          wallet,
          roles: enrollment.role_bits,
          approvalExpiresAt: enrollment.approval_expires_at
        })
        this.store.markParticipantEnrollmentApprovalSubmitted(invitationId, approved.transactionHash, new Date().toISOString())
        this.store.markParticipantEnrollmentApproved(invitationId, approved.transactionHash, new Date().toISOString())
        this.#event(invitationId, 'ONCHAIN_APPROVAL_CONFIRMED', {
          transactionHash: approved.transactionHash,
          blockNumber: approved.blockNumber.toString()
        })
        enrollment = this.store.participantEnrollment(invitationId)
        chainStatus = await this.chain.status(enrollment.participant_id, wallet)
      } else if (!['APPROVED', 'FUNDING_SUBMITTED', 'FUNDING_FAILED'].includes(enrollment.state)) {
        this.store.markParticipantEnrollmentApproved(invitationId, enrollment.approval_tx_hash, new Date().toISOString())
        enrollment = this.store.participantEnrollment(invitationId)
      }
      if (chainStatus.wallet !== wallet || chainStatus.approvedRoles !== enrollment.role_bits || !chainStatus.active) {
        throw new ParticipantEnrollmentError(409, 'ONCHAIN_APPROVAL_MISMATCH', 'On-chain participant approval does not match the claimed invitation')
      }

      if (!chainStatus.initialFundingCompleted) {
        const funded = await this.chain.fund({
          participantId: enrollment.participant_id,
          operationId: enrollment.operation_id,
          wallet
        })
        this.store.markParticipantEnrollmentFundingSubmitted(invitationId, funded.transactionHash, new Date().toISOString())
        this.store.markParticipantEnrollmentFunded(invitationId, funded.transactionHash, funded.amount.toString(), new Date().toISOString())
        this.#event(invitationId, 'INITIAL_TEST_POL_CONFIRMED', {
          transactionHash: funded.transactionHash,
          blockNumber: funded.blockNumber.toString(),
          amountAtomic: funded.amount.toString()
        })
      } else {
        this.store.markParticipantEnrollmentFunded(invitationId, enrollment.funding_tx_hash, '0', new Date().toISOString())
      }
      return publicEnrollment(this.store.participantEnrollment(invitationId), true)
    } catch (error) {
      if (error instanceof ParticipantEnrollmentError) throw error
      enrollment = this.store.participantEnrollment(invitationId)
      const phase = ['APPROVED', 'FUNDING_SUBMITTED', 'FUNDING_FAILED'].includes(enrollment.state) ? 'funding' : 'approval'
      const code = phase === 'funding' ? 'INITIAL_TEST_POL_FUNDING_FAILED' : 'ONCHAIN_PARTICIPANT_APPROVAL_FAILED'
      const message = safeChainMessage(error)
      this.store.failParticipantEnrollment(invitationId, phase, code, message, new Date().toISOString())
      this.#event(invitationId, phase === 'funding' ? 'INITIAL_TEST_POL_FAILED' : 'ONCHAIN_APPROVAL_FAILED', { code })
      throw new ParticipantEnrollmentError(502, code, message)
    }
  }

  #event(invitationId, eventType, detail = {}) {
    this.store.recordParticipantEnrollmentEvent({
      eventId: randomUUID(),
      invitationId,
      eventType,
      occurredAt: new Date().toISOString(),
      detail
    })
  }
}
