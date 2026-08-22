import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { privateKeyToAccount } from 'viem/accounts'
import { loadConfig } from '../src/config.js'
import { FileMediaAdapter } from '../src/media/FileMediaAdapter.js'
import { NavidromeMediaAdapter } from '../src/media/NavidromeMediaAdapter.js'
import { parseSingleRange } from '../src/media/range.js'
import { createGatewayServer } from '../src/server.js'

const TEST_PRIVATE_KEY = `0x${'0123456789abcdef'.repeat(4)}`

function client(baseUrl) {
  let cookie = ''
  return {
    cookie: () => cookie,
    async request(path, init = {}) {
      const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
          ...init.headers
        }
      })
      const setCookie = response.headers.get('set-cookie')
      if (setCookie) cookie = setCookie.split(';', 1)[0]
      return response
    }
  }
}

async function json(response) {
  const body = await response.json()
  return { response, body }
}

test('Gateway authorizes bounded playback, streams Range bytes and enforces owner binding', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname,
    GATEWAY_PLAYBACK_TTL_MS: '300000'
  })
  const gateway = createGatewayServer({ config, mediaAdapter: new FileMediaAdapter(config.mediaRoot) })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const baseUrl = `http://127.0.0.1:${address.port}${config.basePath}`
  const first = client(baseUrl)
  const second = client(baseUrl)

  const catalogResponse = await json(await first.request('/v1/catalog/home'))
  assert.equal(catalogResponse.response.status, 200)
  assert.equal(catalogResponse.body.tracks.length, 3)
  assert.equal('fileRef' in catalogResponse.body.tracks[0], false)

  const denied = await json(await first.request('/v1/playback-sessions', {
    method: 'POST',
    body: JSON.stringify({ trackId: 'track-mock-002', idempotencyKey: 'deny-key-1' })
  }))
  assert.equal(denied.response.status, 403)
  assert.equal(denied.body.code, 'SUPPORTER_REQUIRED')

  const request = { trackId: 'track-mock-001', idempotencyKey: 'play-key-1' }
  const created = await json(await first.request('/v1/playback-sessions', {
    method: 'POST', body: JSON.stringify(request)
  }))
  assert.equal(created.response.status, 201)
  assert.match(created.body.streamUrl, /^\/api\/v1\/streams\//)
  const replayed = await json(await first.request('/v1/playback-sessions', {
    method: 'POST', body: JSON.stringify(request)
  }))
  assert.equal(replayed.response.status, 200)
  assert.deepEqual(replayed.body, created.body)

  await second.request('/v1/catalog/home')
  const stolen = await second.request(created.body.streamUrl.slice(config.basePath.length), {
    headers: { Range: 'bytes=0-99', 'Remote-User': 'forged-admin' }
  })
  assert.equal(stolen.status, 404)

  const streamed = await first.request(created.body.streamUrl.slice(config.basePath.length), {
    headers: { Range: 'bytes=0-99', 'Remote-User': 'forged-admin' }
  })
  assert.equal(streamed.status, 206)
  assert.equal(streamed.headers.get('content-range')?.startsWith('bytes 0-99/'), true)
  assert.equal((await streamed.arrayBuffer()).byteLength, 100)
  assert.equal(gateway.store.evidenceForSession(created.body.playbackSessionId)[0].bytes_delivered, 100)

  const closed = await first.request(`/v1/playback-sessions/${created.body.playbackSessionId}`, { method: 'DELETE' })
  assert.equal(closed.status, 204)
  const afterClose = await first.request(created.body.streamUrl.slice(config.basePath.length))
  assert.equal(afterClose.status, 410)
})

