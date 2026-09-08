#!/usr/bin/env python3
"""Build talkmap/talks_map.html: the talks, schools and research visits map.

Reads _talks/*.md and _data/visits_and_schools.yml. Locations are geocoded with
Nominatim and cached in talkmap/geocache.json, so only new places hit the
network; delete that file to force a fresh lookup.

Needs folium, geopy and PyYAML — build_assets.py finds an interpreter that has
them. This is the same logic as _talks/talkmap.ipynb, as a script.

    python3 talkmap/build_map.py
"""
import glob
import json
import os
import re

import folium
import yaml
from geopy import Nominatim
from geopy.exc import GeocoderTimedOut, GeocoderUnavailable
from geopy.extra.rate_limiter import RateLimiter
from jinja2 import Template

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "talkmap", "talks_map.html")
CACHE = os.path.join(ROOT, "talkmap", "geocache.json")

# pin colour per kind of entry (Leaflet's awesome-markers palette)
COLOURS = {
    "Invited talk": "darkred",
    "Contributed talk": "darkblue",
    "Contributed poster": "darkblue",
    "School": "darkgreen",
    "Visit": "darkpurple",
}
# when several things happened in one place, the pin takes the first of these
PRIORITY = ["Invited talk", "Contributed talk", "Contributed poster", "School", "Visit"]

MONTHS = ["January", "February", "March", "April", "May", "June",
          "July", "August", "September", "October", "November", "December"]


def convert_date(date):
    """2023-08-07 -> August 7th, 2023 (as the notebook wrote it)."""
    year, month, day = date.split("-")
    day = str(int(day))
    if day.endswith("1") and day != "11":
        day += "st"
    elif day.endswith("2") and day != "12":
        day += "nd"
    elif day.endswith("3") and day != "13":
        day += "rd"
    else:
        day += "th"
    return "%s %s, %s" % (MONTHS[int(month) - 1], day, year)


def field(text, name):
    m = re.search(r'^%s: *"(.*?)"' % name, text, re.M)
    if m:
        return m.group(1)
    m = re.search(r"^%s: *(.+)$" % name, text, re.M)
    return m.group(1).strip().strip("\"'") if m else ""


def load_entries():
    entries = []
    for path in sorted(glob.glob(os.path.join(ROOT, "_talks", "*.md"))):
        text = open(path, encoding="utf-8").read()
        if not field(text, "location"):
            continue
        entries.append({
            "title": field(text, "title"),
            "venue": field(text, "venue"),
            "location": field(text, "location"),
            "date": field(text, "date"),
            "type": field(text, "type"),
        })

    with open(os.path.join(ROOT, "_data", "visits_and_schools.yml"), encoding="utf-8") as f:
        for e in yaml.safe_load(f) or []:
            entries.append({
                "title": e["title"],
                "venue": e["venue"],
                "location": e["location"],
                "date": str(e.get("date", "")),
                "type": e["type"],
            })

    # online events have no place on a map
    return [e for e in entries if e["location"].lower() != "online"]


def geocode_all(entries):
    cache = {}
    if os.path.exists(CACHE):
        cache = json.load(open(CACHE, encoding="utf-8"))
    missing = sorted({e["location"] for e in entries} - set(cache))
    if missing:
        geocode = RateLimiter(Nominatim(user_agent="gn_website").geocode,
                              min_delay_seconds=2, max_retries=3, error_wait_seconds=10)
        for place in missing:
            try:
                hit = geocode(place)
            except (GeocoderUnavailable, GeocoderTimedOut) as exc:
                print("  geocoding failed for %s: %s" % (place, exc))
                hit = None
            cache[place] = [hit.latitude, hit.longitude] if hit else None
            print("  looked up %s -> %s" % (place, cache[place]))
        json.dump(cache, open(CACHE, "w", encoding="utf-8"), indent=1, sort_keys=True)
    for e in entries:
        pos = cache.get(e["location"])
        e["lat"], e["lon"] = (pos if pos else (None, None))
    return [e for e in entries if e["lat"] is not None]


def merge_by_location(entries):
    merged = []
    for place in sorted({e["location"] for e in entries}):
        here = sorted([e for e in entries if e["location"] == place],
                      key=lambda e: e["date"], reverse=True)
        text = '<p style="font-size:1.3em; font-family: Avenir">'
        for e in here:
            text += "<b>" + e["venue"] + "</b>, " + e["location"]
            text += "<br /><i>" + e["title"] + "</i><br />"
            text += (convert_date(e["date"]) + " " if e["date"] else "") + "(" + e["type"].lower() + ")"
            text += "<br /><br />" if len(here) > 1 else ""
        text += "</p>"
        kinds = [e["type"] for e in here]
        kind = next((k for k in PRIORITY if k in kinds), here[0]["type"])
        merged.append({"text": text, "lat": here[0]["lat"], "lon": here[0]["lon"],
                       "type": kind, "num": len(here) if len(here) > 1 else None})
    return merged


def build(merged):
    m = folium.Map(
        location=[40, 40],
        tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
        attr="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ, USGS, FAO, NPS, NRCAN, GeoBase, "
             "Kadaster NL, Ordnance Survey, Esri Japan, METI, and the GIS User Community",
        zoom_start=3, min_zoom=1.5, max_bounds=True, no_wrap=True,
        zoom_snap=0.5, zoom_delta=0.5, max_bounds_viscosity=1.0, z_index=0)

    for i, kind in enumerate(PRIORITY):
        folium.map.CustomPane(kind, z_index=1000 - i).add_to(m)
    folium.map.CustomPane("arrow", z_index=450).add_to(m)

    # draw the lower-priority pins first so the talks end up on top
    for entry in sorted(merged, key=lambda e: -PRIORITY.index(e["type"])):
        popup = folium.Popup(entry["text"], min_width=200, max_width=300,
                             max_height=150, min_height=100)
        folium.Marker(location=[entry["lat"], entry["lon"]], popup=popup, marker_size=100,
                      icon=folium.Icon(color=COLOURS[entry["type"]], prefix="fa")).add_to(m)

    lats = [e["lat"] for e in merged]
    lons = [e["lon"] for e in merged]
    m.fit_bounds([[min(lats), min(lons)], [max(lats), max(lons)]])

    # on a phone the whole world is unreadable: open on Europe instead
    class MobileView(folium.MacroElement):
        _template = Template("""{% macro script(this, kwargs) %}
        if ({{ this._parent.get_name() }}.getSize().x < 500) { {{ this._parent.get_name() }}.setView([50, 12], 3); }
        {% endmacro %}""")
    m.add_child(MobileView())

    # follow the light/dark theme of the page that embeds the map
    m.get_root().header.add_child(folium.Element(
        '<link rel="stylesheet" href="/talkmap/map-theme.css">'
        '<script src="/assets/js/embed-theme.js"></script>'))

    m.save(OUT)


if __name__ == "__main__":
    entries = load_entries()
    located = geocode_all(entries)
    merged = merge_by_location(located)
    build(merged)
    kinds = {}
    for e in merged:
        kinds[e["type"]] = kinds.get(e["type"], 0) + 1
    print("wrote %s: %d entries at %d places (%s)" % (
        os.path.relpath(OUT, ROOT), len(located), len(merged),
        ", ".join("%s %d" % (k.lower(), n) for k, n in sorted(kinds.items()))))
