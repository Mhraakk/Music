/**
 * Recordings and moods the listener refused on Resonant.
 * Lives only in this browser. Harvests send the ids as exclude.
 * Does not skip the track that is already sounding.
 */

import type { CoordinateId } from "@/lib/drift/topography";
import type { LibraryTrack } from "@/lib/library";
import type { EmotionalVector } from "@/lib/drift/ontology";

const DB_NAME = "resonant-refused";
const DB_VERSION = 2;
const STORE = "refused";

export type RefusedRecord = {
  id: string;
  region: CoordinateId;
  artist: string;
  title: string;
  at: number;
  /** Substrate position so refuse still repels after reload. */
  vector?: EmotionalVector;
};

let memory: RefusedRecord[] | null = null;

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

export async function loadRefused(): Promise<RefusedRecord[]> {
  if (memory) return memory;
  if (typeof indexedDB === "undefined") return [];
  const db = await openDb();
  const rows = await new Promise<RefusedRecord[]>((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as RefusedRecord[]) ?? []);
    req.onerror = () => reject(req.error);
  });
  db.close();
  memory = rows;
  return rows;
}

export async function saveRefused(rows: RefusedRecord[]): Promise<RefusedRecord[]> {
  memory = rows;
  if (typeof indexedDB === "undefined") return rows;
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);
  store.clear();
  for (const row of rows) store.put(row);
  await txDone(tx);
  db.close();
  return rows;
}

export async function toggleRefused(
  track: LibraryTrack
): Promise<{ records: RefusedRecord[]; refused: boolean }> {
  const current = await loadRefused();
  const exists = current.some((row) => row.id === track.id);
  const next = exists
    ? current.filter((row) => row.id !== track.id)
    : [
        ...current,
        {
          id: track.id,
          region: track.region,
          artist: track.artist,
          title: track.title,
          at: Date.now(),
          vector: track.vector,
        },
      ];
  await saveRefused(next);
  return { records: next, refused: !exists };
}

export function roomsFromRefused(rows: { region: CoordinateId }[]): CoordinateId[] {
  return [...new Set(rows.map((row) => row.region))];
}
