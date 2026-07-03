// =============================================================================
// No-show saver — guided-flow widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// Simulates the real flow: an upcoming appointment can be gently confirmed
// (mode "reminder") so a wobble becomes a freed slot rather than a no-show; a
// recent cancellation can be warmly won back (mode "rebook"). Reuses the
// review-collector's CSS classes (rc-*, tm-*) so no new styles are needed.
// Renders into #nsRoot; if that element isn't on the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/no-show-saver";
  var root = document.getElementById("nsRoot");
  if (!root) return;

  var client = root.getAttribute("data-client") || "";

  // A small pool of fictional appointments to stand in for the booking calendar
  // a real system would read. `when` is a friendly, relative time.
  var APPOINTMENTS = [
    { name: "Sarah", service: "Deep tissue massage", when: "tomorrow at 2:00pm" },
    { name: "James", service: "Relaxation massage", when: "Thursday at 9:30am" },
    { name: "Priya", service: "Pregnancy massage", when: "tomorrow at 11:00am" },
    { name: "Tom", service: "Back, neck & shoulders", when: "Friday at 5:15pm" },
  ];

  var appt = pickAppointment();

  function pickAppointment() {
    return APPOINTMENTS[Math.floor(Math.random() * APPOINTMENTS.length)];
  }

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
    var f = root.querySelector("button, a");
    if (f) f.focus();
  }

  // --- Step 1: pick a scenario -------------------------------------------------
  function renderIntro(moveFocus) {
    clear();
    var card = el("div", "rc-appt");
    card.appendChild(el("p", "rc-appt-kicker", "From your booking calendar"));
    card.appendChild(el("h3", "rc-appt-name", appt.name));
    card.appendChild(el("p", "rc-appt-detail", appt.service + " · " + appt.when));

    var remind = el("button", "rc-go", "Send a friendly reminder →");
    remind.type = "button";
    remind.addEventListener("click", function () { submit("reminder"); });
    card.appendChild(remind);

    var winback = el("button", "rc-reply rc-reply--unhappy", "They cancelled — win them back →");
    winback.type = "button";
    winback.style.marginTop = "8px";
    winback.addEventListener("click", function () { submit("rebook"); });
    card.appendChild(winback);

    root.appendChild(card);
    if (moveFocus) focusFirst();
  }

  // --- Step 2: draft + send ----------------------------------------------------
  function renderLoading() {
    clear();
    var wrap = el("div", "tm-loading");
    wrap.setAttribute("aria-label", "Drafting the message");
    wrap.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    root.appendChild(wrap);
    root.appendChild(el("p", "tm-hint", "Drafting the message…"));
  }

  // Local stand-in used whenever the live draft isn't available (rate limited,
  // cold start, offline). This is a demo of the FLOW, so it always shows what
  // the client would actually receive.
  function fallbackMessage(a, mode) {
    var svc = a.service.toLowerCase();
    if (mode === "rebook") {
      return (
        "Hi " + a.name + "! We missed you for your " + svc + " — no worries at all. " +
        "Whenever you're ready, grab a new time here: [link]"
      );
    }
    return (
      "Hi " + a.name + "! Just a reminder of your " + svc + " " + a.when + ". " +
      "Reply to confirm, or if you can't make it you can reschedule here: [link]"
    );
  }

  function submit(mode) {
    renderLoading();
    var appointment = appt;
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: client,
        name: appointment.name,
        service: appointment.service,
        when: appointment.when,
        mode: mode,
      }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        var message = r.ok && r.data && r.data.message ? r.data.message : fallbackMessage(appointment, mode);
        renderSent(message, mode);
      })
      .catch(function () { renderSent(fallbackMessage(appointment, mode), mode); });
  }

  // --- Step 3: preview the message + simulate the client's reply ---------------
  function renderSent(message, mode) {
    clear();

    var sms = el("div", "rc-sms");
    sms.appendChild(el("p", "rc-sms-label", "📱 Message " + appt.name + " receives"));
    sms.appendChild(el("p", "rc-sms-body", message));
    root.appendChild(sms);

    if (mode === "rebook") {
      // One-tap outcome: the win-back message lands and the slot gets re-sold.
      root.appendChild(el("p", "rc-hint", "One tap on the link and " + appt.name + " is back on the calendar."));
      var rebookAction = el("div", "rc-reply-actions");
      var booked = el("button", "rc-reply rc-reply--happy", "📅 They rebook");
      booked.type = "button";
      booked.addEventListener("click", function () { renderRebooked(); });
      rebookAction.appendChild(booked);
      root.appendChild(rebookAction);
    } else {
      root.appendChild(el("p", "rc-hint", "You're previewing what happens next — tap to simulate " + appt.name + "'s reply."));
      var actions = el("div", "rc-reply-actions");
      var confirm = el("button", "rc-reply rc-reply--happy", "✅ Confirms");
      confirm.type = "button";
      confirm.addEventListener("click", function () { renderConfirmed(); });
      var resched = el("button", "rc-reply rc-reply--unhappy", "📆 Needs to reschedule");
      resched.type = "button";
      resched.addEventListener("click", function () { renderRescheduled(); });
      actions.appendChild(confirm);
      actions.appendChild(resched);
      root.appendChild(actions);
    }

    root.appendChild(backLink(function () { renderIntro(true); }));
    focusFirst();
  }

  // --- Step 4a: confirmed — the slot is protected ------------------------------
  function renderConfirmed() {
    clear();
    var card = el("div", "rc-result rc-result--public");
    card.appendChild(el("p", "rc-result-kicker", "Confirmed"));
    card.appendChild(el("h3", "rc-result-title", "That slot is locked in"));
    card.appendChild(el("p", "rc-result-body", appt.name + " taps once to confirm, so you start the day knowing the appointment is really happening — far fewer quiet no-shows."));
    root.appendChild(card);
    root.appendChild(restartLink());
    focusFirst();
  }

  // --- Step 4b: reschedule — the slot is freed early ---------------------------
  function renderRescheduled() {
    clear();
    var card = el("div", "rc-result rc-result--private");
    card.appendChild(el("p", "rc-result-kicker", "Freed in good time"));
    card.appendChild(el("h3", "rc-result-title", "A wobble, not a wasted hour"));
    card.appendChild(el("p", "rc-result-body", appt.name + " reschedules through the link instead of quietly not showing — so the original slot opens up early and someone else can take it."));
    root.appendChild(card);
    root.appendChild(restartLink());
    focusFirst();
  }

  // --- Step 4c: rebooked — the cancellation is recovered -----------------------
  function renderRebooked() {
    clear();
    var card = el("div", "rc-result rc-result--public");
    card.appendChild(el("p", "rc-result-kicker", "Won back"));
    card.appendChild(el("h3", "rc-result-title", "Back on the calendar"));
    card.appendChild(el("p", "rc-result-body", "A warm nudge at the right moment turns a cancellation into a new booking — " + appt.name + " picks a fresh time and the hour isn't lost."));
    root.appendChild(card);
    root.appendChild(restartLink());
    focusFirst();
  }

  function backLink(onClick) {
    var b = el("button", "tm-back", "← Back");
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function restartLink() {
    var b = el("button", "tm-restart", "Try another appointment");
    b.type = "button";
    b.addEventListener("click", function () {
      appt = pickAppointment();
      renderIntro(true);
    });
    return b;
  }

  // Initial render — no focus move (the panel may be hidden on load).
  renderIntro(false);
})();
