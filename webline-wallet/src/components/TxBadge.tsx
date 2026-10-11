import type { TxState } from '../hooks/useTxState'

const STYLE: Record<Exclude<TxState, 'idle'>, { label: string; cls: string }> = {
  pending: { label: 'Pending', cls: 'border-amber-400/40 bg-amber-400/10 text-amber-200' },
  confirmed: { label: 'Confirmed', cls: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-200' },
  failed: { label: 'Failed', cls: 'border-red-400/40 bg-red-400/10 text-red-200' },
}

export function TxBadge({ state }: { state: TxState }) {
  if (state === 'idle') return null
  const s = STYLE[state]
  return (
    <span role="status" className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs ${s.cls}`}>
      {state === 'pending' && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden="true" />}
      {s.label}
    </span>
  )
}
