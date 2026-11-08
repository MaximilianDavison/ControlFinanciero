/* Datos de referencia con procedencia.
 * Aquí solo hay (1) ofertas y productos que el usuario capturó de sus propias apps el 08-11-2026, tal como se mostraron,
 * y (2) listas auxiliares. No hay movimientos de ejemplo: lo que el usuario no ha registrado no existe en la página.
 * Las capturas originales no están en el repositorio; las fichas de evidencia están en registros/. */
window.DATOS = {
  /* Solo sugerencias para el campo «Institución». No incluye tasas: cambian y dependen de cada persona. */
  INSTITUCIONES: ['Banco de Chile', 'BancoEstado', 'Banco Santander', 'BCI', 'Scotiabank', 'Banco Itaú', 'Banco Falabella',
    'Banco Ripley', 'Banco Security', 'Banco BICE', 'Banco Consorcio', 'Coopeuch', 'Tenpo', 'MACH', 'Mercado Pago / Mercado Libre'],

  /* Ofertas que las apps mostraron al usuario. Son simulaciones: no hay contratación ni desembolso. */
  OFERTAS_OBSERVADAS: [
    { id: 'tenpo-avance', inst: 'Tenpo', prod: 'Avance en cuotas', estado: 'Simulación observada', fecha: '2026-11-08',
      capital: 200000, unidad: 'meses', tipo: 'cuotas', primeraCuota: '2026-12-05',
      opciones: [{ plazo: 2, pago: 105022 }, { plazo: 10, pago: 23843 }, { plazo: 17, pago: 15597 }, { plazo: 24, pago: 12233 }],
      tasaPct: null, tasaPer: null, caePct: null,
      nota: 'La app no muestra tasa ni CAE. La captura marca opciones de 2 y 24 cuotas en distintos momentos, pero no confirma que se haya ejecutado un avance.',
      fuente: 'Captura del usuario en la app de Tenpo, 08-11-2026. Ficha: registros/2026-11-08-tenpo-avance-y-facturacion.md' },
    { id: 'mercadopago-dineroplus', inst: 'Mercado Pago / Mercado Libre', prod: 'Dinero Plus', estado: 'Simulación observada', fecha: '2026-11-08',
      capital: 31000, unidad: 'dias', tipo: 'pago-unico',
      opciones: [{ plazo: 7, pago: 31342 }, { plazo: 14, pago: 31624 }, { plazo: 21, pago: 31906 }, { plazo: 28, pago: 32188 }],
      tasaPct: null, tasaPer: null, caePct: null,
      nota: 'La app muestra el costo del período, no la CAE. No aparecen impuestos, seguros ni comisiones desglosadas. La captura menciona además un cupo de $136.000 para compras; es otro producto y no debe sumarse como efectivo disponible.',
      fuente: 'Capturas del usuario en la app de Mercado Pago, 08-11-2026. Ficha: registros/2026-11-08-mercadopago-dinero-plus.md' },
    { id: 'mach-consumo', inst: 'MACH', prod: 'Crédito de consumo (Bci)', estado: 'Simulación observada', fecha: '2026-11-08',
      capital: 4037370, unidad: 'meses', tipo: 'cuotas', primeraCuota: '2026-12-10',
      opciones: [{ plazo: 60, pago: 130674 }],
      tasaPct: 2.45, tasaPer: null, caePct: 30.02,
      nota: 'La captura muestra tasa 2,45 % sin indicar si es mensual o anual, CAE 30,02 % y la leyenda «Sin costos asociados» junto a la fecha del primer pago; esa leyenda no significa crédito sin intereses.',
      fuente: 'Captura del usuario en la app de MACH, 08-11-2026. Ficha: registros/2026-11-08-mach-credito-consumo.md' }
  ],

  /* Productos con cupo observados. «Por confirmar» = la captura no lo muestra. */
  CUPOS_OBSERVADOS: [
    { id: 'tenpo-tc', inst: 'Tenpo', prod: 'Tarjeta de crédito', fecha: '2026-11-08', cupo: 900000, usado: 20615, disponible: 879385,
      fact: '2026-11-20', venc: '2026-12-05', tasaCompras: null, tasaAvances: null, cae: null, mant: null,
      nota: 'El monto utilizado coincide con el cargo de la suscripción de Claude (misma cifra): verificar con el estado de cuenta oficial. Un cupo disponible no es ingreso.',
      fuente: 'Captura del usuario, 08-11-2026. Ficha: registros/2026-11-08-tenpo-tarjeta-credito.md' }
  ],

  /* Depósitos a plazo observados (UF, con reinversión). La tasa es REAL anual sobre la UF: la ganancia total suma la variación de la UF. */
  DAP_OBSERVADOS: [
    { id: 'ccb-91',  inst: 'CCB Bolsa', plazo: 91,  real: 0.2, periodo: 0.0506 },
    { id: 'ccb-120', inst: 'CCB Bolsa', plazo: 120, real: 0.4, periodo: 0.1333 },
    { id: 'ccb-150', inst: 'CCB Bolsa', plazo: 150, real: 0.5, periodo: 0.2083 },
    { id: 'ccb-182', inst: 'CCB Bolsa', plazo: 182, real: 0.5, periodo: 0.2528 },
    { id: 'ccb-270', inst: 'CCB Bolsa', plazo: 270, real: 1.4, periodo: 1.0500 },
    { id: 'ccb-360', inst: 'CCB Bolsa', plazo: 360, real: 1.5, periodo: 1.5000 }
  ],
  DAP_NOTA: 'Captura del usuario, 08-11-2026 (CCB Bolsa, moneda UF). La pantalla advierte que estos depósitos NO son anticipables: no se pueden retirar antes del vencimiento. Las tasas cambian a diario; confírmalas antes de invertir.',

  /* Hechos que el usuario ya documentó con captura y que puede traer al control con un clic (quedan como «Declarado»). */
  HECHOS_DOCUMENTADOS: [
    { id: 'tenpo-claude-20261101', mov: { f: '2026-11-01', t: 'Gasto', d: 'Suscripción Anthropic Claude (tarjeta Tenpo)', m: 20615, e: 'D' },
      fuente: 'Captura de Tenpo, 08-11-2026: cargo aprobado, facturación aún proyectada (vence 05-12-2026). Se registra una sola vez: el pago de la tarjeta no es otro gasto.' }
  ],

  /* Firmas (fecha|tipo|descripción|monto) de los datos de ejemplo que traía la versión anterior de la página.
   * Sirven solo para reconocerlos si quedaron guardados en el navegador; la página nueva nunca los muestra. */
  SEMILLAS_V1: [
    '2026-11-01|gasto|gastos fijos del mes|400000',
    '2026-11-05|costo|cuota tarjeta (consumo)|125100',
    '2026-11-05|costo|mantencion + impuesto tarjeta|6111',
    '2026-11-15|ingreso|sueldo|1120000',
    '2026-11-15|ingreso|rendimiento ahorro 24/7|4522',
    '2026-11-20|gasto|emergencia|120000'
  ]
};
