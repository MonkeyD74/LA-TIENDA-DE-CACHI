// optimizar.js — Optimiza La Tienda de Cachi para conexiones lentas.
// Uso: node optimizar.js   (correr en la raíz del repo)
// Es idempotente: si ya se aplicó, no rompe nada.
const fs = require('fs');

function leer(p){ return fs.readFileSync(p, 'utf8'); }
function escribir(p, s){ fs.writeFileSync(p, s); console.log('✔ escrito', p, Math.round(s.length/1024)+' KB'); }
function reemplazar(nombre, src, buscar, nuevo){
  if (src.includes(nuevo)) { console.log('• ya aplicado:', nombre); return src; }
  if (!src.includes(buscar)) { console.error('✘ NO ENCONTRADO:', nombre); process.exit(1); }
  console.log('✔', nombre);
  return src.replace(buscar, nuevo);
}

// ---------- 1. api/productos.js : caché edge de Vercel ----------
let prod = leer('api/productos.js');
prod = reemplazar('productos: cache edge', prod,
  "res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');",
  "res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');");
escribir('api/productos.js', prod);

// ---------- 2. api/imagen.js : caché edge larga para imágenes ----------
let img = leer('api/imagen.js');
img = reemplazar('imagen: cache edge', img,
  "res.setHeader('Cache-Control', 'public, max-age=86400');",
  "res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400');");
escribir('api/imagen.js', img);

// ---------- 3. index.html ----------
let html = leer('public/index.html');

// 3a. Extraer blobs base64 (audios _B y frames _G) a media.js diferido
const reB = /<script>window\._B=\[[\s\S]*?\];<\/script>\s*/;
const reG = /<script>window\._G=\[[\s\S]*?\];<\/script>\s*/;
const mB = html.match(reB), mG = html.match(reG);
if (mB && mG) {
  const media = mB[0].replace(/<\/?script>/g,'') + '\n' +
                mG[0].replace(/<\/?script>/g,'') + '\n' +
                'window.dispatchEvent(new Event("mediaready"));\n';
  escribir('public/media.js', media);
  html = html.replace(reB, '');
  html = html.replace(reG, '<script defer src="/media.js"></script>\n');
  console.log('✔ blobs extraídos a media.js');
} else if (fs.existsSync('public/media.js')) {
  console.log('• blobs ya extraídos');
} else { console.error('✘ no se encontraron los blobs'); process.exit(1); }

// 3b. Variables globales sin depender de media.js
html = reemplazar('vars sin blobs', html,
  'var BARKS=window._B,GIF_FRAMES=window._G,allProducts=[],catActiva=null,catsData={};',
  'var BARKS=[],GIF_FRAMES=[],allProducts=[],catActiva=null,catsData={};window.perritoClick=function(){};');

// 3c. Perrito: inicializar solo cuando media.js llegue (no bloquea nada)
const perritoIni = 'var perrito=document.getElementById("perritoGif");';
const perritoFin = 'au.volume=0.5;au.play();}catch(e){}}';
let i1 = html.indexOf(perritoIni), i2 = html.indexOf(perritoFin);
if (i1 !== -1 && i2 !== -1 && !html.includes('function initPerrito()')) {
  i2 += perritoFin.length;
  const bloque = html.slice(i1, i2);
  html = html.slice(0, i1) +
    'function initPerrito(){' + bloque +
    'window.perritoClick=perritoClick;}\n' +
    'window.addEventListener("mediaready",function(){BARKS=window._B;GIF_FRAMES=window._G;initPerrito();});' +
    html.slice(i2);
  console.log('✔ perrito diferido');
} else { console.log('• perrito ya diferido'); }

// 3d. Fuegos artificiales: arrancan 1.2s después de load (no compiten con productos)
const fwIni = '(function(){var canvas=document.getElementById("fw-canvas")';
const fwFin = 'else ctx.clearRect(0,0,canvas.width,canvas.height);}loop();})();';
i1 = html.indexOf(fwIni); i2 = html.indexOf(fwFin);
if (i1 !== -1 && i2 !== -1 && !html.includes('/*fw-defer*/')) {
  i2 += fwFin.length;
  const fw = html.slice(i1, i2);
  html = html.slice(0, i1) +
    '/*fw-defer*/window.addEventListener("load",function(){setTimeout(function(){' + fw + '},1200);});' +
    html.slice(i2);
  console.log('✔ fuegos artificiales diferidos');
} else { console.log('• fuegos ya diferidos'); }

