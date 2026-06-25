// =============================================================================
// Social content generator — shared widget (vanilla JS, no framework)
// -----------------------------------------------------------------------------
// Drives both surfaces from one file:
//   - the public taster in the /studio showcase (fixed 3 posts, no count/vibe)
//   - the private tool page /studio/tools/content (count 3–8 + vibe)
// It adapts to whichever controls exist inside #cgRoot. Posts to the secure
// /api/content-generator function; the Anthropic key never touches the browser.
// Does nothing if #cgRoot isn't on the page.
// =============================================================================

(function () {
  "use strict";

  var API_URL = "/api/content-generator";
  var root = document.getElementById("cgRoot");
  if (!root) return;

  var topicEl = root.querySelector("#cgTopic");
  var platformEl = root.querySelector("#cgPlatform");
  var countEl = root.querySelector("#cgCount"); // optional (full tool only)
  var vibeEl = root.querySelector("#cgVibe"); // optional (full tool only)
  var goEl = root.querySelector("#cgGo");
  var statusEl = root.querySelector("#cgStatus");
  var resultsEl = root.querySelector("#cgResults");
  if (!goEl || !resultsEl) return;

  var fixedCount = parseInt(root.getAttribute("data-count"), 10) || 3;
  var mode = root.getAttribute("data-mode") === "full" ? "full" : "taster";
  // The private full-tool link carries an access key (?k=...). The public
  // taster has none and doesn't need one.
  var token = "";
  try { token = new URLSearchParams(window.location.search).get("k") || ""; } catch (e) {}
  var busy = false;

  function setStatus(text, isError) {
    statusEl.textContent = text || "";
    statusEl.className = "cg-status" + (isError ? " is-error" : "");
  }
  function setBusy(state) {
    busy = state;
    goEl.disabled = state;
  }

  function generate() {
    if (busy) return;
    var payload = {
      mode: mode,
      token: token,
      topic: topicEl ? topicEl.value : "",
      platform: platformEl ? platformEl.value : "Instagram",
      count: countEl ? parseInt(countEl.value, 10) : fixedCount,
      vibe: vibeEl ? vibeEl.value : "",
    };

    setBusy(true);
    resultsEl.innerHTML = "";
    setStatus("Writing your posts…");

    fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) { return { ok: res.ok, data: data }; });
      })
      .then(function (r) {
        if (r.ok && r.data && Array.isArray(r.data.posts) && r.data.posts.length) {
          setStatus("");
          renderPosts(r.data.posts);
        } else {
          setStatus((r.data && r.data.error) || "Something went wrong — please try again.", true);
        }
      })
      .catch(function () {
        setStatus("I'm having trouble connecting right now. Please try again in a moment.", true);
      })
      .finally(function () { setBusy(false); });
  }

  function el(tag, className, text) {
    var n = document.createElement(tag);
    if (className) n.className = className;
    if (text != null) n.textContent = text;
    return n;
  }

  function copyButton(label, getText) {
    var b = el("button", "cg-copy", label);
    b.type = "button";
    b.addEventListener("click", function () {
      var text = getText();
      var done = function () {
        var original = label;
        b.textContent = "Copied ✓";
        b.classList.add("is-copied");
        setTimeout(function () { b.textContent = original; b.classList.remove("is-copied"); }, 1400);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else {
        fallbackCopy(text);
        done();
      }
    });
    return b;
  }

  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
  }

  function renderPosts(posts) {
    var frag = document.createDocumentFragment();
    posts.forEach(function (p, i) {
      var hashtags = (p.hashtags || []).join(" ");
      var card = el("article", "cg-card glass");

      card.appendChild(el("div", "cg-card-num", "Post " + (i + 1)));
      card.appendChild(el("p", "cg-caption", p.caption));
      if (hashtags) card.appendChild(el("p", "cg-hashtags", hashtags));
      if (p.photo_idea) {
        var photo = el("p", "cg-photo");
        photo.appendChild(el("strong", null, "📷 Photo idea: "));
        photo.appendChild(document.createTextNode(p.photo_idea));
        card.appendChild(photo);
      }

      var actions = el("div", "cg-actions");
      actions.appendChild(copyButton("Copy caption", function () { return p.caption; }));
      if (hashtags) actions.appendChild(copyButton("Copy hashtags", function () { return hashtags; }));
      card.appendChild(actions);

      frag.appendChild(card);
    });
    resultsEl.appendChild(frag);
  }

  goEl.addEventListener("click", generate);
})();
