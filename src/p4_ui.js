/* =========================================================
   Palco: desenho, sobreposição, seleção e arrasto
   ========================================================= */
var stage=$('#stage'),ov=$('#ov'),selbox=$('#selbox'),HL=null,CUR_FMT='16:9';
function fmtClock(x){x=Math.max(0,x||0);var m=Math.floor(x/60),s=Math.floor(x-m*60);return m+':'+(s<10?'0':'')+s}
function applySize(){PW=P.w||1280;PH=P.h||720;SC=Math.min(1.5,1920/Math.max(PW,PH));cv.width=Math.round(PW*SC);cv.height=Math.round(PH*SC);stage.style.setProperty('--ar',(PW/PH).toFixed(4));
  var f=Object.keys(FORMATS).filter(function(k){return FORMATS[k][0]===PW&&FORMATS[k][1]===PH})[0];CUR_FMT=f||''}
function draw(){if(!P)return;drawFrame(t);updateOverlay();try{hfSync()}catch(x){}}
function curLt(){return sceneAt(t).lt}
function updateOverlay(){
  var a=sceneAt(t),sc=P.scenes[a.i],e=findEl(selEl,sc)||findEl(HL,sc);
  selbox.classList.toggle('hl',!findEl(selEl,sc)&&!!e);
  if(e&&!exporting&&a.i===selScene){
    var ev=evalEl(e,a.lt),b=bbox(ev),cm=camAt(sc,a.lt),p0=camFwd(cm,b.x,b.y),z=cm?cm.z:1;
    selbox.hidden=false;selbox.classList.toggle('kf',hasKf(e));
    selbox.style.left=(p0.x/PW*100)+'%';selbox.style.top=(p0.y/PH*100)+'%';selbox.style.width=(b.w*z/PW*100)+'%';selbox.style.height=(b.h*z/PH*100)+'%';
    selbox.style.transform='rotate('+(+ev.rot||0)+'deg) scale('+(+ev.scale||1)+')';
  }else selbox.hidden=true;
  /* caminho de movimento */
  var svg=$('#mpath'),h='';
  if(e&&e.kf&&(e.kf.x||e.kf.y)&&!exporting){
    var ks=[].concat(e.kf.x||[],e.kf.y||[]).map(function(k){return k.t}),t0=Math.min.apply(null,ks),t1=Math.max.apply(null,ks),pts=[],cm2=camAt(sc,a.lt);
    if(t1>t0){for(var i=0;i<=40;i++){var tt=t0+(t1-t0)*i/40,ev2=evalEl(e,tt),b2=bbox(ev2),q=camFwd(cm2,b2.x+b2.w/2,b2.y+b2.h/2);pts.push((q.x/PW*100).toFixed(2)+','+(q.y/PH*100).toFixed(2))}
      h+='<polyline points="'+pts.join(' ')+'" fill="none" stroke="#E0A21B" stroke-width="0.35" stroke-dasharray="1 .8" vector-effect="non-scaling-stroke" style="stroke-width:2px"/>';
      Array.from(new Set(ks)).forEach(function(kt){var ev3=evalEl(e,kt),b3=bbox(ev3),q3=camFwd(cm2,b3.x+b3.w/2,b3.y+b3.h/2);h+='<rect x="'+(q3.x/PW*100-.5)+'" y="'+(q3.y/PH*100-.5*PW/PH)+'" width="1" height="'+(PW/PH)+'" fill="#E0A21B" transform="rotate(45 '+(q3.x/PW*100)+' '+(q3.y/PH*100)+')"/>'});
    }
  }
  if(svg.dataset.h!==h){svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');svg.innerHTML=h;svg.dataset.h=h}
  /* pins de comentário */
  var ph='';
  COMMENTS.forEach(function(c,i){if(Math.abs(c.t-t)<1.5||tool==='comment')ph+='<button class="pin'+(c.done?' done':'')+'" data-c="'+esc(c.id)+'" style="left:'+(c.x*100)+'%;top:'+(c.y*100)+'%" aria-label="Comentário '+(i+1)+'"><span>'+(i+1)+'</span></button>'});
  if(pendingC)ph+='<span class="pin" style="left:'+(pendingC.x*100)+'%;top:'+(pendingC.y*100)+'%"><span>+</span></span>';
  var pins=$('#pins');if(pins.dataset.h!==ph){pins.innerHTML=ph;pins.dataset.h=ph}
}
function toProj(ev){var r=stage.getBoundingClientRect(),sc=curScene(),cm=camAt(sc,curLt());var x=(ev.clientX-r.left)/r.width*PW,y=(ev.clientY-r.top)/r.height*PH;var q=camInv(cm,x,y);return {x:q.x,y:q.y,sx:x,sy:y,r:r,z:cm?cm.z:1}}
/* caixa de clique considerando escala e esticar */
function hitBox(e,lt){var ev=evalEl(e,lt),b=bbox(ev),s=(+ev.scale||1),sx=s*(ev.sx==null?1:+ev.sx),sy=s*(ev.sy==null?1:+ev.sy),ay=e.ay==null?.5:+e.ay,cx=b.x+b.w/2,cy=b.y+b.h*ay;
  return {x:cx+(b.x-cx)*sx,y:cy+(b.y-cy)*sy,w:b.w*sx,h:b.h*sy}}
/* camadas de fundo/moldura que cobrem a tela: só são escolhidas se nada mais estiver embaixo do clique */
function isBackdrop(e,b){return e.kind==='hud'||e.kind==='pattern'||(b.w*b.h>=PW*PH*.8)}
function hitAll(px,py){
  var a=sceneAt(t);if(a.i!==selScene)return [];var sc=curScene(),out=[];
  for(var i=sc.els.length-1;i>=0;i--){var e=sc.els[i];if(e.locked||!isVisible(e,sc,a.lt))continue;var b=hitBox(e,a.lt),m=6;if(px>=b.x-m&&px<=b.x+b.w+m&&py>=b.y-m&&py<=b.y+b.h+m)out.push({e:e,bd:isBackdrop(e,b)})}
  return out;
}
var lastHit={x:-99,y:-99};
function hitTest(px,py,cycle){
  var all=hitAll(px,py);if(!all.length)return null;
  var order=all.filter(function(h){return !h.bd}).concat(all.filter(function(h){return h.bd})).map(function(h){return h.e});
  var same=Math.abs(px-lastHit.x)<5&&Math.abs(py-lastHit.y)<5;lastHit={x:px,y:py};
  if(cycle||same){var k=order.findIndex(function(e){return e.id===selEl});if(k>=0)return order[(k+1)%order.length];if(cycle)return order[0]}
  return all[0]&&order[0]&&!all.every(function(h){return h.bd})?order[0]:null;
}
/* escreve uma propriedade animável: keyframe se a propriedade já tem keyframes ou se a gravação está ligada */
function writeProp(e,prop,v){
  if(ANIMATABLE.indexOf(prop)>=0&&((e.kf&&e.kf[prop]&&e.kf[prop].length)||recKf)){setKey(e,prop,curLt(),v);return}
  e[prop]=v;
}
function setKey(e,prop,lt,v){
  lt=Math.round(lt*20)/20;e.kf=e.kf||{};var arr=e.kf[prop]||(e.kf[prop]=[]);
  if(!arr.length&&Math.abs(lt-(+e.start||0))>.05)arr.push({t:Math.round((+e.start||0)*100)/100,v:isFinite(+e[prop])?+e[prop]:0,e:'inout'});
  for(var i=0;i<arr.length;i++){if(Math.abs(arr[i].t-lt)<.03){arr[i].v=v;return}}
  arr.push({t:lt,v:v,e:'inout'});arr.sort(function(a,b){return a.t-b.t});
}
function keyAt(e,prop,lt){var arr=e.kf&&e.kf[prop];if(!arr)return -1;for(var i=0;i<arr.length;i++)if(Math.abs(arr[i].t-lt)<.03)return i;return -1}
var drag=null;
ov.addEventListener('dblclick',function(ev){var e=findEl(selEl);if(!e)return;setTimeout(function(){var f=document.getElementById('f-el-text')||document.querySelector('#pane [data-o="el"]');if(f){f.focus();if(f.select)f.select();f.scrollIntoView({block:'center'})}},30)});
ov.addEventListener('pointerdown',function(ev){
  if(ev.target.closest('.cpop')||ev.target.closest('.pin'))return;
  var pt=toProj(ev);
  if(ev.target.id==='hnd'){var e0=findEl(selEl);if(!e0)return;var b0=bbox(evalEl(e0,curLt()));drag={mode:'resize',id:e0.id,sx:ev.clientX,sy:ev.clientY,r:pt.r,z:pt.z,ow:b0.w,oh:b0.h,moved:false};ov.setPointerCapture(ev.pointerId);ev.preventDefault();return}
  var a=sceneAt(t);if(a.i!==selScene){changeScene(a.i)}
  var hit=hitTest(pt.x,pt.y,ev.altKey);
  if(tool==='comment'){pendingC={x:clamp(pt.sx/PW,.01,.99),y:clamp(pt.sy/PH,.02,.99),t:t,el:hit?hit.id:null,scene:curScene().id};openComposer(hit);updateOverlay();return}
  if(hit){
    selEl=hit.id;selKf=null;selTrack=null;if(tab!=='tweaks')tab='tweaks';openTweaks(true);renderPanel();renderLayers();
    var evv=evalEl(hit,curLt());drag={mode:'move',id:hit.id,sx:ev.clientX,sy:ev.clientY,r:pt.r,z:pt.z,ox:evv.x,oy:evv.y,moved:false};ov.setPointerCapture(ev.pointerId);
  }else{selEl=null;selKf=null;renderPanel();renderLayers()}
  draw();
});
ov.addEventListener('pointermove',function(ev){
  if(!drag)return;var e=findEl(drag.id);if(!e)return;
  var dx=(ev.clientX-drag.sx)/drag.r.width*PW/drag.z,dy=(ev.clientY-drag.sy)/drag.r.height*PH/drag.z;
  if(Math.abs(dx)+Math.abs(dy)>2)drag.moved=true;if(!drag.moved)return;
  if(drag.mode==='move'){var nx=Math.round(drag.ox+dx),ny=Math.round(drag.oy+dy);
    if(!ev.altKey){var b=bbox(evalEl(e,curLt()));[[0,0],[PW/2-b.w/2,1],[PW-b.w,2]].forEach(function(s){if(Math.abs(nx-s[0])<8)nx=Math.round(s[0])});[[PH/2-b.h/2]].forEach(function(s){if(Math.abs(ny-s[0])<8)ny=Math.round(s[0])})}
    writeProp(e,'x',nx);writeProp(e,'y',ny)}
  else{writeProp(e,'w',Math.max(20,Math.round(drag.ow+dx)));if(e.kind==='shape'||e.kind==='image'||e.kind==='video'||e.kind==='chart')writeProp(e,'h',Math.max(8,Math.round(drag.oh+dy)))}
  syncGeo(e);draw();
});
function endDrag(){if(drag){var m=drag.moved;drag=null;if(m){commit();renderLayers();renderPanel();renderCode(false)}}}
ov.addEventListener('pointerup',endDrag);ov.addEventListener('pointercancel',endDrag);
function syncGeo(e){var ev=evalEl(e,curLt());['x','y','w','h'].forEach(function(k){var i=document.querySelector('#pane input[data-o="el"][data-p="'+k+'"]');if(i&&document.activeElement!==i)i.value=Math.round(ev[k]||0)})}
$('#pins').addEventListener('click',function(ev){var b=ev.target.closest('.pin');if(!b||!b.dataset.c)return;setTab('comments');setTimeout(function(){var n=document.getElementById('cm-'+b.dataset.c);if(n){n.scrollIntoView({block:'nearest'});n.style.outline='2px solid var(--accent)';setTimeout(function(){n.style.outline=''},1200)}},30)});

/* =========================================================
   Linha do tempo: cenas, trilha de áudio, camadas e keyframes
   ========================================================= */
function renderStrip(){
  var tot=total(),a=sceneAt(t);
  $('#blocks').innerHTML=P.scenes.map(function(s,i){var on=i===selScene;return '<div class="blk'+(on?' on':'')+'" style="flex:'+(+s.dur||1)+' 1 0" data-si="'+i+'" title="'+esc(s.name)+(s.trans==='magic'&&i>0?' · Magic Move':'')+(s.cam&&s.cam.on?' · câmera':'')+'"><b>'+esc(s.name||'Cena')+'</b><i>· '+(Math.round(s.dur*10)/10).toFixed(1)+' s</i>'+(on?'<button class="more" data-more="'+i+'" aria-label="Opções da cena" aria-expanded="'+(!$('#scenePop').hidden&&SPOP===i)+'">'+IC.dots+'</button>':'')+'</div>'}).join('')+'<button class="addblk" id="addBlk" title="Adicionar cena" aria-label="Adicionar cena">'+IC.plus+'</button>';
  var step=tot>90?20:tot>40?10:5,rl='';for(var x=0;x<=tot+.001;x+=step)rl+='<span style="left:'+(x/tot*100)+'%">'+fmtClock(x)+'</span>';
  var rs=curScene(),rstep=rs.dur>12?2:rs.dur>6?1:.5;rl='';for(var y=0;y<=rs.dur+.001;y+=rstep)rl+='<span style="left:'+(y/rs.dur*100)+'%">'+(Math.round(y*10)/10).toLocaleString('pt-BR')+'s</span>';
  $('#ruler').innerHTML=rl;
  $('#cpins').innerHTML=COMMENTS.map(function(c){return '<span class="cpin'+(c.done?' done':'')+'" style="left:'+(clamp(c.t/tot,0,1)*100)+'%"></span>'}).join('')+(P.markers||[]).map(function(m){return '<span class="mpin" style="left:'+(clamp(m.t/tot,0,1)*100)+'%" title="'+esc(m.label)+' · '+fmtClock(m.t)+'"><b>'+esc(m.label)+'</b></span>'}).join('');
  $('#metaTxt').textContent='· cena '+(selScene+1)+' de '+P.scenes.length+' · '+PW+'×'+PH+' · '+fmtS(tot)+' no total';
  renderAudioLane();updateHead();
}
var TRANS_NAME={wipe:'Cortina',fade:'Dissolver',slide:'Deslizar',magic:'Magic Move',none:'Nenhuma'};
function renderAudioLane(){
  var lane=$('#alane');if(!lane)return;
  if(!P.audio.length){lane.style.height='';lane.innerHTML='<div class="empty2">'+IC.audio+'<span>Sem trilha sonora. Adicione um áudio em <b>Mídia</b> para ver a forma de onda e as batidas aqui.</span></div>';return}
  var rowH=30,H=P.audio.length*rowH;lane.style.height=H+'px';
  var c=lane.querySelector('canvas');if(!c){lane.innerHTML='<canvas aria-label="Trilhas de áudio"></canvas>';c=lane.querySelector('canvas')}
  var W=lane.clientWidth||600,dpr=window.devicePixelRatio||1;c.width=Math.round(W*dpr);c.height=Math.round(H*dpr);
  var g=c.getContext('2d');g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,W,H);
  var cs=getComputedStyle(document.documentElement),col=cs.getPropertyValue('--audio').trim()||'#3C7C8C',fg=cs.getPropertyValue('--fg').trim()||'#222',tot=total();
  P.audio.forEach(function(tr,i){
    var y0=i*rowH,pk=AE.peaks[tr.id],buf=AE.buffers[tr.id],len=buf?buf.duration-(+tr.offset||0):(tr._dur||20),x0=(+tr.start||0)/tot*W,x1=Math.min(W,((+tr.start||0)+len)/tot*W);
    if(+tr.dur>0)x1=Math.min(x1,((+tr.start||0)+(+tr.dur))/tot*W);g.globalAlpha=tr.muted?.35:1;
    g.fillStyle=hexA(toHex(col),selTrack===tr.id?.28:.14);g.fillRect(x0,y0+2,Math.max(2,x1-x0),rowH-4);
    if(pk&&buf){g.fillStyle=col;var mid=y0+rowH/2;for(var x=Math.max(0,Math.floor(x0));x<x1;x++){var tt=((x/W)*tot-(+tr.start||0)+(+tr.offset||0))/buf.duration,idx=Math.floor(tt*pk.length);if(idx<0||idx>=pk.length)continue;var h=Math.max(1,pk[idx]*(rowH-8)*clamp(+tr.vol,0,1.5));g.fillRect(x,mid-h/2,1,h)}}
    else{g.fillStyle=hexA(toHex(fg),.5);g.font='12px system-ui';g.fillText('Carregando…',x0+8,y0+19)}
    if(tr.beats&&tr.beats.length){g.fillStyle=hexA(toHex(fg),.45);tr.beats.forEach(function(b,bi){var T=(+tr.start||0)+b-(+tr.offset||0);if(T<0||T>tot)return;var bx=T/tot*W;g.fillRect(bx,y0+2,1,bi%4===0?8:4)})}
    g.fillStyle=fg;g.font='600 11px system-ui';g.fillText((tr.name||'Trilha')+(tr.muted?' · desligada':'')+(tr.bpm?' · '+tr.bpm+' bpm':''),Math.max(4,x0+6),y0+rowH-7);g.globalAlpha=1;
  });
}
var adrag=null;
$('#alane').addEventListener('pointerdown',function(ev){
  if(!P.audio.length)return;var r=this.getBoundingClientRect(),i=Math.floor((ev.clientY-r.top)/30),tr=P.audio[i];if(!tr)return;
  selTrack=tr.id;selEl=null;selKf=null;renderPanel();renderLayers();renderAudioLane();
  adrag={tr:tr,x0:ev.clientX,s0:+tr.start||0,w:r.width,moved:false};this.setPointerCapture(ev.pointerId);
});
$('#alane').addEventListener('pointermove',function(ev){if(!adrag)return;var d=(ev.clientX-adrag.x0)/adrag.w*total();if(Math.abs(d)>.05)adrag.moved=true;adrag.tr.start=Math.max(0,Math.round((adrag.s0+d)*10)/10);renderAudioLane()});
function endA(){if(adrag){if(adrag.moved){commit();renderPanel();if(playing)aeStart(t)}adrag=null}}
$('#alane').addEventListener('pointerup',endA);$('#alane').addEventListener('pointercancel',endA);
window.addEventListener('resize',function(){renderAudioLane()});

