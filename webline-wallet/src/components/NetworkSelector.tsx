import { useState } from 'react'
import { useSwitchChain } from 'wagmi'
import { SUPPORTED_CHAINS } from '../config/wagmi'
import { useActiveChain } from '../hooks/useActiveChain'
import { describeError } from '../lib/errors'

const SHORT: Record<number, string> = { 1: 'Mainnet', 11155111: 'Sepolia' }

export function NetworkSelector() {
  const { chainId, unsupported } = useActiveChain()
  const { switchChain, isPending, variables } = useSwitchChain()
  const [error, setError] = useState<string | null>(null)

  return (
    <div className="relative">
      <div role="group" aria-label="Network" className="glass flex rounded-xl p-1">
        {SUPPORTED_CHAINS.map((c) => {
          const active = !unsupported && c.id === chainId
          const switching = isPending && variables?.chainId === c.id
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              disabled={isPending}
              onClick={() => {
                setError(null)
                switchChain({ chainId: c.id }, { onError: (e) => setError(describeError(e)) })
              }}
              className={`rounded-lg px-3 py-1.5 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-soft disabled:cursor-wait ${
                active ? 'bg-web text-white' : 'text-zinc-300 hover:bg-white/10'
              }`}
            >
              {switching ? 'Switching…' : SHORT[c.id] ?? c.name}
            </button>
          )
        })}
      </div>
      {error && (
        <p role="alert" className="glass absolute right-0 top-full z-20 mt-2 w-64 rounded-xl p-3 text-xs text-amber-200">
          {error}
        </p>
      )}
    </div>
  )
}
