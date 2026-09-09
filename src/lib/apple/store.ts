/**
 * IndexedDB cache of admitted Favorite Songs. Tens of thousands of positions
 * cannot live in React state or localStorage; this is the durable library.
 */

import type { LibraryTrack } from "@/lib/library";

const DB_NAME = "resonant-library";
const DB_VERSION = 1;
const STORE = "favorites";
const META = "meta";

export type LibraryMeta = {
  playlistId: string;
  offset: number;
  total: number | null;
  synced: number;
  updatedAt: number;
};

let memory: LibraryTrack[] | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadFavorites(): Promise<LibraryTrack[]> {
  if (memory) return memory;
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  const tracks = await new Promise<LibraryTrack[]>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as LibraryTrack[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  memory = tracks;
  return tracks;
}

export async function putFavorites(tracks: LibraryTrack[]): Promise<number> {
  if (!tracks.length) return (memory ?? []).length;
  if (typeof indexedDB === "undefined") {
    const map = new Map((memory ?? []).map((t) => [t.id, t]));
    for (const t of tracks) map.set(t.id, t);
    memory = [...map.values()];
    return memory.length;
  }
  const current = await loadFavorites();
  const map = new Map(current.map((t) => [t.id, t]));
  for (const t of tracks) map.set(t.id, t);
  memory = [...map.values()];
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  for (const t of tracks) store.put(t);
  await txDone(tx);
  db.close();
  return memory.length;
}

export async function readFavorite(id: string): Promise<LibraryTrack | null> {
  const all = await loadFavorites();
  return all.find((t) => t.id === id) ?? null;
}

export async function readMeta(): Promise<LibraryMeta | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await openDb();
  const meta = await new Promise<LibraryMeta | null>((resolve, reject) => {
    const req = db.transaction(META, "readonly").objectStore(META).get("sync");
    req.onsuccess = () => resolve((req.result as LibraryMeta) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return meta;
}

export async function writeMeta(meta: LibraryMeta): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const db = await openDb();
  const tx = db.transaction(META, "readwrite");
  tx.objectStore(META).put(meta, "sync");
  await txDone(tx);
  db.close();
}
