// SparkLab Worlds
// Five floating platforms at dusk, plus the assistant studio. Each is a slim stone-and-bronze deck carrying a
// glass pavilion, planting and water, joined to its neighbours by light bridges.
import * as THREE from 'three';
import { Kit, signMesh } from './kit.js';
import { glowPlane } from './materials.js';
import { tree, grasses, planter, pottedPlant, bistroSet, bench, interiors, glazing, glassDoor } from './props.js';

const PI = Math.PI, V = (x, y, z) => new THREE.Vector3(x, y, z);

// Deck with a shadow-gap, a line of light, and a stepped keel underneath.
function platform(K, M, w, d, strip, round = false) {
  const slab = (mat, sw, h, sd, y) => round ? K.cyl(mat, sw / 2, sw / 2, h, 0, y, 0, 64) : K.box(mat, sw, h, sd, 0, y, 0);
  slab(M.paving, w, .3, d, -.3); slab(M.metalDark, w - .3, .5, d - .3, -.8); slab(strip, w - .22, .04, d - .22, -.85);
  let sw = w - 1.8, sd = d - 1.8, y = -.88;
  [M.plasterPlum, M.walnut, M.plasterPlum, M.metalDark].forEach((mat, i) => {
    const h = .5 + i * .28; slab(mat, sw, h, sd, y - h); y -= h;
    if (i < 3) slab(strip, sw * .66 + .08, .03, sd * .66 + .08, y - .03);
    sw *= .66; sd *= .66;
  });
  K.cyl(M.brass, .012, .012, 2.4, 0, y - 2.4, 0, 6).sph(strip, .09, 0, y - 2.45, 0, 1, 1, 1, 1);
}

// Flat-roofed pavilion. Front at z = 0, running back to -d. Sides are solid if a material is given, glazed otherwise.
function pavilion(K, M, { w, d, h, back, left = null, right = null, over = 1.1, door = 0, openFront = false, strip }) {
  const y0 = .15;
  K.box(M.oakPale, w + .6, y0, d + .6, 0, 0, -d / 2);
  K.box(back, w, h, .25, 0, y0, -d + .125).box(M.interior, w - .5, h, .02, 0, y0, -d + .26);
  for (const [mat, s] of [[left, -1], [right, 1]]) {
    const x = s * (w / 2 - .125);
    if (mat) K.box(mat, .25, h, d - .25, x, y0, -d / 2 + .125).box(M.interior, .02, h, d - .5, x - s * .136, y0, -d / 2);
    else {
      K.box(M.glass, .016, h, d - .3, x, y0, -d / 2 + .1);
      for (let z = -.05; z > -d + .2; z -= (d - .3) / 4) K.box(M.metalDark, .05, h, .06, x, y0, z);
    }
  }
  if (!openFront) {
    const dl = door - .62, dr = door + .62, xl = -w / 2 + .05, xr = w / 2 - .05;
    if (dl - xl > .3) glazing(K, M, xl, dl, y0, y0 + h, -.05, M.metalDark, Math.max(1, Math.round((dl - xl) / 1.5)), .045);
    if (xr - dr > .3) glazing(K, M, dr, xr, y0, y0 + h, -.05, M.metalDark, Math.max(1, Math.round((xr - dr) / 1.5)), .045);
    K.box(M.metalDark, 1.24, .05, .09, door, y0 + 2.3, -.05).box(M.glass, 1.24, h - 2.35, .016, door, y0 + 2.35, -.05);
    K.push(0, y0, 0); glassDoor(K, M, dl, dr, 2.3, -.05, M.metalDark, 1.1); K.pop();
  }
  for (const s of [-1, 1]) K.box(M.metalDark, .1, h, .1, s * (w / 2 - .05), y0, -.05);
  const top = y0 + h;
  K.box(M.ceiling, w - .3, .03, d - .3, 0, top - .03, -d / 2);
  K.box(M.oak, w + 2 * over - .12, .05, d + 2 * over - .12, 0, top, -d / 2).box(M.metalDark, w + 2 * over, .2, d + 2 * over, 0, top + .05, -d / 2);
  K.box(strip, w + 2 * over - .6, .02, .05, 0, top - .02, over - .35);
  // seen mostly from above, so the roof gets a pale deck, a sedum bed and a glowing rooflight
  const rw = w + 2 * over, rd = d + 2 * over;
  K.box(M.site, rw - .3, .03, rd - .3, 0, top + .25, -d / 2);
  K.box(M.metalDark, w * .42 + .16, .14, d * .3 + .16, -w * .14, top + .28, -d * .58).box(M.lampSoft, w * .42, .03, d * .3, -w * .14, top + .41, -d * .58);
  K.box(M.leafC, rw * .3, .07, rd * .5, rw * .27, top + .28, -d / 2); grasses(K, M, rw * .27, top + .33, -d / 2, rw * .26, rd * .44, w * 7, .3);
  return top + .25;
}
function roofSign(K, text, x, y, z, opts = {}) {
  const s = signMesh(text, { w: 2.6, h: .5, fg: '#F0D7A8', emissive: 1.5, spacing: '0.3em', ...opts });
  s.scale.setScalar(1.35); s.position.set(x, y + .42, z + .05); K.extra(s);
  // a slim dark board behind the lettering, so it reads against the pale roof
  const bw = (opts.w || 2.6) * 1.35 + .5;
  K.box(K.signBoard, bw, .78, .04, x, y + .03, z + .02);
}
function pool(K, M, x, z, w, d, round = false) {
  if (round) K.cyl(M.stoneTrim, w / 2 + .14, w / 2 + .14, .12, x, 0, z, 48).cyl(M.water, w / 2, w / 2, .02, x, .105, z, 48);
  else K.box(M.stoneTrim, w + .28, .12, d + .28, x, 0, z).box(M.water, w, .02, d, x, .105, z);
}

