/* Small manipulations embedded in the derivations; state is shared with the
 * expanded experiments. Authored figures remain as no-JavaScript fallbacks. */
(() => {
  'use strict';
  const mount = () => {
    const labs=window.SIFSLabs;if(!labs)return;
    for(const host of document.querySelectorAll('[data-sifs-inline]')){
      if(host.classList.contains('sifs-inline-ready'))continue;
      const id=host.dataset.sifsInline,def=labs.definition(id);if(!def?.inline)continue;
      const view=document.createElement('div');view.className='sl-inline-view';
      const controls=document.createElement('div');controls.className='sl-inline-controls';
      const fields=[];
      for(const key of def.inlineKeys){
        const c=def.controls.find(c=>c.key===key);if(!c)continue;
        const label=document.createElement('label'),name=document.createElement('span'),input=document.createElement('input'),value=document.createElement('output');
        name.textContent=({lag:'Lag |u|/T',mu:'Mean μ',sigma:'Width σ'})[key]||c.label;
        input.type='range';input.min=id==='lag'?0:c.min;input.max=c.max;input.step=c.step||.01;
        input.setAttribute('aria-label',name.textContent);input.dataset.key=key;
        input.addEventListener('input',()=>labs.setState({[key]:+input.value},false,id));
        label.append(name,input,value);controls.append(label);fields.push({c,input,value});
      }
      const reset=document.createElement('button');reset.type='button';reset.textContent='Reset';reset.onclick=()=>labs.setState(def.defaults,true,id);controls.append(reset);
      host.append(view,controls);host.classList.add('sifs-inline-ready');
      const paint=()=>{
        const state=labs.getState(id),result=def.inline(id==='lag'?{...state,lag:Math.abs(state.lag)}:state,labs.api);
        view.innerHTML=result.svg;
        if(result.caption){const caption=document.createElement('div');caption.className='sl-inline-caption';caption.textContent=result.caption;view.append(caption);}
        for(const {c,input,value} of fields){const v=id==='lag'?Math.abs(state[c.key]):state[c.key];input.value=v;value.textContent=c.format?c.format(v):labs.api.number(v);}
      };
      paint();document.addEventListener('sifs-lab-state',e=>{if(host.isConnected&&e.detail.id===id)paint();});
      for(const type of ['keydown','pointerdown','click','dblclick'])host.addEventListener(type,e=>e.stopPropagation());
    }
  };
  window.addEventListener('load',mount);
  document.addEventListener('sifs-deck-changed',mount);
})();

/* Full-size slide views reuse tested model renderers. The authored equation and
 * short validity note remain editable QMD; extended explanations stay in Explore. */