function kfTimes(e){var s={};if(e.kf)for(var p in e.kf)(e.kf[p]||[]).forEach(function(k){s[k.t.toFixed(2)]=k.t});return Object.keys(s).map(function(k){return s[k]}).sort(function(a,b){return a-b})}
function renderLayers(){
  var sc=curScene(),h='';
  if(!sc.els.length)h='<div class="lempty">Esta cena ainda não tem camadas. Use os botões de adicionar acima do palco.</div>';
  else{
    h='<div class="lhead" id="lhead"></div>';
    for(var i=sc.els.length-1;i>=0;i--){
      var e=sc.els[i],w=win(e,sc),kd='';
      kfTimes(e).forEach(function(kt){kd+='<button class="kd'+(selKf&&selKf.id===e.id&&Math.abs(selKf.t-kt)<.03?' on':'')+'" data-kid="'+e.id+'" data-kt="'+kt+'" style="left:'+(kt/sc.dur*100)+'%" title="Keyframe em '+fmtS(kt)+'" aria-label="Keyframe em '+fmtS(kt)+'"></button>'});
      h+='<div class="lr'+(e.id===selEl?' on':'')+'" data-id="'+e.id+'"><div class="lname">'+IC[e.kind]+'<span>'+esc(elName(e))+'</span><button class="lk'+(e.locked?' on':'')+'" data-lock="1" title="'+(e.locked?'Destravar: volta a ser clicável no palco':'Travar: não seleciona pelo palco')+'" aria-label="Travar camada">'+IC.lock+'</button></div><div class="ltrack" data-id="'+e.id+'"><div class="lbar" style="left:'+(w[0]/sc.dur*100)+'%;width:'+((w[1]-w[0])/sc.dur*100)+'%"><span class="rz"></span></div>'+kd+'</div></div>';
    }
  }
  $('#laywrap').innerHTML=h;updateHead();
}
function updateHead(){
  var tot=total(),a=sceneAt(t),tr=$('#track'),bw=Math.max(1,tr.clientWidth-34);
  $('#head').style.left=(t/tot*bw-1)+'px';
  $('#timeTxt').innerHTML=fmtClock(t)+' <i>/ '+fmtClock(tot)+'</i>';
  var lh=$('#lhead');if(lh)lh.style.setProperty('--f',String(a.i===selScene?clamp(a.lt/(+P.scenes[a.i].dur||1),0,1):0));
}
var tdrag=false,SPOP=-1;
function trackTime(ev){var r=$('#track').getBoundingClientRect(),bw=Math.max(1,r.width-34);return clamp((ev.clientX-r.left)/bw,0,1)*total()}
$('#track').addEventListener('pointerdown',function(ev){
  var mb=ev.target.closest('[data-more]');if(mb){ev.stopPropagation();toggleScenePop(+mb.dataset.more);return}
  if(ev.target.closest('#addBlk')){addScene();return}
  closeScenePop();tdrag=true;this.setPointerCapture(ev.pointerId);seek(trackTime(ev));hideThumb();
});
$('#track').addEventListener('pointermove',function(ev){if(tdrag){seek(trackTime(ev));return}if(ev.target.closest('#addBlk')||ev.target.closest('[data-more]')){hideThumb();return}showThumb(ev)});
$('#track').addEventListener('pointerleave',function(){hideThumb()});
$('#track').addEventListener('pointerup',function(){if(tdrag){tdrag=false;if(playing)aeStart(t);renderStrip()}});
$('#track').addEventListener('pointercancel',function(){tdrag=false});
var thumbRaf=0;
function showThumb(ev){
  var tt=trackTime(ev),r=$('#track').getBoundingClientRect(),wr=$('#stagewrap').getBoundingClientRect();
  cancelAnimationFrame(thumbRaf);thumbRaf=requestAnimationFrame(function(){
    var th=$('#thumb'),c=$('#thumbCv'),w=220,sc=w/PW;c.width=Math.round(w*1.5);c.height=Math.round(PH*sc*1.5);c.style.height=Math.round(PH*sc)+'px';
    renderWith(P,c,Math.min(tt,total()-.001),sc*1.5);var a=sceneAt(tt);
    $('#thumbTx').innerHTML=esc(P.scenes[a.i].name)+' · <b>'+fmtClock(tt)+'</b>';th.hidden=false;
    var x=clamp(ev.clientX-wr.left-th.offsetWidth/2,4,wr.width-th.offsetWidth-4);th.style.left=x+'px';th.style.top=(wr.height-th.offsetHeight-6)+'px';
  });
}
function hideThumb(){cancelAnimationFrame(thumbRaf);$('#thumb').hidden=true}
var ldrag=null,lw=$('#laywrap');
lw.addEventListener('pointerdown',function(ev){
  var row=ev.target.closest('.lr');if(!row)return;
  var id=row.dataset.id,e=findEl(id),sc=curScene();if(!e)return;
  var tr=row.querySelector('.ltrack'),r=tr.getBoundingClientRect();
  if(ev.target.classList.contains('kd')){
    var kt=+ev.target.dataset.kt;selEl=id;selKf={id:id,t:kt};selTrack=null;seek(sceneStart(selScene)+kt);renderPanel();renderLayers();
    ldrag={mode:'kd',id:id,x0:ev.clientX,w:r.width,kt:kt};lw.setPointerCapture(ev.pointerId);ev.preventDefault();return;
  }
  if(ev.target.closest('[data-lock]')){e.locked=!e.locked;commit();renderLayers();ev.preventDefault();return}
  if(selEl!==id){selEl=id;selKf=null;selTrack=null;if(tab!=='tweaks')tab='tweaks';openTweaks(true);renderPanel();renderLayers();draw();row=lw.querySelector('.lr[data-id="'+id+'"]');tr=row.querySelector('.ltrack');r=tr.getBoundingClientRect()}
  var w=win(e,sc);
  if(ev.target.classList.contains('rz'))ldrag={mode:'rz',id:id,x0:ev.clientX,w:r.width,st:w[0],en:w[1]};
  else if(ev.target.classList.contains('lbar'))ldrag={mode:'mv',id:id,x0:ev.clientX,w:r.width,st:w[0],en:w[1]};
  else if(ev.target.closest('.ltrack')){seek(sceneStart(selScene)+clamp((ev.clientX-r.left)/r.width,0,1)*sc.dur);draw();return}
  else{draw();return}
  lw.setPointerCapture(ev.pointerId);ev.preventDefault();
});
lw.addEventListener('pointermove',function(ev){
  if(!ldrag)return;var e=findEl(ldrag.id),sc=curScene();if(!e)return;
  var dt=(ev.clientX-ldrag.x0)/ldrag.w*sc.dur;
  if(ldrag.mode==='kd'){
    var nt=clamp(Math.round((ldrag.kt+dt)*20)/20,0,sc.dur);if(Math.abs(nt-ldrag.kt)<.01&&!ldrag.moved)return;
    for(var p in e.kf)(e.kf[p]||[]).forEach(function(k){if(Math.abs(k.t-(ldrag.cur!=null?ldrag.cur:ldrag.kt))<.03)k.t=nt});
    for(var p2 in e.kf)e.kf[p2].sort(function(a,b){return a.t-b.t});
    ldrag.cur=nt;ldrag.moved=true;selKf={id:e.id,t:nt};
    var btn=lw.querySelector('.kd[data-kid="'+e.id+'"].on');if(btn)btn.style.left=(nt/sc.dur*100)+'%';
    seek(sceneStart(selScene)+nt);return;
  }
  var len=ldrag.en-ldrag.st;
  if(ldrag.mode==='mv'){var ns=clamp(Math.round((ldrag.st+dt)*10)/10,0,Math.max(0,sc.dur-.2));var shift=ns-(+e.start||0);e.start=ns;if(e.dur>0)e.dur=Math.min(len,sc.dur-ns);
    if(shift&&e.kf)for(var p3 in e.kf)e.kf[p3].forEach(function(k){k.t=Math.max(0,Math.round((k.t+shift)*100)/100)})}
  else{var ne=clamp(Math.round((ldrag.en+dt)*10)/10,ldrag.st+.2,sc.dur);e.dur=ne>=sc.dur-.001?0:+(ne-ldrag.st).toFixed(1)}
  ldrag.moved=true;var w=win(e,sc),bar=lw.querySelector('.lr[data-id="'+e.id+'"] .lbar');
  if(bar){bar.style.left=(w[0]/sc.dur*100)+'%';bar.style.width=((w[1]-w[0])/sc.dur*100)+'%'}
  seek(sceneStart(selScene)+Math.min(w[1]-.05,w[0]+.4));
});
function endL(){if(ldrag){var m=ldrag.moved;ldrag=null;if(m){commit();renderLayers();renderPanel();renderCode(false)}}}
lw.addEventListener('pointerup',endL);lw.addEventListener('pointercancel',endL);

