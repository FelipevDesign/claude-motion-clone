/* =========================================================
   Exportação
   ========================================================= */
var PARTNERS=['Adobe','Descript','HeyGen','Higgsfield','invideo','Luma AI','Runway'];
function pickMime(){
  if(!window.MediaRecorder)return null;
  var c=['video/mp4;codecs=avc1.42E01F,mp4a.40.2','video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'];
  for(var i=0;i<c.length;i++){try{if(MediaRecorder.isTypeSupported(c[i]))return c[i]}catch(x){}}return null;
}
var EXO={fmt:'mp4',res:1.5,fps:30,q:'high',sharp:false,which:'cur',mode:'frames'};
function openExport(){
  closePops();var mime=pickMime()||(canFrames()?'video/mp4':null),vext=canFrames()&&EXO.mode!=='live'?'MP4':mime&&mime.indexOf('mp4')>=0?'MP4':'WebM';
  if(!mime&&EXO.fmt==='mp4')EXO.fmt='gif';if(!canFrames())EXO.mode='live';
  function seg(k,opts){return '<div class="seg">'+opts.map(function(o){return '<button data-ex="'+k+'" data-v="'+o[0]+'" aria-pressed="'+(String(EXO[k])===String(o[0]))+'"'+(o[2]?' disabled':'')+'>'+o[1]+'</button>'}).join('')+'</div>'}
  function body(){
    var vid=EXO.fmt==='mp4',tot=total(),mb=tot*(EXO.q==='high'?1.3:EXO.q==='medium'?.8:.45)*(EXO.res>1.2?1:.55)*(EXO.which==='all'?3:1)*(EXO.fps>=50?1.4:1);
    var h='<div class="dh"><h3 id="mTitle">Exportar</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>';
    h+='<div class="xrow"><span>Formato</span>'+seg('fmt',[['mp4',vext+' video',!mime],['gif','GIF'],['png','PNG'],['poster','Capa']])+'</div>';
    if(EXO.fmt!=='poster')h+='<div class="xrow"><span>Resolução</span>'+seg('res',[[1,'720p'],[1.5,'1080p']])+'</div>';
    if(EXO.fmt!=='poster')h+='<div class="xrow"><span>Quadros/s</span>'+seg('fps',vid?[[60,'60 fps'],[30,'30 fps'],[15,'15 fps']]:[[24,'24 fps'],[15,'15 fps'],[12,'12 fps']])+'</div>';
    if(vid)h+='<div class="xrow"><span>Modo</span>'+seg('mode',[['frames','Quadro a quadro',!canFrames()],['live','Tempo real',!pickMime()]])+'</div>';
    if(vid)h+='<div class="xrow"><span>Qualidade</span>'+seg('q',[['high','Alta'],['medium','Média'],['low','Baixa']])+'</div>';
    if(vid)h+='<div class="xrow"><span>Formatos</span>'+seg('which',[['cur','Atual ('+curFmtName()+')'],['all','16:9 + 1:1 + 9:16']])+'</div>';
    if(EXO.fmt!=='gif')h+='<div class="xrow" style="grid-template-columns:1fr auto"><span>Texto mais nítido (renderiza em 2×, mais lento)</span><button class="toggle" role="switch" aria-checked="'+EXO.sharp+'" data-ex="sharp" aria-label="Texto mais nítido"></button></div>';
    h+='<p class="est">'+(vid?'Até ~'+Math.max(1,Math.round(mb))+' MB · '+(EXO.mode==='frames'&&canFrames()?'MP4 renderizado quadro a quadro, sem travadas':'grava em tempo real, '+fmtS(tot*(EXO.which==='all'?3:1)))+(P.audio.length?' · com trilha':''):EXO.fmt==='gif'?'Sem som · renderiza quadro a quadro':EXO.fmt==='png'?'Sequência de imagens num .zip, para editores de vídeo':'O quadro atual, em PNG')+'</p>';
    h+='<div class="end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="exGo">Exportar</button></div>';
    h+='<div style="margin-top:14px;border-top:1px solid var(--line);padding-top:10px"><div class="info" style="margin-bottom:6px">Para continuar editando, importe o arquivo em:</div><div class="partners" style="margin:0">'+PARTNERS.map(function(n){return '<span class="chip">'+n+'</span>'}).join('')+'<span class="chip soon">Canva · em breve</span><span class="chip soon">Captions · em breve</span></div></div>';
    return h;
  }
  modal(body());
  var d=$('#dlg');
  d.onclick=function(e){
    var b=e.target.closest('[data-ex]');
    if(b&&!b.disabled){var k=b.dataset.ex;if(k==='sharp')EXO.sharp=!EXO.sharp;else{var v=b.dataset.v;EXO[k]=isFinite(+v)?+v:v;if(k==='fmt')EXO.fps=EXO.fmt==='mp4'?30:15}d.innerHTML=body();d.querySelectorAll('[data-close]').forEach(function(x){x.onclick=closeModal});return}
    if(e.target.closest('#exGo')){d.onclick=null;var sc=EXO.sharp?2:EXO.res;
      if(EXO.fmt==='mp4'){EXO.which==='all'?exportAllFormats(sc):exportVideoFile(sc)}
      else if(EXO.fmt==='gif')exportGif(EXO.res>1.2?800:480,EXO.fps);
      else if(EXO.fmt==='png')exportPngSeq(EXO.fps,EXO.sharp||EXO.res>1.2?1920:1280);
      else exportPoster();}
  };
}
function curFmtName(){var k=Object.keys(FORMATS).filter(function(k){return FORMATS[k][0]===PW&&FORMATS[k][1]===PH})[0];return k||(PW+'×'+PH)}
function closePops(){['sharePop','titleMenu','comPop','addPop','mediaPop','moreMenu','plusMenu'].forEach(function(id){var e=document.getElementById(id);if(e)e.hidden=true});if(typeof closeScenePop==='function')closeScenePop()}
$('#exportBtn').addEventListener('click',function(ev){ev.stopPropagation();openExport()});
$('#shareBtn').addEventListener('click',function(ev){ev.stopPropagation();var o=!$('#sharePop').hidden;closePops();if(!o){renderSharePop();$('#sharePop').hidden=false}});
document.addEventListener('click',function(ev){if(ev.target.closest('[data-more]'))return;if(!ev.target.closest('.pop')&&!ev.target.closest('.scenepop')&&!ev.target.closest('.plusmenu'))closePops()});
function renderSharePop(){
  var h='<h4>Compartilhar</h4><p class="note" style="margin-top:0">Para convidar pessoas, use o botão Compartilhar do Claude, no topo desta página. Quem tiver acesso assiste'+(CAP.db?', comenta e edita junto, em tempo real.':'.')+'</p>';
  h+='<h4>Agora nesta animação</h4>';
  var ps=PEERS.filter(function(p){return p.kind==='viewer'});
  if(!CAP.room)h+='<p class="note">A presença em tempo real não está disponível nesta visualização.</p>';
  else if(!ps.length)h+='<p class="note">Só você.</p>';
  else h+=ps.map(function(p){var pr=PROFILES[p.by],sc=p.presence&&p.presence.scene;return '<div class="row">'+(pr&&pr.avatarUrl?'<img src="'+esc(pr.avatarUrl)+'" alt="" style="width:22px;height:22px;border-radius:50%">':IC.users)+'<span style="flex:1">'+esc(p.isMe?'Você':((pr&&pr.name)||'Alguém'))+'</span><span class="note" style="margin:0">'+(sc!=null?'cena '+(sc+1):'')+(p.presence&&p.presence.playing?' · assistindo':'')+'</span></div>'}).join('');
  h+='<h4>Pedir mudanças ao Claude desta conversa</h4><p class="note" style="margin-top:0">O projeto fica salvo no artefato. No chat onde ele foi criado, peça mudanças e elas aparecem aqui sozinhas.</p>';
  $('#sharePop').innerHTML=h;
}
$('#sharePop').addEventListener('click',function(e){e.stopPropagation()});

