// 화면, 조작, 계산 엔진 연결
(function () {
'use strict';
const $ = (id) => document.getElementById(id);

// ===== 재료 =====
const MATS = {
  Fe: { name: '철', topic: '철은', kind: 'ferro', Ms: 1.71e6, A: 2.1e-11, K1: 4.8e4, K2: -1.0e4, K1_0: 5.7e4, aniso: 'cubic', axis: [0, 1, 0], Tc: 1043, s: 0.35, p: 4, Aexp: 2, lam: -7e-6, peff: 3.2, nat: 8.49e28, color: 0x8a949c, anisoText: '입방, 용이축 ⟨100⟩', def: 40,
        ja: { a: 97.6, k: 155.2, c: 0.05, alpha: 4.539e-5, chi0: 500 }, ref: { name: '순철 99.8%, 풀림', Hc: 80, Br: 1.30, mu: 5000 }, fit: { Hc: 128, Br: 0.90, mu: 2900 } },
  St: { name: '강철', topic: '강철은', kind: 'ferro', Ms: 1.71e6, A: 2.1e-11, K1: 4.8e4, K2: -1.0e4, K1_0: 5.7e4, aniso: 'cubic', axis: [0, 1, 0], Tc: 1043, s: 0.35, p: 4, Aexp: 2, lam: -7e-6, peff: 3.2, nat: 8.49e28, color: 0x5f666d, anisoText: '나노 계산은 철 값으로 근사', def: 40, macroMs: 1.6e6, approxMicro: true,
        ja: { a: 1627, k: 8386, c: 0.144, alpha: 0, chi0: 50 }, ref: { name: '탄소 0.9% 강, 담금질', Hc: 5570, Br: 1.03, mu: 100 }, fit: { Hc: 5263, Br: 1.08, mu: 88 } },
  Co: { name: '코발트', topic: '코발트는', kind: 'ferro', Ms: 1.40e6, A: 3.0e-11, K1: 4.5e5, K2: 1.5e5, Ksum_0: 8.7e5, aniso: 'uniaxial', axis: [0, 1, 0], Tc: 1388, s: 0.11, p: 2.5, Aexp: 2, lam: -62e-6, peff: 3.15, nat: 9.09e28, color: 0x7f8ea0, anisoText: '단축, 용이축 1개 (화면 y축)', def: 50, warnHi: 500,
        ja: { a: 1022, k: 1018, c: 0.106, alpha: 3.634e-4, chi0: 70 }, ref: { name: '코발트 99%, 풀림', Hc: 796, Br: 0.50, mu: 250 }, fit: { Hc: 830, Br: 0.49, mu: 272 } },
  Ni: { name: '니켈', topic: '니켈은', kind: 'ferro', Ms: 4.9e5, A: 9.0e-12, K1: -4.5e3, K2: -2.3e3, K1_0: -1.2e5, aniso: 'cubic', axis: [0, 1, 0], Tc: 627, s: 0.15, p: 2.5, Aexp: 2, lam: -34e-6, peff: 1.6, nat: 9.14e28, color: 0xb0a998, anisoText: '입방, K₁<0이라 용이축 ⟨111⟩', def: 80,
        ja: { a: 86.11, k: 130.5, c: 0.05, alpha: 1.332e-4, chi0: 110 }, ref: { name: '니켈 99%, 풀림', Hc: 56, Br: 0.40, mu: 600 }, fit: { Hc: 108, Br: 0.25, mu: 967 } },
  Py: { name: '퍼멀로이', topic: '퍼멀로이는', kind: 'ferro', Ms: 8.0e5, A: 1.3e-11, K1: 0, aniso: 'none', axis: [0, 1, 0], Tc: 850, s: 0.25, p: 2.5, Aexp: 2, lam: 0, color: 0x9c9f8e, anisoText: '거의 없음 (Ni₈₀Fe₂₀)', def: 60, approxT: true,
        ja: { a: 1.259, k: 34.72, c: 0.474, alpha: 2.36e-6, chi0: 8000 }, ref: { name: '78 퍼멀로이', Hc: 4.0, Br: 0.70, mu: 100000 }, fit: { Hc: 4.9, Br: 0.60, mu: 96000 } },
  Mt: { name: '자철석', topic: '자철석은', kind: 'ferro', Ms: 4.8e5, A: 1.33e-11, K1: -1.33e4, aniso: 'cubic', axis: [0, 1, 0], Tc: 858, s: 0.3, p: 2.5, Aexp: 1.7, lam: 40e-6, color: 0x4a4d52, anisoText: '입방, 용이축 ⟨111⟩ (Fe₃O₄, 페리자성)', def: 100, approxT: true, warnLo: 130,
        linChi: 3 },
  Al: { name: '알루미늄', topic: '알루미늄은', kind: 'para', chi: 2.2e-5, color: 0xc4c9cf },
  Pt: { name: '백금', topic: '백금은', kind: 'para', chi: 2.6e-4, color: 0xd9d6cf },
  Cu: { name: '구리', topic: '구리는', kind: 'dia', chi: -9.6e-6, color: 0xb87333 },
  Ag: { name: '은', topic: '은은', kind: 'dia', chi: -2.4e-5, color: 0xd0d4d8 },
  Au: { name: '금', topic: '금은', kind: 'dia', chi: -3.4e-5, color: 0xd4a52a },
  Bi: { name: '비스무트', topic: '비스무트는', kind: 'dia', chi: -1.66e-4, color: 0xb9a9c2 }
};
// Kuz'min 식: m(τ) = [1 − sτ^(3/2) − (1−s)τ^p]^(1/3)
function mRed(mat, T) { const t = T / mat.Tc; if (t >= 1) return 0; const v = 1 - mat.s * Math.pow(t, 1.5) - (1 - mat.s) * Math.pow(t, mat.p); return v > 0 ? Math.cbrt(v) : 0; }
// 퀴리 온도 위 상자성: χ = C/(T − θ), C = μ0 n p² μB² / (3kB), θ ≈ Tc로 근사
function chiCW(mat, T) { if (!mat.peff) return 0; const C = MU0 * mat.nat * Math.pow(mat.peff * 9.274e-24, 2) / (3 * 1.380649e-23); return C / Math.max(5, T - mat.Tc); }
// 열 요동 이중 계산 보정: 칸 크기에서 열 요동이 줄이는 정렬 정도 f(x), x = kT/(AΔ) (이 프로그램으로 직접 보정한 곡선)
function thermalF(x) { x = Math.min(2, Math.max(0, x)); return 1 - 0.1435 * x - 0.0115 * x * x; }
function matAtT(mat, T) { // 상온 값을 기준으로 온도 보정
  const m300 = mRed(mat, 300), mT = mRed(mat, T), r = mT / m300;
  // 이방성: 0 K와 상온 측정값이 있으면 그 두 점을 지나는 m^n 법칙, 없으면 Callen–Callen
  let n = mat.aniso === 'cubic' ? 10 : 3;
  if (mat.K1_0) n = Math.log(mat.K1 / mat.K1_0) / Math.log(m300);
  else if (mat.Ksum_0) n = Math.log((mat.K1 + mat.K2) / mat.Ksum_0) / Math.log(m300);
  const kf = mT > 0 ? Math.pow(r, n) : 0;
  return { Ms: mat.Ms * r, A: mat.A * Math.pow(r, mat.Aexp), K1: mat.K1 * kf, K2: (mat.K2 || 0) * kf, aniso: mat.aniso, axis: mat.axis, ratio: r, m: mT, nK: n };
}
let tempK = 300;
const FE_MS = 1.71e6;
const lexOf = (m) => Math.sqrt(2 * m.A / (MU0 * m.Ms * m.Ms));
let NGRID = 16;
(function fillTable() {
  const tb = $('matTable');
  ['Fe', 'Co', 'Ni', 'Py', 'Mt'].forEach(k => {
    const m = MATS[k], tr = document.createElement('tr');
    tr.innerHTML = `<td>${m.name}</td><td>${sci(m.Ms)}</td><td>${sci(m.A)}</td><td>${m.K1 ? sci(m.K1) : '≈ 0'}${m.K2 ? ', K₂ ' + sci(m.K2) : ''}</td><td>${m.anisoText}</td><td>${(lexOf(m) * 1e9).toFixed(1)} nm</td><td>${m.Tc} K</td><td>${m.lam ? sci(m.lam) : '≈ 0'}</td>`;
    tb.appendChild(tr);
  });
  const jb = $('jaTable');
  ['Fe', 'St', 'Ni', 'Co', 'Py'].forEach(k => {
    const m = MATS[k], tr = document.createElement('tr'), j = m.ja;
    tr.innerHTML = `<td>${m.name} (${m.ref.name})</td><td>${sci(m.ref.Hc)} → ${sci(m.fit.Hc)}</td><td>${m.ref.Br.toFixed(2)} → ${m.fit.Br.toFixed(2)}</td><td>${sci(m.ref.mu)} → ${sci(m.fit.mu)}</td><td>a ${sci(j.a)}, k ${sci(j.k)}, c ${j.c}, α ${j.alpha ? sci(j.alpha) : '0'}</td>`;
    jb.appendChild(tr);
  });
})();

function sci(v, d = 2) {
  if (v === 0) return '0';
  const e = Math.floor(Math.log10(Math.abs(v)));
  if (e >= -2 && e <= 3) return v.toFixed(Math.max(0, d - Math.max(0, e))).replace(/\.0+$/, '');
  const sup = String(e).replace(/-/g, '⁻').replace(/\d/g, c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[c]);
  return (v / Math.pow(10, e)).toFixed(d - 1) + '×10' + sup;
}
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) $('flowChk').checked = false;

function cssColor(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }

// ===== 거시 장면 =====
const TH = 2.5; // 정육면체 반폭 (cm)
const MAG_HALF = [0.5, 1, 1]; // 자석 반폭 (cm): 자화 방향(국소 x)으로 두께 1 cm
const BR = 1.3; // T
let matKey = 'Fe';
let targetJ = [0, 0, 0]; // μ0 M (T)
let targetM = [0, 0, 0];
let forceN = [0, 0, 0];

function makeRenderer(container) {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
  catch (e) { container.innerHTML = '<div class="overlay on"><div>이 브라우저에서 WebGL을 사용할 수 없어 3D 화면을 그릴 수 없어요. 다른 브라우저에서 열어 보세요.</div></div>'; throw e; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.insertBefore(r.domElement, container.firstChild);
  return r;
}

const macroView = $('macroView');
const mR = makeRenderer(macroView);
const mScene = new THREE.Scene();
const mCam = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
mCam.position.set(9, 10, 17);
mScene.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 0.85));
const dl = new THREE.DirectionalLight(0xffffff, 0.6); dl.position.set(6, 12, 8); mScene.add(dl);

