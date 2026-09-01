import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { privateKeyToAccount } from 'viem/accounts'
import { keccak256, stringToHex, zeroAddress, zeroHash } from 'viem'
import { loadConfig } from '../src/config.js'
import { InvitationMailer } from '../src/InvitationMailer.js'
import { FileMediaAdapter } from '../src/media/FileMediaAdapter.js'
import { NavidromeMediaAdapter } from '../src/media/NavidromeMediaAdapter.js'
import { parseSingleRange } from '../src/media/range.js'
import { createGatewayServer } from '../src/server.js'

const TEST_PRIVATE_KEY = `0x${'0123456789abcdef'.repeat(4)}`
const TEST_SUPPORTER_SBT = '0x4444444444444444444444444444444444444444'
const TEST_SUPPORTER_CREATOR_ID = keccak256(stringToHex('creator:synthetic-demo-artist'))
const TEST_SUPPORTER_CONSENT_VERSION = keccak256(stringToHex('supporter-demo-consent-v1'))

class FakeParticipantEnrollmentChain {
  constructor() {
    this.calls = []
    this.record = {
      wallet: zeroAddress,
      approvedRoles: 0,
      active: false,
      initialFundingCompleted: false,
      registeredParticipantId: zeroHash,
      balance: 0n
    }
  }

  async status() {
    return { ...this.record }
  }

  async approve(value) {
    this.calls.push(['approve', value])
    this.record = {
      ...this.record,
      wallet: value.wallet,
      approvedRoles: value.roles,
      active: true,
      registeredParticipantId: value.participantId
    }
    return { transactionHash: `0x${'11'.repeat(32)}`, blockNumber: 101n }
  }

  async fund(value) {
    this.calls.push(['fund', value])
    this.record.initialFundingCompleted = true
    this.record.balance = 20_000_000_000_000_000n
    return { transactionHash: `0x${'22'.repeat(32)}`, blockNumber: 102n, amount: this.record.balance }
  }
}

class FakeSupporterSbtChain {
  constructor() {
    this.calls = []
    this.record = { registered: true, nonce: 0n, tokenId: 0n, tier: 0 }
  }

  async status() {
    return { ...this.record }
  }

  async ready() {
    return true
  }

  async relay(value) {
    this.calls.push(value)
    this.record = { ...this.record, nonce: value.nonce + 1n, tokenId: 17n, tier: 1 }
    return {
      ...this.record,
      transactionHash: `0x${'33'.repeat(32)}`,
      blockNumber: 103n
    }
  }
}

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

test('Gateway relays a participant-bound Supporter SBT without spending the holder wallet gas', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname
  })
  const chain = new FakeSupporterSbtChain()
  const gateway = createGatewayServer({
    config,
    mediaAdapter: new FileMediaAdapter(config.mediaRoot),
    supporterRelayOptions: {
      chain,
      supporterSbtAddress: TEST_SUPPORTER_SBT,
      allowedCreatorIds: [TEST_SUPPORTER_CREATOR_ID]
    }
  })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const api = client(`http://127.0.0.1:${address.port}${config.basePath}`)
  const account = privateKeyToAccount(TEST_PRIVATE_KEY)
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)
  const typedData = {
    domain: {
      name: 'Creator First Supporter SBT',
      version: '1',
      chainId: 80002,
      verifyingContract: TEST_SUPPORTER_SBT
    },
    types: {
      SupportIntent: [
        { name: 'creatorId', type: 'bytes32' },
        { name: 'holder', type: 'address' },
        { name: 'nonce', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'consentVersion', type: 'bytes32' }
      ]
    },
    primaryType: 'SupportIntent',
    message: {
      creatorId: TEST_SUPPORTER_CREATOR_ID,
      holder: account.address,
      nonce: 0n,
      deadline,
      consentVersion: TEST_SUPPORTER_CONSENT_VERSION
    }
  }
  const signature = await account.signTypedData(typedData)
  const body = {
    holder: account.address,
    creatorId: TEST_SUPPORTER_CREATOR_ID,
    nonce: '0',
    deadline: deadline.toString(),
    consentVersion: TEST_SUPPORTER_CONSENT_VERSION,
    signature,
    idempotencyKey: 'relay-support-1'
  }
  const relayed = await json(await api.request('/v1/testnet/supporter-registrations', {
    method: 'POST', body: JSON.stringify(body)
  }))
  assert.equal(relayed.response.status, 200)
  assert.equal(relayed.body.status, 'SBT_ACTIVE')
  assert.equal(relayed.body.holder, account.address)
  assert.equal(relayed.body.tokenId, '17')
  assert.equal(relayed.body.transactionHash, `0x${'33'.repeat(32)}`)
  assert.equal(chain.calls.length, 1)

  const replayed = await json(await api.request('/v1/testnet/supporter-registrations', {
    method: 'POST', body: JSON.stringify(body)
  }))
  assert.equal(replayed.response.status, 200)
  assert.deepEqual(replayed.body, relayed.body)
  assert.equal(chain.calls.length, 1)
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
  const protectedBeforeRegistration = await json(await first.request('/v1/playback-sessions', {
    method: 'POST',
    body: JSON.stringify({ trackId: 'track-mock-002', idempotencyKey: 'test-user-authz-before' })
  }))
  assert.equal(protectedBeforeRegistration.response.status, 403)
  assert.equal(protectedBeforeRegistration.body.code, 'SUPPORTER_REQUIRED')
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

  const protectedAfterRegistration = await json(await first.request('/v1/playback-sessions', {
    method: 'POST',
    body: JSON.stringify({ trackId: 'track-mock-002', idempotencyKey: 'test-user-authz-after' })
  }))
  assert.equal(protectedAfterRegistration.response.status, 403)
  assert.equal(protectedAfterRegistration.body.code, 'SUPPORTER_REQUIRED')

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

