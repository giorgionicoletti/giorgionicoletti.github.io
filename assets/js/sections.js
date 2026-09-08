/* Collapsible sections: <button class="section-toggle" data-target="id"> toggles
   the element with that id (class "section-body"). */
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".section-toggle").forEach(function (btn) {
    var body = document.getElementById(btn.dataset.target);
    if (!body) return;

    var onOpened = function () { body.style.maxHeight = ""; };

    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") !== "false";
      body.removeEventListener("transitionend", onOpened);

      if (open) {
        body.style.maxHeight = body.scrollHeight + "px";
        // force a frame so the transition starts from the measured height
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { body.style.maxHeight = "0px"; });
        });
        btn.setAttribute("aria-expanded", "false");
        btn.setAttribute("aria-label", "Expand section");
      } else {
        body.style.maxHeight = body.scrollHeight + "px";
        body.addEventListener("transitionend", onOpened, { once: true });
        btn.setAttribute("aria-expanded", "true");
        btn.setAttribute("aria-label", "Collapse section");
      }
    });
  });
});

/* Research overview: hovering an area in the key highlights its dots in the timeline */
document.addEventListener("DOMContentLoaded", function () {
  var frame = document.querySelector("iframe.embed--timeline");
  if (!frame) return;
  var send = function (key) { try { frame.contentWindow.postMessage({ highlight: key }, window.location.origin); } catch (e) {} };
  document.querySelectorAll(".area-key__item, .area[data-theme]").forEach(function (li) {
    li.addEventListener("mouseenter", function () { send(li.dataset.theme); });
    li.addEventListener("mouseleave", function () { send(null); });
  });
});
