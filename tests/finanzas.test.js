/* Pruebas del motor de cálculo. Ejecutar: node tests/finanzas.test.js
 * Los datos de este archivo son de prueba y solo existen aquí: la página no los usa. */
'use strict';
var assert = require('assert');
var F = require('../finanzas.js');
var pasadas = 0;
function t(nombre, fn) {
  try { fn(); pasadas++; console.log('  ok   ' + nombre); }
  catch (e) { console.log('  FALLA ' + nombre + '\n       ' + e.message); process.exitCode = 1; }
}
function cerca(a, b, tol, msg) { assert.ok(Math.abs(a - b) <= tol, (msg || '') + ' esperado ' + b + ' ± ' + tol + ', obtuve ' + a); }

console.log('Parseo');
t('montos en varios formatos', function () {
  assert.strictEqual(F.parseMonto('1.234.567'), 1234567);
  assert.strictEqual(F.parseMonto('1,234,567'), 1234567);
  assert.strictEqual(F.parseMonto('$ 20.615'), 20615);
  assert.strictEqual(F.parseMonto('CLP 130674'), 130674);
  assert.strictEqual(F.parseMonto('1.234,56'), 1235);
  assert.strictEqual(F.parseMonto('1,234.56'), 1235);
  assert.strictEqual(F.parseMonto(12000.4), 12000);
  assert.strictEqual(F.parseMonto('-500'), -500);
});
t('montos inválidos', function () {
  ['', 'abc', '12a', '--5', null, undefined].forEach(function (x) { assert.ok(isNaN(F.parseMonto(x)), String(x)); });
});
t('fechas', function () {
  assert.strictEqual(F.parseFecha('2026-11-08'), '2026-11-08');
  assert.strictEqual(F.parseFecha('8/11/2026'), '2026-11-08');
  assert.strictEqual(F.parseFecha('08-11-2026'), '2026-11-08');
  assert.strictEqual(F.parseFecha('31/02/2026'), null);
  assert.strictEqual(F.parseFecha('2026-13-01'), null);
  assert.strictEqual(F.parseFecha('hoy'), null);
});

console.log('Créditos');
t('cuota francesa conocida: 1.000.000 al 2 % mensual en 12 cuotas = 94.559,6', function () {
  cerca(F.cuotaFrancesa(1000000, 0.02, 12), 94559.6, 0.1);
});
t('tasa implícita recupera la tasa usada para generar la cuota', function () {
  [0.005, 0.0245, 0.0333, 0.06].forEach(function (i) {
    [6, 12, 36, 60].forEach(function (n) {
      cerca(F.tasaImplicita(500000, F.cuotaFrancesa(500000, i, n), n), i, 1e-9, 'i=' + i + ' n=' + n);
    });
  });
});
t('cuotas sin interés → tasa 0; cuotas menores que el capital → sin solución', function () {
  assert.strictEqual(F.tasaImplicita(1200, 100, 12), 0);
  assert.strictEqual(F.tasaImplicita(1200, 99, 12), null);
});
t('tasa mensual → anual y de vuelta', function () {
  cerca(F.anualDesdeMensual(0.02), 0.26824, 1e-5);
  cerca(F.mensualDesdeAnual(F.anualDesdeMensual(0.0333)), 0.0333, 1e-12);
});
t('las 4 alternativas de avance de Tenpo (capital 200.000) dan ≈ 3,33 % mensual, como documenta el registro', function () {
  [[2, 105022], [10, 23843], [17, 15597], [24, 12233]].forEach(function (p) {
    cerca(F.tasaImplicita(200000, p[1], p[0]), 0.0333, 0.0005, p[0] + ' cuotas');
  });
});
t('saldo pendiente: al inicio equivale al capital', function () {
  var i = 0.02, c = F.cuotaFrancesa(1000000, i, 24);
  cerca(F.saldoPendiente(c, i, 24), 1000000, 0.01);
  cerca(F.saldoPendiente(c, i, 0), 0, 0);
});
t('pago único anualizado: (pago/capital)^(365/días) − 1', function () {
  cerca(F.anualizadoPagoUnico(31000, 31342, 7), Math.pow(31342 / 31000, 365 / 7) - 1, 1e-12);
  assert.strictEqual(F.anualizadoPagoUnico(31000, 30000, 7), null);
});
t('evaluarOferta: coherencia de totales y alertas', function () {
  var r = F.evaluarOferta({ capital: 200000, plazo: 10, unidad: 'meses', tipo: 'cuotas', pago: 23843 });
  assert.strictEqual(r.total, 238430);
  assert.strictEqual(r.extra, 38430);
  cerca(r.extraPct, 0.19215, 1e-5);
  assert.strictEqual(r.alertas.length, 0);
  var m = F.evaluarOferta({ capital: 4037370, plazo: 60, unidad: 'meses', tipo: 'cuotas', pago: 130674, cae: 0.3002 });
  assert.strictEqual(m.total, 7840440);
  assert.strictEqual(m.extra, 3803070);
  console.log('       MACH: tasa mensual implícita ' + F.pct(m.iM, 3) + ', anual efectiva ' + F.pct(m.iA, 2) + ' (informada CAE 30,02 %)');
  var mp = F.evaluarOferta({ capital: 31000, plazo: 7, unidad: 'dias', tipo: 'pago-unico', pago: 31342 });
  assert.strictEqual(mp.extra, 342);
  console.log('       Mercado Pago 7 días: costo del período ' + F.pct(mp.extraPct, 4) + ', anualizado (extrapolación) ' + F.pct(mp.anualEq, 1));
  assert.ok(F.evaluarOferta({ capital: 0, plazo: 1, tipo: 'cuotas', pago: 1 }).alertas.length === 1);
  assert.ok(F.evaluarOferta({ capital: 1000, plazo: 2, unidad: 'meses', tipo: 'cuotas', pago: 400 }).alertas[0].indexOf('menor que el capital') >= 0);
});

