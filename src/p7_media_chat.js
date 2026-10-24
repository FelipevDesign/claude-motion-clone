/* =========================================================
   Modal e aviso
   ========================================================= */
function modal(html,wide){var d=$('#dlg');d.className='dlg'+(wide?' wide':'');d.innerHTML=html;$('#modal').hidden=false;
  d.querySelectorAll('[data-close]').forEach(function(b){b.onclick=closeModal})}
function closeModal(){if(exporting)return;$('#modal').hidden=true;$('#dlg').innerHTML='';if(modalUrl){URL.revokeObjectURL(modalUrl);modalUrl=null}}
var modalUrl=null,toastT=null;
function toast(msg){var el=$('#toast');el.textContent=msg;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(function(){el.hidden=true},3600)}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!$('#modal').hidden)closeModal()});

/* =========================================================
   Mídia externa: imagens, vídeos e áudio
   ========================================================= */
var ACCEPT_UP={'image/png':1,'image/jpeg':1,'image/gif':1,'image/webp':1,'image/svg+xml':1,'video/mp4':1,'video/webm':1,'application/json':1};
var MAX_UP=20*1024*1024;
function readDataURL(f){return new Promise(function(res,rej){var r=new FileReader();r.onload=function(){res(r.result)};r.onerror=rej;r.readAsDataURL(f)})}
function probe(kind,url){return new Promise(function(res){
  if(kind==='image'){var im=new Image();im.onload=function(){res({w:im.naturalWidth,h:im.naturalHeight})};im.onerror=function(){res({})};im.src=url}
  else if(kind==='video'){var v=document.createElement('video');v.preload='metadata';v.onloadedmetadata=function(){res({w:v.videoWidth,h:v.videoHeight,dur:v.duration})};v.onerror=function(){res({})};v.src=url}
  else res({});
})}
/* guarda um arquivo: no artefato (assets) quando possível, senão só nesta sessão */
function storeFile(f,kind){
  var local=URL.createObjectURL(f);
  var finish=function(src,enc,persisted){var id=src.slice(src.indexOf(':')+1);LOCAL[id]=local;return {src:src,enc:enc||'',persisted:persisted}};
  if(!CAP.assets)return Promise.resolve(finish('local:'+nid('m'),'',false));
  if(window.__LOCAL_APP){var ty=f.type||(kind==='model'?'model/gltf-binary':kind==='lottie'?'application/json':kind==='svg'?'image/svg+xml':'application/octet-stream');return CAP.assets.upload(f,{type:ty}).then(function(r){return finish('asset:'+r.id,'',true)}).catch(function(e){toast('Não foi possível salvar o arquivo no PC: '+((e&&e.message)||''));return finish('local:'+nid('m'),'',false)})}
  if(kind==='audio'||kind==='model'){
    return readDataURL(f).then(function(du){var blob=new Blob([du],{type:'text/plain'});if(blob.size>MAX_UP)return finish('local:'+nid('m'),'',false);
      return CAP.assets.upload(blob,{type:'text/plain'}).then(function(r){return finish('asset:'+r.id,'b64',true)})}).catch(function(e){uploadErr(e);return finish('local:'+nid('m'),'',false)});
  }
  if(kind==='lottie'&&f.type!=='application/json'){f=new File([f],f.name,{type:'application/json'})}
  if(kind==='svg'&&f.type!=='image/svg+xml'){f=new File([f],f.name,{type:'image/svg+xml'})}
  if(!ACCEPT_UP[f.type]||f.size>MAX_UP){toast(f.size>MAX_UP?'Arquivo acima de 20 MB: vai funcionar nesta sessão, mas não fica salvo no artefato.':'Formato '+(f.type||'desconhecido')+' não fica salvo no artefato. Use MP4, WebM, PNG, JPG, GIF ou WebP.');return Promise.resolve(finish('local:'+nid('m'),'',false))}
  return CAP.assets.upload(f).then(function(r){return finish('asset:'+r.id,'',true)}).catch(function(e){uploadErr(e);return finish('local:'+nid('m'),'',false)});
}
function uploadErr(e){var c=e&&e.code;toast(c==='quota_or_state'?'O armazenamento do artefato está cheio. A mídia vale só nesta sessão.':c==='too_large'?'Arquivo grande demais para salvar (máx. 20 MB).':'Não foi possível salvar a mídia no artefato. Ela vale só nesta sessão.')}
function kindOf(f){var t=f.type||'',n=(f.name||'').toLowerCase();
  if(/\.(glb|gltf)$/.test(n)||t==='model/gltf-binary')return 'model';
  if(t==='image/svg+xml'||/\.svg$/.test(n))return 'svg';
  if(t==='application/json'||/\.json$/.test(n))return 'lottie';
  if(t.indexOf('image/')===0)return 'image';if(t.indexOf('video/')===0)return 'video';if(t.indexOf('audio/')===0)return 'audio';
  if(/\.(mp3|wav|m4a|aac|ogg|flac)$/.test(n))return 'audio';if(/\.(mp4|webm|mov)$/.test(n))return 'video';return 'image'}
/* Convenção de nomes para importação em lote:
   c2_fundo.png → cena 2, fundo de tela cheia (profundidade 0)
   c2_objeto.png / produto / personagem → centro, profundidade 0,8
   c2_frente.png → primeiro plano, profundidade 1
   c2_textura.png → textura de tela cheia em modo Sobrepor
   c3_sprite_4x2.png → folha de sprites com 4 colunas e 2 linhas
   c3_corrida_01.png, c3_corrida_02.png… → sequência de quadros (um sprite)
   logo.svg → vetor com desenho de traço; animacao.json → Lottie */
