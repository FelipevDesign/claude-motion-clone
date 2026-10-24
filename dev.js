// Modo desenvolvimento: gera o app, sobe o servidor e refaz tudo ao salvar arquivos em src/ ou o server.js
const {spawn,execFileSync}=require('child_process'),fs=require('fs'),path=require('path');
const ROOT=__dirname;let srv=null,timer=null,first=true;
function build(){try{execFileSync(process.execPath,[path.join(ROOT,'build.js')],{stdio:'inherit'});return true}catch(e){console.log('  Build falhou, corrija o erro e salve de novo.');return false}}
function start(){if(srv){srv.kill();srv=null}const args=[path.join(ROOT,'server.js')];if(first){args.push('--open');first=false}srv=spawn(process.execPath,args,{stdio:'inherit'})}
function watch(target,fn){fs.watch(target,{recursive:true},()=>{clearTimeout(timer);timer=setTimeout(fn,250)})}
build();start();
watch(path.join(ROOT,'src'),()=>{if(build())console.log('  App atualizado: recarregue a página no navegador (F5).')});
watch(path.join(ROOT,'public','shim.js'),()=>console.log('  shim.js alterado: recarregue a página (F5).'));
watch(path.join(ROOT,'server.js'),()=>{console.log('  Reiniciando o servidor...');start()});
process.on('SIGINT',()=>{if(srv)srv.kill();process.exit()});
