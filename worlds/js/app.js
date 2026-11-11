// Page behaviour for SparkLab Worlds. Everything works without WebGL: the 3D
// scene is an enhancement, loaded after first paint and switchable off.
import { initSimulator } from './simulator.js';

const root = document.documentElement, body = document.body;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = matchMedia('(max-width: 820px)');
const smooth = reduceMotion ? 'auto' : 'smooth';

const hero = $('.hero'), heroCopy = $('#heroCopy'), heroFoot = $('#heroFoot'), labelsEl = $('#labels');
const panel = $('#panel'), panelBody = $('#panelBody'), backBtn = $('#backBtn'), rail = $('#rail');
const toggle3d = $('#toggle3d'), nav = $('#nav'), studioStage = $('#studioStage'), finale = $('.finale');
let stage = null, use3d = false, selectedBiz = null;

$('#year').textContent = new Date().getFullYear();

// Links from older pages and bookmarks use the previous homepage's section names.
const OLD_ANCHORS = { '#whatyouget': '#services', '#packages': '#pricing', '#roi': '#simulator' };
if (OLD_ANCHORS[location.hash]) { history.replaceState(null, '', OLD_ANCHORS[location.hash]); requestAnimationFrame(() => $(location.hash)?.scrollIntoView()); }

// Anywhere other than the real domain (Vercel previews, localhost), say plainly that the assistants are live.
if (!/(^|\.)wearesparklab\.com$/.test(location.hostname)) {
  const note = document.createElement('p');
  note.className = 'staging-note'; note.setAttribute('role', 'note');
  note.textContent = 'Staging preview. The assistants are live, and details left in the enquiry chat are really sent to Sara.';
  body.prepend(note);
}

/* ---------- navigation ---------- */
const burger = $('#burger'), navLinks = $('#navLinks');
const setMenu = open => { burger.setAttribute('aria-expanded', String(open)); navLinks.classList.toggle('is-open', open); nav.classList.toggle('menu-open', open); };
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
navLinks.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

/* ---------- the five businesses (the written ledger is the source of truth) ---------- */
const cards = $$('.biz'), ids = cards.map(c => c.dataset.biz);
const cardFor = id => cards.find(c => c.dataset.biz === id);
const labels = new Map();
for (const card of cards) {
  const id = card.dataset.biz, b = document.createElement('button');
  b.type = 'button'; b.className = 'label'; b.innerHTML = `<span>${card.dataset.name}</span>`;
  b.setAttribute('aria-label', `${card.dataset.name}: see how SparkLab could help`);
  b.addEventListener('click', () => selectBiz(id));
  for (const [ev, v] of [['pointerenter', id], ['focus', id], ['pointerleave', null], ['blur', null]]) b.addEventListener(ev, () => hoverBiz(v));
  labelsEl.append(b); labels.set(id, b);
  const show = document.createElement('button');
  show.type = 'button'; show.className = 'biz-show'; show.textContent = 'See it in the model'; show.hidden = true;
  show.addEventListener('click', () => { scrollTo({ top: 0, behavior: smooth }); selectBiz(id); });
  $('.biz-body', card).append(show);
}
function hoverBiz(id) {
  labels.forEach((el, key) => el.classList.toggle('is-hot', key === id));
  $$('button', rail).forEach(b => b.classList.toggle('is-hot', b.dataset.biz === id));
  $('#heroStage').classList.toggle('is-hot', !!id);
  if (stage?.station === 'worlds') stage.hover(id);
}
function selectBiz(id, { focusPanel = true } = {}) {
  if (id && !use3d) {                 // without 3D the chips open the written story instead
    const card = cardFor(id); card.open = true;
    card.scrollIntoView({ behavior: smooth, block: 'center' });
    return;
  }
  selectedBiz = id || null;
  hero.classList.toggle('is-focused', !!selectedBiz);
  if (selectedBiz) heroCopy.style.opacity = '';   // let the focused state hide the headline (inline scroll fade would override it)
  backBtn.hidden = panel.hidden = !selectedBiz;
  $$('button', rail).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.biz === selectedBiz)));
  if (selectedBiz) {
    const card = cardFor(selectedBiz);
    panelBody.innerHTML = `<p class="p-sector">${$('.biz-sector', card).textContent}</p><h3 id="panelTitle">${card.dataset.name}</h3>`;
    const helpHead = document.createElement('h4'); helpHead.className = 'p-head'; helpHead.textContent = 'How SparkLab could help';
    const primer = $('#primer').cloneNode(true); primer.removeAttribute('id'); primer.open = false; primer.classList.add('primer-panel');
    panelBody.append($('blockquote', card).cloneNode(true), $('.picture', card).cloneNode(true), helpHead, $('ul', card).cloneNode(true), primer);
    const cta = document.createElement('div'); cta.className = 'panel-cta';
    cta.innerHTML = '<a class="btn btn-primary btn-small" href="#assistants">Try an AI assistant</a><a class="btn btn-quiet btn-small" href="#contact">Talk to Sara</a>';
    panelBody.append(cta); panelBody.scrollTop = 0;
    $('#panelCount').textContent = `${ids.indexOf(selectedBiz) + 1} of ${ids.length}`;
    panel.style.animation = 'none'; void panel.offsetWidth; panel.style.animation = '';
    if (mobile.matches) $('#heroStage').scrollIntoView({ behavior: smooth, block: 'start' });
    if (focusPanel) $('#panelClose').focus({ preventScroll: true });
  }
  if (stage?.station === 'worlds') stage.focus(selectedBiz);
}
const stepBiz = d => selectBiz(ids[(ids.indexOf(selectedBiz) + d + ids.length) % ids.length], { focusPanel: false });
rail.addEventListener('click', e => { const b = e.target.closest('button'); if (b) selectBiz(b.dataset.biz === selectedBiz ? null : b.dataset.biz); });
rail.addEventListener('pointerover', e => { const b = e.target.closest('button'); if (b) hoverBiz(b.dataset.biz); });
rail.addEventListener('pointerleave', () => hoverBiz(null));
backBtn.addEventListener('click', () => selectBiz(null));
$('#panelClose').addEventListener('click', () => { const id = selectedBiz; selectBiz(null); labels.get(id)?.focus({ preventScroll: true }); });
$('#panelNext').addEventListener('click', () => stepBiz(1));
$('#panelPrev').addEventListener('click', () => stepBiz(-1));
addEventListener('keydown', e => { if (e.key === 'Escape') { if (selectedBiz) selectBiz(null); setMenu(false); } });
panel.addEventListener('click', e => { if (e.target.closest('a[href^="#"]')) selectBiz(null); });

