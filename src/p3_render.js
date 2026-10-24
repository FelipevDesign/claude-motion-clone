/* =========================================================
   Estado global
   ========================================================= */
var P=null,PW=1280,PH=720,SC=1.5,TR=.55,MM=.8;
var cv=$('#cv'),ctx=cv.getContext('2d');
var selScene=0,selEl=null,selKf=null,selTrack=null,tool='select',recKf=false;
var t=0,playing=false,loop=true,exporting=false,liveExport=false;
var hist=[],hi=-1,COMMENTS=[],VERSIONS=[],TEMPLATES_SAVED=[],BRANDKIT=null;
var CAP={db:null,user:null,assets:null,downloads:null,sample:null,room:null};
var ME={id:null};
var LOCAL={};            /* id -> objectURL (mídia local ou decodificada) */
var redrawQueued=false;
function redraw(){if(redrawQueued)return;redrawQueued=true;requestAnimationFrame(function(){redrawQueued=false;draw()})}

function total(){return P.scenes.reduce(function(a,s){return a+(+s.dur||1)},0)}
function sceneStart(i){var a=0;for(var k=0;k<i;k++)a+=(+P.scenes[k].dur||1);return a}
function sceneAt(tt){var tot=total();tt=clamp(tt,0,tot-1e-4);var a=0;for(var i=0;i<P.scenes.length;i++){var d=+P.scenes[i].dur||1;if(tt<a+d)return {i:i,lt:tt-a};a+=d}return {i:P.scenes.length-1,lt:0}}
function curScene(){return P.scenes[selScene]}
function findEl(id,sc){sc=sc||curScene();if(!sc||!id)return null;for(var i=0;i<sc.els.length;i++)if(sc.els[i].id===id)return sc.els[i];return null}
function findAny(id){for(var i=0;i<P.scenes.length;i++){if(P.scenes[i].id===id)return {scene:P.scenes[i],si:i};var e=findEl(id,P.scenes[i]);if(e)return {el:e,scene:P.scenes[i],si:i}}return null}
function getp(o,p){return p.split('.').reduce(function(a,k){return a==null?a:a[k]},o)}
function setp(o,p,v){var ks=p.split('.'),l=ks.pop(),c=o;ks.forEach(function(k){if(c[k]==null)c[k]={};c=c[k]});c[l]=v}
function elName(e){
  if(e.name)return e.name;
  if(e.kind==='text')return sub(e.text||'Texto').replace(/\s+/g,' ').slice(0,24)||'Texto';
  if(e.kind==='counter')return (e.prefix||'')+sub(e.to)+(e.suffix||'');
  if(e.kind==='image'||e.kind==='video'){var m=mediaById(e.src);if(m)return m.name}
  return KNAME[e.kind];
}
function fetchBin(url){if(!url)return Promise.reject(new Error('Arquivo não encontrado (endereço vazio).'));if(url.indexOf('data:')===0){try{var i0=url.indexOf(','),b0=atob(url.slice(i0+1)),u0=new Uint8Array(b0.length);for(var q=0;q<b0.length;q++)u0[q]=b0.charCodeAt(q);return Promise.resolve(u0.buffer)}catch(x){return Promise.reject(x)}}return fetch(url).then(function(r){if(!r.ok)throw new Error('http '+r.status);return r.arrayBuffer()}).then(function(ab){
  var h=new Uint8Array(ab,0,Math.min(5,ab.byteLength));if(String.fromCharCode.apply(null,h)!=='data:')return ab;
  var txt=new TextDecoder().decode(ab).trim(),b=atob(txt.slice(txt.indexOf(',')+1)),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer})}
function mediaById(src){if(!src||!P)return null;for(var i=0;i<P.media.length;i++)if(P.media[i].src===src)return P.media[i];return null}

/* ---------- cores do tema ---------- */
function resolve(c){
  if(c==null||c==='')return null;
  var th=P.theme;
  switch(c){case '@bg':return th.bg;case '@ink':return th.ink;case '@accent':return th.accent;case '@on':return th.on;case '@muted':return hexA(th.ink,.7);case '@line':return hexA(th.ink,.16)}
  return c;
}
function solid(c,bg){ /* cor opaca aproximada para contraste */
  var r=resolve(c);if(!r)return null;
  if(c==='@muted')return mixHex(P.theme.ink,bg||P.theme.bg,.3);
  if(c==='@line')return mixHex(P.theme.ink,bg||P.theme.bg,.84);
  return toHex(r);
}

/* =========================================================
   Keyframes e avaliação
   ========================================================= */
function kfVal(e,prop,lt){
  var k=e.kf&&e.kf[prop];if(!k||!k.length)return e[prop];
  if(lt<=k[0].t)return k[0].v;var last=k[k.length-1];if(lt>=last.t)return last.v;
  for(var i=0;i<k.length-1;i++){if(lt<k[i+1].t){var a=k[i],b=k[i+1],f=(lt-a.t)/Math.max(1e-4,b.t-a.t);return lerp(a.v,b.v,easeFn(b.e)(f))}}
  return last.v;
}
function hasKf(e){if(!e.kf)return false;for(var k in e.kf)if(e.kf[k]&&e.kf[k].length)return true;return false}
function evalEl(e,lt){
  if(!hasKf(e))return e;
  var r=Object.assign({},e);ANIMATABLE.forEach(function(p){if(e.kf[p]&&e.kf[p].length)r[p]=kfVal(e,p,lt)});return r;
}
function win(e,sc){var st=+e.start||0,en=e.dur>0?Math.min(sc.dur,st+(+e.dur)):sc.dur;return [st,en]}
function isVisible(e,sc,lt){var w=win(e,sc);return lt>=w[0]&&lt<w[1]}

/* =========================================================
   Texto e caixas
   ========================================================= */
function setSpacing(px){if('letterSpacing' in ctx)ctx.letterSpacing=(px||0)+'px'}
function tlayout(e){
  var size=Math.max(1,+e.size||48);ctx.save();setSpacing(+e.spacing||0);ctx.font=fnt(e.weight||500,size,e.font);
  var raw=sub(e.text);raw=e.upper?raw.toUpperCase():raw;var text='',hl=[],on=false;
  for(var ci=0;ci<raw.length;ci++){var c=raw[ci];if(c==='*'){on=!on;continue}text+=c;hl.push(on)}
  var sp=ctx.measureText(' ').width,lines=[],maxW=Math.max(20,+e.w||300),over=false,off=0;
  text.split('\n').forEach(function(para){
    var re=/\S+/g,m,cur=[],x=0,any=false;
    while((m=re.exec(para))){any=true;var wd=m[0],ww=ctx.measureText(wd).width;if(ww>maxW+1)over=true;if(x>0&&x+ww>maxW){lines.push(cur);cur=[];x=0}cur.push({wd:wd,ww:ww,x:x,i:off+m.index});x+=ww+sp}
    lines.push(cur);off+=para.length+1;
  });
  lines.forEach(function(l){var last=l[l.length-1],lw=last?last.x+last.ww:0,off=e.align==='center'?(maxW-lw)/2:e.align==='right'?(maxW-lw):0;l.forEach(function(o){o.x+=off})});
  ctx.restore();
  var lh=size*(+e.lh||1.15);return {lines:lines,lh:lh,size:size,h:Math.max(1,lines.length)*lh,over:over,hl:hl};
}
function bbox(e){
  var h=+e.h||0;
  if(e.kind==='text')h=tlayout(e).h;
  else if(e.kind==='counter')h=(+e.size||100)*1.15;
  else if(e.kind==='shape'&&e.shape==='line')h=Math.max(h,12);
  return {x:+e.x||0,y:+e.y||0,w:+e.w||0,h:Math.max(h,4)};
}

/* =========================================================
   Mídia (imagens e vídeos)
   ========================================================= */
var IMGS={},VIDS={};
function srcURL(src){
  if(!src)return '';
  if(src.indexOf('asset:')===0){var id=src.slice(6);return LOCAL[id]||('/_blob/'+id)}
  if(src.indexOf('local:')===0)return LOCAL[src.slice(6)]||'';
  if(src.indexOf('idb:')===0)return LOCAL[src.slice(4)]||'';
  if(src.indexOf('data:')===0||src.indexOf('blob:')===0)return src;
  return '';
}
function getImg(src){
  var u=srcURL(src);if(!u)return null;
  var c=IMGS[src];if(c&&c.u===u)return c.img;
  var im=new Image();im.onload=redraw;im.onerror=function(){im._err=1;redraw()};im.src=u;IMGS[src]={u:u,img:im};return im;
}
function getVid(e){
  var u=srcURL(e.src);if(!u)return null;var key=e.id;
  var c=VIDS[key];if(c&&c.u===u)return c.v;
  if(c){try{c.v.pause()}catch(x){}}
  var v=document.createElement('video');v.preload='auto';v.playsInline=true;v.setAttribute('playsinline','');v.crossOrigin='anonymous';
  v.src=u;v.addEventListener('loadeddata',redraw);v.addEventListener('seeked',redraw);v.addEventListener('error',function(){v._err=1;redraw()});
  $('#mediaPool').appendChild(v);
  VIDS[key]={u:u,v:v,g:null};
  if(AE.ctx)connectVid(VIDS[key]);
  return v;
}
var RAMPS={none:'Sem rampa',slowmid:'Câmera lenta no meio',speedup:'Acelerando',slowdown:'Desacelerando',punch:'Rápido, lento, rápido'};
function rampMult(type,u){
  u=clamp(u,0,1);
  if(type==='slowmid')return 1-.75*Math.exp(-Math.pow((u-.5)/.16,2));
  if(type==='speedup')return .4+1.8*u*u;
  if(type==='slowdown')return 2.2-1.8*Math.sqrt(u);
  if(type==='punch')return u<.3||u>.7?2:.35;
  return 1;
}
function rateAt(e,sc,lt){var w=win(e,sc),u=(lt-w[0])/Math.max(.01,w[1]-w[0]);return clamp((+e.rate||1)*rampMult(e.ramp,u),.06,16)}
function mediaElapsed(e,sc,lt){
  var w=win(e,sc),d=Math.max(0,lt-w[0]);if(!e.ramp||e.ramp==='none')return d*(+e.rate||1);
  var n=Math.max(4,Math.ceil(d*20)),h=d/n,acc=0;for(var i=0;i<n;i++)acc+=rateAt(e,sc,w[0]+(i+.5)*h)*h;return acc;
}
function videoTarget(e,sc,lt,v){
  var tg=(+e.mediaStart||0)+mediaElapsed(e,sc,lt);
  if(v&&v.duration&&isFinite(v.duration)){if(e.loop)tg=tg%v.duration;else tg=Math.min(tg,v.duration-.04)}
  return Math.max(0,tg);
}
function syncVideos(force){
  var a=sceneAt(t),sc=P.scenes[a.i],live=(playing||liveExport),act={};
  sc.els.forEach(function(e){
    if(e.kind!=='video'||!e.src)return;var v=getVid(e);if(!v)return;act[e.id]=1;
    var c=VIDS[e.id];if(c&&c.g){c.g.gain.value=e.muted?0:clamp(+e.vol,0,2)}else{v.muted=!!e.muted;v.volume=clamp(+e.vol,0,1)}
    var vis=isVisible(e,sc,a.lt),tg=videoTarget(e,sc,a.lt,v);
    if(live&&vis){var rt=rateAt(e,sc,a.lt);try{if(Math.abs(v.playbackRate-rt)>.01)v.playbackRate=rt}catch(x){}if(v.paused){var pr=v.play();if(pr&&pr.catch)pr.catch(function(){})}if(Math.abs(v.currentTime-tg)>.3*Math.max(1,rt))v.currentTime=tg}
    else{if(!v.paused)v.pause();if(force||Math.abs(v.currentTime-tg)>.05){try{v.currentTime=tg}catch(x){}}}
  });
  for(var k in VIDS){if(!act[k]&&!VIDS[k].v.paused)VIDS[k].v.pause()}
}
function prepFrameMedia(tt){ /* para exportação quadro a quadro: busca o tempo certo de cada vídeo */
  var a=sceneAt(tt),sc=P.scenes[a.i],ps=[];
  sc.els.forEach(function(e){
    if(e.kind!=='video'||!e.src||!isVisible(e,sc,a.lt))return;var v=getVid(e);if(!v)return;
    var tg=videoTarget(e,sc,a.lt,v);if(Math.abs(v.currentTime-tg)<.01&&v.readyState>=2)return;
    ps.push(new Promise(function(res){var done=false;function f(){if(done)return;done=true;v.removeEventListener('seeked',f);res()}v.addEventListener('seeked',f);setTimeout(f,900);try{v.pause();v.currentTime=tg}catch(x){f()}}));
  });
  return Promise.all(ps);
}

