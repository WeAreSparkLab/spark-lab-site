// SparkLab concept builds: a 3D scene that lives behind the whole page (same engine as the prospect demo kit).
// One "hero" object that belongs to the business (a serum bottle for the salon, a cup for
// the café…) sits in the hero, then drifts to the side and turns as the page scrolls, with
// smaller pieces floating past at different depths. The canvas is fixed and never takes
// clicks; without WebGL the page simply has no canvas.
//
// Markup: <canvas class="scene3d" data-scene="<kind>" data-label="Name" data-tint="#hex"></canvas>
//   kinds: salon nails barber browbar medispa wellness footclinic cafe shop workshop garden build spark
//   data-tint recolours the main material of nails / spark / garden (optional).
//   data-motion   what the 3D object does:  dock  (sits in the hero, then glides to the side and turns as you scroll)
//                                           stay  (stays in the hero and scrolls away with it; drag or move to turn it)
//                                           float (hangs in the middle of the screen behind everything, slowly turning)
//                                           none  (no object: the backdrop does the work)
//   data-backdrop what moves behind the page: floats (small pieces of the trade drifting past)
//                                           waves (a soft sea of moving waves along the bottom of the screen)
//                                           ribbons (silk ribbons flowing across the page)
//                                           aurora (slow glowing colour clouds)
//                                           sparkles (fine glittering dust that drifts up)
//                                           none
//   data-experience  a different idea per concept (see HERO_EXP / SCENE_EXP below):
//                    explode (salon) · breathe (wellness) · orbit (café) · rain (shop) · assemble (workshop)
//                    scan (foot clinic) · particles (medi-spa) · tunnel (brow bar). Never reuse one across demos.
//   Colours for waves / ribbons / aurora / sparkles come from the page's --accent, --soft and --bg tokens,
//   or from data-colors="#hex,#hex,#hex". Pick a different motion + backdrop pairing for every demo.
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

