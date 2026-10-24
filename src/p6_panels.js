/* =========================================================
   Aba Marca e modelos
   ========================================================= */
function fontSelect(id,cur){
  var groups={};FONTS.forEach(function(f){(groups[f.c]=groups[f.c]||[]).push(f.f)});
  var custom=Object.keys(P.fonts.custom||{});
  var known=FONTS.some(function(f){return f.f===cur})||custom.indexOf(cur)>=0;
  return '<select id="'+id+'" data-font="'+id+'">'+(custom.length?'<optgroup label="Enviadas">'+custom.map(function(f){return '<option'+(f===cur?' selected':'')+'>'+esc(f)+'</option>'}).join('')+'</optgroup>':'')+
    Object.keys(groups).map(function(g){return '<optgroup label="'+g+'">'+groups[g].map(function(f){return '<option'+(f===cur?' selected':'')+'>'+esc(f)+'</option>'}).join('')+'</optgroup>'}).join('')+
    (!known?'<option selected>'+esc(cur)+'</option>':'')+'<option value="__other">Outra do Google Fonts…</option></select>';
}
function panelBrand(pane,prefix){
  var B=P.brand,h=prefix||'';
  h+='<div class="sh"><span>Fontes</span></div>';
  h+='<label class="f"><span>Títulos</span>'+fontSelect('fontDisplay',P.fonts.display)+'</label>';
  h+='<label class="f"><span>Texto</span>'+fontSelect('fontUi',P.fonts.ui)+'</label>';
  h+='<div class="btnrow"><button class="btn sm" data-act="fontup">Enviar fonte (.woff2, .ttf, .otf)</button></div>';
  h+='<div class="sh"><span>Cores</span></div>';
  h+='<div class="two">'+[['bg','Fundo'],['ink','Texto'],['accent','Destaque'],['on','Sobre destaque']].map(function(x){return '<label class="f"><span>'+x[1]+'</span><input type="color" data-o="proj" data-p="theme.'+x[0]+'" value="'+toHex(P.theme[x[0]])+'" style="height:32px;width:100%;border:1px solid var(--line);border-radius:8px;padding:2px;background:transparent"></label>'}).join('')+'</div>';
  h+='<div class="sh"><span>Logo</span></div>';
  if(B.logo){var u=srcURL(B.logo);h+='<div style="display:flex;gap:10px;align-items:center;margin-bottom:10px"><img src="'+esc(u)+'" alt="Logo" style="max-width:120px;max-height:56px;border:1px solid var(--line);border-radius:8px;padding:4px;background:var(--panel2)"><button class="btn sm" data-act="logoup">Trocar</button><button class="btn sm icon" data-act="logodel" aria-label="Remover logo">'+IC.trash+'</button></div>'}
  else h+='<div class="btnrow"><button class="btn sm" data-act="logoup">'+IC.image+'Enviar logo</button></div>';
  h+=fld({p:'brand.logoOn',l:'Mostrar o logo em todas as cenas',t:'check'},'proj');
  h+='<div class="two">'+fld({p:'brand.logoPos',l:'Posição',t:'sel',o:[['br','Inferior direito'],['bl','Inferior esquerdo'],['tr','Superior direito'],['tl','Superior esquerdo']]},'proj')+fld({p:'brand.logoSize',l:'Altura (px)',t:'num'},'proj')+'</div>';
  h+='<div class="sh"><span>Kit de marca</span></div>';
  h+='<p class="info">'+(BRANDKIT?'Kit salvo: <b>'+esc(BRANDKIT.name||'Marca')+'</b>. Aplicar troca fontes, cores e logo deste projeto.':'Salve fontes, cores e logo para aplicar em qualquer animação deste artefato.')+'</p>';
  h+='<div class="btnrow"><button class="btn sm" data-act="kitsave">Salvar kit de marca</button>'+(BRANDKIT?'<button class="btn sm accent" data-act="kitapply">Aplicar kit</button>':'')+'</div>';
  h+='<div class="sh"><span>Modelos</span></div>';
  h+='<div class="btnrow"><button class="btn sm" data-act="tplsave">'+IC.plus+'Salvar este projeto como modelo</button></div>';
  h+='<div style="display:flex;flex-direction:column;gap:6px">';
  TEMPLATES_SAVED.forEach(function(tp){h+='<div class="item" style="margin:0;display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b style="font-size:13px">'+esc(tp.name)+'</b><div class="info" style="margin:0">Modelo salvo</div></div><button class="btn sm" data-act="tpluse" data-id="'+esc(tp.id)+'">Usar</button><button class="btn sm icon" data-act="tpldel" data-id="'+esc(tp.id)+'" aria-label="Excluir modelo">'+IC.trash+'</button></div>'});
  Object.keys(TEMPLATES).forEach(function(k){h+='<div class="item" style="margin:0;display:flex;align-items:center;gap:8px"><div style="flex:1;min-width:0"><b style="font-size:13px">'+esc(TEMPLATES[k].name)+'</b><div class="info" style="margin:0">Modelo pronto</div></div><button class="btn sm" data-act="tplbuilt" data-k="'+k+'">Usar</button></div>'});
  h+='</div><p class="info" style="margin-top:8px">Usar um modelo substitui o projeto atual. Dá para desfazer.</p>';
  pane.innerHTML=h;
}
handlers.fontup=function(){$('#fontFile').value='';$('#fontFile').click()};
handlers.logoup=function(){$('#logoFile').value='';$('#logoFile').click()};
handlers.logodel=function(){P.brand.logo='';P.brand.logoOn=false;commit();renderPanel();draw()};
handlers.kitsave=function(){
  var kit={name:P.name,theme:clone(P.theme),fonts:clone(P.fonts),brand:clone(P.brand)};BRANDKIT=kit;
  if(CAP.db){CAP.db.doc('brand/kit').set({json:JSON.stringify(kit),by:ME.id||'',at:Date.now()}).then(function(){toast('Kit de marca salvo.')}).catch(function(){toast('Não foi possível salvar o kit agora.')})}else toast('Kit salvo nesta sessão.');
  renderPanel();
};
handlers.kitapply=function(){if(!BRANDKIT)return;P.theme=clone(BRANDKIT.theme);P.themeName='custom';P.fonts=Object.assign({custom:{}},clone(BRANDKIT.fonts));P.brand=Object.assign({},P.brand,clone(BRANDKIT.brand));commit();afterProjectChange();toast('Kit de marca aplicado.')};
handlers.tplsave=function(){
  var name=P.name+' (modelo)';var data={name:name,json:packProject(P),by:ME.id||'',at:Date.now()};
  if(CAP.db){CAP.db.collection('templates').add(data).then(function(){toast('Modelo salvo.')}).catch(function(){toast('Não foi possível salvar o modelo.')})}else{TEMPLATES_SAVED.unshift({id:nid('t'),name:name,json:data.json});renderPanel();toast('Modelo salvo nesta sessão.')}
};
handlers.tpluse=function(b){var tp=TEMPLATES_SAVED.filter(function(x){return x.id===b.dataset.id})[0];if(!tp)return;try{P=normProject(JSON.parse(tp.json));P.name=P.name.replace(/ \(modelo\)$/,'');selScene=0;selEl=null;t=0;commit();afterProjectChange();toast('Modelo aplicado.')}catch(x){toast('Este modelo está corrompido.')}};
handlers.tpldel=function(b){var id=b.dataset.id;if(CAP.db)CAP.db.doc('templates/'+id).delete().catch(function(){});TEMPLATES_SAVED=TEMPLATES_SAVED.filter(function(x){return x.id!==id});renderPanel()};
handlers.tplbuilt=function(b){useTemplate(b.dataset.k)};
function useTemplate(k){var keepMedia=P?P.media:[];P=TEMPLATES[k].make();P.media=keepMedia;selScene=0;selEl=null;selKf=null;selTrack=null;t=0;commit();afterProjectChange()}
pane.addEventListener('change',function(ev){
  var x=ev.target;if(!x.dataset||!x.dataset.font)return;
  var key=x.dataset.font==='fontDisplay'?'display':'ui';var v=x.value;
  if(v==='__other'){x.value=P.fonts[key];openFontDialog(key);return}
  P.fonts[key]=v;ensureFonts();commit();draw();
});
function openFontDialog(key){
  modal('<h3 id="mTitle">Outra fonte do Google Fonts</h3><p class="info">Digite o nome exato da família, como aparece em fonts.google.com (por exemplo: Rubik, Syne, Libre Baskerville).</p><input class="inp" id="fontName" placeholder="Nome da família"><div class="end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="fontOk">Usar fonte</button></div>');
  $('#fontName').focus();
  $('#fontOk').onclick=function(){var v=$('#fontName').value.trim();if(!v)return;P.fonts[key]=v;ensureFonts();commit();closeModal();renderPanel();draw();toast('Carregando '+v+'. Se o nome não existir no Google Fonts, o texto usa a fonte padrão.')};
}

