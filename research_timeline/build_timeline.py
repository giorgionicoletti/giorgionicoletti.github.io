#!/usr/bin/env python3
"""Build research_timeline/timeline.html: one dot per paper placed by date,
coloured by its first research area; untagged papers are grey.

Reads _data/themes.yml and the theme: field of _publications/*.md.
Run after editing publications:

    python3 research_timeline/build_timeline.py
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "research_timeline", "timeline.html")


def front_matter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line or line.startswith(" "):
            continue
        key, _, val = line.partition(":")
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            val = [v.strip().strip("'\"") for v in val[1:-1].split(",") if v.strip()]
        elif len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
            val = val[1:-1].replace("''", "'")
        fm[key.strip()] = val
    return fm


themes, cur = [], None
for line in open(os.path.join(ROOT, "_data", "themes.yml"), encoding="utf-8"):
    line = line.rstrip()
    if line.startswith("- key:"):
        cur = {"key": line.split(":", 1)[1].strip()}
        themes.append(cur)
    elif cur is not None and line.startswith("  ") and ":" in line:
        k, _, v = line.strip().partition(":")
        cur[k] = v.strip().strip('"')

papers = []
for path in sorted(glob.glob(os.path.join(ROOT, "_publications", "*.md"))):
    fm = front_matter(path)
    theme = fm.get("theme") or []
    if isinstance(theme, str):
        theme = [theme]
    is_preprint = not fm.get("paperurl")
    papers.append(
        {
            "title": fm["title"],
            "date": fm.get("date", ""),
            "venue": fm.get("venue_short") or fm.get("venue", ""),
            "url": fm.get("preprinturl") if is_preprint else fm.get("paperurl"),
            "type": "preprint" if is_preprint else "journal",
            "themes": theme,
        }
    )

data = json.dumps({"themes": themes, "papers": papers}, ensure_ascii=False)

TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Publications over time</title>
<style>
  :root { --text: #494e52; --muted: #6b7178; --rule: #e3e5e8; --other: #b9bec4; --halo: #ffffff;
          --tip-bg: #ffffff; --tip-border: #d3d7db; }
  [data-theme="dark"] { --text: #d7dade; --muted: #a3a9b0; --rule: #2a2e33; --other: #5f666d; --halo: #141618;
          --tip-bg: #1b1e21; --tip-border: #33383e; }
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: transparent;
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  #chart { width: 100%; height: 100%; }
  svg { width: 100%; height: 100%; display: block; }
  .axis line { stroke: var(--rule); }
  .axis text { font-size: 10px; fill: var(--muted); }
  .dot { cursor: pointer; stroke: var(--halo); stroke-width: 1.2px; transition: opacity 0.25s ease; }
  .dim { opacity: 0.2; }
  #tip { position: absolute; top: 0; left: 0; pointer-events: none; z-index: 2; max-width: 260px; padding: 7px 10px;
    background: var(--tip-bg); border: 1px solid var(--tip-border); border-radius: 6px;
    color: var(--text); font-size: 12px; line-height: 1.35; box-shadow: 0 2px 8px rgba(0,0,0,.08);
    opacity: 0; transition: opacity .2s ease; }
  #tip b { display: block; margin-bottom: 2px; }
  #tip .sub { color: var(--muted); }
</style>
</head>
<body>
<div id="chart"></div>
<div id="tip"></div>
<script src="/assets/js/embed-theme.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>
const data = __DATA__;
let W = Math.max(300, window.innerWidth), H = Math.max(80, window.innerHeight);
const PAD = { l: 14, r: 14, t: 10, b: 22 };
const R = 5;
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
const colour = new Proxy({}, { get: (_, k) => { const t = data.themes.find(t => t.key === k); return t ? (isDark() && t.colour_dark ? t.colour_dark : t.colour) : undefined; } });
const parse = d3.timeParse("%Y-%m-%d");
const papers = data.papers.map(p => ({ ...p, t: parse(p.date), r: R, k: p.themes[0] || "" })).filter(p => p.t);

const svg = d3.select("#chart").append("svg").attr("viewBox", [0, 0, W, H]).attr("preserveAspectRatio", "xMidYMid meet");
const axis = svg.append("g").attr("class", "axis");
const g = svg.append("g");
const tip = d3.select("#tip");

let x;
function layout() {
  const [t0, t1] = d3.extent(papers, p => p.t);
  const y0 = new Date(t0.getFullYear(), 0, 1), y1 = new Date(t1.getFullYear() + 1, 0, 1);
  x = d3.scaleTime().domain([y0, y1]).range([PAD.l, W - PAD.r]);
  const cy = (PAD.t + H - PAD.b) / 2;
  papers.forEach(p => { p.x = x(p.t); p.y = cy; });
  // beeswarm: x is fixed by the date, y makes room
  const sim = d3.forceSimulation(papers).randomSource(d3.randomLcg(0.3))
    .force("x", d3.forceX(p => x(p.t)).strength(1))
    .force("y", d3.forceY(cy).strength(H > 150 ? 0.02 : 0.08))
    .force("collide", d3.forceCollide(p => p.r + 2).iterations(3)).stop();
  for (let i = 0; i < 160; i++) sim.tick();
  // the swarm only spreads as far as collisions push it, which leaves a tall
  // frame half empty: stretch it vertically to fill the band instead
  const lo = d3.min(papers, p => p.y), hi = d3.max(papers, p => p.y);
  const band = (H - PAD.b - R) - (PAD.t + R);
  const k = Math.min(band / Math.max(1, hi - lo), 2.2);
  if (k > 1) papers.forEach(p => { p.y = cy + (p.y - (lo + hi) / 2) * k; });
  papers.forEach(p => { p.y = Math.max(PAD.t + p.r, Math.min(H - PAD.b - p.r, p.y)); });
}
layout();

const dot = g.selectAll("circle").data(papers).join("circle")
  .attr("class", "dot").attr("r", p => p.r).attr("fill", p => colour[p.k] || "var(--other)");

function place() {
  dot.attr("cx", p => p.x).attr("cy", p => p.y);
  axis.selectAll("*").remove();
  axis.append("line").attr("x1", PAD.l).attr("x2", W - PAD.r).attr("y1", H - PAD.b).attr("y2", H - PAD.b);
  const years = x.ticks(d3.timeYear.every(1));
  const span = years.length > 1 ? x(years[1]) - x(years[0]) : W;
  const step = span < 34 ? 2 : 1;                     // every other year when it is tight
  const yr = axis.selectAll("g").data(years).join("g").attr("transform", d => `translate(${x(d)},${H - PAD.b})`);
  yr.append("line").attr("y1", 0).attr("y2", 4);
  yr.append("text")
    .attr("x", d => Math.min((x(d3.timeYear.offset(d, 1)) - x(d)) / 2, W - PAD.r - x(d) - 14))
    .attr("y", 15).attr("text-anchor", "middle")
    .text(d => d.getFullYear())
    .style("display", (d, i) => {
      if (i % step) return "none";                    // thinned out
      const mid = x(d) + Math.min((x(d3.timeYear.offset(d, 1)) - x(d)) / 2, W - PAD.r - x(d) - 14);
      return (mid - 15 < PAD.l || mid + 15 > W - PAD.r) ? "none" : null;   // never clipped
    });
}
place();

function describe(p) {
  const areas = p.themes.map(k => (data.themes.find(t => t.key === k) || {}).title).filter(Boolean).join(" · ");
  return `<b>${p.title}</b><span class="sub">${p.venue} ${p.date.slice(0, 4)}${p.type === "preprint" ? " · preprint" : ""}</span>` +
         (areas ? `<span class="sub">${areas}</span>` : "");
}
function reset() { dot.classed("dim", false); tip.style("opacity", 0); }
dot.on("mouseenter", (ev, p) => { dot.classed("dim", q => q !== p); tip.html(describe(p)).style("opacity", 1); })
  .on("mousemove", ev => {
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    tip.style("left", Math.min(ev.clientX + 12, window.innerWidth - tw - 8) + "px")
       .style("top", Math.max(4, Math.min(ev.clientY + 12, window.innerHeight - th - 8)) + "px");
  })
  .on("mouseleave", reset)
  .on("click", (ev, p) => { ev.stopPropagation(); reset(); if (p.url) window.open(p.url, "_blank", "noopener"); });
svg.on("click", reset);
document.addEventListener("visibilitychange", () => { if (!document.hidden) reset(); });
window.addEventListener("pageshow", reset);

// the parent page can ask to highlight one area (hovering a card)
window.addEventListener("message", ev => {
  if (!ev.data || !("highlight" in ev.data)) return;
  const k = ev.data.highlight;
  dot.classed("dim", p => k && p.k !== k);
});

document.addEventListener("themechange", () => dot.attr("fill", p => colour[p.k] || "var(--other)"));

window.addEventListener("resize", () => {
  const w = Math.max(300, window.innerWidth), h = Math.max(80, window.innerHeight);
  if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2) return;
  W = w; H = h; svg.attr("viewBox", [0, 0, W, H]); layout(); place();
});
</script>
</body>
</html>
"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(TEMPLATE.replace("__DATA__", data))
print("wrote %s: %d papers" % (os.path.relpath(OUT, ROOT), len(papers)))
