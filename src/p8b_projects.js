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
  if(CAP.db){CAP.db.doc('projlist/'+CURP).set(projMeta(force)).catch(function(){})}
  else localIndexPut(CURP,projMeta(force));
}
/* --- modo sem banco: projetos no navegador --- */
function localIndex(){try{return JSON.parse(localStorage.getItem('motion-projs')||'[]')}catch(x){return []}}
function localIndexPut(id,meta){var L=localIndex().filter(function(p){return p.id!==id});meta.id=id;L.unshift(meta);try{localStorage.setItem('motion-projs',JSON.stringify(L))}catch(x){}PROJS=L}
function subscribeProject(){
  if(projUnsub){try{projUnsub()}catch(x){}projUnsub=null}
  firstLoad=true;lastSaved='';dirty=false;setSave('Abrindo…');
  projUnsub=CAP.db.doc('project/'+CURP).onSnapshot(onRemoteProject,function(){setSave('Sem conexão',true)});
}
function rememberProj(){try{localStorage.setItem('motion-proj',CURP)}catch(x){}try{history.replaceState(null,'','#p='+CURP)}catch(x){}}
function filterByProj(list){return list.filter(function(x){return (x.proj||'main')===CURP})}
function refilter(){COMMENTS=filterByProj(COMMENTS_ALL);VERSIONS=VERSIONS_ALL.filter(function(v){return !v.proj||v.proj===CURP});afterComments();if(tab==='versions')renderPanel()}
var COMMENTS_ALL=[],VERSIONS_ALL=[];
/* salva já o projeto atual (antes de trocar) */
function saveNow(){
  if(!dirty||firstLoad)return Promise.resolve();clearTimeout(saveTimer);
  var pid=CURP,json=packProject(P),meta=projMeta(true);
  if(!CAP.db){try{localStorage.setItem('motion-draft:'+pid,json)}catch(x){}localIndexPut(pid,meta);dirty=false;return Promise.resolve()}
  if(json.length>250000)return Promise.resolve();
  return Promise.all([CAP.db.doc('project/'+pid).set({json:json,by:ME.id||'',at:Date.now()}),CAP.db.doc('projlist/'+pid).set(meta)]).then(function(){dirty=false}).catch(function(){});
}
function switchProject(id){
  if(!id||id===CURP){closeModal();return Promise.resolve()}
  setSave('Salvando…');
  return saveNow().then(function(){
    CHS[CURP]={msgs:CH.msgs,turns:CH.turns};var c=CHS[id]||{msgs:[],turns:[]};CH.msgs=c.msgs;CH.turns=c.turns;
    CURP=id;rememberProj();lastThumb='';lastThumbAt=0;refilter();renderMsgs();closeModal();
    if(CAP.db){subscribeProject()}
    else{var j=null;try{j=localStorage.getItem('motion-draft:'+id)}catch(x){}if(j){P=normProject(JSON.parse(j));hist=[JSON.stringify(P)];hi=0;updUndo();selScene=0;selEl=null;t=0;afterProjectChange()}firstLoad=false;setSave('Rascunho local')}
    roomPresence();
  });
}
function createProject(proj,open){
  var id=nid('p');proj=normProject(proj);var json=packProject(proj);
  var keepP=P;P=proj;applySize();var meta=projMeta(true);meta.at=Date.now();P=keepP;applySize();draw();
  if(!CAP.db){try{localStorage.setItem('motion-draft:'+id,json)}catch(x){}localIndexPut(id,meta);return open===false?Promise.resolve(id):saveNow().then(function(){return switchProject(id)}).then(function(){return id})}
  return Promise.all([CAP.db.doc('project/'+id).set({json:json,by:ME.id||'',at:Date.now()}),CAP.db.doc('projlist/'+id).set(meta)])
    .then(function(){return open===false?id:switchProject(id).then(function(){return id})})
    .catch(function(e){toast(e&&e.code==='quota_exceeded'?'O armazenamento do artefato está cheio.':'Não foi possível criar o projeto.');throw e});
}
function blankProject(){return {name:'Novo projeto',type:P.type,w:PW,h:PH,theme:clone(P.theme),themeName:P.themeName,fonts:clone(P.fonts),brand:clone(P.brand),scenes:[{name:'Cena 1',dur:5,els:[]}]}}
function deleteProject(id){
  if(id===CURP){toast('Abra outro projeto antes de excluir este.');return}
  PROJS=PROJS.filter(function(p){return p.id!==id});
  if(CAP.db){CAP.db.doc('project/'+id).delete().catch(function(){});CAP.db.doc('projlist/'+id).delete().catch(function(){})}
  else{try{localStorage.removeItem('motion-draft:'+id)}catch(x){}var L=localIndex().filter(function(p){return p.id!==id});try{localStorage.setItem('motion-projs',JSON.stringify(L))}catch(x){}}
  renderProjects();toast('Projeto excluído.');
}
function ago(ms){var s=Math.max(0,(Date.now()-ms)/1000);if(s<60)return 'agora';if(s<3600)return 'há '+Math.round(s/60)+' min';if(s<86400)return 'há '+Math.round(s/3600)+' h';return new Date(ms).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}
var projConfirm=null,projNewOpen=false;
function renderProjects(){
  var d=$('#dlg');if(!d||$('#modal').hidden||!d.querySelector('.projs'))return;d.querySelector('.projs').innerHTML=projGrid();d.querySelector('.pnew').hidden=!projNewOpen;
}
function projGrid(){
  var list=PROJS.slice();if(!list.some(function(p){return p.id===CURP}))list.unshift(Object.assign({id:CURP},projMeta(false)));
  list.sort(function(a,b){return (b.id===CURP)-(a.id===CURP)||(b.at||0)-(a.at||0)});
  return list.map(function(p){var cur=p.id===CURP,mm=Math.floor((p.dur||0)/60),ss=Math.round((p.dur||0)%60);
    return '<div class="pcard'+(cur?' cur':'')+'" data-pid="'+esc(p.id)+'"><button class="pthumb" data-pact="open" data-pid="'+esc(p.id)+'" aria-label="Abrir '+esc(p.name||'projeto')+'">'+(p.thumb?'<img src="'+esc(p.thumb)+'" alt="">':'<span>'+IC.play+'</span>')+(cur?'<i class="badge">Aberto</i>':'')+'</button>'+
      '<div class="pinfo"><b title="'+esc(p.name||'')+'">'+esc(p.name||'Sem título')+'</b><span>'+(p.scenes||0)+' cena'+(p.scenes===1?'':'s')+' · '+mm+':'+String(ss).padStart(2,'0')+' · '+esc(p.fmt||'')+' · '+ago(p.at||Date.now())+'</span></div>'+
      '<div class="pacts"><button class="ghost" data-pact="dup" data-pid="'+esc(p.id)+'" title="Duplicar" aria-label="Duplicar">'+IC.copy+'</button>'+(cur?'':'<button class="ghost'+(projConfirm===p.id?' danger':'')+'" data-pact="del" data-pid="'+esc(p.id)+'" title="Excluir" aria-label="Excluir">'+(projConfirm===p.id?'Confirmar?':IC.trash)+'</button>')+'</div></div>'}).join('');
}
function openProjects(){
  closePops();projConfirm=null;projNewOpen=false;
  var tpls=Object.keys(TEMPLATES).map(function(k){return '<button class="mi" data-pact="tpl" data-k="'+k+'">'+IC.template+esc(TEMPLATES[k].name)+'</button>'}).join('');
  modal('<div class="dh"><h3 id="mTitle">Projetos</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>'+
    '<div class="pbar"><button class="btn accent" data-pact="new">'+IC.plus+'Novo projeto</button><span class="info">'+(CAP.db?'Cada projeto é salvo sozinho no artefato. Abra quantos quiser, um de cada vez nesta aba, ou vários em abas diferentes.':'Sem armazenamento no artefato: os projetos ficam só neste navegador.')+'</span></div>'+
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
      if(!CAP.db){var j=null;try{j=localStorage.getItem('motion-draft:'+id)}catch(x){}if(j){var o=JSON.parse(j);o.name=(o.name||'Projeto')+' (cópia)';createProject(o,false).then(function(){renderProjects()})}return}
      CAP.db.doc('project/'+id).get().then(function(s){if(!s.exists)return;var o=JSON.parse(s.data().json);o.name=(o.name||'Projeto')+' (cópia)';return createProject(o,false)}).then(function(){renderProjects();toast('Cópia criada.')}).catch(function(){});return}
    if(a==='del'){if(projConfirm===id){projConfirm=null;deleteProject(id)}else{projConfirm=id;renderProjects();setTimeout(function(){if(projConfirm===id){projConfirm=null;renderProjects()}},4000)}return}
  };
}
