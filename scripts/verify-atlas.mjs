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
  /CULL_AFTER/.test(scatterUi) && /data-scatter-id/.test(scatterUi) && /useLayoutEffect/.test(scatterUi),
  "atlas scatter viewport-culls dense maps, centers in layout, and delegates hover"
);
const surfaceUi = readFileSync(new URL("../src/components/cosmos/AtlasSurface.tsx", import.meta.url), "utf8");
check(/fields", "map"/.test(surfaceUi) && /AtlasBranchList/.test(surfaceUi), "atlas map fetch is slim and list is not mounted on the map");
const playerUi = readFileSync(new URL("../src/context/PlayerContext.tsx", import.meta.url), "utf8");
check(/usePlayerClock/.test(playerUi) && /ClockContext/.test(playerUi), "progress ticks stay off the tile tree");
check(/useNowPlaying/.test(playerUi) && /useTaste/.test(playerUi), "tiles subscribe to now-playing and taste, not the whole player");
const tokenCss = readFileSync(new URL("../src/app/(cosmos)/cosmos.css", import.meta.url), "utf8");
check(/prefers-reduced-motion/.test(tokenCss) && /outline:\s*2px solid var\(--color-sand\)/.test(tokenCss), "cosmos keeps reduced-motion and a visible sand focus ring");

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
}

if (failed) {
  console.error(`\n${failed} atlas check(s) failed`);
  process.exit(1);
}
console.log("\natlas parser locked");