// foot clinic: a custom orthotic insole, top layer navy, cushioned base
HERO.footclinic = () => {
  const s = new THREE.Shape();
  s.moveTo(0, -1.05);
  s.bezierCurveTo(.34, -1.05, .4, -.7, .36, -.38);       // heel, outer side
  s.bezierCurveTo(.33, -.05, .46, .25, .48, .55);         // up the outside to the ball of the foot
  s.bezierCurveTo(.5, .9, .28, 1.08, .02, 1.08);          // round the toes
  s.bezierCurveTo(-.3, 1.08, -.46, .86, -.44, .55);
  s.bezierCurveTo(-.42, .25, -.2, .05, -.2, -.3);         // the arch curves in on the inside
  s.bezierCurveTo(-.2, -.7, -.32, -1.05, 0, -1.05);
  const ex = (depth, bevel) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 4, curveSegments: 48 });
  const g = new THREE.Group();
  const base = mesh(ex(.16, .04), std({ color: '#E9DFCB', roughness: .85 }));
  const top = mesh(ex(.05, .03), std({ color: '#1D3A44', roughness: .55 }), 0, 0, .22);
  const pad = mesh(new THREE.SphereGeometry(.2, 32, 18), std({ color: '#A9803C', roughness: .5 }), -.02, .45, .26); pad.scale.set(1.3, .9, .18);
  const heel = mesh(new THREE.SphereGeometry(.22, 32, 18), std({ color: '#A9803C', roughness: .5 }), .04, -.72, .26); heel.scale.set(1, 1, .14);
  g.add(base, top, pad, heel);
  const wrap = new THREE.Group(); wrap.add(g); g.rotation.x = -.35; g.position.z = -.1;
  return { g: wrap, tilt: .1, lean: .38, dock: .7 };
};
// beauty clinic: a frosted green skincare jar with its gold lid lifted
HERO.medispa = label => {
  const g = new THREE.Group();
  const jar = lathe([[0, -.75], [.78, -.75], [.86, -.66], [.88, .1], [.82, .2], [.76, .24], [.76, .32], [0, .32]], new THREE.MeshPhysicalMaterial({ color: '#B8D79A', roughness: .32, transmission: 0, transparent: true, opacity: .82, clearcoat: .8, clearcoatRoughness: .2 }));
  const cream = mesh(new THREE.CylinderGeometry(.72, .72, .06, 48), std({ color: '#F6F2E7', roughness: .6 }), 0, .3, 0);
  const swirl = mesh(new THREE.SphereGeometry(.3, 32, 16), std({ color: '#FBF8F0', roughness: .55 }), 0, .34, 0); swirl.scale.y = .32;
  const band = mesh(new THREE.CylinderGeometry(.885, .885, .42, 56, 1, true), std({ map: labelTexture([label || 'verdance', 'renewing day cream', '50 ml'], '#33511C', '#E1EFCF'), roughness: .6 }), 0, -.32, 0);
  const lid = new THREE.Group();
  lid.add(mesh(new THREE.CylinderGeometry(.84, .84, .26, 56), std({ color: '#C9A24B', roughness: .25, metalness: .95 })));
  lid.add(mesh(new THREE.CylinderGeometry(.8, .8, .02, 56), std({ color: '#E1C774', roughness: .2, metalness: 1 }), 0, .14, 0));
  lid.position.set(.35, .95, -.1); lid.rotation.set(.1, 0, -.42);
  g.add(jar, cream, swirl, band, lid);
  return { g, tilt: .45, lean: .1, dock: .62, tick(t) { lid.position.y = .95 + Math.sin(t * .9) * .06; } };
};
// brow & lash studio: a brow pencil and a spoolie brush, crossed
HERO.browbar = () => {
  const g = new THREE.Group();
  const black = std({ color: '#EDE7DD', roughness: .3, metalness: .15 }), gold = std({ color: '#D4AF5A', roughness: .22, metalness: .95 });
  const pencil = new THREE.Group();
  pencil.add(mesh(new THREE.CylinderGeometry(.1, .1, 2, 6), black));
  pencil.add(mesh(new THREE.CylinderGeometry(.103, .103, .12, 6), gold, 0, -.7, 0));
  pencil.add(mesh(new THREE.CylinderGeometry(.002, .1, .34, 6), std({ color: '#D9B48A', roughness: .7 }), 0, 1.17, 0));
  pencil.add(mesh(new THREE.CylinderGeometry(.002, .035, .12, 12), std({ color: '#3B2A1E', roughness: .5 }), 0, 1.29, 0));
  pencil.rotation.z = -.5; pencil.position.x = -.25;
  const spoolie = new THREE.Group();
  spoolie.add(mesh(new THREE.CylinderGeometry(.07, .07, 1.2, 24), black, 0, -.5, 0), mesh(new THREE.CylinderGeometry(.075, .075, .1, 24), gold, 0, .12, 0));
  spoolie.add(mesh(new THREE.CylinderGeometry(.012, .012, .9, 8), gold, 0, .55, 0));
  const bristle = new THREE.CylinderGeometry(.006, .006, .24, 4), bm = std({ color: '#1C1C1C', roughness: .6 });
  for (let i = 0; i < 140; i++) { const k = i / 140, a = i * 2.4, b = mesh(bristle, bm, Math.cos(a) * .1, .5 + k * .5, Math.sin(a) * .1); b.rotation.set(Math.sin(a) * 1.57, 0, -Math.cos(a) * 1.57); spoolie.add(b); }
  spoolie.rotation.z = .45; spoolie.position.x = .3;
  g.add(pencil, spoolie); g.scale.setScalar(1.05);
  return { g, tilt: .3, lean: .05, dock: .75 };
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

FLOAT.footclinic = (R, i) => {
  if (i % 3 === 2) { const c = mesh(new THREE.SphereGeometry(.13 + R() * .1, 20, 14), std({ color: '#FBF8F1', roughness: 1 })); c.scale.y = .8; return c; }   // cotton wool
  return mesh(new THREE.SphereGeometry(.12 + R() * .26, 32, 24), glass('#E8EEF0', .32));
};
FLOAT.medispa = (R, i) => {
  if (i % 2) return mesh(new THREE.SphereGeometry(.12 + R() * .28, 32, 24), glass('#E1EFCF', .32));
  const s = new THREE.Shape(); s.moveTo(0, -.4); s.quadraticCurveTo(.26, -.05, 0, .4); s.quadraticCurveTo(-.26, -.05, 0, -.4);
  const leaf = mesh(new THREE.ExtrudeGeometry(s, { depth: .015, bevelEnabled: false, curveSegments: 16 }), std({ color: ['#7CB342', '#5E8F31', '#A5C97A'][i % 3], roughness: .6, side: THREE.DoubleSide }));
  leaf.scale.setScalar(.7 + R() * .6); return leaf;
};
FLOAT.browbar = (R, i) => {
  if (i % 3 === 2) return mesh(new THREE.SphereGeometry(.1 + R() * .16, 28, 20), std({ color: '#111111', roughness: .12, metalness: .4 }));
  return mesh(new THREE.PlaneGeometry(.16 + R() * .16, .1 + R() * .08), std({ color: '#D8BB6A', roughness: .25, metalness: 1, side: THREE.DoubleSide }));
};


// nail bar: a bottle of polish with its brush cap
HERO.nails = (label, tint = '#C2185B') => {
  const g = new THREE.Group();
  const polish = new THREE.MeshPhysicalMaterial({ color: tint, roughness: .08, clearcoat: 1, clearcoatRoughness: .04, transparent: true, opacity: .93 });
  const bottle = lathe([[0, -1.0], [.62, -1.0], [.7, -.9], [.72, -.2], [.66, .02], [.3, .16], [.24, .26], [0, .26]], polish);
  const shell = lathe([[0, -1.03], [.66, -1.03], [.75, -.92], [.77, -.2], [.7, .05], [.32, .2], [.27, .3], [0, .3]], glass('#FFFFFF', .22)); shell.renderOrder = 2;
  const cap = lathe([[0, .28], [.26, .28], [.28, .4], [.22, 1.3], [.2, 1.36], [0, 1.36]], std({ color: '#141414', roughness: .18, metalness: .2 }));
  const band = mesh(new THREE.CylinderGeometry(.285, .285, .06, 40), std({ color: '#D4AF5A', roughness: .2, metalness: 1 }), 0, .42, 0);
  g.add(bottle, shell, cap, band); g.position.y = -.12;
  return { g, tilt: .12, lean: .28, dock: .8 };
};
// barber: a striped pole with chrome caps
HERO.barber = () => {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 256; c.height = 512; const x = c.getContext('2d');
  x.fillStyle = '#FFFFFF'; x.fillRect(0, 0, 256, 512);
  for (let i = -8; i < 16; i++) { x.fillStyle = i % 2 ? '#B3202A' : '#1E3A8A'; x.beginPath(); x.moveTo(0, i * 64); x.lineTo(256, i * 64 - 128); x.lineTo(256, i * 64 - 104); x.lineTo(0, i * 64 + 24); x.fill(); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(1, 1.5);
  const stripes = mesh(new THREE.CylinderGeometry(.34, .34, 1.7, 48), std({ map: tex, roughness: .4 }));
  const glassTube = mesh(new THREE.CylinderGeometry(.4, .4, 1.72, 48, 1, true), glass('#FFFFFF', .22));
  const chrome = std({ color: '#D9DDE0', roughness: .12, metalness: 1 });
  const top = mesh(new THREE.CylinderGeometry(.46, .46, .14, 48), chrome, 0, .93, 0), dome = mesh(new THREE.SphereGeometry(.3, 32, 16, 0, PI * 2, 0, PI / 2), chrome, 0, 1, 0);
  const bot = mesh(new THREE.CylinderGeometry(.46, .46, .14, 48), chrome, 0, -.93, 0), knob = mesh(new THREE.SphereGeometry(.16, 24, 16), chrome, 0, -1.08, 0);
  g.add(stripes, glassTube, top, dome, bot, knob);
  return { g, tilt: .06, lean: .2, dock: .78, tick(t) { tex.offset.y = -t * .25; } };
};
// landscaper / garden: a terracotta pot with a young plant
HERO.garden = (label, tint = '#4E7D3A') => {
  const g = new THREE.Group();
  g.add(lathe([[0, -1.0], [.5, -1.0], [.66, .1], [.74, .12], [.76, .32], [.62, .32], [0, .32]], std({ color: '#B4643C', roughness: .85 })));
  const soil = mesh(new THREE.CylinderGeometry(.6, .6, .04, 40), std({ color: '#3B2A1E', roughness: 1 }), 0, .26, 0); g.add(soil);
  const stem = std({ color: '#5C7F3A', roughness: .7 }), leafM = std({ color: tint, roughness: .55, side: THREE.DoubleSide });
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(.26, .22, 0, .62); s.quadraticCurveTo(-.26, .22, 0, 0);
  const leafG = new THREE.ExtrudeGeometry(s, { depth: .02, bevelEnabled: false, curveSegments: 14 });
  g.add(mesh(new THREE.CylinderGeometry(.03, .04, .9, 10), stem, 0, .7, 0));
  [[.55, .3, .9], [.75, -.4, -.9], [.95, .2, 2.2], [1.1, -.1, -2.4], [1.18, 0, 0]].forEach(([y, z, r], i) => {
    const l = mesh(leafG, leafM, 0, y, 0); l.rotation.set(.6 + z, r, (i % 2 ? -1 : 1) * .9); l.scale.setScalar(.9 + i * .08); g.add(l);
  });
  g.position.y = -.1;
  return { g, tilt: .3, lean: .1, dock: .7 };
};
// builder: a spirit level with a live bubble
HERO.build = () => {
  const g = new THREE.Group();
  const body = mesh(new THREE.BoxGeometry(2.4, .34, .2), std({ color: '#F2B705', roughness: .45 }));
  const ends = std({ color: '#1C1C1C', roughness: .6 });
  g.add(body, mesh(new THREE.BoxGeometry(.12, .36, .22), ends, -1.2, 0, 0), mesh(new THREE.BoxGeometry(.12, .36, .22), ends, 1.2, 0, 0));
  const vial = mesh(new THREE.CapsuleGeometry(.07, .34, 8, 20), new THREE.MeshPhysicalMaterial({ color: '#B8E986', roughness: .05, transparent: true, opacity: .7, clearcoat: 1 }), 0, 0, .12); vial.rotation.z = PI / 2;
  const bubble = mesh(new THREE.SphereGeometry(.05, 16, 12), std({ color: '#FFFFFF', roughness: .1 }), 0, .02, .17);
  g.add(vial, bubble, mesh(new THREE.BoxGeometry(.5, .2, .02), std({ color: '#222', roughness: .5 }), 0, 0, .1));
  const wrap = new THREE.Group(); wrap.add(g); g.rotation.set(.2, -.5, 0);
  return { g: wrap, tilt: .3, lean: .12, dock: .55, tick(t) { bubble.position.x = Math.sin(t * .9) * .1; } };
};
// anything else: a faceted gem in the brand colour
HERO.spark = (label, tint = '#C9A24B') => {
  const g = new THREE.Group();
  g.add(mesh(new THREE.OctahedronGeometry(1, 0), new THREE.MeshPhysicalMaterial({ color: tint, roughness: .12, metalness: .3, clearcoat: 1, flatShading: true })));
  const ring = mesh(new THREE.TorusGeometry(1.35, .02, 8, 120), std({ color: tint, roughness: .3, metalness: .8 })); ring.rotation.x = PI / 2.4; g.add(ring);
  return { g, tilt: .3, lean: .2, dock: .6, tick(t) { ring.rotation.z = t * .3; } };
};
FLOAT.nails = (R, i) => i % 3 === 2 ? mesh(new THREE.SphereGeometry(.07 + R() * .08, 20, 14), std({ color: '#D4AF5A', roughness: .2, metalness: 1 })) : mesh(new THREE.SphereGeometry(.14 + R() * .26, 32, 24), glass(R() > .5 ? '#F8D7E3' : '#FFFFFF', .3));
FLOAT.barber = (R, i) => i % 2 ? mesh(new THREE.SphereGeometry(.12 + R() * .22, 28, 20), glass('#FFFFFF', .3)) : mesh(new THREE.TorusGeometry(.14 + R() * .1, .02, 8, 40), std({ color: '#D9DDE0', roughness: .15, metalness: 1 }));
FLOAT.garden = (R, i) => { if (i % 2) return mesh(new THREE.SphereGeometry(.12 + R() * .2, 20, 14), glass('#E6F1EC', .3)); const s = new THREE.Shape(); s.moveTo(0, -.3); s.quadraticCurveTo(.2, 0, 0, .3); s.quadraticCurveTo(-.2, 0, 0, -.3); return mesh(new THREE.ExtrudeGeometry(s, { depth: .01, bevelEnabled: false }), std({ color: ['#6B8E3D', '#8DB255', '#4E7D3A'][i % 3], roughness: .6, side: THREE.DoubleSide })); };
FLOAT.build = (R, i) => mesh(new THREE.BoxGeometry(.24, .12, .12), std({ color: ['#B5523B', '#A8483A', '#C46A4E'][i % 3], roughness: .9 }));
FLOAT.spark = (R, i) => i % 2 ? mesh(new THREE.OctahedronGeometry(.1 + R() * .12, 0), std({ color: '#FFFFFF', roughness: .2, flatShading: true })) : mesh(new THREE.SphereGeometry(.12 + R() * .24, 28, 20), glass('#FFFFFF', .3));


// Pages built before the scene have solid section backgrounds. Lift the hero's
// background onto a layer under the canvas, let light sections show the scene
// faintly, and keep content above the canvas.
function retrofit(hero) {
  const back = document.createElement('div'); back.className = 'scene-backdrop';
  const cs = getComputedStyle(hero);
  ['backgroundColor', 'backgroundImage', 'backgroundSize', 'backgroundPosition', 'backgroundRepeat'].forEach(p => { back.style[p] = cs[p]; });
  hero.style.background = 'transparent';
  document.body.prepend(back);
  const place = () => { const r = hero.getBoundingClientRect(); back.style.top = r.top + scrollY + 'px'; back.style.height = r.height + 'px'; };
  place(); addEventListener('resize', place); new ResizeObserver(place).observe(hero);
  const lift = el => { if (getComputedStyle(el).position === 'static') el.style.position = 'relative'; if (getComputedStyle(el).zIndex === 'auto') el.style.zIndex = '1'; };
  document.querySelectorAll('body > header, header#siteHeader').forEach(h => {
    if (getComputedStyle(h).zIndex === 'auto') h.style.zIndex = '50';
    // a fixed header would sit under the concept banner at the top of the page: keep it just below it
    const note = document.querySelector('body > div[style*="2147483647"]');
    if (note && getComputedStyle(h).position === 'fixed') {
      const keep = () => { h.style.top = Math.max(0, note.getBoundingClientRect().bottom) + 'px'; };
      keep(); addEventListener('scroll', keep, { passive: true }); addEventListener('resize', keep);
    }
  });
  document.querySelectorAll('main > section, main > div, body > section, body > div:not(.helper):not(.scene-backdrop), footer').forEach(el => {
    if (el === back || el.contains(document.querySelector('canvas.scene3d'))) return;
    lift(el);
    if (el === hero) return;
    const m = getComputedStyle(el).backgroundColor.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m || (m[4] !== undefined && +m[4] < .99) || getComputedStyle(el).backgroundImage !== 'none') return;
    const light = (+m[1] * .3 + +m[2] * .59 + +m[3] * .11) > 150;
    el.style.backgroundColor = `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${light ? .74 : .9})`;
  });
}


/* ---------- backdrops: things that move behind the page without an object ---------- */
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
function palette(canvas) {
  const list = (canvas.dataset.colors || '').split(',').map(x => x.trim()).filter(Boolean);
  const pick = (i, v, d) => { try { return new THREE.Color(list[i] || css(v) || d); } catch (e) { return new THREE.Color(d); } };
  return [pick(0, '--accent', '#C9A24B'), pick(1, '--soft', '#EFE8F3'), pick(2, '--bg', '#FFFFFF')];
}
const BACKDROP = {
  waves(scene, cols) {
    const geo = new THREE.PlaneGeometry(60, 26, 220, 90);
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: { t: { value: 0 }, a: { value: cols[0] }, b: { value: cols[1] } },
      vertexShader: `uniform float t; varying float h; varying float d;
        void main() { vec3 p = position;
          h = sin(p.x * .32 + t * .9) * .35 + sin(p.y * .55 - t * .7) * .28 + sin((p.x + p.y) * .21 + t * .45) * .4;
          p.z += h; d = (p.y + 13.) / 26.;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
      fragmentShader: `uniform vec3 a; uniform vec3 b; varying float h; varying float d;
        void main() { vec3 c = mix(b, a, smoothstep(-.7, .9, h)); float line = smoothstep(.04, .0, abs(fract(h * 3.) - .5) - .45);
          gl_FragColor = vec4(c + line * .05, (.42 + h * .14) * smoothstep(1., .5, d)); }`,
    });
    const m = new THREE.Mesh(geo, mat); m.rotation.x = -PI / 2.25;
    scene.add(m);
    return (t, camY, visH) => { mat.uniforms.t.value = t; m.position.set(0, camY - visH * .58, -4); };
  },
  ribbons(scene, cols) {
    const items = [];
    for (let i = 0; i < 4; i++) {
      const geo = new THREE.PlaneGeometry(36, .5 + i * .14, 260, 1);
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: { t: { value: 0 }, c: { value: cols[i % 2 ? 1 : 0].clone().lerp(cols[2], i * .12) }, k: { value: i * 1.7 } },
        vertexShader: `uniform float t; uniform float k; varying float s;
          void main() { vec3 p = position; float w = p.x * .18 + k;
            p.y += sin(w + t * .5) * 1.6 + sin(w * 2.3 - t * .3) * .5; p.z += cos(w * 1.4 + t * .4) * 1.2;
            s = .5 + .5 * sin(w * 3. + t); gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.); }`,
        fragmentShader: `uniform vec3 c; varying float s; void main() { gl_FragColor = vec4(c * (.85 + s * .25), .3); }`,
      });
      const m = new THREE.Mesh(geo, mat); m.rotation.z = -.18 + i * .1; scene.add(m); items.push([m, mat, (i - 1.5) * 2.4]);
    }
    return (t, camY) => items.forEach(([m, mat, off]) => { mat.uniforms.t.value = t; m.position.set(0, camY + off, -3); });
  },
  aurora(scene, cols) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, depthTest: false,
      uniforms: { t: { value: 0 }, a: { value: cols[0] }, b: { value: cols[1] }, r: { value: 1 } },
      vertexShader: `varying vec2 v; void main() { v = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
      fragmentShader: `uniform float t; uniform vec3 a; uniform vec3 b; uniform float r; varying vec2 v;
        float blob(vec2 p, vec2 c, float s) { return exp(-dot(p - c, p - c) / s); }
        void main() { vec2 p = vec2(v.x * r, v.y);
          float f1 = blob(p, vec2(r * (.25 + .15 * sin(t * .21)), .7 + .12 * cos(t * .17)), .07);
          float f2 = blob(p, vec2(r * (.75 + .12 * cos(t * .19)), .35 + .15 * sin(t * .23)), .09);
          float f3 = blob(p, vec2(r * (.5 + .3 * sin(t * .13)), .1 + .1 * sin(t * .29)), .05);
          vec3 c = a * (f1 + f3 * .7) + b * f2; float al = clamp((f1 + f2 + f3) * .5, 0., .55);
          gl_FragColor = vec4(c / max(.001, f1 + f3 * .7 + f2), al); }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); m.frustumCulled = false; m.renderOrder = -1; scene.add(m);
    return (t, camY, visH, aspect) => { mat.uniforms.t.value = t; mat.uniforms.r.value = aspect; };
  },
  sparkles(scene, cols) {
    const n = innerWidth < 760 ? 260 : 600, pos = new Float32Array(n * 3), R = rng(11);
    for (let i = 0; i < n; i++) { pos[i * 3] = (R() - .5) * 16; pos[i * 3 + 1] = R() * 12; pos[i * 3 + 2] = (R() - .5) * 6; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.NormalBlending,
      uniforms: { t: { value: 0 }, c: { value: cols[0].clone().lerp(new THREE.Color('#FFFFFF'), .35) }, camY: { value: 0 } },
      vertexShader: `uniform float t; uniform float camY; varying float tw;
        void main() { vec3 p = position; p.y = mod(p.y + t * .25, 12.) - 6. + camY; p.x += sin(t * .3 + position.y) * .2;
          tw = .5 + .5 * sin(t * 2. + position.x * 7.); vec4 mv = modelViewMatrix * vec4(p, 1.);
          gl_PointSize = (3. + tw * 5.) * (10. / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform vec3 c; varying float tw; void main() { float d = length(gl_PointCoord - .5); if (d > .5) discard;
          gl_FragColor = vec4(c, pow(1. - d * 2., 1.6) * (.3 + tw * .5)); }`,
    });
    scene.add(new THREE.Points(geo, mat));
    return (t, camY) => { mat.uniforms.t.value = t; mat.uniforms.camY.value = camY; };
  },
};

/* ---------- experiences: a different way to meet the object on every concept ----------
   data-experience on the canvas. Two kinds:
   - HERO_EXP reshapes the hero object and is placed by data-motion as usual; its tick(t, s)
     gets s = { y, p (0..1 down the whole page), k (0..1 through the first screen), dt }.
   - SCENE_EXP builds its own scene and is updated every frame with the full context. */
const clamp = v => Math.min(1, Math.max(0, v)), smooth = k => k * k * (3 - 2 * k);
const HERO_EXP = {
  // exploded view: the parts separate like a product diagram as you scroll, and come back together at the end
  explode(h) {
    h.g.updateMatrixWorld(true);
    const parts = [...h.g.children].map(o => ({ o, c: new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).y, p: o.position.clone(), r: o.rotation.clone() }));
    parts.sort((a, b) => a.c - b.c).forEach((q, i) => { q.off = (i - (parts.length - 1) / 2) * .62; });
    return { ...h, tick(t, s) {
      h.tick?.(t, s);
      const e = smooth(clamp(s.k * 1.4)) * (1 - smooth(clamp((s.p - .8) / .2)));
      parts.forEach((q, i) => {
        q.o.position.set(q.p.x + Math.sin(i * 2.1) * .3 * e, q.p.y + q.off * e, q.p.z + Math.cos(i * 1.7) * .35 * e);
        q.o.rotation.set(q.r.x + Math.sin(t * .6 + i) * .05 * e, q.r.y + e * (i % 2 ? .7 : -.7), q.r.z + e * .12 * Math.sin(i * 3));
      });
    } };
  },
  // breathing: the stones lift apart on an eight-second breath and settle; ripples spread on each breath
  breathe(h) {
    const kids = [...h.g.children], stones = kids.slice(0, 5), rings = kids.slice(5), base = stones.map(s => s.position.y);
    return { ...h, tick(t, s) {
      const b = .5 - .5 * Math.cos(t * PI * 2 / 8);
      stones.forEach((st, i) => { st.position.y = base[i] + b * i * .11; });
      rings.forEach((r, i) => { const k = (t / 8 + i / 3) % 1; r.scale.setScalar(.55 + k * 1.4); r.material.opacity = .6 * Math.sin(k * PI); });
    } };
  },
  // gait scan: a light sweeps heel to toe and leaves a pressure map behind it
  scan(h) {
    const g = h.g.children[0], shape = g.children[1].geometry.parameters.shapes;
    const uni = { s: { value: -1.3 } };
    const map = new THREE.Mesh(new THREE.ShapeGeometry(shape, 48), new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: uni,
      vertexShader: `varying vec2 v; void main() { v = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
      fragmentShader: `uniform float s; varying vec2 v;
        float g(vec2 c, vec2 r) { vec2 d = (v - c) / r; return exp(-dot(d, d)); }
        void main() {
          float h = clamp(g(vec2(.04, -.72), vec2(.26, .3)) + g(vec2(-.02, .45), vec2(.36, .22)) * .85 + g(vec2(.05, .92), vec2(.3, .12)) * .55 + g(vec2(.3, 0.), vec2(.12, .4)) * .35, 0., 1.);
          vec3 c = h < .5 ? mix(vec3(.15, .35, .9), vec3(.2, .85, .5), h * 2.) : mix(vec3(.2, .85, .5), vec3(.95, .3, .15), (h - .5) * 2.);
          float shown = smoothstep(s, s - .12, v.y), edge = smoothstep(.06, 0., abs(v.y - s));
          gl_FragColor = vec4(c + edge * .5, shown * .8 + edge * .7); }`,
    }));
    map.position.z = .305; map.renderOrder = 4;
    const laser = mesh(new THREE.BoxGeometry(1.25, .014, .014), new THREE.MeshBasicMaterial({ color: '#8FE6FF', transparent: true }), 0, 0, .32);
    g.add(map, laser);
    return { ...h, tick(t) {
      const ph = (t * .16) % 1, y = -1.2 + smooth(clamp(ph / .62)) * 2.45;
      uni.s.value = y; laser.position.y = Math.min(1.12, y); laser.material.opacity = 1 - smooth(clamp((ph - .6) / .1));
    } };
  },
  // build on scroll: loose pieces of oak fly together into a stool
  assemble() {
    const g = new THREE.Group(), R = rng(31), pieces = [];
    const oak = std({ color: '#B98A54', roughness: .6 }), dark = std({ color: '#93673A', roughness: .62 });
    const add = (geo, m, to, tr = [0, 0, 0]) => {
      const o = mesh(geo, m); o.userData = { to: new THREE.Vector3(...to), tr: new THREE.Euler(...tr),
        from: new THREE.Vector3(to[0] * 1.6 + (R() - .5) * 1.6, to[1] * .6 + (R() - .5) * 1.4, to[2] * 1.6 + (R() - .5) * 1.2), fr: new THREE.Euler(R() * 6, R() * 6, R() * 6) };
      g.add(o); pieces.push(o);
    };
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) add(new THREE.CylinderGeometry(.07, .09, 1.5, 16), oak, [sx * .5, -.3, sz * .5], [sz * .09, 0, -sx * .09]);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(.035, .035, 1.06, 12), dark, [0, -.55, s * .53], [0, 0, PI / 2]);
    for (const s of [-1, 1]) add(new THREE.CylinderGeometry(.035, .035, 1.06, 12), dark, [s * .53, -.55, 0], [PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(.8, .78, .13, 56), oak, [0, .5, 0]);
    const n = pieces.length;
    return { g, tilt: .32, lean: .05, dock: .62, tick(t, s) {
      const a = smooth(clamp(s.k * 1.15));
      pieces.forEach((o, i) => {
        const u = o.userData, k = smooth(clamp(a * 1.6 - i * (.6 / (n - 1))));
        o.position.lerpVectors(u.from, u.to, k);
        o.rotation.set(u.fr.x + (u.tr.x - u.fr.x) * k, u.fr.y + (u.tr.y - u.fr.y) * k, u.fr.z + (u.tr.z - u.fr.z) * k);
      });
    } };
  },
  // particles: the jar is drawn in points of light that drift into a botanical cloud and re-form
  particles(solid) {
    const n = innerWidth < 760 ? 3200 : 6400, R = rng(21);
    const a = new Float32Array(n * 3), b = new Float32Array(n * 3), col = new Float32Array(n * 3), d = new Float32Array(n);
    const C = { side: new THREE.Color('#6E9E4A'), band: new THREE.Color('#33511C'), cream: new THREE.Color('#B9A774'), gold: new THREE.Color('#D4AF5A') };
    for (let i = 0; i < n; i++) {
      const u = R(), ang = R() * PI * 2; let x, y, z, c;
      if (u < .62) { y = -.75 + R() * 1.0; x = Math.cos(ang) * .87; z = Math.sin(ang) * .87; c = y > -.53 && y < -.11 ? C.band : C.side; }
      else if (u < .78) { const r = Math.sqrt(R()) * .74; y = .3; x = Math.cos(ang) * r; z = Math.sin(ang) * r; c = C.cream; }
      else { const top = R() < .4, r = top ? Math.sqrt(R()) * .84 : .84; y = top ? 1.08 : .82 + R() * .26; x = .35 + Math.cos(ang) * r; z = -.1 + Math.sin(ang) * r; c = C.gold; }
      a.set([x, y, z], i * 3);
      const rr = 1.4 + R() * 1.9, ph = R() * PI * 2, el = (R() - .5) * 1.6;
      b.set([Math.cos(ph) * rr, el + Math.sin(ph * 3) * .3, Math.sin(ph) * rr], i * 3);
      col.set([c.r, c.g, c.b], i * 3); d[i] = R();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(a, 3)); geo.setAttribute('scatter', new THREE.BufferAttribute(b, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('delay', new THREE.BufferAttribute(d, 1));
    const uni = { m: { value: 0 }, t: { value: 0 }, sz: { value: 3 }, op: { value: 1 } };
    const pts = new THREE.Points(geo, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: uni,
      vertexShader: `attribute vec3 scatter; attribute vec3 color; attribute float delay; uniform float m; uniform float t; uniform float sz; varying vec3 vc;
        void main() { float k = smoothstep(delay * .4, delay * .4 + .6, m);
          vec3 p = mix(position, scatter, k); float a = k * (1.6 + t * .15);
          p.xz = mat2(cos(a), -sin(a), sin(a), cos(a)) * p.xz; p.y += sin(t + delay * 20.) * .06 * k;
          vc = color; vec4 mv = modelViewMatrix * vec4(p, 1.); gl_PointSize = sz * (10. / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform float op; varying vec3 vc; void main() { float d = length(gl_PointCoord - .5); if (d > .5 || op < .01) discard; gl_FragColor = vec4(vc, pow(1. - d * 2., 1.3) * .9 * op); }`,
    }));
    pts.frustumCulled = false;
    // The real, solid jar shows first so it's obvious what it is; it hands over to the grains as you scroll.
    const g = new THREE.Group(); g.add(pts);
    const mats = [];
    if (solid) {
      g.add(solid.g);
      solid.g.traverse(o => { if (o.material) { o.material.transparent = true; mats.push([o.material, o.material.opacity ?? 1]); } });
    }
    return { g, tilt: .35, lean: .05, dock: .66, tick(t, s) {
      solid?.tick?.(t, s);
      const back = smooth(clamp((s.p - .86) / .12));                 // whole again at the very end
      const solidK = Math.max(1 - smooth(clamp(s.k * 2.2)), back);  // solid jar in the hero and at the end
      mats.forEach(([m, o]) => { m.opacity = o * solidK; m.depthWrite = solidK > .95; });
      if (solid) solid.g.visible = solidK > .01;
      uni.t.value = t; uni.sz.value = 3.4 * Math.min(devicePixelRatio || 1, 1.75) * innerHeight / 800;
      uni.op.value = 1 - solidK;
      // grains drift apart and swirl while you read, but stay close enough to keep the jar's shape in mind
      uni.m.value = (.35 + .35 * Math.sin(t * .35) ** 2) * smooth(clamp(s.k * 1.3)) * (1 - back);
    } };
  },
};

