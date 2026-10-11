import { useCallback, useState } from 'react'
import { useAccount, useSwitchChain } from 'wagmi'
import { BalanceCard } from './BalanceCard'
import { SendEthModal } from './SendEthModal'
import { ReceiveModal } from './ReceiveModal'
import { TransactionStatus, type SentTx } from './TransactionStatus'
import { ConnectModal } from './ConnectModal'
import { useActiveChain } from '../hooks/useActiveChain'
import { describeError } from '../lib/errors'
import { WebMark } from './Icons'

export function WalletDashboard() {
  const { address, isConnected, isReconnecting } = useAccount()
  const { unsupported } = useActiveChain()
  const { switchChain, isPending, error } = useSwitchChain()
  const [sendOpen, setSendOpen] = useState(false)
  const [receiveOpen, setReceiveOpen] = useState(false)
  const [connectOpen, setConnectOpen] = useState(false)
  const [sent, setSent] = useState<SentTx[]>([])

  const onSent = useCallback((tx: SentTx) => setSent((prev) => [tx, ...prev.filter((p) => p.hash !== tx.hash)].slice(0, 8)), [])

  return (
    <main className="flex min-h-[calc(100dvh-4.5rem)] w-full flex-col justify-end px-4 pb-6 sm:px-8 sm:pb-10 lg:justify-center">
      <div className="flex w-full flex-col gap-4 lg:max-w-[22rem] xl:max-w-sm">
        {isConnected && address ? (
          <>
            {unsupported && (
              <div role="alert" className="glass rounded-2xl border-amber-400/30 p-4 text-sm text-amber-100">
                <p>Your wallet is on a network this app does not support.</p>
                <button type="button" className="btn-primary mt-3 !py-2" disabled={isPending} onClick={() => switchChain({ chainId: 1 })}>
                  {isPending ? 'Switching…' : 'Switch to Ethereum Mainnet'}
                </button>
                {error && <p className="mt-2 text-xs text-amber-200">{describeError(error)}</p>}
              </div>
            )}
            <BalanceCard address={address} onSend={() => setSendOpen(true)} onReceive={() => setReceiveOpen(true)} />
            <TransactionStatus txs={sent} />
            <SendEthModal open={sendOpen} onClose={() => setSendOpen(false)} address={address} onSent={onSent} />
            <ReceiveModal open={receiveOpen} onClose={() => setReceiveOpen(false)} address={address} />
          </>
        ) : (
          <section aria-label="Connect" className="glass rounded-3xl p-6 sm:p-8">
            <span className="text-web"><WebMark size={28} /></span>
            <h1 className="mt-4 text-2xl font-semibold tracking-tight text-white sm:text-3xl">Your ETH, your keys</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              Connect a wallet to see your balance and send or receive ETH on Ethereum Mainnet and Sepolia. Webline never holds your keys; every transaction is signed in your wallet.
            </p>
            <button type="button" className="btn-primary mt-6 w-full !py-3" disabled={isReconnecting} onClick={() => setConnectOpen(true)}>
              {isReconnecting ? 'Reconnecting…' : 'Connect wallet'}
            </button>
            <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
          </section>
        )}
      </div>
    </main>
  )
}
