/* Offline teaching experiments. Pure SVG plots, deterministic seeds, no network. */
(() => {
  'use strict';
  const registry=new Map(), states=new Map(), copy=x=>JSON.parse(JSON.stringify(x));
  const colors={ink:'#17191c',blue:'#0366c8',slow:'#0366c8',fast:'#800000',gray:'#6f747a',signal:'#1d5d91',green:'#299d8f',states:['#1d5d91','#b25a3c','#6c5797']};
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const rng=seed=>{let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};};
  const normal=random=>Math.sqrt(-2*Math.log(Math.max(1e-15,random())))*Math.cos(2*Math.PI*random());
  let chartId=0, dialog=null, active=null, previousConfig=null, previousFocus=null, frame=0, rendering=false, renderSerial=0;
  const number=(v,d=3)=>Math.abs(v)<1e-12?'0':Math.abs(v)>=1e4||Math.abs(v)<1e-3?v.toExponential(1):Number(v.toPrecision(d)).toString();
  function ticks(domain,log){
    if(log){const a=Math.ceil(Math.log10(domain[0])),b=Math.floor(Math.log10(domain[1]));return Array.from({length:Math.max(0,b-a+1)},(_,i)=>10**(a+i));}
    const span=domain[1]-domain[0],rough=span/4,scale=10**Math.floor(Math.log10(rough)),step=[1,2,2.5,5,10].find(x=>x*scale>=rough)*scale;
    const values=[];for(let v=Math.ceil(domain[0]/step)*step;v<=domain[1]+step*1e-7;v+=step)values.push(+v.toPrecision(10));return values;
  }
  // Native SVG subscripts remain legible in embedded views and exported plots.
  function axisLabel(value){
    const mathStyle='font-family:MJXTEX,serif;font-style:italic';
    const trackingLabel=escape(value).replace(/τ_([HU])|σ_H²/g,(token,sub)=>
      token==='σ_H²'
        ? `<tspan style="${mathStyle}">σ</tspan><tspan style="${mathStyle};font-size:13px" dy="5">H</tspan><tspan style="font-family:MJXTEX,serif;font-size:13px" dx="-8" dy="-12">2</tspan><tspan dy="7">&#8203;</tspan>`
        : `<tspan style="${mathStyle}">τ</tspan><tspan style="${mathStyle};font-size:13px" dy="5">${sub}</tspan><tspan dy="-5">&#8203;</tspan>`);
    return trackingLabel.replace(/U_([EI])/g, (_,sub)=>`<tspan font-family="serif" font-style="italic">U</tspan><tspan font-family="serif" font-size="13" dy="5">${sub}</tspan><tspan dy="-5">&#8203;</tspan>`);
  }
  function legendLabel(value){
    const match=String(value).match(/^p\(u \| h_([12])\)$/);
    if(match)return `<tspan style="font-family:MJXTEX,serif;font-style:italic">p(u | h</tspan><tspan style="font-family:MJXTEX,serif;font-size:12px" dy="4">${match[1]}</tspan><tspan style="font-family:MJXTEX,serif" dy="-4">)</tspan>`;
    if(value==='p(u)')return '<tspan style="font-family:MJXTEX,serif;font-style:italic">p(u)</tspan>';
    return escape(value);
  }
  function plot(o){
    const W=o.width||600,H=o.height||280,legend=(o.series||[]).filter(s=>s.label),legendPositions=[];
    let legendX=72,legendRow=0;
    for(const s of legend){const width=46+s.label.length*8.7;if(legendX>72&&legendX+width>W-12){legendX=72;legendRow++;}legendPositions.push({s,x:legendX,y:21+24*legendRow});legendX+=width;}
    const margin={left:72,right:20,top:legend.length?43+24*legendRow:20,bottom:57};
    const pw=W-margin.left-margin.right,ph=H-margin.top-margin.bottom,xd=o.xDomain,yd=o.yDomain;
    if(!xd||!yd||!(xd[1]>xd[0])||!(yd[1]>yd[0]))throw Error('Plot domains must be increasing.');
    const x=v=>margin.left+((o.logX?Math.log(v):v)-(o.logX?Math.log(xd[0]):xd[0]))/((o.logX?Math.log(xd[1]/xd[0]):xd[1]-xd[0]))*pw;
    const y=v=>margin.top+ph-((o.logY?Math.log(v):v)-(o.logY?Math.log(yd[0]):yd[0]))/((o.logY?Math.log(yd[1]/yd[0]):yd[1]-yd[0]))*ph;
    const clip='sifs-plot-'+(++chartId),text=(px,py,value,attrs='')=>`<text x="${px}" y="${py}" ${attrs}>${escape(value)}</text>`;
    const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escape(o.title||`${o.yLabel||'Value'} versus ${o.xLabel||'position'}`)}"><style>.sifs-svg-plot text{font-family:'Fira Sans',Arial,sans-serif;font-size:17px;fill:#455566;font-weight:400}.sifs-svg-plot .axis-label{font-size:19px;fill:#17283a}</style><defs><clipPath id="${clip}"><rect x="${margin.left}" y="${margin.top}" width="${pw}" height="${ph}"/></clipPath></defs><g class="sifs-svg-plot">`];
    for(const v of o.yTicks||ticks(yd,o.logY)){const py=y(v);parts.push(`<path d="M${margin.left},${py}h${pw}" stroke="#e1e7ed" fill="none"/>`,text(margin.left-10,py+5,number(v),'text-anchor="end"'));}
    for(const v of o.xTicks||ticks(xd,o.logX)){const px=x(v);parts.push(`<path d="M${px},${margin.top+ph}v5" stroke="#a4b1bf"/>`,text(px,margin.top+ph+24,number(v),'text-anchor="middle"'));}
    parts.push(`<path d="M${margin.left},${margin.top}v${ph}h${pw}" stroke="#8fa1b4" fill="none"/>`,`<text x="${margin.left+pw/2}" y="${H-6}" class="axis-label" text-anchor="middle">${axisLabel(o.xLabel||'')}</text>`,`<text class="axis-label" transform="translate(20 ${margin.top+ph/2}) rotate(-90)" text-anchor="middle">${axisLabel(o.yLabel||'')}</text>`);
    parts.push(`<g clip-path="url(#${clip})">`);
    for(const b of o.bands||[])parts.push(`<rect x="${x(b.x0)}" y="${margin.top}" width="${x(b.x1)-x(b.x0)}" height="${ph}" fill="${b.color||colors.blue}" opacity="${b.opacity??.08}"/>`);
    for(const l of o.hLines||[])parts.push(`<path d="M${margin.left},${y(l.y)}h${pw}" stroke="${l.color||colors.gray}" stroke-dasharray="5 5" fill="none"/>`);
    for(const l of o.vLines||[])parts.push(`<path d="M${x(l.x)},${margin.top}v${ph}" stroke="${l.color||colors.gray}" stroke-dasharray="5 5" fill="none"/>`);
    for(const s of o.series||[]){
      const points=s.x.map((v,i)=>[x(v),y(s.y[i])]).filter(p=>p.every(Number.isFinite)),color=s.color||colors.blue;
      if(s.mode==='points')parts.push(...points.map(p=>`<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="${s.r||2.3}" fill="${color}" opacity="${s.opacity??.4}"/>`));
      else if(s.mode==='bars'){
        const bw=s.barWidth||(s.x[1]-s.x[0])*.9;
        parts.push(...s.x.map((v,i)=>{const px=x(v-bw/2),py=y(s.y[i]),bottom=y(Math.max(0,yd[0]));return `<rect x="${px}" y="${Math.min(py,bottom)}" width="${x(v+bw/2)-px}" height="${Math.abs(bottom-py)}" fill="${color}" opacity="${s.opacity??.65}"/>`;}));
      }else{
        const d=points.map((p,i)=>i===0?`M${p[0].toFixed(2)},${p[1].toFixed(2)}`:s.mode==='step'?`H${p[0].toFixed(2)}V${p[1].toFixed(2)}`:`L${p[0].toFixed(2)},${p[1].toFixed(2)}`).join('');
        parts.push(`<path d="${d}" stroke="${color}" stroke-width="${s.width||2.3}" fill="none" stroke-linejoin="round" opacity="${s.opacity??1}"${s.dash?` stroke-dasharray="${escape(s.dash)}"`:''}/>`);
      }
    }
    for(const p of o.marks||[])parts.push(`<circle cx="${x(p.x)}" cy="${y(p.y)}" r="${p.r||5}" fill="${p.color||colors.ink}" stroke="white" stroke-width="1.5"/>`);
    parts.push('</g>');
    for(const p of o.marks||[])if(p.label){const end=x(p.x)>margin.left+pw/2,py=y(p.y)<margin.top+45?y(p.y)+24:y(p.y)-9;parts.push(text(end?x(p.x)-8:x(p.x)+8,Math.min(margin.top+ph-5,Math.max(margin.top+17,py)),p.label,`text-anchor="${end?'end':'start'}"`));}
    for(const l of o.hLines||[])if(l.label)parts.push(text(W-margin.right-4,Math.max(margin.top+17,y(l.y)-7),l.label,'text-anchor="end"'));
    for(const l of o.vLines||[])if(l.label){const end=x(l.x)>margin.left+pw/2;parts.push(text(x(l.x)+(end?-7:7),margin.top+18,l.label,`text-anchor="${end?'end':'start'}"`));}
    for(const {s,x:lx,y:ly} of legendPositions)parts.push(`<path d="M${lx},${ly-5}h23" stroke="${s.color||colors.blue}" stroke-width="3" stroke-dasharray="${o.legendDashes&&s.dash?s.dash:''}"/>`,`<text x="${lx+29}" y="${ly}">${legendLabel(s.label)}</text>`);
    return parts.join('')+'</g></svg>';
  }
  const api={plot,colors,rng,normal,escape,number};
  const byId=id=>document.getElementById(id);
  function ensureUI(){
    if(dialog)return;
    dialog=document.createElement('dialog');dialog.id='sifs-lab-dialog';dialog.setAttribute('aria-labelledby','sl-title');
    dialog.innerHTML=`<header class="sl-header"><div><p class="sl-eyebrow">SIFS · interactive experiment</p><h2 id="sl-title"></h2></div><button id="sl-close" type="button">Return to slide <span aria-hidden="true">×</span></button></header><div class="sl-body"><p id="sl-question"></p><div class="sl-control-area"><div id="sl-presets" aria-label="Guided presets"></div><div id="sl-controls"></div><div class="sl-actions"><button id="sl-reset" type="button">Reset</button><button id="sl-new-seed" type="button">New realization</button><button id="sl-download" type="button">Download plots</button></div></div><div id="sl-metrics" aria-live="polite"></div><div id="sl-plots"></div><div id="sl-explanation"></div><div id="sl-formula"></div><p id="sl-error" role="alert" hidden></p></div><footer class="sl-footer"><p id="sl-assumptions"></p><p id="sl-source"></p></footer>`;
    document.body.append(dialog);
    byId('sl-close').onclick=close;
    byId('sl-reset').onclick=()=>setState(registry.get(active).defaults,true);
    byId('sl-new-seed').onclick=()=>setState({seed:(getState().seed||1)+1});
    byId('sl-download').onclick=download;
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('keydown',e=>{e.stopPropagation();});
  }
  function getState(id=active){return copy(states.get(id)||registry.get(id)?.defaults||{});}
  function syncControls(){
    const def=registry.get(active),state=getState();
    for(const c of def.controls){const input=byId('sl-'+c.key),out=byId('sl-value-'+c.key);if(c.type==='checkbox')input.checked=!!state[c.key];else input.value=state[c.key];if(out)out.textContent=c.format?c.format(state[c.key]):number(state[c.key]);}
    for(const button of byId('sl-presets').children){const preset=def.presets[+button.dataset.preset];button.setAttribute('aria-pressed',String(Object.entries(preset.state).every(([k,v])=>state[k]===v)));}
    byId('sl-new-seed').hidden=!def.stochastic||(def.seedVisible&&!def.seedVisible(state));
  }
  function setState(patch,replace=false,id=active){
    if(!registry.has(id))return;const def=registry.get(id),state=replace?copy(def.defaults):getState(id);
    for(const [key,value] of Object.entries(patch)){
      const c=def.controls.find(c=>c.key===key);
      if(c?.type==='range'){const n=Number(value);if(!Number.isFinite(n))continue;state[key]=Math.max(c.min,Math.min(c.max,n));}
      else state[key]=value;
    }
    states.set(id,state);if(id===active){syncControls();schedule();}
    document.dispatchEvent(new CustomEvent('sifs-lab-state',{detail:{id,state:copy(state)}}));
  }
  function schedule(){cancelAnimationFrame(frame);frame=requestAnimationFrame(render);}
  async function render(){
    const serial=++renderSerial,def=registry.get(active);if(!def||!dialog.open)return;
    rendering=true;byId('sl-error').hidden=true;
    try{
      const result=def.render(getState(),api);
      byId('sl-plots').innerHTML=result.plots.map(p=>`<figure class="sl-plot${p.wide?' sl-wide':''}"><h3>${escape(p.title)}</h3>${p.svg}${p.caption?`<figcaption>${escape(p.caption)}</figcaption>`:''}</figure>`).join('');
      byId('sl-metrics').innerHTML=(result.metrics||[]).map(m=>`<div><span>${escape(m.label)}</span><strong>${escape(m.value)}</strong></div>`).join('');
      byId('sl-explanation').textContent=result.explanation||'';
      const formula=byId('sl-formula');
      if(formula.dataset.source!==(result.formula||'')){
        window.MathJax?.typesetClear?.([formula]);formula.innerHTML=result.formula||'';formula.dataset.source=result.formula||'';
        if(window.MathJax?.typesetPromise)await MathJax.typesetPromise([formula]);
      }
      dialog.dataset.lab=active;dialog.dataset.rendered=String(serial);
      document.dispatchEvent(new CustomEvent('sifs-lab-rendered',{detail:{id:active,state:getState()}}));
    }catch(error){byId('sl-error').hidden=false;byId('sl-error').textContent='The experiment could not be displayed: '+error.message;}
    finally{if(serial===renderSerial)rendering=false;}
  }
  async function open(id){
    if(!registry.has(id))return;
    ensureUI();if(dialog.open)close();
    const def=registry.get(id);active=id;if(!states.has(id))states.set(id,copy(def.defaults));
    previousFocus=document.activeElement;previousConfig={keyboard:Reveal.getConfig().keyboard,touch:Reveal.getConfig().touch};Reveal.configure({keyboard:false,touch:false});
    byId('sl-title').textContent=def.title;byId('sl-question').textContent=def.question;
    byId('sl-assumptions').textContent=def.assumptions;byId('sl-source').textContent=def.source;
    byId('sl-presets').replaceChildren(...def.presets.map((p,i)=>{const button=document.createElement('button');button.type='button';button.textContent=p.label;button.dataset.preset=i;button.onclick=()=>setState(p.state);return button;}));
    byId('sl-controls').replaceChildren(...def.controls.map(c=>{
      const label=document.createElement('label');label.className='sl-control'+(c.type==='checkbox'?' sl-checkbox':'');
      const title=document.createElement('span');title.textContent=c.label;label.append(title);
      const input=document.createElement(c.type==='select'?'select':'input');input.id='sl-'+c.key;input.setAttribute('aria-label',c.label);
      if(c.type==='select')for(const option of c.options)input.add(new Option(option.label,option.value));
      else{input.type=c.type||'range';if(input.type==='range'){input.min=c.min;input.max=c.max;input.step=c.step||.01;}}
      input.addEventListener('input',()=>setState({[c.key]:c.type==='checkbox'?input.checked:c.type==='select'?input.value:+input.value}));
      label.append(input);
      if(c.type!=='checkbox'&&c.type!=='select'){const value=document.createElement('output');value.id='sl-value-'+c.key;value.setAttribute('for',input.id);label.append(value);}
      return label;
    }));
    byId('sl-new-seed').hidden=!def.stochastic;syncControls();dialog.showModal();document.body.classList.add('sifs-lab-open');byId('sl-close').focus();await render();
  }
  function close(){
    if(!dialog?.open)return;cancelAnimationFrame(frame);++renderSerial;rendering=false;dialog.close();document.body.classList.remove('sifs-lab-open');
    if(previousConfig)Reveal.configure(previousConfig);previousFocus?.focus?.();active=null;
  }
  function download(){
    if(!active)return;const def=registry.get(active),state=getState(),result=def.render(state,api),W=1200,padding=32;
    let y=104;const plots=result.plots.map(p=>{const match=p.svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);const w=+(match?.[1]||600),h=+(match?.[2]||280),scale=(W-padding*2)/w;const body=p.svg.replace(/^.*?<svg[^>]*>/s,'').replace(/<\/svg>\s*$/,'');const g=`<text x="${padding}" y="${y}" font-size="23" font-family="Arial">${escape(p.title)}</text><g transform="translate(${padding},${y+12}) scale(${scale})">${body}</g>`;y+=h*scale+65;return g;});
    const label=Object.entries(state).map(([k,v])=>`${k}=${v}`).join(', ');
    const sourceLines=[];for(const word of def.source.split(/\s+/)){if(!sourceLines.length||sourceLines[sourceLines.length-1].length+word.length>125)sourceLines.push(word);else sourceLines[sourceLines.length-1]+=' '+word;}
    const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${y+45+sourceLines.length*22}" viewBox="0 0 ${W} ${y+45+sourceLines.length*22}"><rect width="100%" height="100%" fill="white"/><text x="32" y="38" font-family="Arial" font-size="29" fill="#002e5e">${escape(def.title)}</text><text x="32" y="69" font-family="Arial" font-size="16">${escape(label)}</text>${plots.join('')}${sourceLines.map((line,i)=>`<text x="32" y="${y+26+i*22}" font-family="Arial" font-size="15">${escape(line)}</text>`).join('')}</svg>`;
    const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'})),a=document.createElement('a');a.href=url;a.download=`sifs-${active}.svg`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  document.addEventListener('click',event=>{const button=event.target.closest?.('button[data-sifs-lab]');if(button){event.preventDefault();event.stopPropagation();open(button.dataset.sifsLab);}},true);
  const mount = ()=>{
    document.querySelectorAll('.sifs-lab-launch').forEach(button=>button.remove());
  };
  window.addEventListener('load',()=>{Reveal.on('slidechanged',close);mount();});
  document.addEventListener('sifs-deck-changed',mount);
  window.SIFSLabs={register:def=>registry.set(def.id,def),definition:id=>registry.get(id),open,close,setState,getState,isOpen:()=>!!dialog?.open,whenIdle:async()=>{await new Promise(r=>requestAnimationFrame(r));while(rendering)await new Promise(r=>setTimeout(r,20));},list:()=>[...registry.values()].map(({id,title,defaults,controls,presets})=>({id,title,defaults,controls,presets})),api};
})();
