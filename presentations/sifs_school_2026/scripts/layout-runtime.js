/* Crossfade over an inert visual snapshot; keep the incoming slide live. */
(() => {
  const settings=record=>record?.slideTransition||{type:'fade',duration:.8};
  let prior=null,animation=null,backdrop=null,incoming=null,savedZ=null;
  let morphFrom=null,morphLayer=null,morphAnimations=[],morphOriginals=[],pending=null;
  const edgeSettings=(to,from)=>{
    const slides=Reveal.getSlides().filter(s=>!s.dataset.sifsDerivationParent),i=slides.indexOf(to),j=slides.indexOf(from);
    const old=window.SIFSLayout?.getLayout().slides[from?.id];
    // A morph is an edge between adjacent subslides; reverse that same edge.
    if(i>=0&&j===i+1&&settings(old).type==='morph')return settings(old);
    return settings(window.SIFSLayout?.getLayout().slides[to?.id]);
  };
  const cancel=()=>{
    animation?.cancel();animation=null;backdrop?.remove();backdrop=null;
    for(const a of morphAnimations)a.cancel();morphAnimations=[];morphLayer?.remove();morphLayer=null;
    for(const [e,value,priority] of morphOriginals)value?e.style.setProperty('opacity',value,priority):e.style.removeProperty('opacity');
    morphOriginals=[];morphFrom=null;pending=null;
    if(incoming){savedZ[0]?incoming.style.setProperty('z-index',...savedZ):incoming.style.removeProperty('z-index');}
    incoming=null;savedZ=null;
  };
  function prepare(event){
    if(event?.type!=='slidechanged'||!prior||prior===Reveal.getCurrentSlide())return;
    cancel();
    const slide=Reveal.getCurrentSlide(),record=window.SIFSLayout?.getLayout().slides[slide.id],config=edgeSettings(slide,prior);
    if(!['fade','morph'].includes(config.type)||!config.duration||document.body.classList.contains('sifs-editing')||document.documentElement.dataset.sifsOutput==='pdf'||matchMedia('print').matches||matchMedia('(prefers-reduced-motion: reduce)').matches||slide.dataset.sifsDerivationParent||prior.dataset.sifsDerivationParent)return;
    // Capture before layout restoration removes the outgoing slide's saved edits.
    const old=prior.getAttribute('style');
    for(const [key,value] of Object.entries({display:'block',visibility:'visible',opacity:'1',transform:'none'}))prior.style.setProperty(key,value,'important');
    if(config.type==='morph')morphFrom=window.SIFSRevealTransitions.capture(prior,window.SIFSLayout.getLayout().slides[prior.id]||{blocks:{}},true);
    // A visual snapshot must not be a section: Reveal counts descendant sections as slides.
    const copy=document.createElement('div');
    for(const attr of prior.attributes)copy.setAttribute(attr.name,attr.value);
    for(const child of prior.childNodes)copy.append(child.cloneNode(true));
    const sources=[prior,...prior.querySelectorAll('*')],targets=[copy,...copy.querySelectorAll('*')];
    sources.forEach((source,i)=>{
      const target=targets[i],style=getComputedStyle(source);
      // Keep computed styles authoritative after section-scoped rules stop
      // matching the div snapshot (notably zero MathJax display margins).
      for(const key of style)target.style?.setProperty(key,style.getPropertyValue(key),'important');
      // Pixel dimensions already include the live media's size limits. The
      // snapshot gives auto-sized parents fixed heights; keeping percentage
      // limits would apply them again and shrink the outgoing image.
      if(source.matches('img,svg,canvas,video')){
        // Computed logical max-block/inline-size properties are copied too.
        // Override at the same priority, otherwise their 95% cap wins again.
        for(const [key,value] of Object.entries({'max-width':'none','max-height':'none','min-width':'0px','min-height':'0px'}))target.style.setProperty(key,value,'important');
      }
      if(source.dataset.sifsBlock)target.dataset.sifsSnapshotId=source.dataset.sifsBlock;
      target.removeAttribute('id');target.removeAttribute('data-sifs-block');target.removeAttribute('autofocus');
      if(source instanceof HTMLCanvasElement){try{target.getContext('2d').drawImage(source,0,0);}catch{}}
    });
    // A section banner is drawn by ::before. Root computed styles include
    // resolved inherited text-fill colors; copying them would make its white
    // title dark. Freeze the rendered pseudo-element as a real visual node.
    if(!prior.classList.contains('title-slide')&&prior.dataset.section){
      const banner=document.createElement('div'),style=getComputedStyle(prior,'::before');
      for(const key of style)banner.style.setProperty(key,style.getPropertyValue(key));
      banner.textContent=prior.dataset.section;banner.className='sifs-snapshot-banner';
      banner.setAttribute('aria-hidden','true');copy.append(banner);
      copy.classList.add('sifs-snapshot-has-banner');
    }
    // Badges belong to the slide: preserve them in the outgoing snapshot so
    // they share its crossfade instead of snapping into a separate solid layer.
    old===null?prior.removeAttribute('style'):prior.setAttribute('style',old);
    copy.classList.remove('past','future','present');copy.removeAttribute('hidden');copy.setAttribute('aria-hidden','true');
    Object.assign(copy.style,{display:'block',visibility:'visible',opacity:'1',transform:'none',transition:'none',animation:'none',pointerEvents:'none'});
    backdrop=document.createElement('div');backdrop.className='sifs-slide-crossfade';backdrop.inert=true;backdrop.setAttribute('aria-hidden','true');
    backdrop.style.cssText='position:absolute;inset:0;pointer-events:none;z-index:100;';backdrop.append(copy);Reveal.getSlidesElement().append(backdrop);
  }
  function apply(record,event){
    const slide=Reveal.getCurrentSlide();if(!slide)return;
    const crossing=event?.type==='slidechanged'&&prior!==slide;
    const overlay=!!slide.dataset.sifsDerivationParent||(crossing&&!!prior?.dataset.sifsDerivationParent);
    const disabled=document.body.classList.contains('sifs-editing')||document.documentElement.dataset.sifsOutput==='pdf'||matchMedia('print').matches||matchMedia('(prefers-reduced-motion: reduce)').matches||overlay;
    const config=edgeSettings(slide,prior);
    // One animation owner avoids combining the native slide fade with reveal fades.
    for(const s of Reveal.getSlides())s.dataset.transition='none';
    if(disabled||['fragmentshown','fragmenthidden','resize'].includes(event?.type))cancel();
    if(crossing&&!disabled&&['fade','morph'].includes(config.type)&&config.duration>0){
      if(config.type==='morph')pending={slide,record,config};
      incoming=slide;savedZ=[slide.style.getPropertyValue('z-index'),slide.style.getPropertyPriority('z-index')];slide.style.setProperty('z-index','101');
      const active=slide.animate([{opacity:0},{opacity:1}],{duration:config.duration*1000,easing:'ease-in-out'});animation=active;
      // Refresh reveal geometry once the slide itself is fully visible.
      // A snapshot taken at opacity zero can otherwise lose the first morph.
      active.finished.then(()=>{if(animation===active){cancel();window.SIFSRevealTransitions?.refresh();}}).catch(()=>{});
    }
    prior=slide;
  }
  function matchKey(item){
    const e=item.e;
    // Match only identical, uniquely occurring content. Dynamic views are not
    // interchangeable merely because their labels happen to be the same.
    if(e.matches('img'))return 'image:'+e.getAttribute('src');
    if(e.matches('svg,canvas,video,[data-sifs-embedded],.derivation-badge')||e.closest('[data-sifs-embedded]'))return null;
    const block=window.SIFSContent?.block(e.dataset.sifsBlock)||window.SIFS_CONTENT_MANIFEST?.blocks[e.dataset.sifsBlock];
    if(!block?.source||!['text','latex'].includes(block.kind))return null;
    return block.kind+':'+block.source.replace(/\s+/g,' ').trim();
  }
  function finishLayout(){
    if(!pending){if(animation)for(const [e] of morphOriginals)e.style.setProperty('opacity','0','important');return;}
    if(!morphFrom||!backdrop||!animation)return;
    const {slide,record,config}=pending;pending=null;
    // getComputedStyle includes the just-started root fade. Temporarily sample
    // its final opacity to test object visibility; restore before the next paint.
    const at=animation.currentTime;animation.currentTime=config.duration*1000;
    const after=window.SIFSRevealTransitions.capture(slide,record,true);animation.currentTime=at;
    const group=entries=>{const map=new Map();for(const item of entries.values()){const key=matchKey(item);if(key)map.set(key,[...(map.get(key)||[]),item]);}return map;};
    const old=group(morphFrom),next=group(after),pairs=[];
    for(const [key,to] of next){const from=old.get(key);if(to.length===1&&from?.length===1)pairs.push([from[0],to[0]]);}
    if(!pairs.length)return;
    morphLayer=document.createElement('div');morphLayer.className='sifs-slide-morph-layer';morphLayer.inert=true;morphLayer.setAttribute('aria-hidden','true');
    morphLayer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;';document.body.append(morphLayer);
    for(const [from,to] of pairs){
      for(const e of backdrop.querySelectorAll('[data-sifs-snapshot-id]'))if(e.dataset.sifsSnapshotId===from.e.dataset.sifsBlock)e.style.setProperty('opacity','0','important');
      morphOriginals.push([to.e,to.e.style.getPropertyValue('opacity'),to.e.style.getPropertyPriority('opacity')]);to.e.style.setProperty('opacity','0','important');
      const wrapper=document.createElement('div');wrapper.className='sifs-slide-morph-copy';wrapper.dataset.fromId=from.e.dataset.sifsBlock;wrapper.dataset.toId=to.e.dataset.sifsBlock;
      wrapper.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;';
      const copy=to.copy.cloneNode(true);wrapper.append(copy);morphLayer.append(wrapper);
      const r=copy.getBoundingClientRect(),w=r.width||to.rect.width,h=r.height||to.rect.height;
      const transform=q=>`translate(${q.x}px,${q.y}px) scale(${q.width/w},${q.height/h})`;
      const a=wrapper.animate([{transform:transform(from.rect),opacity:1},{transform:transform(to.rect),opacity:1}],{duration:config.duration*1000,easing:'ease-in-out',fill:'both'});
      a.currentTime=animation.currentTime;morphAnimations.push(a);
    }
  }
  window.addEventListener('beforeprint',cancel);window.addEventListener('resize',cancel);
  window.SIFSSlideTransitions={settings,prepare,apply,finishLayout,cancel,isAnimating:()=>!!animation,
    deferFragment:event=>prior&&prior!==Reveal.getCurrentSlide()&&['fragmentshown','fragmenthidden'].includes(event?.type)};
  const snapshotStyle=document.createElement('style');
  snapshotStyle.textContent='.reveal .slides .sifs-slide-crossfade > .sifs-snapshot-has-banner::before{content:none!important}';
  document.head.append(snapshotStyle);
})();

