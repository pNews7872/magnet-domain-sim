// 거시 계산 엔진: 같은 자속 기준 자기력선, 블록 해석 실행, 힘, 자기력선 추적
// ===== 같은 자속 기준 시작점: 자석 가운데 단면을 실제 자속이 같은 n×n 칸으로 나눠 각 칸의 자속 중앙에서 시작 =====
function equalFluxSeeds(Bf, R, c, n, hy, hz) {
  const NS = 40, u = [R[0], R[1], R[2]], b = [0, 0, 0], w = new Float64Array(NS * NS);
  const pos = (y, z) => [c[0] + R[3] * y + R[6] * z, c[1] + R[4] * y + R[7] * z, c[2] + R[5] * y + R[8] * z];
  const ys = (i) => -hy + 2 * hy * (i + 0.5) / NS, zs = (j) => -hz + 2 * hz * (j + 0.5) / NS;
  for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) { const p = pos(ys(i), zs(j)); Bf(p[0], p[1], p[2], b); w[i * NS + j] = Math.max(0, b[0] * u[0] + b[1] * u[1] + b[2] * u[2]); }
  // 누적 분포의 역함수 (칸 안에서는 선형 보간)
  const inv = (cdf, q, lo, span) => { const tot = cdf[cdf.length - 1], t = q * tot; let k = 0; while (k < cdf.length - 1 && cdf[k + 1] < t) k++; const a = cdf[k], d = (cdf[k + 1] - a) || 1; return lo + span * (k + (t - a) / d) / (cdf.length - 1); };
  const rowSum = new Float64Array(NS); for (let i = 0; i < NS; i++) for (let j = 0; j < NS; j++) rowSum[i] += w[i * NS + j];
  const cdfY = new Float64Array(NS + 1); for (let i = 0; i < NS; i++) cdfY[i + 1] = cdfY[i] + rowSum[i];
  const seeds = [];
  for (let a = 0; a < n; a++) {
    const y0 = inv(cdfY, a / n, -hy, 2 * hy), y1 = inv(cdfY, (a + 1) / n, -hy, 2 * hy), yc = inv(cdfY, (a + 0.5) / n, -hy, 2 * hy);
    // 이 띠 안의 z 방향 분포 (경계에 걸친 행은 겹친 비율만큼)
    const colSum = new Float64Array(NS);
    for (let i = 0; i < NS; i++) { const r0 = -hy + 2 * hy * i / NS, r1 = r0 + 2 * hy / NS, f = Math.max(0, Math.min(r1, y1) - Math.max(r0, y0)) / (r1 - r0); if (f > 0) for (let j = 0; j < NS; j++) colSum[j] += f * w[i * NS + j]; }
    const cdfZ = new Float64Array(NS + 1); for (let j = 0; j < NS; j++) cdfZ[j + 1] = cdfZ[j] + colSum[j];
    for (let k = 0; k < n; k++) seeds.push(pos(yc, inv(cdfZ, (k + 0.5) / n, -hz, 2 * hz)));
  }
  return seeds;
}
// ===== 거시 엔진: 자석 자기장, 블록 해석, 힘, 자기력선 =====
function makeMacroEngine(post) {
  const n = 8, TH = 2.5, MAG_HALF = [0.5, 1, 1], BR = 1.3;
  const S = new MacroSolver(n, TH); S.maxNewton = 20; S.cgIters = 10; S.maxSub = 4;
  const h = S.h, n3 = S.n3;
  let mat = null, frame = null, J = new Float64Array(3 * n3), HdC = new Float64Array(3 * n3), linear = false, chiLin = 0;
  function Btool(x, y, z, out) {
    const R = frame.R, c = frame.c, dx = x - c[0], dy = y - c[1], dz = z - c[2];
    const lx = R[0] * dx + R[1] * dy + R[2] * dz, ly = R[3] * dx + R[4] * dy + R[5] * dz, lz = R[6] * dx + R[7] * dy + R[8] * dz;
    const hh = cuboidH_z(ly, lz, lx, MAG_HALF[1], MAG_HALF[2], MAG_HALF[0], BR);
    let hx = hh[2], hy = hh[0], hz = hh[1];
    if (Math.abs(lx) < MAG_HALF[0] && Math.abs(ly) < MAG_HALF[1] && Math.abs(lz) < MAG_HALF[2]) hx += BR;
    out[0] = R[0] * hx + R[3] * hy + R[6] * hz; out[1] = R[1] * hx + R[4] * hy + R[7] * hz; out[2] = R[2] * hx + R[5] * hy + R[8] * hz; return out;
  }
  // 블록 2×2×2 묶음 (먼 곳용 쌍극자)
  const SUP = []; for (let Z = 0; Z < n / 2; Z++) for (let Y = 0; Y < n / 2; Y++) for (let X = 0; X < n / 2; X++) {
    const kids = []; for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) kids.push((2 * X + i) + n * ((2 * Y + j) + n * (2 * Z + k)));
    SUP.push({ kids, c: [-TH + h * (2 * X + 1), -TH + h * (2 * Y + 1), -TH + h * (2 * Z + 1)], J: [0, 0, 0] });
  }
  let anyJ = false;
  function prepTarget() {
    anyJ = false;
    for (const s of SUP) { s.J = [0, 0, 0]; for (const k of s.kids) { s.J[0] += J[3 * k]; s.J[1] += J[3 * k + 1]; s.J[2] += J[3 * k + 2]; } if (s.J[0] || s.J[1] || s.J[2]) anyJ = true; }
  }
  function dip(rx, ry, rz, Jx, Jy, Jz, vol, out) { // B (T) of a block with polarization J (T), volume vol (cm³), at r (cm)
    const r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2), k = vol / (4 * Math.PI * r2 * r), d = (Jx * rx + Jy * ry + Jz * rz) / r2;
    out[0] += k * (3 * d * rx - Jx); out[1] += k * (3 * d * ry - Jy); out[2] += k * (3 * d * rz - Jz);
  }
  function Btarget(x, y, z, out) {
    out[0] = out[1] = out[2] = 0; if (!anyJ) return out;
    if (Math.abs(x) < TH && Math.abs(y) < TH && Math.abs(z) < TH) { // 내부: 블록 중심값 삼선형 보간 B = μ0(Hd + M)
      const fx = Math.min(n - 1.0001, Math.max(0, (x + TH) / h - 0.5)), fy = Math.min(n - 1.0001, Math.max(0, (y + TH) / h - 0.5)), fz = Math.min(n - 1.0001, Math.max(0, (z + TH) / h - 0.5));
      const i0 = Math.floor(fx), j0 = Math.floor(fy), k0 = Math.floor(fz), tx = fx - i0, ty = fy - j0, tz = fz - k0;
      for (let dk = 0; dk < 2; dk++) for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
        const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz), id = (i0 + di) + n * ((j0 + dj) + n * (k0 + dk));
        out[0] += w * (HdC[3 * id] + J[3 * id]); out[1] += w * (HdC[3 * id + 1] + J[3 * id + 1]); out[2] += w * (HdC[3 * id + 2] + J[3 * id + 2]);
      }
      return out;
    }
    const v1 = h * h * h, v8 = 8 * v1, near2 = (1.8 * h) ** 2, far2 = (2.6 * 2 * h) ** 2;
    for (const s of SUP) {
      const rx = x - s.c[0], ry = y - s.c[1], rz = z - s.c[2], r2 = rx * rx + ry * ry + rz * rz;
      if (r2 > far2) { dip(rx, ry, rz, s.J[0] / 8, s.J[1] / 8, s.J[2] / 8, v8, out); continue; }
      for (const k of s.kids) {
        const c = S.centers[k], qx = x - c[0], qy = y - c[1], qz = z - c[2], q2 = qx * qx + qy * qy + qz * qz;
        if (q2 < near2) { const b = cuboidH(qx, qy, qz, h / 2, h / 2, h / 2, J[3 * k], J[3 * k + 1], J[3 * k + 2]); out[0] += b[0]; out[1] += b[1]; out[2] += b[2]; }
        else dip(qx, qy, qz, J[3 * k], J[3 * k + 1], J[3 * k + 2], v1, out);
      }
    }
    return out;
  }
  const bt = [0, 0, 0], bt2 = [0, 0, 0];
  function Btotal(x, y, z, out) { Btool(x, y, z, out); Btarget(x, y, z, bt); out[0] += bt[0]; out[1] += bt[1]; out[2] += bt[2]; return out; }
  // 블록 평균 외부장 (2³ 표본)
  const SUBO = [-0.25, 0.25];
  function computeHext() {
    const H = new Float64Array(3 * n3), b = [0, 0, 0];
    for (let i = 0; i < n3; i++) { const c = S.centers[i]; let sx = 0, sy = 0, sz = 0;
      for (const a of SUBO) for (const bb of SUBO) for (const d of SUBO) { Btool(c[0] + a * h, c[1] + bb * h, c[2] + d * h, b); sx += b[0]; sy += b[1]; sz += b[2]; }
      H[3 * i] = sx / 8 / MU0; H[3 * i + 1] = sy / 8 / MU0; H[3 * i + 2] = sz / 8 / MU0; }
    return H;
  }
  function computeForce(M) { // F = Σ V (M·∇) B_tool, 블록당 2³ 표본
    const F = [0, 0, 0], d = 0.01, Vs = Math.pow(h * 0.01 / 2, 3), a = [0, 0, 0], b = [0, 0, 0];
    for (let i = 0; i < n3; i++) {
      const Mx = M[3 * i], My = M[3 * i + 1], Mz = M[3 * i + 2]; if (!Mx && !My && !Mz) continue; const c = S.centers[i];
      for (const o1 of SUBO) for (const o2 of SUBO) for (const o3 of SUBO) {
        const p = [c[0] + o1 * h, c[1] + o2 * h, c[2] + o3 * h], Mv = [Mx, My, Mz];
        for (let j = 0; j < 3; j++) { const q1 = p.slice(), q2 = p.slice(); q1[j] += d; q2[j] -= d; Btool(q1[0], q1[1], q1[2], a); Btool(q2[0], q2[1], q2[2], b);
          const g = Vs * Mv[j] / (2 * d * 0.01); F[0] += g * (a[0] - b[0]); F[1] += g * (a[1] - b[1]); F[2] += g * (a[2] - b[2]); }
      }
    }
    return F;
  }
  function trace(seeds) {
    const maxSteps = 1500, b1 = [0, 0, 0], b2 = [0, 0, 0], out = [];
    const stepSize = (p) => { const c = frame.c, dm = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]), dc = Math.max(0, Math.hypot(p[0], p[1], p[2]) - 3.6); return Math.min(0.9, Math.max(0.06, 0.035 * Math.min(dm, dc + 1.2))); };
    for (const s of seeds) {
      const half = []; let closed = false;
      for (const dir of [1, -1]) {
        const pts = [s.slice()]; let p = s.slice(), travel = 0;
        for (let k = 0; k < maxSteps; k++) {
          const hs = stepSize(p);
          Btotal(p[0], p[1], p[2], b1); let nn = Math.hypot(b1[0], b1[1], b1[2]) || 1;
          const mid = [p[0] + 0.5 * hs * dir * b1[0] / nn, p[1] + 0.5 * hs * dir * b1[1] / nn, p[2] + 0.5 * hs * dir * b1[2] / nn];
          Btotal(mid[0], mid[1], mid[2], b2); nn = Math.hypot(b2[0], b2[1], b2[2]) || 1;
          p = [p[0] + hs * dir * b2[0] / nn, p[1] + hs * dir * b2[1] / nn, p[2] + hs * dir * b2[2] / nn]; pts.push(p);
          if (Math.hypot(p[0], p[1], p[2]) > 80) break;
          travel += hs;
          if (travel > 1.5 && Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]) < Math.max(0.3, hs)) { closed = true; pts.push(s.slice()); break; } // 출발점 근처로 돌아오면 닫힘
        }
        half.push(pts); if (closed) break;
      }
      let pts = half[0]; if (!closed && half[1]) pts = half[1].slice(1).reverse().concat(half[0]);
      out.push(pts);
    }
    return out;
  }
  let busy = false, pending = null;
  function run(d) {
    const t0 = Date.now();
    frame = d.frame;
    const Hx = computeHext();
    let M;
    if (!mat || mat.off) { M = new Float64Array(3 * n3); }
    else if (mat.small) { M = Hx.map(v => v * mat.chi); } // |χ|≪1
    else { S.update(Hx); M = S.M; }
    for (let i = 0; i < 3 * n3; i++) J[i] = MU0 * M[i];
    if (mat && !mat.small && !mat.off) { for (let i = 0; i < 3 * n3; i++) HdC[i] = MU0 * S.Hd[i]; } else HdC.fill(0);
    if (mat && mat.small) { // 작은 χ: 반자장 무시
      HdC.fill(0);
    }
    prepTarget();
    const avg = [0, 0, 0]; for (let i = 0; i < n3; i++) { avg[0] += M[3 * i] / n3; avg[1] += M[3 * i + 1] / n3; avg[2] += M[3 * i + 2] / n3; }
    const F = computeForce(M);
    let lines = null;
    if (d.lines) {
      const R = frame.R, c = frame.c, seeds = [];
      if (Math.hypot(c[0], c[1], c[2]) < 100) seeds.push(...equalFluxSeeds(Btotal, R, c, 6, MAG_HALF[1], MAG_HALF[2]));
      const am = Math.hypot(avg[0], avg[1], avg[2]);
      if (anyJ && am > 1 && mat && !mat.small && Math.hypot(frame.c[0], frame.c[1], frame.c[2]) > 100) { // 자석을 치웠을 때만 // 정육면체 자체의 자기력선 (자석을 치운 뒤 잔류 자화를 보기 위해)
        const u = avg.map(v => v / am), t1 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
        const e1 = [u[1] * t1[2] - u[2] * t1[1], u[2] * t1[0] - u[0] * t1[2], u[0] * t1[1] - u[1] * t1[0]], n1 = Math.hypot(...e1); e1.forEach((v, i) => e1[i] = v / n1);
        const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
        for (const a of [-1.4, 0, 1.4]) for (const b of [-1.4, 0, 1.4]) if (a || b) seeds.push([a * e1[0] + b * e2[0], a * e1[1] + b * e2[1], a * e1[2] + b * e2[2]]); // 대칭축 위 선은 닫히지 않으므로 제외
      }
      const L = trace(seeds); let tot = 0; for (const l of L) tot += l.length;
      const pos = new Float32Array(3 * tot), len = new Int32Array(L.length); let w = 0;
      L.forEach((l, i) => { len[i] = l.length; for (const p of l) { pos[w++] = p[0]; pos[w++] = p[1]; pos[w++] = p[2]; } });
      lines = { pos, len };
    }
    // 미리보기용: 정육면체 주변 격자에 정육면체가 만드는 B, 먼 곳용 묶음 쌍극자
    const G = 16, LO = -4.5, SPc = 9 / (G - 1), grid = new Float32Array(3 * G * G * G), bb = [0, 0, 0];
    if (anyJ) for (let k = 0, w = 0; k < G; k++) for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { Btarget(LO + i * SPc, LO + j * SPc, LO + k * SPc, bb); grid[w++] = bb[0]; grid[w++] = bb[1]; grid[w++] = bb[2]; }
    const sup = new Float32Array(3 * SUP.length); SUP.forEach((s, i) => { sup[3 * i] = s.J[0]; sup[3 * i + 1] = s.J[1]; sup[3 * i + 2] = s.J[2]; });
    const Mf = Float32Array.from(M);
    const tr = [Mf.buffer, grid.buffer, sup.buffer]; if (lines) tr.push(lines.pos.buffer, lines.len.buffer);
    post({ type: 'result', id: d.id, M: Mf, avg, F, lines, grid, sup, anyJ, ms: Date.now() - t0 }, tr);
  }
  function pump() { if (busy || !pending) return; busy = true; const d = pending; pending = null; try { run(d); } finally { busy = false; } if (pending) setTimeout(pump, 0); }
  return {
    msg(d) {
      if (d.type === 'mat') {
        const old = mat; mat = d.mat;
        if (mat.reset || !old || old.key !== mat.key) S.reset(mat.off || mat.small ? null : mat);
        else if (!mat.off && !mat.small) {
          if (old.off) S.reset(mat); else { const r = mat.Ms / (old.Ms || mat.Ms); if (isFinite(r) && r > 0 && r !== 1) { for (let i = 0; i < n3; i++) for (let k = 0; k < 6; k++) S.st[9 * i + k] *= r; } S.p = mat; }
        }
      }
      else if (d.type === 'update') { pending = d; setTimeout(pump, 0); }
    }
  };
}

