"""
Blog figure - critical signatures without criticality (Front. Syst. Neurosci.
2021 / Sci. Rep. 2022).

A genuine simulation of the extrinsic mechanism from the Sci. Rep. paper,
in its simplest form: N units that never interact, each an Ornstein-Uhlenbeck
process, all driven by the SAME slowly wandering noise amplitude D(t)
(an OU process reflected at a floor D*, with timescale gamma_D >> 1):

    v_i' = -v_i + sqrt(2 D(t)) xi_i(t)         (independent units)
    D'   = -D/gamma_D + sqrt(theta) xi_D(t),   D >= D*   (shared, slow)

Events are upward threshold crossings; avalanches are runs of consecutive
occupied time bins (bin = mean inter-event interval), as in the papers.
The avalanche size distribution comes out a power law over ~3 decades with
no interactions anywhere - which is the point. The guide line's slope is
fitted to the simulated distribution, not drawn by hand.
"""
import numpy as np
import matplotlib.pyplot as plt

# ---------------- simulation ------------------------------------------------
# The drive reverts toward a level BELOW its floor, so it spends most of the
# time pinned at the floor (units silent: sigma there is 0.17 against a
# threshold of 2.2) and rises above it only in occasional excursions - the
# storms, during which sigma reaches ~1-2 and events ignite everywhere at
# once. This is the low-floor regime of the paper, where the extrinsic
# modulation generates the avalanches.
dt      = 0.05
T_tot   = 60000.0
n       = int(T_tot / dt)
N       = 40
gamma_D = 100.0
theta   = 0.08
mu_D    = -1.5
D_floor = 0.03
thresh  = 2.2

rng = np.random.default_rng(3)

# shared slow drive, clamped at the floor
D = np.empty(n)
D[0] = D_floor
xi_D = rng.standard_normal(n) * np.sqrt(theta * dt)
for k in range(1, n):
    d = D[k-1] - (D[k-1] - mu_D) / gamma_D * dt + xi_D[k]
    D[k] = d if d > D_floor else D_floor

# independent units listening to it
v = np.zeros(N)
events = []                       # (time index, unit) of upward crossings
raster = [[] for _ in range(N)]
amp = np.sqrt(2.0 * dt) * np.sqrt(D)
for k in range(1, n):
    v_new = v - v * dt + amp[k] * rng.standard_normal(N)
    crossed = np.flatnonzero((v < thresh) & (v_new >= thresh))
    for i in crossed:
        events.append(k)
        raster[i].append(k * dt)
    v = v_new
events = np.array(events)
print(f"{events.size} events")

# ---------------- avalanches ------------------------------------------------
t_ev = np.sort(events) * dt
iei = np.diff(t_ev)
bin_w = iei.mean()
bins = np.floor(t_ev / bin_w).astype(int)
occupied, counts = np.unique(bins, return_counts=True)
sizes = []
start = 0
for j in range(1, len(occupied) + 1):
    if j == len(occupied) or occupied[j] != occupied[j-1] + 1:
        sizes.append(counts[start:j].sum())
        start = j
sizes = np.array(sizes)
print(f"{sizes.size} avalanches, max size {sizes.max()}")

# log-binned distribution + fitted slope for the guide line
edges = np.unique(np.round(np.logspace(0, np.log10(sizes.max()), 25)))
hist, _ = np.histogram(sizes, bins=edges)
widths = np.diff(edges)
centers = np.sqrt(edges[:-1] * edges[1:])
dens = hist / widths / sizes.size
keep = dens > 0
xs, ys = centers[keep], dens[keep]
fit_sel = (xs >= 3) & (xs <= sizes.max() / 10)
slope, inter = np.polyfit(np.log10(xs[fit_sel]), np.log10(ys[fit_sel]), 1)
print(f"fitted slope: {slope:.2f}")
for a, b in zip(xs, ys):
    print(f"  S={a:8.1f}  P={b:.2e}")