// 정육면체
const cubeMat = new THREE.MeshStandardMaterial({ color: MATS.Fe.color, transparent: true, opacity: 0.32, roughness: 0.55, metalness: 0.3, depthWrite: false });
const cube = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 5), cubeMat);
mScene.add(cube);
const cubeEdges = new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), new THREE.LineBasicMaterial({ color: 0x555f69 }));
mScene.add(cubeEdges);

// 바닥 격자 (방향 감각용)
const grid = new THREE.GridHelper(30, 30, 0x9aa5ae, 0xbcc5cc);
grid.position.y = -2.5 - 0.01; grid.material.transparent = true; grid.material.opacity = 0.35;
mScene.add(grid);

// 자석
function letterTexture(ch, bg) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = bg; g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#ffffff'; g.font = '600 84px "IBM Plex Sans KR", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(ch, 64, 70);
  const t = new THREE.CanvasTexture(c); return t;
}
const magnet = new THREE.Group();
const nColor = 0xc4262e, sColor = 0x2a5da8;
function halfBox(color, letter, sign) {
  const tex = letterTexture(letter, '#' + color.toString(16).padStart(6, '0'));
  const plain = new THREE.MeshStandardMaterial({ color, roughness: 0.4, metalness: 0.25 });
  const lettered = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.4, metalness: 0.25 });
  // BoxGeometry 면 순서: +x, -x, +y, -y, +z, -z
  const mats = [plain, plain, lettered, lettered, lettered, lettered];
  if (sign > 0) mats[0] = lettered; else mats[1] = lettered;
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2, 2), mats);
  b.position.x = sign * 0.25; return b;
}
magnet.add(halfBox(nColor, 'N', 1));
magnet.add(halfBox(sColor, 'S', -1));
mScene.add(magnet);
let yaw = 0, tilt = 0;
const HOME = new THREE.Vector3(-6.5, 0, 0);
magnet.position.copy(HOME);
function applyRot() { magnet.rotation.set(0, yaw, tilt, 'YZX'); magnet.updateMatrixWorld(true); }
applyRot();

// 탐침 표시
const probeMarker = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshBasicMaterial({ color: 0xd08a10 }));
mScene.add(probeMarker);

// 평균 자화 / 힘 화살표
const mArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 1, 0x1d2630, 0.6, 0.4);
const fArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 3.6, 0), 1, 0xd08a10, 0.5, 0.35);
mScene.add(mArrow); mScene.add(fArrow);

// 축 표시
function axisTriad(scene, pos, len, labelSize) {
  const g = new THREE.Group();
  const cols = [0xc4262e, 0x2f8f4e, 0x2a5da8], names = ['x', 'y', 'z'];
  const dirs = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];
  dirs.forEach((d, i) => {
    g.add(new THREE.ArrowHelper(d, new THREE.Vector3(), len, cols[i], len * 0.25, len * 0.15));
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'); x.fillStyle = '#' + cols[i].toString(16).padStart(6, '0'); x.font = '600 44px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(names[i], 32, 34);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthTest: false }));
    s.scale.set(labelSize, labelSize, 1); s.position.copy(d.clone().multiplyScalar(len * 1.22)); g.add(s);
  });
  g.position.copy(pos); scene.add(g); return g;
}
axisTriad(mScene, new THREE.Vector3(-13, -2.5, 9), 2, 0.9);

// 자기력선
const MAX_LINES = 46, MAX_PTS = 3000;
const linePos = new Float32Array(MAX_LINES * MAX_PTS * 2 * 3);
const lineGeo = new THREE.BufferGeometry();
lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
const lineCol = new Float32Array(MAX_LINES * MAX_PTS * 2 * 3);
lineGeo.setAttribute('color', new THREE.BufferAttribute(lineCol, 3));
lineGeo.setDrawRange(0, 0);
const lineMat = new THREE.LineBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.6 });
const lineInk = new THREE.Color(0x1d2630), lineHot = new THREE.Color(0xc2541b); // 기본 선 / 정육면체를 지나는 선
const lineObj = new THREE.LineSegments(lineGeo, lineMat);
mScene.add(lineObj);
const DOTS_MAX = 160, dotPos = new Float32Array(MAX_LINES * DOTS_MAX * 3); // 선 길이에 비례한 개수
const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.BufferAttribute(dotPos, 3)); dotGeo.setDrawRange(0, 0);
const dotMat = new THREE.PointsMaterial({ color: 0x1d2630, size: 0.2, sizeAttenuation: true });
const dotObj = new THREE.Points(dotGeo, dotMat);
mScene.add(dotObj);
let lines = [], allLines = []; // 화면에 보이는 선 / 계산된 전체 선
let flowPhase = 0;

let touchDragMagnet = false, userOrbiting = false;
const mCtl = (function () {
  // 자석 끌기: OrbitControls보다 먼저 등록
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hit = new THREE.Vector3(), offset = new THREE.Vector3();
  let dragging = false, pid = null;
  const el = mR.domElement;
  function setNdc(e) { const r = el.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); }
  // 터치 처리 (OrbitControls보다 먼저 등록해서 한 손가락 동작은 페이지 스크롤로 넘김)
  let lpTimer = null, t0x = 0, t0y = 0;
  const touchNdc = (t) => { const r = el.getBoundingClientRect(); ndc.set(((t.clientX - r.left) / r.width) * 2 - 1, -((t.clientY - r.top) / r.height) * 2 + 1); };
  el.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { clearTimeout(lpTimer); return; } // 두 손가락은 OrbitControls로
    e.stopImmediatePropagation();
    const t = e.touches[0]; t0x = t.clientX; t0y = t.clientY;
    clearTimeout(lpTimer);
    lpTimer = setTimeout(() => { // 길게 누르면 자석 잡기
      touchNdc(t); ray.setFromCamera(ndc, mCam);
      if (ray.intersectObject(magnet, true).length) {
        touchDragMagnet = true; controls.enabled = false; plane.constant = -magnet.position.y;
        if (ray.ray.intersectPlane(plane, hit)) offset.copy(magnet.position).sub(hit);
        if (navigator.vibrate) navigator.vibrate(15);
        $('macroHintTouch').textContent = '자석을 잡았어요. 끌어서 옮기세요';
      }
    }, 350);
  }, { passive: false });
  el.addEventListener('touchmove', (e) => {
    if (touchDragMagnet) {
      e.preventDefault(); e.stopImmediatePropagation();
      touchNdc(e.touches[0]); ray.setFromCamera(ndc, mCam);
      if (ray.ray.intersectPlane(plane, hit)) { const p = hit.add(offset); magnet.position.x = Math.max(-14, Math.min(14, p.x)); magnet.position.z = Math.max(-14, Math.min(14, p.z)); resolveOverlap(); markDirty(); }
      return;
    }
    if (e.touches.length === 1) {
      const t = e.touches[0]; if (Math.hypot(t.clientX - t0x, t.clientY - t0y) > 8) clearTimeout(lpTimer);
      e.stopImmediatePropagation(); // 스크롤 허용
    }
  }, { passive: false });
  const tend = (e) => { clearTimeout(lpTimer); if (touchDragMagnet && e.touches.length === 0) { touchDragMagnet = false; controls.enabled = true; $('macroHintTouch').textContent = touchHintText; } };
  el.addEventListener('touchend', tend); el.addEventListener('touchcancel', tend);
  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') return;
    setNdc(e); ray.setFromCamera(ndc, mCam);
    if (ray.intersectObject(magnet, true).length) {
      dragging = true; pid = e.pointerId; controls.enabled = false; el.setPointerCapture(pid);
      plane.constant = -magnet.position.y;
      if (ray.ray.intersectPlane(plane, hit)) offset.copy(magnet.position).sub(hit);
      el.style.cursor = 'grabbing';
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (!dragging) {
      setNdc(e); ray.setFromCamera(ndc, mCam);
      el.style.cursor = ray.intersectObject(magnet, true).length ? 'grab' : '';
      return;
    }
    setNdc(e); ray.setFromCamera(ndc, mCam);
    if (ray.ray.intersectPlane(plane, hit)) {
      const p = hit.add(offset);
      magnet.position.x = Math.max(-14, Math.min(14, p.x));
      magnet.position.z = Math.max(-14, Math.min(14, p.z));
      resolveOverlap(); markDirty();
    }
  });
  const end = () => { if (dragging) { dragging = false; controls.enabled = true; try { el.releasePointerCapture(pid); } catch (e) {} el.style.cursor = ''; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  const controls = new THREE.OrbitControls(mCam, el);
  controls.target.set(-1.5, 0, 0); controls.enableDamping = true; controls.minDistance = 6; controls.maxDistance = 60;
  controls.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
  return controls;
})();

