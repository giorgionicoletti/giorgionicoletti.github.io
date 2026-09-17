/* Interactive teaching constructions for receptor averaging, response overlap, and delayed records.
 * All information uses natural logarithms. No external dependencies.
 * Source equations: sifs-lecture.qmd: receptor covariance, finite-window averaging, Gaussian entropy, delayed records, and appendix 3.
 */
(() => {
  'use strict';
  const root = typeof window === 'undefined' ? globalThis : window;
  const LN2 = Math.log(2);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const linspace = (lo, hi, n) => Array.from({length:n}, (_, i) => lo + (hi - lo) * i / (n - 1));
  const fmt = (v, n=3) => Number(v).toFixed(n);
  const rng = seed => {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  };
  const normal = random => Math.sqrt(-2 * Math.log(Math.max(1e-15, random()))) * Math.cos(2 * Math.PI * random());
  const moments = values => {
    const mean = values.reduce((a,b) => a+b, 0) / values.length;
    return {mean, variance: values.reduce((a,b) => a + (b - mean) ** 2, 0) / values.length};
  };

  // Time is measured in tau_corr, so alpha=p and beta=1-p.
  // The series avoids loss of significance in x + expm1(-x) near x=0.
  function receptorVariance(p, x) {
    if (!(p > 0 && p < 1) || !(x >= 0)) throw new Error('Require 0 < p < 1 and T/tau_corr >= 0.');
    const factor = x < 1e-3
      ? 1 - x / 3 + x*x / 12 - x*x*x / 60 + x**4 / 360
      : 2 * (x + Math.expm1(-x)) / (x*x);
    return p * (1-p) * factor;
  }
  function receptorPath(p, duration, seed) {
    const random = rng(seed);
    let state = random() < p ? 1 : 0;
    let time = 0, area = 0;
    const x = [0], y = [state];
    while (time < duration) {
      const rate = state ? 1-p : p;
      const next = time - Math.log(Math.max(1e-15, random())) / rate;
      const end = Math.min(duration, next);
      area += state * (end - time);
      if (next < duration) {
        // Explicit corners also render correctly without an SVG step helper.
        x.push(next, next); y.push(state, 1-state);
      }
      time = end;
      state = 1-state;
    }
    x.push(duration); y.push(y[y.length-1]);
    return {x, y, occupancy: area / duration};
  }
  function receptorEnsemble(p, duration, seed, count=1800) {
    const values = Array.from({length:count}, (_, i) => receptorPath(p, duration, (seed + Math.imul(i + 1, 2654435761)) >>> 0).occupancy);
    return {values, ...moments(values)};
  }
  function histogram(values, bins=30) {
    const counts = Array(bins).fill(0);
    for (const value of values) counts[Math.min(bins-1, Math.max(0, Math.floor(value*bins)))]++;
    return {x:counts.map((_, i) => (i+0.5)/bins), y:counts.map(n => n/values.length)};
  }

  const gaussian = z => Math.exp(-z*z/2) / Math.sqrt(2*Math.PI);
  const softplus = x => Math.max(x, 0) + Math.log1p(Math.exp(-Math.abs(x)));
  // Integrate E_{Z~N(0,1)} log[2/(1+exp(-d/sigma*(d/(2sigma)+Z)))].
  // Symmetry makes this the MI of the two equally likely Gaussian components.
  function gaussianBinaryMI(separation, sigma=1) {
    if (!(separation >= 0) || !(sigma > 0)) throw new Error('Require nonnegative separation and positive Gaussian width.');
    const a = separation / sigma;
    if (a === 0) return 0;
    const n = 1024, h = 18/n;
    let total = 0;
    for (let i=0; i<=n; i++) {
      const z = -9 + i*h;
      const value = gaussian(z) * (LN2 - softplus(-a*(a/2 + z)));
      total += (i === 0 || i === n ? 1 : i % 2 ? 4 : 2) * value;
    }
    return clamp(total*h/3, 0, LN2);
  }

  function delayInformation(delay, noiseSD) {
    if (!(delay >= 0) || !(noiseSD > 0)) throw new Error('Require a nonnegative delay and finite positive noise.');
    const rho = Math.exp(-delay) / Math.sqrt(1 + noiseSD*noiseSD);
    return {rho, snapshot: -0.5*Math.log1p(-rho*rho), aligned: 0.5*Math.log1p(1/(noiseSD*noiseSD))};
  }
  function delayRecords(delay, noiseSD, seed, duration=80, dt=0.04) {
    const lag = Math.round(delay/dt), padding = 102;
    const length = Math.round(duration/dt)+1;
    const count = length + 2*padding;
    const randomS = rng(seed), randomN = rng((seed ^ 0x7f4a7c15) >>> 0);
    const signal = Array(count), noise = Array(count);
    const decay = Math.exp(-dt), innovation = Math.sqrt(-Math.expm1(-2*dt));
    signal[0] = normal(randomS);
    noise[0] = normal(randomN);
    for (let i=1; i<count; i++) {
      signal[i] = decay*signal[i-1] + innovation*normal(randomS);
      noise[i] = normal(randomN);
    }
    const t=[], s=[], equal=[], aligned=[];
    for (let i=0; i<length; i++) {
      const k=i+padding;
      t.push(i*dt); s.push(signal[k]);
      equal.push(signal[k-lag] + noiseSD*noise[k]);
      aligned.push(signal[k] + noiseSD*noise[k+lag]);
    }
    return {t,s,equal,aligned,dt,delay:lag*dt};
  }

  root.SIFSLabModels = Object.assign(root.SIFSLabModels || {}, {
    foundations:{receptorVariance,receptorPath,receptorEnsemble,histogram,gaussianBinaryMI,delayInformation,delayRecords,rng,normal}
  });
  if (!root.SIFSLabs) return;

  root.SIFSLabs.register({
    id:'receptor', title:'How much does a longer observation tell us?',
    question:'Stretch the observation window. Does faster recording create more independent information?',
    assumptions:'Stationary two-state Markov receptor at fixed concentration. Time is in units of τcorr; transition rates are α=p and β=1−p. Exact jump times, with no diffusion or rebinding.',
    source:'Berg & Purcell, Biophys. J. 20, 193 (1977). Exact finite-window calculation: “Finite observation time and effective samples” and appendix 3.',
    stochastic:true,
    defaults:{logT:0.3,p:0.4,seed:73519},
    controls:[
      {key:'logT',label:'Observation window T / τcorr',type:'range',min:-1,max:2,step:0.05,format:v=>fmt(10**v,2)},
      {key:'p',label:'Stationary occupancy p',type:'range',min:0.1,max:0.9,step:0.05,format:v=>fmt(v,2)}
    ],
    presets:[{label:'One nearly frozen state',state:{logT:-1}},{label:'One correlation time',state:{logT:0}},{label:'Many correlation times',state:{logT:1.7}}],
    render(state,api) {
      const T=10**state.logT, p=+state.p;
      const ensemble=receptorEnsemble(p,T,+state.seed), hist=histogram(ensemble.values);
      const end=Math.min(100,Math.max(6,1.3*T));
      const trace=receptorPath(p,end,+state.seed);
      const variance=receptorVariance(p,T), neff=p*(1-p)/variance;
      return {
        plots:[
          {title:'One receptor record and the observation window',svg:api.plot({xLabel:'Time / τcorr',yLabel:'Occupancy R(t)',xDomain:[0,end],yDomain:[-0.12,1.15],series:[{x:trace.x,y:trace.y,color:api.colors.ink,label:'R(t)',width:2}],bands:[{x0:0,x1:T,color:api.colors.blue,opacity:0.12}],vLines:[{x:T,color:api.colors.blue,label:'T'}],hLines:[{y:p,color:api.colors.gray,label:'p'}],width:600,height:280}),caption:'The shaded interval is integrated exactly. Changing T reuses the same receptor paths.'},
          {title:'Distribution of occupancy estimates',svg:api.plot({xLabel:'Time-averaged occupancy R̄_T',yLabel:'Fraction of records',xDomain:[0,1],yDomain:[0,Math.max(...hist.y)*1.16],series:[{x:hist.x,y:hist.y,color:api.colors.blue,mode:'bars',barWidth:1/32}],vLines:[{x:p,color:api.colors.ink,label:'p'}],width:600,height:280}),caption:'1,800 independent stationary records; bin fractions sum to 1. Short windows can have point masses at 0 and 1.'}
        ],
        metrics:[{label:'Exact variance',value:fmt(variance,4)},{label:'Simulated variance',value:fmt(ensemble.variance,4)},{label:'Exact effective samples',value:fmt(neff,2)}],
        explanation:T<0.5 ? 'A short record is almost one Bernoulli draw. More frequent recording of that same state does not remove its uncertainty.' : T<10 ? 'Correlations still matter across much of the observation window. The exact effective count is defined by matching the variance to independent Bernoulli averaging.' : 'The distribution narrows around p as the window grows. In the long-window limit, N_eff ≃ T/(2τcorr); this is a variance-equivalent count, not the number of jumps or recording frames.',
        formula:'\\(x=T/\\tau_{\\mathrm{corr}},\\qquad \\operatorname{Var}(\\bar R_T)=p(1-p)\\,\\frac{2(x-1+e^{-x})}{x^2},\\qquad N_{\\mathrm{eff}}=\\frac{p(1-p)}{\\operatorname{Var}(\\bar R_T)}.\\)'
      };
    }
  });

  root.SIFSLabs.register({
    id:'overlap', title:'When can the response distinguish two inputs?',
    question:'Keep the two inputs equally likely. What changes when their response distributions overlap?',
    assumptions:'Teaching channel: two equiprobable inputs, with Gaussian response means ±d/2 and a common standard deviation σ. This binary example illustrates distinguishability; it does not optimize an input distribution.',
    source:'Shannon, Bell Syst. Tech. J. 27, 379 (1948); Tkačik & Bialek, ARCMP 7, 89 (2016). Gaussian conditional entropy: “Conditional entropy in the small-noise limit”.',
    defaults:{separation:2,sigma:1},
    controls:[
      {key:'separation',label:'Separation of response means d',type:'range',min:0,max:8,step:0.1,format:v=>fmt(v,1)},
      {key:'sigma',label:'Conditional width σ',type:'range',min:0.25,max:2,step:0.05,format:v=>fmt(v,2)}
    ],
    presets:[{label:'Identical responses',state:{separation:0,sigma:1}},{label:'Partial overlap',state:{separation:2,sigma:1}},{label:'Well separated',state:{separation:6,sigma:0.7}}],
    render(state,api) {
      const d=+state.separation, sigma=+state.sigma, ratio=d/sigma;
      const mi=gaussianBinaryMI(d,sigma), entropy=0.5*Math.log(2*Math.PI*Math.E*sigma*sigma);
      const bound=d/2+4.2*sigma, x=linspace(-bound,bound,401);
      const a=x.map(r=>gaussian((r+d/2)/sigma)/sigma), b=x.map(r=>gaussian((r-d/2)/sigma)/sigma);
      const ratios=linspace(0,Math.max(8,Math.ceil(ratio)),101), curve=ratios.map(v=>gaussianBinaryMI(v));
      return {
        plots:[
          {title:'Conditional responses and their mixture',svg:api.plot({legendDashes:true,xLabel:'Response u (chosen units)',yLabel:'Probability density',xDomain:[-bound,bound],yDomain:[0,1.12/(sigma*Math.sqrt(2*Math.PI))],series:[{x,y:a,color:api.colors.ink,label:'p(u | h_1)'},{x,y:b,color:api.colors.ink,label:'p(u | h_2)',dash:'8 6'},{x,y:a.map((v,i)=>(v+b[i])/2),color:api.colors.fast,label:'p(u)',width:1.5}],width:600,height:280}),caption:'Both inputs still have probability 1/2. Their conditional laws, and therefore the mixture, change with the controls.'},
          {title:'Information grows with distinguishability',svg:api.plot({xLabel:'Separation / width: d / σ',yLabel:'Mutual information (nats)',xDomain:[0,ratios[ratios.length-1]],yDomain:[0,LN2*1.12],series:[{x:ratios,y:curve,color:api.colors.ink,label:'I(H;U)'}],marks:[{x:ratio,y:mi,color:api.colors.blue,r:5,label:'Current channel'}],hLines:[{y:LN2,color:api.colors.gray,label:'ℋ(H) = ln 2'}],width:600,height:280}),caption:'Numerical integration of the Gaussian mixture. Gaussian tails always overlap at finite d/σ, so ln 2 is approached as a limit.'}
        ],
        metrics:[{label:'Mutual information',value:`${fmt(mi,3)} nats`},{label:'Input entropy ℋ(H)',value:`${fmt(LN2,3)} nats`},{label:'Conditional entropy ℋ(U|H)',value:`${fmt(entropy,3)} nats`}],
        explanation:d===0 ? 'Identical conditional laws reveal nothing about the input: I=0, even though the input itself remains uncertain.' : ratio<3 ? 'Where the conditional responses overlap, the observed response can plausibly come from either input. Narrower responses or greater separation reduce that ambiguity.' : 'The response nearly identifies which input occurred. Its information approaches the fixed input entropy. ℋ(U|H) is a differential entropy in the displayed response units; unlike mutual information, it can be negative.',
        formula:'<div>\\(p(u)=\\tfrac12p(u\\mid 0)+\\tfrac12p(u\\mid 1),\\qquad \\mathcal{H}(U\\mid H)=\\log[\\sqrt{2\\pi e}\\,\\sigma].\\)</div><div>\\(I=\\tfrac12\\sum_{h=0,1}\\int p(u\\mid h)\\log\\frac{p(u\\mid h)}{p(u)}\\,du.\\)</div>'
      };
    }
  });

  root.SIFSLabs.register({
    id:'delay', title:'A delayed waveform can outlive its snapshot correlation',
    question:'Increase the delay, then align the records. Which dependence disappeared, and which remained?',
    assumptions:'Stationary Gaussian OU signal with Var(H)=1 and τ_H=1. Exact OU samples every 0.04 τ_H; independent Gaussian observation noise has variance ν² per sample. Finite records illustrate the process; metrics come from its stationary law.',
    source:'Independent delayed-Gaussian teaching construction, “A delayed response as a counterexample” and “Snapshot information for Gaussian variables”. Trajectory-information context: Tostevin & ten Wolde, Phys. Rev. Lett. 102, 218101 (2009).',
    stochastic:true,
    defaults:{delay:1.6,noise:0.3,align:false,seed:14971},
    controls:[
      {key:'delay',label:'Response delay Δ / τ_H',type:'range',min:0,max:4,step:0.04,format:v=>fmt(v,2)},
      {key:'noise',label:'Observation noise standard deviation ν',type:'range',min:0.15,max:1.2,step:0.05,format:v=>fmt(v,2)},
      {key:'align',label:'Align records: compare H(t) with U(t+Δ)',type:'checkbox'}
    ],
    presets:[{label:'No delay',state:{delay:0,align:false}},{label:'Delay loses the snapshot',state:{delay:2.4,align:false}},{label:'Recover the lag',state:{delay:2.4,align:true}}],
    render(state,api) {
      const d=Math.round(+state.delay/0.04)*0.04, noise=+state.noise;
      const data=delayRecords(d,noise,+state.seed), info=delayInformation(d,noise);
      const response=state.align?data.aligned:data.equal, label=state.align?'U(t+Δ)':'U(t)';
      const visible=401, paired=data.s.map((v,i)=>i%3===0?[v,response[i]]:null).filter(Boolean);
      const extent=Math.max(3.5,Math.ceil(Math.max(...data.s.map(Math.abs),...response.map(Math.abs))*2)/2);
      return {
        plots:[
          {title:state.align?'The same temporal records, aligned':'The same records at equal clock time',svg:api.plot({xLabel:'Time / τ_H',yLabel:'Signal and response',xDomain:[0,16],yDomain:[-extent,extent],series:[{x:data.t.slice(0,visible),y:data.s.slice(0,visible),color:api.colors.ink,label:'H(t)',width:2},{x:data.t.slice(0,visible),y:response.slice(0,visible),color:api.colors.blue,label,opacity:0.8,width:1.25}],width:600,height:280}),caption:'First 16 τ_H of one stationary record. The signal and noise realizations stay fixed as the delay changes.'},
          {title:state.align?'Lag-aligned sample pairs':'Equal-time sample pairs',svg:api.plot({xLabel:'H(t)',yLabel:label,xDomain:[-extent,extent],yDomain:[-extent,extent],series:[{x:[-extent,extent],y:[-extent,extent],color:api.colors.gray,label:'U = H',width:1},{x:paired.map(v=>v[0]),y:paired.map(v=>v[1]),color:api.colors.blue,mode:'points',opacity:0.27}],width:600,height:280}),caption:'One of every three pairs from an 80 τ_H record. The cloud fluctuates with the realization; the analytic information below does not.'}
        ],
        metrics:[{label:'Equal-time I(H(t);U(t))',value:`${fmt(info.snapshot,3)} nats`},{label:'Lag-aligned I(H(t);U(t+Δ))',value:`${fmt(info.aligned,3)} nats`},{label:'Analytic correlation at this lag',value:fmt(state.align?1/Math.sqrt(1+noise*noise):info.rho,3)}],
        explanation:state.align ? 'Alignment restores the signal component hidden by the delay. The displayed information concerns one pair at a chosen lag. It is not the mutual information of an entire finite record or a trajectory information rate.' : 'As the delay exceeds signal memory, equal-time pairs become weakly correlated even though the delayed waveform remains recognizable. Align the records to expose that retained lag structure. The information numbers concern single pairs, not a trajectory rate.',
        formula:'<div>\\(U(t)=H(t-\\Delta)+\\eta(t),\\qquad \\rho_{\\mathrm{equal}}=\\frac{e^{-\\Delta/\\tau_H}}{\\sqrt{1+\\nu^2}}.\\)</div><div>\\(I_{\\mathrm{equal}}=-\\tfrac12\\log(1-\\rho_{\\mathrm{equal}}^2),\\qquad I_{\\mathrm{aligned}}=\\tfrac12\\log(1+\\nu^{-2}).\\)</div>'
      };
    }
  });
})();
