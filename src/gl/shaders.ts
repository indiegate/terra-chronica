// GLSL for the map renderer (WebGL2).

const COMMON = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;

const float PI = 3.14159265358979;
const float EARTH = 6378137.0;
const int TEX_W = 2048;

// Pre-projected metres → clip space.
uniform vec2 uScale;
uniform vec2 uOffset;
vec4 metresToClip(vec2 m) { return vec4(m * uScale + uOffset, 0.0, 1.0); }

ivec2 texel(int i) { return ivec2(i % TEX_W, i / TEX_W); }
`;

/** Plate rotation + Natural Earth projection, shared by land fills and coast lines. */
const PLATES = /* glsl */ `
uniform sampler2D uRot;     // RGBA32F: quaternion (w, x, y, z) per plate row
uniform sampler2D uPieces;  // RGBA32F: 2 texels per piece: (anchorLon, anchorLat, plateRow, -), (fromAge, toAge, -, -)
uniform float uAge;         // Ma
uniform float uShift;       // -1, 0, 1: copy of the map shifted by ±360°

vec3 toXYZ(vec2 ll) {
  vec2 r = radians(ll);
  float c = cos(r.y);
  return vec3(c * cos(r.x), c * sin(r.x), sin(r.y));
}
vec3 qrot(vec4 q, vec3 v) {
  vec3 u = q.yzw;
  return v + 2.0 * cross(u, cross(u, v) + q.x * v);
}
vec2 naturalEarth(float lam, float phi) {
  float p2 = phi * phi, p4 = p2 * p2;
  return vec2(
    lam * (0.8707 - 0.131979 * p2 + p4 * (-0.013791 + p4 * (0.003971 * p2 - 0.001529 * p4))),
    phi * (1.007226 + p2 * (0.015085 + p4 * (-0.044475 + 0.028874 * p2 - 0.005916 * p4))));
}

// Where a present-day lon/lat on piece \`piece\` is at uAge, in projected metres.
// \`lon\` is the unwrapped longitude (radians); fragments beyond ±π are discarded,
// which, with the shifted copies, cuts shapes cleanly at the map's edge.
vec2 reconstruct(vec2 lonlat, uint piece, out float lon, out float valid) {
  vec4 p0 = texelFetch(uPieces, texel(int(piece) * 2), 0);
  vec4 p1 = texelFetch(uPieces, texel(int(piece) * 2 + 1), 0);
  vec4 q = texelFetch(uRot, texel(int(p0.z)), 0);
  vec3 v = qrot(q, toXYZ(lonlat));
  vec3 a = qrot(q, toXYZ(p0.xy));
  lon = atan(v.y, v.x);
  float lat = asin(clamp(v.z, -1.0, 1.0));
  // Keep each piece continuous: unwrap relative to the piece's own anchor.
  float d = lon - atan(a.y, a.x);
  if (d > PI + 1e-4) lon -= 2.0 * PI;
  else if (d < -PI - 1e-4) lon += 2.0 * PI;
  lon += uShift * 2.0 * PI;
  valid = (uAge <= p1.x + 1e-6 && uAge >= p1.y - 1e-6) ? 1.0 : 0.0;
  return naturalEarth(lon, lat) * EARTH;
}
`;

// ── Fills ────────────────────────────────────────────────────────────────

export const TERRITORY_FILL_VS = COMMON + /* glsl */ `
in vec2 aPos;
in uint aId;
flat out int vId;
void main() {
  vId = int(aId);
  gl_Position = metresToClip(aPos);
}`;

export const TERRITORY_FILL_FS = COMMON + /* glsl */ `
uniform sampler2D uColors; // 2 texels per feature: fill (rgb, 1), stroke (rgb, width/5 + 128/255 if dashed)
uniform float uOpacity;
uniform bool uPick;
flat in int vId;
out vec4 outColor;
void main() {
  if (uPick) {
    int id = vId + 1;
    outColor = vec4(float(id & 255), float((id >> 8) & 255), float((id >> 16) & 255), 255.0) / 255.0;
    return;
  }
  vec3 c = texelFetch(uColors, texel(vId * 2), 0).rgb;
  outColor = vec4(c * uOpacity, uOpacity);
}`;

export const LAND_FILL_VS = COMMON + PLATES + /* glsl */ `
in vec2 aPos;   // lon/lat
in uint aId;    // piece
out float vLon;
out float vValid;
void main() {
  gl_Position = metresToClip(reconstruct(aPos, aId, vLon, vValid));
}`;

export const LAND_FILL_FS = COMMON + /* glsl */ `
uniform vec4 uColor;
in float vLon;
in float vValid;
out vec4 outColor;
void main() {
  if (vValid < 0.5 || abs(vLon) > PI * 1.000001) discard;
  outColor = vec4(uColor.rgb * uColor.a, uColor.a);
}`;

// ── Lines (screen-space quads: constant width in pixels) ─────────────────

const LINE_QUAD = /* glsl */ `
uniform vec2 uViewport;  // device pixels
uniform float uDpr;
out float vAcross;
out float vHalf;
out float vAlongPx;

