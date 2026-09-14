#!/usr/bin/env node
/**
 * Parser lock for Every Noise HTML, plus optional live /api/atlas checks.
 */

const fixture = `
<div class=canvas role=main style="width: 1532px; height: 936px; top: 64px">
<div id=item1 preview_url="https://p.scdn.co/mp3-preview/abc" class="genre scanme" scan=true style="color: #ad8907; top: 100px; left: 80px; font-size: 160%" onclick="playx(&quot;1V6gIisPpYqgFeWbMLI0bA&quot;, &quot;trip hop&quot;, this);" title="e.g. The Herbaliser &quot;The Sensual Woman&quot;">trip hop<a class=navlink href="engenremap-triphop.html">&raquo;</a></div>
<div id=item2 preview_url="https://p.scdn.co/mp3-preview/def" class="genre scanme" scan=true style="color: #9994a5; top: 220px; left: 610px; font-size: 150%" onclick="playx(&quot;67Hna13dNDkZvBpTXRIaOJ&quot;, &quot;Massive Attack&quot;, this);" title="e.g. Massive Attack &quot;Teardrop&quot;">Massive Attack<a class=navlink href="artistprofile.html?id=6FXMGgJwohJLUSr5nVlf9X">&raquo;</a></div>
<div id=nearbyitem1 class="genre" style="color: #9f876f; top: 10px; left: 20px; font-size: 120%" onclick="playx(&quot;abcabcabcabcabcabcabca&quot;, &quot;downtempo&quot;, this);">downtempo<a class=navlink href="engenremap-downtempo.html#tunnel">&raquo;</a></div>
<div id=mirroritem1 class="genre" style="color: #c0c166; top: 181px; left: 108px; font-size: 160%" onclick="playx(&quot;7hZRgQiZEKf1e8KTEVIkQN&quot;, &quot;gospel&quot;, this);">gospel<a class=navlink href="engenremap-gospel.html#tunnel">&raquo;</a></div>
<a href="https://open.spotify.com/playlist/2wrc23l7JdQVcpPIcDGaed" title="listen to The Sound of Trip Hop on Spotify">playlist</a>
<a href="https://open.spotify.com/user/particledetector/playlist/4ulIuRZHRfr110SYS4t2ja" title="listen to a shorter introduction to this genre">intro</a>
<a href="https://open.spotify.com/user/particledetector/playlist/4Shfw6GieZBQ4SE56JdtlB" title="listen to this genre's fans' current favorites">pulse</a>
<a href="https://open.spotify.com/user/particledetector/playlist/25fg4SKVqbC1JMoKRkE1ct" title="listen to this genre's fans' new discoveries">edge</a>
<a href="nrbg.html?genre=trip%20hop">new</a>
`;

const lookup = `
<form action="lookup.cgi" method="GET">find artist <input type=text size=52 name=who value="dj krush"></form>
<div>
<a href="engenremap-triphop.html" target=_parent>trip hop</a>, <a href="engenremap-turntablism.html" target=_parent>turntablism</a>
&nbsp; <a href="artistprofile.cgi?id=00G1NTDAoU7rBpjG4KoYAM" title="go to the profile for this artist">ⓘ</a>
</div>
`;

let failed = 0;
function check(cond, label, extra = "") {
  if (cond) console.log(`  ok   ${label}${extra ? ` — ${extra}` : ""}`);
  else {
    failed += 1;
    console.log(` FAIL  ${label}${extra ? ` — ${extra}` : ""}`);
  }
}

