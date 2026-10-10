// Jiles–Atherton 이력 모형과 5 cm 정육면체 블록 정자기 해석기
// 벡터 Jiles–Atherton (Bergqvist형) : state = {Mi:[3], M:[3], He:[3]}
function langevin(x) { return Math.abs(x) < 1e-4 ? x / 3 : 1 / Math.tanh(x) - 1 / x; }
function jaMan(He, p, out) {
  const h = Math.hypot(He[0], He[1], He[2]);
  if (h < 1e-12) { out[0] = He[0] * p.Ms / (3 * p.a); out[1] = He[1] * p.Ms / (3 * p.a); out[2] = He[2] * p.Ms / (3 * p.a); return; }
  const s = p.Ms * langevin(h / p.a) / h; out[0] = He[0] * s; out[1] = He[1] * s; out[2] = He[2] * s;
}
// st: Float64Array(9) [Mi(3), M(3), He(3)], H0 -> H1 직선 경로
function jaStep(st, H0, H1, p, nsub) {
  const Man = [0, 0, 0], He = [0, 0, 0];
  for (let s = 1; s <= nsub; s++) {
    const t = s / nsub, H = [H0[0] + (H1[0] - H0[0]) * t, H0[1] + (H1[1] - H0[1]) * t, H0[2] + (H1[2] - H0[2]) * t];
    const Mi0 = [st[0], st[1], st[2]];
    let Mx = st[3], My = st[4], Mz = st[5];
    for (let it = 0; it < 3; it++) {
      He[0] = H[0] + p.alpha * Mx; He[1] = H[1] + p.alpha * My; He[2] = H[2] + p.alpha * Mz;
      jaMan(He, p, Man);
      const dx = He[0] - st[6], dy = He[1] - st[7], dz = He[2] - st[8];
      const D0 = Man[0] - Mi0[0], D1 = Man[1] - Mi0[1], D2 = Man[2] - Mi0[2], Dn = Math.hypot(D0, D1, D2);
      let mi0 = Mi0[0], mi1 = Mi0[1], mi2 = Mi0[2];
      if (Dn > 1e-12) {
        let pr = (D0 * dx + D1 * dy + D2 * dz) / Dn;
        if (pr > 0) {
          let f = pr / p.k; if (f > 1) f = 1; // 한 단계에 무이력 곡선을 넘지 않도록
          mi0 += D0 * f; mi1 += D1 * f; mi2 += D2 * f;
        }
      }
      Mx = p.c * Man[0] + (1 - p.c) * mi0; My = p.c * Man[1] + (1 - p.c) * mi1; Mz = p.c * Man[2] + (1 - p.c) * mi2;
      if (it === 2) { st[0] = mi0; st[1] = mi1; st[2] = mi2; }
    }
    st[3] = Mx; st[4] = My; st[5] = Mz; st[6] = He[0]; st[7] = He[1]; st[8] = He[2];
  }
}

