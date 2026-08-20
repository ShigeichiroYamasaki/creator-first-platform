const baseUrl = process.env.STREAMING_URL ?? 'http://127.0.0.1:4533'
const controller = new AbortController()
const timeout = setTimeout(() => controller.abort(), 5_000)

try {
  const response = await fetch(baseUrl, {
    redirect: 'follow',
    signal: controller.signal
  })
  const body = await response.text()

  if (!response.ok) {
    throw new Error(`Navidrome returned HTTP ${response.status}`)
  }

  if (!/navidrome/i.test(body)) {
    throw new Error('Response does not identify the Navidrome web application')
  }

  console.log(`Local Navidrome verification passed: ${response.url} (${response.status})`)
} catch (error) {
  console.error(`Local Navidrome verification failed for ${baseUrl}: ${error.message}`)
  console.error('Start it with: npm run streaming:up')
  process.exitCode = 1
} finally {
  clearTimeout(timeout)
}
