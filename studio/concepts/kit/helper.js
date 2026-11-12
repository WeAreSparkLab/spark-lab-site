// SparkLab concept builds: the chat bubble. Opens and closes the panel; the
// conversation itself is studio/assistant.js (it finds #chatLog inside the panel).
// Any element with data-open-chat opens it too.
(function () {
  "use strict";
  var helper = document.querySelector(".helper");
  if (!helper) return;
  var fab = helper.querySelector(".helper-fab"), panel = helper.querySelector(".helper-panel");
  function setOpen(on) {
    helper.classList.toggle("is-open", on); panel.hidden = !on; fab.setAttribute("aria-expanded", String(on));
    if (on) { var i = panel.querySelector("input"); if (i) i.focus({ preventScroll: true }); } else fab.focus({ preventScroll: true });
  }
  fab.addEventListener("click", function () { setOpen(true); });
  helper.querySelector(".helper-close").addEventListener("click", function () { setOpen(false); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && helper.classList.contains("is-open")) setOpen(false); });
  Array.prototype.forEach.call(document.querySelectorAll("[data-open-chat]"), function (b) {
    b.addEventListener("click", function (e) { e.preventDefault(); setOpen(true); });
  });
})();
