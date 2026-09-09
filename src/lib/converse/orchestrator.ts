/**
 * ASK ORCHESTRATOR
 *
 * Gemini function-calling loop. find_music searches Deezer, YouTube, YouTube
 * Music, SoundCloud and Apple. The Resonant catalog is optional. If no key is
 * present, the same tools still run so the listener is never stranded.
 */

import { geminiGenerate, geminiModel, resolveGeminiApiKey, type GeminiContent } from "@/lib/mcp/gemini";
import { CONVERSE_SYSTEM, localSuggestions, sessionBlock } from "./prompt";
import { CONVERSE_TOOLS, createToolContext, executeConverseTool, searchTracks, type ToolContext } from "./tools";
import { collection } from "@/lib/library";
import { TOPOGRAPHY } from "@/lib/drift/topography";
import { detectLanguage, interpretLocal, wantsPlayback, type ListenerLanguage } from "./intent";
import { sourceLabel } from "./anywhere";
import type { ConverseMessage, ConverseResult, ConverseSession } from "./types";

const MAX_ROUNDS = 5;

function lastUserText(messages: ConverseMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user" && messages[i].text.trim()) return messages[i].text.trim();
  }
  return "";
}

function contentsFrom(messages: ConverseMessage[]): GeminiContent[] {
  const history: GeminiContent[] = [];
  for (const message of messages.slice(-12)) {
    history.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    });
  }
  return history;
}

function hasPlayEffect(ctx: ToolContext): boolean {
  return ctx.effects.some((e) => e.type === "play" || e.type === "queue");
}

async function ensurePlayback(ctx: ToolContext, userText: string) {
  if (!wantsPlayback(userText) || hasPlayEffect(ctx)) return;
  if (ctx.lastSearch[0]) {
    await executeConverseTool("play_tracks", { ids: ctx.lastSearch.map((t) => t.id).slice(0, 8) }, ctx);
    return;
  }
  const intent = interpretLocal(userText);
  if (intent.kind === "station" || intent.kind === "destination") {
    await executeConverseTool("start_station", { room: intent.room }, ctx);
    if (hasPlayEffect(ctx)) return;
  }
  if (intent.kind === "alternative") {
    await executeConverseTool("play_alternative", {}, ctx);
    if (hasPlayEffect(ctx)) return;
  }
  await executeConverseTool("find_music", { query: userText, limit: 8 }, ctx);
  if (ctx.lastSearch[0]) {
    await executeConverseTool(
      "play_tracks",
      { ids: ctx.lastSearch.map((t) => t.id).slice(0, 8), title: userText.slice(0, 48) },
      ctx
    );
    return;
  }
  const tracks = searchTracks(ctx, userText, 6);
  if (tracks[0]) await executeConverseTool("play_tracks", { ids: tracks.map((t) => t.id), title: userText.slice(0, 40) }, ctx);
}

function replyForLocal(lang: ListenerLanguage, ctx: ToolContext, userText: string): string {
  const play = ctx.effects.find((e) => e.type === "play");
  const queue = ctx.effects.find((e) => e.type === "queue");
  const dest = ctx.effects.find((e) => e.type === "destination");
  const roomLabel = dest ? TOPOGRAPHY.find((r) => r.id === dest.id)?.label : null;
  const via = play ? sourceLabel(play.track.foundVia) : null;

  if (play && lang === "fa") {
    const extra = queue ? ` ${queue.tracks.length} آهنگ دیگر هم در همین ست هست.` : "";
    const where = via ? ` از ${via}.` : "";
    const room = roomLabel ? ` حس ${roomLabel}.` : "";
    return `این را پیدا کردم: ${play.track.artist} — ${play.track.title}.${where}${room}${extra} اگر چیز دیگری می‌خواهی، همان را بگو.`;
  }
  if (play) {
    const extra = queue ? ` ${queue.tracks.length} more follow in this set.` : "";
    const where = via ? ` From ${via}.` : "";
    const room = roomLabel ? ` ${roomLabel}.` : "";
    return `Here's ${play.track.title} by ${play.track.artist}.${where}${room}${extra} Say if you want something else.`;
  }

  if (dest && lang === "fa") {
    return `مقصد را روی ${roomLabel} گذاشتم. وقتی آهنگ تمام شود، از همان حس ادامه می‌دهیم.`;
  }
  if (dest) {
    return `Heading toward ${roomLabel}. When this song ends, the engine continues from that room.`;
  }

  if (lang === "fa") {
    return `هنوز چیزی برای «${userText.slice(0, 80)}» پیدا نکردم. اسم آهنگ، خواننده، دهه یا منبع را بگو — یوتیوب، ساوندکلاد، دیزر.`;
  }
  return `I haven't found a match for “${userText.slice(0, 80)}” yet. Name a song, artist, decade, or a source — YouTube, SoundCloud, Deezer.`;
}

