# SignalRecall — Hackathon Judging & Verification Guide

This guide outlines how to evaluate **SignalRecall** for the **Tatum × Walrus Total Recall Hackathon** (Track 1: Markets & Sports Prediction + Best Walrus Memory). Every claim below maps directly to implemented code in this repository, with clear disclosures where behavior is partial or planned.

> **Evaluation Scope:** This document provides technical verification steps and architectural evidence. It makes no claims regarding awards, compliance, or judging outcomes.

---

## 1. Executive Summary

SignalRecall is an AI-assisted crypto trading terminal built with Next.js 15, TypeScript, Tatum Market & Sui RPC APIs, and the official Walrus Memory SDK (`@mysten-incubation/memwal`). It solves two core problems in discretionary market analysis:
1. **Amnesia in Trading AI:** Standard chat assistants forget past setups, catalysts, and invalidation lessons across sessions. SignalRecall stores user observations, signal creations, and 24-hour verification outcomes in a user-scoped Walrus Memory namespace (`<MEMWAL_NAMESPACE>:<userId>`) and recalls them via semantic vector search during subsequent AI chat and technical chart scans.
2. **Unverifiable Market Calls:** SignalRecall prevents post-hoc cherry-picking by locking the live spot entry price on the server (`POST /api/signals`), recording a 24-hour verification timestamp (`verifyAt`), and settling the signal outcome (`TARGET_REACHED`, `INVALIDATED`, or `IN_PROGRESS`) against live exchange rates and the current Sui Mainnet checkpoint (`POST /api/signals/verify`).

---

## 2. End-to-End Product Demo Flow