/* =========================================================
   Desenho dos elementos
   ========================================================= */
function rr(x,y,w,h,r){ctx.beginPath();if(r>0&&ctx.roundRect)ctx.roundRect(x,y,w,h,Math.min(r,Math.abs(w)/2,Math.abs(h)/2));else ctx.rect(x,y,w,h)}
function fit(text,maxW){text=String(text==null?'':text);if(ctx.measureText(text).width<=maxW)return text;while(text.length>1&&ctx.measureText(text+'…').width>maxW)text=text.slice(0,-1);return text+'…'}
function placeholder(b,label){
  ctx.save();rr(b.x,b.y,b.w,b.h,8);ctx.fillStyle=hexA(P.theme.ink,.07);ctx.fill();ctx.strokeStyle=hexA(P.theme.ink,.25);ctx.lineWidth=2;ctx.setLineDash([10,8]);ctx.stroke();ctx.setLineDash([]);
  ctx.fillStyle=hexA(P.theme.ink,.55);ctx.font=fnt(600,Math.max(12,Math.min(22,b.w/14)),'ui');ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,b.x+b.w/2,b.y+b.h/2);ctx.restore();
}
function drawMedia(src,b,fitMode,radius,label){
  if(!src||!src.w){placeholder(b,label);return}
  ctx.save();rr(b.x,b.y,b.w,b.h,+radius||0);ctx.clip();
  var s=fitMode==='contain'?Math.min(b.w/src.w,b.h/src.h):Math.max(b.w/src.w,b.h/src.h),dw=src.w*s,dh=src.h*s;
  ctx.drawImage(src.el,b.x+(b.w-dw)/2,b.y+(b.h-dh)/2,dw,dh);ctx.restore();
}
var DK={
  text:function(e,b,p,lt,a){
    var L=tlayout(e),ga=ctx.globalAlpha;ctx.save();setSpacing(+e.spacing||0);ctx.font=fnt(e.weight||500,L.size,e.font);
    ctx.fillStyle=resolve(e.color)||'#000';ctx.textBaseline='alphabetic';ctx.textAlign='left';
    var k=0,consumed=0,totalChars=0;
    if(a.in==='type')L.lines.forEach(function(l){l.forEach(function(o){totalChars+=o.wd.length+1})});
    var nShow=a.in==='type'?Math.floor(totalChars*prog(lt,0,Math.max(.2,a.t||1.2),E.linear)):0;
    L.lines.forEach(function(l,li){l.forEach(function(o){
      var al=1,dy=0,str=o.wd;
      if(a.in==='chars'){var cx0=b.x+o.x;for(var ci=0;ci<str.length;ci++){var pc=prog(lt,k*.03,Math.max(.15,a.t||.5),easeFn(a.ease));k++;var ch=str[ci],pre=ctx.measureText(str.slice(0,ci)).width;if(pc<=0)continue;ctx.globalAlpha=ga*clamp(pc,0,1);ctx.fillText(ch,cx0+pre,b.y+li*L.lh+L.size*.92+(1-pc)*L.size*.5)}k+=1;return}
      if(a.in==='words'){var pw=prog(lt,k*.07,Math.max(.2,a.t||.6),easeFn(a.ease));k++;if(pw<=0)return;al=clamp(pw,0,1);dy=(1-pw)*36}
      else if(a.in==='type'){var keep=Math.max(0,Math.min(str.length,nShow-consumed));consumed+=str.length+1;if(keep<=0)return;str=str.slice(0,keep)}
      ctx.globalAlpha=ga*al;ctx.fillText(str,b.x+o.x,b.y+li*L.lh+L.size*.92+dy);
    })});
    ctx.restore();
  },
  shape:function(e,b,p){
    var f=resolve(e.fill),s=resolve(e.stroke),x=b.x,y=b.y,w=b.w,h=b.h;
    if(e.shape==='ellipse'){
      ctx.save();if(p<1){ctx.translate(x+w/2,y+h/2);ctx.scale(Math.max(p,.001),Math.max(p,.001));ctx.translate(-(x+w/2),-(y+h/2))}
      ctx.beginPath();ctx.ellipse(x+w/2,y+h/2,Math.abs(w/2),Math.abs(h/2),0,0,Math.PI*2);
      if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.strokeStyle=s;ctx.lineWidth=+e.strokeW||2;ctx.stroke()}ctx.restore();
    }else if(e.shape==='line'){
      ctx.strokeStyle=s||f||'#888';ctx.lineWidth=+e.strokeW||4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x,y+h/2);ctx.lineTo(x+w*p,y+h/2);ctx.stroke();
    }else{
      rr(x,y,w*p,h,+e.radius||0);if(f){ctx.fillStyle=f;ctx.fill()}if(s){ctx.strokeStyle=s;ctx.lineWidth=+e.strokeW||2;ctx.stroke()}
    }
  },
  image:function(e,b){
    var im=getImg(e.src);
    drawMedia(im&&im.complete&&im.naturalWidth?{el:im,w:im.naturalWidth,h:im.naturalHeight}:null,b,e.fit,e.radius,e.src?(im&&im._err?'Imagem indisponível':'Carregando imagem'):e.slot?(e.name||'Plano')+' · solte sua imagem aqui':'Imagem');
  },
  video:function(e,b){
    var v=getVid(e);
    drawMedia(v&&v.readyState>=2&&v.videoWidth?{el:v,w:v.videoWidth,h:v.videoHeight}:null,b,e.fit,e.radius,e.src?(v&&v._err?'Vídeo indisponível':'Carregando vídeo'):'Vídeo');
  },
  chart:function(e,b,p){
    var data=(e.data||[]).slice(0,24),n=data.length;if(!n)return;
    var col=resolve(e.color)||'#C2562F',tc=resolve(e.textColor)||'#222',fs=+e.size||26,line=resolve('@line');
    var vals=data.map(function(d){return Math.max(0,num(d.value))}),mx=Math.max.apply(null,vals.concat([1e-9]));
    var dec=Math.min(2,Math.max.apply(null,vals.map(function(v){var s=String(Math.round(v*100)/100);return (s.split('.')[1]||'').length})));
    var unit=e.unit?' '+sub(e.unit):'';
    var sb=function(i){return E.outq(clamp(p*(1+.3*(n-1))-i*.3,0,1))};
    ctx.textBaseline='middle';
    if(e.type==='bar'||e.type==='line'){
      var labH=fs+16,valH=e.showValues?fs+16:6,plotH=Math.max(10,b.h-labH-valH),colW=b.w/n,base=b.y+valH+plotH;
      ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(b.x,base);ctx.lineTo(b.x+b.w,base);ctx.stroke();
      if(e.type==='bar'){
        var bw=Math.min(colW*.6,140);
        data.forEach(function(d,i){var s=sb(i),h=plotH*(vals[i]/mx)*s,x=b.x+colW*i+(colW-bw)/2;
          ctx.fillStyle=col;rr(x,base-h,bw,h,6);ctx.fill();
          ctx.fillStyle=tc;ctx.font=fnt(600,fs*.85,'ui');ctx.textAlign='center';ctx.fillText(fit(sub(d.label),colW-8),b.x+colW*(i+.5),base+labH/2+2);
          if(e.showValues&&s>.02){ctx.font=fnt(500,fs,'display');ctx.fillText(fmt(vals[i]*s,dec)+unit,b.x+colW*(i+.5),base-h-valH/2)}
        });
      }else{
        var q=p*(n-1),pts=data.map(function(d,i){return {x:b.x+colW*(i+.5),y:base-plotH*(vals[i]/mx)}});
        ctx.strokeStyle=col;ctx.lineWidth=5;ctx.lineJoin='round';ctx.lineCap='round';ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
        for(var i2=1;i2<n;i2++){if(q>=i2)ctx.lineTo(pts[i2].x,pts[i2].y);else{var f2=q-(i2-1);if(f2>0)ctx.lineTo(lerp(pts[i2-1].x,pts[i2].x,f2),lerp(pts[i2-1].y,pts[i2].y,f2));break}}
        ctx.stroke();
        data.forEach(function(d,i){
          ctx.fillStyle=tc;ctx.font=fnt(600,fs*.85,'ui');ctx.textAlign='center';ctx.fillText(fit(sub(d.label),colW-8),pts[i].x,base+labH/2+2);
          if(q>=i-.001){ctx.fillStyle=col;ctx.beginPath();ctx.arc(pts[i].x,pts[i].y,8,0,Math.PI*2);ctx.fill();
            if(e.showValues){ctx.fillStyle=tc;ctx.font=fnt(500,fs,'display');ctx.fillText(fmt(vals[i],dec)+unit,pts[i].x,pts[i].y-valH/2-6)}}
        });
      }
    }else{
      ctx.font=fnt(600,fs,'ui');var mlw=Math.max.apply(null,data.map(function(d){return ctx.measureText(sub(d.label)).width}));var labW=clamp(mlw+8,b.w*.18,b.w*.42),rowH=b.h/n,barH=Math.min(rowH*.62,48),x0=b.x+labW+16,maxW=Math.max(10,b.w-labW-16-(e.showValues?120:0));
      ctx.strokeStyle=line;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,b.y);ctx.lineTo(x0,b.y+b.h*clamp(p*1.6,0,1));ctx.stroke();
      data.forEach(function(d,i){
        var y=b.y+rowH*i+rowH/2,s=sb(i);
        ctx.fillStyle=tc;ctx.font=fnt(600,fs,'ui');ctx.textAlign='left';ctx.fillText(fit(sub(d.label),labW),b.x,y);
        var w=maxW*(vals[i]/mx)*s;ctx.fillStyle=col;rr(x0,y-barH/2,Math.max(w,0),barH,8);ctx.fill();
        if(e.showValues&&s>.02){ctx.fillStyle=tc;ctx.font=fnt(500,fs*1.2,'display');ctx.textAlign='left';ctx.fillText(fmt(vals[i]*s,dec)+unit,x0+w+14,y)}
      });
    }
    ctx.textBaseline='alphabetic';ctx.textAlign='left';
  },
  counter:function(e,b,p,lt,a,over){
    var d=clamp(e.decimals|0,0,4),from=num(e.from),to=num(e.to),v=over&&over.val!=null?over.val:from+(to-from)*p;
    var full=(e.prefix||'')+fmt(to,d)+(e.suffix||''),txt=sub(e.prefix||'')+fmt(v,d)+sub(e.suffix||''),size=+e.size||100;
    full=sub(e.prefix||'')+fmt(Math.max(Math.abs(to),Math.abs(v)),d)+sub(e.suffix||'');
    ctx.font=fnt(e.weight||500,size,e.font);var ww=ctx.measureText(full).width;
    if(ww>b.w&&ww>0){size=Math.floor(size*b.w/ww);ctx.font=fnt(e.weight||500,size,e.font)}
    ctx.fillStyle=resolve(e.color)||'#000';ctx.textBaseline='alphabetic';
    var fw=ctx.measureText(txt).width,x=e.align==='center'?b.x+(b.w-fw)/2:e.align==='right'?b.x+b.w-fw:b.x;
    ctx.textAlign='left';ctx.fillText(txt,x,b.y+size*.92);
  }
};
/* ---------- camadas auxiliares (máscara por camada) ---------- */
var LAYERS=[];
function layerCanvas(i){
  var c=LAYERS[i];if(!c){c=document.createElement('canvas');LAYERS[i]=c}
  var W=ctx.canvas.width,H=ctx.canvas.height;if(c.width!==W||c.height!==H){c.width=W;c.height=H}
  var g=c.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,W,H);return c;
}
function withCtx(g,fn){var k=ctx;ctx=g;try{fn()}finally{ctx=k}}
var HAS_FILTER=(function(){try{var c=document.createElement('canvas').getContext('2d');return c&&('filter' in c)}catch(x){return false}})();
function fxFilter(e,extraBlur){
  var f=e.fx||{},parts=[];
  var bl=(+f.blur||0)+(extraBlur||0);if(bl>0.05)parts.push('blur('+bl.toFixed(2)+'px)');
  if(f.bright!=null&&+f.bright!==1)parts.push('brightness('+(+f.bright)+')');
  if(f.contrast!=null&&+f.contrast!==1)parts.push('contrast('+(+f.contrast)+')');
  if(f.sat!=null&&+f.sat!==1)parts.push('saturate('+(+f.sat)+')');
  if(+f.hue)parts.push('hue-rotate('+(+f.hue)+'deg)');
  if(+f.shadow>0){var sc=resolve(f.shadowColor)||'#000';parts.push('drop-shadow(0px '+(f.shadow*.35).toFixed(1)+'px '+(+f.shadow).toFixed(1)+'px '+hexA(toHex(sc),.55)+')')}
  if(+f.glow>0){var gc=resolve(f.glowColor)||'#fff';parts.push('drop-shadow(0px 0px '+(+f.glow).toFixed(1)+'px '+hexA(toHex(gc),.85)+')')}
  return parts.join(' ');
}
function maskPath(e,b,p){
  var m=e.mask;if(!m||m==='none')return false;p=clamp(p,0,1);
  ctx.beginPath();
  if(e.maskInv){ctx.rect(-PW*4,-PH*4,PW*9,PH*9)}
  var cx=b.x+b.w/2,cy=b.y+b.h/2;
  if(m==='rect'||m==='round'||m==='ellipse'){
    var w=b.w*p,h=b.h*p,x=cx-w/2,y=cy-h/2;
    if(m==='ellipse')ctx.ellipse(cx,cy,Math.max(.1,w/2),Math.max(.1,h/2),0,0,Math.PI*2);
    else if(m==='round'&&ctx.roundRect)ctx.roundRect(x,y,w,h,Math.min(w,h)*.18);
    else ctx.rect(x,y,w,h);
  }else if(m==='circle'){ctx.arc(cx,cy,Math.max(.1,Math.hypot(b.w,b.h)/2*p),0,Math.PI*2)}
  else if(m==='wipe-l')ctx.rect(b.x-2,b.y-2,(b.w+4)*p,b.h+4);
  else if(m==='wipe-r')ctx.rect(b.x+b.w+2-(b.w+4)*p,b.y-2,(b.w+4)*p,b.h+4);
  else if(m==='wipe-u')ctx.rect(b.x-2,b.y+b.h+2-(b.h+4)*p,b.w+4,(b.h+4)*p);
  else if(m==='wipe-d')ctx.rect(b.x-2,b.y-2,b.w+4,(b.h+4)*p);
  ctx.clip(e.maskInv?'evenodd':'nonzero');return true;
}
function parentChain(e,sc){var out=[],cur=e,n=0;while(cur&&cur.parent&&n<6){var p=null;for(var i=0;i<sc.els.length;i++)if(sc.els[i].id===cur.parent){p=sc.els[i];break}if(!p||p===e)break;out.push(p);cur=p;n++}return out}
function applyParents(e,sc,lt){
  var chain=parentChain(e,sc);
  for(var i=chain.length-1;i>=0;i--){
    var p=chain[i],pe=evalEl(p,lt),b0=bbox(p),b1=bbox(pe),dr=((+pe.rot||0)-(+p.rot||0))*Math.PI/180,ds=(+pe.scale||1)/(+p.scale||1);
    var cx=b1.x+b1.w/2,cy=b1.y+b1.h/2;
    ctx.translate(b1.x-b0.x,b1.y-b0.y);
    if(dr||ds!==1){ctx.translate(b0.x+b0.w/2,b0.y+b0.h/2);if(dr)ctx.rotate(dr);if(ds!==1)ctx.scale(ds,ds);ctx.translate(-(b0.x+b0.w/2),-(b0.y+b0.h/2))}
  }
}
function isMatteSource(e,sc){for(var i=0;i<sc.els.length;i++)if(sc.els[i].matte===e.id)return true;return false}
function drawEl(e,lt,sc,o){
  o=o||{};
  if(!o.asMatte&&!o.inMatte&&isMatteSource(e,sc))return;
  var w=win(e,sc);if(!o.ignoreWin&&(lt<w[0]||lt>=w[1]))return;
  /* máscara por camada: desenha numa camada à parte e recorta pelo alfa da outra */
  if(e.matte&&!o.inMatte&&!o.asMatte){
    var mt=null;for(var i=0;i<sc.els.length;i++)if(sc.els[i].id===e.matte){mt=sc.els[i];break}
    if(mt){
      var T=ctx.getTransform(),L1=layerCanvas(0),g=L1.getContext('2d');g.setTransform(T);
      withCtx(g,function(){drawEl(e,lt,sc,Object.assign({},o,{inMatte:true}))});
      g.globalCompositeOperation=e.matteInv?'destination-out':'destination-in';g.setTransform(T);
      if(e.matteInv){withCtx(g,function(){drawEl(mt,lt,sc,{asMatte:true,ignoreWin:false})})}
      else{var L2=layerCanvas(1),g2=L2.getContext('2d');g2.setTransform(T);withCtx(g2,function(){drawEl(mt,lt,sc,{asMatte:true})});g.setTransform(1,0,0,1,0,0);g.drawImage(L2,0,0)}
      g.globalCompositeOperation='source-over';
      ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation=e.blend&&e.blend!=='normal'?e.blend:'source-over';ctx.drawImage(L1,0,0);ctx.restore();
      return;
    }
  }
  if(!o.fxPass&&!o.asMatte&&!o.inMatte&&(e.rgb||e.glitch||(e.kf&&(e.kf.rgb||e.kf.glitch)))){var evq=evalEl(e,lt);if(+evq.rgb>0||+evq.glitch>0){drawFxPass(e,lt,sc,o,evq);return}}
  /* motion blur: rastro de amostras anteriores */
  if(!o.mbSample&&e.fx&&+e.fx.mblur>0&&!o.noAnim){
    var amt=+e.fx.mblur,step=amt*.012,a0=evalEl(e,lt),a1=evalEl(e,Math.max(w[0],lt-step*3));
    if(Math.abs(a0.x-a1.x)+Math.abs(a0.y-a1.y)+Math.abs((a0.rot||0)-(a1.rot||0))+Math.abs(((a0.scale||1)-(a1.scale||1))*100)>2){
      [3,2,1].forEach(function(k){drawEl(e,Math.max(w[0],lt-step*k),sc,Object.assign({},o,{mbSample:true,alpha:(o.alpha==null?1:o.alpha)*(.16+(.11*(3-k)))}))});
    }
  }
  var ev=o.ev||evalEl(e,lt),a=o.noAnim?{in:'none',out:'none'}:(e.anim||{}),ease=easeFn(a.ease),d=Math.max(.05,+a.t||.6);
  var p=a.in==='none'?1:clamp((lt-w[0])/d,0,1),pe=ease(p),alpha=(ev.opacity==null?1:+ev.opacity)*(o.alpha==null?1:o.alpha),dx=0,dy=0,s=1,clipP=1,gp=1,xblur=0;
  switch(a.in){
    case 'fade':alpha*=clamp(pe,0,1);break;
    case 'rise':alpha*=clamp(pe,0,1);dy=(1-pe)*40;break;
    case 'drop':alpha*=clamp(pe,0,1);dy=-(1-pe)*40;break;
    case 'left':alpha*=clamp(pe,0,1);dx=-(1-pe)*90;break;
    case 'right':alpha*=clamp(pe,0,1);dx=(1-pe)*90;break;
    case 'scale':alpha*=clamp(pe,0,1);s=.8+.2*pe;break;
    case 'pop':alpha*=clamp(p*3,0,1);s=E.back(p)*.9+.1*p;break;
    case 'blur':alpha*=clamp(pe,0,1);xblur=(1-pe)*18;break;
    case 'wipe':clipP=clamp(pe,0,1);break;
    case 'grow':gp=pe;if(e.kind==='text'||e.kind==='image'||e.kind==='video')alpha*=clamp(pe,0,1);break;
  }
  if(a.out==='fade')alpha*=clamp((w[1]-lt)/.35,0,1);
  if(alpha<=.001)return;
  var b=bbox(ev);ctx.save();ctx.globalAlpha=clamp(alpha,0,1);
  if(!o.asMatte&&e.blend&&e.blend!=='normal')ctx.globalCompositeOperation=e.blend;
  if(e.parent)applyParents(e,sc,lt);
  var px=e.fixed?null:parallaxAt(sc,lt,e.depth);if(px){ctx.translate(PW/2+px.dx,PH/2+px.dy);ctx.scale(px.s,px.s);ctx.translate(-PW/2,-PH/2)}
  var rot=(+ev.rot||0)*Math.PI/180,sc2=(+ev.scale||1)*s,sxx=ev.sx==null?1:+ev.sx,syy=ev.sy==null?1:+ev.sy,ay=e.ay==null?.5:+e.ay,jt=+ev.jit||0;
  if(jt){var jf=Math.floor(lt*30),js=idSeed(e.id);dx+=(hr(jf,js)-.5)*2*jt;dy+=(hr(jf,js+9)-.5)*2*jt}
  if(sc2!==1||rot||dx||dy||sxx!==1||syy!==1){var cx=b.x+b.w/2,cy=b.y+b.h*ay;ctx.translate(cx+dx,cy+dy);if(rot)ctx.rotate(rot);ctx.scale(Math.max(sc2*sxx,.001),Math.max(sc2*syy,.001));ctx.translate(-cx,-cy)}
  if(clipP<1){ctx.beginPath();ctx.rect(b.x-6,b.y-6,(b.w+12)*clipP,b.h+12);ctx.clip()}
  maskPath(e,b,ev.maskP==null?1:+ev.maskP);
  if(HAS_FILTER&&!o.asMatte){var flt=fxFilter(e,xblur);if(flt)ctx.filter=flt}
  var f=DK[e.kind];if(f)f(ev,b,gp,lt-w[0],a,o);
  ctx.restore();
}
/* ---------- efeitos de cena: granulação e vinheta ---------- */
var NOISE=null;
function noiseTile(){if(NOISE)return NOISE;var c=document.createElement('canvas');c.width=c.height=192;var g=c.getContext('2d'),im=g.createImageData(192,192);for(var i=0;i<im.data.length;i+=4){var v=Math.random()*255;im.data[i]=im.data[i+1]=im.data[i+2]=v;im.data[i+3]=255}g.putImageData(im,0,0);NOISE=c;return c}
function drawSceneFx(sc,lt){
  var f=sc.fx||{};
  if(+f.vignette>0){var r=Math.hypot(PW,PH)/2,gr=ctx.createRadialGradient(PW/2,PH/2,r*.35,PW/2,PH/2,r);gr.addColorStop(0,'rgba(0,0,0,0)');gr.addColorStop(1,'rgba(0,0,0,'+clamp(+f.vignette,0,1)*.85+')');ctx.save();ctx.fillStyle=gr;ctx.fillRect(0,0,PW,PH);ctx.restore()}
  if(+f.grain>0){var n=noiseTile(),k=Math.floor(lt*24);ctx.save();ctx.globalAlpha=clamp(+f.grain,0,1)*.35;ctx.globalCompositeOperation='overlay';var pat=ctx.createPattern(n,'repeat');if(pat){ctx.translate((k*53)%192,(k*97)%192);ctx.fillStyle=pat;ctx.fillRect(-192,-192,PW+384,PH+384)}ctx.restore()}
}

