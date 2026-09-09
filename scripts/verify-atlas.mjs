#!/usr/bin/env node
/**
 * Parser lock for Every Noise HTML, plus optional live /api/atlas checks.
 */

const fixture = `
<div id=item1 preview_url="https://p.scdn.co/mp3-preview/abc" class="genre scanme" style="color: #ad8907; top: 100px; left: 80px; font-size: 160%" onclick="playx(&quot;1V6gIisPpYqgFeWbMLI0bA&quot;, &quot;trip hop&quot;, this);" title="e.g. The Herbaliser &quot;The Sensual Woman&quot;">trip hop<a class=navlink href="engenremap-triphop.html">&raquo;</a></div>
<div id=item2 preview_url="https://p.scdn.co/mp3-preview/def" class="genre scanme" style="color: #9994a5; top: 220px; left: 610px; font-size: 150%" onclick="playx(&quot;67Hna13dNDkZvBpTXRIaOJ&quot;, &quot;Massive Attack&quot;, this);" title="e.g. Massive Attack &quot;Teardrop&quot;">Massive Attack<a class=navlink href="artistprofile.html?id=6FXMGgJwohJLUSr5nVlf9X">&raquo;</a></div>
<div id=nearbyitem1 class="genre" style="color: #9f876f; top: 10px; left: 20px; font-size: 120%" onclick="playx(&quot;abcabcabcabcabcabcabca&quot;, &quot;downtempo&quot;, this);">downtempo<a class=navlink href="engenremap-downtempo.html#tunnel">&raquo;</a></div>
<a href="https://open.spotify.com/playlist/2wrc23l7JdQVcpPIcDGaed" title="listen to The Sound of Trip Hop on Spotify">playlist</a>
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
check(/playlist\/2wrc23l7JdQVcpPIcDGaed/.test(fixture), "spotify playlist id");
check(/00G1NTDAoU7rBpjG4KoYAM/.test(lookup), "lookup keeps DJ Krush Spotify id");
check(/engenremap-triphop\.html/.test(lookup), "lookup lists trip hop");
const eg = decode('e.g. DJ Krush &quot;Zen Approach&quot;').match(/^e\.g\. (.+) "([^"]+)"$/);
check(eg?.[1] === "DJ Krush" && eg?.[2] === "Zen Approach", "example title decodes quotes");

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
  const genre = await get("/api/atlas/genre/triphop?enrich=4");
  check(genre.status === 200 && (genre.json.artists?.length ?? 0) > 4, "GET trip hop artists", String(genre.json.artists?.length ?? 0));
  check((genre.json.libraryTracks ?? []).every((t) => !("genre" in t) || t.genre == null), "harvested tracks have no genre field");
  check((genre.json.tracks?.[0]?.outbound?.apple || genre.json.tracks?.[0]?.outbound?.spotify), "trip hop rows carry outbound links");
  const artist = await get("/api/atlas/artist?name=DJ%20Krush&enrich=4");
  check(artist.status === 200 && artist.json.artist?.name, "GET DJ Krush", artist.json.artist?.name ?? "");
  check((artist.json.nearbyGenres?.length ?? 0) >= 1, "DJ Krush has Every Noise branches");
  check((artist.json.libraryTracks?.length ?? 0) >= 1, "DJ Krush resolves real recordings", String(artist.json.libraryTracks?.length ?? 0));
  const home = await fetch(`${root}/`).then((r) => r.text());
  check(home.includes("Listen Now"), "home still Listen Now");
  check(home.includes("Favorite Songs"), "home still Favorite Songs");
  check(home.includes("Connect Apple Music"), "home still Connect Apple Music");
  check(home.includes("Atlas") || home.includes("atlas"), "home names the atlas");
}

if (failed) {
  console.error(`\n${failed} atlas check(s) failed`);
  process.exit(1);
}
console.log("\natlas parser locked");
