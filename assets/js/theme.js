/* Light / dark theme switch.
   The initial theme is applied by an inline script in head/custom.html before
   the first paint; this file wires the toggle button and tells the embedded
   iframes (network, map) which theme to use. */
(function () {
  var KEY = "theme";

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function apply(theme) {
    var root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.style.colorScheme = theme;
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#141618" : "#ffffff");
    document.querySelectorAll("iframe.embed").forEach(function (f) {
      try { f.contentWindow.postMessage({ theme: theme }, window.location.origin); } catch (e) {}
    });
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      b.setAttribute("title", theme === "dark" ? "Light theme" : "Dark theme");
      var label = b.querySelector(".theme-toggle__label");
      if (label) label.textContent = theme === "dark" ? "Light theme" : "Dark theme";
    });
  }

  function current() {
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  document.addEventListener("DOMContentLoaded", function () {
    apply(current());
    document.querySelectorAll(".theme-toggle").forEach(function (b) {
      b.addEventListener("click", function () {
        var next = current() === "dark" ? "light" : "dark";
        try { localStorage.setItem(KEY, next); } catch (e) {}
        apply(next);
      });
    });
    // iframes that load after us ask for the theme once ready
    window.addEventListener("message", function (ev) {
      if (ev.origin !== window.location.origin || !ev.data || ev.data.ask !== "theme") return;
      ev.source.postMessage({ theme: current() }, window.location.origin);
    });
  });
})();
