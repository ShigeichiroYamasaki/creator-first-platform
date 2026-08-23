import { isAddress } from 'viem'

export const SEPOLIA_CHAIN_ID = 11155111

export const mockJpycAbi = [
  {
    type: 'function',
    name: 'claim',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' }
    ],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
]

export const subscriptionAbi = [
  {
    type: 'function',
    name: 'plan',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      { name: 'price', type: 'uint128' },
      { name: 'duration', type: 'uint64' },
      { name: 'version', type: 'uint64' },
      { name: 'enabled', type: 'bool' }
    ]
  },
  {
    type: 'function',
    name: 'subscriptionActiveUntil',
    stateMutability: 'view',
    inputs: [{ name: 'subscriber', type: 'address' }],
    outputs: [{ name: '', type: 'uint64' }]
  },
  {
    type: 'function',
    name: 'isActive',
    stateMutability: 'view',
    inputs: [{ name: 'subscriber', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    type: 'function',
    name: 'subscribe',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'paymentReference', type: 'bytes32' },
      { name: 'expectedPlanVersion', type: 'uint64' }
    ],
    outputs: [{ name: 'activeUntil', type: 'uint64' }]
  }
]

function hasValidAddress(value) {
  return typeof value === 'string' && isAddress(value) && !/^0x0{40}$/i.test(value)
}

export function validateDeploymentManifest(value) {
  if (!value || typeof value !== 'object') throw new Error('Deployment manifest is not an object.')
  if (value.schemaVersion !== 1) throw new Error('Unsupported deployment manifest schema.')
  if (value.chainId !== SEPOLIA_CHAIN_ID) throw new Error('Only Ethereum Sepolia is accepted.')
  if (!['not-deployed', 'active'].includes(value.status)) throw new Error('Unknown deployment status.')
  if (value.status === 'not-deployed') return { ...value, active: false }

  const contracts = value.contracts
  if (!contracts || !['mockJpyc', 'subscription', 'treasury', 'supporterSbt'].every((key) => hasValidAddress(contracts[key]))) {
    throw new Error('Active deployment manifest contains an invalid contract address.')
  }
  if (typeof value.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/i.test(value.sourceCommit)) {
    throw new Error('Active deployment manifest must identify a full source commit.')
  }
  return { ...value, active: true }
}

export function createTestToneWav(frequency, durationSeconds = 8, sampleRate = 8_000) {
  const sampleCount = Math.floor(durationSeconds * sampleRate)
  const buffer = new ArrayBuffer(44 + sampleCount * 2)
  const view = new DataView(buffer)
  const writeText = (offset, text) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + sampleCount * 2, true)
  writeText(8, 'WAVEfmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeText(36, 'data')
  view.setUint32(40, sampleCount * 2, true)
  for (let index = 0; index < sampleCount; index += 1) {
    const fade = Math.min(1, index / (sampleRate * 0.08), (sampleCount - index) / (sampleRate * 0.2))
    const sample = Math.sin((2 * Math.PI * frequency * index) / sampleRate) * 0.18 * fade
    view.setInt16(44 + index * 2, Math.round(sample * 32767), true)
  }
  return buffer
}
