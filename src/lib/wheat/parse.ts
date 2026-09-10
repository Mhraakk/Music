/**
 * Pull recording hints from a Telegram music channel caption.
 *
 * @wheat1 has no public /s/ preview from this environment, so the working
 * path is: paste a post, or harvest if Telegram later exposes the widget.
 * Hints become Apple-first searches. Never treated as a stream URL.
 */

export type WheatHint = {
  query: string;
  via: "title" | "link";
};

const STOP = /^(https?:\/\/|t\.me\/|telegram|join|channel|wheat1|www\.)/i;

export function extractWheatHints(raw: string): WheatHint[] {
  const text = raw.replace(/\u00a0/g, " ").trim();
  if (!text) return [];
  const hints: WheatHint[] = [];
  const seen = new Set<string>();

  const remember = (query: string, via: WheatHint["via"]) => {
    const cleaned = cleanQuery(query);
    if (!cleaned) return;
    const key = cleaned.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    hints.push({ query: cleaned, via });
  };

  for (const match of text.matchAll(
    /https?:\/\/(?:open\.)?spotify\.com\/track\/[a-zA-Z0-9]+[^\s)]*/gi
  )) {
    remember(surroundingTitle(text, match.index ?? 0) || match[0], "link");
  }
  for (const match of text.matchAll(
    /https?:\/\/music\.apple\.com\/[^\s)]+/gi
  )) {
    remember(surroundingTitle(text, match.index ?? 0) || "apple music", "link");
  }
  for (const match of text.matchAll(
    /https?:\/\/(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/gi
  )) {
    remember(surroundingTitle(text, match.index ?? 0) || "", "link");
  }

  const stripped = text
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/t\.me\/\S+/gi, " ")
    .replace(/#[\w\u0600-\u06FF]+/g, " ");

  for (const line of stripped.split(/\n+| \| | \u2013 | \u2014 /)) {
    const dash = line.match(/^\s*(.{2,80}?)\s[-–—]\s(.{2,80}?)\s*$/);
    if (dash) {
      remember(`${dash[1]} ${dash[2]}`, "title");
      continue;
    }
    const fa = line.match(/^\s*(.{2,80}?)\s+[-–—]\s+(.{2,80}?)\s*$/);
    if (fa) remember(`${fa[1]} ${fa[2]}`, "title");
  }

  if (!hints.length) {
    const compact = cleanQuery(stripped);
    if (compact && compact.split(/\s+/).length >= 2) remember(compact, "title");
  }

  return hints.slice(0, 12);
}

function surroundingTitle(text: string, index: number): string {
  const before = text.slice(Math.max(0, index - 140), index);
  const line = before.split(/\n/).pop() ?? "";
  return cleanQuery(line.replace(/[-–—:]\s*$/, ""));
}

function cleanQuery(value: string): string {
  const trimmed = value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed || STOP.test(trimmed)) return "";
  if (trimmed.length < 3 || trimmed.length > 120) return "";
  return trimmed;
}

export function parseTelegramWidget(html: string): string[] {
  const captions: string[] = [];
  const blocks = html.matchAll(
    /class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  );
  for (const block of blocks) {
    const text = block[1]
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+\n/g, "\n")
      .trim();
    if (text) captions.push(text);
  }
  const docs = html.matchAll(
    /class="tgme_widget_message_document_title[^"]*"[^>]*>([\s\S]*?)<\/div>/gi
  );
  for (const doc of docs) {
    const text = doc[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    if (text) captions.push(text);
  }
  return captions.slice(0, 24);
}
