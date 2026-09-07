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

  function addMenuItem() {
    var hidden = document.querySelector("#site-nav .hidden-links");
    if (!hidden || hidden.querySelector(".theme-toggle--menu")) return;
    var src = document.querySelector(".masthead .theme-toggle");
    var li = document.createElement("li");
    li.className = "masthead__menu-item theme-menu-item";
    var b = document.createElement("button");
    b.type = "button";
    b.className = "theme-toggle theme-toggle--menu";
    b.innerHTML = (src ? src.innerHTML : "") + '<span class="theme-toggle__label"></span>';
    li.appendChild(b);
    hidden.appendChild(li);   // stays last: the greedy nav only ever moves the first item back
  }

  document.addEventListener("DOMContentLoaded", function () {
    addMenuItem();
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