/* =========================================================
   Assets: sprites, SVG (desenho de traço) e Lottie
   ========================================================= */
var ANIMS={},SVGS={},LOTS={},LOTTIE_LIB=null,LOTTIE_LOADING=null;
/* GIF/WebP animado decodificado em quadros (Chrome: ImageDecoder) */
function animFrames(src){
  var u=srcURL(src);if(!u)return null;var c=ANIMS[src];if(c)return c.ready?c:null;
  c=ANIMS[src]={ready:false};
  if(!window.ImageDecoder)return null;
  fetch(u).then(function(r){var ct=r.headers.get('content-type')||'';return r.arrayBuffer().then(function(ab){return {ab:ab,ct:ct}})}).then(function(o){
    var type=/webp/.test(o.ct)?'image/webp':/png/.test(o.ct)?'image/png':'image/gif';
    if(!ImageDecoder.isTypeSupported)return;return ImageDecoder.isTypeSupported(type).then(function(ok){if(!ok)return;
      var dec=new ImageDecoder({data:o.ab,type:type});return dec.tracks.ready.then(function(){var n=dec.tracks.selectedTrack.frameCount,fr=[],dur=[],chain=Promise.resolve();
        for(var i=0;i<n;i++)(function(i){chain=chain.then(function(){return dec.decode({frameIndex:i}).then(function(r){return createImageBitmap(r.image).then(function(bm){fr.push(bm);dur.push((r.image.duration||100000)/1e6);r.image.close()})})})})(i);
        return chain.then(function(){if(fr.length>1){c.frames=fr;c.durs=dur;c.total=dur.reduce(function(a,b){return a+b},0);c.ready=true;redraw()}});
      })})}).catch(function(){});
  return null;
}
function drawSprite(e,b,lt){
  var fps=Math.max(1,+e.fps||12),frames=Array.isArray(e.frames)&&e.frames.length?e.frames:null,n,idx,img=null,sx=0,sy=0,sw=0,sh=0;
  function pick(n){var f=Math.floor(lt*fps*(+e.speed||1));if(e.mode==='once')return Math.min(n-1,f);if(e.mode==='pingpong'){var p=n>1?2*n-2:1,m=f%p;return m<n?m:p-m}return ((f%n)+n)%n}
  if(frames){n=frames.length;idx=pick(n);img=getImg(frames[idx]);if(!img||!img.complete||!img.naturalWidth){placeholder(b,'Carregando quadros');return}sw=img.naturalWidth;sh=img.naturalHeight}
  else{
    var im=getImg(e.src);if(!im||!im.complete||!im.naturalWidth){placeholder(b,e.src?'Carregando sprite':'Sprite');return}
    var an=(+e.cols<=1&&+e.rows<=1)?animFrames(e.src):null;
    if(an){var tt=(lt*(+e.speed||1));if(e.mode==='once')tt=Math.min(tt,an.total-.001);else tt=tt%an.total;var acc=0,k=0;for(;k<an.frames.length;k++){acc+=an.durs[k];if(tt<acc)break}var bm=an.frames[Math.min(k,an.frames.length-1)];drawMedia({el:bm,w:bm.width,h:bm.height},b,e.fit,e.radius,'');return}
    var cols=Math.max(1,+e.cols|0),rows=Math.max(1,+e.rows|0);n=Math.max(1,Math.min(cols*rows,+e.count||cols*rows));idx=pick(n);
    sw=im.naturalWidth/cols;sh=im.naturalHeight/rows;sx=(idx%cols)*sw;sy=Math.floor(idx/cols)*sh;img=im;
  }
  var s=e.fit==='cover'?Math.max(b.w/sw,b.h/sh):Math.min(b.w/sw,b.h/sh),dw=sw*s,dh=sh*s;
  ctx.save();if(e.flip){ctx.translate(b.x+b.w/2,0);ctx.scale(-1,1);ctx.translate(-(b.x+b.w/2),0)}
  ctx.drawImage(img,sx,sy,sw,sh,b.x+(b.w-dw)/2,b.y+(b.h-dh)/2,dw,dh);ctx.restore();
}
/* SVG: lê os caminhos para desenhar o traço; a imagem completa aparece depois */
function dataText(u){var i=u.indexOf(','),meta=u.slice(0,i),body=u.slice(i+1);if(/;base64/.test(meta)){var b=atob(body),a=new Uint8Array(b.length);for(var k=0;k<b.length;k++)a[k]=b.charCodeAt(k);return new TextDecoder().decode(a)}return decodeURIComponent(body)}
function svgData(src){
  var c=SVGS[src];if(c)return c.ready?c:null;var u=srcURL(src);if(!u)return null;c=SVGS[src]={ready:false};
  (u.indexOf('data:')===0?Promise.resolve(dataText(u)):fetch(u).then(function(r){return r.text()})).then(function(txt){
    var doc=new DOMParser().parseFromString(txt,'image/svg+xml'),root=doc.documentElement;if(!root||root.nodeName.toLowerCase()!=='svg')return;
    var vb=(root.getAttribute('viewBox')||'').split(/[\s,]+/).map(Number);if(vb.length!==4||vb.some(isNaN)){var w=parseFloat(root.getAttribute('width'))||100,h=parseFloat(root.getAttribute('height'))||100;vb=[0,0,w,h]}
    var host=document.createElementNS('http://www.w3.org/2000/svg','svg');host.setAttribute('viewBox',vb.join(' '));host.style.cssText='position:absolute;width:0;height:0;overflow:hidden';document.body.appendChild(host);
    var paths=[];
    root.querySelectorAll('path,line,polyline,polygon,rect,circle,ellipse').forEach(function(n){
      var tag=n.nodeName.toLowerCase(),d='';
      if(tag==='path')d=n.getAttribute('d')||'';
      else if(tag==='line')d='M'+(n.getAttribute('x1')||0)+' '+(n.getAttribute('y1')||0)+'L'+(n.getAttribute('x2')||0)+' '+(n.getAttribute('y2')||0);
      else if(tag==='polyline'||tag==='polygon'){var pts=(n.getAttribute('points')||'').trim().split(/[\s,]+/).map(Number);for(var i=0;i+1<pts.length;i+=2)d+=(i?'L':'M')+pts[i]+' '+pts[i+1];if(tag==='polygon')d+='Z'}
      else if(tag==='rect'){var x=+n.getAttribute('x')||0,y=+n.getAttribute('y')||0,w2=+n.getAttribute('width')||0,h2=+n.getAttribute('height')||0;d='M'+x+' '+y+'h'+w2+'v'+h2+'h'+(-w2)+'Z'}
      else{var cx=+n.getAttribute('cx')||0,cy=+n.getAttribute('cy')||0,rx=+(n.getAttribute('r')||n.getAttribute('rx'))||0,ry=+(n.getAttribute('r')||n.getAttribute('ry'))||0;d='M'+(cx-rx)+' '+cy+'a'+rx+' '+ry+' 0 1 0 '+(2*rx)+' 0a'+rx+' '+ry+' 0 1 0 '+(-2*rx)+' 0'}
      if(!d)return;var pe=document.createElementNS('http://www.w3.org/2000/svg','path');pe.setAttribute('d',d);host.appendChild(pe);var len=0;try{len=pe.getTotalLength()}catch(x){}
      var cs=function(a){var v=n.getAttribute(a);if(!v){var st=n.getAttribute('style')||'',m=st.match(new RegExp(a+'\\s*:\\s*([^;]+)'));v=m?m[1].trim():''}return v};
      var stroke=cs('stroke'),fill=cs('fill');paths.push({p:new Path2D(d),len:Math.max(1,len),stroke:stroke&&stroke!=='none'?stroke:'',fill:fill,sw:parseFloat(cs('stroke-width'))||0});
    });
    document.body.removeChild(host);c.vb=vb;c.paths=paths;c.total=paths.reduce(function(a,p){return a+p.len},0);c.ready=true;redraw();
  }).catch(function(){});
  return null;
}
function drawSvg(e,b,lt){
  var im=getImg(e.src),sd=svgData(e.src),ready=im&&im.complete&&im.naturalWidth;
  if(!ready&&!sd){placeholder(b,e.src?'Carregando SVG':'SVG');return}
  var vb=sd?sd.vb:[0,0,im.naturalWidth,im.naturalHeight],s=Math.min(b.w/vb[2],b.h/vb[3]),ox=b.x+(b.w-vb[2]*s)/2,oy=b.y+(b.h-vb[3]*s)/2;
  var dt=Math.max(.1,+e.drawT||1.6),p=e.draw?clamp(lt/dt,0,1):1;
  if(e.draw&&sd&&sd.paths.length&&p<1.0001){
    var pe=E.inout(p),col=resolve(e.strokeColor)||null;
    ctx.save();ctx.translate(ox,oy);ctx.scale(s,s);ctx.translate(-vb[0],-vb[1]);ctx.lineCap='round';ctx.lineJoin='round';
    var done=0;sd.paths.forEach(function(pa){var share=pa.len/sd.total,from=done;done+=share;var lp=clamp((pe-from)/Math.max(.0001,share)*1.0,0,1);if(lp<=0)return;
      ctx.strokeStyle=col||pa.stroke||(pa.fill&&pa.fill!=='none'?pa.fill:resolve('@ink'));ctx.lineWidth=(pa.sw||Math.max(1.5,2/s))*(+e.strokeScale||1);
      ctx.setLineDash([pa.len,pa.len]);ctx.lineDashOffset=pa.len*(1-lp);ctx.stroke(pa.p)});
    ctx.restore();
  }
  var fa=e.draw?clamp((lt-dt*.85)/.5,0,1):1;
  if(fa>0&&ready){ctx.save();ctx.globalAlpha*=fa;ctx.drawImage(im,ox,oy,vb[2]*s,vb[3]*s);ctx.restore()}
  else if(fa>0&&sd&&!ready){ctx.save();ctx.globalAlpha*=fa;ctx.translate(ox,oy);ctx.scale(s,s);ctx.translate(-vb[0],-vb[1]);sd.paths.forEach(function(pa){if(pa.fill&&pa.fill!=='none'){ctx.fillStyle=pa.fill;ctx.fill(pa.p)}if(pa.stroke){ctx.strokeStyle=pa.stroke;ctx.lineWidth=pa.sw||1;ctx.stroke(pa.p)}});ctx.restore()}
}
/* Lottie: biblioteca carregada sob demanda (cdnjs) */
function loadLottieLib(){
  if(LOTTIE_LIB)return Promise.resolve(LOTTIE_LIB);if(LOTTIE_LOADING)return LOTTIE_LOADING;
  LOTTIE_LOADING=new Promise(function(res,rej){var s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_canvas.min.js';s.onload=function(){LOTTIE_LIB=window.lottie||window.bodymovin;LOTTIE_LIB?res(LOTTIE_LIB):rej()};s.onerror=rej;document.head.appendChild(s)});
  return LOTTIE_LOADING;
}
function lottieFor(e){
  var key=e.src,c=LOTS[key];if(c)return c.ready?c:null;var u=srcURL(e.src);if(!u)return null;c=LOTS[key]={ready:false};
  Promise.all([loadLottieLib(),fetch(u).then(function(r){return r.json()})]).then(function(r){
    var L=r[0],data=r[1],cv2=document.createElement('canvas');cv2.width=Math.max(1,data.w||512);cv2.height=Math.max(1,data.h||512);
    var anim=L.loadAnimation({renderer:'canvas',loop:false,autoplay:false,animationData:data,rendererSettings:{context:cv2.getContext('2d'),clearCanvas:true,preserveAspectRatio:'xMidYMid meet'}});
    c.anim=anim;c.cv=cv2;c.fr=data.fr||30;c.frames=Math.max(1,(data.op||60)-(data.ip||0));c.ready=true;redraw();
  }).catch(function(){c.err=1;redraw()});
  return null;
}
function drawLottie(e,b,lt){
  var c=lottieFor(e);if(!c){placeholder(b,!e.src?'Lottie':(LOTS[e.src]&&LOTS[e.src].err?'Lottie indisponível':'Carregando Lottie'));return}
  var f=lt*c.fr*(+e.speed||1);f=e.loop===false?Math.min(f,c.frames-1):f%c.frames;
  try{c.anim.goToAndStop(f,true)}catch(x){}
  drawMedia({el:c.cv,w:c.cv.width,h:c.cv.height},b,e.fit||'contain',0,'');
}
DK.sprite=function(e,b,p,lt){drawSprite(e,b,lt)};
DK.svg=function(e,b,p,lt){drawSvg(e,b,lt)};
DK.lottie=function(e,b,p,lt){drawLottie(e,b,lt)};
/* parallax 2.5D: deslocamento por profundidade */
function parallaxAt(sc,lt,depth){
  if(depth==='fixed')return null;
  var pr=sc.par;if(!pr||!pr.on)return null;var f=easeFn(pr.ease||'inout')(clamp(lt/Math.max(.01,sc.dur),0,1))-.5,k=.15+.85*clamp(+depth||0,0,1);
  return {dx:-(+pr.x||0)*f*k,dy:-(+pr.y||0)*f*k,s:1+(+pr.z||0)*(f+.5)*k};
}

/* =========================================================
   Shaders (WebGL) e 3D (Three.js)
   ========================================================= */
var GLX=null;
function glCtx(){
  if(GLX)return GLX.gl?GLX:null;GLX={};
  var c=document.createElement('canvas');c.width=c.height=8;
  var gl=c.getContext('webgl',{premultipliedAlpha:false,preserveDrawingBuffer:true,alpha:true});if(!gl)return null;
  var buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  GLX={gl:gl,c:c,progs:{},errs:{},tex:{}};return GLX;
}
var SH_HEAD='precision highp float;\nuniform vec3 iResolution;uniform float iTime;uniform vec3 uC1;uniform vec3 uC2;uniform vec3 uC3;uniform float uI;uniform sampler2D iChannel0;uniform sampler2D iChannel1;uniform float uHasTex;uniform float uProg;\n';
var SH_FOOT='\nvoid main(){vec4 c=vec4(0.0);mainImage(c,gl_FragCoord.xy);gl_FragColor=c;}';
var SH_NOISE='float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}\nfloat vn(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}\nfloat fbm(vec2 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*vn(p);p*=2.02;a*=0.5;}return v;}\n';
var SHADERS={
  fluid:{name:'Gradiente fluido',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec2 p=uv*vec2(iResolution.x/iResolution.y,1.0)*1.6;float t=iTime*0.12;\nvec2 q=vec2(fbm(p+t),fbm(p+vec2(5.2,1.3)-t));float f=fbm(p+2.0*q+vec2(t*0.7,-t*0.4));\nvec3 col=mix(uC2,uC1,smoothstep(0.2,0.8,f));col=mix(col,uC3,smoothstep(0.55,0.95,q.x)*0.55*uI);o=vec4(col,1.0);}'},
  aurora:{name:'Aurora',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float t=iTime*0.25;vec3 col=uC2;\nfor(int i=0;i<3;i++){float fi=float(i);float y=0.55+0.12*sin(uv.x*3.0+t*(1.0+fi*0.3)+fi*2.0)+0.08*fbm(vec2(uv.x*4.0+t,fi));float b=exp(-pow((uv.y-y)*9.0,2.0))*(0.6+0.4*fbm(vec2(uv.x*6.0-t*2.0,fi*3.0)));col=mix(col,mix(uC1,uC3,fi*0.25),clamp(b*0.42*uI,0.0,1.0));}\no=vec4(col,1.0);}'},
  plasma:{name:'Plasma',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=(fc-0.5*iResolution.xy)/iResolution.y;float t=iTime*0.6;float v=sin(uv.x*6.0+t)+sin(uv.y*5.0-t*1.3)+sin((uv.x+uv.y)*4.0+t*0.7)+sin(length(uv)*9.0-t*1.8);\nv=v*0.25+0.5;vec3 col=mix(uC2,uC1,v);col=mix(col,uC3,pow(abs(sin(v*3.14159)),6.0)*0.6*uI);o=vec4(col,1.0);}'},
  waves:{name:'Linhas em onda',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float t=iTime*0.5;vec3 col=uC2;\nfor(int i=0;i<12;i++){float fi=float(i)/12.0;float y=fi+0.04*sin(uv.x*6.0+t+fi*9.0)+0.02*sin(uv.x*13.0-t*1.4);float d=abs(uv.y-y);col=mix(col,mix(uC1,uC3,fi),smoothstep(0.004*uI+0.002,0.0,d));}\no=vec4(col,1.0);}'},
  rays:{name:'Raios de luz',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec2 c=vec2(0.5,1.15);vec2 d=uv-c;float a=atan(d.y,d.x);float t=iTime*0.15;\nfloat r=pow(fbm(vec2(a*7.0,t)),2.0)*1.6*uI;float fall=smoothstep(1.4,0.0,length(d));vec3 col=mix(uC2,uC1,r*fall);col+=uC3*pow(fall,6.0)*0.25;o=vec4(col,1.0);}'},
  grid:{name:'Grade retrô',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec3 col=mix(uC2,uC2*0.4,uv.y);float hz=0.45;\nif(uv.y<hz){float y=(hz-uv.y);float z=1.0/max(y,0.001);vec2 g=vec2((uv.x-0.5)*z*0.6,z+iTime*1.2);vec2 l=abs(fract(g)-0.5);float line=smoothstep(0.03*z*0.12+0.01,0.0,min(l.x,l.y));col=mix(col,uC1,line*smoothstep(0.0,0.25,y)*uI);}\nelse{float s=length(uv-vec2(0.5,hz+0.18));col=mix(col,uC3,smoothstep(0.22,0.18,s)*step(0.0,sin((uv.y-hz)*120.0)+0.4));}\no=vec4(col,1.0);}'},
  dots:{name:'Pontos pulsando',code:'void mainImage(out vec4 o,in vec2 fc){vec2 p=fc/iResolution.y*22.0;vec2 g=fract(p)-0.5;vec2 id=floor(p);float w=sin(length(id-vec2(iResolution.x/iResolution.y*11.0,11.0))*0.45-iTime*2.0)*0.5+0.5;\nfloat r=0.08+0.32*w*uI;float d=smoothstep(r,r-0.06,length(g));o=vec4(mix(uC2,mix(uC1,uC3,w),d),1.0);}'},
  grain:{name:'Granulado animado',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float n=h21(fc+fract(iTime*13.0)*100.0);vec3 col=mix(uC2,uC1,uv.y*0.6+0.2);col+=(n-0.5)*0.25*uI;o=vec4(col,1.0);}'},
  ripple:{name:'Ondulação na imagem',tex:true,code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec2 c=uv-0.5;float d=length(c);uv+=c/max(d,0.001)*sin(d*40.0-iTime*4.0)*0.008*uI;vec4 t=uHasTex>0.5?texture2D(iChannel0,vec2(uv.x,1.0-uv.y)):vec4(mix(uC2,uC1,uv.y),1.0);o=t;}'},
  liquid:{name:'Distorção líquida na imagem',tex:true,code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float t=iTime*0.3;vec2 w=vec2(fbm(uv*3.0+t),fbm(uv*3.0-t+3.1))-0.5;uv+=w*0.06*uI;vec4 tx=uHasTex>0.5?texture2D(iChannel0,vec2(uv.x,1.0-uv.y)):vec4(mix(uC2,uC1,fbm(uv*4.0+t)),1.0);o=tx;}'},
  glitch:{name:'Glitch na imagem',tex:true,code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float t=floor(iTime*10.0);float band=step(0.82,h21(vec2(floor(uv.y*24.0),t)));uv.x+=(h21(vec2(t,floor(uv.y*24.0)))-0.5)*0.12*band*uI;\nvec2 fl=vec2(uv.x,1.0-uv.y);vec3 c;if(uHasTex>0.5){c.r=texture2D(iChannel0,fl+vec2(0.006*uI,0.0)).r;c.g=texture2D(iChannel0,fl).g;c.b=texture2D(iChannel0,fl-vec2(0.006*uI,0.0)).b;}else{c=mix(uC2,uC1,uv.y);}o=vec4(c,1.0);}'}
};
var TRANS_SH={
  'sh-noise':{name:'Dissolver com ruído',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec2 fl=vec2(uv.x,1.0-uv.y);float n=fbm(uv*6.0);float e=smoothstep(uProg-0.08,uProg+0.08,n*0.84+0.08);o=mix(texture2D(iChannel1,fl),texture2D(iChannel0,fl),e);}'},
  'sh-pixel':{name:'Pixelizar',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float k=1.0-abs(uProg*2.0-1.0);float s=max(1.0,k*60.0);vec2 cell=vec2(s)/iResolution.xy;vec2 q=(floor(uv/cell)+0.5)*cell;vec2 fl=vec2(q.x,1.0-q.y);o=mix(texture2D(iChannel0,fl),texture2D(iChannel1,fl),step(0.5,uProg));}'},
  'sh-radial':{name:'Radial',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;vec2 fl=vec2(uv.x,1.0-uv.y);vec2 d=uv-0.5;float a=(atan(d.y,d.x)+3.14159)/6.28318;float e=smoothstep(uProg-0.02,uProg+0.02,a);o=mix(texture2D(iChannel1,fl),texture2D(iChannel0,fl),e);}'},
  'sh-zoom':{name:'Zoom com desfoque',code:'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float k=1.0-abs(uProg*2.0-1.0);vec4 acc=vec4(0.0);vec2 c=uv-0.5;for(int i=0;i<12;i++){float s=1.0-k*0.18*float(i)/12.0;vec2 p=0.5+c*s;vec2 fl=vec2(p.x,1.0-p.y);acc+=mix(texture2D(iChannel0,fl),texture2D(iChannel1,fl),smoothstep(0.35,0.65,uProg));}o=acc/12.0;}'},
  'sh-glitch':{name:'Glitch',code:SH_NOISE+'void mainImage(out vec4 o,in vec2 fc){vec2 uv=fc/iResolution.xy;float k=1.0-abs(uProg*2.0-1.0);float b=step(1.0-k*0.6,h21(vec2(floor(uv.y*30.0),floor(uProg*20.0))));uv.x+=(h21(vec2(floor(uProg*20.0),floor(uv.y*30.0)))-0.5)*0.2*b;vec2 fl=vec2(uv.x,1.0-uv.y);vec4 a=texture2D(iChannel0,fl),c=texture2D(iChannel1,fl);vec4 m=mix(a,c,step(0.5,uProg));m.r=mix(a,c,step(0.5,uProg+0.04*k)).r;o=m;}'}
};
function glProgram(code){
  var X=glCtx();if(!X)return null;var gl=X.gl,key=code;if(X.progs[key])return X.progs[key];if(X.errs[key])return null;
  function sh(type,src){var s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){var m=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(m)}return s}
  try{var vs=sh(gl.VERTEX_SHADER,'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'),fs=sh(gl.FRAGMENT_SHADER,SH_HEAD+code+SH_FOOT);
    var pr=gl.createProgram();gl.attachShader(pr,vs);gl.attachShader(pr,fs);gl.linkProgram(pr);if(!gl.getProgramParameter(pr,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(pr));
    var u={};['iResolution','iTime','uC1','uC2','uC3','uI','iChannel0','iChannel1','uHasTex','uProg'].forEach(function(n){u[n]=gl.getUniformLocation(pr,n)});
    X.progs[key]={p:pr,u:u,a:gl.getAttribLocation(pr,'p')};return X.progs[key];
  }catch(err){X.errs[key]=String(err.message||err).replace(/ERROR: 0:(\d+)/g,function(m,l){return 'Linha '+(Math.max(1,(+l)-3))}).slice(0,400);return null}
}
function shaderError(code){var X=glCtx();return X&&X.errs[code]||''}
function glTex(unit,source){var X=GLX,gl=X.gl,t=X.tex[unit];if(!t){t=gl.createTexture();X.tex[unit]=t}gl.activeTexture(gl.TEXTURE0+unit);gl.bindTexture(gl.TEXTURE_2D,t);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  try{gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,source)}catch(x){}}
function rgbF(c){var r=rgb(toHex(resolve(c)||'#000000'));return [r[0]/255,r[1]/255,r[2]/255]}
function glRun(prog,w,h,time,opts){
  var X=GLX,gl=X.gl;w=Math.max(2,Math.min(2048,Math.round(w)));h=Math.max(2,Math.min(2048,Math.round(h)));
  if(X.c.width!==w||X.c.height!==h){X.c.width=w;X.c.height=h}
  gl.viewport(0,0,w,h);gl.useProgram(prog.p);gl.enableVertexAttribArray(prog.a);gl.vertexAttribPointer(prog.a,2,gl.FLOAT,false,0,0);
  var u=prog.u;gl.uniform3f(u.iResolution,w,h,1);gl.uniform1f(u.iTime,time);
  var c1=rgbF(opts.c1||'@accent'),c2=rgbF(opts.c2||'@bg'),c3=rgbF(opts.c3||'@ink');gl.uniform3f(u.uC1,c1[0],c1[1],c1[2]);gl.uniform3f(u.uC2,c2[0],c2[1],c2[2]);gl.uniform3f(u.uC3,c3[0],c3[1],c3[2]);
  gl.uniform1f(u.uI,opts.i==null?1:+opts.i);gl.uniform1f(u.uProg,opts.prog||0);gl.uniform1f(u.uHasTex,opts.t0?1:0);
  if(opts.t0){glTex(0,opts.t0);gl.uniform1i(u.iChannel0,0)}if(opts.t1){glTex(1,opts.t1);gl.uniform1i(u.iChannel1,1)}
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);return X.c;
}
DK.shader=function(e,b,p,lt){
  var X=glCtx();if(!X){placeholder(b,'WebGL indisponível');return}
  var code=e.code&&e.code.trim()?e.code:(SHADERS[e.preset]||SHADERS.fluid).code,prog=glProgram(code);if(!prog){placeholder(b,'Erro no shader');return}
  var tex=null;if(e.src){var im=getImg(e.src);if(im&&im.complete&&im.naturalWidth)tex=im}
  var T=ctx.getTransform(),sx=Math.hypot(T.a,T.b)||SC,res=Math.min(1,(+e.res||1));
  var out=glRun(prog,b.w*sx*res,b.h*sx*res,lt*(+e.speed||1)+(+e.offset||0),{c1:e.c1,c2:e.c2,c3:e.c3,i:e.intensity,t0:tex});
  ctx.drawImage(out,b.x,b.y,b.w,b.h);
};
/* transições por shader entre a cena anterior e a atual */
function drawShaderTrans(prev,sc,lt,f){
  var X=glCtx(),def=TRANS_SH[sc.trans];if(!X||!def)return false;var prog=glProgram(def.code);if(!prog)return false;
  var A=layerCanvas(2),B=layerCanvas(3),T=ctx.getTransform();
  withCtx(A.getContext('2d'),function(){ctx.setTransform(T);drawScene(prev,prev.dur-.001)});
  withCtx(B.getContext('2d'),function(){ctx.setTransform(T);drawScene(sc,lt,{noAnim:magicNoAnim(sc,P.scenes.indexOf(sc))})});
  var out=glRun(prog,A.width,A.height,lt,{prog:f,t0:A,t1:B});
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(out,0,0,A.width,A.height);ctx.restore();return true;
}

