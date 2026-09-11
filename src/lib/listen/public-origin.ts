/**
 * Public origin for /?listen= share links.
 * Browser Ask already sends window.location.origin. MCP hosts often do not.
 */

function trimSlash(value: string): string {
  return value.replace(/\/$/, "");
}

function asHttpUrl(value?: string | null): string {
  const text = value?.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return trimSlash(text);
  return "";
}

function vercelHost(value?: string | null): string {
  const text = value?.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return trimSlash(text);
  return `https://${trimSlash(text)}`;
}

export function publicAppOrigin(explicit?: string | null): string {
  return (
    asHttpUrl(explicit) ||
    asHttpUrl(process.env.NEXT_PUBLIC_APP_URL) ||
    asHttpUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    vercelHost(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
    vercelHost(process.env.VERCEL_URL)
  );
}
