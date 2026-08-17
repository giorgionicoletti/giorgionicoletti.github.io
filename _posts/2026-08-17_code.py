"""
Blog figure - information interference (PRE 2022 / PRR 2024 / arXiv:2605.13556).

Two particles in a shared active bath, linearly coupled with strength g:

    tau x' = -x + g y + gamma eta(t) + sqrt(2 D tau) xi_x
    tau y' = -y + g x + gamma eta(t) + sqrt(2 D tau) xi_y

with the SAME Ornstein-Uhlenbeck eta in both equations (the shared "push"),
<eta(t)eta(t')> = D_eta exp(-|t-t'|/tau_eta).

In the symmetric/antisymmetric coordinates u=(x+y)/sqrt2, v=(x-y)/sqrt2 the
system decouples, so everything is exact:

    <u^2> = D/(1-g) + 2 D_gamma / [ (1-g)(1-g+b) ],   <v^2> = D/(1+g)

with D_gamma = gamma^2 D_eta and b = 1/tau_eta. Then <xy> = (<u^2>-<v^2>)/2,
and since the process is Gaussian the mutual information is exactly
I = -1/2 log(1 - rho^2).

The parameters below are chosen so that at g = -0.5 the bath-induced positive
correlation and the coupling-induced negative one cancel EXACTLY: <xy> = 0,
so the two particles are genuinely coupled, genuinely share an environment,
and are nonetheless perfectly independent. Same |g|, same bath, opposite sign
gives strong dependence instead.
"""
import numpy as np
import matplotlib.pyplot as plt

# ---------------- parameters (tuned for exact cancellation at g<0) ----------
tau     = 1.0
D       = 1.0
tau_eta = 1.0
b       = 1.0 / tau_eta
gamma   = 1.0
D_eta   = 2.5
D_gamma = gamma**2 * D_eta          # = 2.5
G_POS, G_NEG = 0.5, -0.5

# ---------------- exact stationary statistics -------------------------------
def moments(g, Dg):
    """Return (var_x, cov_xy) at stationarity."""
    au, av = 1.0 - g, 1.0 + g
    u2 = D / au + 2.0 * Dg / (au * (au + b))
    v2 = D / av
    return 0.5 * (u2 + v2), 0.5 * (u2 - v2)

def mutual_info(g, Dg):
    """Exact mutual information (nats) for the Gaussian stationary state."""
    var, cov = moments(g, Dg)
    rho = cov / var
    rho = min(max(rho, -0.999999), 0.999999)
    return -0.5 * np.log(1.0 - rho**2)

# sanity check: destructive case really does cancel
_v, _c = moments(G_NEG, D_gamma)
assert abs(_c) < 1e-12, f"expected exact cancellation, got cov={_c}"

# ---------------- trajectories ----------------------------------------------
dt, T = 0.002, 12.0
burn  = 30.0
n, nb = int(T / dt), int(burn / dt)
t = np.arange(n) * dt

rng = np.random.default_rng(7)
xi_x = rng.standard_normal(n + nb)
xi_y = rng.standard_normal(n + nb)
xi_e = rng.standard_normal(n + nb)

# shared bath: one single realisation, reused by both panels
eta = np.zeros(n + nb)
s_e = np.sqrt(2.0 * D_eta / tau_eta * dt)
for k in range(1, n + nb):
    eta[k] = eta[k-1] - eta[k-1] / tau_eta * dt + s_e * xi_e[k]

def simulate(g):
    x = np.zeros(n + nb); y = np.zeros(n + nb)
    s = np.sqrt(2.0 * D * dt / tau)
    for k in range(1, n + nb):
        x[k] = x[k-1] + (-x[k-1] + g * y[k-1] + gamma * eta[k-1]) * dt / tau + s * xi_x[k]
        y[k] = y[k-1] + (-y[k-1] + g * x[k-1] + gamma * eta[k-1]) * dt / tau + s * xi_y[k]
    return x[nb:], y[nb:]

