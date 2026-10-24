/* =========================================================
   Etapa 4: legendas, áudio multitrilha (ducking) e recriação de referência
   ========================================================= */

/* ---------- legendas ---------- */
var CAP_STYLES=[['pop','Palavra a palavra'],['karaoke','Karaokê'],['box','Caixa'],['line','Clássica']];
function capCfg(){
  if(!isObj(P.captions))P.captions={};var c=P.captions;
  if(typeof c.on!=='boolean')c.on=true;if(!CAP_STYLES.some(function(s){return s[0]===c.style}))c.style='pop';
  if(['bottom','center','top'].indexOf(c.pos)<0)c.pos='bottom';
  c.size=+c.size||0;if(!c.color)c.color='#ffffff';if(!c.hl)c.hl='@accent';if(typeof c.upper!=='boolean')c.upper=false;
  if(!Array.isArray(c.items))c.items=[];
  c.items=c.items.filter(function(it){return it&&isFinite(+it.t0)&&isFinite(+it.t1)&&+it.t1>+it.t0}).slice(0,800);
  return c;
}
function capWords(it){
  var ws=String(it.text||'').trim().split(/\s+/).filter(Boolean),tot=0;
  var wt=ws.map(function(w){var k=w.length+2;tot+=k;return k}),t=+it.t0,d=(+it.t1)-(+it.t0);
  return ws.map(function(w,i){var a=t;t+=d*wt[i]/tot;return {w:w,a:a,b:t}});
}
function drawCaptions(tt){
  var c=P.captions;if(!c||!c.on||!c.items||!c.items.length)return;
  var it=null;for(var i=0;i<c.items.length;i++){var x=c.items[i];if(tt>=+x.t0&&tt<+x.t1){it=x;break}}
  if(!it)return;
  var s=Math.min(PW,PH),st=c.style,fs=(+c.size||0)>0?+c.size:Math.round(s*(st==='pop'?.075:st==='line'?.045:.055));
  var words=capWords(it),maxW=PW*(st==='line'?.84:.8),font=fnt(st==='line'?600:800,fs,'ui');
  ctx.save();ctx.font=font;ctx.textBaseline='alphabetic';
  var sp=ctx.measureText(' ').width,lines=[[]],lw=[0];
  words.forEach(function(w){var txt=c.upper?w.w.toUpperCase():w.w,ww=ctx.measureText(txt).width;w.txt=txt;w.ww=ww;var L=lines.length-1;
    if(lines[L].length&&lw[L]+sp+ww>maxW){lines.push([]);lw.push(0);L++}
    lw[L]+=(lines[L].length?sp:0)+ww;lines[L].push(w)});
  if(st==='pop'){ /* mostra só a linha da palavra atual */
    var cur=0;lines.forEach(function(l,li){l.forEach(function(w){if(tt>=w.a)cur=li})});lines=[lines[cur]];lw=[lw[cur]];
  }
  var lh=fs*1.22,H=lines.length*lh,y0=c.pos==='top'?PH*.12:c.pos==='center'?PH/2-H/2:PH*.86-H;
  var hl=resolve(c.hl)||P.theme.accent,col=resolve(c.color)||'#fff',fin=clamp((tt-it.t0)/.18,0,1),fout=clamp((it.t1-tt)/.15,0,1),al=Math.min(fin,fout);
  if(st==='box'||st==='line'){
    var bw=Math.max.apply(null,lw)+fs*.9,bh=H+fs*.45;
    ctx.globalAlpha=al;
    if(st==='box'){ctx.fillStyle='rgba(0,0,0,.72)';rr(PW/2-bw/2,y0-fs*.2,bw,bh,fs*.25);ctx.fill()}
  }
  lines.forEach(function(l,li){
    var x=PW/2-lw[li]/2,y=y0+li*lh+fs*.95;
    l.forEach(function(w){
      var on=tt>=w.a,now=tt>=w.a&&tt<w.b;ctx.save();
      if(st==='pop'){
        if(!on){ctx.restore();x+=w.ww+sp;return}
        var k=clamp((tt-w.a)/.12,0,1),sc=1+.25*(1-k)*(1-k);ctx.globalAlpha=Math.min(1,k*2)*fout;
        ctx.translate(x+w.ww/2,y-fs*.35);ctx.scale(sc,sc);ctx.translate(-(x+w.ww/2),-(y-fs*.35));
        ctx.lineJoin='round';ctx.lineWidth=fs*.16;ctx.strokeStyle='rgba(0,0,0,.85)';ctx.strokeText(w.txt,x,y);
        ctx.fillStyle=now?hl:col;ctx.fillText(w.txt,x,y);
      }else if(st==='karaoke'){
        ctx.globalAlpha=al;ctx.lineJoin='round';ctx.lineWidth=fs*.14;ctx.strokeStyle='rgba(0,0,0,.8)';ctx.strokeText(w.txt,x,y);
        ctx.fillStyle=on?hl:col;ctx.fillText(w.txt,x,y);
      }else{
        ctx.globalAlpha=al;if(st==='line'){ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=fs*.25;ctx.shadowOffsetY=fs*.04}
        ctx.fillStyle=col;ctx.fillText(w.txt,x,y);
      }
      ctx.restore();x+=w.ww+sp;
    });
  });
  ctx.restore();
}
/* divide um roteiro em blocos curtos */
function chunkScript(text,maxWords){
  maxWords=maxWords||6;var out=[];
  String(text||'').replace(/\r/g,'').split(/\n+|(?<=[.!?…])\s+/).forEach(function(sent){
    var ws=sent.trim().split(/\s+/).filter(Boolean);if(!ws.length)return;
    var n=Math.ceil(ws.length/maxWords),per=Math.ceil(ws.length/n);
    for(var i=0;i<ws.length;i+=per)out.push(ws.slice(i,i+per).join(' '));
  });
  return out;
}
/* trechos com fala numa trilha de voz (em segundos da linha do tempo) */
function voiceSegments(tr){
  var buf=AE.buffers[tr.id];if(!buf)return null;
  if(!AE.segs)AE.segs={};var key=tr.id+':'+(+tr.start||0)+':'+(+tr.offset||0);if(AE.segs[key])return AE.segs[key];
  var sr=buf.sampleRate,ch=buf.getChannelData(0),win=Math.round(sr*.05),n=Math.floor(ch.length/win),rms=new Float32Array(n),mx=0;
  for(var i=0;i<n;i++){var s=0,o=i*win;for(var j=0;j<win;j+=2){var v=ch[o+j];s+=v*v}rms[i]=Math.sqrt(s/(win/2));if(rms[i]>mx)mx=rms[i]}
  var thr=Math.max(.012,mx*.1),segs=[],a=-1;
  for(i=0;i<=n;i++){var on=i<n&&rms[i]>thr;if(on&&a<0)a=i;if(!on&&a>=0){segs.push([a*.05,i*.05]);a=-1}}
  var m=[];segs.forEach(function(g){if(m.length&&g[0]-m[m.length-1][1]<.35)m[m.length-1][1]=g[1];else m.push(g.slice())});
  m=m.filter(function(g){return g[1]-g[0]>=.15});
  var off=+tr.offset||0,st=+tr.start||0;
  var res=m.map(function(g){return [st+g[0]-off,st+g[1]-off]}).filter(function(g){return g[1]>0}).map(function(g){return [Math.max(0,g[0]),g[1]]});
  AE.segs[key]=res;return res;
}
function allVoiceSegments(){var out=[];P.audio.forEach(function(tr){if(tr.role==='voice'){var s=voiceSegments(tr);if(s)out=out.concat(s)}});return out.sort(function(a,b){return a[0]-b[0]})}
/* distribui blocos pelo tempo: sobre os trechos de fala se houver voz, senão pelo vídeo todo */
function timeCaptions(chunks){
  var segs=allVoiceSegments(),tot=total();if(!segs.length)segs=[[.2,Math.max(.5,tot-.2)]];
  var speech=segs.reduce(function(a,g){return a+g[1]-g[0]},0),wc=chunks.map(function(c){return c.split(/\s+/).length}),W=wc.reduce(function(a,b){return a+b},0)||1;
  var items=[],si=0,pos=segs[0][0];
  chunks.forEach(function(c,i){
    var d=speech*wc[i]/W,t0=pos,left=d;
    while(left>1e-3&&si<segs.length){var room=segs[si][1]-pos;if(room>left){pos+=left;left=0}else{left-=room;si++;pos=si<segs.length?segs[si][0]:pos}}
    items.push({t0:t0,t1:Math.max(t0+.3,pos),text:c});
  });
  /* bloco que atravessa uma pausa fica do lado onde tem mais fala */
  items.forEach(function(it){
    segs.forEach(function(g,k){var nx=segs[k+1];if(!nx)return;
      if(it.t0<g[1]&&it.t1>nx[0]){var before=g[1]-it.t0,after=it.t1-nx[0];if(before>=after)it.t1=g[1]+.25;else it.t0=nx[0]}});
  });
  return items.map(function(it){return {t0:Math.round(it.t0*100)/100,t1:Math.round(it.t1*100)/100,text:it.text}});
}
function fmtSrtT(s){s=Math.max(0,s);var h=Math.floor(s/3600),m=Math.floor(s%3600/60),ss=Math.floor(s%60),ms=Math.round((s-Math.floor(s))*1000);if(ms===1000){ms=999}return [h,m,ss].map(function(v){return ('0'+v).slice(-2)}).join(':')+','+('00'+ms).slice(-3)}
function toSrt(items){return items.map(function(it,i){return (i+1)+'\n'+fmtSrtT(+it.t0)+' --> '+fmtSrtT(+it.t1)+'\n'+it.text}).join('\n\n')+'\n'}
function parseSrt(txt){
  var out=[];String(txt||'').replace(/\r/g,'').split(/\n\s*\n/).forEach(function(b){
    var m=b.match(/(\d+):(\d+):(\d+)[,.](\d+)\s*-->\s*(\d+):(\d+):(\d+)[,.](\d+)/);if(!m)return;
    function T(h,mi,s,ms){return (+h)*3600+(+mi)*60+(+s)+(+ms)/Math.pow(10,ms.length)}
    var lines=b.split('\n'),k=lines.findIndex(function(l){return l.indexOf('-->')>=0}),text=lines.slice(k+1).join(' ').replace(/<[^>]+>/g,'').trim();
    if(text)out.push({t0:T(m[1],m[2],m[3],m[4]),t1:T(m[5],m[6],m[7],m[8]),text:text});
  });return out;
}
function panelCaptions(pane){
  var c=capCfg(),h='<div class="sh"><span>Legendas</span><span class="nm" style="font-weight:500;color:var(--muted)">'+c.items.length+' bloco(s)</span></div>';
  h+='<label class="chk"><input type="checkbox" data-o="proj" data-p="captions.on"'+(c.on?' checked':'')+'> Mostrar legendas no vídeo</label>';
  h+='<div class="f"><span>Estilo</span><div class="presets">'+CAP_STYLES.map(function(s){return '<button data-act="capstyle" data-v="'+s[0]+'" aria-pressed="'+(c.style===s[0])+'">'+s[1]+'</button>'}).join('')+'</div></div>';
  h+='<div class="f"><span>Posição</span><div class="presets">'+[['bottom','Embaixo'],['center','Centro'],['top','Em cima']].map(function(s){return '<button data-act="cappos" data-v="'+s[0]+'" aria-pressed="'+(c.pos===s[0])+'">'+s[1]+'</button>'}).join('')+'</div></div>';
  h+='<div class="two">'+fld({p:'captions.size',l:'Tamanho (0 = automático)',t:'num'},'proj')+'<label class="chk" style="align-self:end"><input type="checkbox" data-o="proj" data-p="captions.upper"'+(c.upper?' checked':'')+'> Maiúsculas</label></div>';
  h+=fld({p:'captions.color',l:'Cor do texto',t:'color'},'proj')+fld({p:'captions.hl',l:'Cor do destaque',t:'color'},'proj');
  var hasVoice=P.audio.some(function(tr){return tr.role==='voice'});
  h+='<details class="grp"'+(c.items.length?'':' open')+'><summary>Criar a partir do roteiro</summary><div class="gb">';
  h+='<textarea id="capScript" rows="5" placeholder="Cole aqui o texto falado. Eu divido em blocos curtos e distribuo pelo tempo."></textarea>';
  h+='<p class="info">'+(hasVoice?'Os blocos acompanham os trechos com fala da trilha de voz.':'Sem trilha de voz: os blocos são distribuídos pelo vídeo todo. Marque uma trilha como "Voz" para seguir a fala.')+'</p>';
  h+='<div class="btnrow"><button class="btn sm accent" data-act="capgen">Gerar legendas</button><button class="btn sm" data-act="capscenes">Usar as palavras na tela</button></div></div></details>';
  h+='<div class="btnrow"><button class="btn sm" data-act="capimport">Importar .srt</button>'+(c.items.length?'<button class="btn sm" data-act="capexport">Exportar .srt</button><button class="btn sm" data-act="capclear">'+IC.trash+'Limpar</button>':'')+'</div>';
  h+='<p class="info">Transcrição automática do áudio não roda dentro do artefato. Se quiser, gere o .srt de graça (por exemplo, legendas automáticas do CapCut ou Whisper) e importe aqui; depois é só me pedir ajustes no chat.</p>';
  if(c.items.length){
    var cur=c.items.findIndex(function(it){return t>=+it.t0&&t<+it.t1});
    h+='<div class="sh"><span>Blocos</span></div><div class="caplist">'+c.items.slice(0,200).map(function(it,i){
      return '<div class="caprow'+(i===cur?' on':'')+'"><button class="ct" data-act="capseek" data-i="'+i+'" title="Ir para este bloco">'+fmtClock(+it.t0)+'</button><input type="text" data-cap="'+i+'" data-k="text" value="'+esc(it.text)+'" aria-label="Texto do bloco '+(i+1)+'"><input type="number" step="0.1" data-cap="'+i+'" data-k="t1" value="'+(Math.round(it.t1*100)/100)+'" aria-label="Fim do bloco '+(i+1)+'" title="Termina em (s)"><button class="ghost" data-act="capdel" data-i="'+i+'" aria-label="Excluir bloco">'+IC.x+'</button></div>'}).join('')+'</div>';
    h+='<div class="btnrow"><button class="btn sm" data-act="capadd">'+IC.plus+'Bloco no tempo atual</button></div>';
  }
  pane.innerHTML=h;
}
Object.assign(handlers,{
  capstyle:function(b){capCfg().style=b.dataset.v;commit();renderPanel();touch()},
  cappos:function(b){capCfg().pos=b.dataset.v;commit();renderPanel();touch()},
  capgen:function(){var v=($('#capScript')||{}).value||'';var ch=chunkScript(v,capCfg().style==='pop'?4:7);if(!ch.length){toast('Cole o texto falado primeiro.');return}capCfg().items=timeCaptions(ch);capCfg().on=true;commit();renderPanel();touch();toast(ch.length+' blocos de legenda criados.')},
  capscenes:function(){var items=[],acc=0;P.scenes.forEach(function(s){var tx=s.els.filter(function(e){return e.kind==='text'}).map(function(e){return sub(e.text)}).join(' ').replace(/\s+/g,' ').trim();if(tx)chunkScript(tx,7).forEach(function(c,i,a){var d=s.dur/a.length;items.push({t0:acc+i*d,t1:acc+(i+1)*d,text:c})});acc+=s.dur});capCfg().items=items;commit();renderPanel();touch()},
  capimport:function(){var i=document.createElement('input');i.type='file';i.accept='.srt,.vtt,text/plain';i.onchange=function(){var f=i.files[0];if(!f)return;f.text().then(function(tx){var it=parseSrt(tx);if(!it.length){toast('Não encontrei blocos de legenda neste arquivo.');return}capCfg().items=it;capCfg().on=true;commit();renderPanel();touch();toast(it.length+' blocos importados.')})};i.click()},
  capexport:function(){var blob=new Blob([toSrt(capCfg().items)],{type:'text/plain'});if(CAP.downloads)CAP.downloads.save({filename:slug(P.name)+'.srt',data:blob}).catch(function(){});else{var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=slug(P.name)+'.srt';a.click()}},
  capclear:function(){capCfg().items=[];commit();renderPanel();touch()},
  capdel:function(b){capCfg().items.splice(+b.dataset.i,1);commit();renderPanel();touch()},
  capseek:function(b){var it=capCfg().items[+b.dataset.i];if(it)seek(+it.t0+.01)},
  capadd:function(){var c=capCfg();c.items.push({t0:Math.round(t*100)/100,t1:Math.round(Math.min(total(),t+2)*100)/100,text:'Nova legenda'});c.items.sort(function(a,b){return a.t0-b.t0});commit();renderPanel();touch()}
});
$('#pane').addEventListener('input',function(ev){var x=ev.target;if(!x.dataset||x.dataset.cap==null)return;var it=capCfg().items[+x.dataset.cap];if(!it)return;
  if(x.dataset.k==='text')it.text=x.value;else{var v=parseFloat(x.value);if(isFinite(v))it.t1=Math.max(+it.t0+.1,v)}touch()});
