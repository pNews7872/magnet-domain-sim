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

function makeRenderer(container, alpha) {
  let r;
  try { r = new THREE.WebGLRenderer({ antialias: true, alpha: !!alpha }); }
  catch (e) { container.innerHTML = '<div class="overlay on"><div>이 브라우저에서 WebGL을 사용할 수 없어 3D 화면을 그릴 수 없어요. 다른 브라우저에서 열어 보세요.</div></div>'; throw e; }
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1.5 : 2)); // 휴대폰은 해상도를 조금 낮춰 부드럽게
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
      if (!sim || sim.N !== d.N) { const old = sim; sim = null; if (old) old.destroy(); sim = await GpuMicro.create(d.N, device); fresh = true; defKey = ''; } // 새 격자를 만드는 동안 지운 버퍼를 그리지 않도록
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
  return { msg(d) { chain = chain.then(() => handle(d)).catch(e => { gpuNote = 'GPU 오류로 CPU로 전환: ' + e.message; fallbackToCPU(); }); }, tick: () => false, stop() { alive = false; if (sim) sim.destroy(); }, get sim() { return sim; } };
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
function onEngineMsg(d) { if (d.type === 'frame' && !!d.gpu === useGPU && d.m.length === 3 * N3) microFrame = d; } // 격자를 바꾼 직후 이전 크기의 프레임은 버림
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
const uR = makeRenderer(microView, true);
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
// ===== 자구 덩어리 보기: 각 칸을 가장 가까운 쉬운 자화 방향으로 나누고, 같은 방향끼리 묶어 3D 덩어리로 그림 =====
const domGroup = new THREE.Group(); uScene.add(domGroup);
let domLastBuild = 0, domStatsHTML = '';
function easyDirs() {
  const mat = MATS[matKey], eff = matAtT(mat, tempK), r3 = 1 / Math.sqrt(3);
  if (eff.aniso === 'uniaxial') { const a = mat.axis; return { dirs: [a, a.map(v => -v)], label: '용이축 ±' + (a[1] ? 'y' : a[0] ? 'x' : 'z') }; }
  if (eff.aniso === 'cubic' && eff.K1 < 0) { const d = []; for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) d.push([sx * r3, sy * r3, sz * r3]); return { dirs: d, label: '⟨111⟩ 8방향' }; }
  return { dirs: [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]], label: eff.aniso === 'cubic' ? '⟨100⟩ 6방향' : '가장 가까운 좌표축 6방향' };
}
function dirName(d) { const f = (v) => v > 0.5 ? '+' : v < -0.5 ? '−' : ''; if (Math.abs(d[0]) > 0.9) return f(d[0]) + 'x'; if (Math.abs(d[1]) > 0.9) return f(d[1]) + 'y'; if (Math.abs(d[2]) > 0.9) return f(d[2]) + 'z'; return '[' + d.map(v => v > 0 ? '+' : '−').join('') + ']'; }
function dirColor(d) { let hue = Math.atan2(d[2], d[0]) / (2 * Math.PI); if (hue < 0) hue += 1; return new THREE.Color().setHSL(hue, 0.72, 0.42 + 0.3 * d[1]); }
function buildDomains(m, statsOnly) {
  while (domGroup.children.length) { const o = domGroup.children.pop(); o.geometry.dispose(); o.material.dispose(); }
  const N = NGRID, n3 = N * N * N, E = easyDirs(), dirs = E.dirs, K = dirs.length, cls = new Int8Array(n3).fill(-1);
  for (let id = 0; id < n3; id++) {
    if (defectKind[id] === 1 || defectKind[id] === 4) continue;
    let best = 0, bv = -9; for (let c = 0; c < K; c++) { const v = m[3 * id] * dirs[c][0] + m[3 * id + 1] * dirs[c][1] + m[3 * id + 2] * dirs[c][2]; if (v > bv) { bv = v; best = c; } }
    cls[id] = best;
  }
  // 같은 방향끼리 이어진 덩어리 수 (아주 작은 조각은 제외)
  const seen = new Uint8Array(n3), stack = new Int32Array(n3), minSize = Math.max(4, Math.round(0.003 * n3)), stats = [];
  for (let c = 0; c < K; c++) stats.push({ vol: 0, comps: 0 });
  for (let id = 0; id < n3; id++) {
    if (cls[id] < 0 || seen[id]) continue;
    const c = cls[id]; let sp = 0, size = 0; stack[sp++] = id; seen[id] = 1;
    while (sp) { const q = stack[--sp]; size++; const x = q % N, y = ((q / N) | 0) % N, z = (q / (N * N)) | 0;
      const nb = [x > 0 ? q - 1 : -1, x < N - 1 ? q + 1 : -1, y > 0 ? q - N : -1, y < N - 1 ? q + N : -1, z > 0 ? q - N * N : -1, z < N - 1 ? q + N * N : -1];
      for (const j of nb) if (j >= 0 && !seen[j] && cls[j] === c) { seen[j] = 1; stack[sp++] = j; } }
    stats[c].vol += size; if (size >= minSize) stats[c].comps++;
  }
  // 덩어리 표면: 같은 방향 영역의 경계를 surface nets 방식으로 매끈한 면으로 만듦
  const G = N + 2, o = (N - 1) / 2, f = new Uint8Array(G * G * G), vidx = new Int32Array((G - 1) * (G - 1) * (G - 1));
  const gi = (x, y, z) => x + G * (y + G * z), ci = (x, y, z) => x + (G - 1) * (y + (G - 1) * z);
  const wpos = (gx) => (gx - 1 - o) * SP;
  let total = 0;
  if (statsOnly) for (let c = 0; c < K; c++) total += stats[c].vol;
  for (let c = 0; c < K && !statsOnly; c++) {
    if (!stats[c].vol) continue;
    f.fill(0);
    for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (cls[x + N * (y + N * z)] === c) f[gi(x + 1, y + 1, z + 1)] = 1;
    const pos = [], idx = []; vidx.fill(-1);
    for (let z = 0; z < G - 1; z++) for (let y = 0; y < G - 1; y++) for (let x = 0; x < G - 1; x++) {
      let s = 0; for (let k = 0; k < 8; k++) s += f[gi(x + (k & 1), y + ((k >> 1) & 1), z + (k >> 2))];
      if (s === 0 || s === 8) continue;
      // 부호가 바뀌는 모서리들의 중점 평균
      let px = 0, py = 0, pz = 0, cnt = 0;
      const E3 = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
      for (const [a, b] of E3) {
        const va = f[gi(x + (a & 1), y + ((a >> 1) & 1), z + (a >> 2))], vb = f[gi(x + (b & 1), y + ((b >> 1) & 1), z + (b >> 2))];
        if (va !== vb) { px += x + ((a & 1) + (b & 1)) / 2; py += y + (((a >> 1) & 1) + ((b >> 1) & 1)) / 2; pz += z + ((a >> 2) + (b >> 2)) / 2; cnt++; }
      }
      vidx[ci(x, y, z)] = pos.length / 3; pos.push(wpos(px / cnt), wpos(py / cnt), wpos(pz / cnt));
    }
    // 부호가 바뀌는 격자 모서리마다 주변 네 칸의 꼭짓점을 잇는 사각형
    for (let z = 1; z < G - 1; z++) for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) {
      const v0 = f[gi(x, y, z)];
      for (let ax = 0; ax < 3; ax++) {
        const x2 = x + (ax === 0), y2 = y + (ax === 1), z2 = z + (ax === 2); if (x2 >= G || y2 >= G || z2 >= G) continue;
        const v1 = f[gi(x2, y2, z2)]; if (v0 === v1) continue;
        let q;
        if (ax === 0) q = [ci(x, y - 1, z - 1), ci(x, y, z - 1), ci(x, y, z), ci(x, y - 1, z)];
        else if (ax === 1) q = [ci(x - 1, y, z - 1), ci(x - 1, y, z), ci(x, y, z), ci(x, y, z - 1)];
        else q = [ci(x - 1, y - 1, z), ci(x, y - 1, z), ci(x, y, z), ci(x - 1, y, z)];
        const a = vidx[q[0]], b = vidx[q[1]], cc = vidx[q[2]], d = vidx[q[3]]; if (a < 0 || b < 0 || cc < 0 || d < 0) continue;
        if (v0) idx.push(a, b, cc, a, cc, d); else idx.push(a, cc, b, a, d, cc);
      }
    }
    if (!idx.length) continue;
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: dirColor(dirs[c]), transparent: true, opacity: 0.55, roughness: 0.6, side: THREE.DoubleSide, depthWrite: false }));
    domGroup.add(mesh); total += stats[c].vol;
  }
  const rows = stats.map((st, c) => ({ c, ...st })).filter(r => r.vol > 0).sort((a, b) => b.vol - a.vol);
  domStatsHTML = `<br>자구 기준: ${E.label}, 덩어리 ${rows.reduce((s, r) => s + r.comps, 0)}개<br>` +
    rows.map(r => `<span style="display:inline-block;width:.75em;height:.75em;border-radius:2px;vertical-align:-1px;background:#${dirColor(dirs[r.c]).getHexString()}"></span> ${dirName(dirs[r.c])} ${(100 * r.vol / (total || 1)).toFixed(0)}%${r.comps > 1 ? ` (${r.comps}개)` : ''}`).join(' &nbsp;');
}
// ===== GPU 자구 보기: GPU에 있는 자화를 먼저 주변 칸과 평균(거칠게 보기)한 뒤, 부드럽게 보간해서 자구 경계면을 광선 추적으로 그림 =====
const GPU_SMOOTH_WGSL = `
struct P { n: u32, r: i32, a: u32, b: u32 };
@group(0) @binding(0) var<uniform> pr: P;
@group(0) @binding(1) var<storage, read> m: array<f32>;
@group(0) @binding(2) var<storage, read> cellp: array<f32>;
@group(0) @binding(3) var<storage, read_write> sm: array<vec4<f32>>;
@compute @workgroup_size(64) fn smoothm(@builtin(global_invocation_id) g: vec3<u32>, @builtin(num_workgroups) nw: vec3<u32>) {
  let N = pr.n; let id = g.x + g.y * nw.x * 64u; if (id >= N * N * N) { return; }
  let x = i32(id % N); let y = i32((id / N) % N); let z = i32(id / (N * N)); let Ni = i32(N);
  var s = vec3<f32>(0.0); var w = 0.0; var cnt = 0.0;
  for (var dz = -pr.r; dz <= pr.r; dz = dz + 1) { for (var dy = -pr.r; dy <= pr.r; dy = dy + 1) { for (var dx = -pr.r; dx <= pr.r; dx = dx + 1) {
    let xx = x + dx; let yy = y + dy; let zz = z + dz;
    if (xx < 0 || yy < 0 || zz < 0 || xx >= Ni || yy >= Ni || zz >= Ni) { continue; }
    let j = u32(xx + Ni * (yy + Ni * zz)); let ms = cellp[3u * j]; cnt = cnt + 1.0;
    if (ms > 0.0) { s = s + vec3<f32>(m[3u * j], m[3u * j + 1u], m[3u * j + 2u]); w = w + 1.0; }
  } } }
  let own = select(0.0, 1.0, cellp[3u * id] > 0.0);
  sm[id] = vec4<f32>(s / max(w, 1.0), own); // xyz: 주변 평균 자화(크기가 정렬 정도), w: 자성 칸 여부
}`;
const GPU_DOM_WGSL = `
struct U { invVP: mat4x4<f32>, prm: vec4<f32>, light: vec4<f32>, dirs: array<vec4<f32>, 8>, cols: array<vec4<f32>, 8> };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var<storage, read> sm: array<vec4<f32>>;
struct VO { @builtin(position) pos: vec4<f32>, @location(0) ndc: vec2<f32> };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VO {
  var p = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  var o: VO; o.pos = vec4<f32>(p[i], 0.0, 1.0); o.ndc = p[i]; return o;
}
fn fetch(x: i32, y: i32, z: i32) -> vec4<f32> {
  let N = i32(u.prm.x); let c = clamp(vec3<i32>(x, y, z), vec3<i32>(0), vec3<i32>(N - 1));
  return sm[u32(c.x + N * (c.y + N * c.z))];
}
fn field(p: vec3<f32>) -> vec4<f32> { // 칸 사이 삼선형 보간
  let q = (p + vec3<f32>(8.0)) / 16.0 * u.prm.x - vec3<f32>(0.5);
  let i0 = vec3<i32>(floor(q)); let f = q - floor(q);
  let c00 = mix(fetch(i0.x, i0.y, i0.z), fetch(i0.x + 1, i0.y, i0.z), f.x);
  let c10 = mix(fetch(i0.x, i0.y + 1, i0.z), fetch(i0.x + 1, i0.y + 1, i0.z), f.x);
  let c01 = mix(fetch(i0.x, i0.y, i0.z + 1), fetch(i0.x + 1, i0.y, i0.z + 1), f.x);
  let c11 = mix(fetch(i0.x, i0.y + 1, i0.z + 1), fetch(i0.x + 1, i0.y + 1, i0.z + 1), f.x);
  return mix(mix(c00, c10, f.y), mix(c01, c11, f.y), f.z);
}
fn classOf(v: vec4<f32>) -> i32 {
  if (v.w < 0.5) { return -1; }
  var best = 0; var bv = -9.0;
  for (var c = 0; c < i32(u.prm.y); c = c + 1) { let d = dot(v.xyz, u.dirs[c].xyz); if (d > bv) { bv = d; best = c; } }
  return best;
}
@fragment fn fs(i: VO) -> @location(0) vec4<f32> {
  let a = u.invVP * vec4<f32>(i.ndc, -1.0, 1.0); let b = u.invVP * vec4<f32>(i.ndc, 1.0, 1.0);
  let ro = a.xyz / a.w; let rd = normalize(b.xyz / b.w - ro);
  let rs = select(rd, vec3<f32>(1e-6), abs(rd) < vec3<f32>(1e-6));
  let inv = 1.0 / rs; let t0 = (vec3<f32>(-8.0) - ro) * inv; let t1 = (vec3<f32>(8.0) - ro) * inv;
  let tmin = max(max(min(t0.x, t1.x), min(t0.y, t1.y)), min(t0.z, t1.z));
  let tmax = min(min(max(t0.x, t1.x), max(t0.y, t1.y)), max(t0.z, t1.z));
  if (!(tmax > max(tmin, 0.0))) { return vec4<f32>(0.0); }
  let stp = u.prm.z; let h = 16.0 / u.prm.x * 0.5;
  var t = max(tmin, 0.0) + 0.5 * stp; var C = vec3<f32>(0.0); var A = 0.0; var prev = -1;
  for (var k = 0; k < 600; k = k + 1) {
    if (t > tmax || A > 0.96) { break; }
    let p = ro + rd * t; let v = field(p); let c = classOf(v);
    if (c >= 0) {
      let order = smoothstep(0.15, 0.6, length(v.xyz) / max(v.w, 0.001)); // 열 요동으로 정렬이 깨진 곳은 흐리게
      var al = u.prm.w * order; var col = u.cols[c].rgb;
      if (c != prev) { // 자구 경계면: 기울기로 면 방향을 구해 음영
        let d = u.dirs[c].xyz;
        let gx = dot(field(p + vec3<f32>(h, 0.0, 0.0)).xyz - field(p - vec3<f32>(h, 0.0, 0.0)).xyz, d);
        let gy = dot(field(p + vec3<f32>(0.0, h, 0.0)).xyz - field(p - vec3<f32>(0.0, h, 0.0)).xyz, d);
        let gz = dot(field(p + vec3<f32>(0.0, 0.0, h)).xyz - field(p - vec3<f32>(0.0, 0.0, h)).xyz, d);
        var nrm = vec3<f32>(gx, gy, gz); if (prev < 0) { nrm = -rd; }
        let n = normalize(nrm + vec3<f32>(1e-6));
        let sh = 0.5 + 0.5 * abs(dot(n, u.light.xyz));
        al = 0.5 * max(order, 0.25); col = col * sh;
      }
      C = C + (1.0 - A) * al * col; A = A + (1.0 - A) * al;
    }
    prev = c; t = t + stp;
  }
  return vec4<f32>(C, A);
}`;
let gdom = null; // { ctx, pipe, cpipe, ubuf, pbuf, smbuf, bg, cbg, simRef, canvas }
function gpuDomActive() { return viewMode === 'domains' && useGPU && engine && engine.sim && microActive() && gpuDevice; }
function ensureGpuDom() {
  if (gdom && gdom.failed) return null;
  try {
    if (!gdom) {
      const canvas = document.createElement('canvas'); canvas.className = 'gpudom';
      canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;display:none;';
      uR.domElement.before(canvas); uR.domElement.style.position = 'relative'; uR.domElement.style.zIndex = '1'; // GPU 자구는 아래, 선과 틀은 위에
      microView.querySelectorAll('.readout, .hint, .overlay').forEach(e => { e.style.zIndex = '2'; });
      const ctx = canvas.getContext('webgpu'), format = navigator.gpu.getPreferredCanvasFormat();
      ctx.configure({ device: gpuDevice, format, alphaMode: 'premultiplied' });
      const mod = gpuDevice.createShaderModule({ code: GPU_DOM_WGSL }), cmod = gpuDevice.createShaderModule({ code: GPU_SMOOTH_WGSL });
      const pipe = gpuDevice.createRenderPipeline({ layout: 'auto', vertex: { module: mod, entryPoint: 'vs' }, fragment: { module: mod, entryPoint: 'fs', targets: [{ format }] }, primitive: { topology: 'triangle-list' } });
      const cpipe = gpuDevice.createComputePipeline({ layout: 'auto', compute: { module: cmod, entryPoint: 'smoothm' } });
      gdom = { canvas, ctx, pipe, cpipe, ubuf: gpuDevice.createBuffer({ size: 352, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), pbuf: gpuDevice.createBuffer({ size: 16, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST }), smbuf: null, bg: null, cbg: null, simRef: null };
      Promise.all([mod.getCompilationInfo(), cmod.getCompilationInfo()]).then(infos => { if (infos.some(info => info.messages.some(x => x.type === 'error'))) { gdom.failed = true; canvas.style.display = 'none'; } });
    }
    const sim = engine.sim;
    if (gdom.simRef !== sim) {
      if (gdom.smbuf) gdom.smbuf.destroy();
      gdom.smbuf = gpuDevice.createBuffer({ size: 16 * sim.n3, usage: GPUBufferUsage.STORAGE });
      gdom.cbg = gpuDevice.createBindGroup({ layout: gdom.cpipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: gdom.pbuf } }, { binding: 1, resource: { buffer: sim.b.m } }, { binding: 2, resource: { buffer: sim.b.cellp } }, { binding: 3, resource: { buffer: gdom.smbuf } }] });
      gdom.bg = gpuDevice.createBindGroup({ layout: gdom.pipe.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: gdom.ubuf } }, { binding: 1, resource: { buffer: gdom.smbuf } }] });
      gdom.simRef = sim;
    }
    return gdom;
  } catch (e) { gdom = { failed: true }; return null; }
}
const gdomU = new Float32Array(88), gdomM = new THREE.Matrix4();
function renderGpuDomains() {
  const g = ensureGpuDom(); if (!g) return false;
  const w = uR.domElement.width, h = uR.domElement.height;
  if (g.canvas.width !== w || g.canvas.height !== h) { g.canvas.width = w; g.canvas.height = h; }
  g.canvas.style.display = 'block';
  const N = NGRID, n3 = N * N * N, rad = N >= 64 ? 2 : 1; // 칸이 촘촘할수록 넓게 평균 (실제 거리로는 비슷하게)
  gpuDevice.queue.writeBuffer(g.pbuf, 0, new Int32Array([N, rad, 0, 0]));
  uCam.updateMatrixWorld(); gdomM.multiplyMatrices(uCam.matrixWorld, uCam.projectionMatrixInverse);
  gdomU.set(gdomM.elements, 0);
  const E = easyDirs(), stp = Math.min(0.12, 16 / N * 0.35);
  gdomU[16] = N; gdomU[17] = E.dirs.length; gdomU[18] = stp; gdomU[19] = 1 - Math.pow(0.85, stp / 16); // 안쪽은 아주 옅게, 경계면이 잘 보이도록
  const L = new THREE.Vector3(0.4, 0.8, 0.45).normalize(); gdomU.set([L.x, L.y, L.z, 0], 20);
  for (let c = 0; c < 8; c++) {
    const d = E.dirs[c] || [0, 0, 0], col = E.dirs[c] ? dirColor(d) : new THREE.Color(0, 0, 0);
    gdomU.set([d[0], d[1], d[2], 0], 24 + 4 * c); gdomU.set([col.r, col.g, col.b, 1], 56 + 4 * c);
  }
  gpuDevice.queue.writeBuffer(g.ubuf, 0, gdomU);
  const enc = gpuDevice.createCommandEncoder();
  const cp = enc.beginComputePass(); cp.setPipeline(g.cpipe); cp.setBindGroup(0, g.cbg);
  const wgs = Math.ceil(n3 / 64); cp.dispatchWorkgroups(wgs <= 65535 ? wgs : 64, wgs <= 65535 ? 1 : Math.ceil(wgs / 64)); cp.end();
  const pass = enc.beginRenderPass({ colorAttachments: [{ view: g.ctx.getCurrentTexture().createView(), clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }] });
  pass.setPipeline(g.pipe); pass.setBindGroup(0, g.bg); pass.draw(3); pass.end();
  gpuDevice.queue.submit([enc.finish()]);
  return true;
}
// ===== 자화 흐름선: 입자 안에서 자화 방향을 따라 이어지는 선과 그 위를 흐르는 점 =====
const UF_LINES = 140, UF_PTS = 500;
const ufPos = new Float32Array(UF_LINES * UF_PTS * 6), ufGeo = new THREE.BufferGeometry();
ufGeo.setAttribute('position', new THREE.BufferAttribute(ufPos, 3)); ufGeo.setDrawRange(0, 0);
const ufMat = new THREE.LineBasicMaterial({ color: 0x1d2630, transparent: true, opacity: 0.75, depthTest: false });
const ufObj = new THREE.LineSegments(ufGeo, ufMat); ufObj.renderOrder = 5; uScene.add(ufObj);
const ufDotPos = new Float32Array(UF_LINES * 60 * 3), ufDotGeo = new THREE.BufferGeometry();
ufDotGeo.setAttribute('position', new THREE.BufferAttribute(ufDotPos, 3)); ufDotGeo.setDrawRange(0, 0);
const ufDots = new THREE.Points(ufDotGeo, new THREE.PointsMaterial({ color: 0xd08a10, size: 0.32, sizeAttenuation: true, depthTest: false }));
ufDots.renderOrder = 6; uScene.add(ufDots);
let ufLines = [], ufPhase = 0, ufLast = 0, ufFrame = null;
function smoothField(m, N, rad) { // 칸 크기 열 요동을 걷어내려고 주변 칸과 평균 (자성 칸만)
  const n3 = N * N * N, out = new Float32Array(3 * n3), tmp = new Float32Array(3 * n3), cnt = new Float32Array(n3), cnt2 = new Float32Array(n3);
  let src = m, srcW = null;
  for (let ax = 0; ax < 3; ax++) { // 축마다 나눠서 평균 (상자 평균과 같음)
    const st = ax === 0 ? 1 : ax === 1 ? N : N * N, dst = ax === 2 ? out : (ax === 0 ? tmp : new Float32Array(3 * n3)), dW = ax === 0 ? cnt : cnt2;
    for (let id = 0; id < n3; id++) {
      const c = ax === 0 ? id % N : ax === 1 ? ((id / N) | 0) % N : (id / (N * N)) | 0;
      let sx = 0, sy = 0, sz = 0, w = 0;
      for (let d = -rad; d <= rad; d++) { const cc = c + d; if (cc < 0 || cc >= N) continue; const j = id + d * st;
        const wj = ax === 0 ? (defectKind[j] === 1 || defectKind[j] === 4 ? 0 : 1) : srcW[j]; if (!wj) continue; sx += src[3 * j] * wj; sy += src[3 * j + 1] * wj; sz += src[3 * j + 2] * wj; w += wj; }
      dst[3 * id] = w ? sx / w : 0; dst[3 * id + 1] = w ? sy / w : 0; dst[3 * id + 2] = w ? sz / w : 0; if (ax < 2) dW[id] = w ? 1 : 0;
    }
    src = dst; srcW = dW;
  }
  return out;
}
function sampleField(f, N, p, out) { // 화면 좌표 p에서 삼선형 보간, 입자 밖이거나 비자성이면 false
  const SPc = 16 / N, qx = (p[0] + 8) / SPc - 0.5, qy = (p[1] + 8) / SPc - 0.5, qz = (p[2] + 8) / SPc - 0.5;
  if (qx < -0.5 || qy < -0.5 || qz < -0.5 || qx > N - 0.5 || qy > N - 0.5 || qz > N - 0.5) return false;
  const cl = (v) => Math.max(0, Math.min(N - 1, v));
  const x0 = Math.floor(qx), y0 = Math.floor(qy), z0 = Math.floor(qz), fx = qx - x0, fy = qy - y0, fz = qz - z0;
  out[0] = out[1] = out[2] = 0;
  for (let k = 0; k < 8; k++) {
    const xi = cl(x0 + (k & 1)), yi = cl(y0 + ((k >> 1) & 1)), zi = cl(z0 + (k >> 2)), w = ((k & 1) ? fx : 1 - fx) * (((k >> 1) & 1) ? fy : 1 - fy) * ((k >> 2) ? fz : 1 - fz);
    const id = xi + N * (yi + N * zi); out[0] += w * f[3 * id]; out[1] += w * f[3 * id + 1]; out[2] += w * f[3 * id + 2];
  }
  const ci = cl(Math.round(qx)) + N * (cl(Math.round(qy)) + N * cl(Math.round(qz)));
  return defectKind[ci] !== 1 && defectKind[ci] !== 4;
}
function traceFlow(m) {
  const N = NGRID, f = smoothField(m, N, N >= 64 ? 2 : 1), g = 7, hs = Math.max(0.12, 0.45 * 16 / N), maxSteps = UF_PTS / 2 - 2, v = [0, 0, 0], v2 = [0, 0, 0];
  ufLines = [];
  // 선끼리 너무 붙지 않게: 공간을 7×7×7 칸으로 나눠 이미 다른 선이 지나간 칸에 들어가면 멈춤
  const OG = 7, occ = new Int16Array(OG * OG * OG).fill(-1), ocell = (p) => { const q = (x) => Math.max(0, Math.min(OG - 1, Math.floor((x + 8) / 16 * OG))); return q(p[0]) + OG * (q(p[1]) + OG * q(p[2])); };
  for (let a = 0; a < g; a++) for (let b = 0; b < g; b++) for (let c = 0; c < g; c++) {
    const s = [-8 + 16 * (a + 0.5) / g, -8 + 16 * (b + 0.5) / g, -8 + 16 * (c + 0.5) / g], me = ufLines.length;
    if (occ[ocell(s)] >= 0) continue;
    if (!sampleField(f, N, s, v) || Math.hypot(v[0], v[1], v[2]) < 0.2) continue;
    const half = []; let closed = false;
    for (const dir of [1, -1]) {
      const pts = [s.slice()]; let p = s.slice(), travel = 0;
      for (let k = 0; k < maxSteps; k++) {
        if (!sampleField(f, N, p, v)) break; let n = Math.hypot(v[0], v[1], v[2]); if (n < 0.2) break; // 정렬이 깨진 곳에서는 멈춤
        const mid = [p[0] + 0.5 * hs * dir * v[0] / n, p[1] + 0.5 * hs * dir * v[1] / n, p[2] + 0.5 * hs * dir * v[2] / n];
        if (!sampleField(f, N, mid, v2)) break; n = Math.hypot(v2[0], v2[1], v2[2]); if (n < 0.2) break;
        p = [p[0] + hs * dir * v2[0] / n, p[1] + hs * dir * v2[1] / n, p[2] + hs * dir * v2[2] / n];
        const oc = occ[ocell(p)]; if (oc >= 0 && oc !== me) break; // 다른 선 근처면 멈춤
        pts.push(p); travel += hs; if (travel > 48) break; // 소용돌이에서 끝없이 감기지 않게
        if (travel > 3 && Math.hypot(p[0] - s[0], p[1] - s[1], p[2] - s[2]) < Math.max(hs, 0.6)) { closed = true; pts.push(s.slice()); break; } // 입자 안에서 한 바퀴 돌아 닫힘
      }
      half.push(pts); if (closed) break;
    }
    let pts = half[0]; if (!closed && half[1]) pts = half[1].slice(1).reverse().concat(half[0]);
    if (pts.length < 6) continue;
    for (const q of pts) { const k = ocell(q); if (occ[k] < 0) occ[k] = me; }
    const n = Math.min(pts.length, UF_PTS), arr = new Float32Array(3 * n), cum = new Float32Array(n);
    for (let i = 0; i < n; i++) { arr[3 * i] = pts[i][0]; arr[3 * i + 1] = pts[i][1]; arr[3 * i + 2] = pts[i][2]; if (i) cum[i] = cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1], pts[i][2] - pts[i - 1][2]); }
    ufLines.push({ arr, cum, n, len: cum[n - 1] || 1, closed });
    if (ufLines.length >= UF_LINES) break;
  }
  let w = 0;
  for (const L of ufLines) for (let i = 0; i < L.n - 1 && w < ufPos.length - 6; i++) for (let k = 0; k < 6; k++) ufPos[w++] = L.arr[3 * i + k];
  ufGeo.attributes.position.needsUpdate = true; ufGeo.setDrawRange(0, w / 3); ufGeo.computeBoundingSphere();
}
function updateFlowDots(dt) {
  const on = $('uflowChk').checked && microActive() && ufLines.length;
  ufObj.visible = ufDots.visible = !!on; if (!on) return;
  ufPhase += dt * 2.2; let w = 0;
  for (const L of ufLines) {
    const nd = Math.max(1, Math.min(60, Math.round(L.len / 1.1))), sp = L.len / nd;
    for (let k = 0; k < nd; k++) {
      const s = L.closed ? (ufPhase + k * sp) % L.len : (ufPhase + k * sp) % L.len;
      let lo = 0, hi = L.n - 1; while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (L.cum[mid] < s) lo = mid; else hi = mid; }
      const seg = L.cum[hi] - L.cum[lo] || 1, t = (s - L.cum[lo]) / seg;
      for (let c = 0; c < 3; c++) ufDotPos[w++] = L.arr[3 * lo + c] + t * (L.arr[3 * hi + c] - L.arr[3 * lo + c]);
    }
  }
  ufDotGeo.attributes.position.needsUpdate = true; ufDotGeo.setDrawRange(0, w / 3); ufDotGeo.computeBoundingSphere();
}
function hideGpuDomains() { if (gdom && gdom.canvas) gdom.canvas.style.display = 'none'; }
function visible(x, y, z) {
  const L = NGRID - 1;
  if (viewMode === 'all') return true;
  if (viewMode === 'domains') return false; // 자구 보기에서는 화살표 대신 자구 덩어리를 그림
  if (viewMode === 'surface') { // 겉면: 입자 모양의 바깥(상자 밖이거나 모양 밖 칸)과 맞닿은 칸
    const N = NGRID, out = (a, b, c) => a < 0 || b < 0 || c < 0 || a > L || b > L || c > L || defectKind[a + N * (b + N * c)] === 4;
    return out(x - 1, y, z) || out(x + 1, y, z) || out(x, y - 1, z) || out(x, y + 1, z) || out(x, y, z - 1) || out(x, y, z + 1);
  }
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
      if (visible(x, y, z) && defectKind[id] !== 1 && defectKind[id] !== 4) visIds.push(id); else cones.setMatrixAt(id, z0);
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
const SHAPE_NAME = { cube: '정육면체', sphere: '구', plate: '얇은 판', disk: '원판', rod: '막대' };
const SIZE_LABEL = { cube: '한 변', sphere: '지름', plate: '가로·세로', disk: '지름', rod: '길이' };
function defectCfg() {
  const on = (id) => $(id).checked;
  const shape = $('shapeSel').value, any = on('dInc') || on('dGb') || on('dPoly') || on('dPrec');
  if (!any && shape === 'cube') return null;
  return { seed: defSeed, amount: any ? +$('defAmt').value : 0, incl: on('dInc'), gb: on('dGb'), poly: on('dPoly'), prec: on('dPrec'), precK: 5e5, shape };
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
  ['edgeSl', 'alphaSl', 'pauseBtn', 'defAmt', 'defNew', 'markChk', 'dInc', 'dGb', 'dPoly', 'dPrec', 'dStress', 'shapeSel', 'uflowChk'].forEach(id => { $(id).disabled = !act; });
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
  const shp = $('shapeSel').value;
  if (Math.hypot(a[0], a[1], a[2]) < 0.85 || tempK <= 0 || (shp !== 'cube' && shp !== 'sphere')) return ''; // 판·막대는 모양 이방성이 커서 이 추정식이 맞지 않음
  let fill = 0; for (let i = 0; i < defectKind.length; i++) if (defectKind[i] !== 4) fill++;
  const eff = matAtT(mat, tempK), V = Math.pow(edge * 1e-9, 3) * fill / defectKind.length, kT = 1.380649e-23 * tempK;
  let dE;
  if (eff.aniso === 'uniaxial') dE = (eff.K1 + 2 * eff.K2 >= 0 ? eff.K1 + eff.K2 : eff.K1 * eff.K1 / (-4 * eff.K2)) * V; // E = K1 sin²θ + K2 sin⁴θ 의 최댓값
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
    const c = chiCW(mat, tempK); if (c) t += `<br><br>지금 자화율은 퀴리–바이스 법칙으로 χ ≈ ${sci(c)}이고, 탐침 위치에 놓인 나노 정육면체라면 M ≈ <b>${sci(c / (1 + c / 3) * Math.hypot(...probeB) / MU0)} A/m</b>예요(반자장 보정 포함). 퀴리 온도에 가까울수록 커져요.`;
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
// 테두리를 입자 모양에 맞춰 그림 (계산은 정육면체 상자 안에서 하지만, 보이는 테두리는 실제 입자 모양)
function updateFrame() {
  const sh = $('shapeSel').value, mat = frameBox.material, g = new THREE.Group();
  frameBox.visible = sh === 'cube';
  if (window.__shapeFrame) { uScene.remove(window.__shapeFrame); window.__shapeFrame.traverse(o => { if (o.geometry) o.geometry.dispose(); }); }
  const box = (sx, sy, sz) => g.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(sx, sy, sz)), mat));
  const ring = (r, y, axis) => { const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(axis === 'y' ? new THREE.Vector3(r * Math.cos(a), y, r * Math.sin(a)) : axis === 'x' ? new THREE.Vector3(y, r * Math.cos(a), r * Math.sin(a)) : new THREE.Vector3(r * Math.cos(a), r * Math.sin(a), y)); } g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), mat)); };
  if (sh === 'plate') box(16, 4, 16);
  else if (sh === 'rod') box(16, 16 / 3, 16 / 3);
  else if (sh === 'disk') { ring(8, 2, 'y'); ring(8, -2, 'y'); for (const a of [0, Math.PI / 2, Math.PI, 1.5 * Math.PI]) g.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(8 * Math.cos(a), -2, 8 * Math.sin(a)), new THREE.Vector3(8 * Math.cos(a), 2, 8 * Math.sin(a))]), mat)); }
  else if (sh === 'sphere') { ring(8, 0, 'y'); ring(8, 0, 'x'); ring(8, 0, 'z'); }
  window.__shapeFrame = g; uScene.add(g);
}
$('shapeSel').addEventListener('change', () => { updateFrame(); sendConfig('random'); });
$('thermFix').addEventListener('change', () => sendConfig());
$('gridSel').addEventListener('change', (e) => setGrid(+e.target.value));
$('gpuChk').addEventListener('change', (e) => setEngineMode(e.target.checked));
$('alphaSl').addEventListener('input', (e) => { $('alphaVal').textContent = (+e.target.value).toFixed(2); engine.msg({ type: 'alpha', alpha: +e.target.value }); if (lastInit) lastInit.alpha = +e.target.value; });
document.querySelectorAll('[data-init]').forEach(b => b.addEventListener('click', () => engine.msg({ type: 'reset', state: b.dataset.init })));
$('pauseBtn').addEventListener('click', (e) => { const p = e.target.getAttribute('aria-pressed') !== 'true'; e.target.setAttribute('aria-pressed', p ? 'true' : 'false'); e.target.textContent = p ? '계속' : '일시정지'; engine.msg({ type: 'run', on: !p }); });
document.querySelectorAll('[data-vm]').forEach(b => b.addEventListener('click', () => {
  viewMode = b.dataset.vm; markVis(); domLastBuild = 0; domGroup.visible = viewMode === 'domains'; if (viewMode === 'domains' && microFrame) buildDomains(microFrame.m); document.querySelectorAll('[data-vm]').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  if (microFrame) drawMicro(microFrame.m); drawMarks();
}));
['sliceAxis', 'sliceSl'].forEach(id => $(id).addEventListener('input', () => { markVis(); if (viewMode !== 'slice') document.querySelector('[data-vm="slice"]').click(); else { if (microFrame) drawMicro(microFrame.m); drawMarks(); } }));

