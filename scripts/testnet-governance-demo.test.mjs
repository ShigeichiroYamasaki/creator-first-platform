import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  governanceStateLabels,
  quadraticCost,
  validateGovernanceDeployment
} from '../docs/.vitepress/theme/testnet-governance-demo.js'

const baseManifest = {
  schemaVersion: 1,
  environment: 'sepolia-demo',
  chainId: 11155111,
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

const governorMetadataCases = [
  {
    metadataPath: new URL('../docs/public/sbt/creator-house-governor.json', import.meta.url),
    imagePath: new URL('../docs/public/images/creator-house-governor-sbt.png', import.meta.url),
    house: 'Creator House',
    image: 'creator-house-governor-sbt.png',
    externalUrl: 'https://shigeichiroyamasaki.github.io/creator-first-platform/demo/creator-house'
  },
  {
    metadataPath: new URL('../docs/public/sbt/user-house-governor.json', import.meta.url),
    imagePath: new URL('../docs/public/images/user-house-governor-sbt.png', import.meta.url),
    house: 'User House',
    image: 'user-house-governor-sbt.png',
    externalUrl: 'https://shigeichiroyamasaki.github.io/creator-first-platform/demo/user-house'
  }
]

test('calculates bounded quadratic voice-credit cost', () => {
  assert.equal(quadraticCost(-3), 9)
  assert.equal(quadraticCost(0), 0)
  assert.equal(quadraticCost(3), 9)
  assert.throws(() => quadraticCost(10), /-9から9/)
  assert.throws(() => quadraticCost(1.5), /整数/)
})

test('keeps governance disabled until both reviewed addresses are published', () => {
  const pending = validateGovernanceDeployment(baseManifest)
  assert.equal(pending.governanceReady, false)
  assert.equal(pending.governor, null)

  const active = validateGovernanceDeployment({
    ...baseManifest,
    contracts: {
      ...baseManifest.contracts,
      governor: '0x5555555555555555555555555555555555555555',
      governedPolicy: '0x6666666666666666666666666666666666666666',
      legislatorRegistrationAdapter: '0x7777777777777777777777777777777777777777'
    }
  })
  assert.equal(active.governanceReady, true)
  assert.equal(active.governor, '0x5555555555555555555555555555555555555555')
  assert.equal(active.legislatorRegistrationAdapter, '0x7777777777777777777777777777777777777777')
  assert.equal(governanceStateLabels[7], 'タイムロック中')

  assert.throws(() => validateGovernanceDeployment({
    ...baseManifest,
    contracts: { ...baseManifest.contracts, governor: '0x5555555555555555555555555555555555555555' }
  }), /不完全/)

  assert.throws(() => validateGovernanceDeployment({
    ...baseManifest,
    contracts: {
      ...baseManifest.contracts,
      governor: '0x5555555555555555555555555555555555555555',
      governedPolicy: '0x6666666666666666666666666666666666666666',
      legislatorRegistrationAdapter: 'invalid'
    }
  }), /議員登録アダプター/)
})

test('publishes House-specific Governor SBT metadata with resolvable images', async () => {
  for (const entry of governorMetadataCases) {
    const metadata = JSON.parse(await readFile(entry.metadataPath, 'utf8'))
    const image = await readFile(entry.imagePath)
    assert.match(metadata.name, /Governor SBT.*Sepolia Testnet/)
    assert.match(metadata.description, /TESTNET ONLY/)
    assert.equal(
      metadata.image,
      `https://shigeichiroyamasaki.github.io/creator-first-platform/images/${entry.image}`
    )
    assert.equal(metadata.external_url, entry.externalUrl)
    assert.equal(metadata.attributes.some(({ trait_type, value }) => (
      trait_type === 'Governance House' && value === entry.house
    )), true)
    assert.equal(metadata.attributes.some(({ trait_type, value }) => (
      trait_type === 'Credential Role' && value === 'Governor'
    )), true)
    assert.equal(metadata.attributes.some(({ trait_type, value }) => (
      trait_type === 'Transferability' && value === 'Soulbound'
    )), true)
    assert.ok(image.byteLength > 100_000)
  }
})