const worlds = {
  salon(M, strip, lamp) {
    const K = new Kit(), w = 13, d = 11;
    platform(K, M, w, d, strip);
    K.push(-2.6, 0, 2.6);
    const top = pavilion(K, M, { w: 6, d: 7.4, h: 3.3, back: M.plaster, left: M.plaster, door: 1.8, strip });
    K.push(0, .15, -.25); interiors.salon(K, M, 5.5, 6.9, 3.25, lamp); K.pop();
    roofSign(K, 'SALON', -1.4, top, 1); K.pop();
    pool(K, M, 3.9, -.9, 3.4, 6.2);
    bench(K, M, 3.9, 0, 3.6, PI, 2.2); planter(K, M, -5.6, 0, 4.4, 1.2, 1.2, .5, M.metalDark, 3);
    return { K, w, d, top, px: -2.6, pz: 2.6, trees: [[5, 0, 4.6, 4.6, 11]], spill: [-.8, 4.2] };
  },
  wellness(M, strip, lamp) {
    const K = new Kit(), w = 13, d = 13;
    platform(K, M, w, d, strip, true);
    K.push(-.8, 0, 1.8);
    const top = pavilion(K, M, { w: 5.6, d: 6.4, h: 3.1, back: M.plasterWarm, right: M.plasterWarm, door: -1.5, strip, over: .9 });
    K.push(0, .15, -.25); interiors.wellness(K, M, 5.1, 5.9, 3.05, lamp); K.pop();
    for (let z = .5; z > -6.6; z -= .2) K.box(M.oak, .07, 3.2, .06, -3.3, .15, z);   // oak screen to the glazed side
    roofSign(K, 'wellness', .9, top, .8, { font: 'italic 400 96px "Newsreader", Georgia, serif', spacing: '0.08em', w: 2.8 }); K.pop();
    pool(K, M, 3.4, 3.1, 2.8, 0, true);
    for (let i = 0; i < 9; i++) { const a = -1.2 + i * .34; grasses(K, M, Math.cos(a) * 5.7, 0, -Math.sin(a) * 5.7 - .2, 1.3, .7, i + 20, .7); }
    for (let i = 0; i < 4; i++) K.cyl(M.stoneTrim, .36, .36, .05, .9 + i * .85, 0, 3.6 + Math.sin(i) * .3, 20);
    return { K, w, d, top, px: -.8, pz: 1.8, trees: [[-4.6, 0, 2.6, 5, 12], [3.9, 0, -3.3, 4.2, 13]], spill: [-2.3, 3.2] };
  },
  cafe(M, strip, lamp) {
    const K = new Kit(), w = 15, d = 12;
    platform(K, M, w, d, strip);
    K.push(-3.6, 0, 1.2);
    const top = pavilion(K, M, { w: 6, d: 6.8, h: 3.2, back: M.brick, left: M.brick, door: -1.6, strip });
    K.push(0, .15, -.25); interiors.cafe(K, M, 5.5, 6.3, 3.15, lamp); K.pop();
    roofSign(K, 'Café', 1, top, 1, { font: 'italic 400 96px "Newsreader", Georgia, serif', spacing: '0.06em', w: 2 }); K.pop();
    // terrace with festoon lights
    bistroSet(K, M, 1.6, 0, 3, .3); bistroSet(K, M, 4.3, 0, 1.2, -.4); bistroSet(K, M, 2.4, 0, -1.6, 1.1); bistroSet(K, M, 5.2, 0, -3.3, .2);
    const a = V(.4, 3.1, 5), b = V(6.6, 3.1, -4.6);
    for (const p of [a, b]) K.cyl(M.metalDark, .035, .045, 3.1, p.x, 0, p.z, 8);
    let prev = a;
    for (let i = 1; i <= 12; i++) {
      const t = i / 12, p = a.clone().lerp(b, t); p.y -= Math.sin(t * PI) * .55;
      K.beam(M.metalDark, prev, p, .012, .012); if (i < 12) K.sph(lamp, .055, p.x, p.y - .07, p.z, 1, 1, 1, 1); prev = p;
    }
    planter(K, M, 6.9, 0, 1.5, .6, 5, .5, M.metalDark, 7); planter(K, M, -6.6, 0, 5.2, 1.4, .7, .5, M.metalDark, 8);
    return { K, w, d, top, px: -3.6, pz: 1.2, trees: [[5.9, 0, 4.6, 5.2, 14]], spill: [-5.2, 2.8] };
  },
  shop(M, strip, lamp) {
    const K = new Kit(), w = 12, d = 11;
    platform(K, M, w, d, strip);
    K.push(1.9, 0, 2.4);
    const top = pavilion(K, M, { w: 5.6, d: 7, h: 3.4, back: M.stone, right: M.stone, door: 0, strip });
    K.push(0, .15, -.25); interiors.shop(K, M, 5.1, 6.5, 3.35, lamp); K.pop();
    roofSign(K, 'HOME & GIFT', 0, top, 1, { w: 3.6, h: .4, spacing: '0.24em' }); K.pop();
    // outdoor vitrines
    [[-3.6, 3.4, 1], [-4.2, .9, 2], [-3.2, -1.6, 3]].forEach(([x, z, s]) => {
      const hh = .7 + s * .12;
      K.box(M.plaster, .62, hh, .62, x, 0, z).box(M.glass, .58, .62, .58, x, hh, z).box(strip, .5, .015, .5, x, hh, z);
      K.cyl([M.paintLav, M.brass, M.ceramic][s - 1], .07, .12, .34, x, hh + .02, z, 14);
    });
    planter(K, M, -1.6, 0, 4.7, 2.6, .6, .45, M.metalDark, 9);
    return { K, w, d, top, px: 1.9, pz: 2.4, trees: [[-4.2, 0, -3.8, 5, 15]], spill: [1.9, 4] };
  },
  workshop(M, strip, lamp) {
    const K = new Kit(), w = 13, d = 11;
    platform(K, M, w, d, strip);
    K.push(-1.8, 0, 2.4);
    const top = pavilion(K, M, { w: 6.6, d: 7.2, h: 3.9, back: M.brickBuff, left: M.brickBuff, openFront: true, strip });
    K.push(0, .15, -.25); interiors.workshop(K, M, 6.1, 6.7, 3.85, lamp); K.pop();
    // sliding timber door, drawn across the right-hand bay
    K.box(M.metalDark, 6.5, .06, .08, 0, 3.6, .06).box(M.paintPurple, 2.7, 3.4, .07, 1.9, .16, .06);
    for (let i = 0; i < 9; i++) K.box(M.paintPlum, .012, 3.4, .075, .7 + i * .3, .16, .062);
    K.box(M.brass, .03, .5, .03, .75, 1.3, .12);
    roofSign(K, 'JOINERY', -.4, top, 1, { font: '500 96px "Instrument Sans", sans-serif', w: 3, h: .42 }); K.pop();
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) K.box([M.oak, M.oakPale][(i + j) % 2], .22, .14, 3, 3.6 + j * .25, .08 + i * .2, 2);
    for (const z of [1, 3]) K.box(M.walnut, 1.1, .08, .08, 3.97, 0, z);
    K.box(M.oakPale, 1.5, .05, .7, 4.2, .8, -1.6); for (const [x, z] of [[3.55, -1.9], [4.85, -1.9], [3.55, -1.3], [4.85, -1.3]]) K.box(M.oakPale, .06, .8, .06, x, 0, z);
    return { K, w, d, top, px: -1.8, pz: 2.4, trees: [[4.8, 0, -3.9, 4.6, 16]], spill: [-3.2, 4] };
  },
};

