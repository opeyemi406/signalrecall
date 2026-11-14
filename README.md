# SignalRecall

### AI-Assisted Crypto Market Terminal with Per-User Walrus Memory and 24-Hour Tatum Price Settlement

**SignalRecall** is a web-based crypto trading intelligence and signal-accountability workspace built with Next.js 15, TypeScript, Tatum market & Sui telemetry, and the Walrus Memory SDK (`@mysten-incubation/memwal`). It allows traders and analysts to inspect live multi-asset market data, run quantitative candlestick analysis, record directional 24-hour market calls at live spot prices, store encrypted trading observations in a per-user Walrus Memory namespace, and verify whether each call hit its target or invalidation level against live exchange rates.

> **Read-Only Financial Posture:** SignalRecall is strictly an analytical and record-keeping system. It never requests wallet private keys from end users, never signs or broadcasts financial transactions, and never executes trades on decentralized or centralized exchanges.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem & Solution](#2-problem--solution)
3. [How Walrus Memory Changes the Product](#3-how-walrus-memory-changes-the-product)
4. [Environment Configuration](#4-environment-configuration)
5. [Local Installation & Setup](#5-local-installation--setup)
6. [Companion Documentation](#6-companion-documentation)

---

## 1. Project Overview

### Purpose & Target Users
Discretionary crypto traders, technical analysts, and research teams routinely rely on AI chat assistants and charting tools to evaluate market setups across major assets (`BTC`, `ETH`, `SOL`, `SUI`, `BNB`, `XRP`). However, standard workflows suffer from two structural gaps:
1. **Context Loss Across Sessions:** Observations about how an asset reacted to a specific catalyst, support level, or volatility regime are lost as soon as a chat thread closes.
2. **Unverified Signal Claims:** Directional trade calls ("BTC LONG to +5%") are rarely anchored to an objective live entry quote with a fixed settlement horizon and an immutable audit trail.

SignalRecall addresses both gaps in a unified workspace for individual traders signed in via Google OAuth:
- **Live Spot & Candlestick Telemetry:** Streams USD quotes, 24-hour percentage changes, 24-hour volumes, and multi-timeframe (`1H`, `4H`, `1D`, `1W`) OHLCV candlestick charts for six supported assets (`BTC`, `ETH`, `SOL`, `SUI`, `BNB`, `XRP`).
- **Quantitative Indicator Engine & AI Chart Scanner:** Computes deterministic technical indicators (`RSI(14)`, `EMA(9/20/50)`, `MACD(12,26,9)`, `Bollinger Bands(20,2)`, `ATR(14)`, and swing support/resistance) on the server in [`lib/server/technical.ts`](./lib/server/technical.ts) and feeds them—alongside recalled Walrus memories—to an LLM via OpenRouter to produce structured 24-hour trade setups.
- **24-Hour Signal Registry & Settlement:** Locks the live USD spot rate on signal creation (`POST /api/signals`) and evaluates the outcome (`TARGET_REACHED`, `INVALIDATED`, or `IN_PROGRESS`) against live rates and the latest Sui Mainnet checkpoint sequence number (`POST /api/signals/verify`).
- **Per-User Walrus Memory Vault:** Persists user-authored market patterns, signal creation facts, and 24-hour verification outcomes through [`lib/server/walrus.ts`](./lib/server/walrus.ts) using `@mysten-incubation/memwal`, isolated per authenticated Google account under the namespace `<MEMWAL_NAMESPACE>:<userId>`.

### How the Core Integrations Fit Together

1. **Tatum Market Data (`lib/server/tatum.ts`):**
   - Queries Tatum's v4 Exchange Rates API (`POST https://api.tatum.io/v4/data/rate/symbol/batch` and `GET https://api.tatum.io/v4/data/rate/symbol`) using `TATUM_API_KEY`.
   - Enriches quotes with 24-hour percentage changes and USD volume from live exchange feeds (`fetch24hDeltas()`).
2. **Tatum Sui RPC (`lib/server/tatum.ts`):**
   - [`fetchSuiNetworkTelemetry()`](./lib/server/tatum.ts) queries `https://sui-mainnet.gateway.tatum.io` (`sui_getLatestCheckpointSequenceNumber`) to surface live Sui Mainnet checkpoint sequence numbers and network telemetry.
   - During signal verification (`POST /api/signals/verify`), the current Sui checkpoint sequence number is recorded in the verification receipt and written to Walrus Memory.
3. **Walrus Memory (`lib/server/walrus.ts`):**
   - Uses `@mysten-incubation/memwal` (`MemWal.create`) configured with `MEMWAL_SERVER_URL`, `MEMWAL_ACCOUNT_ID`, and `MEMWAL_DELEGATE_KEY` (or `MEMWAL_PRIVATE_KEY`).
   - Calls `client.rememberAndWait(text, namespace, { timeoutMs: 30_000 })` when users store memories (`POST /api/walrus`), create signals (`POST /api/signals`), or verify signals (`POST /api/signals/verify`).
   - Calls `client.recall({ query, limit: topK, namespace })` during AI Assistant chat (`POST /api/ai/chat`), AI Chart Analysis (`POST /api/ai/chart-analysis`), and semantic search requests (`GET /api/walrus?query=...`).
4. **AI Model via OpenRouter (`app/api/ai/chat/route.ts` & `app/api/ai/chart-analysis/route.ts`):**
   - Sends structured prompts to `https://openrouter.ai/api/v1/chat/completions` (default model: `deepseek/deepseek-v4.1-flash`, configurable via `OPENROUTER_MODEL`).
   - Grounds model responses strictly on live spot prices, server-computed technical indicators, user signal ledger records, and recalled Walrus memories.

### Current Implementation Status

| Feature Area | Status | Implementation Reference & Notes |
| :--- | :--- | :--- |
| **Google OAuth & Route Protection** | **Implemented** | [`lib/auth.ts`](./lib/auth.ts), [`lib/auth.config.ts`](./lib/auth.config.ts), [`middleware.ts`](./middleware.ts). Protects `/dashboard`, `/markets`, `/signals`, `/history`, `/track-record`, `/memory`, and `/alerts`. |
| **Live Spot Prices & 24h Deltas** | **Implemented** | [`lib/server/tatum.ts`](./lib/server/tatum.ts), [`app/api/market/prices/route.ts`](./app/api/market/prices/route.ts). Tatum v4 batch/single rates enriched with 24h deltas (`cache: "no-store"`). |
| **Sui Checkpoint Telemetry** | **Implemented** | [`lib/server/tatum.ts`](./lib/server/tatum.ts), [`app/api/network/sui/route.ts`](./app/api/network/sui/route.ts). Tatum Sui RPC (`sui_getLatestCheckpointSequenceNumber`). |
| **Multi-Exchange OHLCV Candlesticks** | **Implemented** | [`app/api/market/candles/route.ts`](./app/api/market/candles/route.ts). Fetches `1H`, `4H`, `1D`, `1W` candles from KuCoin $\rightarrow$ Binance $\rightarrow$ Gate.io and renders via TradingView `lightweight-charts`. |
| **Server-Side Technical Indicators** | **Implemented** | [`lib/server/technical.ts`](./lib/server/technical.ts). Pure TypeScript calculation of `RSI(14)`, `EMA(9/20/50)`, `MACD(12,26,9)`, `Bollinger Bands(20,2)`, `ATR(14)`, and support/resistance. |
| **AI Technical Chart Scanner** | **Implemented** | [`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts), [`components/cards/CandlestickChart.tsx`](./components/cards/CandlestickChart.tsx). Combines live candles, Tatum spot price, calculated indicators, and top Walrus Memory recall into a structured JSON setup with 1-click signal registration. |
| **AI Trading Assistant Chat** | **Implemented** | [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts), [`components/layout/AIPanel.tsx`](./components/layout/AIPanel.tsx). Injects live prices, 4H indicators, user signals, local memories, and semantic Walrus recall into the OpenRouter system prompt. |
| **24h Signal Creation & On-Demand Settlement** | **Implemented (Manual Trigger)** | [`app/api/signals/route.ts`](./app/api/signals/route.ts), [`app/api/signals/verify/route.ts`](./app/api/signals/verify/route.ts). Locks live entry price on creation and settles via **"Check 24h Status"** button (`force: true` in UI) or API call. Automatic background cron settlement is **Planned**. |
| **Walrus Memory Ingestion & Semantic Recall** | **Implemented (Relayer Abstraction)** | [`lib/server/walrus.ts`](./lib/server/walrus.ts), [`app/api/walrus/route.ts`](./app/api/walrus/route.ts). Uses `@mysten-incubation/memwal` (`rememberAndWait` and `recall`) with per-user namespace `<base>:<userId>`. Local records store placeholder `blobId: "walrus-memory"` rather than individual Walrus blob IDs. |
| **Finnhub Crypto News Wire** | **Implemented (Optional Key)** | [`app/api/market/news/route.ts`](./app/api/market/news/route.ts), [`app/markets/page.tsx`](./app/markets/page.tsx). Streams live crypto headlines when `FINNHUB_API_KEY` is set. |
| **Custom Alerts CRUD** | **Partial (Storage Only)** | [`app/api/alerts/route.ts`](./app/api/alerts/route.ts), [`app/alerts/page.tsx`](./app/alerts/page.tsx). Authenticated users can create, toggle, and delete alerts in `data/alerts.json`, but automated condition evaluation and push notifications are **Planned**. |
| **On-Chain Portfolio Holdings** | **Planned** | [`app/track-record/page.tsx`](./app/track-record/page.tsx) displays a static `"No Wallet Connected"` card. Live wallet balance fetching is not implemented. |

---

## 2. Problem & Solution

| Market & Accountability Problem | SignalRecall Solution | Status | Code Reference |
| :--- | :--- | :--- | :--- |
| **1. Stateless AI Market Assistants**<br>Standard AI chat sessions forget prior trade setups, invalidation lessons, and asset-specific patterns across sessions. | **Per-User Walrus Memory Vault & Recall Injection**<br>Observations and trade outcomes are written to a user-scoped MemWal namespace (`signalrecall:<userId>`) and recalled via vector search into subsequent AI Chat and Chart Analysis prompts. | **Implemented** | [`lib/server/walrus.ts`](./lib/server/walrus.ts)<br>[`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts)<br>[`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) |
| **2. Unverifiable Post-Hoc Trade Calls**<br>Analysts often alter entry prices or cherry-pick winning calls after the fact without an objective timestamped price lock. | **Server-Locked Spot Entry & 24h Settlement Ledger**<br>Signal creation (`POST /api/signals`) ignores client-supplied entry prices and fetches the server-side spot quote via `fetchTatumRateResult()`. Settlement (`POST /api/signals/verify`) compares live spot price against `target` and `invalidation` and stamps the Sui checkpoint sequence number. | **Implemented** | [`app/api/signals/route.ts`](./app/api/signals/route.ts)<br>[`app/api/signals/verify/route.ts`](./app/api/signals/verify/route.ts)<br>[`lib/server/tatum.ts`](./lib/server/tatum.ts) |
| **3. Hallucinated Technical Indicators**<br>Asking an LLM to "analyze BTC chart" without feeding real OHLCV math causes fabricated RSI, EMA, or support levels. | **Deterministic Server-Side Indicator Pipeline**<br>Fetches 50 live OHLCV candles and computes exact `RSI(14)`, `EMA(9/20/50)`, `MACD`, `Bollinger Bands`, `ATR(14)`, and swing levels in TypeScript before invoking the LLM. | **Implemented** | [`lib/server/technical.ts`](./lib/server/technical.ts)<br>[`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) |
| **4. Cloud Datacenter Geo-Blocks**<br>Single-source candlestick APIs fail when cloud IPs are geo-blocked (HTTP 451). | **Multi-Exchange Candle Routing**<br>Candles route across KuCoin $\rightarrow$ Binance $\rightarrow$ Gate.io to ensure uninterrupted live OHLCV rendering. | **Implemented** | [`app/api/market/candles/route.ts`](./app/api/market/candles/route.ts) |
| **5. Multi-Tenant Data Leakage**<br>Demo apps often dump all users' signals and memories into a single global list. | **Google OAuth + Per-User Storage & Namespace Scoping**<br>NextAuth JWT sessions attach `session.user.id` to every signal, alert, and memory in `lib/server/storage.ts` and isolate Walrus Memory operations under `<MEMWAL_NAMESPACE>:<userId>`. | **Implemented** | [`lib/auth.ts`](./lib/auth.ts)<br>[`lib/server/storage.ts`](./lib/server/storage.ts)<br>[`lib/server/walrus.ts`](./lib/server/walrus.ts) |
| **6. Unattended 24h Settlement & Alert Triggers**<br>Traders want signals to settle automatically at `verifyAt` and alerts to fire when price crosses a threshold. | **Background Settlement Scheduler & Alert Watcher**<br>Currently, 24h verification is triggered on demand via the UI (`"Check 24h Status"`) or API, and alerts store static configuration. Automated cron settlement and live alert evaluation are planned for future iterations. | **Planned** | [`app/api/signals/verify/route.ts`](./app/api/signals/verify/route.ts)<br>[`app/api/alerts/route.ts`](./app/api/alerts/route.ts) |

---

## 3. How Walrus Memory Changes the Product

SignalRecall integrates the official Walrus Memory SDK (`@mysten-incubation/memwal` v0.1.14) in [`lib/server/walrus.ts`](./lib/server/walrus.ts) so that a trader's historical observations, recorded signals, and verified outcomes become part of future AI analysis.

### What SignalRecall Stores in Walrus Memory
Every write calls `rememberSignalMemory(text, userId)`, which invokes `client.rememberAndWait(text, namespace, { timeoutMs: 30_000 })` against the configured MemWal relayer (`MEMWAL_SERVER_URL`). There are **three active ingestion paths**:

1. **Manual Market Observations (`POST /api/walrus`):**
   When a signed-in user clicks **"Store Memory"** on `/memory`, the server formats and commits:
   ```text
   [<KIND>] <title> (<asset>): <body> Outcome: <outcome>
   ```
   On success, the server also saves a `Memory` record in `data/memories.json` for display in the Memory Vault UI.
2. **New 24h Signal Anchors (`POST /api/signals`):**
   When a user records a signal in the Trading Terminal (`/signals`) or clicks **"Turn Into 24h Signal"** inside the AI Chart Scanner drawer, the server captures the live entry price and commits:
   ```text
   Signal created: <asset> <direction> at entry $<entryPrice>, target $<finalTarget>, invalidation $<finalInvalidation>. Rationale: <rationale>.
   ```
3. **24h Verification Outcomes (`POST /api/signals/verify`):**
   When a signal is verified against live market rates and Sui telemetry, the server commits the settlement outcome:
   ```text
   Signal <asset> <direction>: Entry $<entry>, Settled $<settledPrice> -> Outcome: <status> (<pnlPct>%). Sui Checkpoint #<suiCheckpoint>.
   ```

### How Stored Memory Affects Later Analysis
When the user later interacts with SignalRecall's AI features, the server queries Walrus Memory before constructing the LLM prompt:

1. **In the AI Assistant Chat (`POST /api/ai/chat`):**
   - [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts) executes `recallSignalMemories(prompt, 5, 0.8, userId)` (which calls `client.recall({ query: prompt, limit: 5, namespace })`) in parallel with a keyword filter over `getStoredMemories(userId)` (`data/memories.json`).
   - Both the local keyword matches (`[Walrus Memory <blobId>] <title>: <body> (Outcome: <outcome>)`) and the semantic vector matches from the MemWal relayer (`[Walrus Memory Recall] <text>`) are injected into section **`3. WALRUS DECENTRALIZED MEMORY VAULT`** of the `systemPrompt`, alongside section **`4. USER SIGNAL LEDGER`** (the user's 5 most recent signals).
   - Keyword-matched entries from `data/memories.json` are also attached to the `ChatMessage.citations` array and rendered as citation pills below the assistant's reply in [`components/layout/AIPanel.tsx`](./components/layout/AIPanel.tsx).
2. **In the AI Technical Chart Scanner (`POST /api/ai/chart-analysis`):**
   - [`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) executes `recallSignalMemories("${symbol} setup pattern", 2, 0.8, userId)`.
   - If the user's MemWal namespace returns a match, the top result (`walrusRecall.results[0].text`) is injected into the `userPrompt` as `- Recalled Walrus Memory: <walrusSnippet>` alongside the live Tatum spot price and calculated `RSI`, `EMA`, `MACD`, `Bollinger Bands`, Support/Resistance, and `ATR`.
   - The returned `ChartAnalysisResult` includes `walrusMemoryCitation: walrusSnippet`, which [`components/cards/CandlestickChart.tsx`](./components/cards/CandlestickChart.tsx) displays in a highlighted **Walrus Memory Citation** banner inside the analysis drawer.

---

## 4. Environment Configuration

All environment variables in SignalRecall are read exclusively on the server. None are exposed to the browser via `NEXT_PUBLIC_*`.

### Active Environment Variables (Read by Code)

| Variable | Required? | Default / Fallback | Where Read in Code | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `TATUM_API_KEY` | **Required** | None (`isTatumConfigured()` returns `false` if unset) | [`lib/server/tatum.ts`](./lib/server/tatum.ts) (L48, L56, L134, L359) | Authenticates Tatum v4 Exchange Rate requests (`/v4/data/rate/symbol`, `/v4/data/rate/symbol/batch`) and Tatum Sui Mainnet JSON-RPC (`https://sui-mainnet.gateway.tatum.io`). Gates signal creation and verification. |
| `MEMWAL_SERVER_URL` | **Required** | None (`isMemWalConfigured()` returns `false` if unset) | [`lib/server/walrus.ts`](./lib/server/walrus.ts) (L22, L35, L50) | Relayer endpoint URL for `@mysten-incubation/memwal` (e.g., `https://relayer.memory.walrus.xyz`). |
| `MEMWAL_ACCOUNT_ID` | **Required** | None (`isMemWalConfigured()` returns `false` if unset) | [`lib/server/walrus.ts`](./lib/server/walrus.ts) (L21, L36, L49) | On-chain Sui `MemWalAccount` object ID (`0x...`) that owns the registered delegate key. |
| `MEMWAL_DELEGATE_KEY` | **Required*** | Falls back to `MEMWAL_PRIVATE_KEY` | [`lib/server/walrus.ts`](./lib/server/walrus.ts) (L20, L48) | Ed25519 delegate private key used by `MemWal` to sign relayer requests. (*Either `MEMWAL_DELEGATE_KEY` or `MEMWAL_PRIVATE_KEY` is required.) |
| `MEMWAL_PRIVATE_KEY` | Optional* | Used if `MEMWAL_DELEGATE_KEY` is unset | [`lib/server/walrus.ts`](./lib/server/walrus.ts) (L20, L48) | Alternate environment variable name for the Ed25519 MemWal delegate key. |
| `MEMWAL_NAMESPACE` | Optional | `"signalrecall"` | [`lib/server/walrus.ts`](./lib/server/walrus.ts) (L27) | Base namespace prefix for Walrus Memory. Combined with `userId` as `${MEMWAL_NAMESPACE}:${userId}`. |
| `OPENROUTER_API_KEY` | **Required** | None (AI routes return HTTP 400 if unset) | [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts) (L51), [`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) (L108) | Bearer token for OpenRouter (`https://openrouter.ai/api/v1/chat/completions`). |
| `OPENROUTER_MODEL` | Optional | `"deepseek/deepseek-v4.1-flash"` | [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts) (L157), [`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) (L109) | Overrides the OpenRouter LLM model identifier for AI Chat and Chart Analysis. |
| `AUTH_GOOGLE_ID` | **Required*** | Falls back to `GOOGLE_CLIENT_ID` | [`lib/auth.config.ts`](./lib/auth.config.ts) (L7), [`lib/auth.ts`](./lib/auth.ts) (L6) | Google OAuth 2.0 Web Client ID for Auth.js v5 sign-in. (*Either `AUTH_GOOGLE_ID` or `GOOGLE_CLIENT_ID` is required.) |
| `GOOGLE_CLIENT_ID` | Optional* | Used if `AUTH_GOOGLE_ID` is unset | [`lib/auth.config.ts`](./lib/auth.config.ts) (L7), [`lib/auth.ts`](./lib/auth.ts) (L6) | Legacy/alternate variable name for Google OAuth 2.0 Web Client ID. |
| `AUTH_GOOGLE_SECRET` | **Required*** | Falls back to `GOOGLE_CLIENT_SECRET` | [`lib/auth.config.ts`](./lib/auth.config.ts) (L8), [`lib/auth.ts`](./lib/auth.ts) (L7) | Google OAuth 2.0 Web Client Secret. (*Either `AUTH_GOOGLE_SECRET` or `GOOGLE_CLIENT_SECRET` is required.) |
| `GOOGLE_CLIENT_SECRET` | Optional* | Used if `AUTH_GOOGLE_SECRET` is unset | [`lib/auth.config.ts`](./lib/auth.config.ts) (L8), [`lib/auth.ts`](./lib/auth.ts) (L7) | Legacy/alternate variable name for Google OAuth 2.0 Web Client Secret. |
| `AUTH_SECRET` | **Required (Prod)** | Dev fallback string in code | [`lib/auth.config.ts`](./lib/auth.config.ts) (L39), [`lib/auth.ts`](./lib/auth.ts) (L31) | Secret key used by Auth.js (`next-auth`) to encrypt and sign JWT session cookies. Generate with `openssl rand -base64 33`. |
| `AUTH_URL` | Optional (Recommended) | `"https://signal-recall.up.railway.app"` in AI headers | [`app/api/ai/chat/route.ts`](./app/api/ai/chat/route.ts) (L159), [`app/api/ai/chart-analysis/route.ts`](./app/api/ai/chart-analysis/route.ts) (L155), Auth.js runtime | Canonical origin URL used by Auth.js OAuth callbacks and passed as `HTTP-Referer` to OpenRouter. Set to `http://localhost:3001` in local `.env`. |
| `FINNHUB_API_KEY` | Optional | Returns `configured: false, items: []` | [`app/api/market/news/route.ts`](./app/api/market/news/route.ts) (L15) | Fetches live crypto news headlines from Finnhub (`GET /api/v1/news?category=crypto`) for the `/markets` page. |
| `BINANCE_API_KEY` | Optional | Unauthenticated public requests | [`lib/server/tatum.ts`](./lib/server/tatum.ts) (L168, L240), [`app/api/market/candles/route.ts`](./app/api/market/candles/route.ts) (L80) | Attached as `X-MBX-APIKEY` header when querying Binance spot ticker, 24hr stats, and klines. |
| `CMC_PRO_API_KEY` | Optional | Skipped if unset | [`lib/server/tatum.ts`](./lib/server/tatum.ts) (L312) | Attached as `X-CMC_PRO_API_KEY` for 3rd-tier 24h delta fallback (`pro-api.coinmarketcap.com`) if both Binance and KuCoin fail. |

### Planned / Reserved Variables (Not Currently Read by Code)

The following variables appear in `.env.example` as reserved placeholders for future functionality and are **not** referenced by any current source file:
- `TATUM_ENV` — Endpoints in [`lib/server/tatum.ts`](./lib/server/tatum.ts) currently target Tatum v4 production and Sui Mainnet directly.
- `WALRUS_PUBLISHER_URL` / `WALRUS_AGGREGATOR_URL` — SignalRecall uses the `@mysten-incubation/memwal` relayer (`MEMWAL_SERVER_URL`) rather than direct Walrus HTTP publisher/aggregator calls.
- `GEMINI_API_KEY` — AI routes currently call OpenRouter (`OPENROUTER_API_KEY`).
- `CRYPTOPANIC_API_KEY` — News route currently uses Finnhub (`FINNHUB_API_KEY`).
- `CRYPTORANK_API_KEY` — Token vesting schedule endpoints are not implemented.

---

## 5. Local Installation & Setup

### Prerequisites
- **Node.js:** v22.x (v22.23.4+ recommended by `@mysten-incubation/memwal`) or v24.x
- **npm:** v10+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/opeyemi406/signalrecall.git
cd signalrecall
npm install
```

### 2. Configure Environment Variables
Copy [`.env.example`](./.env.example) to `.env` and populate your credentials:
```bash
cp .env.example .env
```
- **Google OAuth Setup:** In the [Google Cloud Console Credentials page](https://console.cloud.google.com/apis/credentials), create an OAuth 2.0 Web Application client and add the following **Authorized redirect URIs**:
  - `http://localhost:3001/api/auth/callback/google` (for local development on port 3001)
  - `https://signal-recall.up.railway.app/api/auth/callback/google` (for the hosted Railway deployment)
- **Credential Safety:** Both `.env` and `/data` (local runtime JSON storage) are listed in [`.gitignore`](./.gitignore) so neither secrets nor private user ledgers are committed to git.

### 3. Run Development Server or Production Build
```bash
# Start local development server on port 3001
npm run dev -- -p 3001

# Run strict TypeScript check
npm run typecheck

# Build production bundle
npm run build
```

---

## 6. Companion Documentation

For deeper technical, architectural, and evaluation details, see the companion guides in this repository:

- **[Judging Guide (`judging.md`)](./judging.md)** — Walkthrough of the end-to-end demo flow, Walrus Memory learning loop, Tatum Data & Sui RPC integration, reproducible `curl` verification commands, and technical disclosures.
- **[Walrus Blob & Memory Guide (`walrus-blob.md`)](./walrus-blob.md)** — Detailed trace of `@mysten-incubation/memwal` SDK calls (`MemWal.create`, `rememberAndWait`, `recall`), per-user namespace isolation (`signalrecall:<userId>`), memory text schemas, local `memories.json` mirroring, and error handling.
- **[Architecture Guide (`architecture.md`)](./architecture.md)** — System architecture diagrams, server/client security boundaries, complete route & component tables, data providers, and storage design.
- **[Environment Template (`.env.example`)](./.env.example)** — Sanitized environment variable template separating active variables from planned placeholders.
