/* =========================================================
   Motion avançado: tipografia cinética, formas que se transformam,
   partículas, padrões, HUD, aberração cromática, glitch e tremor
   ========================================================= */
function hr(i,s){var x=Math.sin(i*127.1+(s||0)*311.7)*43758.5453;return x-Math.floor(x)}
function idSeed(id){var h=7;id=String(id||'');for(var i=0;i<id.length;i++)h=(h*31+id.charCodeAt(i))%100003;return h}
var GT=0; /* tempo global do quadro em desenho */

/* ---------- texto: cor de destaque por *trecho*, contorno e animações por letra ---------- */
var CHAR_ANIMS={chars:1,charsUp:1,slam:1,scramble:1,flicker:1,spread:1};
var SCR='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>+=';
DK.text=function(e,b,p,lt,a){
  var L=tlayout(e),ga=ctx.globalAlpha;ctx.save();setSpacing(+e.spacing||0);ctx.font=fnt(e.weight||500,L.size,e.font);
  var fc=e.color===''?null:(resolve(e.color)||'#000'),hc=resolve(e.hl||'@accent'),sc=e.stroke?resolve(e.stroke):null,sw=+e.strokeW||Math.max(1,L.size*.04);
  ctx.textBaseline='alphabetic';ctx.textAlign='left';ctx.lineJoin='round';
  var hasHL=L.hl&&L.hl.some(Boolean),perChar=CHAR_ANIMS[a.in]||hasHL||sc,seed=idSeed(e.id);
  function paint(str,x,y,col){if(sc){ctx.strokeStyle=sc;ctx.lineWidth=sw;ctx.strokeText(str,x,y)}if(col){ctx.fillStyle=col;ctx.fillText(str,x,y)}}
  if(!perChar){
    ctx.fillStyle=fc||'#000';
    var k=0,consumed=0,totalChars=0;
    if(a.in==='type')L.lines.forEach(function(l){l.forEach(function(o){totalChars+=o.wd.length+1})});
    var nShow=a.in==='type'?Math.floor(totalChars*prog(lt,0,Math.max(.2,a.t||1.2),E.linear)):0;
    L.lines.forEach(function(l,li){l.forEach(function(o){
      var al=1,dy=0,str=o.wd;
      if(a.in==='words'){var pw=prog(lt,k*.07,Math.max(.2,a.t||.6),easeFn(a.ease));k++;if(pw<=0)return;al=clamp(pw,0,1);dy=(1-pw)*36}
      else if(a.in==='type'){var keep=Math.max(0,Math.min(str.length,nShow-consumed));consumed+=str.length+1;if(keep<=0)return;str=str.slice(0,keep)}
      ctx.globalAlpha=ga*al;if(fc)ctx.fillText(str,b.x+o.x,b.y+li*L.lh+L.size*.92+dy);
    })});
    ctx.restore();return;
  }
  var k=0,T=Math.max(.15,+a.t||.5),ez=easeFn(a.ease);
  L.lines.forEach(function(l,li){
    var lineTop=b.y+li*L.lh,base=lineTop+L.size*.92,last=l[l.length-1],lx0=l.length?b.x+l[0].x:b.x,lx1=last?b.x+last.x+last.ww:b.x,lmid=(lx0+lx1)/2;
    l.forEach(function(o){
      for(var ci=0;ci<o.wd.length;ci++){
        var ch=o.wd[ci],pre=ctx.measureText(o.wd.slice(0,ci)).width,cw=ctx.measureText(ch).width,x=b.x+o.x+pre,y=base,col=(L.hl[o.i+ci]?hc:fc),al=1;
        ctx.save();
        switch(a.in){
          case 'chars':{var pc=prog(lt,k*.03,T,ez);if(pc<=0){ctx.restore();k++;continue}al=clamp(pc,0,1);y+=(1-pc)*L.size*.5;break}
          case 'charsUp':{var pu=prog(lt,k*.035,T,ez);ctx.beginPath();ctx.rect(x-cw,lineTop-L.size*.1,cw*3,L.lh*1.02);ctx.clip();y+=(1-clamp(pu,0,1))*L.size*1.15;break}
          case 'slam':{var ps=prog(lt,k*.045,T,E.out);if(ps<=0){ctx.restore();k++;continue}var s=1+(1-ps)*1.8;al=clamp(ps*2.5,0,1);ctx.translate(x+cw/2,y-L.size*.35);ctx.scale(s,s);ctx.translate(-(x+cw/2),-(y-L.size*.35));break}
          case 'scramble':{var st=k*.025;if(lt<st){ctx.restore();k++;continue}if(lt<st+T*.8&&ch.trim()){ch=SCR[Math.floor(hr(Math.floor(lt*24)+k*13,seed)*SCR.length)];al=.75}break}
          case 'flicker':{var fs=hr(k,seed)*T*1.4;if(lt<fs||(lt<fs+.25&&hr(Math.floor(lt*30),k+seed)<.5)){ctx.restore();k++;continue}break}
          case 'spread':{var pp=ez(clamp(lt/T,0,1));x+=(x+cw/2-lmid)*(1-pp)*1.3;al=clamp(pp*1.5,0,1);break}
        }
        ctx.globalAlpha=ga*al;paint(ch,x,y,col);ctx.restore();k++;
      }
      k++;
    });
  });
  ctx.restore();
};

