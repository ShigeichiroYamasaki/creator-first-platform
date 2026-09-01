import { isAddress } from 'viem'
import { validateDeploymentManifest } from './testnet-user-demo.js'

export const governanceAbi = [
  {
    type: 'function', name: 'proposalCount', stateMutability: 'view', inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'proposalState', stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function', name: 'memberHouse', stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'uint256' }, { name: 'member', type: 'address' }],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    type: 'function', name: 'remainingVoiceCredits', stateMutability: 'view',
    inputs: [{ name: 'sessionId', type: 'uint256' }, { name: 'member', type: 'address' }],
    outputs: [{ name: '', type: 'uint32' }]
  },
  {
    type: 'function', name: 'votingNonces', stateMutability: 'view',
    inputs: [{ name: 'member', type: 'address' }], outputs: [{ name: '', type: 'uint256' }]
  },
  {
    type: 'function', name: 'proposals', stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }],
    outputs: [
      { name: 'sessionId', type: 'uint256' }, { name: 'contentHash', type: 'bytes32' },
      { name: 'specificationHash', type: 'bytes32' }, { name: 'manifestHash', type: 'bytes32' },
      { name: 'callDataHash', type: 'bytes32' }, { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' }, { name: 'votingStartsAt', type: 'uint64' },
      { name: 'votingEndsAt', type: 'uint64' }, { name: 'executableAt', type: 'uint64' },
      { name: 'expiresAt', type: 'uint64' }, { name: 'creatorScore', type: 'int64' },
      { name: 'userScore', type: 'int64' }, { name: 'creatorParticipants', type: 'uint32' },
      { name: 'userParticipants', type: 'uint32' }, { name: 'changeClass', type: 'uint8' },
      { name: 'creatorApproved', type: 'bool' }, { name: 'userApproved', type: 'bool' },
      { name: 'finalized', type: 'bool' }, { name: 'reviewed', type: 'bool' },
      { name: 'queued', type: 'bool' }, { name: 'executed', type: 'bool' },
      { name: 'cancelled', type: 'bool' }
    ]
  },
  {
    type: 'function', name: 'proposalCfpIdHash', stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'bytes32' }]
  },
  {
    type: 'function', name: 'proposalCfpRevision', stateMutability: 'view',
    inputs: [{ name: 'proposalId', type: 'uint256' }], outputs: [{ name: '', type: 'uint32' }]
  },
  {
    type: 'function', name: 'castCfpApprovalVote', stateMutability: 'nonpayable',
    inputs: [{ name: 'proposalId', type: 'uint256' }, { name: 'intensity', type: 'int8' }], outputs: []
  }
]

export function governanceBallotTypedData({ chainId, governor, proposalId, sessionId, house, member, intensity, nonce, deadline }) {
  return {
    domain: { name: 'Creator First Bicameral Governor', version: '1', chainId, verifyingContract: governor },
    types: {
      CfpBallot: [
        { name: 'proposalId', type: 'uint256' }, { name: 'sessionId', type: 'uint256' },
        { name: 'house', type: 'uint8' }, { name: 'member', type: 'address' },
        { name: 'intensity', type: 'int8' }, { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' }
      ]
    },
    primaryType: 'CfpBallot',
    message: { proposalId, sessionId, house, member, intensity, nonce, deadline }
  }
}

export const governanceStateLabels = [
  '未登録', '投票開始前', '投票中', '集計待ち', '否決', '両院承認',
  'レビュー済み', 'タイムロック中', '実行済み', '取消済み', '期限切れ'
]

export const legislatorRegistrationAbi = [
  {
    type: 'function', name: 'registerAsCreator', stateMutability: 'nonpayable',
    inputs: [{ name: 'sessionId', type: 'uint256' }], outputs: []
  },
  {
    type: 'function', name: 'registerAsUser', stateMutability: 'nonpayable',
    inputs: [{ name: 'sessionId', type: 'uint256' }], outputs: []
  }
]

export function quadraticCost(intensity) {
  if (!Number.isInteger(intensity) || intensity < -9 || intensity > 9) {
    throw new Error('投票強度は-9から9までの整数で指定します。')
  }
  return intensity * intensity
}

export function validateGovernanceDeployment(value) {
  const manifest = validateDeploymentManifest(value)
  const governor = manifest?.contracts?.governor
  const governedPolicy = manifest?.contracts?.governedPolicy
  const legislatorRegistrationAdapter = manifest?.contracts?.legislatorRegistrationAdapter
  if (governor === undefined && governedPolicy === undefined) {
    return { ...manifest, governanceReady: false, governor: null, governedPolicy: null, legislatorRegistrationAdapter: null }
  }
  if (!isAddress(governor) || /^0x0{40}$/i.test(governor) || !isAddress(governedPolicy) || /^0x0{40}$/i.test(governedPolicy)) {
    throw new Error('ガバナンスのコントラクトアドレスが不完全です。')
  }
  if (
    legislatorRegistrationAdapter !== undefined
    && (!isAddress(legislatorRegistrationAdapter) || /^0x0{40}$/i.test(legislatorRegistrationAdapter))
  ) {
    throw new Error('議員登録アダプターのコントラクトアドレスが不完全です。')
  }
  return {
    ...manifest,
    governanceReady: true,
    governor,
    governedPolicy,
    legislatorRegistrationAdapter: legislatorRegistrationAdapter ?? null
  }
}