# ---------------- raster window: quiet stretch + a storm --------------------
# the window has to tell the story on its own: a long stretch with the drive
# pinned at its floor (column nearly silent) and at least one strong storm
w_len = 400.0
nw = int(w_len / dt)
print(f"drive: max {D.max():.2f}, clamped fraction {np.mean(D <= 1.5 * D_floor):.2f}")
best, best_score = 2000.0, -1.0
for k0 in range(int(2000 / dt), n - nw, int(25 / dt)):
    seg = D[k0:k0 + nw]
    # a strong storm well inside the window, surrounded by real silence
    peak_pos = seg.argmax() / nw
    storm = min(seg.max() / 2.5, 1.0) if 0.2 < peak_pos < 0.8 else 0.0
    score = 2.0 * storm + (seg < 0.5).mean()
    if score > best_score:
        best, best_score = k0 * dt, score
w0 = best
seg = D[int(w0 / dt):int(w0 / dt) + nw]
print(f"raster window t={w0:.0f}: max {seg.max():.2f}, "
      f"silent fraction {(seg < 0.5).mean():.2f}")

# ---------------- palette (same family as the previous posts) ----------------
INK   = "#16161a"
MUTE  = "#9a9aa2"
C1    = "#c9922c"   # activity / events
C2    = "#2f6b52"   # the slow shared drive
WARM  = "#9e1910"   # the power law

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif"],
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

# title rows are sized for a one-line subtitle: title + one line + a small gap
fig = plt.figure(figsize=(7.2, 5.9))
gs_top = fig.add_gridspec(3, 1, height_ratios=[0.72, 0.5, 1.45], hspace=0.18,
                          top=1.0, bottom=0.58, left=0.06, right=0.97)
gs_bot = fig.add_gridspec(2, 2, height_ratios=[0.72, 1.75], width_ratios=[1, 0.62],
                          hspace=0.18, wspace=0.32,
                          top=0.475, bottom=0.075, left=0.06, right=0.97)

def title_block(ax, title, *lines):
    ax.axis("off")
    ax.text(0, 1.0, title, transform=ax.transAxes, fontsize=19, color=INK, va="top")
    ax.text(0, 0.40, "\n".join(lines), transform=ax.transAxes,
            fontsize=11, color=MUTE, va="top", linespacing=1.4)

def clean(ax):
    ax.patch.set_visible(False)
    ax.set_xticks([]); ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)

# ---------------- top block: drive + raster ----------------------------------
title_block(fig.add_subplot(gs_top[0]),
            "One slow shared drive with no interactions",
            "Every neuron ignores all the others and listens only to a common input")

kk0, kk1 = int(w0 / dt), int((w0 + w_len) / dt)
ax_d = fig.add_subplot(gs_top[1]); clean(ax_d)
tt = np.arange(kk0, kk1, 5) * dt
ax_d.plot(tt, D[kk0:kk1:5], color=C2, lw=2.0, solid_capstyle="round")
dmax = D[kk0:kk1].max()
ax_d.set_xlim(w0, w0 + w_len)
ax_d.set_ylim(-0.04 * dmax, dmax * 1.55)
ax_d.text(w0, dmax * 1.52, "the shared drive", ha="left", va="top",
          fontsize=11, color=C2, style="italic")

ax_r = fig.add_subplot(gs_top[2]); clean(ax_r)
for i in range(N):
    ts = [t for t in raster[i] if w0 <= t < w0 + w_len]
    ax_r.vlines(ts, i + 0.18, i + 0.82, color=C1, lw=0.9, alpha=0.9)
ax_r.set_xlim(w0, w0 + w_len); ax_r.set_ylim(0, N)
ax_r.text(w0, -1.2, "each row is one neuron", ha="left", va="top",
          fontsize=9.5, color=MUTE, style="italic")

# ---------------- bottom block: the size distribution -------------------------
title_block(fig.add_subplot(gs_bot[0, :]),
            "Critical-looking avalanches vs correlations",
            "Cascade sizes follow a power law, but correlations need interactions")

