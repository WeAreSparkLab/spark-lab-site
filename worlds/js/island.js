// A single SparkLab island in its own canvas, for the concept-build pages.
// Drag to turn it, tap a numbered spot to swing round to it and read about it.
//
// Markup:
//   <div class="c3d" data-island="cafe" data-mood="dusk|day">
//     <canvas></canvas>
//     <button class="c3d-spot" data-at="inside" data-title="…" data-text="…">1</button> …
//     <div class="c3d-card" hidden><h3></h3><p></p></div>
//   </div>
// Spot names per island are in SPOTS below. Without WebGL the box shows its fallback
// (anything with class c3d-fallback) and the spots become a plain list.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { makeMaterials } from './materials.js';
import { buildIsland } from './worlds.js';

// points of interest, in each island's own coordinates
const SPOTS = {
  salon:    { inside: [-2.6, 1.6, -1.2], door: [-.8, 1.3, 2.7], water: [3.9, .4, -.9], sign: [-4, 4.6, 3.2], garden: [5, 1.2, 4.6] },
  wellness: { inside: [-.8, 1.5, -1.4], door: [-2.3, 1.3, 1.9], water: [3.4, .4, 3.1], sign: [.1, 4.4, 2.6], garden: [-4.6, 1.2, 2.6] },
  cafe:     { inside: [-3.6, 1.5, -2.2], door: [-5.2, 1.3, 1.3], terrace: [3, .9, .2], sign: [-2.6, 4.5, 2.2], garden: [5.9, 1.2, 4.6] },
  shop:     { inside: [1.9, 1.6, -1.1], door: [1.9, 1.3, 2.5], vitrines: [-3.7, 1.3, .9], sign: [1.9, 4.8, 3.4], garden: [-4.2, 1.2, -3.8] },
  workshop: { inside: [-2.6, 1.5, -1.2], door: [.1, 1.4, 2.5], timber: [4, .7, 2], bench: [4.2, 1.1, -1.6], sign: [-2.2, 5.2, 3.4] },
};

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

function webgl() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }

export async function mountIsland(box) {
  const id = box.dataset.island, spotsEl = [...box.querySelectorAll('.c3d-spot')], card = box.querySelector('.c3d-card');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const showCard = btn => {
    spotsEl.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    if (!card) return;
    if (!btn) { card.hidden = true; return; }
    card.querySelector('h3').textContent = btn.dataset.title || '';
    card.querySelector('p').textContent = btn.dataset.text || '';
    card.hidden = false;
  };
  if (!webgl() || !SPOTS[id]) { box.classList.add('c3d-flat'); spotsEl.forEach(b => b.addEventListener('click', () => showCard(b))); return; }

  const canvas = box.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0, 0);
  try { await Promise.all(['500 48px "Newsreader"', 'italic 400 48px "Newsreader"', '500 48px "Instrument Sans"'].map(f => document.fonts.load(f))); } catch (e) { /* system fonts */ }

  const day = box.dataset.mood === 'day';
  const M = makeMaterials(day ? 'day' : 'dusk');
  const isl = buildIsland(M, id);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture; scene.environmentIntensity = day ? .5 : .32; pmrem.dispose();
  scene.add(isl.group);
  const hemi = new THREE.HemisphereLight(day ? '#CFC6E6' : '#9A8BC4', '#3A2F4B', day ? 1.6 : 1.25);
  const sun = new THREE.DirectionalLight(day ? '#FFE6CC' : '#FFC7A0', day ? 3 : 2.5);
  sun.position.set(-12, 16, 12); sun.castShadow = true; sun.shadow.mapSize.setScalar(1024);
  Object.assign(sun.shadow.camera, { left: -11, right: 11, top: 11, bottom: -11, near: 1, far: 60 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .05;
  const rim = new THREE.DirectionalLight('#A9B8FF', .8); rim.position.set(10, 8, -14);
  scene.add(hemi, sun, sun.target, rim);

  const camera = new THREE.PerspectiveCamera(30, 1, .5, 200);
  const centre = new THREE.Vector3(0, .8, 0), spots = SPOTS[id];
  const radius = Math.max(isl.w, isl.d) * 2.45;
  const cur = { az: -.5, el: .42, r: radius }, goal = { az: -.5, el: .42, r: radius };
  let W = 1, H = 1, visible = true, dragging = false, lastX = 0, lastY = 0, idle = 0, t = 0;

  function resize() {
    const r = box.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height);
    renderer.setSize(W, H, false); camera.aspect = W / H;
    // keep the whole island in frame on tall phone boxes
    goal.r = radius * Math.max(1, 1.2 / camera.aspect); camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(box); resize();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(box);

  // turning it by hand
  canvas.addEventListener('pointerdown', e => { dragging = true; lastX = e.clientX; lastY = e.clientY; canvas.setPointerCapture(e.pointerId); box.classList.add('is-turning'); });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    goal.az -= (e.clientX - lastX) * .008; goal.el = Math.min(1.15, Math.max(.12, goal.el + (e.clientY - lastY) * .004));
    lastX = e.clientX; lastY = e.clientY; idle = 0;
  });
  const up = () => { dragging = false; box.classList.remove('is-turning'); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);

  // a spot swings the camera round to face it
  const pts = spotsEl.map(b => new THREE.Vector3(...(spots[b.dataset.at] || [0, 1, 0])));
  spotsEl.forEach((b, i) => b.addEventListener('click', () => {
    const p = pts[i]; goal.az = Math.atan2(p.x, p.z); goal.el = p.y > 3 ? .5 : .32; idle = -8; showCard(b);
  }));
  card?.querySelector('.c3d-close')?.addEventListener('click', () => showCard(null));

  const tmp = new THREE.Vector3(), clock = new THREE.Clock();
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (!visible || document.hidden) return;
    t += dt; idle += dt;
    if (!reduce && !dragging && idle > 4) goal.az += dt * .12;      // a slow drift when left alone
    cur.az = damp(cur.az, goal.az, 3, dt); cur.el = damp(cur.el, goal.el, 3, dt); cur.r = damp(cur.r, goal.r, 3, dt);
    camera.position.set(centre.x + Math.sin(cur.az) * Math.cos(cur.el) * cur.r, centre.y + Math.sin(cur.el) * cur.r, centre.z + Math.cos(cur.az) * Math.cos(cur.el) * cur.r);
    camera.lookAt(centre);
    if (!reduce) {
      isl.group.position.y = Math.sin(t * .45) * .12;
      isl.trees.forEach((tr, i) => { tr.rotation.z = Math.sin(t * .7 + i) * .012; });
      isl.lamp.emissiveIntensity = isl.lamp.userData.base * (1 + Math.sin(t * 1.1) * .08);
    }
    renderer.render(scene, camera);
    // pin the HTML spots to their 3D points; fade the ones round the back
    spotsEl.forEach((b, i) => {
      tmp.copy(pts[i]); tmp.y += isl.group.position.y; tmp.project(camera);
      const facing = Math.cos(Math.atan2(pts[i].x, pts[i].z) - cur.az) > -.35;
      b.style.transform = `translate(${(tmp.x * .5 + .5) * W}px, ${(-tmp.y * .5 + .5) * H}px) translate(-50%, -50%)`;
      b.classList.toggle('is-behind', !facing);
    });
  }
  frame();
  box.classList.add('is-live');
}

document.querySelectorAll('.c3d[data-island]').forEach(b => mountIsland(b).catch(err => { console.error('[SparkLab] island', err); b.classList.add('c3d-flat'); }));
