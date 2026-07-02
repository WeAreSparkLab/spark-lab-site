// =============================================================================
// Review collector — guided-flow widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// Simulates the real flow: a short private check-in is sent to a client after
// their appointment; the widget then lets you simulate their reply. A happy
// reply is routed to a public review link; anything else stays private with
// the practitioner — nothing bad ever risks a public airing. Renders into
// #rcRoot; if that element isn't on the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/review-collector";
  var root = document.getElementById("rcRoot");
  if (!root) return;

  var client = root.getAttribute("data-client") || "";

  // A small pool of fictional recent appointments to simulate "the right
  // moment" trigger — a real system reads this from the booking calendar.
  var APPOINTMENTS = [
    { name: "Sarah", service: "Deep tissue massage", when: "yesterday at 2:00pm" },
    { name: "James", service: "Relaxation massage", when: "this morning at 9:30am" },
    { name: "Priya", service: "Pregnancy massage", when: "Tuesday at 11:00am" },
    { name: "Tom", service: "Back, neck & shoulders", when: "yesterday at 5:15pm" },
  ];

  // Example reviews shown to illustrate "gathered in one place" — clearly
  // demo content for the fictional Willow Lane Massage, not real reviews.
  var EXAMPLE_REVIEWS = [
    { initial: "A.", text: "So relaxing, exactly what I needed." },
    { initial: "J.", text: "Booking was easy and the treatment was excellent." },
    { initial: "P.", text: "Friendly, professional, and I always leave feeling so much better." },
  ];

  var appt = pickAppointment();
  var newReview = null; // set when the demo flow completes with a happy reply

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
  function stars(n) {
    var s = el("span", "rc-stars");
    s.setAttribute("aria-label", n + " out of 5 stars");
    s.textContent = "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
    return s;
  }

  function reviewsWall() {
    var wrap = el("div", "rc-wall");
    wrap.appendChild(el("p", "rc-wall-label", "Example reviews gathered so far"));
    var list = el("div", "rc-wall-list");
    if (newReview) {
      var pending = el("div", "rc-wall-item rc-wall-item--new");
      pending.appendChild(stars(5));
      pending.appendChild(el("p", "rc-wall-text", "Review request sent to " + newReview.name + " — awaiting their public review."));
      list.appendChild(pending);
    }
    EXAMPLE_REVIEWS.forEach(function (r) {
      var item = el("div", "rc-wall-item");
      item.appendChild(stars(5));
      var p = el("p", "rc-wall-text");
      p.textContent = "\u201c" + r.text + "\u201d";
      var who = el("span", "rc-wall-who", " \u2014 " + r.initial);
      p.appendChild(who);
      item.appendChild(p);
      list.appendChild(item);
    });
    wrap.appendChild(list);
    return wrap;
  }

  // --- Step 1: the "right moment" trigger -------------------------------------
  function renderIntro(moveFocus) {
    clear();
    var card = el("div", "rc-appt");
    card.appendChild(el("p", "rc-appt-kicker", "Sent automatically a few hours after an appointment"));
    card.appendChild(el("h3", "rc-appt-name", appt.name));
    card.appendChild(el("p", "rc-appt-detail", appt.service + " \u00b7 " + appt.when));

    var go = el("button", "rc-go", "Send review request \u2192");
    go.type = "button";
    go.addEventListener("click", submit);
    card.appendChild(go);

    root.appendChild(card);
    root.appendChild(reviewsWall());
    if (moveFocus) focusFirst();
  }

  // --- Step 2: draft + send -----------------------------------------------------
  function renderLoading() {
    clear();
    var wrap = el("div", "tm-loading");
    wrap.setAttribute("aria-label", "Drafting the message");
    wrap.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    root.appendChild(wrap);
    root.appendChild(el("p", "tm-hint", "Drafting the check-in message\u2026"));
  }

  function submit() {
    renderLoading();
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: client, name: appt.name, service: appt.service }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data && r.data.message) renderSent(r.data.message);
        else renderError((r.data && r.data.error) || null);
      })
      .catch(function () { renderError(null); });
  }

  // --- Step 3: preview the message + simulate the client's reply --------------
  function renderSent(message) {
    clear();

    var sms = el("div", "rc-sms");
    sms.appendChild(el("p", "rc-sms-label", "\ud83d\udcf1 Private message " + appt.name + " receives"));
    sms.appendChild(el("p", "rc-sms-body", message));
    root.appendChild(sms);

    root.appendChild(el("p", "rc-hint", "You're previewing what happens next \u2014 tap to simulate " + appt.name + "'s reply."));

    var actions = el("div", "rc-reply-actions");
    var happy = el("button", "rc-reply rc-reply--happy", "\ud83d\ude42 Happy to share");
    happy.type = "button";
    happy.addEventListener("click", function () { renderPublic(); });
    var unhappy = el("button", "rc-reply rc-reply--unhappy", "\ud83d\ude15 Not great");
    unhappy.type = "button";
    unhappy.addEventListener("click", function () { renderPrivate(); });
    actions.appendChild(happy);
    actions.appendChild(unhappy);
    root.appendChild(actions);

    root.appendChild(backLink(function () { renderIntro(true); }));
    focusFirst();
  }

  // --- Step 4a: happy path — routed to a public review ------------------------
  function renderPublic() {
    newReview = { name: appt.name };
    clear();
    var card = el("div", "rc-result rc-result--public");
    card.appendChild(el("p", "rc-result-kicker", "Routed to a public review"));
    card.appendChild(el("h3", "rc-result-title", "Sent straight to your Google listing"));
    card.appendChild(el("p", "rc-result-body", appt.name + " taps once and lands on your Google Business Profile, ready to leave a review \u2014 no account or extra steps for them."));
    root.appendChild(card);
    root.appendChild(reviewsWall());
    root.appendChild(restartLink());
    focusFirst();
  }

  // --- Step 4b: unhappy path — kept private ------------------------------------
  function renderPrivate() {
    clear();
    var card = el("div", "rc-result rc-result--private");
    card.appendChild(el("p", "rc-result-kicker", "Kept private"));
    card.appendChild(el("h3", "rc-result-title", "Nothing posted publicly"));
    card.appendChild(el("p", "rc-result-body", "Willow Lane gets a private note instead, so they can follow up with " + appt.name + " directly and put it right \u2014 before it ever becomes a public review."));
    root.appendChild(card);
    root.appendChild(reviewsWall());
    root.appendChild(restartLink());
    focusFirst();
  }

  function renderError(message) {
    clear();
    var card = el("div", "rc-result rc-result--private");
    card.appendChild(el("p", "rc-result-body", message || "I'm having trouble connecting right now. Please try again in a moment."));
    root.appendChild(card);
    var again = el("button", "rc-go", "Try again");
    again.type = "button";
    again.addEventListener("click", submit);
    root.appendChild(again);
    root.appendChild(restartLink());
  }

  function backLink(onClick) {
    var b = el("button", "tm-back", "\u2190 Back");
    b.type = "button";
    b.addEventListener("click", onClick);
    return b;
  }

  function restartLink() {
    var b = el("button", "tm-restart", "Try another appointment");
    b.type = "button";
    b.addEventListener("click", function () {
      appt = pickAppointment();
      newReview = null;
      renderIntro(true);
    });
    return b;
  }

  // Initial render — no focus move (the panel may be hidden on load).
  renderIntro(false);
})();
