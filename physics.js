// 마이크로마그네틱 물리 코어: 자석 자기장 해석해, Newell 반자장 텐서, FFT, 결함, LLG 솔버(CPU)
// ===== 물리 코어 (거시: 직육면체 자석 자기장 / 미시: 마이크로마그네틱 LLG) =====
const MU0 = 4e-7 * Math.PI;
const GAMMA = 1.7609e11; // rad/(s·T)

// 표면 자극 모델: +z로 자화(J = μ0 M [T]), 반폭 a,b,c (단위 무관, 같은 단위)
// 반환: μ0·H [T] (자석 밖에서는 B와 같음)
function cuboidH_z(x, y, z, a, b, c, J) {
  let hx = 0, hy = 0, hz = 0;
  for (let f = 0; f < 2; f++) {
    const sigma = f === 0 ? 1 : -1;
    let Z = f === 0 ? z - c : z + c;
    if (Math.abs(Z) < 1e-12) Z = 1e-12;
    for (let i = 0; i < 2; i++) {
      const X = i === 0 ? x + a : x - a, sx = i === 0 ? 1 : -1;
      for (let j = 0; j < 2; j++) {
        const Y = j === 0 ? y + b : y - b, sy = j === 0 ? 1 : -1;
        const R = Math.sqrt(X * X + Y * Y + Z * Z);
        const s = sigma * sx * sy;
        hz += s * Math.atan(X * Y / (Z * R));
        const ly = Y + R, lx = X + R;
        hx -= s * Math.log(ly > 1e-15 ? ly : 1e-15);
        hy -= s * Math.log(lx > 1e-15 ? lx : 1e-15);
      }
    }
  }
  const k = J / (4 * Math.PI);
  return [k * hx, k * hy, k * hz];
}
// 임의 방향 균일 자화 (J 벡터, T), 축 정렬 직육면체 중심 원점
function cuboidH(x, y, z, a, b, c, Jx, Jy, Jz) {
  let r = [0, 0, 0];
  if (Jz) { const h = cuboidH_z(x, y, z, a, b, c, Jz); r[0] += h[0]; r[1] += h[1]; r[2] += h[2]; }
  if (Jx) { const h = cuboidH_z(y, z, x, b, c, a, Jx); r[1] += h[0]; r[2] += h[1]; r[0] += h[2]; }
  if (Jy) { const h = cuboidH_z(z, x, y, c, a, b, Jy); r[2] += h[0]; r[0] += h[1]; r[1] += h[2]; }
  return r;
}

// ===== Newell 반자장 텐서 =====
function f_N(x, y, z) {
  x = Math.abs(x); y = Math.abs(y); z = Math.abs(z);
  const x2 = x * x, y2 = y * y, z2 = z * z, R = Math.sqrt(x2 + y2 + z2);
  let r = (2 * x2 - y2 - z2) * R / 6;
  const xz = Math.sqrt(x2 + z2), xy = Math.sqrt(x2 + y2);
  if (xz > 0 && y > 0) r += y / 2 * (z2 - x2) * Math.asinh(y / xz);
  if (xy > 0 && z > 0) r += z / 2 * (y2 - x2) * Math.asinh(z / xy);
  if (x > 0 && R > 0) r -= x * y * z * Math.atan(y * z / (x * R));
  return r;
}
function g_N(x, y, z) {
  const sgn = Math.sign(x) * Math.sign(y);
  x = Math.abs(x); y = Math.abs(y);
  const x2 = x * x, y2 = y * y, z2 = z * z, R = Math.sqrt(x2 + y2 + z2);
  let r = -x * y * R / 3;
  const xy = Math.sqrt(x2 + y2), yz = Math.sqrt(y2 + z2), xz = Math.sqrt(x2 + z2);
  if (xy > 0) r += x * y * z * Math.asinh(z / xy);
  if (yz > 0) r += y / 6 * (3 * z2 - y2) * Math.asinh(x / yz);
  if (xz > 0) r += x / 6 * (3 * z2 - x2) * Math.asinh(y / xz);
  if (z !== 0 && R > 0) r -= z * z2 / 6 * Math.atan(x * y / (z * R));
  if (y > 0 && R > 0) r -= z * y2 / 2 * Math.atan(x * z / (y * R));
  if (x > 0 && R > 0) r -= z * x2 / 2 * Math.atan(y * z / (x * R));
  return sgn * r;
}
const W3 = [-1, 2, -1];
function newell(F, X, Y, Z) { // 단위 셀 크기 1 (정육면체 셀)
  let s = 0;
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < 3; k++)
    s += W3[i] * W3[j] * W3[k] * F(X + i - 1, Y + j - 1, Z + k - 1);
  return s / (4 * Math.PI);
}
function dipoleN(X, Y, Z) {
  const r2 = X * X + Y * Y + Z * Z, r5 = Math.pow(r2, 2.5), k = -1 / (4 * Math.PI);
  return {
    xx: k * (3 * X * X - r2) / r5, yy: k * (3 * Y * Y - r2) / r5, zz: k * (3 * Z * Z - r2) / r5,
    xy: k * 3 * X * Y / r5, xz: k * 3 * X * Z / r5, yz: k * 3 * Y * Z / r5
  };
}
function demagTensor(X, Y, Z) {
  if (X * X + Y * Y + Z * Z > 64) return dipoleN(X, Y, Z);
  return {
    xx: newell(f_N, X, Y, Z), yy: newell(f_N, Y, Z, X), zz: newell(f_N, Z, X, Y),
    xy: newell(g_N, X, Y, Z), xz: newell(g_N, X, Z, Y), yz: newell(g_N, Y, Z, X)
  };
}

