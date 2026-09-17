/* Opt-in vector transition for the two habituation time courses.
 * Original SVG assets and editable image objects remain unchanged. */
(() => {
  const data=window.SIFSHabituationMorphData,NS='http://www.w3.org/2000/svg';
  const ids=['img-97dbe03711e856f8987fe57cbb007f5f','img-8d07d1b3afea5e3c8a31de230db98e56'];
  const lerp=(a,b,t)=>a+(b-a)*t,clamp=x=>Math.max(0,Math.min(1,x));
  const smooth=x=>{x=clamp(x);return x*x*(3-2*x)};
  function node(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);parent?.append(e);return e}
  function pair(slide,before,after){
    if(slide.id!=='habituation-repeated-stimuli')return window.SIFSPCAMorph?.pair(slide,before,after)||window.SIFSContourMorph?.pair(slide,before,after)||null;
    for(const [a,b]of [[0,1],[1,0]])if(before.has(ids[a])&&!after.has(ids[a])&&after.has(ids[b]))return {from:before.get(ids[a]),to:after.get(ids[b])};
    return null;
  }
  function animate(layer,from,to,duration,contour){
    if(contour?.pca)return window.SIFSPCAMorph.animate(layer,from,to,duration);
    if(contour)return window.SIFSContourMorph.animate(layer,from,to,duration,contour);
    const reverse=from.e.dataset.sifsBlock===ids[1];
    const entries=reverse?[to,from]:[from,to];
    const views=data.views.map((v,i)=>{
      const r=entries[i].rect,scale=Math.min(r.width/v.vb[2],r.height/v.vb[3]);
      return {...v,scale,ox:r.x+(r.width-scale*v.vb[2])/2-v.vb[0]*scale,oy:r.y+(r.height-scale*v.vb[3])/2-v.vb[1]*scale};
    });
    const svg=node('svg',{class:'sifs-habituation-vector-morph',width:innerWidth,height:innerHeight,viewBox:`0 0 ${innerWidth} ${innerHeight}`},layer);
    svg.style.cssText='position:absolute;inset:0;overflow:visible';
    svg.innerHTML=views[0].defs;
    const clip=node('clipPath',{id:'hab-morph-visible-time'},svg.querySelector('defs')),clipRect=node('rect',{},clip);
    const axis=node('path',{fill:'none',stroke:'#878787','stroke-linejoin':'miter'},svg);
    const plot=node('g',{'clip-path':'url(#hab-morph-visible-time)'},svg);
    const curves=['#d3d3d3','#001219'].map(stroke=>node('path',{fill:'none',stroke,'stroke-linejoin':'round','stroke-linecap':'round'},plot));
    const glyphs=[];
    for(const key of Object.keys(views[0].groups)){
      if(['title','threshold','xend'].includes(key))continue;
      const g=node('g',{},svg);g.innerHTML=views[0].groups[key].markup;glyphs.push({g,key,a:0,b:1});
    }
    for(const key of ['title','xend'])for(const i of [0,1]){const g=node('g',{},svg);g.innerHTML=views[i].groups[key].markup;glyphs.push({g,key,a:i,b:i,fade:i})}
    const threshold=node('g',{},svg);threshold.innerHTML=views[0].groups.threshold.markup;
    const px=(v,x)=>v.ox+x*v.scale,py=(v,y)=>v.oy+y*v.scale;
    function draw(p){
      const [a,b]=views,s=lerp(a.scale,b.scale,p),A=a.axis,B=b.axis;
      const left=lerp(px(a,A[0]),px(b,B[0]),p),right=lerp(px(a,A[2]),px(b,B[2]),p),top=lerp(py(a,A[1]),py(b,B[1]),p),bottom=lerp(py(a,A[3]),py(b,B[3]),p);
      axis.setAttribute('d',`M${left},${top}H${right}V${bottom}H${left}Z`);axis.setAttribute('stroke-width',.7*s);
      for(const [k,v]of Object.entries({x:left,y:top,width:right-left,height:bottom-top}))clipRect.setAttribute(k,v);
      const zero=lerp(px(a,a.zeroX),px(b,b.zeroX),p),end=lerp(px(a,a.endX),px(b,b.endX),p),time=lerp(a.maxTime,b.maxTime,p),mix=smooth(p*3);
      curves.forEach((path,i)=>{
        const limit=lerp(data.ends[0][i],data.ends[1][i],p);
        const samples=data.curves[i],visible=samples.filter(v=>v[0]<=limit),next=samples.find(v=>v[0]>limit),last=visible.at(-1);
        if(last&&next){const q=(limit-last[0])/(next[0]-last[0]);visible.push([limit,lerp(last[1],next[1],q),lerp(last[2],next[2],q)])}
        const points=visible.map(([t,y0,y1])=>[zero+t/time*(end-zero),top+lerp(y0,y1,mix)*(bottom-top)]);
        path.setAttribute('d',points.map(([x,y],j)=>`${j?'L':'M'}${x.toFixed(3)},${y.toFixed(3)}`).join(''));
        path.setAttribute('stroke-width',(i===0?1.5:1.25)*s);
      });
      for(const item of glyphs){
        const {g,key}=item,box=views[item.a].groups[key].box;
        const ab=a.groups[key].box,bb=b.groups[key].box;
        const x=lerp(px(a,ab.x+ab.width/2),px(b,bb.x+bb.width/2),p),y=lerp(py(a,ab.y+ab.height/2),py(b,bb.y+bb.height/2),p);
        g.setAttribute('transform',`translate(${x},${y}) scale(${s}) translate(${-box.x-box.width/2},${-box.y-box.height/2})`);
        if(item.fade!==undefined){const opacity=item.fade?smooth((p-(key==='xend'?.8:.4))/(key==='xend'?.2:.3)):1-smooth(p/.25);g.setAttribute('opacity',opacity)}
      }
      const sx=(end-zero)/time/(a.endX-a.zeroX)*a.maxTime,sy=(bottom-top)/(A[3]-A[1]);
      threshold.setAttribute('transform',`matrix(${sx},0,0,${sy},${zero-a.zeroX*sx},${top-A[1]*sy})`);
      threshold.setAttribute('opacity',1-smooth(p*4));
    }
    const driver=node('g',{},svg),animation=driver.animate([{opacity:1},{opacity:1}],{duration,easing:'ease-in-out',fill:'both'});
    const frame=()=>{if(!layer.isConnected||animation.playState==='idle')return;const t=animation.effect.getComputedTiming().progress??0;draw(reverse?1-t:t);if(animation.playState!=='finished')requestAnimationFrame(frame)};
    draw(reverse?1:0);requestAnimationFrame(frame);return animation;
  }
  window.SIFSHabituationMorph={pair,animate};
})();
