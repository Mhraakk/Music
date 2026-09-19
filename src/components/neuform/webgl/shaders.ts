/**
 * Fragment-shader library for the Neuform WebGL skills.
 *
 * Every effect renders on one shared fullscreen quad (see ShaderCanvas), so the
 * whole set costs a single draw call each and needs no 3D engine. The 3D and
 * globe skills are raymarched / projected in the fragment stage, which keeps
 * depth and lighting real while avoiding a scene-graph dependency.
 */

export const VERTEX_SHADER = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`;

/** Shared helpers injected ahead of every effect body. */
const PRELUDE = `#version 300 es
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec2  u_pointer;   // 0..1, defaults to centre
uniform float u_dir;       // +1 ltr, -1 rtl
uniform float u_intensity;

out vec4 fragColor;

float hash11(float p){ p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2  hash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1,0)), u.x),
             mix(hash21(i + vec2(0,1)), hash21(i + vec2(1,1)), u.x), u.y);
}

float fbm(vec2 p){
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.02; a *= 0.5; }
  return v;
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Normalised, aspect-corrected coordinates centred on 0.
vec2 uvc(){ vec2 uv = (gl_FragCoord.xy * 2.0 - u_res) / min(u_res.x, u_res.y); uv.x *= u_dir; return uv; }
vec2 uv01(){ return gl_FragCoord.xy / u_res; }

float grain(vec2 uv, float t){ return hash21(uv * u_res + fract(t) * 137.0); }
vec3 tonemap(vec3 c){ return c / (c + 0.72); }
`;

const EFFECTS: Record<string, string> = {
  /* ── Skill 41: fluid nebula (curl-noise advection) ───────────────────── */
  nebula: `
