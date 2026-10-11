import type { Address, Hash } from 'viem'
import { SUPPORTED_CHAINS, type SupportedChainId } from '../config/wagmi'
import { useTxState } from '../hooks/useTxState'
import { TxBadge } from './TxBadge'
import { ExternalIcon } from './Icons'
import { txUrl } from '../lib/explorer'
import { formatEth, shortAddress } from '../lib/format'

export interface SentTx {
  hash: Hash
  chainId: SupportedChainId
  to: Address
  value: bigint
}

function Row({ tx }: { tx: SentTx }) {
  const chain = SUPPORTED_CHAINS.find((c) => c.id === tx.chainId)
  const { state } = useTxState(tx.hash, tx.chainId)
  const url = txUrl(chain, tx.hash)
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm text-white">Sent {formatEth(tx.value)} ETH to {shortAddress(tx.to)}</p>
        <p className="mt-0.5 truncate font-mono text-xs text-zinc-500">{chain?.name} · {shortAddress(tx.hash, 10, 8)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <TxBadge state={state} />
        {url && (
          <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost !p-2" aria-label="View transaction on block explorer">
            <ExternalIcon />
          </a>
        )}
      </div>
    </li>
  )
}

/** Transactions sent from this session. Statuses are read from the chain, never assumed. */
export function TransactionStatus({ txs }: { txs: SentTx[] }) {
  if (txs.length === 0) return null
  return (
    <section aria-label="Recent transactions" className="glass w-full rounded-3xl px-5 py-3 sm:px-7">
      <h2 className="pt-2 text-sm font-medium text-zinc-300">Recent transactions</h2>
      <ul className="divide-y divide-white/10">
        {txs.map((tx) => <Row key={tx.hash} tx={tx} />)}
      </ul>
    </section>
  )
}