/* ---------- formas: polígono, estrela, morph, mostrador, arco, anel ---------- */
var FORMV={};
function formVerts(f){
  if(FORMV[f])return FORMV[f];var v=[],i,n,m;
  function poly(n,rot){var r=[];for(var i=0;i<n;i++){var a=rot+i*2*Math.PI/n;r.push([Math.cos(a),Math.sin(a)])}return r}
  function star(n,inner,rot){var r=[];for(var i=0;i<n*2;i++){var a=rot+i*Math.PI/n,rr=i%2?inner:1;r.push([Math.cos(a)*rr,Math.sin(a)*rr])}return r}
  if(f==='square')v=poly(4,Math.PI/4).map(function(p){return [p[0]*1.25,p[1]*1.25]});
  else if(f==='triangle')v=poly(3,-Math.PI/2).map(function(p){return [p[0]*1.15,p[1]*1.15+.12]});
  else if(f==='diamond')v=poly(4,-Math.PI/2);
  else if(f==='pentagon')v=poly(5,-Math.PI/2);
  else if(f==='hexagon')v=poly(6,0);
  else if(f==='octagon')v=poly(8,Math.PI/8);
  else if(f==='star')v=star(5,.47,-Math.PI/2);
  else if(f==='star6')v=star(6,.58,-Math.PI/2);
  else if(f==='burst')v=star(12,.72,-Math.PI/2);
  else if(f==='cross'){var c=.36;v=[[c,-1],[c,-c],[1,-c],[1,c],[c,c],[c,1],[-c,1],[-c,c],[-1,c],[-1,-c],[-c,-c],[-c,-1]]}
  else if((m=/^poly(\d+)$/.exec(f)))v=poly(clamp(+m[1],3,24),-Math.PI/2);
  else if((m=/^star(\d+)$/.exec(f)))v=star(clamp(+m[1],3,24),.5,-Math.PI/2);
  else v=null;
  FORMV[f]=v;return v;
}
function rayR(v,th){if(!v)return 1;var dx=Math.cos(th),dy=Math.sin(th),best=1e9;
  for(var i=0;i<v.length;i++){var a=v[i],b=v[(i+1)%v.length],ex=b[0]-a[0],ey=b[1]-a[1],den=dx*ey-dy*ex;if(Math.abs(den)<1e-9)continue;var t=(a[0]*ey-a[1]*ex)/den,u=(a[0]*dy-a[1]*dx)/den;if(t>0&&u>=-1e-6&&u<=1+1e-6&&t<best)best=t}
  return best<1e9?best:1}