function magnetFrame() {
  const e = magnet.matrixWorld.elements; // 열 우선
  return { R: [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]], c: [magnet.position.x, magnet.position.y, magnet.position.z] };
}
let MF = magnetFrame();
function magnetHalfExtents() {
  const R = MF.R, h = MAG_HALF;
  // 월드 축 방향 반폭 = Σ |R_ij| h_j  (R 열 j = 국소 축 j의 월드 방향)
  return [0, 1, 2].map(i => Math.abs(R[i]) * h[0] + Math.abs(R[3 + i]) * h[1] + Math.abs(R[6 + i]) * h[2]);
}
function resolveOverlap() {
  magnet.updateMatrixWorld(true); MF = magnetFrame();
  const he = magnetHalfExtents(), p = magnet.position, gap = 0.05;
  const ox = TH + he[0] + gap - Math.abs(p.x), oy = TH + he[1] + gap - Math.abs(p.y), oz = TH + he[2] + gap - Math.abs(p.z);
  if (ox > 0 && oy > 0 && oz > 0) {
    if (ox < oz) p.x = Math.sign(p.x || -1) * (TH + he[0] + gap);
    else p.z = Math.sign(p.z || 1) * (TH + he[2] + gap);
  }
  magnet.updateMatrixWorld(true); MF = magnetFrame();
}

// 자석 자기장 (T), 월드 좌표 cm
function Btool(x, y, z, out) {
  const R = MF.R, c = MF.c;
  const dx = x - c[0], dy = y - c[1], dz = z - c[2];
  const lx = R[0] * dx + R[1] * dy + R[2] * dz, ly = R[3] * dx + R[4] * dy + R[5] * dz, lz = R[6] * dx + R[7] * dy + R[8] * dz;
  // 국소 x 방향 자화 → cuboidH_z의 좌표 순환: (y, z, x)
  const h = cuboidH_z(ly, lz, lx, MAG_HALF[1], MAG_HALF[2], MAG_HALF[0], BR);
  let hx = h[2], hy = h[0], hz = h[1];
  if (Math.abs(lx) < MAG_HALF[0] && Math.abs(ly) < MAG_HALF[1] && Math.abs(lz) < MAG_HALF[2]) hx += BR;
  out[0] = R[0] * hx + R[3] * hy + R[6] * hz; out[1] = R[1] * hx + R[4] * hy + R[7] * hz; out[2] = R[2] * hx + R[5] * hy + R[8] * hz;
  return out;
}
// ===== 거시 엔진 (워커) =====
let macroRes = null, macroBusy = false, macroQueued = false, macroReqId = 0, macroEngine = null, magnetAway = false, posVersion = 0, sentVersion = -1;
let pvGrid = null, pvSup = null, pvAny = false, pvAvg = [0, 0, 0];
const PV_G = 16, PV_LO = -4.5, PV_SP = 9 / 15;
const PV_SUPC = []; for (let Z = 0; Z < 4; Z++) for (let Y = 0; Y < 4; Y++) for (let X = 0; X < 4; X++) PV_SUPC.push([-2.5 + 0.625 * (2 * X + 1), -2.5 + 0.625 * (2 * Y + 1), -2.5 + 0.625 * (2 * Z + 1)]);
function BtargetPV(x, y, z, out) {
  out[0] = out[1] = out[2] = 0; if (!pvAny || !pvGrid) return out;
  const fx = (x - PV_LO) / PV_SP, fy = (y - PV_LO) / PV_SP, fz = (z - PV_LO) / PV_SP;
  if (fx >= 0 && fy >= 0 && fz >= 0 && fx < PV_G - 1 && fy < PV_G - 1 && fz < PV_G - 1) {
    const i0 = fx | 0, j0 = fy | 0, k0 = fz | 0, tx = fx - i0, ty = fy - j0, tz = fz - k0;
    for (let dk = 0; dk < 2; dk++) for (let dj = 0; dj < 2; dj++) for (let di = 0; di < 2; di++) {
      const w = (di ? tx : 1 - tx) * (dj ? ty : 1 - ty) * (dk ? tz : 1 - tz), id = 3 * ((i0 + di) + PV_G * ((j0 + dj) + PV_G * (k0 + dk)));
      out[0] += w * pvGrid[id]; out[1] += w * pvGrid[id + 1]; out[2] += w * pvGrid[id + 2];
    }
    return out;
  }
  const vol = 1.25 * 1.25 * 1.25;
  for (let s = 0; s < 64; s++) {
    const c = PV_SUPC[s], rx = x - c[0], ry = y - c[1], rz = z - c[2], r2 = rx * rx + ry * ry + rz * rz, r = Math.sqrt(r2), k = vol / (4 * Math.PI * r2 * r);
    const Jx = pvSup[3 * s] / 8, Jy = pvSup[3 * s + 1] / 8, Jz = pvSup[3 * s + 2] / 8, d = (Jx * rx + Jy * ry + Jz * rz) / r2;
    out[0] += k * (3 * d * rx - Jx); out[1] += k * (3 * d * ry - Jy); out[2] += k * (3 * d * rz - Jz);
  }
  return out;
}
const pvb = [0, 0, 0];
function BtotalPV(x, y, z, out) { if (magnetAway) { out[0] = out[1] = out[2] = 0; } else Btool(x, y, z, out); BtargetPV(x, y, z, pvb); out[0] += pvb[0]; out[1] += pvb[1]; out[2] += pvb[2]; return out; }
// 자석과 정육면체 근처는 촘촘하게, 멀리 갈수록 크게 걷기 (멀리 도는 큰 고리도 끝까지 닫히도록)
function stepSize(p) {
  const c = MF.c, dm = Math.hypot(p[0] - c[0], p[1] - c[1], p[2] - c[2]);
  const dc = Math.max(0, Math.hypot(p[0], p[1], p[2]) - 3.6);
  return Math.min(0.9, Math.max(0.06, 0.035 * Math.min(dm, dc + 1.2)));
}
function tracePreview() {
  if (!$('linesChk').checked) { allLines = []; drawLines(); return; }
  const R = MF.R, c = MF.c, seeds = [];
  if (!magnetAway) seeds.push(...equalFluxSeeds(BtotalPV, R, c, 6, MAG_HALF[1], MAG_HALF[2]));
  const am = Math.hypot(...pvAvg);
  if (pvAny && am > 1 && MATS[matKey].kind === 'ferro' && magnetAway) {
    const u = pvAvg.map(v => v / am), t1 = Math.abs(u[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const e1 = [u[1] * t1[2] - u[2] * t1[1], u[2] * t1[0] - u[0] * t1[2], u[0] * t1[1] - u[1] * t1[0]], n1 = Math.hypot(...e1); e1.forEach((v, i) => e1[i] = v / n1);
    const e2 = [u[1] * e1[2] - u[2] * e1[1], u[2] * e1[0] - u[0] * e1[2], u[0] * e1[1] - u[1] * e1[0]];
    for (const a of [-1.4, 0, 1.4]) for (const b of [-1.4, 0, 1.4]) if (a || b) seeds.push([a * e1[0] + b * e2[0], a * e1[1] + b * e2[1], a * e1[2] + b * e2[2]]);
  }
  const maxSteps = 1500, b1 = [0, 0, 0], b2 = [0, 0, 0];
  allLines = [];
  for (const s of seeds) {
    const half = []; let closed = false;
    for (const dir of [1, -1]) {
      const pts = [s.slice()]; let p = s.slice(), travel = 0;
      for (let k = 0; k < maxSteps; k++) {
        const hs = stepSize(p);
        BtotalPV(p[0], p[1], p[2], b1); let nn = Math.hypot(b1[0], b1[1], b1[2]) || 1;
        const mid = [p[0] + 0.5 * hs * dir * b1[0] / nn, p[1] + 0.5 * hs * dir * b1[1] / nn, p[2] + 0.5 * hs * dir * b1[2] / nn];
        BtotalPV(mid[0], mid[1], mid[2], b2); nn = Math.hypot(b2[0], b2[1], b2[2]) || 1;
        p = [p[0] + hs * dir * b2[0] / nn, p[1] + hs * dir * b2[1] / nn, p[2] + hs * dir * b2[2] / nn]; pts.push(p);
        if (Math.hypot(p[0], p[1], p[2]) > 80) break;
        travel += hs;
        if (travel > 1.5 && Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]) < Math.max(0.3, hs)) { closed = true; pts.push(s.slice()); break; }
      }
      half.push(pts); if (closed) break;
    }
    let pts = half[0]; if (!closed && half[1]) pts = half[1].slice(1).reverse().concat(half[0]);
    const n = Math.min(pts.length, MAX_PTS), arr = new Float32Array(3 * n), cum = new Float32Array(n);
    for (let i = 0; i < n; i++) { arr[3 * i] = pts[i][0]; arr[3 * i + 1] = pts[i][1]; arr[3 * i + 2] = pts[i][2]; if (i) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); }
    allLines.push({ arr, cum, n, len: cum[n - 1] || 1 });
  }
  drawLines();
}
// 고리가 닫히지 않았거나 화면 밖으로 나가 잘리는 선은 그리지 않음
const pv = new THREE.Vector3();
function lineFullyVisible_unused(L) {
  const n = L.n, a = L.arr;
  if (Math.hypot(a[0] - a[3 * n - 3], a[1] - a[3 * n - 2], a[2] - a[3 * n - 1]) > 0.2) return false; // 닫히지 않은 선
  for (let i = 0; i < n; i++) {
    pv.set(a[3 * i], a[3 * i + 1], a[3 * i + 2]).project(mCam);
    if (pv.z < -1 || pv.z > 1 || Math.abs(pv.x) > 0.985 || Math.abs(pv.y) > 0.985) return false;
  }
  return true;
}
let lineViewDirty = false;
function drawLines() {
  lines = allLines;
  let w = 0;
  for (const L of lines) {
    let thru = false; for (let i = 0; i < L.n && !thru; i++) thru = Math.abs(L.arr[3 * i]) < 2.5 && Math.abs(L.arr[3 * i + 1]) < 2.5 && Math.abs(L.arr[3 * i + 2]) < 2.5;
    const cc = thru ? lineHot : lineInk;
    for (let i = 0; i < L.n - 1 && w < linePos.length - 6; i++) { for (let k = 0; k < 6; k++) { lineCol[w] = k % 3 === 0 ? cc.r : k % 3 === 1 ? cc.g : cc.b; linePos[w++] = L.arr[3 * i + k]; } }
  }
  lineGeo.attributes.color.needsUpdate = true;
  lineGeo.attributes.position.needsUpdate = true; lineGeo.setDrawRange(0, w / 3); lineGeo.computeBoundingSphere();
}
function onMacroMsg(d) {
  if (d.type !== 'result') return;
  macroBusy = false; macroRes = d;
  pvGrid = d.grid; pvSup = d.sup; pvAny = d.anyJ; pvAvg = d.avg;
  const fresh = d.id === sentVersion && sentVersion === posVersion;
  applyMacroResult(d, fresh);
  if (macroQueued) { macroQueued = false; requestMacro(); }
}
(function startMacro() {
  const deps = [f_N, g_N, newell, dipoleN, demagTensor, makeFFT, cuboidH_z, cuboidH, langevin, jaMan, jaStep, MacroSolver, equalFluxSeeds, makeMacroEngine];
  try {
    const src = ['const MU0 = ' + MU0 + ', W3 = [-1, 2, -1];'].concat(deps.map(f => f.toString()), [
      'const E = makeMacroEngine((d, tr) => postMessage(d, tr || []));', 'onmessage = (e) => E.msg(e.data);']).join('\n');
    const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    w.onmessage = (e) => onMacroMsg(e.data);
    w.onerror = () => { const E = makeMacroEngine((d) => setTimeout(() => onMacroMsg(d), 0)); macroEngine = { msg: (d) => E.msg(d) }; sendMacroMat(true); macroBusy = false; requestMacro(); };
    macroEngine = { msg: (d) => w.postMessage(d) };
  } catch (e) {
    const E = makeMacroEngine((d) => setTimeout(() => onMacroMsg(d), 0));
    macroEngine = { msg: (d) => E.msg(d) };
  }
})();
function macroMatMsg(reset) {
  const m = MATS[matKey];
  if (m.kind !== 'ferro') return { key: matKey, small: true, chi: m.chi };
  const eff = matAtT(m, tempK);
  if (eff.m < 0.02) { const c = chiCW(m, tempK); return c ? { key: matKey + ':para', small: true, chi: c } : { key: matKey, off: true }; }
  if (m.linChi) return { key: matKey, linear: true, chi: m.linChi, Ms: eff.Ms, reset };
  const r = eff.ratio; // 가정: a, k를 포화자화와 같은 비율로 줄임
  return Object.assign({}, m.ja, { key: matKey, Ms: (m.macroMs || m.Ms) * r, a: m.ja.a * r, k: m.ja.k * r, reset });
}
function sendMacroMat(reset) { macroEngine.msg({ type: 'mat', mat: macroMatMsg(reset) }); }
function requestMacro() {
  if (macroBusy) { macroQueued = true; return; }
  macroBusy = true; $('macroBusy').hidden = false;
  const frame = magnetAway ? { R: MF.R, c: [0, 0, -1e4] } : { R: MF.R, c: MF.c };
  sentVersion = posVersion;
  macroEngine.msg({ type: 'update', id: posVersion, frame, lines: $('linesChk').checked });
}
// 블록별 자화 화살표 (8³)
const BN = 8, BH = 5 / BN;
const bConeGeo = new THREE.ConeGeometry(0.16, 0.5, 8);
const bCones = new THREE.InstancedMesh(bConeGeo, new THREE.MeshStandardMaterial({ color: 0x1d2630, roughness: 0.6 }), BN * BN * BN);
{ const z0 = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < BN ** 3; i++) bCones.setMatrixAt(i, z0); }
mScene.add(bCones);
function applyMacroResult(d, fresh) {
  if (!macroBusy) $('macroBusy').hidden = true;
  const mat = MATS[matKey];
  targetM = d.avg; forceN = d.F;
  // 자기력선: 최신 위치의 정밀 결과면 그대로, 아니면 미리보기로 다시 그림
  if (fresh && d.lines) {
    allLines = []; let off = 0;
    for (let li = 0; li < d.lines.len.length; li++) {
      const n = Math.min(d.lines.len[li], MAX_PTS), arr = d.lines.pos.slice(3 * off, 3 * (off + n)), cum = new Float32Array(n);
      for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + Math.hypot(arr[3 * i] - arr[3 * i - 3], arr[3 * i + 1] - arr[3 * i - 2], arr[3 * i + 2] - arr[3 * i - 1]);
      allLines.push({ arr, cum, n, len: cum[n - 1] || 1 }); off += d.lines.len[li];
    }
    drawLines();
  } else tracePreview();
  // 블록 화살표
  const show = $('blockChk').checked && mat.kind === 'ferro', MsT = mat.kind === 'ferro' ? (mat.macroMs || mat.Ms) * matAtT(mat, tempK).ratio : 1, M = d.M;
  const q = new THREE.Quaternion(), pos = new THREE.Vector3(), sc = new THREE.Vector3(), mtx = new THREE.Matrix4(), v = new THREE.Vector3();
  for (let z = 0, id = 0; z < BN; z++) for (let y = 0; y < BN; y++) for (let x = 0; x < BN; x++, id++) {
    const mx = M[3 * id], my = M[3 * id + 1], mz = M[3 * id + 2], mm = Math.hypot(mx, my, mz);
    if (!show || !(mm > 1e-4 * MsT)) { mtx.makeScale(0, 0, 0); bCones.setMatrixAt(id, mtx); continue; }
    const f = Math.min(1, Math.max(0.12, Math.sqrt(mm / MsT)));
    pos.set(-2.5 + BH * (x + 0.5), -2.5 + BH * (y + 0.5), -2.5 + BH * (z + 0.5)); v.set(mx / mm, my / mm, mz / mm); q.setFromUnitVectors(up, v);
    sc.set(f, f, f); mtx.compose(pos, q, sc); bCones.setMatrixAt(id, mtx);
  }
  bCones.instanceMatrix.needsUpdate = true;
  updateArrowsAndReadout(d);
}
function updateDots(dt) {
  if (!$('flowChk').checked || !$('linesChk').checked) { dotGeo.setDrawRange(0, 0); return; }
  flowPhase += dt * 1.6; let w = 0;
  for (const L of lines) {
    const nd = Math.max(1, Math.min(DOTS_MAX, Math.round(L.len / 1.4))), sp = L.len / nd; // 약 1.4 cm 간격, 고리 전체에 고르게
    for (let k = 0; k < nd; k++) {
      const s = (flowPhase + k * sp) % L.len;
      let lo = 0, hi = L.n - 1;
      while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L.cum[mid] < s) lo = mid; else hi = mid; }
      const seg = L.cum[hi] - L.cum[lo] || 1, t = (s - L.cum[lo]) / seg;
      for (let c = 0; c < 3; c++) dotPos[w++] = L.arr[3 * lo + c] + t * (L.arr[3 * hi + c] - L.arr[3 * lo + c]);
    }
  }
  dotGeo.attributes.position.needsUpdate = true; dotGeo.setDrawRange(0, w / 3);
  dotGeo.computeBoundingSphere();
}

