// Geometry kit: every static piece of a model is pushed into a Kit and merged
// into one mesh per material, so a detailed building costs a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';

export function seeded(seed = 1) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

// World-scale UVs chosen by the dominant normal axis, so brick, timber and stone
// tile at a true size across every piece without hand-authored UVs.
function triplanar(g) {
  const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(n.getX(i)), ay = Math.abs(n.getY(i)), az = Math.abs(n.getZ(i));
    if (ay >= ax && ay >= az) uv.setXY(i, p.getX(i), p.getZ(i));
    else if (ax >= az) uv.setXY(i, p.getZ(i), p.getY(i));
    else uv.setXY(i, p.getX(i), p.getY(i));
  }
}

export class Kit {
  constructor() {
    this.parts = new Map();
    this.extras = [];
    this.stack = [new THREE.Matrix4()];
  }
  get top() { return this.stack[this.stack.length - 1]; }
  // Nested local frames: push(x, y, z, rotY) ... pop()
  push(x = 0, y = 0, z = 0, ry = 0) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1));
    this.stack.push(this.top.clone().multiply(m));
    return this;
  }
  pop() { this.stack.pop(); return this; }

  addM(mat, geo, local) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(this.top, local));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    triplanar(g);
    let list = this.parts.get(mat);
    if (!list) this.parts.set(mat, (list = []));
    list.push(g);
    return this;
  }
  add(mat, geo, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    return this.addM(mat, geo, m);
  }
  // Box by footprint centre (x, z) and BOTTOM y. Rotations are about the box centre.
  box(mat, w, h, d, x = 0, y = 0, z = 0, ry = 0, rx = 0, rz = 0) {
    return this.add(mat, new THREE.BoxGeometry(w, h, d), x, y + h / 2, z, rx, ry, rz);
  }
  // Cylinder standing on y (its bottom). If laid over with rx / rz, (x, y, z) is its centre.
  cyl(mat, rTop, rBot, h, x = 0, y = 0, z = 0, seg = 14, rx = 0, rz = 0) {
    return this.add(mat, new THREE.CylinderGeometry(rTop, rBot, h, seg), x, rx || rz ? y : y + h / 2, z, rx, 0, rz);
  }
  sph(mat, r, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, detail = 2) {
    return this.add(mat, new THREE.IcosahedronGeometry(r, detail), x, y, z, 0, 0, 0, sx, sy, sz);
  }
  // Wall spanning x0..x1, y0..y1 with its front face at z and thickness t (towards -z).
  // holes: [{ x (centre), y (bottom), w, h }]
  wall(mat, x0, x1, y0, y1, z, t, holes = []) {
    const xs = [x0, x1], ys = [y0, y1];
    for (const h of holes) { xs.push(h.x - h.w / 2, h.x + h.w / 2); ys.push(h.y, h.y + h.h); }
    const uniq = (a, lo, hi) => [...new Set(a.map(v => +Math.min(hi, Math.max(lo, v)).toFixed(4)))].sort((a, b) => a - b);
    const X = uniq(xs, x0, x1), Y = uniq(ys, y0, y1);
    const inHole = (cx, cy) => holes.some(h => cx > h.x - h.w / 2 && cx < h.x + h.w / 2 && cy > h.y && cy < h.y + h.h);
    for (let j = 0; j < Y.length - 1; j++) {
      let start = null;
      for (let i = 0; i < X.length; i++) {
        const solid = i < X.length - 1 && !inHole((X[i] + X[i + 1]) / 2, (Y[j] + Y[j + 1]) / 2);
        if (solid && start === null) start = X[i];
        if (!solid && start !== null) {
          this.box(mat, X[i] - start, Y[j + 1] - Y[j], t, (X[i] + start) / 2, Y[j], z - t / 2);
          start = null;
        }
      }
    }
    return this;
  }
  // Triangular prism: base centred on x, sitting on y, front face at z, thickness t (towards -z).
  gable(mat, base, height, t, x = 0, y = 0, z = 0, ry = 0) {
    const s = new THREE.Shape([new THREE.Vector2(-base / 2, 0), new THREE.Vector2(base / 2, 0), new THREE.Vector2(0, height)]);
    const g = new THREE.ExtrudeGeometry(s, { depth: t, bevelEnabled: false });
    g.translate(0, 0, -t);
    return this.add(mat, g, x, y, z, 0, ry, 0);
  }
  // A beam from point a to point b (used for bridges, awning arms, rails).
  beam(mat, a, b, w, h) {
    const dir = new THREE.Vector3().subVectors(b, a), len = dir.length();
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3().addVectors(a, b).multiplyScalar(.5),
      new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.normalize()),
      new THREE.Vector3(1, 1, 1));
    return this.addM(mat, new THREE.BoxGeometry(len, h, w), m);
  }
  // A separately-drawn object (signs with their own UVs, animated parts).
  extra(obj) {
    obj.applyMatrix4(this.top);
    this.extras.push(obj);
    return obj;
  }
  build() {
    const group = new THREE.Group();
    for (const [mat, geos] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geos, false), mat);
      mesh.castShadow = !mat.userData.noShadow;
      mesh.receiveShadow = !mat.userData.noReceive;
      group.add(mesh);
      geos.forEach(g => g.dispose());
    }
    this.extras.forEach(o => group.add(o));
    return group;
  }
}

// A flat sign with real typography, drawn to a canvas once.
export function signMesh(text, { w = 3, h = .4, fg = '#F7F3ED', bg = null, font = '500 96px "Newsreader", Georgia, serif', spacing = '0.12em', sub = null, emissive = 0 } = {}) {
  const H = 256, W = Math.round(H * w / h);
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  try { g.letterSpacing = spacing; } catch (e) { /* older browsers */ }
  g.font = font.replace(/(\d+)px/, (_, n) => Math.round(n * (sub ? 1.25 : 1.55)) + 'px');
  g.fillText(text, W / 2, sub ? H * .4 : H * .54);
  if (sub) {
    g.font = '400 44px "Instrument Sans", sans-serif';
    try { g.letterSpacing = '0.3em'; } catch (e) { /* */ }
    g.fillText(sub, W / 2, H * .8);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({ map: t, transparent: !bg, alphaTest: bg ? 0 : .35, roughness: .55, metalness: bg ? 0 : .35 });
  if (emissive) { mat.emissive = new THREE.Color(fg); mat.emissiveMap = t; mat.emissiveIntensity = emissive; }
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  mesh.receiveShadow = !!bg;
  return mesh;
}
