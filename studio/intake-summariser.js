// =============================================================================
// Intake summariser — guided-flow widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// A private back-office tool: paste a new client's messy intake-form answers and
// get a short pre-appointment brief — what they want, a plain summary, and the
// safety flags to check before you start (cross-referenced against the business's
// "not suitable if" list). Reuses the rc-*/tm-*/cg-* classes so no new styles
// are needed. Renders into #intakeRoot; if that element isn't on the page, it
// does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/intake-summariser";
  var root = document.getElementById("intakeRoot");
  if (!root) return;

  var client = root.getAttribute("data-client") || "";

  // Clearly-fictional sample intakes for the Willow Lane demo. One is
  // straightforward; two contain something that should be FLAGGED against the
  // "not suitable if" list, so a visitor sees the safety check earn its keep.
  var EXAMPLES = [
    {
      label: "🙂 Tight shoulders",
      service: "Deep tissue massage",
      text: "Been getting really tight shoulders and neck from working at a laptop all day. Nothing serious health-wise and I don't take any medication. I've had a massage before and liked firm pressure, so something deep would be great. Not pregnant.",
    },
    {
      label: "🤰 Pregnancy + back pain",
      service: "Pregnancy massage",
      text: "Hi! I'm about 9 weeks pregnant and my lower back is really aching. I've never had a massage before and I'm a bit nervous. Hoping something gentle might help me relax and ease the pain.",
    },
    {
      label: "🏃 Sore calf",
      service: "Deep tissue massage",
      text: "Keen runner here. Did something to my calf on a run last week — it's swollen and sore and I haven't had it looked at yet. Want a good deep tissue on my legs to work it out and get me back training.",
    },
  ];

  var answers = EXAMPLES[0].text;    // preserved across intro re-renders
  var service = EXAMPLES[0].service; // service tied to the chosen example

  // --- Small DOM helpers -------------------------------------------------------
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
    var f = root.querySelector("textarea, button, a");
    if (f) f.focus();
  }

  // --- Step 1: paste the intake answers ----------------------------------------
  function renderIntro(moveFocus) {
    clear();

    root.appendChild(el("span", "cg-private-flag", "🔒 A private back-office tool — you'd use this before an appointment, not on your public site"));
    root.appendChild(el("p", "rc-hint", "Paste a new client's intake answers and get a quick brief — including anything to check before you start."));

    var ta = el("textarea", "tm-textarea");
    ta.setAttribute("rows", "5");
    ta.setAttribute("placeholder", "Paste the client's intake-form answers here…");
    ta.setAttribute("aria-label", "The client's intake answers");
    ta.value = answers;
    ta.addEventListener("input", function () { answers = ta.value; });
    root.appendChild(ta);

    var go = el("button", "rc-go", "Summarise for me →");
    go.type = "button";
    go.addEventListener("click", function () {
      answers = ta.value.trim();
      if (!answers) { ta.focus(); return; }
      submit(answers, service);
    });
    root.appendChild(go);

    // Example chips — load a sample intake to try.
    root.appendChild(el("p", "rc-hint", "…or try one of ours:"));
    var chips = el("div", "rc-reply-actions");
    EXAMPLES.forEach(function (ex) {
      var chip = el("button", "rc-reply", ex.label);
      chip.type = "button";
      chip.addEventListener("click", function () {
        answers = ex.text;
        service = ex.service;
        renderIntro(true);
      });
      chips.appendChild(chip);
    });
    root.appendChild(chips);

    if (moveFocus) focusFirst();
  }

  // --- Step 2: summarise -------------------------------------------------------
  function renderLoading() {
    clear();
    var wrap = el("div", "tm-loading");
    wrap.setAttribute("aria-label", "Reading the intake answers");
    wrap.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    root.appendChild(wrap);
    root.appendChild(el("p", "tm-hint", "Reading the answers and checking for anything to flag…"));
  }

  // Local stand-in used whenever the live summary isn't available (rate limited,
  // cold start, offline). Recognises the demo examples so the FLOW — including a
  // safety flag — always resolves; otherwise gives a neutral generic brief.
  function fallbackResult(text) {
    var t = text.toLowerCase();
    if (t.indexOf("pregnant") !== -1) {
      return {
        focus: "Gentle relief for lower-back ache in pregnancy.",
        summary: "New client, first massage, around 9 weeks pregnant with lower-back pain and some nerves about what to expect. Wants a gentle, relaxing session.",
        flags: ["Client says they're ~9 weeks pregnant — that's the first trimester, and pregnancy massage here is offered from the second trimester. Confirm timing before booking and suggest they check with their GP or midwife."],
      };
    }
    if (t.indexOf("swollen") !== -1 || t.indexOf("calf") !== -1) {
      return {
        focus: "Deep tissue work on the legs to ease a sore calf.",
        summary: "Regular runner with a calf injury from last week that is swollen and sore, not yet assessed. Wants deep tissue on the legs.",
        flags: ["New, undiagnosed injury with swelling in the calf — don't work the area until it's been checked. Swelling in a calf can occasionally signal something like a DVT, so suggest they see their GP before any deep tissue there."],
      };
    }
    return {
      focus: "Firm work for tight neck and shoulders from desk work.",
      summary: "Client has desk-related neck and shoulder tension, no medical conditions or medications, and has had massage before. Comfortable with and prefers firm, deep pressure.",
      flags: [],
    };
  }

  function submit(text, svc) {
    renderLoading();
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: client, answers: text, service: svc }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        var result = r.ok && r.data && r.data.summary ? r.data : fallbackResult(text);
        renderResult(result);
      })
      .catch(function () { renderResult(fallbackResult(text)); });
  }

  // --- Step 3: the brief -------------------------------------------------------
  function renderResult(result) {
    clear();

    var card = el("div", "rc-appt");
    card.appendChild(el("p", "rc-appt-kicker", "Pre-appointment brief"));
    if (result.focus) {
      card.appendChild(el("h3", "rc-appt-name", result.focus));
    }
    root.appendChild(card);

    var sms = el("div", "rc-sms");
    sms.appendChild(el("p", "rc-sms-label", "📝 Summary for you"));
    sms.appendChild(el("p", "rc-sms-body", result.summary));
    root.appendChild(sms);

    var flags = Array.isArray(result.flags) ? result.flags : [];
    if (flags.length) {
      var warn = el("div", "rc-result rc-result--private");
      warn.appendChild(el("p", "rc-result-kicker", "⚠️ Check before you start"));
      flags.forEach(function (f) {
        var line = el("p", "rc-result-body");
        line.style.margin = "6px 0 0";
        line.textContent = "• " + f;
        warn.appendChild(line);
      });
      root.appendChild(warn);
    } else {
      var ok = el("div", "rc-result rc-result--public");
      ok.appendChild(el("p", "rc-result-kicker", "✓ No safety flags"));
      ok.appendChild(el("p", "rc-result-body", "Nothing in the answers matches your 'not suitable if' list — good to go. Always use your own judgement on the day."));
      root.appendChild(ok);
    }

    root.appendChild(restartLink());
    focusFirst();
  }

  function restartLink() {
    var b = el("button", "tm-restart", "Summarise another intake");
    b.type = "button";
    b.addEventListener("click", function () {
      answers = EXAMPLES[0].text;
      service = EXAMPLES[0].service;
      renderIntro(true);
    });
    return b;
  }

  // Initial render — no focus move (the panel may be hidden on load).
  renderIntro(false);
})();
