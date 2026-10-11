import { useCopy } from '../hooks/useCopy'
import { CheckIcon, CopyIcon } from './Icons'

export function CopyButton({ text, label = 'Copy address' }: { text: string; label?: string }) {
  const { copied, copy } = useCopy()
  return (
    <button type="button" onClick={() => void copy(text)} className="btn-ghost !px-2.5 !py-1.5 text-xs" aria-label={copied ? 'Copied' : label}>
      {copied ? <CheckIcon /> : <CopyIcon />}
      <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  )
}