function formR(f,th){if(f==='circle'||!f)return 1;if(f==='blob')return 1+.1*Math.sin(3*th)+.06*Math.sin(5*th+1);return rayR(formVerts(f),th)}
function shapePts(e,b,lt,form,morph){
  var N=144,cx=b.x+b.w/2,cy=b.y+b.h/2,rx=b.w/2,ry=b.h/2,pts=[],wob=+e.wobble||0,list=null,f0,f1,fr=0;
  if(morph!=null){list=(Array.isArray(e.forms)?e.forms:String(e.forms||'square,triangle,hexagon,star,circle').split(',')).map(function(s){return String(s).trim()}).filter(Boolean);
    var m=clamp(+morph||0,0,list.length-1),i0=Math.floor(m);f0=list[i0];f1=list[Math.min(list.length-1,i0+1)];fr=E.inout(m-i0)}
  for(var i=0;i<N;i++){var th=i/N*Math.PI*2-Math.PI/2,r=list?lerp(formR(f0,th),formR(f1,th),fr):formR(form,th);
    if(wob)r*=1+wob*(.05*Math.sin(3*th+lt*4.2)+.035*Math.sin(5*th-lt*3.1)+.02*Math.sin(8*th+lt*6));
    pts.push([cx+Math.cos(th)*r*rx*.8,cy+Math.sin(th)*r*ry*.8])}
  return pts;
}
var BASE_SHAPE=DK.shape;
DK.shape=function(e,b,p,lt){
  var kind=e.shape;if(['poly','star','morph','dial','arc','ring','form'].indexOf(kind)<0)return BASE_SHAPE(e,b,p,lt);
  var f=resolve(e.fill),s=resolve(e.stroke),cx=b.x+b.w/2,cy=b.y+b.h/2,R=Math.min(b.w,b.h)/2;
  ctx.save();if(p<1){ctx.translate(cx,cy);ctx.scale(Math.max(p,.001),Math.max(p,.001));ctx.translate(-cx,-cy)}
  if(kind==='dial'){
    ctx.beginPath();ctx.arc(cx,cy,R,0,Math.PI*2);if(f){ctx.fillStyle=f;ctx.fill()}
    var n=Math.max(4,+e.ticks||60),tc=s||resolve('@ink');ctx.strokeStyle=tc;ctx.lineCap='round';
    for(var i=0;i<n;i++){var a=i/n*Math.PI*2-Math.PI/2,big=i%5===0,l=R*(big?.09:.05);ctx.lineWidth=Math.max(1,R*(big?.012:.007));ctx.beginPath();ctx.moveTo(cx+Math.cos(a)*(R*.9),cy+Math.sin(a)*(R*.9));ctx.lineTo(cx+Math.cos(a)*(R*.9-l),cy+Math.sin(a)*(R*.9-l));ctx.stroke()}
  }else if(kind==='arc'||kind==='ring'){
    var pr=kind==='arc'?clamp(e.prog==null?1:+e.prog,0,1):1,lw=+e.strokeW||Math.max(2,R*.05),a0=-Math.PI/2+(+e.spin||0)*lt*Math.PI*2;
    ctx.lineWidth=lw;ctx.strokeStyle=s||f||resolve('@accent');ctx.lineCap=kind==='arc'?'round':'butt';if(+e.dash>0)ctx.setLineDash([+e.dash,+e.dash*(+e.gap||1)]);
    ctx.beginPath();ctx.arc(cx,cy,Math.max(1,R-lw/2),a0,a0+Math.PI*2*pr);ctx.stroke();
  }else{
    var form=kind==='poly'?'poly'+(+e.sides||6):kind==='star'?'star'+(+e.points||5):(e.form||'square');
    if(kind==='star'){var key='star'+(+e.points||5)+'_'+(+e.inner||.5);if(!FORMV[key]){var n2=+e.points||5,inn=clamp(+e.inner||.5,.1,.95),v=[];for(var j=0;j<n2*2;j++){var aa=-Math.PI/2+j*Math.PI/n2,rr2=j%2?inn:1;v.push([Math.cos(aa)*rr2,Math.sin(aa)*rr2])}FORMV[key]=v}form=key}
    var pts=shapePts(e,b,lt,form,kind==='morph'?(e.morph==null?0:e.morph):null);
    ctx.beginPath();pts.forEach(function(q,i){if(i)ctx.lineTo(q[0],q[1]);else ctx.moveTo(q[0],q[1])});ctx.closePath();
    var rnd=+e.round||0;if(rnd>0&&f){ctx.lineJoin='round';ctx.lineWidth=rnd*2;ctx.strokeStyle=f;ctx.stroke()}
    if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.lineJoin='round';ctx.strokeStyle=s;ctx.lineWidth=+e.strokeW||2;ctx.stroke()}
  }
  ctx.restore();
};

