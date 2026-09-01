import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  createSupporterTypedData,
  createTestToneWav,
  DEMO_SUPPORTER_CONSENT_VERSION,
  DEMO_SUPPORTER_CREATOR_ID,
  hasActiveCreatorRegistry,
  hasActiveParticipantRegistry,
  hasActiveSupporterRegistration,
  getAmoyTransactionFees,
  AMOY_CHAIN_ID,
  AMOY_FALLBACK_BASE_FEE_PER_GAS,
  AMOY_MIN_PRIORITY_FEE_PER_GAS,
  TESTNET_CREATOR_ENROLLMENT_CONSENT_VERSION,
  TESTNET_CREATOR_ROLE,
  TESTNET_USER_ENROLLMENT_CONSENT_VERSION,
  TESTNET_USER_ROLE,
  resolveAmoyTransactionFees,
  validateDeploymentManifest,
  validateSupporterMetadata
} from '../docs/.vitepress/theme/testnet-user-demo.js'
import { cloudAdminTarget, cloudDemoTarget, parseCloudDemoRuntime } from '../docs/.vitepress/theme/cloud-demo-runtime.js'

const manifestPath = new URL('../docs/public/testnet/deployment.json', import.meta.url)
const deploymentRecordPath = new URL('../docs/public/testnet/deployment-record.json', import.meta.url)
const supporterMetadataPath = new URL('../docs/public/sbt/supporter.json', import.meta.url)
const earlySupporterMetadataPath = new URL('../docs/public/sbt/early-supporter.json', import.meta.url)
const cloudRuntimePath = new URL('../docs/public/demo-runtime.json', import.meta.url)

test('separates participant preparation from post-POL service experiences', async () => {
  const [listenerPreparation, creatorPreparation, listenerExperience, listenerJourney, creatorJourney, choices, invitation] = await Promise.all([
    readFile(new URL('../docs/demo/listener-participation.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/demo/creator-participation.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/demo/test-user-registration.md', import.meta.url), 'utf8'),
    readFile(new URL('../docs/.vitepress/theme/TestnetUserJourneyDemo.vue', import.meta.url), 'utf8'),
    readFile(new URL('../docs/.vitepress/theme/TestnetCreatorJourneyDemo.vue', import.meta.url), 'utf8'),
    readFile(new URL('../docs/.vitepress/theme/DemoServiceChoices.vue', import.meta.url), 'utf8'),
    readFile(new URL('../docs/.vitepress/theme/ParticipantInvitationRegistration.vue', import.meta.url), 'utf8')
  ])

  assert.match(listenerPreparation, /<ParticipantApplicationDemo :role="1" \/>/)
  assert.match(creatorPreparation, /<ParticipantApplicationDemo :role="2" \/>/)
  assert.match(creatorPreparation, /\[音楽クリエータの活動体験\]\(\/demo\/creator-workspace\)/)
  assert.doesNotMatch(creatorPreparation, /\[音楽クリエータの活動体験\]\(\/demo\/creator-registration\)/)
  assert.match(listenerExperience, /申請と審査はこのページでは行いません/)
  assert.doesNotMatch(listenerJourney, /<ParticipantApplicationDemo/)
  assert.doesNotMatch(creatorJourney, /<ParticipantApplicationDemo/)
  assert.match(listenerJourney, /initialFundingCompleted\.value && !userRegistered/)
  assert.match(creatorJourney, /initialFundingCompleted\.value && !creatorParticipantRegistered/)
  assert.match(choices, /creator-participation/)
  assert.match(choices, /cloud-entry\?path=\/creator-first-platform\/demo\/creator-workspace/)
  assert.doesNotMatch(choices, /cloud-entry\?path=\/creator-first-platform\/demo\/creator-registration/)
  assert.match(invitation, /withBase\('\/demo\/creator-workspace'\)/)
  assert.match(creatorJourney, /<CreatorRegistrationDemo v-if="!profile"/)
})

