import assert from 'node:assert/strict'
import { test } from 'node:test'
import { privateKeyToAccount } from 'viem/accounts'

import { GovernanceVoteRelayer, governanceBallotTypedData } from '../src/GovernanceVoteRelayer.js'

const governorAddress = '0x1111111111111111111111111111111111111111'
const account = privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a841f4603b6b78690d2')

test('relays a member-signed governance ballot once and preserves the member identity', async () => {
  let nonce = 0n
  let relayCount = 0
  const chain = {
    async ready() { return true },
    async status() { return { nonce, house: 2, intensity: 0, cost: 0, cast: false } },
    async relay(value) {
      relayCount += 1
      nonce += 1n
      return { transactionHash: `0x${'ab'.repeat(32)}`, blockNumber: 10n, nonce, house: 2, intensity: value.intensity, cost: value.intensity ** 2, cast: true }
    }
  }
  const relayer = new GovernanceVoteRelayer({ chain, governorAddress })
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const ballot = { proposalId: 1n, sessionId: 1n, house: 2, member: account.address, intensity: 2, nonce: 0n, deadline }
  const signature = await account.signTypedData(governanceBallotTypedData({ chainId: 80002, governor: governorAddress, ...ballot }))
  const input = Object.fromEntries(Object.entries({ ...ballot, signature, idempotencyKey: 'ballot-test-1' }).map(([key, value]) => [key, typeof value === 'bigint' ? value.toString() : value]))

  const first = await relayer.relay(input)
  const replay = await relayer.relay(input)
  assert.equal(first.status, 'VOTE_CONFIRMED')
  assert.equal(first.member, account.address)
  assert.equal(first.intensity, 2)
  assert.deepEqual(replay, first)
  assert.equal(relayCount, 1)
})

test('rejects a signature made by a different wallet', async () => {
  const other = privateKeyToAccount('0x8b3a350cf5c34c9194ca3a545d69a8b22226e04e3f03f1908f8f2f94a7f9a28b')
  const chain = { async ready() { return true } }
  const relayer = new GovernanceVoteRelayer({ chain, governorAddress })
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const ballot = { proposalId: 1n, sessionId: 1n, house: 2, member: account.address, intensity: 1, nonce: 0n, deadline }
  const signature = await other.signTypedData(governanceBallotTypedData({ chainId: 80002, governor: governorAddress, ...ballot }))
  await assert.rejects(
    relayer.relay({ ...ballot, proposalId: '1', sessionId: '1', nonce: '0', deadline: deadline.toString(), signature, idempotencyKey: 'ballot-test-2' }),
    (error) => error.code === 'BALLOT_SIGNER_MISMATCH'
  )
})