const SCENE_EXP = {
  // café table vignette: starts top-down in the hero and swoops to eye level as you scroll
  orbit(scene) {
    const g = new THREE.Group(), cup = HERO.cafe();
    g.add(cup.g);
    g.add(mesh(new THREE.CylinderGeometry(2.2, 2.2, .12, 72), std({ color: '#C49A6C', roughness: .55 }), 0, -.88, 0));
    g.add(mesh(new THREE.CylinderGeometry(.1, .1, 2.4, 20), std({ color: '#2B2420', roughness: .4, metalness: .6 }), 0, -2.1, 0));
    const pastry = mesh(new THREE.TorusGeometry(.34, .17, 18, 36, PI * 1.25), std({ color: '#C98A3E', roughness: .5 }), 1.25, -.7, .55);
    pastry.rotation.set(PI / 2, 0, .6); pastry.scale.z = .75; g.add(pastry);
    const R = rng(5), bean = FLOAT.cafe;
    for (let i = 0; i < 9; i++) { const o = bean(R, i % 3); o.scale.multiplyScalar(.45); o.position.set(-1.6 + R() * 1.2, -.78, -.4 + R() * 1.4); o.rotation.y = R() * 6; g.add(o); }
    const card = mesh(new THREE.BoxGeometry(.7, .02, 1), std({ color: '#F6EBDD', roughness: .8 }), -.3, -.81, -1.4); card.rotation.y = .3; g.add(card);
    scene.add(g);
    return c => {
      const wide = c.aspect > 1, st = c.stage;
      const dockX = wide ? c.visW * .27 : c.visW * .2, dockY = c.camY - (wide ? .05 : .3) * c.visH, dS = c.visH * (wide ? .2 : .14) / 2.2;
      const k = st ? st.k : 1, sx = st ? st.sx : dockX, sy = st ? st.sy : dockY, sS = st ? st.sS * .55 : dS;
      g.position.set(sx + (dockX - sx) * k, sy + (dockY - sy) * k, 0);
      const swoop = smooth(clamp(c.p * 1.5));
      g.scale.setScalar((sS + (dS - sS) * k) * (.9 + swoop * .25));
      g.rotation.set(1.05 - swoop * .82 + c.py * .1, c.p * PI * 1.5 + c.t * .05 + c.px * .3, 0);
      cup.tick(c.t);
    };
  },
  // gift rain: boxes fall as you scroll and stack into little towers at the edges of the screen
  rain(scene) {
    const R = rng(77), boxes = [], heights = new Map(), W = .5, mobile = innerWidth < 760, MAX = mobile ? 16 : 32;
    let lastY = scrollY, acc = 0, made = 0, warm = 0;
    const lanes = mobile ? [[.32, .48]] : [[-.48, -.36], [.36, .48]];
    function spawn(c) {
      if (boxes.length >= MAX) return;
      const o = FLOAT.shop(R, made * 2), s = o.children[0].geometry.parameters.width * 1.4; o.scale.setScalar(1.4);
      const lane = lanes[made++ % lanes.length], col = Math.round((lane[0] + R() * (lane[1] - lane[0])) * c.visW / W);
      boxes.push({ o, s, col, y: c.visH + .5, vy: 0, landed: false, pop: 0, spin: (R() - .5) * 4, ry: R() * 6 });
      scene.add(o);
    }
    return c => {
      acc += Math.abs(c.y - lastY); lastY = c.y;
      if (warm < 5 && c.t > warm * .5 + .4) { warm++; spawn(c); }
      while (acc > 150) { acc -= 150; spawn(c); }
      const cap = c.visH * .34;
      for (let i = boxes.length - 1; i >= 0; i--) {
        const b = boxes[i], floor = heights.get(b.col) || 0;
        if (!b.landed) {
          b.vy -= 11 * c.dt; b.y += b.vy * c.dt;
          if (c.reduce || b.y - b.s / 2 <= floor) {
            b.y = floor + b.s / 2; b.landed = true;
            if (floor + b.s > cap) b.pop = 1; else heights.set(b.col, floor + b.s);
          }
        }
        if (b.pop) {
          b.pop -= c.dt * 1.6; b.o.scale.setScalar(Math.max(0, b.pop) * 1.4);
          if (b.pop <= 0) { scene.remove(b.o); boxes.splice(i, 1); continue; }
        }
        b.o.position.set(b.col * W + c.px * .2, c.camY - c.visH / 2 + b.y, -1);
        b.o.rotation.set(b.landed ? 0 : c.t * b.spin, b.ry + (b.landed ? 0 : c.t * b.spin * .5), b.landed ? 0 : c.t * b.spin * .7);
      }
    };
  },
  // gold arches: scrolling carries you through a corridor of gilded arches
  tunnel(scene) {
    const s = new THREE.Shape(); s.moveTo(-2, -2.6); s.lineTo(2, -2.6); s.lineTo(2, .6); s.absarc(0, .6, 2, 0, PI, false); s.lineTo(-2, -2.6);
    const hole = new THREE.Path(); hole.moveTo(-1.9, -2.5); hole.lineTo(-1.9, .6); hole.absarc(0, .6, 1.9, PI, 0, true); hole.lineTo(1.9, -2.5); hole.lineTo(-1.9, -2.5); s.holes.push(hole);
    const geo = new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelThickness: .02, bevelSize: .02, bevelSegments: 2, curveSegments: 40 });
    const N = 12, GAP = 5, arches = [];
    for (let i = 0; i < N; i++) {
      const m = new THREE.Mesh(geo, std({ color: '#D4AF5A', roughness: .22, metalness: 1, transparent: true, depthWrite: false }));
      m.userData.i = i; scene.add(m); arches.push(m);
    }
    return c => {
      const travel = c.y / c.H * 6 + c.t * .25;
      for (const m of arches) {
        const z = ((m.userData.i * GAP + travel) % (N * GAP)) - (N * GAP - 9);
        m.position.set(c.px * (z - 10) * -.06, c.camY - .2 + c.py * (z - 10) * .04, z);
        m.rotation.z = Math.sin(m.userData.i * 1.3) * .03;
        m.material.opacity = smooth(clamp((z + N * GAP - 12) / 14)) * (1 - smooth(clamp((z - 5) / 4))) * .55;
      }
    };
  },
};

