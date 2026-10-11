import { useAccount, useBalance } from 'wagmi'
import type { Address } from 'viem'
import { Avatar } from './Avatar'
import { CopyButton } from './CopyButton'
import { ExternalIcon } from './Icons'
import { WalletActions } from './WalletActions'
import { useActiveChain } from '../hooks/useActiveChain'
import { useEnsProfile } from '../hooks/useEnsProfile'
import { addressUrl } from '../lib/explorer'
import { formatEth, shortAddress } from '../lib/format'

interface Props {
  address: Address
  onSend: () => void
  onReceive: () => void
}

export function BalanceCard({ address, onSend, onReceive }: Props) {
  const { chain, unsupported } = useActiveChain()
  const { connector } = useAccount()
  const ens = useEnsProfile(address)
  const { data, isLoading, isError, refetch, isFetching } = useBalance({
    address,
    chainId: chain.id,
    query: { refetchInterval: 15_000 },
  })
  const explorer = addressUrl(chain, address)

  return (
    <section aria-label="Wallet balance" className="glass w-full rounded-3xl p-5 sm:p-7">
      <div className="flex items-center gap-3">
        <Avatar address={address} src={ens.avatar} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white">{ens.name ?? shortAddress(address)}</p>
          <p className="truncate text-xs text-zinc-400">{connector?.name ?? 'Wallet'}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-200">
          <span className={`h-1.5 w-1.5 rounded-full ${unsupported ? 'bg-amber-400' : 'bg-emerald-400'}`} aria-hidden="true" />
          {unsupported ? 'Unsupported network' : chain.name}
        </span>
      </div>

      <div className="mt-7">
        <p className="text-sm text-zinc-400">Balance</p>
        {isLoading ? (
          <div className="mt-2 h-12 w-48 animate-pulse rounded-lg bg-white/10" role="status" aria-label="Loading balance" />
        ) : isError || !data ? (
          <div className="mt-2" role="alert">
            <p className="text-sm text-amber-200">Could not load your balance. The network (RPC) may be unreachable.</p>
            <button type="button" className="btn-ghost mt-3 !py-1.5 text-xs" onClick={() => void refetch()}>Try again</button>
          </div>
        ) : (
          <p className="mt-1 flex items-baseline gap-2 break-all">
            <span className="text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl" aria-live="polite">
              {formatEth(data.value, data.decimals, 5)}
            </span>
            <span className="text-lg text-zinc-300">{data.symbol}</span>
            {isFetching && <span className="sr-only">Updating</span>}
          </p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-black/30 p-2.5">
        <code className="min-w-0 flex-1 truncate px-1.5 font-mono text-xs text-zinc-300" title={address}>{address}</code>
        <CopyButton text={address} />
        {explorer && (
          <a href={explorer} target="_blank" rel="noopener noreferrer" className="btn-ghost !px-2.5 !py-1.5 text-xs" aria-label={`View address on ${chain.blockExplorers?.default.name ?? 'block explorer'}`}>
            <ExternalIcon /> Explorer
          </a>
        )}
      </div>

      <WalletActions onSend={onSend} onReceive={onReceive} disabled={unsupported} />
    </section>
  )
}
