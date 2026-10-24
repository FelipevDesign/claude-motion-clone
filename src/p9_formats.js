/* =========================================================
   Formatos: detecção pelo conteúdo, conversões, proxies e armazenamento
   Igual no artefato e no web app; os limites mudam conforme o ambiente.
   ========================================================= */
var IS_LOCAL=!!window.__LOCAL_APP;
var ASSET_MAX=IS_LOCAL?Infinity:20*1024*1024-128*1024; /* limite por arquivo no artefato */
var CDN3='https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/';
var LIBS={
  jszip:['https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js','JSZip'],
  heic2any:['https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js','heic2any'],
  agpsd:['https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/dist/bundle.js','agPsd'],
  xlsx:['https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js','XLSX'],
  muxer:['https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/build/mp4-muxer.js','Mp4Muxer']
};
function lib(k){var L=LIBS[k];return loadScript(L[0],L[1])}
function loadPlain(src){return new Promise(function(res,rej){var s=document.createElement('script');s.src=src;s.onload=res;s.onerror=function(){rej(new Error('Não foi possível carregar '+src))};document.head.appendChild(s)})}
function threeExtra(names){return loadThree().then(function(){var c=Promise.resolve();names.forEach(function(n){c=c.then(function(){if(n==='fflate'&&window.fflate)return;if(n!=='fflate'&&THREE[n.split('/').pop()])return;return loadPlain(CDN3+({fflate:'libs/fflate.min.js',OBJLoader:'loaders/OBJLoader.js',MTLLoader:'loaders/MTLLoader.js',FBXLoader:'loaders/FBXLoader.js',NURBSUtils:'curves/NURBSUtils.js',NURBSCurve:'curves/NURBSCurve.js'}[n]))})});return c})}