test('Gateway verifies SIWE and EIP-712 before activating demo Supporter capability', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname
  })
  const gateway = createGatewayServer({ config, mediaAdapter: new FileMediaAdapter(config.mediaRoot) })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const api = client(`http://127.0.0.1:${address.port}${config.basePath}`)
  const account = privateKeyToAccount(TEST_PRIVATE_KEY)
  await api.request('/v1/catalog/home')

  const challenge = await json(await api.request('/v1/auth/siwe/nonce', {
    method: 'POST', body: JSON.stringify({ address: account.address, chainId: config.chainId })
  }))
  const messageSignature = await account.signMessage({ message: challenge.body.message })
  const verified = await json(await api.request('/v1/auth/siwe/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeId: challenge.body.challengeId,
      message: challenge.body.message,
      signature: messageSignature
    })
  }))
  assert.equal(verified.response.status, 200)
  assert.equal(verified.body.authenticated, true)

  const intent = await json(await api.request('/v1/artists/artist-ao/support', {
    method: 'POST',
    body: JSON.stringify({ address: account.address, consentVersion: 1, idempotencyKey: 'support-key-1' })
  }))
  assert.equal(intent.response.status, 201)
  assert.equal(intent.body.disclosure.paymentAuthorizationIncluded, false)
  const replayedIntent = await json(await api.request('/v1/artists/artist-ao/support', {
    method: 'POST',
    body: JSON.stringify({ address: account.address, consentVersion: 1, idempotencyKey: 'support-key-1' })
  }))
  assert.equal(replayedIntent.response.status, 200)
  assert.equal(replayedIntent.body.requestId, intent.body.requestId)
  const typedData = {
    ...intent.body.typedData,
    message: {
      ...intent.body.typedData.message,
      deadline: BigInt(intent.body.typedData.message.deadline)
    }
  }
  const supportSignature = await account.signTypedData(typedData)
  const submitted = await json(await api.request(`/v1/support-intents/${intent.body.requestId}/submit`, {
    method: 'POST', body: JSON.stringify({ signature: supportSignature })
  }))
  assert.equal(submitted.response.status, 202)
  assert.equal(submitted.body.status, 'CONFIRMING')

  await new Promise((resolve) => setTimeout(resolve, 650))
  const registration = await json(await api.request(`/v1/support-registrations/${intent.body.requestId}`))
  assert.equal(registration.body.status, 'SBT_ACTIVE')
  assert.equal(registration.body.tier, 'EARLY_SUPPORTER')
  const capability = await json(await api.request('/v1/artists/artist-ao/community-capability'))
  assert.equal(capability.body.allowed, true)

  const protectedPlayback = await api.request('/v1/playback-sessions', {
    method: 'POST',
    body: JSON.stringify({ trackId: 'track-mock-002', idempotencyKey: 'protected-key-1' })
  })
  assert.equal(protectedPlayback.status, 201)
  const protectedBody = await protectedPlayback.json()
  await api.request(`/v1/playback-sessions/${protectedBody.playbackSessionId}`, { method: 'DELETE' })

  const otherArtist = await json(await api.request('/v1/playback-sessions', {
    method: 'POST',
    body: JSON.stringify({ trackId: 'track-mock-003', idempotencyKey: 'other-artist-key-1' })
  }))
  assert.equal(otherArtist.response.status, 403)
  assert.equal(otherArtist.body.code, 'EARLY_SUPPORTER_REQUIRED')
})