function parseName(name){
  var base=name.replace(/\.[^.]+$/,''),low=norm(base),o={scene:null,role:'',grid:null,seq:null,base:base};
  var m=low.match(/^c(?:ena)?[\s_-]?(\d+)[\s_-]+(.+)$/);if(m){o.scene=+m[1];low=m[2]}
  var g=low.match(/(\d+)\s*x\s*(\d+)/);if(g&&/sprite|folha|sheet/.test(low))o.grid=[+g[1],+g[2]];
  var sq=low.match(/^(.*?)[\s_-]?(\d{1,4})$/);if(sq&&!o.grid&&/[a-z]/.test(sq[1])){o.seq={key:(o.scene||0)+'|'+sq[1],n:+sq[2]}}
  if(/fundo|background|^bg|cenario/.test(low))o.role='bg';
  else if(/frente|foreground|^fg|primeiro/.test(low))o.role='fg';
  else if(/textura|texture|grao|papel/.test(low))o.role='tex';
  else if(/objeto|produto|subject|personagem|character|item/.test(low))o.role='obj';
  else if(o.grid||/sprite|folha|sheet/.test(low))o.role='sprite';
  o.label=low;return o;
}
function placeAsset(m,info,sc,noSelect){
  var e,ar=(m.w&&m.h)?m.h/m.w:1,st=0;
  if(m.kind==='svg'){var w=Math.round(Math.min(PW,PH)*.5);e=el('svg',{src:m.src,name:m.name,x:Math.round(PW/2-w/2),y:Math.round(PH/2-w/2),w:w,h:w})}
  else if(m.kind==='lottie'){var w2=Math.round(Math.min(PW,PH)*.55);e=el('lottie',{src:m.src,name:m.name,x:Math.round(PW/2-w2/2),y:Math.round(PH/2-w2/2),w:w2,h:w2})}
  else if(info&&info.role==='bg'){e=el('image',{src:m.src,name:m.name||'Fundo',x:0,y:0,w:PW,h:PH,fit:'cover',depth:0,anim:{in:'none'}})}
  else if(info&&info.role==='tex'){e=el('image',{src:m.src,name:m.name||'Textura',x:0,y:0,w:PW,h:PH,fit:'cover',depth:0,blend:'overlay',opacity:.6,anim:{in:'none'}})}
  else if(info&&(info.role==='sprite'||info.grid||m.frames)){var cols=info&&info.grid?info.grid[0]:1,rows=info&&info.grid?info.grid[1]:1,fw=m.w?m.w/cols:300,fh=m.h?m.h/rows:300,sw=Math.round(Math.min(PW*.4,PH*.5*fw/fh)),sh=Math.round(sw*fh/fw);
    e=el('sprite',{src:m.frames?'':m.src,frames:m.frames||[],name:m.name,cols:cols,rows:rows,x:Math.round(PW/2-sw/2),y:Math.round(PH*.62-sh/2),w:sw,h:sh,depth:.8})}
  else{var wi=Math.round(Math.min(PW*.5,PH*.62/ar)),hi=Math.round(wi*ar),fg=info&&info.role==='fg';
    e=el(m.kind==='video'?'video':'image',{src:m.src,name:m.name,x:Math.round(PW/2-wi/2),y:Math.round(PH/2-hi/2+(fg?PH*.12:0)),w:wi,h:hi,fit:'contain',depth:fg?1:(info&&info.role==='obj'?.8:.5),start:info?.2:Math.min(curLt(),Math.max(0,sc.dur-1)),anim:{in:info?'rise':'fade'}})}
  if(info&&info.role==='bg')sc.els.unshift(e);else sc.els.push(e);
  if(!noSelect){selEl=e.id;selTrack=null;showEl(e)}
  return e;
}
function addFiles(files,opts){
  opts=opts||{};files=Array.prototype.slice.call(files||[]);if(!files.length)return;
  files.sort(function(a,b){return a.name.localeCompare(b.name,undefined,{numeric:true})});
  toast(files.length>1?'Enviando '+files.length+' arquivos…':'Enviando '+files[0].name+'…');
  var chain=Promise.resolve(),added=[],placed=0,seqs={},named=files.some(function(f){return parseName(f.name).scene!=null});
  files.forEach(function(f){chain=chain.then(function(){var kind=kindOf(f);return storeFile(f,kind).then(function(st){
    return probe(kind==='svg'?'image':kind==='model'?'none':kind,LOCAL[st.src.slice(st.src.indexOf(':')+1)]).then(function(meta){
      var m={id:nid('m'),kind:kind,name:f.name.replace(/\.[^.]+$/,'').slice(0,40),src:st.src,enc:st.enc,w:meta.w||0,h:meta.h||0,dur:meta.dur||0,saved:st.persisted};
      P.media.push(m);added.push(m);
      if(kind==='audio'){
        var tr={id:nid('a'),name:m.name,src:m.src,enc:m.enc,start:0,offset:0,vol:.8,fadeIn:.5,fadeOut:1.5,bpm:0,beats:[],role:/voz|locucao|narra|voice/.test(norm(m.name))?'voice':'music'};P.audio.push(tr);selTrack=tr.id;selEl=null;
        aeInit();if(AE.ctx)f.arrayBuffer().then(function(ab){return new Promise(function(r,j){AE.ctx.decodeAudioData(ab,r,j)})}).then(function(buf){setTrackBuffer(tr,buf)}).catch(function(){toast('Não consegui ler este áudio.')});
        return;
      }
      if(opts.replace&&findEl(selEl)){var e0=findEl(selEl);if(e0.kind==='three'&&kind==='model'){e0.src=m.src;e0.mode='model';return}
        if(e0.kind==='three'&&kind==='image'){e0.images=(e0.images||[]).concat([m.src]).slice(-12);e0.mode='cards';return}
        if(e0.kind==='shader'&&(kind==='image')){e0.src=m.src;if(!(SHADERS[e0.preset]||{}).tex&&!e0.code)e0.preset='liquid';return}
        if(e0.kind===kind||(e0.kind==='sprite'&&kind==='image')){e0.src=m.src;if(e0.kind!=='sprite'&&m.w&&m.h)e0.h=Math.round(e0.w*m.h/m.w);return}}
      if(opts.libraryOnly)return;
      if(kind==='model'){var sc3=P.scenes[selScene],w3=Math.round(Math.min(PW,PH)*.7),e3=el('three',{mode:'model',src:m.src,name:m.name,x:Math.round(PW/2-w3/2),y:Math.round(PH/2-w3/2),w:w3,h:w3});sc3.els.push(e3);selEl=e3.id;selTrack=null;showEl(e3);placed++;return}
      var info=named||files.length>1?parseName(f.name):null;
      if(info&&info.seq&&kind==='image'&&files.filter(function(x){var o=parseName(x.name);return o.seq&&o.seq.key===info.seq.key}).length>1){var g=seqs[info.seq.key]||(seqs[info.seq.key]={info:info,items:[]});g.items.push({n:info.seq.n,src:m.src,w:m.w,h:m.h,name:m.name});return}
      var si=info&&info.scene?info.scene-1:selScene;while(si>=P.scenes.length){P.scenes.push(normScene({name:'Cena '+(P.scenes.length+1),dur:4,els:[]},P.scenes.length))}
      if(kind==='image'&&(!info||!info.role||info.role==='bg')){var slot=P.scenes[si].els.filter(function(x){return x.slot&&!x.src})[0];if(slot){slot.src=m.src;placed++;return}}
      placeAsset(m,info,P.scenes[si],files.length>1);placed++;
    })})})});
  chain.then(function(){
    Object.keys(seqs).forEach(function(k){var g=seqs[k];g.items.sort(function(a,b){return a.n-b.n});var si=g.info.scene?g.info.scene-1:selScene;while(si>=P.scenes.length)P.scenes.push(normScene({name:'Cena '+(P.scenes.length+1),dur:4,els:[]},P.scenes.length));
      placeAsset({kind:'image',name:g.info.label.replace(/[\s_-]?\d+$/,'')||'Sequência',frames:g.items.map(function(x){return x.src}),w:g.items[0].w,h:g.items[0].h},{role:'sprite',grid:null},P.scenes[si],files.length>1);placed++});
    if(placed&&files.length>1&&named)toast('Arquivos distribuídos pelas cenas conforme o nome.');
    commit();fullRender();var notSaved=added.filter(function(m){return !m.saved}).length;
    toast(added.length+' arquivo(s) adicionado(s)'+(notSaved&&CAP.assets?'. '+notSaved+' só nesta sessão.':notSaved?'. Sem armazenamento no artefato agora: valem só nesta sessão.':'.'))});
}
function insertMedia(m,noCommit){
  if(m.kind==='model'){var w3=Math.round(Math.min(PW,PH)*.7),e3=el('three',{mode:'model',src:m.src,name:m.name,x:Math.round(PW/2-w3/2),y:Math.round(PH/2-w3/2),w:w3,h:w3});curScene().els.push(e3);selEl=e3.id;showEl(e3);if(!noCommit){commit();fullRender()}return}
  if(m.kind==='audio'){if(!P.audio.some(function(a){return a.src===m.src})){P.audio.push({id:nid('a'),name:m.name,src:m.src,enc:m.enc,start:0,offset:0,vol:.8,fadeIn:.5,fadeOut:1.5,bpm:0,beats:[]});loadAllAudio()}if(!noCommit){commit();fullRender()}return}
  placeAsset(m,null,curScene());if(!noCommit){commit();fullRender()}
}
$('#mediaFile').addEventListener('change',function(){addFiles(this.files,{libraryOnly:mediaMode==='library'});closeMediaPop()});
$('#replFile').addEventListener('change',function(){addFiles(this.files,{replace:true});this.accept='image/*,video/*'});
$('#fontFile').addEventListener('change',function(){
  var f=this.files&&this.files[0];if(!f)return;var ext=(f.name.split('.').pop()||'').toLowerCase(),type={woff2:'font/woff2',woff:'font/woff',ttf:'font/ttf',otf:'font/otf'}[ext];
  if(!type){toast('Use um arquivo .woff2, .woff, .ttf ou .otf.');return}
  var fam=f.name.replace(/\.[^.]+$/,'').replace(/[-_]+(regular|bold|medium|semibold|book|roman)$/i,'').replace(/[-_]+/g,' ').trim()||'Minha fonte';
  var local=URL.createObjectURL(f);
  var done=function(src){var id=src.slice(src.indexOf(':')+1);LOCAL[id]=local;P.fonts.custom[fam]=src;P.fonts.display=fam;FONT_LOADED[fam]=0;loadCustomFont(fam,src);commit();renderPanel();toast('Fonte “'+fam+'” aplicada aos títulos.')};
  if(CAP.assets)CAP.assets.upload(f,{type:type}).then(function(r){done('asset:'+r.id)}).catch(function(e){uploadErr(e);done('local:'+nid('f'))});else done('local:'+nid('f'));
});
$('#logoFile').addEventListener('change',function(){
  var f=this.files&&this.files[0];if(!f)return;storeFile(f,'image').then(function(st){P.brand.logo=st.src;P.brand.logoOn=true;commit();renderPanel();draw();toast('Logo aplicado em todas as cenas.')});
});
/* arrastar arquivos para o palco */
['dragover','drop'].forEach(function(evn){stage.addEventListener(evn,function(e){e.preventDefault();if(evn==='drop'&&e.dataTransfer&&e.dataTransfer.files.length)addFiles(e.dataTransfer.files)})});

