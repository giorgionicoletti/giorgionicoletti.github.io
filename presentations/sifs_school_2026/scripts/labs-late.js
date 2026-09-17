/* Late-lecture laboratories. Sources: PRX 14, 021007 (2024), Eq. 1,
 * Appendix A, Fig. 1; PRL 134, 068403 (2025), Eq. 1 and Fig. 1.
 * Curves/laws below are calculated from the generators. Stochastic paths are
 * fresh illustrative simulations, never digitized or presented as paper data. */
(() => {
  'use strict';
  const EPS=1e-14, log2=Math.log2, exp=Math.exp;
  function seeded(seed){let a=Number(seed)>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function gaussian(random){return Math.sqrt(-2*Math.log(Math.max(EPS,random())))*Math.cos(2*Math.PI*random());}
  function solve(A,b){const n=b.length,M=A.map((r,i)=>[...r,b[i]]);for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(M[i][k])>Math.abs(M[p][k]))p=i;if(Math.abs(M[p][k])<1e-15)throw Error('Singular stationary system');[M[p],M[k]]=[M[k],M[p]];const d=M[k][k];for(let j=k;j<=n;j++)M[k][j]/=d;for(let i=0;i<n;i++)if(i!==k){const c=M[i][k];for(let j=k;j<=n;j++)M[i][j]-=c*M[k][j];}}return M.map(r=>r[n]);}
  function prxGenerator(ratio,c=10,gamma=1){
    if(!(ratio>0&&c>=0&&gamma>0))throw Error('Positive timescales and baseline rates required');
    const Q=Array.from({length:4},()=>Array(4).fill(0));
    for(let s=0;s<4;s++){const x1=s&1,x2=s>>1,r1=gamma/ratio,r2=x2?gamma:gamma+c*x1;Q[s^1][s]=r1;Q[s^2][s]=r2;Q[s][s]=-r1-r2;}return Q;
  }
  function prxStationary(ratio,c=10,gamma=1){const Q=prxGenerator(ratio,c,gamma),A=Q.map(r=>r.slice());A[3]=[1,1,1,1];const p=solve(A,[0,0,0,1]),p1=[p[0]+p[2],p[1]+p[3]],p2=[p[0]+p[1],p[2]+p[3]];let mi=0;for(let s=0;s<4;s++)if(p[s]>0)mi+=p[s]*log2(p[s]/(p1[s&1]*p2[s>>1]));return{p,p1,p2,mi:Math.max(0,mi),Q};}
  function prxLimits(c=10,gamma=1){const b0=.5,b1=(gamma+c)/(2*gamma+c),slow=[.5*(1-b0),.5*(1-b1),.5*b0,.5*b1],pB=(gamma+c/2)/(2*gamma+c/2),fast=[.5*(1-pB),.5*(1-pB),.5*pB,.5*pB];const H=q=>q===0||q===1?0:-q*log2(q)-(1-q)*log2(1-q);return{fast,slow,slowMI:H((b0+b1)/2)-.5*(H(b0)+H(b1)),fastMI:0};}
  // Positions encode timescale rank, not a change to the physical edge. The
  // pair turns through a horizontal, equal-timescale state at ratio = 1.
  function prxOrdering(ratio){
    if(!(Number.isFinite(ratio)&&ratio>0))throw Error('A positive finite timescale ratio is required');
    const logRatio=Math.log10(ratio),angle=Math.max(-3,Math.min(3,logRatio))*Math.PI/6;
    const x=Math.cos(angle),y=Math.sin(angle);
    return{ratio,angle,nodes:[{id:'X1',x:-x,y,tau:ratio},{id:'X2',x,y:-y,tau:1}],edge:{source:'X1',target:'X2'},order:ratio===1?'equal':ratio<1?'X1-fast':'X2-fast'};
  }
  // Outlined mathematical labels copied from the supplied Figure 1 SVG.
  // The interactive uses its gray nodes and filled/open interaction endpoints.
  const prxStatePaths = ['M 3.328125,-3.015625 C 3.390625,-3.265625 3.625,-4.1875 4.3125,-4.1875 c 0.046875,0 0.296875,0 0.5,0.125 C 4.53125,-4 4.34375,-3.765625 4.34375,-3.515625 c 0,0.15625 0.109375,0.34375 0.375,0.34375 0.21875,0 0.53125,-0.171875 0.53125,-0.578125 0,-0.515625 -0.578125,-0.65625 -0.921875,-0.65625 -0.578125,0 -0.921875,0.53125 -1.046875,0.75 -0.25,-0.65625 -0.78125,-0.75 -1.078125,-0.75 -1.03125,0 -1.609375,1.28125 -1.609375,1.53125 0,0.109375 0.109375,0.109375 0.125,0.109375 0.078125,0 0.109375,-0.03125 0.125,-0.109375 0.34375,-1.0625 1,-1.3125 1.34375,-1.3125 0.1875,0 0.53125,0.09375 0.53125,0.671875 0,0.3125 -0.171875,0.96875 -0.53125,2.375 -0.15625,0.609375 -0.515625,1.03125 -0.953125,1.03125 -0.0625,0 -0.28125,0 -0.5,-0.125 0.25,-0.0625 0.46875,-0.265625 0.46875,-0.546875 0,-0.265625 -0.21875,-0.34375 -0.359375,-0.34375 -0.3125,0 -0.546875,0.25 -0.546875,0.578125 0,0.453125 0.484375,0.65625 0.921875,0.65625 0.671875,0 1.03125,-0.703125 1.046875,-0.75 0.125,0.359375 0.484375,0.75 1.078125,0.75 1.03125,0 1.59375,-1.28125 1.59375,-1.53125 0,-0.109375 -0.078125,-0.109375 -0.109375,-0.109375 -0.09375,0 -0.109375,0.046875 -0.140625,0.109375 -0.328125,1.078125 -1,1.3125 -1.3125,1.3125 -0.390625,0 -0.546875,-0.3125 -0.546875,-0.65625 0,-0.21875 0.046875,-0.4375 0.15625,-0.875 z m 0,0', 'm 2.328125,-4.4375 c 0,-0.1875 0,-0.1875 -0.203125,-0.1875 -0.453125,0.4375 -1.078125,0.4375 -1.359375,0.4375 v 0.25 c 0.15625,0 0.625,0 1,-0.1875 v 3.546875 c 0,0.234375 0,0.328125 -0.6875,0.328125 H 0.8125 V 0 c 0.125,0 0.984375,-0.03125 1.234375,-0.03125 0.21875,0 1.09375,0.03125 1.25,0.03125 V -0.25 H 3.03125 c -0.703125,0 -0.703125,-0.09375 -0.703125,-0.328125 z m 0,0', 'M 3.515625,-1.265625 H 3.28125 c -0.015625,0.15625 -0.09375,0.5625 -0.1875,0.625 C 3.046875,-0.59375 2.515625,-0.59375 2.40625,-0.59375 H 1.125 c 0.734375,-0.640625 0.984375,-0.84375 1.390625,-1.171875 0.515625,-0.40625 1,-0.84375 1,-1.5 0,-0.84375 -0.734375,-1.359375 -1.625,-1.359375 -0.859375,0 -1.453125,0.609375 -1.453125,1.25 0,0.34375 0.296875,0.390625 0.375,0.390625 0.15625,0 0.359375,-0.125 0.359375,-0.375 0,-0.125 -0.046875,-0.375 -0.40625,-0.375 C 0.984375,-4.21875 1.453125,-4.375 1.78125,-4.375 c 0.703125,0 1.0625,0.546875 1.0625,1.109375 0,0.609375 -0.4375,1.078125 -0.65625,1.328125 L 0.515625,-0.265625 C 0.4375,-0.203125 0.4375,-0.1875 0.4375,0 h 2.875 z m 0,0'];
  function prxStateLabel(index){return `<g class="prx-dof-label" aria-label="x${index+1}" transform="translate(-8.2 4.2) scale(1.85)" fill="#17191c"><path d="${prxStatePaths[0]}"/><path transform="translate(5.7 1.5)" d="${prxStatePaths[index+1]}"/></g>`;}
  function prxOrderingGlyph(ratio){
    const order=prxOrdering(ratio),cx=441,cy=125,radius=38,nodeRadius=18;
    const [a,b]=order.nodes.map(n=>({...n,x:cx+radius*n.x,y:cy+radius*n.y}));
    const ux=(b.x-a.x)/(2*radius),uy=(b.y-a.y)/(2*radius),start={x:a.x+ux*(nodeRadius+4),y:a.y+uy*(nodeRadius+4)},tip={x:b.x-ux*(nodeRadius+9),y:b.y-uy*(nodeRadius+9)},f=v=>v.toFixed(3);
    const description=order.order==='equal'?'Equal timescales: X1 and X2 are side by side':order.order==='X1-fast'?'X1 is faster, above X2':'X2 is faster, above X1';
    return `<g class="prx-timescale-order" data-ratio="${ratio}" data-order="${order.order}" role="img" aria-label="${description}; the coupling remains X1 to X2" font-family="Avenir,'Fira Sans',Arial,sans-serif">
      <text x="526" y="86" text-anchor="middle" font-size="14" fill="#737373">FAST</text>
      <path d="M526,97V151m-4,-5 4,5 4,-5" fill="none" stroke="#999" stroke-width="1.3"/>
      <text x="526" y="174" text-anchor="middle" font-size="14" fill="#737373">SLOW</text>
      <path class="prx-physical-edge" data-source="X1" data-target="X2" d="M${f(start.x)},${f(start.y)}L${f(tip.x)},${f(tip.y)}" fill="none" stroke="#4f4f4f" stroke-width="2.3"/>
      <circle class="prx-interaction-endpoint" cx="${f(tip.x)}" cy="${f(tip.y)}" r="3.5" fill="${ratio<=1?'#4f4f4f':'white'}" stroke="#4f4f4f" stroke-width="1.9"/>
      ${[a,b].map((n,i)=>`<g class="prx-dof" data-dof="${n.id}" transform="translate(${f(n.x)} ${f(n.y)})"><circle r="${nodeRadius}" fill="#ddd" stroke="#636363" stroke-width="1.65"/>${prxStateLabel(i)}</g>`).join('')}
    </g>`;
  }
  function prxCrossover(ratio,law,limits){
    const W=550,H=250,L=36,R=334,T=18,B=201,pad=.006,ymin=-pad,ymax=limits.slowMI+pad;
    const X=x=>L+(Math.log10(x)+3)/6*(R-L),Y=y=>B-(y-ymin)/(ymax-ymin)*(B-T);
    const xs=Array.from({length:121},(_,i)=>10**(-3+i/20)),ys=xs.map(x=>prxStationary(x).mi);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Stationary information as the timescale ratio changes, with the two layers ordered from fast above to slow below" font-family="Avenir,'Fira Sans',Arial,sans-serif">
      <rect width="${W}" height="${H}" fill="white"/>
      <path d="M${L},${T}H${R}V${B}H${L}Z" fill="none" stroke="#878787" stroke-width=".8"/>
      ${[0,limits.slowMI].map(y=>`<path d="M${L},${Y(y)}H${R}" stroke="#5184a4" stroke-width="1.5" stroke-dasharray="6 5"/><text x="${R+6}" y="${Y(y)+5}" fill="#4a4a4a" font-size="15">${y.toFixed(2)}</text>`).join('')}
      <path d="${pathLine(xs,ys,X,Y)}" fill="none" stroke="#0d1321" stroke-width="3.2" stroke-linecap="round"/>
      <circle class="prx-current-point" cx="${X(ratio)}" cy="${Y(law.mi)}" r="5" fill="#3e5c76" stroke="white" stroke-width="1.6"/>
      ${[[.001,'10⁻³'],[1,'1'],[1000,'10³']].map(([x,label])=>`<path d="M${X(x)},${B}v4" stroke="#878787" stroke-width=".8"/><text x="${X(x)}" y="${B+20}" text-anchor="middle" fill="#4a4a4a" font-size="15">${label}</text>`).join('')}
      <text x="${(L+R)/2}" y="245" text-anchor="middle" fill="#262626" font-family="'STIX Two Text','Times New Roman',serif" font-size="23" font-style="italic">τ₁ / τ₂</text>
      <text x="362" y="125" text-anchor="middle" fill="#262626" font-family="'STIX Two Text','Times New Roman',serif" font-size="23" font-style="italic" transform="rotate(90 362 125)">I₁₂</text>
      ${prxOrderingGlyph(ratio)}
    </svg>`;
  }
  function prxSimulate(ratio,seed=29,options={}){
    const random=(options.rng||seeded)(seed),duration=options.duration||24*Math.max(1,ratio),N=options.samples||1000,{p}=prxStationary(ratio),u=random();let state=0,acc=p[0];while(u>acc&&state<3)acc+=p[++state];
    let time=0,events=0;const occupancy=[0,0,0,0],t=[],x1=[],x2=[];
    function schedule(){const a=1/ratio,b=(state>>1)?1:1+10*(state&1);return{at:time-Math.log(Math.max(EPS,random()))/(a+b),next:random()<a/(a+b)?state^1:state^2};}
    let jump=schedule();
    for(let k=0;k<=N;k++){const target=duration*k/N;while(jump.at<=target){occupancy[state]+=jump.at-time;time=jump.at;state=jump.next;events++;jump=schedule();}occupancy[state]+=target-time;time=target;t.push(target);x1.push(state&1);x2.push(state>>1);}
    return{t,x1,x2,duration,events,occupancy:occupancy.map(x=>x/duration),sampleStep:duration/N};
  }
  // B=A-rI with r=1,w=2,k=1.1; eigenvalues -1 and -1.2.
  const neuralB=[[1,-2.2],[2,-3.2]],neuralSigma=[[37/12,215/132],[215/132,155/132]],inputValues=[0,2.5,5],inputWeights=[.5,.25,.25];
  function neuralP(dt){const e=exp(-dt),g=-Math.expm1(-.2*dt)/.2;return[[e*(1+2*g),e*(-2.2*g)],[e*(2*g),e*(1-2.2*g)]];}
  function mv(A,x){return[A[0][0]*x[0]+A[0][1]*x[1],A[1][0]*x[0]+A[1][1]*x[1]];}
  function mm(A,B){return A.map(r=>[r[0]*B[0][0]+r[1]*B[1][0],r[0]*B[0][1]+r[1]*B[1][1]]);}
  const tr=A=>[[A[0][0],A[1][0]],[A[0][1],A[1][1]]];
  function neuralNoise(dt){const P=neuralP(dt),PSP=mm(mm(P,neuralSigma),tr(P)),Q=neuralSigma.map((r,i)=>r.map((v,j)=>v-PSP[i][j])),l00=Math.sqrt(Math.max(0,Q[0][0])),l10=l00?Q[1][0]/l00:0,l11=Math.sqrt(Math.max(0,Q[1][1]-l10*l10));return{Q,L:[[l00,0],[l10,l11]],P};}
  const neuralMean=h=>[8*h/3,5*h/3];
  function neuralStepMean(x,h,dt){if(dt<=0)return x;const m=neuralMean(h),v=mv(neuralP(dt),[x[0]-m[0],x[1]-m[1]]);return[v[0]+m[0],v[1]+m[1]];}
  function neuralSimulate(ratio,seed=33,options={}){
    if(!(ratio>0))throw Error('Input timescale must be positive');
    const factory=options.rng||seeded,normal=options.normal||gaussian,inputRng=factory(seed^0x9e3779b9),burnRng=factory(seed^0xC2B2AE35),noiseRng=factory(seed^0x85ebca6b);
    const duration=options.duration||40*Math.max(1,ratio),N=options.samples||1400,burn=20;let t=-burn,label=inputRng()<.5?0:(inputRng()<.5?1:2),x=neuralMean(inputValues[label]),events=0;
    // Initial neural law is conditional Gaussian; 20 slow neural relaxation
    // times of burn-in remove its mismatch with the finite-switching joint law.
    const l00=Math.sqrt(neuralSigma[0][0]),l10=neuralSigma[1][0]/l00,l11=Math.sqrt(neuralSigma[1][1]-l10*l10),z0=normal(burnRng),z1=normal(burnRng);x=[x[0]+l00*z0,x[1]+l10*z0+l11*z1];
    const rate=2/(3*ratio);let jump=t-Math.log(Math.max(EPS,inputRng()))/rate;
    function advance(dt,L,random){const end=t+dt;while(jump<end){x=neuralStepMean(x,inputValues[label],jump-t);t=jump;label=label===0?(inputRng()<.5?1:2):0;events++;jump=t-Math.log(Math.max(EPS,inputRng()))/rate;}x=neuralStepMean(x,inputValues[label],end-t);t=end;const a=normal(random),b=normal(random);x=[x[0]+L[0][0]*a,x[1]+L[1][0]*a+L[1][1]*b];}
    const burnDt=.05,burnNoise=neuralNoise(burnDt).L;for(let i=0;i<400;i++)advance(burnDt,burnNoise,burnRng);t=0;
    const dt=duration/N,noise=neuralNoise(dt).L,ts=[],E=[],I=[],h=[],labels=[];for(let i=0;i<=N;i++){if(i)advance(dt,noise,noiseRng);ts.push(i*dt);E.push(x[0]);I.push(x[1]);h.push(inputValues[label]);labels.push(label);}
    return{t:ts,E,I,h,labels,duration,sampleStep:dt,events,ratio,qUp:1/(3*ratio),qDown:2/(3*ratio),inputWeights:[...inputWeights],inputEntropy:1.5,relaxationTimes:[1,1/1.2],inputModeTimes:[.75*ratio,1.5*ratio],burnIn:burn};
  }
  function fmt(x,d=3){return Number(x).toLocaleString('en-US',{maximumSignificantDigits:d});}
  function pathStep(xs,ys,X,Y){return xs.map((x,i)=>i?`H${X(x).toFixed(2)}V${Y(ys[i]).toFixed(2)}`:`M${X(x).toFixed(2)},${Y(ys[i]).toFixed(2)}`).join('');}
  function pathLine(xs,ys,X,Y){return xs.map((x,i)=>`${i?'L':'M'}${X(x).toFixed(2)},${Y(ys[i]).toFixed(2)}`).join('');}
  function binaryTraces(data,api){const W=1120,H=200,L=95,R=20,X=t=>L+t/data.duration*(W-L-R),colors=['#002e5e','#008fa8'],svg=[];svg.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Illustrative Gillespie trajectories of regulator X1 and regulated layer X2"><rect width="${W}" height="${H}" fill="white"/>`);
    for(let lane=0;lane<2;lane++){const y0=lane?137:66,Y=v=>y0-v*31;svg.push(`<text x="9" y="${y0-12}" fill="${colors[lane]}" font-size="18" font-weight="600">X${lane+1}</text>`);for(let v=0;v<2;v++)svg.push(`<text x="69" y="${Y(v)+6}" font-size="16" text-anchor="end" fill="${api.colors.ink}">${v?'B':'A'}</text><path d="M${L},${Y(v)}H${W-R}" stroke="#e6ebf0"/>`);svg.push(`<path d="${pathStep(data.t,lane?data.x2:data.x1,X,Y)}" fill="none" stroke="${colors[lane]}" stroke-width="1.6"/>`);}
    for(let i=0;i<=4;i++){const x=L+i*(W-L-R)/4;svg.push(`<text x="${x}" y="163" text-anchor="${i===0?'start':i===4?'end':'middle'}" fill="${api.colors.ink}" font-size="16">${fmt(i*data.duration/4)}</text>`);}svg.push(`<text x="${W/2}" y="192" text-anchor="middle" font-size="18" fill="${api.colors.ink}">time / τ₂</text></svg>`);return svg.join('');}
  // Figure4_InfoPropagation.ipynb: cmap_SR anchors used in the supplied SVG.
  // The color scale is fixed at p in [0, 1/2], since p(x1) = 1/2.
  function prxJointColor(value){
    const stops=['#ffffff','#f6fbe4','#ecf6c9','#e3f2ae','#d9ed92','#b5e48c','#99d98c','#76c893','#52b69a','#34a0a4','#168aad','#1a759f','#1e6091','#184e77'];
    const t=Math.max(0,Math.min(1,value/.5)),position=Math.min(255,Math.floor(t*256))/255*(stops.length-1),i=Math.min(stops.length-2,Math.floor(position)),f=position-i;
    const rgb=Array.from({length:3},(_,k)=>Math.round(parseInt(stops[i].slice(1+2*k,3+2*k),16)*(1-f)+parseInt(stops[i+1].slice(1+2*k,3+2*k),16)*f));
    const linear=rgb.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}),luma=.2126*linear[0]+.7152*linear[1]+.0722*linear[2];
    return{fill:'#'+rgb.map(v=>v.toString(16).padStart(2,'0')).join(''),text:luma<.18?'#ffffff':'#17191c'};
  }
  function heatmap(p,api){
    const W=550,H=250,L=181,T=63,cellW=111,cellH=68;
    const svg=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Joint probabilities p(x1,x2), with regulator states in rows and response states in columns" font-family="Avenir,'Fira Sans',Arial,sans-serif"><rect width="${W}" height="${H}" fill="white"/><text x="${L+cellW}" y="22" text-anchor="middle" font-size="18" fill="#262626">response x₂</text>`];
    for(let j=0;j<2;j++)svg.push(`<text x="${L+cellW*(j+.5)}" y="51" text-anchor="middle" font-family="'STIX Two Text','Times New Roman',serif" font-style="italic" font-size="21">${j?'B₂':'A₂'}</text>`);
    for(let i=0;i<2;i++){
      svg.push(`<text x="${L-18}" y="${T+cellH*(i+.5)+7}" text-anchor="end" font-family="'STIX Two Text','Times New Roman',serif" font-style="italic" font-size="21">${i?'B₁':'A₁'}</text>`);
      for(let j=0;j<2;j++){const value=p[i+2*j],color=prxJointColor(value);svg.push(`<rect x="${L+j*cellW}" y="${T+i*cellH}" width="${cellW}" height="${cellH}" fill="${color.fill}" stroke="white" stroke-width="2"/><text x="${L+cellW*(j+.5)}" y="${T+cellH*(i+.5)+8}" text-anchor="middle" font-size="23" fill="${color.text}">${value.toFixed(4)}</text>`);}
    }
    svg.push(`<text x="85" y="${T+cellH}" transform="rotate(-90 85 ${T+cellH})" text-anchor="middle" font-size="18" fill="#262626">regulator x₁</text><text x="${L+cellW}" y="233" text-anchor="middle" font-family="'STIX Two Text','Times New Roman',serif" font-size="22" font-style="italic" fill="#262626">p(x₁, x₂)</text></svg>`);return svg.join('');
  }
  // BEGIN NEURAL_INFORMATION_TABLE
  const neuralInformationTable = {"points":[[-2.0,0.0003259],[-1.8,0.0007315],[-1.6,0.001831],[-1.4,0.0039236],[-1.2,0.0093608],[-1.0,0.019711],[-0.8,0.0394634],[-0.6,0.0736122],[-0.4,0.1264645],[-0.2,0.2026306],[0.0,0.3051087],[0.2,0.4307302],[0.4,0.5736889],[0.6,0.723927],[0.8,0.8622273],[1.0,0.9884035],[1.2,1.0953035],[1.4,1.1752972],[1.6,1.235927],[1.8,1.2858252],[2.0,1.3182107]],"slowLimit":1.3912567716315118};
  // END NEURAL_INFORMATION_TABLE
  function neuralInformation(logRatio){
    const points=neuralInformationTable.points,log=Math.max(points[0][0],Math.min(points.at(-1)[0],logRatio));
    const hi=Math.max(1,points.findIndex(p=>p[0]>=log)),a=points[hi-1],b=points[hi];
    return a[1]+(b[1]-a[1])*(log-a[0])/(b[0]-a[0]);
  }
  function neuralInformationPlot(logRatio){
    const W=380,H=330,L=62,R=18,T=43,B=57,X=v=>L+(v+2)/4*(W-L-R),Y=v=>T+(1.6-v)/1.6*(H-T-B),value=neuralInformation(logRatio);
    const text=(x,y,t,extra='')=>`<text x="${x}" y="${y}" ${extra}>${t}</text>`;
    const parts=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" class="neural-information-plot" aria-label="Numerical stationary mutual information in the same linear neural model; marker follows the input persistence slider"><style>.neural-information-plot text{font-family:'Fira Sans',Arial,sans-serif;font-size:17px;fill:#455566}</style><rect width="${W}" height="${H}" fill="white"/>`];
    for(const v of [0,.5,1,1.5])parts.push(`<path d="M${L},${Y(v)}H${W-R}" stroke="#e1e7ed" fill="none"/>`,text(L-10,Y(v)+5,String(v),'text-anchor="end"'));
    for(const v of [-2,-1,0,1,2])parts.push(text(X(v),H-B+24,`10<tspan font-size="12" dy="-6">${v}</tspan>`, 'text-anchor="middle"'));
    parts.push(`<path d="M${L},${T}V${H-B}H${W-R}" stroke="#8fa1b4" fill="none"/>`, `<path d="M${L},${Y(1.5)}H${W-R}" stroke="#a2a9af" stroke-dasharray="5 4"/>`,text(W-R,Y(1.5)-10,'ℋ(H)','text-anchor="end" style="font-family:serif;font-style:italic"'));
    const slowLimit=neuralInformationTable.slowLimit;
    parts.push(`<path class="neural-slow-limit" d="M${L},${Y(slowLimit)}H${W-R}" stroke="#717980" stroke-dasharray="2 4"/>`,text(L+5,Y(slowLimit)+19,'Slow-input limit: '+slowLimit.toFixed(2),'style="font-size:15px"'));
    const d=neuralInformationTable.points.map((p,i)=>`${i?'L':'M'}${X(p[0]).toFixed(2)},${Y(p[1]).toFixed(2)}`).join('');
    parts.push(`<path d="${d}" stroke="#515960" stroke-width="2.5" fill="none"/><path d="M${X(logRatio)},${H-B}V${Y(value)}" stroke="#a2a9af" stroke-dasharray="3 4"/><circle class="neural-information-marker" data-bits="${value}" data-log-ratio="${logRatio}" cx="${X(logRatio)}" cy="${Y(value)}" r="5" fill="#17191c" stroke="white" stroke-width="1.5"/>`);
    parts.push(text((L+W-R)/2,H-6,'τ<tspan font-size="13" dy="5">H</tspan><tspan dy="-5"> / τ</tspan>','text-anchor="middle" style="font-family:serif;font-style:italic;font-size:20px"'),text(0,0,'I(<tspan font-weight="600" font-style="italic">U</tspan>; H) [bits]',`transform="translate(20 ${(T+H-B)/2}) rotate(-90)" text-anchor="middle" style="font-family:serif;font-size:19px"`));
    return parts.join('')+'</svg>';
  }
  function neuralTraces(data,api){const W=380,H=330,L=62,R=14,X=t=>L+t/data.duration*(W-L-R),all=[...data.E,...data.I],lo=Math.floor(Math.min(...all)-.5),hi=Math.ceil(Math.max(...all)+.5),Yh=v=>89-v*12,Yx=v=>257-(v-lo)/(hi-lo)*124,svg=[`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Input and excitatory inhibitory activity on a common time axis"><rect width="${W}" height="${H}" fill="white"/>`];
    for(const v of [0,2.5,5])svg.push(`<text x="52" y="${Yh(v)+5}" text-anchor="end" font-size="15">${v}</text><path d="M${L},${Yh(v)}H${W-R}" stroke="#e7ecf1"/>`);svg.push(`<text x="18" y="61" text-anchor="middle" font-size="17">H</text><path d="${pathStep(data.t,data.h,X,Yh)}" stroke="${api.colors.ink}" fill="none" stroke-width="1.3"/>`);
    for(let i=0;i<=3;i++){const v=lo+(hi-lo)*i/3;svg.push(`<text x="52" y="${Yx(v)+5}" text-anchor="end" font-size="15">${fmt(v,2)}</text><path d="M${L},${Yx(v)}H${W-R}" stroke="#e7ecf1"/>`);}svg.push(`<text x="18" y="199" text-anchor="middle" font-size="17">U</text><path d="${pathLine(data.t,data.E,X,Yx)}" stroke="${api.colors.green}" fill="none" stroke-width="1.2"/><path d="${pathLine(data.t,data.I,X,Yx)}" stroke="${api.colors.blue}" fill="none" stroke-width="1.2"/><text x="68" y="119" style="font-size:16px;fill:${api.colors.green}">E: excitatory</text><text x="230" y="119" style="font-size:16px;fill:${api.colors.blue}">I: inhibitory</text>`);
    for(let i=0;i<=4;i++)svg.push(`<text x="${L+i*(W-L-R)/4}" y="280" text-anchor="${i===0?'start':i===4?'end':'middle'}" font-size="15">${fmt(i*data.duration/4)}</text>`);svg.push(`<text x="${W/2}" y="315" text-anchor="middle" font-size="18">time / τ</text></svg>`);return svg.join('');}
  const sourcePRX='Nicoletti & Busiello, Phys. Rev. X 14, 021007 (2024), Eq. 1, Appendix A and Fig. 1. DOI: 10.1103/PhysRevX.14.021007.';
  const sourceNeural='Barzon, Busiello & Nicoletti, Phys. Rev. Lett. 134, 068403 (2025), Eq. 1 and Fig. 1. DOI: 10.1103/PhysRevLett.134.068403.';
  const models=window.SIFSLabModels ||= {};models.prx={generator:prxGenerator,stationary:prxStationary,limits:prxLimits,simulate:prxSimulate,ordering:prxOrdering};models.neural={information:neuralInformation,informationTable:neuralInformationTable,B:neuralB,Sigma:neuralSigma,P:neuralP,noise:neuralNoise,mean:neuralMean,simulate:neuralSimulate};
  window.SIFSLabs.register({id:'prx',seedVisible:state=>state.showTrace,title:'One coupling, two timescale orderings',question:'Keep X₁ → X₂ fixed. Will instantaneous dependence survive when the regulator becomes faster?',stochastic:true,
    assumptions:'Two binary layers; τ₂ = 1; all baseline rate weights γ = 1; c = 10. Only τ₁/τ₂ changes. Mutual information is symmetric; the transition generator supplies the direction.',source:sourcePRX,defaults:{logRatio:0,seed:29,showTrace:false},controls:[{key:'logRatio',label:'Timescale ratio τ₁ / τ₂',type:'range',min:-3,max:3,step:.05,format:v=>fmt(10**v)},{key:'showTrace',label:'Also show a simulated trajectory',type:'checkbox'}],presets:[{label:'Fast regulator',state:{logRatio:-2}},{label:'Comparable scales',state:{logRatio:0}},{label:'Slow regulator',state:{logRatio:2}}],
    render(state,api){const ratio=10**state.logRatio,law=prxStationary(ratio),limits=prxLimits(),trace=state.showTrace?prxSimulate(ratio,state.seed,{rng:api.rng}):null;
      return{plots:[{title:'Stationary information',svg:prxCrossover(ratio,law,limits)},{title:'Joint probabilities',svg:heatmap(law.p,api)},...(state.showTrace?[{title:'A newly simulated Gillespie path',wide:true,svg:binaryTraces(trace,api),caption:`Exact jump simulation, sampled every ${fmt(trace.sampleStep)} τ₂ for display. Rapid jumps within a sample interval are not all drawn; this short path does not estimate the plotted information.`}]:[])],metrics:[{label:'τ₁ / τ₂',value:fmt(ratio)},{label:'Exact I(X₁; X₂)',value:law.mi.toFixed(4)+' bits'},{label:'P(B₁)',value:law.p1[1].toFixed(3)},{label:'P(B₂)',value:law.p2[1].toFixed(3)}],explanation:ratio<.1?'The rapidly changing regulator is averaged by layer 2. The leading joint law factorizes; finite separation leaves a small residual dependence.':ratio>10?'The regulator persists while layer 2 relaxes. Distinct conditional probabilities P(B₂|A₁)=1/2 and P(B₂|B₁)=11/12 preserve instantaneous dependence.':'At finite separation neither limiting factorization is exact. The black curve and heatmap solve the four-state stationary generator directly.',formula:'<span>Qp = 0, &nbsp; Σp = 1; &nbsp; I = Σ p(x₁,x₂) log₂[p(x₁,x₂)/(p₁p₂)].</span>'};}
  });
  window.SIFSLabs.register({id:'neural',title:'Can a neural population resolve the current input?',question:'When input persistence increases, do activity samples with different input labels become distinguishable?',stochastic:true,
    assumptions:'Published linear Fig. 1 model: f(x)=x, r=1, D=1/2, w=2, k=1.1, τ=1; H∈{0,2.5,5}. Both switching rates scale together, preserving π=(1/2,1/4,1/4). All trajectories and clouds are newly generated illustrations.',source:sourceNeural,defaults:{logRatio:0,seed:33},controls:[{key:'logRatio',label:'Input persistence τ_H / τ',type:'range',min:-2,max:2,step:.05,format:v=>fmt(10**v)}],presets:[{label:'Fast input',state:{logRatio:-2}},{label:'Comparable scales',state:{logRatio:0}},{label:'Slow input',state:{logRatio:1.5}}],
    render(state,api){const ratio=10**state.logRatio,data=neuralSimulate(ratio,state.seed,{rng:api.rng,normal:api.normal}),series=inputValues.map((h,label)=>({x:data.E.filter((_,i)=>data.labels[i]===label),y:data.I.filter((_,i)=>data.labels[i]===label),mode:'points',color:api.colors.states[label],label:'H = '+h,opacity:.5,width:2})),x0=Math.floor(Math.min(...data.E)-1),x1=Math.ceil(Math.max(...data.E)+1),y0=Math.floor(Math.min(...data.I)-1),y1=Math.ceil(Math.max(...data.I)+1);
      return{plots:[{title:'Input and response',svg:neuralTraces(data,api),caption:`Illustrative trajectory after 20 neural time units of burn-in. Window = ${fmt(data.duration)} τ; sampling Δt = ${fmt(data.sampleStep)} τ. The window expands for slow inputs.`},{title:'Neural activity',svg:api.plot({width:380,height:330,xLabel:'activity U_E',yLabel:'activity U_I',xDomain:[x0,x1],yDomain:[y0,y1],series}),caption:'Each point is one simulated sample, colored by its simultaneous input label. Overlap is qualitative; information is computed separately from the stationary law.'},{title:'Stationary information',svg:neuralInformationPlot(state.logRatio),caption:'Numerical stationary information for the same model and parameters; precomputed independently of the illustrative trajectory.'}],metrics:[{label:'τ_H / slowest neural relaxation',value:fmt(ratio)},{label:'Neural relaxation times',value:'1 and 0.833 τ'},{label:'Stationary input weights',value:'1/2, 1/4, 1/4'},{label:'Input entropy ceiling',value:'1.5 bits'},{label:'I(U; H)',value:'≈ '+neuralInformation(state.logRatio).toFixed(2)+' bits'}],explanation:ratio<.1?'The current input changes before neural activity can relax. Input-colored clouds strongly overlap around the response to the mean drive h̄=1.875.':ratio>10?'Each input persists long enough for activity to approach its conditional neural law. The resulting input-colored clouds become distinguishable, with finite noise and occasional switching transients.':'Neural activity retains a history of recent inputs. At comparable scales, a single current input label does not fully explain the activity.',formula:'<span>q↑ = 1/(3τ_H), q↓ = 2/(3τ_H). &nbsp; Neural decay rates: 1/τ, 1.2/τ. Input correlation-mode times: 0.75τ_H and 1.5τ_H.</span>'};}
  });
})();