// 좁은 화면에서는 3D 화면 위 판독창 대신 화면 아래 정보 칸에 같은 내용을 보여줌
for (const [a, b] of [['macroReadout', 'macroInfo'], ['microReadout', 'microInfo']]) { const src = $(a), dst = $(b); const copy = () => { if (dst.innerHTML !== src.innerHTML) dst.innerHTML = src.innerHTML; }; new MutationObserver(copy).observe(src, { childList: true, subtree: true, characterData: true }); copy(); }
// 테마 색
function applyTheme() {
  mR.setClearColor(new THREE.Color(cssColor('--scene') || '#dfe5e9'));
  uR.setClearColor(new THREE.Color(cssColor('--scene') || '#dfe5e9'));
  const ink = new THREE.Color(cssColor('--ink') || '#1d2630');
  lineInk.copy(ink); ufMat.color.copy(ink); dotMat.color.copy(ink); lineHot.set(ink.getHSL({}).l > 0.5 ? 0xf08a4b : 0xc2541b); if (lines.length) drawLines();
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
    const cur = r.getSize(new THREE.Vector2()); if (Math.abs(cur.x - w) < 1 && Math.abs(cur.y - h) < 1) continue; // 크기가 그대로면 다시 만들지 않음 (깜빡임 방지)
    r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    if (r === mR) mR.render(mScene, mCam); else uR.render(uScene, uCam); // 크기를 바꾼 그 순간 바로 다시 그려서 검은 화면이 보이지 않게
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
    if (viewMode === 'domains' && performance.now() - domLastBuild > (NGRID >= 64 ? 700 : 300)) { domLastBuild = performance.now(); buildDomains(microFrame.m, gpuDomActive() && !(gdom && gdom.failed)); }
    const mat = MATS[matKey], a = microFrame.avg, edge = +$('edgeSl').value;
    if (!$('markChk').disabled && marksDirty) { marksDirty = false; drawMarks(); }
    const hB = Math.hypot(...probeB);
    hArrow.visible = hB > 1e-5;
    if (hArrow.visible) { const d = new THREE.Vector3(...probeB).normalize(); hArrow.position.copy(d.clone().multiplyScalar(-15)); hArrow.setDirection(d); hArrow.setLength(5, 1.6, 1.0); }
    $('microReadout').innerHTML =
      `${mat.name} 나노 ${SHAPE_NAME[$('shapeSel').value]}, ${SIZE_LABEL[$('shapeSel').value]} <b>${edge} nm</b> (한 칸 ${(edge / NGRID).toFixed(2)} nm, ${NGRID}³ 칸, ${microFrame.gpu ? 'GPU' : 'CPU'}${thermFix > 1.0005 ? `, 열 보정 Ms ×${thermFix.toFixed(3)}` : ''})<br>` +
      `받는 자기장: <b>${(hB * 1000).toFixed(hB < 0.001 ? 2 : 0)} mT</b> (주황 화살표)<br>` +
      `평균 자화 방향 ⟨m⟩ = (${a.map(v => v.toFixed(2)).join(', ')})<br>` +
      `계산된 시간 ${fmtT(microFrame.tns)}${rateText(microFrame.tns)}, ${microFrame.thermal ? `<b>${Math.round(tempK)} K 열 요동 중</b>` : microFrame.stable ? '<b>안정 상태</b>' : '자리 잡는 중'}` +
      neelText(mat, edge, a) + warnText(mat) + (viewMode === 'domains' ? domStatsHTML : '');
  }
  updateDots(dt);
  if ($('uflowChk').checked && microActive() && microFrame && microFrame !== ufFrame && performance.now() - ufLast > (NGRID >= 64 ? 450 : 200)) { ufFrame = microFrame; ufLast = performance.now(); traceFlow(microFrame.m); }
  updateFlowDots(dt);
  mCtl.update(); uCtl.update();
  const gdOn = gpuDomActive() && renderGpuDomains(); uR.setClearAlpha(gdOn ? 0 : 1);
  if (gdOn) domGroup.visible = false; else { hideGpuDomains(); domGroup.visible = viewMode === 'domains'; }
  mR.render(mScene, mCam); uR.render(uScene, uCam);
  requestAnimationFrame(loop);
}
engineReadyCb = () => { if (microActive()) sendConfig(); };
setTemp(300);
setupMaterial('vortex');
requestAnimationFrame(loop);
})();