ax_p = fig.add_subplot(gs_bot[1, 0])
ax_p.patch.set_visible(False)
ax_p.loglog(xs, ys, "o", color=C1, ms=5.5, zorder=3)
guide_x = np.array([2.0, 600.0])
guide_y = 10 ** (inter + 0.45) * guide_x ** slope
ax_p.loglog(guide_x, guide_y, ls=(0, (4, 3)), color=WARM, lw=1.6, zorder=2)
ax_p.text(0.04, 0.06, "a power law without typical size", transform=ax_p.transAxes,
          ha="left", va="bottom", fontsize=10.5, color=WARM, style="italic")
ax_p.set_xlabel("avalanche size (logarithmic scale)", fontsize=10, color=MUTE, style="italic")
ax_p.set_ylabel("frequency", fontsize=10, color=MUTE, style="italic")
ax_p.set_yticks([])
ax_p.set_xticks([1, 10, 100, 1000])
ax_p.set_xticklabels(["1", "10", "100", "1000"], fontsize=9, color=MUTE)
ax_p.tick_params(axis="x", length=0, pad=5)
ax_p.minorticks_off()
for side in ("top", "right"):
    ax_p.spines[side].set_visible(False)
for side in ("bottom", "left"):
    ax_p.spines[side].set_color("#dcdce0")

# ---------------- the other fingerprint: correlations need interactions -------
# Exact stationary correlation coefficient between two units at distance r
# on a chain, from the Lyapunov equation of the same OU model. Without
# interactions it is exactly zero for every r > 0, however the shared drive
# behaves: v_i and v_j are conditionally independent given D(t), and a common
# rescaling of independent noises creates no cross-correlation. (The
# coefficient does not depend on D, so the slow modulation drops out.)
def corr_vs_distance(w, n_units=40, rmax=6):
    Wm = np.zeros((n_units, n_units))
    for i in range(n_units - 1):
        Wm[i, i + 1] = Wm[i + 1, i] = w
    A = np.eye(n_units) - Wm                 # relaxation matrix, symmetric
    S = np.linalg.inv(A)                      # covariance up to the factor D
    c = n_units // 2
    return np.array([S[c, c + r] / np.sqrt(S[c, c] * S[c + r, c + r])
                     for r in range(1, rmax + 1)])

rr = np.arange(1, 7)
corr_none = corr_vs_distance(0.0)
corr_int = corr_vs_distance(0.45)
print("correlation vs distance, no interactions:", np.round(corr_none, 4))
print("correlation vs distance, with interactions:", np.round(corr_int, 3))

ax_c = fig.add_subplot(gs_bot[1, 1])
ax_c.patch.set_visible(False)
ax_c.plot(rr, corr_int, "-o", color=C1, lw=1.8, ms=5, zorder=3)
ax_c.plot(rr, corr_none, "-o", color=MUTE, lw=1.4, ms=4.5, zorder=3)
ax_c.text(1.25, corr_int[0] + 0.04, "with interactions", ha="left", va="bottom",
          fontsize=9.5, color=C1, style="italic")
ax_c.text(1.15, 0.06, "drive only", ha="left", va="bottom",
          fontsize=9.5, color=MUTE, style="italic")
ax_c.set_xlim(0.6, 6.4); ax_c.set_ylim(-0.06, .75)
ax_c.set_xticks([1, 3, 6]); ax_c.set_xticklabels(["1", "3", "6"], fontsize=9, color=MUTE)
ax_c.tick_params(axis="x", length=0, pad=5)
ax_c.set_yticks([])
ax_c.set_xlabel("distance between neurons", fontsize=10, color=MUTE, style="italic")
ax_c.set_ylabel("correlation", fontsize=10, color=MUTE, style="italic")
for side in ("top", "right"):
    ax_c.spines[side].set_visible(False)
for side in ("bottom", "left"):
    ax_c.spines[side].set_color("#dcdce0")

fig.savefig("../images/2026-09-14-plot.png", dpi=300,
            bbox_inches="tight", facecolor="white")
print("saved")
