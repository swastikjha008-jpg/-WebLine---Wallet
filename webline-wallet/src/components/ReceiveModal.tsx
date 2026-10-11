import type { Address } from 'viem'
import { Modal } from './Modal'
import { CopyButton } from './CopyButton'
import { ExternalIcon } from './Icons'
import { useActiveChain } from '../hooks/useActiveChain'
import { addressUrl } from '../lib/explorer'

export function ReceiveModal({ open, onClose, address }: { open: boolean; onClose: () => void; address: Address }) {
  const { chain } = useActiveChain()
  const explorer = addressUrl(chain, address)
  return (
    <Modal open={open} onClose={onClose} title="Receive ETH">
      <p className="text-sm text-zinc-400">Share this address to receive ETH on {chain.name}.</p>
      <p className="mt-4 break-all rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm leading-relaxed text-white select-all">{address}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <CopyButton text={address} />
        {explorer && (
          <a href={explorer} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-2.5 !py-1.5 text-xs">
            <ExternalIcon /> View on {chain.blockExplorers?.default.name ?? 'explorer'}
          </a>
        )}
      </div>
      <p className="mt-4 text-xs text-zinc-500">The same address works on every Ethereum network. Make sure the sender picks {chain.name}, or the funds will appear on a different network.</p>
    </Modal>
  )
}
