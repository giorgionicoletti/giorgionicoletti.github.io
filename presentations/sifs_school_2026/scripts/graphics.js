/* Editable hit regions for authored CSS separators. With no saved override,
 * presentation keeps the original border. Central two-column dividers use an
 * independent editable line so column padding never shifts the slide center. */
(() => {
 const originals=new WeakMap();
 const visible=(e,s)=>{for(let p=e;p&&p!==s.parentElement;p=p.parentElement){const c=getComputedStyle(p);if(c.visibility==='hidden'||c.display==='none'||+c.opacity===0)return false;}return true;};
 function prepare(slide,layout){
  const enabled=document.body.classList.contains('sifs-line-editing'),entries=layout.slides[slide.id]?.blocks||{};
  const sr=slide.getBoundingClientRect(),scale=sr.width/1280,seen=new Set();
  for(const owner of slide.querySelectorAll('[data-sifs-block]:not([data-native-line]):not(.sifs-user-object)')){
   if(owner.closest('.notes,.source,.assumption-line,.sifs-inline-lab')||owner.matches('img,mjx-container,mjx-math,button,.example-badge,.derivation-badge')||owner.querySelector('.ictp-logo'))continue;
   // Restore the CSS color before measuring a new reveal. A separator can
   // begin transparent and acquire its color when its content appears.
   const prior=originals.get(owner);
   if(prior)for(const [side,old] of Object.entries(prior)){
    const prop='border-'+side+'-color';
    if(old.value)owner.style.setProperty(prop,old.value,old.priority);else owner.style.removeProperty(prop);
   }
   const c=getComputedStyle(owner),r=owner.getBoundingClientRect();
   for(const side of ['top','right','bottom','left']){
    const prop='border-'+side+'-color',width=parseFloat(c.getPropertyValue('border-'+side+'-width'));
    if(!width||c.getPropertyValue('border-'+side+'-style')==='none')continue;
    const id='border-'+owner.dataset.sifsBlock+'-'+side;seen.add(id);
    let saved=originals.get(owner);if(!saved){saved={};originals.set(owner,saved);}
    if(!saved[side])saved[side]={value:owner.style.getPropertyValue(prop),priority:owner.style.getPropertyPriority(prop),color:c.getPropertyValue(prop)};
    const old=saved[side];old.color=c.getPropertyValue(prop);
    const centered=side==='left'&&owner.matches('.bp-result-columns > div + div');
    const changed=centered||!!(entries[id]?.x!==undefined||entries[id]?.states?.[window.SIFSLayout.state()]||entries[id]?.reveal||entries[id]?.deleted),show=(enabled||changed)&&(visible(owner,slide)||!!entries[id]?.reveal);
    let handle=slide.querySelector('[data-sifs-block="'+CSS.escape(id)+'"]');
    if(!show){if(handle)handle.style.display='none';if(old.value)owner.style.setProperty(prop,old.value,old.priority);else owner.style.removeProperty(prop);continue;}
    const vertical=side==='left'||side==='right',length=(vertical?r.height:r.width)/scale;if(length<20)continue;
    if(!handle){handle=document.createElement('div');handle.className='sifs-native-line sifs-user-line';handle.dataset.sifsBlock=id;handle.dataset.nativeLine=side;handle.dataset.lineOwner=owner.dataset.sifsBlock;handle.dataset.lineLabel=(vertical?'Vertical':'Horizontal')+' line: '+(owner.textContent||owner.className).replace(/\s+/g,' ').slice(0,65);slide.append(handle);}
    const x=(r.x-sr.x)/scale,y=(r.y-sr.y)/scale,w=r.width/scale,h=r.height/scale;
    handle.dataset.centeredDivider=String(centered);
    handle.dataset.orientation=vertical?'vertical':'horizontal';handle.dataset.lineColor=old.color;
    Object.assign(handle.style,{display:'block',left:(centered?640-12:vertical?x+(side==='right'?w:0)-12:x)+'px',top:(vertical?y:y+(side==='bottom'?h:0)-12)+'px',width:(vertical?24:w)+'px',height:(vertical?h:24)+'px'});
    if(entries[owner.dataset.sifsBlock]?.deleted){handle.style.display='none';}
    handle.style.setProperty('--line-thickness',width+'px');handle.style.setProperty('--line-color',changed?old.color:'transparent');
    if(changed)owner.style.setProperty(prop,'transparent','important');else if(old.value)owner.style.setProperty(prop,old.value,old.priority);else owner.style.removeProperty(prop);
   }
  }
  for(const h of slide.querySelectorAll('[data-native-line]'))if(!seen.has(h.dataset.sifsBlock))h.remove();
 }
 window.SIFSGraphics={prepare};
})();
