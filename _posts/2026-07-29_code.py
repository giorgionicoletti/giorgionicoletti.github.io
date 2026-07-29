"""
Blog figure v4 - Nicoletti & Busiello, PRL 127, 228301 (2021).
Sketch, not a data plot: short window, thick strokes, big type,
and annotations that tell a non-technical reader what to look at.
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import ListedColormap

# set the font to avenir
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Avenir Next", "Avenir", "DejaVu Sans"],
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

tau = 1.0
D_lo, D_hi = 0.04, 1.0
dt = 0.004
T = 12.0
n = int(T / dt)
t = np.arange(n) * dt

def simulate(w_sum, seed, forced=None):
    r = np.random.default_rng(seed)
    if forced is not None:
        state = forced
    else:
        state = np.zeros(n, dtype=int); s = 1
        rate = w_sum / 2.0
        for k in range(n):
            if r.random() < rate * dt:
                s = 1 - s
            state[k] = s
    D = np.where(state == 1, D_hi, D_lo)
    x1 = np.zeros(n); x2 = np.zeros(n)
    sq = np.sqrt(2 * D * dt)
    for k in range(1, n):
        x1[k] = x1[k-1] - x1[k-1]/tau*dt + sq[k]*r.standard_normal()
        x2[k] = x2[k-1] - x2[k-1]/tau*dt + sq[k]*r.standard_normal()
    return x1, x2, state

# SLOW: force a clean, legible epoch structure (calm | turbulent | calm | turbulent)
edges = [0.0, 3.0, 6.5, 8.5, 12.0]
vals  = [0, 1, 0, 1]
slow_state = np.zeros(n, dtype=int)
for (a, b), v in zip(zip(edges[:-1], edges[1:]), vals):
    slow_state[(t >= a) & (t < b)] = v
x1s, x2s, sts = simulate(None, seed=5, forced=slow_state)
x1f, x2f, stf = simulate(120.0, seed=5)

K = 10
td = t[::K]

INK  = "#16161a"
MUTE = "#9a9aa2"
C1   = "#c9922c"  # amber -> system 1 line (kept clear of the warm/cold red-blue coding)
C2   = "#2f6b52"  # forest green -> system 2 line (same reasoning)
WARM = "#9e1910"  # site primary/brand color -> "warm" label + strip fill
COLD = "#4a6b82"  # cool steel blue -> "cold" label + strip fill
HI   = "#e7c9c6"  # light warm tint (same hue family as WARM) -> "warm" strip fill
LO   = "#d7e4ea"  # light cool tint (same hue family as COLD) -> "cold" strip fill

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif"],
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

fig = plt.figure(figsize=(10, 8.0))
# two independent GridSpecs (rather than one 6-row grid) so the gap *between*
# the two panel blocks can be tightened without disturbing the internal
# spacing within each block. Each block is now title -> strip -> trajectory,
# so the title introduces the scenario before the reader sees the strip.
gs_top = fig.add_gridspec(3, 1, height_ratios=[0.48, 0.16, 1], hspace=0.35, top=0.97, bottom=0.44)
gs_bot = fig.add_gridspec(3, 1, height_ratios=[0.48, 0.16, 1], hspace=0.35, top=0.50, bottom=0.02)

def title_block(ax, title, line1, line2):
    ax.axis("off")
    ax.set_ylim(0, 1)
    ax.text(0, 0.63, title, transform=ax.transAxes, fontsize=19, color=INK, va="top")
    ax.text(0, 0.28, line1, transform=ax.transAxes, fontsize=12, color=MUTE, va="top")
    ax.text(0, 0.05, line2, transform=ax.transAxes, fontsize=12, color=MUTE, va="top")

def env_strip(ax, state):
    ax.imshow(state[None, :], aspect="auto", cmap=ListedColormap([LO, HI]),
              extent=[0, T, 0, 1], interpolation="nearest", vmin=0, vmax=1)
    ax.set_xlim(0, T); ax.set_yticks([]); ax.set_xticks([])
    for s in ax.spines.values():
        s.set_visible(False)
    ax.text(-0.012, 0.5, "the hidden\nenvironment", ha="right", va="center",
            fontsize=12, color=MUTE, style="italic", linespacing=1.4,
            transform=ax.transAxes)

def traj(ax, x1, x2):
    ax.plot(td, x1[::K], color=C1, lw=2.6, solid_capstyle="round", solid_joinstyle="round")
    ax.plot(td, x2[::K], color=C2, lw=2.6, alpha=0.9, solid_capstyle="round", solid_joinstyle="round")
    ymax = max(np.abs(x1).max(), np.abs(x2).max()) * 1.15
    ax.set_xlim(0, T); ax.set_ylim(-ymax, ymax)
    ax.set_yticks([]); ax.set_xticks([])
    for side in ("top", "right", "left", "bottom"):
        ax.spines[side].set_visible(False)

# ---------------- panel 1: slow ----------------
ax_title1 = fig.add_subplot(gs_top[0])
title_block(ax_title1, "When the environment changes slowly",
            "Both follow the same jittering pattern because they share information through the environment.",
            "They look as if they are connected, even though they are not directly talking to each other.")

ax_e1 = fig.add_subplot(gs_top[1]); env_strip(ax_e1, sts)
ax_e1.text(1.45, -.5, "cold", ha="center", fontsize=12.5, color=COLD, style="italic")
ax_e1.text(4.78, -.5, "warm", ha="center", fontsize=12.5, color=WARM, style="italic")
ax_e1.text(7.58, -.5, "cold", ha="center", fontsize=12.5, color=COLD, style="italic")
ax_e1.text(10.32, -.5, "warm", ha="center", fontsize=12.5, color=WARM, style="italic")

ax_t1 = fig.add_subplot(gs_top[2])
traj(ax_t1, x1s, x2s)

# ax_t1.annotate("both calm here", xy=(1.6, -1.5), xytext=(1.6, -3.15),
#                ha="center", fontsize=12.5, color=MUTE,
#                arrowprops=dict(arrowstyle="-", color="#cfcfd4", lw=1.2))
# ax_t1.annotate("both agitated here", xy=(4.9, -2.6), xytext=(4.9, -3.15),
#                ha="center", fontsize=12.5, color=MUTE,
#                arrowprops=dict(arrowstyle="-", color="#cfcfd4", lw=1.2))

# ---------------- panel 2: fast ----------------
ax_title2 = fig.add_subplot(gs_bot[0])
title_block(ax_title2, "When the environment changes quickly",
            "The shared jittering averages out, and no information if shared through the hidden environment.",
            "Any information left now must be a signature of a real connection.")

ax_e2 = fig.add_subplot(gs_bot[1]); env_strip(ax_e2, stf)
# ax_e2.text(6.0, 1.5, "flickering too fast to matter", ha="center",
#            fontsize=12.5, color=MUTE, style="italic")

ax_t2 = fig.add_subplot(gs_bot[2])
traj(ax_t2, x1f, x2f)

# ax_t2.annotate("no shared rhythm left", xy=(6.0, -2.4), xytext=(6.0, -3.2),
#                ha="center", fontsize=12.5, color=MUTE,
#                arrowprops=dict(arrowstyle="-", color="#cfcfd4", lw=1.2))

ax_t2.plot([], [], color=C1, lw=3.2, label="system 1")
ax_t2.plot([], [], color=C2, lw=3.2, label="system 2")
leg = ax_t2.legend(frameon=False, loc="lower right", fontsize=13,
                   ncol=2, handlelength=1.3, columnspacing=1.6,
                   bbox_to_anchor=(1.0, -0.20))
for txt in leg.get_texts():
    txt.set_color(MUTE)

fig.savefig("../images/2026-07-29-plot.png", dpi=300,
            bbox_inches="tight", facecolor="white")
print("saved")