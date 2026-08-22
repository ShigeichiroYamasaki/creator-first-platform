import type { TypedData } from '../api/types'

interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] | Record<string, unknown> }): Promise<unknown>
  on?(event: 'accountsChanged' | 'chainChanged', listener: (value: unknown) => void): void
  removeListener?(event: 'accountsChanged' | 'chainChanged', listener: (value: unknown) => void): void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

export interface WalletConnection {
  address: string
  chainId: number
}

export class Eip1193WalletAdapter {
  private readonly provider: Eip1193Provider

  constructor(provider = window.ethereum) {
    if (!provider) throw new Error('EIP-1193 Walletが見つかりません')
    this.provider = provider
  }

  async connect(): Promise<WalletConnection> {
    const accounts = await this.provider.request({ method: 'eth_requestAccounts' }) as string[]
    const chainId = await this.provider.request({ method: 'eth_chainId' }) as string
    if (!accounts[0]) throw new Error('Wallet Accountを取得できません')
    return { address: accounts[0], chainId: Number.parseInt(chainId, 16) }
  }

  async switchChain(chainId: number): Promise<void> {
    await this.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }]
    })
  }

  async signMessage(address: string, message: string): Promise<string> {
    return this.provider.request({ method: 'personal_sign', params: [message, address] }) as Promise<string>
  }

  async signTypedData(address: string, typedData: TypedData): Promise<string> {
    return this.provider.request({
      method: 'eth_signTypedData_v4',
      params: [address, JSON.stringify(typedData)]
    }) as Promise<string>
  }
}