/* ---------- 3D com Three.js (carregado sob demanda) ---------- */
var THREE_LOADING=null,T3={r:null,objs:{}};
function loadThree(){
  if(window.THREE&&window.THREE.GLTFLoader)return Promise.resolve(window.THREE);if(THREE_LOADING)return THREE_LOADING;
  function sc(u){return new Promise(function(res,rej){var s=document.createElement('script');s.src=u;s.onload=res;s.onerror=rej;document.head.appendChild(s)})}
  THREE_LOADING=sc('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js').then(function(){return sc('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js')}).then(function(){redraw();return window.THREE});
  THREE_LOADING.catch(function(){THREE_LOADING=null;T3.err=1;redraw()});
  return THREE_LOADING;
}
function t3Renderer(){var TH=window.THREE;if(!T3.r){T3.r=new TH.WebGLRenderer({antialias:true,alpha:true,preserveDrawingBuffer:true});T3.r.setPixelRatio(1);T3.r.outputEncoding=TH.sRGBEncoding;T3.r.toneMapping=TH.ACESFilmicToneMapping}return T3.r}
function t3Sig(e){return JSON.stringify([e.fmt,e.shape,e.text,e.color,e.metal,e.rough,e.wire,e.src,(e.images||[]).join(','),e.light,e.depth3,e.font,P.theme.accent,P.theme.ink,P.theme.bg])}
function textCanvas(txt,color,font){var c=document.createElement('canvas'),g=c.getContext('2d'),fs=160;g.font='700 '+fs+'px '+family(font||'ui');var w=Math.ceil(g.measureText(txt).width)+40;c.width=Math.max(64,w);c.height=220;g.font='700 '+fs+'px '+family(font||'ui');g.fillStyle=color;g.textBaseline='middle';g.fillText(txt,20,115);return c}
function t3Build(e){
  var TH=window.THREE,scene=new TH.Scene(),cam=new TH.PerspectiveCamera(35,1,.1,100),root=new TH.Group();scene.add(root);
  var L=e.light||'studio',col=new TH.Color(toHex(resolve(e.color)||P.theme.accent));
  scene.add(new TH.AmbientLight(0xffffff,L==='neon'?.25:.45));
  var k=new TH.DirectionalLight(L==='warm'?0xffd9b0:0xffffff,L==='neon'?.6:1.25);k.position.set(3,4,5);scene.add(k);
  var r2=new TH.DirectionalLight(L==='neon'?toHex(resolve('@accent')):0x99bbff,L==='neon'?1.6:.55);r2.position.set(-4,1,-3);scene.add(r2);
  var mat=new TH.MeshStandardMaterial({color:col,metalness:clamp(+e.metal||0,0,1),roughness:clamp(+e.rough||.4,0,1),wireframe:!!e.wire});
  var obj={scene:scene,cam:cam,root:root,ready:true};
  if(e.mode==='text'){
    var txt=sub(e.text||'3D'),front=textCanvas(txt,toHex(resolve(e.color)||'#fff'),e.font),ar=front.width/front.height,h=1.1,w=h*ar,layers=Math.round(clamp(+e.depth3||.5,0,1)*28)+2;
    var side=textCanvas(txt,mixHex(toHex(resolve(e.color)||'#fff'),'#000000',.55),e.font),tf=new TH.CanvasTexture(front),ts=new TH.CanvasTexture(side);tf.encoding=ts.encoding=TH.sRGBEncoding;
    var geo=new TH.PlaneGeometry(w,h),g=new TH.Group();
    for(var i=layers;i>=0;i--){var m=new TH.Mesh(geo,new TH.MeshBasicMaterial({map:i===0?tf:ts,transparent:true,depthWrite:i===0,side:TH.DoubleSide}));m.position.z=-i*.012;g.add(m)}
    g.position.x=0;root.add(g);obj.fit=w;
  }else if(e.mode==='cards'){
    var imgs=(e.images&&e.images.length?e.images:[e.src]).filter(Boolean),n=Math.max(1,imgs.length),R=n>1?1.6+n*.15:0;
    imgs.forEach(function(s,i){var tl=new TH.TextureLoader(),u=srcURL(s);var mt=new TH.MeshBasicMaterial({color:0xffffff,side:TH.DoubleSide});var mesh=new TH.Mesh(new TH.PlaneGeometry(1.6,1.0),mt);
      if(u)tl.load(u,function(tx){tx.encoding=TH.sRGBEncoding;mt.map=tx;mt.needsUpdate=true;var im=tx.image;if(im&&im.width)mesh.scale.set(1,(im.height/im.width)*1.6/1.0,1);redraw()});
      var a=i/n*Math.PI*2;mesh.position.set(Math.sin(a)*R,0,Math.cos(a)*R);mesh.rotation.y=a;root.add(mesh)});
    if(!imgs.length){root.add(new TH.Mesh(new TH.PlaneGeometry(1.6,1),new TH.MeshBasicMaterial({color:0x888888})))}
  }else if(e.mode==='model'&&e.src){
    obj.ready=false;var u=srcURL(e.src),fmt=e.fmt||'glb',files=e.files||{};
    var mgr=new TH.LoadingManager();mgr.setURLModifier(function(x){var k=String(x).split('/').pop().split('?')[0];try{k=decodeURIComponent(k)}catch(q){}return files[k]?srcURL(files[k]):x});
    function place(m){var box=new TH.Box3().setFromObject(m),size=box.getSize(new TH.Vector3()),c=box.getCenter(new TH.Vector3()),s=2.2/Math.max(size.x,size.y,size.z,1e-3);m.position.sub(c.multiplyScalar(s));m.scale.setScalar(s);root.add(m);obj.ready=true;redraw()}
    function fail(){obj.err=1;redraw()}
    if(fmt==='obj'){threeExtra(['OBJLoader','MTLLoader']).then(function(){return fetch(u).then(function(r){return r.text()})}).then(function(txt){var ml=/^mtllib\s+(.+)$/m.exec(txt),mk=ml&&ml[1].trim().split('/').pop();
      var go=function(mats){var L=new TH.OBJLoader(mgr);if(mats)L.setMaterials(mats);var g=L.parse(txt);if(!mats)g.traverse(function(o){if(o.isMesh)o.material=mat});place(g)};
      if(mk&&files[mk])return fetch(srcURL(files[mk])).then(function(r){return r.text()}).then(function(mt){var m=new TH.MTLLoader(mgr).parse(mt,'');m.preload();go(m)});go(null)}).catch(fail)}
    else if(fmt==='fbx'){threeExtra(['fflate','NURBSUtils','NURBSCurve','FBXLoader']).then(function(){return fetchBin(u)}).then(function(ab){place(new TH.FBXLoader(mgr).parse(ab,''))}).catch(fail)}
    else if(fmt==='gltf'){fetch(u).then(function(r){return r.text()}).then(function(txt){new TH.GLTFLoader(mgr).parse(txt,'',function(gl){place(gl.scene)},fail)}).catch(fail)}
    else fetchBin(u).then(function(ab){new TH.GLTFLoader(mgr).parse(ab,'',function(gl){place(gl.scene)},fail)}).catch(fail);
  }else{
    var gm={box:function(){return new TH.BoxGeometry(1.5,1.5,1.5,1,1,1)},sphere:function(){return new TH.SphereGeometry(1.05,64,32)},torus:function(){return new TH.TorusGeometry(.95,.36,48,128)},icosa:function(){return new TH.IcosahedronGeometry(1.15,0)},cylinder:function(){return new TH.CylinderGeometry(.8,.8,1.6,64)},cone:function(){return new TH.ConeGeometry(.95,1.7,64)},torusKnot:function(){return new TH.TorusKnotGeometry(.8,.28,200,32)}}[e.shape]||function(){return new TH.TorusKnotGeometry(.8,.28,200,32)};
    root.add(new TH.Mesh(gm(),mat));
  }
  return obj;
}
DK.three=function(e,b,p,lt){
  var TH=window.THREE;if(!TH||!TH.GLTFLoader){loadThree();placeholder(b,T3.err?'3D indisponível':'Carregando 3D');return}
  var sig=t3Sig(e),o=T3.objs[e.id];if(!o||o.sig!==sig){o=t3Build(e);o.sig=sig;T3.objs[e.id]=o}
  if(o.err){placeholder(b,'Não foi possível abrir o modelo');return}
  var T=ctx.getTransform(),sx=Math.hypot(T.a,T.b)||SC,w=Math.max(2,Math.min(2048,Math.round(b.w*sx))),h=Math.max(2,Math.min(2048,Math.round(b.h*sx)));
  var r=t3Renderer();r.setSize(w,h,false);o.cam.aspect=w/h;o.cam.updateProjectionMatrix();
  var ev=evalEl(e,lt+(+e.start||0)),orb=(+e.orbit||0)*Math.PI/180*(lt/Math.max(.1,curSceneDurFor(e))),dist=+ev.dist3||5;
  if(o.fit&&e.mode==='text')dist=Math.max(dist,o.fit*1.25);
  o.cam.position.set(Math.sin(orb)*dist,(+e.camY||0),Math.cos(orb)*dist);o.cam.lookAt(0,0,0);
  o.root.rotation.set((+ev.rx3||0)*Math.PI/180,((+ev.ry3||0)+(+e.spin||0)*36*lt)*Math.PI/180,0);
  if(e.mode==='cards')o.root.rotation.y+=(+e.spin||0)*.0;
  r.setClearColor(0x000000,0);r.render(o.scene,o.cam);
  ctx.drawImage(r.domElement,b.x,b.y,b.w,b.h);
};
function curSceneDurFor(e){for(var i=0;i<P.scenes.length;i++)if(P.scenes[i].els.indexOf(e)>=0||P.scenes[i].els.some(function(x){return x.id===e.id}))return P.scenes[i].dur;return 5}

