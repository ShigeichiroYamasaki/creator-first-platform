import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

import { participantEnrollmentAction } from '../docs/.vitepress/theme/participantEnrollmentUi.js'

test('keeps an incomplete invitation actionable so the operator sees the missing step', () => {
  const action = participantEnrollmentAction({ state: 'SENT', claimedWallet: null, enrollment: { state: 'READY_AFTER_WALLET_CLAIM' } })
  assert.equal(action.disabled, false)
  assert.equal(action.label, '承認・初回POL配布')
  assert.match(action.hint, /仮想通貨ワレット/)
})

test('keeps operator-disabled enrollment actionable for diagnosis', () => {
  const action = participantEnrollmentAction({ state: 'CLAIMED', claimedWallet: '0x1234', enrollment: { state: 'OPERATOR_DISABLED' } })
  assert.equal(action.disabled, false)
  assert.equal(action.label, '設定状態を確認')
})

test('offers enrollment for a claimed wallet and retry after a failed transaction', () => {
  const ready = participantEnrollmentAction({ state: 'CLAIMED', claimedWallet: '0x1234', enrollment: { state: 'READY_AFTER_WALLET_CLAIM' } })
  const retry = participantEnrollmentAction({ state: 'CLAIMED', claimedWallet: '0x1234', enrollment: { state: 'FUNDING_FAILED' } })
  assert.deepEqual([ready.disabled, ready.label], [false, '承認・初回POL配布'])
  assert.deepEqual([retry.disabled, retry.label], [false, '再実行'])
})

test('disables only completed enrollment', () => {
  const action = participantEnrollmentAction({ state: 'CLAIMED', claimedWallet: '0x1234', enrollment: { state: 'FUNDED' } })
  assert.equal(action.disabled, true)
  assert.equal(action.label, '準備完了')
})

test('renders pending enrollment as an actionable button without a global busy lock', async () => {
  const component = await readFile(new URL('../docs/.vitepress/theme/ParticipantAdminDemo.vue', import.meta.url), 'utf8')
  assert.match(component, /<button v-else type="button" :aria-busy="processingInvitationId === item\.invitationId" @click="processEnrollment\(item\)">/)
  assert.doesNotMatch(component, /:disabled="busy \|\| participantEnrollmentAction\(item\)\.disabled"/)
  assert.match(component, /<span v-if="participantEnrollmentAction\(item\)\.disabled" class="completion-badge">/)
})

test('renders enrollment actions as responsive cards without an aside overlay', async () => {
  const component = await readFile(new URL('../docs/.vitepress/theme/ParticipantAdminDemo.vue', import.meta.url), 'utf8')
  const page = await readFile(new URL('../docs/admin/participant-invitations.md', import.meta.url), 'utf8')
  assert.match(page, /^aside: false$/m)
  assert.match(component, /\.participant-admin\{display:grid;min-width:0;max-width:100%/)
  assert.match(component, /class="record-list invitation-list"/)
  assert.doesNotMatch(component, /<table>/)
  assert.match(component, /\.operation-cell button,\.completion-badge\{width:100%\}/)
})