test('routes operational registration to the same-origin Google Cloud demo', async () => {
  const runtime = JSON.parse(await readFile(cloudRuntimePath, 'utf8'))
  const parsed = parseCloudDemoRuntime(runtime)
  assert.equal(parsed.origin, 'https://abstract-tyler-freely-ballet.trycloudflare.com')
  assert.equal(
    cloudDemoTarget(runtime, '/creator-first-platform/demo/test-user-registration?role=user#step=application'),
    'https://abstract-tyler-freely-ballet.trycloudflare.com/creator-first-platform/demo/test-user-registration?role=user#step=application'
  )
  assert.equal(
    cloudAdminTarget(runtime),
    'https://abstract-tyler-freely-ballet.trycloudflare.com/creator-first-platform/admin/participant-invitations'
  )
  assert.throws(() => cloudDemoTarget(runtime, '/whitepaper/'), /outside the public experiment/)
  assert.throws(() => parseCloudDemoRuntime({ ...runtime, origin: 'http://example.test' }), /HTTPS origin/)
  assert.throws(() => parseCloudDemoRuntime({ ...runtime, sourceCommit: 'short' }), /sourceCommit/)
})

test('enforces the Polygon Amoy priority-fee floor for wallet writes', async () => {
  const lowEstimate = resolveAmoyTransactionFees({
    maxPriorityFeePerGas: 1_500_000_000n,
    maxFeePerGas: 3_000_000_000n,
    baseFeePerGas: 1_000_000_000n
  })
  assert.equal(lowEstimate.maxPriorityFeePerGas, AMOY_MIN_PRIORITY_FEE_PER_GAS)
  assert.equal(lowEstimate.maxFeePerGas, 27_000_000_000n)

  const recommendedEstimate = resolveAmoyTransactionFees({
    maxPriorityFeePerGas: 30_000_000_000n,
    maxFeePerGas: 35_000_000_000n,
    baseFeePerGas: 2_000_000_000n
  })
  assert.deepEqual(recommendedEstimate, {
    maxPriorityFeePerGas: 30_000_000_000n,
    maxFeePerGas: 35_000_000_000n
  })

  const fallback = await getAmoyTransactionFees({
    estimateFeesPerGas: async () => { throw new Error('unsupported') },
    getBlock: async () => { throw new Error('unavailable') }
  })
  assert.deepEqual(fallback, {
    maxPriorityFeePerGas: AMOY_MIN_PRIORITY_FEE_PER_GAS,
    maxFeePerGas: AMOY_MIN_PRIORITY_FEE_PER_GAS + AMOY_FALLBACK_BASE_FEE_PER_GAS * 2n
  })
})