/* =========================================================
   Aba Dados e lote
   ========================================================= */
var BATCH={rows:[],cols:[],sel:-1};
function panelData(pane){
  var keys=Object.keys(P.vars||{}),used=usedVars(),h='';
  h+='<div class="sh"><span>Variáveis</span></div><p class="info">Escreva <b>{{chave}}</b> em textos, rótulos ou números. Um valor alimenta todos os lugares onde aparece.</p>';
  h+='<table class="vtable"><tbody>'+keys.map(function(k){return '<tr><td style="width:42%;padding-right:6px"><input value="'+esc(k)+'" data-vk="'+esc(k)+'" aria-label="Chave"></td><td><input value="'+esc(P.vars[k])+'" data-vv="'+esc(k)+'" aria-label="Valor de '+esc(k)+'"></td><td><button data-act="vdel" data-k="'+esc(k)+'" aria-label="Remover">'+IC.x+'</button></td></tr>'}).join('')+'</tbody></table>';
  var missing=used.filter(function(k){return keys.indexOf(k)<0});
  h+='<div class="btnrow"><button class="mini" data-act="vadd">+ Variável</button>'+missing.map(function(k){return '<button class="mini" data-act="vaddk" data-k="'+esc(k)+'">+ '+esc(k)+'</button>'}).join('')+'</div>';
  if(used.length)h+='<p class="info">Em uso: '+used.map(function(k){return '<code>{{'+esc(k)+'}}</code>'}).join(' ')+'</p>';
  h+='<div class="sh"><span>Importar dados</span></div>';
  h+='<div class="btnrow"><button class="btn sm" data-act="pastevars">Colar tabela</button><button class="btn sm" data-act="csv">Abrir CSV</button></div>';
  h+='<p class="info">Uma tabela com cabeçalho vira linhas de dados: a primeira linha preenche as variáveis e todas viram o lote abaixo. Com um gráfico selecionado, use “Colar da planilha” nas propriedades dele.</p>';
  h+='<div class="sh"><span>Vídeos em lote</span><span class="nm">'+BATCH.rows.length+' linha(s)</span></div>';
  if(BATCH.rows.length){
    h+='<div class="tablewrap"><table><thead><tr><th>#</th>'+BATCH.cols.map(function(c){return '<th>'+esc(c)+'</th>'}).join('')+'</tr></thead><tbody>'+BATCH.rows.map(function(r,i){return '<tr data-row="'+i+'" class="'+(i===BATCH.sel?'on':'')+'"><td>'+(i+1)+'</td>'+BATCH.cols.map(function(c){return '<td>'+esc(r[c])+'</td>'}).join('')+'</tr>'}).join('')+'</tbody></table></div>';
    h+='<p class="info">Clique numa linha para ver a prévia com aqueles valores.</p>';
    h+='<div class="btnrow"><button class="btn sm accent" data-act="batch">'+IC.dl+'Exportar '+BATCH.rows.length+' vídeos (.zip)</button><button class="btn sm" data-act="batchclear">Limpar</button></div>';
    h+='<p class="info">A gravação é em tempo real: cerca de '+fmtS(BATCH.rows.length*total())+' no total. Mantenha a aba visível.</p>';
  }else h+='<p class="info">Cole uma tabela em que cada linha é uma versão do vídeo, por exemplo uma coluna <b>nome</b> para personalizar o onboarding de cada cliente.</p>';
  pane.innerHTML=h;
}
function usedVars(){var s={},re=/\{\{\s*([\w.\-]+)\s*\}\}/g;var j=JSON.stringify(P.scenes);var m;while((m=re.exec(j)))s[m[1]]=1;return Object.keys(s)}
pane.addEventListener('input',function(ev){
  var x=ev.target;
  if(x.dataset.vv!=null){P.vars[x.dataset.vv]=x.value;touch()}
});
pane.addEventListener('change',function(ev){
  var x=ev.target;
  if(x.dataset.vv!=null){commit()}
  if(x.dataset.vk!=null){var ok=x.dataset.vk,nk=x.value.trim().replace(/[^\w.\-]/g,'_');if(!nk||nk===ok){x.value=ok;return}var nv={};Object.keys(P.vars).forEach(function(k){nv[k===ok?nk:k]=P.vars[k]});P.vars=nv;commit();renderPanel();touch()}
});
pane.addEventListener('click',function(ev){var tr=ev.target.closest('tr[data-row]');if(!tr)return;var i=+tr.dataset.row;BATCH.sel=i;Object.assign(P.vars,BATCH.rows[i]);commit();renderPanel();touch()});
handlers.vadd=function(){var k='var'+(Object.keys(P.vars).length+1);P.vars[k]='';commit();renderPanel()};
handlers.vaddk=function(b){P.vars[b.dataset.k]='';commit();renderPanel()};
handlers.vdel=function(b){delete P.vars[b.dataset.k];commit();renderPanel();touch()};
handlers.pastevars=function(){openPasteDialog('vars')};
handlers.csv=function(){$('#csvFile').value='';$('#csvFile').click()};
handlers.batchclear=function(){BATCH={rows:[],cols:[],sel:-1};renderPanel()};
handlers.batch=function(){exportBatch()};
function parseTable(txt){
  txt=String(txt||'').replace(/\r/g,'').trim();if(!txt)return {cols:[],rows:[]};
  var lines=txt.split('\n').filter(function(l){return l.trim()}),sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].split(';').length>lines[0].split(',').length?';':',');
  function split(l){if(sep==='\t')return l.split('\t');var out=[],cur='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(ch==='"'){if(q&&l[i+1]==='"'){cur+='"';i++}else q=!q}else if(ch===sep&&!q){out.push(cur);cur=''}else cur+=ch}out.push(cur);return out}
  var cols=split(lines[0]).map(function(c,i){return c.trim().replace(/[^\w.\-À-ÿ]/g,'_')||('col'+(i+1))});
  var rows=lines.slice(1).map(function(l){var v=split(l),r={};cols.forEach(function(c,i){r[c]=(v[i]||'').trim()});return r});
  return {cols:cols,rows:rows};
}
function applyTable(kind,txt){
  var T=parseTable(txt);if(!T.rows.length&&kind!=='chart'){toast('Não encontrei linhas de dados. A primeira linha precisa ser o cabeçalho.');return}
  if(kind==='chart'){
    var e=findEl(selEl);if(!e||e.kind!=='chart')return;
    var lines=String(txt).replace(/\r/g,'').trim().split('\n').filter(Boolean),sep=lines[0].indexOf('\t')>=0?'\t':(lines[0].indexOf(';')>=0?';':',');
    var data=lines.map(function(l){var p=l.split(sep);return {label:(p[0]||'').trim(),value:num((p[1]||'').trim())}}).filter(function(d){return d.label});
    if(data.length&&!isFinite(parseFloat(String(lines[0].split(sep)[1]||'').replace(',','.'))))data.shift();
    if(!data.length){toast('Cole duas colunas: nome e valor.');return}
    e.data=data.slice(0,24);showEl(e);commit();renderPanel();touch();toast(e.data.length+' linhas importadas no gráfico.');return;
  }
  BATCH={rows:T.rows.slice(0,200),cols:T.cols,sel:0};Object.assign(P.vars,T.rows[0]);commit();renderPanel();touch();
  toast(T.rows.length+' linha(s) importada(s). A primeira preencheu as variáveis.');
}
function openPasteDialog(kind){
  modal('<h3 id="mTitle">'+(kind==='chart'?'Colar dados do gráfico':'Colar tabela')+'</h3><p class="info">'+(kind==='chart'?'Copie duas colunas (nome e valor) do Excel, Google Sheets ou de um CSV e cole aqui.':'Copie uma tabela com cabeçalho do Excel, Google Sheets ou de um CSV. Os nomes das colunas viram as variáveis.')+'</p><textarea class="inp" id="pasteTxt" rows="8" style="font-family:var(--font-mono);font-size:12px" placeholder="'+(kind==='chart'?'Assinaturas\t2,4\nServiços\t1,1':'nome\tcidade\nAna\tRecife\nBruno\tCuritiba')+'"></textarea><div class="end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="pasteOk">Importar</button></div>');
  $('#pasteTxt').focus();$('#pasteOk').onclick=function(){var v=$('#pasteTxt').value;closeModal();applyTable(kind,v)};
}
$('#csvFile').addEventListener('change',function(){var f=this.files&&this.files[0];if(!f)return;f.text().then(function(txt){applyTable('vars',txt)})});

