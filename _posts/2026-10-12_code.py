"""
Blog figure - habituation and information gain (eLife 13:RP99767, 2025).

QUALITATIVE illustration, not the paper's actual computation. The paper solves
a four-variable master equation (readout, receptor, storage, signal); here a
deterministic caricature with the same architecture generates the top panel:

    tau_u u' = -u + h(t) * exp(-k_fb * s)      (fast response, damped by memory)
    tau_s s' = -s + c * u                      (slow memory, fed by the response)

with h(t) a train of identical pulses. The fading peaks and the slow memory
build-up are genuine dynamics of this loop. The information curve in the
bottom panel is a schematic rendering of the paper's result (mutual
information between response and signal increases under repeated stimulation,
growing fastest at the onset of habituation) - it is drawn, not computed.
The response curve in the bottom panel is the actual peak heights from the
top panel.
"""
import numpy as np
import matplotlib.pyplot as plt

# ---------------- caricature dynamics ---------------------------------------
dt, T = 0.001, 12.2
n = int(T / dt)
t = np.arange(n) * dt

N_STIM, PERIOD, WIDTH, T0 = 9, 1.25, 0.45, 0.5
h = np.zeros(n)
starts = [T0 + k * PERIOD for k in range(N_STIM)]
for s0 in starts:
    h[(t >= s0) & (t < s0 + WIDTH)] = 1.0

# slow memory spread over many stimuli, so the decline is gradual rather than
# one big drop between the first two responses
tau_u, tau_s = 0.11, 9.0
k_fb, c = 1.7, 5.0

u = np.zeros(n)
s = np.zeros(n)
for k in range(1, n):
    u[k] = u[k-1] + (-u[k-1] + h[k-1] * np.exp(-k_fb * s[k-1])) * dt / tau_u
    s[k] = s[k-1] + (-s[k-1] + c * u[k-1]) * dt / tau_s

# per-stimulus peak response (for the bottom panel)
peaks = []
for s0 in starts:
    w = (t >= s0) & (t < s0 + PERIOD)
    peaks.append(u[w].max())
peaks = np.array(peaks) / peaks[0]
print("peak responses:", np.round(peaks, 3))

# schematic information curve: rises with repetition, steepest at the onset
ns = np.linspace(1, N_STIM, 300)
info = 0.15 + 0.85 / (1.0 + np.exp(-(ns - 3.2) / 1.1))
info_lo = 0.15 + 0.85 / (1.0 + np.exp((1 - 3.2) / 1.1))

# ---------------- palette (same family as the previous posts) ----------------
INK   = "#16161a"
MUTE  = "#9a9aa2"
C1    = "#c9922c"   # response
C2    = "#2f6b52"   # memory
WARM  = "#9e1910"   # information

plt.rcParams.update({
    "font.family": "serif",
    "font.serif": ["DejaVu Serif"],
    "figure.facecolor": "white",
    "axes.facecolor": "white",
})

# Same sizing logic as the previous figure: keep the figure narrow so text
# stays legible on a phone, cap the display width in the post's HTML instead.
# The gap between the two blocks must beat every gap inside a block.
fig = plt.figure(figsize=(7.2, 6.2))
gs_top = fig.add_gridspec(2, 1, height_ratios=[1.0, 1.75], hspace=0.01,
                          top=1.0, bottom=0.60, left=0.06, right=0.97)
gs_bot = fig.add_gridspec(2, 1, height_ratios=[1.0, 1.75], hspace=0.05,
                          top=0.525, bottom=0.145, left=0.06, right=0.97)

def title_block(ax, title, *lines):
    ax.axis("off")
    ax.text(0, 1.0, title, transform=ax.transAxes, fontsize=19, color=INK, va="top")
    ax.text(0, 0.68, "\n".join(lines), transform=ax.transAxes,
            fontsize=11, color=MUTE, va="top", linespacing=1.4)

