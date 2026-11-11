// Shared furniture, planting and the five business interiors.
// Interiors are built in a local frame: floor at y = 0, shopfront at z = 0,
// room running back to z = -d, centred on x. Both concepts reuse them.
import * as THREE from 'three';
import { Kit, seeded } from './kit.js';

const PI = Math.PI;

/* ---------- planting ---------- */
// Model-maker's tree: a tapered trunk and a crown of irregular clumps.
export function tree(M, h = 6, seed = 1, spread = 1) {
  const K = new Kit(), r = seeded(seed * 97 + 5);
  const trunkH = h * .5;
  K.cyl(M.bark, .07, .13, trunkH, 0, 0, 0, 8);
  for (let i = 0; i < 4; i++) {
    const a = r() * PI * 2, len = h * .2;
    K.beam(M.bark, new THREE.Vector3(0, trunkH * (.72 + r() * .25), 0), new THREE.Vector3(Math.cos(a) * len * .7, trunkH + len * .6, Math.sin(a) * len * .7), .05, .05);
  }
  const leaves = [M.leafA, M.leafB, M.leafC], cy = h * .7, R = h * .24 * spread;
  const nv = new THREE.Vector3();
  for (let i = 0; i < 54; i++) {
    // many small, smooth clumps spread over the crown's surface read as fine foliage
    const a = r() * PI * 2, cz = r() * 2 - 1, ring = Math.sqrt(1 - cz * cz), rad = R * (.45 + r() * .55);
    const s = R * (.19 + r() * .17);
    const g = new THREE.IcosahedronGeometry(s, 2), p = g.attributes.position, n = g.attributes.normal;
    for (let v = 0; v < p.count; v++) {
      nv.set(p.getX(v), p.getY(v), p.getZ(v)).normalize(); n.setXYZ(v, nv.x, nv.y, nv.z);
      // jitter by position so shared corners move together and the clump stays closed
      const k = Math.sin(nv.x * 9.1 + i) * Math.sin(nv.y * 7.3 + i * 2) * Math.sin(nv.z * 8.7) * .5 + .5;
      p.setXYZ(v, p.getX(v) * (.86 + k * .3), p.getY(v) * (.8 + k * .26), p.getZ(v) * (.86 + k * .3));
    }
    K.add(leaves[i % 3], g, Math.cos(a) * ring * rad, cy + cz * rad * .78, Math.sin(a) * ring * rad, 0, r() * PI, 0);
  }
  const group = K.build();
  group.userData.sway = r() * 10;
  return group;
}

export function grasses(K, M, x, y, z, w, d, seed = 1, h = .55) {
  const r = seeded(seed * 31 + 2), n = Math.max(4, Math.round(w * d * 9));
  for (let i = 0; i < n; i++) {
    const m = [M.leafA, M.leafB, M.leafC][i % 3], hh = h * (.6 + r() * .7);
    K.add(m, new THREE.ConeGeometry(.07 + r() * .06, hh, 5), x + (r() - .5) * w, y + hh / 2, z + (r() - .5) * d, (r() - .5) * .3, r() * PI, (r() - .5) * .3);
  }
}
export function planter(K, M, x, y, z, w, d, h = .5, mat = null, seed = 1) {
  K.box(mat || M.metalDark, w, h, d, x, y, z);
  K.box(M.soil, w - .08, .04, d - .08, x, y + h - .02, z);
  grasses(K, M, x, y + h, z, w - .15, d - .15, seed);
}
export function pottedPlant(K, M, x, y, z, s = 1, seed = 1) {
  const r = seeded(seed * 13 + 1);
  K.cyl(M.terracotta, .17 * s, .12 * s, .3 * s, x, y, z, 12);
  for (let i = 0; i < 6; i++) {
    const a = r() * PI * 2;
    K.sph([M.leafA, M.leafC][i % 2], .16 * s, x + Math.cos(a) * .12 * s, y + (.45 + r() * .55) * s, z + Math.sin(a) * .12 * s, .8, 1.5, .8, 1);
  }
}

