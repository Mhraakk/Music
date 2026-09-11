/**
 * CODED TASTE MEMORY
 *
 * Hearts and refuses write a position in the seven-axis substrate. The score
 * is arithmetic, not a model: proximity to the like-centroid, distance from
 * the refuse-repel, and an artist penalty. Ask and drift read the same snapshot.
 *
 * Persistence is dual — IndexedDB plus a localStorage mirror — so a private
 * tab, a quota error, or a one-store wipe does not erase what the listener taught.
 *
 * This is not the classic skip DNA in dna.ts. Dislike never skips.
 */

import {
  AXIS_KEYS,
  centroid,
  clamp01,
  describeVector,
  emotionalDistance,
  lerpVector,
  vec,
  type EmotionalVector,
} from "@/lib/drift/ontology";

export const TASTE_LS_KEY = "resonant.taste.v1";
export const TASTE_DB_NAME = "resonant-taste";
const TASTE_DB_VERSION = 1;
const TASTE_STORE = "memory";
const TASTE_ROW = "snapshot";

export type TasteMark = {
  id: string;
  artist: string;
  vector: EmotionalVector;
};

export type TasteSnapshot = {
  version: 1;
  updatedAt: number;
  liked: TasteMark[];
  refused: TasteMark[];
  likedIds: string[];
  refusedIds: string[];
  likedArtists: Record<string, number>;
  refusedArtists: Record<string, number>;
  centroid: EmotionalVector | null;
  repel: EmotionalVector | null;
};

/** Compact payload the browser sends with drift / Ask / expansion. */
export type TasteWire = {
  version: 1;
  updatedAt: number;
  centroid: EmotionalVector | null;
  repel: EmotionalVector | null;
  likedIds: string[];
  refusedIds: string[];
  refusedArtists: string[];
  likedVectors: EmotionalVector[];
  refusedVectors: EmotionalVector[];
};