// 탐침
function probePoint() {
  const sel = $('probeSel').value, c = MF.c;
  if (sel === 'center') return [0, 0, 0];
  // 자석 쪽으로 가장 많이 향한 면
  const ax = [Math.abs(c[0]), Math.abs(c[1]), Math.abs(c[2])];
  let i = ax.indexOf(Math.max(...ax)); const s = Math.sign(c[i]) || -1;
  const p = [0, 0, 0]; p[i] = (sel === 'near' ? s : -s) * TH; return p;
}
let probeB = [0, 0, 0];

// ===== 미시 엔진 (워커, 실패 시 메인 스레드) =====
function makeEngine(post) {
  let sim = null, running = true, active = true, defKey = '';
  function frame() {
    const m = new Float32Array(sim.m);
    post({ type: 'frame', m, tns: sim.t * sim.timeUnit * 1e9, torque: sim.lastTorque, stable: !active, thermal: sim.T > 0, avg: sim.average() }, [m.buffer]);
  }
  return {
    msg(d) {
      if (d.type === 'config') {
        let fresh = false;
        if (!sim || sim.N !== d.N) { sim = new Micro(d.N); defKey = ''; fresh = true; }
        sim.alpha = d.alpha; sim.T = d.T; sim.stressK = d.stressK; sim.stressAxis = d.stressAxis;
        const k = JSON.stringify(d.defects);
        if (k !== defKey) { defKey = k; sim.mat = null; sim.setDefects(d.defects ? buildDefects(d.N, d.defects) : null); }
        sim.setMaterial(d.mat, d.edge);
        if (d.h) sim.happ = d.h;
        if (d.m) { for (let i = 0; i < sim.m.length; i++) sim.m[i] = d.m[i]; } else if (d.state || fresh) sim.initState(d.state || 'vortex');
        active = true; frame();
      }
      else if (!sim) return;
      else if (d.type === 'field') { const o = sim.happ; if (Math.abs(o[0] - d.h[0]) + Math.abs(o[1] - d.h[1]) + Math.abs(o[2] - d.h[2]) > 1e-7) { sim.happ = d.h; active = true; } }
      else if (d.type === 'alpha') { sim.alpha = d.alpha; sim.updateDt(); active = true; }
      else if (d.type === 'reset') { sim.initState(d.state); sim.t = 0; active = true; frame(); }
      else if (d.type === 'run') { running = d.on; }
    },
    tick(budget) {
      if (!sim || !sim.mat || !running || !active) return false;
      const t0 = performance.now();
      while (performance.now() - t0 < budget) { sim.step(); if (!(sim.T > 0) && sim.lastTorque < 3e-4) { active = false; break; } }
      frame(); return true;
    }
  };
}
let engine = null, useWorker = false, worker = null, lastInit = null, engineReadyCb = null, cpuEngine = null;
// ===== GPU 엔진 (WebGPU, 메인 스레드에서 명령만 보내고 계산은 GPU가 함) =====
let gpuDevice = null, gpuOK = false, useGPU = false, gpuNote = 'GPU 확인 중';
function makeGpuEngine(device, post) {
  let sim = null, running = true, active = true, defKey = '', chain = Promise.resolve(), batch = 8, alive = true;
  async function frame() { const m = await sim.readM(); const c = new Float32Array(m); post({ type: 'frame', m: c, tns: sim.t * sim.timeUnit * 1e9, torque: sim.lastTorque, stable: !active, thermal: sim.T > 0, avg: sim.average(), gpu: true }); }
  async function handle(d) {
    if (d.type === 'config') {
      let fresh = false;
      if (!sim || sim.N !== d.N) { if (sim) sim.destroy(); sim = await GpuMicro.create(d.N, device); fresh = true; defKey = ''; }
      sim.alpha = d.alpha; sim.T = d.T; sim.stressK = d.stressK; sim.stressAxis = d.stressAxis;
      const k = JSON.stringify(d.defects); if (k !== defKey) { defKey = k; sim.mat = null; sim.setDefects(d.defects ? buildDefects(d.N, d.defects) : null); }
      sim.setMaterial(d.mat, d.edge); if (d.h) sim.setField(d.h);
      if (d.m) sim.setM(d.m); else if (d.state || fresh) sim.initState(d.state || 'vortex');
      active = true; await frame();
    } else if (!sim) return;
    else if (d.type === 'field') { const o = sim.happ; if (Math.abs(o[0] - d.h[0]) + Math.abs(o[1] - d.h[1]) + Math.abs(o[2] - d.h[2]) > 1e-7) { sim.setField(d.h); active = true; } }
    else if (d.type === 'alpha') { sim.alpha = d.alpha; sim.updateDt(); active = true; }
    else if (d.type === 'reset') { sim.initState(d.state); sim.t = 0; active = true; await frame(); }
    else if (d.type === 'run') { running = d.on; }
  }
  (async function loop() {
    let lastPost = 0;
    while (alive) {
      await new Promise(r => setTimeout(r, 0)); await chain;
      if (!sim || !sim.mat || !running || !active) { await new Promise(r => setTimeout(r, 50)); continue; }
      const t0 = performance.now(); sim.step(batch); await device.queue.onSubmittedWorkDone(); const gdt = performance.now() - t0;
      batch = Math.max(1, Math.min(2000, Math.round(batch * 20 / Math.max(gdt, 0.5)))); // GPU 시간만으로 한 묶음 크기 조절
      if (performance.now() - lastPost > (sim.N >= 64 ? 150 : 60)) { // 화면 갱신은 따로, 너무 자주 읽어오지 않게
        lastPost = performance.now(); const m = await sim.readM();
        if (!(sim.T > 0) && sim.lastTorque < 3e-4) active = false;
        post({ type: 'frame', m: new Float32Array(m), tns: sim.t * sim.timeUnit * 1e9, torque: sim.lastTorque, stable: !active, thermal: sim.T > 0, avg: sim.average(), gpu: true });
      }
    }
  })();
  return { msg(d) { chain = chain.then(() => handle(d)).catch(e => { gpuNote = 'GPU 오류로 CPU로 전환: ' + e.message; fallbackToCPU(); }); }, tick: () => false, stop() { alive = false; if (sim) sim.destroy(); } };
}
async function gpuSelfTest(dev) { // 같은 상태를 CPU와 GPU로 계산해 비교
  const N = 8, defs = buildDefects(N, { seed: 3, amount: 0.7, incl: true, gb: true, poly: true, prec: true, precK: 5e5 });
  const mat = { Ms: 1.71e6, A: 2.1e-11, K1: 4.8e4, K2: -1.0e4, aniso: 'cubic', axis: [0, 1, 0] };
  const c = new Micro(N); c.alpha = 0.5; c.stressK = -2e3; c.setDefects(defs); c.setMaterial(mat, 20); c.initState('random'); c.happ = [0.05, 0.02, -0.01];
  const g = await GpuMicro.create(N, dev); g.alpha = 0.5; g.stressK = c.stressK; g.setDefects(defs); g.setMaterial(mat, 20); g.setM(c.m); g.setField(c.happ);
  c.field(c.m, c.h); const hg = await g.readH(); let eh = 0, hm = 0; for (let i = 0; i < hg.length; i++) { eh = Math.max(eh, Math.abs(hg[i] - c.h[i])); hm = Math.max(hm, Math.abs(c.h[i])); }
  for (let k = 0; k < 60; k++) c.step(); g.step(60); const mg = await g.readM(); let em = 0; for (let i = 0; i < mg.length; i++) em = Math.max(em, Math.abs(mg[i] - c.m[i]));
  g.destroy(); return { rel: eh / hm, em };
}
(async function initGPU() {
  try {
    if (!navigator.gpu) throw new Error('nogpu');
    const ad = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
    if (!ad) throw new Error('blocked');
    gpuDevice = await ad.requestDevice({ requiredLimits: { maxStorageBufferBindingSize: ad.limits.maxStorageBufferBindingSize, maxBufferSize: ad.limits.maxBufferSize, maxStorageBuffersPerShaderStage: Math.min(16, ad.limits.maxStorageBuffersPerShaderStage) } });
    const r = await gpuSelfTest(gpuDevice);
    if (r.rel < 1e-4 && r.em < 1e-3) { gpuOK = true; gpuNote = `GPU 검증 통과 (CPU 대비 자기장 상대 오차 ${r.rel.toExponential(1)})`; }
    else gpuNote = `GPU 결과가 CPU와 달라 사용하지 않음 (상대 오차 ${r.rel.toExponential(1)})`;
  } catch (e) {
    gpuNote = e.message === 'blocked' || e.message === 'nogpu'
      ? '이 화면에서는 GPU를 쓸 수 없어요. claude.ai 링크 안에서는 브라우저 보안 정책이 GPU 계산을 막아요. 내려받은 HTML 파일을 크롬으로 열면 쓸 수 있어요.'
      : 'GPU 준비 실패: ' + e.message;
  }
  $('gpuChk').disabled = !gpuOK; $('gpuNote').textContent = gpuNote;
  if (gpuOK) { $('gpuChk').checked = true; setEngineMode(true); }
})();
function setEngineMode(gpu) {
  const want = gpu && gpuOK;
  document.querySelector('#gridSel option[value="64"]').disabled = !want;
  if (!want && NGRID > 32) { $('gridSel').value = '32'; }
  if (want === useGPU && engine) return;
  const prevM = microFrame ? microFrame.m : null;
  if (useGPU && engine && engine.stop) engine.stop();
  useGPU = want;
  if (cpuEngine) cpuEngine.msg({ type: 'run', on: !want && $('pauseBtn').getAttribute('aria-pressed') !== 'true' });
  engine = want ? makeGpuEngine(gpuDevice, (d) => { if (useGPU) onEngineMsg(d); }) : cpuEngine;
  if (!want && NGRID > 32) setGrid(32); else if (microActive()) { sendConfig(); if (prevM && prevM.length === 3 * N3) engine.msg({ type: 'config', N: NGRID, alpha: lastInit.alpha, mat: lastInit.mat, edge: lastInit.edge, T: lastInit.T, stressK: lastInit.stressK, stressAxis: lastInit.stressAxis, defects: lastInit.defects, h: lastInit.h, m: Array.from(prevM) }); }
}
function fallbackToCPU() { gpuOK = false; $('gpuChk').checked = false; $('gpuChk').disabled = true; $('gpuNote').textContent = gpuNote; setEngineMode(false); }
function onEngineMsg(d) { if (d.type === 'frame' && !!d.gpu === useGPU) microFrame = d; }
let microFrame = null;
(function startEngine() {
  try {
    const parts = ['const MU0 = ' + MU0 + ', GAMMA = ' + GAMMA + ', W3 = [-1, 2, -1];',
      f_N.toString(), g_N.toString(), newell.toString(), dipoleN.toString(), demagTensor.toString(), makeFFT.toString(),
      rng.toString(), buildDefects.toString(), Micro.toString(), makeEngine.toString(),
      'const E = makeEngine((d, tr) => postMessage(d, tr || []));',
      'onmessage = (e) => E.msg(e.data);',
      'function loop() { const busy = E.tick(28); setTimeout(loop, busy ? 0 : 50); } loop();'];
    const url = URL.createObjectURL(new Blob([parts.join('\n')], { type: 'text/javascript' }));
    worker = new Worker(url);
    worker.onmessage = (e) => onEngineMsg(e.data);
    worker.onerror = () => fallback();
    useWorker = true;
    engine = cpuEngine = { msg: (d) => worker.postMessage(d), tick: () => false };
  } catch (e) { fallback(); }
  function fallback() {
    if (worker) { try { worker.terminate(); } catch (e) {} worker = null; }
    useWorker = false;
    const E = makeEngine((d) => onEngineMsg(d));
    engine = cpuEngine = { msg: (d) => E.msg(d), tick: (b) => E.tick(b) };
    if (lastInit) engine.msg(lastInit);
    if (engineReadyCb) engineReadyCb();
  }
})();

