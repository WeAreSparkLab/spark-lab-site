// Procedural PBR materials. Every texture is painted to a small canvas at load,
// so the scene ships no image files and tiles at real-world scale (metres).
import * as THREE from 'three';
import { seeded } from './kit.js';

const rgb = (c, d = 0) => `rgb(${c.map(v => Math.max(0, Math.min(255, v + d)) | 0).join(',')})`;

function tex(world, draw, { size = 512, color = true } = {}) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1 / world, 1 / world);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
function speckle(g, s, n, r, a = .07) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = r() < .5 ? `rgba(255,255,255,${a * r()})` : `rgba(0,0,0,${a * r()})`;
    const d = 1 + r() * 2.4; g.fillRect(r() * s, r() * s, d, d);
  }
}
function blotch(g, s, n, r, a = .05) {
  for (let i = 0; i < n; i++) {
    const x = r() * s, y = r() * s, rad = 30 + r() * 110, dark = r() < .5;
    for (const [ox, oy] of [[0, 0], [s, 0], [-s, 0], [0, s], [0, -s]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad);
      gr.addColorStop(0, dark ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2);
    }
  }
}

// Courses of blocks in a running bond: bricks, ashlar, pavers and slates all use this.
function coursed(world, { cols, rows, base, vary, joint, jointW, bump = false, edge = 0, seed = 3 }) {
  return tex(world, (g, s) => {
    const r = seeded(seed), bw = s / cols, bh = s / rows;
    g.fillStyle = bump ? '#4d4d4d' : joint; g.fillRect(0, 0, s, s);
    for (let y = 0; y < rows; y++) for (let x = -1; x <= cols; x++) {
      const ox = (y % 2) * bw / 2, d = (r() - .5) * vary * 2 + (r() < .1 ? -vary : 0);
      const X = x * bw + ox + jointW, Y = y * bh + jointW, W = bw - 2 * jointW, H = bh - 2 * jointW;
      g.fillStyle = bump ? rgb([196, 196, 196], d * .5) : rgb(base, d);
      g.fillRect(X, Y, W, H);
      if (edge && !bump) { g.fillStyle = `rgba(0,0,0,${edge})`; g.fillRect(X, Y + H - 3, W, 3); g.fillStyle = `rgba(255,255,255,${edge * .7})`; g.fillRect(X, Y, W, 2); }
    }
    speckle(g, s, 5200, r, bump ? .1 : .09);
    if (!bump) blotch(g, s, 10, r, .04);
  }, { color: !bump });
}
function noise(world, base, { n = 9000, a = .06, blot = 14, seed = 5 } = {}) {
  return tex(world, (g, s) => {
    const r = seeded(seed);
    g.fillStyle = rgb(base); g.fillRect(0, 0, s, s);
    blotch(g, s, blot, r, .035); speckle(g, s, n, r, a);
  });
}
function planks(world, base, { boards = 8, seed = 9, gap = 'rgba(30,20,15,.55)' } = {}) {
  return tex(world, (g, s) => {
    const r = seeded(seed), bw = s / boards;
    for (let b = 0; b < boards; b++) {
      g.fillStyle = rgb(base, (r() - .5) * 26); g.fillRect(b * bw, 0, bw, s);
      for (let i = 0; i < 26; i++) {
        const x = b * bw + r() * bw, wob = (r() - .5) * 5;
        g.strokeStyle = r() < .5 ? `rgba(60,35,20,${.05 + r() * .12})` : `rgba(255,235,205,${.04 + r() * .08})`;
        g.lineWidth = .6 + r() * 1.4; g.beginPath(); g.moveTo(x, 0);
        g.bezierCurveTo(x + wob, s * .33, x - wob, s * .66, x, s); g.stroke();
      }
      g.fillStyle = gap; g.fillRect(b * bw, 0, 2, s);
    }
  });
}

