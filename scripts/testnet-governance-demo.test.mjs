import assert from 'node:assert/strict'
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
      governedPolicy: '0x6666666666666666666666666666666666666666'
    }
  })
  assert.equal(active.governanceReady, true)
  assert.equal(active.governor, '0x5555555555555555555555555555555555555555')
  assert.equal(governanceStateLabels[7], 'タイムロック中')

  assert.throws(() => validateGovernanceDeployment({
    ...baseManifest,
    contracts: { ...baseManifest.contracts, governor: '0x5555555555555555555555555555555555555555' }
  }), /不完全/)
})
