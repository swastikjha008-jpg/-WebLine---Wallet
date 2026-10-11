import { ReceiveIcon, SendIcon } from './Icons'

interface Props {
  onSend: () => void
  onReceive: () => void
  disabled?: boolean
}

export function WalletActions({ onSend, onReceive, disabled }: Props) {
  return (
    <div className="mt-5 grid grid-cols-2 gap-3">
      <button type="button" className="btn-primary !py-3" onClick={onSend} disabled={disabled}>
        <SendIcon /> Send
      </button>
      <button type="button" className="btn-ghost !py-3" onClick={onReceive}>
        <ReceiveIcon /> Receive
      </button>
    </div>
  )
}