function start(canvas) {
  if (canvas.hasAttribute('data-retrofit')) retrofit(document.querySelector(canvas.dataset.retrofit || '.hero'));
  const kind = canvas.dataset.scene || 'spark', stage = document.querySelector('.stage3d');
  const motion = canvas.dataset.motion || 'dock', backdrop = canvas.dataset.backdrop || 'floats';
  const exp = canvas.dataset.experience || '', sceneExp = SCENE_EXP[exp];
  const useHero = !sceneExp && motion !== 'none' && (HERO[kind] || HERO_EXP[exp]) && (stage || motion === 'float');
  if (!useHero && !sceneExp && !BACKDROP[backdrop] && backdrop !== 'floats') return;
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
  let hero = useHero ? (HERO[kind] || HERO.spark)(canvas.dataset.label, canvas.dataset.tint) : null; const SIZE = 2.3;
  if (hero && HERO_EXP[exp]) hero = HERO_EXP[exp](hero);
  const pivot = new THREE.Group(); if (hero) { pivot.add(hero.g); scene.add(pivot); }
  const backTick = BACKDROP[backdrop] ? BACKDROP[backdrop](scene, palette(canvas)) : null;
  const sceneTick = sceneExp ? sceneExp(scene) : null;

  const R = rng(kind.length * 97 + 5), floats = [];
  const N = backdrop === 'floats' ? (innerWidth < 760 ? 9 : 16) : 0;
  const makeFloat = FLOAT[kind] || FLOAT.spark;
  for (let i = 0; i < N; i++) {
    const o = makeFloat(R, i);
    o.userData = { u: (i + R() * .8) / N, x: (R() * 2 - 1), z: -3.2 + R() * 4, ph: R() * 6.28, sp: .25 + R() * .5, rx: R() * 6.28, ry: R() * 6.28 };
    o.userData.x = Math.sign(o.userData.x || 1) * ((innerWidth < 760 ? .86 : .62) + Math.abs(o.userData.x) * (innerWidth < 760 ? .14 : .38));
    scene.add(o); floats.push(o);
  }

  let W = 1, H = 1, visH = 1, visW = 1, span = 1, px = 0, py = 0, tx = 0, ty = 0, t = 0, shown = false, spin = 0, drag = null;
  const PAR = .82;
  function resize() {
    W = innerWidth; H = innerHeight; renderer.setSize(W, H, false);
    camera.aspect = W / H; camera.updateProjectionMatrix();
    visH = 2 * D * Math.tan(THREE.MathUtils.degToRad(FOV / 2)); visW = visH * camera.aspect;
    span = Math.max(0, document.documentElement.scrollHeight - H) / H * visH * PAR;
  }
  addEventListener('resize', resize); resize();
  new ResizeObserver(resize).observe(document.body);
  addEventListener('pointermove', e => { tx = e.clientX / W - .5; ty = e.clientY / H - .5; if (drag !== null) { spin += (e.clientX - drag) * .01; drag = e.clientX; } }, { passive: true });
  if (motion === 'stay' && stage) {   // the stage takes drags so the visitor can turn the object
    stage.style.pointerEvents = 'auto'; stage.style.cursor = 'grab'; stage.style.touchAction = 'pan-y';
    stage.addEventListener('pointerdown', e => { drag = e.clientX; });
    addEventListener('pointerup', () => { drag = null; });
  }

  const clock = new THREE.Clock(), sm = k => k * k * (3 - 2 * k);
  const prog = (y, dt) => ({ y, dt, k: clamp(y / H), p: clamp(y / Math.max(1, document.documentElement.scrollHeight - H)) });
  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    if (document.hidden) return;
    if (!reduce) t += dt;
    px += (tx - px) * Math.min(1, dt * 3); py += (ty - py) * Math.min(1, dt * 3);
    const y = scrollY, camY = -y / H * visH * PAR;
    camera.position.set(0, camY, D); camera.lookAt(0, camY, 0);

    if (hero) {
      const wide = camera.aspect > 1;
      if (motion === 'float') {
        // centred behind the content, small, turning slowly the whole way down
        const s = visH * (wide ? .42 : .3) / SIZE;
        pivot.position.set(wide ? visW * .22 : 0, camY + Math.sin(t * .6) * .15, -3);
        pivot.scale.setScalar(s);
        pivot.rotation.set(hero.tilt + py * .2, t * .25 + y * .0015 + px * .6, hero.lean * .5);
      } else {
        const r = stage.getBoundingClientRect();
        const k = motion === 'dock' ? sm(Math.min(1, Math.max(0, 1 - r.bottom / (H * .72)))) : 0;
        const sx = ((r.left + r.width / 2) / W - .5) * visW, sy = camY + (.5 - (r.top + r.height / 2) / H) * visH;
        const sS = Math.min(r.width / W * visW, r.height / H * visH) / SIZE * .8;
        const dx = wide ? -visW / 2 + visW * .05 : visW / 2 - visW * .04, dy = camY + (wide ? -.1 : -.9) * visH * .25;
        const dS = visH * (wide ? .46 : .26) / SIZE * (hero.dock || 1);   // docked smaller than the concept builds, so it never covers copy
        pivot.position.set(sx + (dx - sx) * k, sy + (dy - sy) * k + Math.sin(t * .8) * .06, wide ? 0 : -1.5 * k);
        pivot.scale.setScalar(sS + (dS - sS) * k);
        const turn = motion === 'stay' ? spin + t * .2 : y * .0022;
        pivot.rotation.set(hero.tilt + py * .18, -.45 + turn + px * .5 + Math.sin(t * .4) * .08, hero.lean * (wide ? 1 : -1) * (.35 + k * .65));
      }
      hero.tick?.(t, prog(y, dt));
    }
    backTick?.(t, camY, visH, camera.aspect);
    if (sceneTick) {
      let st = null;
      if (stage) {
        const r = stage.getBoundingClientRect();
        st = { k: sm(clamp(1 - r.bottom / (H * .72))), sx: ((r.left + r.width / 2) / W - .5) * visW, sy: camY + (.5 - (r.top + r.height / 2) / H) * visH,
          sS: Math.min(r.width / W * visW, r.height / H * visH) / SIZE * .8 };
      }
      sceneTick({ t, dt: reduce ? 0 : dt, reduce, y, camY, visW, visH, W, H, px, py, aspect: camera.aspect, stage: st, ...prog(y, dt) });
    }

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
  try { start(c); } catch (err) { console.error('[SparkLab] scene', err); c.remove(); }
});