/* ---------- furniture ---------- */
export function chair(K, M, x, y, z, ry = 0, seat = M.walnut, frame = M.metalDark) {
  K.push(x, y, z, ry);
  for (const [lx, lz] of [[-.17, -.17], [.17, -.17], [-.17, .17], [.17, .17]]) K.cyl(frame, .012, .012, .45, lx, 0, lz, 6);
  K.cyl(seat, .2, .2, .03, 0, .45, 0, 16);
  K.cyl(frame, .011, .011, .4, -.16, .46, -.18, 6).cyl(frame, .011, .011, .4, .16, .46, -.18, 6);
  K.box(seat, .36, .13, .02, 0, .74, -.18);
  K.pop();
}
export function roundTable(K, M, x, y, z, r = .34, top = M.marble) {
  K.cyl(M.metalDark, .2, .22, .02, x, y, z, 16).cyl(M.metalDark, .022, .022, .7, x, y + .02, z, 8);
  K.cyl(top, r, r, .03, x, y + .72, z, 24);
}
export function bistroSet(K, M, x, y, z, ry = 0, seed = 1) {
  K.push(x, y, z, ry);
  roundTable(K, M, 0, 0, 0);
  chair(K, M, -.55, 0, .05, PI / 2 + .2); chair(K, M, .55, 0, -.05, -PI / 2 + .2);
  K.cyl(M.ceramic, .04, .03, .06, .08, .75, .06, 10).cyl(M.ceramic, .04, .03, .06, -.1, .75, -.05, 10);
  K.pop();
}
export function bench(K, M, x, y, z, ry = 0, w = 1.8) {
  K.push(x, y, z, ry);
  for (const s of [-1, 1]) K.box(M.metalDark, .06, .42, .42, s * (w / 2 - .15), 0, 0);
  for (let i = 0; i < 4; i++) K.box(M.oak, w, .035, .09, 0, .42, -.16 + i * .107);
  for (let i = 0; i < 3; i++) K.box(M.oak, w, .09, .03, 0, .56 + i * .12, -.23, 0, -.12);
  K.pop();
}
// Pendant light hanging from yTop down to y. shade: 'globe' | 'cone' | 'drum' | 'factory'
export function pendant(K, M, x, yTop, z, drop, shade = 'globe', lamp = null) {
  const y = yTop - drop; lamp = lamp || M.lamp;
  K.cyl(M.metalDark, .006, .006, drop, x, y, z, 5);
  if (shade === 'globe') K.sph(lamp, .13, x, y - .1, z);
  if (shade === 'cone') { K.cyl(M.brass, .025, .17, .17, x, y - .17, z, 18); K.sph(lamp, .055, x, y - .15, z, 1, 1, 1, 1); }
  if (shade === 'drum') K.cyl(M.lampSoft, .24, .24, .26, x, y - .26, z, 22);
  if (shade === 'factory') { K.cyl(M.metalDark, .05, .28, .2, x, y - .2, z, 20); K.cyl(lamp, .2, .2, .02, x, y - .215, z, 16); }
}
// Fill a shelf with a believable mix of stock.
export function stock(K, M, x0, x1, y, z, seed = 1, palette = null, depth = .2) {
  const r = seeded(seed * 71 + 3);
  const mats = palette || [M.paintLav, M.paintPurple, M.ceramic, M.terracotta, M.paintSage, M.brass, M.fabricIvory, M.paintPlum];
  let x = x0 + .06;
  while (x < x1 - .12) {
    const m = mats[(r() * mats.length) | 0], kind = r();
    if (kind < .3) { const w = .1 + r() * .08; K.cyl(m, w * .35, w * .5, .14 + r() * .16, x + w / 2, y, z, 10); x += w + .05; }
    else if (kind < .55) { const n = 2 + (r() * 3 | 0), w = .2; for (let i = 0; i < n; i++) K.box(mats[(r() * mats.length) | 0], w - r() * .04, .035, depth * .8, x + w / 2, y + i * .036, z, (r() - .5) * .15); x += w + .06; }
    else if (kind < .8) { const w = .12 + r() * .1; K.box(m, w, w * (.8 + r() * .6), depth * .7, x + w / 2, y, z); x += w + .05; }
    else { K.cyl(m, .05, .05, .2 + r() * .1, x + .05, y, z, 10); K.cyl(M.ceramic, .008, .008, .04, x + .05, y + .25, z, 4); x += .16; }
  }
}
function shelving(K, M, x, z0, z1, side, yStart, rows, seed, mat) {
  // wall shelving along a side wall; side = -1 (left wall) or +1 (right wall)
  K.push(x, 0, (z0 + z1) / 2, side < 0 ? PI / 2 : -PI / 2);
  const len = Math.abs(z1 - z0);
  for (let i = 0; i < rows; i++) {
    const y = yStart + i * .46;
    K.box(mat || M.walnut, len, .035, .26, 0, y, .13);
    stock(K, M, -len / 2, len / 2, y + .035, .13, seed + i);
  }
  K.pop();
}

