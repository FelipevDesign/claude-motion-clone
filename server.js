/* Claude Motion clone — servidor local (sem dependências externas)
   - serve o app em http://localhost:PORT
   - banco de documentos em data/db (um arquivo JSON por documento)
   - mídias sem limite de tamanho em data/media (com suporte a Range para vídeo)
   - exportações salvas em exports/
   - Claude via ANTHROPIC_API_KEY (API) ou pela CLI "claude" instalada (assinatura) */
'use strict';
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{spawn,execFile}=require('child_process');
const ROOT=__dirname;
loadEnv(path.join(ROOT,'.env'));
const PORT=+process.env.PORT||4321;
const DATA=path.resolve(ROOT,process.env.DATA_DIR||'data'),DB=path.join(DATA,'db'),MEDIA=path.join(DATA,'media'),EXPORTS=path.resolve(ROOT,process.env.EXPORT_DIR||'exports');
[DATA,DB,MEDIA,EXPORTS].forEach(d=>fs.mkdirSync(d,{recursive:true}));
const MODELS={quick:process.env.MODEL_QUICK||'claude-haiku-5-5',default:process.env.MODEL_DEFAULT||'claude-sonnet-5-5',complex:process.env.MODEL_COMPLEX||'claude-opus-5-5'};

function loadEnv(f){try{fs.readFileSync(f,'utf8').split(/\r?\n/).forEach(l=>{const m=/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(l);if(m&&!(m[1] in process.env))process.env[m[1]]=m[2].replace(/^["']|["']$/g,'')})}catch(e){}}
const TYPES={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.gif':'image/gif','.webp':'image/webp','.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.mp3':'audio/mpeg','.wav':'audio/wav','.m4a':'audio/mp4','.ogg':'audio/ogg','.glb':'model/gltf-binary','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.txt':'text/plain'};
const NM={three:'three',"mp4-muxer":'mp4-muxer',jszip:'jszip',gifenc:'gifenc','lottie-web':'lottie-web'};

/* ---------- banco de documentos ---------- */
const okSeg=s=>/^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s)&&s!=='.'&&s!=='..';
function docFile(p){const segs=String(p||'').split('/');if(segs.length%2||!segs.every(okSeg))throw new Error('caminho inválido');return path.join(DB,segs.join('~~')+'.json')}
function collPrefix(c){const segs=String(c||'').split('/');if(segs.length%2===0||!segs.every(okSeg))throw new Error('coleção inválida');return segs.join('~~')+'~~'}
function readDoc(p){try{return JSON.parse(fs.readFileSync(docFile(p),'utf8'))}catch(e){return undefined}}
function writeDoc(p,data){const f=docFile(p),tmp=f+'.tmp';fs.writeFileSync(tmp,JSON.stringify(data));fs.renameSync(tmp,f);broadcast(p)}
function listColl(c){const pre=collPrefix(c);return fs.readdirSync(DB).filter(f=>f.startsWith(pre)&&f.endsWith('.json')&&!f.slice(pre.length,-5).includes('~~')).map(f=>{let data;try{data=JSON.parse(fs.readFileSync(path.join(DB,f),'utf8'))}catch(e){return null}return {id:f.slice(pre.length,-5),data}}).filter(Boolean)}
/* eventos em tempo real (Server-Sent Events) para várias abas */
const clients=new Set();
function broadcast(p){const msg='data: '+JSON.stringify({path:p})+'\n\n';clients.forEach(r=>{try{r.write(msg)}catch(e){}})}
setInterval(()=>clients.forEach(r=>{try{r.write(': ping\n\n')}catch(e){}}),25000);

/* ---------- utilidades HTTP ---------- */
function send(res,code,body,type){res.writeHead(code,{'Content-Type':type||'application/json','Cache-Control':'no-store'});res.end(typeof body==='string'||Buffer.isBuffer(body)?body:JSON.stringify(body))}
function readBody(req,limit){return new Promise((ok,bad)=>{const ch=[];let n=0;req.on('data',d=>{n+=d.length;if(limit&&n>limit){bad(new Error('grande demais'));req.destroy()}else ch.push(d)});req.on('end',()=>ok(Buffer.concat(ch)));req.on('error',bad)})}
function serveFile(req,res,f,type){
  fs.stat(f,(err,st)=>{if(err||!st.isFile())return send(res,404,{error:'não encontrado'});
    const t=type||TYPES[path.extname(f).toLowerCase()]||'application/octet-stream',range=req.headers.range;
    if(range){const m=/bytes=(\d*)-(\d*)/.exec(range);let a=m&&m[1]?+m[1]:0,b=m&&m[2]?+m[2]:st.size-1;if(isNaN(a)||a>=st.size){res.writeHead(416,{'Content-Range':'bytes */'+st.size});return res.end()}b=Math.min(b,st.size-1);
      res.writeHead(206,{'Content-Type':t,'Content-Range':`bytes ${a}-${b}/${st.size}`,'Accept-Ranges':'bytes','Content-Length':b-a+1,'Cache-Control':'no-cache'});fs.createReadStream(f,{start:a,end:b}).pipe(res);return}
    res.writeHead(200,{'Content-Type':t,'Content-Length':st.size,'Accept-Ranges':'bytes','Cache-Control':'no-cache'});fs.createReadStream(f).pipe(res);
  });
}
const safeName=s=>String(s||'arquivo').replace(/[\\/:*?"<>|\x00-\x1f]+/g,'-').replace(/^\.+/,'').slice(0,160)||'arquivo';

/* ---------- Claude ---------- */
let CLI=null;
function detectCli(){return new Promise(ok=>{if(process.env.CLAUDE_CLI==='off')return ok(null);const cmd=process.env.CLAUDE_CLI||'claude';execFile(cmd,['--version'],{shell:true,timeout:15000},(e,out)=>ok(e?null:cmd))})}
function provider(){return process.env.ANTHROPIC_API_KEY?'api':CLI?'cli':null}
function toMessages(input){return typeof input==='string'?[{role:'user',content:input}]:input.map(m=>({role:m.role,content:String(m.content)}))}
async function sampleApi(body,onDelta){
  const msgs=toMessages(body.input),imgs=(body.images||[]).slice(0,8);
  if(imgs.length){const last=msgs[msgs.length-1];last.content=[...imgs.map(i=>({type:'image',source:{type:'base64',media_type:i.type,data:i.data}})),{type:'text',text:last.content}]}
  const model=body.model||MODELS[body.modelTier]||MODELS.default;
  const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},
    body:JSON.stringify({model,max_tokens:+process.env.MAX_TOKENS||32000,stream:true,messages:msgs,...(body.system?{system:body.system}:{})}),signal:body.signal});
  if(!r.ok){const t=await r.text();const e=new Error(t.slice(0,400));e.code=r.status===429?'rate_limited':r.status===401?'not_granted':'api_error';throw e}
  let text='',buf='',stop='';const dec=new TextDecoder();
  for await(const chunk of r.body){buf+=dec.decode(chunk,{stream:true});let i;while((i=buf.indexOf('\n'))>=0){const line=buf.slice(0,i).trim();buf=buf.slice(i+1);if(!line.startsWith('data:'))continue;
    try{const ev=JSON.parse(line.slice(5));if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.type==='text_delta'){text+=ev.delta.text;onDelta(ev.delta.text,text)}if(ev.type==='message_delta'&&ev.delta)stop=ev.delta.stop_reason||stop;if(ev.type==='error'){const e=new Error(ev.error&&ev.error.message);e.code='api_error';throw e}}catch(x){if(x.code)throw x}}}
  return {text,truncated:stop==='max_tokens',model};
}
function sampleCli(body,onDelta){return new Promise((ok,bad)=>{
  const msgs=toMessages(body.input);const prompt=msgs.length===1?msgs[0].content:msgs.map(m=>(m.role==='user'?'Pessoa: ':'Claude: ')+m.content).join('\n\n');
  const args=['-p','--output-format','text'];const model=body.model||(body.modelTier==='quick'?'haiku':body.modelTier==='complex'?'opus':'sonnet');if(model)args.push('--model',model);
  const p=spawn(CLI,args,{shell:true,windowsHide:true});let out='',err='';
  p.stdout.on('data',d=>{const s=d.toString('utf8');out+=s;onDelta(s,out)});p.stderr.on('data',d=>err+=d.toString());
  p.on('close',c=>{if(c===0)ok({text:out.trim(),truncated:false,model:'claude-cli'});else{const e=new Error(err.slice(0,400)||'falha na CLI');e.code='api_error';bad(e)}});
  if(body.signal)body.signal.addEventListener('abort',()=>{try{p.kill()}catch(e){}});
  p.stdin.end(prompt,'utf8');
})}

/* ---------- rotas ---------- */
const server=http.createServer(async(req,res)=>{
  const u=new URL(req.url,'http://localhost'),p=decodeURIComponent(u.pathname);
  try{
    if(p==='/'||p==='/index.html')return serveFile(req,res,path.join(ROOT,'public','index.html'));
    if(p==='/shim.js')return serveFile(req,res,path.join(ROOT,'public','shim.js'));
    if(p.startsWith('/nm/')){const segs=p.slice(4).split('/');const pkg=NM[segs[0]];if(!pkg||segs.some(s=>s==='..'))return send(res,404,{});return serveFile(req,res,path.join(ROOT,'node_modules',pkg,...segs.slice(1)))}
    if(p.startsWith('/_blob/')){const id=p.slice(7);if(!/^[a-f0-9]{8,64}$/.test(id))return send(res,404,{});let meta={};try{meta=JSON.parse(fs.readFileSync(path.join(MEDIA,id+'.json'),'utf8'))}catch(e){}return serveFile(req,res,path.join(MEDIA,id),meta.type)}
    if(p==='/api/info')return send(res,200,{local:true,provider:provider(),images:provider()==='api',version:1,exports:EXPORTS,data:DATA});
    if(p==='/api/events'){res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store',Connection:'keep-alive'});res.write(': ok\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return}
    if(p==='/api/db/doc'){const dp=u.searchParams.get('path');
      if(req.method==='GET'){const d=readDoc(dp);return send(res,200,d===undefined?{exists:false}:{exists:true,data:d})}
      if(req.method==='PUT'){const body=JSON.parse((await readBody(req)).toString('utf8')||'{}');writeDoc(dp,body);return send(res,200,{ok:true})}
      if(req.method==='PATCH'){const body=JSON.parse((await readBody(req)).toString('utf8')||'{}');writeDoc(dp,Object.assign({},readDoc(dp)||{},body));return send(res,200,{ok:true})}
      if(req.method==='DELETE'){try{fs.unlinkSync(docFile(dp))}catch(e){}broadcast(dp);return send(res,200,{ok:true})}}
    if(p==='/api/db/list')return send(res,200,listColl(u.searchParams.get('coll')));
    if(p==='/api/assets'&&req.method==='POST'){
      const id=crypto.randomBytes(16).toString('hex'),type=String(req.headers['x-type']||'application/octet-stream'),name=decodeURIComponent(String(req.headers['x-name']||''));
      const out=fs.createWriteStream(path.join(MEDIA,id));let size=0;req.on('data',d=>size+=d.length);req.pipe(out);
      out.on('finish',()=>{fs.writeFileSync(path.join(MEDIA,id+'.json'),JSON.stringify({type,name,size,at:Date.now()}));send(res,200,{id,url:'/_blob/'+id,sizeBytes:size,contentType:type})});
      out.on('error',e=>send(res,500,{code:'io_error',message:e.message}));return}
    if(p==='/api/assets'&&req.method==='GET'){const list=fs.readdirSync(MEDIA).filter(f=>f.endsWith('.json')).map(f=>{try{return Object.assign({id:f.slice(0,-5)},JSON.parse(fs.readFileSync(path.join(MEDIA,f),'utf8')))}catch(e){return null}}).filter(Boolean);return send(res,200,{assets:list,usage:{bytes:list.reduce((a,x)=>a+(x.size||0),0)}})}
    if(p.startsWith('/api/assets/')&&req.method==='DELETE'){const id=p.slice(12);if(/^[a-f0-9]{8,64}$/.test(id)){try{fs.unlinkSync(path.join(MEDIA,id))}catch(e){}try{fs.unlinkSync(path.join(MEDIA,id+'.json'))}catch(e){}}return send(res,200,{ok:true})}
    if(p==='/api/export'&&req.method==='POST'){
      let name=safeName(decodeURIComponent(String(req.headers['x-name']||'arquivo'))),f=path.join(EXPORTS,name),k=1;const ext=path.extname(name),base=name.slice(0,name.length-ext.length);
      while(fs.existsSync(f)){f=path.join(EXPORTS,base+' ('+(k++)+')'+ext)}
      const out=fs.createWriteStream(f);req.pipe(out);out.on('finish',()=>send(res,200,{status:'delivered',path:f}));out.on('error',e=>send(res,500,{code:'io_error',message:e.message}));return}
    if(p==='/api/open'&&req.method==='POST'){const which=u.searchParams.get('dir')==='media'?MEDIA:EXPORTS;const cmd=process.platform==='win32'?'explorer':process.platform==='darwin'?'open':'xdg-open';spawn(cmd,[which],{detached:true,stdio:'ignore'}).unref();return send(res,200,{ok:true})}
    if(p==='/api/sample'&&req.method==='POST'){
      const body=JSON.parse((await readBody(req)).toString('utf8'));const prov=provider();if(!prov)return send(res,400,{code:'sampling_disabled',message:'Configure ANTHROPIC_API_KEY no arquivo .env ou instale a CLI do Claude Code.'});
      res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-store'});const ac=new AbortController();body.signal=ac.signal;res.on('close',()=>{if(!res.writableEnded)ac.abort()});
      const onDelta=(d,t)=>{try{res.write('data: '+JSON.stringify({delta:d})+'\n\n')}catch(e){}};
      try{const r=prov==='api'?await sampleApi(body,onDelta):await sampleCli(body,onDelta);res.write('data: '+JSON.stringify({done:true,text:r.text,truncated:r.truncated,model:r.model})+'\n\n')}
      catch(e){res.write('data: '+JSON.stringify({error:true,code:e.code||'api_error',message:String(e.message||e)})+'\n\n')}
      return res.end()}
    send(res,404,{error:'não encontrado'});
  }catch(e){send(res,500,{code:'server_error',message:String(e.message||e)})}
});
detectCli().then(c=>{CLI=c;server.listen(PORT,'127.0.0.1',()=>{
  console.log('\n  Claude Motion clone rodando em  http://localhost:'+PORT);
  console.log('  Dados:      '+DATA+'\n  Exportações: '+EXPORTS);
  console.log('  Claude:     '+(provider()==='api'?'API (ANTHROPIC_API_KEY)':provider()==='cli'?'CLI do Claude Code ('+CLI+')':'desligado — o chat usa o modo local')+'\n');
  if(process.argv.includes('--open')){const url='http://localhost:'+PORT;const cmd=process.platform==='win32'?'cmd':process.platform==='darwin'?'open':'xdg-open';spawn(cmd,process.platform==='win32'?['/c','start','',url]:[url],{detached:true,stdio:'ignore'}).unref()}
})});
