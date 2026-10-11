import { useWaitForTransactionReceipt } from 'wagmi'
import type { Hash } from 'viem'
import type { SupportedChainId } from '../config/wagmi'

export type TxState = 'idle' | 'pending' | 'confirmed' | 'failed'

/** Tracks a real transaction through the chain: pending until a receipt exists, then confirmed or failed. */
export function useTxState(hash: Hash | undefined, chainId: SupportedChainId) {
  const q = useWaitForTransactionReceipt({ hash, chainId, query: { enabled: !!hash } })
  const state: TxState = !hash ? 'idle' : q.isSuccess ? (q.data.status === 'success' ? 'confirmed' : 'failed') : q.isError ? 'failed' : 'pending'
  return { state, receipt: q.data, error: q.error }
}
