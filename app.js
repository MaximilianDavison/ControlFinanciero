/* Orden financiero · interfaz. Los cálculos viven en finanzas.js; los datos con procedencia, en datos.js. */
(function () {
  'use strict';
  var F = window.Fin, D = window.DATOS;
  var KEY = 'orden_financiero_v3', KEY_V2 = 'orden_financiero_v2';
  var MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var COL = { 'Ingreso': 'var(--c-ingreso)', 'Inversión': 'var(--c-inversion)', 'Costo': 'var(--c-costo)', 'Gasto': 'var(--c-gasto)' };
  var EVT = { V: 'Verificado', D: 'Declarado', P: 'Proyectado' };
  var EVI = { V: '●', D: '◐', P: '○' };
  var nf = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
  var $ = function (i) { return document.getElementById(i); };

  /* ---------- utilidades ---------- */
  function money(n) { return (n === null || n === undefined || !isFinite(n)) ? '—' : (n < 0 ? '−' : '') + '$' + nf.format(Math.abs(Math.round(n))); }
  function compacto(n) {
    var a = Math.abs(n), s = n < 0 ? '−' : '';
    if (a >= 1e6) return s + (Math.round(a / 1e5) / 10).toString().replace('.', ',') + ' M';
    if (a >= 1e3) return s + Math.round(a / 1e3) + ' mil';
    return s + Math.round(a);
  }
  function num(x, d) { return Number(x).toFixed(d === undefined ? 2 : d).replace(/\.?0+$/, '').replace('.', ','); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function uid() { return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3); }
  function mesCorto(k) { var p = k.split('-'); return MESES[+p[1] - 1] + ' ' + p[0].slice(2); }
  function fechaCorta(f) { if (!f) return '—'; var p = f.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
  function hoy() { return F.hoyISO(); }
  function msg(id, texto, clase) { var e = $(id); e.textContent = texto || ''; e.className = 'msg' + (clase ? ' ' + clase : ''); }
  var tt;
  function toast(texto) {
    var t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
    t.textContent = texto; clearTimeout(tt); tt = setTimeout(function () { t.remove(); }, 2600);
  }
  function descargar(nombre, texto, mime) {
    var b = new Blob([texto], { type: mime }), a = document.createElement('a');
    a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  /* Escala con números redondos: paso de 1, 2, 2,5 o 5 × 10^k y alrededor de n marcas. */
  function escala(lo, hi, n) {
    var raw = (hi - lo) / n, e = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / e;
    var paso = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
    return { lo: Math.floor(lo / paso) * paso, hi: Math.ceil(hi / paso) * paso, paso: paso };
  }

  /* ---------- estado ---------- */
  var okGuardado = true;
  function defecto() { return { v: 3, mov: [], ofer: [], cupos: [], dap: [], saldo: null, cfg: { umbral: 30, tmc: '', dec: {} }, migr: null }; }
  function cargar() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var o = JSON.parse(raw);
        if (o && o.v === 3) {
          var d = defecto();
          Object.keys(d).forEach(function (k) { if (o[k] === undefined) o[k] = d[k]; });
          o.cfg = Object.assign(d.cfg, o.cfg || {});
          return o;
        }
      }
    } catch (e) { okGuardado = false; }
    return defecto();
  }
  var S = cargar();
  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { okGuardado = false; $('aviso-guardado').hidden = false; }
  }
  function cambiado() { guardar(); renderTodo(); }

  /* ---------- pestañas ---------- */
  var TABS = ['control', 'financiamiento', 'capital', 'brecha'];
  function mostrar(tab, sinHash) {
    if (TABS.indexOf(tab) < 0) tab = 'control';
    TABS.forEach(function (t) {
      $('p-' + t).hidden = t !== tab;
      var b = $('tab-' + t); b.setAttribute('aria-selected', t === tab ? 'true' : 'false'); b.tabIndex = t === tab ? 0 : -1;
    });
    if (!sinHash) { try { history.replaceState(null, '', '#' + tab); } catch (e) { /* file:// */ } }
  }
  function tabInicial() { var h = (location.hash || '').slice(1); return TABS.indexOf(h) >= 0 ? h : 'control'; }

  /* =====================================================================
     1 · CONTROL
     ===================================================================== */
  var periodoSel = 'auto', editId = null;

  function mesesDatos() { var o = {}; S.mov.forEach(function (m) { o[F.mesDe(m.f)] = 1; }); return Object.keys(o).sort(); }
  function periodoEfectivo() {
    var ms = mesesDatos(), mh = F.mesDe(hoy());
    if (periodoSel === 'todo') return 'todo';
    if (periodoSel !== 'auto' && ms.indexOf(periodoSel) >= 0) return periodoSel;
    if (!ms.length) return 'todo';
    if (ms.indexOf(mh) >= 0) return mh;
    var pas = ms.filter(function (k) { return k < mh; });
    return pas.length ? pas[pas.length - 1] : ms[ms.length - 1];
  }
  function movsDelPeriodo() {
    var p = periodoEfectivo();
    return p === 'todo' ? S.mov : S.mov.filter(function (m) { return F.mesDe(m.f) === p; });
  }
  function badgeEv(m) {
    var e = F.evEfectiva(m, hoy()), extra = (m.e === 'P' && m.f <= hoy()) ? ' (proyección vencida)' : '';
    return '<span class="tag ' + e + '" title="' + esc(m.doc || '') + '">' + EVI[e] + ' ' + EVT[e] + extra + '</span>';
  }

  function renderControl() {
    var h = hoy(), hay = S.mov.length > 0;
    $('c-vacio').hidden = hay; $('c-datos').hidden = !hay; $('c-lista').hidden = !hay;
    var ms = mesesDatos().reverse(), cur = periodoEfectivo(), sel = $('periodo');
    sel.innerHTML = '<option value="todo">Todo el historial</option>' + ms.map(function (k) { return '<option value="' + k + '">' + mesCorto(k) + '</option>'; }).join('');
    sel.value = cur; sel.disabled = !hay;
    renderHechos();
    if (!hay) return;
    var mv = movsDelPeriodo(), T = F.totales(mv), R = F.respaldoPorTipo(mv, h);
    function cap(t) { var r = R[t], tot = r.V + r.D + r.P; return tot ? F.pct(r.V / tot, 0) + ' verificado' : 'sin movimientos'; }
    var k = '';
    [['Ingreso', 'Ingresos'], ['Inversión', 'Inversión'], ['Costo', 'Costos'], ['Gasto', 'Gastos']].forEach(function (p) {
      k += '<div class="kpi" data-k="' + p[0] + '"><small>' + p[1] + '</small><b>' + money(T[p[0]]) + '</b><span>' + cap(p[0]) + '</span></div>';
    });
    var sd = T.sinDestino;
    k += '<div class="kpi" data-k="' + (sd > 0 ? 'sobra' : sd < 0 ? 'deficit' : 'cuadra') + '"><small>' + (sd < 0 ? 'Déficit' : 'Sin destino') + '</small><b>' + money(sd) + '</b><span>' +
      (sd > 0 ? 'Asígnale un destino: ahorro, inversión o deuda' : sd < 0 ? 'Los egresos superan a los ingresos' : 'Cada peso tiene destino') + '</span></div>';
    $('kpis').innerHTML = k;
    renderDestino(T);
    renderMeses();
    renderTop(mv);
    renderLista();
  }

  function renderDestino(T) {
    var ing = T.Ingreso, eg = T.egresos, tot = Math.max(ing, eg), el = $('destino');
    if (tot === 0) { el.innerHTML = '<p class="sub">Sin movimientos en este período.</p>'; return; }
    var segs = [['Inversión', T['Inversión']], ['Costo', T.Costo], ['Gasto', T.Gasto]], b = '', leg = '';
    segs.forEach(function (s) {
      if (s[1] > 0) b += '<i style="width:' + (s[1] / tot * 100) + '%;background:' + COL[s[0]] + '" title="' + s[0] + ': ' + money(s[1]) + '"></i>';
      leg += '<span><span class="dot" style="background:' + COL[s[0]] + '"></span>' + s[0] + ' ' + money(s[1]) + (ing > 0 ? ' · ' + F.pct(s[1] / ing, 1) + ' de los ingresos' : '') + '</span>';
    });
    if (ing > eg) {
      b += '<i class="sd" style="width:' + ((ing - eg) / tot * 100) + '%" title="Sin destino: ' + money(ing - eg) + '"></i>';
      leg += '<span><span class="dot" style="background:var(--warn)"></span>Sin destino ' + money(ing - eg) + ' · ' + F.pct((ing - eg) / ing, 1) + '</span>';
    }
    if (eg > ing) b += '<span class="marca" style="left:' + (ing / tot * 100) + '%" title="Hasta aquí llegan tus ingresos"></span>';
    var veredicto = ing === 0 ? 'No hay ingresos en este período: todo lo que sale queda sin respaldo de ingreso.'
      : eg > ing ? 'Gastas ' + money(eg - ing) + ' más de lo que ingresa (la línea marca hasta dónde llegan tus ingresos).'
      : eg === ing ? 'Cuadra: cada peso que ingresa tiene un destino.' : 'Te quedan ' + money(ing - eg) + ' sin destino: es dinero a decidir, no dinero perdido.';
    el.innerHTML = '<div class="dest" role="img" aria-label="Reparto de los ingresos entre inversión, costos, gastos y lo que queda sin destino">' + b + '</div><div class="dest-leg">' + leg + '</div><p class="sub" style="margin-top:8px">' + veredicto + '</p>';
  }

  function renderMeses() {
    var rows = F.porMes(S.mov), el = $('g-meses');
    if (!rows.length) { el.innerHTML = '<p class="sub">Sin datos.</p>'; return; }
    var t = rows.slice(-12), max = 0;
    t.forEach(function (r) { max = Math.max(max, r['Inversión'] + r.Costo + r.Gasto, r.Ingreso); });
    if (!max) { el.innerHTML = '<p class="sub">Sin montos que graficar.</p>'; return; }
    var sc = escala(0, max, 5), nice = sc.hi, nt = Math.round(sc.hi / sc.paso);
    var W = 640, H = 270, L = 54, R = 10, T = 14, B = 34;
    var y = function (v) { return T + (1 - v / nice) * (H - T - B); };
    var bw = (W - L - R) / t.length, w = bw * 0.62, s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Ingresos y egresos por mes">';
    for (var i = 0; i <= nt; i++) {
      var v = sc.paso * i;
      s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" text-anchor="end">' + compacto(v) + '</text>';
    }
    t.forEach(function (r, j) {
      var x = L + j * bw + (bw - w) / 2, acc = 0;
      ['Inversión', 'Costo', 'Gasto'].forEach(function (tp) {
        var val = r[tp]; if (!val) return;
        s += '<rect x="' + x + '" y="' + y(acc + val) + '" width="' + w + '" height="' + Math.max(1, y(acc) - y(acc + val)) + '" fill="' + COL[tp] + '"><title>' + mesCorto(r.mes) + ' · ' + tp + ': ' + money(val) + '</title></rect>';
        acc += val;
      });
      if (r.Ingreso) s += '<line x1="' + (x - 5) + '" x2="' + (x + w + 5) + '" y1="' + y(r.Ingreso) + '" y2="' + y(r.Ingreso) + '" stroke="' + COL.Ingreso + '" stroke-width="3.5" stroke-linecap="round"><title>' + mesCorto(r.mes) + ' · Ingresos: ' + money(r.Ingreso) + '</title></line>';
      s += '<text x="' + (x + w / 2) + '" y="' + (H - 12) + '" text-anchor="middle">' + mesCorto(r.mes) + '</text>';
    });
    el.innerHTML = s + '</svg><div class="leg"><span><span class="dot" style="background:var(--c-ingreso);height:4px;vertical-align:3px"></span>Ingresos (línea)</span>' +
      ['Inversión', 'Costo', 'Gasto'].map(function (tp) { return '<span><span class="dot" style="background:' + COL[tp] + '"></span>' + tp + '</span>'; }).join('') + '</div>';
    $('t-meses').innerHTML = '<thead><tr><th>Mes</th><th class="n">Ingresos</th><th class="n">Inversión</th><th class="n">Costos</th><th class="n">Gastos</th><th class="n">Sin destino</th></tr></thead><tbody>' +
      rows.map(function (r) {
        var sd = r.Ingreso - r['Inversión'] - r.Costo - r.Gasto;
        return '<tr><td>' + mesCorto(r.mes) + '</td><td class="n">' + money(r.Ingreso) + '</td><td class="n">' + money(r['Inversión']) + '</td><td class="n">' + money(r.Costo) + '</td><td class="n">' + money(r.Gasto) + '</td><td class="n">' + money(sd) + '</td></tr>';
      }).join('') + '</tbody>';
  }

  function renderTop(mv) {
    var top = F.topDescripciones(mv, 10), el = $('g-top');
    if (!top.length) { el.innerHTML = '<p class="sub">Sin egresos en este período.</p>'; return; }
    var max = top[0].v;
    el.innerHTML = top.map(function (x) {
      return '<div class="hbar"><div class="t"><span title="' + esc(x.d) + '">' + esc(x.d) + '</span><span>' + money(x.v) + ' · ' + F.pct(x.pct, 1) + '</span></div><div class="b"><i style="width:' + (x.v / max * 100) + '%;background:' + COL[x.t] + '"></i></div></div>';
    }).join('') + '<p class="sub small">Porcentaje sobre el total de egresos del período.</p>';
  }

  function renderLista() {
    var q = F.sinTildes($('l-q').value.trim().toLowerCase()), tp = $('l-tipo').value;
    var arr = movsDelPeriodo().slice().sort(function (a, b) { return a.f < b.f ? 1 : a.f > b.f ? -1 : 0; }).filter(function (m) {
      return (!tp || m.t === tp) && (!q || F.sinTildes(m.d.toLowerCase()).indexOf(q) >= 0);
    });
    var corto = arr.slice(0, 300);
    $('l-n').textContent = '· ' + arr.length + (arr.length > 300 ? ' (se muestran 300)' : '');
    $('l-tabla').innerHTML = corto.length ? corto.map(function (m) {
      return '<tr><td class="c-f">' + fechaCorta(m.f) + '</td><td class="c-t"><span class="tag t-' + m.t + '">' + m.t + '</span></td><td class="c-d">' + esc(m.d) + (m.doc ? '<div class="sub small" style="font-weight:400">Respaldo: ' + esc(m.doc) + '</div>' : '') +
        '</td><td class="n c-m">' + money(m.t === 'Ingreso' ? m.m : -m.m) + '</td><td class="c-e">' + badgeEv(m) + '</td><td class="c-a"><div class="fila-acc"><button class="btn small" data-act="ed" data-id="' + m.id + '">Editar</button><button class="btn small danger" data-act="del" data-id="' + m.id + '">Eliminar</button></div></td></tr>';
    }).join('') : '<tr><td colspan="6" class="sub">Ningún movimiento coincide con el filtro.</td></tr>';
  }

  /* --- datos ya documentados --- */
  function renderHechos() {
    var pend = D.HECHOS_DOCUMENTADOS.filter(function (hc) { return !S.mov.some(function (m) { return m.src === 'doc:' + hc.id; }); });
    var el = $('c-hechos'); el.hidden = !pend.length;
    if (!pend.length) return;
    el.innerHTML = '<h3>Datos que ya documentaste con capturas</h3><p class="sub small" style="margin-bottom:10px">No se agregan solos. Puedes traerlos con un clic; quedan como <b>Declarado</b> hasta que los verifiques con la cartola.</p>' +
      pend.map(function (hc) {
        return '<div class="verif"><div><b>' + esc(hc.mov.d) + '</b> · ' + money(hc.mov.m) + ' · ' + fechaCorta(hc.mov.f) + '<div class="sub small">' + esc(hc.fuente) + '</div></div><button class="btn" data-hecho="' + hc.id + '">Agregar al control</button></div>';
      }).join('');
  }

  /* --- formulario de movimientos --- */
  function actualizarEv() {
    var f = $('m-fecha').value, fut = f && f > hoy(), s = $('m-ev'), prev = s.value;
    if (fut) { s.innerHTML = '<option value="P">Proyectado (fecha futura)</option>'; s.disabled = true; }
    else {
      s.disabled = false;
      s.innerHTML = '<option value="D">Declarado</option><option value="V">Verificado (cartola o comprobante)</option>';
      s.value = (prev === 'V' || prev === 'D') ? prev : 'D';
    }
    $('m-doc-w').hidden = s.value !== 'V';
  }
  function limpiarForm() {
    editId = null;
    $('m-desc').value = ''; $('m-monto').value = ''; $('m-doc').value = '';
    $('m-titulo').textContent = 'Registrar un movimiento'; $('m-ok').textContent = 'Agregar movimiento'; $('m-cancel').hidden = true;
    if (!$('m-ev').disabled) $('m-ev').value = 'D'; /* cada movimiento nuevo parte como Declarado: nunca arrastres «Verificado» */
    actualizarEv();
  }
  function enviarMov(e) {
    e.preventDefault();
    var f = F.parseFecha($('m-fecha').value), t = $('m-tipo').value, d = $('m-desc').value.trim(), m = F.parseMonto($('m-monto').value);
    var ev = (f && f > hoy()) ? 'P' : $('m-ev').value, mov = { f: f, t: t, d: d, m: m, e: ev };
    var err = F.validarMov(mov);
    if (!err && ev === 'V' && !$('m-doc').value.trim()) err = 'Indica el documento que respalda este movimiento (por ejemplo, la cartola y su período).';
    if (err) { msg('m-msg', err, 'bad'); return; }
    if (ev === 'V') { mov.doc = $('m-doc').value.trim(); mov.vf = new Date().toISOString(); }
    if (editId) {
      var i = S.mov.findIndex(function (x) { return x.id === editId; });
      if (i >= 0) { mov.id = editId; if (S.mov[i].src) mov.src = S.mov[i].src; S.mov[i] = mov; }
      toast('Movimiento actualizado');
    } else { mov.id = uid(); S.mov.push(mov); toast('Movimiento agregado'); }
    limpiarForm(); msg('m-msg', '');
    cambiado();
    $('m-desc').focus();
  }
  function editar(id) {
    var m = S.mov.find(function (x) { return x.id === id; }); if (!m) return;
    editId = id;
    $('m-fecha').value = m.f; $('m-tipo').value = m.t; $('m-desc').value = m.d; $('m-monto').value = nf.format(m.m);
    actualizarEv();
    if (m.f <= hoy()) $('m-ev').value = m.e === 'V' ? 'V' : 'D';
    $('m-doc').value = m.doc || ''; $('m-doc-w').hidden = $('m-ev').value !== 'V';
    $('m-titulo').textContent = 'Editar movimiento'; $('m-ok').textContent = 'Guardar cambios'; $('m-cancel').hidden = false;
    $('c-form').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('m-desc').focus();
  }

  /* --- importar / exportar / respaldo --- */
  var pend = null;
  function clave(m) { return m.f + '|' + m.t + '|' + F.sinTildes(m.d.trim().toLowerCase()) + '|' + m.m; }
  function previsualizar(texto) {
    var r = F.importarTexto(texto), ex = {}, nuevas = [], dups = [];
    S.mov.forEach(function (m) { ex[clave(m)] = 1; });
    r.filas.forEach(function (x) { (ex[clave(x)] ? dups : nuevas).push(x); });
    pend = { nuevas: nuevas, dups: dups };
    var el = $('imp-prev');
    if (!r.filas.length && !r.errores.length) { el.innerHTML = '<p class="msg bad">No encontré filas para importar.</p>'; pend = null; return; }
    el.innerHTML = '<div class="note ' + (r.errores.length ? 'warn' : 'ok') + '"><b>' + r.filas.length + '</b> filas válidas' + (r.errores.length ? ' y <b>' + r.errores.length + '</b> con problemas' : '') +
      (dups.length ? ' · <b>' + dups.length + '</b> ya existen' : '') + '.</div>' +
      (r.errores.length ? '<ul class="sub small">' + r.errores.slice(0, 8).map(function (x) { return '<li>Fila ' + x.n + ': ' + esc(x.motivo) + '</li>'; }).join('') + (r.errores.length > 8 ? '<li>…</li>' : '') + '</ul>' : '') +
      (nuevas.length ? '<div class="tw" style="margin:10px 0"><table><thead><tr><th>Fecha</th><th>Tipo</th><th>Descripción</th><th class="n">Monto</th></tr></thead><tbody>' +
        nuevas.slice(0, 6).map(function (m) { return '<tr><td>' + fechaCorta(m.f) + '</td><td>' + m.t + '</td><td>' + esc(m.d) + '</td><td class="n">' + money(m.m) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
      (dups.length ? '<label class="small"><input type="checkbox" id="imp-omitir" checked> Omitir los ' + dups.length + ' que ya existen</label><br>' : '') +
      '<div class="actions" style="margin-top:8px"><button class="btn primary" id="imp-ok" type="button"' + (r.filas.length ? '' : ' disabled') + '>Agregar movimientos</button><button class="btn" id="imp-no" type="button">Cancelar</button></div>';
  }
  function confirmarImportacion() {
    if (!pend) return;
    var omitir = $('imp-omitir') ? $('imp-omitir').checked : false, h = hoy(), lista = omitir ? pend.nuevas : pend.nuevas.concat(pend.dups);
    lista.forEach(function (x) {
      var m = { id: uid(), f: x.f, t: x.t, d: x.d, m: x.m, e: x.f > h ? 'P' : (x.e === 'V' ? 'V' : 'D') };
      if (m.e === 'V') { m.doc = 'Indicado como verificado en el archivo importado'; m.vf = new Date().toISOString(); }
      S.mov.push(m);
    });
    toast(lista.length + ' movimientos agregados'); pend = null; $('imp-prev').innerHTML = ''; $('imp-txt').value = ''; $('imp-file').value = '';
    cambiado();
  }
  function csvCampo(s) { s = String(s); return /[;"\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }
  function exportarCSV() {
    var l = ['fecha;tipo;descripcion;monto;evidencia'];
    S.mov.slice().sort(function (a, b) { return a.f < b.f ? -1 : 1; }).forEach(function (m) {
      l.push([m.f, m.t, csvCampo(m.d), m.m, EVT[F.evEfectiva(m, hoy())].toLowerCase()].join(';'));
    });
    descargar('movimientos-' + hoy() + '.csv', '﻿' + l.join('\r\n'), 'text/csv;charset=utf-8');
  }
  function respaldoJSON() { descargar('orden-financiero-respaldo-' + hoy() + '.json', JSON.stringify(S, null, 2), 'application/json'); }
  function restaurar(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var o = JSON.parse(r.result);
        if (!o || o.v !== 3 || !Array.isArray(o.mov)) throw new Error('formato');
        if (!confirm('Esto reemplaza todos los datos actuales por los del respaldo. ¿Continuar?')) return;
        var d = defecto(); Object.keys(d).forEach(function (k) { if (o[k] === undefined) o[k] = d[k]; });
        S = o; cambiado(); msg('bk-msg', 'Respaldo restaurado.', 'ok');
      } catch (e) { msg('bk-msg', 'El archivo no es un respaldo válido de esta página.', 'bad'); }
    };
    r.readAsText(file);
  }
  function borrarTodo() {
    if (!confirm('Se borrarán todos los movimientos, ofertas y ajustes guardados en este navegador. Esta acción no se puede deshacer. ¿Continuar?')) return;
    try { localStorage.removeItem(KEY_V2); } catch (e) { /* nada */ }
    S = defecto(); S.migr = 'resuelta'; periodoSel = 'auto'; cambiado(); msg('bk-msg', 'Datos borrados.', 'ok');
  }

  /* --- datos de la versión anterior --- */
  function leerV2() {
    try {
      var o = JSON.parse(localStorage.getItem(KEY_V2) || 'null');
      if (!o || !Array.isArray(o.rows)) return null;
      var rows = o.rows.filter(function (r) { return r && r.f && F.normalizarTipo(r.t) && r.d && r.m > 0; });
      return rows.length ? rows : null;
    } catch (e) { return null; }
  }
  function esSemilla(r) { return D.SEMILLAS_V1.indexOf(r.f + '|' + F.sinTildes(String(r.t).toLowerCase()) + '|' + F.sinTildes(String(r.d).trim().toLowerCase()) + '|' + Math.round(r.m)) >= 0; }
  function renderMigracion() {
    var el = $('migr'); if (S.migr === 'resuelta') { el.hidden = true; return; }
    var rows = leerV2(); if (!rows) { el.hidden = true; return; }
    var sem = rows.filter(esSemilla), prop = rows.filter(function (r) { return !esSemilla(r); });
    el.hidden = false;
    el.innerHTML = prop.length === 0
      ? '<div class="banner"><div><b>Encontré ' + rows.length + ' movimientos de ejemplo de la versión anterior.</b><br><span class="sub">Eran datos precargados, no tuyos, y esta versión no los usa. No se importaron.</span></div><div class="actions"><button class="btn primary" data-mig="descartar">Entendido</button></div></div>'
      : '<div class="banner"><div><b>La versión anterior guardó ' + rows.length + ' movimientos en este navegador.</b><br><span class="sub">' + sem.length + ' coinciden con los datos de ejemplo que traía esa versión; ' + prop.length + ' no. Tú decides qué importar (quedan como Declarado).</span></div>' +
        '<div class="actions"><button class="btn primary" data-mig="propios">Importar solo los ' + prop.length + ' que no son de ejemplo</button><button class="btn" data-mig="todos">Importar los ' + rows.length + '</button><button class="btn" data-mig="descartar">Descartar</button></div></div>';
  }
  function migrar(modo) {
    var rows = leerV2() || [], h = hoy();
    if (modo !== 'descartar') {
      var ex = {}; S.mov.forEach(function (m) { ex[clave(m)] = 1; });
      rows.filter(function (r) { return modo === 'todos' || !esSemilla(r); }).forEach(function (r) {
        var m = { id: uid(), f: r.f, t: F.normalizarTipo(r.t), d: String(r.d).trim(), m: Math.round(r.m), src: 'v2' };
        m.e = m.f > h ? 'P' : 'D';
        if (!ex[clave(m)]) S.mov.push(m);
      });
    }
    S.migr = 'resuelta'; cambiado();
  }

  /* =====================================================================
     2 · FINANCIAMIENTO
     ===================================================================== */
  function ingresoProm() { return F.ingresosPromedio(S.mov, hoy(), 3); }

  function filasOfertas() {
    var ing = ingresoProm(), rows = [], tmc = parseFloat(String(S.cfg.tmc).replace(',', '.'));
    function fila(o) {
      var cae = (o.caePct !== null && o.caePct !== undefined && o.caePct !== '') ? o.caePct / 100 : null, tm = null;
      if (o.tasaPct !== null && o.tasaPct !== undefined && o.tasaPct !== '') {
        if (o.tasaPer === 'mensual') tm = o.tasaPct / 100; else if (o.tasaPer === 'anual') tm = F.mensualDesdeAnual(o.tasaPct / 100);
      }
      var ev = F.evaluarOferta({ capital: o.capital, plazo: o.plazo, unidad: o.unidad, tipo: o.tipo, pago: o.pago, tasaMensual: tm, cae: cae });
      if (isFinite(tmc) && tmc > 0 && ev.iA !== null && ev.iA * 100 > tmc) ev.alertas.push('La tasa efectiva anual implícita supera la tasa máxima convencional que ingresaste (' + num(tmc) + '%). La implícita incluye todos los cargos: revisa el detalle con la institución.');
      if (isFinite(tmc) && tmc > 0 && ev.iA !== null && ev.iA * 100 > tmc) ev.cortas.push('Supera la TMC que ingresaste (' + num(tmc) + '%)');
      return { o: o, ev: ev, cuotaIng: (o.tipo === 'cuotas' && ing && ing.VD > 0) ? o.pago / ing.VD : null };
    }
    D.OFERTAS_OBSERVADAS.forEach(function (b) {
      b.opciones.forEach(function (op) {
        rows.push(fila({ id: b.id + '-' + op.plazo, origen: 'obs', inst: b.inst, prod: b.prod, estado: b.estado, fecha: b.fecha, capital: b.capital, unidad: b.unidad, tipo: b.tipo, plazo: op.plazo, pago: op.pago, tasaPct: b.tasaPct, tasaPer: b.tasaPer, caePct: b.caePct, nota: b.nota, fuente: b.fuente }));
      });
    });
    S.ofer.forEach(function (o) { rows.push(fila(Object.assign({ origen: 'usuario' }, o))); });
    return rows;
  }

  function creditosContratados() {
    return S.ofer.filter(function (o) { return o.estado === 'Contratado' && o.tipo === 'cuotas'; }).map(function (o) {
      return { o: o, sc: F.saldoCredito({ capital: o.capital, plazo: o.plazo, pago: o.pago, pagadas: o.pagadas || 0 }) };
    }).filter(function (x) { return x.sc.iM !== null; });
  }
  function ofertasCuotas() {
    return filasOfertas().filter(function (x) { return x.o.tipo === 'cuotas' && x.ev.iM !== null; }).map(function (x) {
      return { id: x.o.id, iM: x.ev.iM, label: x.o.inst + ' · ' + x.o.prod + ' (' + x.o.plazo + ' cuotas) · ' + F.pct(x.ev.iM, 2) + ' mensual' };
    }).sort(function (a, b) { return a.iM - b.iM; });
  }

  function renderCarga() {
    var cont = creditosContratados(), ing = ingresoProm(), el = $('fin-carga'), um = +S.cfg.umbral || 30;
    if (!cont.length) { el.innerHTML = '<p class="sub small" style="margin-top:10px">Las ofertas de más abajo son simulaciones, no deuda. Cuando contrates un crédito, agrégalo como «Contratado».</p>'; return; }
    var cuotas = cont.reduce(function (t, x) { return t + x.o.pago; }, 0), h = '<p style="margin-top:10px"><b>Cuotas mensuales:</b> ' + money(cuotas) + '</p>';
    if (!ing) h += '<p class="sub small">Registra tus ingresos en Control para medir cuánto de tu ingreso comprometen.</p>';
    else {
      var rV = ing.V > 0 ? cuotas / ing.V : null, rVD = cuotas / ing.VD, peor = rV !== null ? rV : rVD;
      var estado = peor * 100 <= um ? 'ok' : peor * 100 <= um * 1.15 ? 'warn' : 'bad';
      h += '<p><b>Carga sobre tu ingreso:</b> ' + (rV !== null ? F.pct(rVD, 0) + ' – ' + F.pct(rV, 0) : F.pct(rVD, 0)) + '</p>' +
        '<div class="medidor" role="img" aria-label="Carga financiera frente al umbral"><i style="width:' + Math.min(100, peor * 100) + '%;background:var(--' + estado + ')"></i></div>' +
        '<p class="sub small">' + (rV !== null ? 'Con ingresos declarados – con solo los verificados. ' : 'Solo hay ingresos declarados. ') + (ing.parcial ? 'Ingreso del mes en curso (parcial). ' : 'Promedio de ' + ing.meses.length + ' mes(es) completo(s). ') + 'Tu umbral: ' + um + '%.</p>';
    }
    h += '<details><summary class="small">Ajustar mi umbral</summary><div class="form"><label class="field"><span>Umbral de carga (%)</span><input id="f-umbral" type="text" inputmode="numeric" value="' + esc(um) + '"></label></div><p class="sub small">Muchas guías usan referencias del 30 % al 35 % del ingreso; no es una norma legal.</p></details>';
    el.innerHTML = h;
    $('f-umbral').addEventListener('change', function () { var v = F.parseMonto(this.value); if (v > 0 && v <= 100) { S.cfg.umbral = v; cambiado(); } else { this.value = S.cfg.umbral; } });
  }

  function renderCred() {
    var cs = creditosContratados();
    $('cred-lista').innerHTML = cs.length ? cs.map(function (x) {
      var o = x.o, sc = x.sc;
      return '<div class="item"><div><b>' + esc(o.inst) + '</b> · ' + esc(o.prod) + '<div class="sub small">Cuota ' + money(o.pago) + ' · quedan ' + sc.restantes + ' de ' + o.plazo + ' · saldo estimado <b>' + money(sc.saldo) + '</b></div>' +
        '<div class="small">Tasa efectiva anual <b>' + F.pct(F.anualDesdeMensual(sc.iM), 1) + '</b> · mensual implícita ' + F.pct(sc.iM, 2) + '</div></div><button class="btn small danger" data-del-of="' + o.id + '">Quitar</button></div>';
    }).join('') : '<p class="sub">Aún no registras créditos contratados.</p>';
  }

  function renderDap() {
    var h = hoy(), el = $('dap-lista');
    if (!S.dap.length) { el.innerHTML = '<p class="sub">Aún no registras depósitos a plazo. Agrega uno (monto, tasa y hasta cuándo) para compararlo con tus créditos.</p>'; return; }
    el.innerHTML = S.dap.map(function (d) {
      var e = F.estadoDeposito(d, h), prog = e.total > 0 ? Math.min(100, e.trans / e.total * 100) : 0;
      var estado = e.noIniciado ? 'Empieza en ' + F.dias(h, d.f0) + ' días' : e.restantes === 0 ? 'Vence hoy' : e.vencido ? 'Venció hace ' + Math.abs(e.restantes) + ' días' : 'Vence en ' + e.restantes + ' días';
      var tasa = d.tipo === 'uf' ? 'UF + ' + num(d.tasa) + '% real (supones UF ' + num(d.varUF) + '% anual)' : num(d.tasa) + '% ' + d.per;
      return '<div class="item"><div><b>' + esc(d.inst) + '</b> · ' + (d.tipo === 'uf' ? 'reajustable en UF' : 'en pesos') +
        '<div class="sub small">' + money(d.monto) + ' · ' + tasa + ' · ≈ ' + F.pct(e.anualEf, 1) + ' anual efectiva' + (d.tipo === 'uf' ? ' (proyección)' : '') + '</div>' +
        '<div class="medidor" role="img" aria-label="Avance del plazo"><i style="width:' + prog + '%;background:var(--brand)"></i></div>' +
        '<div class="small">' + fechaCorta(d.f0) + ' → <b>' + fechaCorta(d.fv) + '</b> · ' + estado + '</div>' +
        '<div class="small">Intereses ganados hoy: <b>' + money(e.interesHoy) + '</b> · Al vencimiento recibes: <b>' + money(e.valorVenc) + '</b></div></div>' +
        '<button class="btn small danger" data-del-dap="' + d.id + '">Quitar</button></div>';
    }).join('');
  }

  /* ---- decisión: invertir o pagar deuda ---- */
  function renderDecision() {
    var el = $('dec'), cd = S.cfg.dec || (S.cfg.dec = {});
    if (!S.dap.length) {
      el.innerHTML = '<h3>¿Pago el crédito o dejo mi plata invertida?</h3><p class="sub">Agrega tu depósito a plazo (monto, tasa y hasta cuándo) y aquí verás, con tus números, si te conviene pagar un crédito, extender tu inversión o endeudarte. Se calcula con funciones probadas, sin promedios de mercado.</p>' +
        '<div class="actions" style="margin-top:12px"><button class="btn primary" id="dec-abrir" type="button">Agregar mi depósito a plazo</button></div>';
      return;
    }
    var creds = creditosContratados(), ofs = ofertasCuotas();
    if (!S.dap.some(function (d) { return d.id === cd.dap; })) cd.dap = S.dap[0].id;
    if (!creds.some(function (x) { return x.o.id === cd.cred; })) cd.cred = creds.length ? creds[0].o.id : '';
    if (!ofs.some(function (o) { return o.id === cd.of; })) cd.of = ofs.length ? ofs[0].id : '';
    if (!(cd.N > 0)) cd.N = 1; if (!(cd.nc > 0)) cd.nc = 12;
    var opt = function (arr, sel, f) { return arr.map(function (x) { var r = f(x); return '<option value="' + esc(r[0]) + '"' + (r[0] === sel ? ' selected' : '') + '>' + esc(r[1]) + '</option>'; }).join(''); };
    el.innerHTML = '<h3>¿Pago el crédito o dejo mi plata invertida?</h3>' +
      '<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(240px,1fr))"><label class="field"><span>Mi depósito</span><select id="dec-dap">' + opt(S.dap, cd.dap, function (d) { return [d.id, d.inst + ' · ' + money(d.monto) + ' · vence ' + fechaCorta(d.fv)]; }) + '</select></label>' +
      '<label class="field"><span>Mi crédito</span><select id="dec-cred">' + (creds.length ? opt(creds, cd.cred, function (x) { return [x.o.id, x.o.inst + ' · ' + x.o.prod + ' · saldo ' + money(x.sc.saldo)]; }) : '<option value="">Sin créditos contratados</option>') + '</select></label></div>' +
      '<div class="dec-grid">' +
      '<div class="mini"><h4>1 · Cada día, ¿qué pesa más?</h4><p class="q">Lo que te cuesta la deuda frente a lo que rinde tu inversión.</p><div id="r1"></div></div>' +
      '<div class="mini"><h4>2 · Pagar el crédito hoy con mi depósito</h4><p class="q">Terminar hoy o seguir hasta el vencimiento del depósito.</p><div id="r2"></div></div>' +
      '<div class="mini"><h4>3 · Extender el depósito o prepagar</h4><p class="q">Cuando venza, ¿lo dejo más días invertido o uso el dinero para pagar deuda?</p>' +
      '<div class="form"><label class="field"><span>Días a extender</span><input id="dec-n" type="text" inputmode="numeric" value="' + esc(cd.N) + '"></label></div><div id="r3"></div></div>' +
      '<div class="mini"><h4>4 · Necesito plata: ¿crédito nuevo o mi inversión?</h4><p class="q">Para un gasto futuro, ¿endeudarme o usar mi depósito?</p>' +
      '<div class="form"><label class="field"><span>Monto (CLP)</span><input id="dec-x" type="text" inputmode="numeric" value="' + esc(cd.X ? nf.format(cd.X) : '') + '" placeholder="0"></label>' +
      '<label class="field"><span>Cuotas</span><input id="dec-nc" type="text" inputmode="numeric" value="' + esc(cd.nc) + '"></label>' +
      '<label class="field wide"><span>Crédito de referencia</span><select id="dec-of">' + (ofs.length ? opt(ofs, cd.of, function (o) { return [o.id, o.label]; }) : '<option value="">Sin ofertas con cuotas</option>') + '</select></label></div><div id="r4"></div></div>' +
      '</div><p class="sub small" style="margin-top:12px">Cómo leerlo: compara intereses, con interés simple en el depósito y la tasa implícita en el crédito. <b>No incluye</b> impuestos a los intereses, comisiones que no informaste, ni tu necesidad de tener plata disponible. El retiro anticipado se calcula según lo que indicaste en cada depósito. No es asesoría financiera.</p>';
    decResultados();
  }


  /* ---- pestaña Capital: objetivo, estrategias y escenarios ---- */
  var ESCEN = [['Pesimista', -0.15, 0.10, 3], ['Realista', 0, 0, 4], ['Optimista', 0.10, -0.05, 5]];
  var ESTRAT = [['ahorrar', 'Ahorrar (depósito a plazo)'], ['deuda', 'Pagar deudas primero (avalancha) y luego ahorrar'], ['prestamo', 'Pedir un préstamo, invertirlo y ahorrar']];
  function gastoProm() {
    var porM = {}, mh = hoy().slice(0, 7);
    S.mov.forEach(function (x) { if ((x.t === 'Costo' || x.t === 'Gasto') && x.f <= hoy()) porM[x.f.slice(0, 7)] = (porM[x.f.slice(0, 7)] || 0) + x.m; });
    var ks = Object.keys(porM).filter(function (k) { return k < mh; }).sort().slice(-3);
    return ks.length ? ks.reduce(function (s, k) { return s + porM[k]; }, 0) / ks.length : 0;
  }
  function pct(x) { return String(x).replace('.', ','); }
  function nIn(id, k, tipo, label, val, ph, wide) {
    return '<label class="field' + (wide ? ' wide' : '') + '"><span>' + label + '</span><input id="' + id + '" data-k="' + k + '" data-t="' + tipo + '" type="text" inputmode="decimal" value="' + esc(val ? (tipo === 'm' ? nf.format(val) : pct(val)) : '') + '" placeholder="' + esc(ph || '0') + '"></label>';
  }
  function renderMeta() {
    var el = $('meta'), m = S.cfg.meta || (S.cfg.meta = {});
    if (m.plazo === undefined) m.plazo = 'ccb-360'; if (!(m.meses > 0)) m.meses = 6;
    var ip = ingresoProm(), gp = gastoProm();
    var opt = D.DAP_OBSERVADOS.map(function (x) { return '<option value="' + x.id + '"' + (x.id === m.plazo ? ' selected' : '') + '>' + x.plazo + ' días · ' + num(x.real, 2) + '% real anual sobre UF</option>'; }).join('');
    var filas = D.DAP_OBSERVADOS.map(function (x, i) {
      return '<tr><td>' + x.plazo + ' días</td><td>' + num(x.real, 2) + '%</td><td>' + num(x.periodo, 4) + '%</td><td><button class="btn small" type="button" data-usar-dap="' + i + '">Usar en mi depósito</button></td></tr>';
    }).join('');
    el.innerHTML = '<h3>Objetivo: capital de ' + esc(m.meses) + ' meses</h3>' +
      '<p class="sub"><b>Capital</b> = dinero líquido − deudas. <b>Meta</b> = meses de gasto esencial que quieres tener cubiertos (3 mínimo, 6 recomendado). Escribe tus cifras: no hay datos de ejemplo hasta que tú los cargues.</p>' +
      '<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      nIn('mt-ing', 'ingreso', 'm', 'Ingreso mensual (CLP)', m.ingreso, ip > 0 ? nf.format(Math.round(ip)) + ' (tu promedio en Control)' : '0') +
      nIn('mt-gas', 'gasto', 'm', 'Gasto esencial mensual (CLP)', m.gasto, gp > 0 ? nf.format(Math.round(gp)) + ' (tu promedio en Control)' : '0') +
      nIn('mt-meses', 'meses', 'n', 'Meta: meses de gasto', m.meses, '6') +
      nIn('mt-cap', 'capital', 'm', 'Dinero líquido que tienes (CLP)', m.capital) +
      nIn('mt-ts', 'tarjSaldo', 'm', 'Deuda en tarjeta (CLP)', m.tarjSaldo) + nIn('mt-tt', 'tarjTasa', 'p', 'Tasa tarjeta (% mensual)', m.tarjTasa) +
      nIn('mt-ps', 'preSaldo', 'm', 'Saldo de un préstamo actual (CLP)', m.preSaldo) + nIn('mt-pt', 'preTasa', 'p', 'Tasa préstamo (% mensual)', m.preTasa) + nIn('mt-pc', 'preCuota', 'm', 'Cuota mensual del préstamo (CLP)', m.preCuota) +
      nIn('mt-nm', 'nvMonto', 'm', 'Préstamo nuevo a evaluar (CLP)', m.nvMonto) + nIn('mt-nt', 'nvTasa', 'p', 'Tasa del préstamo nuevo (% mensual)', m.nvTasa) + nIn('mt-nn', 'nvN', 'n', 'Cuotas del préstamo nuevo', m.nvN) +
      '<label class="field wide"><span>Depósito donde inviertes</span><select id="mt-plazo">' + opt + '</select></label></div>' +
      '<div class="actions"><button class="btn small" type="button" id="mt-ej">Cargar ejemplo hipotético</button></div><div id="mt-res"></div>' +
      '<details class="card" style="margin-top:12px"><summary>Tasas observadas de depósitos a plazo (UF)</summary><div class="tw"><table><thead><tr><th>Plazo</th><th>Real anual</th><th>En el período</th><th></th></tr></thead><tbody>' + filas + '</tbody></table></div><p class="sub">' + esc(D.DAP_NOTA) + '</p></details>';
    metaResultados(); tarjRender();
  }
  function metaBase() {
    var m = S.cfg.meta, ing = m.ingreso || ingresoProm() || 0, gas = m.gasto || gastoProm() || 0;
    var x = D.DAP_OBSERVADOS.find(function (q) { return q.id === m.plazo; }) || D.DAP_OBSERVADOS[5];
    return { m: m, ing: ing, gas: gas, x: x, meta: gas * m.meses };
  }
  function metaResultados() {
    var r = $('mt-res'); if (!r) return;
    var B = metaBase(), m = B.m;
    if (!(B.ing > 0) || !(B.gas > 0)) { r.innerHTML = '<p class="sub">Escribe tu ingreso mensual y tu gasto esencial mensual para ver las estrategias (o carga el ejemplo hipotético).</p>'; return; }
    var deudas = (m.tarjSaldo || 0) + (m.preSaldo || 0), neto0 = (m.capital || 0) - deudas, cob = B.gas > 0 ? neto0 / B.gas : 0;
    var avance = Math.max(0, Math.min(100, neto0 / B.meta * 100));
    var head = '<div class="small" style="margin-top:12px">Meta: <b>' + money(B.meta) + '</b> (' + m.meses + ' meses × ' + money(B.gas) + ') · Capital hoy: <b>' + money(neto0) + '</b> (' + money(m.capital || 0) + ' líquido − ' + money(deudas) + ' deudas) · cubres <b>' + num(cob, 1) + ' meses</b> de gasto · flujo libre mensual: <b>' + money(B.ing - B.gas) + '</b></div>' +
      '<div class="barra"><span style="width:' + avance + '%"></span></div>';
    var cell = function (q) { return q.mesMeta === null ? 'más de 36 meses' : (q.mesMeta === 0 ? 'ya la tienes' : q.mesMeta + ' meses'); };
    var res = {}, filas = '';
    ESTRAT.forEach(function (e) {
      ESCEN.forEach(function (s, k) {
        var q = F.simularCapital({ ingreso: B.ing * (1 + s[1]), gasto: B.gas * (1 + s[2]), capital: m.capital || 0, meta: B.meta, tm: F.tasaMensualDeposito({ tipo: 'uf', tasa: B.x.real, varUF: s[3] }),
          tarjeta: { saldo: m.tarjSaldo || 0, iM: (m.tarjTasa || 0) / 100 }, prestamo: { saldo: m.preSaldo || 0, iM: (m.preTasa || 0) / 100, cuota: m.preCuota || 0 },
          nuevo: { monto: m.nvMonto || 0, iM: (m.nvTasa || 0) / 100, n: m.nvN || 12 }, estrategia: e[0], horizonte: 36 });
        res[e[0] + k] = q;
        filas += '<tr' + (k === 0 ? ' class="grp"' : '') + '><td>' + (k === 0 ? '<b>' + e[1] + '</b>' : '') + '</td><td>' + s[0] + '</td><td><b>' + cell(q) + '</b></td><td>' + money(q.doce.neto) + '</td><td>' + money(q.doce.intInv) + '</td><td>' + money(q.doce.intDeu) + '</td></tr>';
      });
    });
    var mejor = ESTRAT.map(function (e) { return { e: e, q: res[e[0] + '1'] }; }).sort(function (a, b) { var x = a.q.mesMeta === null ? 99 : a.q.mesMeta, y = b.q.mesMeta === null ? 99 : b.q.mesMeta; return x - y || b.q.doce.neto - a.q.doce.neto; })[0];
    var ver = (B.ing - B.gas <= 0) ? '<div class="veredicto bad">Tu flujo libre es cero o negativo: ninguna estrategia de inversión alcanza la meta. Primero hay que reducir gasto o subir ingreso.</div>' :
      '<div class="veredicto ' + (mejor.q.mesMeta !== null && mejor.q.mesMeta <= 12 ? 'ok' : 'bad') + '">En el escenario realista, la estrategia más rápida es «' + esc(mejor.e[1]) + '»: ' + (mejor.q.mesMeta === null ? 'no llegas a la meta en 36 meses.' : (mejor.q.mesMeta === 0 ? 'ya tienes la meta.' : 'llegas en ' + mejor.q.mesMeta + ' meses.')) + '</div>';
    r.innerHTML = head + ver +
      '<div class="tw"><table><thead><tr><th>Estrategia</th><th>Escenario</th><th>Tiempo para la meta</th><th>Capital a 12 meses</th><th>Intereses ganados 12 m</th><th>Intereses pagados 12 m</th></tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<p class="sub"><b>Escenarios:</b> pesimista = ingreso −15%, gasto +10%, UF 3% · realista = tus cifras, UF 4% · optimista = ingreso +10%, gasto −5%, UF 5%. Depósito: ' + B.x.plazo + ' días a ' + num(B.x.real, 2) + '% real sobre UF, con reinversión. Tarjeta: se paga el mínimo (intereses + 1% del saldo). Sin impuestos. Si el flujo es negativo y no hay dinero, la tarjeta financia la diferencia. <b>Los depósitos de la captura no se pueden retirar antes del vencimiento</b>: mantén caja para imprevistos. No es asesoría financiera.</p>';
  }
  function tarjRender() {
    var el = $('tarj'), t = S.cfg.tarj || (S.cfg.tarj = {});
    if (!(t.dias > 0)) t.dias = 25;
    el.innerHTML = '<h3>Tarjeta de crédito: pagar total, cuota fija o mínimo</h3>' +
      '<p class="sub">Compara cuánto cuesta dejar la deuda de tarjeta (la del recuadro de arriba) y cuánto rinde pagar la tarjeta recién el día de vencimiento.</p>' +
      '<div class="form" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">' +
      nIn('tj-fijo', 'pagoFijo', 'm', 'Cuota fija que podrías pagar (CLP/mes)', t.pagoFijo) +
      nIn('tj-gasto', 'gastoTarj', 'm', 'Gasto mensual que pasas por la tarjeta (CLP)', t.gastoTarj) +
      nIn('tj-dias', 'dias', 'n', 'Días entre la compra y el pago', t.dias, '25') + '</div><div id="tj-res"></div>';
    tarjResultados();
  }
  function tarjResultados() {
    var r = $('tj-res'); if (!r) return;
    var m = S.cfg.meta, t = S.cfg.tarj, B = metaBase(), iM = (m.tarjTasa || 0) / 100, tm = F.tasaMensualDeposito({ tipo: 'uf', tasa: B.x.real, varUF: 4 }), out = '';
    if (m.tarjSaldo > 0 && iM > 0) {
      var P = F.tarjetaPlanes(m.tarjSaldo, iM, t.pagoFijo || 0);
      var dur = function (q) { return !q || q.meses === null ? '<td colspan="2">La cuota no cubre los intereses</td>' : '<td>' + (q.interminable ? 'más de 50 años' : q.meses + ' meses') + '</td><td>' + money(q.intereses) + '</td>'; };
      out += '<div class="tw"><table><thead><tr><th>Cómo pagas ' + money(m.tarjSaldo) + ' al ' + pct(m.tarjTasa) + '% mensual</th><th>Tiempo</th><th>Intereses totales</th></tr></thead><tbody>' +
        '<tr><td>Pagar todo al vencimiento</td><td>1 mes</td><td>' + money(0) + '</td></tr>' +
        (t.pagoFijo > 0 ? '<tr><td>Cuota fija de ' + money(t.pagoFijo) + '</td>' + dur(P.fijo) + '</tr>' : '') +
        '<tr><td>Solo el mínimo (intereses + 1% del saldo)</td>' + dur(P.minimo) + '</tr></tbody></table></div>';
    } else out += '<p class="sub">Para ver el costo de dejar deuda en la tarjeta, escribe arriba el saldo y la tasa mensual.</p>';
    if (t.gastoTarj > 0) {
      var v = F.ventajaPlazo(t.gastoTarj, t.dias, tm);
      out += '<div class="veredicto ok">Pasar ' + money(t.gastoTarj) + ' al mes por la tarjeta y pagarla en ' + t.dias + ' días deja ' + money(v) + ' al mes (' + money(v * 12) + ' al año) si ese dinero queda invertido mientras tanto, y solo si pagas el total cada mes.</div>' +
        '<p class="sub">Se supone el depósito elegido arriba con UF 4%. Si dejas saldo sin pagar, los intereses de la tarjeta anulan esa ventaja.</p>';
    }
    r.innerHTML = out;
  }

  function decResultados() {
    var cd = S.cfg.dec, h = hoy(), d = S.dap.find(function (x) { return x.id === cd.dap; }); if (!d || !$('r1')) return;
    var cx = creditosContratados().find(function (x) { return x.o.id === cd.cred; });
    var cred = cx ? { saldo: cx.sc.saldo, iM: cx.sc.iM, pago: cx.o.pago } : null, pre = cx ? (cx.o.prepago || 0) : 0, e = F.estadoDeposito(d, h);
    var sinCred = '<p class="sub">Registra un crédito <b>contratado</b> (con cuota, plazo y cuotas ya pagadas) para ver esta comparación.</p>';
    var v = function (txt, clase) { return '<div class="veredicto ' + (clase || '') + '">' + txt + '</div>'; };
    var li = function (arr) { return '<ul class="lineas">' + arr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; };
    var u = d.tipo === 'uf' ? ' <span class="sub">(proyección con UF ' + num(d.varUF) + '% anual)</span>' : '';

    if (!cred) { $('r1').innerHTML = sinCred; $('r2').innerHTML = sinCred; $('r3').innerHTML = sinCred; }
    else {
      var a = F.costoDiario(d, cred);
      $('r1').innerHTML = v(a.razon > 1.05 ? 'La deuda pesa ' + num(a.razon, 1) + ' veces más que tu inversión.' : a.razon < 0.95 ? 'Tu inversión rinde más de lo que cuesta la deuda.' : 'Cuestan casi lo mismo.', a.razon > 1.05 ? 'bad' : 'ok') +
        li(['Cada <b>$100.000</b> invertidos rinden <b>' + money(a.rendPor100k) + '</b> al día' + u, 'Cada <b>$100.000</b> de deuda cuestan <b>' + money(a.costoPor100k) + '</b> al día',
          'En tus montos: tu depósito rinde ' + money(a.rendDia) + ' al día y tu deuda de ' + money(cred.saldo) + ' te cuesta ' + money(a.costoDia) + ' al día', 'Tasa mensual: depósito ' + F.pct(a.tmDeposito, 2) + ' · crédito ' + F.pct(a.iMCredito, 2)]);

      var b = F.pagarHoy(d, cred, h, pre);
      $('r2').innerHTML = !b ? '<p class="sub">Este depósito empieza el ' + fechaCorta(d.f0) + ': todavía no hay dinero invertido que rescatar.</p>' :
        v(b.ventajaPagar >= 0 ? 'Pagar hoy te ahorra ' + money(b.ventajaPagar) + ' hasta el vencimiento.' : 'Mantener el depósito te deja ' + money(-b.ventajaPagar) + ' más hasta el vencimiento.', b.ventajaPagar >= 0 ? 'ok' : '') +
        li(['Hoy rescatas <b>' + money(b.rescate) + '</b>' + (d.retiro === 'pierde-intereses' && !e.vencido ? ' (sin intereses, según lo que indicaste)' : ' (capital + intereses ganados)'),
          'Pagas <b>' + money(b.abono) + '</b> de tu crédito (saldo estimado ' + money(cred.saldo) + ')' + (b.sobra > 0 ? '; te sobran ' + money(b.sobra) + ', que supongo siguen invertidos' : ''),
          'En ' + b.H + ' días' + (b.supuesto ? ' (el depósito ya venció: supongo renovación a la misma tasa)' : ' (hasta el vencimiento)') + ':',
          '<b>Mantener:</b> pagas ' + money(b.interesMantener) + ' de intereses y ganas ' + money(b.gananciaDeposito),
          '<b>Pagar hoy:</b> pagas ' + money(b.interesPagar) + (b.prepago ? ' + ' + money(b.prepago) + ' de prepago' : '') + ' y ganas ' + money(b.gananciaSobrante)]);

      var c = F.extenderVsPrepagar(d, cred, h, cd.N, pre);
      $('r3').innerHTML = v(c.ventajaPrepagar >= 0 ? 'Prepagar rinde ' + money(c.ventajaPrepagar) + ' más que extender ' + cd.N + ' día(s).' : 'Extender rinde ' + money(-c.ventajaPrepagar) + ' más que prepagar.', c.ventajaPrepagar >= 0 ? 'ok' : '') +
        li(['Cuando venza el depósito' + (c.diasHastaDecision > 0 ? ' (en ' + c.diasHastaDecision + ' días)' : '') + ' tendrás <b>' + money(c.dinero) + '</b>' + u,
          '<b>Extender ' + cd.N + ' día(s)</b> a la misma tasa rinde ' + money(c.extender),
          '<b>Prepagar</b>: usas ' + money(c.usado) + ' (saldo del crédito entonces: ' + money(c.saldoCredito) + '), ahorras ' + money(c.ahorroIntereses) + ' en intereses' + (c.invierteSobrante > 0 ? ' y el sobrante rinde ' + money(c.invierteSobrante) : '')]);
    }

    var X = cd.X, ofs = ofertasCuotas(), of = ofs.find(function (o) { return o.id === cd.of; });
    if (!(X > 0)) $('r4').innerHTML = '<p class="sub">Escribe el monto que necesitas para ver la comparación.</p>';
    else if (!of) $('r4').innerHTML = '<p class="sub">No hay una oferta con cuotas para usar como referencia: agrega una.</p>';
    else if (!(cd.nc > 0)) $('r4').innerHTML = '<p class="sub">Indica en cuántas cuotas.</p>';
    else {
      var r = F.creditoNuevoVsInversion(d, h, X, cd.nc, of.iM);
      $('r4').innerHTML = v(r.diferencia > 0 ? 'Usar tu inversión te cuesta ' + money(r.diferencia) + ' menos que endeudarte.' : 'Endeudarte te cuesta ' + money(-r.diferencia) + ' menos que usar tu inversión.', r.diferencia > 0 ? 'ok' : '') +
        li(['<b>Pedir el crédito</b> (' + cd.nc + ' cuotas de ' + money(r.cuota) + ', tasa ' + F.pct(of.iM, 2) + ' mensual): pagas ' + money(r.costoCredito) + ' en intereses',
          '<b>Usar tu depósito</b>: dejas de ganar ' + money(r.costoInversion) + u,
          r.alcanza ? 'Tu depósito rescatable hoy (' + money(r.rescate) + ') alcanza para ' + money(X) : '<span class="bad">Tu depósito rescatable hoy (' + money(r.rescate) + ') no alcanza para ' + money(X) + '</span>']);
    }
  }

  function enviarDap(e) {
    e.preventDefault();
    var tipo = $('d-tipo').value, num2 = function (id) { return parseFloat($(id).value.trim().replace(',', '.')); };
    var d = { id: uid(), inst: $('d-inst').value.trim(), tipo: tipo, monto: F.parseMonto($('d-monto').value), tasa: num2('d-tasa'), per: tipo === 'uf' ? 'anual' : $('d-per').value,
      varUF: tipo === 'uf' ? num2('d-uf') : null, f0: F.parseFecha($('d-f0').value), fv: F.parseFecha($('d-fv').value), retiro: $('d-retiro').value };
    var err = !d.inst ? 'Falta la institución.' : !(d.monto > 0) ? 'El monto debe ser mayor que cero.' : !(d.tasa >= 0) ? 'Ingresa la tasa (puede ser 0).' :
      (tipo === 'uf' && !isFinite(d.varUF)) ? 'Indica la variación anual de la UF que supones.' : (!d.f0 || !d.fv) ? 'Indica la fecha de inicio y el vencimiento.' : d.fv <= d.f0 ? 'El vencimiento debe ser posterior al inicio.' : null;
    if (err) { msg('d-msg', err, 'bad'); return; }
    S.dap.push(d); msg('d-msg', ''); toast('Depósito agregado');
    ['d-inst', 'd-monto', 'd-tasa', 'd-uf', 'd-fv'].forEach(function (i) { $(i).value = ''; });
    cambiado();
  }

  function renderOfertas() {
    var rows = filasOfertas(), ord = $('f-orden').value;
    var key = function (x) { var v = x.ev.iA !== null ? x.ev.iA : x.ev.anualEq; return v === null ? Infinity : Math.round(v * 1000) / 1000; };
    var desempate = function (a, b) { return (a.o.inst + a.o.prod).localeCompare(b.o.inst + b.o.prod, 'es') || a.o.plazo - b.o.plazo; };
    rows.sort(function (a, b) {
      if (ord === 'inst') return desempate(a, b);
      if (ord === 'extra') return ((a.ev.extraPct === null ? Infinity : a.ev.extraPct) - (b.ev.extraPct === null ? Infinity : b.ev.extraPct)) || desempate(a, b);
      if (ord === 'pago') return (a.o.pago - b.o.pago) || desempate(a, b);
      return (key(a) - key(b)) || desempate(a, b);
    });
    $('f-tabla').innerHTML = rows.map(function (x) {
      var o = x.o, ev = x.ev, inf = [];
      if (o.tasaPct !== null && o.tasaPct !== undefined && o.tasaPct !== '') inf.push('Tasa ' + num(o.tasaPct) + '%' + (o.tasaPer ? ' ' + o.tasaPer : ' (sin indicar si es mensual o anual)'));
      if (o.caePct !== null && o.caePct !== undefined && o.caePct !== '') inf.push('CAE ' + num(o.caePct) + '%');
      var anual = ev.iA !== null ? F.pct(ev.iA, 1) : ev.anualEq !== null ? '≈ ' + F.pct(ev.anualEq, 0) + ' *' : '—';
      var det = [o.nota, o.fuente, o.fecha ? 'Fecha: ' + fechaCorta(o.fecha) : ''].filter(Boolean);
      var detalle = '<details class="small"><summary>Detalle' + (ev.alertas.length ? ' ⚠ ' + ev.alertas.length : '') + '</summary><div class="sub small">' +
        'Tasa mensual implícita: <b>' + (ev.iM !== null ? F.pct(ev.iM, 2) : '—') + '</b> · Costo adicional: <b>' + money(ev.extra) + ' (' + F.pct(ev.extraPct, 1) + ' del capital)</b><br>' +
        'Informado por la oferta: ' + (inf.length ? inf.map(esc).join(' · ') : 'no informa tasa ni CAE') + (x.cuotaIng !== null ? '<br>Pago sobre tu ingreso: <b>' + F.pct(x.cuotaIng, 0) + '</b>' : '') + '</div>' +
        ev.alertas.map(function (a) { return '<div class="al">⚠ ' + esc(a) + '</div>'; }).join('') + (det.length ? '<div class="sub small" style="margin-top:6px">' + det.map(esc).join('<br>') + '</div>' : '') +
        (o.origen === 'usuario' ? '<div style="margin-top:8px"><button class="btn small danger" data-del-of="' + o.id + '">Quitar</button></div>' : '') + '</details>';
      return '<tr class="main"><td><b>' + esc(o.inst) + '</b><div class="sub small">' + esc(o.prod) + '</div><span class="tag ' + (o.estado === 'Contratado' ? 'warn' : '') + '">' + esc(o.estado) + '</span>' +
        ev.cortas.map(function (a) { return '<div class="al">⚠ ' + esc(a) + '</div>'; }).join('') + '</td>' +
        '<td data-l="Condiciones">' + money(o.capital) + ' · ' + o.plazo + ' ' + (o.unidad === 'dias' ? 'días' : 'meses') + '<div class="sub small">' + money(o.pago) + (o.tipo === 'cuotas' ? ' por cuota' : ' pago único') + '</div></td>' +
        '<td class="n" data-l="Total a devolver">' + money(ev.total) + '<div class="sub small">+' + money(ev.extra) + ' · ' + F.pct(ev.extraPct, 1) + '</div></td>' +
        '<td class="n key" data-l="Tasa efectiva anual"><b>' + anual + '</b></td><td class="c-det">' + detalle + '</td></tr>';
    }).join('');
  }

  function cupoHTML(c, propio) {
    var disp = c.disponible !== null && c.disponible !== undefined ? c.disponible : c.cupo - c.usado, u = c.cupo > 0 ? c.usado / c.cupo : 0;
    var cuadra = Math.abs(c.cupo - c.usado - disp) < 1, pc = function (v) { return v === null || v === undefined ? '<span class="sub">Por confirmar</span>' : esc(v); };
    return '<div class="card" style="box-shadow:none"><div class="actions" style="justify-content:space-between"><div><b>' + esc(c.inst) + '</b><div class="sub small">' + esc(c.prod) + '</div></div>' +
      (propio ? '<button class="btn small danger" data-del-cupo="' + c.id + '">Quitar</button>' : '') + '</div>' +
      '<div class="medidor" role="img" aria-label="Utilización del cupo"><i style="width:' + Math.min(100, u * 100) + '%;background:var(--' + (u < .5 ? 'ok' : u < .8 ? 'warn' : 'bad') + ')"></i></div>' +
      '<p class="small">Cupo <b>' + money(c.cupo) + '</b> · Utilizado <b>' + money(c.usado) + '</b> (' + F.pct(u, 1) + ') · Disponible <b>' + money(disp) + '</b></p>' +
      '<p class="small">Facturación: <b>' + fechaCorta(c.fact) + '</b> · Vencimiento: <b>' + fechaCorta(c.venc) + '</b></p>' +
      '<p class="small">Interés compras: ' + pc(c.tasaCompras) + ' · avances: ' + pc(c.tasaAvances) + ' · CAE: ' + pc(c.cae) + ' · Mantención: ' + pc(c.mant) + '</p>' +
      '<p class="small ' + (cuadra ? '' : 'bad') + '">' + (cuadra ? 'El cupo cuadra: total − utilizado = disponible.' : 'REVISAR: el cupo no cuadra.') + '</p>' +
      (c.nota ? '<p class="sub small">' + esc(c.nota) + '</p>' : '') + (c.fuente ? '<p class="sub small">' + esc(c.fuente) + '</p>' : '') + '</div>';
  }
  function renderCupos() {
    $('cupos-lista').innerHTML = D.CUPOS_OBSERVADOS.map(function (c) { return cupoHTML(c, false); }).join('') + S.cupos.map(function (c) { return cupoHTML(c, true); }).join('');
  }

  function enviarOferta(e) {
    e.preventDefault();
    var o = { id: uid(), inst: $('o-inst').value.trim(), prod: $('o-prod').value.trim(), estado: $('o-estado').value, fecha: F.parseFecha($('o-fecha').value) || hoy(),
      capital: F.parseMonto($('o-capital').value), tipo: $('o-tipo').value, plazo: F.parseMonto($('o-plazo').value), unidad: $('o-unidad').value, pago: F.parseMonto($('o-pago').value),
      tasaPct: null, tasaPer: $('o-tasaper').value || null, caePct: null, nota: $('o-nota').value.trim(), pagadas: 0, prepago: 0 };
    var contratado = o.estado === 'Contratado' && o.tipo === 'cuotas';
    if (contratado) { o.pagadas = F.parseMonto($('o-pagadas').value || '0'); o.prepago = F.parseMonto($('o-prepago').value || '0'); }
    var tasa = $('o-tasa').value.trim(), cae = $('o-cae').value.trim();
    if (tasa) o.tasaPct = parseFloat(tasa.replace(',', '.')); if (cae) o.caePct = parseFloat(cae.replace(',', '.'));
    var err = !o.inst || !o.prod ? 'Falta la institución o el producto.' : !(o.capital > 0) ? 'El capital debe ser mayor que cero.' : !(o.plazo > 0) ? 'El plazo debe ser mayor que cero.' : !(o.pago > 0) ? 'El pago debe ser mayor que cero.'
      : (tasa && !isFinite(o.tasaPct)) ? 'La tasa informada no es un número.' : (cae && !isFinite(o.caePct)) ? 'La CAE informada no es un número.' : null;
    if (!err && o.tipo === 'pago-unico' && o.pago < o.capital) err = 'Un pago único menor que el capital recibido no tiene sentido: revisa los datos.';
    if (!err && contratado && !(o.pagadas >= 0 && o.pagadas < o.plazo)) err = 'Las cuotas ya pagadas deben ser menos que el plazo total.';
    if (!err && contratado && !(o.prepago >= 0)) err = 'El costo por prepagar no es válido.';
    if (err) { msg('o-msg', err, 'bad'); return; }
    S.ofer.push(o); msg('o-msg', ''); toast('Oferta agregada al comparador');
    ['o-inst', 'o-prod', 'o-capital', 'o-plazo', 'o-pago', 'o-tasa', 'o-cae', 'o-nota', 'o-pagadas', 'o-prepago'].forEach(function (i) { $(i).value = ''; });
    cambiado();
  }
  function enviarCupo(e) {
    e.preventDefault();
    var c = { id: uid(), inst: $('q-inst').value.trim(), prod: $('q-prod').value.trim(), cupo: F.parseMonto($('q-cupo').value), usado: F.parseMonto($('q-usado').value),
      fact: F.parseFecha($('q-fact').value), venc: F.parseFecha($('q-venc').value), disponible: null, tasaCompras: null, tasaAvances: null, cae: null, mant: null };
    var err = !c.inst || !c.prod ? 'Falta la institución o el producto.' : !(c.cupo > 0) ? 'El cupo debe ser mayor que cero.' : !(c.usado >= 0) ? 'El monto utilizado no es válido.' : c.usado > c.cupo ? 'Lo utilizado no puede superar el cupo.' : null;
    if (err) { msg('q-msg', err, 'bad'); return; }
    S.cupos.push(c); msg('q-msg', ''); toast('Agregado');
    ['q-inst', 'q-prod', 'q-cupo', 'q-usado', 'q-fact', 'q-venc'].forEach(function (i) { $(i).value = ''; });
    cambiado();
  }

  /* =====================================================================
     3 · BRECHA DE EVIDENCIA
     ===================================================================== */
  var verificando = null;

  function movsCaja() { return S.saldo ? S.mov.filter(function (m) { return m.f >= S.saldo.f; }) : S.mov; }

  function renderSaldo() {
    var s = S.saldo;
    if (s) { $('s-monto').value = nf.format(s.m); $('s-fecha').value = s.f; $('s-ev').value = s.e === 'V' ? 'V' : 'D'; $('s-doc').value = s.doc || ''; }
    $('s-doc-w').hidden = $('s-ev').value !== 'V'; $('s-quitar').hidden = !s;
  }

  function svgCaja(c, h) {
    var P = c.puntos, W = 720, H = 300, L = 56, R = 14, T = 16, B = 40;
    var dia = function (f) { var p = f.split('-'); return Date.UTC(+p[0], +p[1] - 1, +p[2]) / 864e5; };
    var x0 = dia(P[0].f), x1 = Math.max(dia(P[P.length - 1].f), dia(h));
    var span = Math.max(x1 - x0, 6); x1 = x0 + span; var xe = x1 + span * 0.03;
    var vals = [0]; P.forEach(function (p) { vals.push(p.V, p.VD, p.VDP); });
    var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals); if (hi === lo) hi = lo + 1;
    var sc = escala(lo, hi, 5); lo = sc.lo; hi = sc.hi; var nt = Math.round((hi - lo) / sc.paso);
    var X = function (f) { return L + (dia(f) - x0) / (xe - x0) * (W - L - R); }, Y = function (v) { return T + (hi - v) / (hi - lo) * (H - T - B); };
    function verts(key, desde) {
      var v = [], i, a = P.slice(desde || 0);
      for (i = 0; i < a.length; i++) { var xi = X(a[i].f), xn = i + 1 < a.length ? X(a[i + 1].f) : (W - R); v.push([xi, Y(a[i][key])], [xn, Y(a[i][key])]); }
      return v;
    }
    var path = function (v) { return v.map(function (q, i) { return (i ? 'L' : 'M') + q[0].toFixed(1) + ' ' + q[1].toFixed(1); }).join(' '); };
    var ih = P.findIndex(function (p) { return p.f === h; }); if (ih < 0) ih = 0;
    var s = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Caja respaldada, declarada y esperada en el tiempo">';
    for (var i = 0; i <= nt; i++) {
      var val = lo + sc.paso * i;
      s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(val) + '" y2="' + Y(val) + '"/><text x="' + (L - 8) + '" y="' + (Y(val) + 4) + '" text-anchor="end">' + compacto(val) + '</text>';
    }
    if (lo < 0 && hi > 0) s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + Y(0) + '" y2="' + Y(0) + '" stroke="var(--muted)" stroke-width="1.5"/>';
    var vV = verts('V'), vP = verts('VDP');
    s += '<path d="' + path(vV.concat(vP.slice().reverse())) + ' Z" fill="var(--brand)" opacity=".13"><title>Zona entre lo respaldado y lo esperado</title></path>';
    s += '<path d="' + path(verts('VD')) + '" fill="none" stroke="var(--ev-d)" stroke-width="2.5" stroke-dasharray="7 4"/>';
    if (P.length > ih + 1 || P[ih].VDP !== P[ih].VD) s += '<path d="' + path(verts('VDP', ih)) + '" fill="none" stroke="var(--ev-p)" stroke-width="2.5" stroke-dasharray="2 4"/>';
    s += '<path d="' + path(vV) + '" fill="none" stroke="var(--ev-v)" stroke-width="3.5"/>';
    s += '<line x1="' + X(h) + '" x2="' + X(h) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="var(--ink)" stroke-width="1.5" stroke-dasharray="3 3"/><text x="' + X(h) + '" y="' + (T - 3) + '" text-anchor="middle">hoy</text>';
    if (P.length <= 80) P.forEach(function (p) { s += '<circle cx="' + X(p.f) + '" cy="' + Y(p.V) + '" r="4" fill="var(--ev-v)"><title>' + fechaCorta(p.f) + ' · respaldada ' + money(p.V) + ' · declarada ' + money(p.VD) + ' · esperada ' + money(p.VDP) + '</title></circle>'; });
    s += '<text x="' + L + '" y="' + (H - 14) + '">' + fechaCorta(P[0].f) + '</text><text x="' + (W - R) + '" y="' + (H - 14) + '" text-anchor="end">' + fechaCorta(P[P.length - 1].f) + '</text>';
    return s + '</svg><div class="leg"><span><span class="dot" style="background:var(--ev-v)"></span>Respaldada (solo verificado)</span><span><span class="dot" style="background:var(--ev-d)"></span>Declarada (verificado + lo que tú dices)</span><span><span class="dot" style="background:var(--ev-p)"></span>Esperada (suma lo proyectado)</span><span><span class="dot" style="background:var(--brand);opacity:.4"></span>Zona de incertidumbre</span></div>';
  }

  function renderBrecha() {
    var h = hoy(), mc = movsCaja(), c = F.cajaAcumulada(mc, S.saldo, h), hay = !!c.hoy;
    renderSaldo();
    $('b-vacio').hidden = hay; $('b-datos').hidden = !hay; if (!hay) return;
    var V = c.hoy.V, VD = c.hoy.VD, fin = c.fin, brecha = VD - V, idx = F.indiceRespaldo(mc, h);
    var sinSaldo = !S.saldo ? '<span>sin saldo inicial: es flujo acumulado, no saldo bancario</span>' : '<span>incluye el saldo inicial</span>';
    $('b-kpis').innerHTML =
      '<div class="kpi" data-k="cuadra"><small>Caja respaldada hoy</small><b>' + money(V) + '</b><span>solo con evidencia verificada</span></div>' +
      '<div class="kpi" data-k="sobra"><small>Caja declarada hoy</small><b>' + money(VD) + '</b>' + sinSaldo + '</div>' +
      '<div class="kpi" data-k="' + (brecha === 0 ? 'cuadra' : 'deficit') + '"><small>Brecha de respaldo</small><b>' + money(brecha) + '</b><span>' + (brecha === 0 ? 'todo lo ocurrido está verificado' : VD !== 0 ? F.pct(Math.abs(brecha / VD), 0) + ' de tu caja depende de tu palabra' : 'depende de tu palabra') + '</span></div>' +
      '<div class="kpi"><small>Índice de respaldo</small><b>' + (idx === null ? '—' : F.pct(idx, 0)) + '</b><span>del dinero que ya se movió, con evidencia</span></div>' +
      '<div class="kpi"><small>Caja esperada' + (fin.f > h ? ' al ' + fechaCorta(fin.f) : '') + '</small><b>' + money(fin.VDP) + '</b><span>' + (fin.f > h ? 'si ocurre lo proyectado' : 'no hay movimientos proyectados') + '</span></div>';
    $('b-grafico').innerHTML = svgCaja(c, h);
    var R = F.respaldoPorTipo(mc, h);
    $('b-tipos').innerHTML = F.TIPOS.map(function (t) {
      var r = R[t], tot = r.V + r.D + r.P; if (!tot) return '<div class="rowev"><span class="l">' + t + '</span><span class="sub">sin movimientos</span></div>';
      return '<div class="rowev"><span class="l">' + t + '</span><div class="ev" role="img" aria-label="' + t + ': ' + F.pct(r.V / tot, 0) + ' verificado"><i class="V" style="width:' + r.V / tot * 100 + '%"></i><i class="D" style="width:' + r.D / tot * 100 + '%"></i><i class="P" style="width:' + r.P / tot * 100 + '%"></i></div>' +
        '<span class="d">Verificado ' + money(r.V) + ' · Declarado ' + money(r.D) + ' · Proyectado ' + money(r.P) + '</span></div>';
    }).join('');
    var pend = S.mov.filter(function (m) { return m.f <= h && m.e !== 'V'; }).sort(function (a, b) { return b.m - a.m; });
    $('b-cerrar').innerHTML = !pend.length ? '<div class="note ok">No hay movimientos sin respaldo: tu brecha es cero.</div>' :
      pend.slice(0, 10).map(function (m) {
        var ab = verificando === m.id;
        return '<div class="verif"><div><b>' + esc(m.d) + '</b> · ' + money(m.t === 'Ingreso' ? m.m : -m.m) + '<div class="sub small">' + fechaCorta(m.f) + ' · ' + m.t + (m.e === 'P' ? ' · proyección vencida: ¿ya ocurrió?' : '') + '</div></div>' +
          (ab ? '' : '<button class="btn small" data-ver="' + m.id + '">Verificar</button>') +
          (ab ? '<div class="inline"><input id="ver-doc" type="text" maxlength="120" placeholder="Documento: cartola, estado de cuenta, boleta…" aria-label="Documento que respalda"><div class="actions"><button class="btn small primary" data-ver-ok="' + m.id + '">Coincide, verificar</button><button class="btn small" data-ver-no="1">Cancelar</button></div></div>' : '') + '</div>';
      }).join('') + (pend.length > 10 ? '<p class="sub small" style="margin-top:8px">… y ' + (pend.length - 10) + ' más. Verifica los mayores primero.</p>' : '') +
      '<p class="sub small" style="margin-top:8px">Marca «Coincide» solo si el monto y la fecha coinciden con tu cartola o comprobante.</p>';
    if (verificando) { var d = $('ver-doc'); if (d) d.focus(); }
  }

  function enviarSaldo(e) {
    e.preventDefault();
    var m = F.parseMonto($('s-monto').value), f = F.parseFecha($('s-fecha').value) || hoy(), ev = $('s-ev').value, doc = $('s-doc').value.trim();
    var err = !isFinite(m) ? 'Ingresa el monto del saldo.' : f > hoy() ? 'La fecha del saldo no puede ser futura.' : (ev === 'V' && !doc) ? 'Indica el documento que respalda el saldo.' : null;
    if (err) { msg('s-msg', err, 'bad'); return; }
    S.saldo = { m: m, f: f, e: ev, doc: ev === 'V' ? doc : '' }; msg('s-msg', 'Saldo guardado.', 'ok'); cambiado();
  }

  /* ---------- render general ---------- */
  function renderTodo() { renderMigracion(); renderControl(); renderDap(); renderCred(); renderCarga(); renderOfertas(); renderDecision(); renderMeta(); renderCupos(); renderBrecha(); $('f-tmc').value = S.cfg.tmc || ''; }

  /* ---------- eventos ---------- */
  function iniciar() {
    try { localStorage.setItem('__t', '1'); localStorage.removeItem('__t'); } catch (e) { okGuardado = false; }
    $('aviso-guardado').hidden = okGuardado;
    $('dl-inst').innerHTML = D.INSTITUCIONES.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('');
    $('m-fecha').value = hoy(); $('o-fecha').value = hoy(); $('s-fecha').value = hoy();
    actualizarEv();

    document.querySelectorAll('.tabs button').forEach(function (b) {
      b.addEventListener('click', function () { mostrar(b.dataset.tab); });
      b.addEventListener('keydown', function (e) {
        var i = TABS.indexOf(b.dataset.tab), n = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
        if (n === null) return; n = (n + TABS.length) % TABS.length; mostrar(TABS[n]); $('tab-' + TABS[n]).focus();
      });
    });
    window.addEventListener('hashchange', function () { mostrar(tabInicial(), true); });

    $('periodo').addEventListener('change', function () { periodoSel = this.value; renderControl(); });
    $('f-mov').addEventListener('submit', enviarMov);
    $('m-fecha').addEventListener('change', actualizarEv); $('m-fecha').addEventListener('input', actualizarEv);
    $('m-ev').addEventListener('change', function () { $('m-doc-w').hidden = this.value !== 'V'; });
    $('m-cancel').addEventListener('click', function () { limpiarForm(); msg('m-msg', ''); });
    $('l-tipo').addEventListener('change', renderLista); $('l-q').addEventListener('input', renderLista);
    $('l-tabla').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-act]'); if (!b) return;
      if (b.dataset.act === 'ed') editar(b.dataset.id);
      else if (confirm('¿Eliminar este movimiento?')) { S.mov = S.mov.filter(function (m) { return m.id !== b.dataset.id; }); if (editId === b.dataset.id) limpiarForm(); cambiado(); toast('Movimiento eliminado'); }
    });
    $('c-hechos').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-hecho]'); if (!b) return;
      var hc = D.HECHOS_DOCUMENTADOS.find(function (x) { return x.id === b.dataset.hecho; }); if (!hc) return;
      S.mov.push(Object.assign({ id: uid(), src: 'doc:' + hc.id }, hc.mov)); cambiado(); toast('Agregado como Declarado');
    });
    $('migr').addEventListener('click', function (e) { var b = e.target.closest('button[data-mig]'); if (b) migrar(b.dataset.mig); });

    $('imp-leer').addEventListener('click', function () {
      var f = $('imp-file').files[0];
      if (f) { var r = new FileReader(); r.onload = function () { previsualizar(String(r.result).replace(/^﻿/, '')); }; r.readAsText(f); }
      else previsualizar($('imp-txt').value);
    });
    $('imp-prev').addEventListener('click', function (e) {
      if (e.target.id === 'imp-ok') confirmarImportacion();
      if (e.target.id === 'imp-no') { pend = null; $('imp-prev').innerHTML = ''; }
    });
    $('exp-csv').addEventListener('click', exportarCSV); $('bk-json').addEventListener('click', respaldoJSON);
    $('bk-file').addEventListener('change', function () { if (this.files[0]) restaurar(this.files[0]); this.value = ''; });
    $('bk-borrar').addEventListener('click', borrarTodo);

    $('f-dap').addEventListener('submit', enviarDap);
    $('d-tipo').addEventListener('change', function () {
      var uf = this.value === 'uf'; $('d-per-w').hidden = uf; $('d-uf-w').hidden = !uf; $('d-tasa-l').textContent = uf ? 'Tasa real anual sobre la UF (%)' : 'Tasa (%)';
    });
    $('d-f0').value = hoy();
    $('dap-lista').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-del-dap]'); if (!b) return;
      if (confirm('¿Quitar este depósito?')) { S.dap = S.dap.filter(function (x) { return x.id !== b.dataset.delDap; }); cambiado(); }
    });
    $('dec').addEventListener('change', function (e) {
      var t = e.target, cd = S.cfg.dec;
      if (t.id === 'dec-dap') cd.dap = t.value; else if (t.id === 'dec-cred') cd.cred = t.value; else if (t.id === 'dec-of') cd.of = t.value; else return;
      guardar(); decResultados();
    });
    $('dec').addEventListener('input', function (e) {
      var t = e.target, cd = S.cfg.dec;
      if (t.id === 'dec-n') cd.N = Math.max(0, F.parseMonto(t.value) || 0); else if (t.id === 'dec-x') cd.X = Math.max(0, F.parseMonto(t.value) || 0); else if (t.id === 'dec-nc') cd.nc = Math.max(0, F.parseMonto(t.value) || 0); else return;
      guardar(); decResultados();
    });
    var cap = function (e) {
      var t = e.target, k = t.dataset && t.dataset.k; if (!k) return;
      var v = t.dataset.t === 'm' ? (F.parseMonto(t.value) || 0) : (Number(String(t.value).replace(',', '.')) || 0);
      if (t.dataset.t === 'n') v = Math.round(v);
      if (t.closest('#tarj')) S.cfg.tarj[k] = Math.max(0, v); else S.cfg.meta[k] = Math.max(0, v);
      guardar(); metaResultados(); tarjResultados();
    };
    $('meta').addEventListener('input', cap); $('tarj').addEventListener('input', cap);
    $('meta').addEventListener('change', function (e) { if (e.target.id !== 'mt-plazo') return; S.cfg.meta.plazo = e.target.value; guardar(); metaResultados(); tarjResultados(); });
    $('meta').addEventListener('click', function (e) {
      if (e.target.id === 'mt-ej') {
        S.cfg.meta = { ingreso: 1000000, gasto: 700000, meses: 6, capital: 500000, tarjSaldo: 300000, tarjTasa: 2.5, preSaldo: 0, preTasa: 0, preCuota: 0, nvMonto: 1000000, nvTasa: 2, nvN: 12, plazo: S.cfg.meta.plazo || 'ccb-360' };
        S.cfg.tarj = { pagoFijo: 60000, gastoTarj: 400000, dias: 25 }; guardar(); renderMeta(); return;
      }
      var b = e.target.closest('button[data-usar-dap]'); if (!b) return;
      var x = D.DAP_OBSERVADOS[+b.dataset.usarDap], d0 = new Date(hoy() + 'T12:00:00'); d0.setDate(d0.getDate() + x.plazo);
      mostrar('financiamiento');
      $('dap-det').open = true; $('d-inst').value = x.inst; $('d-tipo').value = 'uf'; $('d-tipo').dispatchEvent(new Event('change'));
      $('d-tasa').value = num(x.real, 2); $('d-f0').value = hoy(); $('d-fv').value = d0.toISOString().slice(0, 10); $('d-retiro').value = 'pierde-intereses';
      $('d-msg').textContent = 'Completa el monto y la variación de UF que supones. Este depósito no es anticipable: queda marcado como «pierde intereses» al retirar antes.';
      $('dap-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('d-monto').focus();
    });
    $('dec').addEventListener('click', function (e) {
      if (e.target.id !== 'dec-abrir') return;
      $('dap-det').open = true; $('dap-card').scrollIntoView({ behavior: 'smooth', block: 'start' }); $('d-inst').focus();
    });
    var contr = function () { var c = $('o-estado').value === 'Contratado' && $('o-tipo').value === 'cuotas'; $('o-pag-w').hidden = !c; $('o-pre-w').hidden = !c; };
    $('o-estado').addEventListener('change', contr); $('o-tipo').addEventListener('change', contr);
    $('f-orden').addEventListener('change', renderOfertas);
    $('f-of').addEventListener('submit', enviarOferta);
    $('o-tipo').addEventListener('change', function () {
      var u = this.value === 'pago-unico'; $('o-pago-l').textContent = u ? 'Total a pagar (CLP)' : 'Cuota mensual total (CLP)';
      if (u) $('o-unidad').value = 'dias'; else $('o-unidad').value = 'meses';
    });
    var quitarOferta = function (e) {
      var b = e.target.closest('button[data-del-of]'); if (!b) return;
      if (confirm('¿Quitar este crédito u oferta?')) { S.ofer = S.ofer.filter(function (o) { return o.id !== b.dataset.delOf; }); cambiado(); }
    };
    $('f-tabla').addEventListener('click', quitarOferta); $('cred-lista').addEventListener('click', quitarOferta);
    $('f-cupo').addEventListener('submit', enviarCupo);
    $('cupos-lista').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-del-cupo]'); if (!b) return;
      if (confirm('¿Quitar este producto?')) { S.cupos = S.cupos.filter(function (c) { return c.id !== b.dataset.delCupo; }); cambiado(); }
    });
    $('f-tmc').addEventListener('change', function () { S.cfg.tmc = this.value.trim(); cambiado(); });

    $('f-saldo').addEventListener('submit', enviarSaldo);
    $('s-ev').addEventListener('change', function () { $('s-doc-w').hidden = this.value !== 'V'; });
    $('s-quitar').addEventListener('click', function () { S.saldo = null; $('s-monto').value = ''; msg('s-msg', 'Saldo quitado.', 'ok'); cambiado(); });
    $('b-cerrar').addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.ver) { verificando = b.dataset.ver; renderBrecha(); }
      else if (b.dataset.verNo) { verificando = null; renderBrecha(); }
      else if (b.dataset.verOk) {
        var doc = ($('ver-doc').value || '').trim();
        if (!doc) { $('ver-doc').focus(); $('ver-doc').setAttribute('aria-invalid', 'true'); toast('Indica el documento que lo respalda'); return; }
        var m = S.mov.find(function (x) { return x.id === b.dataset.verOk; });
        if (m) { m.e = 'V'; m.doc = doc; m.vf = new Date().toISOString(); }
        verificando = null; cambiado(); toast('Verificado');
      }
    });

    mostrar(tabInicial(), true);
    renderTodo();
  }
  iniciar();
})();