$('#pane').addEventListener('change',function(ev){var x=ev.target;if(x.dataset&&x.dataset.cap!=null)commit()});

/* ---------- ducking: abaixa a música quando há voz ---------- */
function duckCfg(){if(!isObj(P.duck))P.duck={};var d=P.duck;if(typeof d.on!=='boolean')d.on=true;d.amount=clamp(isFinite(+d.amount)?+d.amount:.7,0,1);d.attack=clamp(+d.attack||.2,.02,2);d.release=clamp(+d.release||.5,.05,3);return d}
function applyDucking(c,metas,at,now){
  var d=duckCfg();if(!d.on||d.amount<=0)return;var segs=allVoiceSegments();if(!segs.length)return;
  var m=[];segs.forEach(function(g){if(m.length&&g[0]-m[m.length-1][1]<d.attack+d.release)m[m.length-1][1]=Math.max(m[m.length-1][1],g[1]);else m.push(g.slice())});
  var low=1-d.amount;
  metas.forEach(function(x){
    if(x.tr.role==='voice'||x.tr.role==='sfx')return;
    var dg=c.createGain();try{x.gain.disconnect()}catch(e){}x.gain.connect(dg);dg.connect(x.out);
    var T=function(tl){return now+Math.max(0,tl-at)};dg.gain.setValueAtTime(1,now);
    m.forEach(function(g){
      if(g[1]+d.release<at)return;
      if(g[0]-d.attack<=at){dg.gain.setValueAtTime(low,now)}else{dg.gain.setValueAtTime(1,T(g[0]-d.attack));dg.gain.linearRampToValueAtTime(low,T(g[0]))}
      dg.gain.setValueAtTime(low,T(g[1]));dg.gain.linearRampToValueAtTime(1,T(g[1]+d.release));
    });
  });
}