// ===== 미시 장면 =====
const microView = $('microView');
const uR = makeRenderer(microView);
const uScene = new THREE.Scene();
const uCam = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
uCam.position.set(30, 24, 42);
uScene.add(new THREE.HemisphereLight(0xffffff, 0x7f8c99, 0.9));
const udl = new THREE.DirectionalLight(0xffffff, 0.55); udl.position.set(10, 20, 14); uScene.add(udl);
// 나노 화면도 한 손가락은 스크롤, 두 손가락은 회전과 확대
uR.domElement.addEventListener('touchstart', (e) => { if (e.touches.length === 1) e.stopImmediatePropagation(); }, { passive: false });
uR.domElement.addEventListener('touchmove', (e) => { if (e.touches.length === 1) e.stopImmediatePropagation(); }, { passive: false });
const uCtl = new THREE.OrbitControls(uCam, uR.domElement); uCtl.enableDamping = true; uCtl.minDistance = 10; uCtl.maxDistance = 120; uCtl.touches.TWO = THREE.TOUCH.DOLLY_ROTATE;
let N3 = NGRID * NGRID * NGRID, SP = 1; // 칸 간격 (화면 단위, 정육면체 화면 크기는 16으로 고정)
const coneGeo = new THREE.ConeGeometry(0.3, 0.92, 10); coneGeo.translate(0, 0, 0);
const coneMat = new THREE.MeshStandardMaterial({ roughness: 0.5, metalness: 0.05 });
let cones = new THREE.InstancedMesh(coneGeo, coneMat, N3);
cones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
{ const c0 = new THREE.Color(0x888888); for (let i = 0; i < N3; i++) cones.setColorAt(i, c0); } // 셰이더가 인스턴스 색을 쓰도록 첫 렌더 전에 생성
uScene.add(cones);
const markGeo = new THREE.BoxGeometry(1, 1, 1);
const markMat = new THREE.MeshStandardMaterial({ roughness: 0.7, metalness: 0 });
let marks = new THREE.InstancedMesh(markGeo, markMat, N3);
{ const c0 = new THREE.Color(0x888888); for (let i = 0; i < N3; i++) { marks.setColorAt(i, c0); marks.setMatrixAt(i, new THREE.Matrix4().makeScale(0, 0, 0)); } }
uScene.add(marks);
let defectKind = new Uint8Array(N3);
const MARK_STYLE = { 1: { c: new THREE.Color(0x4a5058), s: 0.92 }, 2: { c: new THREE.Color(0xc9d1d8), s: 0.3 }, 3: { c: new THREE.Color(0x7a4fd0), s: 0.6 } };
function drawMarks() {
  const show = $('markChk').checked && MATS[matKey].kind === 'ferro', o = (NGRID - 1) / 2;
  for (let z = 0, id = 0; z < NGRID; z++) for (let y = 0; y < NGRID; y++) for (let x = 0; x < NGRID; x++, id++) {
    const k = defectKind[id], st = MARK_STYLE[k];
    if (show && st && visible(x, y, z)) {
      tmpP.set((x - o) * SP, (y - o) * SP, (z - o) * SP); tmpQ.identity(); tmpS2.set(st.s * SP, st.s * SP, st.s * SP);
      tmpM.compose(tmpP, tmpQ, tmpS2); marks.setColorAt(id, st.c);
    } else tmpM.makeScale(0, 0, 0);
    marks.setMatrixAt(id, tmpM);
  }
  marks.instanceMatrix.needsUpdate = true; if (marks.instanceColor) marks.instanceColor.needsUpdate = true;
}
const frameBox = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(NGRID, NGRID, NGRID)), new THREE.LineBasicMaterial({ color: 0x6b7680 }));
uScene.add(frameBox);
const hArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 4, 0xd08a10, 1.6, 1.0);
uScene.add(hArrow);
axisTriad(uScene, new THREE.Vector3(-15, -8, 12), 3, 1.4);
const tmpM = new THREE.Matrix4(), tmpQ = new THREE.Quaternion(), tmpP = new THREE.Vector3(), tmpS = new THREE.Vector3(1, 1, 1), up = new THREE.Vector3(0, 1, 0), dirV = new THREE.Vector3(), col = new THREE.Color();
const zeroS = new THREE.Vector3(0, 0, 0), tmpS2 = new THREE.Vector3();
let viewMode = 'surface';
function visible(x, y, z) {
  const L = NGRID - 1;
  if (viewMode === 'all') return true;
  if (viewMode === 'surface') return x === 0 || y === 0 || z === 0 || x === L || y === L || z === L;
  const a = $('sliceAxis').value, k = +$('sliceSl').value;
  return (a === 'x' ? x : a === 'y' ? y : z) === k;
}
let visIds = null, visDirty = true;
function markVis() { visDirty = true; }
function drawMicro(m) {
  const o = (NGRID - 1) / 2;
  if (visDirty || !visIds) { // 보이는 칸 목록을 다시 만들고, 나머지는 한 번만 숨김
    visIds = []; const z0 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let z = 0, id = 0; z < NGRID; z++) for (let y = 0; y < NGRID; y++) for (let x = 0; x < NGRID; x++, id++) {
      if (visible(x, y, z) && defectKind[id] !== 1) visIds.push(id); else cones.setMatrixAt(id, z0);
    }
    visDirty = false;
  }
  for (let k = 0; k < visIds.length; k++) {
    const id = visIds[k], x = id % NGRID, y = ((id / NGRID) | 0) % NGRID, z = (id / (NGRID * NGRID)) | 0;
    const i = 3 * id, mx = m[i], my = m[i + 1], mz = m[i + 2];
    tmpP.set((x - o) * SP, (y - o) * SP, (z - o) * SP);
    dirV.set(mx, my, mz); tmpQ.setFromUnitVectors(up, dirV);
    tmpM.compose(tmpP, tmpQ, tmpS);
    cones.setMatrixAt(id, tmpM);
    let hue = Math.atan2(mz, mx) / (2 * Math.PI); if (hue < 0) hue += 1;
    col.setHSL(hue, 0.72, 0.42 + 0.3 * my);
    cones.setColorAt(id, col);
  }
  cones.instanceMatrix.needsUpdate = true; if (cones.instanceColor) cones.instanceColor.needsUpdate = true;
}

