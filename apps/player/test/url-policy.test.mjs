import assert from 'node:assert/strict'
import test from 'node:test'
import { normalizeGatewayBase, resolveStreamUrl } from '../src/api/url-policy.js'

test('accepts an opaque same-origin Gateway stream URL', () => {
  assert.equal(
    resolveStreamUrl('/v1/streams/session-123', 'https://player.example.test/app/'),
    'https://player.example.test/v1/streams/session-123'
  )
  assert.equal(
    resolveStreamUrl('/api/v1/streams/session-123', 'https://player.example.test/app/'),
    'https://player.example.test/api/v1/streams/session-123'
  )
})

test('accepts the generated mock tone only in mock mode', () => {
  assert.equal(
    resolveStreamUrl('./demo-tone.wav', 'https://player.example.test/demo/', true),
    'https://player.example.test/demo/demo-tone.wav'
  )
  assert.throws(
    () => resolveStreamUrl('./demo-tone.wav', 'https://player.example.test/demo/'),
    /approved Gateway boundary/
  )
})

test('rejects cross-origin, query-token and arbitrary paths', () => {
  assert.throws(
    () => resolveStreamUrl('https://media.example.test/v1/streams/a', 'https://player.example.test/'),
    /same-origin/
  )
  assert.throws(
    () => resolveStreamUrl('/v1/streams/a?token=secret', 'https://player.example.test/'),
    /same-origin/
  )
  assert.throws(
    () => resolveStreamUrl('/rest/stream.view', 'https://player.example.test/'),
    /approved Gateway boundary/
  )
})

test('Gateway base is restricted to a same-origin path', () => {
  assert.equal(normalizeGatewayBase('/api/'), '/api')
  assert.equal(normalizeGatewayBase(undefined), '')
  assert.throws(() => normalizeGatewayBase('https://gateway.example.test'), /same-origin path/)
  assert.throws(() => normalizeGatewayBase('//gateway.example.test'), /same-origin path/)
  assert.throws(() => normalizeGatewayBase('/api?token=secret'), /same-origin path/)
  assert.throws(() => normalizeGatewayBase('/api/../admin'), /same-origin path/)
})