export async function fulfillLocally(
  messages: ConverseMessage[],
  session: ConverseSession
): Promise<ConverseResult> {
  const userText = lastUserText(messages);
  const lang = detectLanguage(userText);
  const ctx = createToolContext(session);
  const intent = interpretLocal(userText || "warm");

  switch (intent.kind) {
    case "station":
      await executeConverseTool("start_station", { room: intent.room }, ctx);
      break;
    case "destination":
      await executeConverseTool("set_destination", { room: intent.room }, ctx);
      break;
    case "playlist":
      await executeConverseTool(
        "make_playlist",
        { query: intent.query, room: intent.room ?? undefined, title: lang === "fa" ? "میکس تو" : "Your mix" },
        ctx
      );
      break;
    case "expand":
      await executeConverseTool("expand_taste", { play: true }, ctx);
      break;
    case "alternative":
      await executeConverseTool("play_alternative", {}, ctx);
      break;
    case "play":
    case "search": {
      if (intent.room && intent.kind === "play" && !/دهه|\b\d0s\b|\b19\d\d|\b20\d\d|youtube|یوتیوب|ساوند|deezer|دیزر/i.test(intent.query)) {
        await executeConverseTool("start_station", { room: intent.room }, ctx);
      }
      if (!hasPlayEffect(ctx)) {
        await executeConverseTool("find_music", { query: intent.query, limit: 8 }, ctx);
        if (ctx.lastSearch.length) {
          await executeConverseTool(
            "play_tracks",
            { ids: ctx.lastSearch.map((t) => t.id).slice(0, 8), title: intent.query.slice(0, 48) },
            ctx
          );
        }
      }
      break;
    }
    case "chat": {
      await executeConverseTool("find_music", { query: intent.query || userText, limit: 8 }, ctx);
      if (ctx.lastSearch.length && wantsPlayback(userText)) {
        await executeConverseTool("play_tracks", { ids: ctx.lastSearch.map((t) => t.id).slice(0, 8) }, ctx);
      }
      break;
    }
  }

  await ensurePlayback(ctx, userText);

  return {
    ok: true,
    source: "local",
    reply: replyForLocal(lang, ctx, userText),
    model: null,
    effects: ctx.effects,
    suggestions: localSuggestions(lang),
    note: "Gemini is not in this turn — open search still ran.",
  };
}

export async function converse(input: {
  messages: ConverseMessage[];
  session: ConverseSession;
  apiKey?: string | null;
}): Promise<ConverseResult> {
  const messages = input.messages.filter((m) => m.text.trim()).slice(-12);
  const userText = lastUserText(messages);
  if (!userText) {
    const lang: ListenerLanguage = "en";
    return {
      ok: true,
      source: "local",
      reply: "Ask for a song, a decade, an artist, or a mix — from anywhere.",
      model: null,
      effects: [],
      suggestions: localSuggestions(lang),
    };
  }

  const key = resolveGeminiApiKey(input.apiKey);
  if (!key) {
    return fulfillLocally(messages, input.session);
  }

  const ctx = createToolContext(input.session);
  const contents = contentsFrom(messages);
  const system = `${CONVERSE_SYSTEM}\n\n${sessionBlock(input.session)}`;
  let lastText = "";
  let modelName: string | null = geminiModel();
  let lastError: string | null = null;

  for (let round = 0; round < MAX_ROUNDS; round += 1) {
    const lastRound = round === MAX_ROUNDS - 1;
    const outcome = await geminiGenerate({
      system,
      contents,
      tools: CONVERSE_TOOLS,
      toolMode: lastRound ? "NONE" : "AUTO",
      temperature: 0.65,
      timeoutMs: 18000,
      apiKey: key,
    });

    if (!outcome.ok) {
      lastError = outcome.reason;
      break;
    }

    modelName = outcome.model;
    lastText = outcome.text;

    if (!outcome.functionCalls.length) {
      break;
    }

    contents.push({ role: "model", parts: outcome.parts });

    const responseParts = [];
    for (const call of outcome.functionCalls.slice(0, 4)) {
      const result = await executeConverseTool(call.name, call.args, ctx);
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: result,
          ...(call.id ? { id: call.id } : {}),
        },
      });
    }
    contents.push({ role: "user", parts: responseParts });
  }

  await ensurePlayback(ctx, userText);

  if (lastText.trim()) {
    return {
      ok: true,
      source: "gemini",
      reply: lastText.trim(),
      model: modelName,
      effects: ctx.effects,
      suggestions: localSuggestions(detectLanguage(userText)),
    };
  }

  if (ctx.effects.length) {
    const lang = detectLanguage(userText);
    return {
      ok: true,
      source: lastError ? "local" : "gemini",
      reply: replyForLocal(lang, ctx, userText),
      model: modelName,
      effects: ctx.effects,
      suggestions: localSuggestions(lang),
      note: lastError ? `Gemini stopped early (${lastError}).` : undefined,
    };
  }

  const local = await fulfillLocally(messages, input.session);
  return {
    ...local,
    note: lastError ? `Gemini unavailable (${lastError}). Open search continued.` : local.note,
  };
}

export function emptyRoomFallback(roomId: string) {
  return collection(roomId)?.tracks[0] ?? null;
}
