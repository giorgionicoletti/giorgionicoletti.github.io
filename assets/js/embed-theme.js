/* Used inside the embedded pages (collaboration network, talk map).
   Picks up the theme from the parent page and follows later switches. */
(function () {
  function apply(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme;
    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }
  var theme = "light";
  try {
    if (window.parent !== window) {
      theme = window.parent.document.documentElement.getAttribute("data-theme") || theme;
    }
  } catch (e) {
    // cross-origin parent: ask politely instead
    try { window.parent.postMessage({ ask: "theme" }, "*"); } catch (e2) {}
  }
  apply(theme);
  window.addEventListener("message", function (ev) {
    if (ev.data && (ev.data.theme === "dark" || ev.data.theme === "light")) apply(ev.data.theme);
  });
})();
