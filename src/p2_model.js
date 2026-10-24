"use strict";
/* =========================================================
   Utilitários
   ========================================================= */
var $=function(s){return document.querySelector(s)};
var $$=function(s){return Array.prototype.slice.call(document.querySelectorAll(s))};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})};
var clone=function(o){return o==null?o:JSON.parse(JSON.stringify(o))};
var clamp=function(x,a,b){return Math.min(b,Math.max(a,x))};
var lerp=function(a,b,f){return a+(b-a)*f};
var norm=function(s){return String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'')};
var isObj=function(o){return o!==null&&typeof o==='object'&&!Array.isArray(o)};
function nid(p){return (p||'e')+Math.random().toString(36).slice(2,9)}
function fmtT(x){x=Math.max(0,x||0);var m=Math.floor(x/60),s=x-m*60;return m+':'+(s<10?'0':'')+s.toFixed(1)}
function fmtS(x){return (Math.round(x*10)/10).toLocaleString('pt-BR',{maximumFractionDigits:1})+' s'}
function slug(s){return norm(s).replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40)||'motion'}
var nfc={};
function fmt(v,d){d=clamp(d|0,0,4);if(!nfc[d])nfc[d]=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});return nfc[d].format(v)}
function sleep(ms){return new Promise(function(r){setTimeout(r,ms)})}

