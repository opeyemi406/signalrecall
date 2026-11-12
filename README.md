# SignalRecall — Trading Calls with Walrus Memory and 24h Tatum Settlement

**SignalRecall** is a trading intelligence platform built for the **Tatum × Walrus Total Recall Hackathon** (Track 1: Markets & Sports Prediction + Best Walrus Memory).

It combines:
1. **Live Multi-Chain Market Telemetry** (`lib/server/tatum.ts` & `lib/tatum.ts`)
2. **Per-User Cross-Session Walrus Memory** (`lib/server/walrus.ts` via `@mysten-incubation/memwal`)
3. **24-Hour Objective Signal Settlement** (read-only price settlement 24 hours after each recorded call; no trade execution)
4. **Google OAuth Workspace Isolation** (`Auth.js v5` / `next-auth@beta`)

---

## Tech Stack
- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript (strict)
- **Authentication:** Auth.js v5 (`next-auth@beta`) with Google provider & route protection middleware
- **Styling:** Tailwind CSS v4 + CSS variables (`app/globals.css`)
- **UI Primitives:** Radix UI (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-switch`, `@radix-ui/react-slot`) + `lucide-react`
- **Charts & Motion:** TradingView `lightweight-charts` (candlesticks), `framer-motion`

---

## Running Locally

```bash
git clone https://github.com/opeyemi406/signalrecall.git
cd signalrecall
npm install
npm run dev -- -p 3001
```

Open [http://localhost:3001](http://localhost:3001).

---

## Environment Variables & Google OAuth Setup

Configure the following environment variables in `.env`:

```env
# Google OAuth & Auth.js v5
AUTH_SECRET=your_32_byte_secret_here
AUTH_URL=http://localhost:3001
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Tatum Data API & Sui Gateway
TATUM_API_KEY=your_tatum_api_key
TATUM_ENV=mainnet

# Walrus Memory (@mysten-incubation/memwal)
MEMWAL_SERVER_URL=https://relayer.memory.walrus.xyz
MEMWAL_ACCOUNT_ID=0x...
MEMWAL_DELEGATE_KEY=0x...
MEMWAL_NAMESPACE=signalrecall
```

### Authorized Redirect URIs in Google Cloud Console
When configuring your OAuth 2.0 Web Client in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), add these **Authorized redirect URIs**:
- `https://signal-recall.up.railway.app/api/auth/callback/google`
- `http://localhost:3001/api/auth/callback/google`
