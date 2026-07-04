// =============================================================================
// Review responder — guided-flow widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// The other half of the review collector: paste a review you've received, pick
// its star rating, and get an on-brand public reply you can post as-is. The
// awkward low-star ones are the point — the draft stays calm, apologises, and
// moves the detail to a private conversation. Reuses the rc-*/tm-*/cg-* classes
// so no new styles are needed. Renders into #rrRoot; if that element isn't on
// the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/review-responder";
  var root = document.getElementById("rrRoot");
  if (!root) return;

  var client = root.getAttribute("data-client") || "";

  // Clearly-fictional sample reviews for the Willow Lane demo — one glowing, one
  // lukewarm, and one awkward — so a visitor can see how the draft handles each.
  var EXAMPLES = [
    {
      label: "😍 A glowing one",
      rating: 5,
      reviewer: "Emma",
      text: "Absolutely lovely from start to finish. The deep tissue massage sorted out the knot in my shoulder I've had for weeks, and the studio is so calm. Already booked my next one!",
    },
    {
      label: "😐 A lukewarm one",
      rating: 3,
      reviewer: "Dan",
      text: "Massage itself was good but I couldn't find the parking they mentioned and ended up a bit late and flustered. Nice enough once I got there.",
    },
    {
      label: "😬 An awkward one",
      rating: 2,
      reviewer: "",
      text: "Waited 15 minutes past my appointment time and felt a bit rushed once we started. Expected more for the price to be honest.",
    },
  ];

  var rating = 5;      // current star rating (1–5)
  var reviewText = ""; // preserved across re-renders of the intro

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
  function starString(n) {
    return "★★★★★".slice(0, n) + "☆☆☆☆☆".slice(0, 5 - n);
  }
  function stars(n) {
    var s = el("span", "rc-stars", starString(n));
    s.setAttribute("aria-label", n + " out of 5 stars");
    return s;
  }

  // --- Step 1: paste a review --------------------------------------------------
  function renderIntro(moveFocus) {
    clear();

    root.appendChild(el("p", "rc-hint", "Paste a review you've received and pick its star rating — you'll get a reply you can post as-is."));

    var ta = el("textarea", "tm-textarea");
    ta.setAttribute("rows", "4");
    ta.setAttribute("placeholder", "Paste the review here…");
    ta.setAttribute("aria-label", "The review to reply to");
    ta.value = reviewText;
    ta.addEventListener("input", function () { reviewText = ta.value; });
    root.appendChild(ta);

    // Rating chooser (native select — reuses the content tool's field styles).
    var form = el("div", "cg-form");
    var field = el("label", "cg-field");
    field.setAttribute("for", "rrRating");
    field.appendChild(el("span", null, "Star rating"));
    var select = el("select");
    select.id = "rrRating";
    for (var n = 5; n >= 1; n--) {
      var opt = el("option", null, starString(n) + "  " + n + " star" + (n === 1 ? "" : "s"));
      opt.value = String(n);
      if (n === rating) opt.selected = true;
      select.appendChild(opt);
    }
    select.addEventListener("change", function () { rating = parseInt(select.value, 10) || 5; });
    field.appendChild(select);
    form.appendChild(field);

    var go = el("button", "rc-go", "Draft a reply →");
    go.type = "button";
    go.addEventListener("click", function () {
      reviewText = ta.value.trim();
      if (!reviewText) { ta.focus(); return; }
      submit(reviewText, rating, currentReviewer());
    });
    form.appendChild(go);
    root.appendChild(form);

    // Example chips — load a sample review + rating to try.
    root.appendChild(el("p", "rc-hint", "…or try one of ours:"));
    var chips = el("div", "rc-reply-actions");
    EXAMPLES.forEach(function (ex) {
      var chip = el("button", "rc-reply", ex.label);
      chip.type = "button";
      chip.addEventListener("click", function () {
        reviewText = ex.text;
        rating = ex.rating;
        renderIntro(true);
      });
      chips.appendChild(chip);
    });
    root.appendChild(chips);

    if (moveFocus) focusFirst();
  }

  // A pasted Google review carries its own name (the owner adds it when posting),
  // so the paste box stays to the review text alone — one field keeps the demo
  // clean. The sample chips do carry a name, matched back by their exact text.
  function currentReviewer() {
    var match = EXAMPLES.filter(function (ex) { return ex.text === reviewText; })[0];
    return match ? match.reviewer : "";
  }

  // --- Step 2: draft -----------------------------------------------------------
  function renderLoading() {
    clear();
    var wrap = el("div", "tm-loading");
    wrap.setAttribute("aria-label", "Drafting the reply");
    wrap.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    root.appendChild(wrap);
    root.appendChild(el("p", "tm-hint", "Drafting a reply…"));
  }

  // Local stand-in used whenever the live draft isn't available (rate limited,
  // cold start, offline). Keeps the FLOW intact so the demo always resolves.
  function fallbackReply(r, stars) {
    if (stars <= 3) {
      return (
        "Thank you for taking the time to share this — I'm genuinely sorry your visit didn't " +
        "live up to what we'd want for you. That's not the experience we aim to give anyone. I'd " +
        "really like the chance to put it right, so please get in touch with us directly and we'll " +
        "make it up to you."
      );
    }
    return (
      "Thank you so much for the kind words — it honestly made our day to read this. It means " +
      "a lot that you took the time, and we can't wait to welcome you back soon!"
    );
  }

  function submit(review, stars, reviewer) {
    renderLoading();
    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client: client, review: review, rating: stars, reviewer: reviewer }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        var reply = r.ok && r.data && r.data.reply ? r.data.reply : fallbackReply(review, stars);
        renderReply(review, stars, reply);
      })
      .catch(function () { renderReply(review, stars, fallbackReply(review, stars)); });
  }

  // --- Step 3: the review + the suggested reply --------------------------------
  function renderReply(review, starCount, reply) {
    clear();

    var card = el("div", "rc-appt");
    card.appendChild(el("p", "rc-appt-kicker", "The review you received"));
    card.appendChild(stars(starCount));
    var body = el("p", "rc-appt-detail");
    body.style.marginBottom = "0";
    body.textContent = "“" + review + "”";
    card.appendChild(body);
    root.appendChild(card);

    var sms = el("div", "rc-sms");
    sms.appendChild(el("p", "rc-sms-label", "✍️ Suggested public reply"));
    sms.appendChild(el("p", "rc-sms-body", reply));
    root.appendChild(sms);

    root.appendChild(el("p", "rc-hint", starCount <= 3
      ? "Calm, no excuses, and it moves the detail to a private chat — post it as-is or tweak it first."
      : "Warm and specific, not a copy-paste — post it as-is or tweak it first."));

    root.appendChild(restartLink());
    focusFirst();
  }

  function restartLink() {
    var b = el("button", "tm-restart", "Reply to another review");
    b.type = "button";
    b.addEventListener("click", function () {
      reviewText = "";
      rating = 5;
      renderIntro(true);
    });
    return b;
  }

  // Initial render — no focus move (the panel may be hidden on load).
  renderIntro(false);
})();