/* ---------- ícones ---------- */
function ic(p){return '<svg class="i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+p+'</svg>'}
var IC={
  undo:ic('<path d="M9 14 4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>'),
  redo:ic('<path d="M15 14l5-5-5-5M20 9H10a6 6 0 0 0 0 12h3"/>'),
  up:ic('<path d="M12 19V5M5 12l7-7 7 7"/>'),down:ic('<path d="M12 5v14M19 12l-7 7-7-7"/>'),
  left:ic('<path d="M19 12H5M12 5l-7 7 7 7"/>'),right:ic('<path d="M5 12h14M12 5l7 7-7 7"/>'),
  folder:ic('<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>'),
  template:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11"/>'),
  copy:ic('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
  trash:ic('<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>'),
  plus:ic('<path d="M12 5v14M5 12h14"/>'),
  loop:ic('<path d="M17 2l4 4-4 4M3 11V9a3 3 0 0 1 3-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 0 1-3 3H3"/>'),
  start:ic('<path d="M6 5v14"/><path d="M19 5l-10 7 10 7z" fill="currentColor"/>'),
  play:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>',
  pause:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
  stop:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/></svg>',
  share:ic('<path d="M4 12v7h16v-7M12 3v12M7 8l5-5 5 5"/>'),
  dl:ic('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'),
  send:ic('<path d="M12 19V5M5 12l7-7 7 7"/>'),
  spark:ic('<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4"/>'),
  x:ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  cursor:ic('<path d="M5 3l14 8-6 2-2 6z"/>'),
  comment:ic('<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.7A8 8 0 1 1 21 12z"/>'),
  text:ic('<path d="M5 6V4h14v2M12 4v16M9 20h6"/>'),
  shape:ic('<rect x="4" y="4" width="16" height="16" rx="3"/>'),
  image:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/>'),
  video:ic('<rect x="3" y="5" width="13" height="14" rx="2"/><path d="M16 10l5-3v10l-5-3z"/>'),
  audio:ic('<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>'),
  media:ic('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M8 3v18M16 3v18M3 8h5M3 16h5M16 8h5M16 16h5"/>'),
  chart:ic('<path d="M5 20V10M12 20V4M19 20v-7"/>'),
  counter:ic('<path d="M8 4 6 20M18 4l-2 16M4 9h17M3 15h17"/>'),
  sliders:ic('<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>'),
  brand:ic('<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.9 1.2-1.8-.5-1-.1-2.2 1.1-2.2H17a4 4 0 0 0 4-4c0-5.5-4-10-9-10z"/><circle cx="7.5" cy="11" r="1.2"/><circle cx="10.5" cy="7" r="1.2"/><circle cx="15.5" cy="7.5" r="1.2"/>'),
  data:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
  check:ic('<path d="M12 3l8 3v6c0 4.5-3.4 8.2-8 9-4.6-.8-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>'),
  history:ic('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
  code:ic('<path d="M8 6l-6 6 6 6M16 6l6 6-6 6"/>'),
  clip:ic('<path d="M21 11.5l-8.6 8.6a5 5 0 0 1-7.1-7.1l8.6-8.6a3.5 3.5 0 0 1 5 5l-8.6 8.6a2 2 0 0 1-2.8-2.8l8-8"/>'),
  magnet:ic('<path d="M6 3v8a6 6 0 0 0 12 0V3M6 7h4M14 7h4"/>'),
  eye:ic('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  wand:ic('<path d="M15 4V2M15 10V8M11 6h2M17 6h2M4 20l10-10"/><path d="M18 14l1.5 1.5M20 12h0"/>'),
  dots:'<svg class="i" viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/></svg>',
  lock:ic('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
  expand:ic('<path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/>'),
  shrink:ic('<path d="M10 4v6H4M14 20v-6h6M4 10l7-7M20 14l-7 7"/>'),
  close:ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  chev:ic('<path d="M6 9l6 6 6-6"/>'),
  chevl:ic('<path d="M15 6l-6 6 6 6"/>'),chevr:ic('<path d="M9 6l6 6-6 6"/>'),
  vol:ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  mute:ic('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M17 9l5 6M22 9l-5 6"/>'),
  layers:ic('<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>'),
  full:ic('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  restart:ic('<path d="M4 4v6h6"/><path d="M5.5 15a7 7 0 1 0 1.6-7.3L4 10"/>'),
  tweak:ic('<path d="M6 4v10M6 18v2M18 4v4M18 12v8M12 4v2M12 10v10"/><circle cx="6" cy="16" r="2"/><circle cx="18" cy="10" r="2"/><circle cx="12" cy="8" r="2"/>'),
  sidebar:ic('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
  sprite:ic('<rect x="3" y="6" width="5" height="12" rx="1"/><rect x="9.5" y="6" width="5" height="12" rx="1"/><rect x="16" y="6" width="5" height="12" rx="1"/>'),
  svg:ic('<path d="M4 19c4-1 5-12 9-13s4 7 7 6"/><circle cx="4" cy="19" r="1.5"/><circle cx="20" cy="12" r="1.5"/>'),
  lottie:ic('<path d="M6 18c6 0 4-12 12-12"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/>'),
  shader:ic('<circle cx="12" cy="12" r="9"/><path d="M3 12c3-3 6 3 9 0s6 3 9 0"/>'),
  three:ic('<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/>'),
  particles:ic('<circle cx="6" cy="7" r="1.6"/><circle cx="17" cy="5" r="1.2"/><circle cx="12" cy="12" r="2"/><circle cx="5" cy="17" r="1.2"/><circle cx="18" cy="17" r="1.6"/>'),
  pattern:ic('<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 12a9 9 0 0 1 9-9M12 21a9 9 0 0 1 9-9"/><circle cx="16" cy="8" r="1.5"/><circle cx="8" cy="16" r="1.5"/>'),
  hud:ic('<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>'),
  users:ic('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>')
};
var KNAME={text:'Texto',shape:'Forma',image:'Imagem',video:'Vídeo',chart:'Gráfico',counter:'Contador',sprite:'Sprite',svg:'Vetor (SVG)',lottie:'Lottie',shader:'Shader',three:'3D',particles:'Partículas',pattern:'Padrão',hud:'HUD'};

/* =========================================================
   Curvas de aceleração (incluindo bézier personalizada)
   ========================================================= */
function cubicBezier(x1,y1,x2,y2){
  function bx(t){return 3*(1-t)*(1-t)*t*x1+3*(1-t)*t*t*x2+t*t*t}
  function by(t){return 3*(1-t)*(1-t)*t*y1+3*(1-t)*t*t*y2+t*t*t}
  function dx(t){return 3*(1-t)*(1-t)*x1+6*(1-t)*t*(x2-x1)+3*t*t*(1-x2)}
  return function(x){
    if(x<=0)return 0;if(x>=1)return 1;
    var t=x;for(var i=0;i<8;i++){var d=dx(t);var e=bx(t)-x;if(Math.abs(e)<1e-5)break;if(Math.abs(d)<1e-6)break;t-=e/d}
    if(t<0||t>1){var lo=0,hi=1;t=x;for(var j=0;j<30;j++){var v=bx(t);if(Math.abs(v-x)<1e-5)break;if(v<x)lo=t;else hi=t;t=(lo+hi)/2}}
    return by(t);
  };
}
var E={linear:function(x){return x},out:function(x){return 1-Math.pow(1-x,3)},outq:function(x){return 1-Math.pow(1-x,5)},
  'in':function(x){return x*x*x},inout:function(x){return x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2},
  back:function(x){var c=2.70158;return 1+c*Math.pow(x-1,3)+(c-1)*Math.pow(x-1,2)},
  elastic:function(x){if(x===0||x===1)return x;return Math.pow(2,-10*x)*Math.sin((x*10-.75)*(2*Math.PI)/3)+1},
  hold:function(x){return x<1?0:1},
  snap:function(x){return 1-Math.pow(1-x,8)}};
var CB_CACHE={};
var EASE_BEZ={linear:[0,0,1,1],out:[.215,.61,.355,1],outq:[.23,1,.32,1],'in':[.55,.055,.675,.19],inout:[.645,.045,.355,1],back:[.34,1.56,.64,1]};
function easeFn(name){
  if(!name)return E.out;if(E[name])return E[name];
  var m=String(name).match(/^cb\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
  if(m){if(!CB_CACHE[name])CB_CACHE[name]=cubicBezier(clamp(+m[1],0,1),+m[2],clamp(+m[3],0,1),+m[4]);return CB_CACHE[name]}
  return E.out;
}
function easeBez(name){
  if(EASE_BEZ[name])return EASE_BEZ[name].slice();
  var m=String(name||'').match(/^cb\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)$/);
  return m?[+m[1],+m[2],+m[3],+m[4]]:EASE_BEZ.inout.slice();
}
function prog(lt,delay,dur,fn){return (fn||E.out)(clamp((lt-delay)/dur,0,1))}

/* =========================================================
   Cores
   ========================================================= */
var THEMES={
  papel:{name:'Papel',bg:'#EFEAE1',ink:'#1E1B17',accent:'#B54E2A',on:'#FFF6EE'},
  grafite:{name:'Grafite',bg:'#17191C',ink:'#F1EEE8',accent:'#E58A5F',on:'#17191C'},
  oceano:{name:'Oceano',bg:'#0E2B3B',ink:'#E8F2F4',accent:'#5FCDBE',on:'#0E2B3B'},
  musgo:{name:'Musgo',bg:'#E2E7DA',ink:'#1B2A1E',accent:'#2F6F45',on:'#EEF5EA'},
  neon:{name:'Noturno',bg:'#0D0B1A',ink:'#F4F1FF',accent:'#B9F227',on:'#0D0B1A'},
  coral:{name:'Coral',bg:'#FFF4EE',ink:'#2A1A14',accent:'#FF5A4E',on:'#1F120D'}
};
var TOK={'@bg':'Fundo','@ink':'Texto','@accent':'Destaque','@on':'Sobre destaque','@muted':'Texto suave'};
var FORMATS={'16:9':[1280,720],'1:1':[1080,1080],'4:5':[1024,1280],'9:16':[720,1280]};
function hexA(h,a){var n=parseInt(toHex(h).slice(1),16);return 'rgba('+(n>>16&255)+','+(n>>8&255)+','+(n&255)+','+a+')'}
function toHex(c){
  c=String(c||'');
  if(/^#[0-9a-f]{6}$/i.test(c))return c.toUpperCase();
  if(/^#[0-9a-f]{3}$/i.test(c))return ('#'+c[1]+c[1]+c[2]+c[2]+c[3]+c[3]).toUpperCase();
  var m=c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if(m)return '#'+[m[1],m[2],m[3]].map(function(x){return ('0'+(+x).toString(16)).slice(-2)}).join('').toUpperCase();
  return '#000000';
}
function rgb(h){var n=parseInt(toHex(h).slice(1),16);return [n>>16&255,n>>8&255,n&255]}
function mixHex(a,b,f){var A=rgb(a),B=rgb(b);return '#'+[0,1,2].map(function(i){return ('0'+Math.round(lerp(A[i],B[i],f)).toString(16)).slice(-2)}).join('')}
function lum(h){var c=rgb(h).map(function(v){v/=255;return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4)});return .2126*c[0]+.7152*c[1]+.0722*c[2]}
function contrast(a,b){var la=lum(a),lb=lum(b);return (Math.max(la,lb)+.05)/(Math.min(la,lb)+.05)}

/* =========================================================
   Modelo: elementos, cenas, projeto
   ========================================================= */
var ANIMATABLE=['x','y','w','h','rot','scale','opacity','maskP','rx3','ry3','dist3','sx','sy','morph','prog','rgb','glitch','jit'];
var MASKS=[['none','Sem máscara'],['rect','Retângulo'],['round','Retângulo arredondado'],['ellipse','Elipse'],['circle','Círculo do centro'],['wipe-l','Cortina da esquerda'],['wipe-r','Cortina da direita'],['wipe-u','Cortina de baixo para cima'],['wipe-d','Cortina de cima para baixo']];
var BLENDS=[['normal','Normal'],['multiply','Multiplicar'],['screen','Tela'],['overlay','Sobrepor'],['soft-light','Luz suave'],['hard-light','Luz forte'],['darken','Escurecer'],['lighten','Clarear'],['color-dodge','Subexposição de cor'],['difference','Diferença']];
var TYPES={
  explainer:{name:'Explicativo',fmt:'16:9',add:['text','chart','counter','shape'],tpl:'quarter',sugg:['Os resultados do trimestre para a reunião geral','Como funciona o nosso onboarding, em três etapas','Explique em 30 segundos o que a nossa empresa faz'],hint:'Explicativo ou apresentação: uma ideia por cena, gráficos e números com contagem, ritmo calmo, texto curto.'},
  ad:{name:'Anúncio de produto',fmt:'1:1',add:['image','text','shape','counter','lottie'],tpl:'promo',sugg:['Anúncio de 15 segundos para o nosso novo tênis de corrida','Promoção relâmpago com 30% de desconto','Lançamento de um app de finanças'],hint:'Anúncio: gancho forte no primeiro segundo, produto em destaque (PNG transparente com parallax), benefício, oferta e chamada para ação no final.'},
  social:{name:'Redes sociais',fmt:'9:16',add:['text','video','image','lottie','sprite'],tpl:'promo',sugg:['Reels de 20 segundos com 3 dicas de produtividade','Gancho + lista rápida para TikTok','Bastidores da equipe em 15 segundos'],hint:'Redes sociais vertical (9:16): gancho nos 2 primeiros segundos, texto grande e centralizado longe das bordas, cortes rápidos no ritmo da trilha, 15 a 30 segundos.'},
  collage:{name:'Motion com imagens',fmt:'16:9',add:['image','sprite','svg','lottie','shader','shape','text'],tpl:'promo',sugg:['Colagem animada apresentando uma marca de café','Cena com parallax de uma cidade à noite','Personagem em sprite atravessando a tela'],hint:'Motion com imagens: camadas PNG transparentes com profundidade (parallax), máscaras, sprites e texturas; movimento de câmera em quase toda cena.'},
  kinetic:{name:'Texto cinético',fmt:'9:16',add:['text','shape'],tpl:'promo',sugg:['Frase motivacional animada palavra por palavra','Manifesto da marca em texto cinético','Contagem regressiva para um lançamento'],hint:'Texto cinético: poucas palavras por vez, animação por letra ou palavra (chars, words, blur), tamanhos grandes, cortes sincronizados com as batidas.'},
  data:{name:'Dados',fmt:'16:9',add:['chart','counter','text'],tpl:'quarter',sugg:['Crescimento de usuários nos últimos 6 meses','Comparativo de vendas por região','Indicadores do ano em 30 segundos'],hint:'Dados: um gráfico ou número por cena, contadores, unidades claras, destaque de cor para o ponto principal.'},
  logo:{name:'Logo e vinheta',fmt:'16:9',add:['svg','image','shader','three','lottie','shape','text'],tpl:'promo',sugg:['Revelação de 5 segundos do nosso logo','Vinheta de abertura para um podcast','Assinatura de fim de vídeo com logo e site'],hint:'Logo e vinheta: 3 a 8 segundos, revelação com máscara ou desenho de traço, brilho, fundo limpo, final parado com o logo.'},
  three:{name:'3D e abstrato',fmt:'16:9',add:['three','shader','text','shape'],tpl:'promo',sugg:['Fundo abstrato animado para uma apresentação','Produto girando em 3D com luz de estúdio','Título 3D sobre gradiente fluido'],hint:'3D e abstrato: camadas 3D e shaders, movimento contínuo de câmera, cores do tema, texto curto por cima.'},
  tutorial:{name:'Tutorial de tela',fmt:'16:9',add:['video','shape','text'],tpl:'onboarding',sugg:['Tutorial de 60 segundos mostrando um recurso do app','Passo a passo com zoom nos cliques','Lançamento de funcionalidade com gravação de tela'],hint:'Tutorial de tela: gravação de tela como vídeo, zoom na área importante (câmera), destaques com formas e setas, legendas curtas por passo.'},
  edit:{name:'Edição de vídeo',fmt:'16:9',add:['video','text','image'],tpl:'promo',sugg:['Corte os melhores momentos dos meus vídeos em 30 segundos','Vlog com títulos e legendas','Depoimento de cliente com lower third'],hint:'Edição de vídeo: clipes de vídeo com cortes, velocidade, ajustes de cor, títulos e legendas, trilha com volume equilibrado.'}
};
function defFx(){return {blur:0,bright:1,contrast:1,sat:1,hue:0,shadow:0,shadowColor:'#000000',glow:0,glowColor:'@accent',mblur:0}}
var KD={
  text:{w:600,h:0,text:'Texto',size:48,weight:500,font:'display',color:'@ink',align:'left',upper:false,spacing:0,anim:{in:'rise'}},
  shape:{shape:'rect',w:240,h:140,fill:'@accent',stroke:'',strokeW:2,radius:0,anim:{in:'fade'}},
  image:{w:420,h:300,src:'',fit:'cover',radius:0,anim:{in:'fade'}},
  video:{w:640,h:360,src:'',fit:'cover',radius:0,mediaStart:0,vol:1,muted:false,loop:false,rate:1,ramp:'none',anim:{in:'fade'}},
  chart:{type:'hbar',w:760,h:320,data:[{label:'A',value:5},{label:'B',value:3},{label:'C',value:2}],color:'@accent',textColor:'@ink',size:26,unit:'',showValues:true,anim:{in:'grow',t:1.2}},
  sprite:{w:360,h:360,src:'',frames:[],cols:4,rows:1,count:0,fps:12,speed:1,mode:'loop',fit:'contain',flip:false,anim:{in:'fade'}},
  svg:{w:420,h:420,src:'',draw:true,drawT:1.6,strokeColor:'',strokeScale:1,anim:{in:'none'}},
  lottie:{w:420,h:420,src:'',speed:1,loop:true,fit:'contain',anim:{in:'fade'}},
  shader:{w:1280,h:720,preset:'fluid',code:'',c1:'@accent',c2:'@bg',c3:'@ink',speed:1,intensity:1,offset:0,res:1,src:'',anim:{in:'fade'}},
  three:{w:720,h:520,mode:'object',shape:'torusKnot',text:'3D',color:'@accent',metal:.35,rough:.3,wire:false,src:'',images:[],light:'studio',spin:.5,orbit:0,rx3:-12,ry3:0,dist3:5,camY:0,depth3:.5,font:'ui',anim:{in:'fade'}},
  particles:{w:1280,h:720,x:0,y:0,mode:'burst',count:90,seed:1,colors:['@accent','@ink','#F5D03B','#2CE0C4'],shapes:['circle','square','tri','ring','cross'],size:14,speed:1,gravity:0,drag:2.2,spin:2,life:2.4,delay:0,spread:360,dir:0,streak:true,tilt:18,anim:{in:'none'}},
  pattern:{w:1280,h:720,x:0,y:0,mode:'memphis',cols:14,seed:3,colors:['@accent','#F5D03B','#2CE0C4','#5B3BF5','#111111'],bg2:'',prog:1,swap:0,gap:32,dot:1.6,twinkle:false,ox:.5,oy:.5,anim:{in:'none'}},
  hud:{w:1280,h:720,x:0,y:0,color:'@ink',text1:'CLAUDE MOTION / 2026',text2:'',text3:'',fps:30,anim:{in:'fade'}},
  counter:{w:700,h:0,from:0,to:100,decimals:0,prefix:'',suffix:'',size:160,font:'display',weight:500,color:'@ink',align:'left',anim:{in:'grow',t:1.6,ease:'outq'}}
};
function el(kind,o){
  o=o||{};var k=KD[kind]||{};
  var a=Object.assign({in:'fade',out:'none',t:.6,ease:'out'},clone(k.anim||{}),o.anim||{});
  var r=Object.assign({id:nid(),kind:kind,name:'',x:0,y:0,w:300,h:0,start:0,dur:0,opacity:1,rot:0,scale:1,sx:1,sy:1,kf:{},blend:'normal',mask:'none',maskInv:false,maskP:1,matte:'',matteInv:false,parent:'',depth:0},clone(k),o);
  r.anim=a;delete r.anim.undefined;r.fx=Object.assign(defFx(),isObj(o.fx)?o.fx:{});return r;
}
function normKf(kf){
  var out={};if(!isObj(kf))return out;
  ANIMATABLE.forEach(function(p){
    var arr=kf[p];if(!Array.isArray(arr))return;
    arr=arr.filter(function(k){return k&&isFinite(+k.t)&&isFinite(+k.v)}).map(function(k){return {t:Math.max(0,Math.round(+k.t*100)/100),v:+k.v,e:k.e||'inout'}});
    arr.sort(function(a,b){return a.t-b.t});
    if(arr.length)out[p]=arr;
  });
  return out;
}
function normEl(e){
  if(!e||!KD[e.kind])return null;
  var r=el(e.kind,e);r.id=(typeof e.id==='string'&&e.id)?e.id:nid();
  ['x','y','w','h','start','dur','opacity','rot','scale','sx','sy'].forEach(function(k){r[k]=+r[k];if(!isFinite(r[k]))r[k]=el(e.kind)[k]||0});if(!r.sx)r.sx=1;if(!r.sy)r.sy=1;
  r.opacity=clamp(r.opacity,0,1);if(!r.scale)r.scale=1;
  r.anim.t=Math.max(.05,+r.anim.t||.6);
  r.kf=normKf(e.kf);
  var dfx=defFx();Object.keys(dfx).forEach(function(k){if(typeof dfx[k]==='number'){r.fx[k]=+r.fx[k];if(!isFinite(r.fx[k]))r.fx[k]=dfx[k]}});
  r.maskP=clamp(isFinite(+r.maskP)?+r.maskP:1,0,1);if(!MASKS.some(function(m){return m[0]===r.mask}))r.mask='none';if(!BLENDS.some(function(m){return m[0]===r.blend}))r.blend='normal';
  if(r.kind==='video'){r.rate=clamp(+r.rate||1,.1,8)}
  if(r.kind==='three'){r.images=Array.isArray(r.images)?r.images.filter(function(x){return typeof x==='string'}).slice(0,12):[];if(['object','text','cards','model'].indexOf(r.mode)<0)r.mode='object'}
  if(r.kind==='shader'){r.code=typeof r.code==='string'?r.code.slice(0,20000):'';if(!SHADERS[r.preset])r.preset='fluid'}
  r.depth=clamp(+r.depth||0,0,1);if(r.kind==='sprite'&&!Array.isArray(r.frames))r.frames=[];
  if(r.kind==='chart'){if(!Array.isArray(r.data)||!r.data.length)r.data=clone(KD.chart.data);r.data=r.data.slice(0,24).map(function(d){return {label:String(d&&d.label!=null?d.label:''),value:(d&&typeof d.value==='string'&&d.value.indexOf('{{')>=0)?d.value:(+((d||{}).value)||0)}})}
  return r;
}
function defCam(){return {on:false,z0:1,x0:.5,y0:.5,z1:1.12,x1:.5,y1:.5,ease:'inout'}}
function scene(name,dur,els,o){return Object.assign({id:nid('s'),name:name,dur:dur,bg:'@bg',trans:'wipe',cam:defCam(),els:els},o||{})}
function normScene(s,i){
  s=isObj(s)?s:{};
  var r={id:(typeof s.id==='string'&&s.id)?s.id:nid('s'),name:String(s.name||('Cena '+(i+1))),dur:clamp(+s.dur||5,.5,120),bg:s.bg||'@bg',
    notes:String(s.notes||''),par:Object.assign({on:false,x:120,y:0,z:.08,ease:'inout'},isObj(s.par)?s.par:{}),fx:Object.assign({grain:0,vignette:0},isObj(s.fx)?s.fx:{}),trans:['wipe','fade','slide','magic','none','sh-noise','sh-pixel','sh-radial','sh-zoom','sh-glitch','iris','bars','flash'].indexOf(s.trans)>=0?s.trans:'wipe',cam:Object.assign(defCam(),isObj(s.cam)?s.cam:{}),els:[]};
  ['z0','x0','y0','z1','x1','y1'].forEach(function(k){r.cam[k]=+r.cam[k];if(!isFinite(r.cam[k]))r.cam[k]=defCam()[k]});
  r.cam.on=!!r.cam.on;
  if(typeof s.ref==='string'&&s.ref.indexOf('data:image/')===0&&s.ref.length<16000)r.ref=s.ref;
  if(Array.isArray(s.tcol))r.tcol=s.tcol.slice(0,6).map(String);
  r.els=(Array.isArray(s.els)?s.els:[]).map(normEl).filter(Boolean);
  return r;
}
/* serialização compacta: omite valores iguais ao padrão de cada tipo (normProject restaura) */
var PACK_DEF={};
function packEl(e){var d=PACK_DEF[e.kind];if(!d){d=el(e.kind);PACK_DEF[e.kind]=d}var o={id:e.id,kind:e.kind};
  Object.keys(e).forEach(function(k){if(k==='id'||k==='kind')return;var v=e[k];if(v===undefined)return;
    if(k==='kf'){if(v&&Object.keys(v).length)o.kf=v;return}
    if(k==='fx'||k==='anim'){var dv=d[k]||{},sub2={};Object.keys(v||{}).forEach(function(q){if(JSON.stringify(v[q])!==JSON.stringify(dv[q]))sub2[q]=v[q]});if(Object.keys(sub2).length)o[k]=sub2;return}
    if(JSON.stringify(v)!==JSON.stringify(d[k]))o[k]=v});
  return o}
function packProject(p){var q=Object.assign({},p);q.scenes=p.scenes.map(function(s){var r=Object.assign({},s);r.els=s.els.map(packEl);return r});return JSON.stringify(q)}
function normProject(o){
  o=isObj(o)?o:{};
  var th=isObj(o.theme)?o.theme:{};var T={};
  ['bg','ink','accent','on'].forEach(function(k){T[k]=/^#[0-9a-f]{6}$/i.test(th[k]||'')?th[k]:THEMES.papel[k]});
  var p={v:3,type:TYPES[o.type]?o.type:'explainer',name:String(o.name||'Animação'),w:clamp(+o.w||1280,320,2160),h:clamp(+o.h||720,320,2160),theme:T,themeName:o.themeName||'custom',
    fonts:Object.assign({display:'Newsreader',ui:'Hanken Grotesk',custom:{}},isObj(o.fonts)?o.fonts:{}),
    vars:isObj(o.vars)?o.vars:{},
    brand:Object.assign({logo:'',logoPos:'br',logoSize:80,logoOn:false},isObj(o.brand)?o.brand:{}),
    ai:isObj(o.ai)?o.ai:{},
    media:Array.isArray(o.media)?o.media.filter(function(m){return m&&m.id&&m.src}):[],
    audio:Array.isArray(o.audio)?o.audio.filter(function(a){return a&&a.src}).map(function(a){var r=Object.assign({id:nid('a'),name:'Trilha',start:0,offset:0,vol:.8,fadeIn:.5,fadeOut:1.5,enc:'',bpm:0,beats:[],role:'music'},a);if(['music','voice','sfx'].indexOf(r.role)<0)r.role='music';return r}):[],
    captions:isObj(o.captions)?o.captions:{on:true,style:'pop',items:[]},duck:isObj(o.duck)?o.duck:{on:true,amount:.7},refGhost:!!o.refGhost,refInfo:isObj(o.refInfo)?o.refInfo:null,
    scenes:(Array.isArray(o.scenes)?o.scenes:[]).map(normScene)};
  if(!isObj(p.fonts.custom))p.fonts.custom={};
  if(!p.scenes.length)p.scenes=[normScene({name:'Cena 1',els:[{kind:'text',text:'Nova animação',x:104,y:300,w:1072,size:72}]},0)];
  return p;
}

/* ---------- variáveis {{chave}} ---------- */
function sub(s){
  s=String(s==null?'':s);if(s.indexOf('{{')<0)return s;
  var V=(P&&P.vars)||{};
  return s.replace(/\{\{\s*([\w.\-]+)\s*\}\}/g,function(m,k){return V[k]!=null&&V[k]!==''?String(V[k]):m});
}
function num(v){
  if(typeof v==='number')return v;
  var s=sub(v).trim().replace(/\s/g,'');
  if(/^-?[\d.]+,\d+$/.test(s))s=s.replace(/\./g,'').replace(',','.');
  else if(/^-?\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
  var n=parseFloat(s);return isFinite(n)?n:0;
}

/* =========================================================
   Modelos prontos (construídos com os mesmos elementos genéricos)
   ========================================================= */
function kick(text,x,y,b,name){return el('text',{name:name||'',text:text,x:x,y:y,w:900,size:20,weight:700,font:'ui',upper:true,spacing:3,color:'@muted',start:b,anim:{in:'fade'}})}
function ttl(text,b){return el('text',{name:'Título',text:text,x:104,y:96,w:1072,size:52,start:b,anim:{in:'words',t:.6}})}
function titleScene(k,h,sub_,first){
  var b=first?0:.35,hs=h.length>80?54:h.length>52?64:76;
  return scene('Abertura',6.5,[
    el('shape',{name:'Barra',x:104,y:178,w:48,h:4,fill:'@accent',start:b,anim:{in:'grow',t:.6}}),
    kick(k,168,165,b),
    el('text',{text:h,x:104,y:230,w:1050,size:hs,start:b+.15,anim:{in:'words',t:.7}}),
    el('text',{text:sub_,x:104,y:470,w:1050,size:30,font:'ui',color:'@muted',start:b+1.3})
  ],first?{trans:'none',cam:{on:true,z0:1,x0:.5,y0:.5,z1:1.05,x1:.46,y1:.48,ease:'inout'}}:{});
}
function statScene(label,prefix,to,dec,suffix,delta,note,b,opts){
  var cw=delta.replace(/\{\{[^}]+\}\}/g,'+00%').length*17+44,els=[kick(label,104,150,b),
    el('counter',{name:'Número',x:104,y:190,w:1060,size:240,from:0,to:to,decimals:dec,prefix:prefix,suffix:suffix,start:b+.1}),
    el('shape',{name:'Barra',x:104,y:480,w:560,h:6,fill:'@accent',start:b+.5,anim:{in:'grow',t:1.2,ease:'inout'}}),
    el('shape',{x:104,y:520,w:cw,h:56,fill:'@accent',radius:28,start:b+1.5,anim:{in:'scale',t:.5,ease:'back'}}),
    el('text',{text:delta,x:126,y:531,w:cw-30,size:28,weight:700,font:'ui',color:'@on',start:b+1.6,anim:{in:'fade'}})];
  if(note)els.push(el('text',{text:note,x:104,y:604,w:900,size:26,font:'ui',color:'@muted',start:b+1.9}));
  return scene('Número',5,els,opts||{});
}
function barsScene(title,unit,rows,b){
  var els=[ttl(title,b)];
  if(unit)els.push(el('text',{text:unit,x:876,y:118,w:300,size:22,weight:600,font:'ui',color:'@muted',align:'right',start:b+.4,anim:{in:'fade'}}));
  els.push(el('chart',{name:'Gráfico',type:'hbar',x:104,y:250,w:1072,h:Math.min(420,Math.max(160,rows.length*88)),data:rows,size:28,start:b+.4,anim:{in:'grow',t:1.5}}));
  return scene('Gráfico',6,els);
}
function stepsScene(title,items,b){
  var els=[ttl(title,b)],step=Math.min(96,380/Math.max(1,items.length));
  items.slice(0,6).forEach(function(it,i){
    var y=300+i*step,d=b+.4+i*.45;
    els.push(el('shape',{shape:'ellipse',x:104,y:y-24,w:48,h:48,fill:'@accent',start:d,anim:{in:'scale',t:.5,ease:'back'}}));
    els.push(el('text',{text:String(i+1),x:104,y:y-16,w:48,size:24,weight:700,font:'ui',color:'@on',align:'center',start:d,anim:{in:'scale',t:.5,ease:'back'}}));
    els.push(el('text',{text:it,x:184,y:y-24,w:980,size:40,start:d+.1,anim:{in:'left',t:.6}}));
  });
  return scene('Passos',Math.round((2+items.length*1.6+1.5)*10)/10,els);
}
function cardsScene(title,cards,hl,b){
  var els=[ttl(title,b)],n=Math.min(4,cards.length),gap=28,cw=(1072-gap*(n-1))/n;
  cards.slice(0,4).forEach(function(c,i){
    var x=104+i*(cw+gap),h=(i===hl),d=b+.35+i*.2;
    els.push(el('shape',{x:x,y:270,w:cw,h:340,radius:22,fill:h?'@accent':'',stroke:h?'':'@line',strokeW:2,start:d,anim:{in:'rise',t:.7}}));
    els.push(el('text',{text:c.name,x:x+28,y:296,w:cw-56,size:22,weight:700,font:'ui',upper:true,spacing:2,color:h?'@on':'@muted',start:d,anim:{in:'rise',t:.7}}));
    els.push(el('text',{text:c.price,x:x+28,y:336,w:cw-56,size:48,color:h?'@on':'@ink',start:d,anim:{in:'rise',t:.7}}));
    els.push(el('text',{text:c.note,x:x+28,y:440,w:cw-56,size:24,font:'ui',color:h?'@on':'@muted',start:d,anim:{in:'rise',t:.7}}));
  });
  return scene('Cartões',10,els);
}
function timelineScene(title,items,b){
  var els=[ttl(title,b),el('shape',{x:104,y:378,w:1072,h:4,fill:'@line',start:b+.3,anim:{in:'wipe',t:1.6,ease:'inout'}})],n=Math.min(6,items.length),seg=1072/n;
  items.slice(0,6).forEach(function(it,i){
    var cx=104+seg*(i+.5),d=b+.5+i*.5;
    els.push(el('shape',{shape:'ellipse',x:cx-13,y:367,w:26,h:26,fill:'@accent',start:d,anim:{in:'scale',t:.5,ease:'back'}}));
    els.push(el('text',{text:it.when,x:cx-seg/2+12,y:300,w:seg-24,size:46,color:'@accent',align:'center',start:d+.1,anim:{in:'rise',t:.6}}));
    els.push(el('text',{text:it.what,x:cx-seg/2+12,y:412,w:seg-24,size:25,font:'ui',align:'center',start:d+.1,anim:{in:'rise',t:.6}}));
  });
  return scene('Linha do tempo',Math.round((2.5+n*1.8+1.5)*10)/10,els);
}
function closingScene(h,sub_,b){
  var els=[el('text',{text:h,x:104,y:h.length>40?230:215,w:1072,size:h.length>40?84:104,color:'@on',align:'center',start:b+.1,anim:{in:'words',t:.7}})];
  if(sub_)els.push(el('text',{text:sub_,x:104,y:470,w:1072,size:32,font:'ui',color:'@on',align:'center',start:b+1,anim:{in:'rise'}}));
  return scene('Fechamento',5,els,{bg:'@accent',trans:'fade',cam:{on:true,z0:1.06,x0:.5,y0:.5,z1:1,x1:.5,y1:.5,ease:'out'}});
}
function mkProject(name,theme,scenes,vars){return normProject({name:name,w:1280,h:720,theme:clone(THEMES[theme]),themeName:theme,scenes:scenes,vars:vars||{}})}
var TEMPLATES={
  quarter:{name:'Resumo trimestral',make:function(){return mkProject('Resumo do 3º trimestre','papel',[
    titleScene('Resultados do {{trimestre}}','Crescemos {{crescimento}} e dobramos os clientes enterprise','Reunião geral · {{data}}',true),
    statScene('Receita recorrente','R$ ','{{receita}}',1,' mi','{{crescimento}} vs. trimestre anterior','maior alta em três anos',.35,{trans:'magic'}),
    barsScene('Receita por produto','R$ milhões',[{label:'Assinaturas',value:2.4},{label:'Serviços',value:1.1},{label:'Parcerias',value:0.7}],.35),
    stepsScene('Prioridades do próximo trimestre',['Lançar o plano Empresa','Abrir escritório em Recife','Reduzir o tempo de implantação'],.35),
    closingScene('Obrigado, equipe','Vamos para o próximo trimestre',.35)],{trimestre:'3º trimestre',crescimento:'+18%',receita:'4,2',data:'outubro de 2026'})}},
  pricing:{name:'Planos e preços',make:function(){return mkProject('Planos e preços','grafite',[
    titleScene('Planos 2027','Três planos, um caminho de crescimento','Do primeiro painel à operação inteira',true),
    cardsScene('Escolha o seu ritmo',[{name:'Essencial',price:'R$ 49',note:'Para quem está começando'},{name:'Equipe',price:'R$ 129',note:'Até 25 pessoas e painéis compartilhados'},{name:'Empresa',price:'Sob consulta',note:'SSO, auditoria e suporte dedicado'}],1,.35),
    stepsScene('Como migrar',['Exporte seus dados atuais','Importe no novo espaço','Convide a equipe'],.35),
    closingScene('Comece hoje','Teste grátis por 14 dias',.35)])}},
  onboarding:{name:'Onboarding',make:function(){return mkProject('Primeiros 10 minutos','oceano',[
    titleScene('Onboarding','Bem-vindo, {{nome}}: seus primeiros 10 minutos','Do cadastro ao primeiro painel publicado',true),
    stepsScene('Quatro passos para começar',['Crie o seu espaço de trabalho','Convide a equipe','Conecte suas fontes de dados','Publique o primeiro painel'],.35),
    statScene('Tempo médio de configuração','',10,0,' min','sem precisar de código','',.35),
    closingScene('Pronto para começar','Precisa de ajuda? Fale com o suporte',.35)],{nome:'Ana'})}},
  history:{name:'Linha do tempo',make:function(){return mkProject('Breve história da internet','musgo',[
    titleScene('Linha do tempo','Uma breve história da internet','De quatro computadores a bilhões de telas',true),
    timelineScene('Marcos que mudaram tudo',[{when:'1969',what:'ARPANET conecta os primeiros computadores'},{when:'1983',what:'TCP/IP vira o padrão da rede'},{when:'1991',what:'A web é aberta ao público'},{when:'1998',what:'Buscadores organizam a rede'},{when:'2007',what:'Smartphones levam a web ao bolso'}],.35),
    closingScene('E a história continua','',.35)])}},
  promo:{name:'Anúncio de produto',make:function(){return mkProject('Anúncio de lançamento','neon',[
    scene('Gancho',3.5,[
      el('text',{name:'Gancho',text:'Seu relatório levou 3 horas?',x:104,y:250,w:1072,size:84,align:'center',start:.1,anim:{in:'words',t:.5}}),
      el('text',{text:'Agora leva 3 minutos.',x:104,y:420,w:1072,size:40,font:'ui',color:'@accent',align:'center',start:1.4,anim:{in:'rise'}})],{trans:'none'}),
    scene('Produto',4.5,[
      el('shape',{name:'Cartão',x:340,y:150,w:600,h:420,radius:28,fill:'@accent',start:0,anim:{in:'scale',t:.6,ease:'back'},kf:{rot:[{t:0,v:-6,e:'inout'},{t:1.2,v:0,e:'out'}]}}),
      el('text',{text:'{{produto}}',x:380,y:220,w:520,size:72,color:'@on',align:'center',start:.4,anim:{in:'rise'}}),
      el('text',{text:'Painéis prontos a partir das suas planilhas',x:400,y:340,w:480,size:28,font:'ui',color:'@on',align:'center',start:.8,anim:{in:'fade'}})],{trans:'slide'}),
    scene('Oferta',4,[
      el('shape',{name:'Cartão',x:104,y:200,w:1072,h:320,radius:28,fill:'@accent',start:0,anim:{in:'none'}}),
      el('counter',{x:104,y:250,w:1072,size:150,from:0,to:30,suffix:'% off',align:'center',color:'@on',start:.3}),
      el('text',{text:'Só nesta semana',x:104,y:440,w:1072,size:30,font:'ui',color:'@on',align:'center',start:1.2,anim:{in:'rise'}})],{trans:'magic'}),
    closingScene('{{produto}}','Teste grátis em {{site}}',.2)],{produto:'Painel Pro',site:'painelpro.com.br'})}}
};

/* =========================================================
   Fontes
   ========================================================= */
var FONTS=[
  {f:'Newsreader',w:'400;500;600;700',c:'Serifada'},{f:'Fraunces',w:'400;500;600;700',c:'Serifada'},{f:'Playfair Display',w:'400;500;600;700',c:'Serifada'},
  {f:'Instrument Serif',w:'',c:'Serifada'},{f:'DM Serif Display',w:'',c:'Serifada'},{f:'Lora',w:'400;500;600;700',c:'Serifada'},
  {f:'Hanken Grotesk',w:'400;500;600;700',c:'Sem serifa'},{f:'Manrope',w:'400;500;600;700',c:'Sem serifa'},{f:'Sora',w:'400;500;600;700',c:'Sem serifa'},
  {f:'Outfit',w:'400;500;600;700',c:'Sem serifa'},{f:'Bricolage Grotesque',w:'400;500;600;700',c:'Sem serifa'},{f:'Archivo',w:'400;500;600;700',c:'Sem serifa'},
  {f:'Montserrat',w:'400;500;600;700',c:'Sem serifa'},{f:'Space Grotesk',w:'400;500;600;700',c:'Sem serifa'},
  {f:'Bebas Neue',w:'',c:'Display'},{f:'Anton',w:'',c:'Display'},{f:'Oswald',w:'400;500;600;700',c:'Display'},
  {f:'JetBrains Mono',w:'400;500;700',c:'Mono'}
];
var FONT_LOADED={'Newsreader':1,'Hanken Grotesk':1,'JetBrains Mono':1};
function famCss(fam){var f=FONTS.filter(function(x){return x.f===fam})[0];var q=encodeURIComponent(fam).replace(/%20/g,'+');return 'https://fonts.googleapis.com/css2?family='+q+(f&&f.w?':wght@'+f.w:'')+'&display=swap'}
function ensureFonts(){
  if(!P)return;
  var extra=[];(P.scenes||[]).forEach(function(s){(s.els||[]).forEach(function(e){if(typeof e.font==='string'&&e.font.indexOf('f:')===0&&extra.indexOf(e.font.slice(2))<0)extra.push(e.font.slice(2))})});
  [P.fonts.display,P.fonts.ui].concat(extra).forEach(function(fam){
    if(!fam||FONT_LOADED[fam])return;
    if(P.fonts.custom&&P.fonts.custom[fam]){loadCustomFont(fam,P.fonts.custom[fam]);return}
    FONT_LOADED[fam]=1;
    var l=document.createElement('link');l.rel='stylesheet';l.href=famCss(fam);
    l.onload=function(){if(document.fonts&&document.fonts.load){Promise.all([document.fonts.load('500 40px "'+fam+'"'),document.fonts.load('700 40px "'+fam+'"')]).then(redraw).catch(redraw)}else redraw()};
    document.head.appendChild(l);
  });
}
function loadCustomFont(fam,src){
  if(FONT_LOADED[fam])return;FONT_LOADED[fam]=1;
  if(!window.FontFace)return;
  var url=srcURL(src);if(!url)return;
  var ff=new FontFace(fam,'url('+url+')');
  ff.load().then(function(f){document.fonts.add(f);redraw()}).catch(function(){FONT_LOADED[fam]=0;toast('Não foi possível carregar a fonte '+fam+'.')});
}
function family(fam){
  if(typeof fam==='string'&&fam.indexOf('f:')===0)return '"'+fam.slice(2)+'",system-ui,sans-serif';
  if(fam==='mono')return '"JetBrains Mono",ui-monospace,monospace';
  if(fam==='display')return '"'+((P&&P.fonts.display)||'Newsreader')+'",Georgia,serif';
  return '"'+((P&&P.fonts.ui)||'Hanken Grotesk')+'",system-ui,sans-serif';
}
function fnt(w,s,fam){return (w||500)+' '+Math.max(1,s)+'px '+family(fam)}