/* ---------- services: switch layers on and off ---------- */
$$('#scenario li').forEach(li => { li.innerHTML = `<span>${li.innerHTML}</span>`; });
function setLayer(name, on) {
  $$(`[data-layer="${name}"]`).forEach(el => el.classList.toggle('is-on', on));
  $(`#scenario [data-needs="${name}"]`).classList.toggle('is-on', on);
  $(`[data-toggle="${name}"]`)?.setAttribute('aria-checked', String(on));
}
$$('.switch').forEach(sw => sw.addEventListener('click', () => setLayer(sw.dataset.toggle, sw.getAttribute('aria-checked') !== 'true')));
$$('.layer').forEach(li => {
  const plate = $(`.plate[data-layer="${li.dataset.layer}"]`);
  li.addEventListener('pointerenter', () => plate.classList.add('is-hot'));
  li.addEventListener('pointerleave', () => plate.classList.remove('is-hot'));
});

/* ---------- assistant studio ---------- */
const challenges = $$('#challenges button'), assts = $$('.asst'), tabs = $('#consoleTabs');
let currentAsst = null;
function showAsst(id, { focus3d = true } = {}) {
  currentAsst = id;
  assts.forEach(a => { a.hidden = a.dataset.asst !== id; });
  $$('button', tabs).forEach(t => t.setAttribute('aria-selected', String(t.dataset.asst === id)));
  if (focus3d && stage?.station === 'studio') stage.focus(id);
}
function pickChallenge(btn, first) {
  challenges.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
  const list = btn.dataset.assts.split(' ');
  tabs.replaceChildren(...(list.length > 1 ? list.map(id => {
    const t = document.createElement('button');
    t.type = 'button'; t.role = 'tab'; t.dataset.asst = id; t.textContent = assts.find(a => a.dataset.asst === id).dataset.name;
    t.addEventListener('click', () => showAsst(id));
    return t;
  }) : []));
  $('#consoleStep').innerHTML = list.length > 1
    ? `<span>2</span>There are ${list.length} assistants for this. Tap one, then try it below`
    : '<span>2</span>Try the assistant below';
  showAsst(first || list[0]);
}
challenges.forEach(b => {
  b.addEventListener('click', () => {
    pickChallenge(b);
    // on phones the assistant panel is below the list, so take the visitor to it
    if (mobile.matches) $('#console').scrollIntoView({ behavior: smooth, block: 'start' });
  });
  b.addEventListener('pointerenter', () => { if (stage?.station === 'studio') stage.hover(b.dataset.assts.split(' ')[0]); });
  b.addEventListener('pointerleave', () => { if (stage?.station === 'studio') stage.hover(null); });
});
pickChallenge(challenges[0]);
// picking a terminal in the 3D studio opens its assistant
function pickTerminal(id) {
  if (!id) return;
  const btn = challenges.find(b => b.getAttribute('aria-pressed') === 'true' && b.dataset.assts.split(' ').includes(id)) || challenges.find(b => b.dataset.assts.split(' ').includes(id));
  if (btn) pickChallenge(btn, id);
}
$('#openLeadChat').addEventListener('click', () => {
  const fab = $('.sl-fab');
  if (fab) { if (fab.getAttribute('aria-expanded') !== 'true') fab.click(); }
  else loadWidgets().then(() => setTimeout(() => $('.sl-fab')?.click(), 400));
});

