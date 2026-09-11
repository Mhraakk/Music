import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const memory = new Map<string, { expires: number; body: string }>();
const DIR = join(tmpdir(), "resonant-everynoise");

function diskPath(key: string): string {
  return join(DIR, `${key.replace(/[^a-z0-9._-]+/gi, "_")}.html`);
}

function readDisk(key: string, ttlMs: number): string | null {
  try {
    const path = diskPath(key);
    const raw = readFileSync(path, "utf8");
    const stamp = Number(raw.slice(0, raw.indexOf("\n")));
    if (!Number.isFinite(stamp) || Date.now() - stamp > ttlMs) return null;
    return raw.slice(raw.indexOf("\n") + 1);
  } catch {
    return null;
  }
}

function writeDisk(key: string, body: string) {
  try {
    mkdirSync(DIR, { recursive: true });
    writeFileSync(diskPath(key), `${Date.now()}\n${body}`, "utf8");
  } catch {
    /* serverless FS may be read-only */
  }
}

let chain: Promise<void> = Promise.resolve();

function enqueue<T>(work: () => Promise<T>): Promise<T> {
  const run = chain.then(work, work);
  chain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export async function fetchEveryNoise(path: string, ttlMs: number): Promise<string | null> {
  const url = path.startsWith("http") ? path : `https://everynoise.com/${path.replace(/^\//, "")}`;
  const key = url.replace(/^https:\/\/everynoise\.com\//, "");
  const cached = memory.get(key);
  if (cached && cached.expires > Date.now()) return cached.body;
  const disk = readDisk(key, ttlMs);
  if (disk) {
    memory.set(key, { expires: Date.now() + ttlMs, body: disk });
    return disk;
  }

  return enqueue(async () => {
    const again = memory.get(key);
    if (again && again.expires > Date.now()) return again.body;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 18000);
    try {
      const json = /\.json(?:$|\?)/i.test(url);
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "user-agent": UA,
          accept: json ? "application/json,text/plain;q=0.9" : "text/html,application/xhtml+xml",
          "accept-language": "en-US,en;q=0.9",
          referer: "https://everynoise.com/",
        },
      });
      if (!response.ok) return null;
      const body = await response.text();
      if (body.length < 40 || /403 Forbidden|our sadness of 404/i.test(body)) return null;
      memory.set(key, { expires: Date.now() + ttlMs, body });
      writeDisk(key, body);
      return body;
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  });
}

export const MAP_TTL_MS = 1000 * 60 * 60 * 12;
export const PAGE_TTL_MS = 1000 * 60 * 60 * 6;
