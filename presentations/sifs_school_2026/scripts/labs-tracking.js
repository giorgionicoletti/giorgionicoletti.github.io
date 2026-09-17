/* The lecture’s OU/readout model. Curves are exact stationary results;
 * traces use fixed Wiener increments and a convergence-checked fine grid. */
(() => {
  'use strict';
  const MIN_RATIO = 10 ** -1.5;
  const MAX_RATIO = 10;
  const DT = 0.00025;
  const BURN = 120;
  const DURATION = 16;
  const STRIDE = 50;
  const sqrt = Math.sqrt, log = Math.log, imul = Math.imul;
  let cachedBank = null;

  function moments(ratio, epsilon) {
    if (!(ratio > 0) || !(epsilon >= 0) || !Number.isFinite(ratio + epsilon)) {
      throw new Error('Positive response time and nonnegative finite noise are required.');
    }
    const covariance = 1 / (1 + ratio);
    const tracking = ratio / (1 + ratio);
    const measurement = epsilon * epsilon / ratio;
    return {covariance, variance: covariance + measurement, tracking, measurement,
      total: tracking + measurement};
  }

  function optimum(epsilon) {
    if (!(epsilon >= 0) || !Number.isFinite(epsilon)) throw new Error('Invalid noise.');
    if (epsilon === 0) return {ratio: 0, error: 0, boundary: 'fast'};
    if (epsilon >= 1) return {ratio: Infinity, error: 1, boundary: 'slow'};
    return {ratio: epsilon / (1 - epsilon), error: 2 * epsilon - epsilon * epsilon,
      boundary: null};
  }

  function discreteMoments(ratio, epsilon, dt = DT) {
    if (!(dt > 0 && dt < 2 * ratio)) throw new Error('Unstable simulation step.');
    const a = Math.exp(-dt), c = dt / ratio, b = 1 - c;
    const covariance = a * c / (1 - a * b);
    const varianceSignal = (c * c + 2 * b * c * covariance) / (1 - b * b);
    const measurement = (2 * epsilon * epsilon * dt / (ratio * ratio)) / (1 - b * b);
    const tracking = 1 + varianceSignal - 2 * covariance;
    return {covariance, variance: varianceSignal + measurement, tracking, measurement,
      total: tracking + measurement};
  }

  function rng(seed) {
    let word = (Number(seed) >>> 0) ^ 0x8e9d5aaa;
    return () => {
      word += 0x6D2B79F5;
      let t = word;
      t = imul(t ^ (t >>> 15), t | 1);
      t ^= t + imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function bank(seed) {
    seed = Number(seed) >>> 0;
    if (cachedBank?.seed === seed) return cachedBank;
    const count = Math.round((BURN + DURATION) / DT);
    const signal = new Float64Array(count + 1);
    const increments = new Float64Array(count);
    const random = rng(seed);
    const a = Math.exp(-DT), noise = sqrt(-Math.expm1(-2 * DT)), rootDt = sqrt(DT);
    signal[0] = sqrt(-2 * log(1 - random())) * Math.cos(2 * Math.PI * random());
    for (let i = 0; i < count; i++) {
      // A pair of independent standard normals drives the signal and readout.
      // The two Wiener increments are reused, unchanged, for every slider state.
      let u, v, squared;
      do {
        u = 2 * random() - 1; v = 2 * random() - 1;
        squared = u * u + v * v;
      } while (squared === 0 || squared >= 1);
      const radius = sqrt(-2 * log(squared) / squared);
      signal[i + 1] = a * signal[i] + noise * radius * u;
      increments[i] = rootDt * radius * v;
    }
    cachedBank = {seed, signal, increments};
    return cachedBank;
  }

  function trace(ratio, epsilon, seed = 17) {
    if (ratio < MIN_RATIO || ratio > MAX_RATIO) throw new Error('Response time is outside the trace grid.');
    moments(ratio, epsilon);
    const draws = bank(seed);
    const start = Math.round(BURN / DT);
    const c = DT / ratio, b = 1 - c, noise = Math.SQRT2 * epsilon / ratio;
    const t = [], signal = [], readout = [], clean = [];
    let response = 0, filtered = 0;
    for (let i = 0; i < draws.increments.length; i++) {
      if (i >= start && (i - start) % STRIDE === 0) {
        t.push((i - start) * DT); signal.push(draws.signal[i]);
        readout.push(response); clean.push(filtered);
      }
      response = b * response + c * draws.signal[i] + noise * draws.increments[i];
      filtered = b * filtered + c * draws.signal[i];
    }
    t.push(DURATION); signal.push(draws.signal.at(-1)); readout.push(response); clean.push(filtered);
    return {t, signal, readout, clean, dt: DT, burn: BURN, seed: draws.seed};
  }

  const models = window.SIFSLabModels = window.SIFSLabModels || {};
  models.tracking = {moments, optimum, discreteMoments, trace,
    constants: {MIN_RATIO, MAX_RATIO, DT, BURN, DURATION, STRIDE}};

  function number(value) {
    if (value === 0) return '0';
    if (Math.abs(value) < 0.01) return value.toExponential(2);
    return Number(value.toPrecision(3)).toString();
  }

  window.SIFSLabs.register({
    id: 'tracking',
    title: 'Sampling versus tracking',
    question: 'Predict which part of the error changes when the response becomes slower. Is there always a finite best response time?',
    assumptions: 'Stationary OU signal; independent white response noise; exponential response with unit gain. Fix σ_H² = τ_H = 1 and Dη = ε² while changing τ_U.',
    source: 'Simplified OU response model. Changing-environment question: Mora & Nemenman (2019); Malaguti & ten Wolde (2021).',
    stochastic: true,
    defaults: {logRatio: Math.log10(1 / 3), epsilon: 0.25, seed: 17, showClean: false},
    controls: [
      {key: 'logRatio', label: 'Response time τ_U / τ_H', type: 'range', min: -1.5, max: 1,
        step: 0.025, format: value => number(10 ** value)},
      {key: 'epsilon', label: 'Response noise ε = √(Dη / σ_H²τ_H)', type: 'range', min: 0,
        max: 1.5, step: 0.025, format: number},
      {key: 'showClean', label: 'Also show the noise-free filtered signal', type: 'checkbox'}
    ],
    presets: [
      {label: 'Fast response', state: {logRatio: -1.25, epsilon: 0.25}},
      {label: 'Finite optimum', state: {logRatio: Math.log10(1 / 3), epsilon: 0.25}},
      {label: 'Slow response', state: {logRatio: 1, epsilon: 0.25}},
      {label: 'No finite optimum', state: {logRatio: 0, epsilon: 1.25}}
    ],
    render(state, api) {
      const ratio = Math.max(MIN_RATIO, Math.min(MAX_RATIO, 10 ** Number(state.logRatio)));
      const epsilon = Math.max(0, Math.min(1.5, Number(state.epsilon)));
      const exact = moments(ratio, epsilon), best = optimum(epsilon);
      const realization = trace(ratio, epsilon, state.seed);
      const colors = api.colors;
      const traceSeries = [
        {x: realization.t, y: realization.signal, color: colors.blue,
          label: 'Current signal H', mode: 'line', width: 1.8, opacity: 0.8},
        {x: realization.t, y: realization.readout, color: colors.fast,
          label: 'Noisy readout U', mode: 'line', width: 2}
      ];
      if (state.showClean) traceSeries.push({x: realization.t, y: realization.clean,
        color: colors.green, label: 'Readout without response noise', mode: 'line', width: 2});
      let amplitude = 0;
      for (const series of traceSeries) for (const value of series.y) amplitude = Math.max(amplitude, Math.abs(value));
      amplitude = Math.max(2.5, amplitude * 1.1);
      const x = [], tracking = [], measurement = [], total = [];
      for (let i = 0; i <= 260; i++) {
        const position = 10 ** (-2 + 4 * i / 260), values = moments(position, epsilon);
        x.push(position); tracking.push(values.tracking); measurement.push(values.measurement); total.push(values.total);
      }
      const curveSeries = [
        {x, y: tracking, color: colors.slow || colors.blue, label: 'Tracking error', mode: 'line', width: 2.5},
        ...(epsilon ? [{x, y: measurement, color: colors.fast, label: 'Response noise', mode: 'line', width: 2.5}] : []),
        {x, y: total, color: colors.ink, label: 'Total error', mode: 'line', width: 3}
      ];
      const marks = [{x: ratio, y: exact.total, color: colors.ink, r: 5}];
      if (!best.boundary && best.ratio >= 0.01 && best.ratio <= 100) {
        if (Math.abs(Math.log(ratio / best.ratio)) < 0.001) {
          marks[0] = {...marks[0], color: colors.green, label: 'Current optimum'};
        } else {
          marks.push({x: best.ratio, y: best.error, color: colors.green, label: 'Optimum', r: 5});
        }
      }
      let explanation;
      if (epsilon === 0) {
        explanation = 'With no response noise, slowing the readout only loses recent signal changes. The boundary optimum is τ_U → 0. The zero noise contribution is omitted from the logarithmic plot.';
      } else if (epsilon >= 1) {
        explanation = 'Here ε ≥ 1. Total error decreases at every finite response time; its infimum is 1 as τ_U → ∞. The response approaches the mean signal, zero.';
      } else {
        explanation = 'Longer integration reduces response noise but increases the error from old signal values. At x* = ε/(1−ε), these competing slopes balance; the minimum error is 2ε−ε². Varying ε changes the fixed-noise optimization problem.';
      }
      return {
        plots: [
          {title: 'One coupled signal/readout realization', svg: api.plot({
            xLabel: 'Time / τ_H', yLabel: 'Signal units', xDomain: [0, DURATION],
            yDomain: [-amplitude, amplitude], series: traceSeries, width: 600, height: 285
          }), caption: 'Illustrative simulation after 120 τ_H of relaxation. Slider changes reuse exactly the same signal and independent noise realization; New realization changes both. The displayed error values are analytical, not measured from this short trace.'},
          {title: 'Exact stationary error decomposition', svg: api.plot({
            xLabel: 'Response time x = τ_U / τ_H', yLabel: 'Error / σ_H²', xDomain: [0.01, 100],
            yDomain: [0.005, Math.max(2, total[0] * 1.25)], logX: true, logY: true,
            series: curveSeries, marks, hLines: [{y: 1, color: colors.gray, label: 'Error using the mean signal'}],
            vLines: [{x: ratio, color: colors.gray}], width: 600, height: 285
          }), caption: 'Both axes are logarithmic. Blue: tracking; burgundy: response noise. The black dot follows the current response time; green marks a finite optimum. Only τ_U varies along each curve.'}
        ],
        metrics: [
          {label: 'Tracking error', value: number(exact.tracking)},
          {label: 'Response noise', value: number(exact.measurement)},
          {label: 'Total normalized error', value: number(exact.total)},
          {label: 'Best response time x*', value: best.boundary === 'slow' ? '∞ (no finite optimum)' : best.boundary === 'fast' ? '0 (boundary)' : number(best.ratio)},
          {label: 'Best attainable error', value: number(best.error)}
        ],
        explanation,
        formula: '<span>\\(e(x)=\\underbrace{\\frac{x}{1+x}}_{\\text{tracking}}+\\underbrace{\\frac{\\epsilon^2}{x}}_{\\text{response noise}},\\quad x=\\tau_U/\\tau_H\\)</span><br><span>\\(x^*=\\epsilon/(1-\\epsilon)\\quad(0&lt;\\epsilon&lt;1)\\)</span>'
      };
    }
  });
})();
