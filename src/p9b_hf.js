/* =========================================================
   Composições HTML (HyperFrames: HTML + GSAP) como camada "html"
   Importa pasta/ZIP, roda num iframe isolado, sincroniza o tempo,
   lê faixas <audio>, variáveis, cenas e camadas, e exporta de volta.
   ========================================================= */
var HF_SKIP=/(^|\/)(renders?|analise|análise|snapshots|\.thumbnails|\.waveform-cache|referencias|referências|node_modules|\.hyperframes|\.git|__MACOSX|backup[^\/]*)\//i;
function relOf(f){return String(f.relPath||f.webkitRelativePath||f.name).replace(/\\/g,'/')}
function hfFindRoot(files){
  var idx=files.filter(function(f){return /(^|\/)index\.html?$/i.test(relOf(f))&&!HF_SKIP.test(relOf(f))}).sort(function(a,b){return relOf(a).split('/').length-relOf(b).split('/').length})[0];
  if(!idx)return null;var r=relOf(idx);return {index:idx,prefix:r.slice(0,r.length-idx.name.length)};
}
function dirOf(p){var i=p.lastIndexOf('/');return i<0?'':p.slice(0,i+1)}
function joinPath(base,rel){if(/^(data:|blob:|https?:|\/\/|#|about:|javascript:|mailto:)/i.test(rel))return null;var q=rel.split(/[?#]/)[0];try{q=decodeURI(q)}catch(x){}var parts=q.charAt(0)==='/'?[]:base.split('/').filter(Boolean);q.replace(/^\.\//,'').split('/').forEach(function(s){if(!s||s==='.')return;if(s==='..')parts.pop();else parts.push(s)});return parts.join('/')}
function attrUnesc(s){var t=document.createElement('textarea');t.innerHTML=s;return t.value}

/* ---------- análise do index.html ---------- */
function hfAnalyze(html){
  var doc=new DOMParser().parseFromString(html,'text/html'),R={doc:doc};
  var root=doc.querySelector('[data-composition-id]')||doc.body;
  R.id=root.getAttribute('data-composition-id')||'main';
  R.w=+root.getAttribute('data-width')||+(/width=(\d+)/.exec((doc.querySelector('meta[name=viewport]')||{content:''}).content)||[])[1]||1920;
  R.h=+root.getAttribute('data-height')||+(/height=(\d+)/.exec((doc.querySelector('meta[name=viewport]')||{content:''}).content)||[])[1]||1080;
  R.dur=+root.getAttribute('data-duration')||0;R.fps=+root.getAttribute('data-fps')||30;
  R.title=(doc.querySelector('title')||{}).textContent||root.getAttribute('data-rev')||'Composição HTML';
  var vars=[];try{vars=JSON.parse(doc.documentElement.getAttribute('data-composition-variables')||'[]')}catch(x){}
  R.vars=(Array.isArray(vars)?vars:[]).filter(function(v){return v&&(v.id||v.name)}).map(function(v){return {id:String(v.id||v.name),type:v.type||(typeof v.default==='number'?'number':/^#/.test(v.default)?'color':'text'),label:v.label||v.id||v.name,default:v.default!=null?v.default:v.value,min:v.min,max:v.max,step:v.step}});
  R.audio=Array.prototype.map.call(doc.querySelectorAll('audio'),function(a,i){return {hfId:a.id||('audio'+(i+1)),src:a.getAttribute('src')||((a.querySelector('source')||{}).getAttribute?a.querySelector('source').getAttribute('src'):''),start:+a.getAttribute('data-start')||0,dur:+a.getAttribute('data-duration')||0,vol:a.hasAttribute('data-volume')?+a.getAttribute('data-volume'):1,idx:+a.getAttribute('data-track-index')||i,muted:a.hasAttribute('data-hidden'),label:a.getAttribute('data-rev')||a.id||('Faixa '+(i+1))}}).filter(function(a){return a.src}).sort(function(a,b){return a.idx-b.idx});
  R.layers=Array.prototype.map.call(doc.querySelectorAll('[data-rev-id]'),function(el){return {id:el.getAttribute('data-rev-id'),label:el.getAttribute('data-rev')||el.getAttribute('data-rev-id'),tag:el.tagName.toLowerCase(),hidden:el.hasAttribute('data-hidden')}}).filter(function(l){return l.tag!=='audio'&&l.id!=='root'});
  var js=Array.prototype.map.call(doc.querySelectorAll('script:not([src])'),function(s){return s.textContent}).join('\n'),cenas=[],m,re=/cena\(\s*['"]([^'"]+)['"]\s*,\s*([\d.]+)\s*,\s*([\d.]+)/g;
  while((m=re.exec(js)))cenas.push({id:m[1],a:+m[2],b:+m[3]});
  R.cenas=cenas;if(!R.dur&&cenas.length)R.dur=Math.max.apply(null,cenas.map(function(c){return c.b}));
  return R;
}
/* quais arquivos da pasta o index.html (e seus JS/CSS locais) realmente usam */
/* caminhos citados explicitamente que não vieram na pasta */
function hfMissing(doc,html,locals,entry,all){
  var base=dirOf(entry),seen={},out=[];
  function chk(p,from){if(!p||/\$\{/.test(p)||/^\s*(%23|#|data:|blob:|https?:|\/\/|mailto:|javascript:)/i.test(p))return;var k=joinPath(from==null?base:from,p.trim());if(!k||seen[k])return;seen[k]=1;if(!all[k]&&!HF_SKIP.test(k))out.push(k)}
  doc.querySelectorAll('[src],[poster],link[href],image[href]').forEach(function(n){['src','poster','href'].forEach(function(a){var v=n.getAttribute(a);if(v&&v.charAt(0)!=='#'&&!(n.tagName==='A'))chk(v)})});
  doc.querySelectorAll('script[type=importmap]').forEach(function(s){try{var im=JSON.parse(s.textContent);Object.keys(im.imports||{}).forEach(function(k){chk(im.imports[k])})}catch(x){}});
  var css=[];doc.querySelectorAll('style').forEach(function(s){css.push([s.textContent,null])});doc.querySelectorAll('[style]').forEach(function(n){css.push([n.getAttribute('style'),null])});
  locals.forEach(function(p){if(/\.css$/i.test(p[0]))css.push([p[1],dirOf(p[0])])});
  css.forEach(function(c){var m,re=/url\(\s*(['"]?)([^'")]+)\1\s*\)/g;while((m=re.exec(c[0])))chk(m[2],c[1])});
  var js=[[Array.prototype.map.call(doc.querySelectorAll('script:not([src])'),function(s){return s.textContent}).join('\n'),null]];locals.forEach(function(p){if(/\.m?js$/i.test(p[0]))js.push([p[1],dirOf(p[0])])});
  js.forEach(function(j){var m,re=/['"`]((?:\.{1,2}\/|[\w\-]+\/)[\w\-\/.%]+\.(?:png|jpe?g|webp|gif|svg|avif|mp4|webm|mov|mp3|wav|flac|ogg|m4a|aac|ttf|otf|woff2?|m?js|css|json|glb|gltf))['"`]/gi;while((m=re.exec(j[0])))chk(m[1],j[1])});
  return out;
}
function hfReferenced(all,texts){
  var big=texts.join('\n'),keys=Object.keys(all),out={},pre=[],m,re=/([\w\-.\/]+)\$\{[^}]*\}([\w\-.]*)/g;
  while((m=re.exec(big)))pre.push([m[1].replace(/^\.\//,''),m[2]]);
  keys.forEach(function(k){
    if(HF_SKIP.test(k))return;
    var base=k.split('/').pop(),hit=big.indexOf(k)>=0||big.indexOf(encodeURI(k))>=0||(base.length>5&&/\.(ttf|otf|woff2?|png|jpe?g|webp|svg|gif)$/i.test(base)&&big.indexOf('/'+base)>=0);
    if(!hit)hit=pre.some(function(p){return k.indexOf(p[0])===0&&(!p[1]||k.slice(-p[1].length)===p[1])&&p[0].length>3});
    if(hit)out[k]=all[k];
  });
  return out;
}
/* ---------- importação ---------- */
function hfImportFiles(files,root){
  var all={};files.forEach(function(f){var r=relOf(f);if(root.prefix&&r.indexOf(root.prefix)!==0)return;all[r.slice(root.prefix.length)]=f});
  var entry=relOf(root.index).slice(root.prefix.length);
  progressModal('Abrindo composição HTML','Lendo o index.html…');exporting=true;
  var warn=[],inIdb=[],sess=[];
  return root.index.text().then(function(html){
    var A=hfAnalyze(html),texts=[html];
    var local=Object.keys(all).filter(function(k){return /\.(m?js|css)$/i.test(k)&&!HF_SKIP.test(k)});
    return Promise.all(local.map(function(k){return all[k].text().then(function(t){return [k,t]})})).then(function(list){
      var firstRef=hfReferenced(all,[html]);list.forEach(function(p){if(firstRef[p[0]])texts.push(p[1])});
      var ref=hfReferenced(all,texts);ref[entry]=all[entry];
      var missing=hfMissing(A.doc,html,list.filter(function(p){return firstRef[p[0]]}),entry,all);
      var keys=Object.keys(ref),files2={},i=0,tot=keys.reduce(function(a,k){return a+ref[k].size},0);
      var audioKeys={};A.audio.forEach(function(a){var k=joinPath(dirOf(entry),a.src);if(k)audioKeys[k]=a});
      return keys.reduce(function(c,k){return c.then(function(){
        i++;setProg(i/keys.length*.92,'Guardando '+i+' de '+keys.length+': '+k);
        var f=ref[k],type=mimeFor(k);if(/\.html?$/i.test(k))type=IS_LOCAL?'text/html':'text/plain';
        var isAudio=/^audio\//.test(type)||/\.(wav|flac|aiff?|mp3|ogg|opus|m4a|aac)$/i.test(k);
        var job;
        if(isAudio&&!IS_LOCAL){job=sniff(f).then(function(sn){return decodeAny(f,sn)}).then(function(buf){return encodeAudioBuffer(buf,160)}).then(function(r){return putBlob(r.blob,r.type,k).then(function(st){st.proxy=true;st.orig={name:k,size:f.size,type:type};warn.push('Áudio “'+k+'” ('+fmtMB(f.size)+') guardado como '+r.ext.toUpperCase()+' de '+fmtMB(r.blob.size)+' (prévia). O original continua referenciado para o web app.');return st})})}
        else if(f.size>ASSET_MAX&&/^video\//.test(type)){job=videoProxy(f).then(function(b){return putBlob(b,'video/webm',k).then(function(st){st.proxy=true;st.orig={name:k,size:f.size,type:type};warn.push('Vídeo “'+k+'” virou uma prévia de '+fmtMB(b.size)+'.');return st})})}
        else if(f.size>ASSET_MAX&&/^image\//.test(type)){job=imageProxy(f).then(function(b){return putBlob(b,'image/webp',k).then(function(st){st.proxy=true;st.orig={name:k,size:f.size,type:type};warn.push('Imagem “'+k+'” reduzida para caber.');return st})})}
        else job=putBlob(f,type,k);
        return job.then(function(st){files2[k]={src:st.src,type:type,size:st.size||f.size,where:st.where};if(st.proxy){files2[k].proxy=true;files2[k].orig=st.orig}if(st.where==='session')sess.push(k);else if(st.where==='browser'&&!IS_LOCAL)inIdb.push(k)})
          .catch(function(e){warn.push('Não consegui guardar “'+k+'”: '+(e.message||e))});
      })},Promise.resolve()).then(function(){
        var three='';list.forEach(function(p){var mm=/three\.module(\.min)?\.js$/i.test(p[0])&&/const\s+\w+\s*=\s*"(\d{3})"/.exec(p[1].slice(0,600));if(mm)three='0.'+mm[1]+'.0'});
        var comp={missing:missing,entry:entry,w:A.w,h:A.h,dur:A.dur||10,fps:A.fps,id:A.id,title:A.title,files:files2,vars:A.vars,values:{},layers:A.layers.map(function(l){return {id:l.id,label:l.label}}),hidden:{},cenas:A.cenas,three:three};
        A.layers.forEach(function(l){if(l.hidden)comp.hidden[l.id]=true});
        A.vars.forEach(function(v){comp.values[v.id]=v.default});
        var dur=Math.max(1,comp.dur),htmlEl=el('html',{name:A.title.slice(0,60),x:0,y:0,w:Math.min(2160,A.w),h:Math.min(2160,A.h),comp:comp,anim:{in:'none'}});
        var audio=[],media=[];A.audio.forEach(function(a){var k=joinPath(dirOf(entry),a.src),fe=files2[k];if(!fe){warn.push('Faixa de áudio “'+a.label+'” não foi importada: o arquivo '+(k||a.src)+' está faltando na pasta'+(a.muted?' (a faixa já estava oculta com data-hidden)':'')+'.');return}var id=nid('a');
          media.push({id:nid('m'),kind:'audio',name:a.label.slice(0,40),src:fe.src,enc:'',dur:a.dur,size:fe.size,saved:fe.where!=='session',proxy:!!fe.proxy,orig:fe.orig||null,file:k});
          audio.push({id:id,name:a.label,src:fe.src,enc:'',start:a.start,offset:0,dur:a.dur||0,vol:a.vol,fadeIn:0,fadeOut:0,muted:!!a.muted,role:/efeito|sfx|fx\b/i.test(a.label)?'sfx':/voz|locu|narra/i.test(a.label)?'voice':'music',hfId:a.hfId,bpm:0,beats:[]})});
        var proj={name:A.title.slice(0,80),type:'edit',w:Math.min(2160,A.w),h:Math.min(2160,A.h),theme:{bg:'#000000',ink:'#ffffff',accent:'#F89833',on:'#000000'},themeName:'custom',
          scenes:[{name:A.title.slice(0,40),dur:dur,bg:'#000000',trans:'none',els:[htmlEl]}],audio:audio,media:media,markers:A.cenas.map(function(c){return {t:c.a,end:c.b,label:c.id}}),captions:{on:false,style:'pop',items:[]},duck:{on:false,amount:.7}};
        exporting=false;setProg(1,'Pronto.');
        return createProject(proj).then(function(){closeModal();
          var msg=[keys.length+' arquivos usados pela composição foram importados ('+fmtMB(tot)+'). '+A.audio.length+' faixa(s) de áudio, '+A.cenas.length+' cena(s), '+A.vars.length+' variável(is) e '+A.layers.length+' camada(s) nomeada(s).'];
          if(inIdb.length)warn.push('ok:'+inIdb.length+' arquivo(s) ficaram guardados no navegador (IndexedDB), porque o armazenamento do artefato não estava disponível. Eles reabrem neste navegador; em outro computador, importe a pasta de novo.');
          if(sess.length)warn.push(sess.length+' arquivo(s) ficaram só nesta sessão (sem espaço para salvar): '+sess.slice(0,6).join(', ')+(sess.length>6?'…':'')+'.');
          if(missing.length)warn.push('Faltando na pasta ('+missing.length+'): '+missing.slice(0,12).join(', ')+(missing.length>12?' e mais '+(missing.length-12):'')+'. O editor não tenta baixar esses arquivos.');
          showImportReport([{ok:1,t:msg[0]}].concat(warn.map(function(w){var ok=/^ok:/.test(w);return {ok:ok||/prévia|guardado como|reduzida/.test(w)?1:0,t:w.replace(/^ok:/,'')}})));
          selEl=htmlEl.id;openTweaks(true);renderPanel();
        });
      });
    });
  }).catch(function(e){exporting=false;exportFail({message:'Não consegui abrir a composição: '+(e.message||e)})});
}
/* SVG animado ou HTML solto como camada html de um arquivo só */
function hfImportSingle(f,text,kind){
  return putBlob(new Blob([text],{type:IS_LOCAL?(kind==='svg'?'image/svg+xml':'text/html'):'text/plain'}),kind==='svg'?'image/svg+xml':'text/plain',f.name).then(function(st){
    var w=PW,h=PH;if(kind==='svg'){var m=/viewBox\s*=\s*["'][\d.\-]+[\s,]+[\d.\-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(text);if(m){var k=Math.min(PW*.8/+m[1],PH*.8/+m[2]);w=Math.round(+m[1]*k);h=Math.round(+m[2]*k)}}
    var entry=kind==='svg'?'anim.svg':'index.html',files={};files[entry]={src:st.src,type:kind==='svg'?'image/svg+xml':'text/html',size:f.size};
    var A=kind==='html'?hfAnalyze(text):{w:w,h:h,dur:curScene().dur,vars:[],layers:[],cenas:[],title:f.name,id:'main',fps:30};
    var comp={entry:entry,w:kind==='svg'?w:A.w,h:kind==='svg'?h:A.h,dur:A.dur||curScene().dur,fps:A.fps||30,id:A.id,title:f.name,files:files,vars:A.vars||[],values:{},layers:(A.layers||[]).map(function(l){return {id:l.id,label:l.label}}),hidden:{},cenas:A.cenas||[],svg:kind==='svg'};
    var e=el('html',{name:f.name.replace(/\.[^.]+$/,''),x:Math.round((PW-w)/2),y:Math.round((PH-h)/2),w:w,h:h,comp:comp,anim:{in:'none'}});
    if(kind==='html'){e.x=0;e.y=0;e.w=PW;e.h=PH}
    curScene().els.push(e);selEl=e.id;commit();fullRender();toast(kind==='svg'?'SVG animado aberto como camada animada (o tempo segue a linha do tempo).':'HTML aberto como composição.');
  });
}

/* ---------- montagem do documento que roda no iframe ---------- */
function hfURL(src){var u=srcURL(src);if(!u)return '';if(u.charAt(0)==='/')return location.origin+u;return u}
function fetchText(src,label){var u=srcURL(src);if(!u)return Promise.reject(new Error('Arquivo '+(label||src||'?')+' não encontrado. Envie a pasta de novo.'));return fetch(u).then(function(r){if(!r.ok)throw new Error('Arquivo '+(label||src)+' não encontrado ('+r.status+').');return r.text()})}
function HF_BOOT(MAP,BASE){
  window.__timelines=window.__timelines||{};
  function norm(p){if(typeof p!=='string')return p;if(/^(data:|blob:|https?:|\/\/|#|about:|javascript:)/i.test(p))return p;var q=p.split(/[?#]/)[0];try{q=decodeURI(q)}catch(e){}var parts=q.charAt(0)==='/'?[]:BASE.split('/').filter(Boolean);q.replace(/^\.\//,'').split('/').forEach(function(s){if(!s||s==='.')return;if(s==='..')parts.pop();else parts.push(s)});var k=parts.join('/');return MAP[k]||(/\.(png|jpe?g|gif|webp|avif|svg)$/i.test(k)?'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==':'data:,')}
  function css(s){return typeof s==='string'?s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,function(m,q,u){return 'url('+q+norm(u)+q+')'}):s}
  function html(s){return typeof s==='string'?css(s.replace(/(\s(?:src|href|poster)\s*=\s*)(["'])([^"']*)\2/gi,function(m,a,q,u){return a+q+norm(u)+q})):s}
  window.__hfMap=norm;
  function patch(proto,prop,fn){var d=proto&&Object.getOwnPropertyDescriptor(proto,prop);if(!d||!d.set)return;Object.defineProperty(proto,prop,{get:d.get,set:function(v){d.set.call(this,(fn||norm)(v))},configurable:true,enumerable:d.enumerable})}
  patch(HTMLImageElement.prototype,'src');patch(HTMLMediaElement.prototype,'src');patch(HTMLSourceElement.prototype,'src');patch(HTMLLinkElement.prototype,'href');patch(HTMLVideoElement.prototype,'poster');patch(HTMLImageElement.prototype,'srcset');
  ['innerHTML','outerHTML'].forEach(function(p){patch(Element.prototype,p,html)});
  var iah=Element.prototype.insertAdjacentHTML;Element.prototype.insertAdjacentHTML=function(w,s){return iah.call(this,w,html(s))};
  var sa=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(/^(src|href|poster|xlink:href)$/i.test(n))v=norm(v);else if(n==='style')v=css(v);return sa.call(this,n,v)};
  var sp=CSSStyleDeclaration.prototype.setProperty;CSSStyleDeclaration.prototype.setProperty=function(n,v,pr){return sp.call(this,n,css(v),pr)};
  ['backgroundImage','background','maskImage','webkitMaskImage','listStyleImage','borderImage','content','cursor'].forEach(function(p){patch(CSSStyleDeclaration.prototype,p,css)});
  var of=window.fetch;if(of)window.fetch=function(u,o){if(typeof u==='string')u=norm(u);return of.call(this,u,o)};
  var xo=XMLHttpRequest.prototype.open;XMLHttpRequest.prototype.open=function(m,u){arguments[1]=norm(u);return xo.apply(this,arguments)};
  var FF=window.FontFace;if(FF){var NF=function(f,s,d){return new FF(f,typeof s==='string'?css(s):s,d)};NF.prototype=FF.prototype;window.FontFace=NF}
  var AU=window.Audio;if(AU){var NA=function(s){var a=new AU(s?norm(s):undefined);a.muted=true;return a};NA.prototype=AU.prototype;window.Audio=NA}
  /* relógio virtual controlado pelo editor */
  var VT=0,T0=Date.now(),rq=window.requestAnimationFrame.bind(window);
  performance.now=function(){return VT*1000};Date.now=function(){return T0+Math.round(VT*1000)};
  window.requestAnimationFrame=function(cb){return rq(function(){cb(VT*1000)})};
  var H=window.__hf={hidden:{}};
  function clips(t,playing){
    document.querySelectorAll('audio').forEach(function(a){a.muted=true;if(!a.paused)a.pause()});
    document.querySelectorAll('[data-start]').forEach(function(el){
      if(el.hasAttribute('data-composition-id')||el.tagName==='AUDIO')return;
      var s=+el.getAttribute('data-start')||0,d=el.hasAttribute('data-duration')?+el.getAttribute('data-duration'):1e9,on=t>=s&&t<s+d;
      if(el.tagName==='VIDEO'){var want=(+el.getAttribute('data-media-start')||0)+(t-s);el.muted=true;
        if(on){if(playing){if(el.paused){var pr=el.play();if(pr&&pr.catch)pr.catch(function(){})}if(Math.abs(el.currentTime-want)>.3)el.currentTime=want}else{if(!el.paused)el.pause();if(Math.abs(el.currentTime-want)>.04)el.currentTime=want}}else if(!el.paused)el.pause()}
      if(el.classList.contains('clip')||el.tagName==='VIDEO')el.style.visibility=on?'':'hidden';
    });
    document.querySelectorAll('[data-rev-id]').forEach(function(el){var id=el.getAttribute('data-rev-id');if(H.hidden[id])el.style.setProperty('visibility','hidden','important');else if(el.style.getPropertyPriority('visibility')==='important')el.style.removeProperty('visibility')});
  }
  H.seek=function(t,playing){VT=t;var tls=window.__timelines||{},n=0;
    Object.keys(tls).forEach(function(k){var tl=tls[k];if(tl&&typeof tl.seek==='function'){try{if(!tl.paused())tl.pause();tl.seek(t,false);n++}catch(e){}}});
    if(!n&&window.gsap&&gsap.globalTimeline){try{gsap.globalTimeline.pause();gsap.globalTimeline.time(t,false)}catch(e){}}
    try{document.getAnimations().forEach(function(a){if(a.playState!=='finished'||true){a.pause();a.currentTime=t*1000}})}catch(e){}
    document.querySelectorAll('svg').forEach(function(s){if(s.pauseAnimations&&s.ownerSVGElement==null){try{s.pauseAnimations();s.setCurrentTime(t)}catch(e){}}});
    clips(t,playing);window.__hfThreeTime=t;try{window.dispatchEvent(new CustomEvent('hf-seek',{detail:{time:t}}))}catch(e){}
  };
  H.info=function(){var tls=window.__timelines||{},d=0;Object.keys(tls).forEach(function(k){try{d=Math.max(d,tls[k].duration())}catch(e){}});return {timelines:Object.keys(tls),duration:d,gsap:!!window.gsap}};
  H.setVars=function(v){var r=document.documentElement;Object.keys(v).forEach(function(k){r.style.setProperty('--'+k,v[k])});window.__hfVariables=Object.assign(window.__hfVariables||{},v);try{window.dispatchEvent(new CustomEvent('hf-variables',{detail:v}))}catch(e){}};
  H.setHidden=function(m){H.hidden=m||{};clips(VT,false)};
}
var THREE_ADDONS={RoundedBoxGeometry:'geometries',TextGeometry:'geometries',DecalGeometry:'geometries',ConvexGeometry:'geometries',RoomEnvironment:'environments',OrbitControls:'controls',TrackballControls:'controls',GLTFLoader:'loaders',RGBELoader:'loaders',DRACOLoader:'loaders',FontLoader:'loaders',SVGLoader:'loaders',OBJLoader:'loaders',MTLLoader:'loaders',FBXLoader:'loaders',EXRLoader:'loaders',KTX2Loader:'loaders',EffectComposer:'postprocessing',RenderPass:'postprocessing',UnrealBloomPass:'postprocessing',OutputPass:'postprocessing',ShaderPass:'postprocessing',SMAAPass:'postprocessing',BokehPass:'postprocessing',CSS2DRenderer:'renderers',CSS3DRenderer:'renderers',Reflector:'objects',Water:'objects',Sky:'objects',RoundedBoxGeometryBuffer:'geometries'};
/* no artefato, three.js e seus complementos vêm do CDN (permitido), o resto do armazenamento */
function hfCdn(C,k){if(IS_LOCAL||!C.three||!k)return null;var b=k.split('/').pop();if(/^three\.module(\.min)?\.js$/i.test(b))return 'https://cdn.jsdelivr.net/npm/three@'+C.three+'/build/three.module.min.js';var n=b.replace(/\.js$/,'');if(THREE_ADDONS[n])return 'https://cdn.jsdelivr.net/npm/three@'+C.three+'/examples/jsm/'+THREE_ADDONS[n]+'/'+n+'.js';return null}
function hfBuildDoc(e){return IDB_READY.then(function(){return hfBuildDoc2(e)})}
var HF_BLANK={img:'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='};
function hfBuildDoc2(e){
  var C=e.comp,fileKeys=Object.keys(C.files||{}),MAP={},lost=[];fileKeys.forEach(function(k){var u=hfCdn(C,k)||hfURL(C.files[k].src);if(u)MAP[k]=u;else lost.push(k)});
  if(!MAP[C.entry])return Promise.reject(new Error('O index.html da composição não está disponível neste navegador. Abra a pasta de novo.'));
  C.lost=lost;
  var base=dirOf(C.entry);
  if(C.svg)return fetchText(C.files[C.entry]&&C.files[C.entry].src,C.entry).then(function(svg){return '<!DOCTYPE html><html><head><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:transparent}svg{width:100%;height:100%;display:block}</style><script>('+HF_BOOT.toString()+')({},"");<\/script></head><body>'+svg.replace(/^<\?xml[^>]*>/,'')+'</body></html>'});
  return fetchText(C.files[C.entry]&&C.files[C.entry].src,C.entry).then(function(html){
    var doc=new DOMParser().parseFromString(html,'text/html');
    function map(p,from,kind){var k=joinPath(from==null?base:from,p);if(!k)return p;if(MAP[k])return MAP[k];return kind==='img'?HF_BLANK.img:'data:,'}
    function cssFix(s,from){return s.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g,function(m,q,u){return 'url('+q+map(u,from)+q+')'})}
    function jsImports(s,from){return s.replace(/(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(['"])(\.{0,2}\/[^'"]+)\2/g,function(m,a,q,u){return a+q+map(u,from)+q})}
    var jobs=[];
    /* variáveis e camadas ocultas */
    if(C.vars&&C.vars.length){var vv=C.vars.map(function(v){var o=Object.assign({},v);if(C.values&&C.values[v.id]!=null)o.default=C.values[v.id];return o});doc.documentElement.setAttribute('data-composition-variables',JSON.stringify(vv))}
    Object.keys(C.hidden||{}).forEach(function(id){var n=doc.querySelector('[data-rev-id="'+id+'"]');if(n&&C.hidden[id])n.setAttribute('data-hidden','')});
    doc.querySelectorAll('audio').forEach(function(a){a.setAttribute('muted','');a.removeAttribute('autoplay');a.setAttribute('preload','none');var s=a.getAttribute('src'),k=s&&joinPath(base,s);if(s){if(k&&!MAP[k])a.removeAttribute('src');else a.setAttribute('src',map(s))}});
    doc.querySelectorAll('[src]').forEach(function(n){if(n.tagName==='SCRIPT'||n.tagName==='AUDIO')return;var s=n.getAttribute('src'),k=joinPath(base,s);if(k&&!MAP[k]&&/^(VIDEO|SOURCE|IFRAME|EMBED|TRACK)$/.test(n.tagName)){n.removeAttribute('src');return}n.setAttribute('src',map(s,null,n.tagName==='IMG'?'img':''))});
    doc.querySelectorAll('[poster]').forEach(function(n){n.setAttribute('poster',map(n.getAttribute('poster')))});
    doc.querySelectorAll('image[href],use[href]').forEach(function(n){var h=n.getAttribute('href');if(h&&h.charAt(0)!=='#')n.setAttribute('href',map(h))});
    doc.querySelectorAll('[style]').forEach(function(n){n.setAttribute('style',cssFix(n.getAttribute('style')))});
    doc.querySelectorAll('style').forEach(function(s){s.textContent=cssFix(s.textContent)});
    doc.querySelectorAll('link[rel~=stylesheet][href]').forEach(function(l){var k=joinPath(base,l.getAttribute('href'));if(k&&C.files[k]){jobs.push(fetchText(C.files[k].src,k).then(function(t){var st=doc.createElement('style');st.textContent=cssFix(t,dirOf(k));l.replaceWith(st)}))}});
    doc.querySelectorAll('link[rel~=icon][href],link[rel=preload][href]').forEach(function(l){l.setAttribute('href',map(l.getAttribute('href')))});
    doc.querySelectorAll('script[type=importmap]').forEach(function(s){try{var im=JSON.parse(s.textContent);Object.keys(im.imports||{}).forEach(function(k){im.imports[k]=map(im.imports[k])});s.textContent=JSON.stringify(im)}catch(x){}});
    doc.querySelectorAll('script[src]').forEach(function(s){var src=s.getAttribute('src'),k=joinPath(base,src);if(k&&!MAP[k]){s.remove();return}if(!k||!C.files[k])return;var isMod=s.getAttribute('type')==='module';
      jobs.push(fetchText(C.files[k].src,k).then(function(t){var n=doc.createElement('script');if(isMod){n.type='module';t=jsImports(t,dirOf(k))}n.textContent=t.replace(/<\/script/gi,'<\\/script');s.replaceWith(n)}))});
    doc.querySelectorAll('script[type=module]:not([src])').forEach(function(s){s.textContent=jsImports(s.textContent,base)});
    return Promise.all(jobs).then(function(){
      var boot=doc.createElement('script');boot.textContent='('+HF_BOOT.toString()+')('+JSON.stringify(MAP)+','+JSON.stringify(base)+');';
      var head=doc.head||doc.documentElement;head.insertBefore(boot,head.firstChild);
      var st=doc.createElement('style');st.textContent='html,body{overflow:hidden!important}';head.appendChild(st);
      return '<!DOCTYPE html>\n'+doc.documentElement.outerHTML;
    });
  });
}

/* ---------- visualização no palco (iframe sincronizado) ---------- */
var HTMLV={},HTML_SPLIT=null;
function hfSig(e){var C=e.comp||{};return JSON.stringify([C.entry,Object.keys(C.files||{}).length,C.values,C.rev||0,C.files&&C.files[C.entry]&&C.files[C.entry].src])}
function hfLayerEl(){var L=$('#htmlLayer');if(!L){L=document.createElement('div');L.id='htmlLayer';L.className='htmllayer';stage.insertBefore(L,$('#ov'));var top=document.createElement('canvas');top.id='cvTop';top.className='cvtop';stage.insertBefore(top,$('#ov'))}return L}
function hfMount(e){
  var v=HTMLV[e.id],sig=hfSig(e);if(v&&v.sig===sig)return v;
  if(v&&v.frame)v.frame.remove();
  var L=hfLayerEl(),fr=document.createElement('iframe');fr.setAttribute('sandbox','allow-scripts allow-same-origin');fr.setAttribute('title','Composição HTML');fr.className='hfframe';
  fr.style.width=(e.comp.w||1920)+'px';fr.style.height=(e.comp.h||1080)+'px';L.appendChild(fr);
  v=HTMLV[e.id]={frame:fr,sig:sig,ready:false,status:'Carregando composição…',api:null,id:e.id};
  hfBuildDoc(e).then(function(doc){fr.srcdoc=doc}).catch(function(err){v.status='Erro: '+(err.message||err);redraw()});
  fr.onload=function(){var w=fr.contentWindow;var tries=0;(function wait(){var api=w&&w.__hf;if(api){var info=api.info();if(info.timelines.length||tries>40){v.api=api;v.ready=true;v.info=info;v.status=info.timelines.length?'Timeline “'+info.timelines.join(', ')+'” conectada':info.gsap?'GSAP sem timeline registrada: usando o relógio global':'Sem GSAP: usando relógio virtual e animações CSS';
      if(e.comp.values)api.setVars(e.comp.values);api.setHidden(e.comp.hidden||{});
      if(!e.comp.durChecked&&info.duration>0&&!(e.comp.dur>0)){e.comp.dur=info.duration}e.comp.durChecked=true;
      v.last=-1;draw();if(tab==='tweaks'&&selEl===e.id)renderPanel();return}}
    tries++;setTimeout(wait,150)})()};
  return v;
}
function hfSync(){
  var a=sceneAt(t),sc=P.scenes[a.i],seen={};
  var k=stage.clientWidth/PW;
  sc.els.forEach(function(e){if(e.kind!=='html'||!e.comp)return;seen[e.id]=1;
    var v=hfMount(e),vis=isVisible(e,sc,a.lt),ev=evalEl(e,a.lt),b=bbox(ev),s=(+ev.scale||1);
    v.frame.style.display=vis?'block':'none';if(!vis)return;
    var sw=b.w*k/(e.comp.w||1920),sh=b.h*k/(e.comp.h||1080),cx=b.x+b.w/2,cy=b.y+b.h/2;
    v.frame.style.transform='translate('+((cx-b.w*s/2)*k)+'px,'+((cy-b.h*s/2)*k)+'px) rotate('+(+ev.rot||0)+'deg) scale('+(sw*s)+','+(sh*s)+')';
    v.frame.style.opacity=ev.opacity==null?1:ev.opacity;
    if(v.ready){var lt=a.lt-(+e.start||0)+(+e.offset||0);if(Math.abs(lt-v.last)>1e-4||playing!==v.wasPlaying){v.last=lt;v.wasPlaying=playing;try{v.api.seek(Math.max(0,lt),playing)}catch(x){}}}
  });
  Object.keys(HTMLV).forEach(function(id){if(!seen[id]&&HTMLV[id].frame)HTMLV[id].frame.style.display='none'});
  var top=$('#cvTop');if(top&&!HTML_SPLIT&&top.__dirty){top.getContext('2d').clearRect(0,0,top.width,top.height);top.__dirty=false}
}
function htmlIndex(sc,lt){for(var i=0;i<sc.els.length;i++){var e=sc.els[i];if(e.kind==='html'&&e.comp&&isVisible(e,sc,lt))return i}return -1}
/* desenha as camadas acima da composição num canvas por cima do iframe */
function drawTopLayer(sc,lt,tt){
  hfLayerEl();var top=$('#cvTop');if(top.width!==cv.width||top.height!==cv.height){top.width=cv.width;top.height=cv.height}
  var g=top.getContext('2d');g.setTransform(1,0,0,1,0,0);g.clearRect(0,0,top.width,top.height);top.__dirty=true;
  var k=HTML_SPLIT.k;withCtx(g,function(){ctx.setTransform(SC,0,0,SC,0,0);ctx.globalAlpha=1;ctx.save();applyCam(camAt(sc,lt));
    sc.els.forEach(function(e,i){if(i>k)drawEl(e,lt,sc,{})});ctx.restore();drawLogo();drawCaptions(tt)});
}
DK.html=function(e,b,p,lt){
  if(ctx.canvas===cv&&!exporting)return; /* no palco o iframe mostra a composição */
  var v=HTMLV[e.id];if(v&&v.snap){ctx.drawImage(v.snap,b.x,b.y,b.w,b.h);return}
  ctx.save();ctx.fillStyle='#0b0b10';ctx.fillRect(b.x,b.y,b.w,b.h);ctx.fillStyle='rgba(255,255,255,.75)';ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=fnt(600,Math.max(14,b.w/40),'ui');ctx.fillText('Composição HTML: '+(e.name||''),b.x+b.w/2,b.y+b.h/2-b.w/60);
  ctx.font=fnt(400,Math.max(11,b.w/70),'ui');ctx.fillText('Para exportar com ela, use “Gravar o palco” ou renderize o .zip no HyperFrames',b.x+b.w/2,b.y+b.h/2+b.w/60);ctx.restore();
};
function hasHtmlLayer(proj){proj=proj||P;return proj.scenes.some(function(s){return s.els.some(function(e){return e.kind==='html'})})}

/* ---------- painel da camada html ---------- */
function htmlExtras(e){
  var C=e.comp||{},v=HTMLV[e.id],h='';
  h+='<p class="info">'+esc(C.w+'×'+C.h)+' · '+fmtS(C.dur||0)+' · '+Object.keys(C.files||{}).length+' arquivos · '+(v?esc(v.status):'Carregando…')+'</p>';
  h+='<div class="two">'+fld({p:'offset',l:'Deslocar tempo (s)',t:'num',step:.1},'el')+'<span></span></div>';
  if(C.cenas&&C.cenas.length){h+='<details class="grp" open><summary>Cenas ('+C.cenas.length+')</summary><div class="gb hfscenes">'+C.cenas.map(function(c){return '<button class="chip" data-act="hfseek" data-t="'+c.a+'" title="'+fmtS(c.a)+' a '+fmtS(c.b)+'">'+esc(c.id)+' <i>'+fmtClock(c.a)+'</i></button>'}).join('')+'</div></details>'}
  if(C.vars&&C.vars.length){h+='<details class="grp" open><summary>Variáveis da composição</summary><div class="gb">'+C.vars.map(function(vr){var val=C.values&&C.values[vr.id]!=null?C.values[vr.id]:vr.default;
    if(vr.type==='color')return '<label class="f"><span>'+esc(vr.label)+'</span><input type="color" data-hv="'+esc(vr.id)+'" value="'+esc(toHex(val||'#000000'))+'"></label>';
    if(vr.type==='number')return '<label class="f"><span>'+esc(vr.label)+'</span><input type="number" data-hv="'+esc(vr.id)+'" data-num="1" value="'+esc(val)+'"'+(vr.min!=null?' min="'+vr.min+'"':'')+(vr.max!=null?' max="'+vr.max+'"':'')+(vr.step!=null?' step="'+vr.step+'"':'')+'></label>';
    return '<label class="f"><span>'+esc(vr.label)+'</span><input type="text" data-hv="'+esc(vr.id)+'" value="'+esc(val==null?'':val)+'"></label>'}).join('')+
    '<p class="info">As mudanças entram ao vivo (como variáveis CSS e no atributo data-composition-variables) e vão no index.html exportado. Se a composição só lê as variáveis ao abrir, use Recarregar.</p></div></details>'}
  var tr=P.audio.filter(function(a){return a.hfId});
  if(tr.length){h+='<details class="grp" open><summary>Faixas de áudio da composição</summary><div class="gb">'+tr.map(function(a){return '<div class="hftrack"><label class="chk"><input type="checkbox" data-htr="'+a.id+'"'+(a.muted?'':' checked')+'> '+esc(a.name)+'</label><input type="range" min="0" max="1.5" step=".05" data-htv="'+a.id+'" value="'+(+a.vol)+'" aria-label="Volume de '+esc(a.name)+'"></div>'}).join('')+'</div></details>'}
  if(C.layers&&C.layers.length){h+='<details class="grp"><summary>Camadas da composição ('+C.layers.length+')</summary><div class="gb hflayers">'+C.layers.map(function(l){var hid=C.hidden&&C.hidden[l.id];return '<button class="hfl'+(hid?' off':'')+'" data-act="hflayer" data-id="'+esc(l.id)+'" aria-pressed="'+(!hid)+'">'+(hid?IC.x:IC.check)+'<span>'+esc(l.label)+'</span></button>'}).join('')+'</div></details>'}
  var miss=(C.missing||[]).concat(C.lost||[]);if(miss.length)h+='<p class="info" style="color:#d97706">Faltando ('+miss.length+'): '+miss.slice(0,8).map(esc).join(', ')+(miss.length>8?'…':'')+'. Esses arquivos não são buscados.</p>';
  var px=Object.keys(C.files||{}).filter(function(k){return C.files[k].proxy});
  if(px.length)h+='<p class="info">Prévia leve no lugar do original: '+px.map(esc).join(', ')+'. O web app usa os originais.</p>';
  h+='<div class="btnrow"><button class="btn sm" data-act="hfreload">Recarregar</button><button class="btn sm accent" data-act="hfzip">'+IC.dl+'Exportar composição (.zip)</button><button class="btn sm" data-act="hfindex">Só o index.html</button></div>';
  return h;
}
Object.assign(handlers,{
  hfseek:function(b,e){var sc=curScene();seek(sceneStart(selScene)+(+e.start||0)+(+b.dataset.t)-(+e.offset||0))},
  hflayer:function(b,e){var id=b.dataset.id;e.comp.hidden=e.comp.hidden||{};if(e.comp.hidden[id])delete e.comp.hidden[id];else e.comp.hidden[id]=true;var v=HTMLV[e.id];if(v&&v.api)v.api.setHidden(e.comp.hidden);commit();renderPanel()},
  hfreload:function(b,e){e.comp.rev=(e.comp.rev||0)+1;commit();draw();renderPanel()},
  hfzip:function(b,e){hfExport(e,true)},
  hfindex:function(b,e){hfExport(e,false)}
});
$('#pane').addEventListener('input',function(ev){var x=ev.target,e=findEl(selEl);if(!e||e.kind!=='html')return;
  if(x.dataset.hv!=null){var v=x.dataset.num?+x.value:x.value;e.comp.values=e.comp.values||{};e.comp.values[x.dataset.hv]=v;var o={};o[x.dataset.hv]=v;var hv=HTMLV[e.id];if(hv&&hv.api)hv.api.setVars(o);touch()}
  if(x.dataset.htv!=null){var tr=trackById(x.dataset.htv);if(tr){tr.vol=+x.value;renderAudioLane();if(playing)aeStart(t);touch()}}});
$('#pane').addEventListener('change',function(ev){var x=ev.target,e=findEl(selEl);if(!e||e.kind!=='html')return;
  if(x.dataset.htr!=null){var tr=trackById(x.dataset.htr);if(tr){tr.muted=!x.checked;renderAudioLane();if(playing)aeStart(t)}}
  if(x.dataset.hv!=null||x.dataset.htv!=null||x.dataset.htr!=null)commit()});

/* ---------- exportar de volta: index.html com as mudanças + pasta em .zip ---------- */
function hfPatchedIndex(e){
  var C=e.comp;return fetchText(C.files[C.entry]&&C.files[C.entry].src,C.entry).then(function(html){
    function setAttr(tag,name,val){var re=new RegExp('\\s'+name+'(="[^"]*"|=\'[^\']*\'|(?=[\\s>/]))','i');if(val==null)return tag.replace(re,'');var a=' '+name+(val===''?'':'="'+String(val).replace(/"/g,'&quot;')+'"');return re.test(tag)?tag.replace(re,a):tag.replace(/(\s*\/?>)$/,a+'$1')}
    P.audio.filter(function(a){return a.hfId}).forEach(function(a){var re=new RegExp('<audio\\b[^>]*\\bid=["\']'+a.hfId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\'][^>]*>','i');html=html.replace(re,function(tag){tag=setAttr(tag,'data-volume',Math.round(a.vol*100)/100);tag=setAttr(tag,'data-start',Math.round((+a.start||0)*1000)/1000);if(a.dur)tag=setAttr(tag,'data-duration',a.dur);tag=setAttr(tag,'data-hidden',a.muted?'':null);return tag})});
    Object.keys(C.layers||[]).length&&C.layers.forEach(function(l){var re=new RegExp('<[a-z][^>]*\\bdata-rev-id=["\']'+l.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'["\'][^>]*>','i');html=html.replace(re,function(tag){return setAttr(tag,'data-hidden',C.hidden&&C.hidden[l.id]?'':null)})});
    if(C.vars&&C.vars.length){var vv=C.vars.map(function(v){var o={id:v.id,type:v.type,label:v.label,default:C.values&&C.values[v.id]!=null?C.values[v.id]:v.default};if(v.min!=null)o.min=v.min;if(v.max!=null)o.max=v.max;if(v.step!=null)o.step=v.step;return o});
      var json=JSON.stringify(vv).replace(/&/g,'&amp;').replace(/"/g,'&quot;');html=html.replace(/(<html\b[^>]*\bdata-composition-variables=)("[^"]*"|'[^']*')/i,'$1"'+json+'"')}
    return html;
  });
}
function hfExport(e,zip){
  var C=e.comp,name=slug(C.title||e.name||'composicao');
  progressModal('Exportando composição',zip?'Montando a pasta em .zip…':'Gerando o index.html…');
  hfPatchedIndex(e).then(function(html){
    if(!zip)return deliver(new Blob([html],{type:'text/html'}),'index.html','file');
    return lib('jszip').then(function(){var z=new JSZip(),keys=Object.keys(C.files),px=[];
      return Promise.all(keys.map(function(k,i){if(k===C.entry){z.file(k,html);return}var fe=C.files[k];if(fe.proxy){px.push(k+' (aqui só há uma prévia de '+fmtMB(fe.size)+'; use o original de '+fmtMB(fe.orig&&fe.orig.size||0)+')');return}
        return fetchBin(srcURL(fe.src)).then(function(ab){z.file(k,ab)}).catch(function(){px.push(k+' (não foi possível ler)')})})).then(function(){
        if(px.length)z.file('LEIA-ME.txt','Arquivos que precisam vir da pasta original:\r\n\r\n'+px.join('\r\n')+'\r\n\r\nCopie esses arquivos da pasta original para os mesmos caminhos antes de renderizar.');
        setProg(.8,'Compactando…');return z.generateAsync({type:'blob'})}).then(function(b){deliver(b,name+'.zip','zip')});
    });
  }).catch(function(err){exportFail({message:'Não consegui exportar: '+(err.message||err)})});
}

/* ---------- gravar o palco (captura da aba) para exportar com a composição ---------- */
function recordStage(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.getDisplayMedia){exportFail({message:'Este navegador não permite capturar a tela aqui. No web app (Chrome ou Edge) funciona; ou exporte a composição em .zip e renderize no HyperFrames.'});return}
  progressModal('Gravar o palco','Escolha “Esta aba” na janela do navegador. A gravação recorta só o palco e leva '+fmtS(total())+'.');
  navigator.mediaDevices.getDisplayMedia({video:{frameRate:30,width:{ideal:3840},height:{ideal:2160}},audio:false,preferCurrentTab:true,selfBrowserSurface:'include'}).then(function(stream){
    var track=stream.getVideoTracks()[0],crop=window.CropTarget&&track.cropTo?CropTarget.fromElement(stage).then(function(ct){return track.cropTo(ct)}).catch(function(){}):Promise.resolve();
    return crop.then(function(){
      var tracks=[track],c=aeInit(),dest=null;if(c){if(c.state==='suspended')c.resume();dest=c.createMediaStreamDestination();AE.master.connect(dest);tracks.push(dest.stream.getAudioTracks()[0])}
      var mime=pickMime()||'video/webm',rec=new MediaRecorder(new MediaStream(tracks.filter(Boolean)),{mimeType:mime,videoBitsPerSecond:16000000}),ch=[];
      rec.ondataavailable=function(ev){if(ev.data.size)ch.push(ev.data)};
      rec.onstop=function(){track.stop();if(dest)try{AE.master.disconnect(dest)}catch(x){}setPlaying(false);closeModal();exporting=false;var b=new Blob(ch,{type:mime.split(';')[0]});progressModal('Gravar o palco','Pronto.');deliver(b,slug(P.name)+'.'+(mime.indexOf('mp4')>=0?'mp4':'webm'),'video')};
      closeModal();t=0;selEl=null;draw();setTimeout(function(){rec.start(500);seek(0);setPlaying(true);
        (function wait(){if(t>=total()-.05||!playing){setTimeout(function(){try{rec.stop()}catch(x){}},200);return}requestAnimationFrame(wait)})()},400);
    });
  }).catch(function(err){exportFail({message:err&&err.name==='NotAllowedError'?'A captura foi recusada ou não é permitida nesta visualização. No web app ela funciona.':'Não foi possível capturar: '+(err.message||err)})});
}

/* ---------- abrir pasta / ZIP e arrastar pastas ---------- */
function pickFolder(){var i=document.createElement('input');i.type='file';i.multiple=true;i.setAttribute('webkitdirectory','');i.onchange=function(){importFiles(i.files)};i.click()}
function pickAnything(){var i=document.createElement('input');i.type='file';i.multiple=true;i.onchange=function(){importFiles(i.files)};i.click()}
function collectDrop(dt){
  var items=Array.prototype.slice.call(dt.items||[]).map(function(it){return it.webkitGetAsEntry&&it.webkitGetAsEntry()}).filter(Boolean);
  if(!items.some(function(e){return e.isDirectory}))return Promise.resolve(Array.prototype.slice.call(dt.files));
  var out=[];
  function walk(entry,path){return new Promise(function(res){
    if(entry.isFile){entry.file(function(f){try{Object.defineProperty(f,'relPath',{value:path+f.name})}catch(x){f.relPath=path+f.name}out.push(f);res()},function(){res()});return}
    if(HF_SKIP.test(path+entry.name+'/')){res();return}
    var rd=entry.createReader(),all=[];(function more(){rd.readEntries(function(list){if(!list.length){Promise.all(all.map(function(x){return walk(x,path+entry.name+'/')})).then(res);return}all=all.concat(Array.prototype.slice.call(list));more()},function(){res()})})();
  })}
  return Promise.all(items.map(function(e){return walk(e,'')})).then(function(){return out});
}

/* ---------- Ajuda: formatos, diferenças e armazenamento ---------- */
var DIFFS=[
  ['Tamanho das mídias','Até 20 MB por arquivo; acima disso vira prévia (imagem reduzida, vídeo regravado menor, áudio convertido para AAC). O projeto guarda a referência ao original.','Sem limite: tudo vai para data\\media no PC.'],
  ['Áudio WAV/FLAC/AIFF','Convertido para AAC (ou Opus) no navegador antes de salvar.','Guardado original; conversões pelo ffmpeg do PC.'],
  ['MKV, AVI, WMV e outros vídeos que o navegador não toca','Não abre: pede para converter para MP4.','Converte sozinho para MP4 com o ffmpeg do PC.'],
  ['Composições HTML (HyperFrames)','Abre e sincroniza; scripts locais entram inline e módulos/arquivos pelo armazenamento do artefato. Módulos com imports relativos em cadeia podem falhar.','Abre igual, sem restrições de segurança do artefato.'],
  ['Exportar vídeo com composição HTML','“Gravar o palco” depende da permissão de captura da tela, que a visualização do Claude pode bloquear. Alternativa: exportar a composição em .zip e renderizar no HyperFrames.','“Gravar o palco” funciona no Chrome/Edge (escolha “Esta aba”).'],
  ['Claude no chat','Usa o Claude da sua conta, com imagens anexadas.','Usa a CLI do Claude Code (sem imagens) ou a chave de API (com imagens).'],
  ['Exportar arquivos','Pede confirmação de download na janela do Claude.','Salva direto na pasta exports.'],
  ['Colaboração ao vivo','Várias pessoas no mesmo artefato (presença em tempo real).','Só você, em várias abas sincronizadas.'],
  ['Onde fica o projeto','No banco do artefato (até 250 KB por projeto, salvamento compacto).','Em data\\db no PC, sem limite prático.']
];
function openHelp(which){
  closePops();var h='<div class="dh"><h3 id="mTitle">Ajuda</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>';
  h+='<div class="seg helptabs">'+[['formats','Formatos'],['diffs','Artefato × web app'],['storage','Armazenamento']].map(function(x){return '<button data-help="'+x[0]+'" aria-pressed="'+(which===x[0])+'">'+x[1]+'</button>'}).join('')+'</div><div id="helpBody"></div>';
  modal(h,true);var d=$('#dlg');d.onclick=function(ev){var b=ev.target.closest('[data-help]');if(b){which=b.dataset.help;d.querySelectorAll('[data-help]').forEach(function(x){x.setAttribute('aria-pressed',x===b)});body()}};
  function body(){var B=$('#helpBody');if(!B)return;
    if(which==='diffs'){B.innerHTML='<p class="info">Você está no '+(IS_LOCAL?'<b>web app</b>':'<b>artefato</b>')+'. O formato do projeto é o mesmo nos dois.</p><table class="htable"><thead><tr><th>Recurso</th><th>Artefato</th><th>Web app</th></tr></thead><tbody>'+DIFFS.map(function(r){return '<tr><td>'+esc(r[0])+'</td><td>'+esc(r[1])+'</td><td>'+esc(r[2])+'</td></tr>'}).join('')+'</tbody></table>';return}
    if(which==='storage'){B.innerHTML='<p class="info">Calculando…</p>';storageReport().then(function(html){B.innerHTML=html});return}
    B.innerHTML=FORMATS_HELP;
  }
  body();
}
var FORMATS_HELP='<table class="htable"><thead><tr><th>Tipo</th><th>Abre direto</th><th>Com conversão</th></tr></thead><tbody>'+
  [['Imagem','PNG, JPG, WebP, GIF/WebP/APNG animados (viram sprite), AVIF, SVG, BMP, ICO; PSD com camadas separadas','HEIC (convertido para JPG)'],
   ['Vídeo','MP4/H.264, WebM, MOV quando o navegador toca','MKV, AVI, WMV, FLV, MPEG: no web app, convertidos para MP4 pelo ffmpeg do PC'],
   ['Áudio','MP3, WAV, FLAC, OGG, Opus, AAC/M4A','AIFF (lido e convertido no navegador); arquivos grandes viram AAC'],
   ['Animação','Lottie .json (Bodymovin), dotLottie .lottie, SVG animado (vira camada animada), sequência de imagens (pasta ou ZIP de PNG/JPG)',''],
   ['Composição','Pasta ou ZIP HyperFrames (index.html + GSAP), HTML solto',''],
   ['3D','GLB, glTF com texturas (envie a pasta), OBJ com MTL, FBX',''],
   ['Fontes','TTF, OTF, WOFF, WOFF2',''],
   ['Legendas','SRT e VTT (viram camadas de texto com tempo e a faixa de legendas)',''],
   ['Dados','CSV, TSV, JSON, XLSX (viram gráfico e tabela de lote)',''],
   ['Projetos','JSON do próprio editor; Remotion/After Effects como MP4 renderizado ou Lottie','']
  ].map(function(r){return '<tr><td>'+r[0]+'</td><td>'+r[1]+'</td><td>'+(r[2]||'—')+'</td></tr>'}).join('')+'</tbody></table>'+
  '<p class="info">Não suportados (com dica do que fazer ao enviar): PDF, AI, EPS, Figma, Sketch, XD, AEP, PRPROJ, Blender, C4D, RAW de câmera, TIFF.</p>';
function storageReport(){
  var px=[],used=0;P.media.forEach(function(m){if(m.proxy)px.push([m.name,m.size,m.orig&&m.orig.size])});
  P.scenes.forEach(function(s){s.els.forEach(function(e){if(e.comp&&e.comp.files)Object.keys(e.comp.files).forEach(function(k){var f=e.comp.files[k];if(f.proxy)px.push([k,f.size,f.orig&&f.orig.size])})})});
  var listP=CAP.assets&&CAP.assets.list?CAP.assets.list().catch(function(){return null}):Promise.resolve(null);
  return Promise.all([listP,navigator.storage&&navigator.storage.estimate?navigator.storage.estimate().catch(function(){return null}):null]).then(function(r){
    var L=r[0],est=r[1],h='';
    if(L){var bytes=L.usage&&(L.usage.bytes||L.usage.usedBytes)||(L.assets||[]).reduce(function(a,x){return a+(x.sizeBytes||x.size||0)},0),lim=L.usage&&(L.usage.limitBytes||L.usage.quotaBytes)||(IS_LOCAL?0:1073741824);
      h+='<h4>'+(IS_LOCAL?'Mídias no PC (data\\media)':'Armazenamento de arquivos do artefato')+'</h4><div class="meter"><i style="width:'+(lim?Math.min(100,bytes/lim*100):5)+'%"></i></div><p class="info">'+fmtMB(bytes)+(lim?' de '+fmtMB(lim)+' usados':' usados')+' · '+((L.assets||[]).length)+' arquivo(s)'+(IS_LOCAL?'':' · máximo de 20 MB por arquivo')+'</p>'}
    else h+='<p class="info">'+(CAP.assets?'Não consegui ler o uso do armazenamento.':'Sem armazenamento do artefato nesta visualização: as mídias ficam no navegador (IndexedDB).')+'</p>';
    if(est)h+='<h4>Navegador (IndexedDB)</h4><div class="meter"><i style="width:'+Math.min(100,(est.usage||0)/(est.quota||1)*100)+'%"></i></div><p class="info">'+fmtMB(est.usage||0)+' de '+fmtMB(est.quota||0)+' disponíveis neste navegador.</p>';
    h+='<h4>Arquivos em prévia (proxy)</h4>'+(px.length?'<ul class="ilist">'+px.map(function(p){return '<li>'+esc(p[0])+' · prévia '+fmtMB(p[1]||0)+(p[2]?' (original '+fmtMB(p[2])+')':'')+'</li>'}).join('')+'</ul><p class="info">O web app usa os originais na renderização: importe a mesma pasta lá para ter tudo em qualidade máxima.</p>':'<p class="info">Nenhum arquivo deste projeto está em prévia.</p>');
    return h;
  });
}