test('Administrator issues a wallet-agnostic invitation and the invited person claims it with SIWE', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname,
    GATEWAY_ADMIN_TOKEN: 'test-admin-token-with-sufficient-entropy',
    GATEWAY_INVITATION_PUBLIC_URL: 'https://example.test/demo/participant-registration'
  })
  const gateway = createGatewayServer({ config, mediaAdapter: new FileMediaAdapter(config.mediaRoot) })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const api = client(`http://127.0.0.1:${address.port}${config.basePath}`)
  const adminHeaders = { Authorization: 'Bearer test-admin-token-with-sufficient-entropy' }

  const unauthorized = await api.request('/v1/admin/participant-invitations')
  assert.equal(unauthorized.status, 401)
  const created = await json(await api.request('/v1/admin/participant-invitations', {
    method: 'POST',
    headers: adminHeaders,
    body: JSON.stringify({ email: 'participant@example.test', displayName: 'Demo Participant', roles: 3, expiresInHours: 24 })
  }))
  assert.equal(created.response.status, 201)
  assert.match(created.body.invitationUri, /^https:\/\/example\.test\/demo\/participant-registration#invite=/)
  assert.equal(created.body.roles, 3)

  const inspected = await json(await api.request(`/v1/participant-invitations/${created.body.token}`))
  assert.equal(inspected.response.status, 200)
  assert.equal(inspected.body.displayName, 'Demo Participant')
  assert.equal('email' in inspected.body, false)
  assert.equal('token' in inspected.body, false)

  const sent = await json(await api.request(`/v1/admin/participant-invitations/${created.body.invitationId}/send`, {
    method: 'POST', headers: adminHeaders, body: JSON.stringify({ token: created.body.token })
  }))
  assert.equal(sent.response.status, 200)
  assert.equal(sent.body.delivery.mode, 'outbox')
  assert.equal(gateway.invitationMailer.outbox.length, 1)

  const account = privateKeyToAccount(TEST_PRIVATE_KEY)
  const genericChallenge = await json(await api.request('/v1/auth/siwe/nonce', {
    method: 'POST', body: JSON.stringify({ address: account.address, chainId: config.chainId })
  }))
  const genericSignature = await account.signMessage({ message: genericChallenge.body.message })
  assert.equal((await api.request('/v1/auth/siwe/verify', {
    method: 'POST', body: JSON.stringify({ challengeId: genericChallenge.body.challengeId, message: genericChallenge.body.message, signature: genericSignature })
  })).status, 200)
  const unsignedClaim = await json(await api.request(`/v1/participant-invitations/${created.body.token}/claim`, {
    method: 'POST', body: JSON.stringify({ acceptedTerms: true, acknowledgedTestOnly: true })
  }))
  assert.equal(unsignedClaim.response.status, 401)
  assert.equal(unsignedClaim.body.code, 'INVITATION_SIGNATURE_REQUIRED')

  const challenge = await json(await api.request('/v1/auth/siwe/nonce', {
    method: 'POST',
    body: JSON.stringify({
      address: account.address,
      chainId: config.chainId,
      invitationToken: created.body.token,
      acceptedTerms: true,
      acknowledgedTestOnly: true
    })
  }))
  assert.match(challenge.body.message, new RegExp(`urn:cfp:participant-invitation:${created.body.invitationId}`))
  assert.match(challenge.body.message, /urn:cfp:participant-roles:3/)
  assert.match(challenge.body.message, /urn:cfp:consent:participant-experiment-v1/)
  const signature = await account.signMessage({ message: challenge.body.message })
  assert.equal((await api.request('/v1/auth/siwe/verify', {
    method: 'POST', body: JSON.stringify({ challengeId: challenge.body.challengeId, message: challenge.body.message, signature })
  })).status, 200)
  const claimed = await json(await api.request(`/v1/participant-invitations/${created.body.token}/claim`, {
    method: 'POST', body: JSON.stringify({ acceptedTerms: true, acknowledgedTestOnly: true })
  }))
  assert.equal(claimed.response.status, 200)
  assert.equal(claimed.body.state, 'CLAIMED')
  assert.equal('claimedWallet' in claimed.body, false)

  const replay = await json(await api.request(`/v1/participant-invitations/${created.body.token}/claim`, {
    method: 'POST', body: JSON.stringify({ acceptedTerms: true, acknowledgedTestOnly: true })
  }))
  assert.equal(replay.response.status, 200)
  assert.equal(replay.body.state, 'CLAIMED')
})

