#!/usr/bin/env python3
"""Build collab_net/network.html from the publication files in _publications/.

The graph is bipartite: co-author nodes are connected to the papers they
appear on. Layout is computed in the browser with d3-force from a fixed seed,
so the picture is the same on every load. Run this script whenever a
publication is added:

    python3 collab_net/build_network.py

No dependencies beyond the standard library.
"""
import glob
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB_DIR = os.path.join(ROOT, "_publications")
OUT = os.path.join(ROOT, "collab_net", "network.html")
EGO = "Giorgio Nicoletti"


def front_matter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\s*\n(.*?)\n---", text, re.S)
    fm = {}
    for line in m.group(1).splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        val = val.strip()
        if val.startswith("[") and val.endswith("]"):
            val = [v.strip().strip("'\"") for v in val[1:-1].split(",") if v.strip()]
        elif len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
            val = val[1:-1].replace("''", "'")
        fm[key.strip()] = val
    return fm


def scholar(name):
    return "https://scholar.google.com/scholar?q=" + name.replace(" ", "+")


papers = []
for path in sorted(glob.glob(os.path.join(PUB_DIR, "*.md"))):
    fm = front_matter(path)
    is_preprint = not fm.get("paperurl")
    authors = [re.sub(r"\*", "", a).strip() for a in fm["authors"].split(",")]
    papers.append(
        {
            "title": fm["title"],
            "year": fm.get("date", "")[:4],
            "venue": fm.get("venue", ""),
            "url": fm.get("preprinturl") if is_preprint else fm.get("paperurl"),
            "type": "preprint" if is_preprint else "journal",
            "themes": fm.get("theme") if isinstance(fm.get("theme"), list) else ([fm["theme"]] if fm.get("theme") else []),
            "authors": [a for a in authors if a],
        }
    )

# authors ordered by number of shared papers, ego first
counts = {}
for p in papers:
    for a in p["authors"]:
        counts[a] = counts.get(a, 0) + 1
authors = sorted((a for a in counts if a != EGO), key=lambda a: (-counts[a], a))

nodes, links = [], []
nodes.append({"id": "ego", "label": EGO, "type": "ego", "n": len(papers), "url": scholar(EGO)})
for a in authors:
    nodes.append({"id": "a:" + a, "label": a, "type": "author", "n": counts[a], "url": scholar(a)})
for i, p in enumerate(papers):
    pid = "p:%d" % i
    nodes.append(
        {
            "id": pid,
            "label": p["title"],
            "type": p["type"],
            "theme": (p["themes"] or [""])[0],
            "themes": p["themes"],
            "year": p["year"],
            "venue": p["venue"],
            "url": p["url"],
        }
    )
    for a in p["authors"]:
        links.append({"source": "ego" if a == EGO else "a:" + a, "target": pid})

themes = []
try:
    cur = None
    for line in open(os.path.join(ROOT, "_data", "themes.yml"), encoding="utf-8"):
        line = line.rstrip()
        if line.startswith("- key:"):
            cur = {"key": line.split(":", 1)[1].strip()}
            themes.append(cur)
        elif cur is not None and line.startswith("  title:"):
            cur["title"] = line.split(":", 1)[1].strip().strip('"')
        elif cur is not None and line.startswith("  colour:"):
            cur["colour"] = line.split(":", 1)[1].strip().strip('"')
        elif cur is not None and line.startswith("  colour_dark:"):
            cur["colour_dark"] = line.split(":", 1)[1].strip().strip('"')
except FileNotFoundError:
    pass

data = json.dumps({"nodes": nodes, "links": links, "themes": themes}, ensure_ascii=False)

TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Collaboration network</title>
<style>
  :root {
    --ego: #16161a;
    --author: #b9bec4;
    --journal: #9e1910;
    --preprint: #5b9bd1;
    --link: #d7dadd;
    --label: #6b7178;
    --halo: #ffffff;
    --tip-bg: #ffffff;
    --tip-border: #d3d7db;
    --tip-text: #494e52;
    --bg: transparent;
  }
  [data-theme="dark"] {
    --ego: #e9ebed;
    --author: #5f666d;
    --journal: #cf5145;
    --preprint: #4f8fc7;
    --link: #33383e;
    --label: #a3a9b0;
    --halo: #141618;
    --tip-bg: #1b1e21;
    --tip-border: #33383e;
    --tip-text: #d7dade;
  }
  html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; background: var(--bg);
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  #chart { width: 100%; height: 100%; }
  svg { width: 100%; height: 100%; display: block; }
  .link { fill: none; stroke: var(--link); stroke-width: 1px; stroke-opacity: 0.8; }
  .node { cursor: pointer; stroke: var(--halo); stroke-width: 1.2px; }
  .node.ego { stroke-width: 2px; }
  .label { font-size: 10px; fill: var(--label); pointer-events: none; paint-order: stroke; stroke: var(--halo); stroke-width: 3px; stroke-linejoin: round; }
  .label.ego { font-size: 11px; font-weight: 600; fill: var(--ego); }
  .node, .link, .label { transition: opacity 0.3s ease; }
  .dim { opacity: 0.12; }
  .legend text { font-size: 10px; fill: var(--label); }
  .legend .switch text { fill: var(--label); text-decoration: underline; text-underline-offset: 2px; }
  .legend .switch:hover text { fill: var(--journal); }
  #tip {
    position: absolute; top: 0; left: 0; pointer-events: none; z-index: 2;
    max-width: 260px; padding: 7px 10px;
    background: var(--tip-bg); border: 1px solid var(--tip-border); border-radius: 6px;
    color: var(--tip-text); font-size: 12px; line-height: 1.35;
    box-shadow: 0 2px 8px rgba(0,0,0,.08); opacity: 0; transition: opacity .2s ease;
  }
  #tip b { display: block; margin-bottom: 2px; }
  #tip .sub { color: var(--label); }
</style>
</head>
<body>
<div id="chart"></div>
<div id="tip"></div>
<script src="/assets/js/embed-theme.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/d3/7.9.0/d3.min.js"></script>
<script>
const graph = __DATA__;
// the drawing is sized to its frame: one SVG unit is one CSS pixel, so nodes
// and labels keep a readable size on a phone and the layout fills a portrait
// frame as well as a landscape one
let W = Math.max(280, window.innerWidth), H = Math.max(280, window.innerHeight);
const PAD = 14;
const narrow = () => W < 500;
const colour = { ego: "var(--ego)", author: "var(--author)", journal: "var(--journal)", preprint: "var(--preprint)" };
const isDark = () => document.documentElement.getAttribute("data-theme") === "dark";
const themeColour = new Proxy({}, { get: (_, k) => { const t = (graph.themes || []).find(t => t.key === k); return t ? (isDark() && t.colour_dark ? t.colour_dark : t.colour) : undefined; } });
document.addEventListener("themechange", () => { node.attr("fill", fill); drawLegend(); });
// ?switch=off hides the corner control: that copy is steered by the filters
// on the publications page and always colours by research area
const showSwitch = new URLSearchParams(location.search).get("switch") !== "off";
let mode = "type";   // "type": journal / preprint, "area": research area
const fill = d => {
  // under a filter a paper is drawn in the colour of the area that was picked,
  // so a paper tagged with two areas takes the right one either way
  if (filterKey && (d.type === "journal" || d.type === "preprint") && areaMembers.get(d.id).has(filterKey))
    return themeColour[filterKey];
  return (mode === "area" && d.theme && themeColour[d.theme]) ? themeColour[d.theme] : colour[d.type];
};
// in area mode only what has no area at all steps back: an untagged paper, and
// a co-author whose every paper is untagged. Someone with at least one tagged
// paper keeps full opacity, since they do belong to an area.
const hasArea = d => !!(d.theme && themeColour[d.theme]);
const areasOf = d => (d.themes || (d.theme ? [d.theme] : [])).filter(k => themeColour[k]);
const inSomeArea = new Map();          // filled once the adjacency is known
const faded = d => mode === "area" && !inSomeArea.get(d.id);
const nodeOpacity = d => {
  if (filterKey) return areaMembers.get(d.id).has(filterKey) ? 1 : 0.12;
  return faded(d) ? (d.type === "ego" ? 0.5 : 0.28) : 1;
};
const linkOpacity = l => {
  if (filterKey) {
    const a = areaMembers.get(l.source.id || l.source), b = areaMembers.get(l.target.id || l.target);
    return (a && a.has(filterKey) && b && b.has(filterKey)) ? 0.9 : 0.06;
  }
  return mode === "area" ? 0.45 : 1;
};
function applyEmphasis() {
  node.attr("fill", fill).attr("fill-opacity", nodeOpacity).attr("stroke-opacity", nodeOpacity);
  link.attr("stroke-opacity", linkOpacity);
  label.attr("opacity", d => (filterKey && !areaMembers.get(d.id).has(filterKey)) ? 0.2 : 1);
}
const radius = d => d.type === "ego" ? 12 : d.type === "author" ? 3.5 + 1.9 * Math.sqrt(d.n) : 5;

