# Webline Wallet

A non-custodial Ethereum wallet front end with a fullscreen, animated Spider-Man ASCII background (Canvas2D).
Built with React, TypeScript, Vite, wagmi, viem, TanStack Query and Tailwind CSS.

- Connect any injected wallet (EIP-6963 discovery: MetaMask, Rabby, Coinbase Wallet, …)
- ENS name and avatar, ETH balance, active network, address copy and explorer links
- Switch between **Ethereum Mainnet** and **Sepolia**
- Send ETH (address or ENS recipient) with pending / confirmed / failed states and explorer link
- Receive view, disconnect, graceful handling of rejected transactions, unsupported networks and RPC errors
- **No private keys or seed phrases are ever requested, stored or displayed.** Signing happens in your wallet. Nothing sensitive is written to `localStorage` by this app.

## Quick start

```bash
pnpm install
cp .env.example .env     # optional, see below
pnpm dev                 # http://localhost:5173
pnpm build               # type-checks, then builds to dist/
pnpm preview             # serves the production build
```

Requires Node 18.18+ and pnpm 10 (`corepack enable` or `npm i -g pnpm`). `pnpm install` may list ignored optional build scripts (`bufferutil`, `utf-8-validate`); they are optional speed-ups and can be left ignored.

## Configuration

| Variable | Purpose |
| --- | --- |
| `VITE_MAINNET_RPC_URL` | RPC endpoint for Ethereum Mainnet (optional) |
| `VITE_SEPOLIA_RPC_URL` | RPC endpoint for Sepolia (optional) |

If unset, viem's built-in public RPCs are used. They are rate-limited, so use a dedicated provider (Alchemy, Infura, QuickNode, …) in production.
`VITE_*` values are bundled into the browser build: use domain-restricted keys, never secrets.

## Background image (required for the ASCII effect)

The fullscreen effect renders **only** from a local photo at `public/spiderman.jpg`. The repo does not ship one and the app draws no substitute figure: without the file the page stays dark (a warning is logged in development).

**Before deploying**, add a clear, close-up photo of the masked face (portrait or landscape, face near the centre, eyes fully inside the frame) as `public/spiderman.jpg`. Make sure you have the rights to use it. Its aspect ratio is always preserved; it is never stretched.

- Framing is subject-aware (`SUBJECT_FRAMING` in `src/lib/ascii/source.ts`): the photo is fitted so the face stays whole, zoomed at most 1.35x past "contain" to fill the viewport, with soft edges where the photo does not reach the screen edge. Adjust `centerX`/`centerY` if the face is not in the middle of your photo.
- Preset values live in `src/lib/ascii/config.ts` and are the source of truth (`lines` mode, `color-dodge`, cell size 10, flicker animation, vignette, grain, glitch). The renderer implements all listed post effects, glow points (`lights`) and a reveal mask (`mask.dataUrl` / `mask.shapes`); only `blurType: 'off' | 'uniform'` are implemented, other blur types fall back to a uniform blur.
- Page dimming and blur happen only while a dialog is open (`dialog::backdrop` in `src/index.css`).

## Deploy

### Vercel
1. Push the repo to GitHub and import it in Vercel.
2. `vercel.json` already sets the Vite preset, `pnpm install --frozen-lockfile`, `pnpm build` and output `dist`.
3. Add `VITE_MAINNET_RPC_URL` / `VITE_SEPOLIA_RPC_URL` under Project → Settings → Environment Variables.
4. Deploy.

### Netlify
1. Import the repo in Netlify.
2. `netlify.toml` already sets build command `pnpm build`, publish directory `dist` and Node 20.
3. Add the same environment variables under Site configuration → Environment variables.
4. Deploy.

### Any static host
Run `pnpm build` and upload `dist/`. The app is a single page with no client-side routes, so no rewrite rules are needed.

## Project structure

```
src/
  config/wagmi.ts            wagmi config (chains, connectors, transports)
  hooks/                     useActiveChain, useEnsProfile, useTxState, useCopy
  lib/ascii/                 Canvas2D engine (no React): config, source art, renderer
  lib/                       format, errors, explorer helpers
  components/                AsciiSpiderManBackground, WalletHeader, NetworkSelector,
                             WalletDashboard, BalanceCard, WalletActions, SendEthModal,
                             ReceiveModal, TransactionStatus, ConnectModal, ErrorBoundary
```

## Security notes
- Always verify the recipient and network in your wallet's confirmation screen before signing.
- Test with Sepolia first.
- The "Recent transactions" list only holds transactions sent in the current session (in memory) and reads their status from the chain.
