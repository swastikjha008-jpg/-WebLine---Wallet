import { BaseError, UserRejectedRequestError } from 'viem'

type Coded = { code?: number; name?: string; message?: string }

export function isUserRejection(error: unknown): boolean {
  if (!error) return false
  if (error instanceof BaseError && error.walk((e) => e instanceof UserRejectedRequestError || (e as Coded).code === 4001)) return true
  const e = error as Coded
  return e.code === 4001 || e.name === 'UserRejectedRequestError' || /user (rejected|denied)|rejected the request/i.test(e.message ?? '')
}

/** Turns wallet/RPC errors into short, actionable copy. */
export function describeError(error: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!error) return fallback
  if (isUserRejection(error)) return 'Request cancelled in your wallet. Nothing was sent.'
  const e = error as Coded
  const msg = (error instanceof BaseError ? error.shortMessage : e.message) ?? ''
  if (e.name === 'ProviderNotFoundError' || /provider not found/i.test(msg)) return 'No wallet found in this browser. Install a wallet such as MetaMask or Rabby, then reload.'
  if (e.name === 'ConnectorAlreadyConnectedError') return 'This wallet is already connected.'
  if (/insufficient funds/i.test(msg)) return 'Not enough ETH to cover the amount plus network fee.'
  if (/chain.*(not|un)supported|unrecognized chain|4902/i.test(msg) || e.code === 4902) return 'Your wallet does not know this network. Add it in the wallet, then try again.'
  if (/switch.*chain|chain mismatch/i.test(msg)) return 'Switch your wallet to the selected network and try again.'
  if (/http request failed|fetch failed|network request failed|timeout|timed out|rpc/i.test(msg)) return 'The network (RPC) did not respond. Check your connection or set a dedicated RPC URL.'
  if (/nonce/i.test(msg)) return 'Nonce conflict: wait for pending transactions to finish, then retry.'
  if (/gas/i.test(msg) && /exceed|too low|underpriced/i.test(msg)) return 'The network fee was rejected. Retry with a higher fee in your wallet.'
  return msg ? (msg.length > 180 ? `${msg.slice(0, 177)}…` : msg) : fallback
}
