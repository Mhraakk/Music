/**
 * CONVERSE TRANSPORT — /api/converse
 *
 * GET  → whether the operator key is present (never the key itself).
 * POST → one conversational turn. Optional `x-gemini-key` from Ask; never logged.
 */

import { NextResponse, type NextRequest } from "next/server";
import { converse } from "@/lib/converse/orchestrator";
import { roomCatalog } from "@/lib/converse/rooms";
import { geminiConfigured, geminiModel, redactSecrets } from "@/lib/mcp/gemini";
import type { ConverseMessage, ConverseSession } from "@/lib/converse/types";
import { parseFavoriteOverlay } from "@/lib/apple/overlay";
import { TOPOGRAPHY, type CoordinateId } from "@/lib/drift/topography";
import { AXIS_KEYS, vec, type EmotionalVector } from "@/lib/drift/ontology";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_KEY_CHARS = 200;
const MAX_MESSAGE_CHARS = 4000;
const COORDINATE_IDS = new Set(TOPOGRAPHY.map((c) => c.id));

export async function GET() {
  const configured = geminiConfigured();
  return NextResponse.json({
    configured,
    acceptsClientKey: true,
    model: configured ? geminiModel() : null,
    rooms: roomCatalog(),
    note: configured
      ? "Operator Gemini key is present. Ask will use it unless a device key is pasted."
      : "No operator Gemini key. Paste yours in Ask — it stays on this device and is sent only as x-gemini-key.",
  });
}

function readClientKey(request: NextRequest): string | null {
  const header = request.headers.get("x-gemini-key") ?? request.headers.get("x-resonant-gemini-key");
  if (!header) return null;
  const trimmed = header.trim();
  if (!trimmed || trimmed.length > MAX_KEY_CHARS) return null;
  return trimmed;
}

function parseMessages(raw: unknown): ConverseMessage[] {
  if (!Array.isArray(raw)) return [];
  const out: ConverseMessage[] = [];
  for (const row of raw.slice(-12)) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const role = rec.role === "assistant" ? "assistant" : rec.role === "user" ? "user" : null;
    const text = typeof rec.text === "string" ? rec.text.trim() : "";
    if (!role || !text) continue;
    out.push({ role, text: text.slice(0, MAX_MESSAGE_CHARS) });
  }
  return out;
}

function parseTasteVectors(raw: unknown): EmotionalVector[] {
  if (!Array.isArray(raw)) return [];
  const out: EmotionalVector[] = [];
  for (const row of raw.slice(-24)) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const partial: Partial<EmotionalVector> = {};
    let seen = 0;
    for (const key of AXIS_KEYS) {
      const n = rec[key];
      if (typeof n === "number" && Number.isFinite(n)) {
        partial[key] = n;
        seen += 1;
      }
    }
    if (seen >= 3) out.push(vec(partial));
  }
  return out;
}

function parseSession(raw: unknown): ConverseSession {
  const rec = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const dest = typeof rec.destination === "string" && COORDINATE_IDS.has(rec.destination as CoordinateId)
    ? (rec.destination as CoordinateId)
    : "cinematic_warmth";
  return {
    sessionId: typeof rec.sessionId === "string" ? rec.sessionId.slice(0, 80) : `ask_${Date.now()}`,
    currentTrackId: typeof rec.currentTrackId === "string" ? rec.currentTrackId : null,
    currentTitle: typeof rec.currentTitle === "string" ? rec.currentTitle : null,
    currentArtist: typeof rec.currentArtist === "string" ? rec.currentArtist : null,
    destination: dest,
    destinationLocked: rec.destinationLocked === true,
    historyIds: Array.isArray(rec.historyIds)
      ? rec.historyIds.filter((id): id is string => typeof id === "string").slice(-24)
      : [],
    overlay: parseFavoriteOverlay(rec.overlay),
    tasteVectors: parseTasteVectors(rec.tasteVectors),
  };
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Unreadable request." }, { status: 400 });
  }

  const rec = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
  const messages = parseMessages(rec.messages);
  if (!messages.some((m) => m.role === "user")) {
    return NextResponse.json({ ok: false, error: "Say something first." }, { status: 400 });
  }

  try {
    const result = await converse({
      messages,
      session: parseSession(rec.session),
      apiKey: readClientKey(request),
    });
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Conversation failed.";
    return NextResponse.json(
      { ok: false, error: redactSecrets(message), source: null },
      { status: 500 }
    );
  }
}
