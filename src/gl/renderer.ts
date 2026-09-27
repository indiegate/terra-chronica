// WebGL2 map renderer. Draws, in order: sea (with engraved waves), graticule,
// land (plates rotated to the current age), territories (via an offscreen
// buffer so their translucency is applied once), coastline and sphere edge.
import * as S from './shaders';
import type { LandMesh, TerritoryMesh } from './types';

const TEX_W = 2048;

/** Screen mapping: CSS px = a·x + bx, −a·y + by for projected metres (x, y). */
export interface View {
  a: number;
  bx: number;
  by: number;
  /** Map pan in CSS px (for patterns that move with the map). */
  panX: number;
  panY: number;
}

export interface Colours {
  sea: RGBA;
  seaInk: RGBA;
  land: RGBA;
  coast: RGBA;
  graticule: RGBA;
  edge: RGBA;
}
export type RGBA = [number, number, number, number];

export interface Frame {
  view: View;
  age: number;
  /** Land layers bottom to top, each with its opacity (coastlines, or continental blocks in deep time). */
  lands: { layer: LandLayer; alpha: number }[];
  territories: { layer: TerritoryLayer; opacity: number }[];
  dashes: boolean;
}

interface Program {
  prog: WebGLProgram;
  u: Record<string, WebGLUniformLocation | null>;
}

// ── GPU layers ─────────────────────────────────────────────────────────────

export class TerritoryLayer {
  readonly fill: WebGLVertexArrayObject;
  readonly lines: WebGLVertexArrayObject;
  readonly fillCount: number;
  readonly lineCount: number;
  readonly colours: WebGLTexture;
  private buffers: WebGLBuffer[] = [];
  private rows: number;

  constructor(private gl: WebGL2RenderingContext, mesh: TerritoryMesh, prog: { fill: Program; line: Program }) {
    this.fill = gl.createVertexArray()!;
    gl.bindVertexArray(this.fill);
    this.attrib(prog.fill, 'aPos', mesh.fillPos, 2);
    this.attribInt(prog.fill, 'aId', mesh.fillIds);
    this.index(mesh.fillIndex);
    this.fillCount = mesh.fillIndex.length;

    this.lines = gl.createVertexArray()!;
    gl.bindVertexArray(this.lines);
    const buf = this.buffer(mesh.linePos);
    const stride = 5 * 4;
    this.pointer(prog.line, 'aSeg', buf, 4, stride, 0, true);
    this.pointer(prog.line, 'aAlong', buf, 1, stride, 16, true);
    this.attribInt(prog.line, 'aId', mesh.lineIds, true);
    this.lineCount = mesh.lineIds.length;
    gl.bindVertexArray(null);

    this.rows = Math.max(1, Math.ceil((mesh.meta.length * 2) / TEX_W));
    this.colours = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.colours);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, TEX_W, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    nearest(gl);
  }

  /** 2 texels per feature: fill (r, g, b, 255), stroke (r, g, b, width/5·255 + 128 if dashed). */
  setColours(data: Uint8Array) {
    const gl = this.gl;
    const full = new Uint8Array(TEX_W * this.rows * 4);
    full.set(data.subarray(0, full.length));
    gl.bindTexture(gl.TEXTURE_2D, this.colours);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, TEX_W, this.rows, gl.RGBA, gl.UNSIGNED_BYTE, full);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteVertexArray(this.fill);
    gl.deleteVertexArray(this.lines);
    gl.deleteTexture(this.colours);
    for (const b of this.buffers) gl.deleteBuffer(b);
  }

  private buffer(data: ArrayBufferView, target: number = this.gl.ARRAY_BUFFER) {
    const gl = this.gl;
    const b = gl.createBuffer()!;
    gl.bindBuffer(target, b);
    gl.bufferData(target, data, gl.STATIC_DRAW);
    this.buffers.push(b);
    return b;
  }
  private index(data: Uint32Array) {
    this.buffer(data, this.gl.ELEMENT_ARRAY_BUFFER);
  }
  private attrib(p: Program, name: string, data: Float32Array, size: number, instanced = false) {
    this.pointer(p, name, this.buffer(data), size, 0, 0, instanced);
  }
  private pointer(p: Program, name: string, buf: WebGLBuffer, size: number, stride: number, offset: number, instanced: boolean) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(p.prog, name);
    if (loc < 0) return;
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offset);
    if (instanced) gl.vertexAttribDivisor(loc, 1);
  }
  private attribInt(p: Program, name: string, data: Uint32Array, instanced = false) {
    const gl = this.gl;
    const loc = gl.getAttribLocation(p.prog, name);
    if (loc < 0) return;
    this.buffer(data);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribIPointer(loc, 1, gl.UNSIGNED_INT, 0, 0);
    if (instanced) gl.vertexAttribDivisor(loc, 1);
  }
}