function progressModal(title,info){
  modal('<h3 id="mTitle">'+esc(title)+'</h3><p class="info" id="mInfo">'+esc(info)+'</p><div class="bar"><i id="mBar"></i></div><div id="mOut"></div><div class="end"><button class="btn" id="mCancel">Cancelar</button></div>');
  $('#mCancel').onclick=function(){EXPORT_CANCEL=true};
}
var EXPORT_CANCEL=false;
function setProg(f,info){var b=$('#mBar');if(b)b.style.width=Math.round(clamp(f,0,1)*100)+'%';if(info!=null){var i=$('#mInfo');if(i)i.textContent=info}}
function deliver(blob,filename,kind){
  var done=function(msg){exporting=false;var i=$('#mInfo');if(i)i.textContent=msg;var c=$('#mCancel');if(c){c.textContent='Fechar';c.onclick=closeModal}setProg(1)};
  var showInline=function(note){
    modalUrl=URL.createObjectURL(blob);var o=$('#mOut');
    if(o){o.innerHTML=kind==='video'?'<video controls playsinline src="'+modalUrl+'"></video>':(kind==='image'?'<img class="out" src="'+modalUrl+'" alt="Prévia do arquivo exportado">':'');}
    done(note);
  };
  var mb=(blob.size/1048576).toFixed(1)+' MB';
  if(!CAP.downloads){showInline(filename+' · '+mb+'. '+(kind==='video'?'Clique com o botão direito no vídeo e escolha “Salvar vídeo como”.':kind==='image'?'Clique com o botão direito e salve a imagem.':'O download direto não está disponível nesta visualização.'));return}
  done(window.__LOCAL_APP?'Salvando '+filename+' · '+mb+'…':'Pronto: '+filename+' · '+mb+'. Confirme o download na janela do Claude.');
  CAP.downloads.save({filename:filename,data:blob}).then(function(r){var i=$('#mInfo');if(i)i.textContent=r&&r.path?'Salvo em '+r.path+' · '+mb:r&&r.status==='delivered'?'Arquivo entregue.':'Arquivo salvo: '+filename+' · '+mb+'.';if(r&&r.path&&CAP.downloads.openFolder){var o=$('#mOut');if(o)o.innerHTML='<button class="btn" id="openExp">Abrir a pasta de exportações</button>';var b=$('#openExp');if(b)b.onclick=function(){CAP.downloads.openFolder()}}})
  .catch(function(e){var c=e&&e.code;if(c==='declined'){var i=$('#mInfo');if(i)i.textContent='Download cancelado. Você pode exportar de novo quando quiser.'}else showInline(c==='too_large'?'Arquivo grande demais para baixar daqui. Tente 720p.':'Não foi possível baixar daqui. Use a prévia abaixo.')});
}
function loadScript(src,globalName){return new Promise(function(res,rej){if(window[globalName])return res(window[globalName]);var s=document.createElement('script');s.src=src;s.onload=function(){window[globalName]?res(window[globalName]):rej(new Error('lib'))};s.onerror=rej;document.head.appendChild(s)})}
function getZip(){return loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip')}
var GIFENC=null;
function getGif(){if(GIFENC)return Promise.resolve(GIFENC);return import('https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js').then(function(m){GIFENC=m;return m})}

/* ---------- exportação quadro a quadro com WebCodecs (MP4 H.264 + AAC/Opus) ---------- */
var HAS_WC=!!(window.VideoEncoder&&window.VideoFrame);
function getMuxer(){return loadScript('https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js','Mp4Muxer')}
function even(n){n=Math.round(n);return n%2?n+1:n}
function pickVideoCodec(w,h,fps,br){
  var list=[['avc1.640034','avc'],['avc1.640028','avc'],['avc1.4d0028','avc'],['avc1.42003e','avc'],['avc1.42001f','avc'],['vp09.00.40.08','vp9'],['vp09.00.10.08','vp9'],['av01.0.08M.08','av1']];
  var i=0;function next(){if(i>=list.length)return Promise.resolve(null);var it=list[i++],cfg={codec:it[0],width:w,height:h,bitrate:br,framerate:fps};if(it[1]==='avc')cfg.avc={format:'avc'};
    return VideoEncoder.isConfigSupported(cfg).then(function(r){if(r&&r.supported){cfg.mux=it[1];return cfg}return next()},next)}
  return next();
}
function pickAudioCodec(sr,ch){
  if(!window.AudioEncoder)return Promise.resolve(null);
  var c=[{m:'aac',cfg:{codec:'mp4a.40.2',sampleRate:sr,numberOfChannels:ch,bitrate:192000}},{m:'opus',cfg:{codec:'opus',sampleRate:sr,numberOfChannels:ch,bitrate:160000}}],i=0;
  function next(){if(i>=c.length)return Promise.resolve(null);var x=c[i++];return AudioEncoder.isConfigSupported(x.cfg).then(function(r){return r&&r.supported?x:next()},next)}
  return next();
}
/* mixa trilhas + som dos clipes de vídeo num buffer offline */
function renderAudioMix(sr){
  var tot=total(),hasClip=false;
  P.scenes.forEach(function(sc){sc.els.forEach(function(e){if(e.kind==='video'&&e.src&&!e.muted&&+e.vol>0)hasClip=true})});
  if(!P.audio.some(function(tr){return AE.buffers[tr.id]})&&!hasClip)return Promise.resolve(null);
  var oc=new OfflineAudioContext(2,Math.ceil(tot*sr),sr),master=oc.createGain();master.gain.value=MUTED?0:VOL;master.connect(oc.destination);
  schedTracks(oc,master,0,0);
  var ps=[],acc=0;
  P.scenes.forEach(function(sc){var s0=acc;acc+=sc.dur;sc.els.forEach(function(e){
    if(e.kind!=='video'||!e.src||e.muted||!(+e.vol>0))return;
    ps.push(fetchBin(srcURL(e.src)).then(function(ab){return oc.decodeAudioData(ab)}).then(function(buf){
      var w=win(e,sc),st=s0+w[0],len=Math.max(0,w[1]-w[0]),src=oc.createBufferSource(),g=oc.createGain();src.buffer=buf;src.playbackRate.value=clamp(+e.rate||1,.1,8);g.gain.value=clamp(+e.vol,0,2);src.connect(g);g.connect(master);
      src.start(st,Math.max(0,+e.mediaStart||0),len*(+e.rate||1));if(e.loop)src.loop=true;
    }).catch(function(){}))})});
  return Promise.all(ps).then(function(){return oc.startRendering()});
}
function exportFramesMp4(scale,onProg){
  var prog=function(f,l){if(onProg)onProg(f);else setProg(f,l)};
  var w=even(PW*scale),h=even(PH*scale),fps=EXO.fps||30,BR=(EXO.q==='low'?.4:EXO.q==='medium'?.65:1),br=Math.round((h>=1000?16e6:9e6)*BR*(fps>=50?1.4:1)),sr=48000;
  var muxer,venc,aenc,vcfg,acfg,aerr=null;
  return Promise.all([getMuxer(),pickVideoCodec(w,h,fps,br)]).then(function(r){
    vcfg=r[1];if(!vcfg)throw new Error('nocodec');
    prog(0,'Preparando o áudio…');
    return renderAudioMix(sr).then(function(buf){return buf?pickAudioCodec(sr,2).then(function(a){acfg=a;return buf}):null});
  }).then(function(abuf){
    var M=window.Mp4Muxer,opt={target:new M.ArrayBufferTarget(),video:{codec:vcfg.mux,width:w,height:h,frameRate:fps},fastStart:'in-memory',firstTimestampBehavior:'offset'};
    if(abuf&&acfg)opt.audio={codec:acfg.m,numberOfChannels:2,sampleRate:sr};
    muxer=new M.Muxer(opt);
    venc=new VideoEncoder({output:function(ch,meta){muxer.addVideoChunk(ch,meta)},error:function(e){aerr=e}});var vc=Object.assign({},vcfg);delete vc.mux;venc.configure(vc);
    if(opt.audio){
      aenc=new AudioEncoder({output:function(ch,meta){muxer.addAudioChunk(ch,meta)},error:function(e){aerr=e}});aenc.configure(acfg.cfg);
      var L=abuf.getChannelData(0),R=abuf.numberOfChannels>1?abuf.getChannelData(1):L,N=abuf.length,step=sr;
      for(var o=0;o<N;o+=step){var n=Math.min(step,N-o),d=new Float32Array(n*2);d.set(L.subarray(o,o+n),0);d.set(R.subarray(o,o+n),n);
        var ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:2,timestamp:Math.round(o/sr*1e6),data:d});aenc.encode(ad);ad.close()}
    }
    var keyEvery=fps*2,dur=Math.round(1e6/fps);
    return renderFrames(w,fps,function(c,i,n){
      if(aerr)throw aerr;
      var vf=new VideoFrame(c,{timestamp:i*dur,duration:dur});venc.encode(vf,{keyFrame:i%keyEvery===0});vf.close();
      prog((i+1)/n*.97,'Quadro '+(i+1)+' de '+n+'…');
      if(venc.encodeQueueSize>6)return new Promise(function(res){(function wait(){if(venc.encodeQueueSize<=2)res();else setTimeout(wait,8)})()});
    });
  }).then(function(){
    prog(.98,'Finalizando o arquivo…');
    return Promise.all([venc.flush(),aenc?aenc.flush():null]);
  }).then(function(){
    if(aerr)throw aerr;muxer.finalize();try{venc.close()}catch(x){}try{aenc&&aenc.close()}catch(x){}
    return {blob:new Blob([muxer.target.buffer],{type:'video/mp4'}),ext:'mp4'};
  }).catch(function(e){try{venc&&venc.state!=='closed'&&venc.close()}catch(x){}try{aenc&&aenc.state!=='closed'&&aenc.close()}catch(x){}exporting=false;throw e});
}
function canFrames(){return HAS_WC}
function recordAny(scale,onProg){
  if(EXO.mode!=='live'&&canFrames()){
    return exportFramesMp4(scale,onProg).catch(function(e){if(e&&e.cancelled)throw e;toast('Exportação quadro a quadro indisponível aqui. Gravando em tempo real.');return recordRealtime(scale,onProg)});
  }
  return recordRealtime(scale,onProg);
}

