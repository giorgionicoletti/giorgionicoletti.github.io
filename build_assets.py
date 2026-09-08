#!/usr/bin/env python3
"""Regenerate everything on the site that is not built by Jekyll.

Three embedded pages are pre-generated HTML and have to be rebuilt whenever
their source data changes:

    collaboration network   collab_net/network.html      <- _publications/*.md
    research timeline       research_timeline/*.html     <- _publications/*.md, _data/themes.yml
    talk map                talkmap/talks_map.html       <- _talks/*.md, _data/visits_and_schools.yml

Everything else (publication list, filters, counts, cards, CV) is rendered by
Jekyll from the same front matter, so it needs no step here.

    python3 build_assets.py            # rebuild all three
    python3 build_assets.py network    # or name the ones you want:
    python3 build_assets.py map timeline

The map needs folium, geopy and PyYAML; if this interpreter lacks them the
script looks for one that has them (conda environments included) and says so
if it cannot find any.
"""
import glob
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))

TASKS = {
    "network": ("collab_net/build_network.py", ()),
    "timeline": ("research_timeline/build_timeline.py", ()),
    "map": ("talkmap/build_map.py", ("folium", "geopy", "yaml", "jinja2")),
}


def interpreter_with(modules):
    """The first python we can find that imports everything in `modules`."""
    candidates = [sys.executable]
    candidates += sorted(glob.glob(os.path.expanduser("~/miniconda3/envs/*/bin/python")))
    candidates += sorted(glob.glob(os.path.expanduser("~/anaconda3/envs/*/bin/python")))
    candidates += ["/opt/homebrew/bin/python3", "/usr/local/bin/python3", "/usr/bin/python3"]
    probe = "import " + ", ".join(modules)
    for python in candidates:
        if not os.path.exists(python):
            continue
        if subprocess.run([python, "-c", probe], capture_output=True).returncode == 0:
            return python
    return None


def run(name):
    script, needs = TASKS[name]
    python = interpreter_with(needs) if needs else sys.executable
    if python is None:
        print("- %-9s SKIPPED: no python found with %s" % (name, ", ".join(needs)))
        print("  install them, e.g.  pip install %s" % " ".join(m.replace("yaml", "pyyaml") for m in needs))
        return False
    print("- %s" % name)
    result = subprocess.run([python, os.path.join(ROOT, script)], cwd=ROOT)
    if result.returncode != 0:
        print("  FAILED (%s)" % script)
        return False
    return True


if __name__ == "__main__":
    wanted = sys.argv[1:] or list(TASKS)
    unknown = [w for w in wanted if w not in TASKS]
    if unknown:
        sys.exit("unknown target(s): %s\nchoose from: %s" % (", ".join(unknown), ", ".join(TASKS)))
    ok = [run(name) for name in wanted]
    print("\n%d of %d rebuilt" % (sum(ok), len(ok)))
    sys.exit(0 if all(ok) else 1)