test('ships a safe Polygon Amoy manifest and verifies reviewed addresses when active', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const parsed = validateDeploymentManifest(manifest)

  assert.equal(parsed.chainId, AMOY_CHAIN_ID)
  assert.equal(parsed.environment, 'amoy-demo')
  if (!parsed.active) {
    assert.equal(parsed.status, 'not-deployed')
    assert.deepEqual(parsed.contracts, {})
    return
  }

  const record = JSON.parse(await readFile(deploymentRecordPath, 'utf8'))
  assert.equal(parsed.status, 'active')
  assert.equal(parsed.active, true)
  assert.match(parsed.sourceCommit, /^[0-9a-f]{40}$/i)
  assert.equal(record.sourceCommit, parsed.sourceCommit)
  assert.equal(record.contracts.mockJpyc.address, parsed.contracts.mockJpyc)
  assert.equal(record.contracts.subscription.address, parsed.contracts.subscription)
  assert.equal(record.contracts.treasury.address, parsed.contracts.treasury)
  assert.equal(record.contracts.supporterSbtProxy.address, parsed.contracts.supporterSbt)
  assert.equal(record.contracts.supporterRegistrationAdapter.address, parsed.contracts.supporterRegistrationAdapter)
  assert.equal(record.contracts.supporterRegistrationAdapter.supporterSbt, parsed.contracts.supporterSbt)
  assert.match(record.contracts.supporterRegistrationAdapter.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.supporterRegistrationAdapter.roleGrantTransactionHash, /^0x[0-9a-f]{64}$/i)
  assert.equal(record.contracts.creatorRegistry.address, parsed.contracts.creatorRegistry)
  assert.match(record.contracts.creatorRegistry.sourceCommit, /^[0-9a-f]{40}$/i)
  assert.equal(record.contracts.testPolDistributor.address, parsed.contracts.testPolDistributor)
  assert.match(record.contracts.testPolDistributor.sourceCommit, /^[0-9a-f]{40}$/i)
  assert.equal(record.contracts.participantRegistry.address, parsed.contracts.participantRegistry)
  assert.equal(record.contracts.participantRegistry.sourceCommit, parsed.sourceCommit)
  assert.equal(record.contracts.participantRegistry.testPolDistributor, parsed.contracts.testPolDistributor)
  assert.match(record.contracts.participantRegistry.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.participantRegistry.roleGrantTransactionHash, /^0x[0-9a-f]{64}$/i)
  assert.equal(record.contracts.legislatorRegistrationAdapter.address, parsed.contracts.legislatorRegistrationAdapter)
  assert.equal(record.contracts.legislatorRegistrationAdapter.governor, parsed.contracts.governor)
  assert.equal(record.contracts.legislatorRegistrationAdapter.subscription, parsed.contracts.subscription)
  assert.equal(record.contracts.legislatorRegistrationAdapter.creatorRegistry, parsed.contracts.creatorRegistry)
  assert.match(record.contracts.legislatorRegistrationAdapter.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.legislatorRegistrationAdapter.roleGrantTransactionHash, /^0x[0-9a-f]{64}$/i)
  assert.equal(record.governanceConfiguration.publicDemoSession.sessionId, 1)
  assert.match(record.governanceConfiguration.publicDemoSession.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.creatorRegistry.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.subscription.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(parsed.testOnlyNotice, /NO VALUE.*NO REDEMPTION.*NOT PRODUCTION JPYC/)
  assert.equal(hasActiveCreatorRegistry(parsed), true)
  assert.equal(hasActiveSupporterRegistration(parsed), true)
})

test('rejects an active manifest with an invalid chain, address, or source commit', () => {
  const base = {
    schemaVersion: 1,
    environment: 'amoy-demo',
    chainId: AMOY_CHAIN_ID,
    networkName: 'Polygon Amoy',
    status: 'active',
    sourceCommit: 'a'.repeat(40),
    contracts: {
      mockJpyc: '0x1111111111111111111111111111111111111111',
      subscription: '0x2222222222222222222222222222222222222222',
      treasury: '0x3333333333333333333333333333333333333333',
      supporterSbt: '0x4444444444444444444444444444444444444444'
    }
  }

  assert.throws(() => validateDeploymentManifest({ ...base, chainId: 1 }), /Polygon Amoy/)
  assert.throws(() => validateDeploymentManifest({ ...base, sourceCommit: 'short' }), /source commit/)
  assert.throws(() => validateDeploymentManifest({ ...base, contracts: { ...base.contracts, mockJpyc: '0x0' } }), /contract address/)
  assert.throws(() => validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, testPolDistributor: 'invalid' }
  }), /Test POL distributor/)
  assert.throws(() => validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, participantRegistry: 'invalid' }
  }), /participant registry/)
  assert.equal(hasActiveCreatorRegistry(validateDeploymentManifest(base)), false)
  assert.equal(hasActiveCreatorRegistry(validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, creatorRegistry: '0x5555555555555555555555555555555555555555' }
  })), true)
  assert.equal(hasActiveParticipantRegistry(validateDeploymentManifest(base)), false)
  assert.equal(hasActiveParticipantRegistry(validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, participantRegistry: '0x7777777777777777777777777777777777777777' }
  })), true)
  assert.equal(hasActiveSupporterRegistration(validateDeploymentManifest({
    ...base,
    contracts: {
      ...base.contracts,
      supporterRegistrationAdapter: '0x6666666666666666666666666666666666666666'
    }
  })), true)
  assert.throws(() => validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, supporterRegistrationAdapter: 'invalid' }
  }), /registration adapter/)
})