/* ---------- the assistant studio: a ring of terminals around a pool ---------- */
export const ASSISTANTS = [
  ['booking', 'Booking assistant', 1], ['reply', 'Reply drafter', 1], ['faq', 'FAQ answerer', 1], ['leads', 'Enquiry catcher', 1],
  ['matcher', 'Service matcher', 1], ['noshow', 'No-show saver', 1], ['reviews', 'Review collector', 1], ['responder', 'Review responder', 1],
  ['intake', 'Intake summariser', 1], ['content', 'Content helper', 1], ['research', 'Research helper', 0],
];
function screenTexture(n, name, live) {
  const c = document.createElement('canvas'); c.width = 384; c.height = 512;
  const g = c.getContext('2d');
  const bg = g.createLinearGradient(0, 0, 0, 512); bg.addColorStop(0, '#3A2F4B'); bg.addColorStop(1, '#241D2E');
  g.fillStyle = bg; g.fillRect(0, 0, 384, 512);
  g.strokeStyle = 'rgba(201,169,218,.55)'; g.lineWidth = 3; g.strokeRect(14, 14, 356, 484);
  g.fillStyle = '#C9A9DA'; g.font = 'italic 300 150px "Newsreader", Georgia, serif'; g.fillText(String(n).padStart(2, '0'), 40, 190);
  g.fillStyle = '#F7F3ED'; g.font = '500 52px "Newsreader", Georgia, serif';
  name.split(' ').forEach((w, i) => g.fillText(w, 40, 300 + i * 60));
  g.font = '600 26px "Instrument Sans", sans-serif'; try { g.letterSpacing = '0.2em'; } catch (e) { /* */ }
  g.fillStyle = live ? '#BFE3C6' : '#E7C58C'; g.fillText(live ? 'LIVE DEMO' : 'CONCEPT', 40, 462);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}