/* gravação em tempo real do palco (vídeo + áudio) */
function recordRealtime(scale,onProg){var FPS=EXO.fps||30,BR=(EXO.q==='low'?.4:EXO.q==='medium'?.65:1);
  return new Promise(function(resolve,reject){
    var mime=pickMime();if(!mime||!cv.captureStream){reject(new Error('Este navegador não grava vídeo.'));return}
    setPlaying(false);exporting=true;liveExport=true;EXPORT_CANCEL=false;
    var oldSC=SC;SC=scale;applySize();
    var vs=cv.captureStream(FPS),tracks=vs.getVideoTracks().slice(),dest=null;
    var c=aeInit();if(c){if(c.state==='suspended')c.resume();dest=c.createMediaStreamDestination();AE.master.connect(dest);tracks=tracks.concat(dest.stream.getAudioTracks())}
    var rec,chunks=[];
    try{rec=new MediaRecorder(new MediaStream(tracks),{mimeType:mime,videoBitsPerSecond:Math.round((scale>1.2?12000000:7000000)*BR*(FPS>=50?1.4:1))})}catch(x){cleanup();reject(new Error('Não foi possível iniciar a gravação.'));return}
    function cleanup(){liveExport=false;exporting=false;aeStop();if(dest){try{AE.master.disconnect(dest)}catch(x){}}SC=oldSC;applySize();t=0;syncVideos(true);draw()}
    rec.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
    rec.onstop=function(){var blob=new Blob(chunks,{type:mime.split(';')[0]});cleanup();if(EXPORT_CANCEL)reject({cancelled:true});else resolve({blob:blob,ext:mime.indexOf('mp4')>=0?'mp4':'webm'})};
    var tot=total();t=0;syncVideos(true);
    prepFrameMedia(0).then(function(){
      drawFrame(0);rec.start(250);aeStart(0);var t0=performance.now();
      (function step(){
        if(EXPORT_CANCEL){try{rec.stop()}catch(x){}return}
        var el=(performance.now()-t0)/1000;
        if(el>=tot){t=tot-.001;drawFrame(t);setTimeout(function(){try{rec.stop()}catch(x){}},150);return}
        t=el;syncVideos(false);drawFrame(t);if(onProg)onProg(el/tot);requestAnimationFrame(step);
      })();
    });
  });
}
function exportVideoFile(scale){
  var fr=EXO.mode!=='live'&&canFrames();
  if(fr)progressModal('Renderizando vídeo','Quadro a quadro: o resultado sai perfeito mesmo se a aba ficar lenta.');else progressModal('Gravando vídeo','Mantenha esta aba aberta e visível. A gravação leva '+fmtS(total())+'.');
  recordAny(scale,fr?null:function(f){setProg(f)}).then(function(r){deliver(r.blob,slug(P.name)+'.'+r.ext,'video')}).catch(exportFail);
}
function exportFail(e){exporting=false;liveExport=false;if(e&&e.cancelled){closeModal();toast('Exportação cancelada.');return}var i=$('#mInfo');if(i)i.textContent=(e&&e.message)||'A exportação falhou.';var c=$('#mCancel');if(c){c.textContent='Fechar';c.onclick=closeModal}}
function withProject(proj,fn){var keep=P,keepT=t,keepSel=selScene;P=proj;applySize();return Promise.resolve().then(fn).then(function(v){P=keep;t=keepT;selScene=keepSel;applySize();fullRender();return v},function(e){P=keep;t=keepT;selScene=keepSel;applySize();fullRender();throw e})}
function exportAllFormats(scale){
  var keys=['16:9','1:1','9:16'],files=[];
  progressModal('Gravando 3 formatos','Cada formato grava em tempo real ('+fmtS(total())+' cada). Mantenha a aba visível.');
  var chain=Promise.resolve();
  keys.forEach(function(k,i){chain=chain.then(function(){if(EXPORT_CANCEL)throw {cancelled:true};var F=FORMATS[k],proj=reflowProject(normProject(JSON.parse(JSON.stringify(P))),F[0],F[1]);setProg(i/keys.length,'Gravando '+k+' ('+(i+1)+' de 3)…');
    return withProject(proj,function(){return recordAny(scale,function(f){setProg((i+f)/keys.length)})}).then(function(r){files.push({name:slug(P.name)+'-'+k.replace(':','x')+'.'+r.ext,blob:r.blob})})})});
  chain.then(function(){setProg(1,'Compactando…');return getZip()}).then(function(JSZip){var z=new JSZip();files.forEach(function(f){z.file(f.name,f.blob)});return z.generateAsync({type:'blob'})})
  .then(function(b){deliver(b,slug(P.name)+'-formatos.zip','zip')}).catch(exportFail);
}
function exportBatch(){
  if(!BATCH.rows.length)return;var files=[],keepVars=clone(P.vars);
  progressModal('Gravando vídeos em lote',BATCH.rows.length+' vídeos de '+fmtS(total())+'. Mantenha a aba visível.');
  var chain=Promise.resolve();
  BATCH.rows.forEach(function(row,i){chain=chain.then(function(){if(EXPORT_CANCEL)throw {cancelled:true};P.vars=Object.assign({},keepVars,row);setProg(i/BATCH.rows.length,'Gravando '+(i+1)+' de '+BATCH.rows.length+'…');
    return recordAny(1,function(f){setProg((i+f)/BATCH.rows.length)}).then(function(r){var label=row[BATCH.cols[0]]||String(i+1);files.push({name:String(i+1).padStart(3,'0')+'-'+slug(label)+'.'+r.ext,blob:r.blob})})})});
  chain.then(function(){P.vars=keepVars;setProg(1,'Compactando…');return getZip()}).then(function(JSZip){var z=new JSZip();files.forEach(function(f){z.file(f.name,f.blob)});return z.generateAsync({type:'blob'})})
  .then(function(b){deliver(b,slug(P.name)+'-lote.zip','zip');fullRender()}).catch(function(e){P.vars=keepVars;fullRender();exportFail(e)});
}
/* quadro a quadro (determinístico) */
function renderFrames(width,fps,onFrame){
  var tot=total(),n=Math.max(1,Math.ceil(tot*fps)),sc=width/PW,c=document.createElement('canvas');c.width=Math.round(PW*sc);c.height=Math.round(PH*sc);
  var i=0;exporting=true;EXPORT_CANCEL=false;setPlaying(false);
  function next(){
    if(EXPORT_CANCEL){exporting=false;return Promise.reject({cancelled:true})}
    if(i>=n){exporting=false;return Promise.resolve()}
    var tt=Math.min(tot-.001,i/fps);
    return prepFrameMedia(tt).then(function(){renderWith(P,c,tt,sc);return onFrame(c,i,n)}).then(function(){i++;if(i%4===0)return new Promise(function(r){setTimeout(r,0)}).then(next);return next()});
  }
  return next();
}
function exportGif(width,fps){
  progressModal('Criando GIF','Renderizando quadro a quadro.');
  getGif().then(function(G){
    var enc=G.GIFEncoder(),delay=Math.round(1000/fps),pal=null;
    return renderFrames(width,fps,function(c,i,n){var g=c.getContext('2d'),d=g.getImageData(0,0,c.width,c.height).data;if(!pal||i%30===0)pal=G.quantize(d,256);var idx=G.applyPalette(d,pal);enc.writeFrame(idx,c.width,c.height,{palette:pal,delay:delay});setProg((i+1)/n,'Quadro '+(i+1)+' de '+n+'…')})
      .then(function(){enc.finish();return new Blob([enc.bytes()],{type:'image/gif'})});
  }).then(function(b){deliver(b,slug(P.name)+'.gif','image')}).catch(function(e){if(e&&!e.cancelled&&!e.message)e={message:'Não foi possível carregar o codificador de GIF.'};exportFail(e)});
}
function exportPngSeq(fps,width){width=width||1280;
  progressModal('Criando sequência de PNG','Renderizando quadro a quadro.');
  var z;getZip().then(function(JSZip){z=new JSZip();var folder=z.folder(slug(P.name));
    return renderFrames(width,fps,function(c,i,n){return new Promise(function(res){c.toBlob(function(b){folder.file('quadro-'+String(i).padStart(5,'0')+'.png',b);setProg((i+1)/n*.9,'Quadro '+(i+1)+' de '+n+'…');res()},'image/png')})});
  }).then(function(){setProg(.92,'Compactando…');return z.generateAsync({type:'blob'})}).then(function(b){deliver(b,slug(P.name)+'-png-'+fps+'fps.zip','zip')}).catch(exportFail);
}
function exportPoster(){
  progressModal('Criando capa','');var c=document.createElement('canvas'),sc=Math.max(1.5,1920/PW);c.width=Math.round(PW*sc);c.height=Math.round(PH*sc);
  prepFrameMedia(t).then(function(){renderWith(P,c,t,sc);c.toBlob(function(b){deliver(b,slug(P.name)+'-capa.png','image')},'image/png')});
}

