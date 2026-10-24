// Gera public/index.html a partir de src/ (node build.js)
const fs=require('fs'),path=require('path');
const S=p=>fs.readFileSync(path.join(__dirname,'src',p),'utf8');
const parts=['p2_model.js','p3_render.js','p3b_fx.js','p4_ui.js','p5_panel.js','p6_panels.js','p7_media_chat.js','p7b_phase4.js','p9_formats.js','p9b_hf.js','p8b_projects.js','p8_export_init.js'];
let html='<!doctype html>\n<html lang="pt-BR">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0;padding:0}[hidden]{display:none!important}</style>\n<script src="/shim.js"></script>\n</head>\n<body>\n'+S('p1_head.html')+'\n<script>\n(function(){\n'+parts.map(S).join('')+'\n})();\n</script>\n</body>\n</html>\n';
const MAP={'https://cdn.jsdelivr.net/npm/three@0.147.0/':'/nm/three/','https://cdn.jsdelivr.net/npm/mp4-muxer@5.1.3/':'/nm/mp4-muxer/',
 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js':'/nm/jszip/dist/jszip.min.js','https://cdn.jsdelivr.net/npm/gifenc@1.0.3/dist/gifenc.esm.js':'/nm/gifenc/dist/gifenc.esm.js',
 'https://cdnjs.cloudflare.com/ajax/libs/lottie-web/5.12.2/lottie_canvas.min.js':'/nm/lottie-web/build/player/lottie_canvas.min.js',
 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/':'/nm/heic2any/','https://cdn.jsdelivr.net/npm/ag-psd@31.0.2/':'/nm/ag-psd/','https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js':'/nm/xlsx/dist/xlsx.full.min.js'};
for(const [a,b] of Object.entries(MAP))html=html.split(a).join(b);
fs.writeFileSync(path.join(__dirname,'public','index.html'),html);
const js=html.slice(html.indexOf('<script>\n(function(){')+8,html.lastIndexOf('</script>'));try{new Function(js);console.log('OK public/index.html',Math.round(html.length/1024)+' KB')}catch(e){console.error('Erro de sintaxe:',e.message);process.exit(1)}
