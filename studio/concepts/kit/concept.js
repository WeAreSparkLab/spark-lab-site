// SparkLab concept builds: small page behaviours shared by every concept.
//  - "Open now" badge and today's row in the hours, from <body data-hours>
//    (a JSON object: day number 0=Sunday → [[openHour, closeHour], …], e.g. 17.5 = 5:30pm)
//  - filter tabs over a set of cards (data-tabs on the tab row, data-cat on each card)
//  - the cost guide (form.estimate)
//  - fade-in on scroll
(function () {
  "use strict";
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // --- open now --------------------------------------------------------------
  var hours = {};
  try { hours = JSON.parse(document.body.getAttribute("data-hours") || "{}"); } catch (e) { hours = {}; }
  var now = new Date(), day = now.getDay(), h = now.getHours() + now.getMinutes() / 60;
  function fmt(x) { var hh = Math.floor(x), mm = Math.round((x - hh) * 60), ap = hh >= 12 ? "pm" : "am", h12 = hh % 12 || 12; return h12 + (mm ? ":" + (mm < 10 ? "0" : "") + mm : "") + ap; }
  var today = hours[day] || [], open = today.filter(function (r) { return h >= r[0] && h < r[1]; })[0];
  $$(".open-badge").forEach(function (b) {
    if (open) { b.classList.add("is-open"); b.textContent = "Open now · until " + fmt(open[1]); return; }
    var later = today.filter(function (r) { return h < r[0]; })[0];
    if (later) { b.textContent = "Closed now · opens " + fmt(later[0]) + " today"; return; }
    for (var i = 1; i <= 7; i++) {
      var d = (day + i) % 7, r = hours[d];
      if (r && r.length) { b.textContent = "Closed now · opens " + (i === 1 ? "tomorrow" : ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][d]) + " " + fmt(r[0][0]); return; }
    }
    b.textContent = "Closed now";
  });
  $$(".hours li[data-day]").forEach(function (li) { if (li.getAttribute("data-day").split(" ").indexOf(String(day)) !== -1) li.classList.add("is-today"); });

  // --- filter tabs -----------------------------------------------------------
  $$("[data-tabs]").forEach(function (row) {
    var cards = $$(row.getAttribute("data-tabs") + " [data-cat]");
    row.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      $$("button", row).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      var cat = b.getAttribute("data-show");
      cards.forEach(function (c) { c.hidden = cat !== "all" && c.getAttribute("data-cat").split(" ").indexOf(cat) === -1; });
    });
  });

  // --- cost guide (workshop) -------------------------------------------------
  $$("form.estimate").forEach(function (f) {
    var out = f.querySelector("output"), qty = f.querySelector("[name=qty]"), qtyOut = f.querySelector(".qty-out");
    function calc() {
      var opt = f.querySelector("[name=job]").selectedOptions[0];
      var each = +opt.getAttribute("data-from"), unit = opt.getAttribute("data-unit") || "", per = opt.hasAttribute("data-per");
      var n = per ? +qty.value : 1;
      qty.closest(".qty").hidden = !per;
      if (qtyOut) qtyOut.textContent = qty.value + " " + unit + (+qty.value === 1 ? "" : "s");
      out.textContent = each ? "from £" + (each * n).toLocaleString("en-GB") : "quoted per job";
    }
    f.addEventListener("input", calc); f.addEventListener("submit", function (e) { e.preventDefault(); }); calc();
  });

  // --- fade in ---------------------------------------------------------------
  var els = $$(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("is-in"); io.unobserve(e.target); } }); }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (e) { io.observe(e); });
  } else els.forEach(function (e) { e.classList.add("is-in"); });

  // ?shot hides the banner, for taking the portfolio thumbnails
  if (/[?&]shot\b/.test(location.search)) $$(".concept-note").forEach(function (n) { n.remove(); });

  $$("[data-year]").forEach(function (e) { e.textContent = now.getFullYear(); });
})();
