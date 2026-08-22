import { access, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const requiredFiles = [
  'dist/player/index.html',
  'dist/player/manifest.webmanifest',
  'dist/player/player-icon.svg',
  'dist/player/demo-tone.wav'
]
const errors = []

for (const file of requiredFiles) {
  try {
    await access(file)
  } catch {
    errors.push(`missing build artifact: ${file}`)
  }
}

const sourceFiles = [
  'apps/player/src/App.vue',
  'apps/player/src/api/HttpGatewayClient.ts',
  'apps/player/src/api/MockGatewayClient.ts'
]

for (const file of sourceFiles) {
  const source = await readFile(file, 'utf8')
  for (const forbidden of ['NAVIDROME_PASSWORD', '/rest/stream.view', 'Remote-User', 'localStorage.setItem', 'sessionStorage.setItem']) {
    if (source.includes(forbidden)) errors.push(`${file}: forbidden Player boundary ${forbidden}`)
  }
}

try {
  const audio = await stat('dist/player/demo-tone.wav')
  if (audio.size > 500_000) errors.push('demo-tone.wav exceeds the 500 KB fixture budget')
} catch {
  // Reported as a missing artifact above.
}

const index = await readFile('dist/player/index.html', 'utf8').catch(() => '')
if (index && !index.includes('manifest.webmanifest')) errors.push('player build does not link its manifest')

if (errors.length) {
  console.error('Player validation failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Player validation passed: ${requiredFiles.length} build artifact(s), ${sourceFiles.length} boundary source(s).`)
