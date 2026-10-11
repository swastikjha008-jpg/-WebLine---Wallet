import { useAccount, useChainId } from 'wagmi'
import { SUPPORTED_CHAINS } from '../config/wagmi'

/** Resolves the chain the UI acts on, and whether the connected wallet is on an unsupported one. */
export function useActiveChain() {
  const { chain, chainId: walletChainId, isConnected } = useAccount()
  const configChainId = useChainId()
  const unsupported = isConnected && walletChainId !== undefined && !chain
  const chainId = chain?.id ?? configChainId
  const active = SUPPORTED_CHAINS.find((c) => c.id === chainId) ?? SUPPORTED_CHAINS[0]
  return { chain: active, chainId: active.id, unsupported, walletChainId }
}