var mediaMode='insert';
function openMediaPop(mode){
  mediaMode=mode||'insert';var pop=$('#mediaPop'),h='<h4>Biblioteca de mídia</h4>';
  h+='<div class="btnrow"><button class="btn sm accent" data-mact="up">'+IC.plus+'Enviar imagem, vídeo ou áudio</button></div>';
  var list=P.media.filter(function(m){return mediaMode!=='replace'||(findEl(selEl)&&findEl(selEl).kind===m.kind)});
  if(list.length){h+='<div class="lib">'+list.map(function(m){var u=srcURL(m.src);return '<button data-mid="'+esc(m.id)+'" title="'+esc(m.name)+'">'+(m.kind==='image'&&u?'<img src="'+esc(u)+'" alt="">':m.kind==='video'&&u?'<video src="'+esc(u)+'#t=0.5" muted preload="metadata"></video>':IC[m.kind])+'<span>'+(m.kind==='audio'?'♪ ':'')+esc(m.name)+'</span></button>'}).join('')+'</div>'}
  else h+='<p class="note">Nenhuma mídia ainda. Você também pode arrastar arquivos para o palco.</p>';
  h+='<p class="note">'+(window.__LOCAL_APP?'Sem limite de tamanho: tudo fica salvo na pasta data\\media do projeto no seu PC.':CAP.assets?'Imagens e vídeos MP4/WebM até 20 MB e áudio até ~14 MB ficam salvos no artefato.':'Sem armazenamento no artefato agora: a mídia vale só nesta sessão.')+(mediaMode==='replace'?' Clique numa mídia para trocar a do elemento.':' Clique para inserir na cena atual.')+'</p>';
  pop.innerHTML=h;pop.hidden=false;
}
function closeMediaPop(){$('#mediaPop').hidden=true}
$('#mediaBtn').addEventListener('click',function(e){e.stopPropagation();if(!$('#mediaPop').hidden){closeMediaPop();return}closePops();openMediaPop('insert')});
$('#mediaPop').addEventListener('click',function(e){
  e.stopPropagation();var b=e.target.closest('[data-mact],[data-mid]');if(!b)return;
  if(b.dataset.mact==='up'){$('#mediaFile').value='';$('#mediaFile').click();return}
  var m=P.media.filter(function(x){return x.id===b.dataset.mid})[0];if(!m)return;
  if(mediaMode==='replace'){var el0=findEl(selEl);if(el0){el0.src=m.src;if(m.w&&m.h)el0.h=Math.round(el0.w*m.h/m.w);commit();fullRender()}}
  else insertMedia(m);
  closeMediaPop();
});

/* ---------- adicionar elementos ---------- */
function addEl(kind){
  if(kind==='sprite'||kind==='svg'||kind==='lottie'){var sc0=curScene(),e0=placeAsset({kind:kind==='sprite'?'image':kind,name:KNAME[kind],src:'',w:0,h:0},kind==='sprite'?{role:'sprite'}:null,sc0);commit();fullRender();$('#replFile').accept=kind==='svg'?'.svg,image/svg+xml':kind==='lottie'?'.json,application/json':'image/*';$('#replFile').value='';$('#replFile').click();return e0}
  var sc=curScene(),o={start:Math.round(Math.min(curLt(),Math.max(0,sc.dur-1))*10)/10},s=Math.min(PW,PH)/720;
  if(kind==='text'){o.w=Math.round(PW*.6);o.x=Math.round(PW/2-o.w/2);o.y=Math.round(PH/2-30*s);o.text='Novo texto';o.size=Math.round(48*s);o.align='center'}
  else if(kind==='shape'){o.w=Math.round(240*s);o.h=Math.round(140*s);o.x=Math.round(PW/2-o.w/2);o.y=Math.round(PH/2-o.h/2)}
  else if(kind==='chart'){o.w=Math.round(PW*.6);o.h=Math.round(PH*.42);o.x=Math.round(PW/2-o.w/2);o.y=Math.round(PH/2-o.h/2);o.size=Math.round(26*s)}
  else if(kind==='shader'){o.w=PW;o.h=PH;o.x=0;o.y=0;o.start=0}
  else if(kind==='three'){o.w=Math.round(Math.min(PW,PH)*.75);o.h=o.w;o.x=Math.round(PW/2-o.w/2);o.y=Math.round(PH/2-o.h/2)}
  else if(kind==='counter'){o.w=Math.round(PW*.6);o.size=Math.round(160*s);o.x=Math.round(PW/2-o.w/2);o.y=Math.round(PH/2-o.size*.6);o.align='center'}
  var e=el(kind,o);if(kind==='shader')sc.els.unshift(e);else sc.els.push(e);selEl=e.id;selTrack=null;selKf=null;showEl(e);commit();fullRender();return e;
}
$('#addBtn').addEventListener('click',function(e){e.stopPropagation();var p=$('#addPop');if(!p.hidden){p.hidden=true;return}closePops();
  var t=TYPES[P.type]||TYPES.explainer,all=Object.keys(KD),mine=t.add.filter(function(k){return KD[k]}),rest=all.filter(function(k){return mine.indexOf(k)<0});
  function item(k){return k==='image'||k==='video'?'<button class="mi" data-add="media">'+IC[k]+KNAME[k]+'…</button>':'<button class="mi" data-add="'+k+'">'+IC[k]+KNAME[k]+'</button>'}
  var seen={};function uniq(arr){return arr.filter(function(k){var key=(k==='image'||k==='video')?'media':k;if(seen[key])return false;seen[key]=1;return true})}
  p.innerHTML='<h4>Para '+esc(t.name.toLowerCase())+'</h4>'+uniq(mine).map(item).join('')+'<hr><h4>Outros</h4>'+uniq(rest).map(item).join('')+'<hr><button class="mi" data-add="scene">'+IC.plus+'Nova cena</button>';p.hidden=false});
