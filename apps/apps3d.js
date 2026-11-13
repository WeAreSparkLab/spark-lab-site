// SparkLab apps page: the two apps on floating 3D phones in the hero.
// Each phone's screen is a live canvas drawn here (a demo of the app's look, not real data).
// Pointer tilts the pair, scrolling turns them, clicking a phone opens that app.
import * as THREE from 'three';
import { RoomEnvironment } from '/worlds/vendor/RoomEnvironment.js';

const stage = document.querySelector('.apps-stage');
const canvas = stage && stage.querySelector('canvas');
if (canvas) start();

function start() {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { stage.classList.add('no-3d'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 11);

  const key = new THREE.DirectionalLight(0xffffff, 1.4); key.position.set(3, 5, 6); scene.add(key);
  const pink = new THREE.PointLight(0xC9A9DA, 34, 20); pink.position.set(-4, -1, 3); scene.add(pink);
  const cyan = new THREE.PointLight(0xE7C58C, 30, 20); cyan.position.set(4, 2, 3); scene.add(cyan);

  // --- phone body: an extruded rounded rectangle ---------------------------
  const W = 2.2, H = 4.5, R = 0.36;
  function rounded(w, h, r) {
    const s = new THREE.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
  }
  const bodyGeo = new THREE.ExtrudeGeometry(rounded(W, H, R), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 4, curveSegments: 16 });
  bodyGeo.center();
  const screenGeo = new THREE.ShapeGeometry(rounded(W - 0.16, H - 0.16, R - 0.08), 16);
  { // map UVs 0..1 across the screen
    const p = screenGeo.attributes.position, uv = screenGeo.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + (W - 0.16) / 2) / (W - 0.16), (p.getY(i) + (H - 0.16) / 2) / (H - 0.16));
  }

  function phone(color, draw, href) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(bodyGeo, new THREE.MeshPhysicalMaterial({ color, metalness: 0.7, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 })));
    const c = document.createElement('canvas'); c.width = 540; c.height = 1100;
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const screen = new THREE.Mesh(screenGeo, new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    screen.position.z = 0.15; g.add(screen);
    g.userData = { ctx: c.getContext('2d'), tex, draw, href };
    return g;
  }

  // --- the two app screens ------------------------------------------------
  const lines = ['Small steps still count.', 'Be gentle with yourself today.', 'Progress, not perfection.', 'You are allowed to rest.'];
  const topics = ['Calm', 'Focus', 'Kindness', 'Courage'];
  function bg(x, a, b) { const gr = x.createLinearGradient(0, 0, 0, 1100); gr.addColorStop(0, a); gr.addColorStop(1, b); x.fillStyle = gr; x.fillRect(0, 0, 540, 1100); }
  function wrap(x, text, cx, y, max, lh) {
    const words = text.split(' '); let line = '', out = [];
    for (const w of words) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
    out.push(line); out.forEach((l, i) => x.fillText(l, cx, y + (i - (out.length - 1) / 2) * lh));
  }
  function drawQuotes(x, t) {
    bg(x, '#3A2F4B', '#1a1422');
    x.textAlign = 'center'; x.fillStyle = '#ffffff'; x.font = '500 46px Newsreader, Georgia, serif'; x.fillText('⚡ Spark Quotes', 270, 110);
    x.font = '600 22px Inter, sans-serif';
    const tp = Math.floor(t / 4) % topics.length;
    topics.forEach((n, i) => { const px = 40 + i * 118; x.fillStyle = i === tp ? '#E58FB8' : 'rgba(255,255,255,.12)'; roundRect(x, px, 160, 108, 46, 23); x.fill(); x.fillStyle = '#fff'; x.fillText(n, px + 54, 191); });
    const k = Math.floor(t / 4) % lines.length, f = (t % 4) / 4, a = Math.min(1, f * 5, (1 - f) * 5);
    x.globalAlpha = a; x.fillStyle = '#ffffff'; x.font = 'italic 600 50px Georgia, serif'; wrap(x, '“' + lines[k] + '”', 270, 520, 420, 66);
    x.globalAlpha = 1; x.fillStyle = 'rgba(255,255,255,.08)'; roundRect(x, 60, 860, 420, 110, 30); x.fill();
    x.fillStyle = '#E58FB8'; x.font = '700 54px sans-serif'; x.fillText('♥', 160, 935); x.fillStyle = '#cfd3ff'; x.font = '600 28px Inter, sans-serif'; x.fillText('Save to favourites', 330, 925);
  }
  function drawWalk(x, t) {
    bg(x, '#1f3a36', '#121a1c');
    x.textAlign = 'center'; x.fillStyle = '#ffffff'; x.font = '500 46px Newsreader, Georgia, serif'; x.fillText('Spark Walk', 270, 110);
    x.fillStyle = '#cfe9e0'; x.font = '600 26px Inter, sans-serif'; x.fillText('Mindful paced walk', 270, 160);
    const beat = (Math.sin(t * Math.PI * 1.8) + 1) / 2, r = 150 + beat * 26;
    x.strokeStyle = 'rgba(143,211,190,.18)'; x.lineWidth = 26; x.beginPath(); x.arc(270, 520, 200, 0, Math.PI * 2); x.stroke();
    const prog = (t % 60) / 60; x.strokeStyle = '#8FD3BE'; x.lineCap = 'round'; x.beginPath(); x.arc(270, 520, 200, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); x.stroke();
    const gr = x.createRadialGradient(270, 520, 10, 270, 520, r); gr.addColorStop(0, 'rgba(143,211,190,.55)'); gr.addColorStop(1, 'rgba(143,211,190,0)'); x.fillStyle = gr; x.beginPath(); x.arc(270, 520, r, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#fff'; x.font = '700 64px Inter, sans-serif'; x.fillText(beat > 0.5 ? 'step' : 'breathe', 270, 540);
    x.fillStyle = 'rgba(255,255,255,.08)'; roundRect(x, 60, 860, 420, 110, 55); x.fill();
    x.fillStyle = '#8FD3BE'; x.font = '700 32px Inter, sans-serif'; x.fillText('Start walk  ▶', 270, 927);
  }
  function roundRect(x, l, t, w, h, r) { x.beginPath(); x.moveTo(l + r, t); x.arcTo(l + w, t, l + w, t + h, r); x.arcTo(l + w, t + h, l, t + h, r); x.arcTo(l, t + h, l, t, r); x.arcTo(l, t, l + w, t, r); x.closePath(); }

  const quotes = phone(0xA078B4, drawQuotes, 'https://quotes.wearesparklab.com');
  const walk = phone(0x5E9C8C, drawWalk, 'https://walks.wearesparklab.com');
  const pair = new THREE.Group(); pair.add(quotes, walk); scene.add(pair);
  const phones = [quotes, walk];

  // drifting sparks around them
  const sparkGeo = new THREE.OctahedronGeometry(0.09);
  const sparks = [];
  for (let i = 0; i < 26; i++) {
    const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({ color: [0xE7C58C, 0xC9A9DA, 0xE58FB8, 0xF7F3ED][i % 4] }));
    m.userData = { a: Math.random() * 6.28, r: 3 + Math.random() * 2.5, y: (Math.random() - 0.5) * 6, s: 0.1 + Math.random() * 0.25 };
    scene.add(m); sparks.push(m);
  }

  // --- layout, pointer, scroll, click -------------------------------------
  let narrow = false;
  function size() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    narrow = w / h < 1.05;
    quotes.position.set(narrow ? -1.25 : -1.45, 0.25, 0); walk.position.set(narrow ? 1.25 : 1.45, -0.25, -0.4);
    const s = narrow ? 0.85 : 1.18; pair.scale.setScalar(s);
  }
  size(); new ResizeObserver(size).observe(stage);

  const ptr = new THREE.Vector2(), aim = { x: 0, y: 0 }, ray = new THREE.Raycaster();
  let hover = null;
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    aim.x = ptr.x; aim.y = ptr.y;
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(phones, true)[0];
    hover = hit ? phones.find(p => p === hit.object.parent) : null;
    stage.style.cursor = hover ? 'pointer' : '';
  });
  stage.addEventListener('pointerleave', () => { aim.x = aim.y = 0; hover = null; stage.style.cursor = ''; });
  stage.addEventListener('click', () => { if (hover) window.open(hover.userData.href, '_blank', 'noopener'); });

  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true;
  new IntersectionObserver(es => { visible = es[0].isIntersecting; }).observe(stage);
  const clock = new THREE.Clock(); let last = -1;
  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = still ? 2 : clock.getElapsedTime();
    const scroll = Math.min(1.5, scrollY / innerHeight);
    pair.rotation.y += ((aim.x * 0.35 + scroll * 0.9) - pair.rotation.y) * 0.06;
    pair.rotation.x += ((-aim.y * 0.2) - pair.rotation.x) * 0.06;
    phones.forEach((p, i) => {
      p.rotation.y = (i ? -0.32 : 0.32) + Math.sin(t * 0.6 + i) * 0.06;
      p.rotation.z = Math.sin(t * 0.5 + i * 2) * 0.03;
      const lift = p === hover ? 0.35 : 0; p.userData.l = (p.userData.l || 0) + (lift - (p.userData.l || 0)) * 0.12;
      p.position.y = (i ? -0.25 : 0.25) + Math.sin(t * 0.9 + i * 1.7) * 0.12 + p.userData.l;
    });
    // screens redraw ~20fps
    if (t - last > 0.05 || last < 0) { last = t; phones.forEach(p => { p.userData.draw(p.userData.ctx, t); p.userData.tex.needsUpdate = true; }); }
    sparks.forEach(m => { const u = m.userData; u.a += 0.004 * (1 + u.s); m.position.set(Math.cos(u.a) * u.r, u.y + Math.sin(t * u.s + u.a) * 0.4, Math.sin(u.a) * u.r - 1); m.rotation.y = t * 2; });
    renderer.render(scene, camera);
  });
  stage.classList.add('is-live');
}
