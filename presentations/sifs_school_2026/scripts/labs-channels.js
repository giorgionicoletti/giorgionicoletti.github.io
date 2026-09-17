/* Fixed-channel small-noise optimization and Gaussian spectral information.
 * All plots are deterministic. The capacity functional is an asymptotic proxy;
 * spectral rates are numerical integrals of an exact stationary Gaussian law. */
(() => {
  'use strict';
  const LN2 = Math.LN2;
  const GAUSSIAN_WIDTH = Math.sqrt(2 * Math.PI * Math.E);
  const POST_NOISE = 0.1;

  function channelCheck(curvature, sigma) {
    if (!Number.isFinite(curvature) || Math.abs(curvature) > 30 ||
        !(sigma > 0) || !Number.isFinite(sigma)) {
      throw Error('Use finite curvature |κ| ≤ 30 and positive noise σ.');
    }
  }

  function response(c, curvature) {
    if (!(c >= 0 && c <= 1) || !Number.isFinite(curvature) || Math.abs(curvature) > 30) {
      throw Error('The input must lie in [0,1] and curvature must be finite.');
    }
    return curvature === 0 ? c : Math.expm1(curvature * c) / Math.expm1(curvature);
  }

  function slope(c, curvature) {
    response(c, curvature);
    return curvature === 0 ? 1 : curvature * Math.exp(curvature * c) / Math.expm1(curvature);
  }

  function simpson(f, a, b, intervals = 2048) {
    if (!Number.isInteger(intervals) || intervals < 2 || intervals % 2) throw Error('Use an even Simpson interval count.');
    const step = (b - a) / intervals;
    let sum = f(a) + f(b);
    for (let i = 1; i < intervals; i++) sum += (i % 2 ? 4 : 2) * f(a + i * step);
    return sum * step / 3;
  }

  function capacityFunctional(curvature, sigma, density, intervals = 2048) {
    channelCheck(curvature, sigma);
    return simpson(c => {
      const p = density(c);
      if (!(p >= 0) || !Number.isFinite(p)) throw Error('An input density must be finite and nonnegative.');
      return p === 0 ? 0 : p * Math.log(slope(c, curvature) / (GAUSSIAN_WIDTH * sigma * p)) / LN2;
    }, 0, 1, intervals);
  }

  function capacitySummary(curvature, sigma) {
    channelCheck(curvature, sigma);
    // The response covers [0,1], so ∫g′ dc=1 and p*=g′ for constant σ.
    const Z = 1 / sigma;
    const optimized = Math.log(Z / GAUSSIAN_WIDTH) / LN2;
    const k = curvature;
    // Analytic KL(U || p*) = log(sinh(k/2)/(k/2)); use its series near zero.
    const gapNats = Math.abs(k) < 0.001 ? k * k / 24 - k ** 4 / 2880 :
      -Math.log(k / Math.expm1(k)) - k / 2;
    const gap = Math.max(0, gapNats) / LN2;
    const finest = sigma / Math.max(slope(0, k), slope(1, k));
    const coarsest = sigma / Math.min(slope(0, k), slope(1, k));
    return {Z, optimized, uniform: optimized - gap, gap, finest, coarsest,
      curvatureDiagnostic: Math.abs(k) * coarsest};
  }

  function spectralCheck(tau, preNoise, postNoise, bandwidth) {
    if (!(tau > 0) || !(preNoise > 0) || !(postNoise >= 0) ||
        !Number.isFinite(tau + preNoise + postNoise) ||
        (bandwidth !== undefined && (!(bandwidth > 0) || !Number.isFinite(bandwidth)))) {
      throw Error('Positive finite response time, pre-filter noise and bandwidth are required.');
    }
  }

  function spectra(omega, tau, preNoise, postNoise = 0) {
    spectralCheck(tau, preNoise, postNoise);
    if (!(omega >= 0) || !Number.isFinite(omega)) throw Error('Frequency must be finite and nonnegative.');
    const signal = 2 / (1 + omega * omega);
    const filterPower = 1 / (1 + (omega * tau) ** 2);
    const transmittedSignal = filterPower * signal;
    const transmittedNoise = filterPower * 2 * preNoise;
    const postSpectrum = 2 * postNoise;
    const total = transmittedSignal + transmittedNoise + postSpectrum;
    // Dividing by |H|² avoids cancellation errors when the filter is very slow.
    const effectiveNoise = 2 * preNoise + 2 * postNoise / filterPower;
    const coherence = signal / (signal + effectiveNoise);
    const referenceCoherence = signal / (signal + 2 * preNoise);
    const rateDensity = Math.log1p(signal / effectiveNoise) / (2 * Math.PI * LN2);
    return {signal, filterPower, transmittedSignal, transmittedNoise,
      postSpectrum, total, coherence, referenceCoherence, rateDensity};
  }

  function adaptiveIntegral(f, upper, tolerance = 1e-10) {
    const fa = f(0), fm = f(upper / 2), fb = f(upper);
    const whole = upper * (fa + 4 * fm + fb) / 6;
    function split(a, b, left, middle, right, previous, budget, depth) {
      const mid = (a + b) / 2, q1 = f((a + mid) / 2), q3 = f((mid + b) / 2);
      const first = (mid - a) * (left + 4 * q1 + middle) / 6;
      const second = (b - mid) * (middle + 4 * q3 + right) / 6;
      const delta = first + second - previous;
      if (Math.abs(delta) <= 15 * budget) return first + second + delta / 15;
      if (depth === 0) throw Error('The spectral integral did not converge.');
      return split(a, mid, left, q1, middle, first, budget / 2, depth - 1) +
        split(mid, b, middle, q3, right, second, budget / 2, depth - 1);
    }
    return split(0, upper, fa, fm, fb, whole, tolerance, 24);
  }

  function bandRate(tau, preNoise, postNoise, bandwidth, tolerance = 1e-10) {
    spectralCheck(tau, preNoise, postNoise, bandwidth);
    if (!(tolerance > 0) || !Number.isFinite(tolerance)) throw Error('Integral tolerance must be positive.');
    return adaptiveIntegral(w => spectra(w, tau, preNoise, postNoise).rateDensity, bandwidth, tolerance);
  }

  function unfilteredBandRate(preNoise, bandwidth) {
    spectralCheck(1, preNoise, 0, bandwidth);
    const b = Math.sqrt(1 + 1 / preNoise), W = bandwidth;
    // Antiderivative of log[(ω²+b²)/(ω²+1)] on positive frequencies.
    return (W * Math.log1p((1 / preNoise) / (W * W + 1)) +
      2 * b * Math.atan(W / b) - 2 * Math.atan(W)) / (2 * Math.PI * LN2);
  }

  function unfilteredFullRate(preNoise) {
    spectralCheck(1, preNoise, 0);
    // Stable form of (sqrt(1+1/Dη)-1)/(2 ln 2), in bits per τs.
    return (1 / preNoise) / (Math.sqrt(1 + 1 / preNoise) + 1) / (2 * LN2);
  }

  const host = typeof window === 'undefined' ? globalThis : window;
  host.SIFSLabModels = host.SIFSLabModels || {};
  host.SIFSLabModels.channels = {response, slope, simpson, capacityFunctional,
    capacitySummary, spectra, bandRate, unfilteredBandRate, unfilteredFullRate,
    constants: {POST_NOISE}};
  if (!host.SIFSLabs?.register) return;

  const number = x => Number(x.toPrecision(3)).toString();
  const bound = (value, lo, hi) => Math.min(hi, Math.max(lo, Number(value)));

  host.SIFSLabs.register({
    id: 'capacity',
    title: 'Where should the input distribution put its weight?',
    question: 'For one fixed response curve and noise level, predict where the channel can distinguish nearby inputs. Compare a uniform input with the small-noise optimum.',
    assumptions: 'Scalar input h∈[0,1]; U=ūκ(h)+σξ, ξ standard Gaussian; monotone mean ūκ with nonzero slope; constant conditional output noise σ. Only the input density varies within each comparison. The small-noise approximation needs slowly varying local quantities and small endpoint corrections; no input-cost constraint is imposed.',
    source: '“Optimizing the input distribution” and “Capacity and local resolution”. Tkačik, Callan & Bialek (2008), Information capacity of genetic regulatory elements (Physical Review E); companion application: Information flow and optimization in transcriptional regulation (PNAS). The exponential response is a teaching channel.',
    stochastic: false,
    defaults: {curvature: 2.5, sigma: 0.025},
    controls: [
      {key: 'curvature', label: 'Response curvature κ', type: 'range', min: -3, max: 3, step: 0.1, format: number},
      {key: 'sigma', label: 'Output-noise width σ', type: 'range', min: 0.01, max: 0.3, step: 0.005, format: number}
    ],
    presets: [
      {label: 'Linear response', state: {curvature: 0, sigma: 0.025}},
      {label: 'Favor high inputs', state: {curvature: 2.5, sigma: 0.025}},
      {label: 'Favor low inputs', state: {curvature: -2.5, sigma: 0.025}},
      {label: 'Break the approximation', state: {curvature: 2.5, sigma: 0.3}}
    ],
    render(state, api) {
      const k = bound(state.curvature, -3, 3), sigma = bound(state.sigma, 0.01, 0.3);
      const result = capacitySummary(k, sigma), c = [], mean = [], upper = [], lower = [], optimal = [], uniform = [], resolution = [];
      for (let i = 0; i <= 240; i++) {
        const position = i / 240, value = response(position, k), derivative = slope(position, k);
        c.push(position); mean.push(value); upper.push(value + sigma); lower.push(value - sigma);
        optimal.push(derivative); uniform.push(1); resolution.push(sigma / derivative);
      }
      const col = api.colors;
      const failure = result.optimized < 0;
      const explanation = failure ?
        'The displayed approximate capacity is negative. Exact mutual information cannot be negative: the small-noise approximation has failed, and neither clipping the value to zero nor calling p* the exact capacity-achieving distribution repairs it. Reduce σ and inspect the local resolution widths.' :
        'The optimum places more density where a small input change produces a larger shift relative to noise. Here σ is constant and the output range stays [0,1], so changing curvature redistributes p* without changing the approximate capacity. Increasing σ lowers both approximate information values equally. The gap is exactly KL(uniform ∥ p*) within this approximate functional; it is not an exact noisy-channel MI gap.';
      return {
        plots: [
          {title: 'Fixed channel: mean and conditional width', svg: api.plot({
            xLabel: 'Input h', yLabel: 'Response U', xDomain: [0, 1], yDomain: [-sigma * 1.3, 1 + sigma * 1.3],
            series: [{x: c, y: mean, color: col.fast, label: 'Mean ū(h)'},
              {x: c, y: upper, color: col.gray, label: '±σ bounds', width: 1.7},
              {x: c, y: lower, color: col.gray, width: 1.7}], width: 600, height: 280
          }), caption: 'Blue lines show one standard deviation, not hard bounds. Gaussian tails extend beyond [0,1]. Each slider setting defines one channel, held fixed when comparing input densities.'},
          {title: 'How the input range is used', svg: api.plot({
            legendDashes: true, xLabel: 'Input h', yLabel: 'Input density', xDomain: [0, 1], yDomain: [0, Math.max(...optimal, 1) * 1.15],
            series: [{x: c, y: uniform, color: col.gray, label: 'Uniform', dash: '5 4'},
              {x: c, y: optimal, color: col.blue, label: 'Optimized'}], width: 600, height: 280
          }), caption: 'The dashed gray curve is the uniform input density; the solid blue curve is the optimized density. Bulk validity needs |κ|δh ≪ 1 and endpoint distance ≫ δh; boundary corrections are omitted.'}
        ],
        metrics: [
          {label: 'Uniform input · approx. I', value: number(result.uniform) + ' bits'},
          {label: 'Optimized input · approx. I', value: number(result.optimized) + ' bits'},
          {label: 'Approx. gain = KL', value: number(result.gap) + ' bits'},
          {label: 'Local resolution δh · range', value: number(result.finest) + '–' + number(result.coarsest)},
          {label: 'Largest |κ|δh', value: number(result.curvatureDiagnostic)}
        ],
        explanation,
        formula: '<span>\\(\\bar u_\\kappa(h)=\\frac{e^{\\kappa h}-1}{e^\\kappa-1},\\quad \\bar u_0(h)=h,\\quad \\delta h=\\sigma/|\\bar u_\\kappa^{\\prime}(h)|\\)</span><br>' +
          '<span>\\(p_H^*(h)=\\frac{|\\bar u_\\kappa^{\\prime}(h)|}{Z\\sigma},\\quad Z=1/\\sigma,\\quad I_{\\rm app}[p_H]=\\log_2\\frac{Z}{\\sqrt{2\\pi e}}-D_{\\rm KL}^{(2)}(p_H\\Vert p_H^*)\\)</span>'
      };
    }
  });

  host.SIFSLabs.register({
    id: 'spectral',
    title: 'Filtering changes power; does it change path information?',
    question: 'Slow the same filter applied to signal and measurement noise. Predict whether coherence and information change, then add independent noise after the filter.',
    assumptions: 'Stationary jointly Gaussian processes and ideal complete records. OU signal variance σ_H²=1 and correlation time τ_H=1. Independent pre/post Gaussian white noises have two-sided spectra 2Dη and 2Dζ; white noise is an ideal spectral model. Frequencies are angular. The selected band is an ideal spectral restriction, not an aliased sampled record.',
    source: '“Stationarity, Fourier modes, and coherence” and appendix 9. Tostevin & ten Wolde (2009), Mutual Information between Input and Output Trajectories of Biochemical Networks (Physical Review Letters); Tostevin & ten Wolde (2010), Mutual information in time-varying biochemical systems (Physical Review E). The OU integral and post-filter comparison are worked teaching examples.',
    stochastic: false,
    defaults: {logTau: 0, epsilon: 0.5, postNoise: false, logBandwidth: 1.5},
    controls: [
      {key: 'logTau', label: 'Filter memory τ_U / τ_H', type: 'range', min: -1, max: 1, step: 0.05, format: x => number(10 ** x)},
      {key: 'epsilon', label: 'Pre-filter noise ε = √Dη', type: 'range', min: 0.1, max: 1.5, step: 0.05, format: number},
      {key: 'postNoise', label: 'Add post-filter noise (Dζ = 0.1)', type: 'checkbox'},
      {key: 'logBandwidth', label: 'Integration cutoff Ωτ_H', type: 'range', min: 0, max: 2, step: 0.05, format: x => number(10 ** x)}
    ],
    presets: [
      {label: 'Fast filter, shared noise', state: {logTau: -1, epsilon: 0.5, postNoise: false, logBandwidth: 1.5}},
      {label: 'Slow filter, same information', state: {logTau: 1, epsilon: 0.5, postNoise: false, logBandwidth: 1.5}},
      {label: 'Add noise after filtering', state: {logTau: 1, epsilon: 0.5, postNoise: true, logBandwidth: 1.5}},
      {label: 'Recover more bandwidth', state: {logTau: 1, epsilon: 0.5, postNoise: false, logBandwidth: 2}}
    ],
    render(state, api) {
      const tau = 10 ** bound(state.logTau, -1, 1), epsilon = bound(state.epsilon, 0.1, 1.5);
      const D = epsilon * epsilon, post = state.postNoise ? POST_NOISE : 0, bandwidth = 10 ** bound(state.logBandwidth, 0, 2);
      const rate = bandRate(tau, D, post, bandwidth), reference = unfilteredBandRate(D, bandwidth), full = unfilteredFullRate(D);
      const omega = [], signal = [], noise = [], added = [], coherence = [], original = [];
      for (let i = 0; i <= 300; i++) {
        const w = 10 ** (-2 + (Math.log10(bandwidth) + 2) * i / 300), value = spectra(w, tau, D, post);
        omega.push(w); signal.push(value.transmittedSignal); noise.push(value.transmittedNoise);
        added.push(value.postSpectrum); coherence.push(value.coherence); original.push(value.referenceCoherence);
      }
      const col = api.colors, positive = [...signal, ...noise, ...(post ? added : [])];
      const lowExponent = Math.floor(Math.log10(Math.min(...positive))), highExponent = Math.ceil(Math.log10(Math.max(...positive)));
      const bottom = 10 ** lowExponent, top = 10 ** highExponent, powerTicks = [];
      const tickStep = Math.max(1, Math.ceil((highExponent - lowExponent) / 6));
      for (let exponent = lowExponent; exponent < highExponent; exponent += tickStep) powerTicks.push(10 ** exponent);
      powerTicks.push(top);
      return {
        plots: [
          {title: 'Power spectra at the readout', svg: api.plot({
            xLabel: 'Frequency ωτ_H', yLabel: '', xDomain: [0.01, bandwidth], yDomain: [bottom, top], logX: true, logY: true, yTicks: powerTicks,
            series: [{x: omega, y: signal, color: col.blue, label: 'Signal'},
              {x: omega, y: noise, color: col.fast, label: 'Pre noise'},
              ...(post ? [{x: omega, y: added, color: col.green, label: 'Post noise'}] : [])], width: 600, height: 280
          }), caption: 'The same |G|² attenuates the signal and pre-filter noise. Independent post-filter noise is not attenuated. Plots start at ωτ_H=0.01 on the log axis; the rate integral includes zero.'},
          {title: 'Coherence retains the signal-to-noise ratio', svg: api.plot({
            xLabel: 'Frequency ωτ_H', yLabel: 'Coherence γ²', xDomain: [0.01, bandwidth], yDomain: [0, 1], logX: true,
            series: [{x: omega, y: original, color: col.gray, label: 'Before filter', dash: '5 4', width: 3},
              {x: omega, y: coherence, color: col.blue, label: 'Readout', width: 2.2}], width: 600, height: 280
          }), caption: 'With no post-filter noise, both curves coincide at every frequency despite changing output power. Adding post-filter noise lowers coherence, especially where the filter strongly attenuates the signal.'}
        ],
        metrics: [
          {label: 'Readout rate · selected band', value: number(rate) + ' bits / τ_H'},
          {label: 'Before-filter rate · same band', value: number(reference) + ' bits / τ_H'},
          {label: 'Before-filter rate · full band', value: number(full) + ' bits / τ_H'},
          {label: 'Rate retained in same band', value: number(100 * rate / reference) + '%'},
          {label: 'Band used in the integral', value: '|ωτ_H| ≤ ' + number(bandwidth)}
        ],
        explanation: post ?
          'The added noise breaks the common-factor cancellation. Relative to the transmitted signal, post-filter noise grows as the filter slows, lowering the path rate. Compare both rates over the same selected band; the full-band value is an analytic benchmark before the filter, not the current noisy-readout rate.' :
          'G is nonzero at every finite frequency. With no independent noise added afterward, |G|² cancels from coherence and the selected-band path rate is independent of τ_U. This requires ideal complete-path resolution; it does not assert equal current-state MSE or practical invertibility with finite precision. Increasing the cutoff adds omitted spectral information toward the analytic full-band benchmark.',
        formula: '<span>\\(G(\\omega)=\\frac1{1+i\\omega\\tau_U},\\quad \\mathcal S_{HH}=\\frac2{1+\\omega^2},\\quad \\gamma^2=\\frac{\\mathcal S_{HH}}{\\mathcal S_{HH}+2D_\\eta+2D_\\zeta/|G|^2}\\)</span><br>' +
          '<span>\\(\\mathcal R_\\Omega=\\frac1{2\\pi\\ln2}\\int_0^\\Omega\\ln\\!\\left(1+\\frac{\\mathcal S_{HH}}{2D_\\eta+2D_\\zeta/|G|^2}\\right)d\\omega\\quad[\\mathrm{bits}/\\tau_H]\\)</span><br>' +
          '<span>\\(\\mathcal R_\\infty=\\frac{\\sqrt{1+1/D_\\eta}-1}{2\\ln2}\\quad(D_\\zeta=0,\\ \\tau_H=1)\\)</span>'
      };
    }
  });
})();
