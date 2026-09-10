/**
 * Recordings the listener marked on Resonant.
 * Separate from Apple Music Favorite Songs (synced playlist).
 * Lives only in this browser and is sent as a per-request overlay.
 */

import type { LibraryTrack } from "@/lib/library";

const DB_NAME = "resonant-loved";
const DB_VERSION = 1;
const STORE = "loved";

let memory: LibraryTrack[] | null = null;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
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

export async function loadLoved(): Promise<LibraryTrack[]> {
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

export async function saveLoved(tracks: LibraryTrack[]): Promise<LibraryTrack[]> {
  memory = tracks;
  if (typeof indexedDB === "undefined") return tracks;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const track of tracks) store.put(track);
  await txDone(tx);
  db.close();
  return tracks;
}

export async function toggleLoved(track: LibraryTrack): Promise<{ tracks: LibraryTrack[]; liked: boolean }> {
  const current = await loadLoved();
  const exists = current.some((row) => row.id === track.id);
  const next = exists ? current.filter((row) => row.id !== track.id) : [...current, track];
  await saveLoved(next);
  return { tracks: next, liked: !exists };
}

export function lovedNote(track: LibraryTrack): string {
  if (track.note.includes("Loved on Resonant")) return track.note;
  return track.note ? `${track.note} · Loved on Resonant` : "Loved on Resonant";
}
