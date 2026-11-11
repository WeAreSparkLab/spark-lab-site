// SparkLab concept builds: a 3D scene that lives behind the whole page.
// One "hero" object that belongs to the business (a serum bottle for the salon, a cup for
// the café…) sits in the hero, then drifts to the side and turns as the page scrolls, with
// smaller pieces floating past at different depths. The canvas is fixed and never takes
// clicks; without WebGL the page simply has no canvas.
//
// Markup: <canvas class="scene3d" data-scene="salon|wellness|cafe|shop|workshop" data-label="Name"></canvas>
//         and an empty <div class="stage3d"></div> in the hero where the object should sit.
import * as THREE from 'three';
import { RoomEnvironment } from '/worlds/vendor/RoomEnvironment.js';

const PI = Math.PI;
const rng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const std = o => new THREE.MeshStandardMaterial(o);
const glass = (color, opacity = .36) => new THREE.MeshPhysicalMaterial({ color, roughness: .04, metalness: 0, transparent: true, opacity, clearcoat: 1, clearcoatRoughness: .05, envMapIntensity: 1.8, depthWrite: false });
const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };
const lathe = (pts, m, seg = 56) => new THREE.Mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg), m);

function labelTexture(lines, bg, fg) {
  const c = document.createElement('canvas'); c.width = 768; c.height = 384;
  const x = c.getContext('2d'); x.fillStyle = bg; x.fillRect(0, 0, 768, 384);
  x.fillStyle = fg; x.textAlign = 'center';
  x.font = '500 96px "Fraunces", Georgia, serif'; x.fillText(lines[0], 384, 170);
  x.font = '500 30px ui-monospace, Menlo, monospace'; x.fillText(lines[1] || '', 384, 240); x.fillText(lines[2] || '', 384, 286);
  x.strokeStyle = fg; x.globalAlpha = .35; x.lineWidth = 3; x.strokeRect(24, 24, 720, 336);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

/* ---------- the hero objects (each about 2.2 units tall, centred) ---------- */
const HERO = {
  // a glass bottle of hair serum with a dropper
  salon(label) {
    const g = new THREE.Group();
    const body = [[0, -1.05], [.44, -1.05], [.5, -.98], [.5, .22], [.44, .44], [.2, .62], [.17, .8]];
    const liquid = lathe([[0, -1], [.4, -1], [.45, -.95], [.45, .05], [0, .05]], new THREE.MeshPhysicalMaterial({ color: '#2FA39B', roughness: .1, transparent: true, opacity: .78, clearcoat: 1 }));
    const shell = lathe(body, glass('#DFF3F0', .3)); shell.renderOrder = 2;
    const lab = mesh(new THREE.CylinderGeometry(.505, .505, .62, 48, 1, true, -1.15, 2.3), std({ map: labelTexture([label || 'Serum', 'gloss · repair serum', '50 ml'], '#F7F3EA', '#17302F'), roughness: .7 }), 0, -.38, 0);
    lab.renderOrder = 3;
    const collar = mesh(new THREE.CylinderGeometry(.2, .2, .2, 32), std({ color: '#17302F', roughness: .35, metalness: .3 }), 0, .9, 0);
    const bulb = mesh(new THREE.SphereGeometry(.17, 32, 24), std({ color: '#0E7F7B', roughness: .45 }), 0, 1.14, 0); bulb.scale.y = 1.35;
    const pipette = mesh(new THREE.CylinderGeometry(.035, .02, 1.1, 12), glass('#FFFFFF', .5), 0, .3, 0);
    g.add(liquid, pipette, shell, lab, collar, bulb);
    return { g, tilt: .08, lean: .32 };
  },
  // a balanced stack of stones over rings of water
  wellness() {
    const g = new THREE.Group(), R = rng(7);
    const cols = ['#8E9A93', '#B8B2A6', '#6F7C77', '#C9C3B6', '#9AA79F'];
    let y = -1.02;
    [.66, .52, .42, .31, .21].forEach((r, i) => {
      const s = mesh(new THREE.SphereGeometry(r, 40, 28), std({ color: cols[i], roughness: .82 }));
      const h = r * (.5 + R() * .12); s.scale.set(1, h / r, .82 + R() * .14);
      s.position.set((R() - .5) * .09, y + h, (R() - .5) * .06); s.rotation.y = R() * PI; y += h * 2 - .012; g.add(s);
    });
    [.95, 1.3, 1.7].forEach((r, i) => { const ring = mesh(new THREE.TorusGeometry(r, .012, 8, 96), glass('#DDEAE4', .55 - i * .14), 0, -1.03, 0); ring.rotation.x = PI / 2; g.add(ring); });
    return { g, tilt: .22, lean: .1, dock: .72 };
  },
  // a cup of coffee on its saucer
  cafe() {
    const g = new THREE.Group();
    const cream = std({ color: '#F6EBDD', roughness: .32, side: THREE.DoubleSide }), terra = std({ color: '#8E3F20', roughness: .5, side: THREE.DoubleSide });
    g.add(lathe([[0, -.64], [.5, -.64], [.98, -.5], [1.02, -.45], [.96, -.46], [.5, -.57], [0, -.57]], terra));
    g.add(lathe([[0, -.56], [.34, -.56], [.52, -.3], [.62, .1], [.66, .44], [.62, .44], [.58, .1], [.48, -.28], [.3, -.49], [0, -.49]], cream));
    const coffee = mesh(new THREE.CircleGeometry(.6, 48), std({ color: '#241208', roughness: .15 }), 0, .34, 0); coffee.rotation.x = -PI / 2; g.add(coffee);
    const crema = mesh(new THREE.RingGeometry(.46, .6, 48), std({ color: '#8A5A30', roughness: .3, transparent: true, opacity: .5 }), 0, .342, 0); crema.rotation.x = -PI / 2; g.add(crema);
    const handle = mesh(new THREE.TorusGeometry(.2, .05, 16, 40), cream, .74, -.02, 0); g.add(handle);
    const steam = [];
    for (let i = 0; i < 5; i++) { const s = mesh(new THREE.SphereGeometry(.09, 16, 12), new THREE.MeshBasicMaterial({ color: '#FFFFFF', transparent: true, opacity: .1, depthWrite: false })); s.userData.o = i / 5; g.add(s); steam.push(s); }
    g.scale.setScalar(1.25);
    return { g, tilt: .5, lean: .12, dock: .5, tick(t) { steam.forEach(s => { const k = (t * .16 + s.userData.o) % 1; s.position.set(Math.sin(k * 7 + s.userData.o * 9) * .12, .4 + k * 1.1, 0); s.scale.setScalar(.6 + k * 2); s.material.opacity = .1 * Math.sin(k * PI); }); } };
  },
  // a wrapped gift box with its lid just lifted
  shop() {
    const g = new THREE.Group();
    const paper = std({ color: '#A98BC0', roughness: .7 }), ribbon = std({ color: '#F4EAD8', roughness: .4, metalness: .15 });
    g.add(mesh(new THREE.BoxGeometry(1.4, 1.05, 1.4), paper, 0, -.42, 0));
    g.add(mesh(new THREE.BoxGeometry(1.42, 1.06, .2), ribbon, 0, -.42, 0), mesh(new THREE.BoxGeometry(.2, 1.06, 1.42), ribbon, 0, -.42, 0));
    const lid = new THREE.Group();
    lid.add(mesh(new THREE.BoxGeometry(1.5, .3, 1.5), std({ color: '#9475AE', roughness: .7 })), mesh(new THREE.BoxGeometry(1.52, .31, .2), ribbon), mesh(new THREE.BoxGeometry(.2, .31, 1.52), ribbon));
    for (const s of [-1, 1]) { const loop = mesh(new THREE.TorusGeometry(.2, .055, 14, 36), ribbon, s * .2, .3, 0); loop.rotation.set(0, 0, s * .5); loop.scale.set(1.25, .8, 1.4); lid.add(loop); }
    lid.add(mesh(new THREE.SphereGeometry(.09, 16, 12), ribbon, 0, .2, 0));
    lid.position.set(0, .36, 0); g.add(lid);
    return { g, tilt: .42, lean: .14, dock: .62, tick(t) { lid.position.y = .36 + (Math.sin(t * .9) * .5 + .5) * .16; lid.rotation.z = Math.sin(t * .9) * .05; } };
  },
  // a joiner's hand plane
  workshop() {
    const g = new THREE.Group();
    const steel = std({ color: '#8D9498', roughness: .3, metalness: .85 }), oak = std({ color: '#B98A54', roughness: .6 }), dark = std({ color: '#5A3A22', roughness: .5 }), brass = std({ color: '#C9A24B', roughness: .3, metalness: .9 });
    g.add(mesh(new THREE.BoxGeometry(2.2, .12, .62), steel, 0, -.3, 0));
    for (const s of [-1, 1]) g.add(mesh(new THREE.BoxGeometry(2.2, .34, .05), steel, 0, -.1, s * .285));
    g.add(mesh(new THREE.BoxGeometry(.9, .26, .5), oak, .55, -.1, 0));
    const blade = mesh(new THREE.BoxGeometry(.06, .95, .46), steel, -.02, .22, 0); blade.rotation.z = .78; g.add(blade);
    const cap = mesh(new THREE.BoxGeometry(.07, .6, .4), brass, .05, .2, 0); cap.rotation.z = .78; g.add(cap);
    const tote = mesh(new THREE.CapsuleGeometry(.1, .5, 8, 16), dark, -.72, .22, 0); tote.rotation.z = .35; tote.scale.z = .7; g.add(tote);
    g.add(mesh(new THREE.BoxGeometry(.42, .1, .3), dark, -.7, -.19, 0));
    g.add(mesh(new THREE.CylinderGeometry(.06, .09, .2, 16), dark, .78, .1, 0), mesh(new THREE.SphereGeometry(.16, 24, 18), dark, .78, .3, 0));
    g.add(mesh(new THREE.CylinderGeometry(.07, .07, .05, 20), brass, -.22, .5, 0));
    g.rotation.y = -.5;
    const wrap = new THREE.Group(); wrap.add(g); wrap.scale.setScalar(1.05);
    return { g: wrap, tilt: .42, lean: .18, dock: .52 };
  },
};

/* ---------- the small pieces that float past ---------- */
function curl(R, mat) {
  const pts = []; const turns = 2 + R() * 1.5, r0 = .12 + R() * .1;
  for (let i = 0; i <= 60; i++) { const k = i / 60, a = k * turns * PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * r0 * (1 + k * .5), (k - .5) * .5, Math.sin(a) * r0 * (1 + k * .5))); }
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .03, 6), mat); m.scale.set(1, 1, 1); return m;
}
const FLOAT = {
  salon(R, i) {
    if (i % 3 === 2) { const f = mesh(new THREE.PlaneGeometry(.3 + R() * .2, .18 + R() * .1), std({ color: R() > .5 ? '#E8E9EA' : '#E9D7A6', roughness: .22, metalness: 1, side: THREE.DoubleSide })); return f; }
    return mesh(new THREE.SphereGeometry(.14 + R() * .3, 32, 24), glass(R() > .4 ? '#BFE6E1' : '#FFFFFF', .3));
  },
  wellness(R, i) {
    if (i % 3 === 2) { const p = mesh(new THREE.SphereGeometry(.16 + R() * .14, 24, 18), std({ color: ['#8E9A93', '#C9C3B6', '#6F7C77'][i % 3], roughness: .85 })); p.scale.y = .55; return p; }
    const d = mesh(new THREE.SphereGeometry(.14 + R() * .3, 32, 24), glass('#E6F1EC', .34)); d.scale.y = .92; return d;
  },
  cafe(R, i) {
    if (i % 4 === 3) return mesh(new THREE.BoxGeometry(.16, .16, .16), std({ color: '#FBF6EE', roughness: .9 }));
    const b = new THREE.Group(), bean = mesh(new THREE.SphereGeometry(.17, 24, 18), std({ color: '#4A2A18', roughness: .42 })); bean.scale.set(1, .58, .7);
    b.add(bean, mesh(new THREE.BoxGeometry(.3, .012, .03), std({ color: '#24120A', roughness: .6 }), 0, .096, 0)); b.scale.setScalar(.8 + R() * .7); return b;
  },
  shop(R, i) {
    if (i % 2) return mesh(new THREE.SphereGeometry(.1 + R() * .16, 24, 18), std({ color: ['#F4EAD8', '#C9B6D6', '#E7D3C3'][i % 3], roughness: .5 }));
    const g = new THREE.Group(), s = .22 + R() * .18, rib = std({ color: '#F4EAD8', roughness: .4, metalness: .15 });
    g.add(mesh(new THREE.BoxGeometry(s, s, s), std({ color: ['#B49CC6', '#DCC7B4', '#A9B8A4'][i % 3], roughness: .78 })), mesh(new THREE.BoxGeometry(s * 1.02, s * 1.02, s * .16), rib), mesh(new THREE.BoxGeometry(s * .16, s * 1.02, s * 1.02), rib)); return g;
  },
  workshop(R, i) {
    const oak = std({ color: ['#C9A06A', '#B98A54', '#D8B682'][i % 3], roughness: .62 });
    if (i % 3 === 2) return mesh(new THREE.BoxGeometry(.22, .22, .22), oak);
    return curl(R, oak);
  },
};