/* =========================================================
   Persistência no artefato (banco compartilhado)
   ========================================================= */
var saveTimer=null,saving=false,dirty=false,lastSaved='',remoteSeen=false,firstLoad=true;
function setSave(txt,bad){var s=$('#saveState');s.textContent=txt;s.classList.toggle('bad',!!bad)}
function scheduleSave(){
  if(!CAP.db){try{localStorage.setItem('motion-draft:'+CURP,packProject(P))}catch(x){}clearTimeout(saveTimer);saveTimer=setTimeout(function(){localIndexPut(CURP,projMeta(false))},1500);setSave('Rascunho local');return}
  dirty=true;setSave('Salvando…');clearTimeout(saveTimer);saveTimer=setTimeout(flushSave,1200);
}
function flushSave(){
  if(!CAP.db)return;if(saving||firstLoad){saveTimer=setTimeout(flushSave,700);return}
  var json=packProject(P);if(json===lastSaved){dirty=false;setSave('Salvo');return}
  if(json.length>250000){setSave('Projeto grande demais para salvar',true);toast('O projeto passou do limite de 250 KB. Remova cenas ou dados para salvar.');return}
  saving=true;var pid=CURP;
  CAP.db.doc('project/'+pid).set({json:json,by:ME.id||'',at:Date.now()}).then(function(){if(pid!==CURP)return;lastSaved=json;if(packProject(P)===json){dirty=false;setSave('Salvo')}CAP.db.doc('projlist/'+pid).set(projMeta(false)).catch(function(){})})
  .catch(function(e){var c=e&&e.code;setSave(c==='permission_denied'||c==='not_granted'?'Somente leitura':'Não salvo',true)})
  .then(function(){saving=false});
}
function onRemoteProject(snap){
  if(!snap.exists){if(CURP!=='main'){toast('Esse projeto não existe mais. Abrindo o principal.');CURP='main';rememberProj();refilter();subscribeProject();return}firstLoad=false;if(!remoteSeen){remoteSeen=true;setSave('Rascunho')}return}
  remoteSeen=true;var d=snap.data()||{};if(typeof d.json!=='string'){firstLoad=false;return}
  if(firstLoad){firstLoad=false;dirty=false;clearTimeout(saveTimer);try{P=normProject(JSON.parse(d.json));lastSaved=d.json;hist=[JSON.stringify(P)];hi=0;updUndo();selScene=0;selEl=null;t=0;afterProjectChange();setSave('Salvo');var pid0=CURP;setTimeout(function(){if(pid0===CURP&&!PROJS.some(function(p){return p.id===CURP&&p.thumb}))writeIndex(true)},2500)}catch(x){setSave('Projeto salvo ilegível',true)}return}
  if(d.json===lastSaved)return;
  if(d.json===packProject(P)){lastSaved=d.json;setSave('Salvo');return}
  if(dirty||saving||drag||ldrag||adrag)return;
  try{
    var np=normProject(JSON.parse(d.json));lastSaved=d.json;P=np;
    hist=hist.slice(0,hi+1);hist.push(JSON.stringify(P));hi=hist.length-1;updUndo();afterProjectChange();setSave('Salvo');
    if(d.by&&d.by!==ME.id&&hist.length>1)toast('Atualizado por '+profName(d.by)+'.');
  }catch(x){}
}
function startDb(db){
  CAP.db=db;setSave('Conectando…');
  rememberProj();subscribeProject();
  db.collection('projlist').onSnapshot(function(s){PROJS=s.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});renderProjects()},function(){});
  db.collection('comments').onSnapshot(function(s){COMMENTS_ALL=s.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});refilter();resolveProfiles(COMMENTS.map(function(c){return c.by}))},function(){});
  db.collection('versions').orderBy('at','desc').limit(100).onSnapshot(function(s){VERSIONS_ALL=s.docs.map(function(d){var o=Object.assign({},d.data());o.id=d.id;return o});refilter()},function(){});
  db.collection('templates').orderBy('at','desc').limit(50).onSnapshot(function(s){TEMPLATES_SAVED=s.docs.map(function(d){var o=d.data();return {id:d.id,name:o.name,json:o.json}});if(tab==='brand')renderPanel()},function(){});
  db.doc('brand/kit').onSnapshot(function(s){if(s.exists){try{BRANDKIT=JSON.parse(s.data().json)}catch(x){}if(tab==='brand')renderPanel()}},function(){});
}

