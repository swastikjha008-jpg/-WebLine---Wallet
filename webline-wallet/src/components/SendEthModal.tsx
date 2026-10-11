import { useEffect, useState } from 'react'
import { useBalance, useEnsAddress, useEstimateFeesPerGas, useSendTransaction } from 'wagmi'
import { mainnet } from 'wagmi/chains'
import { useQueryClient } from '@tanstack/react-query'
import { formatEther, isAddress, parseEther, type Address } from 'viem'
import { Modal } from './Modal'
import { TxBadge } from './TxBadge'
import { ExternalIcon } from './Icons'
import { useActiveChain } from '../hooks/useActiveChain'
import { safeNormalize } from '../hooks/useEnsProfile'
import { useTxState } from '../hooks/useTxState'
import { describeError, isUserRejection } from '../lib/errors'
import { txUrl } from '../lib/explorer'
import { formatEth, shortAddress } from '../lib/format'
import type { SentTx } from './TransactionStatus'

interface Props {
  open: boolean
  onClose: () => void
  address: Address
  onSent: (tx: SentTx) => void
}

function parseAmount(s: string): bigint | null {
  if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null
  try { return parseEther(s) } catch { return null }
}

export function SendEthModal({ open, onClose, address, onSent }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Send ETH">
      <SendForm address={address} onSent={onSent} onClose={onClose} />
    </Modal>
  )
}

