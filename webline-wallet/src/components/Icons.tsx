const base = { width: 16, height: 16, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

export const CopyIcon = () => (<svg {...base}><rect x="5.5" y="5.5" width="8" height="8" rx="1.8" /><path d="M10.5 5.5V4a1.5 1.5 0 0 0-1.5-1.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></svg>)
export const CheckIcon = () => (<svg {...base}><path d="M3 8.5l3.2 3L13 4.5" /></svg>)
export const ExternalIcon = () => (<svg {...base}><path d="M9 3h4v4M13 3L7.5 8.5M11 9.5V12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2.5" /></svg>)
export const SendIcon = () => (<svg {...base}><path d="M13.5 2.5L7 9M13.5 2.5L9 13.5 7 9 2.5 7l11-4.5z" /></svg>)
export const ReceiveIcon = () => (<svg {...base}><path d="M8 2.5v8M4.5 7.5L8 11l3.5-3.5M3 13.5h10" /></svg>)
export const WebMark = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
    <path d="M16 3v26M3 16h26M6.8 6.8l18.4 18.4M25.2 6.8L6.8 25.2" />
    <circle cx="16" cy="16" r="4.5" /><circle cx="16" cy="16" r="9.5" />
  </svg>
)