/* ---------- presença em tempo real ---------- */
var PEERS=[];
function roomPresence(){if(!CAP.room)return;try{CAP.room.presence({scene:selScene,playing:!!playing,uid:ME.id||null,proj:CURP}).catch(function(){})}catch(x){}}
function renderPeers(){
  var ps=PEERS.filter(function(p){return p.kind==='viewer'&&!p.sameTab});var seen={};ps=ps.filter(function(p){var k=p.by||p.peer;if(seen[k])return false;seen[k]=1;return true});
  $('#peers').innerHTML=ps.slice(0,4).map(function(p){var pr=PROFILES[p.by];var nm=p.isMe?'Você (outra aba)':((pr&&pr.name)||'Alguém');return pr&&pr.avatarUrl?'<img src="'+esc(pr.avatarUrl)+'" alt="'+esc(nm)+'" title="'+esc(nm)+'">':'<span title="'+esc(nm)+'">'+esc((nm[0]||'?').toUpperCase())+'</span>'}).join('')+(ps.length>4?'<span>+'+(ps.length-4)+'</span>':'');
}
function startRoom(room){
  CAP.room=room;
  room.onPeers(function(ch){PEERS=ch.peers.slice();resolveProfiles(PEERS.map(function(p){return p.by}));renderPeers();if(!$('#sharePop').hidden)renderSharePop()},function(){});
  roomPresence();
}