// 3e. Skeleton elegante en vez del spinner
html = reemplazar('skeleton HTML', html,
  '<div id="loading" class="loading"><div class="loading-spin"></div><br>Cargando inventario...</div>',
  `<div id="loading" class="loading"><div class="sk-wrap"><div class="sk-bar"></div><div class="sk-grid"><div class="sk-card"></div><div class="sk-card"></div><div class="sk-card"></div><div class="sk-card"></div><div class="sk-card"></div><div class="sk-card"></div></div></div><div style="margin-top:10px;font-size:0.8rem">Cargando inventario...</div></div>`);
html = reemplazar('skeleton CSS', html,
  '@keyframes spin{to{transform:rotate(360deg)}}',
  `@keyframes spin{to{transform:rotate(360deg)}}
.sk-wrap{max-width:900px;margin:0 auto;padding:0 14px;}
.sk-bar{height:34px;border-radius:8px;margin-bottom:14px;background:linear-gradient(90deg,#e3eaf6 25%,#f2f6ff 50%,#e3eaf6 75%);background-size:200% 100%;animation:skm 1.2s infinite;}
.sk-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.sk-card{height:150px;border-radius:12px;background:linear-gradient(90deg,#e3eaf6 25%,#f2f6ff 50%,#e3eaf6 75%);background-size:200% 100%;animation:skm 1.2s infinite;}
@keyframes skm{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media(max-width:768px){.sk-grid{grid-template-columns:repeat(2,1fr);}}`);

// 3f. Imágenes: decodificación async además del lazy loading existente
html = reemplazar('img decoding async', html,
  `img="<img loading='lazy' src='/api/imagen?url="`,
  `img="<img loading='lazy' decoding='async' src='/api/imagen?url="`);

// 3g. cargarProductos: caché localStorage (pinta al instante en visitas repetidas)
html = reemplazar('cargarProductos con caché local', html,
  `async function cargarProductos(){try{var res=await fetch("/api/productos");var data=await res.json();allProducts=data.productos;document.getElementById("totalSub").textContent=data.total+" productos";document.getElementById("timestamp").textContent="Actualizado: "+new Date(data.timestamp).toLocaleString("es-MX");document.getElementById("timestamp").classList.remove("hidden");catsData={};allProducts.forEach(function(p){if(!catsData[p.cat])catsData[p.cat]=[];catsData[p.cat].push(p);});renderSidebar();renderMenu();document.getElementById("loading").classList.add("hidden");document.getElementById("mainLayout").classList.remove("hidden");}catch(e){document.getElementById("loading").innerHTML="<div style='color:#CC1A1A'>Error cargando productos.</div>";}}`,
  `function aplicarDatos(data){allProducts=data.productos;document.getElementById("totalSub").textContent=data.total+" productos";document.getElementById("timestamp").textContent="Actualizado: "+new Date(data.timestamp).toLocaleString("es-MX");document.getElementById("timestamp").classList.remove("hidden");catsData={};allProducts.forEach(function(p){if(!catsData[p.cat])catsData[p.cat]=[];catsData[p.cat].push(p);});var enMenu=document.getElementById("cat-content").classList.contains("hidden");if(enMenu){renderSidebar();renderMenu();}document.getElementById("loading").classList.add("hidden");document.getElementById("mainLayout").classList.remove("hidden");}
async function cargarProductos(){var pintadoDeCache=false;try{var c=localStorage.getItem("cachiProds");if(c){var cj=JSON.parse(c);if(cj&&cj.data&&cj.data.productos&&cj.data.productos.length){aplicarDatos(cj.data);pintadoDeCache=true;}}}catch(e){}
try{var res=await fetch("/api/productos");var data=await res.json();if(data&&data.productos){aplicarDatos(data);try{localStorage.setItem("cachiProds",JSON.stringify({t:Date.now(),data:data}));}catch(e){}}}catch(e){if(!pintadoDeCache){document.getElementById("loading").innerHTML="<div style='color:#CC1A1A'>Error cargando productos. Revisa tu conexión y recarga.</div>";}}}`);

