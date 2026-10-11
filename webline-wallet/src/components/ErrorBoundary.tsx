import { Component, type ErrorInfo, type ReactNode } from 'react'

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div role="alert" className="grid min-h-[100dvh] place-items-center p-6">
        <div className="glass w-full max-w-md rounded-2xl p-6 text-center">
          <h1 className="text-lg font-semibold">The wallet hit an unexpected error</h1>
          <p className="mt-2 text-sm text-zinc-400">Your funds are safe. Nothing was sent. Reload the page to continue.</p>
          <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
