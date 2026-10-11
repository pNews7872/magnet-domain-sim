// ===== GPU(WebGPU) 마이크로마그네틱 솔버: CPU Micro와 같은 식을 f32로 계산 =====
const GPU_WGSL = `
struct Ctrl { a: u32, b: u32, c: u32, d: u32 };
@group(0) @binding(0) var<uniform> ctrl: Ctrl;
@group(0) @binding(1) var<storage, read> prm: array<f32>;
@group(0) @binding(2) var<storage, read_write> m: array<f32>;
@group(0) @binding(3) var<storage, read_write> mt: array<f32>;
@group(0) @binding(4) var<storage, read_write> h: array<f32>;
@group(0) @binding(5) var<storage, read_write> k1: array<f32>;
@group(0) @binding(6) var<storage, read_write> k2: array<f32>;
@group(0) @binding(7) var<storage, read_write> nz: array<f32>;
@group(0) @binding(8) var<storage, read_write> A: array<vec2<f32>>;
@group(0) @binding(9) var<storage, read_write> B: array<vec2<f32>>;
@group(0) @binding(10) var<storage, read> K: array<f32>;
@group(0) @binding(11) var<storage, read> cellp: array<f32>;
@group(0) @binding(12) var<storage, read> geo: array<f32>;
@group(0) @binding(13) var<storage, read_write> aux: array<f32>;

fn NN() -> u32 { return u32(prm[0]); }
fn PPv() -> u32 { return u32(prm[1]); }
fn n3() -> u32 { return u32(prm[2]); }
fn PP() -> u32 { return u32(prm[3]); }
fn lg() -> u32 { return u32(prm[4]); }
fn gidx(g: vec3<u32>, n: vec3<u32>) -> u32 { return g.x + g.y * n.x * 64u; }

fn getm(id: u32) -> vec3<f32> {
  if (ctrl.a == 0u) { return vec3<f32>(m[3u*id], m[3u*id+1u], m[3u*id+2u]); }
  return vec3<f32>(mt[3u*id], mt[3u*id+1u], mt[3u*id+2u]);
}

@compute @workgroup_size(64) fn scatter(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let p = gidx(g, nw); let pp = PP(); if (p >= pp) { return; }
  let P = PPv(); let N = NN();
  let x = p % P; let y = (p / P) % P; let z = p / (P * P);
  var v = vec3<f32>(0.0);
  if (x < N && y < N && z < N) { let id = x + N * (y + N * z); v = getm(id) * cellp[3u*id]; }
  A[p] = vec2<f32>(v.x, 0.0); A[p + pp] = vec2<f32>(v.y, 0.0); A[p + 2u*pp] = vec2<f32>(v.z, 0.0);
}
fn axpos(axis: u32, line: u32, i: u32, P: u32) -> u32 {
  if (axis == 0u) { return i + P * line; }
  if (axis == 1u) { let x = line % P; let z = line / P; return x + P * (i + P * z); }
  return line + P * P * i;
}
@compute @workgroup_size(64) fn bitrev(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let p = gidx(g, nw); let pp = PP(); if (p >= pp) { return; }
  let P = PPv(); let L = lg(); let axis = ctrl.a;
  var k: u32; var line: u32;
  let x = p % P; let y = (p / P) % P; let z = p / (P * P);
  if (axis == 0u) { k = x; line = y + P * z; } else if (axis == 1u) { k = y; line = x + P * z; } else { k = z; line = x + P * y; }
  let r = reverseBits(k) >> (32u - L);
  let q = axpos(axis, line, r, P);
  B[q] = A[p]; B[q + pp] = A[p + pp]; B[q + 2u*pp] = A[p + 2u*pp];
}
@compute @workgroup_size(64) fn copyba(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let p = gidx(g, nw); let pp = PP(); if (p >= pp) { return; }
  A[p] = B[p]; A[p + pp] = B[p + pp]; A[p + 2u*pp] = B[p + 2u*pp];
}
@compute @workgroup_size(64) fn stage(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let t = gidx(g, nw); let pp = PP(); if (t >= pp / 2u) { return; }
  let P = PPv(); let half = P / 2u; let axis = ctrl.a; let mm = 1u << ctrl.b;
  let line = t / half; let j = t % half; let grp = j / mm; let k = j % mm;
  let i0 = grp * 2u * mm + k; let i1 = i0 + mm;
  var sg = -1.0; if (ctrl.c == 1u) { sg = 1.0; }
  let ang = sg * 3.14159265358979 * f32(k) / f32(mm);
  let w = vec2<f32>(cos(ang), sin(ang));
  let p0 = axpos(axis, line, i0, P); let p1 = axpos(axis, line, i1, P);
  for (var c = 0u; c < 3u; c = c + 1u) {
    let a = A[p0 + c*pp]; let b = A[p1 + c*pp];
    let bw = vec2<f32>(b.x * w.x - b.y * w.y, b.x * w.y + b.y * w.x);
    A[p0 + c*pp] = a + bw; A[p1 + c*pp] = a - bw;
  }
}
@compute @workgroup_size(64) fn mult(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let p = gidx(g, nw); let pp = PP(); if (p >= pp) { return; }
  let xx = K[p]; let yy = K[pp + p]; let zz = K[2u*pp + p]; let xy = K[3u*pp + p]; let xz = K[4u*pp + p]; let yz = K[5u*pp + p];
  let mx = A[p]; let my = A[p + pp]; let mz = A[p + 2u*pp];
  A[p] = -(xx * mx + xy * my + xz * mz);
  A[p + pp] = -(xy * mx + yy * my + yz * mz);
  A[p + 2u*pp] = -(xz * mx + yz * my + zz * mz);
}
@compute @workgroup_size(64) fn field(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let id = gidx(g, nw); let n = n3(); if (id >= n) { return; }
  let N = NN(); let P = PPv(); let pp = PP();
  let x = id % N; let y = (id / N) % N; let z = id / (N * N);
  if (cellp[3u*id] == 0.0) { h[3u*id] = 0.0; h[3u*id+1u] = 0.0; h[3u*id+2u] = 0.0; return; }
  let p = x + P * (y + P * z); let sc = prm[25];
  var hv = vec3<f32>(A[p].x, A[p + pp].x, A[p + 2u*pp].x) * sc;
  if (prm[27] > 0.5) { hv = vec3<f32>(0.0); }
  hv = hv + vec3<f32>(prm[13], prm[14], prm[15]);
  let mv = getm(id); let wi = cellp[3u*id + 1u];
  var ex = vec3<f32>(0.0);
  for (var q = 0u; q < 6u; q = q + 1u) {
    var ok = false; var j = 0u;
    if (q == 0u && x > 0u) { ok = true; j = id - 1u; }
    if (q == 1u && x < N - 1u) { ok = true; j = id + 1u; }
    if (q == 2u && y > 0u) { ok = true; j = id - N; }
    if (q == 3u && y < N - 1u) { ok = true; j = id + N; }
    if (q == 4u && z > 0u) { ok = true; j = id - N * N; }
    if (q == 5u && z < N - 1u) { ok = true; j = id + N * N; }
    if (ok && cellp[3u*j] != 0.0) { let w = min(wi, cellp[3u*j + 1u]); ex = ex + w * (getm(j) - mv); }
  }
  hv = hv + prm[5] * ex;
  // 결정 이방성
  var l = mv; let useRot = prm[23] > 0.5; let o = 12u * id + 3u;
  if (useRot) { l = vec3<f32>(geo[o]*mv.x + geo[o+3u]*mv.y + geo[o+6u]*mv.z, geo[o+1u]*mv.x + geo[o+4u]*mv.y + geo[o+7u]*mv.z, geo[o+2u]*mv.x + geo[o+5u]*mv.y + geo[o+8u]*mv.z); }
  var an = vec3<f32>(0.0); let ck = prm[6]; let ck2 = prm[7]; let aniso = u32(prm[22]);
  if (aniso == 1u) {
    an = -ck * vec3<f32>(l.x * (l.y*l.y + l.z*l.z), l.y * (l.x*l.x + l.z*l.z), l.z * (l.x*l.x + l.y*l.y));
    if (ck2 != 0.0) { an = an - ck2 * vec3<f32>(l.x*l.y*l.y*l.z*l.z, l.y*l.x*l.x*l.z*l.z, l.z*l.x*l.x*l.y*l.y); }
  } else if (aniso == 2u) {
    let ua = vec3<f32>(prm[16], prm[17], prm[18]); let d = dot(l, ua); an = (ck * d + 2.0 * ck2 * (1.0 - d*d) * d) * ua;
  }
  if (useRot) { an = vec3<f32>(geo[o]*an.x + geo[o+1u]*an.y + geo[o+2u]*an.z, geo[o+3u]*an.x + geo[o+4u]*an.y + geo[o+5u]*an.z, geo[o+6u]*an.x + geo[o+7u]*an.y + geo[o+8u]*an.z); }
  hv = hv + an;
  let kp = cellp[3u*id + 2u];
  if (kp != 0.0) { let u = vec3<f32>(geo[12u*id], geo[12u*id+1u], geo[12u*id+2u]); hv = hv + prm[8] * kp * dot(mv, u) * u; }
  let cs = prm[9]; if (cs != 0.0) { let sa = vec3<f32>(prm[19], prm[20], prm[21]); hv = hv + cs * dot(mv, sa) * sa; }
  if (prm[24] > 0.5) { hv = hv + vec3<f32>(nz[3u*id], nz[3u*id+1u], nz[3u*id+2u]); }
  h[3u*id] = hv.x; h[3u*id+1u] = hv.y; h[3u*id+2u] = hv.z;
}
var<workgroup> sh: array<f32, 64>;
@compute @workgroup_size(64) fn rhs(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>, @builtin(local_invocation_index) li: u32, @builtin(workgroup_id) wg: vec3<u32>) {
  let id = gidx(g, nw);
  let a = prm[11]; let pre = -1.0 / (1.0 + a * a);
  let mv = getm(id); let hv = vec3<f32>(h[3u*id], h[3u*id+1u], h[3u*id+2u]);
  let c = cross(mv, hv); let d = cross(mv, c);
  var r = pre * (c + a * d);
  if (prm[28] > 0.5) { r = -d; } // 평형 찾기 모드
  if (ctrl.b == 0u) { k1[3u*id] = r.x; k1[3u*id+1u] = r.y; k1[3u*id+2u] = r.z; }
  else { k2[3u*id] = r.x; k2[3u*id+1u] = r.y; k2[3u*id+2u] = r.z; }
  sh[li] = dot(c, c);
  workgroupBarrier();
  if (li == 0u && ctrl.b == 0u) { var mx = 0.0; for (var i = 0u; i < 64u; i = i + 1u) { mx = max(mx, sh[i]); } aux[2u + wg.x + wg.y * nw.x] = mx; }
}
fn nrm(v: vec3<f32>) -> vec3<f32> { return v / max(length(v), 1e-30); }
@compute @workgroup_size(64) fn pred(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let id = gidx(g, nw); if (id >= n3()) { return; }
  let mv = vec3<f32>(m[3u*id], m[3u*id+1u], m[3u*id+2u]); let kv = vec3<f32>(k1[3u*id], k1[3u*id+1u], k1[3u*id+2u]);
  let r = nrm(mv + prm[10] * kv); mt[3u*id] = r.x; mt[3u*id+1u] = r.y; mt[3u*id+2u] = r.z;
}
@compute @workgroup_size(64) fn corr(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let id = gidx(g, nw); if (id >= n3()) { return; }
  let mv = vec3<f32>(m[3u*id], m[3u*id+1u], m[3u*id+2u]);
  let s = vec3<f32>(k1[3u*id] + k2[3u*id], k1[3u*id+1u] + k2[3u*id+1u], k1[3u*id+2u] + k2[3u*id+2u]);
  let r = nrm(mv + 0.5 * prm[10] * s); m[3u*id] = r.x; m[3u*id+1u] = r.y; m[3u*id+2u] = r.z;
}
fn pcg(v: u32) -> u32 { let s = v * 747796405u + 2891336453u; let w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
@compute @workgroup_size(64) fn noise(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let id = gidx(g, nw); if (id >= n3()) { return; }
  let cnt = u32(aux[0]) * 2654435761u + u32(prm[26]);
  for (var c = 0u; c < 3u; c = c + 1u) {
    let s1 = pcg(pcg(id * 3u + c) ^ cnt); let s2 = pcg(s1 ^ 0x9e3779b9u);
    let u1 = (f32(s1 >> 8u) + 1.0) / 16777217.0; let u2 = f32(s2 >> 8u) / 16777216.0;
    nz[3u*id + c] = prm[12] * sqrt(-2.0 * log(u1)) * cos(6.28318530718 * u2);
  }
}
@compute @workgroup_size(1) fn inc() { aux[0] = (aux[0] + 1.0) % 8388608.0; }
`;

