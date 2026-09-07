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
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "'\"":
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
            "year": p["year"],
            "venue": p["venue"],
            "url": p["url"],
        }
    )
    for a in p["authors"]:
        links.append({"source": "ego" if a == EGO else "a:" + a, "target": pid})

data = json.dumps({"nodes": nodes, "links": links}, ensure_ascii=False)

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
    --tip-bg: #ffffff;
    --tip-border: #d3d7db;
    --tip-text: #494e52;
    --bg: transparent;
  }
  html, body { margin: 0; padding: 0; height: 100%; background: var(--bg);
    font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
  #chart { width: 100%; height: 100%; }
  svg { width: 100%; height: 100%; display: block; }
  .link { fill: none; stroke: var(--link); stroke-width: 1px; stroke-opacity: 0.8; }
  .node { cursor: pointer; stroke: #fff; stroke-width: 1.2px; }
  .node.ego { stroke-width: 2px; }
  .label { font-size: 10px; fill: var(--label); pointer-events: none; paint-order: stroke; stroke: #fff; stroke-width: 3px; stroke-linejoin: round; }
  .label.ego { font-size: 11px; font-weight: 600; fill: var(--ego); }
  .node, .link, .label { transition: opacity 0.3s ease; }
  .dim { opacity: 0.12; }
  .legend text { font-size: 10px; fill: var(--label); }
  #tip {
    position: absolute; pointer-events: none; z-index: 2;
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
const radius = d => d.type === "ego" ? 12 : d.type === "author" ? 3.5 + 1.9 * Math.sqrt(d.n) : 5;

const svg = d3.select("#chart").append("svg").attr("viewBox", [0, 0, W, H]).attr("preserveAspectRatio", "xMidYMid meet");
const g = svg.append("g");
const tip = d3.select("#tip");

const byId = new Map(graph.nodes.map(d => [d.id, d]));
const neighbours = new Map(graph.nodes.map(d => [d.id, new Set([d.id])]));
graph.links.forEach(l => { neighbours.get(l.source).add(l.target); neighbours.get(l.target).add(l.source); });

// every node obeys the same physics; repulsion grows with degree so that
// well-connected people get room, and labelled nodes keep extra clearance
const deg = new Map(graph.nodes.map(d => [d.id, 0]));
graph.links.forEach(l => { deg.set(l.source, deg.get(l.source) + 1); deg.set(l.target, deg.get(l.target) + 1); });
const labelled = d => d.type === "ego" || (d.type === "author" && d.n >= (narrow() ? 6 : 4));
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
  .attr("class", d => "node " + d.type).attr("r", radius).attr("fill", d => colour[d.type]);
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
  const order = graph.nodes.filter(labelled).sort((a, b) => (b.n || 0) - (a.n || 0));
  order.forEach(d => {
    const w = (d.type === "ego" ? 6.4 : 5.6) * d.label.length, h = 12, r = radius(d) + 4;
    const cands = [
      { x: d.x + r, y: d.y + 4, a: "start" }, { x: d.x - r, y: d.y + 4, a: "end" },
      { x: d.x, y: d.y - r - 2, a: "middle" }, { x: d.x, y: d.y + r + 10, a: "middle" },
      { x: d.x + r * 0.8, y: d.y - r * 0.8, a: "start" }, { x: d.x - r * 0.8, y: d.y - r * 0.8, a: "end" },
      { x: d.x + r * 0.8, y: d.y + r * 0.8 + 8, a: "start" }, { x: d.x - r * 0.8, y: d.y + r * 0.8 + 8, a: "end" },
    ];
    let best = null;
    for (const c of cands) {
      const x0 = c.a === "start" ? c.x : c.a === "end" ? c.x - w : c.x - w / 2;
      const b = { d, x: c.x, y: c.y, a: c.a, x0, x1: x0 + w, y0: c.y - h + 2, y1: c.y + 2 };
      b.score = hits(b);
      if (!best || b.score < best.score) best = b;
      if (b.score === 0) break;
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

// legend
const legend = svg.append("g").attr("class", "legend").attr("transform", `translate(${PAD + 4}, ${PAD + 6})`);
[["author", "co-author"], ["journal", "journal article"], ["preprint", "preprint"]].forEach(([t, txt], i) => {
  const row = legend.append("g").attr("transform", `translate(0, ${i * 16})`);
  row.append("circle").attr("r", 4.5).attr("fill", colour[t]).attr("stroke", "#fff");
  row.append("text").attr("x", 10).attr("dy", "0.35em").text(txt);
});

// hover: tooltip + neighbourhood highlight (fades in and out via CSS)
function describe(d) {
  if (d.type === "ego") return `<b>${d.label}</b><span class="sub">${d.n} papers and preprints</span>`;
  if (d.type === "author") return `<b>${d.label}</b><span class="sub">${d.n} paper${d.n > 1 ? "s" : ""} together</span>`;
  return `<b>${d.label}</b><span class="sub">${d.type === "preprint" ? "Preprint" : "Journal article"}${d.venue ? " · " + d.venue : ""}</span>`;
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
  .on("mouseleave", () => {
    node.classed("dim", false); link.classed("dim", false); label.classed("dim", false);
    tip.style("opacity", 0);
  })
  .on("click", (ev, d) => { if (d.url) window.open(d.url, "_blank", "noopener"); });

// resize (orientation change, responsive layout): refit the same layout
window.addEventListener("resize", () => {
  const w = Math.max(280, window.innerWidth), h = Math.max(280, window.innerHeight);
  if (Math.abs(w - W) < 2 && Math.abs(h - H) < 2) return;
  W = w; H = h;
  svg.attr("viewBox", [0, 0, W, H]);
  fit(); place();
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
