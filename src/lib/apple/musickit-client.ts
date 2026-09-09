/**
 * MUSICKIT (BROWSER)
 *
 * Loads MusicKit JS on demand, mints a developer token from our server, and
 * asks the listener to authorize so we can read Favorite Songs.
 */

const SCRIPT = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

type MusicKitInstance = {
  authorize: () => Promise<string>;
  unauthorize?: () => Promise<void>;
  isAuthorized?: boolean;
};

declare global {
  interface Window {
    MusicKit?: {
      configure: (options: {
        developerToken: string;
        app: { name: string; build: string };
      }) => Promise<MusicKitInstance> | MusicKitInstance;
      getInstance: () => MusicKitInstance;
    };
  }
}

let configured = false;

function loadScript(): Promise<void> {
  if (window.MusicKit) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("MusicKit failed to load")));
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("MusicKit failed to load"));
    document.head.appendChild(script);
  });
}

export async function authorizeAppleMusic(): Promise<string> {
  const tokenRes = await fetch("/api/musickit/token");
  const tokenBody = (await tokenRes.json()) as { token?: string; error?: string; missing?: string[] };
  if (!tokenRes.ok || !tokenBody.token) {
    const missing = tokenBody.missing?.join(", ");
    throw new Error(
      missing
        ? `Apple MusicKit is not configured (${missing}).`
        : tokenBody.error ?? "Could not mint a MusicKit developer token."
    );
  }

  await loadScript();
  const MusicKit = window.MusicKit;
  if (!MusicKit) throw new Error("MusicKit did not initialise.");

  if (!configured) {
    await MusicKit.configure({
      developerToken: tokenBody.token,
      app: { name: "Resonant", build: "4.0.0" },
    });
    configured = true;
  }

  const music = MusicKit.getInstance();
  const userToken = await music.authorize();
  if (!userToken) throw new Error("Apple Music authorization was cancelled.");

  const session = await fetch("/api/musickit/session", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userToken }),
  });
  if (!session.ok) throw new Error("Could not store the Apple Music session.");
  return userToken;
}

export async function disconnectAppleMusic(): Promise<void> {
  await fetch("/api/musickit/session", { method: "DELETE" });
  try {
    await window.MusicKit?.getInstance().unauthorize?.();
  } catch {
    /* already gone */
  }
}
