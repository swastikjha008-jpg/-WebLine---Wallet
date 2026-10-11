import { useMemo, useState } from 'react'
import { useConnect } from 'wagmi'
import { Modal } from './Modal'
import { describeError } from '../lib/errors'

export function ConnectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connectors, connect, isPending, variables, reset } = useConnect()
  const [error, setError] = useState<string | null>(null)

  // Prefer wallets discovered via EIP-6963; keep the generic injected connector as a fallback.
  const list = useMemo(() => {
    const specific = connectors.filter((c) => c.id !== 'injected')
    return specific.length > 0 ? specific : connectors
  }, [connectors])
  const noWallet = list.length === 0 || (list.every((c) => c.id === 'injected') && typeof window !== 'undefined' && !('ethereum' in window))

  const close = () => { setError(null); reset(); onClose() }

  return (
    <Modal open={open} onClose={close} title="Connect a wallet">
      <p className="mb-4 text-sm text-zinc-400">Pick a wallet installed in this browser. You approve every action in the wallet; this app never sees your keys.</p>
      {noWallet && (
        <p role="status" className="mb-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-300">
          No browser wallet detected. Install one such as MetaMask or Rabby, then reload this page.
        </p>
      )}
      <ul className="space-y-2">
        {list.map((c) => {
          const busy = isPending && variables?.connector === c
          return (
            <li key={c.uid}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  setError(null)
                  connect({ connector: c }, { onSuccess: close, onError: (e) => setError(describeError(e)) })
                }}
                className="btn-ghost w-full !justify-start gap-3 !py-3"
              >
                {c.icon ? <img src={c.icon} alt="" width={24} height={24} className="rounded" /> : <span className="h-6 w-6 rounded bg-white/10" aria-hidden="true" />}
                <span className="flex-1 text-left">{c.id === 'injected' ? 'Browser wallet' : c.name}</span>
                {busy && <span className="text-xs text-zinc-400">Check your wallet…</span>}
              </button>
            </li>
          )
        })}
      </ul>
      {error && <p role="alert" className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">{error}</p>}
    </Modal>
  )
}