class GpuMicro {
  static async create(N, device) {
    const g = new GpuMicro(); g.N = N; g.P = 2 * N; g.n3 = N * N * N; g.PP = g.P ** 3; g.L = Math.log2(g.P);
    g.dev = device || await (await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' })).requestDevice({});
    g.dev.lost.then((i) => { g.lost = i; });
    const d = g.dev, S = GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
    const buf = (bytes) => d.createBuffer({ size: Math.max(16, bytes), usage: S });
    g.b = { prm: buf(64 * 4), m: buf(12 * g.n3), mt: buf(12 * g.n3), h: buf(12 * g.n3), k1: buf(12 * g.n3), k2: buf(12 * g.n3), nz: buf(12 * g.n3),
      A: buf(24 * g.PP), B: buf(24 * g.PP), K: buf(24 * g.PP), cellp: buf(12 * g.n3), geo: buf(48 * g.n3), aux: buf(4 * (2 + g.n3 / 64)) };
    // 반자장 커널 (CPU에서 f64로 계산 후 업로드)
    const P = g.P, PP = g.PP, keys = ['xx', 'yy', 'zz', 'xy', 'xz', 'yz'], Kf = new Float32Array(6 * PP), F = makeFFT(P), re = new Float64Array(PP), im = new Float64Array(PP);
    const tens = new Array(PP);
    for (let z = 0; z < P; z++) for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      if (x === N || y === N || z === N) continue;
      tens[x + P * (y + P * z)] = demagTensor(x < N ? x : x - P, y < N ? y : y - P, z < N ? z : z - P);
    }
    keys.forEach((k, ki) => { re.fill(0); im.fill(0); for (let i = 0; i < PP; i++) if (tens[i]) re[i] = tens[i][k]; F.full(re, im, false); for (let i = 0; i < PP; i++) Kf[ki * PP + i] = re[i]; });
    d.queue.writeBuffer(g.b.K, 0, Kf);
    const cp = new Float32Array(3 * g.n3); for (let i = 0; i < g.n3; i++) { cp[3 * i] = 1; cp[3 * i + 1] = 1; } d.queue.writeBuffer(g.b.cellp, 0, cp);
    const st = (t) => ({ binding: t[0], visibility: GPUShaderStage.COMPUTE, buffer: { type: t[1] } });
    g.layout = d.createBindGroupLayout({ entries: [[0, 'uniform'], [1, 'read-only-storage'], [2, 'storage'], [3, 'storage'], [4, 'storage'], [5, 'storage'], [6, 'storage'], [7, 'storage'], [8, 'storage'], [9, 'storage'], [10, 'read-only-storage'], [11, 'read-only-storage'], [12, 'read-only-storage'], [13, 'storage']].map(st) });
    const mod = d.createShaderModule({ code: GPU_WGSL });
    const info = await mod.getCompilationInfo(); const errs = info.messages.filter(x => x.type === 'error'); if (errs.length) throw new Error('WGSL: ' + errs.map(e => e.lineNum + ': ' + e.message).join('; '));
    const pl = d.createPipelineLayout({ bindGroupLayouts: [g.layout] });
    g.pipe = {}; for (const e of ['scatter', 'bitrev', 'copyba', 'stage', 'mult', 'field', 'rhs', 'pred', 'corr', 'noise', 'inc']) g.pipe[e] = d.createComputePipeline({ layout: pl, compute: { module: mod, entryPoint: e } });
    g.bgs = new Map(); g.prm = new Float32Array(64); g.alpha = 0.5; g.T = 0; g.happ = [0, 0, 0]; g.t = 0; g.lastTorque = 1; g.stressK = 0; g.stressAxis = [1, 0, 0]; g.kpMax = 0;
    g.ms = new Float32Array(g.n3).fill(1); g.magCount = g.n3; g.mCPU = new Float32Array(3 * g.n3);
    return g;
  }
  bg(a, b, c) {
    const key = a + ',' + b + ',' + c; let e = this.bgs.get(key); if (e) return e;
    const u = this.dev.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }); this.dev.queue.writeBuffer(u, 0, new Uint32Array([a, b, c, 0]));
    const B = this.b, list = [u, B.prm, B.m, B.mt, B.h, B.k1, B.k2, B.nz, B.A, B.B, B.K, B.cellp, B.geo, B.aux];
    e = this.dev.createBindGroup({ layout: this.layout, entries: list.map((buffer, i) => ({ binding: i, resource: { buffer } })) });
    this.bgs.set(key, e); return e;
  }
  setMaterial(mat, edge_nm) {
    this.mat = mat; this.edge = edge_nm; const d = edge_nm * 1e-9 / this.N, Ms = mat.Ms; this.cell = d; this.cellV = d * d * d;
    this.cex = 2 * mat.A / (MU0 * Ms * Ms * d * d); this.ck = 2 * mat.K1 / (MU0 * Ms * Ms); this.ck2 = 2 * (mat.K2 || 0) / (MU0 * Ms * Ms);
    this.cpk = 2 / (MU0 * Ms * Ms); this.cs = 2 * this.stressK / (MU0 * Ms * Ms); this.timeUnit = 1 / (GAMMA * MU0 * Ms);
    this.stiff = 12 * this.cex + Math.abs(this.ck) * 2 + Math.abs(this.ck2) * 4 + 2 * this.cpk * (this.kpMax || 0) + 2 * Math.abs(this.cs) + 2;
    this.updateDt();
  }
  updateDt() { this.dt = this.relax ? 1.8 / this.stiff : Math.min(0.1, (this.alpha >= 0.2 ? 1.5 : 1.0) / this.stiff); this.writePrm(); }
  writePrm() {
    if (!this.mat) return;
    const p = this.prm, mat = this.mat; p.fill(0);
    p[0] = this.N; p[1] = this.P; p[2] = this.n3; p[3] = this.PP; p[4] = this.L; p[5] = this.cex; p[6] = this.ck; p[7] = this.ck2; p[8] = this.cpk; p[9] = this.cs;
    p[10] = this.dt; p[11] = this.alpha;
    p[12] = this.T > 0 ? Math.sqrt(2 * this.alpha * 1.380649e-23 * this.T / (MU0 * mat.Ms * mat.Ms * this.cellV * this.dt)) : 0;
    p[13] = this.happ[0]; p[14] = this.happ[1]; p[15] = this.happ[2];
    const ua = mat.axis || [0, 0, 1]; p[16] = ua[0]; p[17] = ua[1]; p[18] = ua[2];
    p[19] = this.stressAxis[0]; p[20] = this.stressAxis[1]; p[21] = this.stressAxis[2];
    p[22] = mat.aniso === 'cubic' ? 1 : mat.aniso === 'uniaxial' ? 2 : 0; p[23] = this.useRot ? 1 : 0; p[24] = this.T > 0 ? 1 : 0;
    p[25] = 1 / this.PP; p[26] = (this.seed = (this.seed || 12345) + 7919) % 1e6; p[27] = this.noDemag ? 1 : 0; p[28] = this.relax ? 1 : 0; if (this.relax) { p[12] = 0; p[24] = 0; }
    this.dev.queue.writeBuffer(this.b.prm, 0, p);
  }
  setField(hv) { this.happ = hv; this.writePrm(); }
  setDefects(d) {
    const n3 = this.n3, cp = new Float32Array(3 * n3), geo = new Float32Array(12 * n3);
    this.kpMax = 0; this.magCount = 0;
    for (let i = 0; i < n3; i++) {
      cp[3 * i] = d ? d.ms[i] : 1; cp[3 * i + 1] = d ? d.exw[i] : 1; cp[3 * i + 2] = d ? d.kp[i] : 0;
      if (d) { geo[12 * i] = d.kpAxis[3 * i]; geo[12 * i + 1] = d.kpAxis[3 * i + 1]; geo[12 * i + 2] = d.kpAxis[3 * i + 2]; if (d.rot) for (let k = 0; k < 9; k++) geo[12 * i + 3 + k] = d.rot[9 * i + k]; this.kpMax = Math.max(this.kpMax, Math.abs(d.kp[i])); }
      if (cp[3 * i] > 0) this.magCount++;
    }
    this.useRot = !!(d && d.rot); this.ms = Float32Array.from({ length: n3 }, (_, i) => cp[3 * i]); this.defs = d;
    this.dev.queue.writeBuffer(this.b.cellp, 0, cp); this.dev.queue.writeBuffer(this.b.geo, 0, geo);
    if (this.mat) this.setMaterial(this.mat, this.edge);
  }
  setM(arr) { this.mCPU = Float32Array.from(arr); this.dev.queue.writeBuffer(this.b.m, 0, this.mCPU); }
  initState(kind) { const tmp = { N: this.N, m: new Float64Array(3 * this.n3) }; Micro.prototype.initState.call(tmp, kind); this.setM(tmp.m); this.t = 0; }
  encodeField(pass, src) {
    const PPw = this.wg(this.PP), PPh = this.wg(this.PP / 2), n3w = this.wg(this.n3), ds = (name, bg, w) => { pass.setPipeline(this.pipe[name]); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(w[0], w[1]); };
    ds('scatter', this.bg(src, 0, 0), PPw);
    for (const inv of [0, 1]) {
      if (inv) ds('mult', this.bg(0, 0, 0), PPw);
      for (let ax = 0; ax < 3; ax++) {
        ds('bitrev', this.bg(ax, 0, 0), PPw); ds('copyba', this.bg(0, 0, 0), PPw);
        for (let s = 0; s < this.L; s++) ds('stage', this.bg(ax, s, inv), PPh);
      }
    }
    ds('field', this.bg(src, 0, 0), n3w);
  }
  wg(n) { const w = Math.ceil(n / 64); return w <= 65535 ? [w, 1] : [64, Math.ceil(w / 64)]; }
  // 주의: gidx는 g.x + g.y * nw.x * 64 이므로 2차원 분할 시 x 방향 그룹 수는 64 고정
  step(n) {
    const enc = this.dev.createCommandEncoder(), pass = enc.beginComputePass(), n3w = this.wg(this.n3);
    const ds = (name, bg, w) => { pass.setPipeline(this.pipe[name]); pass.setBindGroup(0, bg); pass.dispatchWorkgroups(w[0], w[1]); };
    for (let k = 0; k < n; k++) {
      if (this.T > 0 && !this.relax) { ds('inc', this.bg(0, 0, 0), [1, 1]); ds('noise', this.bg(0, 0, 0), n3w); }
      this.encodeField(pass, 0); ds('rhs', this.bg(0, 0, 0), n3w); ds('pred', this.bg(0, 0, 0), n3w);
      this.encodeField(pass, 1); ds('rhs', this.bg(1, 1, 0), n3w); ds('corr', this.bg(0, 0, 0), n3w);
    }
    pass.end(); this.dev.queue.submit([enc.finish()]); this.t += n * this.dt;
  }
  async readM() {
    const n = 12 * this.n3, rb = this.dev.createBuffer({ size: n, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const rt = this.dev.createBuffer({ size: 4 * (2 + this.n3 / 64), usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = this.dev.createCommandEncoder(); enc.copyBufferToBuffer(this.b.m, 0, rb, 0, n); enc.copyBufferToBuffer(this.b.aux, 0, rt, 0, rt.size); this.dev.queue.submit([enc.finish()]);
    await Promise.all([rb.mapAsync(GPUMapMode.READ), rt.mapAsync(GPUMapMode.READ)]);
    this.mCPU = new Float32Array(rb.getMappedRange().slice(0)); const ta = new Float32Array(rt.getMappedRange().slice(0)); rb.unmap(); rt.unmap(); rb.destroy(); rt.destroy();
    let mx = 0; for (let i = 2; i < ta.length; i++) if (ta[i] > mx) mx = ta[i]; this.lastTorque = Math.sqrt(mx);
    return this.mCPU;
  }
  async readH() { // 검증용
    const n = 12 * this.n3, rb = this.dev.createBuffer({ size: n, usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST });
    const enc = this.dev.createCommandEncoder(), pass = enc.beginComputePass(); this.encodeField(pass, 0); pass.end(); enc.copyBufferToBuffer(this.b.h, 0, rb, 0, n); this.dev.queue.submit([enc.finish()]);
    await rb.mapAsync(GPUMapMode.READ); const h = new Float32Array(rb.getMappedRange().slice(0)); rb.unmap(); rb.destroy(); return h;
  }
  async energies() { // 반자장만 GPU로 따로 계산해서 읽어온 뒤 에너지 항목을 구함
    const p = Float32Array.from(this.prm); p[5] = p[6] = p[7] = p[8] = p[9] = 0; p[13] = p[14] = p[15] = 0; p[24] = 0;
    this.dev.queue.writeBuffer(this.b.prm, 0, p); const hd = await this.readH(); this.dev.queue.writeBuffer(this.b.prm, 0, this.prm);
    const d = this.defs, n3 = this.n3, mat = this.mat;
    return energyTerms({ N: this.N, m: this.mCPU, hd, ms: this.ms, exw: d ? d.exw : new Float32Array(n3).fill(1), kp: d ? d.kp : null, kpAxis: d ? d.kpAxis : null, rot: d ? d.rot : null, Ms: mat.Ms, A: mat.A, K1: mat.K1, K2: mat.K2, aniso: mat.aniso, axis: mat.axis, d: this.cell, happ: this.happ, stressK: this.stressK, stressAxis: this.stressAxis });
  }
  average() { const m = this.mCPU, w = this.ms; let s = [0, 0, 0]; for (let i = 0; i < this.n3; i++) { const a = w[i]; s[0] += a * m[3 * i]; s[1] += a * m[3 * i + 1]; s[2] += a * m[3 * i + 2]; } const n = this.magCount || 1; return [s[0] / n, s[1] / n, s[2] / n]; }
  destroy() { for (const k in this.b) this.b[k].destroy(); }
}
