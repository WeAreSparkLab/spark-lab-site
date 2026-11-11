// The stage: one fixed canvas behind the whole page.
// The camera moves between "stations" (the worlds, the assistant studio, the finale)
// as the visitor scrolls; dark sections of the page are windows onto it.
import * as THREE from 'three';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { makeMaterials } from './materials.js';

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export async function createStage({ canvas, reduceMotion, compact, safeArea, labels, hosts, onPick, onHover, onProgress = () => {}, narrow = () => false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  let dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 1.75);
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  renderer.setClearColor(0x000000, 0);
  onProgress(.2);

  // fonts first, so signs and terminal screens are drawn in the real typefaces
  try { await Promise.all(['500 48px "Newsreader"', 'italic 400 48px "Newsreader"', 'italic 300 48px "Newsreader"', '500 48px "Instrument Sans"', '600 48px "Instrument Sans"'].map(f => document.fonts.load(f))); } catch (e) { /* system fonts */ }
  const mod = await import('./worlds.js');
  onProgress(.45);
  await new Promise(r => setTimeout(r, 0));
  const world = mod.build(makeMaterials('dusk'), { compact });
  onProgress(.85);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), .04).texture;
  scene.environmentIntensity = world.envIntensity;
  pmrem.dispose();
  scene.fog = world.fog;
  scene.add(world.root);
  world.sun.shadow.mapSize.setScalar(compact ? 1024 : 2048);

  const spot = new THREE.SpotLight('#FFE2BD', 0, 0, .34, .85, 0);   // gallery light for the chosen business
  scene.add(spot, spot.target);

  const camera = new THREE.PerspectiveCamera(26, 1, 1, 600);
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const allItems = new Map();
  for (const s of Object.values(world.stations)) for (const [id, it] of s.items) allItems.set(id, it);
  const hl = new Map([...allItems.keys()].map(id => [id, 0]));

  let W = 1, H = 1, station = 'worlds', focusId = null, hoverId = null, active = true, disposed = false, dirty = true, scroll = 0, mood = 0;
  const cur = { tx: 0, ty: 0, tz: 0, az: 0, el: .3, dist: 80, ox: 0, oy: 0, focus: 0 };
  const user = { az: 0, el: 0, pan: 0, gAz: 0, gEl: 0, gPan: 0, px: 0, py: 0 };
  let spec = null, first = true, intro = reduceMotion ? 0 : 1;
  const centre = new THREE.Vector3(), size = new THREE.Vector3(), tmp = new THREE.Vector3();
  const R = new THREE.Vector3(), U = new THREE.Vector3(), F = new THREE.Vector3();
  const items = () => world.stations[station].items;

  // Distance at which a box just fits inside the safe area of the frame.
  function fit(box, az, el, s) {
    const tanV = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)), tanH = tanV * (W / H);
    F.set(-Math.cos(el) * Math.sin(az), -Math.sin(el), -Math.cos(el) * Math.cos(az));
    R.set(Math.cos(az), 0, -Math.sin(az)); U.crossVectors(R, F);
    box.getCenter(centre);
    let d = 0;
    for (let i = 0; i < 8; i++) {
      tmp.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(centre);
      const zf = tmp.dot(F);
      d = Math.max(d, Math.abs(tmp.dot(R)) / (tanH * Math.max(.05, s.w)) - zf, Math.abs(tmp.dot(U)) / (tanV * Math.max(.05, s.h)) - zf);
    }
    return d;
  }
  function retarget() {
    const item = focusId && items().get(focusId);
    spec = item ? { box: item.box, az: item.view.az, el: item.view.el, azRange: .22, pan: 0 } : world.stations[station].overview(W / H);
    user.gAz = user.gEl = 0;
    if (item || !spec.pan) user.gPan = 0;
    if (item && station === 'worlds') {
      item.box.getCenter(tmp); item.box.getSize(size);
      spot.target.position.copy(tmp);
      spot.position.set(tmp.x + 4, tmp.y + 26, tmp.z + 22);
      spot.angle = clamp(Math.atan(Math.max(size.x, size.z) * .8 / 34), .16, .5);
    }
    dirty = true;
  }
  function resize() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    retarget();
  }

  function frame(dt, t) {
    const k = reduceMotion ? 1e3 : 2.6, f = focusId && station === 'worlds' ? 1 : 0;
    const safe = safeArea(station, focusId ? 'focus' : 'overview');
    user.az = damp(user.az, user.gAz, 6, dt); user.el = damp(user.el, user.gEl, 6, dt); user.pan = damp(user.pan, user.gPan, 5, dt);
    intro = Math.max(0, intro - dt / 2.6);
    const ease = intro * intro;                                   // the opening move: arrive from higher and further out
    const drift = reduceMotion || focusId ? 0 : Math.sin(t * .12) * .025;
    const az = spec.az + user.az + drift + (reduceMotion ? 0 : user.px * .03) - ease * .5;
    const el = clamp(spec.el + user.el + scroll * .16 - (reduceMotion ? 0 : user.py * .015) + ease * .3, .05, 1.2);
    const dist = fit(spec.box, az, el, safe) * (spec.zoom || 1) * (1 + scroll * .22 + ease * .7);
    spec.box.getCenter(centre);
    const goal = { tx: centre.x + user.pan, ty: centre.y, tz: centre.z, az, el, dist, ox: safe.cx - .5, oy: safe.cy - .5, focus: f };
    let moving = intro > 0;
    for (const key in goal) {
      const rate = first || intro > 0 ? 1e3 : key === 'ox' || key === 'oy' ? Math.max(k, 14) : k;   // framing follows scroll closely
      const next = damp(cur[key], goal[key], rate, dt);
      if (Math.abs(next - cur[key]) > 1e-4) moving = true;
      cur[key] = next;
    }
    first = false;
    camera.position.set(cur.tx + cur.dist * Math.cos(cur.el) * Math.sin(cur.az), cur.ty + cur.dist * Math.sin(cur.el), cur.tz + cur.dist * Math.cos(cur.el) * Math.cos(cur.az));
    camera.lookAt(cur.tx, cur.ty, cur.tz);
    camera.near = Math.max(1, cur.dist * .1); camera.far = cur.dist * 3 + 200;
    camera.setViewOffset(W, H, -cur.ox * W, -cur.oy * H, W, H);
    scene.fog.near = cur.dist * .9; scene.fog.far = cur.dist * 2.8;   // haze stays behind the subject at any zoom
    world.follow(cur.tx, cur.tz);
    world.showStudio(!(station === 'worlds' && narrow()));

    for (const [id, v] of hl) {
      const target = id === focusId ? 1 : id === hoverId ? .7 : 0;
      const nv = damp(v, target, reduceMotion ? 1e3 : 7, dt);
      if (Math.abs(nv - v) > 1e-3) { hl.set(id, nv); allItems.get(id).highlight(nv); moving = true; }
    }
    const m = damp(mood, station === 'finale' ? 1 : 0, reduceMotion ? 1e3 : 1.4, dt);
    if (Math.abs(m - mood) > 1e-4) { mood = m; world.setMood(mood); moving = true; }
    spot.intensity = cur.focus * 5;
    renderer.toneMappingExposure = world.exposure * (1 - cur.focus * .2 + mood * .12);
    return moving;
  }

  function placeLabels() {
    camera.updateMatrixWorld();
    for (const [id, el] of labels) {
      const item = allItems.get(id); if (!item) continue;
      if (item.anchor.isObject3D) item.anchor.getWorldPosition(tmp); else tmp.copy(item.anchor);
      tmp.project(camera);
      const x = (tmp.x * .5 + .5) * W, y = (-tmp.y * .5 + .5) * H;
      el.style.visibility = tmp.z > 1 || x < -40 || x > W + 40 ? 'hidden' : '';
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
    }
  }

  // --- render loop with a light performance governor ---
  let last = performance.now(), t0 = last, frames = 0, slow = 0, shadowTick = 0, raf = 0;
  function loop(now) {
    raf = 0;
    if (disposed) return;
    const dt = Math.min(.05, (now - last) / 1000); last = now;
    const t = (now - t0) / 1000;
    if (!reduceMotion) world.tick(t, dt);
    const moving = frame(dt, t);
    if (!reduceMotion || moving || dirty) {
      if (++shadowTick % (compact ? 4 : 2) === 0 || dirty) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      if (station === 'worlds') placeLabels();
      dirty = false;
      if (frames < 120 && ++frames > 30) {              // if early frames are slow, drop resolution once
        if (dt > .034) slow++;
        if (frames === 120 && slow > 40 && dpr > 1) { dpr = 1; renderer.setPixelRatio(1); renderer.setSize(W, H, false); }
      }
    }
    schedule();
  }
  function schedule() { if (!raf && active && !disposed && !document.hidden) raf = requestAnimationFrame(loop); }

  // --- pointer: each station has a host element that receives drags and clicks ---
  const proxiesOf = name => [...world.stations[name].items.values()].map(i => i.proxy);
  const pickAt = (e, name) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(proxiesOf(name), false)[0];
    return hit ? hit.object.userData.id : null;
  };
  const setHover = id => { if (id !== hoverId) { hoverId = id; dirty = true; onHover(id, station); schedule(); } };
  for (const [name, host] of Object.entries(hosts)) {
    if (!host) continue;
    let drag = null;
    host.addEventListener('pointerdown', e => {
      if (station !== name || e.target !== host) return;
      drag = { x: e.clientX, y: e.clientY, az: user.gAz, el: user.gEl, pan: user.gPan, moved: false, id: e.pointerId };
      host.setPointerCapture?.(e.pointerId);
    });
    host.addEventListener('pointermove', e => {
      if (station !== name) return;
      if (drag && drag.id === e.pointerId) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 6) { drag.moved = true; host.classList.add('is-dragging'); }
        if (drag.moved) {
          user.gAz = clamp(drag.az - dx / W * 1.1, -spec.azRange, spec.azRange);
          if (e.pointerType === 'mouse') user.gEl = clamp(drag.el + dy / H * .5, -.1, .22);
          if (spec.pan) user.gPan = clamp(drag.pan - dx / W * cur.dist * .42, -spec.pan, spec.pan);
          dirty = true; schedule();
        }
      } else if (e.pointerType === 'mouse' && e.target === host) {
        user.px = (e.clientX / W) * 2 - 1; user.py = (e.clientY / H) * 2 - 1;
        setHover(pickAt(e, name));
      }
    });
    const end = e => {
      if (!drag || drag.id !== e.pointerId) return;
      const moved = drag.moved; drag = null; host.classList.remove('is-dragging');
      if (!moved && e.type === 'pointerup') { const id = pickAt(e, name); if (id || focusId) onPick(id, name); }
    };
    host.addEventListener('pointerup', end);
    host.addEventListener('pointercancel', end);
    host.addEventListener('pointerleave', () => { user.px = user.py = 0; if (station === name) setHover(null); });
  }

  const ro = new ResizeObserver(() => { resize(); schedule(); });
  ro.observe(canvas);
  const onVis = () => { last = performance.now(); schedule(); };
  document.addEventListener('visibilitychange', onVis);
  resize();
  onProgress(1);
  schedule();

  return {
    setStation(name) { if (name !== station && world.stations[name]) { station = name; focusId = hoverId = null; retarget(); schedule(); } },
    get station() { return station; },
    focus(id) { focusId = id && items().has(id) ? id : null; retarget(); schedule(); },
    hover(id) { hoverId = id; dirty = true; schedule(); },
    setScroll(p) { if (p !== scroll) { scroll = p; dirty = true; schedule(); } },
    setActive(v) { if (v !== active) { active = v; last = performance.now(); schedule(); } },
    poke() { dirty = true; schedule(); },
    refresh() { resize(); schedule(); },
    dispose() { disposed = true; cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener('visibilitychange', onVis); renderer.dispose(); },
  };
}
