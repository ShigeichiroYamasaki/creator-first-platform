import { readFile } from 'node:fs/promises'

const requiredFiles = [
  'apps/gateway/src/server.js',
  'apps/gateway/src/GatewayStore.js',
  'apps/gateway/src/media/FileMediaAdapter.js',
  'apps/gateway/src/media/NavidromeMediaAdapter.js',
  'apps/gateway/test/gateway.test.mjs'
]

const contents = await Promise.all(requiredFiles.map((file) => readFile(file, 'utf8')))
const source = contents.join('\n')
const requirements = [
  ['/v1/playback-sessions', 'Playback Session API'],
  ['/v1/streams/', 'opaque stream API'],
  ['Remote-User', 'forged identity negative test'],
  ['recoverMessageAddress', 'SIWE signature recovery'],
  ['recoverTypedDataAddress', 'EIP-712 signature recovery'],
  ['Content-Range', 'Range delivery'],
  ['delivery_evidence', 'Delivery Evidence store'],
  ['CATALOG_MAPPING_UNAVAILABLE', 'fail-closed mapping'],
  ['SUBSCRIPTION_INACTIVE', 'subscription decision'],
  ['SUPPORTER_REQUIRED', 'credential overlay decision']
]

const missing = requirements.filter(([needle]) => !source.includes(needle))
if (missing.length) {
  throw new Error(`Gateway validation failed: ${missing.map(([, label]) => label).join(', ')}`)
}
console.log(`Gateway validation passed: ${requiredFiles.length} source/test files and ${requirements.length} boundaries.`)