export function normaliseArtist(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export function emptyTaste(): TasteSnapshot {
  return {
    version: 1,
    updatedAt: 0,
    liked: [],
    refused: [],
    likedIds: [],
    refusedIds: [],
    likedArtists: {},
    refusedArtists: {},
    centroid: null,
    repel: null,
  };
}

function countArtists(marks: TasteMark[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of marks) {
    const key = normaliseArtist(row.artist);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

function uniqueMarks(rows: TasteMark[]): TasteMark[] {
  const seen = new Set<string>();
  const out: TasteMark[] = [];
  for (const row of rows) {
    if (!row.id || seen.has(row.id) || !row.vector) continue;
    seen.add(row.id);
    out.push({ id: row.id, artist: row.artist, vector: vec(row.vector) });
  }
  return out;
}

export function rebuildTaste(input: {
  liked?: Array<{ id: string; artist: string; vector?: EmotionalVector | null }>;
  refused?: Array<{ id: string; artist: string; vector?: EmotionalVector | null }>;
  previous?: TasteSnapshot | null;
}): TasteSnapshot {
  const previous = input.previous ?? emptyTaste();
  const previousLiked = new Map(previous.liked.map((row) => [row.id, row]));
  const previousRefused = new Map(previous.refused.map((row) => [row.id, row]));

  const liked = uniqueMarks(
    (input.liked ?? []).map((row) => ({
      id: row.id,
      artist: row.artist,
      vector: row.vector ?? previousLiked.get(row.id)?.vector ?? previousRefused.get(row.id)?.vector,
    })).filter((row): row is TasteMark => Boolean(row.vector))
  );

  const likedIds = new Set(liked.map((row) => row.id));
  const refused = uniqueMarks(
    (input.refused ?? [])
      .filter((row) => !likedIds.has(row.id))
      .map((row) => ({
        id: row.id,
        artist: row.artist,
        vector: row.vector ?? previousRefused.get(row.id)?.vector ?? previousLiked.get(row.id)?.vector,
      }))
      .filter((row): row is TasteMark => Boolean(row.vector))
  );

  return {
    version: 1,
    updatedAt: Date.now(),
    liked,
    refused,
    likedIds: liked.map((row) => row.id),
    refusedIds: refused.map((row) => row.id),
    likedArtists: countArtists(liked),
    refusedArtists: countArtists(refused),
    centroid: liked.length ? centroid(liked.map((row) => row.vector)) : null,
    repel: refused.length ? centroid(refused.map((row) => row.vector)) : null,
  };
}

/** Plant a heart. Removes the same id from refuse. */
export function applyLike(memory: TasteSnapshot, mark: TasteMark): TasteSnapshot {
  return rebuildTaste({
    liked: [...memory.liked.filter((row) => row.id !== mark.id), mark],
    refused: memory.refused.filter((row) => row.id !== mark.id),
    previous: memory,
  });
}

export function applyUnlike(memory: TasteSnapshot, id: string): TasteSnapshot {
  return rebuildTaste({
    liked: memory.liked.filter((row) => row.id !== id),
    refused: memory.refused,
    previous: memory,
  });
}

/** Refuse a recording. Removes the same id from hearts. Does not skip. */
export function applyDislike(memory: TasteSnapshot, mark: TasteMark): TasteSnapshot {
  return rebuildTaste({
    liked: memory.liked.filter((row) => row.id !== mark.id),
    refused: [...memory.refused.filter((row) => row.id !== mark.id), mark],
    previous: memory,
  });
}

export function applyUndislike(memory: TasteSnapshot, id: string): TasteSnapshot {
  return rebuildTaste({
    liked: memory.liked,
    refused: memory.refused.filter((row) => row.id !== id),
    previous: memory,
  });
}

/**
 * How well a candidate sits in what the listener has actually hearted and refused.
 * 0.5 is neutral (no memory yet). Hearts raise the score; refuses lower it.
 */
export function tasteScore(
  vector: EmotionalVector,
  memory: TasteSnapshot | TasteWire | null | undefined,
  artist?: string
): number {
  if (!memory) return 0.5;
  const centre = memory.centroid;
  if (!centre) {
    if (!memory.repel) return 0.5;
    const towardRepel = 1 - clamp01(emotionalDistance(vector, memory.repel) / 0.72);
    return clamp01(0.5 - towardRepel * 0.4 - artistPenalty(memory, artist));
  }

  const proximity = 1 - clamp01(emotionalDistance(vector, centre) / 0.72);
  const towardRepel = memory.repel
    ? 1 - clamp01(emotionalDistance(vector, memory.repel) / 0.72)
    : 0;
  return clamp01(proximity * 1.05 - towardRepel * 0.78 - artistPenalty(memory, artist));
}

function artistPenalty(memory: TasteSnapshot | TasteWire, artist?: string): number {
  if (!artist) return 0;
  const key = normaliseArtist(artist);
  if (!key) return 0;
  if (Array.isArray(memory.refusedArtists)) {
    return memory.refusedArtists.includes(key) ? 0.28 : 0;
  }
  const hits = memory.refusedArtists[key] ?? 0;
  return hits > 0 ? Math.min(0.48, 0.2 * hits) : 0;
}

/** Nudge an aim toward the like-centroid without abandoning the named destination. */
export function pullTowardTaste(
  aim: EmotionalVector,
  memory: TasteSnapshot | TasteWire | null | undefined,
  amount = 0.16
): EmotionalVector {
  if (!memory?.centroid) return aim;
  return lerpVector(aim, memory.centroid, clamp01(amount));
}

export function tasteNote(memory: TasteSnapshot | TasteWire | null | undefined): string | null {
  if (!memory?.centroid) return null;
  const n = memory.likedIds.length;
  if (!n) return null;
  return n === 1
    ? `One heart has settled ${describeVector(memory.centroid)}.`
    : `${n} hearts have settled ${describeVector(memory.centroid)}.`;
}

export function toTasteWire(memory: TasteSnapshot): TasteWire {
  return {
    version: 1,
    updatedAt: memory.updatedAt,
    centroid: memory.centroid,
    repel: memory.repel,
    likedIds: memory.likedIds.slice(-80),
    refusedIds: memory.refusedIds.slice(-80),
    refusedArtists: Object.keys(memory.refusedArtists).slice(0, 24),
    likedVectors: memory.liked.map((row) => row.vector).slice(-32),
    refusedVectors: memory.refused.map((row) => row.vector).slice(-24),
  };
}

function asVector(raw: unknown): EmotionalVector | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const partial: Partial<EmotionalVector> = {};
  let seen = 0;
  for (const key of AXIS_KEYS) {
    const n = rec[key];
    if (typeof n === "number" && Number.isFinite(n)) {
      partial[key] = n;
      seen += 1;
    }
  }
  return seen >= 3 ? vec(partial) : null;
}

function asIdList(raw: unknown, cap: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && id.length > 0).slice(0, cap);
}

export function parseTasteWire(raw: unknown): TasteWire | null {
  if (!raw || typeof raw !== "object") return null;
  const rec = raw as Record<string, unknown>;
  const centroidVec = asVector(rec.centroid);
  const repel = asVector(rec.repel);
  const likedVectors = Array.isArray(rec.likedVectors)
    ? rec.likedVectors.map(asVector).filter((v): v is EmotionalVector => Boolean(v)).slice(0, 32)
    : [];
  const refusedVectors = Array.isArray(rec.refusedVectors)
    ? rec.refusedVectors.map(asVector).filter((v): v is EmotionalVector => Boolean(v)).slice(0, 24)
    : [];
  const likedIds = asIdList(rec.likedIds, 80);
  const refusedIds = asIdList(rec.refusedIds, 80);
  const refusedArtists = asIdList(rec.refusedArtists, 24).map(normaliseArtist);
  if (!centroidVec && !repel && !likedVectors.length && !likedIds.length && !refusedIds.length) {
    return null;
  }
  return {
    version: 1,
    updatedAt: typeof rec.updatedAt === "number" ? rec.updatedAt : 0,
    centroid: centroidVec ?? (likedVectors.length ? centroid(likedVectors) : null),
    repel: repel ?? (refusedVectors.length ? centroid(refusedVectors) : null),
    likedIds,
    refusedIds,
    refusedArtists,
    likedVectors,
    refusedVectors,
  };
}

export function wireToSnapshot(wire: TasteWire | null | undefined): TasteSnapshot | null {
  if (!wire) return null;
  const liked = wire.likedVectors.map((vector, i) => ({
    id: wire.likedIds[i] ?? `liked-${i}`,
    artist: "",
    vector,
  }));
  const refused = wire.refusedVectors.map((vector, i) => ({
    id: wire.refusedIds[i] ?? `refused-${i}`,
    artist: wire.refusedArtists[i] ?? "",
    vector,
  }));
  return rebuildTaste({ liked, refused });
}

/* ──────────────────────────── persistence ──────────────────────────── */

let memoryCache: TasteSnapshot | null = null;

function writeLocalStorage(snapshot: TasteSnapshot): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TASTE_LS_KEY, JSON.stringify(toTasteWire(snapshot)));
  } catch {
    /* quota or private mode — IndexedDB may still hold it */
  }
}

