// =============================================================================
// Reply drafter — public widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// The odd one out among these demos: every other panel runs on the fictional
// Willow Lane config, but this one has no config at all. The visitor describes
// their OWN business in the box, and the reply comes back for that business.
// That's deliberate — seeing it work for your business is a better argument
// than watching it work for someone else's.
//
// Draft honesty is the selling point: the model only uses facts the visitor
// actually typed. Anything missing comes back as a [placeholder] plus a "fill
// this in" line, so it never quietly invents a price. Renders into #replyRoot;
// if that element isn't on the page, it does nothing.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/reply-drafter";
  var root = document.getElementById("replyRoot");
  if (!root) return;

  var busy = false;
  var nameEl, descEl, toneEl, channelEl, enquiryEl, goEl, errEl, outEl, replyEl, gapsEl;

  // Fictional businesses spanning deliberately different trades — the point is
  // that one endpoint copes with all of them. Each withholds something the
  // enquiry asks for (usually price), so the gap-flagging is visible rather
  // than theoretical.
  var PRESETS = [
    {
      label: "Massage therapist",
      name: "Willow Lane Massage",
      tone: "Warm, calm, never pushy",
      desc: "Independent massage therapist in Norwich. Relaxation massage, deep tissue, and pregnancy massage from the second trimester. Open Tuesday to Friday 9am–7pm and Saturday 9am–2pm. Ground floor, no stairs. I don't treat anyone with a fever, a new undiagnosed injury, or in the first 12 weeks of pregnancy.",
      enquiry: "Hi, I've had a stiff neck and shoulders for weeks from sitting at a desk. Do you do anything for that, how much is it, and have you got anything Saturday?"
    },
    {
      label: "Plumber",
      name: "Dave Macklin Plumbing & Heating",
      tone: "Friendly, straight-talking, no jargon",
      desc: "Gas Safe registered plumber covering Norwich and about 15 miles around it. Boiler servicing and repairs, leaks, radiators, bathroom installs. One-man band, been doing it 18 years. I don't do weekends and I don't take on new-build work.",
      enquiry: "Hi, my boiler is making a banging noise and the radiators are cold at the top. Are you able to come out this week, and roughly what would it cost?"
    },
    {
      label: "Dog groomer",
      name: "Scruff & Tumble",
      tone: "Warm, chatty, dog-obsessed",
      desc: "Home-based dog grooming in a converted garage. Full groom, bath and tidy, nail clipping. I take one dog at a time so it's calm — no cages, no other dogs barking. Great with nervous and older dogs. I can't take dogs who've bitten a groomer before.",
      enquiry: "Hello, I've got a 9 year old cocker spaniel who gets really stressed at the usual place. He's quite matted at the moment. Could you take him and what do you charge for a full groom?"
    },
    {
      label: "Bookkeeper",
      name: "Marsh & Co Bookkeeping",
      tone: "Calm, plain English, reassuring",
      desc: "Bookkeeping for sole traders and small limited companies. Monthly bookkeeping, VAT returns, Self Assessment. Xero and QuickBooks. I'm not an accountant — I don't file company accounts or give tax advice, I work alongside your accountant.",
      enquiry: "Hi there. I've just gone self-employed and honestly I'm drowning in receipts. I've got no idea what I'm doing with VAT. Can you help, and what would it cost me monthly?"
    }
  ];

  // --- Small DOM helpers -------------------------------------------------------
  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function field(labelText, control, id) {
    var wrap = el("div", "rd-field");
    var label = el("label", null, labelText);
    label.setAttribute("for", id);
    control.id = id;
    wrap.appendChild(label);
    wrap.appendChild(control);
    return wrap;
  }

  // --- Build the shell ---------------------------------------------------------
  function build() {
    root.appendChild(el("p", "rd-intro",
      "Every other demo here runs on a made-up business. This one runs on yours — describe it below, paste a message a customer actually sent you, and see what comes back."));

    var chips = el("div", "rd-presets");
    chips.setAttribute("aria-label", "Example businesses");
    PRESETS.forEach(function (p) {
      var chip = el("button", "rd-preset", p.label);
      chip.type = "button";
      chip.addEventListener("click", function () { applyPreset(p); });
      chips.appendChild(chip);
    });
    root.appendChild(chips);
    root.appendChild(el("p", "rd-hint", "Or try one of these made-up businesses to see it work outside wellness."));

    nameEl = document.createElement("input");
    nameEl.type = "text";
    nameEl.maxLength = 100;
    nameEl.placeholder = "e.g. Willow Lane Massage";
    root.appendChild(field("Business name", nameEl, "rdName"));

    descEl = document.createElement("textarea");
    descEl.maxLength = 1500;
    descEl.rows = 5;
    descEl.placeholder = "What you offer, who it's for, anything you don't do, and the details people always ask about — including your prices.";
    root.appendChild(field("What you do, in your own words", descEl, "rdDesc"));

    var row = el("div", "rd-row");
    toneEl = document.createElement("input");
    toneEl.type = "text";
    toneEl.maxLength = 200;
    toneEl.placeholder = "e.g. Warm and calm";
    row.appendChild(field("Tone (optional)", toneEl, "rdTone"));

    channelEl = document.createElement("select");
    ["email", "WhatsApp", "Instagram DM", "text message"].forEach(function (c) {
      var o = document.createElement("option");
      o.value = c;
      o.textContent = c.charAt(0).toUpperCase() + c.slice(1);
      channelEl.appendChild(o);
    });
    row.appendChild(field("Replying by", channelEl, "rdChannel"));
    root.appendChild(row);

    enquiryEl = document.createElement("textarea");
    enquiryEl.maxLength = 1500;
    enquiryEl.rows = 4;
    enquiryEl.placeholder = "Hi, do you…";
    root.appendChild(field("The message they sent you", enquiryEl, "rdEnquiry"));

    goEl = el("button", "rd-go", "Draft my reply");
    goEl.type = "button";
    goEl.addEventListener("click", draft);
    root.appendChild(goEl);

    errEl = el("p", "rd-err");
    errEl.hidden = true;
    errEl.setAttribute("role", "alert");
    root.appendChild(errEl);

    outEl = el("div", "rd-out");
    outEl.hidden = true;
    outEl.setAttribute("aria-live", "polite");
    outEl.appendChild(el("p", "rd-out-label", "Your draft"));
    replyEl = el("div", "rd-reply");
    outEl.appendChild(replyEl);
    gapsEl = el("div");
    outEl.appendChild(gapsEl);
    root.appendChild(outEl);
  }

  function applyPreset(p) {
    nameEl.value = p.name;
    descEl.value = p.desc;
    toneEl.value = p.tone;
    enquiryEl.value = p.enquiry;
    errEl.hidden = true;
    enquiryEl.focus();
  }

  function showError(msg) {
    errEl.textContent = msg;
    errEl.hidden = false;
  }

  function setBusy(state) {
    busy = state;
    goEl.disabled = state;
    goEl.textContent = state ? "Drafting…" : "Draft my reply";
  }

  function renderGaps(gaps) {
    gapsEl.innerHTML = "";
    if (!gaps.length) {
      gapsEl.appendChild(el("p", "rd-ready", "Nothing missing — this one's ready to send as it is."));
      return;
    }
    gapsEl.appendChild(el("p", "rd-gaps-label", "Fill these in before you send"));
    var ul = el("ul", "rd-gaps");
    gaps.forEach(function (g) { ul.appendChild(el("li", null, g)); });
    gapsEl.appendChild(ul);
  }

  // --- Draft -------------------------------------------------------------------
  function draft() {
    if (busy) return;
    var desc = descEl.value.trim();
    var enquiry = enquiryEl.value.trim();
    errEl.hidden = true;

    if (!desc) return showError("Describe your business first — that's what the reply is built from.");
    if (!enquiry) return showError("Paste the message your customer sent you.");

    setBusy(true);

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        business: { name: nameEl.value.trim(), description: desc, tone: toneEl.value.trim() },
        enquiry: enquiry,
        channel: channelEl.value
      })
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (!r.ok || !r.data || !r.data.reply) {
          showError((r.data && r.data.error) || "Something went wrong — please try again.");
          return;
        }
        replyEl.textContent = r.data.reply;
        renderGaps(Array.isArray(r.data.gaps) ? r.data.gaps : []);
        outEl.hidden = false;
        outEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
      })
      .catch(function () {
        showError("Couldn't reach the drafter — check your connection and try again.");
      })
      .then(function () { setBusy(false); });
  }

  build();
})();
