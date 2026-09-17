/* Optional calculations use ordinary editable slides. Only presentation routing
 * changes; PDF mode traverses the complete source order. */
(() => {
 'use strict';
 const printMode=document.documentElement.dataset.sifsOutput==='pdf';
 const editing=()=>document.body.classList.contains('sifs-editing');
 const slides=()=>Reveal.getSlides(),parent=s=>s?.dataset.sifsDerivationParent||'';
 const children=id=>slides().filter(s=>parent(s)===id);
 const main=()=>slides().filter(s=>!parent(s));
 const last=s=>Math.max(-1,...[...s.querySelectorAll('.fragment')].map(f=>+f.dataset.fragmentIndex));
 let origin=null,pending=Promise.resolve(),menu=null,touch=null,backdrop=null,backdropParent=null,backdropReady=Promise.resolve();
 const index=id=>slides().findIndex(s=>s.id===id);
 const surface=()=>Reveal.getRevealElement();
 const goto=(id,f=-1)=>{const i=index(id);if(i>=0)Reveal.slide(i,0,f);};
 // The backdrop is a frozen, inert DOM view in a shadow root. It cannot
 // duplicate editor identities or become a second Reveal deck. Calculations
 // remain the real source-backed sections on the original editing canvas.
 function captureResult(id){
  const source=slides().find(s=>s.id===id);if(!source)return;
  if(!backdrop){
   backdrop=document.createElement('div');backdrop.className='derivation-backdrop';
   backdrop.setAttribute('aria-hidden','true');backdrop.attachShadow({mode:'open'});
   backdrop.onclick=()=>{if(!editing())close();};surface().prepend(backdrop);
  }
  backdropParent=id;const shadow=backdrop.shadowRoot;shadow.replaceChildren();
  const loading=[];
  for(const style of document.querySelectorAll('link[rel="stylesheet"],style')){
   const copy=style.cloneNode(true);
   if(copy.tagName==='LINK')loading.push(new Promise(resolve=>{copy.onload=copy.onerror=resolve;}));
   shadow.append(copy);
  }
  const css=document.createElement('style');css.textContent=`
   :host { display:block; } .reveal {position:absolute!important;inset:0!important;width:100%!important;height:100%!important;}
   .reveal .slides {position:absolute!important;left:50%!important;top:50%!important;width:1280px!important;height:720px!important;margin:0!important;}
   .reveal .slides > section {display:block!important;visibility:visible!important;opacity:1!important;transform:none!important;scale:1!important;left:0!important;top:0!important;}
   .derivation-navigation {display:none!important;}
  `;shadow.append(css);
  const stage=document.createElement('div');stage.className='reveal';stage.inert=true;
  const canvas=document.createElement('div');canvas.className='slides';
  const copy=source.cloneNode(true);copy.classList.remove('past','future','present');copy.classList.add('frozen-result');copy.removeAttribute('hidden');copy.setAttribute('aria-hidden','true');
  // cloneNode does not retain user-adjusted form values.
  const originals=source.querySelectorAll('input,select,textarea'),clones=copy.querySelectorAll('input,select,textarea');
  originals.forEach((e,i)=>{clones[i].value=e.value;if('checked' in e)clones[i].checked=e.checked;});
  canvas.append(copy);stage.append(canvas);shadow.append(stage);positionBackdrop();
  backdropReady=Promise.all(loading);
 }
 function positionBackdrop(){
  const canvas=backdrop?.shadowRoot.querySelector('.slides');
  if(canvas)canvas.style.transform=`translate(-50%, -50%) scale(${Reveal.getScale()})`;
 }
 function syncOverlay(){
  if(printMode)return;
  const current=Reveal.getCurrentSlide(),id=parent(current),active=!!id;
  if(active&&backdropParent!==(origin?.id||id))captureResult(origin?.id||id);
  surface().classList.toggle('derivation-open',active);
  if(backdrop)backdrop.hidden=!active;
  for(const s of slides()){
   if(parent(s)&&s===current){s.setAttribute('role','dialog');s.setAttribute('aria-modal',String(!editing()));s.setAttribute('aria-label','Derivation: '+s.querySelector('h2')?.textContent.trim());}
   else if(parent(s)){s.removeAttribute('role');s.removeAttribute('aria-modal');s.removeAttribute('aria-label');}
  }
  if(!active)backdropParent=null;
  positionBackdrop();updateControls();
 }
 function updateControls(){
  const s=Reveal.getCurrentSlide(),id=parent(s);if(!id||printMode)return;
  const list=children(id),at=list.indexOf(s),f=Reveal.getIndices().f??-1,nav=s.querySelector('.derivation-navigation');if(!nav)return;
  nav.querySelector('[data-derivation-count]').textContent=`Calculation ${at+1}/${list.length} · Step ${f+2}/${last(s)+2}`;
  nav.querySelector('[data-derivation-next]').textContent=at===list.length-1&&f===last(s)?'Return to result':'Next →';
 }
 function open(id=Reveal.getCurrentSlide().id){
  const list=children(id);if(!list.length)return Promise.resolve();
  const current=Reveal.getCurrentSlide(),lab=current.dataset.sifsLab;
  origin={id:current.id,f:Reveal.getIndices().f??-1,lab,state:lab&&window.SIFSLabs?SIFSLabs.getState(lab):null};
  captureResult(current.id);goto(list[0].id);syncOverlay();return pending=Promise.all([window.SIFSEmbedded?.ready(),backdropReady]).then(()=>{Reveal.getCurrentSlide().querySelector('[data-derivation-close]')?.focus({preventScroll:true});});
 }
 function close(){
  const s=Reveal.getCurrentSlide(),target=origin&&index(origin.id)>=0?origin:{id:parent(s),f:-1};
  if(!target.id)return Promise.resolve();origin=null;goto(target.id,target.f);
  return pending=Promise.resolve(window.SIFSEmbedded?.ready()).then(()=>{
   if(target.lab&&target.state)SIFSLabs.setState(target.state,true,target.lab);
   document.getElementById(target.id)?.querySelector('.derivation-badge')?.focus({preventScroll:true});
  });
 }
 function navigate(direction){
  const s=Reveal.getCurrentSlide(),f=Reveal.getIndices().f??-1;
  if(direction>0&&f<last(s)){Reveal.nextFragment();return;}
  if(direction<0&&f>=0){Reveal.prevFragment();return;}
  const list=parent(s)?children(parent(s)):main(),at=list.indexOf(s),target=list[at+direction];
  if(target){goto(target.id,direction>0?-1:last(target));return;}
  if(parent(s))close();
 }
 function overview(){
  if(menu?.open){menu.close();return;}
  if(!menu){menu=document.createElement('dialog');menu.className='derivation-overview';menu.innerHTML='<header><strong>Lecture slides</strong><button type="button">Close</button></header><nav></nav>';menu.querySelector('header button').onclick=()=>menu.close();document.body.append(menu);}
  const nav=menu.querySelector('nav');nav.replaceChildren();
  for(const s of main()){
   const button=document.createElement('button');button.type='button';button.textContent=`${s.dataset.sifsDisplayLabel||index(s.id)+1}. ${s.querySelector('h2')?.textContent.trim()||s.id}${children(s.id).length?' · Derivation':''}`;
   button.onclick=()=>{origin=null;goto(s.id);menu.close();};nav.append(button);
  }
  menu.showModal();
 }
 function refresh(){
  for(const s of slides()){
   const p=parent(s),list=p?children(p):children(s.id);
   for(const badge of s.querySelectorAll('.derivation-badge')){badge.hidden=!children(badge.dataset.sifsDerivationTarget||s.id).length||!!p;badge.setAttribute('aria-label','Open '+badge.textContent.trim());}
   let nav=s.querySelector(':scope > .derivation-navigation');
   if(!p){nav?.remove();continue;}
   if(!nav){nav=document.createElement('div');nav.className='derivation-navigation';s.append(nav);}
   if(printMode){nav.textContent=`Derivation ${list.indexOf(s)+1}/${list.length}`;continue;}
   if(!nav.childElementCount){
    const label=document.createElement('span');label.dataset.derivationCount='';nav.append(label);
    const button=(text,key,action)=>{const e=document.createElement('button');e.type='button';e.textContent=text;e.setAttribute(key,'');e.onclick=action;nav.append(e);return e;};
    button('← Previous','data-derivation-prev',()=>navigate(-1));
    button('Next →','data-derivation-next',()=>navigate(1));
    button('Close ×','data-derivation-close',()=>close()).setAttribute('aria-label','Close derivation');
   }
  }
 }
 window.addEventListener('load',()=>{
  refresh();if(printMode)return;syncOverlay();
  const next=Reveal.next.bind(Reveal),prev=Reveal.prev.bind(Reveal),oldOverview=Reveal.toggleOverview.bind(Reveal);
  Reveal.next=()=>editing()?next():navigate(1);Reveal.prev=()=>editing()?prev():navigate(-1);
  Reveal.toggleOverview=()=>editing()?oldOverview():overview();
  Reveal.on('slidechanged',()=>{refresh();syncOverlay();if(!parent(Reveal.getCurrentSlide()))origin=null;});
  for(const event of ['fragmentshown','fragmenthidden'])Reveal.on(event,updateControls);
  document.addEventListener('sifs-layout-applied',updateControls);
  Reveal.on('resize',positionBackdrop);
  new MutationObserver(syncOverlay).observe(document.body,{attributes:true,attributeFilter:['class']});
  document.addEventListener('keydown',e=>{
   if(!editing()&&parent(Reveal.getCurrentSlide())&&!window.SIFSLabs?.isOpen()&&!document.querySelector('dialog[open]')&&e.key==='Tab'){
    const focusable=[...Reveal.getCurrentSlide().querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden');
    if(focusable.length){e.preventDefault();e.stopImmediatePropagation();const i=focusable.indexOf(document.activeElement);focusable[(i+(e.shiftKey?-1:1)+focusable.length)%focusable.length].focus();}return;
   }
   if(menu?.open&&e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();menu.close();return;}
   if(e.target.closest('.derivation-navigation')&&['Enter',' '].includes(e.key)){e.stopImmediatePropagation();return;}
   if(editing()||window.SIFSLabs?.isOpen()||document.querySelector('dialog[open]')||e.target.closest('input,select,textarea,[contenteditable],.embedded-controls,.sifs-inline-lab'))return;
   if(e.target.closest('.derivation-badge')&&['Enter',' '].includes(e.key)){e.preventDefault();e.stopImmediatePropagation();open(e.target.closest('.derivation-badge').dataset.sifsDerivationTarget||Reveal.getCurrentSlide().id);return;}
   if(['ArrowRight','ArrowDown','PageDown',' ','n','N','ArrowLeft','ArrowUp','PageUp','p','P','Escape','o','O','Home','End'].includes(e.key)){
    e.preventDefault();e.stopImmediatePropagation();
    if(e.key==='Escape'&&parent(Reveal.getCurrentSlide()))close();
    else if(['Escape','o','O'].includes(e.key))overview();
    else if(e.key==='Home')goto(main()[0].id);
    else if(e.key==='End')goto(main().at(-1).id,last(main().at(-1)));
    else navigate(['ArrowLeft','ArrowUp','PageUp','p','P'].includes(e.key)||(e.key===' '&&e.shiftKey)?-1:1);
   }
  },true);
  document.addEventListener('click',e=>{if(!editing()&&e.target.closest('.derivation-badge')){e.preventDefault();open(e.target.closest('.derivation-badge').dataset.sifsDerivationTarget||Reveal.getCurrentSlide().id);}});
  const stage=surface();
  stage.addEventListener('touchstart',e=>{if(editing()||e.target.closest('.embedded-controls,.sifs-inline-lab,button,.derivation-badge')||e.touches.length!==1){touch=null;return;}touch={x:e.touches[0].clientX,y:e.touches[0].clientY};e.stopImmediatePropagation();},{capture:true,passive:true});
  stage.addEventListener('touchend',e=>{if(!touch)return;e.stopImmediatePropagation();const dx=e.changedTouches[0].clientX-touch.x,dy=e.changedTouches[0].clientY-touch.y;touch=null;if(Math.abs(dx)>60&&Math.abs(dx)>Math.abs(dy))navigate(dx<0?1:-1);},{capture:true,passive:true});
 });
 document.addEventListener('sifs-deck-changed',()=>{refresh();syncOverlay();});
 window.SIFSDerivations={open,close,refresh,children,main,parent,ready:()=>Promise.all([pending,backdropReady])};
})();