/* ---------- partículas (determinísticas: dependem só do tempo) ---------- */
function pColors(e){var c=Array.isArray(e.colors)&&e.colors.length?e.colors:['@accent','@ink'];return c.map(function(x){return resolve(x)||x})}
function pShapes(e){var s=Array.isArray(e.shapes)&&e.shapes.length?e.shapes:['circle','square','tri','ring','cross'];return s}
function drawPShape(k,x,y,s,rot,col){
  ctx.save();ctx.translate(x,y);if(rot)ctx.rotate(rot);ctx.fillStyle=col;ctx.strokeStyle=col;
  if(k==='circle'||k==='dot'){ctx.beginPath();ctx.arc(0,0,s/2,0,Math.PI*2);ctx.fill()}
  else if(k==='ring'){ctx.lineWidth=Math.max(1,s*.22);ctx.beginPath();ctx.arc(0,0,s/2-s*.11,0,Math.PI*2);ctx.stroke()}
  else if(k==='square'){ctx.fillRect(-s/2,-s/2,s,s)}
  else if(k==='tri'){ctx.beginPath();ctx.moveTo(0,-s*.58);ctx.lineTo(s*.5,s*.3);ctx.lineTo(-s*.5,s*.3);ctx.closePath();ctx.fill()}
  else if(k==='cross'){ctx.lineWidth=Math.max(1,s*.24);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s/2,-s/2);ctx.lineTo(s/2,s/2);ctx.moveTo(s/2,-s/2);ctx.lineTo(-s/2,s/2);ctx.stroke()}
  else if(k==='plus'){ctx.lineWidth=Math.max(1,s*.24);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,-s/2);ctx.lineTo(0,s/2);ctx.moveTo(-s/2,0);ctx.lineTo(s/2,0);ctx.stroke()}
  else if(k==='line'){ctx.lineWidth=Math.max(1,s*.2);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(-s/2,0);ctx.lineTo(s/2,0);ctx.stroke()}
  ctx.restore();
}
DK.particles=function(e,b,gp,lt){
  var n=clamp(+e.count||60,1,800),seed=+e.seed||1,cols=pColors(e),shp=pShapes(e),sz=+e.size||14,mode=e.mode||'burst',cx=b.x+b.w/2,cy=b.y+b.h/2,ga=ctx.globalAlpha,M=Math.min(b.w,b.h);
  if(mode==='sphere'){
    var R=M/2,ang=lt*(+e.spin||.4),tilt=(+e.tilt||18)*Math.PI/180,ca=Math.cos(ang),sa=Math.sin(ang),ct=Math.cos(tilt),st=Math.sin(tilt),list=[];
    var show=Math.floor(n*clamp(gp,0,1));
    for(var i=0;i<show;i++){var y=1-(i+.5)/n*2,r=Math.sqrt(1-y*y),phi=i*2.399963,x=Math.cos(phi)*r,z=Math.sin(phi)*r;
      var x1=x*ca+z*sa,z1=-x*sa+z*ca,y2=y*ct-z1*st,z2=y*st+z1*ct;list.push([x1,y2,z2])}
    list.sort(function(a,b){return a[2]-b[2]});
    list.forEach(function(q){var d=(q[2]+1)/2;ctx.globalAlpha=ga*(.18+.82*d);ctx.fillStyle=cols[0];ctx.beginPath();ctx.arc(cx+q[0]*R,cy+q[1]*R,Math.max(.6,sz*.18*(.55+.45*d)),0,Math.PI*2);ctx.fill()});
    ctx.globalAlpha=ga;return;
  }
  var life=+e.life||2.4,spd=(+e.speed||1)*M*.9,grav=(+e.gravity||0)*220,drag=Math.max(.01,+e.drag||2.2),spread=(e.spread==null?360:+e.spread)*Math.PI/180,dir=((+e.dir||0)-90)*Math.PI/180,dly=+e.delay||0;
  for(var i=0;i<n;i++){
    var r1=hr(i,seed),r2=hr(i,seed+1),r3=hr(i,seed+2),r4=hr(i,seed+3),r5=hr(i,seed+4),r6=hr(i,seed+5),col=cols[Math.floor(r5*cols.length)%cols.length],kind=shp[Math.floor(r6*shp.length)%shp.length];
    if(mode==='float'){
      var vy=(e.speed==null?.25:+e.speed)*40*(.4+r4),px=b.x+r1*b.w+Math.sin(lt*.7+r2*6.28)*22,py=b.y+(((r3*b.h-lt*vy)%b.h)+b.h)%b.h,tw=.45+.55*Math.abs(Math.sin(lt*1.3+r2*9));
      ctx.globalAlpha=ga*tw*clamp(gp*1.5-r1*.5,0,1);drawPShape(kind,px,py,sz*(.4+r4*.8),(r5-.5)*lt*(+e.spin||1)*3,col);continue;
    }
    var tau=lt-r3*dly;if(tau<0)continue;var li=life*(.55+.45*r4);if(tau>li)continue;
    var a=dir+(r1-.5)*spread,v=spd*(.18+.82*Math.pow(r2,.7));
    function pos(T){var d=v*(1-Math.exp(-drag*T))/drag,x=cx+Math.cos(a)*d,y=cy+Math.sin(a)*d+grav*T*T*.5;if(mode==='confetti')x+=Math.sin(T*5+r6*12)*14*Math.min(1,T*2);return [x,y]}
    var q=pos(tau),al=1-clamp((tau-li*.7)/(li*.3),0,1),s=sz*(.45+r5*.9)*Math.min(1,tau*9+.15),rot=(r6-.5)*2*(+e.spin||2)*tau*Math.PI;
    if(e.streak){var q0=pos(Math.max(0,tau-.05)),dd=Math.hypot(q[0]-q0[0],q[1]-q0[1]);if(dd>s*.6){ctx.globalAlpha=ga*al*.5;ctx.strokeStyle=col;ctx.lineWidth=Math.max(1,s*.45);ctx.lineCap='round';ctx.beginPath();ctx.moveTo(q0[0],q0[1]);ctx.lineTo(q[0],q[1]);ctx.stroke()}}
    ctx.globalAlpha=ga*al;drawPShape(kind,q[0],q[1],s,rot,col);
  }
  ctx.globalAlpha=ga;
};