(() => {
  'use strict';
  const config={
    receptor:{keys:['logT'],metrics:[0,2],labels:['Exact variance','Effective samples']},
    overlap:{keys:['separation','sigma'],metrics:[0],labels:['Mutual information']},
    capacity:{keys:['curvature','sigma'],metrics:[0,1],labels:['Uniform · approximation','Optimized · approximation']},
    delay:{keys:['delay','align'],metrics:[0,1],labels:['Same-time information','Lag-aligned information']},
    spectral:{keys:['logTau','postNoise'],metrics:[0,3,4],labels:['Finite-band rate','Retained in this band','Integration band']},
    tracking:{keys:['logRatio','epsilon'],metrics:[2,3],labels:['Error / σ_H²','Optimal τ_U / τ_H']},
    averaging:{keys:['mu','sigma'],metrics:[],labels:[]},
    prx:{keys:['logRatio'],metrics:[1],labels:['Exact information']},
    paths:{keys:['motif','order'],metrics:[],labels:[]},
    neural:{keys:['logRatio'],plotCount:3,metrics:[4],labels:['I(U; H)']},
    balance:{keys:['k','logInputRatio'],metrics:[1,2,3],labels:['Information bounds [bits]','τ_U / τ','τ_H / τ_U (≫ 1 needed)']}
  };
  const labels={logT:'Window T / τcorr',separation:'Mean separation d',sigma:'Noise width σ',curvature:'Curvature κ',delay:'Delay Δ / τ_H',align:'Align records',logTau:'Memory τ_U / τ_H',postNoise:'Post-filter noise',logRatio:'Timescale ratio',epsilon:'Noise ε',mu:'Mean μ',k:'Inhibition k',logInputRatio:'Reference τ_H / τ',order:'Fastest → slowest',motif:'Graph'};
  // Fixed mathematical labels are native markup, so sliders do not queue
  // MathJax re-typesetting on every frame. Keep text-only accessible names.
  const trackingMath=html=>`<span style="font-family:MJXTEX,serif;font-style:italic">${html}</span>`;
  const trackingMetricLabels=[`Error / ${trackingMath('σ<sub>H</sub><sup>2</sup>')}`,`Optimal ${trackingMath('τ<sub>U</sub> / τ<sub>H</sub>')}`];
  const printMode=document.documentElement.dataset.sifsOutput==='pdf';
  let views=[],pending=Promise.resolve(),scheduled=0;
  function preset(v,comparison){
    v.comparison=!!comparison;
    SIFSLabs.setState({...v.def.defaults,...JSON.parse(comparison?v.host.dataset.sifsComparison:v.host.dataset.sifsInitial)},true,v.def.id);
  }
  const ready=()=>pending;
  const visible=h=>h.closest('section')===Reveal.getCurrentSlide()&&h.classList.contains('visible');
  function repaint(view){
    const {host,def,fields,plots,metrics,status,cfg}=view,labs=SIFSLabs;
    const state=labs.getState(def.id);
    const result=def.render(state,labs.api);
    plots.innerHTML=result.plots.slice(0,cfg.plotCount||2).map(p=>`<figure><div class="embedded-plot-title">${labs.api.escape(p.title)}</div>${def.id==='capacity'?p.svg.replaceAll('Input c','Input h').replaceAll('Response Y','Response u').replaceAll('Mean g(c)','Mean ū(h)').replaceAll('δc','δh').replaceAll('±σ bounds','±σ (1 SD)'):p.svg}</figure>`).join('');
    // The overview curve is in nats for overlap, in bits where paper/model plots are in bits.
    metrics.innerHTML=cfg.metrics.map((i,j)=>{const m=result.metrics?.[i];return m?`<span>${def.id==='tracking'?trackingMetricLabels[j]:labs.api.escape(cfg.labels[j]||m.label)}: <strong>${labs.api.escape(m.value)}</strong></span>`:'';}).join('');
    if(def.id==='capacity'){
      const m=result.metrics;const bad=parseFloat(m[1].value)<0||parseFloat(m[4].value)>.3;
      status.textContent=bad?'Small-noise approximation unreliable here; boundary corrections also matter.':'Small-noise approximation; endpoint corrections omitted.';
      status.classList.toggle('embedded-warning',bad);
    }else if(def.id==='balance'){
      const ratio=parseFloat(result.metrics[3].value);
      status.textContent=ratio<=10?'Input is not well separated from relaxation: stationary bounds need a slower input.':'Stationary mixture bounds; input persistence is checked against relaxation.';
      status.classList.toggle('embedded-warning',ratio<=10);
    }else if(def.id==='spectral')status.textContent=`Dη = ${labs.api.number(state.epsilon**2)}; Dζ = ${state.postNoise?'0.1':'0'}. Angular frequencies; ideal spectral band, without sampling aliasing.`;
    else if(def.id==='receptor')status.textContent=`Stationary occupancy p = ${labs.api.number(state.p)}; N_eff = p(1−p) / Var(R̄_T).`;
    else if(def.id==='delay')status.textContent=`Signal variance = 1; measurement-noise standard deviation ν = ${labs.api.number(state.noise)}.`;
    else status.textContent='';
    for(const {c,input,value} of fields){
      if(c.type==='checkbox')input.checked=!!state[c.key];else input.value=state[c.key];
      if(value)value.textContent=c.format?c.format(+state[c.key]):labs.api.number(+state[c.key]);
    }
    if(view.compare){view.compare.textContent=view.comparison?'Initial':'Compare';view.compare.setAttribute('aria-pressed',String(!!view.comparison));}
    host.dataset.rendered=JSON.stringify(state);
    document.dispatchEvent(new CustomEvent('sifs-embedded-rendered',{detail:{id:def.id,slide:host.closest('section').id}}));
  }
  function sync(){
    for(const v of views){
      if(!v.host.isConnected||!visible(v.host))continue;
      const comparison=printMode&&v.host.querySelector('.embedded-comparison')?.classList.contains('visible');
      const stage=String(comparison);
      if(v.stage!==stage){
        v.stage=stage;
        // Extra preset reveals belong only to the deterministic PDF copy.
        preset(v,comparison);
      }
      repaint(v);
    }
  }
  function schedule(){
    cancelAnimationFrame(scheduled);
    pending=new Promise(resolve=>{scheduled=requestAnimationFrame(()=>{
      try{sync();}catch(error){console.error('Embedded plot:',error);document.dispatchEvent(new CustomEvent('sifs-embedded-error',{detail:String(error)}));}finally{resolve();}
    });});
  }
  function mount(){
    if(!window.SIFSLabs||!window.Reveal)return;
    views=views.filter(v=>v.host.isConnected);
    for(const host of document.querySelectorAll('[data-sifs-embedded]')){
      if(views.some(v=>v.host===host))continue;
      const def=SIFSLabs.definition(host.dataset.sifsEmbedded);if(!def)continue;
      const cfg={...config[def.id]};
      if(host.dataset.sifsView==='34')cfg.keys=['order'];
      if(host.dataset.sifsView==='47')cfg.keys=['logTau','postNoise','logBandwidth'];
      const body=host.querySelector('.embedded-mount');body.replaceChildren();
      const plots=document.createElement('div');plots.className='embedded-plots';
      const metrics=document.createElement('div');metrics.className='embedded-metrics';
      const controls=document.createElement('div');controls.className='embedded-controls';
      const fields=[];
      for(const key of cfg.keys){
        const c=def.controls.find(c=>c.key===key);if(!c)continue;
        const label=document.createElement('label'),name=document.createElement('span');name.textContent=labels[key]||c.label;
        if(def.id==='averaging'&&key==='sigma')name.textContent='Fast width σ';
        if(key==='logRatio')name.textContent=def.id==='tracking'?'Memory τ_U / τ_H':def.id==='prx'?'τ₁ / τ₂':'Input persistence / τ';
        const input=document.createElement(c.type==='select'?'select':'input');input.dataset.key=key;
        if(c.type==='select')for(const option of c.options){const o=document.createElement('option');o.value=option.value;o.textContent=option.label;input.append(o);}
        else {input.type=c.type||'range';if(c.min!==undefined)input.min=c.min;if(c.max!==undefined)input.max=c.max;input.step=c.step||.01;}
        input.setAttribute('aria-label',name.textContent);
        if(def.id==='tracking')name.innerHTML=key==='logRatio'?`Memory ${trackingMath('τ<sub>U</sub> / τ<sub>H</sub>')}`:`Noise ${trackingMath('ε')}`;
        const value=c.type==='range'?document.createElement('output'):null;
        input.addEventListener('input',()=>SIFSLabs.setState({[key]:c.type==='checkbox'?input.checked:c.type==='select'?input.value:+input.value},false,def.id));
        label.append(name,input);if(value)label.append(value);controls.append(label);fields.push({c,input,value});
      }
      const reset=document.createElement('button');reset.type='button';reset.textContent='Reset';
      reset.onclick=()=>preset(v,printMode&&host.querySelector('.embedded-comparison')?.classList.contains('visible'));controls.append(reset);
      let compare=null;
      if(!printMode){compare=document.createElement('button');compare.type='button';compare.className='embedded-compare';compare.textContent='Compare';compare.title='Toggle the initial and comparison presets';compare.onclick=()=>preset(v,!v.comparison);controls.append(compare);}
      const status=document.createElement('div');status.className='embedded-status';
      body.append(plots,metrics,controls,status);
      const v={host,def,cfg,fields,plots,metrics,status,compare,comparison:false,stage:null};views.push(v);
      // Controls consume navigation keys; the group itself remains selectable in Edit mode.
      controls.addEventListener('keydown',e=>e.stopPropagation());
      for(const event of ['pointerdown','click','dblclick'])controls.addEventListener(event,e=>e.stopPropagation());
    }
    schedule();
  }
  document.addEventListener('sifs-lab-state',e=>{for(const v of views)if(v.def.id===e.detail.id&&visible(v.host))repaint(v);});
  window.addEventListener('load',()=>{mount();Reveal.on('slidechanged',()=>{for(const v of views)v.stage=null;schedule();});for(const event of ['fragmentshown','fragmenthidden'])Reveal.on(event,schedule);});
  document.addEventListener('sifs-deck-changed',mount);
  window.SIFSEmbedded={ready,refresh:sync};
})();
