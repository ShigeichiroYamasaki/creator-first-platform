import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'
import { parse } from 'yaml'
import { composePath, validateLocalStreaming } from './validate-local-streaming.mjs'

const validCompose = parse(await readFile(composePath, 'utf8'))

test('accepts the repository local Navidrome configuration', () => {
  assert.deepEqual(validateLocalStreaming(validCompose), [])
})

test('rejects an unpinned image and externally exposed port', () => {
  const compose = structuredClone(validCompose)
  compose.services.navidrome.image = 'deluan/navidrome:latest'
  compose.services.navidrome.ports = ['4533:4533']

  assert.deepEqual(validateLocalStreaming(compose), [
    'Navidrome image must use a fixed numeric version tag',
    'Navidrome must publish port 4533 on host loopback only'
  ])
})

test('rejects writable music and public sharing controls', () => {
  const compose = structuredClone(validCompose)
  compose.services.navidrome.volumes = ['./music:/music']
  compose.services.navidrome.environment.ND_ENABLESHARING = 'true'

  assert.deepEqual(validateLocalStreaming(compose), [
    'The local music library must be mounted read-only',
    'ND_ENABLESHARING must be false in the local demo'
  ])
})