$('#addPop').addEventListener('click',function(e){e.stopPropagation();var b=e.target.closest('[data-add]');if(!b)return;$('#addPop').hidden=true;var k=b.dataset.add;if(k==='media'){openMediaPop('insert');return}if(k==='scene'){addScene();return}addEl(k)});
function setTitles(){$('#titleTxt').textContent=P.name||'Sem título';$('#chatTitle').textContent=P.name||'Animação sem título';$('#projName').value=P.name}
$('#projName').addEventListener('input',function(){P.name=this.value;setTitles()});
$('#projName').addEventListener('change',function(){commit()});
$('#projName').addEventListener('blur',function(){this.hidden=true});
$('#projName').addEventListener('keydown',function(e){if(e.key==='Enter'||e.key==='Escape')this.blur()});

/* =========================================================
   Chat: Claude de verdade (sample) com fallback local
   ========================================================= */
var CH={msgs:[],turns:[],busy:false,ctl:null,att:[]};
function chatMode(){return CAP.sample&&!CH.localOnly?'claude':'local'}
function updateMode(){
  var live=chatMode()==='claude';$('#modeTag').textContent=live?'Claude ativo':'Modo local';$('#modeTag').classList.toggle('live',live);$('#tier').hidden=!live;
  $('#footNote').textContent=live?'As respostas usam a sua conta do Claude. Cada mudança pode ser desfeita.':'Claude não está disponível nesta visualização. O modo local entende pedidos de modelo e comandos simples aplicados ao elemento selecionado.';
}
function addMsg(m){CH.msgs.push(m);renderMsgs();return m}
function renderMsgs(){
  var box=$('#msgs');
  if(!CH.msgs.length){var tt=TYPES[P.type]||TYPES.explainer;box.innerHTML='<div class="empty"><div class="play">'+IC.play+'</div><h2>O que você quer animar?</h2><div class="typesel" role="group" aria-label="Tipo de vídeo">'+Object.keys(TYPES).map(function(k){return '<button data-etype="'+k+'" aria-pressed="'+(P.type===k)+'">'+TYPES[k].name+'</button>'}).join('')+'</div><div class="sugg">'+tt.sugg.map(function(c){return '<button type="button" data-sug="'+esc(c)+'">'+esc(c)+'</button>'}).join('')+'</div></div>';return}
  box.innerHTML=CH.msgs.map(function(m,mi){
    if(m.role==='user')return '<div class="m user">'+esc(m.text)+(m.thumbs&&m.thumbs.length?'<div class="thumbs">'+m.thumbs.map(function(u){return '<img src="'+esc(u)+'" alt="Anexo">'}).join('')+'</div>':'')+'</div>';
    if(m.typing)return '<div class="m ai"><span class="dots"><i></i><i></i><i></i><span>'+esc(m.status||'Pensando…')+'</span></span></div>';
    var body='';
    if(m.ops)body+='<div class="tools">Fez '+m.ops+' alteraç'+(m.ops>1?'ões':'ão')+' na animação</div>';
    body+='<p>'+esc(m.text)+'</p>';
    if(m.card)body+='<button class="card" data-open="1"><div class="th">'+IC.play+'</div><div><b>'+esc(m.card.name)+'</b><span>Motion · '+m.card.n+' cenas · '+m.card.s+' s</span></div></button>';
    if(m.q)body+='<div class="ask"><b>'+esc(m.q.text)+'</b><div class="opts">'+m.q.options.map(function(o){return '<button class="opt" data-q="'+esc(o)+'">'+esc(o)+'</button>'}).join('')+'</div></div>';
    body+='<div class="acts"><button class="ghost" data-copy="'+mi+'" title="Copiar" aria-label="Copiar resposta">'+IC.copy+'</button>'+(m.undo!=null?'<button class="ghost" data-undo="'+mi+'" title="Desfazer estas alterações" aria-label="Desfazer estas alterações">'+IC.undo+'</button>':'')+'</div>';
    return '<div class="m ai">'+body+'</div>';
  }).join('');
  box.scrollTop=box.scrollHeight;
}
$('#msgs').addEventListener('click',function(e){
  var q=e.target.closest('[data-q]');if(q){sendText(q.dataset.q);return}
  var et=e.target.closest('[data-etype]');if(et){setType(et.dataset.etype,true);return}
  var sg=e.target.closest('[data-sug]');if(sg){$('#prompt').value=sg.dataset.sug;send();return}
  if(e.target.closest('[data-open]')){$('#app').classList.remove('noart');return}
  var cp=e.target.closest('[data-copy]');if(cp){var mm=CH.msgs[+cp.dataset.copy];if(mm&&navigator.clipboard)navigator.clipboard.writeText(mm.text).then(function(){toast('Resposta copiada.')}).catch(function(){toast('Não foi possível copiar.')});return}
  var u=e.target.closest('[data-undo]');if(u){var m=CH.msgs[+u.dataset.undo];if(m&&m.undo!=null&&m.undo<=hi){hi=m.undo;restoreHist();m.undo=null;m.text+=' (desfeito)';renderMsgs()}}
});
var CHIPS=['Um teaser de 20 segundos para o nosso novo app de produtividade','Como funciona o nosso onboarding, em três etapas','Os resultados do trimestre para a reunião geral'];
$('#attBtn').innerHTML=IC.image+'Anexar imagem de referência';$('#plusMedia').innerHTML=IC.media+'Adicionar mídia à animação';$('#plusTpl').innerHTML=IC.brand+'Começar de um modelo';
$('#plusBtn').innerHTML=IC.plus;$('#stopBtn').innerHTML=IC.stop;$('#sendBtn').innerHTML=IC.send;
$('#plusBtn').addEventListener('click',function(e){e.stopPropagation();var m=$('#plusMenu');var o=m.hidden;closePops();m.hidden=!o});
$('#plusMenu').addEventListener('click',function(e){e.stopPropagation()});
$('#attBtn').addEventListener('click',function(){$('#plusMenu').hidden=true;$('#attFile').value='';$('#attFile').click()});
$('#plusMedia').addEventListener('click',function(){$('#plusMenu').hidden=true;$('#mediaFile').value='';mediaMode='insert';$('#mediaFile').click()});
$('#plusTpl').addEventListener('click',function(){$('#plusMenu').hidden=true;setTab('style')});
$('#cfMedia').addEventListener('click',function(e){e.stopPropagation();closePops();openMediaPop('insert')});
$('#prompt').addEventListener('input',function(){this.style.height='auto';this.style.height=Math.min(160,this.scrollHeight)+'px'});
$('#attFile').addEventListener('change',function(){Array.prototype.slice.call(this.files||[]).slice(0,4).forEach(function(f){CH.att.push({f:f,u:URL.createObjectURL(f)})});renderAtt()});
function renderAtt(){$('#att').innerHTML=CH.att.map(function(a,i){return '<span><img src="'+esc(a.u)+'" alt="Anexo"><button data-ai="'+i+'" aria-label="Remover anexo">×</button></span>'}).join('')}
$('#att').addEventListener('click',function(e){var b=e.target.closest('[data-ai]');if(!b)return;CH.att.splice(+b.dataset.ai,1);renderAtt()});
$('#stopBtn').addEventListener('click',function(){if(CH.ctl)CH.ctl.abort()});

