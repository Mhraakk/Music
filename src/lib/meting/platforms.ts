/**
 * Named 网易 / QQ / 酷狗 / 酷我 catalog — Meting-fit, not Meting's client.
 *
 * Meting-Agent reverse-engineers those platforms (EAPI, cookies, play URLs).
 * Resonant only detects when the listener named one, strips the token so Apple
 * search still works, and builds a public website search link. No unofficial
 * API, no crypto, no playback URL.
 */

export type MetingPlatform = "netease" | "tencent" | "kugou" | "kuwo";

export const METING_LABEL: Record<MetingPlatform, string> = {
  netease: "NetEase",
  tencent: "QQ Music",
  kugou: "KuGou",
  kuwo: "Kuwo",
};

const PLATFORM_PATTERNS: { platform: MetingPlatform; pattern: string }[] = [
  { platform: "netease", pattern: String.raw`网易云音乐|网易云|網易雲音樂|網易雲|netease(?:\s*cloud)?(?:\s*music)?` },
  { platform: "tencent", pattern: String.raw`qq\s*音乐|qq\s*音樂|qq\s*music|腾讯音乐|騰訊音樂|tencent\s*music` },
  { platform: "kugou", pattern: String.raw`酷狗音乐|酷狗音樂|\bkugou\b|酷狗` },
  { platform: "kuwo", pattern: String.raw`酷我音乐|酷我音樂|\bkuwo\b|酷我` },
];

const CATALOG_SCRIPT = /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/;

export function hasCatalogScript(text: string): boolean {
  return CATALOG_SCRIPT.test(text);
}

export function namedMetingPlatform(text: string): MetingPlatform | null {
  for (const row of PLATFORM_PATTERNS) {
    if (new RegExp(row.pattern, "i").test(text)) return row.platform;
  }
  return null;
}

export function wantsMetingPlatform(text: string): boolean {
  return namedMetingPlatform(text) !== null;
}

export function stripMetingTokens(text: string): string {
  let out = text;
  for (const row of PLATFORM_PATTERNS) {
    out = out.replace(new RegExp(row.pattern, "gi"), " ");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function metingSearchUrl(platform: MetingPlatform, keyword: string): string | null {
  const q = keyword.trim();
  if (!q) return null;
  const encoded = encodeURIComponent(q);
  switch (platform) {
    case "netease":
      return `https://music.163.com/#/search/m/?s=${encoded}`;
    case "tencent":
      return `https://y.qq.com/n/ryqq/search?w=${encoded}`;
    case "kugou":
      return `https://www.kugou.com/yy/html/search.html#searchType=song&searchKeyWord=${encoded}`;
    case "kuwo":
      return `https://www.kuwo.cn/search/list?key=${encoded}`;
  }
}

export function metingCatalogFor(query: string, artist: string, title: string): {
  platform: MetingPlatform;
  url: string;
  label: string;
} | null {
  const platform = namedMetingPlatform(query);
  if (!platform) return null;
  const needle = `${artist} ${title}`.trim() || stripMetingTokens(query);
  const url = metingSearchUrl(platform, needle);
  if (!url) return null;
  return { platform, url, label: METING_LABEL[platform] };
}
