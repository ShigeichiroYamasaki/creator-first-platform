import path from 'node:path'
import { fileURLToPath } from 'node:url'

const repositoryRoot = fileURLToPath(new URL('../../..', import.meta.url))

function positiveInteger(value, fallback, name) {
  const parsed = Number(value ?? fallback)
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(`${name} must be a positive integer`)
  return parsed
}

function basePath(value = '/api') {
  if (!value.startsWith('/') || value.startsWith('//') || /[?#]/.test(value)) {
    throw new Error('GATEWAY_BASE_PATH must be a path')
  }
  return value === '/' ? '' : value.replace(/\/$/, '')
}

export function loadConfig(environment = process.env) {
  const adapter = environment.GATEWAY_MEDIA_ADAPTER ?? 'file'
  if (!['file', 'navidrome'].includes(adapter)) {
    throw new Error('GATEWAY_MEDIA_ADAPTER must be file or navidrome')
  }

  const publicUri = environment.GATEWAY_PUBLIC_URI ?? 'http://127.0.0.1:5173'
  const publicUrl = new URL(publicUri)
  const webauthnOrigin = environment.GATEWAY_WEBAUTHN_ORIGIN ?? publicUrl.origin
  const webauthnRpId = environment.GATEWAY_WEBAUTHN_RP_ID ?? publicUrl.hostname
  const mailMode = environment.GATEWAY_MAIL_MODE ?? 'outbox'

  if (!['outbox', 'webhook'].includes(mailMode)) {
    throw new Error('GATEWAY_MAIL_MODE must be outbox or webhook')
  }
  if (mailMode === 'webhook' && (!environment.GATEWAY_MAIL_WEBHOOK_URL || !environment.GATEWAY_MAIL_WEBHOOK_TOKEN)) {
    throw new Error('Webhook mail mode requires GATEWAY_MAIL_WEBHOOK_URL and GATEWAY_MAIL_WEBHOOK_TOKEN')
  }
  if (environment.GATEWAY_ADMIN_TOKEN && environment.GATEWAY_ADMIN_TOKEN.length < 32) {
    throw new Error('GATEWAY_ADMIN_TOKEN must contain at least 32 characters')
  }
  if (mailMode === 'webhook' && new URL(environment.GATEWAY_MAIL_WEBHOOK_URL).protocol !== 'https:') {
    throw new Error('GATEWAY_MAIL_WEBHOOK_URL must use HTTPS')
  }

  if (new URL(webauthnOrigin).origin !== webauthnOrigin) {
    throw new Error('GATEWAY_WEBAUTHN_ORIGIN must be an origin without a path')
  }
  if (webauthnRpId.includes('/') || webauthnRpId.includes(':')) {
    throw new Error('GATEWAY_WEBAUTHN_RP_ID must be a hostname')
  }

  return {
    host: environment.GATEWAY_HOST ?? '127.0.0.1',
    port: positiveInteger(environment.GATEWAY_PORT, 8787, 'GATEWAY_PORT'),
    basePath: basePath(environment.GATEWAY_BASE_PATH),
    allowedOrigin: environment.GATEWAY_ALLOWED_ORIGIN ?? 'http://127.0.0.1:5173',
    publicDomain: environment.GATEWAY_SIWE_DOMAIN ?? '127.0.0.1:5173',
    publicUri,
    chainId: positiveInteger(environment.GATEWAY_CHAIN_ID, 80002, 'GATEWAY_CHAIN_ID'),
    webauthnOrigin,
    webauthnRpId,
    webauthnRpName: environment.GATEWAY_WEBAUTHN_RP_NAME ?? 'Creator First Platform Testnet',
    adminToken: environment.GATEWAY_ADMIN_TOKEN,
    invitationPublicUrl: environment.GATEWAY_INVITATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/participant-registration`,
    applicationPublicUrl: environment.GATEWAY_APPLICATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/test-user-registration`,
    creatorApplicationPublicUrl: environment.GATEWAY_CREATOR_APPLICATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/creator-workspace`,
    mailMode,
    mailWebhookUrl: environment.GATEWAY_MAIL_WEBHOOK_URL,
    mailWebhookToken: environment.GATEWAY_MAIL_WEBHOOK_TOKEN,
    trustBindingTtlMs: positiveInteger(
      environment.GATEWAY_TRUST_BINDING_TTL_MS,
      10 * 60_000,
      'GATEWAY_TRUST_BINDING_TTL_MS'
    ),
    playbackTtlMs: positiveInteger(environment.GATEWAY_PLAYBACK_TTL_MS, 300_000, 'GATEWAY_PLAYBACK_TTL_MS'),
    monthlyByteLimit: positiveInteger(
      environment.GATEWAY_MONTHLY_BYTE_LIMIT,
      800 * 1024 * 1024,
      'GATEWAY_MONTHLY_BYTE_LIMIT'
    ),
    databasePath: environment.GATEWAY_DATABASE_PATH ?? path.join(repositoryRoot, '.local/gateway.sqlite'),
    adapter,
    mediaRoot: environment.GATEWAY_MEDIA_ROOT ?? path.join(repositoryRoot, 'docker/navidrome/music'),
    navidromeUrl: environment.NAVIDROME_INTERNAL_URL ?? 'http://127.0.0.1:4533',
    navidromeUsername: environment.NAVIDROME_USERNAME,
    navidromePassword: environment.NAVIDROME_PASSWORD,
    navidromeMediaIds: Object.fromEntries(
      Object.entries(environment).filter(([name, value]) => name.startsWith('NAVIDROME_MEDIA_ID_') && value)
    )
  }
}