test('publishes distinct participant roles and consent versions', () => {
  assert.equal(TESTNET_USER_ROLE, 1)
  assert.equal(TESTNET_CREATOR_ROLE, 2)
  assert.match(TESTNET_USER_ENROLLMENT_CONSENT_VERSION, /^0x[0-9a-f]{64}$/i)
  assert.match(TESTNET_CREATOR_ENROLLMENT_CONSENT_VERSION, /^0x[0-9a-f]{64}$/i)
  assert.notEqual(TESTNET_USER_ENROLLMENT_CONSENT_VERSION, TESTNET_CREATOR_ENROLLMENT_CONSENT_VERSION)
})

test('builds the exact short-lived Supporter SBT EIP-712 intent', () => {
  const supporterSbt = '0x4444444444444444444444444444444444444444'
  const holder = '0x5555555555555555555555555555555555555555'
  const value = createSupporterTypedData({ supporterSbt, holder, nonce: 7n, deadline: 900n })

  assert.equal(value.domain.chainId, AMOY_CHAIN_ID)
  assert.equal(value.domain.verifyingContract, supporterSbt)
  assert.equal(value.primaryType, 'SupportIntent')
  assert.equal(value.message.creatorId, DEMO_SUPPORTER_CREATOR_ID)
  assert.equal(value.message.holder, holder)
  assert.equal(value.message.nonce, 7n)
  assert.equal(value.message.deadline, 900n)
  assert.equal(value.message.consentVersion, DEMO_SUPPORTER_CONSENT_VERSION)
})

test('publishes resolvable testnet metadata for both Supporter SBT tiers', async () => {
  const cases = [
    {
      metadata: JSON.parse(await readFile(supporterMetadataPath, 'utf8')),
      tier: 'Supporter',
      image: 'supporter-sbt-example.webp'
    },
    {
      metadata: JSON.parse(await readFile(earlySupporterMetadataPath, 'utf8')),
      tier: 'Early Supporter',
      image: 'early-supporter-sbt-example.webp'
    }
  ]

  for (const { metadata, tier, image } of cases) {
    assert.match(metadata.name, /Polygon Amoy Testnet/)
    assert.match(metadata.description, /TESTNET ONLY/)
    assert.equal(metadata.image, `https://shigeichiroyamasaki.github.io/creator-first-platform/images/${image}`)
    assert.equal(metadata.external_url, 'https://shigeichiroyamasaki.github.io/creator-first-platform/demo/test-user-registration')
    assert.equal(metadata.attributes.some((entry) => entry.trait_type === 'Credential Tier' && entry.value === tier), true)
    assert.equal(metadata.attributes.some((entry) => entry.trait_type === 'Transferability' && entry.value === 'Soulbound'), true)
    assert.equal(validateSupporterMetadata(
      metadata,
      `https://shigeichiroyamasaki.github.io/creator-first-platform/sbt/${tier === 'Supporter' ? 'supporter' : 'early-supporter'}.json`
    ), metadata)
    await readFile(new URL(`../docs/public/images/${image}`, import.meta.url))
  }

  assert.throws(() => validateSupporterMetadata(cases[0].metadata, 'https://attacker.invalid/supporter.json'), /not approved/)
  assert.throws(() => validateSupporterMetadata({
    ...cases[0].metadata,
    image: 'https://attacker.invalid/image.webp'
  }, 'https://shigeichiroyamasaki.github.io/creator-first-platform/sbt/supporter.json'), /image URI/)
})

test('generates a deterministic mono PCM WAV for the copyright-free player fixture', () => {
  const wav = createTestToneWav(440, 1, 8_000)
  const view = new DataView(wav)
  const text = (offset, length) => String.fromCharCode(...new Uint8Array(wav, offset, length))

  assert.equal(text(0, 4), 'RIFF')
  assert.equal(text(8, 4), 'WAVE')
  assert.equal(text(36, 4), 'data')
  assert.equal(view.getUint32(24, true), 8_000)
  assert.equal(wav.byteLength, 44 + 8_000 * 2)
})