def clean(ax):
    ax.patch.set_visible(False)
    ax.set_xticks([]); ax.set_yticks([])
    for sp in ax.spines.values():
        sp.set_visible(False)

# ---------------- top block: the dynamics ------------------------------------
title_block(fig.add_subplot(gs_top[0]),
            "Getting used to a stimulus",
            "The same stimulus arrives again and again, triggering the build-up of a slow internal",
            "memory andcausing the response to shrink a little each time, leading to habituation.")

ax1 = fig.add_subplot(gs_top[1])
clean(ax1)
# stimulus train, small and muted at the bottom
ax1.fill_between(t, -0.32, -0.32 + 0.16 * h, color=MUTE, alpha=0.45, lw=0)
ax1.plot(t, u, color=C1, lw=2.4, solid_capstyle="round")
ax1.plot(t, s / s.max() * 0.75, color=C2, lw=2.4, alpha=0.9,
         solid_capstyle="round")
ax1.set_xlim(0, T); ax1.set_ylim(-0.36, 1.12)
ax1.text(starts[0] + WIDTH / 2, -0.36, "stimulus", ha="left", va="top",
         fontsize=10, color=MUTE, style="italic")
ax1.text(starts[0] + WIDTH + 0.12, 0.99, "response", ha="left", va="center",
         fontsize=11, color=C1, style="italic")
ax1.text(T - 0.1, s[-1] / s.max() * 0.75 + 0.14, "slow memory", ha="right",
         va="bottom", fontsize=11, color=C2, style="italic")

# ---------------- bottom block: response vs information ----------------------
title_block(fig.add_subplot(gs_bot[0]),
            "What the system knows about it",
            "As the system habituates, the information the system holds about the signal grows",
            "despite the decreasing response.")

ax2 = fig.add_subplot(gs_bot[1])
clean(ax2)
nn = np.arange(1, N_STIM + 1)
ax2.plot(nn, peaks, color=C1, lw=1.4, alpha=0.6, zorder=2)
ax2.plot(nn, peaks, "o", color=C1, ms=6.5, zorder=3)
ax2.plot(ns, info, color=WARM, lw=2.6, solid_capstyle="round", zorder=3)
ax2.set_xlim(0.4, N_STIM + 0.6); ax2.set_ylim(-0.16, 1.22)
ax2.text(5.8, np.interp(5.8, nn, peaks) - 0.09, "strength of the response",
         ha="left", va="top", fontsize=11, color=C1, style="italic")
ax2.text(9.35, np.interp(9.0, ns, info) + 0.08, "information about the signal",
         ha="right", va="bottom", fontsize=11, color=WARM, style="italic")
# stimulus boxes (same duty cycle as the top panel) and counter below them
y0, y1 = ax2.get_ylim()
ylo1, yhi1 = ax1.get_ylim()
# same box geometry as the top panel, as fractions of the axes
bw = WIDTH / T * (N_STIM + 0.2)
# convert through axes heights so the boxes have the same size in inches
hr = ax1.get_position().height / ax2.get_position().height
bh = 0.16 / (yhi1 - ylo1) * hr * (y1 - y0)
b0 = y0 + (-0.32 - ylo1) / (yhi1 - ylo1) * hr * (y1 - y0)
ax2.bar(nn, bh, width=bw, bottom=b0, color=MUTE, alpha=0.45, lw=0)
for k in nn:
    ax2.text(k, -0.19, str(k), ha="center", va="top", fontsize=9, color=MUTE)
ax2.text((1 + N_STIM) / 2, -0.35, "stimulus number", ha="center", va="top",
         fontsize=10, color=MUTE, style="italic")

# pull each plot up towards its subtitle without changing its size
for ax in (ax1, ax2):
    p = ax.get_position()
    ax.set_position([p.x0, p.y0 + 0.03, p.width, p.height])

fig.savefig("../images/2026-10-12-plot.png", dpi=300,
            bbox_inches="tight", facecolor="white")
print("saved")
