# Orden financiero

Página estática (HTML, CSS y JavaScript, sin dependencias ni paso de compilación) para controlar el dinero con una regla simple: **Ingresos − Inversión − Costos − Gastos = lo que queda sin destino**. La meta es que nada sobre sin destino y que nada falte.

**No trae datos de ejemplo.** Parte vacía; lo que se ve es lo que el usuario registra. Los únicos datos incluidos son las ofertas y la ficha de tarjeta que el usuario capturó de sus propias apps el 08-11-2026 (`datos.js`), con su procedencia, y se muestran como *simulación observada*, nunca como deuda.

## Las tres pestañas
1. **Control.** Registro de movimientos (a mano, pegando desde Excel o importando CSV), indicadores del período, destino de cada peso, evolución mensual, dónde se va el dinero y respaldo en CSV/JSON.
2. **Financiamiento.** Compara ofertas y créditos con una misma vara, la **tasa efectiva anual implícita** que resulta de las cuotas, y la contrasta con la tasa y la CAE que informa la oferta. Mide la carga financiera sobre el ingreso y muestra tarjetas con cupo. Las tasas nunca se escriben por el usuario: salen de la oferta o del contrato.
3. **Brecha de evidencia.** Cada cifra declara de dónde viene: **Verificado** (cartola o comprobante), **Declarado** (lo dice el usuario) o **Proyectado** (fecha futura). La pestaña muestra la caja en tres versiones (respaldada, declarada y esperada), la brecha entre ellas, el índice de respaldo y la lista de lo que falta verificar.

## Reglas de evidencia
- Una fecha futura es siempre *Proyectado*; no se puede declarar verificado algo que aún no ocurre.
- Un proyectado cuya fecha ya pasó cuenta como *Declarado* hasta que se confirme.
- Verificar exige indicar el documento que lo respalda; queda guardado junto con la fecha de verificación.
- El saldo inicial declarado no entra en la caja respaldada.

## Fórmulas (`finanzas.js`, con pruebas)
- Cuota francesa: `C·i / (1 − (1+i)^−n)`.
- **Tasa implícita:** la `i` que iguala el capital recibido con el valor presente de las `n` cuotas (TIR, por bisección). Incluye todo lo que esté dentro de la cuota.
- Tasa efectiva anual: `(1+i)^12 − 1`.
- Pago único de pocos días: `(pago/capital)^(365/días) − 1`. Es una **extrapolación para comparar, no la CAE**.
- La CAE oficial incluye intereses, gastos y seguros expresados en forma anual (SERNAC). Si la implícita difiere de la CAE informada en más de un punto, la tabla lo avisa.
- Carga financiera: `Σ cuotas / ingreso mensual promedio`, en un rango: con ingresos verificados y con verificados + declarados.

## Pruebas
```
node tests/finanzas.test.js   # 39 pruebas del motor: formatos, créditos, depósitos, comparaciones, evidencia, importación
node tests/e2e.js             # 108 comprobaciones en un navegador real (requiere Playwright)
```
Los datos que usan las pruebas son de prueba y viven solo en ellas. La prueba de extremo a extremo verifica cifras contra un cálculo manual, la migración de datos antiguos, la importación con duplicados, el respaldo y la restauración, el escape de HTML, el modo móvil y el modo oscuro.

## Datos y privacidad
Todo se guarda en `localStorage` de este navegador (clave `orden_financiero_v3`); nada se envía a ningún servidor. Para llevar los datos a otro dispositivo, usar «Respaldo completo (JSON)». **El sitio publicado es público**: cualquier dato incluido en `datos.js` lo puede leer quien tenga la dirección.
Si la versión anterior dejó datos en el navegador (`orden_financiero_v2`), la página los detecta, reconoce los datos de ejemplo que esa versión traía y deja que el usuario decida qué importar. Nada se importa solo.

## Publicar
Vercel: *Add New → Project*, Framework Preset **Other**, sin comando de compilación ni carpeta de salida (se sirve la raíz). Para probar en local: `npx serve .` (también funciona abriendo `index.html`).

## Cómo ampliar
- Instituciones sugeridas, ofertas observadas y fichas: `datos.js`.
- Un cálculo nuevo va en `finanzas.js` junto con su prueba en `tests/finanzas.test.js`.

## Historial de cambios
Ver `registros/2026-11-08-rediseno-orden-financiero.md`: qué cambió, cómo se verificó, hallazgos con datos reales y pendientes.

## Limitaciones
- No hay carga de cartolas ni conciliación automática: hoy se verifica a mano, indicando el documento.
- No sincroniza entre dispositivos (la versión con Supabase quedó en `legacy/`).
- La tasa implícita supone cuotas mensuales iguales al final de cada mes; con otras fechas de pago puede diferir levemente de la CAE contractual.
- No es asesoría financiera, tributaria ni legal.
