#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'

const SERVICE = 'creator-first-platform-governance-relayer'
const ACCOUNT = 'creator-first-amoy-demo'
if (process.platform !== 'darwin') throw new Error('This helper requires macOS Keychain')
const keychain = (args) => spawnSync('security', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
const existing = keychain(['find-generic-password', '-s', SERVICE, '-a', ACCOUNT, '-w'])
const privateKey = existing.status === 0 ? existing.stdout.trim() : generatePrivateKey()
if (existing.status !== 0) {
  const stored = keychain(['add-generic-password', '-U', '-s', SERVICE, '-a', ACCOUNT, '-w', privateKey])
  if (stored.status !== 0) throw new Error('Could not store the governance relayer key in macOS Keychain')
}
console.log(privateKeyToAccount(privateKey).address)
