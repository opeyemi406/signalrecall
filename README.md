# SignalRecall — AI Trading Intelligence with Permanent Walrus Memory

**SignalRecall** is an AI trading intelligence platform built for the **Tatum × Walrus Total Recall Hackathon** (Track 1: Markets & Sports Prediction + Best Walrus Memory).

It combines:
1. **Live Multi-Chain Market Telemetry** (via `/lib/tatum.ts`)
2. **Permanent Cross-Session Market Memory** (via `/lib/walrus.ts`)
3. **24-Hour Objective Signal Verification** (read-only on-chain price verification 24h after each call; no trade execution)

---

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Styling:** Tailwind CSS v4 + CSS variables (`app/globals.css`)
- **UI Primitives:** Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-switch`, `@radix-ui/react-slot`) + `lucide-react`
- **Charts & Motion:** TradingView `lightweight-charts` (candlesticks), `recharts` (sparklines), `framer-motion` (page & stagger transitions)

---

## Running Locally

```bash
git clone https://github.com/opeyemi406/signalrecall.git
cd signalrecall
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Connecting Live Tatum & Walrus Endpoints

- **Tatum (`/lib/tatum.ts`):** Set `TATUM_API_KEY` in `.env.local` and wire `getMarketAssets()`, `getCandles()`, and `verifySignal()` to Tatum's REST/RPC endpoints.
- **Walrus Memory (`/lib/walrus.ts`):** Set `NEXT_PUBLIC_WALRUS_RELAYER_URL` in `.env.local` and point `listMemories()`, `recall()`, and `remember()` at your Walrus Memory relayer.
