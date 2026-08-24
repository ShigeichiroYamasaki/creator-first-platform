import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-cfp-records.mjs', import.meta.url))
const sourceRoot = fileURLToPath(new URL('../', import.meta.url))

async function runValidator(mutate = async () => {}, gate) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-cfp-records-'))
  try {
    await cp(join(sourceRoot, 'docs/proposals'), join(directory, 'docs/proposals'), { recursive: true })
    await cp(
      join(sourceRoot, '.github/CFP_RECORD_TEMPLATES'),
      join(directory, '.github/CFP_RECORD_TEMPLATES'),
      { recursive: true }
    )
    await mutate(directory)
    const arguments_ = [validator, '--project-root', directory]
    if (gate) arguments_.push('--gate', gate)
    return spawnSync(process.execPath, arguments_, { encoding: 'utf8' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function mutateRecord(root, relativePath, transform) {
  const path = join(root, 'docs/proposals/records', relativePath)
  const source = await readFile(path, 'utf8')
  await writeFile(path, transform(source), 'utf8')
}

test('accepts the complete CFP record structure', async () => {
  const result = await runValidator()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /6 record\(s\), 6 unique document ID\(s\)/)
})

test('rejects minutes missing a required metadata field', async () => {
  const result = await runValidator((root) => mutateRecord(
    root,
    'CFP-0002/revision-0001/creator-house/minutes-001.md',
    (source) => source.replace('chair_id: TEST-CREATOR-A', 'removed_chair_id: TEST-CREATOR-A')
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing required field chair_id/)
})

test('rejects a duplicate document ID', async () => {
  const result = await runValidator((root) => mutateRecord(
    root,
    'CFP-0002/revision-0001/user-house/minutes-001.md',
    (source) => source.replace(
      'MIN-CFP-0002-R0001-USER-001',
      'MIN-CFP-0002-R0001-CREATOR-001'
    )
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate document_id/)
})

test('rejects frontmatter that does not match its CFP directory', async () => {
  const result = await runValidator((root) => mutateRecord(
    root,
    'CFP-0002/revision-0001/issues/ISSUE-0001.md',
    (source) => source.replace('cfp_id: CFP-0002', 'cfp_id: CFP-0003')
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /cfp_id does not match directory/)
})

test('rejects minutes without the minority-opinion section', async () => {
  const result = await runValidator((root) => mutateRecord(
    root,
    'CFP-0002/revision-0001/user-house/minutes-001.md',
    (source) => source.replace('## 少数意見', '## 削除された少数意見')
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing required heading 少数意見/)
})

test('deployment gate rejects an unresolved blocking issue and test fixtures', async () => {
  const result = await runValidator(async () => {}, 'CFP-0002@1')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /unresolved blocking issue ISSUE-CFP-0002-R0001-0001/)
  assert.match(result.stderr, /missing final production minutes for creator_house/)
  assert.match(result.stderr, /missing hash_bound production evidence index/)
})

test('deployment gate accepts confirmed production records with verified hashes', async () => {
  const hash = `0x${'a'.repeat(64)}`
  const commit = 'b'.repeat(40)
  const result = await runValidator(async (root) => {
    const recordPaths = [
      'CFP-0002/revision-0001/evidence-index.md',
      'CFP-0002/revision-0001/creator-house/minutes-001.md',
      'CFP-0002/revision-0001/creator-house/decision.md',
      'CFP-0002/revision-0001/user-house/minutes-001.md',
      'CFP-0002/revision-0001/user-house/decision.md'
    ]
    for (const relativePath of recordPaths) {
      await mutateRecord(root, relativePath, (source) => source
        .replace('status: test_fixture', relativePath.endsWith('evidence-index.md') ? 'status: hash_bound' : 'status: confirmed')
        .replace('record_profile: testnet_fixture', 'record_profile: production')
        .replaceAll('source_commit: pending', `source_commit: ${commit}`)
        .replaceAll('content_hash: pending', `content_hash: "${hash}"`)
        .replaceAll('bundle_root: pending', `bundle_root: "${hash}"`)
        .replaceAll('cfp_revision_hash: pending', `cfp_revision_hash: "${hash}"`)
        .replaceAll('membership_snapshot_hash: pending', `membership_snapshot_hash: "${hash}"`)
        .replaceAll('agenda_hash: pending', `agenda_hash: "${hash}"`)
        .replaceAll('result_evidence_hash: pending', `result_evidence_hash: "${hash}"`)
        .replaceAll('status: candidate', 'status: verified')
        .replace('confirmed_at: null', 'confirmed_at: 2026-08-24T12:00:00+09:00')
        .replace('confirmers: []', 'confirmers: [MEMBER-A, MEMBER-B]'))
    }
    await mutateRecord(root, 'CFP-0002/revision-0001/issues/ISSUE-0001.md', (source) =>
      source.replace('blocking: true', 'blocking: false')
    )
  }, 'CFP-0002@1')
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /gate CFP-0002@1/)
})
