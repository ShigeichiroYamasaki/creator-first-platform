const DEFAULT_DEMO_PATH = '/creator-first-platform/demo/'

function requiredString(value, field) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Cloud demo runtime ${field} is invalid.`)
  }
  return value
}

export function parseCloudDemoRuntime(value) {
  if (!value || typeof value !== 'object' || value.schemaVersion !== 1 || value.active !== true) {
    throw new Error('Cloud demo runtime is not active.')
  }
  const originUrl = new URL(requiredString(value.origin, 'origin'))
  if (originUrl.protocol !== 'https:' || originUrl.username || originUrl.password || originUrl.pathname !== '/' || originUrl.search || originUrl.hash) {
    throw new Error('Cloud demo runtime origin must be an HTTPS origin.')
  }
  const pathPrefix = requiredString(value.pathPrefix, 'pathPrefix')
  if (!pathPrefix.startsWith('/') || !pathPrefix.endsWith('/') || pathPrefix.includes('..')) {
    throw new Error('Cloud demo runtime pathPrefix is invalid.')
  }
  if (!/^[0-9a-f]{40}$/.test(requiredString(value.sourceCommit, 'sourceCommit'))) {
    throw new Error('Cloud demo runtime sourceCommit is invalid.')
  }
  const adminPath = requiredString(value.adminPath, 'adminPath')
  if (adminPath !== '/creator-first-platform/admin/participant-invitations') {
    throw new Error('Cloud demo runtime adminPath is invalid.')
  }
  return Object.freeze({ origin: originUrl.origin, pathPrefix, adminPath })
}

export function cloudAdminTarget(runtimeValue) {
  const runtime = parseCloudDemoRuntime(runtimeValue)
  return new URL(runtime.adminPath, runtime.origin).href
}

export function cloudDemoTarget(runtimeValue, requestedPath = DEFAULT_DEMO_PATH) {
  const runtime = parseCloudDemoRuntime(runtimeValue)
  const candidate = new URL(requestedPath, runtime.origin)
  if (candidate.origin !== runtime.origin || !candidate.pathname.startsWith(runtime.pathPrefix)) {
    throw new Error('Requested cloud demo path is outside the public experiment.')
  }
  return candidate.href
}

export async function resolveCloudDemoTarget(manifestUrl, requestedPath, fetchImpl = fetch) {
  const response = await fetchImpl(manifestUrl, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new Error(`Cloud demo runtime could not be loaded (HTTP ${response.status}).`)
  return cloudDemoTarget(await response.json(), requestedPath)
}

export async function resolveCloudAdminTarget(manifestUrl, fetchImpl = fetch) {
  const response = await fetchImpl(manifestUrl, { cache: 'no-store', credentials: 'same-origin' })
  if (!response.ok) throw new Error(`Cloud demo runtime could not be loaded (HTTP ${response.status}).`)
  return cloudAdminTarget(await response.json())
}
