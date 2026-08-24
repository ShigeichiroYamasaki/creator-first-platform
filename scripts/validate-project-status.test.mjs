import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const validator = fileURLToPath(new URL('./validate-project-status.mjs', import.meta.url))

function statusPage({ adrCount = 2, adrStatus = 'Proposed', protocolCount = 2, protocolStatus = 'Draft 0.1.0', basisDate = '2026-08-19', governanceStatus, governanceEvidence = '二院制ガバナーとデモポリシー' } = {}) {
  const rows = [
    '# 現在の状況',
    '',
    `> **基準日: ${basisDate}**`,
    '',
    '| 対象 | 現在の状態 | 現在確認できるもの | 次の成立条件 |',
    '| --- | --- | --- | --- |',
    `| ADR | ${adrStatus} | ${adrCount}件の設計判断案 | review |`,
    `| Protocol | ${protocolStatus} | Account等の${protocolCount}仕様 | review |`
  ]
  if (governanceStatus) rows.push(`| DAOガバナンス | ${governanceStatus} | ${governanceEvidence} | review |`)
  return rows.join('\n')
}

function adr({ status = 'Proposed', date = '2026-08-19', lastUpdated = date } = {}) {
  const updated = lastUpdated === null ? '' : `**Last Updated:** ${lastUpdated}\n`
  return `# ADR\n\n**Status:** ${status}  \n**Date:** ${date}\n${updated}`
}

function specification({ status = 'Draft', version = '0.1.0', lastUpdated = '2026-08-19' } = {}) {
  return `# Specification\n\n**Status:** ${status}  \n**Version:** ${version}  \n**Last Updated:** ${lastUpdated}\n`
}

async function runValidator({ page = statusPage(), adrs = [adr(), adr()], specifications = [specification(), specification()], deploymentManifest } = {}) {
  const directory = await mkdtemp(join(tmpdir(), 'creator-first-status-'))
  try {
    const files = {
      'docs/status.md': page,
      ...(deploymentManifest ? { 'docs/public/testnet/deployment.json': JSON.stringify(deploymentManifest) } : {}),
      ...Object.fromEntries(adrs.map((source, index) => [`docs/adr/ADR-${String(index + 1).padStart(4, '0')}-test.md`, source])),
      ...Object.fromEntries(specifications.map((source, index) => [`protocol/test/example-${index + 1}-spec.md`, source]))
    }
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

test('accepts a status page that matches ADR and protocol sources', async () => {
  const result = await runValidator()
  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /2 ADR\(s\), 2 protocol specification\(s\)/)
})

test('rejects a stale ADR count', async () => {
  const result = await runValidator({ page: statusPage({ adrCount: 1 }) })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /ADR evidence must report 2件/)
})

test('rejects an ADR status that differs from its sources', async () => {
  const result = await runValidator({ page: statusPage({ adrStatus: 'Accepted' }) })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /ADR status Accepted does not match source statuses Proposed/)
})

test('rejects an ADR without valid Last Updated metadata', async () => {
  const result = await runValidator({ adrs: [adr({ lastUpdated: null }), adr()] })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing or invalid Last Updated metadata/)
})

test('rejects an ADR update that predates its creation date', async () => {
  const result = await runValidator({
    adrs: [adr({ date: '2026-08-19', lastUpdated: '2026-08-18' }), adr()]
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Last Updated 2026-08-18 predates Date 2026-08-19/)
})

test('rejects a stale protocol count', async () => {
  const result = await runValidator({ page: statusPage({ protocolCount: 3 }) })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /Protocol evidence must report 2仕様/)
})

test('rejects mixed protocol versions', async () => {
  const result = await runValidator({ specifications: [specification(), specification({ version: '0.2.0' })] })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /must share one Status and Version/)
})

test('rejects an invalid basis date', async () => {
  const result = await runValidator({ page: statusPage({ basisDate: '2026-02-31' }) })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing or invalid YYYY-MM-DD basis date/)
})

test('rejects a basis date older than an ADR', async () => {
  const result = await runValidator({
    page: statusPage({ basisDate: '2026-08-18' }),
    adrs: [adr({ date: '2026-08-18', lastUpdated: '2026-08-19' }), adr({ date: '2026-08-18' })]
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /basis date 2026-08-18 predates 2026-08-19/)
})

test('rejects a basis date older than a protocol update', async () => {
  const result = await runValidator({
    page: statusPage({ basisDate: '2026-08-18' }),
    specifications: [specification({ lastUpdated: '2026-08-19' }), specification({ lastUpdated: '2026-08-18' })]
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /basis date 2026-08-18 predates 2026-08-19/)
})

test('accepts a deployed governance status when governance contracts are published', async () => {
  const result = await runValidator({
    page: statusPage({ governanceStatus: 'Ethereum Sepoliaへ公開デプロイ済み、運用実証前' }),
    deploymentManifest: { contracts: { governor: '0x1', governedPolicy: '0x2' } }
  })
  assert.equal(result.status, 0, result.stderr)
})

test('rejects a pre-deployment governance status when governance contracts are published', async () => {
  const result = await runValidator({
    page: statusPage({ governanceStatus: 'テストネット実装・公開デプロイ前' }),
    deploymentManifest: { contracts: { governor: '0x1', governedPolicy: '0x2' } }
  })
  assert.equal(result.status, 1)
  assert.match(result.stderr, /must not say 公開デプロイ前/)
})
