import { useEnsAvatar, useEnsName } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { normalize } from 'viem/ens'
import type { Address } from 'viem'

export function safeNormalize(name: string): string | undefined {
  try { return normalize(name) } catch { return undefined }
}

/** ENS always resolves on mainnet, whichever network the wallet UI is showing. */
export function useEnsProfile(address: Address | undefined) {
  const { data: name } = useEnsName({ address, chainId: mainnet.id, query: { enabled: !!address } })
  const normalized = name ? safeNormalize(name) : undefined
  const { data: avatar } = useEnsAvatar({ name: normalized, chainId: mainnet.id, query: { enabled: !!normalized } })
  return { name: name ?? undefined, avatar: avatar ?? undefined }
}
