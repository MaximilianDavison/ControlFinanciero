import { readFile, writeFile, mkdir, cp } from "node:fs/promises";
let html = (await readFile("index.html", "utf8")).replace(/\r\n/g, "\n");
html = html
  .replace(
    /<script src="https:\/\/cdn.jsdelivr.net\/npm\/@supabase[^\n]+\n/,
    "",
  )
  .replace('<script src="config.js"></script>', "");
html = html.replace(
  "se guarda en tu cuenta de Supabase.",
  "se guarda en tu cuenta de Neon.",
);
html = html.replace(
  /var CLOUD=.+?;\n/,
  "var CLOUD=true,qt,busy=false,revision=0,blocked=false;\n",
);
html = html.replace(
  "function uid(){return Math.random().toString(36).slice(2,9)}",
  "function uid(){return crypto.randomUUID()}",
);
html = html.replaceAll(
  "new Date().toISOString().slice(0,10)",
  "new Intl.DateTimeFormat('en-CA',{timeZone:'America/Santiago',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())",
);
html = html.replace(
  "function save(){if(CLOUD){queue();return}try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){}}",
  "function save(){queue()}",
);
html = html.replace(
  "save();kpis();dls();",
  "save();kpis();dls();publishState();",
);
html = html.replace(
  /\/\* ---------- Supabase ---------- \*\/[\s\S]*?(?=<\/script>)/,
  `/* ---------- Neon: sesión verificada en el servidor ---------- */
function cs_(t,bad){$('cs').textContent=t;$('cs').className=bad?'bad':'sub'}
function publishState(){window.financialState=S;window.dispatchEvent(new CustomEvent('financial-state',{detail:S}))}
async function api(path,options){var r=await fetch(path,options),d=await r.json();if(!r.ok){if(r.status===409)blocked=true;throw Error(d.error||'No se pudo completar la solicitud.')}return d}
function queue(){if(blocked)return;cs_('Cambios pendientes…');clearTimeout(qt);qt=setTimeout(flush,700)}
async function flush(){
 if(blocked)return;
 if(busy){queue();return}
 busy=true;var sent=JSON.stringify(S);
 try{var d=await api('/api/state',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(Object.assign({},S,{revision:revision}))});revision=d.revision;cs_('Guardado en Neon ✓');if(sent!==JSON.stringify(S))queue()}
 catch(e){cs_(e.message,1)}finally{busy=false}
}
async function start(){try{S=await api('/api/state');revision=S.revision;delete S.revision;$('app').hidden=false;sync();table();kpis();dls();charts();publishState();cs_('Conectado a Neon.');}catch(e){cs_(e.message,1)}}
var proposals=[],chatHistory=[];
$('interpret').onclick=async function(){proposals=[];$('confirmText').hidden=true;$('preview').textContent='Interpretando…';$('interpret').disabled=true;var text=$('message').value;try{var d=await api('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:text,history:chatHistory})});if(text!==$('message').value){$('preview').textContent='El texto cambió. Vuelve a revisarlo.';return}chatHistory.push({role:'user',content:text},{role:'assistant',content:JSON.stringify(d)});chatHistory=chatHistory.slice(-6);proposals=d.rows;$('preview').textContent=(d.message||'')+'\\n'+proposals.map(function(r){return r.f+' · '+r.t+' · '+r.d+' · '+fm.format(r.m)}).join('\\n');$('confirmText').hidden=!proposals.length}catch(e){$('preview').textContent=e.message}finally{$('interpret').disabled=false}};
$('message').oninput=function(){proposals=[];$('confirmText').hidden=true;$('preview').textContent=''};
$('confirmText').onclick=function(){if(!proposals.length||blocked)return;proposals.forEach(function(r){S.rows.push(Object.assign({id:uid()},r))});proposals=[];chatHistory=[];$('confirmText').hidden=true;$('message').value='';$('preview').textContent='Movimientos agregados al tablero. Revisa el estado de guardado en Neon.';table();update(1)};
window.addEventListener('beforeunload',function(e){if(busy||$('cs').textContent==='Cambios pendientes…'){e.preventDefault();e.returnValue=''}});
start();
`,
);
html = html.replace(
  '<div class="card"><h2>Movimientos (editables)</h2>',
  `<div class="card"><h2>Tu asistente financiero</h2><p class="sub">Cuéntame tus ingresos, gastos o aportes de inversión en pesos chilenos. Revisa la propuesta antes de confirmar. Si falta un dato, responde con la aclaración. El texto se envía a Groq para interpretarlo.</p><textarea id="message" rows="3" style="width:100%" placeholder="Ayer gasté 25 mil en supermercado e invertí 100 mil en mi fondo"></textarea><div class="row"><button id="interpret">Revisar movimientos</button><button id="confirmText" class="p" hidden>Confirmar y agregar</button></div><pre id="preview" style="white-space:pre-wrap" aria-live="polite"></pre></div><div class="card"><h2>Movimientos (editables)</h2>`,
);
html = html.replace(
  "</head>",
  '<link rel="stylesheet" href="/finance-tools.css"></head>',
);
html = html.replace(
  '<div id="app" hidden>',
  `<div id="app" hidden><nav class="finance-tabs" role="tablist" aria-label="Herramientas financieras"><button id="tab-overview" role="tab" data-tab="overview" aria-controls="panel-overview" aria-selected="true">Mi dinero</button><button id="tab-creditos" role="tab" data-tab="creditos" aria-controls="panel-creditos" aria-selected="false" tabindex="-1">Créditos y tarjetas</button><button id="tab-radar" role="tab" data-tab="radar" aria-controls="panel-radar" aria-selected="false" tabindex="-1">Radar de futuro</button></nav><section id="panel-overview" role="tabpanel" aria-labelledby="tab-overview">`,
);
html = html.replace(
  "\n</div>\n</main>",
  "</section>" +
    (await readFile("ui/finance-panels.html", "utf8")) +
    "\n</div>\n</main>",
);
html = html.replace(
  "</body>",
  '<script type="module" src="/finance-tools.js"></script></body>',
);
await mkdir("public", { recursive: true });
await writeFile("public/tablero.html", html);
await cp("lib/finance.mjs", "public/finance.mjs");
await cp("ui/finance-tools.js", "public/finance-tools.js");
await cp("ui/finance-tools.css", "public/finance-tools.css");
for (const dir of ["comercial"])
  await cp(dir, "public/" + dir, { recursive: true });
console.log("Tablero adaptado a Neon; páginas existentes conservadas.");