xa, ya = simulate(G_POS)   # agree
xd, yd = simulate(G_NEG)   # disagree

K = 10
td = t[::K]

# ---------------- palette (same family as the previous post) ----------------
INK   = "#16161a"
MUTE  = "#9a9aa2"
C1    = "#c9922c"   # particle 1
C2    = "#2f6b52"   # particle 2
WARM  = "#9e1910"   # "both together" bar
BAR1  = "#8fa2ae"   # connection alone
BAR2  = "#d8c3ba"   # room alone

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif"],
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

# Narrower than it looks like it wants to be, on purpose: on a phone the text
# renders at fontsize / figure-width-inches, so 7in is ~40% larger type than 10in.
# Each block is title+subtitle (1.3in) over plots (1.7in) = 3.0in, separated by
# a 0.9in gap. That gap has to beat every gap *inside* a block — including the
# bar tick labels, which hang below their axes — or the two panels don't read
# as two panels.
fig = plt.figure(figsize=(7.2, 7.4))
gs_top = fig.add_gridspec(2, 2, height_ratios=[1.3, 1.7], width_ratios=[1, 0.56],
                          hspace=-0.36, wspace=0.30, top=1.0, bottom=0.695)
gs_bot = fig.add_gridspec(2, 2, height_ratios=[1.3, 1.7], width_ratios=[1, 0.56],
                          hspace=-0.36, wspace=0.30, top=0.603, bottom=0.298)

def title_block(ax, title, p1, p2, *lines):
    """Title plus short subtitle lines, set as one tightly-led block.

    Short lines matter: the narrower the widest text, the narrower the figure
    can be, and text size on a phone scales as fontsize / figure-width-inches.
    Title and subtitle sit close together on purpose — the gap *between* the
    two panels has to be the biggest gap in the figure, or the grouping reads
    wrong.
    """
    ax.axis("off"); ax.set_ylim(0, 1)
    ax.text(0, p1, title, transform=ax.transAxes, fontsize=19, color=INK, va="top")
    ax.text(0, p2, "\n".join(lines), transform=ax.transAxes,
            fontsize=11, color=MUTE, va="top", linespacing=1.4)

def traj(ax, x1, x2):
    ax.patch.set_visible(False)   # don't paint over text spilling from the title axes
    ax.plot(td, x1[::K], color=C1, lw=2.4, solid_capstyle="round")
    ax.plot(td, x2[::K], color=C2, lw=2.4, alpha=0.9, solid_capstyle="round")
    # from the subsampled data actually drawn, so the curve really does reach
    # the limit and no phantom headroom opens up under the subtitle
    m = max(np.abs(x1[::K]).max(), np.abs(x2[::K]).max()) * 1.04
    ax.set_xlim(0, T); ax.set_ylim(-m, m)
    ax.set_xticks([]); ax.set_yticks([])
    for s in ax.spines.values():
        s.set_visible(False)

def bars(ax, g, ymax):
    ax.patch.set_visible(False)   # same reason as in traj()
    i_con = mutual_info(g, 0.0)          # connection alone, no bath
    i_env = mutual_info(0.0, D_gamma)    # bath alone, no connection
    i_tot = mutual_info(g, D_gamma)      # both together
    ax.bar([0, 1, 2], [i_con, i_env, i_tot], width=0.58,
           color=[BAR1, BAR2, WARM], zorder=3)
    ax.axhline(i_con + i_env, color=MUTE, lw=1.1, ls=(0, (4, 3)), zorder=2)
    ax.text(-0.55, i_con + i_env - 0.03 * ymax, "if they added up",
            ha="left", va="top", fontsize=8.5, color=MUTE, style="italic")
    # a zero bar must read as "exactly nothing", not as a missing bar
    if i_tot < 1e-9:
        ax.plot([2 - 0.29, 2 + 0.29], [0, 0], color=WARM, lw=3.0,
                solid_capstyle="butt", zorder=4)
        ax.text(2.0, 0.035 * ymax, "exactly zero", ha="center", va="bottom",
                fontsize=9.5, color=WARM, style="italic")
    ax.set_xlim(-0.62, 2.62); ax.set_ylim(0, ymax)
    ax.set_xticks([0, 1, 2])
    ax.set_xticklabels(["connection", "room", "both"], fontsize=8.5, color=MUTE)
    ax.tick_params(axis="x", length=0, pad=7)
    ax.set_yticks([])
    for side in ("top", "right", "left"):
        ax.spines[side].set_visible(False)
    ax.spines["bottom"].set_color("#dcdce0")
    ax.set_ylabel("information", fontsize=10, color=MUTE, style="italic", labelpad=8)
    return i_tot