function setGrid(n) {
  NGRID = n; N3 = n * n * n; SP = 16 / n; tmpS.set(SP, SP, SP);
  uScene.remove(cones); uScene.remove(marks); cones.dispose(); marks.dispose();
  cones = new THREE.InstancedMesh(coneGeo, coneMat, N3); cones.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  marks = new THREE.InstancedMesh(markGeo, markMat, N3);
  const c0 = new THREE.Color(0x888888), z0 = new THREE.Matrix4().makeScale(0, 0, 0);
  for (let i = 0; i < N3; i++) { cones.setColorAt(i, c0); cones.setMatrixAt(i, z0); marks.setColorAt(i, c0); marks.setMatrixAt(i, z0); }
  uScene.add(cones); uScene.add(marks);
  defectKind = new Uint8Array(N3); microFrame = null; lastDrawnFrame = null; markVis();
  $('sliceSl').max = n - 1; $('sliceSl').value = Math.floor(n / 2);
  $('microReadout').innerHTML = `${n}³ 격자 준비 중 (반자장 계수 계산)`;
  setupMaterial('vortex');
}
// ===== 상태와 갱신 =====
let dirty = true, lastCompute = 0;
function markDirty() { dirty = true; }
function edgeLimits() { const m = MATS[matKey]; if (m.kind !== 'ferro') return null; const max = Math.floor(NGRID * lexOf(m) * 1e9 * 0.95); return { min: 10, max }; }
let defSeed = 12345, thermFix = 1;
function defectCfg() {
  const on = (id) => $(id).checked;
  if (!(on('dInc') || on('dGb') || on('dPoly') || on('dPrec'))) return null;
  return { seed: defSeed, amount: +$('defAmt').value, incl: on('dInc'), gb: on('dGb'), poly: on('dPoly'), prec: on('dPrec'), precK: 5e5 };
}
function microActive() { const m = MATS[matKey]; return m.kind === 'ferro' && matAtT(m, tempK).m >= 0.02; }
function sendConfig(state) {
  const m = MATS[matKey]; if (m.kind !== 'ferro') return;
  const eff = matAtT(m, tempK);
  if (eff.m < 0.02) return;
  const sigma = $('dStress').checked ? 4e8 * +$('defAmt').value : 0; // Pa, x방향 인장
  const cfg = defectCfg();
  defectKind = cfg ? buildDefects(NGRID, cfg).kind : new Uint8Array(N3); markVis();
  // 열 요동 보정: 칸 크기 아래 요동은 이미 측정값 Ms(T)에 들어 있으므로, 계산에 넣는 Ms를 f(x)로 나눠 겹침을 상쇄
  const cell = +$('edgeSl').value * 1e-9 / NGRID, xT = 1.380649e-23 * tempK / (eff.A * cell);
  thermFix = $('thermFix').checked && tempK > 0 ? Math.min(1 / thermalF(xT), mRed(m, 0) / Math.max(eff.m, 1e-3)) : 1; // Ms(0)을 넘지 않게
  lastInit = { type: 'config', N: NGRID, alpha: +$('alphaSl').value, mat: { Ms: eff.Ms * thermFix, A: eff.A, K1: eff.K1, K2: eff.K2, aniso: eff.aniso, axis: eff.axis }, edge: +$('edgeSl').value, T: tempK, stressK: 1.5 * m.lam * sigma, stressAxis: [1, 0, 0], defects: cfg, h: probeB.map(v => v / (MU0 * eff.Ms * thermFix)) };
  engine.msg(state ? Object.assign({}, lastInit, { state }) : lastInit);
  if (state) lastInit.state = state;
  drawMarks();
}
function updateOverlay() {
  const m = MATS[matKey], act = microActive();
  $('diaOverlay').classList.toggle('on', !act);
  cones.visible = act; hArrow.visible = hArrow.visible && act;
  ['edgeSl', 'alphaSl', 'pauseBtn', 'defAmt', 'defNew', 'markChk', 'dInc', 'dGb', 'dPoly', 'dPrec', 'dStress'].forEach(id => { $(id).disabled = !act; });
  document.querySelectorAll('[data-init]').forEach(b => b.disabled = !act);
  if (!act) drawMarks();
}
function setupMaterial(resetState) {
  const m = MATS[matKey];
  cubeMat.color.setHex(m.color);
  cubeMat.opacity = matKey === 'Mt' ? 0.45 : 0.32;
  if (m.kind === 'ferro') {
    const lim = edgeLimits(), sl = $('edgeSl');
    sl.min = lim.min; sl.max = lim.max; sl.value = Math.min(Math.round(m.def * NGRID / 16), lim.max); // 격자가 촘촘해지면 같은 칸 크기를 유지하도록 입자를 키움
    $('edgeVal').textContent = sl.value + ' nm';
  }
  updateOverlay();
  sendMacroMat(true);
  if (microActive()) sendConfig(resetState || 'vortex');
  markDirty();
}
function setTemp(T, fromSlider) {
  const wasActive = microActive();
  tempK = T; $('tempVal').textContent = `${Math.round(T)} K (${Math.round(T - 273.15)} °C)`;
  if (!fromSlider) $('tempSl').value = T;
  updateOverlay();
  if (microActive()) sendConfig(wasActive ? null : 'random'); // 퀴리 온도 아래로 식히면 무작위에서 다시 시작
  sendMacroMat(false);
  markDirty();
}

