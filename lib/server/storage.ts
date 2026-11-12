import fs from "fs/promises";
import path from "path";
import type { Alert, Memory, ResolvedSignal, Signal, User } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const SIGNALS_FILE = path.join(DATA_DIR, "signals.json");
const ALERTS_FILE = path.join(DATA_DIR, "alerts.json");
const MEMORIES_FILE = path.join(DATA_DIR, "memories.json");

async function ensureDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Ignore if directory exists
  }
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  await ensureDir();
  try {
    const raw = await fs.readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    await fs.writeFile(filePath, JSON.stringify(fallback, null, 2), "utf-8");
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Users Storage (Persistent Registry for OAuth accounts)
// ---------------------------------------------------------------------------

export async function getAllUsers(): Promise<User[]> {
  return readJsonFile<User[]>(USERS_FILE, []);
}

export async function getUser(id: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find((u) => u.id === id) || null;
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const users = await getAllUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
}

export async function upsertUser(data: {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<User> {
  const users = await getAllUsers();
  const now = new Date().toISOString();
  const existingIdx = users.findIndex(
    (u) => u.id === data.id || u.email.toLowerCase() === data.email.toLowerCase()
  );

  if (existingIdx !== -1) {
    const existing = users[existingIdx];
    const updated: User = {
      ...existing,
      id: data.id || existing.id,
      email: data.email || existing.email,
      name: data.name ?? existing.name,
      image: data.image ?? existing.image,
      lastLoginAt: now,
    };
    users[existingIdx] = updated;
    await writeJsonFile(USERS_FILE, users);
    return updated;
  }

  const newUser: User = {
    id: data.id,
    email: data.email,
    name: data.name ?? null,
    image: data.image ?? null,
    createdAt: now,
    lastLoginAt: now,
  };
  users.push(newUser);
  await writeJsonFile(USERS_FILE, users);
  return newUser;
}

// ---------------------------------------------------------------------------
// Signals Storage (Active & Verified — Scoped to Signed-in User)
// ---------------------------------------------------------------------------

export async function getStoredSignals(userId?: string): Promise<Signal[]> {
  const all = await readJsonFile<Signal[]>(SIGNALS_FILE, []);
  if (!userId) return all;
  return all.filter((s) => s.userId === userId);
}

export async function saveSignal(signal: Signal, userId?: string): Promise<Signal> {
  if (userId) {
    signal.userId = userId;
  }
  const list = await readJsonFile<Signal[]>(SIGNALS_FILE, []);
  list.unshift(signal);
  await writeJsonFile(SIGNALS_FILE, list);
  return signal;
}

export async function updateSignal(
  id: string,
  patch: Partial<Signal>,
  userId?: string
): Promise<Signal | null> {
  const list = await readJsonFile<Signal[]>(SIGNALS_FILE, []);
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) return null;

  if (userId && list[idx].userId && list[idx].userId !== userId) {
    return null;
  }

  list[idx] = { ...list[idx], ...patch };
  await writeJsonFile(SIGNALS_FILE, list);
  return list[idx];
}

export async function getResolvedSignals(userId?: string): Promise<ResolvedSignal[]> {
  const all = await getStoredSignals(userId);
  return all
    .filter((s) => s.status === "TARGET_REACHED" || s.status === "INVALIDATED")
    .map((s) => ({
      id: s.id,
      userId: s.userId,
      asset: s.asset,
      pair: s.pair,
      direction: s.direction,
      entry: s.entry,
      target: s.target,
      settledPrice: s.target,
      status: s.status,
      createdAt: s.createdAt,
      verifiedAt: s.verifyAt,
      pnlPct:
        s.direction === "LONG"
          ? ((s.target - s.entry) / s.entry) * 100
          : ((s.entry - s.target) / s.entry) * 100,
      blobId: s.memoryAudit?.memoryIds?.[0] || "unanchored",
    }));
}

// ---------------------------------------------------------------------------
// Alerts Storage (Scoped to Signed-in User)
// ---------------------------------------------------------------------------

export async function getStoredAlerts(userId?: string): Promise<Alert[]> {
  const all = await readJsonFile<Alert[]>(ALERTS_FILE, []);
  if (!userId) return all;
  return all.filter((a) => a.userId === userId);
}

export async function saveAlert(alert: Alert, userId?: string): Promise<Alert> {
  if (userId) {
    alert.userId = userId;
  }
  const list = await readJsonFile<Alert[]>(ALERTS_FILE, []);
  list.unshift(alert);
  await writeJsonFile(ALERTS_FILE, list);
  return alert;
}

export async function toggleStoredAlert(id: string, userId?: string): Promise<Alert | null> {
  const list = await readJsonFile<Alert[]>(ALERTS_FILE, []);
  const idx = list.findIndex((a) => a.id === id);
  if (idx === -1) return null;

  if (userId && list[idx].userId && list[idx].userId !== userId) {
    return null;
  }

  list[idx].enabled = !list[idx].enabled;
  await writeJsonFile(ALERTS_FILE, list);
  return list[idx];
}

export async function deleteStoredAlert(id: string, userId?: string): Promise<boolean> {
  const list = await readJsonFile<Alert[]>(ALERTS_FILE, []);
  const target = list.find((a) => a.id === id);
  if (!target) return false;

  if (userId && target.userId && target.userId !== userId) {
    return false;
  }

  const next = list.filter((a) => a.id !== id);
  await writeJsonFile(ALERTS_FILE, next);
  return true;
}

// ---------------------------------------------------------------------------
// Memories Storage (Scoped to Signed-in User)
// ---------------------------------------------------------------------------

export async function getStoredMemories(userId?: string): Promise<Memory[]> {
  const all = await readJsonFile<Memory[]>(MEMORIES_FILE, []);
  if (!userId) return all;
  return all.filter((m) => m.userId === userId);
}

export async function saveMemory(memory: Memory, userId?: string): Promise<Memory> {
  if (userId) {
    memory.userId = userId;
  }
  const list = await readJsonFile<Memory[]>(MEMORIES_FILE, []);
  list.unshift(memory);
  await writeJsonFile(MEMORIES_FILE, list);
  return memory;
}