ymax = mutual_info(G_POS, D_gamma) * 1.22

# ---------------- panel 1: they agree ---------------------------------------
title_block(fig.add_subplot(gs_top[0, :]),
            "When the two causes agree",
            1.0, 0.75,
            "The interaction pulls the particles together and the room does the same.",
            "Together they carry far more information than they would alone."
            )
ax_t1 = fig.add_subplot(gs_top[1, 0])
ax_b1 = fig.add_subplot(gs_top[1, 1])
traj(ax_t1, xa, ya)
bars(ax_b1, G_POS, ymax)

# ---------------- panel 2: they disagree ------------------------------------
ax_tx2 = fig.add_subplot(gs_bot[0, :])
title_block(ax_tx2,
            "When they disagree",
            1.0, 0.75,
            "Same as above, except that now the interaction pushes the particles apart.",
            "The two sources of information cancel, leaving the particles independent."
            )
ax_t2 = fig.add_subplot(gs_bot[1, 0])
ax_b2 = fig.add_subplot(gs_bot[1, 1])
traj(ax_t2, xd, yd)
bars(ax_b2, G_NEG, ymax)

ax_t2.plot([], [], color=C1, lw=3.0, label="particle 1")
ax_t2.plot([], [], color=C2, lw=3.0, label="particle 2")
leg = ax_t2.legend(frameon=False, loc="upper center", fontsize=12, ncol=2,
                   handlelength=1.3, columnspacing=1.8, bbox_to_anchor=(0.5, -0.02))
for txt in leg.get_texts():
    txt.set_color(MUTE)

ax_t1.set_position([ax_t1.get_position().x0, ax_t1.get_position().y0 + 0.01,
                    ax_t1.get_position().width, 1.7 / 7.4])
ax_b1.set_position([ax_b1.get_position().x0, ax_b1.get_position().y0 + 0.01,
                    ax_b1.get_position().width, 1.7 / 7.4])

ax_t2.set_position([ax_t2.get_position().x0, ax_t2.get_position().y0 + 0.01,
                    ax_t2.get_position().width, 1.7 / 7.4])
ax_b2.set_position([ax_b2.get_position().x0, ax_b2.get_position().y0 + 0.01,
                    ax_b2.get_position().width, 1.7 / 7.4])
ax_tx2.set_position([ax_tx2.get_position().x0, ax_tx2.get_position().y0 + 0.02,
                     ax_tx2.get_position().width, 1.3 / 7.4])
fig.savefig("../images/2026-08-17-plot.png", dpi=300,
            bbox_inches="tight", facecolor="white")

print("saved")
print(f"  agree   (g={G_POS:+.2f}): I_con={mutual_info(G_POS,0):.4f}  "
      f"I_env={mutual_info(0,D_gamma):.4f}  I_both={mutual_info(G_POS,D_gamma):.4f}")
print(f"  disagree(g={G_NEG:+.2f}): I_con={mutual_info(G_NEG,0):.4f}  "
      f"I_env={mutual_info(0,D_gamma):.4f}  I_both={mutual_info(G_NEG,D_gamma):.4f}")
