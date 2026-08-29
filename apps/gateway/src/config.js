import path from 'node:path'
import { readFileSync } from 'node:fs'
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

function secret(environment, valueName, fileName) {
  if (environment[valueName]) return environment[valueName]
  const secretPath = environment[fileName]
  return secretPath ? readFileSync(secretPath, 'utf8').trim() : undefined
}

export function loadConfig(environment = process.env) {
  const runtimeMode = environment.GATEWAY_RUNTIME_MODE ?? 'local-demo'
  if (!['local-demo', 'public-experiment'].includes(runtimeMode)) {
    throw new Error('GATEWAY_RUNTIME_MODE must be local-demo or public-experiment')
  }
  const adapter = environment.GATEWAY_MEDIA_ADAPTER ?? 'file'
  if (!['file', 'navidrome'].includes(adapter)) {
    throw new Error('GATEWAY_MEDIA_ADAPTER must be file or navidrome')
  }

  const publicUri = environment.GATEWAY_PUBLIC_URI ?? 'http://127.0.0.1:5173'
  const publicUrl = new URL(publicUri)
  const webauthnOrigin = environment.GATEWAY_WEBAUTHN_ORIGIN ?? publicUrl.origin
  const webauthnRpId = environment.GATEWAY_WEBAUTHN_RP_ID ?? publicUrl.hostname
  const mailMode = environment.GATEWAY_MAIL_MODE ?? 'outbox'

  if (!['outbox', 'webhook', 'gmail-smtp'].includes(mailMode)) {
    throw new Error('GATEWAY_MAIL_MODE must be outbox, webhook or gmail-smtp')
  }
  if (mailMode === 'webhook' && (!environment.GATEWAY_MAIL_WEBHOOK_URL || !environment.GATEWAY_MAIL_WEBHOOK_TOKEN)) {
    throw new Error('Webhook mail mode requires GATEWAY_MAIL_WEBHOOK_URL and GATEWAY_MAIL_WEBHOOK_TOKEN')
  }
  const adminToken = secret(environment, 'GATEWAY_ADMIN_TOKEN', 'GATEWAY_ADMIN_TOKEN_FILE')
  if (adminToken && adminToken.length < 32) {
    throw new Error('GATEWAY_ADMIN_TOKEN must contain at least 32 characters')
  }
  if (mailMode === 'webhook' && new URL(environment.GATEWAY_MAIL_WEBHOOK_URL).protocol !== 'https:') {
    throw new Error('GATEWAY_MAIL_WEBHOOK_URL must use HTTPS')
  }
  const gmailAddress = environment.GATEWAY_GMAIL_ADDRESS?.trim().toLowerCase()
  const gmailAppPassword = secret(
    environment,
    'GATEWAY_GMAIL_APP_PASSWORD',
    'GATEWAY_GMAIL_APP_PASSWORD_FILE'
  )?.replace(/\s/g, '')
  if (mailMode === 'gmail-smtp' && (!gmailAddress || !gmailAppPassword)) {
    throw new Error('Gmail SMTP mode requires GATEWAY_GMAIL_ADDRESS and GATEWAY_GMAIL_APP_PASSWORD')
  }
  if (mailMode === 'gmail-smtp' && (!/^[^\s@]+@gmail\.com$/.test(gmailAddress) || gmailAppPassword.length < 16)) {
    throw new Error('Gmail SMTP mode requires a Gmail address and a dedicated app password')
  }
  const gmailNetworkFamily = Number(environment.GATEWAY_GMAIL_NETWORK_FAMILY ?? 0)
  if (![0, 4, 6].includes(gmailNetworkFamily)) {
    throw new Error('GATEWAY_GMAIL_NETWORK_FAMILY must be 0, 4 or 6')
  }
  const gmailConnectHost = environment.GATEWAY_GMAIL_CONNECT_HOST ?? 'smtp.gmail.com'
  if (!/^[A-Za-z0-9.-]+$/.test(gmailConnectHost)) {
    throw new Error('GATEWAY_GMAIL_CONNECT_HOST must be a hostname or IPv4 address')
  }
  const gmailImplicitTlsPort = positiveInteger(
    environment.GATEWAY_GMAIL_IMPLICIT_TLS_PORT,
    465,
    'GATEWAY_GMAIL_IMPLICIT_TLS_PORT'
  )

  if (new URL(webauthnOrigin).origin !== webauthnOrigin) {
    throw new Error('GATEWAY_WEBAUTHN_ORIGIN must be an origin without a path')
  }
  if (webauthnRpId.includes('/') || webauthnRpId.includes(':')) {
    throw new Error('GATEWAY_WEBAUTHN_RP_ID must be a hostname')
  }

  return {
    runtimeMode,
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
    adminToken,
    invitationPublicUrl: environment.GATEWAY_INVITATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/participant-registration`,
    applicationPublicUrl: environment.GATEWAY_APPLICATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/test-user-registration`,
    creatorApplicationPublicUrl: environment.GATEWAY_CREATOR_APPLICATION_PUBLIC_URL ?? `${publicUrl.origin}/creator-first-platform/demo/creator-workspace`,
    mailMode,
    mailWebhookUrl: environment.GATEWAY_MAIL_WEBHOOK_URL,
    mailWebhookToken: environment.GATEWAY_MAIL_WEBHOOK_TOKEN,
    gmailAddress,
    gmailAppPassword,
    gmailNetworkFamily,
    gmailConnectHost,
    gmailImplicitTlsPort,
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