// ===== FFT (길이 P 고정, 트위들/비트반전 미리 계산) =====
function makeFFT(P) {
  const rev = new Uint32Array(P);
  for (let i = 1, j = 0; i < P; i++) { let bit = P >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; rev[i] = j; }
  const cs = new Float64Array(P / 2), sn = new Float64Array(P / 2);
  for (let k = 0; k < P / 2; k++) { cs[k] = Math.cos(2 * Math.PI * k / P); sn[k] = -Math.sin(2 * Math.PI * k / P); }
  const lr = new Float64Array(P), li = new Float64Array(P);
  function line(re, im, base, stride, inv) {
    for (let k = 0; k < P; k++) { const q = base + rev[k] * stride; lr[k] = re[q]; li[k] = im[q]; }
    const sg = inv ? -1 : 1;
    for (let len = 2; len <= P; len <<= 1) {
      const half = len >> 1, step = P / len;
      for (let i = 0; i < P; i += len) {
        for (let k = 0; k < half; k++) {
          const wr = cs[k * step], wi = sg * sn[k * step], a = i + k, b = a + half;
          const tr = lr[b] * wr - li[b] * wi, ti = lr[b] * wi + li[b] * wr;
          lr[b] = lr[a] - tr; li[b] = li[a] - ti; lr[a] += tr; li[a] += ti;
        }
      }
    }
    for (let k = 0; k < P; k++) { const q = base + k * stride; re[q] = lr[k]; im[q] = li[k]; }
  }
  // 전체 3D (커널용)
  function full(re, im, inv) {
    const P2 = P * P;
    for (let z = 0; z < P; z++) for (let y = 0; y < P; y++) line(re, im, P * y + P2 * z, 1, inv);
    for (let z = 0; z < P; z++) for (let x = 0; x < P; x++) line(re, im, x + P2 * z, P, inv);
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) line(re, im, x + P * y, P2, inv);
  }
  // 입력이 x,y,z < N 영역에만 있는 경우의 순방향
  function fwdPruned(re, im, N) {
    const P2 = P * P;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) line(re, im, P * y + P2 * z, 1, false);
    for (let z = 0; z < N; z++) for (let x = 0; x < P; x++) line(re, im, x + P2 * z, P, false);
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) line(re, im, x + P * y, P2, false);
  }
  // 출력이 x,y,z < N 영역만 필요한 경우의 역방향 (스케일 미포함)
  function invPruned(re, im, N) {
    const P2 = P * P;
    for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) line(re, im, x + P * y, P2, true);
    for (let z = 0; z < N; z++) for (let x = 0; x < P; x++) line(re, im, x + P2 * z, P, true);
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) line(re, im, P * y + P2 * z, 1, true);
  }
  return { full, fwdPruned, invPruned };
}
function fft3(re, im, P, inv) { makeFFT(P).full(re, im, inv); if (inv) { const s = 1 / (P * P * P); for (let i = 0; i < re.length; i++) { re[i] *= s; im[i] *= s; } } }


