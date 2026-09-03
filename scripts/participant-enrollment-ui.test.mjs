import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const componentPath = new URL('../docs/.vitepress/theme/ParticipantAdminDemo.vue', import.meta.url)

test('keeps invitation enrollment status read-only and automatic', async () => {
  const component = await readFile(componentPath, 'utf8')

  assert.match(component, /承認する/)
  assert.match(component, /参加承認と初回POL配布は自動で進みます/)
  assert.match(component, /追加操作は必要ありません/)
  assert.match(component, /自動再試行中/)
  assert.doesNotMatch(component, /processEnrollment|participantEnrollmentAction/)
  assert.doesNotMatch(component, /運営処理を再実行|運営処理を再開/)
  assert.doesNotMatch(component, /participant-invitations\/\$\{invitation\.invitationId\}\/enrollment/)
})

test('uses responsive cards instead of a wide invitation table', async () => {
  const component = await readFile(componentPath, 'utf8')

  assert.match(component, /<article v-for="item in invitations"/)
  assert.match(component, /class="record-list invitation-list"/)
  assert.match(component, /\.participant-admin\{display:grid/)
  assert.doesNotMatch(component, /<table/)
})