export class LandLayer {
  readonly fill: WebGLVertexArrayObject;
  readonly coast: WebGLVertexArrayObject;
  readonly fillCount: number;
  readonly coastCount: number;
  readonly pieces: WebGLTexture;
  private buffers: WebGLBuffer[] = [];

  constructor(private gl: WebGL2RenderingContext, mesh: LandMesh, prog: { fill: Program; coast: Program }) {
    this.fill = gl.createVertexArray()!;
    gl.bindVertexArray(this.fill);
    this.float(prog.fill, 'aPos', mesh.fillPos, 2, false);
    this.uint(prog.fill, 'aId', mesh.fillIds, false);
    const ib = gl.createBuffer()!;
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.fillIndex, gl.STATIC_DRAW);
    this.buffers.push(ib);
    this.fillCount = mesh.fillIndex.length;

    this.coast = gl.createVertexArray()!;
    gl.bindVertexArray(this.coast);
    this.float(prog.coast, 'aSeg', mesh.linePos, 4, true);
    this.uint(prog.coast, 'aId', mesh.lineIds, true);
    this.coastCount = mesh.lineIds.length;
    gl.bindVertexArray(null);

    // Pieces: 5 floats each → 2 RGBA32F texels.
    const n = mesh.pieces.length / 5;
    const rows = Math.max(1, Math.ceil((n * 2) / TEX_W));
    const data = new Float32Array(TEX_W * rows * 4);
    for (let i = 0; i < n; i++) {
      const s = mesh.pieces.subarray(i * 5, i * 5 + 5);
      data.set([s[0], s[1], s[2], 0, s[3], s[4], 0, 0], i * 8);
    }
    this.pieces = floatTexture(gl, data, rows);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteVertexArray(this.fill);
    gl.deleteVertexArray(this.coast);
    gl.deleteTexture(this.pieces);
    for (const b of this.buffers) gl.deleteBuffer(b);
  }

  private float(p: Program, name: string, data: Float32Array, size: number, instanced: boolean) {
    const gl = this.gl;
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.buffers.push(b);
    const loc = gl.getAttribLocation(p.prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    if (instanced) gl.vertexAttribDivisor(loc, 1);
  }
  private uint(p: Program, name: string, data: Uint32Array, instanced: boolean) {
    const gl = this.gl;
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    this.buffers.push(b);
    const loc = gl.getAttribLocation(p.prog, name);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribIPointer(loc, 1, gl.UNSIGNED_INT, 0, 0);
    if (instanced) gl.vertexAttribDivisor(loc, 1);
  }
}

// ── Renderer ───────────────────────────────────────────────────────────────

export class Renderer {
  readonly gl: WebGL2RenderingContext;
  private p: Record<string, Program>;
  private dpr = 1;
  private sea: { vao: WebGLVertexArrayObject; count: number };
  private edge: { vao: WebGLVertexArrayObject; count: number };
  private graticule: { vao: WebGLVertexArrayObject; count: number };
  private rotTex: WebGLTexture;
  private noise: WebGLTexture;
  private msaa: { fb: WebGLFramebuffer; rb: WebGLRenderbuffer } | null = null;
  private resolve: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  private pick: { fb: WebGLFramebuffer; tex: WebGLTexture } | null = null;
  private samples: number;