/* ---------- padrões gerativos: memphis, pontos, grade ---------- */
DK.pattern=function(e,b,gp,lt){
  var mode=e.mode||'memphis',seed=+e.seed||3,cols=pColors(e),pr=clamp((e.prog==null?1:+e.prog)*gp,0,1.2),ga=ctx.globalAlpha;
  ctx.save();ctx.beginPath();ctx.rect(b.x,b.y,b.w,b.h);ctx.clip();
  if(e.bg2){ctx.fillStyle=resolve(e.bg2);ctx.fillRect(b.x,b.y,b.w,b.h)}
  var ox=b.x+b.w*(e.ox==null?.5:+e.ox),oy=b.y+b.h*(e.oy==null?.5:+e.oy),maxD=Math.hypot(Math.max(ox-b.x,b.x+b.w-ox),Math.max(oy-b.y,b.y+b.h-oy));
  if(mode==='dots'||mode==='grid'){
    var gap=Math.max(6,+e.gap||32),dot=+e.dot||1.6,col=cols[0];ctx.fillStyle=col;ctx.strokeStyle=col;ctx.lineWidth=Math.max(.5,dot*.5);
    for(var y=b.y+gap/2;y<b.y+b.h;y+=gap)for(var x=b.x+gap/2;x<b.x+b.w;x+=gap){
      var d=Math.hypot(x-ox,y-oy)/maxD;if(d>pr)continue;var k=clamp((pr-d)*6,0,1),tw=e.twinkle?(.4+.6*Math.abs(Math.sin(lt*2+x*.13+y*.07))):1;
      ctx.globalAlpha=ga*k*tw;if(mode==='dots'){ctx.beginPath();ctx.arc(x,y,dot*k,0,Math.PI*2);ctx.fill()}else{ctx.beginPath();ctx.moveTo(x-gap/2,y-gap/2);ctx.lineTo(x+gap/2,y-gap/2);ctx.moveTo(x-gap/2,y-gap/2);ctx.lineTo(x-gap/2,y+gap/2);ctx.stroke()}
    }
    ctx.restore();ctx.globalAlpha=ga;return;
  }
  var nc=Math.max(2,+e.cols||14),cell=b.w/nc,nr=Math.ceil(b.h/cell)+1,types=['quarter','half','dot','ring','tri','square','quarter','half','blank'],swap=+e.swap||0;
  for(var r=0;r<nr;r++)for(var c=0;c<nc;c++){
    var x0=b.x+c*cell,y0=b.y+r*cell,id=c*131+r*71,t1=types[Math.floor(hr(id,seed)*types.length)];if(t1==='blank')continue;
    var col=cols[Math.floor(hr(id,seed+1)*cols.length)%cols.length],rot=Math.floor(hr(id,seed+2)*4);
    var d=Math.hypot(x0+cell/2-ox,y0+cell/2-oy)/maxD,k=clamp((pr-d)*5,0,1);if(k<=0)continue;
    var turn=0;if(swap>0){var ph=lt/swap+hr(id,seed+3)*3,fl=Math.floor(ph),fr=ph-fl;turn=fl+E.inout(clamp(fr*4,0,1))}
    ctx.save();ctx.translate(x0+cell/2,y0+cell/2);ctx.rotate((rot+turn)*Math.PI/2);ctx.scale(E.back(k)*.98,E.back(k)*.98);ctx.fillStyle=col;ctx.strokeStyle=col;var h=cell/2;
    ctx.beginPath();
    if(t1==='quarter'){ctx.moveTo(-h,-h);ctx.arc(-h,-h,cell,0,Math.PI/2);ctx.closePath();ctx.fill()}
    else if(t1==='half'){ctx.arc(0,h,h,Math.PI,0);ctx.closePath();ctx.fill()}
    else if(t1==='dot'){ctx.arc(0,0,h*.62,0,Math.PI*2);ctx.fill()}
    else if(t1==='ring'){ctx.lineWidth=cell*.14;ctx.arc(0,0,h*.55,0,Math.PI*2);ctx.stroke()}
    else if(t1==='tri'){ctx.moveTo(-h,-h);ctx.lineTo(h,-h);ctx.lineTo(-h,h);ctx.closePath();ctx.fill()}
    else if(t1==='square'){ctx.rect(-h*.55,-h*.55,h*1.1,h*1.1);ctx.fill()}
    ctx.restore();
  }
  ctx.restore();ctx.globalAlpha=ga;
};

