/* Prueba de extremo a extremo en un navegador real (Playwright).
 * Uso: node tests/e2e.js [ruta/a/index.html]
 * Los datos que se escriben aquí son de prueba y solo viven en un navegador temporal. */
'use strict';
var path = require('path'), fs = require('fs'), os = require('os');
var chromium = require('playwright').chromium;
var Fin = require('../finanzas.js');
var URL = 'file://' + path.resolve(process.argv[2] || path.join(__dirname, '..', 'index.html'));
var fallas = 0, pasadas = 0;
function ok(nombre, cond, detalle) {
  if (cond) { pasadas++; console.log('  ok    ' + nombre); }
  else { fallas++; console.log('  FALLA ' + nombre + (detalle !== undefined ? '\n        → ' + detalle : '')); }
}
function iso(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
function dia(n) { var d = new Date(); d.setDate(d.getDate() + n); return iso(d); }
var salida = process.env.SALIDA || os.tmpdir();

(async function () {
  var browser = await chromium.launch();
  async function nuevo(opts) {
    var ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 900 }, acceptDownloads: true }, opts || {}));
    var p = await ctx.newPage(); p.errores = [];
    p.on('pageerror', function (e) { p.errores.push(e.message); });
    p.on('console', function (m) { if (m.type() === 'error') p.errores.push(m.text()); });
    p.on('dialog', function (d) { d.accept(); });
    return { ctx: ctx, p: p };
  }
  var t = async function (p, sel) { return (await p.innerText(sel)).replace(/\s+/g, ' ').trim(); };
  var tc = async function (p, sel) { return (await p.textContent(sel)).replace(/\s+/g, ' ').trim(); };
  var abrir = function (p) { return p.evaluate(function () { document.querySelectorAll('details').forEach(function (d) { d.open = true; }); }); };
  var CL = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  var m$ = function (n) { return (n < 0 ? '−' : '') + '$' + CL.format(Math.abs(Math.round(n))); };
  async function agregar(p, f, tipo, desc, monto, ev, doc) {
    await p.fill('#m-fecha', f); await p.selectOption('#m-tipo', tipo); await p.fill('#m-desc', desc); await p.fill('#m-monto', monto);
    if (ev === 'V') { await p.selectOption('#m-ev', 'V'); await p.fill('#m-doc', doc || 'Cartola de prueba'); }
    await p.click('#m-ok');
  }

  console.log('A · Arranque sin datos de ejemplo');
  var A = await nuevo(), p = A.p;
  await p.goto(URL); await p.waitForTimeout(300);
  ok('parte en la pestaña Control', (await t(p, '[aria-selected="true"]')) === 'Control');
  ok('estado vacío visible y sin movimientos', (await p.isVisible('#c-vacio')) && !(await p.isVisible('#c-datos')));
  ok('el almacenamiento no tiene movimientos', (await p.evaluate(function () { return localStorage.getItem('orden_financiero_v3'); })) === null);
  ok('9 opciones reales de ofertas observadas (4 Tenpo + 4 Mercado Pago + 1 MACH)', (await p.$$eval('#f-tabla tr.main', function (x) { return x.length; })) === 9);
  var tab = await t(p, '#f-tabla'), tabTodo = await tc(p, '#f-tabla');
  ok('la oferta de MACH trae la alerta corta: implícita 34,5% frente a CAE 30,0%', /Tasa implícita 34,5% frente a CAE informada 30,0%/.test(tab), tab.slice(0, 300));
  ok('Tenpo: ~3,33% mensual implícita en el detalle', (tabTodo.match(/3,33%/g) || []).length >= 4);
  ok('Mercado Pago 7 días: 1,1% del capital y anual extrapolada con asterisco', /\+\$342 · 1,1%/.test(tab) && /≈ 77% \*/.test(tab));
  ok('no hay deuda registrada: lo dice', /simulaciones, no deuda/.test(await t(p, '#fin-carga')));
  ok('la decisión invita a agregar un depósito (no inventa datos)', /Agregar mi depósito a plazo/.test(await t(p, '#dec')) && (await p.$$eval('#dap-lista .item', function (x) { return x.length; })) === 0);
  ok('brecha vacía', (await p.click('#tab-brecha'), await p.isVisible('#b-vacio')));
  ok('sin errores de JS', p.errores.length === 0, p.errores.join(' | '));

  console.log('B · Documentos ya capturados se traen solo si el usuario quiere');
  await p.click('#tab-control');
  ok('ofrece el cargo de Claude documentado', /20\.615/.test(await t(p, '#c-hechos')));
  await p.click('[data-hecho]'); await p.waitForTimeout(150);
  ok('queda como Declarado y aparece el KPI de gastos', /\$20\.615/i.test(await t(p, '#kpis')) && /Declarado/.test(await t(p, '#l-tabla')));
  ok('la tarjeta de ofrecimiento desaparece', !(await p.isVisible('#c-hechos')));
  ok('fecha futura fuerza «Proyectado»', await (async function () {
    await p.fill('#m-fecha', dia(5)); await p.dispatchEvent('#m-fecha', 'change');
    var d = await p.$eval('#m-ev', function (e) { return e.disabled && e.value === 'P'; }); return d;
  })());
  await p.evaluate(function () { document.querySelectorAll('details').forEach(function (d) { d.open = true; }); });
  await p.click('#bk-borrar'); await p.waitForTimeout(150);
  ok('borrar todo deja la página vacía', await p.isVisible('#c-vacio'));

  console.log('C · Cifras del control contra cálculo manual');
  await agregar(p, dia(-40), 'Ingreso', 'Honorarios A', '1.000.000', 'V', 'Cartola prueba 1');
  await agregar(p, dia(-35), 'Gasto', 'Café', '100.000');
  await agregar(p, dia(-3), 'Costo', 'Herramienta', '50.000', 'V', 'Cartola prueba 2');
  await agregar(p, dia(-1), 'Ingreso', 'Honorarios B', '500.000');
  await agregar(p, dia(10), 'Gasto', 'Arriendo', '300.000');
  await p.selectOption('#periodo', 'todo'); await p.waitForTimeout(150);
  var k = await t(p, '#kpis');
  ok('ingresos $1.500.000', /Ingresos \$1\.500\.000/i.test(k), k);
  ok('costos $50.000', /Costos \$50\.000/i.test(k));
  ok('gastos $400.000', /Gastos \$400\.000/i.test(k));
  ok('sin destino $1.050.000', /Sin destino \$1\.050\.000/i.test(k));
  ok('ingresos: 67% verificado (1.000.000 de 1.500.000)', /Ingresos \$1\.500\.000 67% verificado/i.test(k));
  ok('tabla de movimientos con 5 filas y el futuro marcado Proyectado', (await p.$$eval('#l-tabla tr', function (x) { return x.length; })) === 5 && /Proyectado/.test(await t(p, '#l-tabla')));
  ok('gráfico mensual dibujado con barras', (await p.$$eval('#g-meses svg rect', function (x) { return x.length; })) >= 3);
  ok('top: Arriendo encabeza los egresos (300.000 de 450.000 = 66,7%)', /Arriendo \$300\.000 · 66,7%/.test(await t(p, '#g-top')));
  ok('barra de destino con segmento sin destino', await p.isVisible('#destino .sd'));

  console.log('D · Validaciones del formulario');
  await agregar(p, dia(-2), 'Gasto', '', '1000'); ok('rechaza descripción vacía', /descripción/.test(await t(p, '#m-msg')));
  await agregar(p, dia(-2), 'Gasto', 'x', '0'); ok('rechaza monto cero', /mayor que cero/.test(await t(p, '#m-msg')));
  await p.fill('#m-desc', 'x'); await p.fill('#m-monto', '500'); await p.selectOption('#m-ev', 'V'); await p.fill('#m-doc', ''); await p.click('#m-ok');
  ok('verificado sin documento se rechaza', /documento/.test(await t(p, '#m-msg')));
  await p.selectOption('#m-ev', 'D'); await p.fill('#m-desc', ''); await p.fill('#m-monto', '');

  console.log('E · Editar y eliminar');
  await p.click('#l-tabla tr:has-text("Café") [data-act="ed"]');
  ok('editar carga el formulario', (await p.inputValue('#m-desc')) === 'Café' && /Editar/.test(await t(p, '#m-titulo')));
  await p.fill('#m-monto', '120.000'); await p.click('#m-ok'); await p.waitForTimeout(150);
  ok('guardar cambios actualiza el monto', /\$120\.000/.test(await t(p, '#l-tabla')) && /Gastos \$420\.000/i.test(await t(p, '#kpis')));
  await p.click('#l-tabla tr:has-text("Café") [data-act="del"]'); await p.waitForTimeout(150);
  ok('eliminar quita la fila', !/Café/.test(await t(p, '#l-tabla')) && /Gastos \$300\.000/i.test(await t(p, '#kpis')));
  await agregar(p, dia(-35), 'Gasto', 'Café', '100.000');

  console.log('F · Brecha de evidencia contra cálculo manual');
  await p.click('#tab-brecha');
  await p.fill('#s-monto', '200.000'); await p.fill('#s-fecha', dia(-60)); await p.click('#f-saldo button[type=submit]'); await p.waitForTimeout(150);
  var b = await t(p, '#b-kpis');
  ok('caja respaldada hoy $950.000 (1.000.000 − 50.000; el saldo declarado no cuenta)', /Caja respaldada hoy \$950\.000/i.test(b), b);
  ok('caja declarada hoy $1.550.000', /Caja declarada hoy \$1\.550\.000/i.test(b));
  ok('brecha $600.000', /Brecha de respaldo \$600\.000/i.test(b));
  ok('índice de respaldo 64%', /Índice de respaldo 64%/i.test(b));
  ok('caja esperada $1.250.000 (resta el arriendo proyectado)', /Caja esperada al \d\d\/\d\d\/\d{4} \$1\.250\.000/i.test(b));
  ok('gráfico de caja con 3 líneas y zona', (await p.$$eval('#b-grafico svg path', function (x) { return x.length; })) >= 4);
  var cerrar = await t(p, '#b-cerrar');
  ok('lista para cerrar la brecha: primero el mayor sin respaldo (Honorarios B)', cerrar.indexOf('Honorarios B') >= 0 && cerrar.indexOf('Honorarios B') < cerrar.indexOf('Café'), cerrar.slice(0, 200));
  await p.click('#b-cerrar [data-ver]'); await p.click('[data-ver-ok]'); await p.waitForTimeout(100);
  ok('verificar sin documento no hace nada', /Brecha de respaldo \$600\.000/i.test(await t(p, '#b-kpis')));
  await p.fill('#ver-doc', 'Cartola prueba 3'); await p.click('[data-ver-ok]'); await p.waitForTimeout(150);
  b = await t(p, '#b-kpis');
  ok('al verificar, respaldada $1.450.000 y brecha $100.000', /Caja respaldada hoy \$1\.450\.000/i.test(b) && /Brecha de respaldo \$100\.000/i.test(b), b);
  ok('quedó el documento de respaldo', /Cartola prueba 3/.test(await (async function () { await p.click('#tab-control'); return t(p, '#l-tabla'); })()));
  await p.click('#tab-brecha');

  console.log('G · Financiamiento con datos del usuario');
  await p.click('#tab-financiamiento'); await abrir(p);
  await p.fill('#o-inst', 'Banco de prueba'); await p.fill('#o-prod', 'Crédito de consumo'); await p.selectOption('#o-estado', 'Contratado');
  await p.fill('#o-capital', '1.000.000'); await p.fill('#o-plazo', '12'); await p.fill('#o-pago', '94.560'); await p.fill('#o-tasa', '2'); await p.selectOption('#o-tasaper', 'mensual'); await p.fill('#o-cae', '27');
  await p.click('#f-of button[type=submit]'); await p.waitForTimeout(150);
  var fila = await tc(p, '#f-tabla tr:has-text("Banco de prueba")');
  ok('tasa implícita ≈ 2,00% mensual y 26,8% anual', /2,00%/.test(fila) && /26,8%/.test(fila), fila);
  ok('sin alerta de CAE cuando la informada (27%) coincide con la implícita', !/CAE informada/.test(fila));
  ok('aparece en «Mis créditos» con su saldo', /Banco de prueba/.test(await t(p, '#cred-lista')) && /saldo estimado/.test(await t(p, '#cred-lista')));
  var carga = await t(p, '#fin-carga');
  ok('carga financiera: cuotas $94.560 sobre ingreso $1.000.000 → 9%', /\$94\.560/.test(carga) && /9% – 9%/.test(carga), carga);
  await p.fill('#f-tmc', '20'); await p.dispatchEvent('#f-tmc', 'change'); await p.waitForTimeout(150);
  ok('con TMC 20%: alerta corta en las ofertas con tasa anual implícita mayor (≥ 6 filas)', (await p.$$eval('#f-tabla tr.main', function (x) { return x.filter(function (r) { return /Supera la TMC/.test(r.textContent); }).length; })) >= 6);
  await p.selectOption('#f-orden', 'anual');
  var primera = await t(p, '#f-tabla tr.main:first-child');
  ok('orden por tasa anual: la menor primero (Banco de prueba 26,8%)', /Banco de prueba/.test(primera), primera.slice(0, 80));
  await p.fill('#o-inst', 'Banco malo'); await p.fill('#o-prod', 'Y'); await p.selectOption('#o-estado', 'Cotización'); await p.fill('#o-capital', '1000'); await p.fill('#o-plazo', '2'); await p.fill('#o-pago', '400'); await p.click('#f-of button[type=submit]'); await p.waitForTimeout(150);
  ok('cuotas que suman menos que el capital: queda marcado como dato inconsistente', /Las cuotas suman menos que el capital/.test(await t(p, '#f-tabla')));
  await p.click('#f-tabla tr.main:has-text("Banco malo") summary'); await p.click('#f-tabla tr.main:has-text("Banco malo") [data-del-of]'); await p.waitForTimeout(100);
  await p.fill('#o-inst', 'Banco unico'); await p.fill('#o-prod', 'Z'); await p.selectOption('#o-tipo', 'pago-unico'); await p.fill('#o-capital', '10.000'); await p.fill('#o-plazo', '7'); await p.fill('#o-pago', '9.000'); await p.click('#f-of button[type=submit]');
  ok('pago único menor que el capital se rechaza', /no tiene sentido/.test(await t(p, '#o-msg')));
  await p.selectOption('#o-tipo', 'cuotas');
  await p.click('#cred-lista [data-del-of]'); await p.waitForTimeout(150);
  ok('quitar un crédito propio', !/Banco de prueba/.test(await tc(p, '#f-tabla')) && !/Banco de prueba/.test(await t(p, '#cred-lista')));
  await p.fill('#q-inst', 'Banco'); await p.fill('#q-prod', 'Tarjeta'); await p.fill('#q-cupo', '500.000'); await p.fill('#q-usado', '600.000'); await p.click('#f-cupo button[type=submit]');
  ok('rechaza utilizado mayor que el cupo', /superar/.test(await t(p, '#q-msg')));
  await p.fill('#q-usado', '100.000'); await p.click('#f-cupo button[type=submit]'); await p.waitForTimeout(150);
  ok('agrega tarjeta con utilización 20,0% y cupo que cuadra', /20,0%/.test(await t(p, '#cupos-lista')) && (await t(p, '#cupos-lista')).match(/El cupo cuadra/g).length === 2);

  console.log('H · Importación, exportación y respaldo');
  await p.click('#tab-control'); await p.evaluate(function () { document.querySelectorAll('details').forEach(function (d) { d.open = true; }); });
  await p.fill('#imp-txt', dia(-3) + '\tCosto\tHerramienta\t50.000\n' + dia(-20) + '\tGasto\tLibros\t12.500\nfecha-mala\tGasto\tz\t1\n' + dia(-19) + '\tOtro\tw\t5');
  await p.click('#imp-leer'); await p.waitForTimeout(150);
  var prev = await t(p, '#imp-prev');
  ok('vista previa: 2 válidas, 2 con problemas, 1 ya existe', /2 filas válidas/.test(prev) && /2 con problemas/.test(prev) && /1 ya existen/.test(prev), prev.slice(0, 160));
  var antes = await p.$$eval('#l-tabla tr', function (x) { return x.length; });
  await p.click('#imp-ok'); await p.waitForTimeout(150);
  await p.selectOption('#periodo', 'todo'); await p.waitForTimeout(100);
  var despues = await p.$$eval('#l-tabla tr', function (x) { return x.length; });
  ok('importó solo la nueva (omite el duplicado)', despues === antes + 1 && /Libros/.test(await t(p, '#l-tabla')), antes + ' → ' + despues);
  var dl = p.waitForEvent('download'); await p.click('#exp-csv'); var d1 = await dl; var csv = fs.readFileSync(await d1.path(), 'utf8');
  ok('exporta CSV con encabezado y evidencia', /^﻿fecha;tipo;descripcion;monto;evidencia/.test(csv) && /Honorarios A;1000000;verificado/.test(csv), csv.slice(0, 120));
  var dl2 = p.waitForEvent('download'); await p.click('#bk-json'); var d2 = await dl2; var rutaBk = await d2.path();
  var bk = JSON.parse(fs.readFileSync(rutaBk, 'utf8'));
  ok('respaldo JSON v3 con los movimientos y el saldo', bk.v === 3 && bk.mov.length === despues && bk.saldo && bk.saldo.m === 200000);
  await p.click('#bk-borrar'); await p.waitForTimeout(150);
  ok('tras borrar no queda nada', await p.isVisible('#c-vacio'));
  await p.setInputFiles('#bk-file', rutaBk); await p.waitForTimeout(250);
  await p.selectOption('#periodo', 'todo'); await p.waitForTimeout(100);
  ok('restaurar devuelve los datos', !(await p.isVisible('#c-vacio')) && /Honorarios A/.test(await t(p, '#l-tabla')));
  await p.reload(); await p.waitForTimeout(250);
  ok('los datos persisten al recargar', /Honorarios A/.test(await t(p, '#l-tabla')) || (await p.selectOption('#periodo', 'todo'), /Honorarios A/.test(await t(p, '#l-tabla'))));


  console.log('L · Depósitos a plazo y decisión: invertir o pagar deuda');
  await p.click('#tab-financiamiento'); await abrir(p);
  var di = dia(-30), dv = dia(60);
  // validaciones
  await p.fill('#d-inst', 'Banco DAP'); await p.fill('#d-monto', '5.000.000'); await p.fill('#d-tasa', '0,45'); await p.fill('#d-f0', dv); await p.fill('#d-fv', di); await p.click('#f-dap button[type=submit]');
  ok('rechaza vencimiento anterior al inicio', /posterior/.test(await t(p, '#d-msg')));
  await p.selectOption('#d-tipo', 'uf'); await p.fill('#d-f0', di); await p.fill('#d-fv', dv); await p.click('#f-dap button[type=submit]');
  ok('UF exige la variación supuesta', /variación anual de la UF/.test(await t(p, '#d-msg')));
  await p.selectOption('#d-tipo', 'pesos');
  ok('en pesos aparece «La tasa es» y no la variación de UF', (await p.isVisible('#d-per')) && !(await p.isVisible('#d-uf')));
  // depósito en pesos
  await p.fill('#d-f0', di); await p.fill('#d-fv', dv); await p.selectOption('#d-per', 'mensual'); await p.click('#f-dap button[type=submit]'); await p.waitForTimeout(150);
  var dl = await t(p, '#dap-lista');
  ok('depósito: monto, tasa mensual, anual efectiva y vencimiento', /\$5\.000\.000/.test(dl) && /0,45% mensual/.test(dl) && /≈ 5,5% anual efectiva/.test(dl) && /Vence en 60 días/.test(dl), dl);
  ok('intereses ganados hoy $22.500 y valor al vencimiento $5.067.500 (cálculo manual)', /Intereses ganados hoy: \$22\.500/.test(dl) && /recibes: \$5\.067\.500/.test(dl), dl);
  ok('sin crédito contratado, las comparaciones 1 a 3 lo piden y la 4 espera el monto', /Registra un crédito contratado/.test(await t(p, '#r1')) && /Escribe el monto/.test(await t(p, '#r4')));
  // crédito contratado con cuotas pagadas
  await p.fill('#o-inst', 'Banco crédito'); await p.fill('#o-prod', 'Consumo'); await p.selectOption('#o-estado', 'Contratado'); await p.fill('#o-capital', '1.000.000'); await p.fill('#o-plazo', '12'); await p.fill('#o-pago', '94.560');
  ok('al elegir «Contratado» aparecen cuotas pagadas y costo de prepago', (await p.isVisible('#o-pagadas')) && (await p.isVisible('#o-prepago')));
  await p.fill('#o-pagadas', '12'); await p.click('#f-of button[type=submit]');
  ok('cuotas pagadas ≥ plazo se rechaza', /menos que el plazo/.test(await t(p, '#o-msg')));
  await p.fill('#o-pagadas', '6'); await p.click('#f-of button[type=submit]'); await p.waitForTimeout(200);
  var sc = Fin.saldoCredito({ capital: 1000000, plazo: 12, pago: 94560, pagadas: 6 });
  var d1 = { monto: 5000000, tipo: 'pesos', tasa: 0.45, per: 'mensual', f0: di, fv: dv, retiro: 'sin-costo' };
  var cred = { saldo: sc.saldo, iM: sc.iM, pago: 94560 };
  ok('«Mis créditos»: quedan 6 de 12 y saldo estimado = valor presente de 6 cuotas', new RegExp('quedan 6 de 12').test(await t(p, '#cred-lista')) && (await t(p, '#cred-lista')).indexOf(m$(sc.saldo)) >= 0, m$(sc.saldo) + ' | ' + (await t(p, '#cred-lista')));
  // 1 · costo diario
  var a = Fin.costoDiario(d1, cred), r1 = await t(p, '#r1');
  ok('1 · cada $100.000 rinden ' + m$(a.rendPor100k) + ' y cuestan ' + m$(a.costoPor100k) + ' al día', r1.indexOf('rinden ' + m$(a.rendPor100k)) >= 0 && r1.indexOf('cuestan ' + m$(a.costoPor100k)) >= 0, r1);
  ok('1 · veredicto: la deuda pesa ' + a.razon.toFixed(1).replace('.', ',') + ' veces más', r1.indexOf('pesa ' + a.razon.toFixed(1).replace('.', ',') + ' veces más') >= 0, r1);
  // 2 · pagar hoy
  var b = Fin.pagarHoy(d1, cred, Fin.hoyISO(), 0), r2 = await t(p, '#r2');
  ok('2 · pagar hoy ahorra ' + m$(b.ventajaPagar) + ' hasta el vencimiento', r2.indexOf('Pagar hoy te ahorra ' + m$(b.ventajaPagar)) >= 0, r2);
  ok('2 · rescate hoy ' + m$(b.rescate) + ' y abono ' + m$(b.abono), r2.indexOf(m$(b.rescate)) >= 0 && r2.indexOf('Pagas ' + m$(b.abono)) >= 0, r2);
  // 3 · extender vs prepagar (N = 1)
  var c = Fin.extenderVsPrepagar(d1, cred, Fin.hoyISO(), 1, 0), r3 = await t(p, '#r3');
  ok('3 · prepagar rinde ' + m$(c.ventajaPrepagar) + ' más que extender 1 día', r3.indexOf('Prepagar rinde ' + m$(c.ventajaPrepagar) + ' más que extender 1 día') >= 0, r3);
  await p.fill('#dec-n', '30'); await p.waitForTimeout(100);
  var c30 = Fin.extenderVsPrepagar(d1, cred, Fin.hoyISO(), 30, 0);
  ok('3 · con N = 30 recalcula sin perder el foco', (await t(p, '#r3')).indexOf(m$(c30.ventajaPrepagar)) >= 0 && (await p.evaluate(function () { return document.activeElement.id; })) === 'dec-n');
  // 4 · crédito nuevo vs inversión (referencia: la oferta más barata)
  await p.fill('#dec-x', '1.000.000'); await p.waitForTimeout(100);
  var ofs = await p.$$eval('#dec-of option', function (o) { return o.map(function (x) { return x.textContent; }); });
  ok('4 · las ofertas de referencia vienen ordenadas de la más barata (2,00 % mensual primero)', /2,00% mensual/.test(ofs[0]) && ofs.length >= 6, ofs.slice(0, 3).join(' | '));
  await p.selectOption('#dec-of', { index: 0 }); await p.waitForTimeout(100);
  var iMref = Fin.tasaImplicita(1000000, 94560, 12), nu = Fin.creditoNuevoVsInversion(d1, Fin.hoyISO(), 1000000, 12, iMref), r4 = await t(p, '#r4');
  ok('4 · usar la inversión cuesta ' + m$(nu.diferencia) + ' menos que endeudarte', r4.indexOf('Usar tu inversión te cuesta ' + m$(nu.diferencia) + ' menos que endeudarte') >= 0, r4);
  ok('4 · intereses: crédito ' + m$(nu.costoCredito) + ' contra ' + m$(nu.costoInversion) + ' que dejas de ganar', r4.indexOf(m$(nu.costoCredito)) >= 0 && r4.indexOf(m$(nu.costoInversion)) >= 0, r4);
  await p.fill('#dec-x', '9.000.000'); await p.waitForTimeout(100);
  ok('4 · avisa cuando el depósito no alcanza', /no alcanza/.test(await t(p, '#r4')));
  await p.fill('#dec-x', '1.000.000');
  // depósito en UF
  await p.selectOption('#d-tipo', 'uf'); await p.fill('#d-inst', 'Banco UF'); await p.fill('#d-monto', '2.000.000'); await p.fill('#d-tasa', '2'); await p.fill('#d-uf', '4'); await p.fill('#d-f0', di); await p.fill('#d-fv', dv); await p.selectOption('#d-retiro', 'pierde-intereses');
  await p.click('#f-dap button[type=submit]'); await p.waitForTimeout(200);
  dl = await t(p, '#dap-lista');
  ok('UF: muestra la tasa real, la variación supuesta y que es proyección', /UF \+ 2% real \(supones UF 4% anual\)/.test(dl) && /≈ 6,1% anual efectiva \(proyección\)/.test(dl), dl);
  await p.selectOption('#dec-dap', { label: (await p.$$eval('#dec-dap option', function (o) { return o.map(function (x) { return x.textContent; }); })).filter(function (x) { return /Banco UF/.test(x); })[0] }); await p.waitForTimeout(100);
  ok('retiro «pierde intereses»: la comparación 2 lo declara', /sin intereses, según lo que indicaste/.test(await t(p, '#r2')));
  ok('en UF la comparación 1 avisa que es proyección', /proyección con UF 4% anual/.test(await t(p, '#r1')));
  await p.reload(); await p.waitForTimeout(300); await p.click('#tab-financiamiento');
  ok('al recargar persisten depósitos y la selección de la decisión', (await p.$$eval('#dap-lista .item', function (x) { return x.length; })) === 2 && (await p.inputValue('#dec-x')) === '1.000.000');
  await p.click('#dap-lista .item:has-text("Banco UF") [data-del-dap]'); await p.waitForTimeout(150);
  ok('quitar un depósito', (await p.$$eval('#dap-lista .item', function (x) { return x.length; })) === 1);
  await p.click('#dap-lista [data-del-dap]'); await p.waitForTimeout(150);
  ok('sin depósitos vuelve la invitación a agregar uno', /Agregar mi depósito a plazo/.test(await t(p, '#dec')));
  await p.click('#dec-abrir'); await p.waitForTimeout(150);
  ok('el botón abre el formulario del depósito', await p.isVisible('#d-inst'));
  await p.click('#cred-lista [data-del-of]'); await p.waitForTimeout(100);

  await p.click('#tab-control'); await p.waitForTimeout(100);

  console.log('I · Seguridad: texto del usuario no se ejecuta');
  await agregar(p, dia(-2), 'Gasto', '<img src=x onerror="window.__x=1"><b>x</b>', '1.000'); await p.waitForTimeout(200);
  ok('el HTML escrito se muestra como texto y no se ejecuta', (await p.evaluate(function () { return window.__x; })) === undefined && /<img src=x/.test(await t(p, '#l-tabla')));
  ok('sin errores de JS en toda la sesión', p.errores.length === 0, p.errores.join(' | '));
  await A.ctx.close();

  console.log('J · Datos de ejemplo de la versión anterior');
  var M = await nuevo(); p = M.p;
  var v2 = { auto: 1, p: { saldo: 1179594, tasa: 4.6, meses: 3 }, rows: [
    { id: 'a', f: '2026-11-01', t: 'Gasto', d: 'Gastos fijos del mes', m: 400000 }, { id: 'b', f: '2026-11-05', t: 'Costo', d: 'Cuota tarjeta (consumo)', m: 125100 },
    { id: 'c', f: '2026-11-05', t: 'Costo', d: 'Mantención + impuesto tarjeta', m: 6111 }, { id: 'd', f: '2026-11-15', t: 'Ingreso', d: 'Sueldo', m: 1120000 },
    { id: 'e', f: '2026-11-15', t: 'Ingreso', d: 'Rendimiento ahorro 24/7', m: 4522 }, { id: 'f', f: '2026-11-20', t: 'Gasto', d: 'Emergencia', m: 120000 } ] };
  await M.ctx.addInitScript(function (v) { if (!localStorage.getItem('orden_financiero_v2') && !localStorage.getItem('__visto')) { localStorage.setItem('orden_financiero_v2', JSON.stringify(v)); localStorage.setItem('__visto', '1'); } }, v2);
  await p.goto(URL); await p.waitForTimeout(300);
  var bn = await t(p, '#migr');
  ok('solo ejemplos: avisa que no son datos suyos y no los importa', /6 movimientos de ejemplo/.test(bn) && await p.isVisible('#c-vacio'), bn);
  await p.click('[data-mig="descartar"]'); await p.waitForTimeout(150);
  ok('al descartar desaparece el aviso y sigue vacío', !(await p.isVisible('#migr')) && await p.isVisible('#c-vacio'));
  await p.reload(); await p.waitForTimeout(250);
  ok('no vuelve a aparecer tras recargar', !(await p.isVisible('#migr')));
  await M.ctx.close();

  var M2 = await nuevo(); p = M2.p;
  var v2b = JSON.parse(JSON.stringify(v2)); v2b.rows.push({ id: 'z', f: '2026-10-10', t: 'Ingreso', d: 'Cliente real', m: 777000 });
  await M2.ctx.addInitScript(function (v) { if (!localStorage.getItem('__visto')) { localStorage.setItem('orden_financiero_v2', JSON.stringify(v)); localStorage.setItem('__visto', '1'); } }, v2b);
  await p.goto(URL); await p.waitForTimeout(300);
  bn = await t(p, '#migr');
  ok('mezcla: distingue 6 de ejemplo y 1 propio', /7 movimientos/.test(bn) && /6 coinciden/.test(bn) && /1 no/.test(bn), bn);
  await p.click('[data-mig="propios"]'); await p.waitForTimeout(200);
  await p.selectOption('#periodo', 'todo'); await p.waitForTimeout(100);
  var tl = await t(p, '#l-tabla');
  ok('importa solo el propio, como Declarado, y ninguno de ejemplo', /Cliente real/.test(tl) && !/Sueldo/.test(tl) && /Declarado/.test(tl) && !(await p.isVisible('#migr')), tl);
  ok('sin errores de JS', p.errores.length === 0, p.errores.join(' | '));
  await M2.ctx.close();

  console.log('K · Móvil, teclado y modo oscuro');
  var Mv = await nuevo({ viewport: { width: 390, height: 844 } }); p = Mv.p;
  await p.goto(URL); await p.waitForTimeout(200);
  await agregar(p, dia(-40), 'Ingreso', 'Honorarios A', '1.000.000', 'V', 'Cartola'); await agregar(p, dia(-3), 'Gasto', 'Arriendo', '300.000'); await agregar(p, dia(10), 'Costo', 'Seguro', '30.000');
  await p.click('#tab-brecha'); await p.fill('#s-monto', '200000'); await p.click('#f-saldo button[type=submit]');
  for (var nombre of ['control', 'financiamiento', 'brecha']) {
    await p.click('#tab-' + nombre); await p.waitForTimeout(150);
    var ancho = await p.evaluate(function () { return document.documentElement.scrollWidth; });
    ok('móvil 390px sin scroll horizontal en ' + nombre + ' (' + ancho + ')', ancho <= 390);
    await p.screenshot({ path: path.join(salida, 'movil-' + nombre + '.png'), fullPage: true });
  }
  await p.click('#tab-control'); await p.focus('#tab-control'); await p.keyboard.press('ArrowRight');
  ok('flechas del teclado cambian de pestaña', (await t(p, '[aria-selected="true"]')) === 'Financiamiento');
  ok('hay enlace para saltar al contenido', (await p.$$('a.skip')).length === 1);
  ok('todos los campos del formulario tienen etiqueta', await p.evaluate(function () {
    return Array.prototype.every.call(document.querySelectorAll('#f-mov input,#f-mov select'), function (e) { return e.labels && e.labels.length; });
  }));
  await Mv.ctx.close();
  var Dk = await nuevo({ colorScheme: 'dark' }); p = Dk.p; await p.goto(URL); await p.waitForTimeout(200);
  await agregar(p, dia(-3), 'Ingreso', 'Honorarios', '500.000'); await agregar(p, dia(-2), 'Gasto', 'Arriendo', '200.000'); await p.waitForTimeout(150);
  await p.screenshot({ path: path.join(salida, 'oscuro-control.png'), fullPage: true });
  var fondo = await p.evaluate(function () { return getComputedStyle(document.body).backgroundColor; });
  ok('modo oscuro aplica fondo oscuro (' + fondo + ')', /rgb\(1[0-9], \d+, \d+\)|rgb\(\d, \d+, \d+\)/.test(fondo));
  await Dk.ctx.close();
  await browser.close();
  console.log('\n' + pasadas + ' comprobaciones superadas' + (fallas ? ', ' + fallas + ' FALLAN' : ''));
  process.exitCode = fallas ? 1 : 0;
})().catch(function (e) { console.error('ERROR DE LA PRUEBA', e); process.exit(2); });
