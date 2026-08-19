import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

const requiredRoutes = ['', 'status', 'protocol/', 'sitemap.xml', 'build-info.json']

function option(name) {
  const index = process.argv.indexOf(name)
  return index === -1 ? undefined : process.argv[index + 1]
}

function wait(milliseconds) {
  return new Promise((resolveWait) => setTimeout(resolveWait, milliseconds))
}

async function responseText(url, fetchImpl) {
  const response = await fetchImpl(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(10_000),
    headers: { 'cache-control': 'no-cache' }
  })
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`)
  return response.text()
}

async function verifyOnce(baseUrl, expectedSha, fetchImpl) {
  const pages = new Map()

  for (const route of requiredRoutes) {
    const url = new URL(route, baseUrl).href
    pages.set(route, await responseText(url, fetchImpl))
  }

  const home = pages.get('')
  if (!home.includes('Creator First Platform') || !home.includes('/creator-first-platform/status')) {
    throw new Error('published home page is missing required content or navigation')
  }

  const sitemap = pages.get('sitemap.xml')
  for (const route of ['status', 'protocol/']) {
    const expectedUrl = new URL(route, baseUrl).href
    if (!sitemap.includes(`<loc>${expectedUrl}</loc>`)) {
      throw new Error(`published sitemap is missing ${expectedUrl}`)
    }
  }

  let buildInfo
  try {
    buildInfo = JSON.parse(pages.get('build-info.json'))
  } catch {
    throw new Error('published build-info.json is not valid JSON')
  }
  if (buildInfo.commit !== expectedSha) {
    throw new Error(`published commit ${buildInfo.commit ?? '(missing)'} does not match expected ${expectedSha}`)
  }
  if (
    buildInfo.schemaVersion !== 1 ||
    buildInfo.repository !== 'shigeichiroyamasaki/creator-first-platform' ||
    buildInfo.base !== '/creator-first-platform/'
  ) {
    throw new Error('published build-info.json metadata is incomplete or inconsistent')
  }
}

export async function verifyDeployment({
  baseUrl,
  expectedSha,
  attempts = 6,
  retryDelayMs = 3_000,
  fetchImpl = fetch
}) {
  if (!baseUrl) throw new Error('baseUrl is required')
  if (!/^[0-9a-f]{40}$/.test(expectedSha ?? '')) {
    throw new Error('expectedSha must be a 40-character lowercase hexadecimal commit SHA')
  }
  if (!Number.isInteger(attempts) || attempts < 1) throw new Error('attempts must be a positive integer')

  const normalizedBaseUrl = new URL(baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  let lastError

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      await verifyOnce(normalizedBaseUrl, expectedSha, fetchImpl)
      return { baseUrl: normalizedBaseUrl.href, commit: expectedSha, attemptsUsed: attempt }
    } catch (error) {
      lastError = error
      if (attempt < attempts) await wait(retryDelayMs)
    }
  }

  throw new Error(`deployment verification failed after ${attempts} attempt(s): ${lastError.message}`)
}

const isCommandLine = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isCommandLine) {
  try {
    const result = await verifyDeployment({
      baseUrl: option('--base-url'),
      expectedSha: option('--expected-sha')
    })
    console.log(`Deployment verification passed: ${result.baseUrl} serves commit ${result.commit} (${result.attemptsUsed} attempt(s)).`)
  } catch (error) {
    console.error(`Deployment verification failed:\n- ${error.message}`)
    process.exit(1)
  }
}