/* ---------- HUD: cantoneiras, rótulos, contador de quadros e timecode ---------- */
DK.hud=function(e,b,gp,lt){
  var col=resolve(e.color||'@ink'),s=PW/1280,m=22*s,fs=Math.round(11*s),ga=ctx.globalAlpha,fps=+e.fps||30,tot=total(),fr=Math.floor(GT*fps),nf=Math.round(tot*fps);
  function pad(n,l){n=String(n);while(n.length<l)n='0'+n;return n}
  var tc=pad(Math.floor(GT/3600),2)+':'+pad(Math.floor(GT/60)%60,2)+':'+pad(Math.floor(GT)%60,2)+':'+pad(fr%fps,2);
  ctx.save();ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=Math.max(1,1.2*s);ctx.globalAlpha=ga*.55*clamp(gp,0,1);
  var L=16*s;[[b.x+m,b.y+m,1,1],[b.x+b.w-m,b.y+m,-1,1],[b.x+m,b.y+b.h-m,1,-1],[b.x+b.w-m,b.y+b.h-m,-1,-1]].forEach(function(c){ctx.beginPath();ctx.moveTo(c[0],c[1]+L*c[3]);ctx.lineTo(c[0],c[1]);ctx.lineTo(c[0]+L*c[2],c[1]);ctx.stroke()});
  ctx.font='500 '+fs+'px "JetBrains Mono",ui-monospace,monospace';setSpacing(1.5*s);ctx.textBaseline='middle';
  var yT=b.y+m+L*.35,yB=b.y+b.h-m-L*.35;
  ctx.textAlign='left';ctx.fillText(sub(e.text1||''),b.x+m+L*1.4,yT);ctx.fillText(tc,b.x+m+L*1.4,yB);
  ctx.textAlign='right';ctx.fillText(e.text3!=null&&e.text3!==''?sub(e.text3):('F '+pad(fr,4)+' / '+pad(nf,3)),b.x+b.w-m-L*1.4,yT);ctx.fillText(sub(e.text2||''),b.x+b.w-m-L*1.4,yB);
  var lx0=b.x+m+L*1.4+ctx.measureText('00:00:00:00').width+18*s,lx1=b.x+b.w-m-L*1.4-Math.max(80*s,ctx.measureText(sub(e.text2||'')).width)-18*s;
  if(lx1>lx0){ctx.globalAlpha=ga*.25;ctx.beginPath();ctx.moveTo(lx0,yB);ctx.lineTo(lx1,yB);ctx.stroke();ctx.globalAlpha=ga*.8;ctx.beginPath();ctx.moveTo(lx0,yB);ctx.lineTo(lx0+(lx1-lx0)*clamp(GT/Math.max(.1,tot),0,1),yB);ctx.stroke()}
  ctx.restore();
};

