import assert from 'node:assert/strict'
import { appendFile, cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-site-output.mjs', import.meta.url))
const builtSite = fileURLToPath(new URL('../docs/.vitepress/dist/', import.meta.url))

async function runValidator(mutate = async () => {}) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-site-'))

  try {
    await cp(builtSite, directory, { recursive: true })
    await mutate(directory)

    return spawnSync(process.execPath, [validator, '--output-dir', directory], {
      encoding: 'utf8'
    })
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

async function mutateHome(directory, transform) {
  const path = join(directory, 'index.html')
  const source = await readFile(path, 'utf8')
  await writeFile(path, transform(source), 'utf8')
}

test('accepts the complete generated site', async () => {
  const result = await runValidator()

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /4257 internal reference\(s\)/)
})

test('rejects an unresolved internal page reference', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace('/creator-first-platform/status', '/creator-first-platform/missing-page')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /unresolved internal reference \/creator-first-platform\/missing-page/)
})

test('rejects a duplicate element id', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace('<div id="app">', '<div id="app"><span id="app"></span>')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate id attribute\(s\): app/)
})

test('rejects an image without an alt attribute', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace(' alt data-v-', ' data-v-')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /image is missing an alt attribute/)
})

test('rejects multiple level-one headings', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace('<h1 class="heading"', '<h1>Duplicate heading</h1><h1 class="heading"')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /expected exactly one h1, found 2/)
})

test('rejects invalid JSON-LD', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace('{"@context":"https://schema.org"', '{invalid-json')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /JSON-LD is not valid JSON/)
})

test('rejects a duplicate indexable description', async () => {
  const result = await runValidator(async (directory) => {
    const protocol = await readFile(join(directory, 'protocol/index.html'), 'utf8')
    const protocolDescription = protocol.match(/<meta name="description" content="([^"]+)">/)[1]
    await mutateHome(
      directory,
      (source) => source.replace(/<meta name="description" content="[^"]+">/, `<meta name="description" content="${protocolDescription}">`)
    )
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /duplicate description/)
})

test('rejects a raw search index over its parsing budget', async () => {
  const result = await runValidator(async (directory) => {
    const chunks = join(directory, 'assets/chunks')
    const searchIndex = (await readdir(chunks)).find((file) => file.startsWith('@localSearchIndex'))
    await appendFile(join(chunks, searchIndex), ' '.repeat(600_000), 'utf8')
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /raw search index is \d+ bytes \(limit: 1500000\)/)
})

test('rejects a gzip search index over its transfer budget', async () => {
  const result = await runValidator(async (directory) => {
    const chunks = join(directory, 'assets/chunks')
    const searchIndex = (await readdir(chunks)).find((file) => file.startsWith('@localSearchIndex'))
    await appendFile(join(chunks, searchIndex), randomBytes(100_000))
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /gzip search index is \d+ bytes \(limit: 320000\)/)
})

test('rejects an insecure external link', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace(
      'href="https://github.com/ShigeichiroYamasaki/creator-first-platform"',
      'href="http://github.com/ShigeichiroYamasaki/creator-first-platform"'
    )
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /external link must use HTTPS/)
})

test('rejects a loopback demo link', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace(
      'href="https://github.com/ShigeichiroYamasaki/creator-first-platform"',
      'href="http://127.0.0.1:5173/#/register"'
    )
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /external link must use HTTPS: http:\/\/127\.0\.0\.1:5173/)
})

test('rejects an unsafe target=_blank external link', async () => {
  const result = await runValidator((directory) => mutateHome(
    directory,
    (source) => source.replace('target="_blank" rel="noopener"', 'target="_blank"')
  ))

  assert.equal(result.status, 1)
  assert.match(result.stderr, /target=_blank external link lacks noopener or noreferrer/)
})

test('rejects invalid build provenance metadata', async () => {
  const result = await runValidator(async (directory) => {
    await writeFile(join(directory, 'build-info.json'), JSON.stringify({
      schemaVersion: 1,
      repository: 'unexpected/repository',
      commit: 'not-a-commit',
      base: '/wrong-base/'
    }), 'utf8')
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /build-info\.json: metadata is incomplete or inconsistent/)
})
