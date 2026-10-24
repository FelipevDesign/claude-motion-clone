/* =========================================================
   Painel lateral: abas
   ========================================================= */
var tab='tweaks';
var TABS=[['tweaks','Tweaks'],['style','Style'],['assets','Assets IA'],['captions','Legendas'],['data','Dados e lote'],['review','Revisão'],['comments','Comentários'],['versions','Versões'],['code','Código']];
function renderTabs(){
  var open=COMMENTS.filter(function(c){return !c.done}).length,iss=lastIssues?lastIssues.filter(function(x){return x.sev==='erro'}).length:0;
  var main=['tweaks','style'];if(main.indexOf(tab)<0)main.push(tab);
  $('#itabs').innerHTML=main.map(function(k){var x=TABS.filter(function(q){return q[0]===k})[0];var n=k==='comments'?open:k==='review'?iss:0;return '<button class="t" role="tab" data-tab="'+k+'" aria-selected="'+(tab===k)+'">'+x[1]+(n?'<span class="n">'+n+'</span>':'')+'</button>'}).join('')+
    '<span class="sp"></span><button class="ghost" id="moreBtn" title="Mais painéis" aria-label="Mais painéis" aria-haspopup="true">'+IC.dots+'</button><button class="ghost" id="twClose" title="Fechar" aria-label="Fechar painel">'+IC.close+'</button>';
}
$('#itabs').addEventListener('click',function(e){
  var b=e.target.closest('[data-tab]');if(b){setTab(b.dataset.tab);return}
  if(e.target.closest('#twClose')){openTweaks(false);return}
  if(e.target.closest('#moreBtn')){e.stopPropagation();var m=$('#moreMenu');if(!m.hidden){m.hidden=true;return}closePops();
    var open=COMMENTS.filter(function(c){return !c.done}).length;
    m.innerHTML=TABS.slice(2).map(function(x){return '<button class="mi" data-tab="'+x[0]+'">'+({assets:IC.image,data:IC.data,review:IC.check,comments:IC.comment,versions:IC.history,code:IC.code})[x[0]]+x[1]+(x[0]==='comments'&&open?'<span class="k">'+open+'</span>':'')+'</button>'}).join('');m.hidden=false}
});
$('#moreMenu').addEventListener('click',function(e){var b=e.target.closest('[data-tab]');if(b){$('#moreMenu').hidden=true;setTab(b.dataset.tab)}});
function openTweaks(on){var p=$('#props');p.hidden=!on;$('#abody').classList.toggle('tw',on);$('#tweaksBtn').setAttribute('aria-pressed',String(on));if(on){renderTabs();renderPanel()}requestAnimationFrame(function(){renderAudioLane();updateHead()})}
function setTab(n){tab=n;openTweaks(true)}
function renderPanel(){
  if($('#props').hidden)return;
  var T={tweaks:panelTweaks,style:panelStyle,assets:panelAssets,captions:panelCaptions,data:panelData,review:panelReview,comments:panelComments,versions:panelVersions,code:panelCode}[tab]||panelTweaks;
  T($('#pane'));
}
/* ---------- campos genéricos ---------- */
var OPT_FONT=[['display','Títulos'],['ui','Texto'],['mono','Mono']];
var OPT_ALIGN=[['left','Esquerda'],['center','Centro'],['right','Direita']];
var TRANS_OPTS=[['iris','Íris com anéis'],['bars','Barras coloridas'],['flash','Flash'],['wipe','Cortina'],['fade','Dissolver'],['slide','Deslizar'],['magic','Magic Move'],['none','Nenhuma'],['sh-noise','Shader: dissolver com ruído'],['sh-pixel','Shader: pixelizar'],['sh-radial','Shader: radial'],['sh-zoom','Shader: zoom com desfoque'],['sh-glitch','Shader: glitch']];
var FK={
  text:[{p:'text',l:'Texto (use {{chave}} para variáveis)',t:'area'},{p:'size',l:'Tamanho',t:'num',half:1},{p:'weight',l:'Peso',t:'sel',o:[[400,'Regular'],[500,'Médio'],[600,'Semibold'],[700,'Negrito']],num:1,half:1},{p:'font',l:'Fonte',t:'sel',o:OPT_FONT,half:1},{p:'align',l:'Alinhamento',t:'sel',o:OPT_ALIGN,half:1},{p:'color',l:'Cor',t:'color'},{p:'spacing',l:'Espaçamento entre letras',t:'num',step:.5,half:1},{p:'upper',l:'Maiúsculas',t:'check',half:1}],
  shape:[{p:'shape',l:'Forma',t:'sel',o:[['rect','Retângulo'],['ellipse','Elipse'],['line','Linha'],['poly','Polígono'],['star','Estrela'],['morph','Forma que se transforma'],['dial','Mostrador'],['arc','Arco'],['ring','Anel']]},{p:'fill',l:'Preenchimento',t:'color',none:1},{p:'stroke',l:'Contorno',t:'color',none:1},{p:'strokeW',l:'Espessura',t:'num',half:1},{p:'radius',l:'Cantos',t:'num',half:1}],
  image:[{p:'fit',l:'Ajuste',t:'sel',o:[['cover','Preencher'],['contain','Conter']],half:1},{p:'radius',l:'Cantos',t:'num',half:1}],
  video:[{p:'fit',l:'Ajuste',t:'sel',o:[['cover','Preencher'],['contain','Conter']],half:1},{p:'radius',l:'Cantos',t:'num',half:1},{p:'mediaStart',l:'Começar o clipe em (s)',t:'num',step:.1,half:1},{p:'vol',l:'Volume (0 a 2)',t:'num',step:.1,half:1},{p:'muted',l:'Sem som',t:'check',half:1},{p:'loop',l:'Repetir clipe',t:'check',half:1}],
  chart:[{p:'type',l:'Tipo',t:'sel',o:[['hbar','Barras horizontais'],['bar','Barras verticais'],['line','Linha']]},{p:'color',l:'Cor dos dados',t:'color'},{p:'textColor',l:'Cor do texto',t:'color'},{p:'size',l:'Tamanho do texto',t:'num',half:1},{p:'unit',l:'Unidade',t:'text',half:1},{p:'showValues',l:'Mostrar valores',t:'check'}],
  sprite:[{p:'fps',l:'Quadros por segundo',t:'num',half:1},{p:'mode',l:'Repetição',t:'sel',o:[['loop','Em loop'],['pingpong','Vai e volta'],['once','Uma vez']],half:1},{p:'cols',l:'Colunas da folha',t:'num',half:1},{p:'rows',l:'Linhas da folha',t:'num',half:1},{p:'count',l:'Quadros usados (0 = todos)',t:'num',half:1},{p:'fit',l:'Ajuste',t:'sel',o:[['contain','Conter'],['cover','Preencher']],half:1},{p:'flip',l:'Espelhar',t:'check'}],
  svg:[{p:'draw',l:'Desenhar o traço antes de aparecer',t:'check'},{p:'drawT',l:'Duração do desenho (s)',t:'num',step:.1,half:1},{p:'strokeScale',l:'Espessura do traço (×)',t:'num',step:.25,half:1},{p:'strokeColor',l:'Cor do traço',t:'color',none:1}],
  lottie:[{p:'speed',l:'Velocidade',t:'num',step:.1,half:1},{p:'fit',l:'Ajuste',t:'sel',o:[['contain','Conter'],['cover','Preencher']],half:1},{p:'loop',l:'Repetir',t:'check'}],
  shader:[{p:'preset',l:'Efeito',t:'sel',o:Object.keys(SHADERS).map(function(k){return [k,SHADERS[k].name+(SHADERS[k].tex?' (usa imagem)':'')]})},{p:'c1',l:'Cor 1',t:'color'},{p:'c2',l:'Cor 2',t:'color'},{p:'c3',l:'Cor 3',t:'color'},{p:'speed',l:'Velocidade',t:'num',step:.1,half:1},{p:'intensity',l:'Intensidade',t:'num',step:.1,half:1},{p:'offset',l:'Deslocar tempo (s)',t:'num',step:.5,half:1},{p:'res',l:'Resolução (0,25 a 1)',t:'num',step:.25,half:1}],
  three:[{p:'mode',l:'Modo',t:'sel',o:[['object','Objeto 3D'],['text','Texto 3D'],['cards','Imagens em carrossel 3D'],['model','Modelo GLB']]},{p:'shape',l:'Forma (modo objeto)',t:'sel',o:[['torusKnot','Nó'],['torus','Anel'],['sphere','Esfera'],['box','Cubo'],['icosa','Icosaedro'],['cylinder','Cilindro'],['cone','Cone']]},{p:'text',l:'Texto (modo texto)',t:'text'},{p:'font',l:'Fonte do texto',t:'sel',o:OPT_FONT,half:1},{p:'depth3',l:'Profundidade (0 a 1)',t:'num',step:.1,half:1},{p:'color',l:'Cor',t:'color'},{p:'light',l:'Luz',t:'sel',o:[['studio','Estúdio'],['warm','Quente'],['neon','Neon']],half:1},{p:'wire',l:'Aramado',t:'check',half:1},{p:'metal',l:'Metal (0 a 1)',t:'num',step:.1,half:1},{p:'rough',l:'Aspereza (0 a 1)',t:'num',step:.1,half:1},{p:'spin',l:'Giro (voltas por 10 s)',t:'num',step:.1,half:1},{p:'orbit',l:'Órbita da câmera na cena (°)',t:'num',step:15,half:1},{p:'camY',l:'Altura da câmera',t:'num',step:.25,half:1}],
  particles:[{p:'mode',l:'Modo',t:'sel',o:[['burst','Explosão'],['confetti','Confete'],['float','Flutuando'],['sphere','Esfera de pontos']]},{p:'count',l:'Quantidade',t:'num',half:1},{p:'seed',l:'Semente',t:'num',half:1},{p:'size',l:'Tamanho',t:'num',half:1},{p:'speed',l:'Velocidade',t:'num',step:.1,half:1},{p:'gravity',l:'Gravidade',t:'num',step:.1,half:1},{p:'life',l:'Vida (s)',t:'num',step:.1,half:1},{p:'spin',l:'Giro',t:'num',step:.1,half:1},{p:'delay',l:'Espalhar no tempo (s)',t:'num',step:.1,half:1},{p:'streak',l:'Rastro de velocidade',t:'check'}],
  pattern:[{p:'mode',l:'Modo',t:'sel',o:[['memphis','Memphis (formas)'],['dots','Grade de pontos'],['grid','Grade de linhas']]},{p:'cols',l:'Colunas',t:'num',half:1},{p:'seed',l:'Semente',t:'num',half:1},{p:'swap',l:'Girar peças a cada (s)',t:'num',step:.1,half:1},{p:'gap',l:'Espaço dos pontos',t:'num',half:1},{p:'bg2',l:'Fundo',t:'color',none:1},{p:'twinkle',l:'Pontos cintilando',t:'check'}],
  hud:[{p:'text1',l:'Rótulo superior',t:'text'},{p:'text2',l:'Rótulo inferior',t:'text'},{p:'text3',l:'Canto superior direito (vazio = contador de quadros)',t:'text'},{p:'color',l:'Cor',t:'color'}],
  counter:[{p:'prefix',l:'Prefixo',t:'text',half:1},{p:'suffix',l:'Sufixo',t:'text',half:1},{p:'from',l:'De',t:'text',half:1},{p:'to',l:'Até (número ou {{chave}})',t:'text',half:1},{p:'decimals',l:'Casas decimais',t:'num',half:1},{p:'size',l:'Tamanho',t:'num',half:1},{p:'font',l:'Fonte',t:'sel',o:OPT_FONT,half:1},{p:'align',l:'Alinhamento',t:'sel',o:OPT_ALIGN,half:1},{p:'color',l:'Cor',t:'color'}]
};
var ANIM_COMMON=[['none','Nenhuma'],['fade','Aparecer'],['rise','Subir'],['drop','Descer'],['left','Vir da esquerda'],['right','Vir da direita'],['scale','Escala'],['pop','Pular (impulso)'],['blur','Desfocado para nítido'],['wipe','Revelar']];
var ANIM_EXTRA={text:[['words','Palavra por palavra'],['chars','Letra por letra'],['charsUp','Letras subindo da linha'],['slam','Impacto letra a letra'],['scramble','Decodificar'],['flicker','Piscar'],['spread','Juntar letras'],['type','Máquina de escrever']],shape:[['grow','Crescer']],chart:[['grow','Crescer']],counter:[['grow','Contar']]};
function animOpts(kind){return ANIM_COMMON.concat(ANIM_EXTRA[kind]||[])}
var EASE_OPTS=[['out','Suave'],['outq','Suave forte'],['in','Acelerando'],['inout','Entrada e saída'],['back','Com impulso'],['elastic','Elástico'],['linear','Linear']];
function objFor(o){return o==='el'?findEl(selEl):o==='scene'?curScene():o==='track'?trackById(selTrack):o==='cam'?curScene().cam:P}
function trackById(id){for(var i=0;i<P.audio.length;i++)if(P.audio[i].id===id)return P.audio[i];return null}
function fld(f,o,objOverride){
  var obj=objOverride||objFor(o),v=getp(obj,f.p),a='data-o="'+o+'" data-p="'+f.p+'"',id='f-'+o+'-'+f.p.replace(/\./g,'-');
  if(f.t==='area')return '<label class="f"><span>'+f.l+'</span><textarea id="'+id+'" rows="3" '+a+'>'+esc(v)+'</textarea></label>';
  if(f.t==='num')return '<label class="f"><span>'+f.l+'</span><input id="'+id+'" type="number" step="'+(f.step||1)+'" '+a+' value="'+esc(v==null?0:(Math.round(+v*1000)/1000))+'"></label>';
  if(f.t==='range')return '<label class="f"><span>'+f.l+' <b>'+esc(f.fmt?f.fmt(v):v)+'</b></span><input id="'+id+'" type="range" min="'+f.min+'" max="'+f.max+'" step="'+(f.step||.01)+'" '+a+' value="'+esc(v)+'"></label>';
  if(f.t==='check')return '<label class="chk"><input id="'+id+'" type="checkbox" '+a+(v?' checked':'')+'> '+f.l+'</label>';
  if(f.t==='sel')return '<label class="f"><span>'+f.l+'</span><select id="'+id+'" '+a+(f.num?' data-num="1"':'')+'>'+f.o.map(function(x){return '<option value="'+esc(x[0])+'"'+(String(x[0])===String(v)?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></label>';
  if(f.t==='color'){
    var cur=v==null?'':v,toks=['@bg','@ink','@accent','@on','@muted'];
    return '<div class="f"><span>'+f.l+'</span><div class="color">'+toks.map(function(tk){return '<button type="button" class="tk'+(cur===tk?' on':'')+'" data-act="tok" '+a+' data-v="'+tk+'" title="'+TOK[tk]+'" aria-label="'+TOK[tk]+'" style="background:'+resolve(tk)+'"></button>'}).join('')+(f.none?'<button type="button" class="tk none'+(cur===''?' on':'')+'" data-act="tok" '+a+' data-v="" title="Nenhum" aria-label="Nenhum">'+IC.x+'</button>':'')+'<input type="color" id="'+id+'" '+a+' value="'+toHex(resolve(cur)||'#000000')+'" aria-label="'+f.l+' personalizada"></div></div>';
  }
  return '<label class="f"><span>'+f.l+'</span><input id="'+id+'" type="text" '+a+' value="'+esc(v==null?'':v)+'"></label>';
}
function group(list,o,obj){var h='',i=0;while(i<list.length){if(list[i].half&&list[i+1]&&list[i+1].half){h+='<div class="two">'+fld(list[i],o,obj)+fld(list[i+1],o,obj)+'</div>';i+=2}else{h+=fld(list[i],o,obj);i++}}return h}

/* ---------- propriedades animáveis com botão de keyframe ---------- */
var TF=[['x','X',1],['y','Y',1],['w','Largura',1],['h','Altura',1],['rot','Rotação (°)',1],['scale','Escala',.05],['opacity','Opacidade',.05]];
function kfField(e,p,l,step){
  var lt=curLt(),ev=evalEl(e,lt),has=e.kf&&e.kf[p]&&e.kf[p].length,at=keyAt(e,p,Math.round(lt*20)/20)>=0||keyAt(e,p,lt)>=0;
  var v=Math.round((+ev[p]||0)*100)/100;
  return '<div class="kfrow"><label class="f"><span>'+l+'</span><input type="number" step="'+step+'" data-o="el" data-p="'+p+'" data-kf="1" id="kf-'+p+'" value="'+v+'"></label><button type="button" class="kbtn'+(has?' has':'')+(at?' at':'')+'" data-act="kf" data-p="'+p+'" title="'+(at?'Remover keyframe neste tempo':'Adicionar keyframe neste tempo')+'" aria-label="Keyframe de '+l+'"><i></i></button></div>';
}
function refreshKfButtons(){
  var e=findEl(selEl);if(!e)return;var lt=curLt(),ev=evalEl(e,lt);
  TF.forEach(function(x){var p=x[0],inp=document.getElementById('kf-'+p),btn=document.querySelector('#pane .kbtn[data-p="'+p+'"]');
    if(inp&&document.activeElement!==inp)inp.value=Math.round((+ev[p]||0)*100)/100;
    if(btn){var has=e.kf&&e.kf[p]&&e.kf[p].length,at=keyAt(e,p,lt)>=0||keyAt(e,p,Math.round(lt*20)/20)>=0;btn.classList.toggle('has',!!has);btn.classList.toggle('at',at)}});
}

/* ---------- editor de curva (bézier) ---------- */
function curveSVG(bz){
  var W=200,H=140,pd=18,X=function(x){return pd+x*(W-2*pd)},Y=function(y){return H-pd-y*(H-2*pd)*.72-(H-2*pd)*.14};
  var path='M'+X(0)+','+Y(0)+' C'+X(bz[0])+','+Y(bz[1])+' '+X(bz[2])+','+Y(bz[3])+' '+X(1)+','+Y(1);
  return '<svg class="curve" id="curve" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Curva de aceleração">'+
    '<rect x="'+pd+'" y="'+Y(1)+'" width="'+(W-2*pd)+'" height="'+(Y(0)-Y(1))+'" fill="none" stroke="currentColor" stroke-opacity=".15"/>'+
    '<line x1="'+X(0)+'" y1="'+Y(0)+'" x2="'+X(bz[0])+'" y2="'+Y(bz[1])+'" stroke="currentColor" stroke-opacity=".45"/>'+
    '<line x1="'+X(1)+'" y1="'+Y(1)+'" x2="'+X(bz[2])+'" y2="'+Y(bz[3])+'" stroke="currentColor" stroke-opacity=".45"/>'+
    '<path d="'+path+'" fill="none" stroke="#E0A21B" stroke-width="2.5"/>'+
    '<circle class="hd" data-h="1" cx="'+X(bz[0])+'" cy="'+Y(bz[1])+'" r="6" fill="#E0A21B"/>'+
    '<circle class="hd" data-h="2" cx="'+X(bz[2])+'" cy="'+Y(bz[3])+'" r="6" fill="#E0A21B"/></svg>';
}
function curveFromPoint(svg,ev){var r=svg.getBoundingClientRect(),W=200,H=140,pd=18,x=(ev.clientX-r.left)/r.width*W,y=(ev.clientY-r.top)/r.height*H;return {x:clamp((x-pd)/(W-2*pd),0,1),y:clamp(((H-pd-y)-(H-2*pd)*.14)/((H-2*pd)*.72),-.6,1.6)}}
function keysAtSel(){var e=findEl(selKf&&selKf.id);if(!e)return [];var out=[];for(var p in e.kf)(e.kf[p]||[]).forEach(function(k){if(Math.abs(k.t-selKf.t)<.03)out.push({p:p,k:k})});return out}
function setSelEase(name){keysAtSel().forEach(function(x){x.k.e=name});commit();renderPanel();draw()}

/* ---------- aba Tweaks ---------- */
function wordsHTML(sc){
  var list=sc.els.filter(function(e){return e.kind==='text'||e.kind==='counter'});
  if(!list.length)return '<p class="info">Esta cena não tem textos.</p>';
  return '<div class="words">'+list.map(function(e){
    if(e.kind==='counter')return '<input type="text" data-wid="'+e.id+'" data-wk="to" value="'+esc(e.to)+'" aria-label="Número: '+esc(elName(e))+'">';
    var multi=String(e.text).indexOf('\n')>=0||String(e.text).length>34;
    return multi?'<textarea rows="2" data-wid="'+e.id+'" data-wk="text" aria-label="Texto: '+esc(elName(e))+'">'+esc(e.text)+'</textarea>':'<input type="text" data-wid="'+e.id+'" data-wk="text" value="'+esc(e.text)+'" aria-label="Texto: '+esc(elName(e))+'">';
  }).join('')+'</div>';
}
function panelTweaks(pane){
  var e=findEl(selEl),sc=curScene(),tr=trackById(selTrack),h='';
  h+='<div class="scnav"><b>Cena '+(selScene+1)+' de '+P.scenes.length+'</b><span class="sp"></span><button class="ghost" data-act="scprev" aria-label="Cena anterior"'+(selScene===0?' disabled':'')+'>'+IC.chevl+'</button><button class="ghost" data-act="scnext" aria-label="Próxima cena"'+(selScene===P.scenes.length-1?' disabled':'')+'>'+IC.chevr+'</button></div>';
  h+='<label class="frow"><span>Nome</span><input type="text" data-o="scene" data-p="name" value="'+esc(sc.name)+'"></label>';
  h+='<label class="frow"><span>Duração</span><span class="unit"><input type="number" step="0.1" min="0.5" data-o="scene" data-p="dur" value="'+(Math.round(sc.dur*10)/10)+'"><i>s</i></span></label>';
  h+='<div class="frow"><span>Velocidade</span><div class="spd"><button data-act="speed" data-f="2" title="Mais lenta: dobra a duração">0.5×</button><button data-act="speed" data-f="0.5" title="Mais rápida: metade da duração">2×</button></div></div>';
  if(sc.ref)h+='<div class="sh">Referência deste plano</div><div class="refbox"><img src="'+sc.ref+'" alt="Quadro de referência do plano"><div><p class="info" style="margin:0">'+esc(sc.notes||'')+'</p><label class="chk" style="margin-top:6px"><input type="checkbox" data-act="refghost"'+(P.refGhost?' checked':'')+'> Mostrar sobre o palco</label></div></div>';
  h+='<div class="sh">Palavras na tela</div>'+wordsHTML(sc);


  if(tr){
    h+='<div class="sh" style="margin-top:18px"><span class="kind">'+IC.audio+'Trilha sonora</span><button class="linkbtn" data-act="desel">Fechar</button></div>';
    h+=fld({p:'name',l:'Nome',t:'text'},'track');
    h+='<div class="f"><span>Função</span><div class="presets">'+[['music','Música'],['voice','Voz / locução'],['sfx','Efeito sonoro']].map(function(x){return '<button data-act="trrole" data-v="'+x[0]+'" aria-pressed="'+((tr.role||'music')===x[0])+'">'+x[1]+'</button>'}).join('')+'</div></div>';
    if(P.audio.some(function(a){return a.role==='voice'})){var dk=duckCfg();h+='<label class="chk"><input type="checkbox" data-o="proj" data-p="duck.on"'+(dk.on?' checked':'')+'> Abaixar a música quando houver voz</label>'+(dk.on?fld({p:'duck.amount',l:'Quanto abaixar',t:'range',min:0,max:1,step:.05,fmt:function(v){return Math.round(v*100)+'%'}},'proj'):'')}
    h+='<div class="two">'+fld({p:'start',l:'Começa em (s)',t:'num',step:.1},'track')+fld({p:'offset',l:'Pular início do áudio (s)',t:'num',step:.1},'track')+'</div>';
    h+=fld({p:'vol',l:'Volume',t:'range',min:0,max:1.5,step:.05,fmt:function(v){return Math.round(v*100)+'%'}},'track');
    h+='<div class="two">'+fld({p:'fadeIn',l:'Fade de entrada (s)',t:'num',step:.1},'track')+fld({p:'fadeOut',l:'Fade de saída (s)',t:'num',step:.1},'track')+'</div>';
    h+='<div class="sh"><span>Batidas</span></div><p class="info">'+(tr.bpm?'Andamento detectado: <b>'+tr.bpm+' bpm</b>, '+(tr.beats||[]).length+' batidas marcadas na linha do tempo.':'As batidas aparecem quando o áudio terminar de carregar.')+'</p>';
    h+='<div class="btnrow"><button class="btn sm" data-act="snap">'+IC.magnet+'Encaixar cortes nas batidas</button><button class="btn sm" data-act="redetect">Detectar de novo</button></div>';
    h+='<div class="f"><span>Uma cena a cada</span><div class="three">'+[2,4,8].map(function(n){return '<button class="btn sm" data-act="perbeat" data-n="'+n+'" style="justify-content:center">'+n+' batidas</button>'}).join('')+'</div></div>';
    h+='<div class="btnrow"><button class="btn sm" data-act="trdel">'+IC.trash+'Remover trilha</button></div>';
    h+='<p class="info">Arraste a trilha na linha do tempo para mudar onde ela começa. O som entra na exportação de vídeo.</p>';
  }else if(e){
    h+='<div class="sh" style="margin-top:18px"><span class="kind">'+IC[e.kind]+KNAME[e.kind]+' selecionado</span><button class="linkbtn" data-act="desel">Desmarcar</button></div>';
    h+='<label class="f"><span>Nome da camada</span><input type="text" data-o="el" data-p="name" value="'+esc(e.name)+'" placeholder="'+esc(elName(e))+'"></label><p class="info" style="margin-top:-4px">Use o mesmo nome numa camada da cena seguinte para ativar o Magic Move.</p>';
    h+=group(FK[e.kind],'el');
    if(e.kind==='chart')h+=chartRows(e);
    if(e.kind==='shader')h+=shaderExtras(e);
    if(e.kind==='three')h+=threeExtras(e);
    if(['image','video','sprite','svg','lottie'].indexOf(e.kind)>=0)h+='<div class="btnrow"><button class="btn sm" data-act="repl">'+(e.src||(e.frames&&e.frames.length)?'Trocar arquivo':'Escolher arquivo')+'</button><button class="btn sm" data-act="libpick">Da biblioteca</button></div>'+(e.kind==='sprite'&&e.frames&&e.frames.length?'<p class="info">Sequência de '+e.frames.length+' quadros.</p>':'')+(e.kind==='sprite'&&!(e.frames&&e.frames.length)?'<p class="info">Aceita folha de sprites (informe colunas e linhas), GIF ou WebP animado. Para sequência, envie vários PNGs com o mesmo nome e números (ex.: corrida_01.png, corrida_02.png).</p>':'');
    h+='<div class="sh"><span>Transformação</span><span class="nm" style="font-weight:500;color:var(--muted)">'+fmtS(curLt())+'</span></div>';
    h+='<div class="two">'+kfField(e,'x','X',1)+kfField(e,'y','Y',1)+'</div><div class="two">'+kfField(e,'w','Largura',1)+((e.kind==='text'||e.kind==='counter')?'<span></span>':kfField(e,'h','Altura',1))+'</div>';
    h+='<div class="two">'+kfField(e,'rot','Rotação (°)',1)+kfField(e,'scale','Escala',.05)+'</div>'+kfField(e,'opacity','Opacidade (0 a 1)',.05);
    h+='<div class="two">'+kfField(e,'sx','Esticar X',.05)+kfField(e,'sy','Esticar Y',.05)+'</div><div class="three">'+kfField(e,'rgb','RGB (px)',1)+kfField(e,'glitch','Glitch',.1)+kfField(e,'jit','Tremor',1)+'</div>';
    if(e.kind==='shape'&&e.shape==='morph')h+=kfField(e,'morph','Transformação (0 = 1ª forma)',.1)+fld({p:'forms',l:'Formas (separadas por vírgula)',t:'text'},'el')+fld({p:'wobble',l:'Ondulação',t:'num',step:.1},'el');
    if(e.kind==='shape'&&e.shape==='arc')h+=kfField(e,'prog','Progresso do arco (0 a 1)',.05);
    if(e.kind==='pattern')h+=kfField(e,'prog','Revelação (0 a 1)',.05);
    if(e.kind==='three')h+='<div class="two">'+kfField(e,'rx3','Inclinação 3D (°)',1)+kfField(e,'ry3','Rotação 3D (°)',1)+'</div>'+kfField(e,'dist3','Distância da câmera',.1);
    h+='<p class="info">O losango cria um keyframe no tempo atual. Com keyframes, arrastar o elemento no palco grava a posição naquele momento.</p>';
    if(selKf&&selKf.id===e.id){
      var ks=keysAtSel(),cur=ks.length?ks[0].k.e:'inout',bz=easeBez(cur);
      h+='<div class="sh"><span>Keyframe em '+fmtS(selKf.t)+'</span><span class="nm">'+ks.map(function(x){return (TF.filter(function(f){return f[0]===x.p})[0]||[0,x.p])[1]}).join(', ')+'</span></div>';
      h+='<div class="presets">'+[['linear','Linear'],['out','Suave'],['in','Acelerar'],['inout','Entrada e saída'],['back','Impulso'],['elastic','Elástico']].map(function(x){return '<button data-act="ease" data-v="'+x[0]+'" aria-pressed="'+(cur===x[0])+'">'+x[1]+'</button>'}).join('')+'</div>';
      h+=cur==='elastic'?'<p class="info">A curva elástica é fixa. Escolha outra para ajustar à mão.</p>':curveSVG(bz);
      h+='<p class="info" style="margin-top:6px">Curva até este keyframe. Arraste os pontos para criar a sua.</p>';
      h+='<div class="btnrow"><button class="btn sm" data-act="kfprev">'+IC.left+'Anterior</button><button class="btn sm" data-act="kfnext">Próximo'+IC.right+'</button><button class="btn sm" data-act="kfdel">'+IC.trash+'Excluir</button></div>';
    }
    h+='<div class="sh"><span>Animação de entrada</span></div>';
    h+=fld({p:'anim.in',l:'Entrada',t:'sel',o:animOpts(e.kind)},'el');
    h+='<div class="two">'+fld({p:'anim.t',l:'Duração (s)',t:'num',step:.1},'el')+fld({p:'anim.ease',l:'Curva',t:'sel',o:EASE_OPTS},'el')+'</div>';
    h+='<div class="two">'+fld({p:'start',l:'Início na cena (s)',t:'num',step:.1},'el')+fld({p:'dur',l:'Visível por (0 = até o fim)',t:'num',step:.1},'el')+'</div>';
    h+=fld({p:'anim.out',l:'Saída',t:'sel',o:[['none','Nenhuma'],['fade','Desaparecer']]},'el');
    h+=elemExtras(e,sc);
    h+='<div class="btnrow"><button class="btn sm" data-act="eup">'+IC.up+'Frente</button><button class="btn sm" data-act="edown">'+IC.down+'Atrás</button><button class="btn sm" data-act="edup">'+IC.copy+'Duplicar</button><button class="btn sm" data-act="edel">'+IC.trash+'Excluir</button></div>';
  }
  if(!e&&!tr){
    h+='<div class="sh">Cena</div>';
    h+=fld({p:'bg',l:'Fundo',t:'color'},'scene');
    h+=fld({p:'trans',l:'Transição de entrada',t:'sel',o:TRANS_OPTS},'scene');
    if(sc.trans==='magic'){var mm=selScene>0?Object.keys(mmPairs(P.scenes[selScene-1],sc).pairs).length:0;h+='<p class="info">'+(mm?mm+' elemento(s) com o mesmo nome da cena anterior vão se transformar.':'Dê o mesmo nome a uma camada desta cena e da anterior para ela se transformar entre as duas.')+'</p>'}
    h+='<div class="two">'+fld({p:'fx.grain',l:'Granulação (0 a 1)',t:'num',step:.05},'scene')+fld({p:'fx.vignette',l:'Vinheta (0 a 1)',t:'num',step:.05},'scene')+'</div>';
    h+='<div class="sh">Parallax 2.5D</div>'+fld({p:'par.on',l:'Mover camadas conforme a profundidade',t:'check'},'scene');
    if(sc.par&&sc.par.on){h+='<div class="three">'+fld({p:'par.x',l:'Desloc. X',t:'num',step:10},'scene')+fld({p:'par.y',l:'Desloc. Y',t:'num',step:10},'scene')+fld({p:'par.z',l:'Zoom',t:'num',step:.02},'scene')+'</div><div class="presets">'+[['push','Empurrar'],['slide','Deslizar'],['rise','Subir'],['deep','Mergulho']].map(function(x){return '<button data-act="parp" data-k="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div><p class="info">Defina a profundidade de cada camada em Composição: o fundo (0) quase não se mexe, a frente (1) se move mais.</p>'}
    h+='<div class="sh">Câmera virtual</div>';
    h+=fld({p:'on',l:'Zoom e movimento de câmera',t:'check'},'cam');
    if(sc.cam.on){
      h+='<div class="three">'+fld({p:'z0',l:'Zoom início',t:'num',step:.05},'cam')+fld({p:'x0',l:'Foco X',t:'num',step:.05},'cam')+fld({p:'y0',l:'Foco Y',t:'num',step:.05},'cam')+'</div>';
      h+='<div class="three">'+fld({p:'z1',l:'Zoom fim',t:'num',step:.05},'cam')+fld({p:'x1',l:'Foco X',t:'num',step:.05},'cam')+fld({p:'y1',l:'Foco Y',t:'num',step:.05},'cam')+'</div>';
      h+=fld({p:'ease',l:'Curva',t:'sel',o:EASE_OPTS},'cam');
      h+='<div class="btnrow"><button class="btn sm" data-act="campreset" data-k="push">Aproximar</button><button class="btn sm" data-act="campreset" data-k="pull">Afastar</button><button class="btn sm" data-act="campreset" data-k="pan">Panorâmica</button></div>';
    }
    h+='<div class="btnrow" style="margin-top:6px"><button class="btn sm icon" data-act="smleft" title="Mover para trás" aria-label="Mover cena para trás"'+(selScene===0?' disabled':'')+'>'+IC.left+'</button><button class="btn sm icon" data-act="smright" title="Mover para frente" aria-label="Mover cena para frente"'+(selScene===P.scenes.length-1?' disabled':'')+'>'+IC.right+'</button><button class="btn sm" data-act="sdup">'+IC.copy+'Duplicar</button><button class="btn sm" data-act="sdel">'+IC.trash+'Excluir</button></div>';
    h+='<p class="info">Clique num elemento do palco para editar cor, posição, keyframes e animação.</p>';
  }
  pane.innerHTML=h;
}
function chartRows(e){
  var h='<div class="f"><span>Dados <button class="linkbtn" data-act="chartpaste" type="button">Colar da planilha</button></span>';
  (e.data||[]).forEach(function(d,j){h+='<div class="lrow"><input type="text" data-o="el" data-p="data" data-i="'+j+'" data-sk="label" value="'+esc(d.label)+'" placeholder="Nome" aria-label="Nome '+(j+1)+'"><input type="text" data-o="el" data-p="data" data-i="'+j+'" data-sk="value" value="'+esc(d.value)+'" aria-label="Valor '+(j+1)+'" style="max-width:84px"><button data-act="rmrow" data-i="'+j+'" aria-label="Remover linha">'+IC.x+'</button></div>'});
  return h+'<button class="mini" data-act="addrow">+ Linha</button></div>';
}

/* ---------- eventos do painel ---------- */
var pane=$('#pane');
pane.addEventListener('input',function(ev){
  var x=ev.target,o=x.dataset.o,p=x.dataset.p;if(!o||!p)return;
  var obj=objFor(o);if(!obj)return;var v;
  if(x.type==='checkbox')v=x.checked;
  else if(x.type==='number'||x.type==='range'){v=parseFloat(x.value);if(isNaN(v))return}
  else if(x.dataset.num)v=Number(x.value);else v=x.value;
  if(x.dataset.i!==undefined){var arr=obj[p],j=+x.dataset.i,sk=x.dataset.sk;if(sk){arr[j][sk]=(sk==='value'&&String(x.value).indexOf('{{')<0)?num(x.value):x.value}else arr[j]=x.value}
  else if(x.dataset.kf&&o==='el'){writeProp(obj,p,v)}
  else{
    if(o==='scene'&&p==='dur')v=Math.max(.5,v);
    if(o==='proj'&&p.indexOf('theme.')===0)P.themeName='custom';
    if(o==='track'&&p==='vol'){var lab=x.closest('label').querySelector('b');if(lab)lab.textContent=Math.round(v*100)+'%'}
    if(o==='scene'&&p==='dur'){var lb=x.closest('label').querySelector('b');if(lb)lb.textContent=fmtS(v)}
    setp(obj,p,v);
  }
  if(o==='el'&&!x.dataset.kf)showEl(obj);
  if(o==='track'){renderAudioLane();if(playing)aeStart(t);return}
  touch();if(o==='el')refreshKfButtons();
});
pane.addEventListener('change',function(ev){
  var x=ev.target;if(!x.dataset||!x.dataset.o)return;
  if(x.tagName==='SELECT'||x.type==='checkbox'||x.type==='color'){renderPanel();if(x.dataset.o==='proj')renderStrip()}
  if(x.dataset.o==='el'&&x.dataset.p==='name')renderLayers();
  commit();
});
pane.addEventListener('click',function(ev){
  var b=ev.target.closest('[data-act]');if(!b||b.disabled)return;var act=b.dataset.act,i=+b.dataset.i,sc=curScene(),e=findEl(selEl);
  if(handlers[act]){handlers[act](b,e,sc,i);return}
});
var handlers={
  tok:function(b){var obj=objFor(b.dataset.o);if(!obj)return;setp(obj,b.dataset.p,b.dataset.v);if(b.dataset.o==='el')showEl(obj);commit();renderPanel();touch()},
  theme:function(b){applyTheme(b.dataset.k);commit();fullRender()},
  addrow:function(b,e){if(!e)return;e.data.push({label:'Novo',value:1});showEl(e);commit();renderPanel();touch()},
  rmrow:function(b,e,sc,i){if(!e)return;if(e.data.length>1){e.data.splice(i,1);commit();renderPanel();touch()}else toast('Mantenha pelo menos uma linha.')},
  chartpaste:function(b,e){if(!e)return;openPasteDialog('chart')},
  trrole:function(b){var tr=trackById(selTrack);if(!tr)return;tr.role=b.dataset.v;if(AE.segs)AE.segs={};commit();renderPanel();renderAudioLane();if(playing)aeStart(t)},
  refghost:function(){P.refGhost=!P.refGhost;commit();renderPanel();draw()},
  refvid:function(){openRefDialog()},
  shapply:function(b,e){var v=$('#shcode').value;var base=(SHADERS[e.preset]||SHADERS.fluid).code;e.code=v.trim()===base.trim()?'':v;commit();fullRender();var er=e.code?shaderError(e.code):'';toast(er?'O shader tem erro. Veja a mensagem abaixo do código.':'Shader aplicado.')},
  shreset:function(b,e){e.code='';commit();fullRender()},
  shnoimg:function(b,e){e.src='';commit();fullRender()},
  t3clear:function(b,e){e.images=[];commit();fullRender()},
  repl:function(b,e){var r=$('#replFile');r.accept=e&&e.kind==='three'?(e.mode==='model'?'.glb,.gltf':'image/*'):e&&e.kind==='shader'?'image/*':e&&e.kind==='svg'?'.svg,image/svg+xml':e&&e.kind==='lottie'?'.json,application/json':e&&e.kind==='video'?'video/*':'image/*';r.value='';r.click()},
  libpick:function(){openMediaPop('replace')},
  kf:function(b,e){if(!e)return;var p=b.dataset.p,lt=curLt(),k=keyAt(e,p,lt);if(k<0)k=keyAt(e,p,Math.round(lt*20)/20);
    if(k>=0){e.kf[p].splice(k,1);if(!e.kf[p].length){var ev0=evalEl(e,lt);delete e.kf[p];e[p]=+ev0[p]||e[p]}}
    else setKey(e,p,lt,+evalEl(e,lt)[p]);
    commit();renderPanel();renderLayers();draw()},
  ease:function(b){setSelEase(b.dataset.v)},
  kfprev:function(b,e){if(!e)return;var ts=kfTimes(e).filter(function(x){return x<selKf.t-.02});if(ts.length){selKf.t=ts[ts.length-1];seek(sceneStart(selScene)+selKf.t);renderPanel();renderLayers()}},
  kfnext:function(b,e){if(!e)return;var ts=kfTimes(e).filter(function(x){return x>selKf.t+.02});if(ts.length){selKf.t=ts[0];seek(sceneStart(selScene)+selKf.t);renderPanel();renderLayers()}},
  kfdel:function(b,e){if(!e)return;for(var p in e.kf){e.kf[p]=e.kf[p].filter(function(k){return Math.abs(k.t-selKf.t)>=.03});if(!e.kf[p].length)delete e.kf[p]}selKf=null;commit();renderPanel();renderLayers();draw()},
  eup:function(b,e,sc){if(!e)return;var k=sc.els.indexOf(e);if(k<sc.els.length-1){sc.els.splice(k,1);sc.els.splice(k+1,0,e)}commit();fullRender()},
  edown:function(b,e,sc){if(!e)return;var k=sc.els.indexOf(e);if(k>0){sc.els.splice(k,1);sc.els.splice(k-1,0,e)}commit();fullRender()},
  edup:function(b,e,sc){if(!e)return;var c=clone(e);c.id=nid();c.x+=24;c.y+=24;if(c.kf)for(var p in c.kf)if(p==='x'||p==='y')c.kf[p].forEach(function(k){k.v+=24});sc.els.splice(sc.els.indexOf(e)+1,0,c);selEl=c.id;commit();fullRender()},
  edel:function(){delEl()},
  smleft:function(){moveScene(-1)},smright:function(){moveScene(1)},
  sdup:function(b,e,sc){var cs=clone(sc);cs.id=nid('s');cs.els.forEach(function(x){x.id=nid()});P.scenes.splice(selScene+1,0,cs);selScene++;selEl=null;t=sceneStart(selScene)+1;commit();fullRender()},
  sdel:function(){if(P.scenes.length<=1){toast('A animação precisa de pelo menos uma cena.');return}P.scenes.splice(selScene,1);selScene=Math.min(selScene,P.scenes.length-1);selEl=null;commit();fullRender()},
  campreset:function(b,e,sc){var k=b.dataset.k,c=sc.cam;if(k==='push')Object.assign(c,{z0:1,x0:.5,y0:.5,z1:1.18,x1:.5,y1:.5,ease:'inout'});if(k==='pull')Object.assign(c,{z0:1.2,x0:.5,y0:.5,z1:1,x1:.5,y1:.5,ease:'out'});if(k==='pan')Object.assign(c,{z0:1.15,x0:.38,y0:.5,z1:1.15,x1:.62,y1:.5,ease:'inout'});commit();renderPanel();seek(sceneStart(selScene)+sc.dur*.5)},
  snap:function(){if(snapToBeats()){commit();fullRender();toast('Viradas de cena encaixadas nas batidas.')}else toast('Ainda não há batidas detectadas.')},
  perbeat:function(b){var tr=trackById(selTrack);if(!tr||!tr.bpm){toast('Ainda não há batidas detectadas.');return}var d=60/tr.bpm*(+b.dataset.n);P.scenes.forEach(function(s){s.dur=Math.round(d*100)/100});snapToBeats();commit();fullRender();toast('Cada cena agora dura '+b.dataset.n+' batidas ('+fmtS(d)+').')},
  redetect:function(){var tr=trackById(selTrack);var buf=tr&&AE.buffers[tr.id];if(!buf){toast('O áudio ainda está carregando.');return}var r=detectBeats(buf);tr.bpm=r.bpm;tr.beats=r.beats;commit();renderPanel();renderAudioLane()},
  trdel:function(){P.audio=P.audio.filter(function(a){return a.id!==selTrack});selTrack=null;aeStop();commit();fullRender();if(playing)aeStart(t)}
};
/* arrastar pontos da curva */
var cdrag=null;
pane.addEventListener('pointerdown',function(ev){var hd=ev.target.closest('.hd');if(!hd)return;cdrag={h:+hd.dataset.h,svg:ev.target.closest('svg'),bz:easeBez((keysAtSel()[0]||{k:{e:'inout'}}).k.e)};ev.target.setPointerCapture(ev.pointerId);ev.preventDefault()});
pane.addEventListener('pointermove',function(ev){if(!cdrag)return;var q=curveFromPoint(cdrag.svg,ev),bz=cdrag.bz;if(cdrag.h===1){bz[0]=q.x;bz[1]=q.y}else{bz[2]=q.x;bz[3]=q.y}
  var name='cb('+bz.map(function(v){return (Math.round(v*100)/100)}).join(',')+')';keysAtSel().forEach(function(x){x.k.e=name});
  var tmp=document.createElement('div');tmp.innerHTML=curveSVG(bz);cdrag.svg.innerHTML=tmp.firstChild.innerHTML;draw()});
pane.addEventListener('pointerup',function(){if(cdrag){cdrag=null;commit();renderPanel()}});

function applyTheme(k){var th=THEMES[k];if(!th)return;P.theme={bg:th.bg,ink:th.ink,accent:th.accent,on:th.on};P.themeName=k}
function moveScene(d){var j=selScene+d;if(j<0||j>=P.scenes.length)return;var s=P.scenes.splice(selScene,1)[0];P.scenes.splice(j,0,s);selScene=j;commit();fullRender()}
function delEl(){var sc=curScene(),e=findEl(selEl);if(!e)return;sc.els.splice(sc.els.indexOf(e),1);selEl=null;selKf=null;commit();fullRender()}

/* =========================================================
   Reorganização automática para outro formato
   ========================================================= */
function inkBox(e,b){
  if(e.kind!=='text'||!e.text)return {x0:b.x,x1:b.x+b.w};
  var L=tlayout(e),mw=0;L.lines.forEach(function(l){var last=l[l.length-1];if(last){var first=l[0];mw=Math.max(mw,last.x+last.ww-first.x)}});
  var first=(L.lines.filter(function(l){return l.length})[0]||[{x:0}])[0];
  var x0=e.align==='center'?b.x+(b.w-mw)/2:e.align==='right'?b.x+b.w-mw:b.x;return {x0:x0,x1:x0+mw};
}
function reflowProject(proj,nw,nh){
  var ow=proj.w,oh=proj.h;if(ow===nw&&oh===nh)return proj;
  var save={P:P,PW:PW,PH:PH};P=proj;PW=ow;PH=oh;
  try{
    var mo=Math.round(Math.min(ow,oh)*.08),mn=Math.round(Math.min(nw,nh)*.08),portrait=nh>nw*1.05,shortR=Math.min(nw,nh)/Math.min(ow,oh);
    proj.scenes.forEach(function(sc){
      var full=[],items=[];
      sc.els.forEach(function(e){var b=bbox(e);if(e.kind==='shape'&&b.w>=ow*.95&&b.h>=oh*.95)full.push(e);else items.push({e:e,b:b,k:inkBox(e,b)})});
      full.forEach(function(e){e.x=0;e.y=0;e.w=nw;e.h=nh;['x','y','w','h'].forEach(function(k){delete e.kf[k]})});
      if(!items.length)return;
      items.sort(function(a,b){return a.b.y-b.b.y});
      var rows=[];
      items.forEach(function(it){var r=rows[rows.length-1];if(r&&it.b.y<r.y1-2){r.items.push(it);r.y1=Math.max(r.y1,it.b.y+it.b.h);r.x0=Math.min(r.x0,it.b.x);r.x1=Math.max(r.x1,it.b.x+it.b.w)}else rows.push({items:[it],y0:it.b.y,y1:it.b.y+it.b.h,x0:it.b.x,x1:it.b.x+it.b.w})});
      /* em formato vertical, cartões lado a lado viram uma pilha */
      if(portrait){
        var nr=[];
        rows.forEach(function(r){
          var cl=[];r.items.slice().sort(function(a,b){return a.k.x0-b.k.x0}).forEach(function(it){var c=cl[cl.length-1];if(c&&it.k.x0<c.kx1-2){c.items.push(it);c.kx1=Math.max(c.kx1,it.k.x1);c.x0=Math.min(c.x0,it.b.x);c.x1=Math.max(c.x1,it.b.x+it.b.w);c.y0=Math.min(c.y0,it.b.y);c.y1=Math.max(c.y1,it.b.y+it.b.h)}else cl.push({items:[it],kx1:it.k.x1,x0:it.b.x,x1:it.b.x+it.b.w,y0:it.b.y,y1:it.b.y+it.b.h})});
          var cards=cl.length>1&&cl.every(function(c){return c.items.some(function(it){return it.e.kind==='shape'&&it.b.h>=oh*.2})});
          var texts2=cl.length===2&&r.items.every(function(it){return it.e.kind==='text'||it.e.kind==='counter'});
          if(texts2){cl.forEach(function(c,i){var x0=Math.min.apply(null,c.items.map(function(it){return it.k.x0}));c.items.forEach(function(it){if(it.e.kind==='text'&&it.e.align==='right'){it.b={x:x0,y:it.b.y,w:it.b.w,h:it.b.h};it.alignLeft=true}});nr.push({items:c.items,y0:c.y0,y1:c.y1,x0:x0,x1:c.x1,gapBefore:i?oh*.012:null,left:true})});return}
          var rwc=r.x1-r.x0,container=r.items.some(function(it){return it.e.kind==='shape'&&it.b.w>=rwc*.95&&it.b.h>=oh*.2&&it.b.w>=ow*.5});
          if(container&&!cards){r.stack=true;nr.push(r);return}
          if(!cards){nr.push(r);return}
          cl.forEach(function(c,i){nr.push({items:c.items,y0:c.y0,y1:c.y1,x0:c.x0,x1:c.x1,stack:true,gapBefore:i?oh*.03:null})});
        });
        rows=nr;
      }
      var availW=nw-2*mn,availH=nh-2*mn,sW=availW/Math.max(1,ow-2*mo);
      var contentH=rows.reduce(function(a,r){return a+(r.y1-r.y0)},0)+Math.max(0,rows[rows.length-1].y1-rows[0].y0-rows.reduce(function(a,r){return a+(r.y1-r.y0)},0));
      var boost=clamp(Math.sqrt(availH/Math.max(1,contentH*sW)),1,1.6);
      function plan(bst){
        var out=[],y=0,prevY1=null;
        rows.forEach(function(r){
          var rw=r.x1-r.x0,fitS=availW/Math.max(1,rw),centered=!r.left&&(r.stack||(Math.abs((r.x0+r.x1)/2-ow/2)<ow*.06&&r.x0>mo*1.5&&rw<ow*.8)),ref=r.left?r.x0:Math.min(r.x0,mo);
          var srt=r.items.slice().sort(function(a,b){return a.k.x0-b.k.x0}),side=false;for(var q=1;q<srt.length;q++){var pv=srt[q-1];if(srt[q].k.x0>=pv.k.x1-2){side=true;break}}
          var onlyText=!side&&r.items.every(function(it){return it.e.kind==='text'||it.e.kind==='counter'});
          var lastIt=srt[srt.length-1],lead=side&&lastIt.e.kind==='text'&&srt.slice(0,-1).every(function(it){return it.b.w<=ow*.12});
          var soloChart=r.items.length===1&&r.items[0].e.kind==='chart';
          var want=Math.max(sW*bst*(r.stack?1.25:1),shortR*bst*.85),s=(onlyText||lead||soloChart||r.stack)?want:Math.min(want,fitS),sx=lead?want:Math.min(s,fitS);
          if(r.stack){s=Math.min(want,fitS*1.4);}
          if(centered&&!r.stack&&rw*sx>availW+1)centered=false;
          if(prevY1!=null)y+=r.gapBefore!=null?r.gapBefore*sW*bst:Math.max(0,(r.y0-prevY1))*sW*bst;
          var ms=r.items.map(function(it){
            var e=it.e,ne=Object.assign({},e),nx;
            ne.w=Math.max(20,Math.min(it.b.w*s,availW));
            if(e.size)ne.size=e.size*s;
            if(e.h)ne.h=e.h*s;
            if(soloChart)ne.w=availW;
            if(r.stack){var pad=(it.b.x-r.x0)*s;ne.w=Math.max(20,availW-2*pad);ne._x=mn+pad}
            if(it.alignLeft)ne.align='left';
            nx=ne._x!=null?ne._x:soloChart?mn:centered?(nw/2+((it.b.x-(r.x0+r.x1)/2)*sx)-(onlyText?(ne.w-it.b.w*sx)/2:0)):(mn+(it.b.x-ref)*sx);delete ne._x;
            if(lead&&it===lastIt){ne.w=Math.max(40,nw-mn-nx)}
            else if(nx+ne.w>nw-mn)nx=Math.max(mn,nw-mn-ne.w);if(nx<0)nx=0;
            return {it:it,ne:ne,s:s,x:nx,relY:(it.b.y-r.y0)*s,h:bbox(ne).h};
          });
          var rh=Math.max.apply(null,ms.map(function(m){return m.relY+m.h}));
          ms.forEach(function(m){m.y=y+m.relY});out.push(ms);y+=rh;prevY1=r.y1;
        });
        return {rows:out,H:y};
      }
      var bb=boost,L=plan(bb);for(var k=0;k<6&&L.H>availH;k++){bb*=availH/L.H*.98;L=plan(bb)}
      var off=mn+Math.max(0,(availH-L.H)/2);
      L.rows.forEach(function(ms){ms.forEach(function(m){
        var e=m.it.e,s=m.s,ox=e.x,oy=e.y;
        e.w=Math.round(m.ne.w);e.x=Math.round(m.x);e.y=Math.round(m.y+off);
        if(e.h)e.h=Math.round(m.ne.h);
        if(e.size)e.size=Math.max(8,Math.round(m.ne.size));
        if(m.ne.align)e.align=m.ne.align;
        if(e.strokeW)e.strokeW=Math.max(1,Math.round(e.strokeW*s*10)/10);
        if(e.radius)e.radius=Math.round(e.radius*s);
        if(e.spacing)e.spacing=Math.round(e.spacing*s*10)/10;
        var bx=e.x-ox*s,by=e.y-oy*s;
        if(e.kf){(e.kf.x||[]).forEach(function(q){q.v=Math.round(q.v*s+bx)});(e.kf.y||[]).forEach(function(q){q.v=Math.round(q.v*s+by)});(e.kf.w||[]).forEach(function(q){q.v=Math.round(q.v*s)});(e.kf.h||[]).forEach(function(q){q.v=Math.round(q.v*s)})}
      })});
    });
    proj.w=nw;proj.h=nh;
  }finally{P=save.P;PW=save.PW;PH=save.PH}
  return proj;
}
function setFormat(k){var f=FORMATS[k];if(!f||(f[0]===P.w&&f[1]===P.h))return;reflowProject(P,f[0],f[1]);commit();afterProjectChange();toast('Formato '+k+' aplicado e layout reorganizado. Desfaça se preferir o anterior.')}

/* ---------- Tweaks: navegação, velocidade, palavras na tela ---------- */
function speedScene(sc,f){
  var nd=clamp(Math.round(sc.dur*f*10)/10,.5,120),k=nd/sc.dur;sc.dur=nd;
  sc.els.forEach(function(e){e.start=Math.round((+e.start||0)*k*100)/100;if(e.dur>0)e.dur=Math.round(e.dur*k*100)/100;e.anim.t=Math.max(.05,Math.round(e.anim.t*k*100)/100);
    if(e.kf)for(var p in e.kf)e.kf[p].forEach(function(q){q.t=Math.round(q.t*k*100)/100})});
}
handlers.scprev=function(){if(selScene>0){selEl=null;selKf=null;changeScene(selScene-1);seek(sceneStart(selScene)+Math.min(1.5,curScene().dur*.5))}};
handlers.scnext=function(){if(selScene<P.scenes.length-1){selEl=null;selKf=null;changeScene(selScene+1);seek(sceneStart(selScene)+Math.min(1.5,curScene().dur*.5))}};
handlers.speed=function(b){speedScene(curScene(),+b.dataset.f);commit();fullRender();toast('A cena '+(selScene+1)+' agora dura '+fmtS(curScene().dur)+'.')};
handlers.desel=function(){selEl=null;selKf=null;selTrack=null;renderPanel();renderLayers();draw()};
pane.addEventListener('focusin',function(ev){var x=ev.target;if(!x.dataset||!x.dataset.wid)return;var e=findEl(x.dataset.wid);if(!e)return;HL=e.id;if(!playing){showEl(e)}draw();updateHead()});
pane.addEventListener('focusout',function(ev){var x=ev.target;if(!x.dataset||!x.dataset.wid)return;HL=null;draw()});
pane.addEventListener('input',function(ev){var x=ev.target;if(!x.dataset||!x.dataset.wid)return;var e=findEl(x.dataset.wid);if(!e)return;e[x.dataset.wk]=x.value;drawFrame(t);updateOverlay();renderLayers()});
pane.addEventListener('change',function(ev){var x=ev.target;if(x.dataset&&x.dataset.wid){commit();renderStrip()}});

/* ---------- popover da cena (botão ⋯ na faixa de cenas) ---------- */
function toggleScenePop(i){if(!$('#scenePop').hidden&&SPOP===i){closeScenePop();return}openScenePop(i)}
function closeScenePop(){var p=$('#scenePop');if(p.hidden)return;p.hidden=true;SPOP=-1;var b=document.querySelector('[data-more]');if(b)b.setAttribute('aria-expanded','false')}
function openScenePop(i){
  closePops();SPOP=i;var sc=P.scenes[i],p=$('#scenePop');
  p.innerHTML='<div class="sp1"><div class="hdr"><input type="text" data-sp="name" value="'+esc(sc.name)+'" aria-label="Nome da cena"><span>'+(i+1)+' de '+P.scenes.length+'</span></div>'+
    '<textarea data-sp="notes" rows="2" placeholder="Descreva o que acontece nesta cena (o Claude usa isto como roteiro)">'+esc(sc.notes||'')+'</textarea>'+
    '<div class="frow" style="margin:0"><span>Duração</span><span class="unit"><input type="number" step="0.1" min="0.5" data-sp="dur" value="'+(Math.round(sc.dur*10)/10)+'"><i>s</i></span></div>'+
    '<div class="frow" style="margin:0"><span>Velocidade</span><div class="spd"><button data-spa="slower">0.5×</button><button data-spa="faster">2×</button></div></div>'+
    '<div class="frow" style="margin:0"><span>Transição</span><select data-sp="trans">'+TRANS_OPTS.map(function(x){return '<option value="'+x[0]+'"'+(sc.trans===x[0]?' selected':'')+'>'+x[1]+'</option>'}).join('')+'</select></div></div>'+
    '<div class="foot2"><button class="mi" data-spa="dup">'+IC.copy+'Duplicar cena</button><button class="mi" data-spa="del">'+IC.trash+'Excluir cena…</button></div>';
  var blk=document.querySelector('.blk[data-si="'+i+'"]'),sr=$('.strip').getBoundingClientRect(),br=blk?blk.getBoundingClientRect():sr;
  p.hidden=false;p.style.left=clamp(br.left-sr.left,4,sr.width-p.offsetWidth-4)+'px';p.style.bottom=(sr.height-4)+'px';
  var b=document.querySelector('[data-more]');if(b)b.setAttribute('aria-expanded','true');
}
var spDel=false;
$('#scenePop').addEventListener('pointerdown',function(e){e.stopPropagation()});
$('#scenePop').addEventListener('input',function(ev){var x=ev.target,sc=P.scenes[SPOP];if(!sc||!x.dataset.sp)return;var k=x.dataset.sp;
  if(k==='dur'){var v=parseFloat(x.value);if(!isFinite(v))return;sc.dur=clamp(v,.5,120)}else sc[k]=x.value;
  if(k!=='notes'){renderStripKeepPop();draw();updateHead()}});
$('#scenePop').addEventListener('change',function(){commit();renderPanel()});
$('#scenePop').addEventListener('click',function(ev){var b=ev.target.closest('[data-spa]');if(!b)return;var a=b.dataset.spa,i=SPOP,sc=P.scenes[i];if(!sc)return;
  if(a==='slower'||a==='faster'){speedScene(sc,a==='slower'?2:.5);commit();renderStripKeepPop();renderPanel();var inp=$('#scenePop input[data-sp="dur"]');if(inp)inp.value=Math.round(sc.dur*10)/10;draw();return}
  if(a==='dup'){var cs=clone(sc);cs.id=nid('s');cs.els.forEach(function(x){x.id=nid()});P.scenes.splice(i+1,0,cs);closeScenePop();selScene=i+1;selEl=null;commit();fullRender();seek(sceneStart(selScene)+.5);return}
  if(a==='del'){if(P.scenes.length<=1){toast('A animação precisa de pelo menos uma cena.');return}
    if(!spDel){spDel=true;b.innerHTML=IC.trash+'Clique de novo para excluir';setTimeout(function(){spDel=false},2500);return}
    spDel=false;P.scenes.splice(i,1);closeScenePop();selScene=Math.min(i,P.scenes.length-1);selEl=null;commit();fullRender();return}
});
function renderStripKeepPop(){var i=SPOP;renderStrip();SPOP=i;var b=document.querySelector('[data-more]');if(b)b.setAttribute('aria-expanded','true')}
function addScene(){
  var s=scene('Cena '+(P.scenes.length+1),5,[el('text',{text:'Nova cena',x:Math.round(PW*.08),y:Math.round(PH*.42),w:Math.round(PW*.84),size:Math.round(72*Math.min(PW,PH)/720),start:.35,anim:{in:'words'}})]);
  P.scenes.splice(selScene+1,0,s);selScene++;selEl=null;t=sceneStart(selScene)+2;commit();fullRender();
}

/* ---------- aba Style ---------- */
function typeGrid(){return '<div class="typegrid">'+Object.keys(TYPES).map(function(k){var t=TYPES[k];return '<button data-act="settype" data-k="'+k+'" aria-pressed="'+(P.type===k)+'">'+t.name+'<small>'+t.fmt+'</small></button>'}).join('')+'</div>'}
function panelStyle(pane){
  var h='<div class="sh">Tipo de vídeo</div>'+typeGrid()+'<div class="btnrow"><button class="btn sm" data-act="typetpl">Começar do modelo de '+esc(TYPES[P.type].name.toLowerCase())+'</button></div><p class="info">O tipo ajusta as ferramentas em destaque, as sugestões e as instruções que o Claude segue. Mudar o tipo não apaga nada.</p>';
  h+='<div class="sh">Formato</div><div class="seg" style="margin-bottom:6px">'+Object.keys(FORMATS).map(function(k){return '<button data-act="fmt" data-k="'+k+'" aria-pressed="'+(FORMATS[k][0]===PW&&FORMATS[k][1]===PH)+'">'+k+'</button>'}).join('')+'</div><p class="info">Trocar o formato reorganiza o layout de todas as cenas.</p>';
  h+='<div class="sh">Paleta</div><div class="pal">'+Object.keys(THEMES).map(function(k){var th=THEMES[k];return '<button data-act="theme" data-k="'+k+'" aria-pressed="'+(P.themeName===k)+'"><span class="sw"><i style="background:'+th.bg+'"></i><i style="background:'+th.ink+'"></i><i style="background:'+th.accent+'"></i></span><b>'+th.name+'</b></button>'}).join('')+'</div>';
  panelBrand(pane,h);
}
handlers.fmt=function(b){setFormat(b.dataset.k);renderPanel()};

/* ---------- efeitos, máscara, composição e vídeo (ajustes rápidos) ---------- */
function det(id,title,body,open){return '<details class="grp" data-grp="'+id+'"'+(open||GRP_OPEN[id]?' open':'')+'><summary>'+title+'</summary><div class="gb">'+body+'</div></details>'}
var GRP_OPEN={};
function elemExtras(e,sc){
  var others=sc.els.filter(function(x){return x.id!==e.id}),h='';
  var fx='<div class="presets" style="margin-top:0">'+[['shadow','Sombra suave'],['glow','Brilho'],['mblur','Motion blur'],['blurin','Desfoque de entrada'],['fxclear','Limpar']].map(function(x){return '<button data-act="fxp" data-k="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>';
  fx+='<div class="two">'+fld({p:'fx.blur',l:'Desfoque',t:'num',step:.5},'el')+fld({p:'fx.mblur',l:'Motion blur (0 a 10)',t:'num',step:1},'el')+'</div>';
  fx+='<div class="two">'+fld({p:'fx.shadow',l:'Sombra',t:'num',step:1},'el')+fld({p:'fx.glow',l:'Brilho externo',t:'num',step:1},'el')+'</div>';
  if(+e.fx.glow>0)fx+=fld({p:'fx.glowColor',l:'Cor do brilho',t:'color'},'el');
  fx+='<div class="two">'+fld({p:'fx.bright',l:'Brilho (1 = normal)',t:'num',step:.05},'el')+fld({p:'fx.contrast',l:'Contraste',t:'num',step:.05},'el')+'</div>';
  fx+='<div class="two">'+fld({p:'fx.sat',l:'Saturação',t:'num',step:.05},'el')+fld({p:'fx.hue',l:'Matiz (°)',t:'num',step:5},'el')+'</div>';
  h+=det('fx','Efeitos',fx);
  var mk=fld({p:'mask',l:'Forma',t:'sel',o:MASKS},'el');
  if(e.mask!=='none'){mk+=kfField(e,'maskP','Quanto aparece (0 a 1)',.05)+fld({p:'maskInv',l:'Inverter máscara',t:'check'},'el')}
  mk+='<div class="presets">'+[['wipe-l','Revelar da esquerda'],['circle','Revelar em círculo'],['wipe-u','Subir'],['round','Abrir do centro']].map(function(x){return '<button data-act="maskp" data-k="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>';
  mk+='<p class="info">Os botões criam a máscara já animada a partir do início da camada.</p>';
  h+=det('mask','Máscara',mk);
  var opts=[['','Nenhuma']].concat(others.map(function(x){return [x.id,KNAME[x.kind]+': '+elName(x)]}));
  var cp=fld({p:'blend',l:'Mesclagem',t:'sel',o:BLENDS},'el');
  cp+=fld({p:'matte',l:'Recortar pelo formato de outra camada',t:'sel',o:opts},'el');
  if(e.matte)cp+=fld({p:'matteInv',l:'Usar o contrário (vazar)',t:'check'},'el')+'<p class="info">A camada escolhida vira só a máscara e não aparece sozinha.</p>';
  cp+=fld({p:'parent',l:'Vincular a (segue o movimento de)',t:'sel',o:opts},'el');
  cp+=fld({p:'depth',l:'Profundidade no parallax: 0 fundo, 1 frente',t:'range',min:0,max:1,step:.05,fmt:function(v){return (Math.round(v*100)/100).toLocaleString('pt-BR')}},'el');
  h+=det('comp','Composição',cp);
  var lt=curLt(),cut='<div class="btnrow"><button class="btn sm" data-act="cutin">Começar aqui</button><button class="btn sm" data-act="cutout">Terminar aqui</button>'+(e.kind==='video'?'<button class="btn sm" data-act="vsplit">Dividir aqui</button>':'')+'</div>';
  if(e.kind==='video'){
    cut+='<div class="two">'+fld({p:'rate',l:'Velocidade',t:'sel',o:[[0.25,'0,25×'],[0.5,'0,5×'],[0.75,'0,75×'],[1,'1×'],[1.5,'1,5×'],[2,'2×'],[4,'4×']],num:1},'el')+fld({p:'ramp',l:'Rampa',t:'sel',o:Object.keys(RAMPS).map(function(k){return [k,RAMPS[k]]})},'el')+'</div>';
  }
  cut+='<p class="info">"Começar aqui" e "Terminar aqui" usam a posição do playhead ('+fmtS(lt)+' na cena).</p>';
  h+=det('cut',e.kind==='video'?'Cortes e velocidade':'Corte',cut,(TYPES[P.type]||{}).fmt&&(P.type==='edit'||P.type==='tutorial')&&e.kind==='video');
  return h;
}
pane.addEventListener('toggle',function(ev){var d=ev.target;if(d&&d.dataset&&d.dataset.grp)GRP_OPEN[d.dataset.grp]=d.open},true);
handlers.fxp=function(b,e){if(!e)return;var k=b.dataset.k;
  if(k==='shadow'){e.fx.shadow=e.fx.shadow?0:18}
  else if(k==='glow'){e.fx.glow=e.fx.glow?0:16}
  else if(k==='mblur'){e.fx.mblur=e.fx.mblur?0:6}
  else if(k==='blurin'){e.anim.in='blur';e.anim.t=Math.max(.5,e.anim.t)}
  else if(k==='fxclear'){e.fx=defFx();if(e.anim.in==='blur')e.anim.in='fade'}
  GRP_OPEN.fx=true;showEl(e);commit();renderPanel();touch()};
handlers.maskp=function(b,e){if(!e)return;var k=b.dataset.k,st=+e.start||0;e.mask=k;e.maskInv=false;e.kf=e.kf||{};e.kf.maskP=[{t:Math.round(st*100)/100,v:0,e:'inout'},{t:Math.round((st+.9)*100)/100,v:1,e:'out'}];
  if(e.anim.in==='wipe')e.anim.in='none';GRP_OPEN.mask=true;commit();renderPanel();renderLayers();seek(sceneStart(selScene)+st+.45)};
handlers.cutin=function(b,e,sc){if(!e)return;var lt=Math.round(curLt()*100)/100,w=win(e,sc);if(lt>=w[1]-.05){toast('O playhead está depois do fim da camada.');return}
  var shift=lt-w[0];if(e.kind==='video')e.mediaStart=Math.round(((+e.mediaStart||0)+mediaElapsed(e,sc,lt))*100)/100;
  if(e.dur>0)e.dur=Math.max(.1,Math.round((w[1]-lt)*100)/100);e.start=lt;
  if(e.kf)for(var p in e.kf)e.kf[p]=e.kf[p].filter(function(q){return q.t>=lt-.001});
  commit();renderPanel();renderLayers();draw()};
handlers.cutout=function(b,e,sc){if(!e)return;var lt=Math.round(curLt()*100)/100,w=win(e,sc);if(lt<=w[0]+.05){toast('O playhead está antes do começo da camada.');return}e.dur=Math.round((lt-w[0])*100)/100;commit();renderPanel();renderLayers();draw()};
handlers.vsplit=function(b,e,sc){if(!e)return;var lt=Math.round(curLt()*100)/100,w=win(e,sc);if(lt<=w[0]+.05||lt>=w[1]-.05){toast('Coloque o playhead dentro do clipe para dividir.');return}
  var c=clone(e);c.id=nid();c.start=lt;c.dur=e.dur>0?Math.round((w[1]-lt)*100)/100:0;c.mediaStart=Math.round(((+e.mediaStart||0)+mediaElapsed(e,sc,lt))*100)/100;c.anim=Object.assign({},c.anim,{in:'none'});
  if(c.kf)for(var p in c.kf)c.kf[p]=c.kf[p].filter(function(q){return q.t>=lt});
  e.dur=Math.round((lt-w[0])*100)/100;sc.els.splice(sc.els.indexOf(e)+1,0,c);selEl=c.id;commit();fullRender();toast('Clipe dividido em '+fmtS(lt)+'.')};

function setType(k,silent){if(!TYPES[k]||P.type===k)return;P.type=k;commit();applyTypeUI();renderPanel();renderMsgs();if(!silent)toast('Tipo: '+TYPES[k].name+'. As ferramentas em destaque mudaram.')}
handlers.settype=function(b){setType(b.dataset.k)};
handlers.typetpl=function(){var t=TYPES[P.type],k=P.type;useTemplate(t.tpl);P.type=k;var f=FORMATS[t.fmt];if(f&&(f[0]!==P.w||f[1]!==P.h))reflowProject(P,f[0],f[1]);commit();afterProjectChange();toast('Modelo de '+t.name.toLowerCase()+' aplicado. Dá para desfazer.')};
function applyTypeUI(){
  var t=TYPES[P.type]||TYPES.explainer;$('#typeChip').textContent=t.name;
  var q=t.add.filter(function(k){return KD[k]&&k!=='image'&&k!=='video'}).slice(0,2);
  $('#quickAdd').innerHTML=q.map(function(k){return '<button class="ghost" data-qadd="'+k+'" title="Adicionar '+KNAME[k].toLowerCase()+'" aria-label="Adicionar '+KNAME[k].toLowerCase()+'">'+IC[k]+'</button>'}).join('');
}
$('#quickAdd').addEventListener('click',function(e){var b=e.target.closest('[data-qadd]');if(b)addEl(b.dataset.qadd)});
$('#typeChip').addEventListener('click',function(e){e.stopPropagation();setTab('style')});

handlers.parp=function(b,e,sc){var k=b.dataset.k,p=sc.par;Object.assign(p,{on:true},k==='push'?{x:0,y:0,z:.12}:k==='slide'?{x:160,y:0,z:.04}:k==='rise'?{x:0,y:-110,z:.05}:{x:60,y:-40,z:.2});commit();renderPanel();seek(sceneStart(selScene)+sc.dur*.8)};

/* =========================================================
   Assets com IA: pacote de prompts para ChatGPT / Gemini
   ========================================================= */
var GENS={chatgpt:'ChatGPT',gemini:'Gemini',other:'Outro gerador'};
function aiCfg(){if(!isObj(P.ai))P.ai={};var a=P.ai;a.gen=GENS[a.gen]?a.gen:'chatgpt';if(typeof a.style!=='string')a.style='';if(typeof a.subject!=='string')a.subject='';if(!Array.isArray(a.pack))a.pack=[];return a}
function defaultStyle(){var t=TYPES[P.type]||TYPES.explainer,th=P.theme;return 'Ilustração digital limpa e moderna, iluminação suave, paleta com fundo '+th.bg+', destaque '+th.accent+' e tons de '+th.ink+'. Sem texto, sem letras, sem marcas d\'água. Estilo consistente entre todas as imagens.'}
function sizeHint(gen){var ar=PW/PH,o=ar>1.2?'horizontal 16:9':ar<.85?'vertical 9:16':'quadrado 1:1';return o}
function basicPack(){
  var a=aiCfg(),st=a.style||defaultStyle(),subj=a.subject||'o produto ou personagem principal do vídeo',ori=sizeHint(a.gen),out=[];
  var tr=a.gen==='gemini'?' Exporte em PNG com fundo transparente (canal alfa), sem sombra no chão.':' Gere em PNG com fundo transparente.';
  P.scenes.forEach(function(sc,i){
    var n=i+1,txt=sc.els.filter(function(e){return e.kind==='text'}).map(function(e){return sub(e.text)}).join(' / ').slice(0,160),ctxt=(sc.notes||sc.name)+(txt?' (texto na tela: '+txt+')':'');
    out.push({file:'c'+n+'_fundo.png',role:'Fundo da cena '+n,prompt:'Imagem '+ori+' de fundo para a cena "'+sc.name+'" de um vídeo animado. Contexto: '+ctxt+'. Deixe o centro mais limpo para receber texto e objetos por cima. Sem pessoas em primeiro plano. '+st});
    if(['ad','collage','social','logo'].indexOf(P.type)>=0||sc.els.some(function(e){return e.kind==='image'||e.kind==='sprite'}))
      out.push({file:'c'+n+'_objeto.png',role:'Objeto principal da cena '+n,prompt:subj+', recortado e inteiro no quadro, vista de 3/4, pronto para ser animado em camadas. '+st+tr});
  });
  if(P.type==='collage'||P.type==='social'){out.push({file:'c1_sprite_4x2.png',role:'Folha de sprites (8 poses)',prompt:'Folha de sprites com 8 quadros em grade de 4 colunas e 2 linhas, mesmo tamanho de célula, mostrando '+subj+' em um ciclo de movimento (por exemplo, caminhando), mesma escala e posição dentro de cada célula, sem cortes entre células. '+st+tr})}
  out.push({file:'c1_textura.png',role:'Textura de papel ou grão (opcional)',prompt:'Textura '+ori+' sutil de papel com grão fino, cinza neutro uniforme, sem objetos, para sobrepor em um vídeo. Imagem sem bordas e sem vinheta.'});
  return out;
}
function panelAssets(pane){
  var a=aiCfg(),h='';
  h+='<p class="info">Eu escrevo os prompts, você gera as imagens no '+GENS[a.gen]+' e solta todas de uma vez no palco ou em Mídia. Os nomes dos arquivos dizem para onde cada uma vai.</p>';
  h+='<label class="frow"><span>Gerador</span><select data-o="ai" data-p="gen">'+Object.keys(GENS).map(function(k){return '<option value="'+k+'"'+(a.gen===k?' selected':'')+'>'+GENS[k]+'</option>'}).join('')+'</select></label>';
  h+='<label class="f"><span>Estilo visual (vale para todas as imagens)</span><textarea rows="3" data-o="ai" data-p="style" placeholder="'+esc(defaultStyle())+'">'+esc(a.style)+'</textarea></label>';
  h+='<label class="f"><span>Personagem ou produto principal</span><textarea rows="2" data-o="ai" data-p="subject" placeholder="Ex.: uma garrafa de café gelado de vidro âmbar com rótulo laranja">'+esc(a.subject)+'</textarea></label>';
  h+='<div class="btnrow"><button class="btn sm" data-act="refvid">'+IC.video+'Recriar de um vídeo de referência…</button></div>';
  h+='<div class="btnrow">'+(CAP.sample?'<button class="btn sm accent" data-act="packai" id="packAiBtn">'+IC.spark+'Gerar pacote com o Claude</button>':'')+'<button class="btn sm" data-act="packbasic">Pacote básico</button></div>';
  if(a.pack.length){
    h+='<div class="sh">'+a.pack.length+' imagens<button class="linkbtn" data-act="packcopyall">Copiar todos</button></div>';
    a.pack.forEach(function(it,i){h+='<div class="item"><div class="meta"><code>'+esc(it.file)+'</code><span>· '+esc(it.role||'')+'</span></div><p style="font-size:12.5px">'+esc(it.prompt)+'</p><div class="btnrow"><button class="btn sm" data-act="packcopy" data-i="'+i+'">'+IC.copy+'Copiar prompt</button></div></div>'});
    h+='<div class="btnrow"><button class="btn sm primary" data-act="packimport">'+IC.plus+'Importar imagens geradas</button></div>';
  }
  h+='<details class="grp"><summary>Como pedir no '+GENS[a.gen]+'</summary><div class="gb"><p class="info">1. Gere a primeira imagem e anexe-a nas próximas pedindo "mesmo estilo e mesmas cores", para manter a consistência.</p><p class="info">2. Para objetos, peça <b>PNG com fundo transparente</b>. Se vier com fundo, me mande aqui no chat que eu recorto.</p><p class="info">3. Para sprites, peça uma grade uniforme (ex.: 4×2) e mantenha o nome com o tamanho: <code>c2_sprite_4x2.png</code>.</p><p class="info">4. Salve com o nome sugerido e solte todos os arquivos juntos no palco.</p></div></details>';
  pane.innerHTML=h;
}
pane.addEventListener('input',function(ev){var x=ev.target;if(x.dataset&&x.dataset.o==='ai'){aiCfg()[x.dataset.p]=x.value}});
pane.addEventListener('change',function(ev){var x=ev.target;if(x.dataset&&x.dataset.o==='ai'){aiCfg()[x.dataset.p]=x.value;commit();if(x.dataset.p==='gen')renderPanel()}});
function copyText(t,msg){if(navigator.clipboard)navigator.clipboard.writeText(t).then(function(){toast(msg||'Copiado.')}).catch(function(){toast('Não foi possível copiar. Selecione o texto e copie manualmente.')});else toast('Selecione o texto e copie manualmente.')}
handlers.packbasic=function(){aiCfg().pack=basicPack();commit();renderPanel()};
handlers.packcopy=function(b){var it=aiCfg().pack[+b.dataset.i];if(it)copyText(it.prompt,'Prompt copiado. Salve a imagem como '+it.file+'.')};
handlers.packcopyall=function(){copyText(aiCfg().pack.map(function(it){return it.file+'\n'+it.prompt}).join('\n\n'),'Todos os prompts copiados.')};
handlers.packimport=function(){$('#mediaFile').value='';mediaMode='insert';$('#mediaFile').click()};
handlers.packai=function(){
  var a=aiCfg(),btn=$('#packAiBtn');if(!CAP.sample)return;if(btn){btn.disabled=true;btn.innerHTML=IC.spark+'Escrevendo prompts…'}
  var t=TYPES[P.type]||TYPES.explainer,sum=P.scenes.map(function(s,i){return 'Cena '+(i+1)+' "'+s.name+'" ('+fmtS(s.dur)+'): '+(s.notes||'')+' | textos: '+s.els.filter(function(e){return e.kind==='text'}).map(function(e){return sub(e.text)}).join(' / ').slice(0,200)}).join('\n');
  var q='Você é diretor de arte de motion design. Escreva prompts de geração de imagem para o '+GENS[a.gen]+' que serão animados em camadas num vídeo do tipo "'+t.name+'" no formato '+PW+'x'+PH+'. Regras: um prompt por arquivo; fundos sem texto e com área limpa para tipografia; objetos e personagens SEMPRE pedidos como PNG com fundo transparente; quando fizer sentido, inclua uma folha de sprites em grade uniforme (indique colunas x linhas no nome, ex.: c2_sprite_4x2.png) ou camadas de frente para parallax (c2_frente.png); estilo idêntico entre todas as imagens. Use nomes de arquivo no padrão c<número da cena>_<papel>.png com papel = fundo, objeto, frente, textura ou sprite_<col>x<lin>. Português do Brasil. Responda só com JSON: {"items":[{"file":"c1_fundo.png","role":"descrição curta","prompt":"..."}]}.\n\nEstilo: '+(a.style||defaultStyle())+'\nPersonagem/produto: '+(a.subject||'não informado')+'\nRoteiro:\n'+sum;
  CAP.sample.json(q,{modelTier:'default',cache:false}).then(function(r){var items=(r&&Array.isArray(r.items)?r.items:[]).filter(function(x){return x&&x.file&&x.prompt}).slice(0,40).map(function(x){return {file:String(x.file).slice(0,60),role:String(x.role||'').slice(0,80),prompt:String(x.prompt).slice(0,1500)}});
    if(!items.length)throw {code:'invalid_json'};a.pack=items;commit();renderPanel();toast(items.length+' prompts prontos.')})
  .catch(function(e){toast(SAMPLE_ERR[e&&e.code]||'Não foi possível gerar agora. Use o pacote básico.');if(btn){btn.disabled=false;btn.innerHTML=IC.spark+'Gerar pacote com o Claude'}});
};

/* ---------- extras de shader e 3D ---------- */
function shaderExtras(e){
  var code=e.code||'',base=(SHADERS[e.preset]||SHADERS.fluid).code,err=code.trim()?shaderError(code):'';
  var h='<div class="btnrow"><button class="btn sm" data-act="repl">'+(e.src?'Trocar imagem':'Usar uma imagem')+'</button>'+(e.src?'<button class="btn sm" data-act="shnoimg">Tirar imagem</button>':'')+'</div>';
  h+='<details class="grp"'+(code?' open':'')+'><summary>Código GLSL</summary><div class="gb">';
  h+='<p class="info">Formato Shadertoy: <code>void mainImage(out vec4 o, in vec2 fc)</code>. Disponíveis: iTime, iResolution, uC1, uC2, uC3 (cores), uI (intensidade), iChannel0 (imagem) e uHasTex.</p>';
  h+='<textarea class="code" id="shcode" rows="12" spellcheck="false">'+esc(code||base)+'</textarea>';
  h+=err?'<p class="info" style="color:#e5484d">'+esc(err)+'</p>':'';
  h+='<div class="btnrow"><button class="btn sm" data-act="shapply">Aplicar código</button>'+(code?'<button class="btn sm" data-act="shreset">Voltar ao efeito pronto</button>':'')+'</div>';
  h+='<p class="info">Peça no chat: "crie um shader de fumaça roxa" e eu escrevo o código.</p></div></details>';
  return h;
}
function threeExtras(e){
  var h='';
  if(e.mode==='model')h+='<div class="btnrow"><button class="btn sm" data-act="repl">'+(e.src?'Trocar modelo':'Escolher modelo .glb')+'</button></div><p class="info">Modelos .glb até 20 MB. Dá para gerar grátis em sites de imagem para 3D ou baixar de bancos como Poly Pizza e Sketchfab.</p>';
  if(e.mode==='cards'){h+='<div class="btnrow"><button class="btn sm" data-act="repl">Adicionar imagem</button>'+((e.images||[]).length?'<button class="btn sm" data-act="t3clear">Limpar imagens</button>':'')+'</div><p class="info">'+((e.images||[]).length||0)+' imagem(ns) no carrossel. Use Giro para fazer girar.</p>'}
  return h;
}
