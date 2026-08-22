/**
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeGatewayBase(value) {
  if (!value) return ''
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('://') ||
    value.includes('?') ||
    value.includes('#') ||
    value.split('/').includes('..')
  ) {
    throw new Error('Gateway base must be a same-origin path')
  }
  return value.replace(/\/$/, '')
}

/**
 * Resolve a server-issued stream path without permitting an arbitrary upstream.
 * @param {string} value
 * @param {string} locationHref
 * @param {boolean} allowMockAudio
 * @returns {string}
 */
export function resolveStreamUrl(value, locationHref, allowMockAudio = false) {
  const page = new URL(locationHref)
  const url = new URL(value, page)
  if (url.origin !== page.origin || url.username || url.password || url.hash || url.search) {
    throw new Error('Stream URL must be an opaque same-origin path')
  }
  const isGatewayStream = /(?:^|\/)v1\/streams\/[^/]+$/.test(url.pathname)
  const isMockStream = allowMockAudio && url.pathname.endsWith('/demo-tone.wav')
  if (!isGatewayStream && !isMockStream) {
    throw new Error('Stream URL is outside the approved Gateway boundary')
  }
  return url.href
}
