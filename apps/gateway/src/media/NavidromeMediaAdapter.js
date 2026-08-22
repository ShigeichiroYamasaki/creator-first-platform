import { createHash, randomBytes } from 'node:crypto'
import { Readable } from 'node:stream'

export class NavidromeMediaAdapter {
  constructor({ baseUrl, username, password }) {
    if (!username || !password) throw new Error('Navidrome credentials are required for the navidrome adapter')
    this.baseUrl = new URL(baseUrl)
    if (!['http:', 'https:'].includes(this.baseUrl.protocol) || this.baseUrl.username || this.baseUrl.password) {
      throw new Error('NAVIDROME_INTERNAL_URL must be an approved HTTP(S) origin')
    }
    this.username = username
    this.password = password
  }

  async open(reference, rangeHeader, signal) {
    if (!/^[A-Za-z0-9_-]{1,160}$/.test(reference)) throw new Error('Invalid Navidrome media reference')
    const salt = randomBytes(8).toString('hex')
    const token = createHash('md5').update(`${this.password}${salt}`).digest('hex')
    const url = new URL('/rest/stream.view', this.baseUrl)
    url.search = new URLSearchParams({
      id: reference,
      u: this.username,
      t: token,
      s: salt,
      v: '1.16.1',
      c: 'creator-first-gateway'
    }).toString()
    const response = await fetch(url, {
      headers: rangeHeader ? { Range: rangeHeader } : {},
      redirect: 'error',
      signal
    })
    if (![200, 206].includes(response.status) || !response.body) {
      throw new Error(`Navidrome stream failed with status ${response.status}`)
    }
    const allowedHeaders = {}
    for (const name of ['accept-ranges', 'content-length', 'content-range', 'content-type']) {
      const value = response.headers.get(name)
      if (value) allowedHeaders[name] = value
    }
    return {
      status: response.status,
      headers: allowedHeaders,
      body: Readable.fromWeb(response.body),
      rangeSummary: response.headers.get('content-range') ?? 'full'
    }
  }
}