// ===== 결함 배치 (같은 seed면 메인/워커에서 같은 결과) =====
function rng(seed) { let x = (seed >>> 0) || 1; return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; }; }
function buildDefects(N, cfg) {
  const n3 = N * N * N, R = rng(cfg.seed);
  const ms = new Float64Array(n3).fill(1), exw = new Float64Array(n3).fill(1);
  const kp = new Float64Array(n3), kpAxis = new Float64Array(3 * n3), kind = new Uint8Array(n3);
  let rot = null, grain = null;
  const a = cfg.amount;
  const randUnit = () => { const u = 2 * R() - 1, p = 2 * Math.PI * R(), s = Math.sqrt(1 - u * u); return [s * Math.cos(p), s * Math.sin(p), u]; };
  if (cfg.gb || cfg.poly) {
    const G = 3 + Math.round(a * 5), seeds = [];
    for (let g = 0; g < G; g++) seeds.push([R() * N, R() * N, R() * N]);
    grain = new Uint8Array(n3);
    for (let z = 0, id = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++, id++) {
      let d1 = 1e9, d2 = 1e9, g1 = 0;
      for (let g = 0; g < G; g++) { const d = Math.hypot(x + 0.5 - seeds[g][0], y + 0.5 - seeds[g][1], z + 0.5 - seeds[g][2]); if (d < d1) { d2 = d1; d1 = d; g1 = g; } else if (d < d2) d2 = d; }
      grain[id] = g1;
      if (cfg.gb && d2 - d1 < 0.8) { exw[id] = 0.1; kind[id] = 2; }
    }
    if (cfg.poly) {
      const mats = [];
      for (let g = 0; g < G; g++) { // 균일 무작위 회전 (사원수)
        const u1 = R(), u2 = R(), u3 = R();
        const q = [Math.sqrt(1 - u1) * Math.sin(2 * Math.PI * u2), Math.sqrt(1 - u1) * Math.cos(2 * Math.PI * u2), Math.sqrt(u1) * Math.sin(2 * Math.PI * u3), Math.sqrt(u1) * Math.cos(2 * Math.PI * u3)];
        const [x, y, z, w] = q;
        mats.push([1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)]);
      }
      rot = new Float64Array(9 * n3);
      for (let id = 0; id < n3; id++) rot.set(mats[grain[id]], 9 * id);
    }
  }
  const sphere = (cx, cy, cz, r, fn) => {
    for (let z = Math.max(0, Math.floor(cz - r)); z <= Math.min(N - 1, Math.ceil(cz + r)); z++)
      for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(N - 1, Math.ceil(cy + r)); y++)
        for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++)
          if (Math.hypot(x - cx, y - cy, z - cz) <= r) fn(x + N * (y + N * z));
  };
  if (cfg.prec) {
    const k = 1 + Math.round(a * 4);
    for (let i = 0; i < k; i++) {
      const ax = randUnit(), r = 1.2 + R() * 1.0;
      sphere(R() * (N - 1), R() * (N - 1), R() * (N - 1), r, (id) => { kp[id] = cfg.precK; kpAxis[3 * id] = ax[0]; kpAxis[3 * id + 1] = ax[1]; kpAxis[3 * id + 2] = ax[2]; kind[id] = 3; });
    }
  }
  if (cfg.incl) {
    const k = 1 + Math.round(a * 4);
    for (let i = 0; i < k; i++) {
      const r = 1.3 + R() * 1.4;
      sphere(R() * (N - 1), R() * (N - 1), R() * (N - 1), r, (id) => { ms[id] = 0; kp[id] = 0; kind[id] = 1; });
    }
  }
  if (cfg.shape && cfg.shape !== 'cube') { // 입자 모양: 바깥 상자 안에서 모양 밖의 칸은 비자성(빈 공간)으로
    const c = (N - 1) / 2, h = N / 2;
    for (let z = 0, id = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++, id++) {
      const u = (x - c) / h, v = (y - c) / h, w = (z - c) / h; let inside = true;
      if (cfg.shape === 'sphere') inside = u * u + v * v + w * w <= 1;
      else if (cfg.shape === 'plate') inside = Math.abs(v) <= 0.25;
      else if (cfg.shape === 'disk') inside = u * u + w * w <= 1 && Math.abs(v) <= 0.25;
      else if (cfg.shape === 'rod') inside = Math.abs(v) <= 1 / 3 && Math.abs(w) <= 1 / 3;
      if (!inside) { ms[id] = 0; kp[id] = 0; kind[id] = 4; }
    }
  }
  return { ms, exw, kp, kpAxis, rot, kind };
}

