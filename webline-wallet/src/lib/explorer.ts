import type { Chain } from 'viem'

const base = (chain?: Chain) => chain?.blockExplorers?.default.url
export const addressUrl = (chain: Chain | undefined, address: string) => (base(chain) ? `${base(chain)}/address/${address}` : undefined)
export const txUrl = (chain: Chain | undefined, hash: string) => (base(chain) ? `${base(chain)}/tx/${hash}` : undefined)