function computeMacro() {
  resolveOverlap();
  magnet.visible = !magnetAway;
  const pp = probePoint(); probeMarker.position.set(pp[0], pp[1], pp[2]);
  if (magnetAway) probeB = [0, 0, 0]; else Btool(pp[0], pp[1], pp[2], probeB);
  const mat = MATS[matKey];
  if (microActive()) engine.msg({ type: 'field', h: probeB.map(v => v / (MU0 * matAtT(mat, tempK).Ms * thermFix)) });
  posVersion++;
  tracePreview(); // 즉시: 자석 자기장은 정확, 정육면체 반응은 직전 계산값
  requestMacro();
  if (!microActive()) updateMicroOverlayText();
}
function updateArrowsAndReadout(d) {
  const mat = MATS[matKey];
  const show = $('arrowChk').checked;
  const Mn = Math.hypot(...targetM), Fn = Math.hypot(...forceN);
  const MsT = mat.kind === 'ferro' ? (mat.macroMs || mat.Ms) * matAtT(mat, tempK).ratio : 1;
  mArrow.visible = show && mat.kind === 'ferro' && Mn > 1e-3;
  if (mArrow.visible) {
    const L = Math.min(4.4, 0.8 + 3.6 * Math.sqrt(Math.min(1, Mn / MsT)));
    const dv = new THREE.Vector3(...targetM).normalize();
    mArrow.position.copy(dv.clone().multiplyScalar(-L / 2)).add(new THREE.Vector3(0, 0, 0)); mArrow.setDirection(dv); mArrow.setLength(L, Math.min(0.7, L * 0.35), 0.45);
    mArrow.position.y += 0; // 중심
  }
  fArrow.visible = show && Fn > 1e-9;
  if (fArrow.visible) {
    const dv = new THREE.Vector3(...forceN).normalize();
    const L = mat.kind === 'ferro' ? Math.min(4, 0.8 + 1.1 * Math.log10(1 + Fn * 10)) : 1.6;
    fArrow.position.set(0, TH + 1.2, 0); fArrow.setDirection(dv); fArrow.setLength(L, 0.5, 0.35);
  }
  const Bp = Math.hypot(...probeB) * 1000;
  const c = magnetAway ? [0, 0, -1] : MF.c, cn = Math.hypot(...c) || 1;
  const toward = (forceN[0] * c[0] + forceN[1] * c[1] + forceN[2] * c[2]) / cn;
  let html = magnetAway ? '자석을 치운 상태<br>' : `탐침 위치 자기장: <b>${Bp < 1 ? Bp.toFixed(2) : Bp.toFixed(0)} mT</b><br>`;
  if (mat.kind === 'ferro') {
    const eff = matAtT(mat, tempK);
    if (eff.m < 0.02) { const c = chiCW(mat, tempK);
      html += `퀴리 온도(${mat.Tc} K) 위: 상자성으로 바뀜<br>` + (c ? `자화율 χ ≈ ${sci(c)} (퀴리–바이스 법칙), 평균 자화 <b>${sci(Mn)} A/m</b><br>${magnetAway ? '' : `끌리는 힘: <b>${sci(Fn, 2)} N</b>`}` : '이 재료는 상자성 자료가 없어 0으로 둠'); }
    else {
      html += `정육면체 평균 자화: <b>${sci(Mn)} A/m</b> (이 온도 포화의 ${(100 * Mn / MsT).toFixed(Mn / MsT < 0.01 ? 2 : 1)}%)<br>`;
      html += magnetAway ? `남은 자화가 만드는 자기장만 보여요<br>` : `자석에 끌리는 힘: <b>${sci(Fn, 2)} N</b><br>`;
      html += `<span style="color:var(--muted)">${mat.linChi ? '선형 자화 모형 (이력 없음)' : 'Jiles–Atherton 이력 모형, 자화 이력을 기억함'}, 계산 ${d ? d.ms : 0} ms</span>`;
    }
  } else {
    html += `정육면체 자화: <b>${sci(Mn)} A/m</b>, 자기장 ${mat.kind === 'dia' ? '반대' : '같은'} 방향<br>`;
    if (!magnetAway) html += `${toward > 0 ? '끌리는' : '밀어내는'} 힘: <b>${sci(Fn, 2)} N</b>`;
  }
  $('macroReadout').innerHTML = html;
  if (!microActive()) updateMicroOverlayText();
}
// 단일 자구 입자가 열로 뒤집히는 데 걸리는 시간 (Néel–Arrhenius, 균일 회전 가정)
let rateHist = [];
function fmtT(ns) { return ns < 1 ? (ns * 1000).toFixed(1) + ' ps' : ns.toFixed(2) + ' ns'; }
function rateText(ns) { // 실제 1초 동안 계산되는 물리 시간
  const now = performance.now(); rateHist.push([now, ns]); while (rateHist.length > 2 && now - rateHist[0][0] > 3000) rateHist.shift();
  if (rateHist.length < 2 || rateHist[0][1] > ns) { if (rateHist.length && rateHist[0][1] > ns) rateHist = [[now, ns]]; return ''; }
  const r = (ns - rateHist[0][1]) / ((now - rateHist[0][0]) / 1000); return r > 0 ? ` (1초에 ${fmtT(r)})` : '';
}
function neelText(mat, edge, a) {
  if (Math.hypot(a[0], a[1], a[2]) < 0.85 || tempK <= 0) return '';
  const eff = matAtT(mat, tempK), V = Math.pow(edge * 1e-9, 3), kT = 1.380649e-23 * tempK;
  let dE;
  if (eff.aniso === 'uniaxial') dE = (eff.K1 + Math.max(0, eff.K2)) * V;
  else if (eff.aniso === 'cubic') dE = (eff.K1 >= 0 ? eff.K1 / 4 : -eff.K1 / 12) * V;
  else dE = 0;
  const x = dE / kT;
  let t;
  if (x < 1) t = '장벽이 거의 없어 열로 계속 방향이 바뀜 (초상자성)';
  else {
    const lg = Math.log10(1e-9) + x / Math.LN10; // τ = τ0 e^(ΔE/kT), τ0 ≈ 1 ns
    const units = [[-9, 'ns', 1e-9], [-6, 'μs', 1e-6], [-3, 'ms', 1e-3], [0, '초', 1], [1.78, '분', 60], [3.56, '시간', 3600], [4.94, '일', 86400], [7.5, '년', 3.156e7]];
    if (lg > 17.6) t = '우주의 나이보다 김 (사실상 고정)';
    else { let u = units[0]; for (const q of units) if (lg >= q[0]) u = q; t = `약 ${sci(Math.pow(10, lg) / u[2], 2)} ${u[1]}`; }
  }
  return `<br><span style="color:var(--muted)">열로 뒤집히는 데 걸리는 시간 (추정): ${t}</span>`;
}
function warnText(mat) {
  const w = [];
  if (mat.warnHi && tempK > mat.warnHi) w.push('500 K 위의 코발트는 이방성 방향이 바뀌고 약 695 K에서 결정 구조가 바뀌는데, 이 모형에는 없어요');
  if (mat.warnLo && tempK < mat.warnLo) w.push('약 120~130 K 아래의 자철석은 구조 전이로 이방성이 달라지는데, 이 모형에는 없어요');
  if (mat.approxMicro) w.push('나노 계산은 철의 물성값으로 근사했어요');
  return w.length ? `<br><span style="color:var(--muted)">주의: ${w.join('. ')}.</span>` : '';
}
function updateMicroOverlayText() {
  const mat = MATS[matKey];
  const Mp = Math.abs(mat.chi || 0) * Math.hypot(...probeB) / MU0;
  let t = '';
  if (mat.kind === 'dia') {
    $('microReadout').innerHTML = `${mat.name}: 반자성, 자구 없음`;
    t = `<h3>${mat.name}에는 자구가 없어요</h3>${mat.topic} 반자성 물질이라 원자들이 서로 정렬하는 자기 모멘트를 갖지 않아요. 그래서 자구도 자벽도 생기지 않고, 자기장을 걸면 전자 궤도 운동이 바뀌면서 자기장의 반대 방향으로 아주 약하게 자화될 뿐이에요 (자화율 χ = ${sci(mat.chi)}).`;
  } else if (mat.kind === 'para') {
    $('microReadout').innerHTML = `${mat.name}: 상자성, 자구 없음`;
    t = `<h3>${mat.name}에는 자구가 없어요</h3>${mat.topic} 상자성 금속이에요. 전도 전자의 스핀이 자기장 방향으로 아주 조금 더 많이 정렬해서 약하게 자화되지만(파울리 상자성), 스핀끼리 서로 정렬하게 만드는 교환 상호작용이 충분하지 않아 자구가 생기지 않아요 (자화율 χ = ${sci(mat.chi)}).`;
  } else {
    $('microReadout').innerHTML = `${mat.name}: 퀴리 온도 위, 자구 없음`;
    t = `<h3>퀴리 온도를 넘었어요</h3>${mat.topic} ${mat.Tc} K(${Math.round(mat.Tc - 273.15)} °C)를 넘으면 열 운동이 교환 상호작용을 이겨서 자발 자화가 사라져요. 자구와 자벽도 함께 사라지고 상자성으로 바뀌어요. 온도를 퀴리 온도 아래로 내리면 자구가 무작위 방향에서 다시 생겨요.`;
    const c = chiCW(mat, tempK); if (c) t += `<br><br>지금 자화율은 퀴리–바이스 법칙으로 χ ≈ ${sci(c)}이고, 탐침 위치에서 M ≈ <b>${sci(c * Math.hypot(...probeB) / MU0)} A/m</b>예요. 퀴리 온도에 가까울수록 커져요.`;
  }
  if (mat.kind !== 'ferro') t += `<br><br>지금 탐침 위치에서는 M ≈ <b>${sci(Mp)} A/m</b>로, 철의 포화자화(${sci(FE_MS)} A/m)의 ${sci(Mp / FE_MS)}배예요. 자석을 치우면 바로 0으로 돌아가요.`;
  $('diaText').innerHTML = t;
}