/* =========================================================
   Aba Revisão: checagem automática + revisão do Claude
   ========================================================= */
var lastIssues=null,claudeReview='';
function runChecks(){
  var out=[],mw=Math.min(PW,PH);
  P.scenes.forEach(function(sc,si){
    var bgc=solid(sc.bg)||P.theme.bg,words=0,firstText=null;
    sc.els.forEach(function(e,ei){
      var b=bbox(e),nm=elName(e);
      if(e.kind==='text'||e.kind==='counter'||e.kind==='chart'){
        var under=bgc;for(var k=ei-1;k>=0;k--){var s2=sc.els[k];if(s2.kind==='shape'&&s2.fill){var b2=bbox(s2);if(b.x+b.w/2>=b2.x&&b.x+b.w/2<=b2.x+b2.w&&b.y+b.h/2>=b2.y&&b.y+b.h/2<=b2.y+b2.h){under=solid(s2.fill,bgc);break}}}
        var fc=solid(e.kind==='chart'?e.textColor:e.color,under);
        if(fc){var cr=Math.floor(contrast(fc,under)*10)/10,sz=(+e.size||30)*720/mw,big=sz>=36||(sz>=24&&(+e.weight||500)>=700)||e.kind==='counter',need=big?3:4.5;
          if(cr<need)out.push({sev:cr<2.2?'erro':'aviso',si:si,id:e.id,msg:'Contraste baixo em «'+nm+'»',det:'Razão '+cr.toFixed(1)+':1, o mínimo recomendado é '+need+':1.',fix:'contrast'})}
      }
      if(e.kind==='text'){var L=tlayout(e);words+=sub(e.text).split(/\s+/).filter(Boolean).length;if(firstText==null||e.start<firstText)firstText=+e.start||0;
        if(L.over)out.push({sev:'aviso',si:si,id:e.id,msg:'Palavra maior que a caixa em «'+nm+'»',det:'Aumente a largura ou diminua o tamanho.',fix:'widen'});
        if((+e.size||0)*720/mw<20)out.push({sev:'aviso',si:si,id:e.id,msg:'Texto pequeno em «'+nm+'»',det:'Em celular fica difícil de ler. Use pelo menos '+Math.round(20*mw/720)+' px.',fix:'bigger'})}
      var lt=sc.dur-.05,ev=evalEl(e,lt),bb=bbox(ev),pad=2;
      if(e.kind!=='shape'||(bb.w<PW*.95&&bb.h<PH*.95)){if(bb.x<-pad||bb.y<-pad||bb.x+bb.w>PW+pad||bb.y+bb.h>PH+pad){if(!(e.kind==='shape'&&(bb.w>=PW||bb.h>=PH)))out.push({sev:'aviso',si:si,id:e.id,msg:'«'+nm+'» sai do quadro',det:'Parte do elemento fica fora da tela no fim da cena.',fix:'inside'})}}
      if((e.kind==='image'||e.kind==='video')&&!e.src)out.push({sev:'erro',si:si,id:e.id,msg:KNAME[e.kind]+' sem arquivo',det:'Envie ou escolha uma mídia para este elemento.'});
    });
    if(words){var avail=Math.max(.5,sc.dur-(firstText||0)-.4),wps=words/avail;if(wps>3.1)out.push({sev:wps>4.2?'erro':'aviso',si:si,msg:'Pouco tempo para ler a cena '+(si+1),det:words+' palavras em '+fmtS(avail)+' ('+wps.toFixed(1)+' palavras/s). O ideal é até 3.',fix:'longer'})}
  });
  var lastS=P.scenes[P.scenes.length-1],lastIn=Math.max.apply(null,lastS.els.map(function(e){return (+e.start||0)+((e.anim&&+e.anim.t)||.6)}).concat([0]));
  if(lastS.dur-lastIn<1.2)out.push({sev:'aviso',si:P.scenes.length-1,msg:'O final some rápido demais',det:'A última cena fica completa por só '+fmtS(Math.max(0,lastS.dur-lastIn))+'. Deixe pelo menos 1,5 s.',fix:'hold'});
  if(total()>90)out.push({sev:'aviso',si:0,msg:'Vídeo longo para redes sociais',det:'Com '+fmtS(total())+', considere uma versão de até 60 s.'});
  return out;
}
function fixIssue(x){
  var sc=P.scenes[x.si],e=x.id?findEl(x.id,sc):null;
  if(x.fix==='contrast'&&e){var bgc=solid(sc.bg)||P.theme.bg;var opts=['@ink','@on','@bg','@accent'];var key=e.kind==='chart'?'textColor':'color';var best=opts.reduce(function(b,o){return contrast(solid(o),bgc)>contrast(solid(b),bgc)?o:b},opts[0]);
    var ei=sc.els.indexOf(e);for(var k=ei-1;k>=0;k--){var s2=sc.els[k];if(s2.kind==='shape'&&s2.fill){var b=bbox(e),b2=bbox(s2);if(b.x+b.w/2>=b2.x&&b.x+b.w/2<=b2.x+b2.w&&b.y+b.h/2>=b2.y&&b.y+b.h/2<=b2.y+b2.h){var u=solid(s2.fill,bgc);best=opts.reduce(function(bb,o){return contrast(solid(o),u)>contrast(solid(bb),u)?o:bb},opts[0]);break}}}
    e[key]=best}
  if(x.fix==='widen'&&e){e.w=Math.min(PW-e.x-20,Math.round(e.w*1.3));if(tlayout(e).over)e.size=Math.round(e.size*.85)}
  if(x.fix==='bigger'&&e)e.size=Math.round(22*Math.min(PW,PH)/720);
  if(x.fix==='inside'&&e){var bb=bbox(e);e.x=clamp(e.x,0,Math.max(0,PW-bb.w));e.y=clamp(e.y,0,Math.max(0,PH-bb.h));if(e.kf){(e.kf.x||[]).forEach(function(k){k.v=clamp(k.v,0,Math.max(0,PW-bb.w))});(e.kf.y||[]).forEach(function(k){k.v=clamp(k.v,0,Math.max(0,PH-bb.h))})}}
  if(x.fix==='longer'){var words=0,ft=99;sc.els.forEach(function(q){if(q.kind==='text'){words+=sub(q.text).split(/\s+/).filter(Boolean).length;ft=Math.min(ft,+q.start||0)}});sc.dur=Math.round((Math.min(ft,sc.dur)+.6+words/2.8)*10)/10}
  if(x.fix==='hold'){var ls=P.scenes[P.scenes.length-1],li=Math.max.apply(null,ls.els.map(function(q){return (+q.start||0)+((q.anim&&+q.anim.t)||.6)}).concat([0]));ls.dur=Math.round((li+1.8)*10)/10}
}
function panelReview(pane){
  lastIssues=runChecks();var n=lastIssues.length,er=lastIssues.filter(function(x){return x.sev==='erro'}).length,score=Math.max(0,100-er*12-(n-er)*4),h='';
  h+='<div class="score"><b>'+score+'</b><div><div style="font-weight:600">'+(n?(er?er+' problema(s) e ':'')+(n-er)+' aviso(s)':'Tudo certo')+'</div><div class="info" style="margin:0">Contraste, tempo de leitura, enquadramento, tamanho do texto e final.</div></div></div>';
  if(lastIssues.some(function(x){return x.fix}))h+='<div class="btnrow"><button class="btn sm accent" data-act="fixall">'+IC.wand+'Corrigir tudo o que der</button><button class="btn sm" data-act="recheck">Checar de novo</button></div>';
  lastIssues.forEach(function(x,i){h+='<div class="iss"><span class="sev '+x.sev+'"></span><div class="tx">'+esc(x.msg)+'<small>Cena '+(x.si+1)+' · '+esc(x.det||'')+'</small></div><div class="act"><button class="btn sm" data-act="isgo" data-i="'+i+'">Ver</button>'+(x.fix?'<button class="btn sm" data-act="isfix" data-i="'+i+'">Corrigir</button>':'')+'</div></div>'});
  if(!n)h+='<div class="iss"><span class="sev ok"></span><div class="tx">Nenhum problema encontrado<small>Rode de novo depois de mudar o projeto.</small></div></div>';
  h+='<div class="sh"><span>Revisão do Claude</span></div>';
  if(CAP.sample){
    h+='<p class="info">Claude olha um quadro de cada cena e comenta hierarquia, ritmo, legibilidade e consistência.</p>';
    h+='<div class="btnrow"><button class="btn sm" data-act="aireview" id="aiRevBtn">'+IC.eye+'Pedir revisão ao Claude</button></div>';
    if(claudeReview)h+='<div class="review" id="aiRev">'+esc(claudeReview)+'</div><div class="btnrow"><button class="btn sm accent" data-act="aiapply">Aplicar sugestões pelo chat</button></div>';
    else h+='<div class="review" id="aiRev" hidden></div>';
  }else h+='<p class="info">Disponível quando o Claude estiver ativo nesta página.</p>';
  pane.innerHTML=h;renderTabs();
}
handlers.recheck=function(){renderPanel()};
handlers.isgo=function(b){var x=lastIssues[+b.dataset.i];if(!x)return;selScene=x.si;selEl=x.id||null;selKf=null;var sc=P.scenes[x.si];seek(sceneStart(x.si)+Math.max(.1,sc.dur-.3));setTab('tweaks');renderLayers()};
handlers.isfix=function(b){var x=lastIssues[+b.dataset.i];if(!x)return;fixIssue(x);commit();fullRender()};
handlers.fixall=function(){var n=0;lastIssues.forEach(function(x){if(x.fix){fixIssue(x);n++}});commit();fullRender();toast(n+' correção(ões) aplicada(s).')};
handlers.aireview=function(){aiReview()};
handlers.aiapply=function(){if(!claudeReview)return;setTab('tweaks');sendText('Aplique estas melhorias de design ao projeto:\n'+claudeReview.slice(0,3000))};

