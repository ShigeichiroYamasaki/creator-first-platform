import { readFile } from 'node:fs/promises'

const requirements = [
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'spentVoiceCredits', 'session-wide voice-credit accounting'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'creatorApproved && proposal.userApproved', 'bicameral approval'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'keccak256(callData) != proposal.callDataHash', 'manifest calldata binding'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'onlyRole(GUARDIAN_ROLE)', 'guardian cancellation boundary'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'ConstitutionalEvidenceMissing', 'constitutional referendum evidence boundary'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'registerCfpProposal', 'CFP identifier and revision binding'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'castCfpApprovalVote', 'explicit CFP approval ballot'],
  ['contracts/testnet/CreatorFirstBicameralGovernor.sol', 'houseResult', 'separate House result query'],
  ['contracts/testnet/CreatorFirstGovernedPolicy.sol', 'msg.sender != governor', 'governed execution target'],
  ['ignition/modules/CreatorFirstTestnet.ts', 'CreatorFirstBicameralGovernor', 'Sepolia deployment module'],
  ['ignition/modules/CreatorFirstGovernanceV2Sepolia.ts', 'CreatorFirstBicameralGovernor', 'CFP-aware Sepolia deployment module'],
  ['scripts/verify-sepolia-contracts.mjs', 'Governance manifest must publish governor and policy together', 'Sepolia governance verification'],
  ['test/CreatorFirstGovernance.ts', 'user House rejection cannot be offset', 'separate House negative test'],
  ['docs/demo/governance.md', 'テストネットで簡略化している事項', 'public testnet boundary'],
  ['docs/.vitepress/theme/TestnetGovernanceDemo.vue', 'castVote', 'wallet voting UI'],
  ['docs/demo/creator-house.md', 'focus-house="creator"', 'Creator House route'],
  ['docs/demo/user-house.md', 'focus-house="user"', 'User House route'],
  ['protocol/governance/contract-change-governance-spec.md', 'Testnet Implementation Profile', 'protocol implementation profile'],
  ['docs/adr/ADR-0016-bicameral-quadratic-governance.md', 'テストネット実装プロファイル', 'ADR implementation profile']
]

const contents = new Map(await Promise.all(
  [...new Set(requirements.map(([file]) => file))].map(async (file) => [file, await readFile(file, 'utf8')])
))
const missing = requirements.filter(([file, needle]) => !contents.get(file).includes(needle))
if (missing.length) {
  throw new Error(`Governance implementation validation failed: ${missing.map(([, , label]) => label).join(', ')}`)
}

console.log(`Governance validation passed: ${contents.size} implementation/design files and ${requirements.length} boundaries.`)