/* ---------- interiors ---------- */
export const interiors = {
  salon(K, M, w, d, h, lamp) {
    const L = -w / 2, R = w / 2;
    // feature arch on the back wall
    K.box(M.interiorLav, 1.7, 1.75, .04, 0, 0, -d + .04);
    K.add(M.interiorLav, new THREE.CylinderGeometry(.85, .85, .04, 28, 1, false, 0, PI), 0, 1.75, -d + .04, 0, PI / 2, PI / 2);
    // three styling stations along the left wall
    for (let i = 0; i < 3; i++) {
      const z = -1.5 - i * 1.75;
      K.cyl(M.brass, .47, .47, .02, L + .03, 1.18, z, 28, 0, PI / 2);
      K.cyl(M.mirror, .43, .43, .03, L + .04, 1.22, z, 28, 0, PI / 2);
      K.box(M.walnut, .26, .04, .9, L + .14, .82, z);
      K.cyl(M.ceramic, .04, .04, .14, L + .14, .86, z + .3, 8).cyl(M.paintLav, .03, .03, .1, L + .14, .86, z + .18, 8);
      // styling chair
      K.push(L + 1.05, 0, z, PI / 2);
      K.cyl(M.steel, .27, .3, .03, 0, 0, 0, 20).cyl(M.steel, .045, .045, .4, 0, .03, 0, 10);
      K.box(M.leather, .5, .12, .5, 0, .43, 0).box(M.leather, .48, .5, .09, 0, .5, .22, 0, .12);
      K.box(M.steel, .04, .03, .42, -.27, .64, 0).box(M.steel, .04, .03, .42, .27, .64, 0);
      K.pop();
      pendant(K, M, L + .75, h, z, .95, 'globe', lamp);
    }
    // reception desk and waiting bench
    K.box(M.plasterWarm, 1.5, 1.02, .55, R - 1.25, 0, -1.3).box(M.marble, 1.58, .04, .63, R - 1.25, 1.02, -1.3);
    K.cyl(M.brass, .03, .05, .26, R - 1.7, 1.06, -1.3, 8).sph(lamp, .07, R - 1.7, 1.38, -1.3, 1, 1, 1, 1);
    K.cyl(M.ceramic, .05, .07, .2, R - .8, 1.06, -1.35, 10);
    K.box(M.walnut, .5, .4, 2, R - .3, 0, -4.2).box(M.fabricLav, .5, .08, 2, R - .3, .4, -4.2);
    K.box(M.fabricLav, .08, .5, 2, R - .08, .48, -4.2);
    K.box(M.fabricLav, 2.6, .012, 1.7, .3, .001, -3.4);
    pottedPlant(K, M, R - .45, 0, -.55, 1.5, 3); pottedPlant(K, M, R - .4, 0, -6, 1.3, 4);
  },

  wellness(K, M, w, d, h, lamp) {
    const L = -w / 2, R = w / 2;
    // timber reception with a slatted front
    K.box(M.oak, 1.9, 1, .55, R - 1.5, 0, -2.4).box(M.oakPale, 2, .04, .65, R - 1.5, 1, -2.4);
    for (let i = 0; i < 12; i++) K.box(M.walnut, .04, .96, .03, R - 2.38 + i * .16, 0, -2.11);
    K.cyl(M.ceramic, .06, .08, .22, R - 2.1, 1.04, -2.4, 10); K.sph(M.leafC, .14, R - 2.1, 1.42, -2.4, .8, 1.3, .8, 1);
    // linen curtain screening the treatment space
    K.cyl(M.brass, .012, .012, w * .62, L + w * .31, h - .5, -4.3, 6, 0, PI / 2);
    for (let i = 0; i < 9; i++) K.box(M.fabricIvory, .26, h - .62, .05, L + .22 + i * .27, .1, -4.3 + (i % 2) * .05);
    // treatment table behind
    K.box(M.oak, .7, .62, 1.9, L + 1.4, 0, -6).box(M.fabricIvory, .74, .1, 1.94, L + 1.4, .62, -6);
    K.cyl(M.fabricLav, .08, .08, .5, L + 1.4, .72, -6.75, 10, 0, PI / 2);
    // shelves of oils and rolled towels on the left wall
    for (let i = 0; i < 3; i++) {
      const y = 1 + i * .45; K.box(M.oak, .26, .035, 1.8, L + .14, y, -2);
      for (let j = 0; j < 5; j++) K.cyl([M.ceramic, M.brass, M.paintLav][(i + j) % 3], .045, .045, .16, L + .14, y + .035, -2.7 + j * .22, 8);
      for (let j = 0; j < 3; j++) K.cyl(M.fabricIvory, .07, .07, .26, L + .15, y + .035, -1.65 + j * .16, 10, 0, PI / 2);
    }
    // window bench, basket of mats, plants, paper lantern
    K.box(M.oak, 2.2, .42, .5, L + 1.5, 0, -.6).box(M.fabricIvory, 2.1, .09, .46, L + 1.5, .42, -.6);
    K.box(M.fabricLav, .4, .34, .12, L + .8, .55, -.72, .3, -.15); K.box(M.fabricPlum, .4, .34, .12, L + 2.1, .55, -.72, -.2, -.15);
    K.cyl(M.oakPale, .26, .22, .42, R - .6, 0, -.7, 14);
    for (const [m, dx, dz] of [[M.paintLav, -.07, .03], [M.paintSage, .08, .05], [M.paintPurple, 0, -.08]]) K.cyl(m, .07, .07, .85, R - .6 + dx, .1, -.7 + dz, 10);
    pottedPlant(K, M, R - .5, 0, -5.2, 1.7, 7); pottedPlant(K, M, 0, 0, -.5, 1.1, 8);
    K.cyl(M.metalDark, .006, .006, .7, .3, h - .7, -2.2, 5); K.sph(M.lampSoft, .34, .3, h - 1, -2.2, 1, .82, 1);
    pendant(K, M, L + 1.4, h, -6, .8, 'globe', lamp);
    K.box(M.fabricIvory, 2.4, .012, 1.6, 0, .001, -2.3);
  },

  cafe(K, M, w, d, h, lamp) {
    const L = -w / 2, R = w / 2;
    // counter along the right-hand side with a marble top
    K.box(M.walnut, .7, 1, 3.6, R - .75, 0, -3.4).box(M.marble, .8, .04, 3.7, R - .75, 1, -3.4);
    K.box(M.steel, .5, .4, .66, R - .75, 1.04, -2.3).box(M.metalDark, .52, .06, .68, R - .75, 1.44, -2.3);
    for (const dz of [-.18, .18]) K.cyl(M.metalDark, .03, .03, .1, R - 1.02, 1.16, -2.3 + dz, 8);
    for (let i = 0; i < 5; i++) K.cyl(M.ceramic, .04, .033, .06, R - .9 + (i % 3) * .1, 1.5 + (i > 2 ? .06 : 0), -2.5 + (i % 2) * .12, 8);
    // pastry case
    K.box(M.glass, .52, .32, 1, R - .75, 1.04, -4.1);
    for (let i = 0; i < 6; i++) K.cyl([M.terracotta, M.oakPale, M.fabricLav][i % 3], .07, .07, .05, R - .86 + (i % 2) * .22, 1.06, -4.45 + (i / 2 | 0) * .34, 10);
    K.cyl(M.brass, .03, .05, .3, R - .75, 1.04, -4.95, 8);
    // back-bar shelves
    shelving(K, M, R - .16, -1.9, -5, 1, 1.7, 2, 21, M.walnut);
    // banquette along the left wall with two tables
    K.box(M.walnut, .5, .44, 4, L + .4, 0, -3.3).box(M.fabricPlum, .5, .08, 4, L + .4, .44, -3.3).box(M.fabricPlum, .09, .55, 4, L + .2, .52, -3.3);
    for (const z of [-2.1, -4.3]) { roundTable(K, M, L + 1.05, 0, z); chair(K, M, L + 1.65, 0, z, -PI / 2); K.cyl(M.ceramic, .04, .03, .06, L + 1, .75, z + .1, 10); }
    // menu board
    K.box(M.metalDark, 1.8, 1.1, .03, -.2, 1.5, -d + .04);
    for (let i = 0; i < 6; i++) K.box(M.paintIvory, .5 + ((i * 7) % 5) * .14, .028, .005, -.75 + ((i * 7) % 5) * .07, 2.4 - i * .14, -d + .06);
    for (let i = 0; i < 3; i++) pendant(K, M, R - .85, h, -2.2 - i * 1.25, .8, 'cone', lamp);
    pendant(K, M, L + 1.05, h, -3.2, .7, 'globe', lamp);
    pottedPlant(K, M, L + .5, 0, -.55, 1.2, 12);
  },

  shop(K, M, w, d, h, lamp) {
    const L = -w / 2, R = w / 2;
    shelving(K, M, L + .08, -1.4, -6.4, -1, .5, 5, 31, M.oak);
    shelving(K, M, R - .08, -1.4, -6.4, 1, .5, 5, 47, M.oak);
    // central display table
    K.box(M.oak, 2.1, .06, 1.1, 0, .82, -3.4);
    for (const [x, z] of [[-.95, -3.85], [.95, -3.85], [-.95, -2.95], [.95, -2.95]]) K.box(M.oak, .07, .82, .07, x, 0, z);
    stock(K, M, -.95, .95, .88, -3.2, 5, null, .3); stock(K, M, -.8, .8, .88, -3.65, 6, null, .3);
    K.cyl(M.ceramic, .09, .13, .42, 0, .88, -3.4, 14);
    for (let i = 0; i < 7; i++) K.cyl(M.oakPale, .006, .006, .9, 0 + Math.sin(i * 1.7) * .12, 1.25, -3.4 + Math.cos(i * 2.3) * .1, 4, Math.cos(i * 2.3) * .16, Math.sin(i * 1.7) * .2);
    // window display plinths
    for (const [x, hh, s] of [[-1.9, .5, 1], [-1.2, .85, 2], [1.4, .65, 3], [2.05, .35, 4]]) {
      K.box(M.plaster, .52, hh, .52, x, 0, -.62);
      if (s % 2) { K.cyl([M.paintLav, M.paintPurple][s % 3 % 2], .07, .12, .36, x, hh, -.62, 14); }
      else { K.cyl(M.brass, .02, .07, .3, x, hh, -.62, 10); K.cyl(M.lampSoft, .1, .16, .2, x, hh + .28, -.62, 16); }
    }
    // till at the back
    K.box(M.plasterPlum, 1.7, 1, .6, 0, 0, -d + 1.1).box(M.oak, 1.8, .04, .68, 0, 1, -d + 1.1);
    K.cyl(M.brass, .02, .06, .3, .55, 1.04, -d + 1.1, 8); K.cyl(M.lampSoft, .09, .13, .16, .55, 1.3, -d + 1.1, 14);
    K.box(M.fabricLav, 2.8, .012, 1.9, 0, .001, -3.4);
    pendant(K, M, -1, h, -3.4, .75, 'drum', lamp); pendant(K, M, 1, h, -3.4, .75, 'drum', lamp);
    pendant(K, M, 0, h, -6, .7, 'drum', lamp);
  },

  workshop(K, M, w, d, h, lamp) {
    const L = -w / 2, R = w / 2;
    // workbench with vice along the left wall
    K.box(M.oak, .8, .09, 3, L + .55, .86, -3.6);
    for (const z of [-2.3, -4.9]) { K.box(M.oak, .09, .86, .09, L + .25, 0, z); K.box(M.oak, .09, .86, .09, L + .85, 0, z); }
    K.box(M.oak, .7, .04, 2.8, L + .55, .25, -3.6);
    K.box(M.steel, .2, .14, .16, L + .9, .95, -2.5).box(M.metalDark, .06, .2, .22, L + 1.02, .92, -2.5);
    K.box(M.oakPale, .08, .07, .3, L + .5, .95, -3.3, .4).cyl(M.steel, .012, .012, .34, L + .6, .96, -4.2, 6, PI / 2);
    // tool wall
    K.box(M.walnut, .04, 1.1, 2.6, L + .05, 1.25, -3.6);
    for (let i = 0; i < 6; i++) K.box([M.steel, M.oak][i % 2], .02, .26 + (i % 3) * .1, .04, L + .08, 1.5 + (i % 2) * .2, -4.7 + i * .18);
    K.box(M.steel, .02, .14, .6, L + .08, 1.9, -3.1, 0, .25).box(M.oak, .025, .13, .14, L + .08, 1.82, -2.78);
    K.box(M.steel, .02, .4, .03, L + .08, 1.45, -2.5).box(M.steel, .02, .03, .26, L + .08, 1.45, -2.62);
    // timber rack on the right wall
    for (let i = 0; i < 3; i++) {
      for (const z of [-2.2, -4.2, -6.2]) K.box(M.metalDark, .5, .05, .05, R - .3, .7 + i * .62, z);
      for (let j = 0; j < 4; j++) K.box([M.oak, M.oakPale, M.walnut][(i + j) % 3], .2, .045 + (j % 2) * .02, 4.6 - j * .3, R - .42 + (j % 2) * .16, .75 + i * .62 + (j / 2 | 0) * .07, -4.2 + j * .08);
    }
    // a door in progress on trestles
    for (const z of [-2.6, -4.4]) {
      K.box(M.oakPale, 1.1, .06, .08, .5, .78, z);
      for (const s of [-1, 1]) { K.box(M.oakPale, .05, .8, .05, .5 + s * .45, 0, z - .16, 0, -.2); K.box(M.oakPale, .05, .8, .05, .5 + s * .45, 0, z + .16, 0, .2); }
    }
    K.box(M.oak, .92, .05, 2.2, .5, .84, -3.5);
    K.box(M.walnut, .7, .012, .7, .5, .89, -3.0).box(M.walnut, .7, .012, .7, .5, .89, -4.0);
    K.box(M.steel, .05, .18, .05, .9, .86, -2.6).box(M.steel, .05, .18, .05, .1, .86, -4.5);
    // sheet material leaning on the back wall, tins, stool
    K.box(M.oakPale, 2.4, 1.25, .02, -.6, 0, -d + .28, 0, -.14).box(M.oak, 2, 1.25, .02, -.2, 0, -d + .36, 0, -.16);
    for (let i = 0; i < 5; i++) { K.cyl(M.steel, .085, .085, .19, R - .9 - i * .2, 0, -d + .5, 12); K.cyl([M.paintPurple, M.paintLav, M.paintIvory, M.paintSage, M.paintPlum][i], .088, .088, .015, R - .9 - i * .2, .19, -d + .5, 12); }
    K.cyl(M.oak, .16, .16, .04, L + 1.5, .6, -5.2, 14); for (let i = 0; i < 3; i++) K.cyl(M.metalDark, .012, .012, .6, L + 1.5 + Math.cos(i * 2.1) * .12, 0, -5.2 + Math.sin(i * 2.1) * .12, 5);
    pendant(K, M, .5, h, -3.5, 1.1, 'factory', lamp); pendant(K, M, L + .6, h, -3.6, 1.2, 'factory', lamp);
    pendant(K, M, .2, h, -6.6, 1.1, 'factory', lamp);
  },
};

/* ---------- glazing ---------- */
export function glazing(K, M, x0, x1, y0, y1, z, frame, panes = 1, t = .05) {
  const w = x1 - x0, cx = (x0 + x1) / 2;
  K.box(M.glass, w, y1 - y0, .016, cx, y0, z);
  K.box(frame, w, t, .09, cx, y0, z).box(frame, w, t, .09, cx, y1 - t, z);
  for (let i = 0; i <= panes; i++) K.box(frame, t, y1 - y0, .09, x0 + w * i / panes, y0, z);
}
export function glassDoor(K, M, x0, x1, h, z, frame, open = 0) {
  const w = x1 - x0;
  K.push(x0, 0, z, open);
  K.box(M.glass, w, h, .016, w / 2, 0, 0);
  K.box(frame, w, .09, .05, w / 2, 0, 0).box(frame, w, .05, .05, w / 2, h - .05, 0);
  K.box(frame, .05, h, .05, .025, 0, 0).box(frame, .05, h, .05, w - .025, 0, 0);
  for (const s of [-1, 1]) K.cyl(M.brass, .014, .014, 1, w - .14, .75, s * .05, 8);
  K.pop();
}