/* =========================================================
   Comentários (compartilhados quando o banco está disponível)
   ========================================================= */
var pendingC=null,PROFILES={},PROF_ASKED={};
function openComposer(hit){
  var cp=$('#cpop');cp.hidden=false;
  $('#cctx').textContent=fmtT(pendingC.t)+(hit?' · '+elName(hit):' · cena '+(selScene+1));
  cp.style.left=clamp(pendingC.x*100,2,58)+'%';cp.style.top=clamp(pendingC.y*100+3,2,52)+'%';
  $('#ctext').value='';setTimeout(function(){$('#ctext').focus()},0);
}
function closeComposer(){pendingC=null;$('#cpop').hidden=true;updateOverlay()}
function saveComment(send){
  var txt=$('#ctext').value.trim();if(!txt||!pendingC)return;
  var c={t:+pendingC.t.toFixed(2),x:+pendingC.x.toFixed(3),y:+pendingC.y.toFixed(3),el:pendingC.el||'',scene:pendingC.scene||'',text:txt,done:false,by:ME.id||'',at:Date.now(),sent:!!send,proj:CURP};
  closeComposer();
  if(CAP.db){var ref=CAP.db.collection('comments').doc();c.id=ref.id;COMMENTS.push(c);ref.set(c).catch(function(){toast('Não foi possível salvar o comentário.')})}
  else{c.id=nid('c');COMMENTS.push(c)}
  afterComments();
  if(send)sendComment(c);
  else{var n=queuedComments().length;toast(n>1?'Comentário na lista. São '+n+' para enviar juntos: use “Enviar '+n+' comentários ao Claude” no palco ou na aba Comentários.':'Comentário na lista. Adicione outros e envie todos de uma vez.')}
}
$('#cCancel').addEventListener('click',closeComposer);
$('#cSave').addEventListener('click',function(){saveComment(false)});
$('#cSend').addEventListener('click',function(){saveComment(true)});
$('#ctext').addEventListener('keydown',function(e){if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();saveComment(true)}});
function afterComments(){COMMENTS.sort(function(a,b){return (a.at||0)-(b.at||0)});renderStrip();renderTabs();if(tab==='comments')renderPanel();updateOverlay();renderQueue()}
/* --- fila: comentários abertos que ainda não foram enviados --- */
var CSEL={};
function queuedComments(){return COMMENTS.filter(function(c){return !c.done&&!c.sent})}
function isSel(c){return c.id in CSEL?CSEL[c.id]:(!c.done&&!c.sent)}
function selectedComments(){return COMMENTS.filter(isSel)}
function renderQueue(){var b=$('#cQueue');if(!b)return;var n=queuedComments().length;b.hidden=!n;if(n)b.textContent=n>1?'Enviar '+n+' comentários ao Claude':'Enviar 1 comentário ao Claude'}
$('#cQueue').addEventListener('click',function(e){e.stopPropagation();sendComments(queuedComments())});
$('#cQueue').addEventListener('pointerdown',function(e){e.stopPropagation()});
function commentLine(c,i){var f=findAny(c.el),sc=sceneAt(c.t);return (i+1)+'. '+fmtT(c.t)+' · cena '+(sc.i+1)+(f&&f.el?' · «'+elName(f.el)+'»':'')+': '+c.text}
function sendComments(list){
  list=list.filter(Boolean);if(!list.length){toast('Nenhum comentário selecionado.');return}
  if(list.length===1){sendComment(list[0]);return}
  if(CH.busy){toast('Aguarde a resposta anterior.');return}
  list=list.slice().sort(function(a,b){return a.t-b.t});
  var first=list[0],f=findAny(first.el);if(f&&f.el){selScene=f.si;selEl=first.el}else{selScene=sceneAt(first.t).i;selEl=null}
  seek(first.t);renderLayers();
  list.forEach(function(c){if(CAP.db&&c.id&&!c.sent)CAP.db.doc('comments/'+c.id).update({sent:true}).catch(function(){});c.sent=true;delete CSEL[c.id]});
  $('#app').dataset.tab='chat';syncMobTabs();afterComments();
  var lines=list.map(commentLine).join('\n');
  sendText(list.length+' comentários:\n'+lines,'Atenda todos estes comentários de uma vez:\n'+lines,{comments:list});
}
function sendComment(c){
  var f=findAny(c.el);if(f&&f.el){selScene=f.si;selEl=c.el}else{var a=sceneAt(c.t);selScene=a.i;selEl=null}
  seek(c.t);renderLayers();renderPanel();
  if(CAP.db&&c.id&&!c.sent)CAP.db.doc('comments/'+c.id).update({sent:true}).catch(function(){});c.sent=true;
  $('#app').dataset.tab='chat';syncMobTabs();
  var tg=f&&f.el?f.el:null;
  sendText('Comentário em '+fmtT(c.t)+(tg?' sobre «'+elName(tg)+'»':'')+': '+c.text,c.text,{comment:c});
}
function profName(id){if(!id)return 'Alguém';if(id===ME.id)return 'Você';var p=PROFILES[id];return (p&&p.name)||'Alguém'}
function resolveProfiles(ids){
  if(!CAP.user||!CAP.user.profiles)return;ids=ids.filter(function(x,i,a){return x&&!PROFILES[x]&&!PROF_ASKED[x]&&a.indexOf(x)===i});if(!ids.length)return;ids.forEach(function(x){PROF_ASKED[x]=1});
  CAP.user.profiles(ids).then(function(ps){Object.keys(ps||{}).forEach(function(k){PROFILES[k]=ps[k]});if(tab==='comments'||tab==='versions')renderPanel();renderPeers()}).catch(function(){});
}
function panelComments(pane){
  var h='';resolveProfiles(COMMENTS.map(function(c){return c.by}));
  var nsel=selectedComments().length,nopen=COMMENTS.filter(function(c){return !c.done}).length;
  if(COMMENTS.length)h+='<div class="cbatch"><span>'+(nsel?nsel+' selecionado(s) para enviar num único pedido':'Marque os comentários que quer enviar juntos')+'</span><button class="btn sm" data-act="cselall">'+(nsel&&nsel>=nopen?'Desmarcar todos':'Marcar abertos')+'</button><button class="btn sm accent" data-act="csendsel"'+(nsel?'':' disabled')+'>Enviar '+(nsel>1?nsel+' ':'')+'ao Claude</button></div>';
  if(!COMMENTS.length)h+='<p class="info">Escolha a ferramenta <b>Comentar</b>, clique no palco e escreva o que mudar. O comentário fica marcado no tempo e no lugar exatos'+(CAP.db?' e todas as pessoas com acesso veem.':'.')+'</p>';
  COMMENTS.forEach(function(c,i){
    var f=findAny(c.el),p=PROFILES[c.by];
    h+='<div class="item'+(c.done?' done':'')+'" id="cm-'+esc(c.id)+'"><div class="meta"><input type="checkbox" data-act="csel" data-id="'+esc(c.id)+'"'+(isSel(c)?' checked':'')+' aria-label="Incluir no envio em lote">'+(p&&p.avatarUrl?'<img src="'+esc(p.avatarUrl)+'" alt="">':'')+'<b>'+esc(profName(c.by))+'</b><span>· '+fmtT(c.t)+(f&&f.el?' · '+esc(elName(f.el)):'')+(c.sent?' · enviado ao Claude':'')+'</span></div><p>'+esc(c.text)+'</p><div class="btnrow"><button class="btn sm" data-act="csend" data-id="'+esc(c.id)+'">Enviar ao Claude</button><button class="btn sm" data-act="cgo" data-id="'+esc(c.id)+'">Ir</button><button class="btn sm" data-act="cdone" data-id="'+esc(c.id)+'">'+(c.done?'Reabrir':'Resolver')+'</button><button class="btn sm icon" data-act="cdel" data-id="'+esc(c.id)+'" aria-label="Excluir comentário">'+IC.trash+'</button></div></div>';
  });
  pane.innerHTML=h;
}
function cById(id){return COMMENTS.filter(function(c){return c.id===id})[0]}
handlers.csend=function(b){var c=cById(b.dataset.id);if(c)sendComment(c)};
handlers.csel=function(b){var c=cById(b.dataset.id);if(!c)return;CSEL[c.id]=!isSel(c);renderPanel()};
handlers.cselall=function(){var open=COMMENTS.filter(function(c){return !c.done}),all=open.length&&open.every(isSel);COMMENTS.forEach(function(c){CSEL[c.id]=all?false:!c.done});renderPanel()};
handlers.csendsel=function(){sendComments(selectedComments())};
handlers.cgo=function(b){var c=cById(b.dataset.id);if(!c)return;var f=findAny(c.el);if(f&&f.el){selScene=f.si;selEl=c.el}seek(c.t);renderLayers();renderPanel()};
handlers.cdone=function(b){var c=cById(b.dataset.id);if(!c)return;c.done=!c.done;if(CAP.db)CAP.db.doc('comments/'+c.id).update({done:c.done}).catch(function(){});afterComments()};
handlers.cdel=function(b){var id=b.dataset.id;COMMENTS=COMMENTS.filter(function(c){return c.id!==id});if(CAP.db)CAP.db.doc('comments/'+id).delete().catch(function(){});afterComments()};