/* ---------- telas pequenas ---------- */
function syncMobTabs(){}

/* ---------- cabeçalho do painel e barra de reprodução ---------- */
$('#titleBtn').addEventListener('click',function(e){e.stopPropagation();var m=$('#titleMenu');if(!m.hidden){m.hidden=true;return}closePops();
  m.innerHTML='<button class="mi" data-tm="projects">'+IC.folder+'Projetos…<span class="k">Ctrl O</span></button><button class="mi" data-tm="newproj">'+IC.plus+'Novo projeto em branco</button><hr><button class="mi" data-tm="rename">'+IC.text+'Renomear</button><button class="mi" data-tm="undo">'+IC.undo+'Desfazer<span class="k">Ctrl Z</span></button><button class="mi" data-tm="redo">'+IC.redo+'Refazer<span class="k">Ctrl ⇧ Z</span></button><hr><h4>Formato</h4>'+
    Object.keys(FORMATS).map(function(k){return '<button class="mi" role="menuitemradio" data-tm="fmt" data-k="'+k+'" aria-checked="'+(FORMATS[k][0]===PW&&FORMATS[k][1]===PH)+'">'+k+'</button>'}).join('')+
    '<hr><button class="mi" data-tm="assets">'+IC.image+'Assets com IA (prompts)</button><button class="mi" data-tm="refvid">'+IC.video+'Recriar de um vídeo de referência…</button><button class="mi" data-tm="captions">'+IC.text+'Legendas</button><button class="mi" data-tm="style">'+IC.sliders+'Tipo de vídeo: '+esc((TYPES[P.type]||TYPES.explainer).name)+'</button><button class="mi" data-tm="style">'+IC.brand+'Marca, fontes e modelos</button><button class="mi" data-tm="versions">'+IC.history+'Versões</button><button class="mi" data-tm="review">'+IC.check+'Revisão</button><button class="mi" data-tm="data">'+IC.data+'Dados e lote</button><button class="mi" data-tm="code">'+IC.code+'Código</button><hr><button class="mi" data-tm="export">'+IC.dl+'Exportar…</button>';
  m.hidden=false});
