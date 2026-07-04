// =============================================================================
// FAQ / "is this for me?" answerer — public widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// A lighter, single-purpose sibling of the booking assistant, meant to sit on a
// single service page. Ask a practical question or a "is this for me?" safety
// question and get a short answer from the business's FAQs + access info. Each
// question is answered on its own (no running chat) — that's what keeps it light.
// Renders into #faqRoot; if that element isn't on the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/faq-answerer";
  var root = document.getElementById("faqRoot");
  if (!root) return;

  var client = root.getAttribute("data-client") || "";
  var businessName = "";
  var busy = false;
  var listEl, formEl, inputEl, sendEl, chipsEl;

  // Starter questions if the live lookup isn't available (offline/demo). The
  // real ones come from the client's own FAQs via the GET endpoint.
  var FALLBACK_QUESTIONS = [
    "What should I expect at my first visit?",
    "Where are you and is there parking?",
    "Do I need to bring anything?",
  ];
  // A safety-minded starter is always offered — it's the "is this for me?" angle.
  var SAFETY_QUESTION = "Is there anyone this isn't suitable for?";

  // --- Small DOM helpers -------------------------------------------------------
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  // Local, demo-only answers so the flow always resolves when the API is offline
  // (rate limited, cold start, no key locally). Keyword-matched against the
  // fictional Willow Lane config so the demo stays truthful to what's shown.
  function fallbackAnswer(q) {
    var s = q.toLowerCase();
    if (/pregnan|expecting|trimester/.test(s))
      return "Massage is offered from the second trimester onwards. In the first 12 weeks, or if you have any pregnancy concerns, it's best to check with your GP or midwife first.";
    if (/injur|hurt|pain|lump|surgery|unwell|fever|infection/.test(s))
      return "If it's a new or undiagnosed injury, lump, or area of pain — or you're feeling unwell — we'd gently suggest checking with your GP before booking. Better to be on the safe side.";
    if (/suitable|for me|anyone|safe/.test(s))
      return "Massage isn't right for everyone — for example if you have a fever or infection, a new or undiagnosed injury, or you're in the first 12 weeks of pregnancy. If in doubt, have a quick word with your GP first.";
    if (/park|access|stairs|wheelchair|get there|where/.test(s))
      return "We're on Willow Lane, just off Norwich city centre, on the ground floor with no stairs. There's free on-street parking after 10am and a pay-and-display car park two minutes away.";
    if (/bring|wear|towel|need to/.test(s))
      return "No need to bring anything — towels and everything else are provided. Just wear something comfortable.";
    if (/expect|first visit|first time|nervous/.test(s))
      return "A short chat about what you'd like to focus on and anything to be aware of, then your treatment. Arrive a couple of minutes early if you can.";
    if (/hour|open|when are you|time/.test(s))
      return "We're open Tuesday to Friday 9am–7pm, and Saturday 9am–2pm. Closed Sunday and Monday.";
    if (/voucher|gift/.test(s))
      return "Yes — gift vouchers are available for any service. Just ask and we'll sort one out.";
    if (/insur|qualif|train/.test(s))
      return "Yes — fully qualified and insured.";
    return "That's a good question — the best thing is to contact " + (businessName || "us") + " directly and we'll be happy to help.";
  }

  // --- Build the shell (intro + ask form + chips + answers list) ---------------
  function build() {
    root.appendChild(el("p", "faq-intro", "Quick answers before you book — ask anything, or tap a question below."));

    formEl = el("form", "faq-form");
    formEl.setAttribute("autocomplete", "off");
    var label = el("label", null, "Your question");
    label.setAttribute("for", "faqInput");
    label.style.position = "absolute";
    label.style.left = "-9999px";
    inputEl = el("input");
    inputEl.id = "faqInput";
    inputEl.type = "text";
    inputEl.setAttribute("placeholder", "e.g. Is there parking nearby?");
    inputEl.setAttribute("maxlength", "300");
    sendEl = el("button", "faq-ask", "Ask");
    sendEl.type = "submit";
    formEl.appendChild(label);
    formEl.appendChild(inputEl);
    formEl.appendChild(sendEl);
    formEl.addEventListener("submit", function (e) {
      e.preventDefault();
      ask(inputEl.value);
    });
    root.appendChild(formEl);

    chipsEl = el("div", "chat-chips");
    chipsEl.setAttribute("aria-label", "Example questions");
    root.appendChild(chipsEl);
    renderChips(FALLBACK_QUESTIONS);

    listEl = el("div", "faq-list");
    listEl.setAttribute("aria-live", "polite");
    root.appendChild(listEl);
  }

  function renderChips(questions) {
    while (chipsEl.firstChild) chipsEl.removeChild(chipsEl.firstChild);
    var qs = questions.slice(0, 4);
    qs.push(SAFETY_QUESTION);
    qs.forEach(function (q) {
      var chip = el("button", "chat-chip", q);
      chip.type = "button";
      chip.addEventListener("click", function () { ask(q); });
      chipsEl.appendChild(chip);
    });
  }

  function setBusy(state) {
    busy = state;
    sendEl.disabled = state;
    inputEl.disabled = state;
  }

  // --- Ask a question ----------------------------------------------------------
  function ask(text) {
    text = (text || "").trim();
    if (!text || busy) return;
    inputEl.value = "";
    setBusy(true);

    var item = el("div", "faq-item");
    item.appendChild(el("p", "faq-q", text));
    var answer = el("p", "faq-a");
    answer.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    answer.setAttribute("aria-label", "Finding an answer");
    item.appendChild(answer);
    listEl.appendChild(item);
    item.scrollIntoView({ block: "nearest" });

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: client, question: text }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        var a = r.ok && r.data && r.data.answer ? r.data.answer : fallbackAnswer(text);
        setAnswer(answer, a);
      })
      .catch(function () { setAnswer(answer, fallbackAnswer(text)); })
      .then(function () { setBusy(false); inputEl.focus(); });
  }

  function setAnswer(node, text) {
    node.innerHTML = "";
    node.removeAttribute("aria-label");
    node.textContent = text;
  }

  // --- Init: build, then pull the client's real starter questions --------------
  build();
  fetch(API_URL + "?c=" + encodeURIComponent(client))
    .then(function (res) { return res.ok ? res.json() : null; })
    .then(function (data) {
      if (!data) return;
      if (data.businessName) businessName = data.businessName;
      if (Array.isArray(data.questions) && data.questions.length) renderChips(data.questions);
    })
    .catch(function () { /* keep the fallback chips */ });
})();