/* ---------- recriar a partir de um vídeo de referência ---------- */
var REFO={sens:'med',audio:true,ai:true},REF_CUTS=null;
/* acha o quadro exato do corte entre duas amostras (busca binária) */
function refineCuts(v,samples,cuts,stat,diff){
  var out={},k=1;
  function one(){
    if(k>=cuts.length||EXPORT_CANCEL)return Promise.resolve(out);
    var ci=cuts[k],A=samples[ci-1],B=samples[ci],lo=A.t,hi=B.t,it=0;
    function step(){
      if(it++>=4||hi-lo<.03){out[k]=hi;k++;setProg(.7+.05*k/cuts.length,'Ajustando cortes…');return one()}
      var mid=(lo+hi)/2;return seekVid(v,mid).then(function(){var s=stat();if(diff(A,s)<diff(s,B))lo=mid;else hi=mid;return step()});
    }
    return step();
  }
  return one();
}
function openRefDialog(){
  closePops();
  function body(){
    var h='<div class="dh"><h3 id="mTitle">Recriar a partir de uma referência</h3><button class="ghost" data-close aria-label="Fechar">'+IC.close+'</button></div>';
    h+='<p class="info">Escolha um vídeo que você gosta. Eu encontro os cortes, meço a duração de cada plano, pego as cores e o ritmo da música e monto um projeto com uma cena por plano, cada uma com um espaço para a sua imagem.</p>';
    h+='<div class="xrow"><span>Sensibilidade dos cortes</span><div class="seg">'+[['low','Baixa'],['med','Média'],['high','Alta']].map(function(o){return '<button data-rf="sens" data-v="'+o[0]+'" aria-pressed="'+(REFO.sens===o[0])+'">'+o[1]+'</button>'}).join('')+'</div></div>';
    h+='<div class="xrow" style="grid-template-columns:1fr auto"><span>Usar o áudio da referência como trilha</span><button class="toggle" role="switch" aria-checked="'+REFO.audio+'" data-rf="audio" aria-label="Usar o áudio da referência"></button></div>';
    if(CAP.sample)h+='<div class="xrow" style="grid-template-columns:1fr auto"><span>Pedir ao Claude para descrever cada plano e escrever os prompts das imagens</span><button class="toggle" role="switch" aria-checked="'+REFO.ai+'" data-rf="ai" aria-label="Descrever com o Claude"></button></div>';
    h+='<p class="est">O projeto atual será substituído. Dá para desfazer com Ctrl Z.</p>';
    h+='<div class="end"><button class="btn" data-close>Cancelar</button><button class="btn accent" id="refGo">Escolher vídeo…</button></div>';
    return h;
  }
  modal(body());var d=$('#dlg');
  d.onclick=function(e){var b=e.target.closest('[data-rf]');if(b){var k=b.dataset.rf;if(k==='sens')REFO.sens=b.dataset.v;else REFO[k]=!REFO[k];d.innerHTML=body();d.querySelectorAll('[data-close]').forEach(function(x){x.onclick=closeModal});return}
    if(e.target.closest('#refGo')){var i=document.createElement('input');i.type='file';i.accept='video/*';i.onchange=function(){if(i.files[0])analyzeRef(i.files[0],REFO)};i.click()}};
}
function seekVid(v,tt){return new Promise(function(res){var done=false;function f(){if(done)return;done=true;v.removeEventListener('seeked',f);res()}v.addEventListener('seeked',f);setTimeout(f,2000);try{v.currentTime=tt}catch(x){f()}})}
function encodeWav(buf){
  var n=buf.length,sr=buf.sampleRate,d=buf.getChannelData(0),ab=new ArrayBuffer(44+n*2),v=new DataView(ab);
  function ws(o,s){for(var i=0;i<s.length;i++)v.setUint8(o+i,s.charCodeAt(i))}
  ws(0,'RIFF');v.setUint32(4,36+n*2,true);ws(8,'WAVE');ws(12,'fmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,sr,true);v.setUint32(28,sr*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);ws(36,'data');v.setUint32(40,n*2,true);
  for(var i=0;i<n;i++){var s=clamp(d[i],-1,1);v.setInt16(44+i*2,s<0?s*32768:s*32767,true)}
  return new Blob([ab],{type:'audio/wav'});
}
function analyzeRef(file,o){
  progressModal('Analisando a referência','Procurando os cortes…');exporting=true;EXPORT_CANCEL=false;
  var url=URL.createObjectURL(file),v=document.createElement('video');v.muted=true;v.preload='auto';v.playsInline=true;v.src=url;
  var small=document.createElement('canvas');small.width=64;small.height=36;var sg=small.getContext('2d',{willReadFrequently:true});
  var dur=0,vw=0,vh=0,step=0,samples=[];
  function stat(){
    sg.drawImage(v,0,0,64,36);var d=sg.getImageData(0,0,64,36).data,grid=new Float32Array(144),hist=new Float32Array(48),sum=[0,0,0];
    for(var y=0;y<36;y++)for(var x=0;x<64;x++){var k=(y*64+x)*4,r=d[k],g=d[k+1],b=d[k+2],L=.299*r+.587*g+.114*b;grid[Math.floor(y/4)*16+Math.floor(x/4)]+=L/16;hist[r>>4]++;hist[16+(g>>4)]++;hist[32+(b>>4)]++;sum[0]+=r;sum[1]+=g;sum[2]+=b}
    var N=64*36;return {grid:grid,hist:hist,avg:[sum[0]/N,sum[1]/N,sum[2]/N],lum:(.299*sum[0]+.587*sum[1]+.114*sum[2])/N};
  }
  function diff(a,b){var h=0,g=0;for(var i=0;i<48;i++)h+=Math.abs(a.hist[i]-b.hist[i]);h/=(64*36*2*3);for(i=0;i<144;i++)g+=Math.abs(a.grid[i]-b.grid[i]);g/=(144*255);return .5*h+.5*g*2.2}
  new Promise(function(res,rej){v.onloadedmetadata=function(){res()};v.onerror=function(){rej(new Error('Não consegui abrir este vídeo. Tente um MP4 (H.264) ou WebM.'))}})
  .then(function(){
    dur=v.duration;vw=v.videoWidth;vh=v.videoHeight;if(!isFinite(dur)||dur<=0)throw new Error('Vídeo sem duração válida.');
    if(dur>600)throw new Error('Use uma referência de até 10 minutos.');
    step=dur<=60?1/6:dur<=180?1/4:1/2;var n=Math.min(1200,Math.ceil(dur/step)),i=0;
    function next(){
      if(EXPORT_CANCEL)throw {cancelled:true};if(i>=n)return;
      var tt=Math.min(dur-.05,i*step);return seekVid(v,tt).then(function(){var s=stat();s.t=tt;
        var th=document.createElement('canvas');th.width=128;th.height=Math.max(36,Math.round(128*vh/vw))||72;th.getContext('2d').drawImage(v,0,0,th.width,th.height);s.th=th;
        samples.push(s);i++;setProg(i/n*.7,'Lendo quadros: '+i+' de '+n+'…');return next()});
    }
    return next();
  }).then(function(){
    /* cortes com limiar adaptativo */
    var D=samples.map(function(s,i){return i?diff(samples[i-1],s):0}),abs={low:.42,med:.28,high:.18}[o.sens]||.28,minGap=Math.max(1,Math.round(.45/step)),cuts=[0],fades={};
    for(var i=1;i<D.length;i++){
      var lo=Math.max(1,i-8),hi=Math.min(D.length-1,i+8),loc=D.slice(lo,hi+1).filter(function(_,j){return lo+j!==i}).sort(function(a,b){return a-b}),med=loc.length?loc[Math.floor(loc.length/2)]:0;
      if(D[i]>abs&&D[i]>med*3&&i-cuts[cuts.length-1]>=minGap)cuts.push(i);
    }
    /* quadros pretos entre planos viram transição "dissolver" */
    REF_CUTS=cuts;
    cuts.forEach(function(ci,k){if(k&&(samples[ci].lum<14||samples[Math.max(0,ci-1)].lum<14))fades[k]=1});
    var shots=cuts.map(function(ci,k){var end=k+1<cuts.length?cuts[k+1]:samples.length,t0=samples[ci].t,t1=k+1<cuts.length?samples[end].t:dur,
      seg=samples.slice(ci,end),mid=samples[Math.floor((ci+end-1)/2)],mot=seg.length>1?D.slice(ci+1,end).reduce(function(a,b){return a+b},0)/(seg.length-1):0;
      return {t0:t0,t1:t1,mid:mid,mot:mot,avg:mid.avg,fade:!!fades[k]}});
    return refineCuts(v,samples,cuts,stat,diff).then(function(exact){shots.forEach(function(s,k){if(exact[k]!=null)s.t0=exact[k];if(k&&exact[k]!=null)shots[k-1].t1=exact[k]});return shots})}).then(function(shots){
    if(EXPORT_CANCEL)throw {cancelled:true};
    while(shots.length>60){var mi=0,md=1e9;shots.forEach(function(s,k){if(k&&s.t1-s.t0<md){md=s.t1-s.t0;mi=k}});shots[mi-1].t1=shots[mi].t1;shots.splice(mi,1)}
    shots.forEach(function(s){s.dur=Math.max(.5,Math.round((s.t1-s.t0)*100)/100)});
    setProg(.75,shots.length+' planos encontrados. Lendo o áudio…');
    return file.arrayBuffer().then(function(ab){var c=aeInit();if(!c)return null;return new Promise(function(r){c.decodeAudioData(ab,r,function(){r(null)})})}).catch(function(){return null}).then(function(abuf){return {shots:shots,abuf:abuf}});
  }).then(function(R){
    var beat=R.abuf?detectBeats(R.abuf):null;
    var proj=normProject(JSON.parse(JSON.stringify(P)));
    var ar=vw/vh,best='16:9',bd=9;Object.keys(FORMATS).forEach(function(k){var f=FORMATS[k],d2=Math.abs(Math.log((f[0]/f[1])/ar));if(d2<bd){bd=d2;best=k}});
    var F=FORMATS[best];proj.w=F[0];proj.h=F[1];
    proj.name='Recriação · '+file.name.replace(/\.[^.]+$/,'').slice(0,40);proj.audio=[];proj.captions={on:true,style:'pop',items:[]};
    proj.scenes=R.shots.map(function(s,k){
      var hex='#'+s.avg.map(function(x){return ('0'+Math.round(x).toString(16)).slice(-2)}).join(''),mv=s.mot>.09?'intenso':s.mot>.035?'médio':'estático';
      var sc=normScene({name:'Plano '+(k+1),dur:s.dur,bg:hex,trans:k===0?'none':s.fade?'fade':'none',els:[]},k);
      sc.notes='Referência '+fmtClock(s.t0)+'–'+fmtClock(s.t1)+' · movimento '+mv;
      var rc=document.createElement('canvas');rc.width=96;rc.height=Math.max(24,Math.round(96*s.mid.th.height/s.mid.th.width));rc.getContext('2d').drawImage(s.mid.th,0,0,rc.width,rc.height);sc.ref=rc.toDataURL('image/jpeg',.55);
      if(mv!=='estático')sc.cam={on:true,z0:1,x0:.5,y0:.5,z1:mv==='intenso'?1.18:1.08,x1:.5,y1:.5,ease:'inout'};
      sc.els=[el('image',{name:'Plano '+(k+1),slot:true,src:'',x:0,y:0,w:F[0],h:F[1],fit:'cover',anim:{in:'none'},depth:0})];
      return sc;
    });
    proj.refInfo={file:file.name,dur:Math.round(dur*100)/100,shots:R.shots.length,bpm:beat?beat.bpm:0};
    var keep={P:P};P=proj;applySize();selScene=0;selEl=null;selTrack=null;
    var after=Promise.resolve();
    if(R.abuf&&o.audio){
      setProg(.82,'Preparando a trilha…');
      var len=Math.min(R.abuf.duration,240),oc=new OfflineAudioContext(1,Math.ceil(len*22050),22050),src=oc.createBufferSource();src.buffer=R.abuf;src.connect(oc.destination);src.start(0,0,len);
      after=oc.startRendering().then(function(mono){var wav=new File([encodeWav(mono)],'audio-referencia.wav',{type:'audio/wav'});
        return storeFile(wav,'audio').then(function(st){var m={id:nid('m'),kind:'audio',name:'Áudio da referência',src:st.src,enc:st.enc,w:0,h:0,dur:len,saved:st.persisted};P.media.push(m);
          var tr={id:nid('a'),name:'Áudio da referência',src:m.src,enc:m.enc,start:0,offset:0,vol:.9,fadeIn:0,fadeOut:1,bpm:beat?beat.bpm:0,beats:beat?beat.beats:[],role:'music'};P.audio.push(tr);setTrackBuffer(tr,R.abuf)})}).catch(function(){});
    }
    return after.then(function(){
      commit();afterProjectChange();fullRender();
      if(o.ai&&CAP.sample){setProg(.88,'Pedindo ao Claude para descrever os planos…');return describeShots(R.shots).catch(function(){toast('Não consegui a descrição do Claude agora. O projeto foi montado mesmo assim.')})}
    }).then(function(){
      exporting=false;URL.revokeObjectURL(url);
      setProg(1,R.shots.length+' planos em '+fmtS(dur)+(beat&&beat.bpm?' · música a ~'+beat.bpm+' BPM':'')+'. Cada cena tem um espaço "Plano N" para a sua imagem. Os prompts estão em Assets IA.');
      var cbtn=$('#mCancel');if(cbtn){cbtn.textContent='Ver prompts';cbtn.onclick=function(){closeModal();setTab('assets');openTweaks(true);renderPanel()}}
    });
  }).catch(function(e){exporting=false;URL.revokeObjectURL(url);exportFail(e)});
}
/* folha de contato → Claude descreve os planos e escreve os prompts */
function describeShots(shots){
  return CAP.sample.limits().catch(function(){return {}}).then(function(lim){
    var maxImg=lim&&lim.images?Math.max(1,Math.min(lim.images.maxCount||4,6)):0;if(!maxImg)throw new Error('sem imagens');
    var per=12,sheets=[];
    for(var i=0;i<shots.length&&sheets.length<maxImg;i+=per){
      var grp=shots.slice(i,i+per),cols=4,rows=Math.ceil(grp.length/cols),cw=256,ch=Math.round(cw*(shots[0].mid.th.height/shots[0].mid.th.width)),c=document.createElement('canvas');c.width=cols*cw;c.height=rows*(ch+4);var g=c.getContext('2d');g.fillStyle='#000';g.fillRect(0,0,c.width,c.height);
      grp.forEach(function(s,j){var x=(j%cols)*cw,y=Math.floor(j/cols)*(ch+4);g.drawImage(s.mid.th,x,y,cw-4,ch);g.fillStyle='rgba(0,0,0,.7)';g.fillRect(x,y,34,24);g.fillStyle='#fff';g.font='bold 16px sans-serif';g.fillText(String(i+j+1),x+6,y+18)});
      sheets.push(c);
    }
    var covered=Math.min(shots.length,sheets.length*per);
    return Promise.all(sheets.map(function(c){return new Promise(function(r){c.toBlob(r,'image/jpeg',.82)})})).then(function(blobs){
      var a=aiCfg(),list=shots.slice(0,covered).map(function(s,k){return 'Plano '+(k+1)+': '+fmtS(s.dur)}).join('; ');
      var q='As imagens são folhas de contato de um vídeo de referência: cada quadro numerado é o quadro do meio de um plano. Quero recriar este vídeo com imagens novas geradas no '+GENS[a.gen]+', no formato '+PW+'x'+PH+', mantendo o mesmo ritmo, enquadramentos e clima, sem copiar marcas, logos, pessoas reais ou personagens conhecidos. Para cada plano, dê um nome curto, uma nota de direção (enquadramento, movimento, o que anima) e um prompt de imagem original. Use o arquivo c<plano>_fundo.png para o plano todo e, quando houver um objeto ou personagem que deva se mover separado, c<plano>_objeto.png pedido como PNG com fundo transparente. Descreva também o estilo visual comum em uma frase. Português do Brasil. Responda só com JSON: {"style":"...","shots":[{"n":1,"name":"...","notes":"...","items":[{"file":"c1_fundo.png","role":"...","prompt":"..."}]}]}\n\nPlanos: '+list;
      return CAP.sample.json(q,{images:blobs,modelTier:'default',cache:false});
    }).then(function(r){
      var a=aiCfg(),pack=[];if(r&&typeof r.style==='string')a.style=r.style.slice(0,600);
      (r&&Array.isArray(r.shots)?r.shots:[]).forEach(function(s){var k=(+s.n||0)-1,sc=P.scenes[k];if(!sc)return;
        if(s.name)sc.name=String(s.name).slice(0,40);if(s.notes)sc.notes=String(s.notes).slice(0,400)+'\n'+(sc.notes||'').split('\n').pop();
        if(sc.els[0]&&sc.els[0].slot)sc.els[0].name='Plano '+(k+1);
        (Array.isArray(s.items)?s.items:[]).forEach(function(it){if(it&&it.file&&it.prompt)pack.push({file:String(it.file).slice(0,60),role:String(it.role||'').slice(0,80),prompt:String(it.prompt).slice(0,1500)})})});
      if(pack.length)a.pack=pack.slice(0,80);commit();fullRender();
    });
  });
}
/* fantasma da referência no palco (só no editor) */
function drawRefGhost(sc){
  if(!P.refGhost||!sc||!sc.ref||exporting||ctx.canvas!==cv)return;var im=getImg(sc.ref);if(!im||!im.complete||!im.naturalWidth)return;
  ctx.save();ctx.setTransform(SC,0,0,SC,0,0);ctx.globalAlpha=.35;ctx.drawImage(im,0,0,PW,PH);ctx.restore();
}