/* ---------- câmera virtual ---------- */
function camAt(sc,lt){
  var c=sc.cam;if(!c||!c.on)return null;var f=easeFn(c.ease)(clamp(lt/Math.max(.01,sc.dur),0,1));
  return {z:Math.max(.2,lerp(+c.z0||1,+c.z1||1,f)),cx:lerp(+c.x0,+c.x1,f)*PW,cy:lerp(+c.y0,+c.y1,f)*PH};
}
function applyCam(cm){if(!cm)return;ctx.translate(PW/2,PH/2);ctx.scale(cm.z,cm.z);ctx.translate(-cm.cx,-cm.cy)}
function camFwd(cm,x,y){if(!cm)return {x:x,y:y};return {x:(x-cm.cx)*cm.z+PW/2,y:(y-cm.cy)*cm.z+PH/2}}
function camInv(cm,x,y){if(!cm)return {x:x,y:y};return {x:(x-PW/2)/cm.z+cm.cx,y:(y-PH/2)/cm.z+cm.cy}}

/* ---------- Magic Move ---------- */
function mmPairs(prev,sc){
  var byName={},pairs={},used={};
  prev.els.forEach(function(e){if(e.name)byName[e.name+'|'+e.kind]=e});
  sc.els.forEach(function(e){if(!e.name)return;var p=byName[e.name+'|'+e.kind];if(p&&!used[p.id]){pairs[e.id]=p;used[p.id]=1}});
  return {pairs:pairs,used:used};
}
function lerpEl(A,B,f){
  var r=Object.assign({},B);
  ['x','y','w','h','rot','scale','opacity','size','radius','strokeW','spacing'].forEach(function(k){if(isFinite(+A[k])&&isFinite(+B[k]))r[k]=lerp(+A[k],+B[k],f)});
  ['fill','color','stroke','textColor'].forEach(function(k){var a=resolve(A[k]),b=resolve(B[k]);if(a&&b&&a[0]==='#'&&b[0]==='#')r[k]=mixHex(a,b,f);else if(b)r[k]=f<.5&&a?a:b});
  return r;
}
function drawSceneEls(sc,lt,o){
  o=o||{};
  var hs=HTML_SPLIT&&HTML_SPLIT.sc===sc?HTML_SPLIT.k:1e9;
  sc.els.forEach(function(e,i){if(i>hs)return;if(o.skip&&o.skip[e.id])return;if(!!e.fixed!==!!o.fixedPass)return;drawEl(e,lt,sc,{noAnim:o.noAnim&&o.noAnim[e.id],alpha:o.alpha})});
}
function drawLogo(){
  var B=P.brand;if(!B||!B.logoOn||!B.logo)return;var im=getImg(B.logo);if(!im||!im.complete||!im.naturalWidth)return;
  var h=clamp(+B.logoSize||80,16,400)*Math.min(PW,PH)/720,w=h*im.naturalWidth/im.naturalHeight,m=Math.min(PW,PH)*.045,x=B.logoPos.indexOf('l')>=0?m:PW-m-w,y=B.logoPos.indexOf('t')>=0?m:PH-m-h;
  ctx.save();ctx.globalAlpha=.95;ctx.drawImage(im,x,y,w,h);ctx.restore();
}
function drawScene(sc,lt,o){
  o=o||{};
  ctx.fillStyle=o.bg||resolve(sc.bg)||'#fff';ctx.fillRect(0,0,PW,PH);
  ctx.save();var shk=sceneShake(sc,lt);if(shk){ctx.translate(PW/2+shk[0],PH/2+shk[1]);ctx.rotate(shk[2]);ctx.translate(-PW/2,-PH/2)}applyCam(camAt(sc,lt));drawSceneEls(sc,lt,o);ctx.restore();
  if(sc.els.some(function(e){return e.fixed}))drawSceneEls(sc,lt,Object.assign({},o,{fixedPass:true}));
  drawSceneFx(sc,lt);
}
function magicNoAnim(sc,i){if(sc.trans!=='magic'||i<1)return null;return mmPairs(P.scenes[i-1],sc).pairs}
function drawFrame(tt){
  ctx.setTransform(SC,0,0,SC,0,0);ctx.globalAlpha=1;if(ctx.setLineDash)ctx.setLineDash([]);
  GT=tt;var a=sceneAt(tt),sc=P.scenes[a.i],prev=a.i>0?P.scenes[a.i-1]:null;
  if(prev&&TRANS_X[sc.trans]&&a.lt<TRANS_X[sc.trans]&&drawTransX(prev,sc,a.lt)){
    /* transição extra desenhada */
  }else if(prev&&sc.trans==='magic'&&a.lt<MM){
    var f=E.inout(a.lt/MM),mm=mmPairs(prev,sc),pl=prev.dur-.001;
    var bgc=mixHex(toHex(resolve(prev.bg)),toHex(resolve(sc.bg)),f);
    ctx.fillStyle=bgc;ctx.fillRect(0,0,PW,PH);
    var cmP=camAt(prev,pl),cmC=camAt(sc,a.lt);
    ctx.save();applyCam(cmP);prev.els.forEach(function(e){if(!mm.used[e.id])drawEl(e,pl,prev,{alpha:1-f})});ctx.restore();
    ctx.save();applyCam(cmC);
    sc.els.forEach(function(e){
      var p=mm.pairs[e.id];
      if(!p){drawEl(e,a.lt,sc);return}
      var A=evalEl(p,pl),B=evalEl(e,Math.max(a.lt,win(e,sc)[0]));
      var M=lerpEl(A,B,f),same=(e.kind!=='text'||sub(p.text)===sub(e.text));
      if(e.kind==='counter'){drawEl(e,a.lt,sc,{noAnim:true,ignoreWin:true,ev:M,val:lerp(num(p.to),num(e.to),f)});return}
      if(same)drawEl(e,a.lt,sc,{noAnim:true,ignoreWin:true,ev:M});
      else{var Mo=Object.assign({},M,{text:p.text});drawEl(p,pl,prev,{noAnim:true,ignoreWin:true,ev:Mo,alpha:1-f});drawEl(e,a.lt,sc,{noAnim:true,ignoreWin:true,ev:M,alpha:f})}
    });
    ctx.restore();
  }else if(prev&&sc.trans&&sc.trans.indexOf('sh-')===0&&a.lt<TR*1.6&&drawShaderTrans(prev,sc,a.lt,E.inout(a.lt/(TR*1.6)))){
    /* transição por shader desenhada */
  }else if(prev&&sc.trans&&sc.trans!=='none'&&sc.trans!=='magic'&&sc.trans.indexOf('sh-')!==0&&!TRANS_X[sc.trans]&&a.lt<TR){
    var e2=E.inout(a.lt/TR);drawScene(prev,prev.dur-.001);
    ctx.save();
    if(sc.trans==='fade'){ctx.globalAlpha=e2;drawScene(sc,a.lt)}
    else if(sc.trans==='slide'){ctx.translate(PW*(1-e2),0);drawScene(sc,a.lt)}
    else{var x=PW*(1-e2);ctx.beginPath();ctx.rect(x,0,PW-x,PH);ctx.clip();ctx.translate(x*.1,0);drawScene(sc,a.lt)}
    ctx.restore();
  }else{
    HTML_SPLIT=null;if(ctx.canvas===cv&&!exporting){var hk=htmlIndex(sc,a.lt);if(hk>=0)HTML_SPLIT={sc:sc,k:hk}}
    drawScene(sc,a.lt,{noAnim:magicNoAnim(sc,a.i)});
  }
  drawRefGhost(sc);
  if(HTML_SPLIT){drawTopLayer(sc,a.lt,tt);HTML_SPLIT=null}else{drawLogo();drawCaptions(tt)}
}
/* Desenha qualquer projeto em qualquer canvas (comparação de versões, miniaturas) */
function renderWith(proj,canvas,tt,scale){
  var s={P:P,PW:PW,PH:PH,SC:SC,ctx:ctx};
  try{P=proj;PW=proj.w;PH=proj.h;SC=scale;ctx=canvas.getContext('2d');drawFrame(tt)}
  finally{P=s.P;PW=s.PW;PH=s.PH;SC=s.SC;ctx=s.ctx}
}

