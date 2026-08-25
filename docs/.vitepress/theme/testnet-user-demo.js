import { isAddress, keccak256, stringToHex } from 'viem'

export const AMOY_CHAIN_ID = 80002
export const AMOY_CHAIN_HEX = '0x13882'
export const AMOY_EXPLORER_URL = 'https://amoy.polygonscan.com'
export const DEMO_SUPPORTER_CREATOR_ID = keccak256(stringToHex('creator:synthetic-demo-artist'))
export const DEMO_SUPPORTER_CONSENT_VERSION = keccak256(stringToHex('supporter-demo-consent-v1'))
const PUBLIC_SITE_ORIGIN = 'https://shigeichiroyamasaki.github.io'
const SUPPORTER_METADATA_PATHS = new Map([
  ['/creator-first-platform/sbt/supporter.json', '/creator-first-platform/images/supporter-sbt-example.webp'],
  ['/creator-first-platform/sbt/early-supporter.json', '/creator-first-platform/images/early-supporter-sbt-example.webp']
])

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

export const supporterSbtAbi = [
  {
    type: 'function', name: 'nonces', stateMutability: 'view',
    inputs: [{ name: 'holder', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'activeTokenOf', stateMutability: 'view',
    inputs: [{ name: 'creatorId', type: 'bytes32' }, { name: 'holder', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'getSupporterTier', stateMutability: 'view',
    inputs: [{ name: 'creatorId', type: 'bytes32' }, { name: 'holder', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function', name: 'tokenURI', stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }], outputs: [{ name: '', type: 'string' }]
  }
]

export const supporterRegistrationAdapterAbi = [
  {
    type: 'function', name: 'registerSelf', stateMutability: 'nonpayable',
    inputs: [
      { name: 'creatorId', type: 'bytes32' },
      { name: 'nonce', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'consentVersion', type: 'bytes32' },
      { name: 'signature', type: 'bytes' }
    ],
    outputs: [{ name: 'tokenId', type: 'uint256' }, { name: 'tier', type: 'uint8' }]
  }
]

export function createSupporterTypedData({ supporterSbt, holder, nonce, deadline }) {
  return {
    domain: {
      name: 'Creator First Supporter SBT',
      version: '1',
      chainId: AMOY_CHAIN_ID,
      verifyingContract: supporterSbt
    },
    types: {
      SupportIntent: [
        { name: 'creatorId', type: 'bytes32' },
        { name: 'holder', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'consentVersion', type: 'bytes32' }
      ]
    },
    primaryType: 'SupportIntent',
    message: {
      creatorId: DEMO_SUPPORTER_CREATOR_ID,
      holder,
      nonce,
      deadline,
      consentVersion: DEMO_SUPPORTER_CONSENT_VERSION
    }
  }
}

export function validateSupporterMetadata(value, metadataUri) {
  const metadataUrl = new URL(metadataUri)
  const expectedImagePath = SUPPORTER_METADATA_PATHS.get(metadataUrl.pathname)
  if (metadataUrl.origin !== PUBLIC_SITE_ORIGIN || !expectedImagePath || metadataUrl.search || metadataUrl.hash) {
    throw new Error('Supporter SBT metadata URI is not approved.')
  }
  if (!value || typeof value !== 'object' || typeof value.name !== 'string' || typeof value.description !== 'string') {
    throw new Error('Supporter SBT metadata is incomplete.')
  }
  const imageUrl = new URL(value.image)
  if (imageUrl.origin !== PUBLIC_SITE_ORIGIN || imageUrl.pathname !== expectedImagePath || imageUrl.search || imageUrl.hash) {
    throw new Error('Supporter SBT image URI is not approved.')
  }
  if (!Array.isArray(value.attributes)) throw new Error('Supporter SBT attributes are missing.')
  return value
}

export const creatorRegistryAbi = [
  {
    type: 'function', name: 'creatorIdByAccount', stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'creators', stateMutability: 'view',
    inputs: [{ name: 'creatorId', type: 'uint256' }],
    outputs: [
      { name: 'account', type: 'address' }, { name: 'payoutAddress', type: 'address' },
      { name: 'profileCommitment', type: 'bytes32' }, { name: 'registeredAt', type: 'uint64' },
      { name: 'releaseCount', type: 'uint32' }, { name: 'active', type: 'bool' }
    ]
  },
  {
    type: 'function', name: 'registerCreator', stateMutability: 'nonpayable',
    inputs: [{ name: 'profileCommitment', type: 'bytes32' }, { name: 'payoutAddress', type: 'address' }],
    outputs: [{ name: 'creatorId', type: 'uint256' }]
  },
  {
    type: 'function', name: 'declareRelease', stateMutability: 'nonpayable',
    inputs: [{ name: 'metadataCommitment', type: 'bytes32' }, { name: 'rightsDeclarationCommitment', type: 'bytes32' }],
    outputs: [{ name: 'releaseId', type: 'uint256' }]
  },
  {
    type: 'event', name: 'ReleaseDeclared',
    inputs: [
      { indexed: true, name: 'releaseId', type: 'uint256' },
      { indexed: true, name: 'creatorId', type: 'uint256' },
      { indexed: false, name: 'metadataCommitment', type: 'bytes32' },
      { indexed: false, name: 'rightsDeclarationCommitment', type: 'bytes32' }
    ]
  }
]

function hasValidAddress(value) {
  return typeof value === 'string' && isAddress(value) && !/^0x0{40}$/i.test(value)
}

export function validateDeploymentManifest(value) {
  if (!value || typeof value !== 'object') throw new Error('Deployment manifest is not an object.')
  if (value.schemaVersion !== 1) throw new Error('Unsupported deployment manifest schema.')
  if (value.chainId !== AMOY_CHAIN_ID) throw new Error('Only Polygon Amoy is accepted.')
  if (!['not-deployed', 'active'].includes(value.status)) throw new Error('Unknown deployment status.')
  if (value.status === 'not-deployed') return { ...value, active: false }

  const contracts = value.contracts
  if (!contracts || !['mockJpyc', 'subscription', 'treasury', 'supporterSbt'].every((key) => hasValidAddress(contracts[key]))) {
    throw new Error('Active deployment manifest contains an invalid contract address.')
  }
  if (typeof value.sourceCommit !== 'string' || !/^[0-9a-f]{40}$/i.test(value.sourceCommit)) {
    throw new Error('Active deployment manifest must identify a full source commit.')
  }
  if (
    contracts.supporterRegistrationAdapter !== undefined &&
    contracts.supporterRegistrationAdapter !== null &&
    !hasValidAddress(contracts.supporterRegistrationAdapter)
  ) {
    throw new Error('Active deployment manifest contains an invalid supporter registration adapter address.')
  }
  return { ...value, active: true }
}

export async function switchProviderToAmoy(provider) {
  try {
    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: AMOY_CHAIN_HEX }]
    })
  } catch (error) {
    if (Number(error?.code) !== 4902) throw error
    await provider.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: AMOY_CHAIN_HEX,
        chainName: 'Polygon Amoy',
        nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
        rpcUrls: [
          'https://polygon-amoy-bor-rpc.publicnode.com',
          'https://polygon-amoy.drpc.org'
        ],
        blockExplorerUrls: [AMOY_EXPLORER_URL]
      }]
    })
  }
}

export function hasActiveCreatorRegistry(manifest) {
  return Boolean(manifest?.active && hasValidAddress(manifest?.contracts?.creatorRegistry))
}

export function hasActiveSupporterRegistration(manifest) {
  return Boolean(
    manifest?.active &&
    hasValidAddress(manifest?.contracts?.supporterSbt) &&
    hasValidAddress(manifest?.contracts?.supporterRegistrationAdapter)
  )
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