function compactProject(){
  var p=clone(P);p.audio=p.audio.map(function(a){return {id:a.id,name:a.name,start:a.start,offset:a.offset,vol:a.vol,fadeIn:a.fadeIn,fadeOut:a.fadeOut,bpm:a.bpm,beats:(a.beats||[]).length+' batidas'}});
  p.media=p.media.map(function(m){return {id:m.id,kind:m.kind,name:m.name,src:m.src,w:m.w,h:m.h,dur:m.dur?Math.round(m.dur*10)/10:undefined}});
  p.scenes.forEach(function(s){if(s.ref)s.ref='(miniatura da referência)'});if(p.captions&&p.captions.items&&p.captions.items.length>60)p.captions.items=p.captions.items.slice(0,60).concat([{t0:0,t1:0,text:'… mais '+(p.captions.items.length-60)+' blocos'}]);
  delete p.v;return p;
}
var RULES=['Você é o motor de edição do Claude Motion, um app que cria animações curtas por código (não há modelo de vídeo: não crie pessoas nem cenas realistas). Você recebe o projeto atual em JSON e um pedido. Responda SOMENTE com um objeto JSON:',
'{"reply":"resposta curta em português do Brasil (1 a 3 frases, sem markdown)","ops":[operações],"question":{"text":"...","options":["...","..."]}}',
'"question" é opcional: use só quando precisar que a pessoa escolha entre caminhos (estilo, paleta, formato) antes de criar algo grande; nesse caso "ops" pode vir vazio.',
'',
'PROJETO: {name, w, h, theme{bg,ink,accent,on} em hex, fonts{display,ui} (famílias do Google Fonts), vars{chave:valor}, brand{logo,logoPos,logoSize,logoOn}, media[{id,kind,name,src}], audio[...], scenes[...]}',
'Formatos: 1280x720 (16:9), 1080x1080 (1:1), 1024x1280 (4:5), 720x1280 (9:16). Coordenadas em pixels desse quadro.',
'CENA: {id, name, dur (s), bg (cor), trans "wipe"|"fade"|"slide"|"magic"|"none"|"sh-noise"|"sh-pixel"|"sh-radial"|"sh-zoom"|"sh-glitch" (sh-* são transições por shader), cam{on,z0,x0,y0,z1,x1,y1,ease} (zoom e foco 0..1 no início e no fim), els[...] (ordem = camadas, o último fica na frente)}',
'ELEMENTO: {id, kind, name, x, y, w, h, start (s dentro da cena), dur (0 = até o fim), opacity 0..1, rot (graus), scale, anim{in,out:"none"|"fade",t (s),ease}, kf{prop:[{t,v,e}]}}',
'- "text": text (\\n quebra linha), size, weight 400-700, font "display"|"ui"|"mono", color, align left|center|right, upper, spacing. A altura vem do texto.',
'- "shape": shape rect|ellipse|line, fill, stroke ("" = nenhum), strokeW, radius',
'- "image" e "video": src = "asset:..." ou "local:..." de media[].src; fit cover|contain; radius. Vídeo: mediaStart, vol, muted, loop',
'- "chart": type hbar|bar|line, data[{label,value}], color, textColor, size, unit, showValues',
'- "counter": from, to, decimals, prefix, suffix, size, font, weight, color, align',
'Cores: "#RRGGBB" ou tokens "@bg" "@ink" "@accent" "@on" (texto sobre o destaque) "@muted" "@line". Prefira tokens para seguir o tema.',
'anim.in: none|fade|rise|drop|left|right|scale|wipe|words (texto)|type (texto)|grow (forma, gráfico, contador). ease: linear|out|outq|in|inout|back|elastic ou "cb(x1,y1,x2,y2)".',
'kf (keyframes): props x, y, w, h, rot, scale, opacity, maskP; t em segundos dentro da cena; e = curva até aquele keyframe.',
'COMPOSIÇÃO (qualquer elemento): blend normal|multiply|screen|overlay|soft-light|hard-light|darken|lighten|color-dodge|difference; mask none|rect|round|ellipse|circle|wipe-l|wipe-r|wipe-u|wipe-d com maskP 0..1 (quanto aparece; anime com kf.maskP para revelar) e maskInv; matte = id de outra camada da mesma cena cujo formato recorta esta (matteInv para vazar; a camada usada como matte não aparece sozinha); parent = id de outra camada cujo movimento esta segue.',
'EFEITOS: fx{blur px, bright, contrast, sat (1 = normal), hue graus, shadow px, shadowColor, glow px, glowColor, mblur 0..10 (motion blur)}. Cena: fx{grain 0..1, vignette 0..1}. anim.in também aceita pop, blur e, para texto, chars (letra por letra).',
'- "sprite": src (folha de sprites) com cols, rows, count (0 = todos), fps, mode loop|pingpong|once, fit, flip; ou frames: lista de src (sequência de PNGs). GIF/WebP animado: cols=rows=1.',
'- "svg": src de um SVG da mídia; draw (desenha o traço antes de aparecer), drawT (s), strokeColor, strokeScale.',
'- "lottie": src de um JSON Lottie da mídia; speed, loop, fit.',
'- "shader": fundo ou camada GLSL. preset "fluid"|"aurora"|"plasma"|"waves"|"rays"|"grid"|"dots"|"grain" (geram imagem) ou "ripple"|"liquid"|"glitch" (distorcem a imagem em src); c1,c2,c3 cores; speed; intensity (0..2); offset. Para um efeito sob medida, escreva code em GLSL WebGL1 no formato Shadertoy: void mainImage(out vec4 o,in vec2 fc){...} usando iTime, iResolution, uC1,uC2,uC3 (vec3), uI, iChannel0 e uHasTex. Sem #version, sem texture(), use texture2D. Shaders de fundo ocupam a tela inteira (x 0, y 0, w e h do vídeo) e ficam como primeira camada.',
'MOTION AVANÇADO (use para vídeos de impacto, reels e vinhetas):',
'- text: "*trecho*" entre asteriscos usa a cor hl (padrão @accent), ex.: "*CO*MOVER"; stroke e strokeW para contorno (color "" deixa só o contorno); font "f:Anton" (ou "f:Bebas Neue", "f:Oswald", "f:Space Grotesk") usa qualquer Google Font; lh altura da linha. Animações por letra: anim.in "charsUp" (sobe da linha com recorte), "slam" (impacto, letra a letra), "scramble" (decodifica, ótimo em mono), "flicker", "spread", "chars".',
'- Todo elemento: sx e sy (esticar/achatar, para squash & stretch) com ay (âncora vertical 0..1, 1 = base), rgb (aberração cromática em px), glitch (0..1, fatias deslocadas), jit (tremor em px). Todos animáveis por keyframe, assim como morph e prog. Keyframe com "e":"hold" troca o valor de uma vez; "snap" é um ease muito rápido.',
'- shape: shape "poly" (sides), "star" (points, inner), "morph" (forms "square,triangle,hexagon,star,circle" ou também pentagon, octagon, diamond, star6, burst, cross, blob; keyframes em morph de 0 a n-1; wobble 0..2 ondula; round arredonda cantos), "dial" (mostrador com ticks), "arc" (prog 0..1, strokeW, spin), "ring" (dash, gap, spin).',
'- "particles": mode "burst"|"confetti"|"float"|"sphere" (esfera de pontos girando); count, seed, colors [cores], shapes ["circle","ring","square","tri","cross","plus","line","dot"], size, speed, gravity, drag, spin, life, delay, spread (graus), dir, streak (rastro), tilt. A caixa define a área e o centro da explosão; start define o momento da explosão.',
'- "pattern": mode "memphis" (peças geométricas coloridas; cols, colors, bg2, swap = girar peças a cada N s), "dots" (gap, dot, twinkle), "grid". prog 0..1 revela do ponto ox,oy (0..1).',
'- Qualquer elemento com fixed:true fica preso à tela (ignora câmera, parallax e tremor); use em HUD, logos e títulos fixos.',
'- "hud": moldura técnica com cantoneiras, text1 (topo), text2 (base), contador de quadros e timecode automáticos. Ocupe a tela toda e deixe por cima.',
'- Cena: trans "iris" (círculo com anéis, cores em tcol), "bars" (barras coloridas em tcol), "flash"; fx.shake (px) com fx.hits [tempos dos impactos na cena] treme a câmera.',
'- "three": objeto 3D (Three.js). mode "object" (shape "torusKnot"|"torus"|"sphere"|"box"|"icosa"|"cylinder"|"cone"), "text" (text, font, depth3 0..1), "cards" (images: lista de src de imagens em carrossel), "model" (src de um .glb da mídia). color, metal, rough, wire, light "studio"|"warm"|"neon", spin (voltas por 10 s), orbit (graus de órbita da câmera ao longo da cena), camY. Animáveis por keyframe: rx3, ry3 (graus) e dist3 (distância da câmera, padrão 5).',
'PARALLAX 2.5D: cada elemento tem depth 0..1 (0 = fundo, 1 = frente); na cena, par{on, x, y (deslocamento em px ao longo da cena), z (zoom), ease}. Fundo de tela cheia: image com x 0, y 0, w e h do quadro, fit cover, depth 0.',
'VÍDEO: rate (velocidade, 0.25 a 4) e ramp none|slowmid|speedup|slowdown|punch; mediaStart = segundo do clipe onde começa.',
'Variáveis: escreva {{chave}} em textos, rótulos, prefixos ou em "to" do contador; os valores ficam em vars.',
'Magic Move: com trans "magic" na cena, elementos com o mesmo "name" e o mesmo kind na cena anterior e na atual se transformam (posição, tamanho, cor e número).',
'',
'OPERAÇÕES (aplicadas em ordem):',
'{"op":"replace_project","project":{...}} criar do zero (ids podem ser omitidos)',
'{"op":"update","id":"id de elemento, de cena ou \\"project\\"","props":{...}} mescla objetos; listas substituem',
'{"op":"add_element","scene":"id da cena","element":{...},"index":n opcional}',
'{"op":"remove","id":"id de elemento, cena ou trilha"}',
'{"op":"add_scene","after":"id da cena ou null para o início","scene":{...}}',
'{"op":"move_scene","id":"id","index":n}',
'{"op":"set_format","format":"16:9|1:1|4:5|9:16"} reorganiza o layout automaticamente',
'{"op":"add_keyframe","id":"id do elemento","prop":"x","t":1.2,"v":300,"e":"inout"}',
'{"op":"snap_to_beats"} encaixa as viradas de cena nas batidas da trilha',
'{"op":"set_captions","script":"texto falado"} cria legendas distribuídas pela fala da trilha de voz (ou pelo vídeo); ou "items":[{"t0":0,"t1":1.8,"text":"..."}] com tempos exatos; opcionais style "pop"|"karaoke"|"box"|"line", pos "bottom"|"center"|"top", size, color, hl (cor do destaque), upper, on',
'TRILHAS: cada item de audio tem role "music"|"voice"|"sfx". Com project.duck {on, amount 0..1}, a música abaixa sozinha quando a voz fala. Para mudar a função de uma trilha: update com o id da trilha e props {"role":"voice"}.',
'REFERÊNCIA: cenas com notes "Referência ..." vieram da análise de um vídeo de referência; mantenha as durações e o elemento slot "Plano N" (imagem a ser enviada pela pessoa) a menos que peçam mudanças.',
'',
'BOM DESIGN: margens de cerca de 8% da largura; títulos de 52 a 84 px e corpo de 24 a 34 px num quadro de 1280 (escale em outros formatos); no máximo ~12 palavras por cena e ~2,5 palavras por segundo; uma ideia por cena; entradas escalonadas (0,3 a 0,5 s entre elementos); contraste alto; tudo dentro do quadro; última cena parada por pelo menos 1,5 s.',
'Altere só o que foi pedido e mantenha os ids existentes. Não invente números da pessoa: se faltar dado, use exemplo e avise na reply que são valores de exemplo. Quando houver mídia em media[], use-a se fizer sentido.'].join('\n');
function buildPrompt(cmd,extra){
  var sc=curScene(),e=findEl(selEl),recent=CH.turns.slice(-6).map(function(x){return (x.role==='user'?'Pessoa: ':'Claude: ')+x.content.slice(0,600)}).join('\n');
  var TT=TYPES[P.type]||TYPES.explainer;
  return RULES+'\n\nTIPO DE VÍDEO: '+TT.name+' (formato sugerido '+TT.fmt+'). '+TT.hint+'\n\nSELEÇÃO ATUAL: cena "'+sc.id+'" ('+esc(sc.name)+', '+(selScene+1)+' de '+P.scenes.length+'); '+(e?'elemento "'+e.id+'" ('+KNAME[e.kind]+': '+elName(e)+')':'nenhum elemento')+'; tempo '+t.toFixed(2)+' s.'+
    (extra&&extra.comment?'\nO PEDIDO VEIO DE UM COMENTÁRIO no palco, no tempo '+extra.comment.t+' s, na posição x='+Math.round(extra.comment.x*PW)+' y='+Math.round(extra.comment.y*PH)+(extra.comment.el?' sobre o elemento "'+extra.comment.el+'"':'')+'.':'')+
    (CH.att.length?'\nA pessoa anexou '+CH.att.length+' imagem(ns) de referência (cores, layout ou estilo).':'')+
    (recent?'\n\nCONVERSA RECENTE:\n'+recent:'')+
    '\n\nPROJETO ATUAL:\n'+JSON.stringify(compactProject())+'\n\nPEDIDO: '+cmd;
}
function mergeInto(tg,src){Object.keys(src||{}).forEach(function(k){if(k==='id')return;var v=src[k];if(isObj(v)&&isObj(tg[k]))mergeInto(tg[k],v);else tg[k]=clone(v)})}
function applyOps(ops){
  var n=0,errs=[],first=null;if(!Array.isArray(ops))return {n:0,errs:[]};
  ops.forEach(function(op){try{
    if(!op||!op.op)return;
    switch(op.op){
      case 'replace_project':{var media=P.media,audio=P.audio,np=normProject(Object.assign({},op.project||{}));np.media=media.concat((np.media||[]).filter(function(m){return !media.some(function(x){return x.id===m.id})}));if(!(op.project&&op.project.audio))np.audio=audio;P=np;first=0;selScene=0;selEl=null;n++;break}
      case 'update':{
        if(op.id==='project'){var pr=Object.assign({},op.props||{});delete pr.scenes;mergeInto(P,pr);P=normProject(P);n++;break}
        var f=findAny(op.id);
        if(f&&f.el){var ix=f.scene.els.indexOf(f.el);var ne=clone(f.el);mergeInto(ne,op.props);var r=normEl(ne);if(r){r.id=f.el.id;f.scene.els[ix]=r;n++;if(first==null)first=f.si}}
        else if(f&&f.scene){var ns=clone(f.scene);mergeInto(ns,op.props);P.scenes[f.si]=normScene(ns,f.si);P.scenes[f.si].id=f.scene.id;n++;if(first==null)first=f.si}
        else{var tr=trackById(op.id);if(tr){mergeInto(tr,op.props);n++}else errs.push('id '+op.id+' não encontrado')}
        break}
      case 'add_element':{var fs=findAny(op.scene);var sc=fs&&fs.scene&&!fs.el?fs.scene:curScene();var e=normEl(op.element||{});if(!e){errs.push('elemento inválido');break}
        if(op.index!=null&&isFinite(op.index))sc.els.splice(clamp(op.index|0,0,sc.els.length),0,e);else sc.els.push(e);n++;if(first==null)first=P.scenes.indexOf(sc);break}
      case 'remove':{var fr=findAny(op.id);if(fr&&fr.el){fr.scene.els.splice(fr.scene.els.indexOf(fr.el),1);n++;if(first==null)first=fr.si}else if(fr&&fr.scene&&P.scenes.length>1){P.scenes.splice(fr.si,1);n++;first=Math.max(0,fr.si-1)}else if(trackById(op.id)){P.audio=P.audio.filter(function(a){return a.id!==op.id});n++}break}
      case 'add_scene':{var s=normScene(op.scene||{},P.scenes.length);var at=0;if(op.after){var fa=findAny(op.after);at=fa?fa.si+1:P.scenes.length}P.scenes.splice(at,0,s);n++;if(first==null)first=at;break}
      case 'move_scene':{var fm=findAny(op.id);if(fm&&!fm.el){var sm=P.scenes.splice(fm.si,1)[0];var to=clamp(op.index|0,0,P.scenes.length);P.scenes.splice(to,0,sm);n++;if(first==null)first=to}break}
      case 'set_format':{var F=FORMATS[op.format];if(F){reflowProject(P,F[0],F[1]);n++}break}
      case 'add_keyframe':{var fk=findAny(op.id);if(fk&&fk.el&&ANIMATABLE.indexOf(op.prop)>=0){setKey(fk.el,op.prop,+op.t||0,+op.v);var arr=fk.el.kf[op.prop];arr.forEach(function(k){if(Math.abs(k.t-(+op.t||0))<.03&&op.e)k.e=op.e});n++;if(first==null)first=fk.si}break}
      case 'snap_to_beats':{if(snapToBeats())n++;break}
      case 'set_captions':{var cc=capCfg();['on','style','pos','size','color','hl','upper'].forEach(function(k){if(op[k]!=null)cc[k]=op[k]});if(Array.isArray(op.items))cc.items=op.items.map(function(it){return {t0:+it.t0||0,t1:+it.t1||0,text:String(it.text||'')}});else if(typeof op.script==='string')cc.items=timeCaptions(chunkScript(op.script,cc.style==='pop'?4:7));capCfg();n++;break}
    }
  }catch(x){errs.push(String(x&&x.message||x))}});
  return {n:n,errs:errs,first:first};
}
var SAMPLE_ERR={not_granted:'Você não permitiu que esta página use o Claude. Sigo no modo local.',sampling_disabled:'O Claude não está disponível para esta conta. Sigo no modo local.',rate_limited:'Muitos pedidos seguidos ou limite de uso atingido. Tente de novo daqui a pouco.',session_expired:'Sua sessão expirou. Entre de novo no Claude e recarregue a página.',refused:'O Claude não pôde atender a esse pedido. Tente pedir de outro jeito.',invalid_json:'A resposta veio num formato que não consegui aplicar. Tente de novo, talvez pedindo menos coisas de uma vez.',empty_completion:'A resposta veio vazia. Tente pedir de outro jeito.',prompt_too_large:'O projeto ficou grande demais para enviar inteiro. Peça uma mudança mais específica.',image_rejected:'Não consegui usar essa imagem. Tente outra em PNG ou JPG.',images_unavailable:'Esta visualização não envia imagens. Mande só o texto.'};
function setBusy(b,typing){CH.busy=b;$('#sendBtn').disabled=b;$('#stopBtn').hidden=!b||chatMode()!=='claude'}
function sendText(display,cmd,extra){
  if(CH.busy){toast('Aguarde a resposta anterior.');return}
  cmd=cmd==null?display:cmd;
  var thumbs=CH.att.map(function(a){return a.u});
  addMsg({role:'user',text:display,thumbs:thumbs});setPlaying(false);
  if(chatMode()==='claude')askClaude(cmd,extra);else askLocal(cmd);
}
function askClaude(cmd,extra){
  var typing=addMsg({role:'ai',typing:true,status:'Pensando…'});setBusy(true);
  var images=CH.att.map(function(a){return a.f});var prompt=buildPrompt(cmd,extra);CH.att=[];renderAtt();
  CH.ctl=new AbortController();var startHi=hi;
  var opts={modelTier:$('#tier').value,cache:false,signal:CH.ctl.signal,onText:function(u){typing.status='Escrevendo… '+Math.round(u.text.length/100)/10+' mil caracteres';renderMsgs()}};
  if(images.length)opts.images=images;
  CAP.sample.json(prompt,opts).then(function(res){
    CH.msgs.splice(CH.msgs.indexOf(typing),1);
    if(!isObj(res))throw {code:'invalid_json'};
    var r=applyOps(res.ops||[]),reply=String(res.reply||'').trim()||(r.n?'Pronto.':'Não mudei nada.');
    var m={role:'ai',text:reply+(r.errs.length?' ('+r.errs.length+' alteração(ões) não aplicada(s).)':'')};
    if(res.question&&res.question.text&&Array.isArray(res.question.options)&&res.question.options.length)m.q={text:String(res.question.text),options:res.question.options.slice(0,5).map(String)};
    if(r.n){m.ops=r.n;commit();m.undo=startHi;if(res.ops.some(function(o){return o.op==='replace_project'}))m.card={name:P.name,n:P.scenes.length,s:total().toFixed(0)};
      if(r.first!=null)selScene=clamp(r.first,0,P.scenes.length-1);afterProjectChange();setTimeout(function(){seek(sceneStart(selScene));setPlaying(true)},250)}
    CH.msgs.push(m);CH.turns.push({role:'user',content:cmd},{role:'assistant',content:reply});renderMsgs();
  }).catch(function(e){
    var i=CH.msgs.indexOf(typing);if(i>=0)CH.msgs.splice(i,1);
    var code=e&&e.code;
    if(code==='cancelled'){addMsg({role:'ai',text:'Parei.'})}
    else{addMsg({role:'ai',text:SAMPLE_ERR[code]||'Algo falhou na conexão com o Claude. Tente de novo.'});if(code==='not_granted'||code==='sampling_disabled'||code==='not_declared'||code==='capability_disabled'){CH.localOnly=true;updateMode()}}
  }).then(function(){setBusy(false);CH.ctl=null});
}
function send(){var ta=$('#prompt'),raw=ta.value.trim();if(!raw&&!CH.att.length)return;ta.value='';sendText(raw||'Use esta imagem como referência.')}
$('#sendBtn').addEventListener('click',send);
$('#prompt').addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send()}});

