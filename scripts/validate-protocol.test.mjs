import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-protocol.mjs', import.meta.url))

function specification({
  specificationId = 'SPEC-TEST-001',
  requirementId = 'REQ-TEST-001',
  testedRequirementId = requirementId,
  globalInvariantId = 'INV-TEST-001',
  specificationInvariantId = 'SPEC-INV-TEST-001',
  relatedDocument = 'protocol/invariants.md',
  includeRelatedDocuments = true,
  includeStatus = true,
  openQuestionId = 'OQ-TEST-001',
  openQuestion = '- **' + openQuestionId + ':** **Decision owner:** Test Owner; **Blocks:** test implementation; **Question:** What must be decided?'
} = {}) {
  return [
    '# Test Specification',
    '',
    ...(includeStatus ? ['**Status:** Draft  '] : []),
    '**Version:** 0.1.0  ',
    '**Protocol Domain:** test  ',
    '**Specification ID:** ' + specificationId + '  ',
    '**Last Updated:** 2026-08-19',
    '',
    ...(includeRelatedDocuments ? [
      '## Related Documents',
      '',
      '- `' + relatedDocument + '`',
      ''
    ] : []),
    '## Goal',
    '',
    'Define a minimal test specification.',
    '',
    '## Requirements',
    '',
    '### MUST',
    '',
    '- **' + requirementId + ':** The implementation MUST preserve this test invariant.',
    '',
    '### MUST NOT',
    '',
    '## Invariants',
    '',
    '- `' + globalInvariantId + '`',
    '- **' + specificationInvariantId + ':** The specification preserves its local invariant.',
    '',
    '## Test Requirements',
    '',
    '| Requirement | Test |',
    '| --- | --- |',
    '| ' + testedRequirementId + ' | The requirement is verified. |',
    '',
    '## Acceptance Criteria',
    '',
    '## Open Questions',
    '',
    openQuestion,
    ''
  ].join('\n')
}

function globalInvariants(ids = ['INV-TEST-001']) {
  return [
    '# Global Protocol Invariants',
    '',
    ...ids.flatMap((id) => [
      '- **' + id + '**  ',
      '  The global invariant remains true.',
      ''
    ])
  ].join('\n')
}

async function runValidator(files) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-protocol-'))
  const protocolDirectory = join(directory, 'protocol')

  try {
    const fixtureFiles = { 'invariants.md': globalInvariants(), ...files }
    for (const [relativePath, source] of Object.entries(fixtureFiles)) {
      const path = join(protocolDirectory, relativePath)
      await mkdir(dirname(path), { recursive: true })
      await writeFile(path, source, 'utf8')
    }

    return spawnSync(process.execPath, [
      validator,
      '--project-root', directory,
      '--protocol-dir', protocolDirectory
    ], {
      encoding: 'utf8'
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

test('accepts a complete specification with a local test mapping', async () => {
  const result = await runValidator({ 'test/example-spec.md': specification() })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /1 specification\(s\), 1 unique requirement\(s\), 1 normative test mapping\(s\)/)
})

test('rejects a test mapping to an unknown requirement', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ testedRequirementId: 'REQ-TEST-999' })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Test Requirements references unknown REQ-TEST-999/)
})

test('rejects a test mapping owned by another specification', async () => {
  const result = await runValidator({
    'test/first-spec.md': specification({ testedRequirementId: 'REQ-OTHER-001' }),
    'test/second-spec.md': specification({
      specificationId: 'SPEC-OTHER-001',
      requirementId: 'REQ-OTHER-001',
      specificationInvariantId: 'SPEC-INV-OTHER-001'
    })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Test Requirements references REQ-OTHER-001 from/)
})

test('rejects a specification with missing required metadata', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ includeStatus: false })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing Status metadata/)
})

test('rejects a specification that references an unknown global invariant', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ globalInvariantId: 'INV-UNKNOWN-999' })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Invariants references unknown INV-UNKNOWN-999/)
})

test('rejects a duplicate global invariant ID', async () => {
  const result = await runValidator({
    'invariants.md': globalInvariants(['INV-TEST-001', 'INV-TEST-001']),
    'test/example-spec.md': specification()
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate global invariant ID INV-TEST-001/)
})

test('rejects a duplicate specification invariant ID', async () => {
  const source = specification().replace(
    '- **SPEC-INV-TEST-001:** The specification preserves its local invariant.',
    [
      '- **SPEC-INV-TEST-001:** The specification preserves its local invariant.',
      '- **SPEC-INV-TEST-001:** This duplicate must be rejected.'
    ].join('\n')
  )
  const result = await runValidator({ 'test/example-spec.md': source })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate specification invariant ID SPEC-INV-TEST-001/)
})

test('rejects a missing repository document reference', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ relatedDocument: 'docs/missing-document.md' })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /repository document reference does not exist: docs\/missing-document\.md/)
})

test('rejects a specification without Related Documents', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ includeRelatedDocuments: false })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing Related Documents section/)
})

test('rejects a malformed Open Question without ownership metadata', async () => {
  const result = await runValidator({
    'test/example-spec.md': specification({ openQuestion: '- What must be decided?' })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /malformed Open Question/)
})

test('rejects a duplicate Open Question ID across specifications', async () => {
  const result = await runValidator({
    'test/first-spec.md': specification(),
    'test/second-spec.md': specification({
      specificationId: 'SPEC-OTHER-001',
      requirementId: 'REQ-OTHER-001',
      specificationInvariantId: 'SPEC-INV-OTHER-001'
    })
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate Open Question ID OQ-TEST-001/)
})
