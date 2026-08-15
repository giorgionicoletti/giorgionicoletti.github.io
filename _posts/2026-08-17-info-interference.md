---
title: 'Adding up, or getting in the way?'
date: 2026-08-17
permalink: /posts/2026/08/17/info-interference/
published: true
tags:
  - information theory
  - stochastic processes
  - statistical physics
excerpt: 'Let''s get back to where we left off and keep in mind our two examples: two particles in a room, each being pushed around by the same environment, but also connected to each other; or two people, each hearing the same news cycle, but also talking to each other. The question was whether you could tell the difference between the two sources of correlation: the environment and the connection. And the answer was yes, if the connection is simple enough. But what makes a connection "simple enough"? And what happens when it isn''t?'
---

*This post is about two papers: [Mutual information in changing environments](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.106.014153){:target="_blank"}, published in **Physical Review E** in 2022, and [Information interference driven by environmental activity](https://journals.aps.org/prresearch/abstract/10.1103/PhysRevResearch.6.043275){:target="_blank"}, published in **Physical Review Research** in 2024.*

Let's get back to [where we left off]({{ site.baseurl }}/posts/2026/07/29/mi-prl/){:target="_blank"} and keep in mind our two examples: two particles in a room, each being pushed around by the same environment, but also connected to each other; or two people, each hearing the same news cycle, but also talking to each other. The question was whether you could tell the difference between the two sources of correlation: the environment and the connection. And the answer was yes, if the connection is simple enough. But what makes a connection "simple enough"? And what happens when it isn't?

It took us two papers to sort this out (and more are coming up), and it turned out to be a far richer question than the one we started from.

## What kind of connection?
Let's start with our two dust particles in a room. Suppose that there is a spring tied between them that can stretch and compress as much as you like. A spring behaves in a very simple way: pull one particle away from the other, and the spring pulls it back. Now, pull it twice as far, and the pull back will be twice as strong; ten times as far, a ten times stronger pull. You get the gist: the response is always in exact proportion to the pull. This is what physicists call a *linear* interaction. 

Now swap the spring for a rope. At first nothing changes — pull gently, and the other particle follows along just as before. But once the rope goes taut, pulling harder does nothing at all because the response eventually hits a ceiling. This is an example of a *nonlinear* interaction, and it is what nearly everything in the real world actually does. Think of a neuron that is already firing as fast as it can, and thus cannot fire faster. Or a gene fully switched on that cannot switch on further. In our social example, a person already as anxious as one can be will not get more anxious because the news gets worse.

Everything in the paper explained in the [last post]({{ site.baseurl }}/posts/2026/07/29/mi-prl/){:target="_blank"} lived in the spring world. And a second assumption was hiding in there just as quietly: that the room was only setting a temperature, deciding how violently both particles jitter, rather than pushing them around itself. Let go of either one and the tidy separation falls apart.

## When two causes fight
Think about our two people again. Two things are moving their moods in possibly different directions. The news pushes both the same way at the same time: let's say that it has been a great week, and their mood improves when they hear about it. But their relation also has a direction which can go either way. Say they are good friends: if one is happy, the other will tend to be happy too, and their friendship is pulling the same way the news is. However, they could also be competing with each other: one maybe has gotten a promotion, and the other is jealous. Then, for the jealous one the relationship is pushing *against* the news and the two effects disagree.

It works the same way for the particles. The shared environment shoves both of them the same way at the same time, but the connection between them can either pull them together, agreeing with the room, or push them apart, working against it. So we have two different scenarios. When the environment and the connection agree, they reinforce each other, and you end up with a pair that looks *more* tightly bound than either cause alone could account for. When they disagree, they eat into each other, and you see *less* dependence than the connection alone would have produced: the environment can erase the evidence of a connection that is genuinely there.

Push that disagreement to exactly the right point, and the two effects cancel out completely. Two friends who genuinely rely on each other, living through the same hard week, whose moods look entirely unrelated from the outside. Two particles that really are connected, sitting in the same environment, and yet perfectly independent: measure one, and you learn absolutely nothing about the other.

We called this *information interference*, and it turns the problem from the last post upside down. There, the danger was inferring a whole network of connections that isn't there, a map of friendships between people who have never met. Here it is exactly the opposite: the same map, with the real friendships left off it. And here is the surprising part: in the world of the last post, this can only happen once the connection is nonlinear. As long as it stays linear, the two effects add up cleanly, and the environment can never hide a connection that is really there.

<a href="/images/2026-08-17-plot.png"><img src="/images/2026-08-17-plot.png" style="display:block;width:100%;max-width:560px;margin:0 auto;" alt="Two particles sharing an environment: when the connection and the environment agree they carry far more information together than separately, and when they disagree they cancel exactly, leaving the particles looking independent"></a>


## Hiding a connection, or enhancing it
Once the interaction becomes nonlinear, the nature of the information shared between the two people changes. The two sources of information, the news cycle and the connection between them, no longer add up cleanly, and interference can drastically change the total.

But there is also another route to interference, which is quite relevant from a physical perspective. We can leave the connection simple, but make the environment itself more complicated. Imagine a room where the temperature is constant, but the air is moving around in a turbulent way and shoves the particles around with the same fluctuating force. In this environment, even with a simple spring between the particles, information stops adding up, and whether the connection ends up boosted or hidden is decided by nothing more than whether that spring pulls the two together or pushes them apart.

**Why it's useful.** Interference isn't only a nuisance, because it carries information of its own. Its sign tells you whether a connection is attractive or repulsive. Something that started out as an obstacle to measuring interactions ended up being a way to measure things that are otherwise quite hard to get at.

This is, in a sense, what modelling is for. You start from the simplest world you can get away with — a spring, a room that does nothing but set a temperature — not because you believe it, but because it is the one you can actually solve. Then you take the assumptions away one at a time and see what survives. Whatever still holds was never leaning on that assumption in the first place, and whatever falls apart tells you exactly which piece of the simplification had been doing the work all along. The clean separation from the last post, it turns out, was the second kind.

There is a third assumption still standing underneath all of this, by the way: that the random kicks the two particles receive have nothing to do with each other. Very often they do — think of two particles suspended in the same fluid, where moving one drags the fluid and nudges the other. We have been working on that too, but it is [still a preprint](https://arxiv.org/abs/2605.13556){:target="_blank"}, so it's a story for another time.

<!-- read-time-cutoff -->

## Some technical details

Take the setup of the [last post]({{ site.baseurl }}/posts/2026/07/29/mi-prl/) and write the interactions through a potential,

$$
V(x_1,x_2) = \sum_\mu U(x_\mu) + V_\text{int}(x_1,x_2), \qquad F_\mu = -\partial_\mu V,
$$

with the environment switching the diffusion coefficient between discrete values $$D_i$$ at rates $$W_{i\to j}$$. At fixed environment the stationary distribution is Boltzmann-like, $$P^\text{st}_i(\mathbf{x}) \propto e^{-V(\mathbf{x})/D_i}$$, and in the slow-switching limit the system sits in a *mixture* over environmental states, $$p_\text{slow}(\mathbf{x}) = \sum_i \pi_i P_i^\text{st}(\mathbf{x})$$. The mutual information then splits as

$$
I = I_\text{env} + I_\text{int} + \Xi ,
$$

where $$I_\text{env}$$ depends only on the environmental parameters, $$I_\text{int}$$ only on the interaction parameters, and $$\Xi$$ — the information interference — on both. $$\Xi$$ is not itself a mutual information and carries no fixed sign. It is bounded by the entropy of the switching process,

$$
\sum_i \pi_i I^i_{12} - H_\text{jumps} \;\le\; I_{12} \;\le\; \sum_i \pi_i I^i_{12} + 2H_\text{jumps},
$$

and the reason linear interactions are special is that they make every $$P^\text{st}_i$$ Gaussian, for which these bounds are saturated exactly and $$\Xi$$ vanishes. A nonlinear potential — a quartic $$U$$, say — makes the components non-Gaussian, the saturation is lost, and $$\Xi \ne 0$$. Its sign depends on whether the interaction and the environment reshape the distribution along the same directions or along different ones. The same paper also treats multiplicative noise, $$\dot x_\mu = -x_\mu/\tau + \gamma_{i(t)}\sqrt{2T(x_\mu)}\,\xi_\mu$$ with $$T(x_\mu) = T_0 + x_\mu \Delta T$$, which breaks detailed balance and increases the environmental information with the size of the non-equilibrium term; and it shows that a continuously varying environment can be integrated out into an effective space-dependent diffusion coefficient $$\hat D^2(\mathbf{x}) = \int dD\, D^2 p(D\vert \mathbf{x})$$, i.e. an effective inhomogeneous medium rather than an effective coupling.

The second paper replaces the switching temperature with a shared active bath entering additively,

$$
\tau \dot x = -x + g F_x(x,y) + \sqrt{2D_x\tau}\,\xi_x(t) + \gamma\,\eta(t), \qquad
\tau \dot y = -y + g F_y(x,y) + \sqrt{2D_y\tau}\,\xi_y(t) + \gamma\,\eta(t),
$$

with the *same* $$\eta$$ in both equations, an Ornstein–Uhlenbeck process with $$\langle \eta(t)\eta(t')\rangle = D_\eta e^{-\vert t-t'\vert/\tau_\eta}$$. The relevant control parameters are the timescale ratio $$\alpha = \tau_\eta/\tau$$ and $$D_\gamma = D_\eta\gamma^2$$. For linear interactions, $$F_x = y$$ and $$F_y = x$$, the problem is solvable and the sign of $$\Xi_{xy}$$ follows the sign of $$g$$: the shared bath correlates the particles positively, so $$g>0$$ reinforces it and $$g<0$$ opposes it, with a critical $$\alpha$$ at which $$\Xi_{xy}$$ exactly cancels $$I^\text{int}_{xy} + I^\text{env}_{xy}$$ and the total mutual information vanishes. For $$F_x = \tanh(y)$$, $$F_y = \tanh(x)$$ this no longer holds: the tanh saturates at large $$\vert g\vert$$, reducing the interactions to constant drifts, while $$I^\text{env}_{xy}$$ keeps growing with $$\alpha$$ — so the interference can change sign as a function of the timescales even at fixed $$g>0$$.

---

[Phys. Rev. E 106, 014153 (2022)](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.106.014153){:target="_blank"} · [Phys. Rev. Research 6, 043275 (2024)](https://journals.aps.org/prresearch/abstract/10.1103/PhysRevResearch.6.043275){:target="_blank"}
