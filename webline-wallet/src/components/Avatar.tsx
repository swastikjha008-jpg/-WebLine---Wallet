import { useMemo } from 'react'

/** ENS avatar when available, otherwise a deterministic gradient from the address (no external requests). */
export function Avatar({ address, src, size = 36 }: { address: string; src?: string; size?: number }) {
  const bg = useMemo(() => {
    const n = parseInt(address.slice(2, 10) || '0', 16)
    const h = n % 40
    return `linear-gradient(135deg, hsl(${355 + h} 80% 48%), hsl(${h} 70% 18%))`
  }, [address])
  const style = { width: size, height: size }
  if (src) return <img src={src} alt="" style={style} className="shrink-0 rounded-full border border-white/20 object-cover" referrerPolicy="no-referrer" />
  return <span aria-hidden="true" style={{ ...style, background: bg }} className="inline-block shrink-0 rounded-full border border-white/20" />
}