function studio(M, strip) {
  const K = new Kit(), terminals = [];
  platform(K, M, 21, 21, strip, true);
  pool(K, M, 0, 0, 5.4, 0, true);
  // ring canopy on slender columns
  const ring = (mat, ro, ri, h, y) => {
    // a crescent behind the terminals, so the screens stay open to the sky and the camera
    const s = new THREE.Shape(); s.absarc(0, 0, ro, PI * .08, PI * .92, false); s.absarc(0, 0, ri, PI * .92, PI * .08, true);
    K.add(mat, new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 40 }), 0, y, 0, -PI / 2);
  };
  ring(M.oak, 9.3, 6.9, .06, 4.3); ring(M.metalDark, 9.4, 6.8, .2, 4.36); ring(M.site, 9.2, 7, .03, 4.56); ring(strip, 6.92, 6.84, .03, 4.27);
  for (let i = 0; i < 9; i++) { const a = PI + (i - 4) * .3; K.cyl(M.metalDark, .06, .06, 4.3, Math.sin(a) * 8.1, 0, Math.cos(a) * 8.1, 8); }
  // terminals on the front arc, facing outward
  ASSISTANTS.forEach(([id, name, live], i) => {
    const a = -1.75 + i * (3.5 / (ASSISTANTS.length - 1)), r = 6.3;
    const line = M.strip.clone(); line.userData = { noShadow: true }; line.emissiveIntensity = 1.2;
    const screen = new THREE.MeshStandardMaterial({ map: screenTexture(i + 1, name, live), roughness: .4, emissive: '#ffffff', emissiveIntensity: .75 });
    screen.emissiveMap = screen.map;
    K.push(Math.sin(a) * r, 0, Math.cos(a) * r, a);
    K.box(M.stone, 1.3, .45, .55, 0, 0, 0).box(M.metalDark, 1.14, 1.5, .07, 0, .5, 0, 0, -.14).box(M.brass, 1.18, .03, .09, 0, .47, 0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.04, 1.4), screen); m.position.set(0, 1.25, .04); m.rotation.x = -.14; K.extra(m);
    K.box(line, .05, .02, 3.3, 0, 0, -1.95);
    K.pop();
    terminals.push({ id, a, r, screen, line });
  });
  bench(K, M, -3.6, 0, -4.6, .65, 2.2); bench(K, M, 3.6, 0, -4.6, -.65, 2.2);
  for (let i = 0; i < 7; i++) { const a = PI + (i - 3) * .3; grasses(K, M, Math.sin(a) * 9.6, 0, Math.cos(a) * 9.6, 1.6, .7, i + 40, .8); }
  // the spark: a brass four-point star turning slowly over the water
  const s = new THREE.Shape(), pts = 8;
  for (let i = 0; i < pts; i++) { const a = i / pts * PI * 2, rr = i % 2 ? .22 : 1.15; s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * rr, Math.cos(a) * rr); }
  const spark = new THREE.Mesh(new THREE.ExtrudeGeometry(s, { depth: .08, bevelEnabled: true, bevelSize: .03, bevelThickness: .03, bevelSegments: 2 }),
    new THREE.MeshStandardMaterial({ color: '#D9B777', metalness: 1, roughness: .22, emissive: '#FFCF94', emissiveIntensity: .35 }));
  spark.position.set(0, 2.1, 0); spark.castShadow = true;
  K.cyl(M.brass, .015, .015, 1, 0, .1, 0, 6);
  return { K, terminals, spark };
}