test('Participant applies, verifies email, receives approval invitation and claims it with a chosen wallet', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname,
    GATEWAY_ADMIN_TOKEN: 'test-admin-token-with-sufficient-entropy',
    GATEWAY_INVITATION_PUBLIC_URL: 'https://example.test/demo/participant-registration',
    GATEWAY_APPLICATION_STATUS_PUBLIC_URL: 'https://example.test/demo/participant-application-status'
  })
  const enrollmentChain = new FakeParticipantEnrollmentChain()
  const gateway = createGatewayServer({
    config,
    mediaAdapter: new FileMediaAdapter(config.mediaRoot),
    participantEnrollmentOptions: { chain: enrollmentChain }
  })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const api = client(`http://127.0.0.1:${address.port}${config.basePath}`)
  const adminHeaders = { Authorization: 'Bearer test-admin-token-with-sufficient-entropy' }

  assert.deepEqual((await json(await api.request('/v1/participant-applications/current'))).body, { application: null })
  const application = await json(await api.request('/v1/participant-applications', {
    method: 'POST',
    body: JSON.stringify({
      email: 'listener@example.test',
      displayName: 'Demo Listener',
      roles: 1,
      acceptedPrivacyNotice: true,
      acknowledgedTestOnly: true
    })
  }))
  assert.equal(application.response.status, 201)
  assert.equal(application.body.state, 'EMAIL_VERIFICATION_REQUIRED')
  assert.equal(application.body.emailHint, 'l***@example.test')
  assert.equal('email' in application.body, false)
  assert.equal(gateway.invitationMailer.outbox.length, 1)
  assert.match(gateway.invitationMailer.outbox[0].text, /https:\/\/example\.test\/demo\/participant-application-status#verify-application=/)
  const repeated = await json(await api.request('/v1/participant-applications', {
    method: 'POST',
    body: JSON.stringify({
      email: 'listener@example.test', displayName: 'Demo Listener', roles: 1,
      acceptedPrivacyNotice: true, acknowledgedTestOnly: true
    })
  }))
  assert.equal(repeated.response.status, 201)
  assert.equal(repeated.body.applicationId, application.body.applicationId)
  assert.equal(gateway.invitationMailer.outbox.length, 1)
  const verificationToken = gateway.invitationMailer.outbox[0].text.match(/#verify-application=([A-Za-z0-9_-]+)/)?.[1]
  assert.ok(verificationToken)

  const verified = await json(await api.request(`/v1/participant-applications/verify/${verificationToken}`, { method: 'POST' }))
  assert.equal(verified.response.status, 200)
  assert.equal(verified.body.state, 'UNDER_REVIEW')
  const listed = await json(await api.request('/v1/admin/participant-applications', { headers: adminHeaders }))
  assert.equal(listed.response.status, 200)
  assert.equal(listed.body.applications[0].email, 'listener@example.test')

  const approved = await json(await api.request(`/v1/admin/participant-applications/${application.body.applicationId}/approve`, {
    method: 'POST', headers: adminHeaders
  }))
  assert.equal(approved.response.status, 200)
  assert.equal(approved.body.state, 'APPROVED_INVITATION_SENT')
  assert.equal(gateway.invitationMailer.outbox.length, 2)
  const invitationToken = gateway.invitationMailer.outbox[1].text.match(/#invite=([A-Za-z0-9_-]+)/)?.[1]
  assert.ok(invitationToken)

  const account = privateKeyToAccount(TEST_PRIVATE_KEY)
  const challenge = await json(await api.request('/v1/auth/siwe/nonce', {
    method: 'POST',
    body: JSON.stringify({
      address: account.address,
      chainId: config.chainId,
      invitationToken,
      acceptedTerms: true,
      acknowledgedTestOnly: true
    })
  }))
  const signature = await account.signMessage({ message: challenge.body.message })
  assert.equal((await api.request('/v1/auth/siwe/verify', {
    method: 'POST', body: JSON.stringify({ challengeId: challenge.body.challengeId, message: challenge.body.message, signature })
  })).status, 200)
  const claimed = await json(await api.request(`/v1/participant-invitations/${invitationToken}/claim`, {
    method: 'POST', body: JSON.stringify({ acceptedTerms: true, acknowledgedTestOnly: true })
  }))
  assert.equal(claimed.body.state, 'CLAIMED')
  assert.equal(claimed.body.enrollment.state, 'READY_AFTER_WALLET_CLAIM')
  const current = await json(await api.request('/v1/participant-applications/current'))
  assert.equal(current.body.application.state, 'INVITATION_CLAIMED')

  const invitationList = await json(await api.request('/v1/admin/participant-invitations', { headers: adminHeaders }))
  const claimedInvitation = invitationList.body.invitations.find((item) => item.state === 'CLAIMED')
  assert.ok(claimedInvitation)
  const enrolled = await json(await api.request(`/v1/admin/participant-invitations/${claimedInvitation.invitationId}/enrollment`, {
    method: 'POST', headers: adminHeaders
  }))
  assert.equal(enrolled.response.status, 200)
  assert.equal(enrolled.body.state, 'FUNDED')
  assert.equal(enrolled.body.initialFundingAmountAtomic, '20000000000000000')
  assert.equal(enrollmentChain.calls[0][0], 'approve')
  assert.equal(enrollmentChain.calls[1][0], 'fund')
  assert.equal(enrollmentChain.calls[0][1].wallet, account.address)

  const replayedEnrollment = await json(await api.request(`/v1/admin/participant-invitations/${claimedInvitation.invitationId}/enrollment`, {
    method: 'POST', headers: adminHeaders
  }))
  assert.equal(replayedEnrollment.body.state, 'FUNDED')
  assert.equal(enrollmentChain.calls.length, 2)
  const finalInvitation = await json(await api.request(`/v1/participant-invitations/${invitationToken}`))
  assert.equal(finalInvitation.body.enrollment.state, 'FUNDED')
})

test('Gmail SMTP mode sends application mail through the configured account without exposing its app password', async () => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname,
    GATEWAY_MAIL_MODE: 'gmail-smtp',
    GATEWAY_GMAIL_ADDRESS: '11rou.yamasaki@gmail.com',
    GATEWAY_GMAIL_APP_PASSWORD: 'abcd efgh ijkl mnop'
  })
  const calls = []
  const mailer = new InvitationMailer(config, fetch, {
    async send(payload) {
      calls.push(payload)
      return { mode: 'gmail-smtp', deliveryId: payload.deliveryId }
    }
  })
  const delivery = await mailer.sendApplicationVerification({
    applicationId: 'application-test-1',
    to: 'applicant@example.test',
    displayName: 'Demo Listener',
    verificationUri: 'https://example.test/demo#verify-application=test-token'
  })
  assert.equal(delivery.mode, 'gmail-smtp')
  assert.equal(calls.length, 1)
  assert.equal(calls[0].to, 'applicant@example.test')
  assert.equal(calls[0].text.includes('test-token'), true)
  assert.equal(JSON.stringify(calls).includes(config.gmailAppPassword), false)
})

