import { randomUUID } from 'node:crypto'
import { connect as connectTcp } from 'node:net'
import { connect } from 'node:tls'

function singleLine(value, name) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n]/.test(value)) {
    throw new Error(`${name} must be a non-empty single line`)
  }
  return value.trim()
}

function mailbox(value, name) {
  const email = singleLine(value, name).toLowerCase()
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) throw new Error(`${name} must be an email address`)
  return email
}

function encodedHeader(value) {
  return `=?UTF-8?B?${Buffer.from(singleLine(value, 'subject'), 'utf8').toString('base64')}?=`
}

function smtpMessage(payload, from) {
  const to = mailbox(payload.to, 'recipient')
  const normalizedText = String(payload.text ?? '').replace(/\r?\n/g, '\r\n')
  const body = normalizedText.split('\r\n').map((line) => line.startsWith('.') ? `.${line}` : line).join('\r\n')
  return [
    `From: Creator First Platform <${from}>`,
    `To: <${to}>`,
    `Subject: ${encodedHeader(payload.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${randomUUID()}@creator-first-platform.local>`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'Auto-Submitted: auto-generated',
    '',
    body
  ].join('\r\n')
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket
    this.buffer = ''
    this.lines = []
    this.waiters = []
    socket.setEncoding('utf8')
    this.onData = (chunk) => {
      this.buffer += chunk
      let boundary
      while ((boundary = this.buffer.indexOf('\r\n')) >= 0) {
        this.lines.push(this.buffer.slice(0, boundary))
        this.buffer = this.buffer.slice(boundary + 2)
      }
      this.flush()
    }
    this.onError = (error) => this.rejectAll(error)
    this.onTimeout = () => this.rejectAll(new Error('Gmail SMTP connection timed out'))
    this.onClose = () => this.rejectAll(new Error('Gmail SMTP connection closed unexpectedly'))
    socket.on('data', this.onData)
    socket.on('error', this.onError)
    socket.on('timeout', this.onTimeout)
    socket.on('close', this.onClose)
  }

  flush() {
    while (this.waiters.length && this.lines.length) this.waiters.shift().resolve(this.lines.shift())
  }

  rejectAll(error) {
    while (this.waiters.length) this.waiters.shift().reject(error)
  }

  line() {
    if (this.lines.length) return Promise.resolve(this.lines.shift())
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }))
  }

  async reply(expectedCodes) {
    let code
    let line
    do {
      line = await this.line()
      const match = /^(\d{3})([ -])/.exec(line)
      if (!match) throw new Error('Gmail SMTP returned an invalid response')
      code ??= Number(match[1])
      if (Number(match[1]) !== code) throw new Error('Gmail SMTP returned inconsistent response codes')
    } while (line[3] === '-')
    if (!expectedCodes.includes(code)) throw new Error(`Gmail SMTP rejected the operation with code ${code}`)
    return code
  }

  async command(command, expectedCodes) {
    this.socket.write(`${command}\r\n`)
    return this.reply(expectedCodes)
  }

  detach() {
    this.socket.off('data', this.onData)
    this.socket.off('error', this.onError)
    this.socket.off('timeout', this.onTimeout)
    this.socket.off('close', this.onClose)
  }
}

function secure(socket, timeoutMs) {
  socket.setTimeout(timeoutMs)
  return new Promise((resolve, reject) => {
    socket.once('secureConnect', () => resolve(socket))
    socket.once('error', reject)
    socket.once('timeout', () => reject(new Error('Gmail SMTP connection timed out')))
  })
}

export class GmailSmtpTransport {
  constructor({
    address,
    appPassword,
    timeoutMs = 15_000,
    networkFamily = 0,
    connectHost = 'smtp.gmail.com',
    implicitTlsPort = 465
  }) {
    this.address = mailbox(address, 'Gmail address')
    this.appPassword = singleLine(appPassword, 'Gmail app password').replace(/\s/g, '')
    this.timeoutMs = timeoutMs
    this.networkFamily = networkFamily
    this.connectHost = connectHost
    this.implicitTlsPort = implicitTlsPort
  }

  async send(payload) {
    try {
      return await this.sendImplicitTls(payload)
    } catch (error) {
      if (/rejected the operation/.test(error.message)) throw error
      return this.sendStartTls(payload)
    }
  }

  async authenticateAndSend(socket, session, payload) {
    await session.command('EHLO creator-first-platform', [250])
    const auth = Buffer.from(`\0${this.address}\0${this.appPassword}`, 'utf8').toString('base64')
    await session.command(`AUTH PLAIN ${auth}`, [235])
    await session.command(`MAIL FROM:<${this.address}>`, [250])
    await session.command(`RCPT TO:<${mailbox(payload.to, 'recipient')}>`, [250, 251])
    await session.command('DATA', [354])
    socket.write(`${smtpMessage(payload, this.address)}\r\n.\r\n`)
    await session.reply([250])
    await session.command('QUIT', [221])
    return { mode: 'gmail-smtp', deliveryId: payload.deliveryId }
  }

  async sendImplicitTls(payload) {
    const socket = connect({
      host: this.connectHost, port: this.implicitTlsPort, servername: 'smtp.gmail.com', rejectUnauthorized: true,
      ...(this.networkFamily ? { family: this.networkFamily } : {})
    })
    socket.setTimeout(this.timeoutMs)
    const session = new SmtpSession(socket)
    try {
      await session.reply([220])
      return await this.authenticateAndSend(socket, session, payload)
    } finally {
      socket.destroy()
    }
  }

  async sendStartTls(payload) {
    const plainSocket = connectTcp({
      host: 'smtp.gmail.com', port: 587,
      ...(this.networkFamily ? { family: this.networkFamily } : {})
    })
    plainSocket.setTimeout(this.timeoutMs)
    const plainSession = new SmtpSession(plainSocket)
    let tlsSocket
    try {
      await plainSession.reply([220])
      await plainSession.command('EHLO creator-first-platform', [250])
      await plainSession.command('STARTTLS', [220])
      plainSession.detach()
      tlsSocket = connect({ socket: plainSocket, servername: 'smtp.gmail.com', rejectUnauthorized: true })
      await secure(tlsSocket, this.timeoutMs)
      const tlsSession = new SmtpSession(tlsSocket)
      return await this.authenticateAndSend(tlsSocket, tlsSession, payload)
    } finally {
      ;(tlsSocket ?? plainSocket).destroy()
    }
  }
}
