#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const SERVICE = 'creator-first-platform-supporter-relayer'
const ACCOUNT = 'creator-first-amoy-demo'

if (process.platform !== 'darwin') {
  throw new Error('This helper stores the test relayer key in macOS Keychain and must run on macOS')
}

function keychain(args) {
  return spawnSync('security', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

let privateKey
const existing = keychain(['find-generic-password', '-s', SERVICE, '-a', ACCOUNT, '-w'])
if (existing.status === 0) {
  privateKey = existing.stdout.trim()
} else {
  privateKey = generatePrivateKey()
  const stored = keychain(['add-generic-password', '-U', '-s', SERVICE, '-a', ACCOUNT, '-w', privateKey])
  if (stored.status !== 0) throw new Error('Could not store the Supporter SBT relayer key in macOS Keychain')
}

console.log(privateKeyToAccount(privateKey).address)