function readLocalStorage(): TasteSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TASTE_LS_KEY);
    if (!raw) return null;
    return wireToSnapshot(parseTasteWire(JSON.parse(raw)));
  } catch {
    return null;
  }
}

function openTasteDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(TASTE_DB_NAME, TASTE_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TASTE_STORE)) {
        db.createObjectStore(TASTE_STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function persistTaste(snapshot: TasteSnapshot): Promise<TasteSnapshot> {
  memoryCache = snapshot;
  writeLocalStorage(snapshot);
  if (typeof indexedDB === "undefined") return snapshot;
  try {
    const db = await openTasteDb();
    const tx = db.transaction(TASTE_STORE, "readwrite");
    tx.objectStore(TASTE_STORE).put({ id: TASTE_ROW, ...toTasteWire(snapshot) });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* localStorage mirror already written */
  }
  return snapshot;
}

export async function loadPersistedTaste(): Promise<TasteSnapshot | null> {
  if (memoryCache) return memoryCache;
  if (typeof indexedDB !== "undefined") {
    try {
      const db = await openTasteDb();
      const row = await new Promise<unknown>((resolve, reject) => {
        const req = db.transaction(TASTE_STORE, "readonly").objectStore(TASTE_STORE).get(TASTE_ROW);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      db.close();
      const fromDb = wireToSnapshot(parseTasteWire(row));
      if (fromDb) {
        memoryCache = fromDb;
        writeLocalStorage(fromDb);
        return fromDb;
      }
    } catch {
      /* fall through to localStorage */
    }
  }
  const fromLs = readLocalStorage();
  if (fromLs) memoryCache = fromLs;
  return fromLs;
}

export function cachedTaste(): TasteSnapshot {
  return memoryCache ?? emptyTaste();
}

export function publishTasteCache(snapshot: TasteSnapshot): void {
  memoryCache = snapshot;
}
