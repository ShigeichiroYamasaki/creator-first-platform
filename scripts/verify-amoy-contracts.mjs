import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { createPublicClient, getAddress, http, parseAbi } from 'viem'
import { polygonAmoy } from 'viem/chains'

const manifest = JSON.parse(await readFile(new URL('../docs/public/testnet/deployment.json', import.meta.url), 'utf8'))
const deploymentRecord = JSON.parse(await readFile(new URL('../docs/public/testnet/deployment-record.json', import.meta.url), 'utf8'))
assert.equal(manifest.status, 'active', 'Deployment manifest must be active')
assert.equal(manifest.chainId, polygonAmoy.id, 'Deployment manifest must target Polygon Amoy')
assert.match(manifest.sourceCommit, /^[0-9a-f]{40}$/i, 'Deployment manifest must contain a full source commit')

const addresses = Object.fromEntries(
  Object.entries(manifest.contracts)
    .filter(([, value]) => typeof value === 'string')
    .map(([key, value]) => [key, getAddress(value)])
)
assert.equal(deploymentRecord.sourceCommit, manifest.sourceCommit, 'Deployment record source commit mismatch')
const implementation = getAddress(deploymentRecord.contracts.supporterSbtImplementation.address)
const creatorRegistry = manifest.contracts.creatorRegistry ? getAddress(manifest.contracts.creatorRegistry) : undefined
const governor = manifest.contracts.governor ? getAddress(manifest.contracts.governor) : undefined
const governedPolicy = manifest.contracts.governedPolicy ? getAddress(manifest.contracts.governedPolicy) : undefined
const supporterRegistrationAdapter = manifest.contracts.supporterRegistrationAdapter
  ? getAddress(manifest.contracts.supporterRegistrationAdapter)
  : undefined
const legislatorRegistrationAdapter = manifest.contracts.legislatorRegistrationAdapter
  ? getAddress(manifest.contracts.legislatorRegistrationAdapter)
  : undefined
assert.equal(Boolean(governor), Boolean(governedPolicy), 'Governance manifest must publish governor and policy together')
const rpcUrl = process.env.AMOY_READ_RPC_URL ?? 'https://polygon-amoy-bor-rpc.publicnode.com'
const client = createPublicClient({ chain: polygonAmoy, transport: http(rpcUrl) })

for (const [name, address] of [...Object.entries(addresses), ['supporterImplementation', implementation]]) {
  const bytecode = await client.getBytecode({ address })
  assert.ok(bytecode && bytecode !== '0x', `${name} has no deployed bytecode at ${address}`)
}

if (creatorRegistry) {
  const registryNotice = await client.readContract({
    address: creatorRegistry,
    abi: parseAbi(['function TESTNET_NOTICE() view returns (string)']),
    functionName: 'TESTNET_NOTICE'
  })
  assert.equal(registryNotice, 'TESTNET ONLY - NO IDENTITY, RIGHTS, PAYEE OR RELEASE VERIFICATION')
}

if (governor && governedPolicy) {
  const governanceAbi = parseAbi([
    'function allowedChainId() view returns (uint256)',
    'function p1Delay() view returns (uint64)',
    'function p2Delay() view returns (uint64)',
    'function p3Delay() view returns (uint64)',
    'function REGISTRAR_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role, address account) view returns (bool)',
    'function sessionCount() view returns (uint256)',
    'function sessions(uint256) view returns (bytes32 ruleHash, uint64 startsAt, uint64 endsAt, uint32 voiceCreditBudget, uint32 creatorQuorum, uint32 userQuorum, bool exists)',
    'function proposalCfpRevision(uint256) view returns (uint32)',
    'function cfpProposalId(bytes32) view returns (uint256)'
  ])
  const policyAbi = parseAbi([
    'function governor() view returns (address)',
    'function version() view returns (uint64)'
  ])
  const [allowedChainId, p1Delay, p2Delay, p3Delay, emptyCfpRevision, emptyCfpProposal, policyGovernor, policyVersion] = await Promise.all([
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'allowedChainId' }),
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'p1Delay' }),
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'p2Delay' }),
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'p3Delay' }),
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'proposalCfpRevision', args: [0n] }),
    client.readContract({ address: governor, abi: governanceAbi, functionName: 'cfpProposalId', args: [`0x${'00'.repeat(32)}`] }),
    client.readContract({ address: governedPolicy, abi: policyAbi, functionName: 'governor' }),
    client.readContract({ address: governedPolicy, abi: policyAbi, functionName: 'version' })
  ])
  assert.equal(allowedChainId, BigInt(polygonAmoy.id))
  assert.ok(p1Delay > 0n && p2Delay >= p1Delay && p3Delay >= p2Delay, 'Governance delay ordering is invalid')
  assert.equal(emptyCfpRevision, 0)
  assert.equal(emptyCfpProposal, 0n)
  assert.equal(getAddress(policyGovernor), governor)
  assert.equal(policyVersion, 1n)

  if (legislatorRegistrationAdapter) {
    const adapterAbi = parseAbi([
      'function governor() view returns (address)',
      'function subscription() view returns (address)',
      'function creatorRegistry() view returns (address)'
    ])
    const [adapterGovernor, adapterSubscription, adapterCreatorRegistry, registrarRole, sessionCount, session] = await Promise.all([
      client.readContract({ address: legislatorRegistrationAdapter, abi: adapterAbi, functionName: 'governor' }),
      client.readContract({ address: legislatorRegistrationAdapter, abi: adapterAbi, functionName: 'subscription' }),
      client.readContract({ address: legislatorRegistrationAdapter, abi: adapterAbi, functionName: 'creatorRegistry' }),
      client.readContract({ address: governor, abi: governanceAbi, functionName: 'REGISTRAR_ROLE' }),
      client.readContract({ address: governor, abi: governanceAbi, functionName: 'sessionCount' }),
      client.readContract({ address: governor, abi: governanceAbi, functionName: 'sessions', args: [1n] })
    ])
    assert.equal(getAddress(adapterGovernor), governor)
    assert.equal(getAddress(adapterSubscription), addresses.subscription)
    assert.equal(getAddress(adapterCreatorRegistry), creatorRegistry)
    assert.equal(await client.readContract({
      address: governor,
      abi: governanceAbi,
      functionName: 'hasRole',
      args: [registrarRole, legislatorRegistrationAdapter]
    }), true, 'Legislator registration adapter does not have REGISTRAR_ROLE')
    assert.ok(sessionCount >= 1n, 'Public governance session is missing')
    assert.deepEqual(session, [
      deploymentRecord.governanceConfiguration.publicDemoSession.ruleHash,
      BigInt(deploymentRecord.governanceConfiguration.publicDemoSession.startsAt),
      BigInt(deploymentRecord.governanceConfiguration.publicDemoSession.endsAt),
      deploymentRecord.governanceConfiguration.publicDemoSession.voiceCreditBudget,
      deploymentRecord.governanceConfiguration.publicDemoSession.creatorQuorum,
      deploymentRecord.governanceConfiguration.publicDemoSession.userQuorum,
      true
    ])
  }
}

