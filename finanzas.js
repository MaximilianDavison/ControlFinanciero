/* Orden financiero · motor de cálculo.
 * Funciones puras, sin acceso al DOM, para poder auditarlas con pruebas (tests/finanzas.test.js).
 * Toda cifra que muestra la página sale de aquí o de datos que el usuario escribió. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Fin = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TIPOS = ['Ingreso', 'Inversión', 'Costo', 'Gasto'];

  /* ---------- formato ---------- */
  function pct(x, dec) {
    if (x === null || x === undefined || !isFinite(x)) return '—';
    return (x * 100).toFixed(dec === undefined ? 1 : dec).replace('.', ',') + '%';
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- parseo de lo que escribe el usuario ---------- */
  /* Acepta "1.234.567", "1,234,567", "$ 1234", "1234,5". Devuelve un entero (CLP) o NaN. */
  function parseMonto(s) {
    if (typeof s === 'number') return isFinite(s) ? Math.round(s) : NaN;
    var x = String(s == null ? '' : s).trim().replace(/clp/ig, '').replace(/[\s$]/g, '');
    if (!x || !/^[-+]?[\d.,]+$/.test(x)) return NaN;
    var neg = x.charAt(0) === '-';
    x = x.replace(/^[-+]/, '');
    var dots = (x.match(/\./g) || []).length, commas = (x.match(/,/g) || []).length, v;
    if (dots && commas) {
      var dec = x.lastIndexOf('.') > x.lastIndexOf(',') ? '.' : ',';
      var th = dec === '.' ? ',' : '.';
      v = parseFloat(x.split(th).join('').replace(dec, '.'));
    } else if (dots || commas) {
      var sep = dots ? '.' : ',', parts = x.split(sep), last = parts[parts.length - 1];
      if ((dots || commas) > 1 || (last.length === 3 && parts[0].length >= 1 && parts[0].length <= 3)) v = parseFloat(parts.join(''));
      else v = parseFloat(parts.join('.'));
    } else v = parseFloat(x);
    if (!isFinite(v)) return NaN;
    v = Math.round(v);
    return neg ? -v : v;
  }
  function fechaValida(y, m, d) {
    var dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
  /* "2026-11-08", "08/11/2026", "8-11-2026" → "2026-11-08"; null si no es una fecha real. */
  function parseFecha(s) {
    var x = String(s == null ? '' : s).trim(), m, y, mo, d;
    if ((m = x.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = x.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else return null;
    return fechaValida(y, mo, d) ? y + '-' + pad(mo) + '-' + pad(d) : null;
  }
  function hoyISO(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function mesDe(f) { return f.slice(0, 7); }
  function sinTildes(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, ''); }

  /* ---------- matemática de créditos ---------- */
  /* Cuota mensual constante (sistema francés), cuotas vencidas. i = tasa mensual (0,02 = 2 %). */
  function cuotaFrancesa(capital, i, n) {
    if (!(capital > 0 && n > 0)) return NaN;
    if (!i) return capital / n;
    return capital * i / (1 - Math.pow(1 + i, -n));
  }
  /* Tasa mensual implícita: la que iguala el capital recibido con el valor presente de las n cuotas.
   * Es la TIR del flujo. Incluye cualquier cargo que esté dentro de la cuota. null si no hay solución (cuotas < capital). */
  function tasaImplicita(capital, cuota, n) {
    if (!(capital > 0 && cuota > 0 && n > 0)) return null;
    var total = cuota * n;
    if (Math.abs(total - capital) < 0.5) return 0;
    if (total < capital) return null;
    var lo = 0, hi = 1, k, m, pv;
    for (k = 0; k < 120; k++) {
      m = (lo + hi) / 2;
      pv = cuota * (1 - Math.pow(1 + m, -n)) / m;
      if (pv > capital) lo = m; else hi = m;
    }
    return (lo + hi) / 2;
  }
  function anualDesdeMensual(i) { return Math.pow(1 + i, 12) - 1; }
  function mensualDesdeAnual(a) { return Math.pow(1 + a, 1 / 12) - 1; }
  /* Extrapolación para pagos únicos de pocos días: (pago/capital)^(365/días) − 1. Solo sirve para comparar; NO es la CAE. */
  function anualizadoPagoUnico(capital, pago, dias) {
    if (!(capital > 0 && pago >= capital && dias > 0)) return null;
    return Math.pow(pago / capital, 365 / dias) - 1;
  }
  /* Valor presente de las cuotas que faltan: estimación del saldo adeudado. */
  function saldoPendiente(cuota, i, restantes) {
    if (!(cuota > 0 && restantes > 0)) return 0;
    if (!i) return cuota * restantes;
    return cuota * (1 - Math.pow(1 + i, -restantes)) / i;
  }

  /* o = {capital, plazo, unidad:'meses'|'dias', tipo:'cuotas'|'pago-unico', pago, tasaMensual?, cae?}
   * tasaMensual y cae son fracciones (0,0245). Devuelve cifras + alertas en lenguaje claro. */
  function evaluarOferta(o) {
    var r = { total: null, extra: null, extraPct: null, iM: null, iA: null, anualEq: null, alertas: [], cortas: [] };
    var cap = o.capital, pago = o.pago, n = o.plazo;
    if (!(cap > 0 && pago > 0 && n > 0)) { r.alertas.push('Faltan datos para calcular.'); r.cortas.push('Faltan datos'); return r; }
    if (o.tipo === 'cuotas') {
      r.total = pago * n;
      r.iM = tasaImplicita(cap, pago, n);
      if (r.iM !== null) r.iA = anualDesdeMensual(r.iM);
      else { r.alertas.push('La suma de las cuotas es menor que el capital: revisa los datos.'); r.cortas.push('Las cuotas suman menos que el capital'); }
    } else {
      r.total = pago;
      if (o.unidad === 'dias') r.anualEq = anualizadoPagoUnico(cap, pago, n);
    }
    r.extra = r.total - cap;
    r.extraPct = r.extra / cap;
    if (o.cae != null && r.iA != null && Math.abs(r.iA - o.cae) > 0.01) {
      r.alertas.push('La tasa efectiva anual implícita (' + pct(r.iA) + ') difiere de la CAE informada (' + pct(o.cae) +
        ') en ' + (Math.abs(r.iA - o.cae) * 100).toFixed(1).replace('.', ',') +
        ' puntos. Puede deberse a seguros, comisiones, impuestos, la fecha del primer pago o un error de lectura: verifica el contrato.');      r.cortas.push('Tasa implícita ' + pct(r.iA) + ' frente a CAE informada ' + pct(o.cae));
    }
    if (o.tasaMensual != null && r.iM != null && r.iM - o.tasaMensual > 0.0015) {
      r.alertas.push('La tasa mensual implícita (' + pct(r.iM, 2) + ') es mayor que la informada (' + pct(o.tasaMensual, 2) +
        '): la cuota podría incluir otros cargos.');      r.cortas.push('Tasa mensual implícita ' + pct(r.iM, 2) + ' mayor que la informada ' + pct(o.tasaMensual, 2));
    }
    return r;
  }

  /* ---------- evidencia de cada movimiento ---------- */
  /* V verificado (cartola/comprobante) · D declarado (lo dice el usuario) · P proyectado (fecha futura).
   * Una fecha futura es siempre P; un P cuya fecha ya pasó se trata como D hasta que se confirme. */
  function evEfectiva(m, hoy) {
    if (m.f > hoy) return 'P';
    return m.e === 'V' ? 'V' : 'D';
  }
  function signo(t) { return t === 'Ingreso' ? 1 : -1; }

  /* ---------- agregados del control ---------- */
  function totales(movs) {
    var T = { Ingreso: 0, 'Inversión': 0, Costo: 0, Gasto: 0 };
    movs.forEach(function (m) { T[m.t] += m.m; });
    T.egresos = T['Inversión'] + T.Costo + T.Gasto;
    T.sinDestino = T.Ingreso - T.egresos;
    return T;
  }
  function porMes(movs) {
    var map = {};
    movs.forEach(function (m) {
      var k = mesDe(m.f);
      if (!map[k]) map[k] = { mes: k, Ingreso: 0, 'Inversión': 0, Costo: 0, Gasto: 0 };
      map[k][m.t] += m.m;
    });
    return Object.keys(map).sort().map(function (k) { return map[k]; });
  }
  function topDescripciones(movs, n) {
    var map = {}, total = 0;
    movs.forEach(function (m) {
      if (m.t === 'Ingreso') return;
      var k = sinTildes(m.d.trim().toLowerCase());
      if (!map[k]) map[k] = { d: m.d.trim(), v: 0, porTipo: {} };
      map[k].v += m.m; total += m.m;
      map[k].porTipo[m.t] = (map[k].porTipo[m.t] || 0) + m.m;
    });
    var arr = Object.keys(map).map(function (k) {
      var x = map[k], best = null;
      Object.keys(x.porTipo).forEach(function (t) { if (best === null || x.porTipo[t] > x.porTipo[best]) best = t; });
      return { d: x.d, v: x.v, t: best, pct: total ? x.v / total : 0 };
    });
    arr.sort(function (a, b) { return b.v - a.v; });
    return arr.slice(0, n || 10);
  }
  /* Monto por tipo y nivel de evidencia: { Ingreso:{V,D,P}, ... } */
  function respaldoPorTipo(movs, hoy) {
    var R = {};
    TIPOS.forEach(function (t) { R[t] = { V: 0, D: 0, P: 0 }; });
    movs.forEach(function (m) { R[m.t][evEfectiva(m, hoy)] += m.m; });
    return R;
  }
  /* Parte del dinero ya ocurrido (fecha ≤ hoy) que está respaldada por evidencia verificada. null si no hay nada ocurrido. */
  function indiceRespaldo(movs, hoy) {
    var v = 0, tot = 0;
    movs.forEach(function (m) {
      if (m.f > hoy) return;
      tot += m.m;
      if (m.e === 'V') v += m.m;
    });
    return tot ? v / tot : null;
  }
  /* Caja acumulada en tres versiones:
   *   V    solo lo verificado
   *   VD   lo verificado + lo declarado (todo lo ya ocurrido)
   *   VDP  lo anterior + lo proyectado (movimientos con fecha futura)
   * saldo = {m, f, e} opcional (saldo inicial con su evidencia). Devuelve puntos en escalera y los valores de hoy. */
  function cajaAcumulada(movs, saldo, hoy) {
    var ev = [];
    if (saldo && isFinite(saldo.m)) ev.push({ f: saldo.f, v: saldo.m, e: saldo.e === 'V' ? 'V' : 'D' });
    movs.forEach(function (m) { ev.push({ f: m.f, v: signo(m.t) * m.m, e: evEfectiva(m, hoy) }); });
    if (!ev.length) return { puntos: [], hoy: null, fin: null };
    ev.sort(function (a, b) { return a.f < b.f ? -1 : a.f > b.f ? 1 : 0; });
    var fechas = [], seen = {};
    ev.forEach(function (e) { if (!seen[e.f]) { seen[e.f] = 1; fechas.push(e.f); } });
    if (!seen[hoy]) { fechas.push(hoy); fechas.sort(); }
    var V = 0, VD = 0, VDP = 0, i = 0, puntos = [], deHoy = null;
    fechas.forEach(function (f) {
      while (i < ev.length && ev[i].f === f) {
        var e = ev[i++];
        if (e.e === 'V') { V += e.v; VD += e.v; VDP += e.v; }
        else if (e.e === 'D') { VD += e.v; VDP += e.v; }
        else VDP += e.v;
      }
      var p = { f: f, V: V, VD: VD, VDP: VDP };
      puntos.push(p);
      if (f === hoy) deHoy = p;
    });
    return { puntos: puntos, hoy: deHoy, fin: puntos[puntos.length - 1] };
  }
  /* Ingreso mensual promedio para medir la carga financiera, en dos versiones: solo verificado y verificado + declarado.
   * Usa hasta n meses completos anteriores al actual con ingresos; si no hay, el mes en curso (parcial). */
  function ingresosPromedio(movs, hoy, n) {
    var mesHoy = mesDe(hoy), porM = {};
    movs.forEach(function (m) {
      if (m.t !== 'Ingreso' || m.f > hoy) return;
      var k = mesDe(m.f);
      if (!porM[k]) porM[k] = { V: 0, VD: 0 };
      porM[k].VD += m.m;
      if (m.e === 'V') porM[k].V += m.m;
    });
    var meses = Object.keys(porM).filter(function (k) { return k < mesHoy && porM[k].VD > 0; }).sort().slice(-(n || 3));
    var parcial = false;
    if (!meses.length && porM[mesHoy] && porM[mesHoy].VD > 0) { meses = [mesHoy]; parcial = true; }
    if (!meses.length) return null;
    var sV = 0, sVD = 0;
    meses.forEach(function (k) { sV += porM[k].V; sVD += porM[k].VD; });
    return { V: sV / meses.length, VD: sVD / meses.length, meses: meses, parcial: parcial };
  }

  /* ---------- validación e importación ---------- */
  function normalizarTipo(s) {
    var x = sinTildes(String(s || '').trim().toLowerCase());
    if (x === 'ingreso' || x === 'ingresos') return 'Ingreso';
    if (x === 'inversion' || x === 'inversiones') return 'Inversión';
    if (x === 'costo' || x === 'costos') return 'Costo';
    if (x === 'gasto' || x === 'gastos') return 'Gasto';
    return null;
  }
  function normalizarEvidencia(s) {
    var x = sinTildes(String(s || '').trim().toLowerCase());
    return (x === 'v' || x === 'verificado' || x === 'cartola') ? 'V' : 'D';
  }
  /* Devuelve un texto de error o null. */
  function validarMov(m) {
    if (!m.f || !parseFecha(m.f)) return 'La fecha no es válida.';
    if (TIPOS.indexOf(m.t) < 0) return 'El tipo debe ser Ingreso, Inversión, Costo o Gasto.';
    if (!m.d || !String(m.d).trim()) return 'Falta la descripción.';
    if (!(m.m > 0) || !isFinite(m.m)) return 'El monto debe ser mayor que cero.';
    return null;
  }
  function dividirLineas(texto) {
    var filas = [], fila = [], campo = '', q = false, i, c, delim;
    var primera = (texto.split(/\r?\n/).filter(function (l) { return l.trim(); })[0]) || '';
    var cuentas = { '\t': (primera.match(/\t/g) || []).length, ';': (primera.match(/;/g) || []).length, ',': (primera.match(/,/g) || []).length };
    delim = cuentas['\t'] ? '\t' : (cuentas[';'] >= cuentas[','] && cuentas[';'] ? ';' : ',');
    for (i = 0; i < texto.length; i++) {
      c = texto.charAt(i);
      if (q) {
        if (c === '"') { if (texto.charAt(i + 1) === '"') { campo += '"'; i++; } else q = false; }
        else campo += c;
      } else if (c === '"') q = true;
      else if (c === delim) { fila.push(campo); campo = ''; }
      else if (c === '\n' || c === '\r') {
        if (c === '\r' && texto.charAt(i + 1) === '\n') i++;
        fila.push(campo); campo = '';
        if (fila.some(function (x) { return x.trim(); })) filas.push(fila);
        fila = [];
      } else campo += c;
    }
    fila.push(campo);
    if (fila.some(function (x) { return x.trim(); })) filas.push(fila);
    return filas;
  }
  /* CSV/Excel pegado: columnas fecha, tipo, descripción, monto y (opcional) evidencia. Con o sin encabezado. */
  function importarTexto(texto) {
    var filas = dividirLineas(String(texto || '')), ok = [], errores = [];
    if (!filas.length) return { filas: ok, errores: errores };
    var cab = filas[0].map(function (x) { return sinTildes(x.trim().toLowerCase()); });
    var idx = { f: 0, t: 1, d: 2, m: 3, e: 4 }, inicio = 0;
    if (cab.indexOf('fecha') >= 0 && cab.indexOf('monto') >= 0) {
      inicio = 1;
      idx = { f: cab.indexOf('fecha'), t: cab.indexOf('tipo'), d: Math.max(cab.indexOf('descripcion'), cab.indexOf('concepto')), m: cab.indexOf('monto'),
              e: Math.max(cab.indexOf('evidencia'), cab.indexOf('fuente')) };
      if (idx.t < 0 || idx.d < 0) return { filas: ok, errores: [{ n: 1, motivo: 'El encabezado debe incluir fecha, tipo, descripcion y monto.' }] };
    }
    for (var i = inicio; i < filas.length; i++) {
      var r = filas[i], n = i + 1;
      var f = parseFecha(r[idx.f]), t = normalizarTipo(r[idx.t]), d = String(r[idx.d] == null ? '' : r[idx.d]).trim(), m = parseMonto(r[idx.m]);
      var motivo = !f ? 'fecha no válida' : !t ? 'tipo no reconocido' : !d ? 'falta la descripción' : !(m > 0) ? 'monto no válido' : null;
      if (motivo) { errores.push({ n: n, motivo: motivo }); continue; }
      ok.push({ f: f, t: t, d: d, m: m, e: idx.e >= 0 ? normalizarEvidencia(r[idx.e]) : 'D' });
    }
    return { filas: ok, errores: errores };
  }


  /* ---------- depósitos a plazo y decisiones: invertir o pagar deuda ---------- */
  /* Supuestos (se muestran en la página): interés simple prorrateado por días sobre la tasa mensual equivalente;
   * sin impuestos; el retiro antes del vencimiento sigue la opción «sin costo» o «pierde intereses» de cada depósito. */
  function dias(f1, f2) {
    var a = f1.split('-'), b = f2.split('-');
    return Math.round((Date.UTC(+b[0], +b[1] - 1, +b[2]) - Date.UTC(+a[0], +a[1] - 1, +a[2])) / 864e5);
  }
  /* d = {tipo:'pesos'|'uf', tasa (% ), per:'mensual'|'anual', varUF (% anual supuesto, solo UF)} → tasa mensual equivalente (fracción). */
  function tasaMensualDeposito(d) {
    var t = d.tasa / 100;
    if (d.tipo === 'uf') return mensualDesdeAnual((1 + t) * (1 + d.varUF / 100) - 1);
    return d.per === 'anual' ? mensualDesdeAnual(t) : t;
  }
  function interesDeposito(d, nDias) { return d.monto * tasaMensualDeposito(d) * nDias / 30; }

  /* Meta de ahorro (p. ej. 6 meses de ingreso) con capital que rinde a una tasa real sobre UF + variación UF supuesta.
     Cada mes: saldo = saldo·(1+tm) + ahorro. Supone reinversión al mismo ritmo, sin impuestos. */
  function metaAhorro(p) {
    var meta = p.ingreso * p.meses, tm = tasaMensualDeposito({ tipo: 'uf', tasa: p.real, varUF: p.varUF }), h = p.horizonte || 36;
    var saldo = p.capital, aportes = p.capital, intereses = 0, mesMeta = saldo >= meta ? 0 : null, s12 = null, i12 = null;
    for (var m = 1; m <= h; m++) {
      var g = saldo * tm; saldo += g + p.ahorro; aportes += p.ahorro; intereses += g;
      if (mesMeta === null && saldo >= meta) mesMeta = m;
      if (m === 12) { s12 = saldo; i12 = intereses; }
    }
    return { meta: meta, tm: tm, anualEf: anualDesdeMensual(tm), mesMeta: mesMeta, saldo12: s12, intereses12: i12, saldoH: saldo, interesesH: intereses, horizonte: h };
  }
  function estadoDeposito(d, hoy) {
    var total = dias(d.f0, d.fv), trans = Math.min(Math.max(dias(d.f0, hoy), 0), total), rest = dias(hoy, d.fv), tm = tasaMensualDeposito(d);
    return { total: total, trans: trans, restantes: rest, vencido: rest <= 0, noIniciado: hoy < d.f0, tm: tm, anualEf: anualDesdeMensual(tm),
      interesHoy: interesDeposito(d, trans), interesVenc: interesDeposito(d, total), valorHoy: d.monto + interesDeposito(d, trans), valorVenc: d.monto + interesDeposito(d, total) };
  }
  /* Dinero que recibes si lo retiras hoy. */
  function rescateHoy(d, hoy) {
    var e = estadoDeposito(d, hoy);
    return (d.retiro === 'pierde-intereses' && !e.vencido) ? d.monto : d.monto + e.interesHoy;
  }
  /* c = {capital, plazo, pago, pagadas} → tasa implícita mensual y saldo estimado (valor presente de las cuotas que faltan). */
  function saldoCredito(c) {
    var iM = tasaImplicita(c.capital, c.pago, c.plazo), rest = Math.max(0, c.plazo - (c.pagadas || 0));
    return { iM: iM, restantes: rest, saldo: saldoPendiente(c.pago, iM || 0, rest) };
  }
  /* Intereses que se pagan en nDias si se sigue pagando la misma cuota cada 30 días; el último tramo se prorratea. */
  function simularCredito(saldo, iM, pago, nDias) {
    var B = saldo, I = 0, meses = Math.floor(nDias / 30), resto = nDias - meses * 30, k, i;
    for (k = 0; k < meses && B > 0; k++) { i = B * iM; I += i; B = B + i - pago; if (B < 0) B = 0; }
    if (resto > 0 && B > 0) I += B * iM * resto / 30;
    return { interes: I, saldoFinal: B };
  }
  /* 1 · Costo diario del crédito frente al rendimiento diario del depósito. */
  function costoDiario(d, c) {
    var tm = tasaMensualDeposito(d), rd = tm / 30, rc = Math.pow(1 + c.iM, 1 / 30) - 1;
    return { rendDia: d.monto * rd, costoDia: c.saldo * rc, rendPor100k: 100000 * rd, costoPor100k: 100000 * rc, razon: rd > 0 ? rc / rd : null, tmDeposito: tm, iMCredito: c.iM };
  }
  /* 2 · Pagar el crédito hoy con el depósito, frente a mantener ambos hasta el vencimiento del depósito.
   * Si el depósito ya venció, se compara por 30 días suponiendo renovación a la misma tasa. */
  function pagarHoy(d, c, hoy, prepago) {
    var e = estadoDeposito(d, hoy); if (e.noIniciado) return null;
    var H = e.restantes > 0 ? e.restantes : 30, P = prepago || 0, resc = rescateHoy(d, hoy), disp = Math.max(0, resc - P);
    var abono = Math.min(disp, c.saldo), sobra = disp - abono;
    var keep = simularCredito(c.saldo, c.iM, c.pago, H), pay = simularCredito(c.saldo - abono, c.iM, c.pago, H);
    var gDep = d.monto * e.tm * H / 30, gSobra = sobra * e.tm * H / 30;
    var costoMantener = keep.interes - gDep, costoPagar = pay.interes + P - gSobra;
    return { H: H, supuesto: e.restantes <= 0, rescate: resc, abono: abono, sobra: sobra, prepago: P, interesMantener: keep.interes, interesPagar: pay.interes,
      gananciaDeposito: gDep, gananciaSobrante: gSobra, costoMantener: costoMantener, costoPagar: costoPagar, ventajaPagar: costoMantener - costoPagar };
  }
  /* 3 · Al vencer el depósito: ¿lo extiendo N días o uso ese dinero para prepagar el crédito? tasaRenov (mensual, fracción) opcional. */
  function extenderVsPrepagar(d, c, hoy, N, prepago, tasaRenov) {
    var e = estadoDeposito(d, hoy), tm = tasaRenov != null ? tasaRenov : e.tm, hasta = Math.max(e.restantes, 0), P = prepago || 0;
    var M = e.valorVenc, B = simularCredito(c.saldo, c.iM, c.pago, hasta).saldoFinal, usado = Math.min(Math.max(0, M - P), B);
    var extender = M * tm * N / 30, ahorro = usado * (Math.pow(1 + c.iM, N / 30) - 1), sobra = Math.max(0, M - P - usado), invSobra = sobra * tm * N / 30;
    var prepagar = ahorro + invSobra - P;
    return { diasHastaDecision: hasta, dinero: M, saldoCredito: B, usado: usado, extender: extender, ahorroIntereses: ahorro, invierteSobrante: invSobra, prepagar: prepagar, ventajaPrepagar: prepagar - extender };
  }
  /* 4 · Necesito X: ¿pido un crédito de n cuotas a la tasa mensual iM o uso mi depósito (sin costo)? */
  function creditoNuevoVsInversion(d, hoy, X, n, iM) {
    var tm = tasaMensualDeposito(d), cuota = cuotaFrancesa(X, iM, n), resc = rescateHoy(d, hoy);
    var costoCredito = cuota * n - X, costoInversion = X * tm * n;
    return { cuota: cuota, costoCredito: costoCredito, costoInversion: costoInversion, diferencia: costoCredito - costoInversion, alcanza: resc >= X, rescate: resc };
  }

  return {
    TIPOS: TIPOS, pct: pct, parseMonto: parseMonto, parseFecha: parseFecha, hoyISO: hoyISO, mesDe: mesDe, sinTildes: sinTildes,
    cuotaFrancesa: cuotaFrancesa, tasaImplicita: tasaImplicita, anualDesdeMensual: anualDesdeMensual, mensualDesdeAnual: mensualDesdeAnual,
    anualizadoPagoUnico: anualizadoPagoUnico, saldoPendiente: saldoPendiente, evaluarOferta: evaluarOferta,
    evEfectiva: evEfectiva, signo: signo, totales: totales, porMes: porMes, topDescripciones: topDescripciones,
    respaldoPorTipo: respaldoPorTipo, indiceRespaldo: indiceRespaldo, cajaAcumulada: cajaAcumulada, ingresosPromedio: ingresosPromedio, metaAhorro: metaAhorro,
    normalizarTipo: normalizarTipo, validarMov: validarMov, importarTexto: importarTexto,
    dias: dias, tasaMensualDeposito: tasaMensualDeposito, interesDeposito: interesDeposito, estadoDeposito: estadoDeposito, rescateHoy: rescateHoy,
    saldoCredito: saldoCredito, simularCredito: simularCredito, costoDiario: costoDiario, pagarHoy: pagarHoy, extenderVsPrepagar: extenderVsPrepagar,
    creditoNuevoVsInversion: creditoNuevoVsInversion
  };
});