/* ---------- aberração cromática e glitch por camada ---------- */
var TINT={};
function tinted(src,col,i){var c=layerCanvas(i),g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='source-over';g.drawImage(src,0,0);g.globalCompositeOperation='source-in';g.fillStyle=col;g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='source-over';return c}
function drawFxPass(e,lt,sc,o,ev){
  var T=ctx.getTransform(),L=layerCanvas(5),g=L.getContext('2d');g.setTransform(T);
  withCtx(g,function(){drawEl(e,lt,sc,Object.assign({},o,{fxPass:true}))});
  var k=Math.hypot(T.a,T.b)||1,d=(+ev.rgb||0)*k,gl=clamp(+ev.glitch||0,0,1),seed=idSeed(e.id),fr=Math.floor(lt*15);
  var gOn=gl>0&&hr(fr,seed)<.35+gl*.55;
  ctx.save();ctx.setTransform(1,0,0,1,0,0);
  function put(img,dx,alpha,op){ctx.globalAlpha=alpha;ctx.globalCompositeOperation=op||'source-over';
    if(!gOn){ctx.drawImage(img,dx,0);return}
    var H=img.height,y=0,j=0;while(y<H){var h=Math.max(4,Math.round(H*(.02+hr(j,seed+fr)*.09))),off=hr(j+50,seed+fr)<.45?(hr(j+90,seed+fr)-.5)*gl*90*k:0;ctx.drawImage(img,0,y,img.width,Math.min(h,H-y),dx+off,y,img.width,Math.min(h,H-y));y+=h;j++}}
  if(d>.2){var R=tinted(L,e.rgbA||'#ff2b55',6);put(R,-d,.85,'screen');var C=tinted(L,e.rgbB||'#18e4ff',7);put(C,d,.85,'screen')}
  put(L,0,1,e.blend&&e.blend!=='normal'?e.blend:'source-over');
  ctx.restore();
}