// ===== 에너지 항목 계산 (CPU·GPU 공통): 반자장 hd(환산 단위)를 받아 각 에너지를 J 단위로 =====
function energyTerms(o) {
  const MU0e = 4e-7 * Math.PI, N = o.N, V = o.d * o.d * o.d, Kd = MU0e * o.Ms * o.Ms, m = o.m, hd = o.hd;
  let ex = 0, an = 0, dm = 0, ze = 0, st = 0, n = 0; const ua = o.axis || [0, 1, 0], sa = o.stressAxis || [1, 0, 0];
  for (let z = 0, id = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++, id++) {
    if (!(o.ms[id] > 0)) continue; n++;
    const i = 3 * id, mx = m[i], my = m[i + 1], mz = m[i + 2];
    dm += -0.5 * Kd * V * (mx * hd[i] + my * hd[i + 1] + mz * hd[i + 2]);
    ze += -Kd * V * (mx * o.happ[0] + my * o.happ[1] + mz * o.happ[2]);
    const wi = o.exw[id];
    for (const [ok, j] of [[x < N - 1, id + 1], [y < N - 1, id + N], [z < N - 1, id + N * N]]) {
      if (!ok || !(o.ms[j] > 0)) continue; const w = Math.min(wi, o.exw[j]);
      const dx = mx - m[3 * j], dy = my - m[3 * j + 1], dz = mz - m[3 * j + 2]; ex += o.A * o.d * w * (dx * dx + dy * dy + dz * dz);
    }
    let lx = mx, ly = my, lz = mz;
    if (o.rot) { const r = o.rot, q = 9 * id; lx = r[q] * mx + r[q + 3] * my + r[q + 6] * mz; ly = r[q + 1] * mx + r[q + 4] * my + r[q + 7] * mz; lz = r[q + 2] * mx + r[q + 5] * my + r[q + 8] * mz; }
    if (o.aniso === 'cubic') an += V * (o.K1 * (lx * lx * ly * ly + ly * ly * lz * lz + lz * lz * lx * lx) + (o.K2 || 0) * lx * lx * ly * ly * lz * lz);
    else if (o.aniso === 'uniaxial') { const d = lx * ua[0] + ly * ua[1] + lz * ua[2], s = 1 - d * d; an += V * (o.K1 * s + (o.K2 || 0) * s * s); }
    if (o.kp && o.kp[id]) { const d = mx * o.kpAxis[i] + my * o.kpAxis[i + 1] + mz * o.kpAxis[i + 2]; an += -V * o.kp[id] * d * d; }
    if (o.stressK) { const d = mx * sa[0] + my * sa[1] + mz * sa[2]; st += -V * o.stressK * d * d; }
  }
  return { ex, an, dm, ze, st, tot: ex + an + dm + ze + st, vol: n * V };
}

