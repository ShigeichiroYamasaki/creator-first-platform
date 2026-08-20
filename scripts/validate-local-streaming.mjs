import { readFile } from 'node:fs/promises'
import { parse } from 'yaml'

export const composePath = new URL('../docker/navidrome/compose.yml', import.meta.url)

export function validateLocalStreaming(compose) {
  const errors = []
  const service = compose?.services?.navidrome
  const dataInit = compose?.services?.['navidrome-data-init']

  if (!service) return ['compose.yml must define services.navidrome']
  if (!/^deluan\/navidrome:\d+\.\d+\.\d+$/.test(service.image ?? '')) {
    errors.push('Navidrome image must use a fixed numeric version tag')
  }
  if (!service.user || service.user === '0:0') {
    errors.push('Navidrome must run as a non-root user')
  }
  if (!service.ports?.includes('127.0.0.1:${NAVIDROME_PORT:-4533}:4533')) {
    errors.push('Navidrome must publish port 4533 on host loopback only')
  }
  if (!service.volumes?.includes('./music:/music:ro')) {
    errors.push('The local music library must be mounted read-only')
  }

  for (const option of [
    'ND_ENABLEDOWNLOADS',
    'ND_ENABLESHARING',
    'ND_ENABLEEXTERNALSERVICES',
    'ND_ENABLEINSIGHTSCOLLECTOR'
  ]) {
    if (String(service.environment?.[option]) !== 'false') {
      errors.push(`${option} must be false in the local demo`)
    }
  }

  if (!service.cap_drop?.includes('ALL')) {
    errors.push('Navidrome must drop all Linux capabilities')
  }
  if (!service.security_opt?.includes('no-new-privileges:true')) {
    errors.push('Navidrome must enable no-new-privileges')
  }
  if (compose?.networks?.media?.driver !== 'bridge') {
    errors.push('The local media network must use the explicit bridge driver')
  }
  if (!service.healthcheck) {
    errors.push('Navidrome must define a healthcheck')
  }
  if (!dataInit || dataInit.user !== '0:0' || dataInit.network_mode !== 'none') {
    errors.push('A network-isolated root init service must prepare the named data volume')
  }
  if (dataInit?.entrypoint?.join(' ') !== 'chown -R') {
    errors.push('The data init service must use direct chown execution without a shell')
  }
  if (service.depends_on?.['navidrome-data-init']?.condition !== 'service_completed_successfully') {
    errors.push('Navidrome must wait for successful data volume initialization')
  }

  return errors
}

async function main() {
  const compose = parse(await readFile(composePath, 'utf8'))
  const errors = validateLocalStreaming(compose)
  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`)
    process.exitCode = 1
    return
  }

  console.log(`Local streaming validation passed: ${compose.services.navidrome.image}`)
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  await main()
}