test('Gateway reads administrator and Gmail credentials from mounted secret files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'creator-first-gateway-secrets-'))
  try {
    const adminTokenFile = join(directory, 'admin-token')
    const gmailPasswordFile = join(directory, 'gmail-app-password')
    const participantOperatorKeyFile = join(directory, 'participant-operator-private-key')
    const supporterRelayerKeyFile = join(directory, 'supporter-relayer-private-key')
    writeFileSync(adminTokenFile, `${'a'.repeat(64)}\n`, { mode: 0o600 })
    writeFileSync(gmailPasswordFile, 'abcd efgh ijkl mnop\n', { mode: 0o600 })
    writeFileSync(participantOperatorKeyFile, `${TEST_PRIVATE_KEY}\n`, { mode: 0o600 })
    writeFileSync(supporterRelayerKeyFile, `${TEST_PRIVATE_KEY}\n`, { mode: 0o600 })
    const config = loadConfig({
      GATEWAY_MAIL_MODE: 'gmail-smtp',
      GATEWAY_GMAIL_ADDRESS: '11rou.yamasaki@gmail.com',
      GATEWAY_GMAIL_APP_PASSWORD_FILE: gmailPasswordFile,
      GATEWAY_GMAIL_NETWORK_FAMILY: '4',
      GATEWAY_GMAIL_CONNECT_HOST: '172.31.0.1',
      GATEWAY_GMAIL_IMPLICIT_TLS_PORT: '1465',
      GATEWAY_ADMIN_TOKEN_FILE: adminTokenFile,
      GATEWAY_PARTICIPANT_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
      GATEWAY_PARTICIPANT_OPERATOR_PRIVATE_KEY_FILE: participantOperatorKeyFile,
      GATEWAY_SUPPORTER_SBT_ADDRESS: TEST_SUPPORTER_SBT,
      GATEWAY_SUPPORTER_RELAYER_PRIVATE_KEY_FILE: supporterRelayerKeyFile,
      GATEWAY_SUPPORTER_CREATOR_IDS: TEST_SUPPORTER_CREATOR_ID
    })
    assert.equal(config.gmailAppPassword, 'abcdefghijklmnop')
    assert.equal(config.adminToken, 'a'.repeat(64))
    assert.equal(config.gmailNetworkFamily, 4)
    assert.equal(config.gmailConnectHost, '172.31.0.1')
    assert.equal(config.gmailImplicitTlsPort, 1465)
    assert.equal(config.participantRegistryAddress, '0x1111111111111111111111111111111111111111')
    assert.equal(config.participantOperatorPrivateKey, TEST_PRIVATE_KEY)
    assert.equal(config.supporterSbtAddress, TEST_SUPPORTER_SBT)
    assert.equal(config.supporterRelayerPrivateKey, TEST_PRIVATE_KEY)
    assert.deepEqual(config.supporterCreatorIds, [TEST_SUPPORTER_CREATOR_ID])
    assert.deepEqual(config.amoyRpcUrls, [
      'https://polygon-amoy.drpc.org',
      'https://polygon-amoy-bor-rpc.publicnode.com'
    ])
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
})

