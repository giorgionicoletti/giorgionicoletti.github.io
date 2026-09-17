/* Exact teaching constructions for lag geometry and stochastic averaging.
 * Coordinate geometry and Gaussian moments; no random simulation or dependencies.
 * Sources: current sifs-lecture.qmd and the papers named in each registration.
 */
(() => {
  'use strict';
  const root = typeof window === 'undefined' ? globalThis : window;
  const linspace = (a,b,n) => Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
  const fmt = (x,n=2) => (Math.abs(x)<0.5*10**(-n)?0:x).toFixed(n);
  const signed = x => (x>0?'+':'')+fmt(x);
  const finite = (x,name) => {if(!Number.isFinite(x))throw Error(name+' must be finite.');};

  // Coordinates are divided by T. The square has horizontal coordinate t'/T
  // and vertical coordinate t/T. Parameter v is the EARLIER time, divided by T.
  function lagGeometry(lag) {
    finite(lag,'Lag');
    if(Math.abs(lag)>1)throw Error('Require −1 ≤ u/T ≤ 1.');
    const length=1-Math.abs(lag);
    return {lag,length,earlier:[0,length],
      start:{t:Math.max(lag,0),tp:Math.max(-lag,0)},
      end:{t:length+Math.max(lag,0),tp:length+Math.max(-lag,0)},
      jacobian:1};
  }
  function pairAt(lag,v) {
    const g=lagGeometry(lag);finite(v,'Earlier time');
    if(v<0||v>g.length)throw Error('Earlier time lies outside the pair interval.');
    return {t:v+Math.max(lag,0),tp:v+Math.max(-lag,0)};
  }
  function lagKernel(lag,memory) {
    const g=lagGeometry(lag);finite(memory,'Correlation time');
    if(memory<=0)throw Error('Require τcorr/T > 0.');
    const covariance=Math.exp(-Math.abs(lag)/memory);
    return {...g,covariance,integrand:g.length*covariance};
  }
  // Var(nbar_T)/C_n(0) = integral_{-1}^{1}(1-|z|) exp(-|z|/r) dz.
  // An inverse-r series preserves the nearly frozen (r >> 1) limit.
  function normalizedWindowVariance(memory) {
    finite(memory,'Correlation time');
    if(memory<=0)throw Error('Require τcorr/T > 0.');
    const x=1/memory;
    return x<1e-3 ? 1-x/3+x*x/12-x**3/60+x**4/360
      : 2*memory*(1+memory*Math.expm1(-x));
  }
  function gaussianMoments(mu,sigma) {
    finite(mu,'Mean');finite(sigma,'Standard deviation');
    if(sigma<0)throw Error('Require σ ≥ 0.');
    const meanSquared=mu*mu,variance=sigma*sigma;
    return {mean:mu,meanSquared,variance,second:meanSquared+variance};
  }
  function gaussianDensity(x,mu,sigma) {
    gaussianMoments(mu,sigma);finite(x,'Fast state');
    if(sigma===0)throw Error('At σ=0 the law is a point mass, not a density.');
    return Math.exp(-0.5*((x-mu)/sigma)**2)/(Math.sqrt(2*Math.PI)*sigma);
  }
  function slowDrifts(mu,sigma,y) {
    const m=gaussianMoments(mu,sigma);finite(y,'Slow state');
    return {averaged:m.second-y,atMean:m.meanSquared-y,gap:m.variance};
  }

  root.SIFSLabModels=Object.assign(root.SIFSLabModels||{}, {
    geometry:{lagGeometry,pairAt,lagKernel,normalizedWindowVariance,gaussianMoments,gaussianDensity,slowDrifts}
  });
  if(!root.SIFSLabs)return;

  function svgStart(w,h,label,api) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${api.escape(label)}"><style>.sifs-geometry text{font-family:'Fira Sans',Arial,sans-serif;font-size:17px;fill:${api.colors.ink};font-weight:400}.sifs-geometry .small{font-size:16px}.sifs-geometry .strong{font-weight:500}</style><g class="sifs-geometry">`;
  }
  function pairSquare(lag,api,compact=false) {
    const g=lagGeometry(lag),W=compact?330:600,H=compact?210:280;
    const left=compact?40:64,top=compact?18:33,size=compact?132:174;
    const sx=v=>left+size*v,sy=v=>top+size*(1-v);
    const tx=(x,y,text,attrs='')=>`<text x="${x}" y="${y}" ${attrs}>${api.escape(text)}</text>`;
    const rx=compact?194:317,rw=compact?113:247,ry=compact?139:166;
    const parts=[svgStart(W,H,'Pairs of observations at signed lag u/T = '+signed(lag),api),
      `<rect x="${left}" y="${top}" width="${size}" height="${size}" fill="#f7f9fb" stroke="#8fa1b4"/>`,
      `<path d="M${sx(0)},${sy(0)}L${sx(1)},${sy(1)}" stroke="#b5c2ce" stroke-dasharray="4 4" fill="none"/>`,
      `<path d="M${sx(g.start.tp)},${sy(g.start.t)}L${sx(g.end.tp)},${sy(g.end.t)}" stroke="${api.colors.blue}" stroke-width="4" fill="none"/>`,
      ...[g.start,g.end].map(p=>`<circle cx="${sx(p.tp)}" cy="${sy(p.t)}" r="4" fill="${api.colors.blue}"/>`),
      tx(left-9,top+size+17,'0','text-anchor="end" class="small"'),
      tx(left-9,top+5,'1','text-anchor="end" class="small"'),
      tx(left+size,top+size+21,'1','text-anchor="middle" class="small"'),
      tx(left+size/2,top+size+42,'t′ / T','text-anchor="middle"'),
      `<text transform="translate(${compact?15:24} ${top+size/2}) rotate(-90)" text-anchor="middle">t / T</text>`,
      tx(rx,compact?40:49,'u / T = '+signed(lag),'class="strong"'),
      tx(rx,compact?73:82,'Earlier time v','class="small"'),
      tx(rx,compact?97:108,compact?'0 ≤ v / T ≤':'0 ≤ v / T ≤ 1 − |u| / T','class="small"')];
    if(compact)parts.push(tx(rx,119,fmt(g.length),'class="strong"'));
    parts.push(`<path d="M${rx},${ry}h${rw}" stroke="#ccd5df" stroke-width="3"/>`,
      `<path d="M${rx},${ry-5}v10M${rx+rw},${ry-5}v10" stroke="#8fa1b4"/>`,
      `<path d="M${rx},${ry}h${rw*g.length}" stroke="${api.colors.blue}" stroke-width="5"/>`,
      `<circle cx="${rx+rw*g.length}" cy="${ry}" r="4" fill="${api.colors.blue}"/>`,
      tx(rx,ry+24,'0','text-anchor="middle" class="small"'),
      tx(rx+rw,ry+24,'1','text-anchor="middle" class="small"'),
      tx(rx,compact?198:221,compact?'weight = '+fmt(g.length):'Pair weight: 1 − |u| / T = '+fmt(g.length),'class="small"'));
    if(!compact)parts.push(tx(rx,250,'Coordinate interval; Jacobian = 1.','class="small"'));
    return parts.join('')+'</g></svg>';
  }

  root.SIFSLabs.register({
    id:'lag', title:'Why does a lag carry the weight T − |u|?',
    question:'Move the signed lag across the observation square. How many placements of the earlier observation remain?',
    assumptions:'Stationary scalar receptor occupancy: C_n(u)=C_n(0) exp(−|u|/τcorr). Both observation times lie in [0,T]. Geometry is exact; the covariance curve uses the two-state Markov receptor. T is fixed and all times are divided by T.',
    source:'Berg & Purcell, “Physics of chemoreception” (1977), DOI: 10.1016/S0006-3495(77)85544-6. Independent pair-counting derivation and finite-window integral: “Counting pairs at a fixed lag” and “Finite observation time and effective samples”.',
    defaults:{lag:0.35,memory:0.3},
    controls:[
      {key:'lag',label:'Signed lag u / T',type:'range',min:-1,max:1,step:0.01,format:signed},
      {key:'memory',label:'Receptor memory τcorr / T',type:'range',min:0.05,max:2,step:0.05,format:v=>fmt(v)}
    ],
    presets:[{label:'Zero lag',state:{lag:0,memory:0.3}},{label:'Positive lag',state:{lag:0.5,memory:0.3}},{label:'Reverse order',state:{lag:-0.5,memory:0.3}},{label:'Window edge',state:{lag:1,memory:0.3}}],
    inlineKeys:['lag'],
    inline(state,api){return {svg:pairSquare(+state.lag,api,true),caption:''};},
    render(state,api) {
      const lag=+state.lag,memory=+state.memory,g=lagKernel(lag,memory);
      const x=linspace(-1,1,301),weight=x.map(u=>lagGeometry(u).length),integrand=x.map(u=>lagKernel(u,memory).integrand);
      return {
        plots:[
          {title:'A diagonal of pairs and its coordinate interval',svg:pairSquare(lag,api),caption:'The blue segment contains pairs with t − t′ = u. Parameterizing it by the earlier time gives length T − |u|. Its Euclidean length is a different quantity.'},
          {title:'Pair weighting turns covariance into variance',svg:api.plot({xLabel:'Signed lag u / T',yLabel:'Normalized weight',xDomain:[-1,1],yDomain:[0,1.12],series:[{x,y:weight,color:api.colors.gray,label:'Pair weight w'},{x,y:integrand,color:api.colors.blue,label:'w × C_n(u) / C_n(0)'}],vLines:[{x:lag,color:api.colors.ink}],marks:[{x:lag,y:g.length,color:api.colors.gray},{x:lag,y:g.integrand,color:api.colors.blue}],width:600,height:280}),caption:'w = 1 − |u|/T. Integrating the blue curve over u/T gives Var(n̄_T)/C_n(0). A point selected by the slider has zero area; the integral collects intervals of lags.'}
        ],
        metrics:[{label:'Pair weight (T − |u|) / T',value:fmt(g.length)},{label:'Weighted covariance / C_n(0)',value:fmt(g.integrand,3)},{label:'Integral: Var(n̄_T) / C_n(0)',value:fmt(normalizedWindowVariance(memory),3)}],
        explanation:Math.abs(lag)===1 ? 'At the window edge only one corner pair survives. Its coordinate interval is zero, so this endpoint contributes no area to the variance integral.' : lag<0 ? 'Negative lag reverses the observation order. The available earlier-time interval and the stationary scalar covariance are unchanged at the corresponding positive lag; this symmetry supplies the factor of two.' : 'Fix u ≥ 0 and write t = v + u, t′ = v. The earlier time runs from 0 to T − u. The coordinate transformation has unit Jacobian, so the pair weight is T − u, with no Euclidean √2 factor. The other time order supplies an equal contribution.',
        formula:'<div>\\(u\\ge0:\\quad (t,t\')=(v+u,v),\\quad 0\\le v\\le T-u,\\quad \\left|\\frac{\\partial(t,t\')}{\\partial(u,v)}\\right|=\\left|\\det\\begin{pmatrix}1&1\\\\0&1\\end{pmatrix}\\right|=1.\\)</div><div>\\(\\int_0^T\\!dt\\int_0^T\\!dt\'\\,C_n(|t-t\'|)=\\int_{-T}^{T}\\!du\\,(T-|u|)C_n(|u|).\\)</div><div>\\(\\operatorname{Var}(\\bar n_T)=\\frac{2}{T^2}\\int_0^T (T-u)C_n(u)\\,du.\\)</div>'
      };
    }
  });

  root.SIFSLabs.register({
    id:'averaging',title:'Averaging a nonlinear drift keeps the fast variance',
    question:'Hold the fast mean fixed and broaden its stationary law. Does the slow drift change?',
    assumptions:'Dimensionless teaching example: fast X has Gaussian stationary law N(μ,σ²), independent of the frozen slow state y; slow drift b(x,y)=x²−y. The effective drift is the leading limit τ_x/τ_y → 0, after fast relaxation, with a unique mixing fast law and probability-conserving boundaries. No finite-separation simulation or correction is shown. σ=0 is the point-mass limit.',
    source:'Method: Bo & Celani, “Multiple-scale stochastic processes: decimation, averaging and beyond” (2017), DOI: 10.1016/j.physrep.2016.12.003; Nicoletti & Busiello, “Stochastic processes with multiple temporal scales: timescale separation and information” (2025), DOI: 10.1088/1742-5468/ae27b9. Gaussian x² example is an independent teaching construction for “The fast conditional stationary law” and “Averaging closes the slow dynamics”.',
    defaults:{mu:1,sigma:0.8},
    controls:[
      {key:'mu',label:'Fast mean μ',type:'range',min:-2,max:2,step:0.1,format:v=>fmt(v,1)},
      {key:'sigma',label:'Fast standard deviation σ',type:'range',min:0,max:2,step:0.1,format:v=>fmt(v,1)}
    ],
    presets:[{label:'No fast variance',state:{mu:1,sigma:0}},{label:'Centered fluctuations',state:{mu:0,sigma:1}},{label:'Broaden at fixed mean',state:{mu:1,sigma:1.5}},{label:'Reverse the mean',state:{mu:-1,sigma:0.8}}],
    inlineKeys:['mu','sigma'],
    inline(state,api) {
      const m=gaussianMoments(+state.mu,+state.sigma);
      return {svg:svgStart(620,52,'Second moment '+fmt(m.second)+'; square of the mean '+fmt(m.meanSquared)+'; difference '+fmt(m.variance),api)+
        `<text x="310" y="21" text-anchor="middle" style="font-size:21px;fill:${api.colors.fast}">E[X²] = μ² + σ² = ${fmt(m.meanSquared)} + ${fmt(m.variance)} = ${fmt(m.second)}</text>`+
        `<text x="310" y="47" text-anchor="middle" style="font-size:21px">(E[X])² = ${fmt(m.meanSquared)}　　Missing variance: ${fmt(m.variance)}</text></g></svg>`,caption:''};
    },
    render(state,api) {
      const mu=+state.mu,sigma=+state.sigma,m=gaussianMoments(mu,sigma);
      const extent=Math.max(3,Math.abs(mu)+4.5*sigma),x=sigma?linspace(mu-4.5*sigma,mu+4.5*sigma,301):[mu,mu];
      const density=sigma?x.map(v=>gaussianDensity(v,mu,sigma)):[0,1];
      const densitySvg=api.plot({xLabel:'Fast state x',yLabel:sigma?'Stationary density π(x)':'Probability mass',xDomain:[-extent,extent],yDomain:[0,sigma?1.15/(Math.sqrt(2*Math.PI)*sigma):1.2],series:[{x,y:density,color:api.colors.fast,label:sigma?'Fast stationary law':'Unit point mass'}],vLines:sigma?[{x:mu,color:api.colors.gray,label:'μ'}]:[],marks:sigma?[]:[{x:mu,y:1,color:api.colors.fast}],width:600,height:280});
      const end=Math.max(2,m.second+1),y=linspace(-0.5,end,151),low=m.meanSquared-end,high=m.second+0.5,pad=0.1*(high-low);
      return {
        plots:[
          {title:sigma?'The fast stationary distribution':'The zero-variance limit',svg:densitySvg,caption:sigma?'The mean is μ; the spread is σ. For this illustrative case π is independent of y. Changing σ at fixed μ changes the mean of x².':'At σ = 0, X = μ with probability one. The stem marks a unit probability mass, not a finite probability density.'},
          {title:'Two different predictions for the slow drift',svg:api.plot({xLabel:'Slow state y',yLabel:'Slow drift dy / ds',xDomain:[-0.5,end],yDomain:[low-pad,high+pad],series:[{x:y,y:y.map(v=>slowDrifts(mu,sigma,v).averaged),color:api.colors.fast,label:'Averaged drift'},{x:y,y:y.map(v=>slowDrifts(mu,sigma,v).atMean),color:api.colors.gray,label:'At mean only',dash:'6 4',width:1.7}],hLines:[{y:0,color:api.colors.gray}],bands:[{x0:m.meanSquared,x1:m.second,color:api.colors.fast,opacity:0.08}],marks:[{x:m.meanSquared,y:0,color:api.colors.gray,r:4},{x:m.second,y:0,color:api.colors.fast,r:4}],width:600,height:280}),caption:'Each zero crossing is a stable fixed point of its displayed drift. Averaging moves it from μ² to μ² + σ². The shaded interval shows this shift, not a probability distribution.'}
        ],
        metrics:[{label:'Average of the square E[X²]',value:fmt(m.second)},{label:'Square of the mean (E[X])²',value:fmt(m.meanSquared)},{label:'Drift and fixed-point difference',value:'σ² = '+fmt(m.variance)}],
        explanation:sigma===0?'With no fast variance, the two drifts coincide. For σ > 0 the nonlinear function x² retains a contribution from fluctuations even when the mean is zero.':mu===0?'The mean fast input vanishes, but its average square is σ². Evaluating x² only at the mean would discard the entire positive drive in this example.':'Averaging the full slow operator gives a drift larger by σ² at every y. This example holds π fixed across y. For a conditional law π(x|y), the slow derivatives must still act on its y-dependent moments inside the effective operator.',
        formula:'<div>\\(X=\\mu+\\sigma Z,\\quad Z\\sim\\mathcal N(0,1),\\quad \\mathbb E[X^2]=\\mu^2+2\\mu\\sigma\\underbrace{\\mathbb E[Z]}_{0}+\\sigma^2\\underbrace{\\mathbb E[Z^2]}_{1}=\\mu^2+\\sigma^2.\\)</div><div>\\(\\mathcal L_y(x)[\\pi P]=-\\partial_y[(x^2-y)\\pi(x\\mid y)P].\\)</div><div>\\(\\mathcal L_y^{\\mathrm{eff}}P=\\int dx\\,\\mathcal L_y(x)[\\pi P]=-\\partial_y[(\\mathbb E[X^2\\mid y]-y)P].\\)</div><div>\\(\\bar b(y)=\\mu^2+\\sigma^2-y,\\qquad b(\\mathbb E[X],y)=\\mu^2-y.\\)</div>'
      };
    }
  });
})();
