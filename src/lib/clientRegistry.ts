/**
 * Client database registry stored in localStorage.
 * Stores server, database, and friendly name (no secrets).
 */

const REGISTRY_KEY = "geotab_client_registry";

export interface ClientEntry {
  id: string;
  server: string;
  database: string;
  friendlyName: string;
  createdAt: string;
}

function loadRegistry(): ClientEntry[] {
  try {
    const raw = localStorage.getItem(REGISTRY_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveRegistry(entries: ClientEntry[]) {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(entries));
}

export function listClients(): ClientEntry[] {
  return loadRegistry();
}

export function addClient(server: string, database: string, friendlyName: string): ClientEntry {
  const entries = loadRegistry();
  const id = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const entry: ClientEntry = {
    id,
    server: server.trim() || "my.geotab.com",
    database: database.trim(),
    friendlyName: friendlyName.trim() || `${database} @ ${server}`,
    createdAt: new Date().toISOString(),
  };
  entries.push(entry);
  saveRegistry(entries);
  return entry;
}

export function updateClient(id: string, updates: Partial<Pick<ClientEntry, "server" | "database" | "friendlyName">>): ClientEntry | null {
  const entries = loadRegistry();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx < 0) return null;
  entries[idx] = { ...entries[idx], ...updates };
  saveRegistry(entries);
  return entries[idx];
}

export function removeClient(id: string): boolean {
  const entries = loadRegistry().filter((e) => e.id !== id);
  if (entries.length === loadRegistry().length) return false;
  saveRegistry(entries);
  return true;
}

export function getClient(id: string): ClientEntry | null {
  return loadRegistry().find((e) => e.id === id) ?? null;
}