console.log('Control');
var H = '2026-11-08';
var base = [
  { f: '2026-10-05', t: 'Ingreso', d: 'A', m: 1000, e: 'V' },
  { f: '2026-10-10', t: 'Gasto', d: 'Café', m: 100, e: 'D' },
  { f: '2026-10-12', t: 'Costo', d: 'cafe', m: 50, e: 'V' },
  { f: '2026-11-02', t: 'Ingreso', d: 'B', m: 500, e: 'D' },
  { f: '2026-11-03', t: 'Inversión', d: 'Ahorro', m: 200, e: 'V' },
  { f: '2026-11-20', t: 'Gasto', d: 'Arriendo', m: 300, e: 'P' }
];
t('totales y sin destino', function () {
  var T = F.totales(base);
  assert.strictEqual(T.Ingreso, 1500);
  assert.strictEqual(T.egresos, 650);
  assert.strictEqual(T.sinDestino, 850);
});
t('por mes', function () {
  var m = F.porMes(base);
  assert.deepStrictEqual(m.map(function (x) { return x.mes; }), ['2026-10', '2026-11']);
  assert.strictEqual(m[0].Gasto, 100);
  assert.strictEqual(m[1]['Inversión'], 200);
});
t('top de descripciones agrupa sin distinguir mayúsculas ni tildes', function () {
  var top = F.topDescripciones(base, 10);
  assert.strictEqual(top[0].d, 'Arriendo');
  var cafe = top.filter(function (x) { return x.d === 'Café'; })[0];
  assert.strictEqual(cafe.v, 150);
  cerca(top.reduce(function (s, x) { return s + x.pct; }, 0), 1, 1e-12);
});
t('evidencia efectiva: futuro = proyectado; proyectado vencido = declarado', function () {
  assert.strictEqual(F.evEfectiva({ f: '2026-12-01', e: 'V' }, H), 'P');
  assert.strictEqual(F.evEfectiva({ f: '2026-11-01', e: 'P' }, H), 'D');
  assert.strictEqual(F.evEfectiva({ f: '2026-11-01', e: 'V' }, H), 'V');
  assert.strictEqual(F.evEfectiva({ f: '2026-11-08', e: 'D' }, H), 'D');
});
t('respaldo por tipo', function () {
  var R = F.respaldoPorTipo(base, H);
  assert.deepStrictEqual(R.Ingreso, { V: 1000, D: 500, P: 0 });
  assert.deepStrictEqual(R.Gasto, { V: 0, D: 100, P: 300 });
});
t('índice de respaldo solo cuenta lo ya ocurrido', function () {
  // ocurrido: 1000V + 100D + 50V + 500D + 200V = 1850 ; verificado 1250
  cerca(F.indiceRespaldo(base, H), 1250 / 1850, 1e-12);
  assert.strictEqual(F.indiceRespaldo([{ f: '2026-12-01', t: 'Gasto', d: 'x', m: 5, e: 'D' }], H), null);
});
t('caja acumulada: tres líneas coherentes', function () {
  var c = F.cajaAcumulada(base, { m: 400, f: '2026-10-01', e: 'V' }, H);
  // hoy: V = 400+1000-50-200 = 1150 ; VD = 1150 -100 +500 = 1550 ; VDP = 1550 - 300 = 1250
  assert.strictEqual(c.hoy.V, 1150);
  assert.strictEqual(c.hoy.VD, 1550);
  assert.strictEqual(c.hoy.VDP, 1550);
  assert.strictEqual(c.fin.f, '2026-11-20');
  assert.strictEqual(c.fin.V, 1150);
  assert.strictEqual(c.fin.VD, 1550);
  assert.strictEqual(c.fin.VDP, 1250);
  assert.ok(c.puntos.every(function (p, i, a) { return i === 0 || a[i - 1].f < p.f; }), 'fechas únicas y crecientes');
});
t('caja acumulada: saldo inicial declarado no entra en la línea verificada', function () {
  var c = F.cajaAcumulada([], { m: 900, f: '2026-10-01', e: 'D' }, H);
  assert.strictEqual(c.hoy.V, 0);
  assert.strictEqual(c.hoy.VD, 900);
  assert.strictEqual(F.cajaAcumulada([], null, H).hoy, null);
});
t('ingreso promedio: meses completos anteriores; si no hay, mes en curso parcial', function () {
  var r = F.ingresosPromedio(base, H, 3);
  assert.deepStrictEqual(r.meses, ['2026-10']);
  assert.strictEqual(r.V, 1000);
  assert.strictEqual(r.VD, 1000);
  assert.strictEqual(r.parcial, false);
  var s = F.ingresosPromedio([{ f: '2026-11-02', t: 'Ingreso', d: 'x', m: 800, e: 'D' }], H, 3);
  assert.strictEqual(s.parcial, true);
  assert.strictEqual(s.V, 0);
  assert.strictEqual(s.VD, 800);
  assert.strictEqual(F.ingresosPromedio([], H, 3), null);
});