/* ---------- detecção pelo conteúdo + extensão ---------- */
function extOf(n){var m=/\.([a-z0-9]+)$/i.exec(n||'');return m?m[1].toLowerCase():''}
function sniff(f){
  return f.slice(0,4096).arrayBuffer().then(function(ab){
    var b=new Uint8Array(ab),s=String.fromCharCode.apply(null,b.subarray(0,64)),e=extOf(f.name),txt='';
    try{txt=new TextDecoder().decode(b.subarray(0,4096))}catch(x){}
    function at(o,str){return s.substr(o,str.length)===str}
    var ft=at(4,'ftyp')?s.substr(8,4):'';
    var r=function(cat,fmt,label){return {cat:cat,fmt:fmt,label:label||fmt.toUpperCase(),ext:e}};
    if(b[0]===0x89&&at(1,'PNG'))return r('image','png');
    if(b[0]===0xFF&&b[1]===0xD8)return r('image','jpg','JPG');
    if(at(0,'GIF8'))return r('image','gif');
    if(at(0,'RIFF')&&at(8,'WEBP'))return r('image','webp','WebP');
    if(at(0,'RIFF')&&at(8,'WAVE'))return r('audio','wav');
    if(at(0,'RIFF')&&at(8,'AVI '))return r('convert','avi','AVI');
    if(at(0,'BM'))return r('image','bmp');
    if(b[0]===0&&b[1]===0&&b[2]===1&&b[3]===0)return r('image','ico');
    if(at(0,'8BPS'))return r('psd','psd');
    if(at(0,'%PDF'))return r('unsupported','pdf','PDF');
    if(at(0,'PK\x03\x04'))return r('zip',e==='lottie'?'lottie':e==='xlsx'?'xlsx':'zip',e==='lottie'?'dotLottie':e==='xlsx'?'XLSX':'ZIP');
    if(ft){if(/^(heic|heix|hevc|mif1|msf1|heim|heis)/.test(ft))return r('heic','heic','HEIC');if(/^avi[fs]/.test(ft))return r('image','avif','AVIF');if(/^M4A|^M4B|^F4A/.test(ft)||e==='m4a'||e==='aac')return r('audio','m4a','AAC/M4A');if(ft==='qt  '||e==='mov')return r('video','mov','MOV');return r('video','mp4','MP4')}
    if(b[0]===0x1A&&b[1]===0x45&&b[2]===0xDF&&b[3]===0xA3)return txt.indexOf('webm')>=0||e==='webm'?r('video','webm','WebM'):r('convert','mkv','MKV');
    if(at(0,'OggS'))return r('audio',txt.indexOf('OpusHead')>=0?'opus':'ogg',txt.indexOf('OpusHead')>=0?'Opus':'OGG');
    if(at(0,'fLaC'))return r('audio','flac','FLAC');
    if(at(0,'ID3')||(b[0]===0xFF&&(b[1]&0xE0)===0xE0&&e!=='aac'))return r('audio','mp3','MP3');
    if(b[0]===0xFF&&(b[1]&0xF6)===0xF0)return r('audio','aac','AAC');
    if(at(0,'FORM')&&(at(8,'AIFF')||at(8,'AIFC')))return r('aiff','aiff','AIFF');
    if(at(0,'glTF'))return r('model','glb','GLB');
    if(at(0,'Kaydara FBX')||e==='fbx')return r('model','fbx','FBX');
    if(at(0,'OTTO'))return r('font','otf','OTF');
    if(b[0]===0&&b[1]===1&&b[2]===0&&b[3]===0)return r('font','ttf','TTF');
    if(at(0,'true')&&e==='ttf')return r('font','ttf','TTF');
    if(at(0,'wOFF'))return r('font','woff','WOFF');
    if(at(0,'wOF2'))return r('font','woff2','WOFF2');
    var t=txt.replace(/^\uFEFF/,'').trimStart();
    if(/^<\?xml[\s\S]*<svg|^<svg/i.test(t)||e==='svg')return r('svg','svg','SVG');
    if(/^<!doctype html|^<html/i.test(t)||e==='html'||e==='htm')return r('html','html','HTML');
    if(/^WEBVTT/.test(t))return r('subs','vtt','VTT');
    if(/^\d+\s*\r?\n\d\d:\d\d:\d\d[,.]\d+\s*-->/.test(t)||e==='srt')return r('subs','srt','SRT');
    if(e==='gltf'||(/^\{/.test(t)&&/"asset"\s*:\s*\{[^}]*"version"/.test(t)))return r('model','gltf','glTF');
    if(e==='obj'||/^(#.*\n)*\s*(v|o|g|mtllib)\s/m.test(t)&&e==='obj')return r('model','obj','OBJ');
    if(e==='mtl')return r('aux','mtl','MTL');
    if(/^[\[{]/.test(t)||e==='json')return r('json','json','JSON');
    if(e==='csv')return r('data','csv','CSV');
    if(e==='tsv'||e==='tab')return r('data','tsv','TSV');
    if(/^(mkv|avi|wmv|flv|mpg|mpeg|ts|m2ts|3gp|ogv)$/.test(e))return r('convert',e,e.toUpperCase());
    if(/^(aif|aiff|aifc)$/.test(e))return r('aiff','aiff','AIFF');
    if(/^(ai|eps|indd|xd|fig|sketch|aep|prproj|blend|c4d|max|ma|mb|3ds|skp|dwg|cr2|nef|arw|dng|raw|tif|tiff)$/.test(e))return r('unsupported',e,e.toUpperCase());
    if(/^(js|css|txt|md)$/.test(e))return r('aux',e,e.toUpperCase());
    if(e==='otf'||e==='ttf'||e==='woff'||e==='woff2')return r('font',e,e.toUpperCase());
    var mt=f.type||'';if(mt.indexOf('image/')===0)return r('image',e||'img','Imagem');if(mt.indexOf('video/')===0)return r('video',e||'video','Vídeo');if(mt.indexOf('audio/')===0)return r('audio',e||'audio','Áudio');
    return r('unsupported',e||'?',e?e.toUpperCase():'desconhecido');
  });
}
var CONVERT_TIP={pdf:'Exporte as páginas como PNG ou JPG.',ai:'Exporte do Illustrator como SVG ou PNG.',eps:'Exporte como SVG ou PNG.',psb:'Salve como PSD ou exporte as camadas em PNG.',fig:'Exporte do Figma como SVG ou PNG.',sketch:'Exporte como SVG ou PNG.',xd:'Exporte como SVG ou PNG.',aep:'Renderize no After Effects como MP4 ou exporte em Lottie com o Bodymovin.',prproj:'Exporte a sequência como MP4.',blend:'Exporte do Blender como GLB.',c4d:'Exporte como GLB ou FBX.',max:'Exporte como FBX ou GLB.',skp:'Exporte como GLB ou OBJ.',dwg:'Exporte como SVG ou PDF convertido em PNG.',tif:'Salve como PNG ou JPG.',tiff:'Salve como PNG ou JPG.',raw:'Revele a foto e salve em JPG ou PNG.',cr2:'Revele a foto e salve em JPG.',nef:'Revele a foto e salve em JPG.',arw:'Revele a foto e salve em JPG.',dng:'Revele a foto e salve em JPG.'};
function unsupportedMsg(f,sn){return '“'+f.name+'” ('+sn.label+') não é suportado. '+(CONVERT_TIP[sn.fmt]||'Converta para PNG, JPG, MP4, MP3 ou GLB e envie de novo.')}

/* ---------- armazenamento: assets do artefato, servidor local ou IndexedDB ---------- */
var IDB=null;
function idb(){if(IDB)return IDB;IDB=new Promise(function(res,rej){try{var r=indexedDB.open('claude-motion-media',1);r.onupgradeneeded=function(){r.result.createObjectStore('files')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}}catch(x){rej(x)}});return IDB}
function idbPut(id,blob){return idb().then(function(db){return new Promise(function(res,rej){var tx=db.transaction('files','readwrite');tx.objectStore('files').put(blob,id);tx.oncomplete=function(){res()};tx.onerror=function(){rej(tx.error)}})})}
function idbGet(id){return idb().then(function(db){return new Promise(function(res){var tx=db.transaction('files');var q=tx.objectStore('files').get(id);q.onsuccess=function(){res(q.result||null)};q.onerror=function(){res(null)}})})}
/* restaura as mídias guardadas no navegador ao abrir um projeto */
var IDB_READY=Promise.resolve();
function restoreIdbMedia(){IDB_READY=restoreIdbMediaRun();return IDB_READY}
function restoreIdbMediaRun(){var ids=[];P.media.forEach(function(m){if(String(m.src).indexOf('idb:')===0)ids.push(m.src.slice(4))});
  (P.scenes||[]).forEach(function(s){s.els.forEach(function(e){if(e.comp&&e.comp.files)Object.keys(e.comp.files).forEach(function(k){var v=e.comp.files[k].src;if(String(v).indexOf('idb:')===0)ids.push(v.slice(4))})})});
  return Promise.all(ids.filter(function(id){return !LOCAL[id]}).map(function(id){return idbGet(id).then(function(b){if(b){LOCAL[id]=URL.createObjectURL(b)}})})).then(function(){if(ids.length)fullRender()})}
/* guarda qualquer blob; devolve {src, persisted, where} */
function putBlob(blob,type,name){
  type=type||blob.type||'application/octet-stream';var local=URL.createObjectURL(blob);
  function fin(src,where){var id=src.slice(src.indexOf(':')+1);LOCAL[id]=local;return {src:src,persisted:where!=='session',where:where,size:blob.size}}
  if(CAP.assets&&blob.size<=ASSET_MAX){var b2=blob.type===type?blob:new Blob([blob],{type:type});try{if(name)Object.defineProperty(b2,'name',{value:name})}catch(x){}
    return CAP.assets.upload(b2,{type:type}).then(function(r){return fin('asset:'+r.id,IS_LOCAL?'pc':'artifact')}).catch(function(e){return toIdb(e)})}
  return toIdb();
  function toIdb(err){var id=nid('i')+nid('');return idbPut(id,blob).then(function(){return fin('idb:'+id,'browser')}).catch(function(){return fin('local:'+nid('m'),'session')})}
}
function srcSize(src){var m=mediaById(src);return m&&m.size||0}

/* ---------- conversões no navegador ---------- */
function encodeAudioBuffer(abuf,kbps){
  /* AAC (ou Opus) em MP4 com WebCodecs; se não houver, WAV mono 22 kHz */
  var sr=abuf.sampleRate>=44100?48000:abuf.sampleRate,ch=Math.min(2,abuf.numberOfChannels);
  function wavFallback(){var oc=new OfflineAudioContext(1,Math.ceil(abuf.duration*22050),22050),s=oc.createBufferSource();s.buffer=abuf;s.connect(oc.destination);s.start();return oc.startRendering().then(function(m){return {blob:encodeWav(m),type:'audio/wav',ext:'wav'}})}
  if(!window.AudioEncoder)return wavFallback();
  return Promise.all([lib('muxer'),pickAudioCodec(sr,ch)]).then(function(r){
    var ac=r[1];if(!ac)return wavFallback();
    var cfg=Object.assign({},ac.cfg,{bitrate:(kbps||160)*1000});
    var go=abuf.sampleRate===sr?Promise.resolve(abuf):(function(){var oc=new OfflineAudioContext(ch,Math.ceil(abuf.duration*sr),sr),s=oc.createBufferSource();s.buffer=abuf;s.connect(oc.destination);s.start();return oc.startRendering()})();
    return go.then(function(buf){
      var M=window.Mp4Muxer,mux=new M.Muxer({target:new M.ArrayBufferTarget(),audio:{codec:ac.m,numberOfChannels:ch,sampleRate:sr},fastStart:'in-memory',firstTimestampBehavior:'offset'}),err=null;
      var enc=new AudioEncoder({output:function(c,m){mux.addAudioChunk(c,m)},error:function(e){err=e}});enc.configure(cfg);
      var N=buf.length,step=sr;for(var o=0;o<N;o+=step){var n=Math.min(step,N-o),d=new Float32Array(n*ch);for(var c=0;c<ch;c++)d.set(buf.getChannelData(c).subarray(o,o+n),c*n);var ad=new AudioData({format:'f32-planar',sampleRate:sr,numberOfFrames:n,numberOfChannels:ch,timestamp:Math.round(o/sr*1e6),data:d});enc.encode(ad);ad.close()}
      return enc.flush().then(function(){if(err)throw err;mux.finalize();enc.close();return {blob:new Blob([mux.target.buffer],{type:'video/mp4'}),type:'video/mp4',ext:'m4a'}});
    });
  }).catch(function(){return wavFallback()});
}
/* AIFF (PCM big-endian) → AudioBuffer, sem bibliotecas */
function decodeAiff(ab){
  var v=new DataView(ab),p=12,ch=0,frames=0,bits=16,sr=44100,data=0,comp='NONE';
  function f80(o){var e=v.getUint16(o)&0x7FFF,hi=v.getUint32(o+2),lo=v.getUint32(o+6);if(!e&&!hi&&!lo)return 0;return (hi*Math.pow(2,32)+lo)*Math.pow(2,e-16383-63)}
  while(p+8<=ab.byteLength){var id=String.fromCharCode(v.getUint8(p),v.getUint8(p+1),v.getUint8(p+2),v.getUint8(p+3)),sz=v.getUint32(p+4);
    if(id==='COMM'){ch=v.getUint16(p+8);frames=v.getUint32(p+10);bits=v.getUint16(p+14);sr=f80(p+16);if(sz>=22)comp=String.fromCharCode(v.getUint8(p+26),v.getUint8(p+27),v.getUint8(p+28),v.getUint8(p+29))}
    if(id==='SSND')data=p+16+v.getUint32(p+8);p+=8+sz+(sz&1)}
  if(!ch||!data||(comp!=='NONE'&&comp!=='twos'&&comp!=='sowt'))throw new Error('AIFF compactado não suportado');
  var le=comp==='sowt',bps=bits/8,ctx=new OfflineAudioContext(ch,Math.max(1,frames),sr),buf=ctx.createBuffer(ch,Math.max(1,frames),sr),max=Math.pow(2,bits-1);
  for(var c=0;c<ch;c++){var out=buf.getChannelData(c);for(var i=0;i<frames;i++){var o=data+(i*ch+c)*bps,s;if(bits===8)s=v.getInt8(o);else if(bits===16)s=v.getInt16(o,le);else if(bits===24){var b0=v.getUint8(o),b1=v.getUint8(o+1),b2=v.getUint8(o+2);s=le?(b2<<16|b1<<8|b0):(b0<<16|b1<<8|b2);if(s&0x800000)s-=0x1000000}else s=v.getInt32(o,le);out[i]=s/max}}
  return buf;
}
function decodeAny(file,sn){return file.arrayBuffer().then(function(ab){if(sn&&sn.fmt==='aiff')return decodeAiff(ab);var c=aeInit()||new OfflineAudioContext(2,1,44100);return new Promise(function(res,rej){c.decodeAudioData(ab,res,rej)})})}
/* proxy de imagem grande: reduz para no máximo 4096 px em WebP */
function imageProxy(file){return createImageBitmap(file).then(function(bm){var k=Math.min(1,4096/Math.max(bm.width,bm.height)),c=document.createElement('canvas');c.width=Math.round(bm.width*k);c.height=Math.round(bm.height*k);c.getContext('2d').drawImage(bm,0,0,c.width,c.height);
  return new Promise(function(r){c.toBlob(function(b){r(b)},'image/webp',.86)})})}
/* proxy de vídeo grande: regrava em tempo real numa resolução menor (WebM) */
function videoProxy(file,onProg){
  return new Promise(function(res,rej){
    var v=document.createElement('video');v.muted=true;v.playsInline=true;v.src=URL.createObjectURL(file);
    v.onloadedmetadata=function(){
      var k=Math.min(1,960/Math.max(v.videoWidth,v.videoHeight)),c=document.createElement('canvas');c.width=Math.round(v.videoWidth*k/2)*2;c.height=Math.round(v.videoHeight*k/2)*2;var g=c.getContext('2d');
      var st=c.captureStream(30),mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].filter(function(m){return window.MediaRecorder&&MediaRecorder.isTypeSupported(m)})[0];if(!mime){rej(new Error('Sem gravador de vídeo neste navegador.'));return}
      var rec=new MediaRecorder(st,{mimeType:mime,videoBitsPerSecond:1800000}),ch=[];rec.ondataavailable=function(e){if(e.data.size)ch.push(e.data)};
      rec.onstop=function(){URL.revokeObjectURL(v.src);res(new Blob(ch,{type:'video/webm'}))};
      v.onended=function(){setTimeout(function(){rec.stop()},120)};
      rec.start(500);v.play().then(function(){(function loop(){if(v.ended)return;g.drawImage(v,0,0,c.width,c.height);if(onProg)onProg(v.currentTime/v.duration);requestAnimationFrame(loop)})()}).catch(rej);
    };
    v.onerror=function(){rej(new Error('O navegador não abre este vídeo.'))};
  });
}
/* conversão pelo ffmpeg do PC (só no web app) */
function serverConvert(file,to){
  if(!IS_LOCAL)return Promise.reject(new Error('Conversão disponível só no web app.'));
  return fetch('/api/convert?to='+to,{method:'POST',headers:{'x-name':encodeURIComponent(file.name)},body:file}).then(function(r){if(!r.ok)return r.json().then(function(b){throw new Error(b.message||'Falha na conversão')});return r.blob()}).then(function(b){return new File([b],file.name.replace(/\.[^.]+$/,'')+'.'+to,{type:to==='mp4'?'video/mp4':to==='m4a'?'audio/mp4':to==='png'?'image/png':'application/octet-stream'})});
}

/* ---------- roteador: decide o que fazer com cada arquivo ---------- */
var IMPORT_LOG=[];
function importFiles(list,opts){
  opts=opts||{};var files=Array.prototype.slice.call(list||[]);if(!files.length)return Promise.resolve();
  /* pasta com index.html na raiz → composição HTML (HyperFrames) */
  var rel=files.filter(function(f){return f.webkitRelativePath||f.relPath});
  if(rel.length){var root=hfFindRoot(files);if(root)return hfImportFiles(files,root);}
  var direct=[],jobs=[],msgs=[];
  var mdl=files.filter(function(f){return /\.(obj|gltf|fbx)$/i.test(f.name)});
  var pre=Promise.resolve();
  if(mdl.length){var pkg=files.filter(function(f){return /\.(obj|gltf|fbx|mtl|bin|png|jpe?g|webp|tga|ktx2)$/i.test(f.name)});files=files.filter(function(f){return pkg.indexOf(f)<0});pre=import3d(pkg,msgs)}
  var chain=files.reduce(function(c,f){return c.then(function(){return sniff(f).then(function(sn){return routeOne(f,sn,direct,msgs,opts)})})},pre);
  return chain.then(function(){
    if(direct.length)addFiles(direct,opts);
    if(msgs.length)showImportReport(msgs);
  });
}
function asFile(blob,name,type){return new File([blob],name,{type:type||blob.type})}
function routeOne(f,sn,direct,msgs,opts){
  var big=f.size>ASSET_MAX;
  switch(sn.cat){
    case 'image':
      if((sn.fmt==='gif'||sn.fmt==='webp'||sn.fmt==='png')&&window.ImageDecoder){return isAnimated(f,sn).then(function(an){if(an){f.__sprite=true}if(big&&!an){return imageProxy(f).then(function(b){var nf=asFile(b,f.name.replace(/\.[^.]+$/,'')+'.webp','image/webp');nf.__orig={name:f.name,size:f.size,type:f.type};direct.push(nf);msgs.push({ok:1,t:'“'+f.name+'” passou de 20 MB: usei uma prévia reduzida e guardei a referência ao original.'})})}direct.push(f)})}
      if(big)return imageProxy(f).then(function(b){var nf=asFile(b,f.name.replace(/\.[^.]+$/,'')+'.webp','image/webp');nf.__orig={name:f.name,size:f.size,type:f.type};direct.push(nf);msgs.push({ok:1,t:'“'+f.name+'” passou de 20 MB: usei uma prévia reduzida.'})});
      if(sn.fmt==='bmp'||sn.fmt==='ico'){return imageToPng(f).then(function(nf){direct.push(nf)})}
      direct.push(f);return;
    case 'heic':toast('Convertendo HEIC…');return lib('heic2any').then(function(){return heic2any({blob:f,toType:'image/jpeg',quality:.92})}).then(function(b){direct.push(asFile(Array.isArray(b)?b[0]:b,f.name.replace(/\.[^.]+$/,'')+'.jpg','image/jpeg'))}).catch(function(){msgs.push({t:'Não consegui converter “'+f.name+'” (HEIC). Exporte como JPG no celular ou no app Fotos.'})});
    case 'psd':return importPsd(f,msgs);
    case 'svg':return f.text().then(function(t){if(/<animate|<set\b|@keyframes|animation\s*:/i.test(t))return hfImportSingle(f,t,'svg');direct.push(asFile(f,f.name,'image/svg+xml'))});
    case 'video':
      return canPlay(f).then(function(ok){
        if(!ok){if(IS_LOCAL){toast('Convertendo “'+f.name+'” para MP4…');return serverConvert(f,'mp4').then(function(nf){direct.push(nf)}).catch(function(e){msgs.push({t:'Não consegui converter “'+f.name+'”: '+e.message})})}msgs.push({t:'O navegador não toca “'+f.name+'” ('+sn.label+'). Converta para MP4 (H.264) ou abra no web app, que converte com o ffmpeg do PC.'});return}
        if(big){progressModal('Criando prévia do vídeo','“'+f.name+'” tem '+fmtMB(f.size)+'. Vou gravar uma versão menor para caber no artefato (leva o tempo do vídeo).');exporting=true;
          return videoProxy(f,function(p){setProg(p)}).then(function(b){exporting=false;closeModal();var nf=asFile(b,f.name.replace(/\.[^.]+$/,'')+'_previa.webm','video/webm');nf.__orig={name:f.name,size:f.size,type:f.type};direct.push(nf);msgs.push({ok:1,t:'“'+f.name+'” virou uma prévia de '+fmtMB(b.size)+'. O web app usa o original na renderização.'})}).catch(function(e){exporting=false;closeModal();msgs.push({t:'Não consegui gerar a prévia de “'+f.name+'”: '+e.message})})}
        direct.push(f)});
    case 'convert':
      if(IS_LOCAL){toast('Convertendo “'+f.name+'” para MP4…');return serverConvert(f,'mp4').then(function(nf){direct.push(nf)}).catch(function(e){msgs.push({t:'Não consegui converter “'+f.name+'”: '+e.message})})}
      msgs.push({t:'“'+f.name+'” ('+sn.label+') precisa de conversão. Converta para MP4 ou abra no web app, que converte sozinho com o ffmpeg do PC.'});return;
    case 'audio':case 'aiff':
      big=!IS_LOCAL&&f.size*1.34>ASSET_MAX;
      if(sn.cat==='aiff'||big){
        toast('Convertendo áudio “'+f.name+'”…');
        return decodeAny(f,sn).then(function(buf){return encodeAudioBuffer(buf,big?128:192)}).then(function(r){var nf=asFile(r.blob,f.name.replace(/\.[^.]+$/,'')+'.'+r.ext,r.type);nf.__audio=true;if(big||sn.cat==='aiff')nf.__orig={name:f.name,size:f.size,type:f.type};direct.push(nf);if(big)msgs.push({ok:1,t:'“'+f.name+'” ('+fmtMB(f.size)+') foi convertido para '+r.ext.toUpperCase()+' com '+fmtMB(r.blob.size)+'. O original fica referenciado no projeto.'})})
          .catch(function(e){if(IS_LOCAL)return serverConvert(f,'m4a').then(function(nf){nf.__audio=true;direct.push(nf)});msgs.push({t:'Não consegui ler o áudio “'+f.name+'” ('+sn.label+'). Converta para MP3 ou WAV.'})});
      }
      f.__audio=true;direct.push(f);return;
    case 'font':return importFont(f,sn).then(function(fam){msgs.push({ok:1,t:'Fonte “'+fam+'” instalada. Escolha em Style → Marca, fontes e modelos.'})});
    case 'subs':return f.text().then(function(t){var it=sn.fmt==='vtt'?parseVtt(t):parseSrt(t);if(!it.length){msgs.push({t:'Não encontrei legendas em “'+f.name+'”.'});return}capCfg().items=it;capCfg().on=true;var n=subsToLayers(it);commit();fullRender();msgs.push({ok:1,t:it.length+' legendas de “'+f.name+'” viraram '+n+' camadas de texto com tempo (e a faixa de legendas foi preenchida).'})});
    case 'data':return f.text().then(function(t){importTable(parseDelimited(t,sn.fmt==='tsv'?'\t':null),f.name,msgs)});
    case 'json':return f.text().then(function(t){return importJson(f,t,msgs,direct)});
    case 'zip':return importZip(f,sn,msgs,direct,opts);
    case 'model':
      if(sn.fmt==='glb'){direct.push(asFile(f,f.name,'model/gltf-binary'));return}
      return import3d([f],msgs);
    case 'html':return f.text().then(function(t){return hfImportSingle(f,t,'html')});
    case 'aux':msgs.push({t:'“'+f.name+'” é um arquivo auxiliar ('+sn.label+'). Envie a pasta inteira junto com ele (por exemplo, o .obj com o .mtl e as texturas).'});return;
    default:msgs.push({t:unsupportedMsg(f,sn)});
  }
}
function fmtMB(n){return (n/1048576).toFixed(n>10485760?0:1).replace('.',',')+' MB'}
function canPlay(f){return new Promise(function(res){var v=document.createElement('video'),u=URL.createObjectURL(f),done=false;function fin(x){if(done)return;done=true;URL.revokeObjectURL(u);res(x)}v.preload='metadata';v.onloadedmetadata=function(){fin(v.videoWidth>0||v.duration>0)};v.onerror=function(){fin(false)};setTimeout(function(){fin(false)},8000);v.src=u})}
function isAnimated(f,sn){try{var d=new ImageDecoder({data:f.stream(),type:f.type||('image/'+sn.fmt)});return d.tracks.ready.then(function(){var a=d.tracks.selectedTrack&&d.tracks.selectedTrack.animated;d.close();return !!a}).catch(function(){return false})}catch(x){return Promise.resolve(false)}}
function imageToPng(f){return new Promise(function(res,rej){var im=new Image(),u=URL.createObjectURL(f);im.onload=function(){var c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);c.toBlob(function(b){URL.revokeObjectURL(u);res(asFile(b,f.name.replace(/\.[^.]+$/,'')+'.png','image/png'))},'image/png')};im.onerror=function(){rej(new Error('img'))};im.src=u})}
function showImportReport(msgs){
  var bad=msgs.filter(function(m){return !m.ok}),good=msgs.filter(function(m){return m.ok});
  if(!bad.length&&good.length<=1){toast(good[0]?good[0].t:'Importado.');return}
  modal('<div class="dh"><h3 id="mTitle">Importação</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>'+
    (good.length?'<ul class="ilist ok">'+good.map(function(m){return '<li>'+esc(m.t)+'</li>'}).join('')+'</ul>':'')+
    (bad.length?'<h4>Precisa de atenção</h4><ul class="ilist">'+bad.map(function(m){return '<li>'+esc(m.t)+'</li>'}).join('')+'</ul>':'')+
    '<div class="end"><button class="btn" data-close>Fechar</button></div>');
}

/* ---------- PSD com camadas ---------- */
function importPsd(f,msgs){
  toast('Abrindo PSD…');
  return Promise.all([lib('agpsd'),f.arrayBuffer()]).then(function(r){
    var psd=agPsd.readPsd(r[1],{skipThumbnail:true});var out=[];
    (function walk(list){(list||[]).forEach(function(L){if(L.children)walk(L.children);else if(L.canvas&&!L.hidden&&L.canvas.width>0)out.push(L)})})(psd.children);
    if(!out.length&&psd.canvas)out.push({name:f.name,canvas:psd.canvas,left:0,top:0});
    var sc=curScene(),k=Math.min(PW/psd.width,PH/psd.height),ox=(PW-psd.width*k)/2,oy=(PH-psd.height*k)/2;
    return out.reduce(function(c,L){return c.then(function(){return new Promise(function(res){L.canvas.toBlob(function(b){res(b)},'image/png')}).then(function(b){return putBlob(b,'image/png',L.name+'.png')}).then(function(st){
      var m={id:nid('m'),kind:'image',name:String(L.name||'Camada').slice(0,40),src:st.src,enc:'',w:L.canvas.width,h:L.canvas.height,size:st.size,saved:st.persisted};P.media.push(m);
      sc.els.push(el('image',{src:st.src,name:m.name,x:Math.round(ox+(L.left||0)*k),y:Math.round(oy+(L.top||0)*k),w:Math.round(L.canvas.width*k),h:Math.round(L.canvas.height*k),fit:'fill',opacity:L.opacity==null?1:L.opacity,anim:{in:'none'}}))})})},Promise.resolve())
      .then(function(){commit();fullRender();msgs.push({ok:1,t:'PSD “'+f.name+'”: '+out.length+' camada(s) viraram imagens separadas, na mesma posição.'})});
  }).catch(function(e){msgs.push({t:'Não consegui abrir o PSD “'+f.name+'”. Salve com "Maximizar compatibilidade" ou exporte as camadas em PNG.'})});
}
/* ---------- fontes ---------- */
function importFont(f,sn){
  var type={woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf'}[sn.fmt]||'font/ttf';
  var fam=f.name.replace(/\.[^.]+$/,'').replace(/[-_]+(regular|bold|medium|semibold|book|roman|light|black|thin|italic|var)$/i,'').replace(/[-_]+/g,' ').trim()||'Minha fonte';
  return putBlob(f,type,f.name).then(function(st){P.fonts.custom[fam]=st.src;FONT_LOADED[fam]=0;loadCustomFont(fam,st.src);commit();return fam});
}
/* ---------- legendas ---------- */
function parseVtt(t){
  var out=[];function T(x){var p=x.trim().replace(',','.').split(':').map(Number);return p.length===3?p[0]*3600+p[1]*60+p[2]:p[0]*60+p[1]}
  String(t).replace(/\r/g,'').split(/\n\s*\n/).forEach(function(b){var lines=b.split('\n'),k=lines.findIndex(function(l){return l.indexOf('-->')>=0});if(k<0)return;
    var m=/([\d:.,]+)\s*-->\s*([\d:.,]+)/.exec(lines[k]);if(!m)return;var text=lines.slice(k+1).join(' ').replace(/<[^>]+>/g,'').trim();if(text)out.push({t0:T(m[1]),t1:T(m[2]),text:text})});
  return out;
}
function subsToLayers(items){
  var n=0,acc=0,fs=Math.round(Math.min(PW,PH)*.05);
  P.scenes.forEach(function(sc){var s0=acc,s1=acc+sc.dur;acc=s1;items.forEach(function(it){if(it.t1<=s0||it.t0>=s1)return;var st=Math.max(0,it.t0-s0),en=Math.min(sc.dur,it.t1-s0);
    sc.els.push(el('text',{name:'Legenda '+(++n),text:it.text,x:Math.round(PW*.1),y:Math.round(PH*.8),w:Math.round(PW*.8),size:fs,align:'center',color:'#ffffff',font:'ui',weight:600,start:Math.round(st*100)/100,dur:Math.round((en-st)*100)/100,anim:{in:'fade',out:'fade',t:.2},fx:{shadow:14}}))})});
  capCfg().on=false;return n;
}
/* ---------- dados ---------- */
function parseDelimited(t,sep){
  t=String(t).replace(/^\uFEFF/,'');var first=t.split(/\r?\n/)[0]||'';sep=sep||((first.match(/;/g)||[]).length>(first.match(/,/g)||[]).length?';':first.indexOf('\t')>=0?'\t':',');
  var rows=[],row=[],cur='',q=false;for(var i=0;i<t.length;i++){var c=t[i];if(q){if(c==='"'&&t[i+1]==='"'){cur+='"';i++}else if(c==='"')q=false;else cur+=c}else if(c==='"')q=true;else if(c===sep){row.push(cur);cur=''}else if(c==='\n'||c==='\r'){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cur);cur='';if(row.some(function(x){return x.trim()}))rows.push(row);row=[]}else cur+=c}
  row.push(cur);if(row.some(function(x){return x.trim()}))rows.push(row);return rows;
}
function importTable(rows,name,msgs){
  if(!rows.length){msgs.push({t:'“'+name+'” está vazio.'});return}
  var head=rows[0],body=rows.slice(1),numCol=-1;
  for(var c=1;c<head.length;c++){if(body.every(function(r){return r[c]==null||r[c]===''||isFinite(num(String(r[c]).replace(/\./g,'').replace(',','.')))})){numCol=c;break}}
  if(numCol<0&&head.length>=2)numCol=1;
  var data=body.slice(0,24).map(function(r){var v=String(r[numCol]||'0').replace(/[^\d,.\-]/g,'');v=v.indexOf(',')>=0&&v.indexOf('.')>=0?v.replace(/\./g,'').replace(',','.'):v.replace(',','.');return {label:String(r[0]||''),value:+v||0}});
  var e=findEl(selEl);
  if(e&&e.kind==='chart'){e.data=data;msgs.push({ok:1,t:'Dados de “'+name+'” aplicados ao gráfico selecionado ('+data.length+' linhas).'})}
  else{var sc=curScene(),w=Math.round(PW*.7),h=Math.round(PH*.5);sc.els.push(el('chart',{name:name.replace(/\.[^.]+$/,''),data:data,x:Math.round((PW-w)/2),y:Math.round((PH-h)/2),w:w,h:h,unit:''}));msgs.push({ok:1,t:'Criei um gráfico com '+data.length+' linhas de “'+name+'”. Ele também fica em Dados e lote para vídeos em série.'})}
  if(typeof BATCH==='object'&&BATCH){BATCH.cols=head.map(String);BATCH.rows=body.map(function(r){var o={};head.forEach(function(h,i){o[h]=r[i]});return o})}
  commit();fullRender();
}
function importJson(f,t,msgs,direct){
  var o;try{o=JSON.parse(t)}catch(x){msgs.push({t:'“'+f.name+'” não é um JSON válido.'});return}
  if(o&&o.v!=null&&o.fr!=null&&o.layers){direct.push(asFile(f,f.name,'application/json'));return}
  if(o&&Array.isArray(o.scenes)&&(o.w||o.theme)){return createProject(Object.assign({},o,{name:(o.name||'Projeto importado')})).then(function(){msgs.push({ok:1,t:'Projeto “'+(o.name||f.name)+'” aberto numa nova aba da galeria.'})})}
  if(o&&typeof o.json==='string'){try{var p=JSON.parse(o.json);if(p.scenes)return createProject(p).then(function(){msgs.push({ok:1,t:'Projeto aberto.'})})}catch(x){}}
  var arr=Array.isArray(o)?o:(o&&Array.isArray(o.data)?o.data:null);
  if(arr&&arr.length&&typeof arr[0]==='object'){var keys=Object.keys(arr[0]);importTable([keys].concat(arr.map(function(r){return keys.map(function(k){return r[k]})})),f.name,msgs);return}
  if(o&&o.asset&&o.asset.version){return import3d([f],msgs)}
  msgs.push({t:'Não reconheci o conteúdo de “'+f.name+'”. Aceito projetos do editor, Lottie (Bodymovin), glTF e tabelas em JSON.'});
}
/* ---------- ZIP: composição, dotLottie, sequência de imagens ou pacote de arquivos ---------- */
function importZip(f,sn,msgs,direct,opts){
  return lib('jszip').then(function(){return JSZip.loadAsync(f)}).then(function(z){
    var names=Object.keys(z.files).filter(function(n){return !z.files[n].dir&&!/(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db)/.test(n)});
    if(sn.fmt==='xlsx'||names.some(function(n){return /^xl\/workbook\.xml$/.test(n)}))return lib('xlsx').then(function(){return f.arrayBuffer()}).then(function(ab){var wb=XLSX.read(ab,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];importTable(XLSX.utils.sheet_to_json(ws,{header:1,raw:false}).map(function(r){return r.map(function(x){return x==null?'':String(x)})}),f.name,msgs)});
    if(names.indexOf('manifest.json')>=0&&names.some(function(n){return /^animations\/.+\.json$/.test(n)}))return importDotLottie(z,f,names,direct,msgs);
    var files=names.map(function(n){return z.files[n].async('blob').then(function(b){var nf=new File([b],n.split('/').pop(),{type:mimeFor(n)});nf.relPath=n;return nf})});
    return Promise.all(files).then(function(list){
      var root=hfFindRoot(list);if(root)return hfImportFiles(list,root);
      var imgs=list.filter(function(x){return /\.(png|jpe?g|webp)$/i.test(x.name)});
      if(imgs.length>=3&&imgs.length===list.length){imgs.sort(function(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true})});var base=f.name.replace(/\.zip$/i,'').replace(/[^\w\-]+/g,'_');imgs.forEach(function(x,i){direct.push(asFile(x,base+'_'+String(i+1).padStart(4,'0')+'.'+extOf(x.name),x.type))});msgs.push({ok:1,t:imgs.length+' imagens de “'+f.name+'” viraram uma sequência animada (sprite).'});return}
      var models=list.filter(function(x){return /\.(gltf|obj|fbx|glb)$/i.test(x.name)});
      if(models.length)return import3d(list,msgs);
      return list.reduce(function(c,x){return c.then(function(){return sniff(x).then(function(s2){return routeOne(x,s2,direct,msgs,opts)})})},Promise.resolve());
    });
  }).catch(function(e){msgs.push({t:'Não consegui abrir o ZIP “'+f.name+'”: '+(e.message||e)})});
}
function mimeFor(n){var e=extOf(n);return {png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp',gif:'image/gif',svg:'image/svg+xml',avif:'image/avif',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',mp3:'audio/mpeg',wav:'audio/wav',flac:'audio/flac',ogg:'audio/ogg',opus:'audio/ogg',m4a:'audio/mp4',aac:'audio/aac',json:'application/json',js:'text/javascript',mjs:'text/javascript',css:'text/css',html:'text/html',htm:'text/html',ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2',glb:'model/gltf-binary',gltf:'model/gltf+json',bin:'application/octet-stream',txt:'text/plain',srt:'text/plain',vtt:'text/vtt',csv:'text/csv'}[e]||'application/octet-stream'}
function importDotLottie(z,f,names,direct,msgs){
  return z.file('manifest.json').async('string').then(function(mt){var man={};try{man=JSON.parse(mt)}catch(x){}
    var aid=(man.animations&&man.animations[0]&&man.animations[0].id)||names.filter(function(n){return /^animations\//.test(n)})[0].replace(/^animations\/|\.json$/g,'');
    return z.file('animations/'+aid+'.json').async('string').then(function(js){var anim=JSON.parse(js);
      var jobs=(anim.assets||[]).filter(function(a){return a.p&&!/^data:/.test(a.p)}).map(function(a){var p=(a.u||'').replace(/^\/+/,'')+a.p,cand=['images/'+a.p,p,'i/'+a.p].filter(function(n){return z.files[n]})[0];if(!cand)return null;
        return z.file(cand).async('base64').then(function(b64){a.u='';a.p='data:'+mimeFor(cand)+';base64,'+b64;a.e=1})}).filter(Boolean);
      return Promise.all(jobs).then(function(){direct.push(new File([JSON.stringify(anim)],f.name.replace(/\.lottie$/i,'')+'.json',{type:'application/json'}));msgs.push({ok:1,t:'dotLottie “'+f.name+'” aberto como animação Lottie.'})});
    });
  });
}
/* ---------- 3D: glTF com texturas, OBJ(+MTL) e FBX ---------- */
function import3d(list,msgs){
  var main=list.filter(function(x){return /\.(gltf|glb|fbx|obj)$/i.test(x.name)})[0];if(!main){msgs.push({t:'Não encontrei o modelo 3D no pacote.'});return Promise.resolve()}
  var fmt=extOf(main.name),others=list.filter(function(x){return x!==main});
  return Promise.all(list.map(function(x){return putBlob(x,mimeFor(x.name),x.name).then(function(st){return [x.relPath||x.webkitRelativePath||x.name,st.src]})})).then(function(pairs){
    var files={};pairs.forEach(function(p){files[p[0].split('/').pop()]=p[1];files[p[0]]=p[1]});
    var mainKey=main.relPath||main.webkitRelativePath||main.name,w3=Math.round(Math.min(PW,PH)*.7);
    var e=el('three',{mode:'model',fmt:fmt,src:files[mainKey],files:files,name:main.name.replace(/\.[^.]+$/,''),x:Math.round(PW/2-w3/2),y:Math.round(PH/2-w3/2),w:w3,h:w3});
    curScene().els.push(e);selEl=e.id;commit();fullRender();msgs.push({ok:1,t:fmt.toUpperCase()+' “'+main.name+'” importado'+(others.length?' com '+others.length+' arquivo(s) de apoio (texturas/materiais)':'')+'.'});
  });
}
