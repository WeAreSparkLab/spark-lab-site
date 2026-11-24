// Enquiry journey: pick what would help, then a short form posted to /api/enquiry.
// Success is shown ONLY when the server confirms delivery ({ ok: true }).
// Any element with data-enquire="website|assistant|automation|unsure" jumps here
// with that option already chosen (data-enquire-from says where it came from,
// data-enquire-msg optionally starts the message).

const SERVICES = {
  website: { label: 'A website', chat: 'A website', hint: 'For example: customers struggle to find me online, or can\'t book without messaging me first.' },
  assistant: { label: 'An AI assistant', chat: 'An AI assistant', hint: 'For example: I get lots of questions about prices and availability while I\'m with clients.' },
  automation: { label: 'Automating repetitive tasks', chat: 'Automating repetitive tasks', hint: 'For example: I spend evenings sending reminders, chasing reviews or following up.' },
  unsure: { label: 'Not sure yet', chat: 'Finding out what would help most', hint: 'For example: what your business does, and where the day tends to get away from you.' },
};
const WHATSAPP = 'https://wa.me/447585613652';
const EMAIL = 'sara@wearesparklab.com';
const TIMEOUT_MS = 20000;

const newRef = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);

export function initEnquiry({ loadWidgets, smooth = 'smooth' } = {}) {
  const form = document.getElementById('enqForm');
  if (!form) return;
  const $ = id => document.getElementById(id);
  const pick = $('enqPick'), details = $('enqDetails'), done = $('enqDone'), wrap = $('enquire');
  const submit = $('enqSubmit'), errBox = $('enqErr'), pickErr = $('enqPickErr');
  const msg = $('enqMsg'), email = $('enqEmail'), phone = $('enqPhone');
  let from = '', reference = newRef(), busy = false;

  const chosen = () => form.querySelector('input[name="service"]:checked')?.value || '';
  const pref = () => form.querySelector('input[name="contact_preference"]:checked')?.value || 'email';

  function showDetails(focus = true) {
    const svc = SERVICES[chosen()];
    if (!svc) return;
    $('enqChosen').textContent = svc.label;
    $('enqMsgHint').textContent = svc.hint;
    pickErr.hidden = true;
    pick.classList.add('is-collapsed');
    details.hidden = false;
    if (focus) $('enqName').focus({ preventScroll: true });
  }

  function select(service, { context = '', message = '' } = {}) {
    const radio = form.querySelector(`input[name="service"][value="${service}"]`);
    if (!radio) return;
    radio.checked = true;
    from = context;
    if (message && !msg.value.trim()) msg.value = message;
    if (!done.hidden) return wrap.scrollIntoView({ behavior: smooth, block: 'start' });
    showDetails(false);
    wrap.scrollIntoView({ behavior: smooth, block: 'start' });
    setTimeout(() => $('enqName').focus({ preventScroll: true }), 450);
  }

  $('enqNext').addEventListener('click', () => {
    if (chosen()) return showDetails();
    pickErr.textContent = 'Choose the option that sounds most like you, or "I\'m not sure yet".';
    pickErr.hidden = false;
    form.querySelector('input[name="service"]').focus();
  });
  form.addEventListener('change', e => {
    if (e.target.name === 'service') { pickErr.hidden = true; if (!details.hidden) showDetails(false); }
    if (e.target.name === 'contact_preference') syncPref();
  });
  // Enter on an option = continue (radios don't submit on Enter while the details are hidden)
  pick.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.name === 'service') { e.preventDefault(); $('enqNext').click(); } });
  $('enqChange').addEventListener('click', () => {
    details.hidden = true; pick.classList.remove('is-collapsed');
    (form.querySelector('input[name="service"]:checked') || form.querySelector('input[name="service"]')).focus();
  });

  function syncPref() {
    const p = pref(), needPhone = p !== 'email';
    email.required = !needPhone; phone.required = needPhone;
    $('enqEmailWrap').querySelector('label').innerHTML = needPhone ? 'Email <span class="enq-opt-tag">optional</span>' : 'Email';
    $('enqPhoneWrap').querySelector('label').innerHTML = needPhone ? 'WhatsApp number' : 'WhatsApp number <span class="enq-opt-tag">optional</span>';
  }
  syncPref();

  // CTAs elsewhere on the page that lead here with an option chosen
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-enquire]');
    if (!a) return;
    e.preventDefault();
    select(a.dataset.enquire, { context: a.dataset.enquireFrom || '', message: a.dataset.enquireMsg || '' });
  });

  // Chat instead: open the enquiry assistant already knowing the choice
  $('enqChat').addEventListener('click', async () => {
    const service = chosen(), svc = SERVICES[service];
    if (!window.SparkLabEnquiry && loadWidgets) { await loadWidgets(); await new Promise(r => setTimeout(r, 50)); }
    if (window.SparkLabEnquiry) window.SparkLabEnquiry.open(svc ? { service, label: svc.chat } : {});
    else showError(`The chat isn't available right now. You can still send this form, or email ${EMAIL}.`);
  });

  // ---- validation ----
  const FIELDS = { name: 'enqName', business_name: 'enqBiz', message: 'enqMsg', email: 'enqEmail', phone: 'enqPhone', website: 'enqSite', consent: 'enqConsent' };
  function clearErrors() {
    errBox.hidden = true;
    form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
    form.querySelectorAll('.enq-field-err').forEach(el => el.remove());
  }
  function markField(name, text) {
    const el = $(FIELDS[name]);
    if (!el) return null;
    el.setAttribute('aria-invalid', 'true');
    const note = document.createElement('small');
    note.className = 'enq-field-err'; note.id = `${el.id}Err`; note.textContent = text;
    (el.type === 'checkbox' ? el.closest('label') : el).after(note);
    el.setAttribute('aria-describedby', [el.getAttribute('aria-describedby'), note.id].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' '));
    return el;
  }
  function clientErrors(data) {
    const err = {};
    if (!data.name) err.name = 'Tell me your name.';
    if (!data.business_name) err.business_name = 'Tell me the name of your business.';
    if (data.message.length < 10) err.message = 'Tell me a little about what you need (a sentence is plenty).';
    if (data.contact_preference === 'email' && !data.email) err.email = 'Add your email so I can reply.';
    else if (data.email && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(data.email)) err.email = 'That email address doesn\'t look quite right.';
    if (data.contact_preference !== 'email' && !data.phone) err.phone = 'Add your WhatsApp number so I can reply.';
    else if (data.phone && !/^[+()\d\s-]{7,24}$/.test(data.phone)) err.phone = 'That phone number doesn\'t look quite right.';
    if (!data.consent) err.consent = 'Please tick the box so I can reply to you.';
    return err;
  }
  function showFieldErrors(err) {
    const first = Object.entries(err).map(([k, v]) => markField(k, v)).find(Boolean);
    showError('Please check the highlighted fields.');
    first?.focus();
  }
  function showError(text, withFallback = false) {
    errBox.replaceChildren(document.createTextNode(text));
    if (withFallback) {
      const p = document.createElement('span');
      p.className = 'enq-fallback';
      p.innerHTML = ` <a href="${WHATSAPP}" target="_blank" rel="noopener noreferrer">WhatsApp Sara</a> or <a href="mailto:${EMAIL}?subject=SparkLab%20enquiry">email ${EMAIL}</a>. What you typed is still here.`;
      errBox.append(p);
    }
    errBox.hidden = false;
  }

  // ---- submit ----
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (busy) return;                          // no double submits
    if (details.hidden) return $('enqNext').click();
    clearErrors();
    const fd = new FormData(form);
    const data = {
      service: chosen(),
      name: (fd.get('name') || '').trim(),
      business_name: (fd.get('business_name') || '').trim(),
      message: (fd.get('message') || '').trim(),
      contact_preference: pref(),
      email: (fd.get('email') || '').trim(),
      phone: (fd.get('phone') || '').trim(),
      website: (fd.get('website') || '').trim(),
      consent: $('enqConsent').checked,
      company: fd.get('company') || '',
      context: from,
      reference,
    };
    if (!SERVICES[data.service]) { $('enqChange').click(); pickErr.textContent = 'Choose what you\'d like help with.'; pickErr.hidden = false; return; }
    const err = clientErrors(data);
    if (Object.keys(err).length) return showFieldErrors(err);

    busy = true;
    submit.disabled = true; submit.setAttribute('aria-busy', 'true'); submit.textContent = 'Sending…';
    let res = null, body = null;
    try {
      const ctrl = new AbortController(), t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      res = await fetch('/api/enquiry', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal: ctrl.signal });
      clearTimeout(t);
      body = await res.json().catch(() => null);
    } catch { res = null; }
    busy = false;
    submit.disabled = false; submit.removeAttribute('aria-busy'); submit.textContent = 'Send my enquiry';

    if (res && res.ok && body && body.ok === true) {
      $('enqDoneVia').textContent = { email: 'email', whatsapp: 'WhatsApp' }[data.contact_preference];
      form.hidden = true; done.hidden = false; done.focus();
      reference = newRef();
      window.va?.('event', { name: 'enquiry_sent', service: data.service });
      return;
    }
    if (res && res.status === 422 && body?.fields) return showFieldErrors(body.fields);
    showError(body?.error || 'Sorry, your enquiry didn\'t send. Please check your connection and try again, or contact Sara directly:', !body?.error || res?.status >= 500);
  });
}

// Adds a "talk to Sara about this" CTA to each live assistant demo.
export function addAssistantCtas() {
  document.querySelectorAll('.asst').forEach(a => {
    if (a.querySelector('[data-enquire]')) return;   // already has its own CTA (concepts)
    const leads = a.dataset.asst === 'leads';
    const p = document.createElement('p');
    p.className = 'asst-enquire';
    const link = document.createElement('a');
    link.className = 'text-link'; link.href = '#enquire';
    link.dataset.enquire = 'assistant';
    link.dataset.enquireFrom = `Assistant demo: ${a.dataset.name}`;
    link.dataset.enquireMsg = `I'm interested in the ${a.dataset.name.toLowerCase()} for my business.`;
    link.textContent = leads ? 'Get help with my enquiries →' : 'Ask about this assistant for my business →';
    p.append(leads ? '' : 'You can ask about this without getting a new website. ', link);
    a.append(p);
  });
}