function SendForm({ address, onSent, onClose }: Omit<Props, 'open'>) {
  const { chain, chainId, unsupported } = useActiveChain()
  const queryClient = useQueryClient()
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [touched, setTouched] = useState(false)

  const { data: balance } = useBalance({ address, chainId })
  const fees = useEstimateFeesPerGas({ chainId })
  const send = useSendTransaction()
  const tx = useTxState(send.data, chainId)

  const trimmed = to.trim()
  const looksEns = !trimmed.startsWith('0x') && /\.[a-z]{2,}$/i.test(trimmed)
  const ensName = looksEns ? safeNormalize(trimmed) : undefined
  const ens = useEnsAddress({ name: ensName, chainId: mainnet.id, query: { enabled: !!ensName } })

  const recipient: Address | null = isAddress(trimmed) ? trimmed : (ens.data ?? null)
  const value = parseAmount(amount.trim())

  let recipientError: string | null = null
  if (trimmed === '') recipientError = 'Enter a recipient address or ENS name.'
  else if (looksEns && ens.isLoading) recipientError = 'Resolving ENS name…'
  else if (!recipient) recipientError = looksEns ? 'That ENS name has no address set.' : 'Enter a valid Ethereum address (0x…), or check the checksum capitalization.'

  let amountError: string | null = null
  if (amount.trim() === '') amountError = 'Enter an amount.'
  else if (value === null) amountError = 'Enter a number with up to 18 decimals.'
  else if (value === 0n) amountError = 'Amount must be greater than 0.'
  else if (balance && value > balance.value) amountError = `You only have ${formatEth(balance.value)} ETH on ${chain.name}.`

  const feePerGas = fees.data?.maxFeePerGas ?? fees.data?.gasPrice ?? 0n
  const estFee = (21_000n * feePerGas * 12n) / 10n
  const maxSendable = balance && balance.value > estFee ? balance.value - estFee : 0n

  const canSubmit = !unsupported && !recipientError && !amountError && !send.isPending
  const hash = send.data

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (!canSubmit || !recipient || value === null) return
    send.sendTransaction(
      { to: recipient, value, chainId },
      {
        onSuccess: (h) => {
          onSent({ hash: h, chainId, to: recipient, value })
          void queryClient.invalidateQueries({ queryKey: ['balance'] })
        },
      },
    )
  }

  // Refresh the balance once the chain confirms.
  useEffect(() => {
    if (tx.state === 'confirmed') void queryClient.invalidateQueries({ queryKey: ['balance'] })
  }, [tx.state, queryClient])

  if (hash) {
    const url = txUrl(chain, hash)
    return (
      <div aria-live="polite">
        <div className="flex items-center justify-between">
          <p className="text-sm text-zinc-300">{amount} ETH to {recipient ? shortAddress(recipient) : ''}</p>
          <TxBadge state={tx.state} />
        </div>
        <p className="mt-3 text-sm text-zinc-400">
          {tx.state === 'pending' && `Waiting for ${chain.name} to include your transaction. You can close this window; it keeps tracking in Recent transactions.`}
          {tx.state === 'confirmed' && `Included in block ${tx.receipt?.blockNumber.toString() ?? ''}.`}
          {tx.state === 'failed' && (tx.receipt ? 'The transaction was included but reverted. The network fee was spent.' : 'We could not confirm this transaction. Check the explorer for its final status.')}
        </p>
        <p className="mt-3 break-all rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs text-zinc-300">{hash}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {url && (
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-ghost !py-2 text-sm"><ExternalIcon /> View on {chain.blockExplorers?.default.name ?? 'explorer'}</a>
          )}
          <button type="button" className="btn-primary !py-2" onClick={onClose}>Done</button>
          {tx.state !== 'pending' && (
            <button type="button" className="btn-ghost !py-2" onClick={() => { send.reset(); setTo(''); setAmount(''); setTouched(false) }}>Send another</button>
          )}
        </div>
      </div>
    )
  }

  const rejected = send.error ? isUserRejection(send.error) : false

  return (
    <form onSubmit={submit} noValidate>
      {unsupported && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
          Your wallet is on a network this app does not support. Switch to Mainnet or Sepolia first.
        </p>
      )}
      <label htmlFor="send-to" className="mb-1.5 block text-sm text-zinc-300">Recipient</label>
      <input
        id="send-to" className="field font-mono" placeholder="0x… or name.eth" value={to} autoComplete="off" autoCapitalize="off" spellCheck={false}
        onChange={(e) => setTo(e.target.value)} onBlur={() => setTouched(true)}
        aria-invalid={touched && !!recipientError} aria-describedby="send-to-msg"
      />
      <p id="send-to-msg" className="mt-1.5 min-h-[1.25rem] text-xs text-zinc-400">
        {touched && recipientError ? <span className="text-amber-200">{recipientError}</span> : recipient && looksEns ? `Resolves to ${shortAddress(recipient)}` : ''}
      </p>

      <div className="mt-2 flex items-center justify-between">
        <label htmlFor="send-amount" className="text-sm text-zinc-300">Amount (ETH)</label>
        <button type="button" className="text-xs text-web-soft underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-soft" onClick={() => setAmount(formatEther(maxSendable))} disabled={!balance || maxSendable === 0n}>
          Max (after est. fee)
        </button>
      </div>
      <input
        id="send-amount" className="field mt-1.5 tabular-nums" placeholder="0.0" inputMode="decimal" value={amount} autoComplete="off"
        onChange={(e) => setAmount(e.target.value.replace(',', '.'))} onBlur={() => setTouched(true)}
        aria-invalid={touched && !!amountError} aria-describedby="send-amount-msg"
      />
      <p id="send-amount-msg" className="mt-1.5 min-h-[1.25rem] text-xs text-zinc-400">
        {touched && amountError ? <span className="text-amber-200">{amountError}</span> : balance ? `Available: ${formatEth(balance.value)} ETH on ${chain.name}` : ''}
      </p>

      {send.error && (
        <p role="alert" className={`mt-3 rounded-xl border p-3 text-sm ${rejected ? 'border-amber-400/30 bg-amber-400/10 text-amber-100' : 'border-red-400/30 bg-red-400/10 text-red-100'}`}>
          {describeError(send.error)}
        </p>
      )}

      <button type="submit" className="btn-primary mt-5 w-full !py-3" disabled={send.isPending || unsupported}>
        {send.isPending ? 'Confirm in your wallet…' : 'Review in wallet'}
      </button>
      <p className="mt-3 text-center text-xs text-zinc-500">Your wallet shows the final network fee before you sign.</p>
    </form>
  )
}
