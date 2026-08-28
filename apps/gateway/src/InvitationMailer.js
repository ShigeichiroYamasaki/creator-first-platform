import { randomUUID } from 'node:crypto'

export class InvitationMailer {
  constructor(config, fetchImplementation = fetch) {
    this.config = config
    this.fetch = fetchImplementation
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
      return { mode: 'webhook', deliveryId }
    }
    this.outbox.push(payload)
    return { mode: 'outbox', deliveryId, preview: payload }
  }
}