function bridge(M, strip) {
  const K = new Kit(), L = 1;
  K.box(M.oak, L, .08, 1.3, L / 2, -.08, 0).box(M.metalDark, L, .1, 1.1, L / 2, -.18, 0).box(strip, L, .02, .9, L / 2, -.2, 0);
  for (const s of [-1, 1]) K.box(M.glass, L, .95, .02, L / 2, 0, s * .62).box(M.brass, L, .03, .05, L / 2, .95, s * .62);
  return K.build();
}

const LAYOUT = {
  salon: [-18, 1.4, -3], wellness: [-3.5, 3, -13], cafe: [.5, 0, 4], shop: [13, 2.2, -8], workshop: [17.5, .9, 6.5],
};
// bridge ends in each island's local frame
const LINKS = [
  ['salon', [6.5, 0, 3.5], 'cafe', [-7.5, 0, -3.5]],
  ['salon', [5, 0, -5.5], 'wellness', [-5.63, 0, 3.25]],
  ['wellness', [6.44, 0, .9], 'shop', [-6, 0, -2.5]],
  ['shop', [2, 0, 5.5], 'workshop', [-2.5, 0, -5.5]],
  ['cafe', [7.5, 0, 1.5], 'workshop', [-6.5, 0, -1]],
  ['shop', [6, 0, -3.2], 'studio', [-8.6, 0, 5.9]],
];