// ===== 마이크로마그네틱 솔버 (정육면체, N³ 셀, 환산 단위 h = H/Ms) =====
class Micro {
  constructor(N) {
    this.N = N; const P = 2 * N; this.P = P; const PP = P * P * P, n3 = N * N * N;
    this.F = makeFFT(P);
    this.m = new Float64Array(3 * n3); this.h = new Float64Array(3 * n3);
    this.k1 = new Float64Array(3 * n3); this.mt = new Float64Array(3 * n3);
    this.ar = new Float64Array(PP); this.ai = new Float64Array(PP);
    this.br = new Float64Array(PP); this.bi = new Float64Array(PP);
    const keys = ['xx', 'yy', 'zz', 'xy', 'xz', 'yz'], K = {};
    const tmpI = new Float64Array(PP);
    keys.forEach(k => { K[k] = new Float64Array(PP); });
    for (let z = 0; z < P; z++) for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      if (x === N || y === N || z === N) continue;
      const X = x < N ? x : x - P, Y = y < N ? y : y - P, Z = z < N ? z : z - P;
      const t = demagTensor(X, Y, Z), idx = x + P * (y + P * z);
      keys.forEach(k => { K[k][idx] = t[k]; });
    }
    keys.forEach(k => { tmpI.fill(0); this.F.full(K[k], tmpI, false); }); // 결과는 실수 (대칭성)
    this.K = K;
    // -k 인덱스 표
    const neg = new Uint32Array(PP);
    for (let z = 0; z < P; z++) for (let y = 0; y < P; y++) for (let x = 0; x < P; x++)
      neg[x + P * (y + P * z)] = ((P - x) % P) + P * (((P - y) % P) + P * ((P - z) % P));
    this.neg = neg;
    this.mat = null; this.happ = [0, 0, 0]; this.alpha = 0.5; this.t = 0; this.lastTorque = 1;
    this.T = 0; this.noise = new Float64Array(3 * n3); this.stressK = 0; this.stressAxis = [1, 0, 0];
    this.setDefects(null);
  }
  setDefects(d) {
    const n3 = this.N ** 3;
    if (!d) d = { ms: new Float64Array(n3).fill(1), exw: new Float64Array(n3).fill(1), kp: new Float64Array(n3), kpAxis: new Float64Array(3 * n3), rot: null };
    this.ms = d.ms; this.exw = d.exw; this.kp = d.kp; this.kpAxis = d.kpAxis; this.rot = d.rot;
    let mx = 0; for (let i = 0; i < n3; i++) mx = Math.max(mx, Math.abs(d.kp[i])); this.kpMax = mx;
    this.magCount = 0; for (let i = 0; i < n3; i++) if (d.ms[i] > 0) this.magCount++;
    if (this.mat) this.setMaterial(this.mat, this.edge);
  }
  setMaterial(mat, edge_nm) {
    this.mat = mat; const d = edge_nm * 1e-9 / this.N; this.cell = d;
    const Ms = mat.Ms;
    this.cex = 2 * mat.A / (MU0 * Ms * Ms * d * d);
    this.ck = 2 * mat.K1 / (MU0 * Ms * Ms); this.ck2 = 2 * (mat.K2 || 0) / (MU0 * Ms * Ms);
    this.timeUnit = 1 / (GAMMA * MU0 * Ms);
    this.cpk = 2 / (MU0 * Ms * Ms); this.cs = 2 * this.stressK / (MU0 * Ms * Ms);
    this.cellV = d * d * d;
    this.stiff = 12 * this.cex + Math.abs(this.ck) * 2 + Math.abs(this.ck2) * 4 + 2 * this.cpk * (this.kpMax || 0) + 2 * Math.abs(this.cs) + 2; this.edge = edge_nm;
    this.updateDt();
  }
  updateDt() { this.dt = this.relax ? 1.8 / this.stiff : Math.min(0.1, (this.alpha >= 0.2 ? 1.5 : 1.0) / this.stiff); } // relax: 평형 찾기 모드(세차운동 없이 에너지가 가장 빨리 줄어드는 방향으로만)
  perturb(amp) { // 평형 찾기 모드에서 대칭 때문에 불안정한 평형(안장점)에 멈추지 않도록 아주 작게 흔듦
    const m = this.m;
    for (let i = 0; i < m.length; i += 3) { if (!(this.ms[i / 3] > 0)) continue; m[i] += amp * (Math.random() - 0.5); m[i + 1] += amp * (Math.random() - 0.5); m[i + 2] += amp * (Math.random() - 0.5); const n = Math.hypot(m[i], m[i + 1], m[i + 2]); m[i] /= n; m[i + 1] /= n; m[i + 2] /= n; }
  }
  energies() { // 반자장만 따로 계산한 뒤 모든 에너지 항목을 구함
    const sv = [this.cex, this.ck, this.ck2, this.cpk, this.cs, this.happ, this.T];
    this.cex = this.ck = this.ck2 = this.cpk = this.cs = 0; this.happ = [0, 0, 0]; this.T = 0;
    const hd = new Float64Array(this.m.length); this.field(this.m, hd);
    [this.cex, this.ck, this.ck2, this.cpk, this.cs, this.happ, this.T] = sv;
    const mat = this.mat;
    return energyTerms({ N: this.N, m: this.m, hd, ms: this.ms, exw: this.exw, kp: this.kp, kpAxis: this.kpAxis, rot: this.rot, Ms: mat.Ms, A: mat.A, K1: mat.K1, K2: mat.K2, aniso: mat.aniso, axis: mat.axis, d: this.cell, happ: this.happ, stressK: this.stressK, stressAxis: this.stressAxis });
  }
  initState(kind) {
    const N = this.N, m = this.m;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = 3 * (x + N * (y + N * z)); let v;
      if (kind === 'uniform') v = [1, 0.02, 0.01];
      else if (kind === 'vortex') {
        const cx = x - (N - 1) / 2, cy = y - (N - 1) / 2, r = Math.hypot(cx, cy) + 1e-9;
        v = [-cy / r, cx / r, Math.exp(-r * r / 4)];
      } else { // random
        const u = Math.random() * 2 - 1, p = Math.random() * 2 * Math.PI, s = Math.sqrt(1 - u * u);
        v = [s * Math.cos(p), s * Math.sin(p), u];
      }
      const n = Math.hypot(v[0], v[1], v[2]); m[i] = v[0] / n; m[i + 1] = v[1] / n; m[i + 2] = v[2] / n;
    }
    this.t = 0;
  }
  field(m, h) {
    const N = this.N, P = this.P, K = this.K, mat = this.mat, neg = this.neg;
    const ar = this.ar, ai = this.ai, br = this.br, bi = this.bi;
    ar.fill(0); ai.fill(0); br.fill(0); bi.fill(0);
    if (!this.noDemag) {
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = 3 * (x + N * (y + N * z)), p = x + P * (y + P * z);
      const w = this.ms[i / 3]; ar[p] = w * m[i]; ai[p] = w * m[i + 1]; br[p] = w * m[i + 2];
    }
    this.F.fwdPruned(ar, ai, N); this.F.fwdPruned(br, bi, N);
    const L = ar.length, Kxx = K.xx, Kyy = K.yy, Kzz = K.zz, Kxy = K.xy, Kxz = K.xz, Kyz = K.yz;
    // A = Mx + i My 에서 Mx, My 분리 후 H = -N M, 다시 Hx + i Hy, Hz로 묶음 (제자리 처리를 위해 k, -k 쌍으로)
    for (let p = 0; p < L; p++) {
      const q = neg[p]; if (q < p) continue;
      const Ar = ar[p], Ai = ai[p], Cr = ar[q], Ci = ai[q];
      // Mx(p) = (A(p)+conj(A(q)))/2 , My(p) = (A(p)-conj(A(q)))/(2i)
      const mxr = 0.5 * (Ar + Cr), mxi = 0.5 * (Ai - Ci), myr = 0.5 * (Ai + Ci), myi = -0.5 * (Ar - Cr);
      const mzr = br[p], mzi = bi[p];
      // q 쪽: Mx(q) = conj(Mx(p)), My(q) = conj(My(p)), Mz(q) = br[q], bi[q]
      const mzr2 = br[q], mzi2 = bi[q];
      const xx = Kxx[p], yy = Kyy[p], zz = Kzz[p], xy = Kxy[p], xz = Kxz[p], yz = Kyz[p];
      const xx2 = Kxx[q], yy2 = Kyy[q], zz2 = Kzz[q], xy2 = Kxy[q], xz2 = Kxz[q], yz2 = Kyz[q];
      const hxr = -(xx * mxr + xy * myr + xz * mzr), hxi = -(xx * mxi + xy * myi + xz * mzi);
      const hyr = -(xy * mxr + yy * myr + yz * mzr), hyi = -(xy * mxi + yy * myi + yz * mzi);
      const hzr = -(xz * mxr + yz * myr + zz * mzr), hzi = -(xz * mxi + yz * myi + zz * mzi);
      const hxr2 = -(xx2 * mxr + xy2 * myr + xz2 * mzr2), hxi2 = -(-xx2 * mxi - xy2 * myi + xz2 * mzi2);
      const hyr2 = -(xy2 * mxr + yy2 * myr + yz2 * mzr2), hyi2 = -(-xy2 * mxi - yy2 * myi + yz2 * mzi2);
      const hzr2 = -(xz2 * mxr + yz2 * myr + zz2 * mzr2), hzi2 = -(-xz2 * mxi - yz2 * myi + zz2 * mzi2);
      ar[p] = hxr - hyi; ai[p] = hxi + hyr; br[p] = hzr; bi[p] = hzi;
      if (q !== p) { ar[q] = hxr2 - hyi2; ai[q] = hxi2 + hyr2; br[q] = hzr2; bi[q] = hzi2; }
    }
    this.F.invPruned(ar, ai, N); this.F.invPruned(br, bi, N);
    }
    const sc = 1 / (this.P * this.P * this.P);
    const cex = this.cex, ck = this.ck, ck2 = this.ck2, ha = this.happ, ua = mat.axis, msA = this.ms, exw = this.exw, kp = this.kp, kpA = this.kpAxis, rot = this.rot, cpk = this.cpk, cs = this.cs, sa = this.stressAxis, nz = this.noise, useN = this.T > 0;
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const id = x + N * (y + N * z), i = 3 * id, p = x + P * (y + P * z);
      if (msA[id] === 0) { h[i] = h[i + 1] = h[i + 2] = 0; continue; }
      let hx = ar[p] * sc + ha[0], hy = ai[p] * sc + ha[1], hz = br[p] * sc + ha[2];
      const mx = m[i], my = m[i + 1], mz = m[i + 2], wi = exw[id];
      // 교환 (비자성 이웃은 건너뜀, 결합 세기 = 두 칸 중 작은 값)
      let ex = 0, ey = 0, ez = 0;
      const nb = (j) => { const jd = j / 3; if (msA[jd] === 0) return; const w = wi < exw[jd] ? wi : exw[jd]; ex += w * (m[j] - mx); ey += w * (m[j + 1] - my); ez += w * (m[j + 2] - mz); };
      if (x > 0) nb(i - 3); if (x < N - 1) nb(i + 3);
      if (y > 0) nb(i - 3 * N); if (y < N - 1) nb(i + 3 * N);
      if (z > 0) nb(i - 3 * N * N); if (z < N - 1) nb(i + 3 * N * N);
      hx += cex * ex; hy += cex * ey; hz += cex * ez;
      // 결정 이방성 (다결정이면 결정립 좌표계에서 계산)
      let lx = mx, ly = my, lz = mz, r = null;
      if (rot) { const o = 9 * id; r = rot; lx = r[o] * mx + r[o + 3] * my + r[o + 6] * mz; ly = r[o + 1] * mx + r[o + 4] * my + r[o + 7] * mz; lz = r[o + 2] * mx + r[o + 5] * my + r[o + 8] * mz; }
      let ax = 0, ay = 0, az = 0;
      if (mat.aniso === 'cubic') {
        ax = -ck * lx * (ly * ly + lz * lz); ay = -ck * ly * (lx * lx + lz * lz); az = -ck * lz * (lx * lx + ly * ly);
        if (ck2) { const q = lx * lx * ly * ly * lz * lz; if (q) { ax -= ck2 * lx * ly * ly * lz * lz; ay -= ck2 * ly * lx * lx * lz * lz; az -= ck2 * lz * lx * lx * ly * ly; } }
      }
      else if (mat.aniso === 'uniaxial') { const d = lx * ua[0] + ly * ua[1] + lz * ua[2], f = ck * d + 2 * ck2 * (1 - d * d) * d; ax = f * ua[0]; ay = f * ua[1]; az = f * ua[2]; }
      if (r) { const o = 9 * id; hx += r[o] * ax + r[o + 1] * ay + r[o + 2] * az; hy += r[o + 3] * ax + r[o + 4] * ay + r[o + 5] * az; hz += r[o + 6] * ax + r[o + 7] * ay + r[o + 8] * az; }
      else { hx += ax; hy += ay; hz += az; }
      // 석출물의 국소 단축 이방성
      if (kp[id] !== 0) { const c = cpk * kp[id], u0 = kpA[i], u1 = kpA[i + 1], u2 = kpA[i + 2], d = mx * u0 + my * u1 + mz * u2; hx += c * d * u0; hy += c * d * u1; hz += c * d * u2; }
      // 내부 응력 (자기탄성 단축 이방성)
      if (cs !== 0) { const d = mx * sa[0] + my * sa[1] + mz * sa[2]; hx += cs * d * sa[0]; hy += cs * d * sa[1]; hz += cs * d * sa[2]; }
      if (useN) { hx += nz[i]; hy += nz[i + 1]; hz += nz[i + 2]; }
      h[i] = hx; h[i + 1] = hy; h[i + 2] = hz;
    }
  }
  rhs(m, h, out) { // LLG, 환산 단위 (relax 모드에서는 dm/dt = −m×(m×h): 감쇠만 남긴 에너지 경사 하강)
    const relax = !!this.relax, a = relax ? 1 : this.alpha, pre = relax ? -1 : -1 / (1 + a * a); let tmax = 0;
    for (let i = 0; i < m.length; i += 3) {
      const mx = m[i], my = m[i + 1], mz = m[i + 2], hx = h[i], hy = h[i + 1], hz = h[i + 2];
      const cx = my * hz - mz * hy, cy = mz * hx - mx * hz, cz = mx * hy - my * hx;
      const dx = my * cz - mz * cy, dy = mz * cx - mx * cz, dz = mx * cy - my * cx;
      if (relax) { out[i] = -dx; out[i + 1] = -dy; out[i + 2] = -dz; } else { out[i] = pre * (cx + a * dx); out[i + 1] = pre * (cy + a * dy); out[i + 2] = pre * (cz + a * dz); }
      const t = cx * cx + cy * cy + cz * cz; if (t > tmax) tmax = t;
    }
    return Math.sqrt(tmax);
  }
  makeNoise() { // 브라운 열 자기장 (환산 단위), 두 Heun 단계에서 같은 값 사용
    if (!(this.T > 0) || this.relax) { if (this.relax) this.noise.fill(0); return; }
    const kB = 1.380649e-23, Ms = this.mat.Ms;
    const sig = Math.sqrt(2 * this.alpha * kB * this.T / (MU0 * Ms * Ms * this.cellV * this.dt));
    const nz = this.noise;
    for (let i = 0; i < nz.length; i += 2) {
      const u = Math.random() || 1e-12, v = Math.random(), r = sig * Math.sqrt(-2 * Math.log(u));
      nz[i] = r * Math.cos(2 * Math.PI * v); if (i + 1 < nz.length) nz[i + 1] = r * Math.sin(2 * Math.PI * v);
    }
  }
  step() { // Heun (확률 항은 Stratonovich 해석)
    this.makeNoise();
    const m = this.m, h = this.h, k1 = this.k1, mt = this.mt, dt = this.dt, n = m.length;
    this.field(m, h); this.lastTorque = this.rhs(m, h, k1);
    for (let i = 0; i < n; i++) mt[i] = m[i] + dt * k1[i];
    this.normalize(mt);
    this.field(mt, h); this.rhs(mt, h, h); // h에 k2 저장
    for (let i = 0; i < n; i++) m[i] += 0.5 * dt * (k1[i] + h[i]);
    this.normalize(m); this.t += dt;
  }
  normalize(m) {
    for (let i = 0; i < m.length; i += 3) {
      const n = Math.hypot(m[i], m[i + 1], m[i + 2]); m[i] /= n; m[i + 1] /= n; m[i + 2] /= n;
    }
  }
  average() {
    const m = this.m, w = this.ms; let s = [0, 0, 0];
    for (let i = 0; i < m.length; i += 3) { const a = w[i / 3]; s[0] += a * m[i]; s[1] += a * m[i + 1]; s[2] += a * m[i + 2]; }
    const n = this.magCount || 1; return [s[0] / n, s[1] / n, s[2] / n];
  }
}