// ===== UI =====
$('matSel').addEventListener('change', (e) => { matKey = e.target.value; setupMaterial(); });
$('rotBtn').addEventListener('click', () => { yaw += Math.PI / 4; applyRot(); markDirty(); });
$('flipBtn').addEventListener('click', () => { if (tilt) tilt = -tilt; else yaw += Math.PI; applyRot(); markDirty(); });
$('tiltBtn').addEventListener('click', (e) => { tilt = tilt ? 0 : Math.PI / 2; e.target.setAttribute('aria-pressed', tilt ? 'true' : 'false'); e.target.textContent = tilt ? '눕히기' : '세우기'; applyRot(); markDirty(); });
$('awayBtn').addEventListener('click', (e) => { magnetAway = !magnetAway; e.target.setAttribute('aria-pressed', magnetAway ? 'true' : 'false'); e.target.textContent = magnetAway ? '자석 다시 놓기' : '자석 치우기'; markDirty(); });
$('demagBtn').addEventListener('click', () => { sendMacroMat(true); markDirty(); });
$('blockChk').addEventListener('change', () => { if (macroRes) applyMacroResult(macroRes); });
$('homeBtn').addEventListener('click', () => { yaw = 0; tilt = 0; $('tiltBtn').setAttribute('aria-pressed', 'false'); $('tiltBtn').textContent = '세우기'; magnet.position.copy(HOME); $('heightSl').value = 0; $('heightVal').textContent = '0.0 cm'; applyRot(); markDirty(); });
$('heightSl').addEventListener('input', (e) => { magnet.position.y = +e.target.value; $('heightVal').textContent = (+e.target.value).toFixed(1) + ' cm'; markDirty(); });
['linesChk', 'probeSel'].forEach(id => $(id).addEventListener('change', markDirty));
$('arrowChk').addEventListener('change', () => updateArrowsAndReadout(macroRes));
$('edgeSl').addEventListener('input', (e) => { $('edgeVal').textContent = e.target.value + ' nm'; sendConfig(); });
$('tempSl').addEventListener('input', (e) => setTemp(+e.target.value, true));
document.querySelectorAll('[data-temp]').forEach(b => b.addEventListener('click', () => setTemp(+b.dataset.temp)));
['dInc', 'dGb', 'dPoly', 'dPrec', 'dStress'].forEach(id => $(id).addEventListener('change', () => sendConfig()));
$('defAmt').addEventListener('change', () => sendConfig());
$('defAmt').addEventListener('input', (e) => { $('defAmtVal').textContent = Math.round(e.target.value * 100) + '%'; });
$('defNew').addEventListener('click', () => { defSeed = (defSeed * 1103515245 + 12345) >>> 0; sendConfig(); });
$('markChk').addEventListener('change', drawMarks);
$('thermFix').addEventListener('change', () => sendConfig());
$('gridSel').addEventListener('change', (e) => setGrid(+e.target.value));
$('gpuChk').addEventListener('change', (e) => setEngineMode(e.target.checked));
$('alphaSl').addEventListener('input', (e) => { $('alphaVal').textContent = (+e.target.value).toFixed(2); engine.msg({ type: 'alpha', alpha: +e.target.value }); if (lastInit) lastInit.alpha = +e.target.value; });
document.querySelectorAll('[data-init]').forEach(b => b.addEventListener('click', () => engine.msg({ type: 'reset', state: b.dataset.init })));
$('pauseBtn').addEventListener('click', (e) => { const p = e.target.getAttribute('aria-pressed') !== 'true'; e.target.setAttribute('aria-pressed', p ? 'true' : 'false'); e.target.textContent = p ? '계속' : '일시정지'; engine.msg({ type: 'run', on: !p }); });
document.querySelectorAll('[data-vm]').forEach(b => b.addEventListener('click', () => {
  viewMode = b.dataset.vm; markVis(); document.querySelectorAll('[data-vm]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  if (microFrame) drawMicro(microFrame.m); drawMarks();
}));
['sliceAxis', 'sliceSl'].forEach(id => $(id).addEventListener('input', () => { markVis(); if (viewMode !== 'slice') document.querySelector('[data-vm="slice"]').click(); else { if (microFrame) drawMicro(microFrame.m); drawMarks(); } }));

document.querySelectorAll('.readout').forEach(r => r.addEventListener('click', () => r.classList.toggle('open')));
// 테마 색
function applyTheme() {
  mR.setClearColor(new THREE.Color(cssColor('--scene') || '#dfe5e9'));
  uR.setClearColor(new THREE.Color(cssColor('--scene') || '#dfe5e9'));
  const ink = new THREE.Color(cssColor('--ink') || '#1d2630');
  lineInk.copy(ink); dotMat.color.copy(ink); lineHot.set(ink.getHSL({}).l > 0.5 ? 0xf08a4b : 0xc2541b); if (lines.length) drawLines();
  mArrow.setColor(ink);
  const dark = ink.getHSL({}).l > 0.5;
  lineMat.opacity = dark ? 0.55 : 0.5;
  cubeEdges.material.color.set(dark ? 0x8a96a2 : 0x555f69);
  grid.material.opacity = dark ? 0.1 : 0.35;
}
applyTheme();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyTheme);

const touchHintText = '한 손가락: 스크롤 · 두 손가락: 회전과 확대 · 자석 길게 누르기: 잡아서 옮기기';
function resize() {
  for (const [r, cam, el] of [[mR, mCam, macroView], [uR, uCam, microView]]) {
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) continue;
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
}
new ResizeObserver(resize).observe(macroView); new ResizeObserver(resize).observe(microView); resize();

let prevT = performance.now(), lastDrawnFrame = null, marksDirty = true;
function loop(now) {
  const dt = Math.min(0.05, (now - prevT) / 1000); prevT = now;
  if (dirty && now - lastCompute > 70) { dirty = false; lastCompute = now; computeMacro(); }
  if (!useWorker && cpuEngine && !useGPU) cpuEngine.tick(12);
  if (microFrame && microFrame !== lastDrawnFrame && microActive()) {
    lastDrawnFrame = microFrame; drawMicro(microFrame.m);
    const mat = MATS[matKey], a = microFrame.avg, edge = +$('edgeSl').value;
    if (!$('markChk').disabled && marksDirty) { marksDirty = false; drawMarks(); }
    const hB = Math.hypot(...probeB);
    hArrow.visible = hB > 1e-5;
    if (hArrow.visible) { const d = new THREE.Vector3(...probeB).normalize(); hArrow.position.copy(d.clone().multiplyScalar(-15)); hArrow.setDirection(d); hArrow.setLength(5, 1.6, 1.0); }
    $('microReadout').innerHTML =
      `${mat.name} 나노 정육면체, 한 변 <b>${edge} nm</b> (한 칸 ${(edge / NGRID).toFixed(2)} nm, ${NGRID}³ 칸, ${microFrame.gpu ? 'GPU' : 'CPU'}${thermFix > 1.0005 ? `, 열 보정 Ms ×${thermFix.toFixed(3)}` : ''})<br>` +
      `받는 자기장: <b>${(hB * 1000).toFixed(hB < 0.001 ? 2 : 0)} mT</b> (주황 화살표)<br>` +
      `평균 자화 방향 ⟨m⟩ = (${a.map(v => v.toFixed(2)).join(', ')})<br>` +
      `계산된 시간 ${fmtT(microFrame.tns)}${rateText(microFrame.tns)}, ${microFrame.thermal ? `<b>${Math.round(tempK)} K 열 요동 중</b>` : microFrame.stable ? '<b>안정 상태</b>' : '자리 잡는 중'}` +
      neelText(mat, edge, a) + warnText(mat);
  }
  updateDots(dt);
  mCtl.update(); uCtl.update();
  mR.render(mScene, mCam); uR.render(uScene, uCam);
  requestAnimationFrame(loop);
}
engineReadyCb = () => { if (microActive()) sendConfig(); };
setTemp(300);
setupMaterial('vortex');
requestAnimationFrame(loop);
})();
