// fase2.js — Convierte los frames del perrito PNG→WebP q85 dentro de public/media.js
// Requiere cwebp:  pkg install libwebp
// Idempotente. Deja backup en public/media.js.bak
const fs=require('fs'),cp=require('child_process'),os=require('os'),path=require('path');
const MJS='public/media.js';
let m=fs.readFileSync(MJS,'utf8');
if(m.includes('image/webp')){console.log('• ya aplicado');process.exit(0);}
try{cp.execSync('cwebp -version',{stdio:'pipe'});}
catch(e){console.error('✘ falta cwebp — corre:  pkg install libwebp');process.exit(1);}
const g=m.match(/window\._G=(\[[^\]]*\]);/);
if(!g){console.error('✘ no encontré window._G en media.js');process.exit(1);}
const frames=JSON.parse(g[1].replace(/'/g,'"'));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'perrito-'));
let antes=0,despues=0;
const nuevos=frames.map(function(f,i){
  const b=Buffer.from(f.split(',')[1],'base64');antes+=b.length;
  const pin=path.join(tmp,i+'.png'),pout=path.join(tmp,i+'.webp');
  fs.writeFileSync(pin,b);
  cp.execSync('cwebp -quiet -q 85 "'+pin+'" -o "'+pout+'"');
  const w=fs.readFileSync(pout);despues+=w.length;
  return 'data:image/webp;base64,'+w.toString('base64');
});
fs.copyFileSync(MJS,MJS+'.bak');
m=m.replace(g[0],'window._G='+JSON.stringify(nuevos)+';');
fs.writeFileSync(MJS,m);
console.log('✔ '+frames.length+' frames PNG→WebP q85: '+Math.round(antes/1024)+' KB → '+Math.round(despues/1024)+' KB');
console.log('✔ media.js: '+Math.round(m.length/1024)+' KB (backup en media.js.bak)');