const tokenAbi = parseAbi([
  'function TEST_ASSET_NOTICE() view returns (string)',
  'function CLAIM_AMOUNT() view returns (uint256)'
])
const treasuryAbi = parseAbi(['function settlementAsset() view returns (address)'])
const subscriptionAbi = parseAbi([
  'function settlementAsset() view returns (address)',
  'function treasury() view returns (address)',
  'function plan() view returns (uint128 price, uint64 duration, uint64 version, bool enabled)'
])

const [notice, claimAmount, treasuryAsset, subscriptionAsset, subscriptionTreasury, plan] = await Promise.all([
  client.readContract({ address: addresses.mockJpyc, abi: tokenAbi, functionName: 'TEST_ASSET_NOTICE' }),
  client.readContract({ address: addresses.mockJpyc, abi: tokenAbi, functionName: 'CLAIM_AMOUNT' }),
  client.readContract({ address: addresses.treasury, abi: treasuryAbi, functionName: 'settlementAsset' }),
  client.readContract({ address: addresses.subscription, abi: subscriptionAbi, functionName: 'settlementAsset' }),
  client.readContract({ address: addresses.subscription, abi: subscriptionAbi, functionName: 'treasury' }),
  client.readContract({ address: addresses.subscription, abi: subscriptionAbi, functionName: 'plan' })
])

assert.equal(notice, 'TESTNET ONLY - NO VALUE, NO REDEMPTION, NOT PRODUCTION JPYC')
assert.equal(claimAmount, 2_000n * 10n ** 18n)
assert.equal(getAddress(treasuryAsset), addresses.mockJpyc)
assert.equal(getAddress(subscriptionAsset), addresses.mockJpyc)
assert.equal(getAddress(subscriptionTreasury), addresses.treasury)
assert.deepEqual(plan, [1_000n * 10n ** 18n, 30n * 24n * 60n * 60n, 1n, true])

const implementationSlot = '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
const storedImplementation = await client.getStorageAt({ address: addresses.supporterSbt, slot: implementationSlot })
assert.ok(storedImplementation, 'Supporter SBT proxy implementation slot is empty')
assert.equal(getAddress(`0x${storedImplementation.slice(-40)}`), implementation)

if (supporterRegistrationAdapter) {
  const supporterAbi = parseAbi([
    'function RELAYER_ROLE() view returns (bytes32)',
    'function hasRole(bytes32 role, address account) view returns (bool)'
  ])
  const adapterAbi = parseAbi(['function supporterSbt() view returns (address)'])
  const [adapterSbt, relayerRole] = await Promise.all([
    client.readContract({
      address: supporterRegistrationAdapter,
      abi: adapterAbi,
      functionName: 'supporterSbt'
    }),
    client.readContract({
      address: addresses.supporterSbt,
      abi: supporterAbi,
      functionName: 'RELAYER_ROLE'
    })
  ])
  assert.equal(getAddress(adapterSbt), addresses.supporterSbt, 'Supporter registration adapter targets another SBT')
  assert.equal(await client.readContract({
    address: addresses.supporterSbt,
    abi: supporterAbi,
    functionName: 'hasRole',
    args: [relayerRole, supporterRegistrationAdapter]
  }), true, 'Supporter registration adapter does not have RELAYER_ROLE')
}

console.log(`Polygon Amoy deployment verified at source commit ${manifest.sourceCommit}:`)
console.log(`- MockJPYC: ${addresses.mockJpyc}`)
console.log(`- Subscription: ${addresses.subscription}`)
console.log(`- Treasury: ${addresses.treasury}`)
console.log(`- SupporterSBT proxy: ${addresses.supporterSbt}`)
console.log(`- SupporterSBT implementation: ${implementation}`)
if (creatorRegistry) console.log(`- Creator Registry: ${creatorRegistry}`)
if (governor && governedPolicy) {
  console.log(`- Bicameral Governor: ${governor}`)
  console.log(`- Governed Demo Policy: ${governedPolicy}`)
}
if (supporterRegistrationAdapter) console.log(`- Supporter registration adapter: ${supporterRegistrationAdapter}`)
if (legislatorRegistrationAdapter) console.log(`- Legislator registration adapter: ${legislatorRegistrationAdapter}`)