/* Whole-object reveal transitions. Visual copies animate; the editable DOM and
 * live experiment state stay intact. No symbol matching or plot interpolation. */
(() => {
  let previous=null,layer=null,animations=[],hidden=[];
  const settings=(record,f)=>record?.transitions?.[String(f)]||{type:'none',duration:.6};
  const editing=()=>document.body.classList.contains('sifs-editing');
  const disabled=()=>editing()||document.documentElement.dataset.sifsOutput==='pdf'||matchMedia('print').matches||matchMedia('(prefers-reduced-motion: reduce)').matches;
  function cancel(){
    for(const a of animations)a.cancel();animations=[];
    for(const [e,value,priority] of hidden)value?e.style.setProperty('opacity',value,priority):e.style.removeProperty('opacity');hidden=[];
    layer?.remove();layer=null;
  }
  function copyVisual(e){
    const copy=e.cloneNode(true),sources=[e,...e.querySelectorAll('*')],targets=[copy,...copy.querySelectorAll('*')];
    sources.forEach((source,i)=>{
      const target=targets[i],style=getComputedStyle(source);
      // Resolve inherited/contextual styles so moving the visual copy out of its
      // column does not change fonts, math, SVG strokes, or plot labels.
      for(const key of style)target.style?.setProperty(key,style.getPropertyValue(key));
      if(source.dataset?.sifsBlock)target.setAttribute('data-sifs-visual-id',source.dataset.sifsBlock);
      target.removeAttribute('data-sifs-block');target.removeAttribute('autofocus');
      if(source instanceof HTMLCanvasElement){try{target.getContext('2d').drawImage(source,0,0);}catch{}}
    });
    // The copy is outside the slide's column. Percentage max-size rules would
    // shrink it in its new wrapper and introduce unequal X/Y compensation.
    Object.assign(copy.style,{maxWidth:'none',maxHeight:'none',minWidth:'0px',minHeight:'0px',position:'relative',left:'0px',right:'auto',top:'0px',bottom:'auto',margin:'0px',transform:'none',translate:'none',scale:'none',rotate:'none',transition:'none',animation:'none',opacity:'1',visibility:'visible'});
    // The reveal layer lives outside .reveal, so freeze the badge's contextual
    // pseudo-element as real content along with its already resolved text styles.
    if(e.matches('.derivation-badge')){
      const arrow=document.createElement('span'),style=getComputedStyle(e,'::after');
      for(const key of style)arrow.style.setProperty(key,style.getPropertyValue(key));
      const content=style.content;
      if(content&&content!=='none'&&content!=='normal'){
        try{arrow.textContent=JSON.parse(content);}catch{arrow.textContent=' →';}
        copy.append(arrow);copy.classList.add('sifs-frozen-badge');
      }
    }
    if(getComputedStyle(e).display==='inline')copy.style.display='inline-block';
    return copy;
  }
  function capture(s,record,force=false){
    const entries=new Map();
    if(!force&&!Object.values(record.transitions||{}).some(t=>t.type!=='none'))return entries;
    const nodes=[...s.querySelectorAll('[data-sifs-block]')];
    const atomic=e=>{
      // A single display equation has one animation identity: its math block.
      // Editor timing can keep that child visible while its wrapper is hidden.
      // Animating the wrapper instead would turn a persistent equation into a
      // newly appearing object as soon as the wrapper's reveal becomes visible.
      if(e.matches('[data-sifs-kind=latex]')&&e.querySelectorAll('.math').length===1){
        const prose=e.cloneNode(true);prose.querySelector('.math').remove();
        if(!prose.textContent.trim())return false;
      }
      if(e.matches('.math,[data-sifs-kind=latex],mjx-container,mjx-math,img,svg,canvas,[data-sifs-embedded],.derivation-badge'))return true;
      const children=[...e.querySelectorAll('[data-sifs-block]')];
      if(!children.length)return true;
      // Keep explanatory prose with a display equation in the same paragraph.
      // Capturing only its math children makes the prose disappear on reversal.
      const prose=[...e.childNodes].some(n=>n.nodeType===Node.TEXT_NODE&&n.textContent.trim());
      if(prose&&(e.matches('p')||children.every(child=>child.matches('span.math,mjx-container,mjx-math'))))return true;
      // Prose and display math in an editable div must move together too.
      // Text plus inline math is one visual block; structural containers and
      // image/display-math wrappers defer to their independently moved children.
      return children.every(child=>child.matches('span.math:not(.display),mjx-math')||child.closest('mjx-math'));
    };
    for(const e of nodes){
      if(!atomic(e)||e.closest('h1,h2,.source,.deck-slide-number,.derivation-navigation,aside.notes')||e.querySelector('.ictp-logo')||!SIFSLayout.visible(e))continue;
      let covered=false;for(let p=e.parentElement;p&&p!==s;p=p.parentElement)if(p.hasAttribute('data-sifs-block')&&atomic(p)){covered=true;break;}
      if(covered&&!record.blocks?.[e.dataset.sifsBlock]?.states&&record.blocks?.[e.dataset.sifsBlock]?.x===undefined)continue;
      // A display-math container spans its editable text box, not its ink.
      // Equal-looking equations can have different box widths and compensating
      // font/ancestor scales. Morph the rendered math so those invisible box
      // differences cannot stretch the glyphs at the start of the transition.
      // Keep the original element as the identity and visibility owner.
      const visual=e.matches('mjx-container[display="true"]')?e.querySelector(':scope > mjx-math')||e:e;
      const r=visual.getBoundingClientRect();
      entries.set(e.dataset.sifsBlock,{e,z:parseFloat(getComputedStyle(e).zIndex)||0,rect:{x:r.x,y:r.y,width:r.width,height:r.height},copy:copyVisual(visual)});
    }
    // An independently positioned inline equation has its own snapshot. Leave
    // its occupied space in the paragraph, but do not draw the equation twice.
    for(const item of entries.values())for(const child of item.copy.querySelectorAll('[data-sifs-visual-id]'))if(entries.has(child.getAttribute('data-sifs-visual-id')))child.style.setProperty('opacity','0','important');
    return entries;
  }
  const moved=(a,b)=>['x','y','width','height'].some(k=>Math.abs(a[k]-b[k])>.5);
  function settle(s,record,event){
    const f=Reveal.getIndices().f??-1,old=previous;
    const next={s,f,record,entries:disabled()?new Map():capture(s,record)};previous=next;
    scheduleSnapshot();
    // A setting belongs to the edge into its reveal. Crossing that edge
    // backward uses the same effect and duration, with reversed geometry.
    const config=settings(record,old?.s===s&&f<old.f?old.f:f);
    const navigation=old&&(old.s!==s||old.f!==f)&&['slidechanged','fragmentshown','fragmenthidden'].includes(event?.type);
    if(!navigation||old.s!==s||disabled()||config.type==='none'||!config.duration)return;
    const before=old.s===s?old.entries:new Map(),after=next.entries;
    const tasks=[];
    for(const [id,to] of after){const from=before.get(id);if(!from||moved(from.rect,to.rect))tasks.push({from,to});}
    for(const [id,from] of before)if(!after.has(id))tasks.push({from});
    for(const [id,to] of after)if(!tasks.some(t=>t.to===to)&&tasks.some(t=>t.to?.e.contains(to.e)))tasks.push({from:before.get(id)||to,to});
    const vectorPair=config.type==='morph'?window.SIFSHabituationMorph?.pair(s,before,after):null;
    if(vectorPair){
      for(let i=tasks.length-1;i>=0;i--)if(tasks[i].from===vectorPair.from||tasks[i].to===vectorPair.to||vectorPair.extraFrom?.includes(tasks[i].from)||vectorPair.extraTo?.includes(tasks[i].to))tasks.splice(i,1);
      tasks.push({...vectorPair,vector:true});
    }
    if(!tasks.length)return;
    // Animated copies must not cover unchanged foreground objects. Preserve
    // those objects in the same layer with their original stacking order.
    const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
    const moving=tasks.slice();
    for(const [id,to] of after){
      const from=before.get(id);
      if(!from||moved(from.rect,to.rect)||tasks.some(t=>t.to===to))continue;
      if(moving.some(t=>[t.from,t.to].some(item=>item&&to.z>item.z&&overlap(to.rect,item.rect))))tasks.push({from,to,persistent:true});
    }
    layer=document.createElement('div');layer.className='sifs-transition-layer';layer.setAttribute('aria-hidden','true');layer.inert=true;
    layer.style.cssText='position:fixed;inset:0;pointer-events:none;z-index:9998;overflow:hidden;';document.body.append(layer);
    const activeLayer=layer,duration=config.duration*1000;
    const visual=(item,from,to,opacity)=>{
      const wrapper=document.createElement('div');wrapper.className='sifs-transition-copy';wrapper.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none;';
      wrapper.style.zIndex=String(item.z||0);
      const copy=item.copy.cloneNode(true);
      // cloneNode does not copy a canvas bitmap.
      const sourceCanvases=[...(item.copy.matches('canvas')?[item.copy]:[]),...item.copy.querySelectorAll('canvas')],canvases=[...(copy.matches('canvas')?[copy]:[]),...copy.querySelectorAll('canvas')];
      sourceCanvases.forEach((c,i)=>{try{canvases[i].getContext('2d').drawImage(c,0,0);}catch{}});
      wrapper.append(copy);activeLayer.append(wrapper);
      const r=copy.getBoundingClientRect(),w=r.width||item.rect.width,h=r.height||item.rect.height;
      const transform=q=>`translate(${q.x}px,${q.y}px) scale(${q.width/w},${q.height/h})`;
      let frames=[{transform:transform(from),opacity:opacity[0]},{transform:transform(to),opacity:opacity[1]}];
      // On the paired contour edge, leave room for the moving maps before
      // introducing surrounding text and the new Pareto panel.
      if(vectorPair?.contour&&opacity[0]!==opacity[1])frames=opacity[0]
        ?[{transform:transform(from),opacity:1,offset:0},{transform:transform(to),opacity:0,offset:.3},{transform:transform(to),opacity:0,offset:1}]
        :[{transform:transform(from),opacity:0,offset:0},{transform:transform(from),opacity:0,offset:.72},{transform:transform(to),opacity:1,offset:1}];
      const animation=wrapper.animate(frames,{duration,easing:'ease-in-out',fill:'both'});
      animations.push(animation);
    };
    for(const {from,to,persistent,vector,contour,extraTo=[]} of tasks){
      for(const item of extraTo){hidden.push([item.e,item.e.style.getPropertyValue('opacity'),item.e.style.getPropertyPriority('opacity')]);item.e.style.setProperty('opacity','0','important');}
      if(to){hidden.push([to.e,to.e.style.getPropertyValue('opacity'),to.e.style.getPropertyPriority('opacity')]);to.e.style.setProperty('opacity','0','important');}
      if(vector)animations.push(window.SIFSHabituationMorph.animate(activeLayer,from,to,duration,contour));
      else if(persistent)visual(to,to.rect,to.rect,[1,1]);
      else if(from&&to&&config.type==='morph')visual(to,from.rect,to.rect,[1,1]);
      else {if(from)visual(from,from.rect,from.rect,[1,0]);if(to)visual(to,to.rect,to.rect,[0,1]);}
    }
    Promise.all(animations.map(a=>a.finished.catch(()=>{}))).then(()=>{if(layer===activeLayer){cancel();scheduleSnapshot();}});
  }
  let snapshotFrame=0;
  function scheduleSnapshot(){
    cancelAnimationFrame(snapshotFrame);
    snapshotFrame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
      if(previous&&!layer&&!disabled()&&previous.s===Reveal.getCurrentSlide()&&previous.f===(Reveal.getIndices().f??-1))previous.entries=capture(previous.s,previous.record);
    }));
  }
  document.addEventListener('sifs-lab-state',scheduleSnapshot);
  window.SIFSRevealTransitions={cancel,settle,settings,capture,refresh:scheduleSnapshot,isAnimating:()=>!!layer};
  window.addEventListener('beforeprint',cancel);window.addEventListener('resize',cancel);
  // Per-reveal None means immediate, including native fragment classes.
  const style=document.createElement('style');style.textContent='.reveal .fragment {transition:none !important} .sifs-transition-layer .sifs-frozen-badge::after{content:none!important} @media print {.sifs-transition-layer{display:none!important}}';document.head.append(style);
})();