/* ---------- modo local (sem Claude) ---------- */
var COLORS={vermelho:'#E02F2F',azul:'#2F6FE0',verde:'#2FA05A',amarelo:'#F2C230',laranja:'#F28A2E',roxo:'#7A4FD6',rosa:'#E85A9E',preto:'#111111',branco:'#FFFFFF',cinza:'#8A8A8A'};
function askLocal(cmd){
  var typing=addMsg({role:'ai',typing:true});setBusy(true);var startHi=hi;
  setTimeout(function(){
    var r=respondLocal(cmd);CH.msgs.splice(CH.msgs.indexOf(typing),1);
    var m={role:'ai',text:r.text};
    if(r.edit||r.fresh){commit();m.ops=1;m.undo=startHi;if(r.fresh)m.card={name:P.name,n:P.scenes.length,s:total().toFixed(0)};afterProjectChange();if(r.show){showEl(r.show);draw();updateHead()}else setTimeout(function(){seek(sceneStart(selScene));setPlaying(true)},250)}
    CH.msgs.push(m);renderMsgs();setBusy(false);
  },500);
}
function respondLocal(raw){
  var text=raw.replace(/^\/motion\s*/i,'').trim(),low=norm(text),m,sc=curScene(),e=findEl(selEl);
  m=low.match(/cores?\s*(#[0-9a-f]{6})\s+(#[0-9a-f]{6})\s+(#[0-9a-f]{6})/);
  if(m){P.theme={bg:m[1],ink:m[2],accent:m[3],on:lum(m[3])>.4?'#16120F':'#FFFFFF'};P.themeName='custom';return {text:'Apliquei suas cores ao tema.',edit:true}}
  m=low.match(/\b(9:16|4:5|1:1|16:9|vertical|quadrado|horizontal|stories|reels)\b/);
  if(m&&/formato|vertical|quadrado|horizontal|stories|reels|9:16|4:5|1:1|16:9/.test(low)&&!/anuncio|crie|faca|monte/.test(low)){var key=/9:16|vertical|stories|reels/.test(m[1])?'9:16':/4:5/.test(m[1])?'4:5':/1:1|quadrado/.test(m[1])?'1:1':'16:9';reflowProject(P,FORMATS[key][0],FORMATS[key][1]);return {text:'Formato '+key+' aplicado e layout reorganizado.',edit:true}}
  m=low.match(/(?:paleta|tema)\b.*?(papel|claro|grafite|escuro|oceano|azul|musgo|verde|noturno|neon|coral)/);
  if(m){var map={papel:'papel',claro:'papel',grafite:'grafite',escuro:'grafite',oceano:'oceano',azul:'oceano',musgo:'musgo',verde:'musgo',noturno:'neon',neon:'neon',coral:'coral'};applyTheme(map[m[1]]);return {text:'Apliquei a paleta '+THEMES[map[m[1]]].name+'.',edit:true}}
  if(/batida/.test(low)&&/encaix|sincron|ritmo/.test(low)){return snapToBeats()?{text:'Encaixei as viradas de cena nas batidas.',edit:true}:{text:'Adicione uma trilha em Mídia para eu detectar as batidas.'}}
  if(/\b(remov|apag|delet|exclu|tire)\w*/.test(low)&&e){var nm=elName(e);sc.els.splice(sc.els.indexOf(e),1);selEl=null;return {text:'Removi «'+nm+'».',edit:true}}
  var cw=null;Object.keys(COLORS).forEach(function(k){if(low.indexOf(k)>=0)cw=k});var hx=low.match(/#[0-9a-f]{6}/);
  if((cw||hx)&&e){var col=hx?hx[0]:COLORS[cw];e[e.kind==='shape'?'fill':(e.kind==='chart'?'color':'color')]=col;return {text:'Mudei a cor de «'+elName(e)+'».',edit:true,show:e}}
  if(e&&(/\b(maior|aument)/.test(low)||/\b(menor|diminu|reduz)/.test(low))){var f=/\b(maior|aument)/.test(low)?1.2:1/1.2;if(e.size)e.size=Math.round(e.size*f);else{e.w=Math.round(e.w*f);e.h=Math.round(e.h*f)}return {text:'Ajustei o tamanho de «'+elName(e)+'».',edit:true,show:e}}
  m=low.match(/cena\s*(\d+).*?(\d+(?:[.,]\d+)?)\s*(?:s\b|seg)/);
  if(m){var idx=+m[1]-1;if(!P.scenes[idx])return {text:'Não existe a cena '+m[1]+'.'};P.scenes[idx].dur=Math.max(.5,parseFloat(m[2].replace(',','.')));selScene=idx;return {text:'A cena '+m[1]+' agora dura '+fmtS(P.scenes[idx].dur)+'.',edit:true}}
  m=text.match(/^(?:t[ií]tulo|texto)\s*(?:para|:|=)\s*["“]?(.+?)["”]?$/i);
  if(m){var te=e&&e.kind==='text'?e:sc.els.filter(function(x){return x.kind==='text'}).sort(function(a,b){return b.size-a.size})[0];if(!te)return {text:'Não achei um texto nesta cena.'};te.text=m[1];return {text:'Troquei o texto.',edit:true,show:te}}
  var tpl=/anuncio|promo|lancamento|produto|teaser|logo/.test(low)?'promo':/trimest|receita|resultado|relatorio|reuniao/.test(low)?'quarter':/plano|preco|vendas/.test(low)?'pricing':/onboarding|passo a passo|tutorial/.test(low)?'onboarding':/histor|linha do tempo|timeline/.test(low)?'history':null;
  if(tpl){useTemplate(tpl);if(/9:16|vertical|stories|reels/.test(low))reflowProject(P,720,1280);return {text:'Montei a partir do modelo “'+TEMPLATES[tpl].name+'”. Os valores são de exemplo: troque na aba Dados ou clicando nos elementos.',fresh:true}}
  return {text:'No modo local eu entendo pedidos de modelo (anúncio, resultados, planos, onboarding, linha do tempo) e comandos como “deixe isto vermelho”, “a cena 2 deve durar 6 s”, “formato 9:16”, “paleta oceano” ou “encaixe nas batidas”.'};
}

/* ---------- revisão visual pelo Claude ---------- */
function frameBlob(tt,w){return new Promise(function(res){var c=document.createElement('canvas'),sc=w/PW;c.width=Math.round(PW*sc);c.height=Math.round(PH*sc);renderWith(P,c,tt,sc);c.toBlob(function(b){res(b)},'image/jpeg',.82)})}
function aiReview(){
  if(!CAP.sample)return;var btn=$('#aiRevBtn'),box=$('#aiRev');if(btn)btn.disabled=true;if(box){box.hidden=false;box.textContent='Preparando quadros…'}
  CAP.sample.limits().catch(function(){return {}}).then(function(lim){
    var max=lim&&lim.images?Math.min(lim.images.maxCount||4,8):0,times=P.scenes.map(function(s,i){return sceneStart(i)+Math.max(.1,s.dur-.25)}).slice(0,max||0);
    var chain=Promise.all(times.map(function(tt){return prepFrameMedia(tt).then(function(){return frameBlob(tt,960)})}));
    return chain.then(function(blobs){
      var summary=P.scenes.map(function(s,i){return 'Cena '+(i+1)+' "'+s.name+'" ('+fmtS(s.dur)+', transição '+s.trans+'): '+s.els.filter(function(e){return e.kind==='text'}).map(function(e){return '"'+sub(e.text).slice(0,80)+'"'}).join(' / ')}).join('\n');
      var q='Você é diretor de arte de motion design. '+(blobs.length?'As imagens são o quadro final de cada cena, em ordem. ':'')+'Revise esta animação ('+PW+'x'+PH+', '+fmtS(total())+'). Aponte até 7 melhorias concretas sobre hierarquia, legibilidade, ritmo, consistência visual e mensagem. Cada item numa linha começando com "• ", citando a cena. Português do Brasil, sem markdown além dos marcadores, no máximo 120 palavras.\n\nRoteiro:\n'+summary;
      return CAP.sample(q,{images:blobs.length?blobs:undefined,modelTier:'default',cache:false,onText:function(u){if(box)box.textContent=u.text}});
    }).then(function(r){claudeReview=r.text;if(tab==='review')renderPanel()});
  }).catch(function(e){if(box)box.textContent=SAMPLE_ERR[e&&e.code]||'Não foi possível revisar agora.';if(e&&(e.code==='not_granted'||e.code==='sampling_disabled')){CH.localOnly=true;updateMode()}})
  .then(function(){var b=$('#aiRevBtn');if(b)b.disabled=false});
}