/* ---------- transições extras: íris, barras e flash ---------- */
var TRANS_X={iris:.75,bars:.85,flash:.45};
function drawTransX(prev,sc,lt){
  var D=TRANS_X[sc.trans];if(!D||lt>=D)return false;var f=clamp(lt/D,0,1),pl=prev.dur-.001,i=P.scenes.indexOf(sc);
  function cur(){drawScene(sc,lt,{noAnim:magicNoAnim(sc,i)})}
  if(sc.trans==='iris'){
    drawScene(prev,pl);var r=E.inout(f)*Math.hypot(PW,PH)*.56;
    ctx.save();ctx.beginPath();ctx.arc(PW/2,PH/2,Math.max(.1,r),0,Math.PI*2);ctx.clip();cur();ctx.restore();
    var cl=(sc.tcol&&sc.tcol.length?sc.tcol:['@accent','#F5D03B']).map(function(c){return resolve(c)||c});
    ctx.save();cl.forEach(function(c,k){var rr=r-k*PH*.05;if(rr<=0)return;ctx.strokeStyle=c;ctx.lineWidth=PH*(.05-k*.012)*(1-f*.5);ctx.beginPath();ctx.arc(PW/2,PH/2,rr,0,Math.PI*2);ctx.stroke()});ctx.restore();
  }else if(sc.trans==='bars'){
    var cl2=(sc.tcol&&sc.tcol.length?sc.tcol:['#F5D03B','@accent','#FFFFFF','#2CE0C4']).map(function(c){return resolve(c)||c}),nb=cl2.length,bw=PW/nb;
    for(var j=0;j<nb;j++){var fj=clamp(f*1.55-j*.14,0,1);ctx.save();ctx.beginPath();ctx.rect(j*bw-1,0,bw+2,PH);ctx.clip();
      if(fj<.5)drawScene(prev,pl);else cur();
      ctx.fillStyle=cl2[j];if(fj>0&&fj<.5){var hh=E.inout(fj*2)*PH;ctx.fillRect(j*bw-1,PH-hh,bw+2,hh)}else if(fj>=.5&&fj<1){var top=E.inout((fj-.5)*2)*PH;ctx.fillRect(j*bw-1,top,bw+2,PH-top)}
      ctx.restore()}
  }else{
    if(f<.5)drawScene(prev,pl);else cur();ctx.save();ctx.globalAlpha=Math.sin(f*Math.PI);ctx.fillStyle=resolve(sc.tcol&&sc.tcol[0]||'#ffffff');ctx.fillRect(0,0,PW,PH);ctx.restore();
  }
  return true;
}
/* tremor de cena nos impactos */
function sceneShake(sc,lt){
  var f=sc.fx||{},amp=+f.shake||0,hits=Array.isArray(f.hits)?f.hits:[];if(!amp||!hits.length)return null;
  var a=0;hits.forEach(function(h){if(lt>=h)a+=Math.exp(-(lt-h)*7.5)});if(a<.02)return null;
  var fr=Math.floor(lt*30);return [(hr(fr,11)-.5)*2*amp*a,(hr(fr,23)-.5)*2*amp*a,(hr(fr,37)-.5)*amp*a*.004];
}