test('Gateway accepts ordered credential-free Amoy RPC fallbacks', () => {
  const config = loadConfig({
    GATEWAY_PARTICIPANT_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
    GATEWAY_PARTICIPANT_OPERATOR_PRIVATE_KEY: TEST_PRIVATE_KEY,
    GATEWAY_AMOY_RPC_URLS: 'https://first.example.test, https://second.example.test'
  })
  assert.deepEqual(config.amoyRpcUrls, ['https://first.example.test', 'https://second.example.test'])
  assert.throws(() => loadConfig({
    GATEWAY_PARTICIPANT_REGISTRY_ADDRESS: '0x1111111111111111111111111111111111111111',
    GATEWAY_PARTICIPANT_OPERATOR_PRIVATE_KEY: TEST_PRIVATE_KEY,
    GATEWAY_AMOY_RPC_URLS: 'https://user:secret@example.test'
  }), /credential-free HTTPS URLs/)
  assert.throws(() => loadConfig({
    GATEWAY_SUPPORTER_SBT_ADDRESS: TEST_SUPPORTER_SBT
  }), /Supporter relay requires/)
})

test('Account Trust binds Mock JPKI, a server-verified passkey and an Amoy wallet in one transaction', async (context) => {
  const config = loadConfig({
    GATEWAY_PORT: '8787',
    GATEWAY_DATABASE_PATH: ':memory:',
    GATEWAY_MEDIA_ROOT: new URL('../../../docker/navidrome/music', import.meta.url).pathname,
    GATEWAY_CHAIN_ID: '80002',
    GATEWAY_WEBAUTHN_RP_ID: '127.0.0.1',
    GATEWAY_WEBAUTHN_ORIGIN: 'http://127.0.0.1:5173'
  })
  const calls = []
  const webauthn = {
    async generateRegistrationOptions(options) {
      calls.push(['registration-options', options])
      return { challenge: 'registration-challenge', rp: { id: options.rpID, name: options.rpName } }
    },
    async verifyRegistrationResponse(options) {
      calls.push(['registration-verify', options])
      assert.equal(options.expectedChallenge, 'registration-challenge')
      assert.equal(options.expectedOrigin, config.webauthnOrigin)
      assert.equal(options.expectedRPID, config.webauthnRpId)
      return {
        verified: true,
        registrationInfo: {
          credential: {
            id: 'credential-demo-1',
            publicKey: new Uint8Array([1, 2, 3, 4]),
            counter: 0,
            transports: ['internal']
          },
          credentialDeviceType: 'multiDevice',
          credentialBackedUp: true,
          userVerified: true
        }
      }
    },
    async generateAuthenticationOptions(options) {
      calls.push(['authentication-options', options])
      return { challenge: 'authentication-challenge', rpId: options.rpID }
    },
    async verifyAuthenticationResponse(options) {
      calls.push(['authentication-verify', options])
      assert.equal(options.expectedChallenge, 'authentication-challenge')
      assert.equal(options.credential.id, 'credential-demo-1')
      return { verified: true, authenticationInfo: { newCounter: 1 } }
    }
  }
  const gateway = createGatewayServer({
    config,
    mediaAdapter: new FileMediaAdapter(config.mediaRoot),
    accountTrustOptions: { webauthn }
  })
  const address = await gateway.listen(0)
  context.after(() => gateway.close())
  const api = client(`http://127.0.0.1:${address.port}${config.basePath}`)
  const wallet = privateKeyToAccount(TEST_PRIVATE_KEY)
  const otherWallet = privateKeyToAccount(`0x${'abcdef0123456789'.repeat(4)}`)

  await api.request('/v1/demo/users', {
    method: 'POST',
    body: JSON.stringify({
      displayName: 'Trust Demo User',
      termsVersion: 'demo-terms-v1',
      privacyNoticeVersion: 'demo-privacy-v1',
      acceptedTerms: true,
      acceptedPrivacyNotice: true,
      acknowledgedTestOnly: true,
      idempotencyKey: 'trust-demo-user-1'
    })
  })
  const begun = await json(await api.request('/v1/account-trust/bindings', { method: 'POST' }))
  assert.equal(begun.response.status, 201)
  assert.equal(begun.body.state, 'CREATED')
  assert.equal(begun.body.mockJpki.mode, 'MOCK_JPKI_TEST_ONLY')

  const badCsrf = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/mock-jpki`, {
    method: 'POST',
    body: JSON.stringify({
      csrfToken: 'wrong-token',
      challenge: begun.body.mockJpki.challenge,
      acknowledgedTestOnly: true,
      consentToBinding: true
    })
  }))
  assert.equal(badCsrf.response.status, 403)
  assert.equal(badCsrf.body.code, 'TRUST_CSRF_INVALID')

  const jpki = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/mock-jpki`, {
    method: 'POST',
    body: JSON.stringify({
      csrfToken: begun.body.csrfToken,
      challenge: begun.body.mockJpki.challenge,
      acknowledgedTestOnly: true,
      consentToBinding: true
    })
  }))
  assert.equal(jpki.body.state, 'JPKI_ASSERTED')
  const replayedJpki = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/mock-jpki`, {
    method: 'POST',
    body: JSON.stringify({
      csrfToken: begun.body.csrfToken,
      challenge: begun.body.mockJpki.challenge,
      acknowledgedTestOnly: true,
      consentToBinding: true
    })
  }))
  assert.equal(replayedJpki.response.status, 409)
  assert.equal(replayedJpki.body.code, 'TRUST_BINDING_STATE_INVALID')

  const registrationOptions = await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/passkeys/registration/options`, {
    method: 'POST', body: JSON.stringify({ csrfToken: begun.body.csrfToken })
  })
  assert.equal(registrationOptions.status, 200)
  const registered = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/passkeys/registration/verify`, {
    method: 'POST',
    body: JSON.stringify({ csrfToken: begun.body.csrfToken, response: { id: 'credential-demo-1', response: {} } })
  }))
  assert.equal(registered.body.state, 'PASSKEY_REGISTERED')

  const unsupportedChain = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/wallet/options`, {
    method: 'POST',
    body: JSON.stringify({ csrfToken: begun.body.csrfToken, walletAddress: wallet.address, chainId: 1 })
  }))
  assert.equal(unsupportedChain.response.status, 400)
  assert.equal(unsupportedChain.body.code, 'CHAIN_NOT_ALLOWED')

  const walletOptions = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/wallet/options`, {
    method: 'POST',
    body: JSON.stringify({ csrfToken: begun.body.csrfToken, walletAddress: wallet.address, chainId: 80002 })
  }))
  assert.equal(walletOptions.body.disclosure.paymentAuthorizationIncluded, false)
  const wrongSignature = await otherWallet.signTypedData(walletOptions.body.typedData)
  const rejectedWallet = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/wallet/verify`, {
    method: 'POST', body: JSON.stringify({ csrfToken: begun.body.csrfToken, signature: wrongSignature })
  }))
  assert.equal(rejectedWallet.response.status, 401)
  assert.equal(rejectedWallet.body.code, 'WALLET_BINDING_SIGNER_MISMATCH')

  const signature = await wallet.signTypedData(walletOptions.body.typedData)
  const activated = await json(await api.request(`/v1/account-trust/bindings/${begun.body.bindingId}/wallet/verify`, {
    method: 'POST', body: JSON.stringify({ csrfToken: begun.body.csrfToken, signature })
  }))
  assert.equal(activated.body.state, 'ACTIVE')
  assert.equal(activated.body.chainId, 80002)
  assert.equal(activated.body.walletAddress, wallet.address)

  const status = await json(await api.request('/v1/account-trust/status'))
  assert.equal(status.body.binding.state, 'ACTIVE')
  assert.equal(status.body.binding.passkeyRegistered, true)
  assert.equal(status.body.mode, 'MOCK_JPKI_TEST_ONLY')
  assert.deepEqual(
    gateway.store.trustAuditEvents(begun.body.bindingId).map((event) => event.event_type),
    ['CREATED', 'JPKI_ASSERTED', 'PASSKEY_REGISTERED', 'WALLET_BOUND', 'ACTIVE']
  )

  await api.request('/v1/account-trust/passkeys/authentication/options', { method: 'POST' })
  const authenticated = await json(await api.request('/v1/account-trust/passkeys/authentication/verify', {
    method: 'POST', body: JSON.stringify({ response: { id: 'credential-demo-1', response: {} } })
  }))
  assert.equal(authenticated.body.authenticated, true)
  assert.equal(
    gateway.store.database.prepare('SELECT counter FROM webauthn_credentials WHERE credential_id = ?').get('credential-demo-1').counter,
    1
  )
  assert.equal(calls.some(([name]) => name === 'registration-verify'), true)
  assert.equal(calls.some(([name]) => name === 'authentication-verify'), true)
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