/* Apply saved typography, then slide-coordinate geometry.
 * CSS transforms preserve native text/math and every fragment ancestor.
 * An empty override file leaves all original styles untouched. */
(() => {
  'use strict';
  const clone = value => JSON.parse(JSON.stringify(value));
  let layout = clone(window.SIFS_LAYOUT_OVERRIDES || {version:1,slides:{}});
  let suspended=0;
  const originals = new Map(), applied = new Map(), typography = new Map(), textBoxes = new Map();
  const slide = () => window.Reveal?.getCurrentSlide();
  const state = () => String(Reveal.getIndices().f ?? -1);
  const round = n => Math.round(n * 1000) / 1000;
  const elementFor = id => [...(slide()?.querySelectorAll('[data-sifs-block]') || [])].find(e=>e.dataset.sifsBlock===id);
  function setProperty(element,property,value) {
    if(!originals.has(element))originals.set(element,{hadStyle:element.hasAttribute('style'),values:new Map()});
    const saved=originals.get(element).values;
    if(!saved.has(property))saved.set(property,[element.style.getPropertyValue(property),element.style.getPropertyPriority(property)]);
    element.style.setProperty(property,value,'important');
  }
  function hexColor(value) {
    const rgb=value.match(/^rgba?\(\s*([\d.]+)[, ]+\s*([\d.]+)[, ]+\s*([\d.]+)/);
    return rgb?'#'+rgb.slice(1,4).map(n=>Math.max(0,Math.min(255,Math.round(+n))).toString(16).padStart(2,'0')).join(''):value;
  }
  function computedTypography(element) {
    const value=getComputedStyle(element);
    return {fontSize:parseFloat(value.fontSize),color:hexColor(value.color),textAlign:value.textAlign};
  }
  function boxWidth(element){
    const c=getComputedStyle(element),n=v=>parseFloat(v)||0;
    return n(c.width)+(c.boxSizing==='border-box'?0:n(c.paddingLeft)+n(c.paddingRight)+n(c.borderLeftWidth)+n(c.borderRightWidth));
  }
  function textWidth(id){const e=layout.slides[slide()?.id]?.blocks[id];return e?.states?.[state()]?.textWidth??e?.textWidth;}
  function textBox(id){const e=elementFor(id);if(!e)return null;const width=boxWidth(e);return {width,originalWidth:textBoxes.get(id)??width,scale:rect(e).width/width};}
  function applyTypography(entries) {
    // Copied inline labels retain their source typography across slide themes.
    for(const root of slide().querySelectorAll('[data-sifs-inline-format]')){
      const formats=JSON.parse(root.dataset.sifsInlineFormat);
      for(const format of formats){
        const e=[...root.querySelectorAll(format.tag)].filter(n=>!n.closest('span.math,mjx-container,mjx-math'))[format.index];if(!e)continue;
        for(const [key,value] of Object.entries({'font-family':format.fontFamily,'font-weight':format.fontWeight,'font-style':format.fontStyle,color:format.color,'font-size':format.fontScale+'em','letter-spacing':format.letterSpacing+'px','text-transform':format.textTransform}))setProperty(e,key,value);
      }
    }

    // Parent overrides are applied first. An explicit child override therefore
    // wins even over emphasis and MathJax nodes with authored color rules.
    for(const element of slide().querySelectorAll('[data-sifs-block]')){
      const id=element.dataset.sifsBlock,style=entries[id]?.textStyle || {},defaults=computedTypography(element);
      if(style.fontSize!==undefined)setProperty(element,'font-size',`${style.fontSize}px`);
      textBoxes.set(id,boxWidth(element));
      const width=textWidth(id);
      if(width!==undefined){
        for(const [key,value] of Object.entries({'width':`${width}px`,'max-width':'none','min-width':'0','height':'auto','min-height':'0','max-height':'none','box-sizing':'border-box','white-space':'normal'}))setProperty(element,key,value);
        if(getComputedStyle(element).display==='inline')setProperty(element,'display','block');
      }
      if(style.textAlign!==undefined)for(const child of [element,...element.querySelectorAll('p,mjx-container[display="true"]')]){
        if(!child.closest('span:is(.align-left,.align-center,.align-right)'))setProperty(child,'text-align',style.textAlign);
      }
      if(style.color!==undefined)for(const child of [element,...element.querySelectorAll('*')]){
        if(child.namespaceURI==='http://www.w3.org/1999/xhtml'&&!child.matches('img,script,style,aside.notes,aside.notes *'))setProperty(child,'color',style.color);
      }
      typography.set(id,{element,style:clone(style),...computedTypography(element),defaultFontSize:defaults.fontSize,defaultColor:defaults.color,defaultTextAlign:defaults.textAlign});
    }
  }
  function rect(element) {
    const s=element.closest('section.slide'), sr=s.getBoundingClientRect(), r=element.getBoundingClientRect(), scale=sr.width/1280;
    return {x:round((r.x-sr.x)/scale),y:round((r.y-sr.y)/scale),width:round(r.width/scale),height:round(r.height/scale)};
  }
  function visible(element) {
    for(let e=element;e && e!==slide()?.parentElement;e=e.parentElement){
      const style=getComputedStyle(e);
      if(style.display==='none'||(e===element&&style.visibility==='hidden')||+style.opacity===0)return false;
    }
    const r=element.getBoundingClientRect();return r.width>1&&r.height>1;
  }
  function restore() {
    for(const [element,saved] of originals){
      for(const [property,[value,priority]] of saved.values)value?element.style.setProperty(property,value,priority):element.style.removeProperty(property);
      if(!saved.hadStyle&&!element.getAttribute('style'))element.removeAttribute('style');
    }
    originals.clear();applied.clear();typography.clear();textBoxes.clear();
  }
  function apply(event) {
    if(suspended||!slide())return;
    // Reveal can reset the destination's fragment cursor before slidechanged.
    // Keep outgoing geometry and transition ownership until that arrival event.
    if(SIFSSlideTransitions.deferFragment(event))return;
    SIFSRevealTransitions.cancel();
    SIFSSlideTransitions.prepare(event);
    restore();
    const record=layout.slides[slide().id] || {blocks:{}};
    window.SIFSObjectTiming?.prepare(slide(),record);
    SIFSSlideTransitions.apply(record,event);
    const entries=record.blocks;
    applyTypography(entries);
    // DOM order puts groups before their descendants. Child coordinates are absolute.
    const applyElement = element => {
      const entry=entries[element.dataset.sifsBlock], target=entry?.states?.[state()] || (entry?.x!==undefined ? entry : null);
      if(!target)return;
      const r=rect(element);if(!r.width||!r.height)return;
      let parentScale=1;
      for(let e=element.parentElement;e&&e!==slide();e=e.parentElement)parentScale*=applied.get(e)||1;
      const factor=textWidth(element.dataset.sifsBlock)!==undefined?target.width/r.width:Math.min(target.width/r.width,target.height/r.height);
      setProperty(element,'transform-origin','0 0');
      setProperty(element,'translate',`${(target.x-r.x)/parentScale}px ${(target.y-r.y)/parentScale}px`);
      setProperty(element,'scale',element.matches('.sifs-user-line')?`${target.width/r.width} ${target.height/r.height}`:String(factor));
      applied.set(element,factor);
    };
    for(const element of slide().querySelectorAll('[data-sifs-block]:not([data-native-line])'))applyElement(element);
    window.SIFSGraphics?.prepare(slide(),layout);
    for(const element of slide().querySelectorAll('[data-native-line]'))applyElement(element);
    window.SIFSObjectTiming?.apply(slide(),record,setProperty);
    window.SIFSEditor?.prepareSelection(setProperty);
    // Render incoming experiments before the transition freezes their visuals.
    window.SIFSEmbedded?.refresh();
    SIFSSlideTransitions.finishLayout();
    SIFSRevealTransitions.settle(slide(),record,event);
    document.dispatchEvent(new CustomEvent('sifs-layout-applied'));
  }
  function textStyle(id) {
    const element=elementFor(id);if(!element)return null;
    const cached=typography.get(id);
    if(cached?.element===element){const {element:_,...result}=cached;return clone(result);}
    const value=computedTypography(element);
    return {style:clone(layout.slides[slide().id]?.blocks[id]?.textStyle || {}),...value,defaultFontSize:value.fontSize,defaultColor:value.color,defaultTextAlign:value.textAlign};
  }
  function setTextStyle(id,style={}) {
    const element=elementFor(id);if(!element)return null;
    if(!style||typeof style!=='object'||Array.isArray(style)||Object.keys(style).some(k=>!['fontSize','color','textAlign'].includes(k)))throw Error('Text style supports only fontSize, color and textAlign.');
    const next={};
    if(style.fontSize!==undefined){
      if(typeof style.fontSize!=='number'||!Number.isFinite(style.fontSize)||style.fontSize<8||style.fontSize>160)throw Error('Font size must be from 8 to 160 pixels.');
      next.fontSize=style.fontSize;
    }
    if(style.color!==undefined){
      if(typeof style.color!=='string'||!/^#[0-9a-f]{6}$/i.test(style.color))throw Error('Text color must use six hex digits.');
      next.color=style.color.toLowerCase();
    }
    if(style.textAlign!==undefined){
      if(!['left','center','right'].includes(style.textAlign))throw Error('Text alignment must be left, center or right.');
      next.textAlign=style.textAlign;
    }
    const sid=slide().id,entries=(layout.slides[sid] ||= {blocks:{}}).blocks,entry=entries[id] ||= {};
    const changedSize=entry.textStyle?.fontSize!==next.fontSize;
    // Measure with all typography but no geometry. Updating every saved own
    // rectangle retains each reveal's scale while allowing the new font to grow.
    // This synchronous transaction never exposes an unpositioned paint or changes
    // Reveal's current fragment. Other blocks' saved placements stay untouched.
    restore();applyTypography(entries);
    const before=changedSize?rect(element):null;
    restore();
    if(Object.keys(next).length)entry.textStyle=next;else delete entry.textStyle;
    applyTypography(entries);
    const after=changedSize?rect(element):null;
    if(before?.width>0&&before.height>0&&after?.width>0&&after.height>0)
      for(const target of [entry,...Object.values(entry.states || {})])if(target.x!==undefined){
        target.width=round(target.width*after.width/before.width);target.height=round(target.height*after.height/before.height);
      }
    if(entry.states&&!Object.keys(entry.states).length)delete entry.states;
    if(!Object.keys(entry).length)delete entries[id];
    if(!Object.keys(entries).length&&!layout.slides[sid].timeline&&!layout.slides[sid].transitions&&!layout.slides[sid].slideTransition)delete layout.slides[sid];
    restore();apply();
    return textStyle(id);
  }
  function blocks(includeHidden=false) {
    if(!slide())return [];
    return [...slide().querySelectorAll('[data-sifs-block]')].filter(e=>!e.querySelector('.ictp-logo')&&(includeHidden||visible(e))).map(element=>({
      id:element.dataset.sifsBlock,slideId:slide().id,visible:visible(element),deleted:!!layout.slides[slide().id]?.blocks[element.dataset.sifsBlock]?.deleted,
      kind:element.matches('.sifs-user-line')?'line':element.matches('.columns,.column,.calc-stack,.stage-stack,.calc-stage,.derivation-stage')?'group':element.matches('img')?'image':element.matches('.math.display,mjx-container,mjx-math,[data-sifs-kind=latex]')?'equation':element.tagName.toLowerCase(),
      label:(element.dataset.lineLabel||(element.matches('.sifs-user-line')?`${element.dataset.orientation||'Horizontal'} line`:'')||element.getAttribute('alt')||element.textContent||window.SIFSContent?.block(element.dataset.sifsBlock)?.source||element.className||element.tagName).replace(/\s+/g,' ').trim().slice(0,85),
      rect:rect(element),parentId:element.parentElement.closest('[data-sifs-block]')?.dataset.sifsBlock || null
    }));
  }
  const ready=(async()=>{
    if(!Reveal.isReady())await new Promise(resolve=>Reveal.on('ready',resolve));
    if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
    if(window.MathJax?.startup?.promise)await MathJax.startup.promise;
    // fonts.ready covers only fonts already requested by visible content.
    // Hidden slides (especially MathJax) must have their local faces loaded too,
    // otherwise the first visit measures fallback glyphs and visibly reflows.
    await Promise.allSettled([...document.fonts].map(face=>face.load()));
    await document.fonts.ready;
    Reveal.layout();
    await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));
    // Non-replaced inline spans cannot be transformed. MathJax's display
    // container is transformable and retains the source equation's stable ID.
    bindMath();
    for(const s of Reveal.getSlides())window.SIFSObjectTiming?.prepare(s,layout.slides[s.id]||{blocks:{}});
    for(const event of ['slidechanged','fragmentshown','fragmenthidden','resize'])Reveal.on(event,apply);
    // Hidden slides may request an unused font weight only on their first visit.
    // Reapply saved rectangles after those metrics settle, as on a later reveal.
    document.fonts.addEventListener('loadingdone',apply);
    if(window.SIFS_REQUESTED_HASH){
      const requestedURL=new URL(location.href);requestedURL.hash=window.SIFS_REQUESTED_HASH;
      history.replaceState(history.state,'',requestedURL.href);
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    }
    apply();
  })();
  function bindMath() {
    for(const span of document.querySelectorAll('.reveal span.math[data-sifs-block]')){
      const math=span.querySelector(span.classList.contains('display')?'mjx-container':'mjx-math');
      if(math){math.dataset.sifsBlock=span.dataset.sifsBlock;span.removeAttribute('data-sifs-block');}
    }
  }
  window.SIFSLayout={suspend:()=>{suspended++;restore();},resume:()=>{suspended=Math.max(0,suspended-1);apply();},ready,apply,restore,bindMath,rect,visible,blocks,state,textStyle,setTextStyle,textWidth,textBox,getLayout:()=>clone(layout),setLayout:value=>{layout=clone(value);for(const s of Reveal.getSlides())window.SIFSObjectTiming?.prepare(s,layout.slides[s.id]||{blocks:{}});apply();}};
})();