// ===== 거시 블록 정자기 해석기 (5 cm 정육면체를 n³ 블록으로, Jiles–Atherton 이력) =====
class MacroSolver {
  constructor(n, halfCm) {
    this.n = n; const P = 2 * n; this.P = P; const PP = P * P * P, n3 = n * n * n; this.n3 = n3;
    this.half = halfCm; this.h = 2 * halfCm / n; // 블록 한 변 (cm)
    this.F = makeFFT(P);
    const keys = ['xx', 'yy', 'zz', 'xy', 'xz', 'yz'], K = {}, tmpI = new Float64Array(PP);
    keys.forEach(k => { K[k] = new Float64Array(PP); });
    for (let z = 0; z < P; z++) for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) {
      if (x === n || y === n || z === n) continue;
      const X = x < n ? x : x - P, Y = y < n ? y : y - P, Z = z < n ? z : z - P;
      const t = demagTensor(X, Y, Z), idx = x + P * (y + P * z);
      keys.forEach(k => { K[k][idx] = t[k]; });
    }
    keys.forEach(k => { tmpI.fill(0); this.F.full(K[k], tmpI, false); });
    this.K = K;
    this.wr = [0, 1, 2].map(() => new Float64Array(PP)); this.wi = [0, 1, 2].map(() => new Float64Array(PP));
    this.st = new Float64Array(9 * n3); // JA 상태
    this.H = new Float64Array(3 * n3); this.Hext = new Float64Array(3 * n3); this.Hd = new Float64Array(3 * n3);
    this.chi = new Float64Array(n3).fill(100);
    this.p = null;
    this.centers = [];
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++)
      this.centers.push([-halfCm + this.h * (x + 0.5), -halfCm + this.h * (y + 0.5), -halfCm + this.h * (z + 0.5)]);
  }
  reset(p) { this.p = p && !p.off ? p : null; this.st.fill(0); this.H.fill(0); this.Hext.fill(0); this.Hd.fill(0); this.chi.fill(p ? Math.max(1, p.chi0 || 100) : 1); }
  get M() { const n3 = this.n3, M = new Float64Array(3 * n3); for (let i = 0; i < n3; i++) { M[3 * i] = this.st[9 * i + 3]; M[3 * i + 1] = this.st[9 * i + 4]; M[3 * i + 2] = this.st[9 * i + 5]; } return M; }
  // out = N·M  (H_d = −N·M)
  applyN(M, out) {
    const n = this.n, P = this.P, wr = this.wr, wi = this.wi, K = this.K;
    for (let c = 0; c < 3; c++) { wr[c].fill(0); wi[c].fill(0); }
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = 3 * (x + n * (y + n * z)), p = x + P * (y + P * z); wr[0][p] = M[i]; wr[1][p] = M[i + 1]; wr[2][p] = M[i + 2]; }
    for (let c = 0; c < 3; c++) this.F.fwdPruned(wr[c], wi[c], n);
    const L = wr[0].length;
    for (let p = 0; p < L; p++) {
      const ar = wr[0][p], ai = wi[0][p], br = wr[1][p], bi = wi[1][p], cr = wr[2][p], ci = wi[2][p];
      const xx = K.xx[p], yy = K.yy[p], zz = K.zz[p], xy = K.xy[p], xz = K.xz[p], yz = K.yz[p];
      wr[0][p] = xx * ar + xy * br + xz * cr; wi[0][p] = xx * ai + xy * bi + xz * ci;
      wr[1][p] = xy * ar + yy * br + yz * cr; wi[1][p] = xy * ai + yy * bi + yz * ci;
      wr[2][p] = xz * ar + yz * br + zz * cr; wi[2][p] = xz * ai + yz * bi + zz * ci;
    }
    for (let c = 0; c < 3; c++) this.F.invPruned(wr[c], wi[c], n);
    const sc = 1 / L;
    for (let z = 0; z < n; z++) for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = 3 * (x + n * (y + n * z)), p = x + P * (y + P * z); out[i] = wr[0][p] * sc; out[i + 1] = wr[1][p] * sc; out[i + 2] = wr[2][p] * sc; }
  }
  // (diag(1/χ) + N) x = b  : 켤레 기울기법
  cg(b, x, iters) {
    const N3 = 3 * this.n3, r = new Float64Array(N3), z = new Float64Array(N3), p = new Float64Array(N3), Ap = new Float64Array(N3), chi = this.chi;
    const A = (v, out) => { this.applyN(v, out); for (let i = 0; i < N3; i++) out[i] += v[i] / chi[(i / 3) | 0]; };
    const Pinv = (i) => 1 / (1 / chi[(i / 3) | 0] + 1 / 3);
    A(x, Ap); for (let i = 0; i < N3; i++) { r[i] = b[i] - Ap[i]; z[i] = r[i] * Pinv(i); p[i] = z[i]; }
    let rz = 0, bn = 0; for (let i = 0; i < N3; i++) { rz += r[i] * z[i]; bn += b[i] * b[i] * Pinv(i) * Pinv(i); }
    if (bn === 0) return 0;
    let k = 0;
    for (; k < iters; k++) {
      A(p, Ap); let pAp = 0; for (let i = 0; i < N3; i++) pAp += p[i] * Ap[i];
      const al = rz / pAp; let rn = 0;
      for (let i = 0; i < N3; i++) { x[i] += al * p[i]; r[i] -= al * Ap[i]; z[i] = r[i] * Pinv(i); rn += z[i] * z[i]; }
      if (rn < 1e-12 * bn) break;
      let rz2 = 0; for (let i = 0; i < N3; i++) rz2 += r[i] * z[i];
      const be = rz2 / rz; rz = rz2; for (let i = 0; i < N3; i++) p[i] = z[i] + be * p[i];
    }
    return k;
  }
  // 새 외부 자기장 분포로 이동 (이력 경로를 따라)
  update(HextNew) {
    const p = this.p, n3 = this.n3, N3 = 3 * n3; if (!p) { this.Hext.set(HextNew); return; }
    let maxd = 0; for (let i = 0; i < N3; i++) maxd = Math.max(maxd, Math.abs(HextNew[i] - this.Hext[i]));
    const scale = p.linear ? 1e9 : Math.max(p.k, p.a, 50);
    const S = Math.min(this.maxSub || 8, Math.max(1, Math.ceil(maxd / (10 * scale))));
    const H0ext = Float64Array.from(this.Hext);
    const st0 = new Float64Array(9 * n3), M0 = new Float64Array(N3), rhs = new Float64Array(N3), NdM = new Float64Array(N3);
    for (let s = 1; s <= S; s++) {
      const t = s / S, He1 = new Float64Array(N3);
      for (let i = 0; i < N3; i++) He1[i] = H0ext[i] + (HextNew[i] - H0ext[i]) * t;
      st0.set(this.st);
      for (let i = 0; i < n3; i++) { M0[3 * i] = st0[9 * i + 3]; M0[3 * i + 1] = st0[9 * i + 4]; M0[3 * i + 2] = st0[9 * i + 5]; }
      // 현재 H(=Hext−N M0)와 목표 사이 잔차
      this.applyN(M0, NdM);
      for (let i = 0; i < N3; i++) rhs[i] = He1[i] - NdM[i] - this.H[i]; // 이 블록이 더 받아야 하는 H 변화량 (M 고정 시)
      // 준뉴턴 + 선 탐색: R(ΔH) = ΔH + N·ΔM_JA(ΔH) − rhs = 0
      const dH = new Float64Array(N3), R = new Float64Array(N3), dMj = new Float64Array(N3), dMs = new Float64Array(N3), trial = new Float64Array(9 * n3);
      const dHt = new Float64Array(N3), trialT = new Float64Array(9 * n3), dMt = new Float64Array(N3);
      let rmax0 = 0; for (let i = 0; i < N3; i++) rmax0 = Math.max(rmax0, Math.abs(rhs[i]));
      const evalR = (dHx, trialOut, dMout, Rout) => {
        for (let i = 0; i < n3; i++) {
          const sub = st0.slice(9 * i, 9 * i + 9);
          const H0 = [this.H[3 * i], this.H[3 * i + 1], this.H[3 * i + 2]], H1 = [H0[0] + dHx[3 * i], H0[1] + dHx[3 * i + 1], H0[2] + dHx[3 * i + 2]];
          if (p.linear) { sub[3] = p.chi * H1[0]; sub[4] = p.chi * H1[1]; sub[5] = p.chi * H1[2]; }
          else jaStep(sub, H0, H1, p, 3);
          trialOut.set(sub, 9 * i);
          dMout[3 * i] = sub[3] - M0[3 * i]; dMout[3 * i + 1] = sub[4] - M0[3 * i + 1]; dMout[3 * i + 2] = sub[5] - M0[3 * i + 2];
        }
        this.applyN(dMout, NdM);
        let r = 0; for (let i = 0; i < N3; i++) { Rout[i] = dHx[i] + NdM[i] - rhs[i]; r += Rout[i] * Rout[i]; }
        return Math.sqrt(r);
      };
      let rn = evalR(dH, trial, dMj, R);
      const tol = 1e-4 * Math.sqrt(N3) * rmax0 + 1;
      const dmax = p.linear ? 1e12 : 0.6 * Math.max(p.a, p.k, 20);
      for (let it = 0; it < (this.maxNewton || 30) && rn > tol; it++) {
        for (let i = 0; i < n3; i++) {
          const h2 = dH[3 * i] ** 2 + dH[3 * i + 1] ** 2 + dH[3 * i + 2] ** 2;
          if (h2 > 1e-6) this.chi[i] = Math.max(1, Math.min(1e7, (dMj[3 * i] * dH[3 * i] + dMj[3 * i + 1] * dH[3 * i + 1] + dMj[3 * i + 2] * dH[3 * i + 2]) / h2));
        }
        for (let i = 0; i < N3; i++) R[i] = -R[i];
        dMs.fill(0); this.cg(R, dMs, this.cgIters || 20);
        let lam = 1, ok = false, smax = 0;
        for (let i = 0; i < N3; i++) smax = Math.max(smax, Math.abs(dMs[i] / this.chi[(i / 3) | 0]));
        if (smax > dmax) lam = dmax / smax;
        for (let ls = 0; ls < 14; ls++) {
          for (let i = 0; i < N3; i++) dHt[i] = dH[i] + lam * dMs[i] / this.chi[(i / 3) | 0];
          const rt = evalR(dHt, trialT, dMt, R); if (typeof DEBUG !== "undefined" && DEBUG > 1) console.log("  lam", lam, "rt", rt.toFixed(2), "rn", rn.toFixed(2), "maxdH", Math.max(...dMs.map((v,i)=>Math.abs(v/this.chi[(i/3)|0]))).toFixed(2));
          if (rt < rn) { rn = rt; dH.set(dHt); trial.set(trialT); dMj.set(dMt); ok = true; break; }
          lam *= 0.5;
        }
        if (!ok) { if (typeof DEBUG !== "undefined") console.log("ls fail it", it, rn, tol); evalR(dH, trial, dMj, R); break; }
      }
      this.st.set(trial);
      for (let i = 0; i < N3; i++) this.H[i] += dH[i];
    }
    this.Hext.set(HextNew);
    const M = this.M; this.applyN(M, this.Hd); for (let i = 0; i < N3; i++) this.Hd[i] = -this.Hd[i];
  }
}

