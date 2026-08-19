import assert from 'node:assert/strict'
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-community-files.mjs', import.meta.url))
const sourceTemplates = fileURLToPath(new URL('../.github/ISSUE_TEMPLATE/', import.meta.url))

async function runValidator(mutate = async () => {}) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-community-'))
  const templates = join(directory, '.github/ISSUE_TEMPLATE')
  try {
    await cp(sourceTemplates, templates, { recursive: true })
    await mutate(templates)
    return spawnSync(process.execPath, [validator, '--project-root', directory], { encoding: 'utf8' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function mutateDecisionForm(directory, transform) {
  const path = join(directory, 'protocol-decision.yml')
  const source = await readFile(path, 'utf8')
  await writeFile(path, transform(source), 'utf8')
}

test('accepts the complete Protocol Decision Issue Form', async () => {
  const result = await runValidator()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /2 Issue Form\(s\), 12 Protocol Decision field\(s\), 12 Implementation field\(s\)/)
})

test('rejects malformed YAML', async () => {
  const result = await runValidator((directory) => mutateDecisionForm(directory, (source) => `${source}\ninvalid: [\n`))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Community file validation failed/)
})

test('rejects a missing decision field', async () => {
  const result = await runValidator((directory) => mutateDecisionForm(
    directory,
    (source) => source.replace('    id: acceptance', '    id: removed-acceptance')
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing required decision field acceptance/)
})

test('rejects an optional mandatory confirmation', async () => {
  const result = await runValidator((directory) => mutateDecisionForm(
    directory,
    (source) => source.replace(
      '        - label: このIssueの作成だけでは、法務・専門家・法人機関・Protocol Governanceの承認にならないことを理解しています。\n          required: true',
      '        - label: このIssueの作成だけでは、法務・専門家・法人機関・Protocol Governanceの承認にならないことを理解しています。\n          required: false'
    )
  ))
  assert.equal(result.status, 1)
  assert.match(result.stderr, /every confirmation option must be required/)
})

test('rejects a missing implementation completion-evidence field', async () => {
  const result = await runValidator(async (directory) => {
    const path = join(directory, 'implementation-work-package.yml')
    const source = await readFile(path, 'utf8')
    await writeFile(path, source.replace('    id: completion-evidence', '    id: removed-completion-evidence'), 'utf8')
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing required implementation field completion-evidence/)
})
