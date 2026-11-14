# SignalRecall — Walrus Memory & Blob Storage Guide

This document explains how **SignalRecall** stores, encrypts, scopes, and recalls decentralized memories using the official **Walrus Memory SDK** (`@mysten-incubation/memwal` `v0.1.14`), based strictly on the implementation in [`lib/server/walrus.ts`](./lib/server/walrus.ts) and its API callers.

---

## 1. Architecture Abstraction: MemWal Relayer vs. Raw Walrus Blobs

SignalRecall **does not** upload or download raw Walrus blobs directly through the Walrus HTTP Publisher (`PUT /v1/blobs`) or Aggregator (`GET /v1/blobs/{blobId}`) endpoints. (Although `WALRUS_PUBLISHER_URL` and `WALRUS_AGGREGATOR_URL` exist as planned placeholders in `.env.example`, they are not read anywhere in application code.)

Instead, SignalRecall delegates all blob lifecycle operations to the **Walrus Memory SDK** (`MemWal` from `@mysten-incubation/memwal`) and its managed relayer (`MEMWAL_SERVER_URL`, e.g. `https://relayer.memory.walrus.xyz`):

1. **Client Initialization ([`getMemWalClient()`](./lib/server/walrus.ts#L43-L67)):**
   Creates and caches one `MemWal` instance per namespace in an in-memory `Map<string, MemWal>`:
   ```ts
   MemWal.create({
     key,       // MEMWAL_DELEGATE_KEY || MEMWAL_PRIVATE_KEY (Ed25519 delegate private key)
     accountId, // MEMWAL_ACCOUNT_ID (Sui MemWalAccount object ID)
     serverUrl, // MEMWAL_SERVER_URL (MemWal relayer base URL)
     namespace, // "<MEMWAL_NAMESPACE || 'signalrecall'>:<userId>"
   });
   ```
2. **Relayer Responsibilities (Handled by `@mysten-incubation/memwal`):**
   Per the `@mysten-incubation/memwal` SDK specification, the relayer handles vector embedding generation, **SEAL** encryption/decryption, uploading encrypted payloads as blobs to Walrus, and indexing vector metadata for semantic search.

---

## 2. Namespace Scoping & Encryption / Ownership Assumptions

### Namespace Construction ([`getUserNamespace()`](./lib/server/walrus.ts#L26-L29))
Every read and write passes an explicit namespace string derived from `MEMWAL_NAMESPACE` (default `"signalrecall"`) and the authenticated Google user's ID (`session.user.id`):
- **Authenticated User:** `${MEMWAL_NAMESPACE || "signalrecall"}:${userId}` (e.g., `signalrecall:1098234...`)
- **Unauthenticated / No `userId`:** `${MEMWAL_NAMESPACE || "signalrecall"}` (base namespace)

### Ownership & Isolation Model
- **Relayer & On-Chain Account (`MEMWAL_ACCOUNT_ID`):** SignalRecall operates with a single server-configured Sui `MemWalAccount` (`MEMWAL_ACCOUNT_ID`) authenticated by an Ed25519 delegate key (`MEMWAL_DELEGATE_KEY`). End users do **not** connect Sui wallets or hold their own MemWal delegate keys.
- **Per-User Partitioning:** User isolation is enforced at the application layer by:
  1. Requiring Google OAuth (`session.user.id`) on `POST /api/walrus` (returns HTTP `401` otherwise).
  2. Scoping `getStoredMemories(userId)` and `getStoredSignals(userId)` in [`lib/server/storage.ts`](./lib/server/storage.ts) by `userId`.
  3. Passing the user-specific `namespace` (`<base>:<userId>`) to `client.rememberAndWait()` and `client.recall()`.
- **Encryption Assumption:** Payloads are transmitted over HTTPS to `MEMWAL_SERVER_URL`, where the MemWal relayer encrypts payloads using SEAL tied to the server's `MEMWAL_ACCOUNT_ID` before storing them on Walrus. Users trust the SignalRecall server to enforce namespace isolation between Google accounts sharing that `MEMWAL_ACCOUNT_ID`.

---

## 3. Memory Ingestion Formats & Write Paths

All writes flow through [`rememberSignalMemory(text, userId)`](./lib/server/walrus.ts#L73-L95), which blocks up to `30,000 ms` (`rememberAndWait`) until the relayer completes embedding, encryption, and Walrus upload.

| Trigger Route | UI Action | Text Payload Format Sent to MemWal | Also Saved to `data/memories.json`? |
| :--- | :--- | :--- | :--- |
| **`POST /api/walrus`**<br>([`app/api/walrus/route.ts`](./app/api/walrus/route.ts)) | **Store Memory** modal on `/memory` | `[<KIND>] <title> (<asset>): <body> Outcome: <outcome>`<br>*(Kind defaults to `PATTERN`; `(<asset>)` and `Outcome:` omitted if empty.)* | **Yes** (`Memory` object with `blobId: "walrus-memory"`, `userId`, `storedAt`) |
| **`POST /api/signals`**<br>([`app/api/signals/route.ts`](./app/api/signals/route.ts)) | **Record Live 24h Signal** on `/signals` or **Turn Into 24h Signal** on chart drawer | `Signal created: <asset> <direction> at entry $<entryPrice>, target $<finalTarget>, invalidation $<finalInvalidation>. Rationale: <rationale>.` | **No** (Saved in `data/signals.json` with `memoryAudit.summary`) |
| **`POST /api/signals/verify`**<br>([`app/api/signals/verify/route.ts`](./app/api/signals/verify/route.ts)) | **Check 24h Status** button on `/signals` | `Signal <asset> <direction>: Entry $<entry>, Settled $<settledStr> -> Outcome: <status> (<pnlStr>). Sui Checkpoint #<suiCheckpoint \| "N/A">.` | **No** (Updates `data/signals.json` status & rationale) |

---

## 4. Semantic Retrieval & AI Context Injection

Reads flow through [`recallSignalMemories(query, topK, _maxDistance, userId)`](./lib/server/walrus.ts#L101-L136), which calls:
```ts
await client.recall({
  query,
  limit: topK,
  namespace, // "<MEMWAL_NAMESPACE>:<userId>"
});
```
*(Note: `_maxDistance` is accepted in the function signature for future filtering but is not passed to `client.recall()`.)*

### Call Sites
1. **AI Trading Assistant (`POST /api/ai/chat`):**
   - Calls `recallSignalMemories(prompt, 5, 0.8, userId)` in parallel with keyword matching over `getStoredMemories(userId)`.
   - Formats returned items as `[Walrus Memory Recall] <r.text>` inside section `3. WALRUS DECENTRALIZED MEMORY VAULT` of the OpenRouter system prompt.
   - Local keyword matches from `data/memories.json` populate `ChatMessage.citations` pills in [`components/layout/AIPanel.tsx`](./components/layout/AIPanel.tsx).
2. **AI Technical Chart Scanner (`POST /api/ai/chart-analysis`):**
   - Calls `recallSignalMemories("${symbol} setup pattern", 2, 0.8, userId)`.
   - Injects `walrusRecall.results[0].text` into the prompt as `- Recalled Walrus Memory: ...` and returns it as `walrusMemoryCitation` for display in the chart analysis drawer.
3. **Direct Semantic Search (`GET /api/walrus?query=<q>`):**
   - Calls `recallSignalMemories(query, 5, 0.8, userId)` and returns `{ success, namespace, results, error? }` as JSON.

---

## 5. Error Handling & Verification

### Error & Unconfigured Handling
- **Missing Credentials (`!isMemWalConfigured()`):**
  If `MEMWAL_SERVER_URL`, `MEMWAL_ACCOUNT_ID`, or (`MEMWAL_DELEGATE_KEY` / `MEMWAL_PRIVATE_KEY`) is missing:
  - `POST /api/walrus` returns HTTP `400` with `"Walrus Memory unconfigured: supply MEMWAL_SERVER_URL, MEMWAL_ACCOUNT_ID, and MEMWAL_DELEGATE_KEY in .env"`.
  - `GET /api/walrus?query=...` returns HTTP `400` with `{ configured: false, results: [] }`.
  - `POST /api/signals` does **not** fail; it still saves the signal locally and sets `memoryAudit.summary` to `"Local memory recorded (Walrus Memory not configured)"`.
  - `POST /api/signals/verify` returns `memwalRemembered: false` and includes `memwalError` without failing the verification response.
- **Relayer / Network Failure:**
  - `POST /api/walrus` returns HTTP `502` with `{ success: false, error: memwalRes.error }` and does **not** write to `data/memories.json`.
  - `recallSignalMemories()` catches exceptions and returns `{ success: false, namespace, results: [], error: msg }`, allowing AI routes to continue using live market data.

### How to Verify MemWal Integration
1. **Check Status Endpoint (Public Read):**
   ```bash
   curl -s https://signal-recall.up.railway.app/api/walrus
   ```
   Confirm `status.configured === true`, `status.serverUrl === "https://relayer.memory.walrus.xyz"`, and `status.namespace` is set.
2. **Verify Authenticated Write & Semantic Recall (Local Dev):**
   Sign in via Google on `http://localhost:3001`, create a memory on `/memory`, and then either:
   - Query `GET /api/walrus?query=<topic>` in your authenticated browser session to inspect the vector `results` and `distance` scores returned by the MemWal relayer.
   - Ask the **SignalRecall AI** assistant about the stored topic and confirm the recalled context appears in its answer.
