import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  createSupporterTypedData,
  createTestToneWav,
  DEMO_SUPPORTER_CONSENT_VERSION,
  DEMO_SUPPORTER_CREATOR_ID,
  hasActiveCreatorRegistry,
  hasActiveSupporterRegistration,
  SEPOLIA_CHAIN_ID,
  validateDeploymentManifest
} from '../docs/.vitepress/theme/testnet-user-demo.js'

const manifestPath = new URL('../docs/public/testnet/deployment.json', import.meta.url)
const deploymentRecordPath = new URL('../docs/public/testnet/deployment-record.json', import.meta.url)
const supporterMetadataPath = new URL('../docs/public/sbt/supporter.json', import.meta.url)
const earlySupporterMetadataPath = new URL('../docs/public/sbt/early-supporter.json', import.meta.url)

test('ships an active Sepolia manifest with reviewed addresses and source commit', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const record = JSON.parse(await readFile(deploymentRecordPath, 'utf8'))
  const parsed = validateDeploymentManifest(manifest)

  assert.equal(parsed.chainId, SEPOLIA_CHAIN_ID)
  assert.equal(parsed.status, 'active')
  assert.equal(parsed.active, true)
  assert.equal(parsed.sourceCommit, '9d4bf406527b8bfdea076a91cd129b55e3c23925')
  assert.equal(parsed.contracts.mockJpyc, '0xBc89cF411Fe4fEc602e854fF32E78BBD131F5f49')
  assert.equal(parsed.contracts.subscription, '0x7bEeD194032a8D655cF72E61889896eef97F3d90')
  assert.equal(parsed.contracts.treasury, '0x57a93F06dE83617f59bF31DD8FfbDA6FeB984215')
  assert.equal(parsed.contracts.supporterSbt, '0x2D01B0c19Ce5572dFc2Aa90f4dE6256720E30923')
  assert.equal(parsed.contracts.supporterRegistrationAdapter, '0xbd6887125F9b8e000CF5a0673D7fa2a29a70D292')
  assert.equal(parsed.contracts.creatorRegistry, '0x5676d34d7C41849311b99932d8272af58b63e6E9')
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
  assert.equal(record.contracts.creatorRegistry.sourceCommit, '9e46420ebf68a0dbe4175b43e6501a5ee0ca34a7')
  assert.match(record.contracts.creatorRegistry.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(record.contracts.subscription.transactionHash, /^0x[0-9a-f]{64}$/i)
  assert.match(parsed.testOnlyNotice, /NO VALUE.*NO REDEMPTION.*NOT PRODUCTION JPYC/)
  assert.equal(hasActiveCreatorRegistry(parsed), true)
  assert.equal(hasActiveSupporterRegistration(parsed), true)
})

test('rejects an active manifest with an invalid chain, address, or source commit', () => {
  const base = {
    schemaVersion: 1,
    environment: 'sepolia-demo',
    chainId: SEPOLIA_CHAIN_ID,
    networkName: 'Ethereum Sepolia',
    status: 'active',
    sourceCommit: 'a'.repeat(40),
    contracts: {
      mockJpyc: '0x1111111111111111111111111111111111111111',
      subscription: '0x2222222222222222222222222222222222222222',
      treasury: '0x3333333333333333333333333333333333333333',
      supporterSbt: '0x4444444444444444444444444444444444444444'
    }
  }

  assert.throws(() => validateDeploymentManifest({ ...base, chainId: 1 }), /Sepolia/)
  assert.throws(() => validateDeploymentManifest({ ...base, sourceCommit: 'short' }), /source commit/)
  assert.throws(() => validateDeploymentManifest({ ...base, contracts: { ...base.contracts, mockJpyc: '0x0' } }), /contract address/)
  assert.equal(hasActiveCreatorRegistry(validateDeploymentManifest(base)), false)
  assert.equal(hasActiveCreatorRegistry(validateDeploymentManifest({
    ...base,
    contracts: { ...base.contracts, creatorRegistry: '0x5555555555555555555555555555555555555555' }
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

test('builds the exact short-lived Supporter SBT EIP-712 intent', () => {
  const supporterSbt = '0x4444444444444444444444444444444444444444'
  const holder = '0x5555555555555555555555555555555555555555'
  const value = createSupporterTypedData({ supporterSbt, holder, nonce: 7n, deadline: 900n })

  assert.equal(value.domain.chainId, SEPOLIA_CHAIN_ID)
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
    assert.match(metadata.name, /Sepolia Testnet/)
    assert.match(metadata.description, /TESTNET ONLY/)
    assert.equal(metadata.image, `https://shigeichiroyamasaki.github.io/creator-first-platform/images/${image}`)
    assert.equal(metadata.external_url, 'https://shigeichiroyamasaki.github.io/creator-first-platform/demo/test-user-registration')
    assert.equal(metadata.attributes.some((entry) => entry.trait_type === 'Credential Tier' && entry.value === tier), true)
    assert.equal(metadata.attributes.some((entry) => entry.trait_type === 'Transferability' && entry.value === 'Soulbound'), true)
    await readFile(new URL(`../docs/public/images/${image}`, import.meta.url))
  }
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
