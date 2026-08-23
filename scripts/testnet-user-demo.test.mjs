import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

import {
  createTestToneWav,
  SEPOLIA_CHAIN_ID,
  validateDeploymentManifest
} from '../docs/.vitepress/theme/testnet-user-demo.js'

const manifestPath = new URL('../docs/public/testnet/deployment.json', import.meta.url)

test('ships a fail-closed Sepolia deployment manifest until addresses are published', async () => {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  const parsed = validateDeploymentManifest(manifest)

  assert.equal(parsed.chainId, SEPOLIA_CHAIN_ID)
  assert.equal(parsed.status, 'not-deployed')
  assert.equal(parsed.active, false)
  assert.equal(parsed.contracts.mockJpyc, null)
  assert.match(parsed.testOnlyNotice, /NO VALUE.*NO REDEMPTION.*NOT PRODUCTION JPYC/)
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
