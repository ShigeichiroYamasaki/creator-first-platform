import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { verifyDeployment } from './verify-deployment.mjs'

const commit = '0123456789abcdef0123456789abcdef01234567'

function fixtureResponse(pathname, origin, servedCommit = commit) {
  const base = `${origin}/creator-first-platform/`
  const fixtures = {
    '/creator-first-platform/': '<html><body>Creator First Platform <a href="/creator-first-platform/status">Status</a></body></html>',
    '/creator-first-platform/status': '<html><body>Status</body></html>',
    '/creator-first-platform/protocol/': '<html><body>Protocol</body></html>',
    '/creator-first-platform/sitemap.xml': `<urlset><url><loc>${base}status</loc></url><url><loc>${base}protocol/</loc></url></urlset>`,
    '/creator-first-platform/build-info.json': JSON.stringify({
      schemaVersion: 1,
      repository: 'shigeichiroyamasaki/creator-first-platform',
      commit: servedCommit,
      base: '/creator-first-platform/'
    })
  }
  return fixtures[pathname]
}

async function withServer(handler, run) {
  const server = createServer(handler)
  await new Promise((resolveListen) => server.listen(0, '127.0.0.1', resolveListen))
  const { port } = server.address()

  try {
    return await run(`http://127.0.0.1:${port}/creator-first-platform/`)
  } finally {
    await new Promise((resolveClose, rejectClose) => server.close((error) => error ? rejectClose(error) : resolveClose()))
  }
}

function handler({ servedCommit = commit, failFirst = false } = {}) {
  let requestCount = 0
  return (request, response) => {
    requestCount += 1
    if (failFirst && requestCount === 1) {
      response.writeHead(503).end('not ready')
      return
    }

    const source = fixtureResponse(request.url, `http://${request.headers.host}`, servedCommit)
    if (source === undefined) {
      response.writeHead(404).end('missing')
      return
    }
    response.writeHead(200, { 'content-type': request.url.endsWith('.json') ? 'application/json' : 'text/html' }).end(source)
  }
}

test('accepts published pages and matching build provenance', async () => {
  await withServer(handler(), async (baseUrl) => {
    const result = await verifyDeployment({ baseUrl, expectedSha: commit, attempts: 1 })
    assert.equal(result.commit, commit)
    assert.equal(result.attemptsUsed, 1)
  })
})

test('rejects a published commit that does not match the deployment', async () => {
  await withServer(handler({ servedCommit: 'f'.repeat(40) }), async (baseUrl) => {
    await assert.rejects(
      verifyDeployment({ baseUrl, expectedSha: commit, attempts: 1 }),
      /published commit f{40} does not match expected/
    )
  })
})

test('retries a transient publication delay', async () => {
  await withServer(handler({ failFirst: true }), async (baseUrl) => {
    const result = await verifyDeployment({
      baseUrl,
      expectedSha: commit,
      attempts: 2,
      retryDelayMs: 1
    })
    assert.equal(result.attemptsUsed, 2)
  })
})