const svg = d3.select("#chart").append("svg").attr("viewBox", [0, 0, W, H]).attr("preserveAspectRatio", "xMidYMid meet");
const g = svg.append("g");
const tip = d3.select("#tip");

const byId = new Map(graph.nodes.map(d => [d.id, d]));
const neighbours = new Map(graph.nodes.map(d => [d.id, new Set([d.id])]));
graph.links.forEach(l => { neighbours.get(l.source).add(l.target); neighbours.get(l.target).add(l.source); });

graph.nodes.forEach(d => {
  if (d.type === "journal" || d.type === "preprint") { inSomeArea.set(d.id, hasArea(d)); return; }
  inSomeArea.set(d.id, [...neighbours.get(d.id)].some(id => id !== d.id && hasArea(byId.get(id))));
});

// who belongs to a given area: its papers, and everyone who wrote one of them
const areaMembers = new Map();
graph.nodes.forEach(d => {
  const keys = new Set();
  if (d.type === "journal" || d.type === "preprint") areasOf(d).forEach(k => keys.add(k));
  else [...neighbours.get(d.id)].forEach(id => { const p = byId.get(id); if (p) areasOf(p).forEach(k => keys.add(k)); });
  areaMembers.set(d.id, keys);
});
let filterKey = null;      // set from the publications page

// every node obeys the same physics; repulsion grows with degree so that
// well-connected people get room, and labelled nodes keep extra clearance
const deg = new Map(graph.nodes.map(d => [d.id, 0]));
graph.links.forEach(l => { deg.set(l.source, deg.get(l.source) + 1); deg.set(l.target, deg.get(l.target) + 1); });
// which nodes get a label is decided once, at load, so that a later resize
// never leaves a label without a position
const labelIds = new Set(graph.nodes.filter(d => d.type === "ego" || (d.type === "author" && d.n >= (narrow() ? 6 : 4))).map(d => d.id));
const labelled = d => labelIds.has(d.id);
const aspect = W / H;
const sim = d3.forceSimulation(graph.nodes)
  .randomSource(d3.randomLcg(0.42))
  .force("link", d3.forceLink(graph.links).id(d => d.id).distance(l => 18 + radius(l.source) + radius(l.target)).strength(0.5))
  .force("charge", d3.forceManyBody().strength(d => -25 - 22 * Math.sqrt(deg.get(d.id))))
  .force("x", d3.forceX(W / 2).strength(0.028 / Math.sqrt(aspect)))
  .force("y", d3.forceY(H / 2).strength(0.028 * Math.sqrt(aspect)))
  .force("collide", d3.forceCollide(d => radius(d) + (labelled(d) ? 18 : 2.5)).iterations(2))
  .stop();

for (let i = 0; i < 600; i++) sim.tick();

