import { createConfig, http } from 'wagmi'
import { mainnet, sepolia } from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const SUPPORTED_CHAINS = [mainnet, sepolia] as const
export type SupportedChainId = (typeof SUPPORTED_CHAINS)[number]['id']

const clean = (v: string | undefined) => (v && v.trim().length > 0 ? v.trim() : undefined)

/**
 * Wallets are discovered through EIP-6963 (MetaMask, Rabby, Coinbase Wallet, ...) with a generic
 * injected fallback. No keys or seed phrases ever touch this app: signing happens in the wallet.
 */
export const wagmiConfig = createConfig({
  chains: SUPPORTED_CHAINS,
  connectors: [injected()],
  multiInjectedProviderDiscovery: true,
  transports: {
    [mainnet.id]: http(clean(import.meta.env.VITE_MAINNET_RPC_URL)),
    [sepolia.id]: http(clean(import.meta.env.VITE_SEPOLIA_RPC_URL)),
  },
})

declare module 'wagmi' {
  interface Register {
    config: typeof wagmiConfig
  }
}