// Expand segment a→b (clip space) into a quad of width w (device px), with square caps.
vec4 lineCorner(vec4 ca, vec4 cb, float w, float alongStartPx) {
  vec2 pa = (ca.xy * 0.5 + 0.5) * uViewport;
  vec2 pb = (cb.xy * 0.5 + 0.5) * uViewport;
  vec2 dir = pb - pa;
  float len = length(dir);
  dir = len > 1e-6 ? dir / len : vec2(1.0, 0.0);
  vec2 nrm = vec2(-dir.y, dir.x);
  float hw = w * 0.5 + 1.0; // +1px for antialiasing
  int corner = gl_VertexID;
  bool atA = corner < 2;
  float side = (corner % 2 == 0) ? -1.0 : 1.0;
  vec2 p = (atA ? pa - dir * w * 0.5 : pb + dir * w * 0.5) + nrm * side * hw;
  vAcross = side * hw;
  vHalf = w * 0.5;
  vAlongPx = alongStartPx + (atA ? -w * 0.5 : len + w * 0.5);
  return vec4(p / uViewport * 2.0 - 1.0, 0.0, 1.0);
}
`;

const LINE_FS_BODY = /* glsl */ `
in float vAcross;
in float vHalf;
in float vAlongPx;
out vec4 outColor;
// Coverage of a line of half-width h at distance d, antialiased; thin lines fade instead of vanishing.
float coverage() {
  float h = max(vHalf, 0.5);
  return clamp(h + 0.5 - abs(vAcross), 0.0, 1.0) * min(1.0, vHalf * 2.0);
}
bool dashGap(float on, float period) {
  return period > 0.0 && mod(vAlongPx / uDpr, period) > on;
}
`;

export const TERRITORY_LINE_VS = COMMON + LINE_QUAD + /* glsl */ `
in vec4 aSeg;    // ax, ay, bx, by (metres)
in float aAlong; // metres along the ring at a
in uint aId;
uniform sampler2D uColors;
uniform float uPxPerMetre; // CSS px
uniform bool uDashes;
flat out vec3 vColor;
flat out float vDash;
void main() {
  // Stroke alpha byte = width/5·255, plus 128 when the border is uncertain (dashed).
  vec4 s = texelFetch(uColors, texel(int(aId) * 2 + 1), 0);
  float dash = s.a >= 0.5 ? 1.0 : 0.0;
  float width = (s.a - dash * 128.0 / 255.0) * 5.0;
  vColor = s.rgb;
  vDash = uDashes ? dash : 0.0;
  gl_Position = lineCorner(metresToClip(aSeg.xy), metresToClip(aSeg.zw), width * uDpr, aAlong * uPxPerMetre * uDpr);
}`;

export const TERRITORY_LINE_FS = COMMON + /* glsl */ `
uniform float uDpr;
uniform float uOpacity;
flat in vec3 vColor;
flat in float vDash;
` + LINE_FS_BODY + /* glsl */ `
void main() {
  if (vDash > 0.5 && dashGap(4.0, 7.0)) discard;
  float a = coverage() * uOpacity;
  outColor = vec4(vColor * a, a);
}`;

/** Plain metre-space lines with one colour (graticule, sphere edge). */
export const PLAIN_LINE_VS = COMMON + LINE_QUAD + /* glsl */ `
in vec4 aSeg;
in float aAlong;
uniform float uWidth;
uniform float uPxPerMetre;
void main() {
  gl_Position = lineCorner(metresToClip(aSeg.xy), metresToClip(aSeg.zw), uWidth * uDpr, aAlong * uPxPerMetre * uDpr);
}`;

export const PLAIN_LINE_FS = COMMON + /* glsl */ `
uniform float uDpr;
uniform vec4 uColor;
uniform vec2 uDash; // on, period (CSS px); period 0 = solid
` + LINE_FS_BODY + /* glsl */ `
void main() {
  if (dashGap(uDash.x, uDash.y)) discard;
  float a = coverage() * uColor.a;
  outColor = vec4(uColor.rgb * a, a);
}`;

export const COAST_LINE_VS = COMMON + PLATES + LINE_QUAD + /* glsl */ `
in vec4 aSeg;  // aLon, aLat, bLon, bLat
in uint aId;   // piece
uniform float uWidth;
out float vLon;
out float vValid;
void main() {
  float lonA, lonB, validA, validB;
  vec2 ma = reconstruct(aSeg.xy, aId, lonA, validA);
  vec2 mb = reconstruct(aSeg.zw, aId, lonB, validB);
  vValid = validA;
  gl_Position = lineCorner(metresToClip(ma), metresToClip(mb), uWidth * uDpr, 0.0);
  vLon = gl_VertexID < 2 ? lonA : lonB;
}`;

export const COAST_LINE_FS = COMMON + /* glsl */ `
uniform float uDpr;
uniform vec4 uColor;
in float vLon;
in float vValid;
` + LINE_FS_BODY + /* glsl */ `
void main() {
  if (vValid < 0.5 || abs(vLon) > PI * 1.000001) discard;
  float a = coverage() * uColor.a;
  outColor = vec4(uColor.rgb * a, a);
}`;

// ── Sea and compositing ──────────────────────────────────────────────────

export const SEA_VS = COMMON + /* glsl */ `
in vec2 aPos;
void main() { gl_Position = metresToClip(aPos); }`;

/** Sea colour with engraved wave lines, constant size on screen, moving with the map. */
export const SEA_FS = COMMON + /* glsl */ `
uniform vec4 uSea;
uniform vec4 uInk;
uniform vec2 uPan;       // CSS px
uniform float uDpr;
uniform vec2 uViewport;
out vec4 outColor;
void main() {
  vec2 p = vec2(gl_FragCoord.x, uViewport.y - gl_FragCoord.y) / uDpr - uPan;
  float y = p.y + 3.0 * sin(p.x * 2.0 * PI / 22.0);
  float d = abs(fract(y / 9.0 + 0.5) - 0.5) * 9.0;       // px to the nearest wave line
  float line = clamp(0.75 - d, 0.0, 1.0) * uInk.a;
  vec3 c = mix(uSea.rgb, uInk.rgb, line);
  outColor = vec4(c, 1.0);
}`;

export const COMPOSITE_VS = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 p = vec2(gl_VertexID == 1 ? 3.0 : -1.0, gl_VertexID == 2 ? 3.0 : -1.0);
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

/** Territories, once, with shared translucency and a watercolour wobble. */
export const COMPOSITE_FS = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform sampler2D uNoise;
uniform vec2 uViewport;
uniform vec2 uPan;       // CSS px, so the wobble moves with the map
uniform float uDpr;
uniform float uAmp;      // CSS px
uniform float uAlpha;
in vec2 vUv;
out vec4 outColor;
void main() {
  vec2 css = gl_FragCoord.xy / uDpr;
  vec2 n = texture(uNoise, (css - vec2(uPan.x, -uPan.y)) / 256.0).rg - 0.5;
  vec2 uv = vUv + n * 2.0 * uAmp * uDpr / uViewport;
  outColor = texture(uTex, uv) * uAlpha;
}`;