test('Test User registration is private, idempotent and bound to one demo session', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname
  })
  const gateway = createGatewayServer({ config, mediaAdapter: new FileMediaAdapter(config.mediaRoot) })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const baseUrl = `http://127.0.0.1:${address.port}${config.basePath}`
  const first = client(baseUrl)
  const second = client(baseUrl)

  const initial = await json(await first.request('/v1/demo/user'))
  assert.deepEqual(initial.body, { registered: false })
  const invalid = await json(await first.request('/v1/demo/users', {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'person@example.test',
      termsVersion: 'demo-terms-v1',
      privacyNoticeVersion: 'demo-privacy-v1',
      acceptedTerms: true,
      acceptedPrivacyNotice: true,
      acknowledgedTestOnly: true,
      idempotencyKey: 'register-key-invalid'
    })
  }))
  assert.equal(invalid.response.status, 400)
  assert.equal(invalid.body.code, 'INVALID_TEST_ALIAS')

  const registrationRequest = {
    displayName: 'Demo Listener 01',
    termsVersion: 'demo-terms-v1',
    privacyNoticeVersion: 'demo-privacy-v1',
    acceptedTerms: true,
    acceptedPrivacyNotice: true,
    acknowledgedTestOnly: true,
    idempotencyKey: 'register-key-0001'
  }
  const created = await json(await first.request('/v1/demo/users', {
    method: 'POST', body: JSON.stringify(registrationRequest)
  }))
  assert.equal(created.response.status, 201)
  assert.equal(created.body.registered, true)
  assert.equal(created.body.state, 'TEST_ONLY')
  assert.equal(created.body.displayName, 'Demo Listener 01')
  assert.notEqual(created.body.testUserId, created.body.displayName)
  assert.equal(gateway.store.demoUserRegistrationCount(), 1)

  const replayed = await json(await first.request('/v1/demo/users', {
    method: 'POST', body: JSON.stringify(registrationRequest)
  }))
  assert.equal(replayed.response.status, 200)
  assert.equal(replayed.body.testUserId, created.body.testUserId)
  assert.equal(gateway.store.demoUserRegistrationCount(), 1)

  const conflicting = await json(await first.request('/v1/demo/users', {
    method: 'POST',
    body: JSON.stringify({ ...registrationRequest, displayName: 'Another Alias' })
  }))
  assert.equal(conflicting.response.status, 409)
  assert.equal(conflicting.body.code, 'TEST_USER_ALREADY_REGISTERED')

  const unrelated = await json(await second.request('/v1/demo/user'))
  assert.deepEqual(unrelated.body, { registered: false })
})

test('single Range parser rejects multi-range and out-of-bounds input', () => {
  assert.deepEqual(parseSingleRange(undefined, 100), { start: 0, end: 99, partial: false })
  assert.deepEqual(parseSingleRange('bytes=20-29', 100), { start: 20, end: 29, partial: true })
  assert.deepEqual(parseSingleRange('bytes=-10', 100), { start: 90, end: 99, partial: true })
  assert.throws(() => parseSingleRange('bytes=0-1,4-5', 100), RangeError)
  assert.throws(() => parseSingleRange('bytes=100-120', 100), RangeError)
})

test('Navidrome adapter selects only its configured origin and approved media identifier', async (context) => {
  let received
  const upstream = createServer((request, response) => {
    received = { url: request.url, headers: request.headers }
    response.writeHead(206, {
      'Content-Type': 'audio/wav',
      'Content-Length': '4',
      'Content-Range': 'bytes 0-3/4',
      'Accept-Ranges': 'bytes',
      'Set-Cookie': 'must-not-leak=true'
    })
    response.end(Buffer.from([1, 2, 3, 4]))
  })
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve))
  context.after(() => new Promise((resolve) => upstream.close(resolve)))
  const address = upstream.address()
  const adapter = new NavidromeMediaAdapter({
    baseUrl: `http://127.0.0.1:${address.port}`,
    username: 'gateway-user',
    password: 'test-password'
  })
  const delivery = await adapter.open('approved_media_1', 'bytes=0-3')
  const chunks = []
  for await (const chunk of delivery.body) chunks.push(chunk)
  assert.equal(Buffer.concat(chunks).length, 4)
  assert.equal(delivery.status, 206)
  assert.equal('set-cookie' in delivery.headers, false)
  const url = new URL(received.url, 'http://navidrome.internal')
  assert.equal(url.pathname, '/rest/stream.view')
  assert.equal(url.searchParams.get('id'), 'approved_media_1')
  assert.equal(url.searchParams.has('p'), false)
  assert.equal(received.headers.range, 'bytes=0-3')
  assert.equal(received.headers['remote-user'], undefined)
  await assert.rejects(() => adapter.open('https://attacker.invalid/file', undefined), /Invalid Navidrome/)
})