function start(canvas) {
  const kind = canvas.dataset.scene, stage = document.querySelector('.stage3d');
  if (!HERO[kind] || !stage) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0, 0);
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), .03).texture; scene.environmentIntensity = .75; pmrem.dispose();
  const key = new THREE.DirectionalLight('#FFFFFF', 2.2); key.position.set(-4, 6, 7);
  const fill = new THREE.DirectionalLight('#DDE6FF', .7); fill.position.set(5, 2, -3);
  scene.add(new THREE.HemisphereLight('#FFFFFF', '#BDB6C4', 1.1), key, fill);

  const D = 10, FOV = 35, camera = new THREE.PerspectiveCamera(FOV, 1, .1, 60);
  const hero = HERO[kind](canvas.dataset.label), SIZE = 2.3;
  const pivot = new THREE.Group(); pivot.add(hero.g); scene.add(pivot);

  const R = rng(kind.length * 97 + 5), floats = [];
  const N = innerWidth < 760 ? 9 : 16;
  for (let i = 0; i < N; i++) {
    const o = FLOAT[kind](R, i);
    o.userData = { u: (i + R() * .8) / N, x: (R() * 2 - 1), z: -3.2 + R() * 4, ph: R() * 6.28, sp: .25 + R() * .5, rx: R() * 6.28, ry: R() * 6.28 };
    // keep the middle of the page clearer than the edges
    o.userData.x = Math.sign(o.userData.x || 1) * ((innerWidth < 760 ? .86 : .62) + Math.abs(o.userData.x) * (innerWidth < 760 ? .14 : .38));
    scene.add(o); floats.push(o);
  }

  let W = 1, H = 1, visH = 1, visW = 1, span = 1, px = 0, py = 0, tx = 0, ty = 0, t = 0, shown = false;
  const PAR = .82;
  function resize() {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); visW = visH * camera.aspect;
    span = Math.max(0, document.documentElement.scrollHeight - H) / H * visH * PAR;
  }
  addEventListener('resize', resize); resize();
  new ResizeObserver(resize).observe(document.body);
  addEventListener('pointermove', e => { tx = e.clientX / W - .5; ty = e.clientY / H - .5; }, { passive: true });

  const clock = new THREE.Clock(), sm = k => k * k * (3 - 2 * k);
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (document.hidden) return;
    if (!reduce) t += dt;
    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
    const y = scrollY, camY = -y / H * visH * PAR;
    camera.position.set(0, camY, D); camera.lookAt(0, camY, 0);

    // hero object: in its stage while the hero is on screen, then docked at the side
    const r = stage.getBoundingClientRect(), wide = camera.aspect > 1;
    const k = sm(Math.min(1, Math.max(0, 1 - r.bottom / (H * .72))));
    const sx = ((r.left + r.width / 2) / W - .5) * visW, sy = camY + (.5 - (r.top + r.height / 2) / H) * visH;
    const sS = Math.min(r.width / W * visW, r.height / H * visH) / SIZE * .86;
    const dx = wide ? -visW / 2 + visW * .115 : visW / 2 - visW * .06, dy = camY + (wide ? -.1 : -.9) * visH * .25;
    const dS = visH * (wide ? .6 : .3) / SIZE * (hero.dock || 1);
    pivot.position.set(sx + (dx - sx) * k, sy + (dy - sy) * k + Math.sin(t * .8) * .06, wide ? 0 : -1.5 * k);
    pivot.scale.setScalar(sS + (dS - sS) * k);
    pivot.rotation.set(hero.tilt + py * .18, -.45 + y * .0022 + px * .5 + Math.sin(t * .4) * .08, hero.lean * (wide ? 1 : -1) * (.35 + k * .65));
    hero.tick?.(t);

    for (const o of floats) {
      const u = o.userData;
      o.position.set(u.x * visW * .52 + px * (u.z + 4) * .12, visH * .45 - u.u * (span + visH * .9) + Math.sin(t * u.sp + u.ph) * .18, u.z);
      o.rotation.set(u.rx + t * u.sp * .35, u.ry + t * u.sp * .5 + y * .001, 0);
    }
    renderer.render(scene, camera);
    if (!shown) { shown = true; canvas.classList.add('is-live'); }
  }
  const go = () => frame();
  (document.fonts?.load('500 96px "Fraunces"') || Promise.resolve()).then(go, go);
}

document.querySelectorAll('canvas.scene3d').forEach(c => {
  try { if (!(c.getContext('webgl2') || c.getContext('webgl'))) throw new Error('no webgl'); } catch (e) { c.remove(); return; }
  // the context made by the check above is reused by three
  try { start(c); } catch (err) { console.error('[SparkLab] scene', err); c.remove(); }
});