export function makeMaterials(mood = 'day') {
  const dusk = mood === 'dusk', glow = dusk ? 2.4 : 1;
  const std = o => new THREE.MeshStandardMaterial(o);
  const flat = (color, roughness = .8, metalness = 0, extra = {}) => std({ color, roughness, metalness, ...extra });
  const bricks = (base, joint, seed) => {
    const o = { cols: 4, rows: 12, base, vary: 17, joint, jointW: 3, seed };
    return std({ map: coursed(.9, o), bumpMap: coursed(.9, { ...o, bump: true }), bumpScale: 1.4, roughness: .93 });
  };
  const M = {
    brick: bricks([150, 92, 72], '#c9bcab', 3),
    brickBuff: bricks([188, 163, 124], '#d6cbb9', 11),
    plaster: std({ map: noise(2.2, [240, 232, 219], { a: .035 }), roughness: .95 }),
    plasterWarm: std({ map: noise(2.2, [226, 211, 191], { a: .04, seed: 8 }), roughness: .95 }),
    plasterPlum: std({ map: noise(2.2, [70, 58, 86], { a: .05, seed: 12 }), roughness: .9 }),
    site: std({ map: noise(3, [236, 229, 217], { a: .03, seed: 21 }), roughness: 1 }),
    stone: std({ map: coursed(1.8, { cols: 3, rows: 6, base: [216, 205, 186], vary: 7, joint: '#b7ac98', jointW: 1.5, seed: 4 }), roughness: .86 }),
    stoneTrim: flat('#DDD3C2', .82),
    paving: std({ map: coursed(2.4, { cols: 4, rows: 6, base: [196, 188, 176], vary: 9, joint: '#9c948a', jointW: 2, seed: 6 }), roughness: .9 }),
    kerb: flat('#B5ADA1', .85),
    asphalt: std({ map: noise(2, [74, 70, 78], { a: .1, n: 14000, seed: 15 }), roughness: .95 }),
    slate: std({ map: coursed(1.6, { cols: 5, rows: 8, base: [78, 80, 92], vary: 9, joint: '#3c3d47', jointW: 1.5, edge: .25, seed: 7 }), roughness: .7 }),
    oak: std({ map: planks(1.2, [182, 144, 104]), roughness: .7 }),
    oakPale: std({ map: planks(1.5, [214, 186, 150], { boards: 10, seed: 13, gap: 'rgba(60,40,25,.3)' }), roughness: .62 }),
    walnut: std({ map: planks(1.2, [104, 73, 54], { seed: 17 }), roughness: .6 }),
    zinc: flat('#8B8E96', .45, .75),
    metalDark: flat('#2A2630', .42, .7),
    brass: flat('#B8935A', .3, 1),
    steel: flat('#C6C7CB', .26, 1),
    mirror: flat('#EDEEF0', .04, 1),
    marble: std({ map: noise(1.5, [238, 233, 226], { a: .03, blot: 26, seed: 19 }), roughness: .28 }),
    paintPlum: flat('#30283C', .5),
    paintLav: flat('#A078B4', .55),
    paintPurple: flat('#694C91', .52),
    paintIvory: flat('#F3EEE5', .6),
    paintSage: flat('#7E8B77', .6),
    fabricIvory: flat('#E9E1D2', .95),
    fabricPlum: flat('#3B3148', .95),
    fabricLav: flat('#B79BC6', .95),
    leather: flat('#3A2E35', .5),
    ceramic: flat('#F4F0EA', .35),
    terracotta: flat('#B0714F', .85),
    red: flat('#8B2E2B', .45),
    yellow: flat('#CFAE4E', .8),
    soil: flat('#3D332D', 1),
    bark: flat('#5A4A40', .95),
    leafA: std({ map: noise(.5, [110, 126, 92], { a: .22, n: 16000, seed: 31 }), roughness: 1 }),
    leafB: std({ map: noise(.5, [134, 148, 110], { a: .22, n: 16000, seed: 32 }), roughness: 1 }),
    leafC: std({ map: noise(.5, [88, 104, 78], { a: .22, n: 16000, seed: 33 }), roughness: 1 }),
    plinth: (() => { const t = planks(3.2, [186, 150, 110], { boards: 2, seed: 23, gap: 'rgba(0,0,0,0)' }); t.rotation = Math.PI / 2; return std({ map: t, roughness: .55 }); })(),
    // glazing: tinted, reflective, never casts a shadow
    glass: std({ color: '#DCE7E8', roughness: .04, metalness: .55, transparent: true, opacity: dusk ? .14 : .2, depthWrite: false, envMapIntensity: dusk ? 1 : 1.5 }),
    glassWin: std({ color: '#B9C6CC', roughness: .05, metalness: .7, transparent: true, opacity: .42, depthWrite: false, envMapIntensity: 1.5 }),
    water: flat('#8E80B4', .08, 1, { envMapIntensity: 2.6 }),
    // interiors read as lit from within, without real lights
    interior: std({ color: '#EFE3D0', roughness: .95, emissive: '#FFD9A8', emissiveIntensity: .22 * glow }),
    interiorLav: std({ color: '#B9A0C8', roughness: .9, emissive: '#C9A9DA', emissiveIntensity: .18 * glow }),
    ceiling: std({ color: '#F5EEE2', roughness: 1, emissive: '#FFE2B8', emissiveIntensity: .3 * glow }),
    roomLit: std({ color: '#F2D9A6', roughness: 1, emissive: '#FFC97A', emissiveIntensity: .75 * glow }),
    roomDark: flat('#2B2632', 1),
    lamp: std({ color: '#FFF4DE', emissive: '#FFD49A', emissiveIntensity: 2.6 * glow, roughness: .6 }),
    lampSoft: std({ color: '#FFF1DC', emissive: '#FFDDB0', emissiveIntensity: 1.1 * glow, roughness: .9 }),
    strip: std({ color: '#FFE7C4', emissive: '#FFCF94', emissiveIntensity: dusk ? 3 : 1, roughness: .6 }),
    glow, dusk,
  };
  for (const k of ['glass', 'glassWin']) M[k].userData = { noShadow: true, noReceive: true };
  for (const k of ['lamp', 'lampSoft', 'strip', 'roomLit', 'water']) M[k].userData = { noShadow: true };
  // individually pulsing lamps: clone when a building wants its own
  M.ownLamp = () => { const m = M.lamp.clone(); m.userData = { noShadow: true, base: m.emissiveIntensity }; return m; };
  return M;
}

// Soft additive glow used for pavement highlights and light spilling from doorways.
export function glowPlane(w, d, color, opacity = 0, additive = true) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.55, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const mat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color, transparent: true, opacity, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, toneMapped: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
  m.rotation.x = -Math.PI / 2;
  return m;
}
