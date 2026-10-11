import { AsciiSpiderManBackground } from './components/AsciiSpiderManBackground'
import { WalletHeader } from './components/WalletHeader'
import { WalletDashboard } from './components/WalletDashboard'

export default function App() {
  return (
    <>
      <AsciiSpiderManBackground />
      <div className="relative z-10 flex min-h-[100dvh] flex-col">
        <WalletHeader />
        <WalletDashboard />
      </div>
    </>
  )
}
