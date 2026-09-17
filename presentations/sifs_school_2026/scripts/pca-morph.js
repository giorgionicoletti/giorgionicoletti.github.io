/* Preserve the author's actual PCA pixels throughout the color correspondence.
 * Every piece uses the same HTML image rendering as the final editable figure. */
(() => {
 const NS='http://www.w3.org/2000/svg',ids=['img-681bf8e7f1b450099a9d68f5322a3e90','img-95a0539677d15ceea56d5888241321a3'];
 const clamp=x=>Math.min(1,Math.max(0,x)),smooth=x=>{x=clamp(x);return x*x*(3-2*x)},mix=(a,b,t)=>a+(b-a)*t;
 function node(tag,attrs,parent){const e=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs||{}))e.setAttribute(k,v);parent?.append(e);return e}
 function pair(slide,before,after){if(slide.id!=='habituation-neural-comparison')return null;for(const[a,b]of[[0,1],[1,0]])if(before.has(ids[a])&&!after.has(ids[a])&&after.has(ids[b]))return{from:before.get(ids[a]),to:after.get(ids[b]),contour:{pca:true}};return null}
 function animate(layer,from,to,duration){
  const data=window.SIFSPCAMorphData,reverse=from.e.dataset.sifsBlock===ids[1],items=reverse?[to,from]:[from,to];
  const views=data.views.map((v,i)=>{const r=items[i].rect,s=Math.min(r.width/v.width,r.height/v.height);return{...v,s,x:r.x+(r.width-v.width*s)/2,y:r.y+(r.height-v.height*s)/2}}),v=views[1];
  const root=document.createElement('div');root.className='sifs-pca-vector-morph';root.style.cssText='position:absolute;inset:0;pointer-events:none';layer.append(root);
  const svg=node('svg',{width:innerWidth,height:innerHeight,viewBox:`0 0 ${innerWidth} ${innerHeight}`},root);svg.style.cssText='position:absolute;inset:0;overflow:visible';const defs=node('defs',{},svg);
  function makeClip(id,path,panel){
   const cp=node('clipPath',{id,clipPathUnits:'objectBoundingBox'},defs),m=data.panels[panel].m;
   node('path',{d:path,transform:`matrix(${m[0]/v.width},${m[1]/v.height},${m[2]/v.width},${m[3]/v.height},${m[4]/v.width},${m[5]/v.height})`},cp);return id;
  }
  function picture(item,clipId){
   const wrap=document.createElement('div');wrap.style.cssText='position:absolute;left:0;top:0;transform-origin:0 0;pointer-events:none';const img=item.copy.cloneNode(true);
   if(clipId)img.style.setProperty('clip-path',`url(#${clipId})`,'important');wrap.append(img);root.append(wrap);
   const w=parseFloat(img.style.width),h=parseFloat(img.style.height);return{wrap,img,w,h};
  }
  function place(pic,r){pic.wrap.style.transform=`translate(${r.x}px,${r.y}px) scale(${r.width/pic.w},${r.height/pic.h})`}
  // Subtract only the raster's painted pixels, keeping labels which sit
  // inside its transparent bounding box intact from the moment axes appear.
  const black=node('filter',{id:'pca-alpha-black',x:0,y:0,width:1,height:1,'color-interpolation-filters':'sRGB'},defs);
  node('feColorMatrix',{type:'matrix',values:'0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'},black);
  node('feMorphology',{operator:'dilate',radius:3},black);const threshold=node('feComponentTransfer',{},black);node('feFuncA',{type:'linear',slope:1000,intercept:0},threshold);
  const mask=node('mask',{id:'pca-scaffold',maskUnits:'objectBoundingBox',maskContentUnits:'objectBoundingBox',x:0,y:0,width:1,height:1,'mask-type':'luminance'},defs);
  node('rect',{x:0,y:0,width:1,height:1,fill:'white'},mask);
  for(const p of data.panels){const m=p.m;node('image',{href:p.href,width:p.width,height:p.height,transform:`matrix(${m[0]/v.width},${m[1]/v.height},${m[2]/v.width},${m[3]/v.height},${m[4]/v.width},${m[5]/v.height})`,filter:'url(#pca-alpha-black)'},mask)}
  const scaffold=picture(items[1]);scaffold.img.style.setProperty('mask','url(#pca-scaffold)','important');place(scaffold,items[1].rect);
  const references=data.panels.map((p,i)=>{const pic=picture(items[1],makeClip('pca-reference-'+i,p.residual,i));place(pic,items[1].rect);return pic});
  const source=picture(items[0]);place(source,items[0].rect);
  const particles=data.points.map((pt,j)=>{
   const m=data.markers[pt.color],a=views[0],shape=picture(items[1],makeClip('pca-point-'+j,pt.clip,pt.panel));
   // Cache only this point's small painted area, rather than a full-figure
   // surface for each of the 415 moving pieces.
   // Rasterize the cached tiles at twice the base image resolution so GPU
   // scaling cannot soften the points as they approach their final size.
   shape.w*=2;shape.h*=2;
   shape.img.style.setProperty('width',shape.w+'px','important');shape.img.style.setProperty('height',shape.h+'px','important');
   const [left,top,right,bottom]=pt.bounds;
   shape.cropX=left*shape.w-2;shape.cropY=top*shape.h-2;
   Object.assign(shape.wrap.style,{width:((right-left)*shape.w+4)+'px',height:((bottom-top)*shape.h+4)+'px',overflow:'hidden',willChange:'transform, opacity'});
   for(const [key,value] of Object.entries({position:'absolute',left:-shape.cropX+'px',top:-shape.cropY+'px'}))shape.img.style.setProperty(key,value,'important');
   return{shape,color:pt.color,panel:pt.panel,px:pt.x/v.width,py:pt.y/v.height,x0:a.x+m.x*a.s,y0:a.y+m.y*a.s,x1:v.x+pt.x*v.s,y1:v.y+pt.y*v.s,r0:m.r*a.s,r1:2.95*v.s};
  });
  // Colored carriers remain on top until the original point shapes open out.
  root.append(svg);for(const p of particles)p.circle=node('circle',{fill:data.markers[p.color].color,stroke:'#231f20','stroke-width':.7},svg);
  const groups=new Map();for(const p of particles){const k=p.panel+':'+p.color;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p)}for(const g of groups.values()){const cx=g.reduce((s,p)=>s+p.x1,0)/g.length,cy=g.reduce((s,p)=>s+p.y1,0)/g.length;for(const p of g){p.cx=cx;p.cy=cy}}
  let settled=false;
  function draw(t){
   source.wrap.style.opacity=1-smooth(t/.29);scaffold.wrap.style.opacity=smooth((t-.30)/.30);for(const p of references)p.wrap.style.opacity=smooth((t-.59)/.15);
   const appear=smooth(t/.07),spread=smooth((t-.28)/.42),pointOpacity=smooth((t-.48)/.23),circleFade=smooth((t-.48)/.23),q=mix(.7,1,spread);
   if(t>=.71&&settled)return;settled=t>=.71;
   for(const p of particles){
    const delay=.075*p.color/13,u=smooth((t-.06-delay)/(.64-delay)),cx=mix(p.x0,p.cx,.55),cy=mix(p.y0,p.cy,.45)+(p.panel===0?-105:95)*v.s/1.82;
    const x=(1-u)*(1-u)*p.x0+2*(1-u)*u*cx+u*u*p.cx+spread*(p.x1-p.cx),y=(1-u)*(1-u)*p.y0+2*(1-u)*u*cy+u*u*p.cy+spread*(p.y1-p.cy);
    p.circle.setAttribute('cx',x);p.circle.setAttribute('cy',y);p.circle.setAttribute('r',mix(p.r0,p.r1,spread));p.circle.setAttribute('opacity',appear*(1-circleFade));
    const r=items[1].rect;p.shape.wrap.style.transform=`translate(${x-q*r.width*p.px+q*r.width/p.shape.w*p.shape.cropX}px,${y-q*r.height*p.py+q*r.height/p.shape.h*p.shape.cropY}px) scale(${q*r.width/p.shape.w},${q*r.height/p.shape.h})`;p.shape.wrap.style.opacity=Math.max(.001,pointOpacity);
   }
  }
  // Exact original at entry; all pieces already match its pixels at exit.
  const originalFrom=picture(from);place(originalFrom,from.rect);
  const driver=node('g',{},svg),animation=driver.animate([{opacity:1},{opacity:1}],{duration,easing:'linear',fill:'both'});
  const frame=()=>{if(!layer.isConnected||animation.playState==='idle')return;const t=animation.effect.getComputedTiming().progress??0;draw(reverse?1-t:t);originalFrom.wrap.style.opacity=1-smooth(t/.10);const handoff=smooth((t-.74)/.14);to.e.style.setProperty('opacity',handoff>0?'1':'0','important');root.style.opacity=String(1-handoff);if(animation.playState!=='finished')requestAnimationFrame(frame)};
  draw(reverse?1:0);requestAnimationFrame(frame);return animation;
 }
 window.SIFSPCAMorph={pair,animate};
})();
