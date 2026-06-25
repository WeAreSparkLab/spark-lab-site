// =============================================================================
// Spark Lab Studio — live booking-assistant demo (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// Talks to the secure Vercel function at /api/assistant. The Anthropic API key
// is NEVER in the browser — this just posts the visible conversation and renders
// the reply. Mirrors the behaviour of the reference widget: example-question
// chips, a typing indicator, and a friendly error state if the request fails.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/assistant";
  var BUSINESS = "Willow Lane Massage";

  var log = document.getElementById("chatLog");
  var form = document.getElementById("chatForm");
  var input = document.getElementById("chatInput");
  var sendBtn = document.getElementById("chatSend");
  var chips = document.getElementById("chatChips");
  if (!log || !form || !input || !sendBtn) return;

  // Which client this widget is for (set via data-client on the .chat element;
  // defaults to the studio demo business server-side if absent).
  var chatEl = log.closest(".chat");
  var client = (chatEl && chatEl.getAttribute("data-client")) || "";

  // Conversation history sent to the API ({role, content} pairs).
  var history = [];
  var busy = false;

  // --- Rendering helpers -----------------------------------------------------
  function scrollToEnd() {
    log.scrollTop = log.scrollHeight;
  }

  function addMessage(text, kind) {
    var el = document.createElement("div");
    el.className = "msg " + kind;
    el.textContent = text;
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function showTyping() {
    var el = document.createElement("div");
    el.className = "msg bot";
    el.setAttribute("aria-label", "Assistant is typing");
    el.innerHTML =
      '<span class="typing"><span></span><span></span><span></span></span>';
    log.appendChild(el);
    scrollToEnd();
    return el;
  }

  function setBusy(state) {
    busy = state;
    sendBtn.disabled = state;
    input.disabled = state;
    if (!state) input.focus();
  }

  // --- Core send -------------------------------------------------------------
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
      body: JSON.stringify({ client: client, messages: history }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);

        if (result.ok && result.data && result.data.reply) {
          addMessage(result.data.reply, "bot");
          history.push({ role: "assistant", content: result.data.reply });
        } else {
          var msg =
            (result.data && result.data.error) ||
            "I'm having trouble connecting right now. Please try again in a moment.";
          addMessage(msg, "error");
          // don't keep the unanswered user turn in history on a hard failure
          history.pop();
        }
      })
      .catch(function () {
        if (typingEl && typingEl.parentNode) typingEl.parentNode.removeChild(typingEl);
        addMessage(
          "I'm having trouble connecting right now. Please try again in a moment.",
          "error"
        );
        history.pop();
      })
      .finally(function () {
        setBusy(false);
      });
  }

  // --- Wire up events --------------------------------------------------------
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    send(input.value);
  });

  if (chips) {
    chips.addEventListener("click", function (e) {
      var btn = e.target.closest(".chat-chip");
      if (!btn) return;
      send(btn.getAttribute("data-q") || btn.textContent);
    });
  }

  // Friendly opening message from the sample business.
  addMessage(
    "Hi! I'm the booking assistant for " +
      BUSINESS +
      ". Ask me about treatments, prices, where we are, or booking in.",
    "bot"
  );
})();
