/* Object lifetime overrides and inserted reveals. Native fragments retain their
 * original index; the timeline maps presentation steps onto those source states.
 * Stored beside geometry so source blocks and their stable IDs stay editable. */
(() => {
  const native=new WeakMap(), configs=new WeakMap();
  const fragments=s=>[...s.querySelectorAll('.fragment:not([data-sifs-timing-marker]),[data-sifs-original-fragment]')];
  function capture(s){for(const e of fragments(s))if(!native.has(e))native.set(e,+(e.dataset.fragmentIndex||0));}
  function timeline(s,record={}){
    capture(s);const max=Math.max(-1,...fragments(s).map(e=>native.get(e)));
    const t=record.timeline?[...record.timeline]:Array.from({length:max+2},(_,i)=>i-1);
    // New source fragments may be added after a timeline has been edited.
    for(let i=Math.max(record.timelineSourceMax??-1,...t)+1;i<=max;i++)t.push(i);
    for(const b of Object.values(record.blocks||{}))if(b.reveal){
      // A range made empty by removal must not recreate a second step.
      if(b.reveal.until===b.reveal.from+1&&(b.reveal.except||[]).includes(b.reveal.from))continue;
      const needed=Math.max(b.reveal.from,b.reveal.until??-1)+2;
      while(t.length<needed)t.push(t.at(-1));
    }
    return t;
  }
  function prepare(s,record){
    const t=timeline(s,record),active=!!record.timeline||Object.values(record.blocks||{}).some(b=>b.reveal);
    const signature=JSON.stringify([active,t,fragments(s).map(e=>[native.get(e),e.dataset.sifsBlock])]);
    if(!active&&!configs.has(s))return t;
    if(configs.get(s)!==signature){
      s.querySelectorAll('[data-sifs-timing-marker]').forEach(e=>e.remove());
      for(const e of fragments(s)){
        // With only one retained view, no native fragment may create a step.
        // Keep it discoverable so adding a reveal or undo restores its class.
        const single=active&&t.length===1;
        e.toggleAttribute('data-sifs-original-fragment',single);e.classList.toggle('fragment',!single);
        e.dataset.fragmentIndex=active?Math.max(0,t.indexOf(native.get(e))-1):native.get(e);
      }
      if(active)for(let i=0;i<t.length-1;i++){
        const marker=document.createElement('span');marker.className='fragment';marker.dataset.sifsTimingMarker='';marker.dataset.fragmentIndex=i;
        marker.setAttribute('aria-hidden','true');marker.style.cssText='position:absolute;width:0;height:0;overflow:hidden;pointer-events:none;';s.append(marker);
      }
      configs.set(s,signature);Reveal.sync();
    }
    return t;
  }
  function ownVisible(e,f){
    if(f===-2)return false;
    if(!native.has(e)&&!e.classList.contains('fragment'))return true;
    const i=native.get(e)??+(e.dataset.fragmentIndex||0),c=e.classList;
    if(c.contains('fade-out'))return f<i;
    if(c.contains('fade-in-then-out')||c.contains('current-visible'))return f===i;
    if(c.contains('semi-fade-out')||[...c].some(x=>x.startsWith('highlight-')))return true;
    return f>=i;
  }
  const frameSelector='h1,h2,.source,.ictp-logo,.deck-slide-number,.derivation-navigation';
  const frame=e=>!!e.closest(frameSelector);
  const shows=(r,f)=>f>=r.from&&(r.until===null||f<r.until)&&!(r.except||[]).includes(f);
  function rangeFromStates(states){
    const indices=states.flatMap((on,i)=>on?[i-1]:[]);
    // An empty selection stays editable without extending the slide forever.
    if(!indices.length)return {from:-1,until:0,except:[-1]};
    const from=indices[0],last=indices.at(-1),until=last===states.length-2?null:last+1;
    const except=[];for(let f=from;f<=last;f++)if(!states[f+1])except.push(f);
    return {from,until,...(except.length?{except}:{})};
  }
  function inheritedRange(e,s,t){
    return rangeFromStates(t.map(f=>{
      if(f===-2)return frame(e);
      for(let p=e;p&&p!==s;p=p.parentElement)if(!ownVisible(p,f))return false;
      return true;
    }));
  }
  function info(e,s,record){
    const t=timeline(s,record),b=record.blocks?.[e.dataset.sifsBlock]||{};
    return {deleted:!!b.deleted,custom:!!b.reveal,...(b.reveal||inheritedRange(e.dataset.lineOwner?s.querySelector('[data-sifs-block="'+CSS.escape(e.dataset.lineOwner)+'"]')||e:e,s,t)),count:t.length};
  }
  function apply(s,record,set){
    const entries=record.blocks||{},f=Reveal.getIndices().f??-1;
    const hidden=e=>{set(e,'visibility','hidden');set(e,'opacity','0');set(e,'pointer-events','none');};
    if(record.timeline||Object.values(entries).some(b=>b.reveal)){
      const t=timeline(s,record),sourceState=t[Math.max(0,Math.min(t.length-1,f+1))];
      for(const e of fragments(s)){
        const on=ownVisible(e,sourceState);
        // Do not change current-fragment: Reveal derives its cursor from it.
        if(![...e.classList].some(x=>x.startsWith('highlight-'))&&!e.classList.contains('semi-fade-out')){
          set(e,'opacity',on?'1':'0');set(e,'visibility',on?'visible':'hidden');
        }
      }
      if(sourceState===-2){
        const hideBody=e=>{
          if(frame(e)||e.matches('aside.notes,script,style,[data-sifs-timing-marker]'))return;
          // Pandoc can wrap the logo in a paragraph. Keep that wrapper and
          // inspect its children instead of hiding the shared ancestor.
          if(e.querySelector(frameSelector))for(const child of e.children)hideBody(child);
          else hidden(e);
        };
        for(const e of s.children)hideBody(e);
      }
    }
    const explicit=[...s.querySelectorAll('[data-sifs-block]')].filter(e=>entries[e.dataset.sifsBlock]?.reveal);
    // Reveal the union of all active override paths. Masking siblings while
    // processing one object must not erase a sibling's own active override.
    const activePaths=new Set();
    for(const e of explicit)if(shows(entries[e.dataset.sifsBlock].reveal,f))
      for(let p=e;p&&p!==s;p=p.parentElement)activePaths.add(p);
    // A group range controls its contents. A more specific child range may
    // extend outside that group without exposing the group's other contents.
    for(const e of explicit){
      const r=entries[e.dataset.sifsBlock].reveal,on=shows(r,f);
      if(!on){hidden(e);continue;}
      const path=[];for(let p=e.parentElement;p&&p!==s;p=p.parentElement)path.unshift(p);
      for(const p of path){
        const c=getComputedStyle(p);
        if(+c.opacity===0||c.visibility==='hidden'){
          set(p,'opacity','1');set(p,'visibility','hidden');
          // Explicit visibility on descendants must not leak out of a hidden stage.
          for(const child of p.children)if(!activePaths.has(child))hidden(child);
        }
      }
      set(e,'opacity','1');set(e,'visibility','visible');set(e,'pointer-events','auto');
    }
    // Deletion always wins over child visibility overrides. Keep the occupied
    // layout space, but remove all descendants from sight and keyboard focus.
    for(const e of s.querySelectorAll('[data-sifs-block]'))if(entries[e.dataset.sifsBlock]?.deleted){
      hidden(e);for(const child of e.querySelectorAll('*'))hidden(child);
      for(const line of s.querySelectorAll('[data-line-owner]')){
        const owner=s.querySelector('[data-sifs-block="'+CSS.escape(line.dataset.lineOwner)+'"]');
        if(owner&&(e===owner||e.contains(owner)))hidden(line);
      }
    }
  }
  // Map new positions to old positions. This preserves entire views, including
  // disjoint object lifetimes that cannot be expressed by one continuous range.
  function remap(record,old,order){
    record.timelineSourceMax=Math.max(record.timelineSourceMax??-1,...old);
    record.timeline=order.map(i=>i===null?-2:old[i]);
    if(record.transitions){const previous=record.transitions;record.transitions={};order.forEach((i,j)=>{if(i!==null&&previous[String(i-1)])record.transitions[String(j-1)]=JSON.parse(JSON.stringify(previous[String(i-1)]));});}
    for(const b of Object.values(record.blocks||{})){
      if(b.reveal){const r=b.reveal;b.reveal=rangeFromStates(order.map(i=>i!==null&&shows(r,i-1)));}
      if(b.states){const previous=b.states;b.states={};order.forEach((i,j)=>{
        if(i!==null&&previous[String(i-1)])b.states[String(j-1)]=JSON.parse(JSON.stringify(previous[String(i-1)]));
      });}
    }
    // Removing the only positioned state leaves no geometry override.
    // Such records must not make the entire document impossible to save.
    for(const [id,b] of Object.entries(record.blocks||{})){
      if(b.states&&!Object.keys(b.states).length)delete b.states;
      if(!Object.keys(b).length)delete record.blocks[id];
    }
  }
  function insert(s,record,after){
    const t=timeline(s,record),at=after+2;
    if(t.length>=1002)throw Error('This slide already has 1,002 reveal states.');
    const order=t.map((_,i)=>i);order.splice(at,0,at===0?null:at-1);remap(record,t,order);
    return after+1;
  }
  function remove(s,record,current){
    const t=timeline(s,record);
    if(t.length<=1)throw Error('A slide must retain at least one reveal.');
    const at=current+1;
    if(at<0||at>=t.length)throw Error('Select a reveal to remove.');
    remap(record,t,t.map((_,i)=>i).filter(i=>i!==at));
    return Math.min(current,t.length-3);
  }
  function insertBefore(s,record,current){insert(s,record,current-1);return current+1;}
  function move(s,record,current,direction){
    const t=timeline(s,record),at=current+1,target=at+direction;
    if(![-1,1].includes(direction)||target<0||target>=t.length)throw Error('This reveal is already at that end of the slide.');
    const order=t.map((_,i)=>i);[order[at],order[target]]=[order[target],order[at]];remap(record,t,order);
    return current+direction;
  }
  window.SIFSObjectTiming={timeline,prepare,apply,info,insert,insertBefore,move,remove,shows,rangeFromStates};
})();
