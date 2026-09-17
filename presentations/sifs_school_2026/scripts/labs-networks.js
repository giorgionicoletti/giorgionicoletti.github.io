/* Optional PRX/JStat paths and PRL balance laboratories. All plots are computed
 * from the cited models/rules, not reconstructed paper data. Pure models are
 * exported before the browser guard so the numerical tests need no DOM.
 *
 * JStat (2025), Eqs. 46–47, 59–63: use the explicit graph-deletion rule.
 * The printed x1|x2 and the endpoint of 3→1→2 are source typos (see science-audit).
 * PRL (2025), Eqs. 1–2, 5–6: B below is the positive decay matrix rI−A.
 * Eta is evaluated from the covariance, not the manuscript's expanded polynomial.
 */
(() => {
  'use strict';
  const host = typeof window === 'undefined' ? globalThis : window;
  const LN2 = Math.log(2);
  const motifs = {
    minimal: { label: '3 → 1 → 2', edges: [[3, 1], [1, 2]] },
    nonminimal: { label: '2 → 3 → 1', edges: [[2, 3], [3, 1]] },
    direct: { label: '1 → 2 → 3', edges: [[1, 2], [2, 3]] },
    feedback: { label: '3 → 2 → 1', edges: [[3, 2], [2, 1]] }
  };
  const orderKeys = ['123', '132', '213', '231', '312', '321'];
  const sub = n => String(n).replace(/\d/g, d => '₀₁₂₃₄₅₆₇₈₉'[+d]);
  const xName = n => 'X' + sub(n);
  const tauName = n => 'τ' + sub(n);

  function analyzePaths(edges, order = '123') {
    const nodes = String(order).split('').map(Number);
    if (nodes.length !== 3 || new Set(nodes).size !== 3 || nodes.some(n => ![1, 2, 3].includes(n))) {
      throw Error('Choose a permutation of the three distinct timescales.');
    }
    if (!Array.isArray(edges) || edges.some(e => !Array.isArray(e) || e.length !== 2 ||
        !nodes.includes(e[0]) || !nodes.includes(e[1]) || e[0] === e[1])) {
      throw Error('Edges must join distinct layer identities 1, 2 and 3.');
    }
    const rank = Object.fromEntries(nodes.map((n, i) => [n, i]));
    const uniqueEdges = [...new Map(edges.map(e => [e.join('-'), e.slice()])).values()];
    const neighbors = Object.fromEntries(nodes.map(n => [n, uniqueEdges.filter(e => e[0] === n).map(e => e[1])]));
    const paths = [];
    function visit(path) {
      if (path.length > 1) {
        const source = path[0], target = path[path.length - 1];
        const direct = path.slice(1).some((n, i) => rank[path[i]] < rank[n]);
        const propagation = rank[source] > rank[target] && direct;
        const removed = path.slice(1, -1).filter(n => rank[n] > rank[target]);
        paths.push({ nodes: path.slice(), source, target, propagation,
          minimal: propagation && removed.length === 0, removed });
      }
      for (const next of neighbors[path[path.length - 1]]) {
        if (!path.includes(next)) visit([...path, next]);
      }
    }
    nodes.forEach(n => visit([n]));
    const rho = Object.fromEntries(nodes.map(n => [n, []]));
    const reasons = {};
    for (const [source, target] of uniqueEdges) {
      if (rank[source] > rank[target]) {
        rho[target].push(source);
        reasons[`${target}-${source}`] = { kind: 'edge', path: [source, target] };
      }
    }
    for (const path of paths.filter(p => p.minimal)) {
      if (!rho[path.target].includes(path.source)) rho[path.target].push(path.source);
      reasons[`${path.target}-${path.source}`] ||= { kind: 'path', path: path.nodes };
    }
    for (const n of nodes) rho[n].sort((a, b) => rank[a] - rank[b]);

    // The factorization is a DAG with slower parents. A shared ancestor gives
    // permission for marginal dependence; cancellations can still make MI zero.
    const ancestors = {};
    function collect(n) {
      if (ancestors[n]) return ancestors[n];
      return ancestors[n] = [...new Set([n, ...rho[n].flatMap(collect)])];
    }
    nodes.forEach(collect);
    const pairs = [[1, 2], [1, 3], [2, 3]].map(([a, b]) => ({
      a, b, shared: ancestors[a].filter(n => ancestors[b].includes(n)).sort((u, v) => rank[v] - rank[u])
    }));
    return { edges: uniqueEdges, nodes, rank, paths, rho, reasons, ancestors, pairs };
  }

  function solve(A, b) {
    const n = b.length, M = A.map((row, i) => [...row, b[i]]);
    for (let j = 0; j < n; j++) {
      let pivot = j;
      for (let i = j + 1; i < n; i++) if (Math.abs(M[i][j]) > Math.abs(M[pivot][j])) pivot = i;
      if (Math.abs(M[pivot][j]) < 1e-14) throw Error('The stationary linear system is singular.');
      [M[j], M[pivot]] = [M[pivot], M[j]];
      const scale = M[j][j];
      for (let k = j; k <= n; k++) M[j][k] /= scale;
      for (let i = 0; i < n; i++) if (i !== j) {
        const factor = M[i][j];
        for (let k = j; k <= n; k++) M[i][k] -= factor * M[j][k];
      }
    }
    return M.map(row => row[n]);
  }

  function cholesky2(Sigma) {
    if (!(Sigma[0][0] > 0)) throw Error('The covariance must be positive definite.');
    const a = Math.sqrt(Sigma[0][0]), b = Sigma[1][0] / a;
    const c2 = Sigma[1][1] - b * b;
    if (!(c2 > 0)) throw Error('The covariance must be positive definite.');
    return [[a, 0], [b, Math.sqrt(c2)]];
  }

  function mixtureBounds(means, Sigma, weights) {
    if (!means.length || means.length !== weights.length || weights.some(w => !(w > 0)) ||
        Math.abs(weights.reduce((a, b) => a + b, 0) - 1) > 1e-12) {
      throw Error('The positive component weights must sum to one.');
    }
    const L = cholesky2(Sigma);
    const distance2 = means.map(a => means.map(b => {
      const z0 = (a[0] - b[0]) / L[0][0];
      const z1 = (a[1] - b[1] - L[1][0] * z0) / L[1][1];
      return z0 * z0 + z1 * z1;
    }));
    const weightedLogSumExp = values => {
      const terms = values.map((v, j) => Math.log(weights[j]) + v);
      const peak = Math.max(...terms);
      return peak + Math.log(terms.reduce((s, v) => s + Math.exp(v - peak), 0));
    };
    const bound = divisor => -weights.reduce((s, w, i) => s + w * weightedLogSumExp(distance2[i].map(d => -d / divisor)), 0) / LN2;
    const entropy = -weights.reduce((s, w) => s + w * Math.log(w), 0) / LN2;
    return { lower: Math.max(0, bound(8)), upper: Math.min(entropy, Math.max(0, bound(2))),
      entropy, eta: distance2.length > 1 ? distance2[0][1] / 2 : 0, distance2 };
  }

  function balanceModel(k, referenceRatio = 1000) {
    if (!Number.isFinite(k) || !(k > .5)) throw Error('The linear neural model needs k > 0.5 for stationarity.');
    if (!Number.isFinite(referenceRatio) || !(referenceRatio > 0)) throw Error('The reference input timescale must be positive.');
    const r = 1, w = 2, D = .5, tau = 1, critical = .5, delta = 2 * k - 1;
    const B = [[r - w, w * k], [-w, r + w * k]];
    const [a, b, c] = solve([
      [2 * B[0][0], 2 * B[0][1], 0],
      [B[1][0], B[0][0] + B[1][1], B[0][1]],
      [0, 2 * B[1][0], 2 * B[1][1]]
    ], [2 * D, 0, 2 * D]);
    const Sigma = [[a, b], [b, c]], L = cholesky2(Sigma);
    const inputs = [0, 2.5, 5], weights = [.5, .25, .25];
    const means = inputs.map(h => solve(B, [h, 0]));
    const bounds = mixtureBounds(means, Sigma, weights);
    const relaxation = tau / Math.min(r, delta);
    return { k, r, w, D, tau, critical, delta, B, Sigma, L, inputs, weights, means,
      ...bounds, relaxation, referenceRatio, inputToRelaxation: referenceRatio / relaxation,
      shortestInputModeToRelaxation: .75 * referenceRatio / relaxation };
  }

  const models = host.SIFSLabModels ||= {};
  models.networks = { paths: { analyze: analyzePaths, motifs, orders: orderKeys },
    balance: { stationary: balanceModel, mixtureBounds } };
  if (!host.SIFSLabs || typeof host.SIFSLabs.register !== 'function') return;

  const fmt = (x, d = 3) => Math.abs(x) >= 10000 || (Math.abs(x) > 0 && Math.abs(x) < .001)
    ? x.toExponential(1) : Number(x.toPrecision(d)).toString();
  function svgStart(title, api, W = 550, H = 300) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${api.escape(title)}"><rect width="${W}" height="${H}" fill="white"/><g font-family="Fira Sans, Arial, sans-serif" fill="${api.colors.ink}" font-size="18">`;
  }
  const svgEnd = '</g></svg>';
  // Original Figure 4 grey nodes and outlined mathematical glyphs, extracted
  // from the supplied SVG. No browser font substitution changes the artwork.
  const pathNodeArtwork = {"1":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"translate(-100.32942,-35.744938)\"><ellipse style=\"fill:#a2a2a2;fill-opacity:0.364798;stroke:#636363;stroke-width:0.551328;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:3.9;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1\" cx=\"100.32942\" cy=\"35.744938\" rx=\"5.8841329\" ry=\"5.8836975\" /><g transform=\"matrix(0.59831295,0,0,0.59831295,120.64848,46.393691)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g transform=\"translate(-38.383102,-7.5308618)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-148.8577,-143.28266)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g transform=\"translate(148.712,134.765)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><path d=\"M 3.328125,-3.015625 C 3.390625,-3.265625 3.625,-4.1875 4.3125,-4.1875 c 0.046875,0 0.296875,0 0.5,0.125 C 4.53125,-4 4.34375,-3.765625 4.34375,-3.515625 c 0,0.15625 0.109375,0.34375 0.375,0.34375 0.21875,0 0.53125,-0.171875 0.53125,-0.578125 0,-0.515625 -0.578125,-0.65625 -0.921875,-0.65625 -0.578125,0 -0.921875,0.53125 -1.046875,0.75 -0.25,-0.65625 -0.78125,-0.75 -1.078125,-0.75 -1.03125,0 -1.609375,1.28125 -1.609375,1.53125 0,0.109375 0.109375,0.109375 0.125,0.109375 0.078125,0 0.109375,-0.03125 0.125,-0.109375 0.34375,-1.0625 1,-1.3125 1.34375,-1.3125 0.1875,0 0.53125,0.09375 0.53125,0.671875 0,0.3125 -0.171875,0.96875 -0.53125,2.375 -0.15625,0.609375 -0.515625,1.03125 -0.953125,1.03125 -0.0625,0 -0.28125,0 -0.5,-0.125 0.25,-0.0625 0.46875,-0.265625 0.46875,-0.546875 0,-0.265625 -0.21875,-0.34375 -0.359375,-0.34375 -0.3125,0 -0.546875,0.25 -0.546875,0.578125 0,0.453125 0.484375,0.65625 0.921875,0.65625 0.671875,0 1.03125,-0.703125 1.046875,-0.75 0.125,0.359375 0.484375,0.75 1.078125,0.75 1.03125,0 1.59375,-1.28125 1.59375,-1.53125 0,-0.109375 -0.078125,-0.109375 -0.109375,-0.109375 -0.09375,0 -0.109375,0.046875 -0.140625,0.109375 -0.328125,1.078125 -1,1.3125 -1.3125,1.3125 -0.390625,0 -0.546875,-0.3125 -0.546875,-0.65625 0,-0.21875 0.046875,-0.4375 0.15625,-0.875 z m 0,0\" style=\"stroke-linecap:butt;stroke-linejoin:round\" /></g></g><g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-149.009,-143.43396)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g transform=\"translate(154.406,136.259)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><path d=\"m 2.328125,-4.4375 c 0,-0.1875 0,-0.1875 -0.203125,-0.1875 -0.453125,0.4375 -1.078125,0.4375 -1.359375,0.4375 v 0.25 c 0.15625,0 0.625,0 1,-0.1875 v 3.546875 c 0,0.234375 0,0.328125 -0.6875,0.328125 H 0.8125 V 0 c 0.125,0 0.984375,-0.03125 1.234375,-0.03125 0.21875,0 1.09375,0.03125 1.25,0.03125 V -0.25 H 3.03125 c -0.703125,0 -0.703125,-0.09375 -0.703125,-0.328125 z m 0,0\" style=\"stroke-linecap:butt;stroke-linejoin:round\" /></g></g></g></g></g>","2":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"translate(-100.32942,-59.949066)\"><ellipse style=\"fill:#a2a2a2;fill-opacity:0.364798;stroke:#636363;stroke-width:0.551328;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:3.9;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1\" cx=\"100.32942\" cy=\"59.949066\" rx=\"5.8841329\" ry=\"5.8836975\" /><g transform=\"matrix(0.60772079,0,0,0.60772079,97.621272,58.286602)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-149.009,-130.359)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g transform=\"translate(148.712,134.765)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><path d=\"M 3.328125,-3.015625 C 3.390625,-3.265625 3.625,-4.1875 4.3125,-4.1875 c 0.046875,0 0.296875,0 0.5,0.125 C 4.53125,-4 4.34375,-3.765625 4.34375,-3.515625 c 0,0.15625 0.109375,0.34375 0.375,0.34375 0.21875,0 0.53125,-0.171875 0.53125,-0.578125 0,-0.515625 -0.578125,-0.65625 -0.921875,-0.65625 -0.578125,0 -0.921875,0.53125 -1.046875,0.75 -0.25,-0.65625 -0.78125,-0.75 -1.078125,-0.75 -1.03125,0 -1.609375,1.28125 -1.609375,1.53125 0,0.109375 0.109375,0.109375 0.125,0.109375 0.078125,0 0.109375,-0.03125 0.125,-0.109375 0.34375,-1.0625 1,-1.3125 1.34375,-1.3125 0.1875,0 0.53125,0.09375 0.53125,0.671875 0,0.3125 -0.171875,0.96875 -0.53125,2.375 -0.15625,0.609375 -0.515625,1.03125 -0.953125,1.03125 -0.0625,0 -0.28125,0 -0.5,-0.125 0.25,-0.0625 0.46875,-0.265625 0.46875,-0.546875 0,-0.265625 -0.21875,-0.34375 -0.359375,-0.34375 -0.3125,0 -0.546875,0.25 -0.546875,0.578125 0,0.453125 0.484375,0.65625 0.921875,0.65625 0.671875,0 1.03125,-0.703125 1.046875,-0.75 0.125,0.359375 0.484375,0.75 1.078125,0.75 1.03125,0 1.59375,-1.28125 1.59375,-1.53125 0,-0.109375 -0.078125,-0.109375 -0.109375,-0.109375 -0.09375,0 -0.109375,0.046875 -0.140625,0.109375 -0.328125,1.078125 -1,1.3125 -1.3125,1.3125 -0.390625,0 -0.546875,-0.3125 -0.546875,-0.65625 0,-0.21875 0.046875,-0.4375 0.15625,-0.875 z m 0,0\" style=\"stroke-linecap:butt;stroke-linejoin:round\" /></g></g><g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-149.009,-130.359)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><g transform=\"translate(154.406,136.259)\" style=\"stroke-linecap:butt;stroke-linejoin:round\"><path d=\"M 3.515625,-1.265625 H 3.28125 c -0.015625,0.15625 -0.09375,0.5625 -0.1875,0.625 C 3.046875,-0.59375 2.515625,-0.59375 2.40625,-0.59375 H 1.125 c 0.734375,-0.640625 0.984375,-0.84375 1.390625,-1.171875 0.515625,-0.40625 1,-0.84375 1,-1.5 0,-0.84375 -0.734375,-1.359375 -1.625,-1.359375 -0.859375,0 -1.453125,0.609375 -1.453125,1.25 0,0.34375 0.296875,0.390625 0.375,0.390625 0.15625,0 0.359375,-0.125 0.359375,-0.375 0,-0.125 -0.046875,-0.375 -0.40625,-0.375 C 0.984375,-4.21875 1.453125,-4.375 1.78125,-4.375 c 0.703125,0 1.0625,0.546875 1.0625,1.109375 0,0.609375 -0.4375,1.078125 -0.65625,1.328125 L 0.515625,-0.265625 C 0.4375,-0.203125 0.4375,-0.1875 0.4375,0 h 2.875 z m 0,0\" style=\"stroke-linecap:butt;stroke-linejoin:round\" /></g></g></g></g>","3":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"translate(-100.32942,-84.153191)\"><ellipse style=\"fill:#a2a2a2;fill-opacity:0.364798;stroke:#636363;stroke-width:0.551328;stroke-linecap:butt;stroke-linejoin:round;stroke-miterlimit:3.9;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1\" cx=\"100.32942\" cy=\"84.153191\" rx=\"5.8841329\" ry=\"5.8836975\" /><g transform=\"matrix(0.6077197,0,0,0.6077197,97.602116,82.447711)\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\"><g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-149.009,-130.359)\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\">\n    <g transform=\"translate(148.712,134.765)\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\"><path d=\"M 3.328125,-3.015625 C 3.390625,-3.265625 3.625,-4.1875 4.3125,-4.1875 c 0.046875,0 0.296875,0 0.5,0.125 C 4.53125,-4 4.34375,-3.765625 4.34375,-3.515625 c 0,0.15625 0.109375,0.34375 0.375,0.34375 0.21875,0 0.53125,-0.171875 0.53125,-0.578125 0,-0.515625 -0.578125,-0.65625 -0.921875,-0.65625 -0.578125,0 -0.921875,0.53125 -1.046875,0.75 -0.25,-0.65625 -0.78125,-0.75 -1.078125,-0.75 -1.03125,0 -1.609375,1.28125 -1.609375,1.53125 0,0.109375 0.109375,0.109375 0.125,0.109375 0.078125,0 0.109375,-0.03125 0.125,-0.109375 0.34375,-1.0625 1,-1.3125 1.34375,-1.3125 0.1875,0 0.53125,0.09375 0.53125,0.671875 0,0.3125 -0.171875,0.96875 -0.53125,2.375 -0.15625,0.609375 -0.515625,1.03125 -0.953125,1.03125 -0.0625,0 -0.28125,0 -0.5,-0.125 0.25,-0.0625 0.46875,-0.265625 0.46875,-0.546875 0,-0.265625 -0.21875,-0.34375 -0.359375,-0.34375 -0.3125,0 -0.546875,0.25 -0.546875,0.578125 0,0.453125 0.484375,0.65625 0.921875,0.65625 0.671875,0 1.03125,-0.703125 1.046875,-0.75 0.125,0.359375 0.484375,0.75 1.078125,0.75 1.03125,0 1.59375,-1.28125 1.59375,-1.53125 0,-0.109375 -0.078125,-0.109375 -0.109375,-0.109375 -0.09375,0 -0.109375,0.046875 -0.140625,0.109375 -0.328125,1.078125 -1,1.3125 -1.3125,1.3125 -0.390625,0 -0.546875,-0.3125 -0.546875,-0.65625 0,-0.21875 0.046875,-0.4375 0.15625,-0.875 z m 0,0\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\" />\n      </g></g>\n  <g fill=\"#000000\" fill-opacity=\"1\" transform=\"translate(-149.009,-130.359)\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\">\n    <g transform=\"translate(154.406,136.259)\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\"><path d=\"m 1.90625,-2.328125 c 0.546875,0 0.9375,0.375 0.9375,1.125 0,0.859375 -0.515625,1.125 -0.90625,1.125 -0.28125,0 -0.90625,-0.078125 -1.1875,-0.5 0.328125,0 0.40625,-0.234375 0.40625,-0.390625 0,-0.21875 -0.171875,-0.375 -0.390625,-0.375 -0.1875,0 -0.390625,0.125 -0.390625,0.40625 0,0.65625 0.71875,1.078125 1.5625,1.078125 0.96875,0 1.640625,-0.65625 1.640625,-1.34375 0,-0.546875 -0.4375,-1.09375 -1.203125,-1.25 0.71875,-0.265625 0.984375,-0.78125 0.984375,-1.21875 0,-0.546875 -0.625,-0.953125 -1.40625,-0.953125 -0.765625,0 -1.359375,0.375 -1.359375,0.9375 0,0.234375 0.15625,0.359375 0.359375,0.359375 0.21875,0 0.359375,-0.15625 0.359375,-0.34375 0,-0.203125 -0.140625,-0.359375 -0.359375,-0.375 0.25,-0.296875 0.71875,-0.375 0.984375,-0.375 0.3125,0 0.75,0.15625 0.75,0.75 0,0.296875 -0.09375,0.625 -0.28125,0.828125 -0.21875,0.265625 -0.421875,0.28125 -0.765625,0.3125 -0.171875,0.015625 -0.1875,0.015625 -0.21875,0.015625 -0.015625,0 -0.078125,0.015625 -0.078125,0.09375 0,0.09375 0.0625,0.09375 0.1875,0.09375 z m 0,0\" style=\"stroke-width:0;stroke-linecap:butt;stroke-linejoin:round\" />\n      </g></g>\n</g></g>"};
  const pathInformationArtwork = {"12":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"scale(.32,-.32)\"><g transform=\"translate(0,0.6875)\"><path d=\"m 269,0 q -63,0 -63,84 25,141 82,141 378,0 512,25 147,34 184,191 l 879,3515 q 12,63 12,82 0,40 -21,57 -20,18 -63,27 -128,25 -485,25 -65,0 -65,84 22,82 34,111 13,30 75,30 h 1788 q 62,0 62,-84 -3,-16 -13,-54 -9,-37 -25,-62 -15,-25 -46,-25 -375,0 -519,-25 -141,-34 -178,-194 L 1544,416 q -16,-78 -16,-85 0,-15 5,-29 5,-14 19,-25 14,-11 28,-16 14,-5 33,-11 121,-25 487,-25 63,0 63,-84 Q 2141,50 2128,25 2116,0 2053,0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,43.896484,-16.31875)\"><path d=\"m 594,0 v 225 q 800,0 800,203 V 3788 Q 1063,3628 556,3628 v 225 q 785,0 1185,410 h 90 q 22,0 42,-18 21,-17 21,-39 V 428 q 0,-203 800,-203 V 0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,78.896484,-16.31875)\"><path d=\"m 319,0 v 172 q 0,16 12,34 l 994,1100 q 225,244 365,409 141,166 278,382 138,216 218,439 80,223 80,473 0,263 -97,502 -97,239 -289,383 -192,144 -464,144 -278,0 -500,-168 -222,-167 -313,-432 25,6 69,6 144,0 245,-97 102,-97 102,-250 0,-147 -102,-249 -101,-101 -245,-101 -150,0 -252,104 -101,105 -101,246 0,241 90,451 91,211 261,375 171,165 385,252 214,88 454,88 366,0 681,-155 316,-155 500,-438 185,-282 185,-661 0,-278 -122,-528 -122,-250 -313,-455 -190,-204 -487,-464 -297,-259 -390,-346 L 838,519 h 615 q 453,0 758,7 305,8 323,24 75,81 154,591 h 187 L 2694,0 Z\" transform=\"scale(0.015625)\" /></g></g>","13":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"scale(.32,-.32)\"><g transform=\"translate(0,0.6875)\"><path d=\"m 269,0 q -63,0 -63,84 25,141 82,141 378,0 512,25 147,34 184,191 l 879,3515 q 12,63 12,82 0,40 -21,57 -20,18 -63,27 -128,25 -485,25 -65,0 -65,84 22,82 34,111 13,30 75,30 h 1788 q 62,0 62,-84 -3,-16 -13,-54 -9,-37 -25,-62 -15,-25 -46,-25 -375,0 -519,-25 -141,-34 -178,-194 L 1544,416 q -16,-78 -16,-85 0,-15 5,-29 5,-14 19,-25 14,-11 28,-16 14,-5 33,-11 121,-25 487,-25 63,0 63,-84 Q 2141,50 2128,25 2116,0 2053,0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,43.896484,-16.31875)\"><path d=\"m 594,0 v 225 q 800,0 800,203 V 3788 Q 1063,3628 556,3628 v 225 q 785,0 1185,410 h 90 q 22,0 42,-18 21,-17 21,-39 V 428 q 0,-203 800,-203 V 0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,78.896484,-16.31875)\"><path d=\"M 609,494 Q 759,275 1012,169 1266,63 1556,63 q 372,0 528,317 157,317 157,720 0,181 -33,362 -33,182 -111,338 -78,156 -214,250 -136,94 -333,94 h -425 q -56,0 -56,59 v 56 q 0,50 56,50 l 353,29 q 225,0 373,168 149,169 218,411 69,242 69,461 0,306 -144,503 -144,197 -438,197 -243,0 -465,-92 -222,-92 -353,-280 12,3 21,5 10,2 22,2 144,0 241,-100 97,-100 97,-241 0,-138 -97,-238 -97,-100 -241,-100 -140,0 -240,100 -100,100 -100,238 0,275 165,478 166,203 427,308 261,105 523,105 194,0 409,-58 216,-58 391,-166 175,-108 286,-277 111,-168 111,-384 0,-269 -120,-497 -120,-228 -330,-394 -209,-165 -459,-246 278,-53 528,-210 250,-156 401,-400 152,-243 152,-525 0,-353 -194,-639 Q 2538,181 2222,20 1906,-141 1556,-141 1256,-141 954,-26 653,88 461,316 269,544 269,863 q 0,159 106,265 106,106 266,106 103,0 189,-48 86,-48 134,-136 49,-87 49,-187 Q 1013,706 903,600 794,494 641,494 Z\" transform=\"scale(0.015625)\" /></g></g>","23":"<g xmlns=\"http://www.w3.org/2000/svg\" transform=\"scale(.32,-.32)\"><g transform=\"translate(0,0.6875)\"><path d=\"m 269,0 q -63,0 -63,84 25,141 82,141 378,0 512,25 147,34 184,191 l 879,3515 q 12,63 12,82 0,40 -21,57 -20,18 -63,27 -128,25 -485,25 -65,0 -65,84 22,82 34,111 13,30 75,30 h 1788 q 62,0 62,-84 -3,-16 -13,-54 -9,-37 -25,-62 -15,-25 -46,-25 -375,0 -519,-25 -141,-34 -178,-194 L 1544,416 q -16,-78 -16,-85 0,-15 5,-29 5,-14 19,-25 14,-11 28,-16 14,-5 33,-11 121,-25 487,-25 63,0 63,-84 Q 2141,50 2128,25 2116,0 2053,0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,43.896484,-16.31875)\"><path d=\"m 319,0 v 172 q 0,16 12,34 l 994,1100 q 225,244 365,409 141,166 278,382 138,216 218,439 80,223 80,473 0,263 -97,502 -97,239 -289,383 -192,144 -464,144 -278,0 -500,-168 -222,-167 -313,-432 25,6 69,6 144,0 245,-97 102,-97 102,-250 0,-147 -102,-249 -101,-101 -245,-101 -150,0 -252,104 -101,105 -101,246 0,241 90,451 91,211 261,375 171,165 385,252 214,88 454,88 366,0 681,-155 316,-155 500,-438 185,-282 185,-661 0,-278 -122,-528 -122,-250 -313,-455 -190,-204 -487,-464 -297,-259 -390,-346 L 838,519 h 615 q 453,0 758,7 305,8 323,24 75,81 154,591 h 187 L 2694,0 Z\" transform=\"scale(0.015625)\" /></g><g transform=\"matrix(0.7,0,0,0.7,78.896484,-16.31875)\"><path d=\"M 609,494 Q 759,275 1012,169 1266,63 1556,63 q 372,0 528,317 157,317 157,720 0,181 -33,362 -33,182 -111,338 -78,156 -214,250 -136,94 -333,94 h -425 q -56,0 -56,59 v 56 q 0,50 56,50 l 353,29 q 225,0 373,168 149,169 218,411 69,242 69,461 0,306 -144,503 -144,197 -438,197 -243,0 -465,-92 -222,-92 -353,-280 12,3 21,5 10,2 22,2 144,0 241,-100 97,-100 97,-241 0,-138 -97,-238 -97,-100 -241,-100 -140,0 -240,100 -100,100 -100,238 0,275 165,478 166,203 427,308 261,105 523,105 194,0 409,-58 216,-58 391,-166 175,-108 286,-277 111,-168 111,-384 0,-269 -120,-497 -120,-228 -330,-394 -209,-165 -459,-246 278,-53 528,-210 250,-156 401,-400 152,-243 152,-525 0,-353 -194,-639 Q 2538,181 2222,20 1906,-141 1556,-141 1256,-141 954,-26 653,88 461,316 269,544 269,863 q 0,159 106,265 106,106 266,106 103,0 189,-48 86,-48 134,-136 49,-87 49,-187 Q 1013,706 903,600 794,494 641,494 Z\" transform=\"scale(0.015625)\" /></g></g>"};
  function graphSVG(result, api) {
    const cx = 265, ys = [43, 143, 243], radius = 27;
    const pos = Object.fromEntries(result.nodes.map((n, i) => [n, ys[i]]));
    const pieces = [svgStart('Physical interactions, ordered from fast at top to slow at bottom', api)];
    pieces.push('<g class="paths-timescale-guide" fill="#aaaaaa" stroke="none" font-size="19"><text x="145" y="30" text-anchor="middle">FAST</text><path d="M145 48 V253 m-6 -8 6 8 6-8" fill="none" stroke="#bbbbbb" stroke-width="1.8"/><text x="145" y="282" text-anchor="middle">SLOW</text></g>');
    for (const [source, target] of result.edges) {
      const direct = result.rank[source] < result.rank[target], sign = direct ? 1 : -1;
      const color = direct ? '#a40d20' : '#0366c8';
      const long = Math.abs(result.rank[source] - result.rank[target]) === 2;
      const start = {x: long ? cx + 31 : cx, y: pos[source] + sign * (long ? 20 : radius + 8)};
      const end = {x: long ? cx + 31 : cx, y: pos[target] - sign * (long ? 20 : radius + 13)};
      const curve = long ? `M${start.x},${start.y}C${cx + 83},${start.y + sign * 50} ${cx + 83},${end.y - sign * 50} ${end.x},${end.y}` : `M${start.x},${start.y}L${end.x},${end.y}`;
      pieces.push(`<g class="paths-coupling" data-source="${source}" data-target="${target}" data-kind="${direct ? 'direct' : 'feedback'}" role="img" aria-label="${source} to ${target}, ${direct ? 'direct' : 'feedback'}"><path d="${curve}" fill="none" stroke="${color}" stroke-width="3.1"/><circle class="paths-coupling-end" cx="${end.x}" cy="${end.y}" r="5.6" fill="${direct ? color : 'white'}" stroke="${color}" stroke-width="2.1"/></g>`);
    }
    for (const n of result.nodes) {
      pieces.push(`<g class="paths-original-node" data-node="${n}" data-rank="${result.rank[n]}" transform="translate(${cx} ${pos[n]}) scale(${radius / 5.8841329})" role="img" aria-label="x${n}">${pathNodeArtwork[n]}</g>`);
    }
    return pieces.join('') + svgEnd;
  }

  function informationSVG(result, api) {
    const x = 166, y = 34, cell = 72;
    // Exact dark-blue endpoint of Figure 4's colorbar, used categorically.
    const possible = new Set(result.pairs.filter(p => p.shared.length).map(p => [p.a, p.b].sort().join('')));
    const pieces = [svgStart('Pairwise information: structural zeros and pairs that can share information', api)];
    for (const [j, n] of result.nodes.entries()) pieces.push(`<text x="${x + cell * (j + .5)}" y="22" text-anchor="middle" fill="#666" font-size="21">${n}</text>`);
    for (const [i, n] of result.nodes.entries()) pieces.push(`<text x="${x - 17}" y="${y + cell * (i + .5) + 7}" text-anchor="end" fill="#666" font-size="21">${n}</text>`);
    for (const [i, a] of result.nodes.entries()) for (const [j, b] of result.nodes.entries()) {
      const key = [a, b].sort().join(''), active = i < j && possible.has(key);
      pieces.push(`<rect class="paths-information-cell" data-row="${a}" data-column="${b}" data-allowed="${active}" x="${x + cell * j}" y="${y + cell * i}" width="${cell}" height="${cell}" fill="${active ? '#184e77' : 'white'}" stroke="${i < j ? '#999999' : '#d0d0d0'}" stroke-width="1"/>`);
      if (i < j) {
        const tx = x + cell * (j + .5), ty = y + cell * (i + .5);
        pieces.push(active ? `<g class="paths-information-label" data-pair="${key}" transform="translate(${tx - 18.17} ${ty + 8.43})" fill="white" role="img" aria-label="I${key} can be positive">${pathInformationArtwork[key]}</g>` : `<text x="${tx}" y="${ty + 8}" text-anchor="middle" fill="#666" font-size="24">0</text>`);
      }
    }
    pieces.push('<rect x="95" y="275" width="14" height="14" fill="#184e77"/><text x="118" y="288" font-size="18" fill="#555">Colored pairs can share information</text>');
    return pieces.join('') + svgEnd;
  }

  function pathExplanation(result) {
    const pathText = p => p.nodes.map(xName).join(' → ');
    const minimal = result.paths.find(p => p.minimal);
    const blocked = result.paths.find(p => p.propagation && !p.minimal);
    let text;
    if (minimal) {
      text = `${pathText(minimal)} survives: its intermediate layer is faster than the endpoint ${xName(minimal.target)}. The slow source remains in the averaged downstream law. `;
      const shared = result.pairs.find(p => !result.rho[p.a].includes(p.b) && !result.rho[p.b].includes(p.a) && p.shared.length);
      if (shared) text += `${xName(shared.a)} and ${xName(shared.b)} have independent leading laws at fixed ${shared.shared.map(xName).join(', ')}; marginalizing that slow source can make them dependent. `;
    } else if (blocked) {
      text = `${pathText(blocked)} is a propagation path but fails the minimal-path test: ${blocked.removed.map(xName).join(', ')} is slower than its endpoint and is removed. Its upstream instantaneous state is averaged out. `;
    } else if (Object.values(result.rho).every(s => !s.length)) {
      text = 'Every coupling points from fast to slow. Average rates still change the dynamics, but no slow state survives as a condition: the leading joint law is a product. ';
    } else {
      text = 'Slow-to-fast edges retain slow states as conditions. A chain of conditional laws can produce marginal dependence between layers that have no connecting edge. ';
    }
    return text + 'These are leading-order structural permissions. Distinguishability and parameter values set the information, and can make an allowed pair independent.';
  }

  function pathFormula(result) {
    const fast = result.nodes[0], slow = result.nodes[2];
    const factors = result.nodes.slice(0, 2).map(n => {
      const cond = result.rho[n];
      const label = `${n}${cond.length ? '\\mid ' + cond.join(',') : ''}`;
      const args = `x_${n}${cond.length ? '\\mid ' + cond.map(c => 'x_' + c).join(',') : ''}`;
      return `\\pi_{${label}}^{${n === fast ? '\\mathrm{st}' : '\\mathrm{eff,st}'}}(${args})`;
    });
    factors.push(`P_${slow}^{\\mathrm{eff}}(x_${slow},t)`);
    return `<div>\\[p_{123}^{(0)}=${factors.join('\\,')}.\\]</div><div>Keep a slower source if it has a feedback edge, or a directed simple path containing a fast-to-slow edge whose internal nodes are all faster than the endpoint.</div>`;
  }

  function ellipsePlot(model, api) {
    // A radius-two covariance ellipse has probability 1-exp(-2) in two dimensions.
    const series = model.means.map((m, i) => {
      const x = [], y = [];
      for (let n = 0; n <= 120; n++) {
        const t = 2 * Math.PI * n / 120, a = 2 * Math.cos(t), b = 2 * Math.sin(t);
        x.push(m[0] + model.L[0][0] * a);
        y.push(m[1] + model.L[1][0] * a + model.L[1][1] * b);
      }
      return { x, y, label: 'H = ' + model.inputs[i], color: api.colors.states[i], width: 2.5 };
    });
    const xs = series.flatMap(s => s.x), ys = series.flatMap(s => s.y);
    const padded = values => {
      const min = Math.min(...values), max = Math.max(...values), pad = .09 * (max - min);
      return [min - pad, max + pad];
    };
    return api.plot({ width: 550, height: 310, xLabel: 'excitatory activity U_E', yLabel: 'inhibitory activity U_I',
      xDomain: padded(xs), yDomain: padded(ys), series,
      marks: model.means.map((m, i) => ({ x: m[0], y: m[1], color: api.colors.states[i], r: 4 })) });
  }

  const pathSource = 'Nicoletti & Busiello, Information Propagation in Multilayer Systems with Higher-Order Interactions across Timescales, Phys. Rev. X 14, 021007 (2024), Fig. 4; Stochastic processes with multiple temporal scales: timescale separation and information, J. Stat. Mech. 124004 (2025), Eqs. 46–47, 59–63. DOI: 10.1103/PhysRevX.14.021007; 10.1088/1742-5468/ae27b9.';
  const balanceSource = 'Barzon, Busiello & Nicoletti, Excitation-Inhibition Balance Controls Information Encoding in Neural Populations, Phys. Rev. Lett. 134, 068403 (2025), Eqs. 1–2, 5–6. Kolchinsky & Tracey, Estimating Mixture Entropy with Pairwise Distances, Entropy 19, 361 (2017), and Correction: Estimating Mixture Entropy with Pairwise Distances, 19, 588 (2017). DOI: 10.1103/PhysRevLett.134.068403; 10.3390/e19070361; 10.3390/e19110588.';

  host.SIFSLabs.register({
    id: 'paths', title: 'Which slow conditions survive the path?',
    question: 'When a fast intermediate layer is averaged out, can its slow source still condition another layer?',
    stochastic: false, source: pathSource,
    assumptions: 'Leading order under strict hierarchical separation, unique normalized conditional stationary laws, mixing and conserving boundaries. Node labels stay fixed when the order changes. The matrix marks structural zeros and pairs that can share information; it gives no numerical mutual information. Retained conditional sources are listed below.',
    defaults: { motif: 'minimal', order: '123' },
    controls: [
      { key: 'motif', label: 'Dynamical graph', type: 'select', options: Object.entries(motifs).map(([value, m]) => ({ value, label: m.label })) },
      { key: 'order', label: 'Timescale ordering: fastest to slowest', type: 'select', options: orderKeys.map(value => ({ value, label: [...value].map(tauName).join(' ≪ ') })) }
    ],
    presets: [
      { label: 'Minimal path', state: { motif: 'minimal', order: '123' } },
      { label: 'Nonminimal path', state: { motif: 'nonminimal', order: '123' } },
      { label: 'All fast → slow', state: { motif: 'direct', order: '123' } },
      { label: 'All slow → fast', state: { motif: 'feedback', order: '123' } }
    ],
    render(state, api) {
      if (!Object.hasOwn(motifs, state.motif)) throw Error('Choose one of the curated motifs.');
      const result = analyzePaths(motifs[state.motif].edges, state.order);
      return {
        plots: [
          { title: 'Physical interactions', svg: graphSVG(result, api), caption: 'Fast to slow: filled endpoint. Slow to fast: open endpoint.' },
          { title: 'Pairwise information', svg: informationSVG(result, api), caption: '0 follows from the leading factorization. Colored pairs can share information; rates determine its value.' }
        ],
        metrics: [1, 2, 3].map(n => ({ label: 'ρ(' + n + '): retained sources', value: result.rho[n].length ? '{' + result.rho[n].map(xName).join(', ') + '}' : '∅' })).concat([
          { label: 'Pairs allowed to be dependent', value: result.pairs.filter(p => p.shared.length).map(p => p.a + '–' + p.b).join(', ') || 'none at leading order' }
        ]),
        explanation: pathExplanation(result), formula: pathFormula(result)
      };
    }
  });

  host.SIFSLabs.register({
    id: 'balance', title: 'Inhibition changes signal, noise and relaxation',
    question: 'Does stronger neural response also separate the input-conditioned distributions relative to their noise?',
    stochastic: false, source: balanceSource,
    assumptions: 'Linear PRL model: r=1, w=2, D=1/2, τ=1, H∈{0,2.5,5}, π={1/2,1/4,1/4}. Stable side k>0.5, followed by the strict slow-input limit. The reference input time checks validity only; the plotted bounds are not finite-rate MI estimates. At k=0.5 no stationary Gaussian exists.',
    defaults: { k: 1.1, logInputRatio: 3 },
    controls: [
      { key: 'k', label: 'Inhibitory balance k', type: 'range', min: .501, max: 3, step: .001, format: value => fmt(value, 4) },
      { key: 'logInputRatio', label: 'Reference τ_H / τ (validity check)', type: 'range', min: 0, max: 5, step: .05, format: value => fmt(10 ** value) }
    ],
    presets: [
      { label: 'Published balance', state: { k: 1.1, logInputRatio: 3 } },
      { label: 'Closer to the stable edge', state: { k: .51, logInputRatio: 4 } },
      { label: 'Stronger inhibition', state: { k: 3, logInputRatio: 3 } },
      { label: 'Input too fast for this limit', state: { k: .501, logInputRatio: 1 } }
    ],
    render(state, api) {
      const model = balanceModel(Number(state.k), 10 ** Number(state.logInputRatio));
      const distances = Array.from({ length: 121 }, (_, i) => 10 ** (-3 + i / 120 * Math.log10(2500)));
      const curve = distances.map(d => balanceModel(.5 + d));
      const cutoff = 1 / (2 * model.referenceRatio);
      const bands = cutoff > .001 ? [{ x0: .001, x1: Math.min(2.5, cutoff), color: api.colors.fast, opacity: .1 }] : [];
      const boundPlot = api.plot({ width: 550, height: 310, xLabel: 'distance to instability k − 0.5', yLabel: 'information bounds [bits]',
        xDomain: [.0008, 3], yDomain: [0, 1.65], logX: true,
        series: [
          { x: distances, y: curve.map(m => m.lower), color: api.colors.blue, label: 'lower bound' },
          { x: distances, y: curve.map(m => m.upper), color: api.colors.green, label: 'upper bound' }
        ],
        marks: [{ x: model.k - .5, y: model.lower, color: api.colors.blue }, { x: model.k - .5, y: model.upper, color: api.colors.green }],
        hLines: [{ y: 1.5, color: api.colors.gray, label: 'ℋ(H) = 1.5 bits' }], bands
      });
      const ratio = model.inputToRelaxation;
      const validity = ratio <= 1
        ? `The reference input scale is only ${fmt(ratio)} neural relaxation times: the displayed stationary-mixture limit does not describe that finite-rate input.`
        : `The reference input scale is ${fmt(ratio)} neural relaxation times; its shortest correlation mode is ${fmt(model.shortestInputModeToRelaxation)} relaxation times. The adiabatic requirement is a ratio much greater than one.`;
      return {
        plots: [
          { title: 'Conditional stationary Gaussian laws', svg: ellipsePlot(model, api), caption: 'Dots: exact conditional means. Ellipses enclose 86.5% of each Gaussian. Axes rescale; η measures separation relative to covariance.' },
          { title: 'Analytical bounds in the slow-input limit', svg: boundPlot, caption: 'Both curves are bounds, not the mutual information itself. Shading marks where the reference input scale is no longer than neural relaxation.' }
        ],
        metrics: [
          { label: 'Noise-normalized separation η', value: fmt(model.eta, 5) },
          { label: 'Lower ≤ I ≤ upper [bits]', value: model.lower.toFixed(4) + ' ≤ I ≤ ' + model.upper.toFixed(4) },
          { label: 'Slowest relaxation τ_U / τ', value: fmt(model.relaxation, 4) },
          { label: 'Reference τ_H / τ_U', value: fmt(ratio, 4) }
        ],
        explanation: `Changing k changes both the mean response and the noise covariance. As k approaches 0.5 from above, covariance-normalized separation grows and the bounds approach the 1.5-bit input entropy, while relaxation becomes arbitrarily slow. ${validity}`,
        formula: String.raw`<div>\[B=rI-A,\quad m_i=B^{-1}h_i e_E,\quad B\Sigma+\Sigma B^T=2DI,\quad \tau_U=\frac{\tau}{\min\{1,2k-1\}}.\]</div><div>\[\eta=\tfrac12\Delta m^T\Sigma^{-1}\Delta m,\qquad I_b(\eta/4)\le I(X;H)\le I_b(\eta),\quad I_b(z)=-\sum_i\pi_i\log_2\sum_j\pi_j e^{-(i-j)^2z}.\]</div>`
      };
    }
  });
})();
