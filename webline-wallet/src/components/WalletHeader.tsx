import { useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { NetworkSelector } from './NetworkSelector'
import { ConnectModal } from './ConnectModal'
import { Avatar } from './Avatar'
import { WebMark } from './Icons'
import { useEnsProfile } from '../hooks/useEnsProfile'
import { shortAddress } from '../lib/format'

export function WalletHeader() {
  const { address, isConnected, isReconnecting, isConnecting } = useAccount()
  const { disconnect } = useDisconnect()
  const ens = useEnsProfile(address)
  const [connectOpen, setConnectOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-8 sm:py-5">
      <a href="/" aria-label="Webline home" className="flex items-center gap-2 rounded-lg text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-web-soft">
        <span className="text-web"><WebMark /></span>
        <span className="hidden text-base font-semibold tracking-tight sm:inline">Webline</span>
      </a>

      <div className="flex items-center gap-2 sm:gap-3">
        <NetworkSelector />
        {isConnected && address ? (
          <>
            <span className="glass hidden items-center gap-2 rounded-xl py-1.5 pl-1.5 pr-3 text-sm sm:flex">
              <Avatar address={address} src={ens.avatar} size={24} />
              <span className="font-medium">{ens.name ?? shortAddress(address)}</span>
            </span>
            <button type="button" className="btn-ghost whitespace-nowrap !py-2" onClick={() => disconnect()}>Disconnect</button>
          </>
        ) : (
          <button type="button" className="btn-primary whitespace-nowrap !py-2" disabled={isReconnecting || isConnecting} onClick={() => setConnectOpen(true)}>
            {isReconnecting || isConnecting ? 'Connecting…' : (<><span className="sm:hidden">Connect</span><span className="hidden sm:inline">Connect wallet</span></>)}
          </button>
        )}
      </div>
      <ConnectModal open={connectOpen} onClose={() => setConnectOpen(false)} />
    </header>
  )
}