// rescale the settled layout so that it fills the frame (this is what fixes
// the size: whatever the forces do, the picture always spans the viewBox)
function fit() {
  const xs = graph.nodes.map(d => d.x), ys = graph.nodes.map(d => d.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const m = PAD + 16;
  const k = Math.min((W - 2 * m) / (x1 - x0), (H - 2 * m) / (y1 - y0));
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  graph.nodes.forEach(d => { d.x = W / 2 + (d.x - cx) * k; d.y = H / 2 + (d.y - cy) * k; });
}
fit();

const clamp = d => { const r = radius(d) + PAD; d.x = Math.max(r, Math.min(W - r, d.x)); d.y = Math.max(r, Math.min(H - r, d.y)); };

function curve(l) {
  const sx = l.source.x, sy = l.source.y, tx = l.target.x, ty = l.target.y;
  const dx = tx - sx, dy = ty - sy;
  return `M${sx},${sy}Q${(sx + tx) / 2 - dy * 0.18},${(sy + ty) / 2 + dx * 0.18} ${tx},${ty}`;
}
const link = g.append("g").selectAll("path").data(graph.links).join("path").attr("class", "link");
const node = g.append("g").selectAll("circle").data(graph.nodes).join("circle")
  .attr("class", d => "node " + d.type).attr("r", radius).attr("fill", fill)
  .attr("fill-opacity", nodeOpacity).attr("stroke-opacity", nodeOpacity);
const label = g.append("g").selectAll("text")
  .data(graph.nodes.filter(labelled)).join("text")
  .attr("class", d => "label " + d.type).text(d => d.label);

// label placement: try eight positions around the node, keep the first one
// that overlaps neither another label nor a node; otherwise the least bad
function placeLabels() {
  const placed = [];
  const hits = (b) => {
    let score = 0;
    for (const o of placed) if (b.x0 < o.x1 && o.x0 < b.x1 && b.y0 < o.y1 && o.y0 < b.y1) score += 4;
    for (const n of graph.nodes) {
      if (n === b.d) continue;
      const r = radius(n);
      if (n.x + r > b.x0 && n.x - r < b.x1 && n.y + r > b.y0 && n.y - r < b.y1) score += n.type === "author" ? 2 : 1;
    }
    if (b.x0 < 2 || b.x1 > W - 2 || b.y0 < 2 || b.y1 > H - 2) score += 4;
    return score;
  };
  // the outward direction usually has the most room, so break ties that way
  const gx = d3.mean(graph.nodes, n => n.x), gy = d3.mean(graph.nodes, n => n.y);
  const order = graph.nodes.filter(labelled).sort((a, b) => (b.n || 0) - (a.n || 0));
  order.forEach(d => {
    const w = (d.type === "ego" ? 6.4 : 5.6) * d.label.length, h = 12, r = radius(d) + 4;
    const cands = [
      { x: d.x + r, y: d.y + 4, a: "start" }, { x: d.x - r, y: d.y + 4, a: "end" },
      { x: d.x, y: d.y - r - 2, a: "middle" }, { x: d.x, y: d.y + r + 10, a: "middle" },
      { x: d.x + r * 0.8, y: d.y - r * 0.8, a: "start" }, { x: d.x - r * 0.8, y: d.y - r * 0.8, a: "end" },
      { x: d.x + r * 0.8, y: d.y + r * 0.8 + 8, a: "start" }, { x: d.x - r * 0.8, y: d.y + r * 0.8 + 8, a: "end" },
    ];
    const ox = d.x - gx, oy = d.y - gy, on = Math.hypot(ox, oy) || 1;
    let best = null;
    for (const c of cands) {
      const x0 = c.a === "start" ? c.x : c.a === "end" ? c.x - w : c.x - w / 2;
      const b = { d, x: c.x, y: c.y, a: c.a, x0, x1: x0 + w, y0: c.y - h + 2, y1: c.y + 2 };
      // how far this candidate points away from the middle of the drawing
      const lx = (x0 + w / 2) - d.x, ly = c.y - d.y, ln = Math.hypot(lx, ly) || 1;
      const outward = (lx * ox + ly * oy) / (ln * on);
      b.score = hits(b) + 0.9 * (1 - outward);
      if (!best || b.score < best.score) best = b;
    }
    placed.push(best);
  });
  return new Map(placed.map(b => [b.d.id, b]));
}

function place() {
  link.attr("d", curve);
  node.attr("cx", d => d.x).attr("cy", d => d.y);
  const pos = placeLabels();
  label.each(function (d) { const p = pos.get(d.id); d3.select(this).attr("x", p.x).attr("y", p.y).attr("text-anchor", p.a); });
}
place();

// legend + colour-mode switch
const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${PAD + 4}, ${PAD + 6})`);
function drawLegend() {
  legend.selectAll("*").remove();
  const rows = mode === "type"
    ? [["var(--author)", "co-author"], ["var(--journal)", "journal article"], ["var(--preprint)", "preprint"]]
    : (graph.themes || []).map(t => [themeColour[t.key], t.title.toLowerCase()]).concat([["var(--author)", "co-authors"]]);
  rows.forEach(([c, txt], i) => {
    const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
    row.append("circle").attr("r", 4.5).attr("fill", c).attr("stroke", "var(--halo)");
    row.append("text").attr("x", 10).attr("dy", "0.35em").text(txt);
  });
  if (showSwitch && graph.themes && graph.themes.length) {
    const sw = legend.append("g").attr("class", "switch").attr("transform", `translate(0, ${rows.length * 16 + 6})`)
      .style("cursor", "pointer").on("click", () => {
        mode = mode === "type" ? "area" : "type";
        applyEmphasis();
        drawLegend();
      });
        sw.append("text").attr("dy", "0.35em").text(mode === "type" ? "colour by research area →" : "colour by paper type →");
  }
}
drawLegend();

// hover: tooltip + neighbourhood highlight (fades in and out via CSS)
function describe(d) {
  if (d.type === "ego") return `<b>${d.label}</b><span class="sub">${d.n} papers and preprints</span>`;
  if (d.type === "author") return `<b>${d.label}</b><span class="sub">${d.n} paper${d.n > 1 ? "s" : ""} together</span>`;
  return `<b>${d.label}</b><span class="sub">${d.type === "preprint" ? "Preprint" : "Journal article"}${d.venue ? " · " + d.venue : ""}</span>`;
}
function reset() {
  node.classed("dim", false); link.classed("dim", false); label.classed("dim", false);
  tip.style("opacity", 0);
}
node
  .on("mouseenter", (ev, d) => {
    const nb = neighbours.get(d.id);
    node.classed("dim", n => !nb.has(n.id));
    link.classed("dim", l => l.source.id !== d.id && l.target.id !== d.id);
    label.classed("dim", n => !nb.has(n.id));
    tip.html(describe(d)).style("opacity", 1);
  })
  .on("mousemove", ev => {
    const [x, y] = [ev.clientX, ev.clientY];
    const tw = tip.node().offsetWidth, th = tip.node().offsetHeight;
    tip.style("left", Math.min(x + 14, window.innerWidth - tw - 8) + "px")
       .style("top", Math.min(y + 14, window.innerHeight - th - 8) + "px");
  })
  .on("mouseleave", reset)
  .on("click", (ev, d) => {
    ev.stopPropagation();
    // on touch screens there is no mouseleave, so clear the highlight before
    // leaving the page, otherwise it is still there when the visitor comes back
    reset();
    if (d.url) window.open(d.url, "_blank", "noopener");
  });

// tapping the background or returning to the page also clears any highlight
svg.on("click", reset);
document.addEventListener("visibilitychange", () => { if (!document.hidden) reset(); });
window.addEventListener("pageshow", reset);

// resize (orientation change, responsive layout): refit the same layout
window.addEventListener("resize", () => {
  const w = Math.max(280, window.innerWidth), h = Math.max(280, window.innerHeight);
  if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2) return;
  W = w; H = h;
  svg.attr("viewBox", [0, 0, W, H]);
  fit(); place();
});

// the publications page asks for one area to be brought forward
window.addEventListener("message", ev => {
  if (!ev.data || !("area" in ev.data)) return;
  const k = ev.data.area;
  filterKey = (k && themeColour[k]) ? k : null;
  // colour by research area only while an area is picked; "All" goes back to
  // journal versus preprint. The copy with the switch keeps whatever the
  // visitor chose there.
  if (!showSwitch) mode = filterKey ? "area" : "type";
  drawLegend();
  applyEmphasis();
});

// drag: move only the grabbed node; the rest of the layout stays put
node.call(d3.drag()
  .on("start", () => { tip.style("opacity", 0); })
  .on("drag", (ev, d) => { d.x = ev.x; d.y = ev.y; clamp(d); place(); }));
</script>
</body>
</html>
"""

with open(OUT, "w", encoding="utf-8") as f:
    f.write(TEMPLATE.replace("__DATA__", data))

print("wrote %s: %d co-authors, %d papers, %d links" % (os.path.relpath(OUT, ROOT), len(authors), len(papers), len(links)))