// The demos are the live site's own widget scripts, loaded unmodified and in the same order.
const WIDGETS = ['assistant.js?v=2', 'treatment-matcher.js?v=2', 'content-generator.js?v=3', 'review-collector.js?v=1', 'no-show-saver.js?v=1',
  'intake-summariser.js?v=1', 'review-responder.js?v=1', 'faq-answerer.js?v=2', 'reply-drafter.js?v=1', 'studio-assistant-widget.js?v=1'];
let widgetsLoading = null;
function loadWidgets() {
  return widgetsLoading ||= Promise.all(WIDGETS.map(src => new Promise(done => {
    const s = document.createElement('script'); s.src = '/studio/' + src; s.async = false; s.onload = s.onerror = done; body.append(s);
  })));
}
new IntersectionObserver((en, io) => { if (en.some(e => e.isIntersecting)) { loadWidgets(); io.disconnect(); } }, { rootMargin: '900px 0px' }).observe($('#assistants'));
if ('requestIdleCallback' in window) requestIdleCallback(() => loadWidgets(), { timeout: 6000 }); else setTimeout(loadWidgets, 4000);

/* ---------- work ---------- */
const dlg = $('#reviewDialog');
$('#reviewOpen').addEventListener('click', () => dlg.showModal?.());
dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });

initSimulator();

/* ---------- the 3D stage ---------- */
// Where the model should sit in the viewport (fractions), per station. Called every frame,
// so the model follows the page as it scrolls.
function safeArea(station, mode) {
  const W = innerWidth, H = innerHeight;
  if (station === 'studio') {
    const r = studioStage.getBoundingClientRect();
    if (!r.width) return { cx: .5, cy: .5, w: .6, h: .6 };
    return { cx: (r.left + r.width / 2) / W, cy: Math.min(1.6, Math.max(-.6, (r.top + r.height * .48) / H)), w: r.width / W * .96, h: r.height / H * .86 };
  }
  if (station === 'finale') {
    const r = finale.getBoundingClientRect();
    // sit the worlds in the open lower part of the section, arriving as it scrolls into view
    return { cx: .5, cy: Math.min(1.8, Math.max(.56, (r.bottom - H * .34) / H)), w: .94, h: .42 };
  }
  if (mobile.matches) {
    if (mode === 'focus') {
      // the strip between the back button and the information panel
      const top = (nav.offsetHeight + 60) / H, pr = panel.getBoundingClientRect();
      const bottom = (pr.height ? pr.top - 10 : H * .5) / H;
      return { cx: .5, cy: (top + bottom) / 2, w: .92, h: Math.max(.12, bottom - top) };
    }
    // overview: the model sits in its own block below the copy and moves with the page
    const r = $('#heroStage').getBoundingClientRect();
    return { cx: .5, cy: (r.top + r.height * .5) / H, w: .98, h: r.height / H * .9 };
  }
  if (mode === 'focus') return { cx: .36, cy: .54, w: .5, h: .6 };
  const top = (heroCopy.offsetTop + heroCopy.offsetHeight) / H + (mobile.matches ? .1 : .04);
  const bottom = mobile.matches ? heroFoot.offsetTop / H - .02 : .9;
  const t = Math.min(top, bottom - .22);
  return { cx: .5, cy: (t + bottom) / 2, w: mobile.matches ? .98 : .86, h: bottom - t };
}
function webglOK() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; } }
function pref(v) { try { if (v === undefined) return localStorage.getItem('sparklab-3d'); localStorage.setItem('sparklab-3d', v); } catch (e) { return null; } }
function set3d(on) {
  use3d = on;
  root.classList.toggle('no-3d', !on);
  toggle3d.textContent = on ? 'View without 3D' : 'View the 3D world';
  toggle3d.setAttribute('aria-pressed', String(!on));
  $$('.biz-show').forEach(b => { b.hidden = !on; });
  if (!on) { selectBiz(null); stage?.setActive(false); }
}
const loader = $('#loader');
async function start3d() {
  set3d(true);
  if (stage) { onScroll(); stage.refresh(); return; }
  try {
    const { createStage } = await import('./stage.js');
    stage = await createStage({
      canvas: $('#scene'), reduceMotion, compact: mobile.matches || matchMedia('(pointer: coarse)').matches, safeArea, labels,
      hosts: { worlds: $('#heroStage'), studio: studioStage },
      onPick: (id, station) => (station === 'studio' ? pickTerminal(id) : selectBiz(id)),
      onHover: (id, station) => { if (station === 'studio') studioStage.classList.toggle('is-hot', !!id); else hoverBiz(id); },
      narrow: () => mobile.matches,
      onProgress: p => { $('#loaderBar').style.width = p * 100 + '%'; },
    });
    requestAnimationFrame(() => { body.classList.add('is-ready'); loader.classList.add('is-done'); });
    onScroll();
  } catch (err) {
    console.error('[SparkLab] 3D stage unavailable', err);
    set3d(false); toggle3d.hidden = true;
  }
}
toggle3d.addEventListener('click', () => { if (use3d) { pref('off'); set3d(false); } else { pref('on'); start3d(); } });
mobile.addEventListener('change', () => stage?.refresh());
if (!webglOK()) { set3d(false); toggle3d.hidden = true; }
else if (pref() === 'off') set3d(false);
else if (document.readyState === 'complete') setTimeout(start3d, 60); else addEventListener('load', () => setTimeout(start3d, 60), { once: true });