$('#titleMenu').addEventListener('click',function(e){e.stopPropagation();var b=e.target.closest('[data-tm]');if(!b)return;var k=b.dataset.tm;$('#titleMenu').hidden=true;if(k==='projects'){openProjects();return}if(k==='newproj'){createProject(blankProject());return}if(k==='refvid'){openRefDialog();return}if(k==='captions'){setTab('captions');openTweaks(true);renderPanel();return}
  if(k==='rename'){var i=$('#projName');i.hidden=false;i.focus();i.select()}
  else if(k==='undo')undo();else if(k==='redo')redo();else if(k==='fmt')setFormat(b.dataset.k);else if(k==='export')openExport();else setTab(k)});
$('#comMenuBtn').addEventListener('click',function(e){e.stopPropagation();setTab('comments')});
function relayout(){setTimeout(function(){renderAudioLane();updateHead()},40)}
$('#expandBtn').addEventListener('click',function(){var w=$('#app').classList.toggle('wide');this.innerHTML=w?IC.shrink:IC.expand;this.setAttribute('aria-label',w?'Mostrar a conversa':'Expandir');relayout()});
$('#wideBtn').addEventListener('click',function(){$('#app').classList.add('wide');$('#expandBtn').innerHTML=IC.shrink;$('#expandBtn').setAttribute('aria-label','Mostrar a conversa');relayout()});
$('#closeBtn').addEventListener('click',function(){setPlaying(false);$('#app').classList.add('noart');if(!CH.msgs.some(function(m){return m.card}))addMsg({role:'ai',text:'Fechei o painel. Clique no cartão para abrir a animação de novo.',card:{name:P.name,n:P.scenes.length,s:total().toFixed(0)}})});
$('#msgs').addEventListener('click',function(e){if(e.target.closest('[data-open]')){$('#app').classList.remove('noart');relayout()}});
$('#fsBtn').addEventListener('click',function(){var a=$('#artifact');if(document.fullscreenElement){document.exitFullscreen().catch(function(){});return}if(a.requestFullscreen)a.requestFullscreen().catch(function(){toast('A tela cheia não está disponível nesta visualização.')});else toast('A tela cheia não está disponível nesta visualização.')});
document.addEventListener('fullscreenchange',relayout);
$('#tweaksBtn').addEventListener('click',function(){openTweaks($('#props').hidden)});
$('#layersBtn').addEventListener('click',function(){var d=$('#drawer');d.hidden=!d.hidden;this.setAttribute('aria-pressed',String(!d.hidden));if(!d.hidden){renderLayers();renderAudioLane()}});
var VOL=.9,MUTED=false;
function applyVol(){if(AE.master)AE.master.gain.value=MUTED?0:VOL;$('#muteBtn').innerHTML=MUTED||VOL===0?IC.mute:IC.vol;$('#muteBtn').setAttribute('aria-pressed',String(MUTED));$('#muteBtn').setAttribute('aria-label',MUTED?'Som desligado':'Som ligado')}
$('#vol').addEventListener('input',function(){VOL=+this.value;if(VOL>0)MUTED=false;aeInit();applyVol()});
$('#muteBtn').addEventListener('click',function(){MUTED=!MUTED;aeInit();applyVol()});
window.addEventListener('resize',relayout);