/* =========================================================
   Áudio: trilhas, mixagem, forma de onda e batidas
   ========================================================= */
var AE={ctx:null,master:null,buffers:{},peaks:{},sources:[],loading:{}};
function aeInit(){
  if(AE.ctx)return AE.ctx;var C=window.AudioContext||window.webkitAudioContext;if(!C)return null;
  try{AE.ctx=new C();AE.master=AE.ctx.createGain();AE.master.connect(AE.ctx.destination);if(typeof applyVol==='function')applyVol()}catch(x){AE.ctx=null;return null}
  for(var k in VIDS)connectVid(VIDS[k]);
  return AE.ctx;
}
function connectVid(c){
  if(!AE.ctx||c.g)return;
  try{var s=AE.ctx.createMediaElementSource(c.v);c.g=AE.ctx.createGain();s.connect(c.g);c.g.connect(AE.master)}catch(x){}
}
function computePeaks(buf,n){
  n=n||1200;var ch=buf.getChannelData(0),ch2=buf.numberOfChannels>1?buf.getChannelData(1):null,step=Math.max(1,Math.floor(ch.length/n)),out=new Float32Array(n);
  for(var i=0;i<n;i++){var m=0,s0=i*step,s1=Math.min(ch.length,s0+step);for(var j=s0;j<s1;j+=4){var v=Math.abs(ch[j]);if(ch2)v=(v+Math.abs(ch2[j]))/2;if(v>m)m=v}out[i]=m}
  return out;
}
function detectBeats(buf){
  var sr=buf.sampleRate,ch=buf.getChannelData(0),hop=512,nF=Math.floor(ch.length/hop),env=new Float32Array(nF),prev=0;
  for(var i=0;i<nF;i++){var s=0,o=i*hop;for(var j=0;j<hop;j++){var v=ch[o+j]||0;s+=v*v}var e=Math.log(1e-6+Math.sqrt(s/hop));var d=e-prev;env[i]=d>0?d:0;prev=e}
  var fps=sr/hop,minLag=Math.round(fps*60/180),maxLag=Math.round(fps*60/70),best=0,bestLag=minLag;
  var lim=Math.min(nF,Math.round(fps*60));
  for(var L=minLag;L<=maxLag;L++){var acc=0;for(var k=0;k+L<lim;k++)acc+=env[k]*env[k+L];var w=1-.25*Math.abs(Math.log2((60*fps/L)/120));acc*=w;if(acc>best){best=acc;bestLag=L}}
  var period=bestLag/fps,bpm=Math.round(60/period);
  var bestOff=0,bestS=-1;
  for(var off=0;off<bestLag;off++){var sc=0;for(var q=off;q<Math.min(nF,lim*2);q+=bestLag)sc+=env[q];if(sc>bestS){bestS=sc;bestOff=off}}
  var beats=[];for(var tt=bestOff/fps;tt<buf.duration;tt+=period)beats.push(Math.round(tt*100)/100);
  return {bpm:bpm,beats:beats.slice(0,2000)};
}
function trackURL(tr){return srcURL(tr.src)}
function loadTrack(tr){
  if(AE.buffers[tr.id]||AE.loading[tr.id])return;
  var url=trackURL(tr);if(!url)return;
  var c=aeInit();if(!c)return;AE.loading[tr.id]=1;
  fetchBin(url)
  .then(function(ab){return new Promise(function(res,rej){c.decodeAudioData(ab,res,rej)})})
  .then(function(buf){setTrackBuffer(tr,buf)})
  .catch(function(){AE.loading[tr.id]=0;toast('Não foi possível carregar a trilha “'+tr.name+'”.')});
}
function setTrackBuffer(tr,buf){
  AE.buffers[tr.id]=buf;AE.peaks[tr.id]=computePeaks(buf);AE.loading[tr.id]=0;tr._dur=buf.duration;
  if(!tr.beats||!tr.beats.length){var r=detectBeats(buf);tr.bpm=r.bpm;tr.beats=r.beats;commit(true)}
  renderAudioLane();if(playing)aeStart(t);
}
function loadAllAudio(){if(!P)return;P.audio.forEach(loadTrack)}
function aeStop(){AE.sources.forEach(function(s){try{s.stop()}catch(x){}});AE.sources=[]}
function aeStart(at){
  aeStop();var c=AE.ctx;if(!c||!P.audio.length)return;
  if(c.state==='suspended')c.resume();
  AE.sources=schedTracks(c,AE.master,at,c.currentTime+.04);
}
/* agenda as trilhas num contexto de áudio (ao vivo ou offline) */
function schedTracks(c,out,at,now){
  var tot=total(),list=[];
  P.audio.forEach(function(tr){
    var buf=AE.buffers[tr.id];if(!buf||tr.muted)return;
    var off0=Math.max(0,+tr.offset||0),tl0=+tr.start||0,tl1=Math.min(tot,tl0+buf.duration-off0);if(+tr.dur>0)tl1=Math.min(tl1,tl0+(+tr.dur));if(at>=tl1||tl1<=tl0)return;
    var from=Math.max(at,tl0),startIn=from-at,off=off0+(from-tl0),dur=tl1-from;
    var src=c.createBufferSource();src.buffer=buf;var g=c.createGain(),vol=clamp(+tr.vol,0,2),fi=Math.max(0,+tr.fadeIn||0),fo=Math.max(0,+tr.fadeOut||0);
    function gv(T){var v=vol;if(fi>0&&T<tl0+fi)v*=clamp((T-tl0)/fi,0,1);if(fo>0&&T>tl1-fo)v*=clamp((tl1-T)/fo,0,1);return v}
    g.gain.setValueAtTime(gv(from),now+startIn);
    if(fi>0&&from<tl0+fi)g.gain.linearRampToValueAtTime(gv(tl0+fi),now+startIn+(tl0+fi-from));
    if(fo>0){var fs=Math.max(from,tl1-fo);g.gain.setValueAtTime(gv(fs),now+startIn+(fs-from));g.gain.linearRampToValueAtTime(0,now+startIn+dur)}
    src.connect(g);g.connect(out);src.start(now+startIn,off,dur);list.push({src:src,gain:g,out:out,tr:tr,t0:tl0,t1:tl1});
  });
  try{applyDucking(c,list,at,now)}catch(x){}
  return list.map(function(x){x.src.meta=x;return x.src});
}
function allBeats(){var out=[];P.audio.forEach(function(tr){(tr.beats||[]).forEach(function(b){var T=(+tr.start||0)+b-(+tr.offset||0);if(T>=0)out.push(T)})});return out.sort(function(a,b){return a-b})}
function snapToBeats(){
  var beats=allBeats();if(beats.length<2)return false;
  var acc=0,prevB=0;
  P.scenes.forEach(function(s,i){
    if(i===P.scenes.length-1)return;
    acc+=s.dur;var best=beats.reduce(function(b,x){return Math.abs(x-acc)<Math.abs(b-acc)?x:b},beats[0]);
    if(best-prevB<1){var nx=beats.filter(function(x){return x-prevB>=1})[0];if(nx!=null)best=nx}
    s.dur=Math.max(.5,Math.round((best-prevB)*100)/100);prevB=best;acc=best;
  });
  return true;
}
