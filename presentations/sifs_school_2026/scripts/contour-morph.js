/* Vector correspondence: the two maps become the upper panels of the combined figure.
 * Only temporary visual copies animate; original image objects remain editable. */
(() => {
 const data=window.SIFSContourMorphData,NS='http://www.w3.org/2000/svg';
 const isGlyph=l=>l.tag==='use'||l.tag==='path'&&(l.matrix[0]*l.matrix[3]-l.matrix[1]*l.matrix[2])<0;
 const ids=['img-d4530fe5f0025d5e8488bd0de1175f08','img-0911d64c30905d1a88ef6c45d107d6b5','img-9e6a70bcae1359058c8d2ce113b2b3f9'];
 const lerp=(a,b,t)=>a+(b-a)*t,smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)};
 function node(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);parent?.append(e);return e}
 function pair(s,before,after){
  if(s.id!=='habituation-information-gain')return null;
  const reverse=before.has(ids[2])&&after.has(ids[0])&&after.has(ids[1]);
  const forward=before.has(ids[0])&&before.has(ids[1])&&after.has(ids[2]);if(!forward&&!reverse)return null;
  const sources=ids.slice(0,2).map(id=>(reverse?after:before).get(id)),destination=(reverse?before:after).get(ids[2]);
  return {from:reverse?destination:sources[0],to:reverse?sources[0]:destination,contour:{sources,destination,reverse},extraFrom:reverse?[]:[sources[1]],extraTo:reverse?[sources[1]]:[]};
 }
 function animate(layer,from,to,duration,config){
  const {sources,destination,reverse}=config,entries=[...sources,destination,destination];
  const views=data.map((v,i)=>{const r=entries[i].rect,scale=Math.min(r.width/v.vb[2],r.height/v.vb[3]);return {...v,scale,ox:r.x+(r.width-scale*v.vb[2])/2-v.vb[0]*scale,oy:r.y+(r.height-scale*v.vb[3])/2-v.vb[1]*scale}});
  const svg=node('svg',{class:'sifs-contour-vector-morph',width:innerWidth,height:innerHeight,viewBox:`0 0 ${innerWidth} ${innerHeight}`},layer);svg.style.cssText='position:absolute;inset:0;overflow:visible';svg.innerHTML=views.map(v=>v.defs).join('');
  const extra=node('g',{},svg);extra.innerHTML=views[2].rest;
  const nested=extra.firstElementChild;for(const[k,v]of Object.entries({x:destination.rect.x,y:destination.rect.y,width:destination.rect.width,height:destination.rect.height}))nested.setAttribute(k,v);
  const parts=[];
  for(let i=0;i<2;i++){
   const a=views[i],b=views[i+2];
   for(const key of ['field','frame','title','xlabel','ylabel','x0','x1','y0','y1','bar']){
    if(a.parts[key].leaves){parts.push({i,key,glyphs:makeGlyphs(a.parts[key].leaves,b.parts[key].leaves)});continue;}
    const ga=node('g',{},svg),gb=node('g',{},svg);ga.innerHTML=a.parts[key].markup;gb.innerHTML=b.parts[key].markup;parts.push({i,key,ga,gb});
   }
   const star=node('g',{},svg);star.innerHTML=a.parts.star.markup;
   const lines=node('g',{},svg);lines.innerHTML=b.parts.lines.markup;parts.push({i,key:'addition',star,lines});
  }
  const box=(v,b)=>({x:v.ox+b.x*v.scale,y:v.oy+b.y*v.scale,width:b.width*v.scale,height:b.height*v.scale});
  const mixBox=(a,b,t)=>Object.fromEntries(['x','y','width','height'].map(k=>[k,lerp(a[k],b[k],t)]));
  function place(e,base,target,uniform=false){let sx=target.width/base.width,sy=target.height/base.height;if(uniform)sx=sy;const x=target.x+(target.width-base.width*sx)/2,y=target.y+(target.height-base.height*sy)/2;e.setAttribute('transform',`matrix(${sx},0,0,${sy},${x-base.x*sx},${y-base.y*sy})`)}
  function makeGlyphs(a,b){
    // A colorbar's endpoint numbers are separate labels. Repeated zeroes
    // must never match across those endpoints.
    function scope(leaves){
      const image=leaves.find(l=>l.tag==='image');
      if(!image)return leaves;
      const center=image.matrix[4]+image.matrix[0]*(image.box.x+image.box.width/2);
      return leaves.map(l=>({...l,scope:isGlyph(l)?(l.matrix[4]+l.matrix[0]*(l.box.x+l.box.width/2)<center?'left':'right'):'decoration'}));
    }
    a=scope(a);b=scope(b);
    const cost=(x,y)=>x.scope!==y.scope?3:x.key===y.key?0:x.tag===y.tag||isGlyph(x)&&isGlyph(y)?1:3;
    // Align characters, retaining shared symbols instead of crossfading labels.
    const dp=Array.from({length:a.length+1},()=>Array(b.length+1).fill(0));
    for(let i=a.length;i>=0;i--)for(let j=b.length;j>=0;j--){
      if(i===a.length)dp[i][j]=b.length-j;
      else if(j===b.length)dp[i][j]=a.length-i;
      else dp[i][j]=Math.min(1+dp[i+1][j],1+dp[i][j+1],dp[i+1][j+1]+cost(a[i],b[j]));
    }
    const pairs=[];let i=0,j=0;
    while(i<a.length||j<b.length){
      const matchCost=i<a.length&&j<b.length?cost(a[i],b[j]):Infinity;
      if(i<a.length&&j<b.length&&dp[i][j]===dp[i+1][j+1]+matchCost){pairs.push({a:a[i++],b:b[j++]})}
      else if(i<a.length&&dp[i][j]===1+dp[i+1][j])pairs.push({a:a[i++]});
      else pairs.push({b:b[j++]});
    }
    for(const pair of pairs){
      pair.g=node('g',{},svg);pair.g.innerHTML=(pair.a||pair.b).markup;
      if(!pair.a||!pair.b){
        const side=pair.a?'a':'b',leaf=pair[side];
        pair.anchor=pairs.filter(q=>q.a&&q.b&&(q[side].tag===leaf.tag||isGlyph(q[side])&&isGlyph(leaf))&&q[side].scope===leaf.scope)
          .sort((x,y)=>Math.abs(x[side].matrix[4]-leaf.matrix[4])-Math.abs(y[side].matrix[4]-leaf.matrix[4]))[0];
      }
    }
    return pairs;
  }
  function screenMatrix(v,leaf){const m=leaf.matrix;return new DOMMatrix([m[0]*v.scale,m[1]*v.scale,m[2]*v.scale,m[3]*v.scale,v.ox+m[4]*v.scale,v.oy+m[5]*v.scale])}
  function components(m){const sx=Math.hypot(m.a,m.b);return {x:m.e,y:m.f,angle:Math.atan2(m.b,m.a),sx,sy:(m.a*m.d-m.b*m.c)/sx,skew:(m.a*m.c+m.b*m.d)/(sx*sx)}}
  function mixMatrix(A,B,p){
    const a=components(A),b=components(B);let da=b.angle-a.angle;while(da>Math.PI)da-=2*Math.PI;while(da< -Math.PI)da+=2*Math.PI;
    const angle=a.angle+da*p,sx=lerp(a.sx,b.sx,p),sy=lerp(a.sy,b.sy,p),skew=lerp(a.skew,b.skew,p),c=Math.cos(angle),s=Math.sin(angle);
    return `matrix(${c*sx},${s*sx},${c*skew*sx-s*sy},${s*skew*sx+c*sy},${lerp(a.x,b.x,p)},${lerp(a.y,b.y,p)})`;
  }
  function drawGlyphs(item,a,b,p,t){
    for(const pair of item.glyphs){
      if(!pair.a||!pair.b){
        // Only unmatched characters (e.g. the trailing .0) change opacity.
        const leaf=pair.a||pair.b,v=pair.a?a:b,sourceBox=v.parts[item.key].box,target=mixBox(box(a,a.parts[item.key].box),box(b,b.parts[item.key].box),p);
        const matrix=screenMatrix(v,leaf),own=box(v,sourceBox),scale=target.height/own.height;
        const outer=pair.anchor
          ?new DOMMatrix(mixMatrix(screenMatrix(a,pair.anchor.a),screenMatrix(b,pair.anchor.b),p))
            .multiply(screenMatrix(v,pair.a?pair.anchor.a:pair.anchor.b).inverse()).multiply(matrix)
          :new DOMMatrix().translate(target.x+target.width/2,target.y+target.height/2).scale(scale).translate(-own.x-own.width/2,-own.y-own.height/2).multiply(matrix);
        pair.g.setAttribute('transform',outer.toString());pair.g.setAttribute('opacity',pair.a?1-smooth((t-.35)/.2):smooth((t-.35)/.2));continue;
      }
      const leaf=p<.5?pair.a:pair.b;
      if(pair.leaf!==leaf){pair.g.innerHTML=leaf.markup;pair.leaf=leaf;}
      let A=screenMatrix(a,pair.a),B=screenMatrix(b,pair.b);
      if(pair.a.tag!=='use'||pair.b.tag!=='use'){
        const ra=pair.a.box,rb=pair.b.box,r=leaf.box;
        A=A.translate(ra.x,ra.y).scale(ra.width||1,ra.height||1);
        B=B.translate(rb.x,rb.y).scale(rb.width||1,rb.height||1);
        const inner=pair.g.firstElementChild;
        inner.setAttribute('transform',`scale(${1/(r.width||1)},${1/(r.height||1)}) translate(${-r.x},${-r.y})`);
      }
      pair.g.setAttribute('transform',mixMatrix(A,B,p));
    }
  }
  function draw(t){
   // Move the existing maps first. Reveal the additional analysis after they settle.
   const p=smooth(Math.min(t/.82,1)),replacement=smooth((t-.64)/.25),addition=smooth((t-.70)/.30);
   extra.setAttribute('opacity',addition);
   for(const item of parts){const a=views[item.i],b=views[item.i+2];
    if(item.glyphs){drawGlyphs(item,a,b,p,t);continue;}
    if(item.key==='addition'){
     const plot=mixBox(box(a,a.parts.frame.box),box(b,b.parts.frame.box),p);
     place(item.star,a.parts.frame.box,plot);item.star.setAttribute('opacity',1-smooth(t/.35));
     place(item.lines,b.parts.frame.box,plot);item.lines.setAttribute('opacity',addition);continue;
    }
    const key=item.key,ap=a.parts[key],bp=b.parts[key],target=mixBox(box(a,ap.box),box(b,bp.box),p),uniform=!['field','frame','bar'].includes(key);
    place(item.ga,ap.box,target,uniform);place(item.gb,bp.box,target,uniform);
    if(key==='field'){
      // Keep the existing colour field fully opaque under the destination
      // rendering; complementary alpha fades would wash it out to white.
      item.ga.setAttribute('opacity',1);item.gb.setAttribute('opacity',replacement);
    }else if(key==='frame'){
      item.ga.setAttribute('opacity',1);item.gb.setAttribute('opacity',replacement);
    }else if(['x0','x1','y0','y1'].includes(key)){
      item.ga.setAttribute('opacity',1-smooth((t-.64)/.06));
      item.gb.setAttribute('opacity',smooth((t-.70)/.10));
    }else{
      item.ga.setAttribute('opacity',1-replacement);item.gb.setAttribute('opacity',replacement);
    }
   }
  }
  const driver=node('g',{},svg),animation=driver.animate([{opacity:1},{opacity:1}],{duration,easing:'linear',fill:'both'});
  const frame=()=>{
    if(!layer.isConnected||animation.playState==='idle')return;
    const t=animation.effect.getComputedTiming().progress??0;draw(reverse?1-t:t);
    // Finish on the real editable SVG image. Inline SVG and an SVG <img>
    // rasterize glyph edges differently; blend that last subpixel difference
    // while the actual destination is already underneath the visual copy.
    const handoff=smooth((t-.90)/.10),targets=reverse?sources:[destination];
    for(const item of targets)item.e.style.setProperty('opacity',handoff>0?'1':'0','important');
    svg.style.opacity=String(1-handoff);
    if(animation.playState!=='finished')requestAnimationFrame(frame);
  };
  draw(reverse?1:0);requestAnimationFrame(frame);return animation;
 }
 window.SIFSContourMorph={pair,animate};
})();