/* =========================================================
   Início
   ========================================================= */
function init(){
  if(window.__LOCAL_APP){var sb=$('#shareBtn');if(sb)sb.style.display='none';var pe=$('#peers');if(pe)pe.style.display='none'}
  $('#projBtn').innerHTML=IC.folder;$('#projBtn').onclick=function(e){e.stopPropagation();openProjects()};
  document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&!e.shiftKey&&(e.key==='o'||e.key==='O')){e.preventDefault();openProjects()}});
  $('#undo').innerHTML=IC.undo;$('#redo').innerHTML=IC.redo;$('#shareBtn').innerHTML=IC.lock+'Compartilhar';$('#exportBtn').innerHTML=IC.dl;
  $('#toStart').innerHTML=IC.restart;$('#loopBtn').innerHTML=IC.loop;$('#toolSel').innerHTML=IC.cursor;$('#toolCom').innerHTML=IC.comment;$('#comMenuBtn').innerHTML=IC.chev;
  $('#mediaBtn').innerHTML=IC.media;$('#addBtn').innerHTML=IC.plus;$('#playBtn').innerHTML=IC.play;$('#recBtn').innerHTML='<span style="width:10px;height:10px;border-radius:50%;background:currentColor;display:block"></span>';
  $('#expandBtn').innerHTML=IC.expand;$('#closeBtn').innerHTML=IC.close;$('#wideBtn').innerHTML=IC.sidebar;$('#fsBtn').innerHTML=IC.full;$('#layersBtn').innerHTML=IC.layers;$('#tweaksBtn').innerHTML=IC.tweak+'Tweaks';applyVol();
  var draft=null;try{draft=localStorage.getItem('motion-draft')}catch(x){}
  P=TEMPLATES.quarter.make();
  var pdraft=null;try{pdraft=localStorage.getItem('motion-draft:'+CURP)}catch(x){}if(pdraft)draft=pdraft;
  if(draft){try{P=normProject(JSON.parse(draft))}catch(x){}}
  try{PROJS=localIndex()}catch(x){}
  applySize();ensureFonts();hist=[JSON.stringify(P)];hi=0;updUndo();setTitles();
  selScene=0;t=1.9;
  applyTypeUI();renderMsgs();
  updateMode();setSave(draft?'Rascunho local':'');fullRender();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(redraw);
  requestAnimationFrame(tick);
  var cl=window.claude;
  if(cl&&cl.use){
    cl.use('user').then(function(u){if(!u)return;CAP.user=u;return u.id().then(function(id){ME.id=id;roomPresence()})}).catch(function(){});
    cl.use('db').then(function(db){if(db){try{localStorage.removeItem('motion-draft')}catch(x){}startDb(db)}else setSave(draft?'Rascunho local':'')}).catch(function(){});
    cl.use('assets').then(function(a){if(a)CAP.assets=a}).catch(function(){});
    cl.use('downloads').then(function(d){if(d)CAP.downloads=d}).catch(function(){});
    cl.use('room').then(function(r){if(r)startRoom(r)}).catch(function(){});
    cl.use('sample').then(function(s){if(!s)return;CAP.sample=s;updateMode();s.limits().then(function(l){if(l&&l.images)$('#attBtn').hidden=false}).catch(function(){})}).catch(function(){});
  }
}
init();
if(typeof window.__motionTest==='function')window.__motionTest({switchProject:switchProject,createProject:createProject,openProjects:openProjects,get CURP(){return CURP},get PROJS(){return PROJS},get lastHit(){return lastHit},get selEl(){return selEl},hitAll:hitAll,hitBox:hitBox,packProject:packProject,normProject:normProject,exportFrames:exportFramesMp4,analyzeRef:analyzeRef,timeCaptions:timeCaptions,chunkScript:chunkScript,parseSrt:parseSrt,toSrt:toSrt,allVoiceSegments:allVoiceSegments,renderAudioMix:renderAudioMix,capCfg:capCfg,openRefDialog:openRefDialog,setFormat:setFormat,openTweaks:openTweaks,openScenePop:openScenePop,get P(){return P},set P(v){P=v},get t(){return t},seek:seek,setTab:setTab,detectBeats:detectBeats,snapToBeats:snapToBeats,runChecks:runChecks,reflowProject:reflowProject,applyOps:applyOps,useTemplate:useTemplate,renderWith:renderWith,addEl:addEl,handlers:handlers,sendText:sendText,renderPanel:renderPanel,commit:commit,afterProjectChange:afterProjectChange,
  select:function(id){selEl=id;selKf=null;renderPanel();renderLayers();draw()},selKf:function(id,tt){selEl=id;selKf={id:id,t:tt};renderPanel();renderLayers()},get COMMENTS(){return COMMENTS},get VERSIONS(){return VERSIONS},get CH(){return CH},get selScene(){return selScene},setScene:function(i){changeScene(i)},fixIssue:fixIssue,applyTable:applyTable,get BATCH(){return BATCH},setTrackBuffer:setTrackBuffer,AE:AE,get hi(){return hi},undo:undo});