Judges can evaluate the live hosted deployment at **[https://signal-recall.up.railway.app](https://signal-recall.up.railway.app)** or run a local instance on `http://localhost:3001`.

### Step 1: Landing Page & Google OAuth Isolation
- **Landing (`/`):** Publicly displays live spot market telemetry (`/api/market/prices`) and an interactive candlestick chart (`/api/market/candles`) with zero mock data.
- **Route Protection ([`middleware.ts`](./middleware.ts)):** Accessing `/dashboard`, `/markets`, `/signals`, `/history`, `/track-record`, `/memory`, or `/alerts` without a session redirects to `/auth/signin`.
- **Google OAuth (`Auth.js v5`):** Signing in via Google creates an isolated JWT session (`session.user.id`). All signals, alerts, memories, and Walrus Memory namespaces are scoped to that authenticated user.

### Step 2: Live Market Telemetry & Sui Checkpoint Status (`/dashboard`, `/markets`)
- **Overview (`/dashboard`):** Displays the live **Tatum Sui Gateway** badge with the latest Sui Mainnet checkpoint sequence number (polled from `/api/network/sui`), 3 signal summary stat cards, the AI summary card, active signals, an interactive `lightweight-charts` candlestick chart, and the 6-asset **Market Overview** (`BTC`, `ETH`, `SOL`, `SUI`, `BNB`, `XRP`).
- **Markets (`/markets`):** Provides live USD prices, 24h percentage change, search/gainer filtering, and live Finnhub crypto news headlines (`/api/market/news` when `FINNHUB_API_KEY` is configured).

### Step 3: Walrus Memory Ingestion (`/memory`)
1. Navigate to **Memory Bank** (`/memory`) and click **Store Memory**.
2. Enter an observation (e.g., asset `BTC`, title `"Range Breakout & 48h Retest"`, body, and optional outcome).
3. Submitting triggers `POST /api/walrus`, which formats the entry and calls `rememberSignalMemory(memoryFact, userId)` in [`lib/server/walrus.ts`](./lib/server/walrus.ts) (`client.rememberAndWait(..., { timeoutMs: 30_000 })`), then writes a mirror entry to `data/memories.json`.

### Step 4: Quantitative AI Chart Scan & 1-Click Signal Creation (`/dashboard` or `/signals`)
1. On the candlestick chart ([`components/cards/CandlestickChart.tsx`](./components/cards/CandlestickChart.tsx)), select an asset/timeframe (`1H`, `4H`, `1D`, `1W`) and click **Analyze Chart with AI**.
2. `POST /api/ai/chart-analysis` fetches live candles, grabs the current spot price via `fetchTatumRateResult()`, computes deterministic indicators in [`lib/server/technical.ts`](./lib/server/technical.ts) (`RSI(14)`, `EMA(9/20/50)`, `MACD`, `Bollinger Bands`, `ATR(14)`, support/resistance), recalls up to 2 semantic memories from Walrus Memory (`recallSignalMemories`), and prompts OpenRouter for a structured JSON setup.
3. The drawer displays the bias, confidence, entry/target/stop levels, and any **Walrus Memory Citation** found.
4. Click **Turn Into 24h Signal** (or submit the form directly on `/signals`) to call `POST /api/signals`, which locks the server-side spot price and ingests a `"Signal created: ..."` fact into Walrus Memory.

### Step 5: Objective Verification & Memory Loop (`/signals`, `/history`, AI Panel)
1. On `/signals`, click **Check 24h Status** on an `IN_PROGRESS` signal. (The UI passes `force: true` to `POST /api/signals/verify` so judges can test settlement immediately without waiting 24 real hours; without `force: true`, the API enforces `now >= verifyAt`.)
2. The server fetches the live spot price and current Sui Mainnet checkpoint (`verifySignalWithTatum`), computes `TARGET_REACHED`, `INVALIDATED`, or `IN_PROGRESS` plus `pnlPct`, updates the signal record, and calls `rememberSignalMemory()` to store the verified outcome and Sui checkpoint in Walrus Memory.
3. Open the **SignalRecall AI** right-hand panel (`POST /api/ai/chat`) and ask about that asset (e.g., *"What do you remember about BTC?"*): the server injects both semantic matches from `recallSignalMemories()` and keyword matches from `data/memories.json` alongside live prices and 4H indicators.

---

## 3. Core Integration Evidence

### A. Tatum Integration (`lib/server/tatum.ts` & `app/api/*`)
- **Exchange Rates:** `fetchAllTatumRates()` calls `POST https://api.tatum.io/v4/data/rate/symbol/batch`, and `fetchTatumRateResult()` calls `GET https://api.tatum.io/v4/data/rate/symbol?symbol={symbol}&basePair=USD` with `x-api-key: TATUM_API_KEY` and `cache: "no-store"`.
- **Sui RPC Telemetry:** `fetchSuiNetworkTelemetry()` queries `https://sui-mainnet.gateway.tatum.io` (`sui_getLatestCheckpointSequenceNumber`) to retrieve live Sui Mainnet checkpoint sequence numbers and network telemetry.

### B. Walrus Memory Learning Loop (`lib/server/walrus.ts`)
- Uses `@mysten-incubation/memwal` (`v0.1.14`) with Ed25519 delegate key authentication (`MEMWAL_DELEGATE_KEY`, `MEMWAL_ACCOUNT_ID`, `MEMWAL_SERVER_URL`).
- **Write Path:** `rememberSignalMemory()` writes under namespace `<MEMWAL_NAMESPACE>:<userId>` via `client.rememberAndWait(text, namespace, { timeoutMs: 30_000 })` on manual memory creation, signal creation, and signal verification.
- **Read Path:** `recallSignalMemories()` queries `client.recall({ query, limit: topK, namespace })` during AI Chat, AI Chart Analysis, and `GET /api/walrus?query=...`.

### C. Technical Quality & Security Boundaries
- **Strict TypeScript:** `tsconfig.json` enables strict mode (`npm run typecheck`).
- **Server-Only Secrets:** Zero `NEXT_PUBLIC_*` secret variables; all third-party API keys and Ed25519 delegate keys remain inside Next.js Route Handlers and `lib/server/*`.
- **Ownership Enforcement:** `POST /api/signals/verify`, `PUT /api/alerts`, and `DELETE /api/alerts` verify `signal.userId === session.user.id` (returning `403` on mismatch). `POST /api/walrus` and `POST /api/alerts` require an authenticated session (`401` if unauthenticated).

---

## 4. Verifiable Evidence & Judge Check Commands

Judges can verify live endpoints directly against production (`https://signal-recall.up.railway.app`) or `http://localhost:3001`:

```bash
# 1. Verify live Sui Mainnet checkpoint telemetry (via Tatum Sui RPC)
curl -s https://signal-recall.up.railway.app/api/network/sui

# 2. Verify live multi-asset spot quotes (zero mock data)
curl -s https://signal-recall.up.railway.app/api/market/prices

# 3. Verify live multi-exchange OHLCV candles (KuCoin -> Binance -> Gate.io)
curl -s "https://signal-recall.up.railway.app/api/market/candles?symbol=BTC&tf=1D"

# 4. Verify unauthenticated isolation (returns empty arrays, authenticated: false, and MemWal status)
curl -s https://signal-recall.up.railway.app/api/signals
curl -s https://signal-recall.up.railway.app/api/walrus

# 5. Local static typecheck & production build verification (in cloned repo)
npm run typecheck
npm run build
```