void main(){
  vec2 uv = uvc();
  float t = u_time * 0.045;
  vec2 q = vec2(fbm(uv * 1.6 + t), fbm(uv * 1.6 - t + 4.3));
  vec2 r = vec2(fbm(uv * 2.1 + q * 1.7 + t * 1.3), fbm(uv * 2.1 + q * 1.7 - t));
  float f = fbm(uv * 1.4 + r * 1.2);
  vec3 col = mix(vec3(0.03,0.02,0.02), vec3(0.62,0.34,0.18), smoothstep(0.25,0.95,f));
  col = mix(col, vec3(0.16,0.34,0.62), smoothstep(0.55,1.0,length(r)) * 0.5);
  col += grain(uv, u_time) * 0.035;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 50: atmospheric grain over a vignette ─────────────────────── */
  grain: `
void main(){
  vec2 uv = uvc();
  float vig = 1.0 - smoothstep(0.35, 1.5, length(uv));
  float base = fbm(uv * 1.1 + u_time * 0.02);
  vec3 col = mix(vec3(0.02), vec3(0.20,0.14,0.10), base) * vig;
  float g = grain(uv, u_time * 8.0);
  col += (g - 0.5) * 0.09;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 51: layered procedural cloud field ────────────────────────── */
  procedural: `
void main(){
  vec2 uv = uvc();
  float t = u_time * 0.03;
  float a = fbm(uv * 1.2 + vec2(t, -t));
  float b = fbm(uv * 2.6 - vec2(t * 1.6, t));
  float c = fbm(uv * 5.1 + vec2(t * 0.4, t * 0.9));
  float f = a * 0.55 + b * 0.3 + c * 0.15;
  vec3 col = mix(vec3(0.02,0.02,0.03), vec3(0.45,0.36,0.30), smoothstep(0.2,0.9,f));
  col += vec3(0.28,0.14,0.05) * pow(smoothstep(0.6,1.0,f), 2.0);
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 60: drifting topographic contours ─────────────────────────── */
  topographic: `
void main(){
  vec2 uv = uvc();
  float h = fbm(uv * 1.7 + vec2(u_time * 0.02, u_time * 0.013));
  float lines = fract(h * 14.0);
  float edge = smoothstep(0.02, 0.0, abs(lines - 0.5) - 0.44);
  vec3 col = vec3(0.02,0.025,0.03);
  col += vec3(0.55,0.72,0.95) * edge * 0.55;
  col += vec3(0.9,0.6,0.35) * edge * smoothstep(0.55,0.95,h) * 0.6;
  col += grain(uv, u_time) * 0.02;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 10: volumetric laser beams ────────────────────────────────── */
  laser: `
float beam(vec2 uv, float angle, float offset, float width){
  vec2 p = rot(angle) * uv;
  return width / (abs(p.y - offset) + width);
}
void main(){
  vec2 uv = uvc();
  float t = u_time * 0.35;
  vec3 col = vec3(0.015,0.012,0.012);
  col += vec3(1.0,0.55,0.28) * beam(uv, 0.42, sin(t) * 0.35, 0.006) * 0.8;
  col += vec3(0.35,0.65,1.0) * beam(uv, -0.28, cos(t * 0.8) * 0.45, 0.004) * 0.6;
  col += vec3(1.0,0.82,0.55) * beam(uv, 1.15, sin(t * 0.6 + 2.0) * 0.25, 0.003) * 0.5;
  col += grain(uv, u_time) * 0.02;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 39: corner-anchored converging beams ──────────────────────── */
  "corner-lasers": `
float ray(vec2 uv, vec2 origin, vec2 dir, float w){
  vec2 d = uv - origin;
  float proj = dot(d, normalize(dir));
  vec2 perp = d - normalize(dir) * proj;
  float fall = smoothstep(2.2, 0.0, proj) * step(0.0, proj);
  return (w / (length(perp) + w)) * fall;
}
void main(){
  vec2 uv = uvc();
  float pulse = 0.65 + 0.35 * sin(u_time * 1.4);
  vec3 col = vec3(0.012);
  col += vec3(1.0,0.6,0.3) * ray(uv, vec2(-1.3,-0.9), vec2(1.0,0.72), 0.0045) * pulse;
  col += vec3(1.0,0.6,0.3) * ray(uv, vec2( 1.3,-0.9), vec2(-1.0,0.72), 0.0045) * pulse;
  col += vec3(0.4,0.7,1.0) * ray(uv, vec2(-1.3, 0.9), vec2(1.0,-0.72), 0.0035);
  col += vec3(0.4,0.7,1.0) * ray(uv, vec2( 1.3, 0.9), vec2(-1.0,-0.72), 0.0035);
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 38: telemetry rings with a scanning sweep ─────────────────── */
  "magic-rings": `
void main(){
  vec2 uv = uvc();
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  vec3 col = vec3(0.012,0.014,0.018);
  for (int i = 0; i < 5; i++){
    float fi = float(i);
    float radius = 0.22 + fi * 0.15;
    float pulse = 0.5 + 0.5 * sin(u_time * 1.2 - fi * 0.8);
    float ring = smoothstep(0.012, 0.0, abs(r - radius));
    col += mix(vec3(0.25,0.55,0.9), vec3(1.0,0.66,0.34), fi / 4.0) * ring * (0.35 + pulse * 0.55);
  }
  float sweep = smoothstep(0.45, 0.0, abs(mod(a + u_time * 0.8, 6.2831) - 3.14159));
  col += vec3(0.7,0.85,1.0) * sweep * smoothstep(1.05, 0.15, r) * 0.28;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 40 & 47: node/edge network drifting in depth ──────────────── */
  "aura-network": `
void main(){
  vec2 uv = uvc() * 2.4;
  vec2 cell = floor(uv);
  vec3 col = vec3(0.014,0.013,0.018);
  float nearest = 10.0;
  vec2 nearestP = vec2(0.0);
  for (int y = -1; y <= 1; y++){
    for (int x = -1; x <= 1; x++){
      vec2 c = cell + vec2(float(x), float(y));
      vec2 p = c + 0.5 + 0.42 * sin(u_time * 0.35 + 6.2831 * hash22(c));
      float d = length(p - uv);
      if (d < nearest){ nearest = d; nearestP = p; }
      col += vec3(0.95,0.68,0.38) * (0.0038 / (d * d + 0.002));
    }
  }
  float link = smoothstep(0.9, 0.0, nearest);
  col += vec3(0.3,0.55,0.95) * link * 0.10;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,
  "mesh-network": `
void main(){
  vec2 uv = uvc() * 3.0;
  vec3 col = vec3(0.012,0.013,0.016);
  float t = u_time * 0.2;
  for (int i = 0; i < 3; i++){
    vec2 g = uv * (1.0 + float(i) * 0.6);
    vec2 id = floor(g);
    vec2 f = fract(g) - 0.5;
    vec2 off = 0.4 * sin(t + 6.2831 * hash22(id + float(i)));
    float d = length(f - off);
    col += mix(vec3(0.2,0.45,0.8), vec3(0.9,0.6,0.35), float(i) / 2.0) * (0.004 / (d * d + 0.0025));
    float filament = smoothstep(0.5, 0.0, abs(f.y - off.y)) * smoothstep(0.5, 0.0, abs(f.x - off.x));
    col += vec3(0.16,0.28,0.45) * filament * 0.05;
  }
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 56: cyber light trails with motion-blurred tails ──────────── */
  "cyber-trail": `
void main(){
  vec2 uv = uvc();
  vec3 col = vec3(0.01,0.012,0.02);
  for (int i = 0; i < 14; i++){
    float fi = float(i);
    float lane = (hash11(fi) - 0.5) * 2.0;
    float speed = 0.35 + hash11(fi + 9.0) * 0.8;
    float x = fract(hash11(fi + 3.0) + u_time * speed * 0.16) * 2.6 - 1.3;
    vec2 p = vec2(x * u_dir, lane * 0.85);
    float tail = smoothstep(0.30, 0.0, abs(uv.x - p.x) ) * 0.35 + 0.65;
    float d = length((uv - p) * vec2(0.22, 1.0));
    vec3 tint = mix(vec3(0.25,0.7,1.0), vec3(1.0,0.4,0.75), hash11(fi + 17.0));
    col += tint * (0.0022 / (d * d + 0.0012)) * tail;
  }
  col += grain(uv, u_time) * 0.015;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 55: particle field quantised into ASCII cells ─────────────── */
  "ascii-field": `
float glyph(vec2 p, float level){
  // Bars of increasing density approximate an ASCII ramp.
  float bars = step(0.5 + 0.5 * cos(p.y * 12.0), level);
  float dots = step(0.55, level) * step(0.5 + 0.5 * cos(p.x * 14.0), level);
  return max(bars * 0.7, dots);
}
void main(){
  vec2 uv01v = uv01();
  vec2 cellSize = vec2(9.0, 14.0) / u_res;
  vec2 cell = floor(uv01v / cellSize);
  vec2 inCell = fract(uv01v / cellSize);
  vec2 cuv = (cell * cellSize - 0.5) * 2.0;
  float field = fbm(cuv * 3.0 + vec2(u_time * 0.12, -u_time * 0.08));
  float level = smoothstep(0.25, 0.85, field);
  float g = glyph(inCell * 6.2831, level);
  vec3 col = vec3(0.01,0.015,0.013) + vec3(0.35,0.95,0.6) * g * level * 0.75;
  col += vec3(0.9,0.6,0.3) * g * pow(level, 6.0) * 0.5;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 17: perspective grid fading into fog ──────────────────────── */
  "grid-perspective": `
void main(){
  vec2 uv = uvc();
  float horizon = 0.12;
  float y = uv.y - horizon;
  if (y > -0.001) { 
    float sky = smoothstep(0.0, 0.9, uv.y - horizon);
    vec3 skyCol = mix(vec3(0.04,0.035,0.05), vec3(0.01,0.01,0.015), sky);
    fragColor = vec4(skyCol, 1.0); return;
  }
  float z = -1.0 / y;
  float x = uv.x * z;
  float t = u_time * 0.6;
  float gx = smoothstep(0.045, 0.0, abs(fract(x * 0.5) - 0.5));
  float gz = smoothstep(0.045, 0.0, abs(fract(z * 0.35 + t * 0.12) - 0.5));
  float fog = exp(-z * 0.045);
  vec3 col = vec3(0.012,0.013,0.018);
  col += (vec3(0.9,0.62,0.35) * gz + vec3(0.32,0.55,0.9) * gx) * fog * 0.75;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 15: raymarched lit 3D object ──────────────────────────────── */
  object3d: `
float sdTorus(vec3 p, vec2 t){ vec2 q = vec2(length(p.xz) - t.x, p.y); return length(q) - t.y; }
float sdSphere(vec3 p, float r){ return length(p) - r; }
float map(vec3 p){
  p.xz *= rot(u_time * 0.35);
  p.yz *= rot(0.5);
  float a = sdTorus(p, vec2(0.75, 0.22));
  float b = sdSphere(p - vec3(0.0, 0.0, 0.0), 0.45);
  return min(a, b);
}
vec3 normalAt(vec3 p){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(map(p+e.xyy)-map(p-e.xyy), map(p+e.yxy)-map(p-e.yxy), map(p+e.yyx)-map(p-e.yyx)));
}
void main(){
  vec2 uv = uvc();
  vec3 ro = vec3(0.0, 0.0, 3.0);
  vec3 rd = normalize(vec3(uv, -1.7));
  float t = 0.0; float hit = 0.0;
  for (int i = 0; i < 72; i++){
    vec3 p = ro + rd * t;
    float d = map(p);
    if (d < 0.001){ hit = 1.0; break; }
    t += d; if (t > 8.0) break;
  }
  vec3 col = vec3(0.012,0.012,0.016);
  if (hit > 0.5){
    vec3 p = ro + rd * t;
    vec3 n = normalAt(p);
    vec3 key = normalize(vec3(0.7 * u_dir, 0.9, 0.6));
    vec3 fill = normalize(vec3(-0.6 * u_dir, -0.2, 0.7));
    float diff = max(dot(n, key), 0.0);
    float fillD = max(dot(n, fill), 0.0) * 0.35;
    float spec = pow(max(dot(reflect(-key, n), -rd), 0.0), 42.0);
    float fres = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    col = vec3(0.92,0.58,0.30) * diff + vec3(0.25,0.42,0.75) * fillD;
    col += vec3(1.0) * spec * 0.7 + vec3(0.9,0.75,0.55) * fres * 0.35;
    col *= exp(-t * 0.13);
  }
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skills 28 & 54: luminous particle globe (54 is pointer-draggable) ── */
  "globe-particles": `
void main(){
  vec2 uv = uvc();
  vec3 col = vec3(0.01,0.012,0.018);
  float spin = u_time * 0.25 + (u_pointer.x - 0.5) * 6.0;
  float tilt = -0.35 + (u_pointer.y - 0.5) * 1.2;
  float R = 0.82;
  for (int i = 0; i < 160; i++){
    float fi = float(i);
    // Fibonacci sphere keeps point density even.
    float y = 1.0 - (fi / 159.0) * 2.0;
    float rad = sqrt(max(0.0, 1.0 - y * y));
    float theta = 2.39996 * fi + spin;
    vec3 p = vec3(cos(theta) * rad, y, sin(theta) * rad);
    p.yz *= rot(tilt);
    vec2 s = p.xy * R;
    s.x *= u_dir;
    float depth = smoothstep(-1.0, 1.0, p.z);
    float d = length(uv - s);
    col += mix(vec3(0.18,0.34,0.62), vec3(1.0,0.72,0.42), depth)
         * (0.00035 / (d * d + 0.00025)) * (0.25 + depth * 0.95);
  }
  float rim = smoothstep(0.02, 0.0, abs(length(uv) - R));
  col += vec3(0.3,0.5,0.85) * rim * 0.18;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 54: denser point cloud driven by pointer drag ─────────────── */
  "globe-pointcloud": `
void main(){
  vec2 uv = uvc();
  vec3 col = vec3(0.008,0.010,0.016);
  float spin = u_time * 0.12 + (u_pointer.x - 0.5) * 9.0;
  float tilt = (u_pointer.y - 0.5) * 1.6;
  float R = 0.86;
  for (int i = 0; i < 260; i++){
    float fi = float(i);
    float y = 1.0 - (fi / 259.0) * 2.0;
    float rad = sqrt(max(0.0, 1.0 - y * y));
    float theta = 2.39996 * fi + spin;
    vec3 p = vec3(cos(theta) * rad, y, sin(theta) * rad);
    p.yz *= rot(tilt);
    vec2 s = p.xy * R;
    s.x *= u_dir;
    float depth = smoothstep(-1.0, 1.0, p.z);
    float d = length(uv - s);
    float size = mix(0.00012, 0.00042, depth);
    col += mix(vec3(0.12,0.22,0.45), vec3(0.75,0.92,1.0), depth) * (size / (d * d + 0.00018));
  }
  col += vec3(0.25,0.45,0.8) * smoothstep(0.015, 0.0, abs(length(uv) - R)) * 0.12;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 65: tactical wireframe globe with graticule + scan ────────── */
  "tactical-globe": `
void main(){
  vec2 uv = uvc();
  float R = 0.78;
  float r = length(uv);
  vec3 col = vec3(0.01,0.014,0.013);
  if (r < R){
    float z = sqrt(max(0.0, R*R - r*r));
    vec3 p = vec3(uv.x * u_dir, uv.y, z) / R;
    float lat = asin(clamp(p.y, -1.0, 1.0));
    float lon = atan(p.x, p.z) + u_time * 0.22;
    float glat = smoothstep(0.035, 0.0, abs(fract(lat * 5.0 / 3.14159 + 0.5) - 0.5));
    float glon = smoothstep(0.035, 0.0, abs(fract(lon * 6.0 / 6.2831 + 0.5) - 0.5));
    float shade = 0.35 + 0.65 * max(dot(normalize(p), normalize(vec3(0.6 * u_dir, 0.7, 0.5))), 0.0);
    col += vec3(0.25,0.85,0.7) * (glat + glon) * 0.55 * shade;
    float sweep = smoothstep(0.12, 0.0, abs(fract(lon / 6.2831) - 0.5));
    col += vec3(0.5,1.0,0.85) * sweep * 0.15;
  }
  col += vec3(0.3,0.9,0.8) * smoothstep(0.012, 0.0, abs(r - R)) * 0.6;
  float retic = smoothstep(0.004,0.0,abs(uv.x)) + smoothstep(0.004,0.0,abs(uv.y));
  col += vec3(0.2,0.6,0.5) * retic * step(r, R * 1.15) * 0.25;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skills 48 & 61: isometric volumetric lattice ────────────────────── */
  "isometric-spatial": `
void main(){
  vec2 uv = uvc() * 2.0;
  // Isometric basis
  vec2 iso = vec2(uv.x * 0.8660254 * u_dir + uv.y * 0.5, -uv.x * 0.8660254 * u_dir + uv.y * 0.5);
  vec2 cell = floor(iso + 0.5);
  vec2 f = iso - cell;
  float h = 0.35 + 0.65 * fbm(cell * 0.6 + u_time * 0.08);
  float top = smoothstep(0.52, 0.48, max(abs(f.x), abs(f.y)));
  float side = smoothstep(0.52, 0.48, max(abs(f.x), abs(f.y) + h * 0.12));
  vec3 col = vec3(0.012,0.013,0.018);
  col += vec3(0.95,0.68,0.40) * top * (0.25 + h * 0.75);
  col += vec3(0.18,0.30,0.52) * (side - top) * 0.6;
  float edge = smoothstep(0.5, 0.49, max(abs(f.x), abs(f.y)));
  col += vec3(0.9,0.8,0.7) * (edge - top) * 0.15;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,
  "isometric-aura": `
void main(){
  vec2 uv = uvc() * 1.8;
  vec2 iso = vec2(uv.x * 0.8660254 * u_dir + uv.y * 0.5, -uv.x * 0.8660254 * u_dir + uv.y * 0.5);
  vec2 cell = floor(iso + 0.5);
  vec2 f = iso - cell;
  float pulse = 0.5 + 0.5 * sin(u_time * 0.9 + hash21(cell) * 6.2831);
  float block = smoothstep(0.5, 0.44, max(abs(f.x), abs(f.y)));
  vec3 col = vec3(0.012,0.012,0.02);
  vec3 aura = mix(vec3(0.3,0.5,1.0), vec3(1.0,0.55,0.8), hash21(cell + 4.0));
  col += aura * block * (0.25 + pulse * 0.8);
  col += aura * exp(-length(f) * 4.0) * 0.12;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 59: shaded technical surface with contour banding ─────────── */
  "shader-surface": `
void main(){
  vec2 uv = uvc();
  float h = fbm(uv * 2.2 + vec2(u_time * 0.05, 0.0));
  vec2 e = vec2(0.004, 0.0);
  float hx = fbm((uv + e.xy) * 2.2 + vec2(u_time * 0.05, 0.0)) - h;
  float hy = fbm((uv + e.yx) * 2.2 + vec2(u_time * 0.05, 0.0)) - h;
  vec3 n = normalize(vec3(-hx, -hy, 0.012));
  vec3 light = normalize(vec3(0.6 * u_dir, 0.7, 0.4));
  float diff = max(dot(n, light), 0.0);
  float band = smoothstep(0.02, 0.0, abs(fract(h * 10.0) - 0.5) - 0.45);
  vec3 col = mix(vec3(0.02,0.022,0.03), vec3(0.55,0.42,0.30), diff);
  col += vec3(0.35,0.62,0.95) * band * 0.4;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 67: organic aetherial folds with chromatic edges ──────────── */
  aetherial: `
void main(){
  vec2 uv = uvc();
  float t = u_time * 0.06;
  vec2 p = uv;
  for (int i = 0; i < 3; i++){
    p += 0.35 * vec2(sin(p.y * 2.3 + t * 1.3), cos(p.x * 2.1 - t));
    p *= rot(0.22);
  }
  float f = fbm(p * 1.3);
  vec3 col = vec3(0.0);
  col.r = smoothstep(0.25, 0.95, f + 0.035);
  col.g = smoothstep(0.25, 0.95, f);
  col.b = smoothstep(0.25, 0.95, f - 0.035);
  col *= vec3(0.95, 0.62, 0.85);
  col += vec3(0.18,0.30,0.52) * smoothstep(0.6, 0.0, length(uv)) * 0.35;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 70: prismatic dispersion / RGB refraction ─────────────────── */
  "chromatic-dispersion": `
float lens(vec2 uv, float s){ return smoothstep(0.75 * s, 0.0, length(uv)); }
void main(){
  vec2 uv = uvc();
  vec2 c = (u_pointer - 0.5) * vec2(1.6 * u_dir, -1.2);
  vec2 d = uv - c;
  float r = length(d);
  float bend = smoothstep(0.85, 0.0, r) * 0.22;
  vec2 dir = normalize(d + 1e-5);
  float fr = fbm((uv - dir * bend * 1.00) * 2.4 + u_time * 0.05);
  float fg = fbm((uv - dir * bend * 1.06) * 2.4 + u_time * 0.05);
  float fb = fbm((uv - dir * bend * 1.12) * 2.4 + u_time * 0.05);
  vec3 col = vec3(fr, fg, fb);
  col = mix(vec3(0.02,0.02,0.03), col * vec3(1.0,0.85,0.95), 0.9);
  col += vec3(0.6,0.75,1.0) * smoothstep(0.02, 0.0, abs(r - 0.55)) * 0.25;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,

  /* ── Skill 71: posterised gradient steps dissolved by grain ──────────── */
  "stepped-noise": `
void main(){
  vec2 uv = uv01();
  float g = uv.y + 0.14 * fbm(uvc() * 1.4 + u_time * 0.02);
  float steps = 7.0;
  float q = floor(g * steps) / steps;
  float dither = (grain(uvc(), 1.0) - 0.5) * (1.0 / steps) * 1.6;
  float v = floor((g + dither) * steps) / steps;
  vec3 a = vec3(0.96, 0.64, 0.34);
  vec3 b = vec3(0.10, 0.09, 0.16);
  vec3 col = mix(a, b, clamp(v, 0.0, 1.0));
  col += (grain(uvc(), u_time * 4.0) - 0.5) * 0.06;
  col = mix(col, mix(a, b, q), 0.25);
  fragColor = vec4(col * u_intensity, 1.0);
}`,

  /* ── Skill 66: slow vector field of drifting filaments ───────────────── */
  "field-system": `
void main(){
  vec2 uv = uvc();
  float t = u_time * 0.08;
  float angle = fbm(uv * 1.1 + t) * 6.2831;
  vec2 flow = vec2(cos(angle), sin(angle));
  float lines = fbm(uv * 6.0 + flow * 1.6 + t * 2.0);
  float filament = smoothstep(0.52, 0.66, lines) - smoothstep(0.66, 0.82, lines);
  vec3 col = vec3(0.012,0.012,0.016);
  col += vec3(0.85,0.60,0.36) * filament * 0.8;
  col += vec3(0.20,0.34,0.58) * smoothstep(0.4, 1.0, lines) * 0.18;
  fragColor = vec4(tonemap(col * u_intensity), 1.0);
}`,
};

export const SHADER_VARIANTS = Object.keys(EFFECTS);

export function getFragmentShader(variant: string): string {
  const body = EFFECTS[variant] ?? EFFECTS.nebula;
  return `${PRELUDE}\n${body}`;
}

export function hasVariant(variant: string): boolean {
  return variant in EFFECTS;
}