/* =========================================================
   Transporte
   ========================================================= */
function setPlaying(v){
  playing=v;$('#playBtn').innerHTML=v?IC.pause:IC.play;$('#playBtn').setAttribute('aria-label',v?'Pausar':'Reproduzir');last=performance.now();
  if(v){aeInit();if(AE.ctx&&AE.ctx.state==='suspended')AE.ctx.resume();loadAllAudio();aeStart(t)}else{aeStop()}
  syncVideos(true);roomPresence();
}
var last=performance.now();
function tick(now){
  var dt=Math.min(.1,(now-last)/1000);last=now;
  if(playing&&!exporting){
    t+=dt;var tot=total();
    if(t>=tot){if(loop){t=t%tot;aeStart(t)}else{t=tot-.001;setPlaying(false)}}
    var a=sceneAt(t);
    if(a.i!==selScene)changeScene(a.i,true);
    syncVideos(false);draw();updateHead();
  }
  requestAnimationFrame(tick);
}
function changeScene(i,soft){
  selScene=i;renderStrip();if(!$('#scenePop').hidden)closeScenePop();if(selEl&&!findEl(selEl))selEl=null;if(selKf&&!findEl(selKf.id))selKf=null;
  renderLayers();
  if(!(soft&&$('#props').contains(document.activeElement)))renderPanel();
  roomPresence();
}
function seek(x){
  t=clamp(x,0,total()-.001);
  var a=sceneAt(t);if(a.i!==selScene)changeScene(a.i,false);
  syncVideos(true);draw();updateHead();
  if(tab==='tweaks'&&selEl)refreshKfButtons();
}
function showEl(e){
  var sc=curScene();if(!e||!sc||playing)return;var w=win(e,sc),a=e.anim||{},d=a.in==='none'?0:(+a.t||.6);
  if(a.in==='words'&&e.kind==='text')d+=sub(e.text).split(/\s+/).length*.07;
  var lt=Math.min(w[1]-.05,w[0]+d+.2);if(lt<w[0])lt=w[0];
  t=sceneStart(selScene)+lt;syncVideos(true);
}
$('#playBtn').addEventListener('click',function(){setPlaying(!playing)});
$('#toStart').addEventListener('click',function(){seek(0);if(playing)aeStart(0)});
$('#loopBtn').addEventListener('click',function(){loop=!loop;this.setAttribute('aria-pressed',String(loop))});
document.addEventListener('keydown',function(e){
  var tg=e.target&&e.target.tagName;if(tg==='INPUT'||tg==='TEXTAREA'||tg==='SELECT')return;
  if((e.ctrlKey||e.metaKey)&&(e.key==='z'||e.key==='Z')){e.preventDefault();if(e.shiftKey)redo();else undo();return}
  if(e.code==='Space'&&tg!=='BUTTON'){e.preventDefault();setPlaying(!playing)}
  else if(e.key==='v'||e.key==='V')setTool('select');
  else if(e.key==='c'||e.key==='C')setTool('comment');
  else if(e.key==='k'||e.key==='K'){var el0=findEl(selEl);if(el0){var ev0=evalEl(el0,curLt());setKey(el0,'x',curLt(),ev0.x);setKey(el0,'y',curLt(),ev0.y);commit();renderLayers();renderPanel();draw();toast('Keyframe de posição em '+fmtS(curLt())+'.')}}
  else if((e.key==='Delete'||e.key==='Backspace')&&selEl){delEl()}
  else if(e.key.indexOf('Arrow')===0&&selEl){var el1=findEl(selEl);if(!el1)return;e.preventDefault();var st=e.shiftKey?10:1,ev1=evalEl(el1,curLt());
    if(e.key==='ArrowLeft')writeProp(el1,'x',ev1.x-st);if(e.key==='ArrowRight')writeProp(el1,'x',ev1.x+st);if(e.key==='ArrowUp')writeProp(el1,'y',ev1.y-st);if(e.key==='ArrowDown')writeProp(el1,'y',ev1.y+st);
    syncGeo(el1);draw();clearTimeout(nudgeT);nudgeT=setTimeout(function(){commit();renderCode(false)},500)}
});
var nudgeT=null;
function setTool(k){tool=k;$('#toolSel').setAttribute('aria-pressed',String(k==='select'));$('#toolCom').setAttribute('aria-pressed',String(k==='comment'));ov.classList.toggle('comment',k==='comment');if(k!=='comment')closeComposer();updateOverlay()}
$('#toolSel').addEventListener('click',function(){setTool('select')});
$('#toolCom').addEventListener('click',function(){setTool('comment')});
$('#recBtn').addEventListener('click',function(){recKf=!recKf;this.setAttribute('aria-pressed',String(recKf));toast(recKf?'Gravando keyframes: mova o playhead e ajuste o elemento.':'Gravação de keyframes desligada.')});