/* =========================================================
   Versões e comparação lado a lado
   ========================================================= */
function panelVersions(pane){
  resolveProfiles(VERSIONS.map(function(v){return v.by}));
  var h='<div class="f"><span>Nome da versão</span><input class="inp" id="verName" placeholder="Ex.: Aprovada pelo marketing"></div><div class="btnrow"><button class="btn sm accent" data-act="versave">'+IC.plus+'Salvar versão</button></div>';
  if(!VERSIONS.length)h+='<p class="info">Salve versões nomeadas para voltar a elas ou comparar lado a lado com a atual.'+(CAP.db?' Elas ficam guardadas no artefato.':'')+'</p>';
  VERSIONS.forEach(function(v){
    var d=new Date(v.at||0);
    h+='<div class="item"><div class="meta"><b>'+esc(v.name)+'</b></div><div class="info" style="margin:0 0 8px">'+esc(profName(v.by))+' · '+d.toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})+'</div><div class="btnrow"><button class="btn sm" data-act="vercmp" data-id="'+esc(v.id)+'">Comparar</button><button class="btn sm" data-act="verrest" data-id="'+esc(v.id)+'">Restaurar</button><button class="btn sm icon" data-act="verdel" data-id="'+esc(v.id)+'" aria-label="Excluir versão">'+IC.trash+'</button></div></div>';
  });
  pane.innerHTML=h;
}
function vById(id){return VERSIONS.filter(function(v){return v.id===id})[0]}
handlers.versave=function(){
  var name=($('#verName').value||'').trim()||('Versão de '+new Date().toLocaleString('pt-BR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}));
  var v={name:name,json:packProject(P),by:ME.id||'',at:Date.now(),proj:CURP};
  if(v.json.length>240000){toast('O projeto está grande demais para virar versão.');return}
  if(CAP.db){var ref=CAP.db.collection('versions').doc();v.id=ref.id;VERSIONS.unshift(v);ref.set(v).then(function(){toast('Versão salva.')}).catch(function(e){toast(e&&e.code==='quota_exceeded'?'Limite de armazenamento atingido. Exclua versões antigas.':'Não foi possível salvar a versão.')})}
  else{v.id=nid('v');VERSIONS.unshift(v);toast('Versão salva nesta sessão.')}
  renderPanel();
};
handlers.verrest=function(b){var v=vById(b.dataset.id);if(!v)return;modal('<h3 id="mTitle">Restaurar “'+esc(v.name)+'”?</h3><p class="info">O projeto atual será substituído por esta versão. Você pode desfazer logo depois.</p><div class="end"><button class="btn" data-close>Cancelar</button><button class="btn primary" id="restOk">Restaurar</button></div>');
  $('#restOk').onclick=function(){try{P=normProject(JSON.parse(v.json));commit();afterProjectChange();closeModal();toast('Versão restaurada.')}catch(x){toast('Esta versão está corrompida.')}}};
handlers.verdel=function(b){var id=b.dataset.id;VERSIONS=VERSIONS.filter(function(v){return v.id!==id});if(CAP.db)CAP.db.doc('versions/'+id).delete().catch(function(){});renderPanel()};
handlers.vercmp=function(b){var v=vById(b.dataset.id);if(v)openCompare(v)};
function openCompare(v){
  var A;try{A=normProject(JSON.parse(v.json))}catch(x){toast('Esta versão está corrompida.');return}
  var B=P,tot=Math.max(total(),A.scenes.reduce(function(a,s){return a+s.dur},0));
  modal('<h3 id="mTitle">Comparar versões</h3><div class="cmp"><figure><figcaption>'+esc(v.name)+' · '+fmtS(A.scenes.reduce(function(a,s){return a+s.dur},0))+'</figcaption><canvas id="cmpA"></canvas></figure><figure><figcaption>Atual · '+fmtS(total())+'</figcaption><canvas id="cmpB"></canvas></figure></div><div class="cmpbar"><button class="btn icon" id="cmpPlay" aria-label="Reproduzir">'+IC.play+'</button><input type="range" id="cmpT" min="0" max="'+tot+'" step="0.01" value="0" aria-label="Tempo"><span class="time" id="cmpTime" style="font:500 12.5px var(--font-mono);color:var(--muted)">0:00.0</span></div><div class="end"><button class="btn" data-close>Fechar</button></div>',true);
  var ca=$('#cmpA'),cb=$('#cmpB'),sc=.6;ca.width=A.w*sc;ca.height=A.h*sc;cb.width=B.w*sc;cb.height=B.h*sc;
  var tt=0,pl=false,lastT=0;
  function totOf(p){return p.scenes.reduce(function(a,s){return a+s.dur},0)}
  function rnd(){if(!document.getElementById('cmpA'))return;renderWith(A,ca,Math.min(tt,totOf(A)-.001),sc);renderWith(B,cb,Math.min(tt,totOf(B)-.001),sc);$('#cmpTime').textContent=fmtT(tt);$('#cmpT').value=tt}
  function loopF(now){if(!pl||$('#modal').hidden)return;var d=(now-lastT)/1000;lastT=now;tt+=d;if(tt>=tot){tt=0}rnd();requestAnimationFrame(loopF)}
  $('#cmpT').oninput=function(){tt=+this.value;rnd()};
  $('#cmpPlay').onclick=function(){pl=!pl;this.innerHTML=pl?IC.pause:IC.play;if(pl){lastT=performance.now();requestAnimationFrame(loopF)}};
  rnd();setTimeout(rnd,300);
}

/* =========================================================
   Aba Código
   ========================================================= */
function panelCode(pane){
  pane.innerHTML='<div class="codewrap"><p class="info">A animação é código. Altere uma palavra, um número ou um tempo e o resto continua igual.</p><textarea id="code" spellcheck="false" aria-label="Código da animação"></textarea><div class="err" id="codeErr"></div></div>';
  renderCode(true);
}
function renderCode(force){var ta=$('#code');if(!ta)return;if(!force&&document.activeElement===ta)return;ta.value=JSON.stringify(P,null,2);var er=$('#codeErr');if(er)er.textContent=''}
var codeTimer=null;
pane.addEventListener('input',function(ev){
  if(ev.target.id!=='code')return;clearTimeout(codeTimer);var v=ev.target.value;
  codeTimer=setTimeout(function(){
    try{var o=JSON.parse(v);if(!o||!Array.isArray(o.scenes)||!o.scenes.length)throw new Error('O projeto precisa de uma lista "scenes" com pelo menos uma cena.');
      o.scenes.forEach(function(s,i){(s.els||[]).forEach(function(e,j){if(!KD[e.kind])throw new Error('Cena '+(i+1)+', camada '+(j+1)+': tipo "'+e.kind+'" desconhecido. Use: '+Object.keys(KD).join(', ')+'.')})});
      P=normProject(o);$('#codeErr').textContent='';applySize();ensureFonts();loadAllAudio();renderStrip();renderLayers();draw();commit();
    }catch(err){$('#codeErr').textContent=err.message}
  },400);
});
