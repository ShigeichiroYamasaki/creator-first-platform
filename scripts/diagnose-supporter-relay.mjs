#!/usr/bin/env node
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'

import {
  createPublicClient,
  createWalletClient,
  fallback,
  http,
  parseAbi
} from 'viem'
import { polygonAmoy } from 'viem/chains'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

import {
  createSupporterTypedData,
  DEMO_SUPPORTER_CREATOR_ID,
  TESTNET_USER_ENROLLMENT_CONSENT_VERSION,
  TESTNET_USER_ROLE
} from '../docs/.vitepress/theme/testnet-user-demo.js'

const PARTICIPANT_REGISTRY = '0x58AaF700Bc220C2446378f45a78311cD1e6f3456'
const SUPPORTER_SBT = '0x0406Cf42Ab5d3529ceAe869b6F05A3876379AB18'
const OPERATOR_SERVICE = 'creator-first-platform-participant-operator'
const OPERATOR_ACCOUNT = 'creator-first-amoy-demo'
const MIN_PRIORITY_FEE = 25_000_000_000n

const participantAbi = parseAbi([
  'function approveClaimedInvitation(bytes32 participantId,address wallet,uint8 approvedRoles,uint64 approvalExpiresAt)',
  'function fundInitial(bytes32 participantId,bytes32 operationId) returns (uint256 amount)',
  'function registerSelf(uint8 role,bytes32 consentVersion)',
  'function isRegistered(address wallet,uint8 role) view returns (bool)'
])
const supporterAbi = parseAbi([
  'function nonces(address holder) view returns (uint256)',
  'function activeTokenOf(bytes32 creatorId,address holder) view returns (uint256)',
  'function getSupporterTier(bytes32 creatorId,address holder) view returns (uint8)'
])

function opaqueId() {
  return `0x${randomBytes(32).toString('hex')}`
}

function keychainSecret(service, account) {
  const result = spawnSync('security', ['find-generic-password', '-s', service, '-a', account, '-w'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  })
  if (result.status !== 0) throw new Error('Required test operator key is unavailable in macOS Keychain')
  const value = result.stdout.trim()
  if (!/^0x[0-9a-fA-F]{64}$/.test(value)) throw new Error('Test operator key has an invalid format')
  return value
}

async function fees(publicClient) {
  const block = await publicClient.getBlock()
  return {
    maxPriorityFeePerGas: MIN_PRIORITY_FEE,
    maxFeePerGas: (block.baseFeePerGas ?? 0n) * 2n + MIN_PRIORITY_FEE
  }
}

async function confirmed(publicClient, hash, label) {
  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1, timeout: 120_000 })
  if (receipt.status !== 'success') throw new Error(`${label} reverted`)
  return receipt
}

const [origin, executeFlag] = process.argv.slice(2)
if (!origin || executeFlag !== '--execute' || !/^https:\/\/[a-z0-9-]+\.trycloudflare\.com$/.test(origin)) {
  throw new Error('Usage: node scripts/diagnose-supporter-relay.mjs https://<current-tunnel>.trycloudflare.com --execute')
}

const transport = () => fallback([
  http('https://polygon-amoy.drpc.org', { timeout: 15_000 }),
  http('https://polygon-amoy-bor-rpc.publicnode.com', { timeout: 15_000 })
])
const publicClient = createPublicClient({ chain: polygonAmoy, transport: transport() })
const operator = privateKeyToAccount(keychainSecret(OPERATOR_SERVICE, OPERATOR_ACCOUNT))
const participant = privateKeyToAccount(generatePrivateKey())
const operatorClient = createWalletClient({ account: operator, chain: polygonAmoy, transport: transport() })
const participantClient = createWalletClient({ account: participant, chain: polygonAmoy, transport: transport() })
const participantId = opaqueId()
const operationId = opaqueId()
const block = await publicClient.getBlock()

const approvalHash = await operatorClient.writeContract({
  address: PARTICIPANT_REGISTRY,
  abi: participantAbi,
  functionName: 'approveClaimedInvitation',
  args: [participantId, participant.address, TESTNET_USER_ROLE, block.timestamp + 3600n],
  ...(await fees(publicClient))
})
await confirmed(publicClient, approvalHash, 'Diagnostic participant approval')

const fundingHash = await operatorClient.writeContract({
  address: PARTICIPANT_REGISTRY,
  abi: participantAbi,
  functionName: 'fundInitial',
  args: [participantId, operationId],
  ...(await fees(publicClient))
})
await confirmed(publicClient, fundingHash, 'Diagnostic participant funding')

const registrationHash = await participantClient.writeContract({
  address: PARTICIPANT_REGISTRY,
  abi: participantAbi,
  functionName: 'registerSelf',
  args: [TESTNET_USER_ROLE, TESTNET_USER_ENROLLMENT_CONSENT_VERSION],
  ...(await fees(publicClient))
})
await confirmed(publicClient, registrationHash, 'Diagnostic listener registration')

if (!await publicClient.readContract({
  address: PARTICIPANT_REGISTRY,
  abi: participantAbi,
  functionName: 'isRegistered',
  args: [participant.address, TESTNET_USER_ROLE]
})) throw new Error('Diagnostic listener registration was not active')

const [nonce, signingBlock] = await Promise.all([
  publicClient.readContract({ address: SUPPORTER_SBT, abi: supporterAbi, functionName: 'nonces', args: [participant.address] }),
  publicClient.getBlock()
])
const deadline = signingBlock.timestamp + 600n
const typedData = createSupporterTypedData({ supporterSbt: SUPPORTER_SBT, holder: participant.address, nonce, deadline })
const signature = await participant.signTypedData(typedData)
const startedAt = Date.now()
const response = await fetch(`${origin}/api/v1/testnet/supporter-registrations`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    holder: participant.address,
    creatorId: DEMO_SUPPORTER_CREATOR_ID,
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    consentVersion: typedData.message.consentVersion,
    signature,
    idempotencyKey: `operator-diagnostic-${Date.now()}`
  })
})
const responseText = await response.text()
let responseBody
try { responseBody = JSON.parse(responseText) } catch { responseBody = responseText }
console.log(JSON.stringify({
  diagnosticWallet: participant.address,
  preparationTransactions: { approvalHash, fundingHash, registrationHash },
  relay: { elapsedMs: Date.now() - startedAt, httpStatus: response.status, body: responseBody }
}, null, 2))

if (!response.ok || responseBody?.status !== 'SBT_SUBMITTED' || !responseBody.transactionHash) process.exitCode = 1
else {
  await confirmed(publicClient, responseBody.transactionHash, 'Diagnostic Supporter SBT')
  const [tokenId, tier] = await Promise.all([
    publicClient.readContract({ address: SUPPORTER_SBT, abi: supporterAbi, functionName: 'activeTokenOf', args: [DEMO_SUPPORTER_CREATOR_ID, participant.address] }),
    publicClient.readContract({ address: SUPPORTER_SBT, abi: supporterAbi, functionName: 'getSupporterTier', args: [DEMO_SUPPORTER_CREATOR_ID, participant.address] })
  ])
  if (tokenId === 0n) throw new Error('Diagnostic Supporter SBT was not active after confirmation')
  console.log(JSON.stringify({ supporterToken: { tokenId: tokenId.toString(), tier: Number(tier), transactionHash: responseBody.transactionHash } }, null, 2))
}