/* =========================================================
   Histórico (desfazer/refazer) + salvamento
   ========================================================= */
function commit(noSave){
  var j=JSON.stringify(P);if(hist[hi]===j)return;
  hist=hist.slice(0,hi+1);hist.push(j);if(hist.length>80)hist.shift();hi=hist.length-1;updUndo();
  scheduleSave();
}
function updUndo(){$('#undo').disabled=hi<=0;$('#redo').disabled=hi>=hist.length-1}
function restoreHist(){P=normProject(JSON.parse(hist[hi]));afterProjectChange();scheduleSave()}
function undo(){if(hi>0){hi--;restoreHist()}}
function redo(){if(hi<hist.length-1){hi++;restoreHist()}}
$('#undo').addEventListener('click',undo);$('#redo').addEventListener('click',redo);
function afterProjectChange(){
  applySize();ensureFonts();loadAllAudio();
  selScene=clamp(selScene,0,P.scenes.length-1);if(!findEl(selEl))selEl=null;if(selKf&&!findEl(selKf.id))selKf=null;
  if(selTrack&&!P.audio.some(function(a){return a.id===selTrack}))selTrack=null;
  t=clamp(t,0,total()-.001);
  setTitles();if(typeof applyTypeUI==='function')applyTypeUI();
  for(var k in P.fonts.custom)loadCustomFont(k,P.fonts.custom[k]);
  fullRender();
  if(playing)aeStart(t);
}
function fullRender(){renderStrip();renderLayers();renderPanel();renderTabs();syncVideos(true);draw();updateHead()}
function touch(){renderStrip();renderLayers();renderCode(false);draw();updateHead()}