export function build(M, { compact = false } = {}) {
  const root = new THREE.Group(), items = new Map(), lamps = [], trees = [], islands = {}, bridges = [];

  Object.entries(LAYOUT).forEach(([id, [x, y, z]], i) => {
    const strip = M.strip.clone(); strip.userData = { noShadow: true };
    const lamp = M.ownLamp(); lamps.push(lamp);
    Kit.prototype.signBoard = M.metalDark;
    const b = worlds[id](M, strip, lamp), g = b.K.build();
    g.position.set(x, y, z); g.userData = { y, phase: i * 1.7 }; root.add(g); islands[id] = g;
    b.trees.forEach(([tx, ty, tz, h, seed]) => { const t = tree(M, h, seed, 1.1); t.position.set(tx, ty, tz); g.add(t); trees.push(t); });
    const spill = glowPlane(7, 6, '#FFC98A', .34); spill.position.set(b.spill[0], .02, b.spill[1]); g.add(spill);
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(b.w, 6.5, b.d)); proxy.position.y = 1.6; proxy.visible = false; proxy.userData.id = id; g.add(proxy);
    const anchor = new THREE.Object3D(); anchor.position.set(b.px, b.top + 1.3, b.pz - 1); g.add(anchor);
    items.set(id, {
      proxy, anchor,
      box: new THREE.Box3(V(x - b.w / 2, y - 1.5, z - b.d / 2), V(x + b.w / 2, y + 5.2, z + b.d / 2)),
      view: { wellness: { az: -.15, el: .56 }, shop: { az: -.62, el: .46 } }[id] || { az: -.38, el: .3 },
      highlight: v => { strip.emissiveIntensity = 3 + v * 6; spill.material.opacity = .34 + v * .3; },
    });
  });

  // the assistant studio, off to one side and a little higher
  const SP = [44, 5, -30], studioStrip = M.strip.clone(); studioStrip.userData = { noShadow: true };
  const st = studio(M, studioStrip), sg = st.K.build();
  sg.add(st.spark); sg.position.set(...SP); sg.userData = { y: SP[1], phase: 4.4 }; root.add(sg); islands.studio = sg;
  [[-5, 0, -5.5, 5.4, 31], [5.4, 0, -5, 4.8, 32]].forEach(([tx, ty, tz, h, seed]) => { const t = tree(M, h, seed, 1.1); t.position.set(tx, ty, tz); sg.add(t); trees.push(t); });
  const terminals = new Map();
  for (const t of st.terminals) {
    const lx = Math.sin(t.a) * t.r, lz = Math.cos(t.a) * t.r;
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.3, 1.5)); proxy.position.set(lx, 1.1, lz); proxy.visible = false; proxy.userData.id = t.id; sg.add(proxy);
    const c = V(SP[0] + lx * .8, SP[1], SP[2] + lz * .8);
    terminals.set(t.id, {
      proxy, anchor: V(SP[0] + lx, SP[1] + 2.6, SP[2] + lz),
      box: new THREE.Box3(V(c.x - 4.6, c.y - .5, c.z - 4.6), V(c.x + 4.6, c.y + 3.6, c.z + 4.6)),
      view: { az: t.a * .75, el: .2 },
      highlight: v => { t.screen.emissiveIntensity = .75 + v * .9; t.line.emissiveIntensity = 1.2 + v * 7; },
    });
  }

  const bridgeStrip = M.strip.clone(); bridgeStrip.userData = { noShadow: true };
  for (const [a, pa, b, pb] of LINKS) {
    const g = bridge(M, bridgeStrip); root.add(g);
    bridges.push({ g, a: islands[a], pa: V(...pa), b: islands[b], pb: V(...pb) });
  }
  const A = V(), Bv = V();
  const placeBridges = () => bridges.forEach(({ g, a, pa, b, pb }) => {
    A.copy(pa).add(a.position); Bv.copy(pb).add(b.position);
    const len = A.distanceTo(Bv);
    Bv.sub(A).normalize();
    // yaw then pitch, so the deck never rolls sideways
    g.position.copy(A); g.rotation.set(0, Math.atan2(-Bv.z, Bv.x), Math.asin(Bv.y), 'YZX'); g.scale.set(len, 1, 1);
  });
  placeBridges();

  // dusk: cool sky, a low warm key light, and a faint cool rim from behind
  const hemi = new THREE.HemisphereLight('#9A8BC4', '#3A2F4B', 1.25);
  const sun = new THREE.DirectionalLight('#FFC7A0', 2.5);
  sun.position.set(-22, 24, 20); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 26, bottom: -24, near: 1, far: 110 });
  sun.shadow.bias = -.0004; sun.shadow.normalBias = .05;
  const rim = new THREE.DirectionalLight('#A9B8FF', .9); rim.position.set(18, 12, -24);
  root.add(hemi, sun, sun.target, rim);

  const all = new THREE.Box3(V(-24.5, -1, -19), V(24, 6, 12));
  const studioBox = new THREE.Box3(V(SP[0] - 8.6, SP[1] - .3, SP[2] - 3), V(SP[0] + 8.6, SP[1] + 4, SP[2] + 8.6));
  const dusk = { sun: new THREE.Color('#FFC7A0'), sky: new THREE.Color('#9A8BC4') }, dawn = { sun: new THREE.Color('#FFDDB4'), sky: new THREE.Color('#D7B9D2') };
  return {
    root, sun, exposure: 1.08, envIntensity: .32, fog: new THREE.Fog('#3A2F4B', 80, 210),
    stations: {
      worlds: {
        items,
        overview: aspect => aspect >= 1.2
          ? { box: all, az: -.4, el: .32, azRange: .55, pan: 0, zoom: .74 }
          : { box: new THREE.Box3(V(-12, -2.5, -17), V(12, 7.5, 11)), az: -.4, el: .34, azRange: .35, pan: 13, zoom: .8 },
      },
      studio: { items: terminals, overview: aspect => ({ box: studioBox, az: 0, el: .2, azRange: .9, pan: 0, zoom: .9 }) },
      finale: { items: new Map(), overview: aspect => ({ box: all, az: .5, el: .12, azRange: .2, pan: 0, zoom: aspect >= 1.2 ? .8 : .5 }) },
    },
    // keep the shadow-casting light centred on whatever the camera is looking at
    follow(x, z) { sun.target.position.set(x, 0, z); sun.position.set(x - 22, 24, z + 20); },
    // phones: the studio platform would sit behind the hero buttons, so it is only shown in its own section
    showStudio(v) { islands.studio.visible = v; bridges.forEach(br => { if (br.b === islands.studio || br.a === islands.studio) br.g.visible = v; }); },
    // 0 = dusk, 1 = first light (used for the closing section)
    setMood(v) {
      sun.color.lerpColors(dusk.sun, dawn.sun, v); sun.intensity = 2.5 + v * 1.4;
      hemi.color.lerpColors(dusk.sky, dawn.sky, v); hemi.intensity = 1.25 + v * .55;
    },
    tick(t) {
      st.spark.rotation.y = t * .35;
      for (const g of Object.values(islands)) g.position.y = g.userData.y + Math.sin(t * .45 + g.userData.phase) * .12;
      placeBridges();
      trees.forEach(tr => { tr.rotation.z = Math.sin(t * .7 + tr.userData.sway) * .012; });
      lamps.forEach((l, i) => { l.emissiveIntensity = l.userData.base * (1 + Math.sin(t * 1.1 + i * 1.9) * .08); });
      return true;
    },
  };
}