// 3h. renderSidebar y renderMenu: una sola escritura al DOM (antes: innerHTML+= en loop)
html = reemplazar('renderSidebar en un paso', html,
  `function renderSidebar(){var sortedCats=Object.keys(catsData).sort();var list=document.getElementById("sidebarList");list.innerHTML="<li class='sidebar-item active' data-cat='Todos' onclick='clickSidebar(this,\\"Todos\\")'><div class='sidebar-item-icon' style='background:#0D47A1'>\\u{1F3E0}</div><div><div class='sidebar-item-name'>Todos</div><div class='sidebar-item-count'>"+allProducts.length+" productos</div></div></li>";sortedCats.forEach(function(cat){var c=getColor(cat);var disp=catsData[cat].filter(function(p){return p.stock>0;}).length;list.innerHTML+="<li class='sidebar-item' data-cat='"+cat+"' onclick='clickSidebar(this,\\""+cat.replace(/"/g,"")+"\\")'><div class='sidebar-item-icon' style='background:"+c.bg+"'>"+getEmoji(cat)+"</div><div><div class='sidebar-item-name'>"+cat+"</div><div class='sidebar-item-count'>"+catsData[cat].length+" - "+disp+" disp</div></div></li>";});}`,
  `function renderSidebar(){var sortedCats=Object.keys(catsData).sort();var h="<li class='sidebar-item active' data-cat='Todos' onclick='clickSidebar(this,\\"Todos\\")'><div class='sidebar-item-icon' style='background:#0D47A1'>\\u{1F3E0}</div><div><div class='sidebar-item-name'>Todos</div><div class='sidebar-item-count'>"+allProducts.length+" productos</div></div></li>";sortedCats.forEach(function(cat){var c=getColor(cat);var disp=catsData[cat].filter(function(p){return p.stock>0;}).length;h+="<li class='sidebar-item' data-cat='"+cat+"' onclick='clickSidebar(this,\\""+cat.replace(/"/g,"")+"\\")'><div class='sidebar-item-icon' style='background:"+c.bg+"'>"+getEmoji(cat)+"</div><div><div class='sidebar-item-name'>"+cat+"</div><div class='sidebar-item-count'>"+catsData[cat].length+" - "+disp+" disp</div></div></li>";});document.getElementById("sidebarList").innerHTML=h;}`);
html = reemplazar('renderMenu en un paso', html,
  `function renderMenu(){var mg=document.getElementById("menuGrid");mg.innerHTML="";Object.keys(catsData).sort().forEach(function(cat){var c=getColor(cat);var prods=catsData[cat];var disp=prods.filter(function(p){return p.stock>0;}).length;mg.innerHTML+="<div class='menu-card' onclick='openCat(\\""+cat.replace(/"/g,"")+"\\")' style='border-color:"+c.borde+"'><div class='menu-card-icon' style='background:"+c.bg+"'>"+getEmoji(cat)+"</div><div class='menu-card-name'>"+cat+"</div><div class='menu-card-count'>"+prods.length+" - "+disp+" disponibles</div></div>";});}`,
  `function renderMenu(){var h="";Object.keys(catsData).sort().forEach(function(cat){var c=getColor(cat);var prods=catsData[cat];var disp=prods.filter(function(p){return p.stock>0;}).length;h+="<div class='menu-card' onclick='openCat(\\""+cat.replace(/"/g,"")+"\\")' style='border-color:"+c.borde+"'><div class='menu-card-icon' style='background:"+c.bg+"'>"+getEmoji(cat)+"</div><div class='menu-card-name'>"+cat+"</div><div class='menu-card-count'>"+prods.length+" - "+disp+" disponibles</div></div>";});document.getElementById("menuGrid").innerHTML=h;}`);

// 3i. openCat: render por lotes de 30 (la pantalla responde de inmediato)
html = reemplazar('openCat por lotes', html,
  'document.getElementById("cat-grid").innerHTML=prods.map(cardHTML).join("");',
  'renderLotes(document.getElementById("cat-grid"),prods);');
html = reemplazar('helper renderLotes', html,
  'function openCat(cat){',
  `var _lote=0;
function renderLotes(el,prods){var mi=++_lote;var i=0,TAM=30;el.innerHTML=prods.slice(0,TAM).map(cardHTML).join("");i=TAM;
function mas(){if(mi!==_lote)return;if(i>=prods.length)return;el.insertAdjacentHTML("beforeend",prods.slice(i,i+TAM).map(cardHTML).join(""));i+=TAM;setTimeout(mas,60);}
if(i<prods.length)setTimeout(mas,60);}
function openCat(cat){`);

// 3j. Búsqueda con debounce (antes re-renderizaba en cada tecla)
html = reemplazar('debounce búsqueda', html,
  `oninput="buscarGlobal()"`,
  `oninput="buscarDebounce()"`);
html = reemplazar('helper debounce', html,
  'function buscarGlobal(){',
  `var _bt;function buscarDebounce(){clearTimeout(_bt);_bt=setTimeout(buscarGlobal,250);}
function buscarGlobal(){`);
// resultados de búsqueda también por lotes
html = reemplazar('búsqueda por lotes', html,
  'document.getElementById("busqueda-grid").innerHTML=res.map(cardHTML).join("");',
  'renderLotes(document.getElementById("busqueda-grid"),res);');

escribir('public/index.html', html);
console.log('\nListo. index.html ahora pesa', Math.round(html.length/1024), 'KB (antes 532 KB).');
