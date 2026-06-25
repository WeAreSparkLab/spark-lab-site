// =============================================================================
// "Find your treatment" matcher — guided-flow widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// A compact 2–3 question flow (NOT open chat). It posts the answers to the
// secure function at /api/treatment-matcher and renders a single recommendation
// card. The Anthropic key never touches the browser. Renders into #tmRoot; if
// that element isn't on the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/treatment-matcher";
  var root = document.getElementById("tmRoot");
  if (!root) return;

  // Which client this widget is for (data-client on #tmRoot; defaults server-side).
  var client = root.getAttribute("data-client") || "";

  var QUESTIONS = [
    {
      key: "bothering",
      q: "What's bothering you?",
      options: [
        { label: "Tension or pain" },
        { label: "Stress" },
        { label: "Pregnancy-related" },
        { label: "Not sure" },
      ],
    },
    {
      key: "firstTime",
      q: "Is this your first visit?",
      options: [
        { label: "Yes", value: "yes" },
        { label: "No", value: "no" },
      ],
    },
  ];

  var state = { step: 0, answers: { bothering: "", firstTime: "", notes: "" } };

  // --- Small DOM helpers -----------------------------------------------------
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear() {
    while (root.firstChild) root.removeChild(root.firstChild);
  }
  function focusFirst() {
    var f = root.querySelector("button, textarea, a");
    if (f) f.focus();
  }

  function progress(n) {
    var p = el("p", "tm-progress", "Step " + (n + 1) + " of 3");
    return p;
  }

  // --- Question steps --------------------------------------------------------
  function renderQuestion(moveFocus) {
    clear();
    var i = state.step;
    var def = QUESTIONS[i];

    root.appendChild(progress(i));
    root.appendChild(el("h3", "tm-q", def.q));

    var opts = el("div", "tm-opts");
    def.options.forEach(function (o) {
      var b = el("button", "tm-opt", o.label);
      b.type = "button";
      b.addEventListener("click", function () {
        state.answers[def.key] = o.value || o.label;
        state.step += 1;
        if (state.step < QUESTIONS.length) renderQuestion(true);
        else renderNotes(true);
      });
      opts.appendChild(b);
    });
    root.appendChild(opts);

    if (i > 0) root.appendChild(backLink(function () { state.step -= 1; renderQuestion(true); }));
    if (moveFocus) focusFirst();
  }

  // --- Optional free-text step ----------------------------------------------
  function renderNotes(moveFocus) {
    clear();
    root.appendChild(progress(2));
    root.appendChild(el("h3", "tm-q", "Anything else we should know?"));
    root.appendChild(el("p", "tm-hint", "Optional — e.g. an injury, a recent operation, or how far along a pregnancy is."));

    var ta = el("textarea", "tm-textarea");
    ta.setAttribute("maxlength", "500");
    ta.setAttribute("rows", "3");
    ta.setAttribute("aria-label", "Anything else we should know? (optional)");
    ta.value = state.answers.notes;
    root.appendChild(ta);

    var go = el("button", "tm-go", "See my match");
    go.type = "button";
    go.addEventListener("click", function () {
      state.answers.notes = ta.value.trim();
      submit();
    });
    root.appendChild(go);
    root.appendChild(backLink(function () { state.step = QUESTIONS.length - 1; renderQuestion(true); }));
    if (moveFocus) ta.focus();
  }

  function backLink(onClick) {
    var b = el("button", "tm-back", "← Back");
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  // --- Submit + result -------------------------------------------------------
  function renderLoading() {
    clear();
    var wrap = el("div", "tm-loading");
    wrap.setAttribute("aria-label", "Finding your match");
    wrap.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    var t = el("p", "tm-hint", "Finding the best match…");
    root.appendChild(wrap);
    root.appendChild(t);
  }

  function submit() {
    renderLoading();
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: client,
        bothering: state.answers.bothering,
        firstTime: state.answers.firstTime,
        notes: state.answers.notes,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data && (r.data.recommended || r.data.reason)) renderResult(r.data);
        else renderError((r.data && r.data.error) || null);
      })
      .catch(function () { renderError(null); });
  }

  function renderResult(data) {
    clear();
    var card = el("div", "tm-result" + (data.recommended ? "" : " is-caution"));

    if (data.recommended) {
      card.appendChild(el("p", "tm-result-kicker", "We'd suggest"));
      card.appendChild(el("h3", "tm-result-name", data.treatment));
      card.appendChild(el("p", "tm-result-reason", data.reason));
      if (data.caution) {
        var c = el("p", "tm-caution");
        c.appendChild(el("strong", null, "Good to know: "));
        c.appendChild(document.createTextNode(data.caution));
        card.appendChild(c);
      }
      if (data.booking_link) {
        var book = el("a", "tm-book", "Book this →");
        book.href = data.booking_link;
        book.target = "_blank";
        book.rel = "noopener noreferrer";
        card.appendChild(book);
      }
    } else {
      card.appendChild(el("h3", "tm-result-name", "Best to check first"));
      card.appendChild(el("p", "tm-result-reason", data.reason || "Based on what you've told us, it's worth a quick word with a professional before booking."));
      card.appendChild(el("p", "tm-caution", "This isn't medical advice — if in doubt, please check with your GP or speak to the practitioner."));
    }

    root.appendChild(card);
    root.appendChild(restartLink());
    focusFirst();
  }

  function renderError(message) {
    clear();
    var card = el("div", "tm-result is-caution");
    card.appendChild(el("p", "tm-result-reason", message || "I'm having trouble connecting right now. Please try again in a moment."));
    root.appendChild(card);
    var again = el("button", "tm-go", "Try again");
    again.type = "button";
    again.addEventListener("click", submit);
    root.appendChild(again);
    root.appendChild(restartLink());
  }

  function restartLink() {
    var b = el("button", "tm-restart", "Start again");
    b.type = "button";
    b.addEventListener("click", function () {
      state = { step: 0, answers: { bothering: "", firstTime: "", notes: "" } };
      renderQuestion(true);
    });
    return b;
  }

  // Initial render — no focus move (the panel may be hidden on load).
  renderQuestion(false);
})();
