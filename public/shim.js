/* Ponte local: implementa window.claude.use(...) com o servidor do seu PC */
(function(){
  'use strict';
  window.__LOCAL_APP=true;
  var infoP=fetch('/api/info').then(function(r){return r.json()}).catch(function(){return {provider:null}});
  /* ---------- eventos em tempo real ---------- */
  var subs=[],es=null;
  function ensureES(){if(es)return;es=new EventSource('/api/events');es.onmessage=function(m){var d;try{d=JSON.parse(m.data)}catch(e){return}subs.forEach(function(s){if(s.match(d.path))s.fire()})};es.onerror=function(){}}
  function err(code,msg){var e=new Error(msg||code);e.code=code;return e}
  function j(r){if(!r.ok)return r.json().catch(function(){return {}}).then(function(b){throw err(b.code||'unavailable',b.message)});return r.json()}
  function clone(o){return o==null?o:JSON.parse(JSON.stringify(o))}
  /* ---------- db ---------- */
  function docRef(p){
    var id=p.split('/').pop();
    function snap(d){return {exists:!!d.exists,id:id,ref:docRef(p),data:function(){return clone(d.data)}}}
    return {id:id,path:p,
      get:function(){return fetch('/api/db/doc?path='+encodeURIComponent(p)).then(j).then(snap)},
      set:function(v){return fetch('/api/db/doc?path='+encodeURIComponent(p),{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify(v)}).then(j).then(function(){})},
      update:function(v){return fetch('/api/db/doc?path='+encodeURIComponent(p),{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify(v)}).then(j).then(function(){})},
      delete:function(){return fetch('/api/db/doc?path='+encodeURIComponent(p),{method:'DELETE'}).then(j).then(function(){})},
      onSnapshot:function(fn,onErr){ensureES();var last=null,dead=false,busy=false,again=false;
        function load(){if(dead)return;if(busy){again=true;return}busy=true;fetch('/api/db/doc?path='+encodeURIComponent(p)).then(j).then(function(d){var k=JSON.stringify(d);if(k!==last&&!dead){last=k;fn(snap(d))}}).catch(function(e){if(onErr)onErr(e)}).then(function(){busy=false;if(again){again=false;load()}})}
        var s={match:function(x){return x===p},fire:load};subs.push(s);load();
        return function(){dead=true;var i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}
    };
  }
  function collRef(c,q){
    q=q||{};
    function run(){return fetch('/api/db/list?coll='+encodeURIComponent(c)).then(j).then(function(list){
      if(q.where)q.where.forEach(function(w){list=list.filter(function(d){var v=d.data[w[0]];switch(w[1]){case '==':case 'eq':return v===w[2];case '!=':return v!==w[2];case '<':return v<w[2];case '<=':return v<=w[2];case '>':return v>w[2];case '>=':return v>=w[2];case 'in':return w[2].indexOf(v)>=0;default:return true}})});
      if(q.order){var f=q.order[0],dir=q.order[1]==='desc'?-1:1;list.sort(function(a,b){var x=a.data[f],y=b.data[f];return (x>y?1:x<y?-1:0)*dir})}
      if(q.limit)list=list.slice(0,q.limit);
      return {docs:list.map(function(d){return {id:d.id,ref:docRef(c+'/'+d.id),exists:true,data:function(){return clone(d.data)}}}),size:list.length,empty:!list.length}})}
    return {
      doc:function(id){return docRef(c+'/'+(id||Array.from(crypto.getRandomValues(new Uint8Array(10))).map(function(b){return 'abcdefghijklmnopqrstuvwxyz0123456789'[b%36]}).join('')))},
      where:function(f,op,v){return collRef(c,Object.assign({},q,{where:(q.where||[]).concat([[f,op,v]])}))},
      orderBy:function(f,dir){return collRef(c,Object.assign({},q,{order:[f,dir||'asc']}))},
      limit:function(n){return collRef(c,Object.assign({},q,{limit:n}))},
      get:run,
      onSnapshot:function(fn,onErr){ensureES();var last=null,dead=false;function load(){if(dead)return;run().then(function(s){var k=JSON.stringify(s.docs.map(function(d){return [d.id,d.data()]}));if(k!==last&&!dead){last=k;fn(s)}}).catch(function(e){if(onErr)onErr(e)})}
        var pre=c+'/',depth=c.split('/').length+1;var s={match:function(x){return x.indexOf(pre)===0&&x.split('/').length===depth},fire:load};subs.push(s);load();
        return function(){dead=true;var i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}
    };
  }
  var db=Object.freeze({doc:docRef,collection:function(c){return collRef(c)}});
  /* ---------- assets (sem limite de tamanho) ---------- */
  var assets=Object.freeze({
    upload:function(blob,opts){var t=(opts&&opts.type)||blob.type||'application/octet-stream';return fetch('/api/assets',{method:'POST',headers:{'x-type':t,'x-name':encodeURIComponent(blob.name||'')},body:blob}).then(j)},
    list:function(){return fetch('/api/assets').then(j)},
    delete:function(id){return fetch('/api/assets/'+id,{method:'DELETE'}).then(j)}
  });
  /* ---------- downloads: grava na pasta exports do projeto ---------- */
  var downloads=Object.freeze({save:function(o){var blob=o.data instanceof Blob?o.data:new Blob([o.data]);return fetch('/api/export',{method:'POST',headers:{'x-name':encodeURIComponent(o.filename||'arquivo')},body:blob}).then(j)},
    openFolder:function(){return fetch('/api/open?dir=exports',{method:'POST'}).then(j)}});
  /* ---------- usuário local ---------- */
  var user=Object.freeze({id:function(){return Promise.resolve('local')},me:function(){return Promise.resolve({id:'local',name:'Você'})},profiles:function(ids){var o={};(ids||[]).forEach(function(i){o[i]={id:i,name:i==='local'||i==='Claude'?(i==='Claude'?'Claude':'Você'):''}});return Promise.resolve(o)},
    isOwner:function(){return true},canEdit:function(){return true},can:function(){return true},search:function(){return Promise.resolve([])}});
  /* ---------- Claude (API ou CLI, pelo servidor) ---------- */
  function blobB64(b){return new Promise(function(ok,bad){var r=new FileReader();r.onload=function(){var s=String(r.result);ok({type:b.type||'image/png',data:s.slice(s.indexOf(',')+1)})};r.onerror=bad;r.readAsDataURL(b)})}
  function makeSample(info){
    function call(input,opts){opts=opts||{};
      return Promise.all((opts.images||[]).map(blobB64)).then(function(images){
        return fetch('/api/sample',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({input:input,images:images,modelTier:opts.modelTier||'default',model:opts.model,system:opts.system}),signal:opts.signal})
      }).then(function(r){
        if(!r.ok)return r.json().then(function(b){throw err(b.code||'unavailable',b.message)});
        var rd=r.body.getReader(),dec=new TextDecoder(),buf='',text='',fin=null;
        return (function pump(){return rd.read().then(function(x){
          if(x.done){if(fin)return fin;throw err('api_error','Conexão interrompida')}
          buf+=dec.decode(x.value,{stream:true});var i;
          while((i=buf.indexOf('\n\n'))>=0){var line=buf.slice(0,i);buf=buf.slice(i+2);if(line.indexOf('data:')!==0)continue;var ev=JSON.parse(line.slice(5));
            if(ev.delta){text+=ev.delta;if(opts.onText)try{opts.onText({text:text,delta:ev.delta})}catch(e){}}
            if(ev.done)fin={text:ev.text!=null?ev.text:text,truncated:!!ev.truncated,modelApplied:ev.model};
            if(ev.error){var e=err(ev.code,ev.message);e.text=text;throw e}}
          return pump()})})();
      }).catch(function(e){if(e&&e.name==='AbortError')throw err('cancelled','Cancelado');throw e});
    }
    function parseJSON(t){t=String(t||'').trim().replace(/^```(?:json)?\s*/i,'').replace(/```\s*$/,'');try{return JSON.parse(t)}catch(x){}var a=t.indexOf('{'),b=t.lastIndexOf('}');if(a>=0&&b>a){try{return JSON.parse(t.slice(a,b+1))}catch(x){}}var a2=t.indexOf('['),b2=t.lastIndexOf(']');if(a2>=0&&b2>a2){try{return JSON.parse(t.slice(a2,b2+1))}catch(x){}}throw err('invalid_json','A resposta não veio em JSON.')}
    var s=function(input,opts){return call(input,opts)};
    s.json=function(input,opts){var inp=typeof input==='string'?input+'\n\nResponda somente com JSON válido, sem texto antes ou depois e sem cercas de código.':input;return call(inp,opts).then(function(r){return parseJSON(r.text)})};
    s.limits=function(){return Promise.resolve(info.images?{images:{maxCount:8,maxBytes:5*1024*1024}}:{images:null})};
    return Object.freeze(s);
  }
  var CAPS={db:function(){return db},assets:function(){return assets},downloads:function(){return downloads},user:function(){return user},
    sample:function(){return infoP.then(function(i){return i&&i.provider?makeSample(i):null})},room:function(){return null}};
  window.claude=Object.freeze({use:function(name){var f=CAPS[name];return Promise.resolve(f?f():null)}});
})();
