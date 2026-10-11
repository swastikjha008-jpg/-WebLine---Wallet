import { formatUnits } from 'viem'

export const shortAddress = (a: string, head = 6, tail = 4) => (a.length > head + tail + 2 ? `${a.slice(0, head)}…${a.slice(-tail)}` : a)

/** Formats a wei value as a trimmed ETH string (max `digits` decimals). */
export function formatEth(value: bigint, decimals = 18, digits = 5): string {
  const full = formatUnits(value, decimals)
  const [whole = '0', frac = ''] = full.split('.')
  const f = frac.slice(0, digits).replace(/0+$/, '')
  const w = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return f ? `${w}.${f}` : w
}