console.log('Validación e importación');
t('validar movimiento', function () {
  assert.strictEqual(F.validarMov({ f: '2026-11-08', t: 'Gasto', d: 'x', m: 10 }), null);
  assert.ok(F.validarMov({ f: '2026-02-31', t: 'Gasto', d: 'x', m: 10 }));
  assert.ok(F.validarMov({ f: '2026-11-08', t: 'Otro', d: 'x', m: 10 }));
  assert.ok(F.validarMov({ f: '2026-11-08', t: 'Gasto', d: '  ', m: 10 }));
  assert.ok(F.validarMov({ f: '2026-11-08', t: 'Gasto', d: 'x', m: 0 }));
  assert.ok(F.validarMov({ f: '2026-11-08', t: 'Gasto', d: 'x', m: -5 }));
});
t('importar CSV con encabezado, comillas y errores', function () {
  var txt = 'fecha;tipo;descripcion;monto;evidencia\n2026-11-01;Gasto;"Super; mercado";12.500;verificado\n05/11/2026;Ingreso;Sueldo;1.000.000;\n31/02/2026;Gasto;x;10;\n2026-11-02;Regalo;y;10;\n2026-11-03;Costo;z;abc;';
  var r = F.importarTexto(txt);
  assert.strictEqual(r.filas.length, 2);
  assert.strictEqual(r.filas[0].d, 'Super; mercado');
  assert.strictEqual(r.filas[0].m, 12500);
  assert.strictEqual(r.filas[0].e, 'V');
  assert.strictEqual(r.filas[1].e, 'D');
  assert.deepStrictEqual(r.errores.map(function (e) { return e.motivo; }), ['fecha no válida', 'tipo no reconocido', 'monto no válido']);
});
t('importar texto pegado desde Excel (tabuladores, sin encabezado)', function () {
  var r = F.importarTexto('2026-11-01\tGasto\tAlmuerzo\t8.900\n2026-11-02\tIngreso\tHonorarios\t150000');
  assert.strictEqual(r.filas.length, 2);
  assert.strictEqual(r.filas[1].m, 150000);
  assert.strictEqual(F.importarTexto('').filas.length, 0);
});
t('encabezado incompleto se rechaza con un mensaje claro', function () {
  var r = F.importarTexto('fecha,monto\n2026-11-01,10');
  assert.strictEqual(r.filas.length, 0);
  assert.ok(r.errores[0].motivo.indexOf('encabezado') >= 0);
});

console.log('\n' + pasadas + ' pruebas pasadas' + (process.exitCode ? ' — HAY FALLAS' : ''));