/* ---------- scroll: choose the station, theme the nav ---------- */
const windows = $$('.window'), sheets = $$('.sheet'), navTargets = $$('.nav-links a[href^="#"]').map(a => [a, $(a.getAttribute('href'))]);
let ticking = false, lastStation = 'worlds';
function onScroll() {
  ticking = false;
  const H = innerHeight, y = scrollY, navY = nav.offsetHeight / 2;
  const overSheet = sheets.some(s => { const r = s.getBoundingClientRect(); return r.top <= navY && r.bottom >= navY; });
  nav.classList.toggle('on-light', overSheet);
  nav.classList.toggle('on-dark', !overSheet && y > 30);
  hero.classList.toggle('is-scrolled', y > 40);

  // the dark window with the most of itself on screen decides where the camera is
  let best = null, bestArea = 0;
  for (const w of windows) {
    const r = w.getBoundingClientRect(), vis = Math.min(r.bottom, H) - Math.max(r.top, 0);
    if (vis > bestArea) { bestArea = vis; best = w.dataset.station; }
  }
  body.classList.toggle('is-dawn', best === 'finale' && bestArea > H * .3);
  if (stage) {
    stage.setActive(use3d && bestArea > 40);
    if (best && best !== lastStation) {
      lastStation = best; stage.setStation(best);
      if (best === 'worlds' && selectedBiz) stage.focus(selectedBiz);
    }
    stage.setScroll(best === 'worlds' && !reduceMotion && !mobile.matches ? Math.min(1, y / H) : 0);
    stage.poke();
  }
  if (!selectedBiz) heroCopy.style.opacity = mobile.matches ? '' : String(1 - Math.min(1, y / (H * .5)));

  let current = null;
  for (const [a, el] of navTargets) if (el && el.getBoundingClientRect().top < H * .45) current = a;
  navTargets.forEach(([a]) => (a === current ? a.setAttribute('aria-current', 'true') : a.removeAttribute('aria-current')));
}
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
addEventListener('resize', onScroll);
onScroll();

/* ---------- reveal on scroll ---------- */
const revealEls = $$('.section-head, .biz, .stack, .layer, .scenario, .steps li, .challenges, .console, .sim-inputs, .sim-visual, .sim-results, .browser, .case-text > *, .gallery a, .price-start, .price-add, .price-steps, .questions, .letter > *, .finale-copy > *');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver(entries => entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -7% 0px' });
  revealEls.forEach((el, i) => { el.classList.add('reveal'); el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
}
