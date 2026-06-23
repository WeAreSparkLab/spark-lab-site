// =============================================================================
// SparkLab Studio — floating out-of-hours enquiry assistant (vanilla JS)
// -----------------------------------------------------------------------------
// A launcher button (bottom-right) that expands into a chat panel. Talks ONLY to
// the secure function at /api/studio-assistant — the Anthropic key never touches
// the browser. The brief described a React component; this site has no build
// step, so it's implemented as a framework-free widget with the same behaviour:
// the whole conversation is held in a state array and sent on every call (the
// API is stateless), and there are no <form> tags — click / keydown handlers
// only.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/studio-assistant";

  // --- Business hours (keep in sync with api/studio-assistant.js) ------------
  var BUSINESS_TZ = "Europe/London";
  var BUSINESS_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  var BUSINESS_START_HOUR = 9;
  var BUSINESS_END_HOUR = 17;

  function isOutsideHours() {
    try {
      var parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: BUSINESS_TZ,
        weekday: "short",
        hour: "2-digit",
        hour12: false,
      }).formatToParts(new Date());
      var weekday = parts.find(function (p) { return p.type === "weekday"; }).value;
      var hour = parseInt(parts.find(function (p) { return p.type === "hour"; }).value, 10) % 24;
      var open =
        BUSINESS_DAYS.indexOf(weekday) !== -1 &&
        hour >= BUSINESS_START_HOUR &&
        hour < BUSINESS_END_HOUR;
      return !open;
    } catch (e) {
      return false;
    }
  }

  // --- State -----------------------------------------------------------------
  var history = []; // [{role, content}] — the full conversation, sent each call
  var busy = false;
  var started = false; // greeting added once, on first open
  var offline = isOutsideHours();

  // --- Build the DOM ---------------------------------------------------------
  var root = document.createElement("div");
  root.className = "sl-asst";
  root.innerHTML =
    '<button class="sl-fab" type="button" aria-expanded="false" aria-controls="slPanel">' +
      '<span class="sl-fab-dot" aria-hidden="true"></span>' +
      '<span class="sl-fab-label">Questions? Ask our assistant</span>' +
    '</button>' +
    '<div class="sl-panel" id="slPanel" role="dialog" aria-label="SparkLab enquiry assistant" aria-hidden="true">' +
      '<div class="sl-head">' +
        '<div>' +
          '<div class="sl-title">SparkLab Studio</div>' +
          '<div class="sl-sub">Enquiry assistant</div>' +
        '</div>' +
        '<button class="sl-close" type="button" aria-label="Close chat">&times;</button>' +
      '</div>' +
      '<div class="sl-offline" hidden>We’re offline right now — leave your details and we’ll reply next business day.</div>' +
      '<div class="sl-log" id="slLog" aria-live="polite" aria-atomic="false"></div>' +
      '<div class="sl-input-row">' +
        '<input class="sl-input" id="slInput" type="text" autocomplete="off" maxlength="1000" ' +
          'placeholder="Ask about websites, pricing…" aria-label="Your message" />' +
        '<button class="sl-send" id="slSend" type="button">Send</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(root);

  var fab = root.querySelector(".sl-fab");
  var panel = root.querySelector(".sl-panel");
  var closeBtn = root.querySelector(".sl-close");
  var offlineEl = root.querySelector(".sl-offline");
  var log = root.querySelector("#slLog");
  var input = root.querySelector("#slInput");
  var sendBtn = root.querySelector("#slSend");

  if (offline) offlineEl.hidden = false;

  // --- Rendering -------------------------------------------------------------
  function scrollToEnd() { log.scrollTop = log.scrollHeight; }

  function addMessage(text, kind) {
    var el = document.createElement("div");
    el.className = "sl-msg " + kind;
    el.textContent = text;
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "sl-msg bot";
    el.setAttribute("aria-label", "Assistant is typing");
    el.innerHTML = '<span class="sl-typing"><span></span><span></span><span></span></span>';
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
  }

  function greet() {
    if (started) return;
    started = true;
    var msg = offline
      ? "Hi! SparkLab is a small studio and we’re offline right now. Ask me anything about our websites and AI add-ons — or leave your name, email and what you need, and we’ll personally reply within one business day."
      : "Hi! I’m SparkLab’s enquiry assistant. Ask me anything about our one-page websites and AI add-ons for wellness practitioners.";
    addMessage(msg, "bot");
  }

  // --- Send ------------------------------------------------------------------
  function send(text) {
    text = (text || "").trim();
    if (!text || busy) return;

    addMessage(text, "user");
    history.push({ role: "user", content: text });
    input.value = "";
    setBusy(true);
    var typingEl = showTyping();

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (result) {
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        if (result.ok && result.data && result.data.reply) {
          addMessage(result.data.reply, "bot");
          history.push({ role: "assistant", content: result.data.reply });
        } else {
          var msg =
            (result.data && result.data.error) ||
            "I’m having trouble connecting right now. Please try again in a moment.";
          addMessage(msg, "error");
          history.pop();
        }
      })
      .catch(function () {
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        addMessage("I’m having trouble connecting right now. Please try again in a moment.", "error");
        history.pop();
      })
      .finally(function () {
        setBusy(false);
        if (panel.classList.contains("open")) input.focus();
      });
  }

  // --- Open / close ----------------------------------------------------------
  function openPanel() {
    panel.classList.add("open");
    panel.setAttribute("aria-hidden", "false");
    fab.setAttribute("aria-expanded", "true");
    greet();
    setTimeout(function () { input.focus(); }, 50);
  }
  function closePanel() {
    panel.classList.remove("open");
    panel.setAttribute("aria-hidden", "true");
    fab.setAttribute("aria-expanded", "false");
    fab.focus();
  }

  // --- Events (no <form> — click / keydown only) -----------------------------
  fab.addEventListener("click", function () {
    panel.classList.contains("open") ? closePanel() : openPanel();
  });
  closeBtn.addEventListener("click", closePanel);
  sendBtn.addEventListener("click", function () { send(input.value); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") { e.preventDefault(); send(input.value); }
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && panel.classList.contains("open")) closePanel();
  });
})();
