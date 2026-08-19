import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-decisions.mjs', import.meta.url))

function specification(id, questionId) {
  return [
    '# Test',
    '',
    '**Status:** Draft',
    '**Version:** 0.1.0',
    '**Protocol Domain:** test',
    `**Specification ID:** ${id}`,
    '**Last Updated:** 2026-08-20',
    '',
    '## Open Questions',
    '',
    `- **${questionId}:** **Decision owner:** Test Owner; **Blocks:** test implementation; **Question:** What must be decided?`
  ].join('\n')
}

function register({ sources, overrides = '{}' } = {}) {
  return [
    'schema_version: 0.1.0',
    'status: DRAFT',
    'source_specifications:',
    ...sources.flatMap(({ id, path }) => [
      `  - id: ${id}`,
      '    version: 0.1.0',
      `    path: ${path}`
    ]),
    'question_defaults:',
    '  assignment: UNASSIGNED',
    '  state: OPEN',
    '  implementation: BLOCKED',
    '  decision_record: null',
    `overrides: ${overrides}`
  ].join('\n')
}

async function runValidator({ registerSource, assumptionsSource = 'schema_version: 0.1.0\nstatus: DRAFT\nassumptions: []\n' } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-decisions-'))
  const files = {
    'protocol/one/example-one-spec.md': specification('SPEC-TEST-001', 'OQ-TEST-001'),
    'protocol/two/example-two-spec.md': specification('SPEC-TEST-002', 'OQ-TEST-002'),
    'decisions/decision-register.yaml': registerSource ?? register({
      sources: [
        { id: 'SPEC-TEST-001', path: 'protocol/one/example-one-spec.md' },
        { id: 'SPEC-TEST-002', path: 'protocol/two/example-two-spec.md' }
      ]
    }),
    'decisions/mock-assumptions.yaml': assumptionsSource
  }
  try {
    for (const [relativePath, source] of Object.entries(files)) {
      const path = join(directory, relativePath)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source, 'utf8')
    }
    return spawnSync(process.execPath, [validator, '--project-root', directory], { encoding: 'utf8' })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('accepts a complete source-derived decision baseline', async () => {
  const result = await runValidator()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /2 source specification\(s\), 2 tracked Open Question\(s\)/)
})

test('rejects a missing source specification', async () => {
  const result = await runValidator({
    registerSource: register({
      sources: [{ id: 'SPEC-TEST-001', path: 'protocol/one/example-one-spec.md' }]
    })
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing source specification SPEC-TEST-002/)
})

test('rejects an override for an unknown Open Question', async () => {
  const source = register({
    sources: [
      { id: 'SPEC-TEST-001', path: 'protocol/one/example-one-spec.md' },
      { id: 'SPEC-TEST-002', path: 'protocol/two/example-two-spec.md' }
    ],
    overrides: '{ OQ-MISSING-001: { state: OPEN } }'
  })
  const result = await runValidator({ registerSource: source })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /override references unknown OQ-MISSING-001/)
})

test('rejects a decision without public evidence', async () => {
  const source = register({
    sources: [
      { id: 'SPEC-TEST-001', path: 'protocol/one/example-one-spec.md' },
      { id: 'SPEC-TEST-002', path: 'protocol/two/example-two-spec.md' }
    ],
    overrides: '{ OQ-TEST-001: { state: DECIDED, implementation: ALLOWED } }'
  })
  const result = await runValidator({ registerSource: source })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /requires a public assignment/)
  assert.match(result.stderr, /requires decision_record/)
  assert.match(result.stderr, /requires decided_at/)
})

test('rejects an unsafe or untraceable Mock assumption', async () => {
  const assumptionsSource = [
    'schema_version: 0.1.0',
    'status: DRAFT',
    'assumptions:',
    '  - id: MOCK-ASSUMPTION-001',
    '    state: ACTIVE',
    '    scope: [IMP-002]',
    '    source_questions: [OQ-MISSING-001]',
    '    value: fixture only',
    '    expires_when: decision is recorded',
    '    prohibited_uses: []'
  ].join('\n')
  const result = await runValidator({ assumptionsSource })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /references unknown OQ-MISSING-001/)
  assert.match(result.stderr, /requires prohibited_uses/)
})