function decode(value) {
  return value.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

const tripHop = fixture.match(/engenremap-([a-z0-9]+)\.html/);
check(tripHop?.[1] === "triphop", "map slug is triphop");
check(/playx\(&quot;1V6gIisPpYqgFeWbMLI0bA&quot;, &quot;trip hop&quot;/.test(fixture), "map playx keeps Spotify track id");
check(/artistprofile\.html\?id=6FXMGgJwohJLUSr5nVlf9X/.test(fixture), "artist keeps Spotify artist id");
check(/title="e\.g\. Massive Attack/.test(fixture), "example recording is named");
check(/engenremap-downtempo\.html/.test(fixture), "nearby downtempo branch");
check(/id=mirroritem1/.test(fixture), "mirror gospel branch");
check(/playlist\/2wrc23l7JdQVcpPIcDGaed/.test(fixture), "spotify playlist id");
check(/title="listen to The Sound of Trip Hop on Spotify"/.test(fixture), "playlist keeps The Sound of Trip Hop title");
check(/nrbg\.html\?genre=trip%20hop/.test(fixture), "new releases link");
check(/width: 1532px; height: 936px/.test(fixture), "genre canvas size");
check(/00G1NTDAoU7rBpjG4KoYAM/.test(lookup), "lookup keeps DJ Krush Spotify id");
check(/engenremap-triphop\.html/.test(lookup), "lookup lists trip hop");
const eg = decode('e.g. DJ Krush &quot;Zen Approach&quot;').match(/^e\.g\. (.+) "([^"]+)"$/);
check(eg?.[1] === "DJ Krush" && eg?.[2] === "Zen Approach", "example title decodes quotes");
check(!/NetEase|KuGou|Kuwo/.test(fixture), "fixture does not dump Chinese catalogs into atlas HTML");

const { readFileSync } = await import("node:fs");
const scatterUi = readFileSync(new URL("../src/components/cosmos/AtlasScatter.tsx", import.meta.url), "utf8");
check(
  /CULL_AFTER/.test(scatterUi) && /data-scatter-id/.test(scatterUi) && /useLayoutEffect/.test(scatterUi) && /cx-atlas-grid/.test(scatterUi),
  "atlas directory rows are readable, paginated, and keep hover preview"
);
const surfaceUi = readFileSync(new URL("../src/components/cosmos/AtlasSurface.tsx", import.meta.url), "utf8");
check(/fields", "map"/.test(surfaceUi) && /AtlasBranchList/.test(surfaceUi), "atlas map fetch is slim and list is not mounted on the map");
const playerUi = readFileSync(new URL("../src/context/PlayerContext.tsx", import.meta.url), "utf8");
check(/usePlayerClock/.test(playerUi) && /ClockContext/.test(playerUi), "progress ticks stay off the tile tree");
check(/useNowPlaying/.test(playerUi) && /useTaste/.test(playerUi), "tiles subscribe to now-playing and taste, not the whole player");
const mediaSession = readFileSync(new URL("../src/lib/listen/media-session.ts", import.meta.url), "utf8");
check(/bindMediaSession/.test(playerUi) && /"nexttrack"/.test(mediaSession) && /"previoustrack"/.test(mediaSession), "media session binds play/pause and never next/previous");
check(/loadPrefs/.test(playerUi) && /pendingResume/.test(playerUi), "volume/destination persist and last-listen can resume");
check(/listenVia === "soundcloud"/.test(playerUi), "SoundCloud sessions keep a clock so the engine can advance");
const resolveRoute = readFileSync(new URL("../src/app/api/atlas/resolve/route.ts", import.meta.url), "utf8");
check(/resolveRecording/.test(resolveRoute) && !/\bgenre\s*:/.test(resolveRoute), "atlas resolve wraps resolveRecording and does not write genre");
const manifest = readFileSync(new URL("../public/manifest.webmanifest", import.meta.url), "utf8");
check(/"theme_color": "#000000"/.test(manifest) && /"name": "Resonant"/.test(manifest), "PWA manifest is Resonant on black");
const miniUi = readFileSync(new URL("../src/components/cosmos/MiniPlayer.tsx", import.meta.url), "utf8");
check(/retryAdvance/.test(miniUi) && /ShareGlyph/.test(miniUi) && !/\bSkip\b/.test(miniUi) && !/goToNext/.test(miniUi), "mini player has retry and share, no skip");
check(/export function CloseGlyph/.test(readFileSync(new URL("../src/components/cosmos/icons.tsx", import.meta.url), "utf8")), "CloseGlyph stays exported");
const tokenCss = readFileSync(new URL("../src/app/(cosmos)/cosmos.css", import.meta.url), "utf8");
check(/prefers-reduced-motion/.test(tokenCss) && /outline:\s*2px solid var\(--color-sand\)/.test(tokenCss), "cosmos keeps reduced-motion and a visible sand focus ring");
const nuclearSrc = readFileSync(new URL("../src/lib/nuclear/mcp.ts", import.meta.url), "utf8");
check(
  /"Atlas"/.test(nuclearSrc) && /"Cognition"/.test(nuclearSrc) && /NUCLEAR_TOOLS/.test(nuclearSrc),
  "Nuclear domains include Atlas and Cognition without adding a fifth discovery tool"
);
const listenBridge = readFileSync(new URL("../src/lib/mcp/listen-tools.ts", import.meta.url), "utf8");
check(/LISTEN_MCP_TOOLS/.test(listenBridge) && /research_recording/.test(readFileSync(new URL("../src/lib/converse/tools.ts", import.meta.url), "utf8")), "Ask tools are bridged onto /api/mcp");
const researchSrc = readFileSync(new URL("../src/lib/converse/research.ts", import.meta.url), "utf8");
check(
  /musicbrainz\.org/.test(researchSrc) && /wikipedia\.org/.test(researchSrc) && /Never invent/.test(researchSrc),
  "liner-notes research cites Wikipedia and MusicBrainz and never invents"
);
const mcpJson = readFileSync(new URL("../.cursor/mcp.json", import.meta.url), "utf8");
check(
  /mcp\.harness\.io/.test(mcpJson) && /mcp\.vercel\.com/.test(mcpJson) && /127\.0\.0\.1:8800/.test(mcpJson),
  "project MCP registers Nuclear, Harness, and Vercel"
);
check(/"resonant"/.test(readFileSync(new URL("../.cursor/settings.json", import.meta.url), "utf8")), "Resonant Cursor plugin is enabled in project settings");

const ALLOWED_FEELINGS = new Set([
  "floathouse",
  "microhouse",
  "ambientdubtechno",
  "rominimal",
  "dubtechno",
  "deepsunsetlounge",
  "hypnotictechno",
  "minimaldub",
  "lofihouse",
  "outsiderhouse",
  "futuregarage",
  "deepsoulhouse",
  "detroithouse",
  "chicagohouse",
  "organichouse",
  "deephouse",
  "chillgroove",
  "balearic",
  "deepchill",
  "ambienthouse",
  "deeptechhouse",
  "romanianelectronic",
  "southafricansoulfuldeephouse",
  "jazzhouse",
  "jazztronica",
  "nujazz",
  "deepprogressivehouse",
  "cologneelectronic",
  "ethnotronica",
  "futureambient",
  "chilllounge",
  "downtempofusion",
  "deepdowntempofusion",
  "worldchill",
  "deepdiscohouse",
  "minimaltechhouse",
  "minimaltechno",
  "experimentalhouse",
]);
const tax = readFileSync(new URL("../src/lib/feelings/taxonomy.ts", import.meta.url), "utf8");
const foundFeelings = new Set();
for (const block of tax.matchAll(/slugs:\s*\[([^\]]+)\]/g)) {
  for (const slug of block[1].matchAll(/"([a-z0-9]+)"/g)) foundFeelings.add(slug[1]);
}
check(foundFeelings.size === ALLOWED_FEELINGS.size, "feelings taxonomy matches the named live slugs", String(foundFeelings.size));
check(
  [...foundFeelings].every((slug) => ALLOWED_FEELINGS.has(slug)),
  "feelings taxonomy only allowlisted slugs",
  [...foundFeelings].filter((slug) => !ALLOWED_FEELINGS.has(slug)).join(", ")
);
check(
  [...ALLOWED_FEELINGS].every((slug) => foundFeelings.has(slug)),
  "feelings taxonomy is the complete thirty",
  [...ALLOWED_FEELINGS].filter((slug) => !foundFeelings.has(slug)).join(", ")
);
check(
  !foundFeelings.has("triphop") &&
    !foundFeelings.has("reminimal") &&
    !foundFeelings.has("melodichouse") &&
    !foundFeelings.has("sunsetlounge") &&
    !foundFeelings.has("nudisco"),
  "feelings does not invent missing or extra branches"
);
const feelingsTools = readFileSync(new URL("../src/lib/converse/tools.ts", import.meta.url), "utf8");
check(/browse_feelings/.test(feelingsTools), "Ask exposes browse_feelings");
check(/Atlas\.feelings/.test(nuclearSrc) && /feelings:/.test(nuclearSrc), "Atlas domain has feelings method without a fifth discovery tool");
const nestSrc = readFileSync(new URL("../src/lib/atlas/nest.ts", import.meta.url), "utf8");
check(/FEELINGS_NEST/.test(nestSrc) && /allowGenreIds/.test(nestSrc), "Feelings nest reuses atlas click rooms");
const feelingsUi = readFileSync(new URL("../src/components/cosmos/FeelingsSurface.tsx", import.meta.url), "utf8");
check(/Play this feeling/.test(feelingsUi) && /cx-atlas-chips/.test(feelingsUi), "Feelings surface plays a room and wraps branch chips");
const shellUi = readFileSync(new URL("../src/components/cosmos/AppShell.tsx", import.meta.url), "utf8");
check(/href: "\/feelings"/.test(shellUi) && /short: "Feel"/.test(shellUi), "nav names Feelings after Atlas");
const genreView = readFileSync(new URL("../src/components/cosmos/AtlasGenreView.tsx", import.meta.url), "utf8");
check(/nestId/.test(genreView) && /\/api\/feelings\/genre/.test(genreView), "genre view can nest inside Feelings without serializing a Set");

const base = process.argv[2];
if (base) {
  const root = base.replace(/\/$/, "");
  async function get(path) {
    const response = await fetch(`${root}${path}`);
    const json = await response.json().catch(() => ({}));
    return { status: response.status, json };
  }
  const list = await get("/api/atlas?family=electronic&limit=40");
  check(list.status === 200 && Array.isArray(list.json.genres), "GET /api/atlas", `HTTP ${list.status}`);
  check((list.json.genres?.length ?? 0) > 8, "electronic family has branches", String(list.json.genres?.length ?? 0));
  const all = await get("/api/atlas?family=all&limit=80");
  check((all.json.total ?? 0) > 5000, "full map has the Every Noise database", String(all.json.total ?? 0));
  check(all.json.canvas?.width > 100 && all.json.canvas?.height > 100, "map returns canvas size", JSON.stringify(all.json.canvas ?? {}));
  const slim = await get("/api/atlas?family=all&limit=40&fields=map");
  check(
    (slim.json.genres ?? []).length > 0 && (slim.json.genres ?? []).every((g) => g.exampleArtist == null && g.exampleTitle == null),
    "fields=map omits example strings"
  );
  const genre = await get("/api/atlas/genre/triphop?enrich=4");
  check(genre.status === 200 && (genre.json.artists?.length ?? 0) > 20, "GET trip hop artists", String(genre.json.artists?.length ?? 0));
  const withXY = (genre.json.artists ?? []).filter((a) => typeof a.x === "number" && typeof a.y === "number");
  check(withXY.length > 20, "trip hop artists keep scatter x/y", String(withXY.length));
  check((genre.json.mirrors?.length ?? 0) > 0, "trip hop has mirror branches", String(genre.json.mirrors?.length ?? 0));
  check((genre.json.nearby?.length ?? 0) > 4, "trip hop has nearby branches", String(genre.json.nearby?.length ?? 0));
  const titles = (genre.json.playlists ?? []).map((p) => p.title ?? "");
  check(
    titles.some((t) => /sound of trip hop/i.test(t)),
    "playlists include The Sound of Trip Hop",
    titles.join(" · ")
  );
  check(
    titles.some((t) => /intro to trip hop/i.test(t)),
    "playlists include Intro to Trip Hop",
    titles.join(" · ")
  );
  check((genre.json.libraryTracks ?? []).every((t) => !("genre" in t) || t.genre == null), "harvested tracks have no genre field");
  check((genre.json.tracks?.[0]?.outbound?.apple || genre.json.tracks?.[0]?.outbound?.spotify), "trip hop rows carry outbound links");
  const artist = await get("/api/atlas/artist?name=DJ%20Krush&enrich=4");
  check(artist.status === 200 && artist.json.artist?.name, "GET DJ Krush", artist.json.artist?.name ?? "");
  check((artist.json.nearbyGenres?.length ?? 0) >= 1, "DJ Krush has Every Noise branches");
  check(
    (artist.json.nearbyGenres ?? []).some((g) => g.id === "triphop" || /trip hop/i.test(g.label ?? "")),
    "DJ Krush lookup still has trip hop"
  );
  check((artist.json.libraryTracks?.length ?? 0) >= 1, "DJ Krush resolves real recordings", String(artist.json.libraryTracks?.length ?? 0));
  check((artist.json.features?.length ?? 0) === 0, "artist page is lookup, not fake features from the first genre");
  const playlist = await get("/api/atlas/playlist?id=2wrc23l7JdQVcpPIcDGaed&kind=sound&genre=triphop&enrich=3");
  check(playlist.status === 200 && /sound of trip hop/i.test(playlist.json.playlist?.title ?? ""), "GET Sound of Trip Hop", playlist.json.playlist?.title ?? "");
  check((playlist.json.libraryTracks ?? []).every((t) => !("genre" in t) || t.genre == null), "playlist harvest has no genre field");
  const genreUi = readFileSync(new URL("../src/components/cosmos/AtlasGenreView.tsx", import.meta.url), "utf8");
  check(/toggleScan/.test(genreUi) && /playlist/.test(genreUi), "genre view keeps scan and playlist");
  const outboundUi = readFileSync(new URL("../src/components/cosmos/OutboundLinks.tsx", import.meta.url), "utf8");
  check(/Recording/.test(outboundUi) && /Artist/.test(outboundUi) && /Catalog/.test(outboundUi), "outbound links split into Recording, Artist, and Catalog");
  check(/RECORDING_KEYS/.test(outboundUi) && /ARTIST_KEYS/.test(outboundUi) && /CATALOG_KEYS/.test(outboundUi), "atlas outbound keeps all three destination rows");
  check(/fillOutbound/.test(outboundUi) && /youtubeMusicArtist/.test(outboundUi) && /soundcloudArtist/.test(outboundUi), "atlas fills every destination when a canonical id is missing");
  check(/layout === "atlas"/.test(outboundUi) && /LinkRow label="Catalog"/.test(outboundUi), "atlas catalog row stays on the map layout");
  const outboundCss = readFileSync(new URL("../src/app/(cosmos)/cosmos.css", import.meta.url), "utf8");
  check(/min-height:\s*44px/.test(outboundCss), "outbound chips have a 44px tap target");
  check(/\.cx-outbound \{[\s\S]*?gap:\s*12px/.test(outboundCss), "outbound chips keep 12px gaps");
  const home = await fetch(`${root}/`).then((r) => r.text());
  check(home.includes("Listen Now"), "home still Listen Now");
  check(home.includes("Favorite Songs"), "home still Favorite Songs");
  check(home.includes("Connect Apple Music"), "home still Connect Apple Music");
  check(home.includes("Atlas") || home.includes("atlas"), "home names the atlas");
  const atlasPage = await fetch(`${root}/atlas`);
  check(atlasPage.ok, "atlas page loads");
  const genrePage = await fetch(`${root}/atlas/genre/triphop`);
  check(genrePage.ok, "trip hop genre page loads");
  const feelings = await get("/api/feelings");
  check(feelings.status === 200 && (feelings.json.rooms?.length ?? 0) === 6, "GET /api/feelings has six rooms", String(feelings.json.rooms?.length ?? 0));
  check((feelings.json.slugs?.length ?? 0) === ALLOWED_FEELINGS.size, "GET /api/feelings lists the named slugs", String(feelings.json.slugs?.length ?? 0));
  const liveSlugs = new Set(feelings.json.slugs ?? []);
  check([...liveSlugs].every((slug) => ALLOWED_FEELINGS.has(slug)), "live feelings slugs stay inside the thirty");
  const feelingGenre = await get("/api/feelings/genre/floathouse?enrich=4");
  check(feelingGenre.status === 200 && feelingGenre.json.genre?.id === "floathouse", "GET Feelings float house", feelingGenre.json.genre?.id ?? "");
  check((feelingGenre.json.libraryTracks ?? []).every((t) => !("genre" in t) || t.genre == null), "feelings harvest has no genre field");
  check((feelingGenre.json.nearby ?? []).every((pin) => ALLOWED_FEELINGS.has(pin.id)), "feelings nearby stays inside the thirty");
  check((feelingGenre.json.mirrors ?? []).every((pin) => ALLOWED_FEELINGS.has(pin.id)), "feelings mirrors stay inside the thirty");
  const refused = await get("/api/feelings/genre/triphop?enrich=2");
  check(refused.status === 404, "GET Feelings trip hop is refused", String(refused.status));
  const pop = await get("/api/feelings/genre/pop");
  check(pop.status === 404, "GET Feelings pop is refused", String(pop.status));
  const feelingsPage = await fetch(`${root}/feelings`);
  check(feelingsPage.ok, "feelings page loads");
  const floatPage = await fetch(`${root}/feelings/genre/floathouse`);
  check(floatPage.ok, "float house feelings page loads");
  const tripFeel = await fetch(`${root}/feelings/genre/triphop`).then((r) => r.text());
  check(/Not in this/.test(tripFeel) && /cut\./.test(tripFeel), "trip hop is not a Feelings page");
  const popFeel = await fetch(`${root}/feelings/genre/pop`).then((r) => r.text());
  check(/Not in this/.test(popFeel) && /cut\./.test(popFeel), "pop is not a Feelings page");
  const homeFeel = await fetch(`${root}/`).then((r) => r.text());
  check(homeFeel.includes("Listen Now"), "home still Listen Now after Feelings");
  check(homeFeel.includes("Favorite Songs"), "home still Favorite Songs after Feelings");
  check(homeFeel.includes("Connect Apple Music"), "home still Connect Apple Music after Feelings");
  check(homeFeel.includes("Feelings"), "home names Feelings");
}

if (failed) {
  console.error(`\n${failed} atlas check(s) failed`);
  process.exit(1);
}
console.log("\natlas parser locked");
