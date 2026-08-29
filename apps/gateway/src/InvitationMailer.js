import { randomUUID } from 'node:crypto'
import { GmailSmtpTransport } from './GmailSmtpTransport.js'

export class InvitationMailer {
  constructor(config, fetchImplementation = fetch, gmailTransport) {
    this.config = config
    this.fetch = fetchImplementation
    this.gmailTransport = gmailTransport ?? (config.mailMode === 'gmail-smtp'
      ? new GmailSmtpTransport({
          address: config.gmailAddress,
          appPassword: config.gmailAppPassword,
          networkFamily: config.gmailNetworkFamily,
          connectHost: config.gmailConnectHost,
          implicitTlsPort: config.gmailImplicitTlsPort
        })
      : null)
    this.outbox = []
  }

  async sendInvitation(message) {
    const deliveryId = randomUUID()
    const payload = {
      deliveryId,
      template: 'participant-invitation-v1',
      to: message.to,
      subject: 'Creator First Platform 公開実験へのご招待',
      text: `${message.displayName} 様\n\nCreator First Platform公開実験への招待です。\n次の一回限りのURIを開き、MetaMaskで本人登録してください。\n${message.invitationUri}\n\n有効期限: ${message.expiresAt}\nTestnet専用であり、実資産や本番利用資格を付与するものではありません。`
    }
    return this.deliver(payload)
  }

  async deliver(payload) {
    if (this.config.mailMode === 'gmail-smtp') return this.gmailTransport.send(payload)
    if (this.config.mailMode === 'webhook') {
      const response = await this.fetch(this.config.mailWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.mailWebhookToken}`
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) throw new Error(`Invitation mail webhook returned ${response.status}`)
      return { mode: 'webhook', deliveryId: payload.deliveryId }
    }
    this.outbox.push(payload)
    return { mode: 'outbox', deliveryId: payload.deliveryId, preview: payload }
  }

  async sendApplicationVerification(message) {
    const deliveryId = randomUUID()
    return this.deliver({
      deliveryId,
      template: 'participant-application-verification-v1',
      to: message.to,
      subject: 'Creator First Platform 実験参加申請のメール確認',
      text: `${message.displayName} 様\n\n実験参加申請を受け付けました。次の一回限りのリンクを開いてメールアドレスを確認してください。\n${message.verificationUri}\n\n確認後、運営による審査を行います。このメールだけでは参加登録は完了しません。`
    })
  }

  async sendApplicationDecision(message) {
    const deliveryId = randomUUID()
    return this.deliver({
      deliveryId,
      template: 'participant-application-decision-v1',
      to: message.to,
      subject: 'Creator First Platform 実験参加申請の結果',
      text: `${message.displayName} 様\n\n今回の実験参加枠では登録を完了できませんでした。秘密鍵や復旧用の単語列を返信しないでください。募集案内に再申請方法がある場合は、その案内をご確認ください。`
    })
  }
}
