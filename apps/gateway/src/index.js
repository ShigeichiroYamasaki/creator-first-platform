import { loadConfig } from './config.js'
import { FileMediaAdapter } from './media/FileMediaAdapter.js'
import { NavidromeMediaAdapter } from './media/NavidromeMediaAdapter.js'
import { createGatewayServer } from './server.js'

const config = loadConfig()
const mediaAdapter = config.adapter === 'navidrome'
  ? new NavidromeMediaAdapter({
      baseUrl: config.navidromeUrl,
      username: config.navidromeUsername,
      password: config.navidromePassword
    })
  : new FileMediaAdapter(config.mediaRoot)

const gateway = createGatewayServer({ config, mediaAdapter })
const address = await gateway.listen()
console.log(`Creator First Gateway listening on http://${address.address}:${address.port}${config.basePath}`)
console.log(`Media adapter: ${config.adapter}; local demo only`)

async function shutdown() {
  await gateway.close()
  process.exit(0)
}

process.once('SIGINT', shutdown)
process.once('SIGTERM', shutdown)
