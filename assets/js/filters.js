/* Publication filters by research area. Buttons: .pub-filter[data-theme];
   items: .card[data-theme] inside .year-group sections. ?theme=key preselects. */
document.addEventListener("DOMContentLoaded", function () {
  var bar = document.querySelector(".pub-filters");
  if (!bar) return;
  var buttons = bar.querySelectorAll(".pub-filter");
  var cards = document.querySelectorAll(".pub-list .card");
  var groups = document.querySelectorAll(".pub-list .year-group");
  var net = document.querySelector("iframe.embed--network");

  // the collaboration network follows the filter: the chosen area comes
  // forward, everything else recedes
  function tellNetwork(key) {
    if (!net || !net.contentWindow) return;
    try { net.contentWindow.postMessage({ area: key === "all" ? null : key }, window.location.origin); } catch (e) {}
  }

  function select(key) {
    buttons.forEach(function (b) {
      var on = b.dataset.theme === key;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    cards.forEach(function (c) {
      var areas = (c.dataset.theme || "").split(" ").filter(Boolean);   // untagged papers have none
      c.hidden = key !== "all" && areas.indexOf(key) === -1;
    });
    groups.forEach(function (g) {
      g.hidden = !g.querySelector(".card:not([hidden])");
    });
    tellNetwork(key);
    try {
      var url = new URL(window.location);
      if (key === "all") url.searchParams.delete("theme"); else url.searchParams.set("theme", key);
      history.replaceState(null, "", url);
    } catch (e) {}
  }

  buttons.forEach(function (b) {
    b.addEventListener("click", function () { select(b.dataset.theme); });
  });

  var initial = "all";
  try { initial = new URL(window.location).searchParams.get("theme") || "all"; } catch (e) {}
  if (!bar.querySelector('.pub-filter[data-theme="' + initial + '"]')) initial = "all";
  select(initial);
  // the iframe may still be loading when the page settles
  if (net) net.addEventListener("load", function () {
    var active = bar.querySelector(".pub-filter.is-active");
    if (active) tellNetwork(active.dataset.theme);
  });
});