  constructor(
    readonly canvas: HTMLCanvasElement,
    geo: { seaTriangles: Float32Array; edge: Float32Array; graticule: Float32Array },
    private colours: Colours,
  ) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 is not available');
    this.gl = gl;
    if (!gl.getExtension('EXT_color_buffer_float')) {
      // Float textures are only sampled, never rendered to; fine without it.
    }
    this.samples = Math.min(4, gl.getParameter(gl.MAX_SAMPLES) as number);
    this.p = {
      sea: program(gl, S.SEA_VS, S.SEA_FS),
      plainLine: program(gl, S.PLAIN_LINE_VS, S.PLAIN_LINE_FS),
      landFill: program(gl, S.LAND_FILL_VS, S.LAND_FILL_FS),
      coast: program(gl, S.COAST_LINE_VS, S.COAST_LINE_FS),
      terrFill: program(gl, S.TERRITORY_FILL_VS, S.TERRITORY_FILL_FS),
      terrLine: program(gl, S.TERRITORY_LINE_VS, S.TERRITORY_LINE_FS),
      composite: program(gl, S.COMPOSITE_VS, S.COMPOSITE_FS),
    };
    this.sea = this.staticFill(geo.seaTriangles);
    this.edge = this.staticLines(geo.edge);
    this.graticule = this.staticLines(geo.graticule);
    this.rotTex = floatTexture(gl, new Float32Array(TEX_W * 4).fill(0).map((_, i) => (i % 4 === 0 ? 1 : 0)), 1);
    this.noise = noiseTexture(gl);
  }

  territoryLayer(mesh: TerritoryMesh) {
    return new TerritoryLayer(this.gl, mesh, { fill: this.p.terrFill, line: this.p.terrLine });
  }

  landLayer(mesh: LandMesh) {
    return new LandLayer(this.gl, mesh, { fill: this.p.landFill, coast: this.p.coast });
  }

  /** Quaternion (w, x, y, z) per plate row. */
  setRotations(quats: Float32Array) {
    const gl = this.gl;
    const rows = Math.max(1, Math.ceil(quats.length / 4 / TEX_W));
    const data = new Float32Array(TEX_W * rows * 4);
    data.set(quats);
    gl.deleteTexture(this.rotTex);
    this.rotTex = floatTexture(gl, data, rows);
  }

  resize(width: number, height: number, dpr: number) {
    this.dpr = dpr;
    const W = Math.round(width * dpr);
    const H = Math.round(height * dpr);
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    const gl = this.gl;
    for (const t of [this.msaa, this.resolve, this.pick]) if (t) gl.deleteFramebuffer(t.fb);
    if (this.msaa) gl.deleteRenderbuffer(this.msaa.rb);
    if (this.resolve) gl.deleteTexture(this.resolve.tex);
    if (this.pick) gl.deleteTexture(this.pick.tex);

    const rb = gl.createRenderbuffer()!;
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    gl.renderbufferStorageMultisample(gl.RENDERBUFFER, this.samples, gl.RGBA8, W, H);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rb);
    this.msaa = { fb, rb };
    this.resolve = this.textureTarget(W, H, true);
    this.pick = this.textureTarget(W, H, false);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  draw(f: Frame) {
    const gl = this.gl;
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, W, H);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    // Sea
    this.use('sea', f.view);
    this.u4('sea', 'uSea', this.colours.sea);
    this.u4('sea', 'uInk', this.colours.seaInk);
    gl.uniform2f(this.p.sea.u.uPan, f.view.panX, f.view.panY);
    gl.bindVertexArray(this.sea.vao);
    gl.drawArrays(gl.TRIANGLES, 0, this.sea.count);

    // Graticule
    this.plainLines(this.graticule, f.view, this.colours.graticule, 0.5, [2, 5]);

    // Land
    const seams = f.age > 0 ? [-1, 0, 1] : [0];
    for (const { layer, alpha } of f.lands) {
      this.use('landFill', f.view);
      this.plates('landFill', layer, f.age);
      const c = this.colours.land;
      this.u4('landFill', 'uColor', [c[0], c[1], c[2], c[3] * alpha]);
      gl.bindVertexArray(layer.fill);
      for (const s of seams) {
        gl.uniform1f(this.p.landFill.u.uShift, s);
        gl.drawElements(gl.TRIANGLES, layer.fillCount, gl.UNSIGNED_INT, 0);
      }
    }

    // Territories → offscreen (multisampled) → resolved texture → composited once.
    if (f.territories.length && this.msaa && this.resolve) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.msaa.fb);
      gl.clear(gl.COLOR_BUFFER_BIT);
      for (const { layer, opacity } of f.territories) this.drawTerritory(layer, f.view, opacity, f.dashes);
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.msaa.fb);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.resolve.fb);
      gl.blitFramebuffer(0, 0, W, H, 0, 0, W, H, gl.COLOR_BUFFER_BIT, gl.NEAREST);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);

      const c = this.p.composite;
      gl.useProgram(c.prog);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.resolve.tex);
      gl.uniform1i(c.u.uTex, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.noise);
      gl.uniform1i(c.u.uNoise, 1);
      gl.uniform2f(c.u.uViewport, W, H);
      gl.uniform2f(c.u.uPan, f.view.panX, f.view.panY);
      gl.uniform1f(c.u.uDpr, this.dpr);
      gl.uniform1f(c.u.uAmp, 1.75);
      gl.uniform1f(c.u.uAlpha, 0.6);
      gl.bindVertexArray(null);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // Coast (or block outlines)
    for (const { layer, alpha } of f.lands) {
      this.use('coast', f.view);
      this.plates('coast', layer, f.age);
      const c = this.colours.coast;
      this.u4('coast', 'uColor', [c[0], c[1], c[2], c[3] * alpha]);
      gl.uniform1f(this.p.coast.u.uWidth, 0.8);
      gl.bindVertexArray(layer.coast);
      for (const s of seams) {
        gl.uniform1f(this.p.coast.u.uShift, s);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, layer.coastCount);
      }
    }

    // Sphere edge
    this.plainLines(this.edge, f.view, this.colours.edge, 0.8, [0, 0]);
    gl.bindVertexArray(null);
  }

  /** Feature id (draw order) of `layer` at CSS pixel (x, y), or -1. */
  pickAt(layer: TerritoryLayer, view: View, x: number, y: number): number {
    const gl = this.gl;
    if (!this.pick) return -1;
    const px = Math.floor(x * this.dpr);
    const py = gl.drawingBufferHeight - 1 - Math.floor(y * this.dpr);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.pick.fb);
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(px, py, 1, 1);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.disable(gl.BLEND);
    this.use('terrFill', view);
    gl.uniform1i(this.p.terrFill.u.uPick, 1);
    gl.bindVertexArray(layer.fill);
    gl.drawElements(gl.TRIANGLES, layer.fillCount, gl.UNSIGNED_INT, 0);
    gl.uniform1i(this.p.terrFill.u.uPick, 0);
    const out = new Uint8Array(4);
    gl.readPixels(px, py, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, out);
    gl.disable(gl.SCISSOR_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.bindVertexArray(null);
    return out[3] ? out[0] + (out[1] << 8) + (out[2] << 16) - 1 : -1;
  }

  // ── Internals ────────────────────────────────────────────────────────

  private drawTerritory(layer: TerritoryLayer, view: View, opacity: number, dashes: boolean) {
    const gl = this.gl;
    this.use('terrFill', view);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, layer.colours);
    gl.uniform1i(this.p.terrFill.u.uColors, 0);
    gl.uniform1f(this.p.terrFill.u.uOpacity, opacity);
    gl.uniform1i(this.p.terrFill.u.uPick, 0);
    gl.bindVertexArray(layer.fill);
    gl.drawElements(gl.TRIANGLES, layer.fillCount, gl.UNSIGNED_INT, 0);

    const l = this.p.terrLine;
    this.use('terrLine', view);
    gl.uniform1i(l.u.uColors, 0);
    gl.uniform1f(l.u.uOpacity, opacity);
    gl.uniform1f(l.u.uPxPerMetre, view.a);
    gl.uniform1i(l.u.uDashes, dashes ? 1 : 0);
    gl.bindVertexArray(layer.lines);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, layer.lineCount);
  }

  private plainLines(geo: { vao: WebGLVertexArrayObject; count: number }, view: View, colour: RGBA, width: number, dash: [number, number]) {
    const gl = this.gl;
    const p = this.p.plainLine;
    this.use('plainLine', view);
    this.u4('plainLine', 'uColor', colour);
    gl.uniform1f(p.u.uWidth, width);
    gl.uniform1f(p.u.uPxPerMetre, view.a);
    gl.uniform2f(p.u.uDash, dash[0], dash[1]);
    gl.bindVertexArray(geo.vao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, geo.count);
  }

  /** Bind program and the shared view uniforms. */
  private use(name: string, v: View) {
    const gl = this.gl;
    const p = this.p[name];
    gl.useProgram(p.prog);
    const W = gl.drawingBufferWidth / this.dpr;
    const H = gl.drawingBufferHeight / this.dpr;
    // clip.x = 2(a·x + bx)/W − 1 ; clip.y = 1 − 2(−a·y + by)/H
    gl.uniform2f(p.u.uScale, (2 * v.a) / W, (2 * v.a) / H);
    gl.uniform2f(p.u.uOffset, (2 * v.bx) / W - 1, 1 - (2 * v.by) / H);
    if (p.u.uViewport) gl.uniform2f(p.u.uViewport, gl.drawingBufferWidth, gl.drawingBufferHeight);
    if (p.u.uDpr) gl.uniform1f(p.u.uDpr, this.dpr);
  }

  private plates(name: string, land: LandLayer, age: number) {
    const gl = this.gl;
    const p = this.p[name];
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.rotTex);
    gl.uniform1i(p.u.uRot, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, land.pieces);
    gl.uniform1i(p.u.uPieces, 2);
    gl.uniform1f(p.u.uAge, age);
    gl.activeTexture(gl.TEXTURE0);
  }

  private u4(name: string, u: string, c: RGBA) {
    this.gl.uniform4f(this.p[name].u[u], c[0], c[1], c[2], c[3]);
  }

  private staticFill(tris: Float32Array) {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, tris, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(this.p.sea.prog, 'aPos');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return { vao, count: tris.length / 2 };
  }

  /** Segments as [ax, ay, bx, by, along] (metres). */
  private staticLines(segs: Float32Array) {
    const gl = this.gl;
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const b = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, segs, gl.STATIC_DRAW);
    const p = this.p.plainLine.prog;
    const seg = gl.getAttribLocation(p, 'aSeg');
    gl.enableVertexAttribArray(seg);
    gl.vertexAttribPointer(seg, 4, gl.FLOAT, false, 20, 0);
    gl.vertexAttribDivisor(seg, 1);
    const along = gl.getAttribLocation(p, 'aAlong');
    gl.enableVertexAttribArray(along);
    gl.vertexAttribPointer(along, 1, gl.FLOAT, false, 20, 16);
    gl.vertexAttribDivisor(along, 1);
    gl.bindVertexArray(null);
    return { vao, count: segs.length / 5 };
  }

  private textureTarget(W: number, H: number, linear: boolean) {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, W, H, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    const f = linear ? gl.LINEAR : gl.NEAREST;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, f);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { fb, tex };
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────

