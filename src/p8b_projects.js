/* =========================================================
   Vários projetos: galeria, criar, abrir, duplicar, renomear, excluir
   Cada projeto fica em project/<id>; o índice leve em projlist/<id>
   ========================================================= */
var CURP=(function(){var m=/[#&]p=([\w-]+)/.exec(location.hash||'');if(m)return m[1];try{return localStorage.getItem('motion-proj')||'main'}catch(x){return 'main'}})();
var PROJS=[],projUnsub=null,CHS={},lastThumbAt=0,lastThumb='';
function projThumb(){
  try{var c=document.createElement('canvas');c.width=224;c.height=Math.round(224*PH/PW);if(c.height>224){c.height=224;c.width=Math.round(224*PW/PH)}
    var tt=Math.min(total()-.01,Math.max(.8,P.scenes[0]?P.scenes[0].dur*.7:1));renderWith(P,c,tt,c.width/PW);return c.toDataURL('image/jpeg',.62)}catch(x){return ''}
}
function projMeta(force){
  var now=Date.now();if(force||!lastThumb||now-lastThumbAt>20000){var th=projThumb();if(th){lastThumb=th;lastThumbAt=now}}
  return {name:String(P.name||'Sem título').slice(0,80),at:now,by:ME.id||'',scenes:P.scenes.length,dur:Math.round(total()*10)/10,fmt:PW+'x'+PH,type:P.type||'',thumb:lastThumb};
}
function writeIndex(force){
  if(CAP.db&&!isLocalProj(CURP)){CAP.db.doc('projlist/'+CURP).set(projMeta(force)).catch(function(){})}
  else localIndexPut(CURP,projMeta(force));
}
/* --- permissão de gravação e erros do banco --- */
var CAN_WRITE=null; /* null = ainda não sei; false = só leitura (projetos novos ficam no navegador) */
var LOCAL_MSG='Modo local: este projeto fica só neste navegador';
function isLocalProj(id){return !CAP.db||/^l_/.test(String(id||''))}
var DB_REASON={invalid_argument:'o artefato recusou a gravação (sem permissão ou dado acima do limite)',permission_denied:'sem permissão para gravar neste artefato',not_granted:'sem permissão para gravar neste artefato',unauthenticated:'é preciso entrar na conta para gravar',quota_exceeded:'o armazenamento do artefato está cheio',resource_exhausted:'limite de gravações atingido; tento de novo em instantes',unavailable:'sem conexão com o artefato',deadline_exceeded:'o artefato demorou demais para responder',failed_precondition:'o artefato não aceitou a gravação agora'};
function dbErr(e){var code=(e&&(e.code||e.name))||'erro',msg=(e&&e.message)||String(e||'');var why=DB_REASON[code]||'falha ao gravar';
  return {code:code,msg:msg,why:why,text:why+' (código: '+code+(msg&&msg!==why?' — '+msg:'')+')'}}
function noWriteErr(code){return code==='invalid_argument'||code==='permission_denied'||code==='not_granted'||code==='unauthenticated'||code==='quota_exceeded'}
function retryErr(code){return code==='resource_exhausted'||code==='unavailable'||code==='deadline_exceeded'||code==='failed_precondition'}
/* --- gravação no banco: divide projetos grandes em partes --- */
var PART_MAX=230000;
function u8len(s){try{return new TextEncoder().encode(s).length}catch(x){return s.length*3}}
function splitJson(json){var out=[],i=0;while(i<json.length){var n=Math.min(200000,json.length-i),c=json.substr(i,n);while(u8len(c)>PART_MAX&&n>1000){n=Math.floor(n*.8);c=json.substr(i,n)}out.push(c);i+=n}return out}
function writeProjectDoc(id,json){
  var by=ME.id||'',at=Date.now();
  if(u8len(json)<=PART_MAX)return CAP.db.doc('project/'+id).set({json:json,by:by,at:at});
  var parts=splitJson(json);
  return Promise.all(parts.map(function(c,i){return CAP.db.doc('projpart/'+id+'_'+i).set({d:c,ver:at,i:i})}))
    .then(function(){return CAP.db.doc('project/'+id).set({json:'',parts:parts.length,ver:at,by:by,at:at})});
}
/* monta o JSON do documento (inteiro ou em partes) */
function assembleProject(id,d){
  if(!d)return Promise.resolve(null);if(!d.parts)return Promise.resolve(typeof d.json==='string'?d.json:null);
  var ps=[];for(var i=0;i<d.parts;i++)ps.push(CAP.db.doc('projpart/'+id+'_'+i).get());
  return Promise.all(ps).then(function(ss){var s='';for(var k=0;k<ss.length;k++){if(!ss[k].exists)throw new Error('parte '+(k+1)+' de '+ss.length+' não encontrada');var pd=ss[k].data();if(d.ver&&pd.ver!==d.ver)throw {code:'stale'};s+=pd.d}return s});
}
function readProjectDoc(id){
  if(isLocalProj(id))return localLoadProj(id);
  return CAP.db.doc('project/'+id).get().then(function(s){return s.exists?assembleProject(id,s.data()):null});
}
/* --- projetos guardados no navegador (sem banco ou sem permissão) --- */
function localIndex(){try{return JSON.parse(localStorage.getItem('motion-projs')||'[]')}catch(x){return []}}
function localIndexPut(id,meta){var L=localIndex().filter(function(p){return p.id!==id});meta.id=id;meta.local=true;L.unshift(meta);
  try{localStorage.setItem('motion-projs',JSON.stringify(L))}catch(x){/* sem espaço: guarda sem miniatura */L[0].thumb='';try{localStorage.setItem('motion-projs',JSON.stringify(L))}catch(y){}}
  if(!CAP.db)PROJS=L;renderProjects()}
function localSaveProj(id,json){
  var ok=false;try{localStorage.setItem('motion-draft:'+id,json);ok=true}catch(x){}
  if(ok){idbPut('proj:'+id,'').catch(function(){});return Promise.resolve('localStorage')}
  try{localStorage.removeItem('motion-draft:'+id)}catch(x){}
  return idbPut('proj:'+id,json).then(function(){return 'indexeddb'},function(e){var er=new Error('o navegador está sem espaço para guardar o projeto');er.code='local_full';throw er});
}
function localLoadProj(id){
  var j=null;try{j=localStorage.getItem('motion-draft:'+id)}catch(x){}
  if(j)return Promise.resolve(j);
  return idbGet('proj:'+id).then(function(v){return typeof v==='string'&&v?v:null},function(){return null});
}
function localDelProj(id){try{localStorage.removeItem('motion-draft:'+id)}catch(x){}idbPut('proj:'+id,'').catch(function(){});
  var L=localIndex().filter(function(p){return p.id!==id});try{localStorage.setItem('motion-projs',JSON.stringify(L))}catch(x){}if(!CAP.db)PROJS=L}
/* abre um projeto do navegador */
function loadLocalProject(id){
  firstLoad=true;lastSaved='';dirty=false;setSave('Abrindo…');
  return localLoadProj(id).then(function(j){
    if(id!==CURP)return;
    if(j){try{P=normProject(JSON.parse(j));hist=[JSON.stringify(P)];hi=0;updUndo();selScene=0;selEl=null;t=0;restoreIdbMedia();afterProjectChange()}catch(x){firstLoad=false;setSave('Projeto salvo ilegível',true);return}}
    else if(CAP.db){firstLoad=false;toast('Esse projeto local não está mais neste navegador. Abrindo o principal.');CURP='main';rememberProj();refilter();subscribeProject();return}
    firstLoad=false;lastSaved=j||'';showLocalState();
  });
}
function showLocalState(){var s=$('#saveState');if(CAP.db){setSave('Modo local');s.title=LOCAL_MSG}else{setSave('Rascunho local');s.title='Sem armazenamento no artefato: '+LOCAL_MSG.toLowerCase()}}
/* salva o projeto atual no navegador */
function saveLocalNow(pid,json){
  return localSaveProj(pid,json).then(function(){localIndexPut(pid,projMeta(false));if(pid===CURP){dirty=false;lastSaved=json;showLocalState()}},
    function(e){var r=dbErr(e);setSave('Não salvo: '+r.why,true);$('#saveState').title=r.text;toast('Não salvo: '+r.text);throw e});
}
/* sem permissão no banco: o projeto vira uma cópia local e continua aberto */
function toLocalCopy(e){
  var r=dbErr(e),old=CURP,json=packProject(P),id='l_'+nid('p');
  if(!/\(cópia local\)$/.test(P.name||''))P.name=(P.name||'Projeto')+' (cópia local)';json=packProject(P);
  return localSaveProj(id,json).then(function(){
    if(old===CURP){if(projUnsub){try{projUnsub()}catch(x){}projUnsub=null}CURP=id;rememberProj();refilter();setTitles&&setTitles()}
    localIndexPut(id,projMeta(true));dirty=false;lastSaved=json;showLocalState();
    toast('Não consegui gravar no artefato — '+r.text+'. '+LOCAL_MSG+'.',9000);return id;
  },function(e2){var r2=dbErr(e2);setSave('Não salvo: '+r2.why,true);$('#saveState').title=r.text+' / '+r2.text;toast('Não salvo: '+r.text+'. Também não deu para guardar no navegador: '+r2.why+'.',9000)});
}
function subscribeProject(){
  if(projUnsub){try{projUnsub()}catch(x){}projUnsub=null}
  $('#saveState').title='';
  if(isLocalProj(CURP)){loadLocalProject(CURP);return}
  firstLoad=true;lastSaved='';dirty=false;setSave('Abrindo…');
  projUnsub=CAP.db.doc('project/'+CURP).onSnapshot(onRemoteProject,function(e){var r=dbErr(e);setSave('Sem conexão',true);$('#saveState').title=r.text});
}
function rememberProj(){try{localStorage.setItem('motion-proj',CURP)}catch(x){}try{history.replaceState(null,'','#p='+CURP)}catch(x){}}
function filterByProj(list){return list.filter(function(x){return (x.proj||'main')===CURP})}
function refilter(){COMMENTS=filterByProj(COMMENTS_ALL);VERSIONS=VERSIONS_ALL.filter(function(v){return !v.proj||v.proj===CURP});afterComments();if(tab==='versions')renderPanel()}
var COMMENTS_ALL=[],VERSIONS_ALL=[];
/* salva já o projeto atual (antes de trocar) */
function saveNow(){
  if(!dirty||firstLoad)return Promise.resolve();clearTimeout(saveTimer);
  var pid=CURP,json=packProject(P);
  if(isLocalProj(pid))return saveLocalNow(pid,json).catch(function(){});
  if(CAN_WRITE===false)return toLocalCopy({code:'permission_denied',message:'você só pode ver este artefato'});
  var meta=projMeta(true);setSave('Salvando…');
  return Promise.all([writeProjectDoc(pid,json),CAP.db.doc('projlist/'+pid).set(meta)]).then(function(){dirty=false;lastSaved=json;setSave('Salvo')})
    .catch(function(e){var r=dbErr(e);if(noWriteErr(r.code)){if(r.code!=='quota_exceeded')CAN_WRITE=false;return toLocalCopy(e)}
      setSave('Não salvo: '+r.why,true);$('#saveState').title=r.text;toast('Não salvo: '+r.text,8000)});
}
function switchProject(id){
  if(!id||id===CURP){closeModal();return Promise.resolve()}
  setSave('Salvando…');
  return saveNow().then(function(){
    CHS[CURP]={msgs:CH.msgs,turns:CH.turns};var c=CHS[id]||{msgs:[],turns:[]};CH.msgs=c.msgs;CH.turns=c.turns;
    CURP=id;rememberProj();lastThumb='';lastThumbAt=0;refilter();renderMsgs();closeModal();
    var done=CAP.db?(subscribeProject(),Promise.resolve()):loadLocalProject(id);
    roomPresence();return done;
  });
}
function createProject(proj,open){
  proj=normProject(proj);var json=packProject(proj);
  var keepP=P;P=proj;applySize();var meta=projMeta(true);meta.at=Date.now();P=keepP;applySize();draw();
  function openIt(id){return open===false?Promise.resolve(id):switchProject(id).then(function(){return id})}
  function goLocal(why){var id='l_'+nid('p');
    return localSaveProj(id,json).then(function(){localIndexPut(id,Object.assign({},meta));
      if(CAP.db)toast((why?'Não consegui gravar no artefato — '+why+'. ':'Você só pode ver este artefato. ')+LOCAL_MSG+'.',9000);
      return openIt(id)},
      function(e){var r=dbErr(e);toast('Não foi possível criar o projeto: '+(why?why+'; ':'')+'no navegador: '+r.text,9000);var er=new Error((why?why+'; ':'')+'no navegador: '+r.text);er.code=r.code;throw er});
  }
  if(!CAP.db||CAN_WRITE===false)return goLocal(CAP.db?'':null);
  var id=nid('p');
  return Promise.all([writeProjectDoc(id,json),CAP.db.doc('projlist/'+id).set(meta)])
    .then(function(){return openIt(id)},function(e){var r=dbErr(e);if(noWriteErr(r.code)&&r.code!=='quota_exceeded')CAN_WRITE=false;
      CAP.db.doc('project/'+id).delete().catch(function(){});CAP.db.doc('projlist/'+id).delete().catch(function(){});
      return goLocal(r.text)});
}
function blankProject(){return {name:'Novo projeto',type:P.type,w:PW,h:PH,theme:clone(P.theme),themeName:P.themeName,fonts:clone(P.fonts),brand:clone(P.brand),scenes:[{name:'Cena 1',dur:5,els:[]}]}}
function deleteProject(id){
  if(id===CURP){toast('Abra outro projeto antes de excluir este.');return}
  PROJS=PROJS.filter(function(p){return p.id!==id});
  if(isLocalProj(id))localDelProj(id);
  else{CAP.db.doc('project/'+id).get().then(function(s){var n=s.exists&&s.data().parts||0;for(var i=0;i<n;i++)CAP.db.doc('projpart/'+id+'_'+i).delete().catch(function(){});return CAP.db.doc('project/'+id).delete()}).catch(function(e){toast('Não consegui excluir: '+dbErr(e).text)});CAP.db.doc('projlist/'+id).delete().catch(function(){})}
  renderProjects();toast('Projeto excluído.');
}
function ago(ms){var s=Math.max(0,(Date.now()-ms)/1000);if(s<60)return 'agora';if(s<3600)return 'há '+Math.round(s/60)+' min';if(s<86400)return 'há '+Math.round(s/3600)+' h';return new Date(ms).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
var projConfirm=null,projNewOpen=false;
function renderProjects(){
  var d=$('#dlg');if(!d||$('#modal').hidden||!d.querySelector('.projs'))return;d.querySelector('.projs').innerHTML=projGrid();d.querySelector('.pnew').hidden=!projNewOpen;
}
function projGrid(){
  var list=PROJS.slice();if(CAP.db)localIndex().forEach(function(p){if(/^l_/.test(p.id)&&!list.some(function(q){return q.id===p.id}))list.push(p)});if(!list.some(function(p){return p.id===CURP}))list.unshift(Object.assign({id:CURP},projMeta(false)));
  list.sort(function(a,b){return (b.id===CURP)-(a.id===CURP)||(b.at||0)-(a.at||0)});
  return list.map(function(p){var cur=p.id===CURP,mm=Math.floor((p.dur||0)/60),ss=Math.round((p.dur||0)%60);
    return '<div class="pcard'+(cur?' cur':'')+'" data-pid="'+esc(p.id)+'"><button class="pthumb" data-pact="open" data-pid="'+esc(p.id)+'" aria-label="Abrir '+esc(p.name||'projeto')+'">'+(p.thumb?'<img src="'+esc(p.thumb)+'" alt="">':'<span>'+IC.play+'</span>')+(cur?'<i class="badge">Aberto</i>':'')+(CAP.db&&/^l_/.test(p.id)?'<i class="badge lbadge" title="'+esc(LOCAL_MSG)+'">Só neste navegador</i>':'')+'</button>'+
      '<div class="pinfo"><b title="'+esc(p.name||'')+'">'+esc(p.name||'Sem título')+'</b><span>'+(p.scenes||0)+' cena'+(p.scenes===1?'':'s')+' · '+mm+':'+String(ss).padStart(2,'0')+' · '+esc(p.fmt||'')+' · '+ago(p.at||Date.now())+'</span></div>'+
      '<div class="pacts"><button class="ghost" data-pact="dup" data-pid="'+esc(p.id)+'" title="Duplicar" aria-label="Duplicar">'+IC.copy+'</button>'+(cur?'':'<button class="ghost'+(projConfirm===p.id?' danger':'')+'" data-pact="del" data-pid="'+esc(p.id)+'" title="Excluir" aria-label="Excluir">'+(projConfirm===p.id?'Confirmar?':IC.trash)+'</button>')+'</div></div>'}).join('');
}
function openProjects(){
  closePops();projConfirm=null;projNewOpen=false;
  var tpls=Object.keys(TEMPLATES).map(function(k){return '<button class="mi" data-pact="tpl" data-k="'+k+'">'+IC.template+esc(TEMPLATES[k].name)+'</button>'}).join('');
  modal('<div class="dh"><h3 id="mTitle">Projetos</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>'+
    '<div class="pbar"><button class="btn accent" data-pact="new">'+IC.plus+'Novo projeto</button><span class="info">'+(!CAP.db?'Sem armazenamento no artefato: os projetos ficam só neste navegador.':CAN_WRITE===false?'Você só pode ver este artefato. Os projetos que criar ficam só neste navegador (modo local).':'Cada projeto é salvo sozinho no artefato. Abra quantos quiser, um de cada vez nesta aba, ou vários em abas diferentes.')+'</span></div>'+
    '<div class="pnew" hidden><button class="mi" data-pact="blank">'+IC.plus+'Em branco (mesmo formato e marca)</button><button class="mi" data-pact="dupcur">'+IC.copy+'Cópia do projeto aberto</button><hr><h4>A partir de um modelo</h4>'+tpls+'</div>'+
    '<div class="projs">'+projGrid()+'</div>',true);
  var d=$('#dlg');
  d.onclick=function(e){var b=e.target.closest('[data-pact]');if(!b)return;var a=b.dataset.pact,id=b.dataset.pid;
    if(a==='new'){projNewOpen=!projNewOpen;renderProjects();return}
    if(a==='open'){switchProject(id);return}
    if(a==='blank'){createProject(blankProject());return}
    if(a==='dupcur'){var cp=JSON.parse(JSON.stringify(P));cp.name=(P.name||'Projeto')+' (cópia)';createProject(cp);return}
    if(a==='tpl'){var tp=TEMPLATES[b.dataset.k].make();tp.media=[];createProject(tp);return}
    if(a==='dup'){if(id===CURP){var c2=JSON.parse(JSON.stringify(P));c2.name=(P.name||'Projeto')+' (cópia)';createProject(c2,false).then(function(){renderProjects();toast('Cópia criada.')});return}
      readProjectDoc(id).then(function(j){if(!j)throw new Error('projeto não encontrado');var o=JSON.parse(j);o.name=(o.name||'Projeto')+' (cópia)';return createProject(o,false)}).then(function(){renderProjects();toast('Cópia criada.')}).catch(function(e){toast('Não consegui duplicar: '+dbErr(e).text)});return}
    if(a==='del'){if(projConfirm===id){projConfirm=null;deleteProject(id)}else{projConfirm=id;renderProjects();setTimeout(function(){if(projConfirm===id){projConfirm=null;renderProjects()}},4000)}return}
  };
}
