// Business-impact simulator. Pure arithmetic on the visitor's own assumptions:
// nothing here is measured data, and every output is labelled as an estimate.
const WEEKS_PER_MONTH = 4.33;   // same constant the live site's calculator uses
const WEEKS_PER_YEAR = 52;
const MAX_LANTERNS = 64;

export function calculate({ enquiries, missPct, convertPct, value, recoverPct }) {
  const missed = enquiries * missPct / 100;
  const lost = missed * convertPct / 100;                       // potential customers lost
  const lostValue = lost * value;                               // turnover, not profit
  const recovered = missed * recoverPct / 100 * convertPct / 100; // not every recovered enquiry becomes a customer
  return { missed, lost, lostValue, recovered, recoveredValue: recovered * value };
}

const gbp = n => '£' + Math.round(n).toLocaleString('en-GB');
const count = n => (n < 10 ? (Math.round(n * 10) / 10).toLocaleString('en-GB') : Math.round(n).toLocaleString('en-GB'));
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function initSimulator() {
  const $ = id => document.getElementById(id);
  const form = $('simForm');
  if (!form) return;
  const pairs = [['sEnq', 'enquiries'], ['sMiss', 'missPct'], ['sConv', 'convertPct'], ['sVal', 'value'], ['sRec', 'recoverPct']]
    .map(([id, key]) => ({ key, range: $(id), num: $(id + 'N') }));
  const state = {};
  let period = 'month';
  const scale = { week: 1, month: WEEKS_PER_MONTH, year: WEEKS_PER_YEAR };

  // the lantern field
  const field = $('lanterns'), deck = document.createElement('div');
  deck.className = 'deck';
  const lanterns = Array.from({ length: MAX_LANTERNS }, () => { const l = document.createElement('span'); l.className = 'lantern off'; deck.append(l); return l; });
  field.append(deck);

  function render() {
    const r = calculate(state), k = scale[period];
    $('rMissed').textContent = count(r.missed * k);
    $('rLost').textContent = count(r.lost * k);
    $('rValue').textContent = gbp(r.lostValue * k);
    $('rRec').textContent = gbp(r.recoveredValue * k);
    $('barRec').style.width = (r.lostValue ? clamp(r.recoveredValue / r.lostValue * 100, 0, 100) : 0) + '%';
    $('barLost').style.width = r.lostValue ? '100%' : '0%';

    const rows = [['Missed enquiries', r.missed, count], ['Potential customers lost', r.lost, count],
      ['Value of missed opportunities (turnover)', r.lostValue, gbp], ['Value that might be recovered (turnover)', r.recoveredValue, gbp]];
    $('simTable').innerHTML = rows.map(([label, v, f]) => `<tr><th scope="row">${label}</th><td>${f(v)}</td><td>${f(v * WEEKS_PER_MONTH)}</td><td>${f(v * WEEKS_PER_YEAR)}</td></tr>`).join('');

    // lanterns: one per enquiry in a week, grouped when there are more than fit
    const unit = Math.ceil(state.enquiries / MAX_LANTERNS), total = Math.max(1, Math.round(state.enquiries / unit));
    const nMiss = clamp(Math.round(r.missed / unit), 0, total), nLost = clamp(Math.round(r.lost / unit), 0, nMiss), nRec = clamp(Math.round(r.recovered / unit), 0, nLost);
    deck.style.setProperty('--cols', Math.ceil(Math.sqrt(total)));
    const nOk = total - nMiss;
    lanterns.forEach((l, i) => {
      l.className = 'lantern ' + (i >= total ? 'off' : i < nOk ? 'ok' : i < nOk + nRec ? 'rec' : i < nOk + nLost ? 'lost' : '');
      l.style.transitionDelay = (i % 9) * 18 + 'ms';
    });
    $('simScale').textContent = `Each lantern is ${unit === 1 ? 'one enquiry' : unit + ' enquiries'} in a typical week, rounded to whole lanterns.`;
  }

  function set(p, raw, from) {
    const lo = +p.num.min, hi = +p.num.max;
    let v = parseFloat(raw);
    if (!isFinite(v)) return;                       // leave a half-typed number alone
    v = clamp(v, lo, hi);
    state[p.key] = v;
    if (from !== 'range') p.range.value = clamp(v, +p.range.min, +p.range.max);
    if (from !== 'num') p.num.value = v;
    const rmin = +p.range.min, rmax = +p.range.max;
    p.range.style.setProperty('--p', (clamp(v, rmin, rmax) - rmin) / (rmax - rmin) * 100 + '%');
    render();
  }
  for (const p of pairs) {
    state[p.key] = +p.range.value;
    p.range.addEventListener('input', () => set(p, p.range.value, 'range'));
    p.num.addEventListener('input', () => set(p, p.num.value, 'num'));
    p.num.addEventListener('blur', () => { p.num.value = state[p.key]; });
  }
  form.addEventListener('reset', e => { e.preventDefault(); pairs.forEach(p => set(p, p.range.dataset.default)); });
  form.addEventListener('submit', e => e.preventDefault());
  document.querySelectorAll('.period button').forEach(b => b.addEventListener('click', () => {
    period = b.dataset.period;
    document.querySelectorAll('.period button').forEach(o => o.setAttribute('aria-pressed', String(o === b)));
    render();
  }));
  pairs.forEach(p => set(p, p.range.value));
}