function program(gl: WebGL2RenderingContext, vs: string, fs: string): Program {
  const compile = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(`Shader: ${gl.getShaderInfoLog(s)}\n${src}`);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(`Link: ${gl.getProgramInfoLog(prog)}`);
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < n; i++) {
    const name = gl.getActiveUniform(prog, i)!.name;
    u[name] = gl.getUniformLocation(prog, name);
  }
  return { prog, u };
}

function nearest(gl: WebGL2RenderingContext) {
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}

function floatTexture(gl: WebGL2RenderingContext, data: Float32Array, rows: number) {
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, TEX_W, rows, 0, gl.RGBA, gl.FLOAT, data);
  nearest(gl);
  return t;
}

/** Smooth, tileable value noise (256², RG) for the watercolour wobble. */
function noiseTexture(gl: WebGL2RenderingContext) {
  const N = 256;
  const CELLS = 8; // ~32 CSS px features, like the old SVG filter
  const grid = (seed: number) => {
    const g = new Float32Array(CELLS * CELLS);
    let s = seed;
    for (let i = 0; i < g.length; i++) {
      s = (s * 1664525 + 1013904223) >>> 0;
      g[i] = s / 2 ** 32;
    }
    return g;
  };
  const gr = grid(7);
  const gg = grid(99);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const sample = (g: Float32Array, x: number, y: number) => {
    const cx = (x / N) * CELLS, cy = (y / N) * CELLS;
    const x0 = Math.floor(cx), y0 = Math.floor(cy);
    const fx = smooth(cx - x0), fy = smooth(cy - y0);
    const at = (i: number, j: number) => g[((j + CELLS) % CELLS) * CELLS + ((i + CELLS) % CELLS)];
    const a = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * fx;
    const b = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * fx;
    return a + (b - a) * fy;
  };
  const data = new Uint8Array(N * N * 4);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      data[i] = Math.round(sample(gr, x, y) * 255);
      data[i + 1] = Math.round(sample(gg, x, y) * 255);
      data[i + 3] = 255;
    }
  const t = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, N, N, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return t;
}
