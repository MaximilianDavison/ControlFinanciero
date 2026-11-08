# Rediseño de Orden financiero (08-11-2026)

Rama: `claude/rediseno-orden-financiero` (commit `0b25cfb`). **No está en `main` ni publicada:** falta revisar la vista previa y decidir.
Autor: Claude · Revisión pendiente: ChatGPT (QA) · Decide: Maximilian.

## Qué se pidió
Rehacer la página sin simular datos, como desarrollador y profesional de finanzas con IA: (1) control visual de ingresos, costos y gastos; (2) una pestaña de líneas de financiamiento, deuda y tasas de interés por institución (Tenpo, MACH, Mercado Libre); (3) una propuesta propia que no se haya mostrado antes.

## Qué cambió
| Archivo | Cambio |
|---|---|
| `index.html` | Reescrito. Tres pestañas: Control, Financiamiento y Brecha de evidencia. Estados vacíos que explican qué hacer. |
| `styles.css` | Hoja nueva, modo claro y oscuro, tablas que pasan a tarjetas en móvil. |
| `finanzas.js` | Motor de cálculo sin acceso al DOM: parseo de montos y fechas, cuota francesa, tasa implícita (TIR por bisección), tasa efectiva anual, evaluación de ofertas, evidencia, caja en tres versiones, importación CSV. |
| `datos.js` | Las ofertas y la ficha de tarjeta ya documentadas en `registros/` (Tenpo, Mercado Pago, MACH), con su procedencia. Reemplaza el catálogo que estaba dentro de `index.html`. |
| `app.js` | Interfaz: formularios, gráficos SVG propios (sin Chart.js ni CDN), importación, respaldo y migración de datos antiguos. |
| `tests/finanzas.test.js`, `tests/e2e.js` | 24 pruebas del motor y 72 comprobaciones en un navegador real. |
| `README.md` | Reescrito. |
| `legacy/` | `config.js` y `schema.sql` de la versión con Supabase. La página anterior completa está en el commit `e3f4801`. |

## Decisiones de diseño
- **Sin datos de ejemplo.** La versión anterior precargaba 6 movimientos y un saldo de ahorro, con un botón «Restaurar datos iniciales». Ahora la página parte vacía. Si esos datos quedaron en `localStorage` (`orden_financiero_v2`), una advertencia los reconoce y el usuario decide si importarlos; nada se importa solo.
- **Las ofertas de las apps no son deuda.** Se muestran como «Simulación observada»; solo lo marcado «Contratado» cuenta para la carga financiera. Respeta las reglas de las fichas de `registros/`.
- **Las tasas no se escriben por el usuario.** No hay tasas por banco precargadas: cambian y dependen de cada persona. Salen de la oferta o del contrato.
- **Evidencia por movimiento:** Verificado, Declarado o Proyectado. Una fecha futura es siempre Proyectado; verificar exige indicar el documento. Aplica el requisito prioritario de las fichas: la cartola es la fuente primaria.
- **Local primero.** Los datos viven en el navegador; se respaldan con JSON. La sincronización con Supabase no se portó.

## Pestaña propuesta: Brecha de evidencia
Muestra la caja en tres versiones: **respaldada** (solo lo verificado), **declarada** (lo anterior más lo que dice el usuario) y **esperada** (suma lo proyectado). La diferencia entre ellas es la brecha; el índice de respaldo es la parte del dinero ya movido que tiene evidencia. Además lista lo que falta verificar, de mayor a menor. No se encontró otra herramienta que lo haga así, pero esa búsqueda no fue exhaustiva y no está verificada.

## Verificación
- `node tests/finanzas.test.js`: 24 pruebas, todas pasan. Incluye cuota francesa conocida (1.000.000 al 2 % en 12 cuotas = 94.559,6), tasa implícita que recupera la tasa usada para generar la cuota, y las cuatro opciones de Tenpo (≈ 3,33 % mensual, como ya documentaba `2026-11-08-tenpo-avance-y-facturacion.md`).
- `node tests/e2e.js`: 72 comprobaciones en Chromium, todas pasan. Cubren: arranque vacío, cifras del control y de la brecha contra cálculo manual, validaciones, editar y eliminar, importación con duplicados, exportación, respaldo y restauración, migración de datos antiguos, escape de HTML, móvil de 390 px sin desborde, teclado y modo oscuro.
- La prueba encontró un error real: tras registrar un movimiento «Verificado», el formulario dejaba esa opción marcada para el siguiente. Corregido: cada movimiento nuevo parte como Declarado.
- Las pruebas usan datos de prueba que solo existen en ellas.

## Hallazgos con los datos reales
| Oferta | Resultado | Cómo leerlo |
|---|---|---|
| MACH, 60 cuotas de $130.674 sobre $4.037.370 | Tasa implícita 2,50 % mensual, **34,5 % anual efectiva**. La captura informa CAE **30,02 %**. | Difieren en 4,5 puntos. Puede deberse a seguros, comisiones, impuestos, la fecha del primer pago o un error de lectura. **No se concluye nada sin el contrato.** |
| Tenpo, avance de $200.000 (2, 10, 17 y 24 cuotas) | ≈ 3,33 % mensual, ≈ 48 % anual efectiva | La app no muestra tasa ni CAE; es el costo implícito de las cuotas. |
| Mercado Pago, Dinero Plus $31.000 a 7 días | 1,1 % en el período; anualizado ≈ 77 % | **Extrapolación para comparar, no la CAE.** |

## Pendientes y riesgos
1. **No se verificó el despliegue en Vercel** (la red de la sesión no llega a ese host). Revisar la vista previa de la rama antes de pasarla a `main`.
2. **Datos públicos.** El sitio es público: lo que esté en `datos.js` (cupo y utilización de la tarjeta, ofertas) lo ve quien tenga la dirección. La versión anterior ya lo exponía en `index.html`. Además, `registros/2026-11-08-mach-credito-consumo.md` y `registros/2026-11-08-tenpo-tarjeta-credito.md` contienen datos financieros, y la segunda incluye los **últimos 4 dígitos de la tarjeta**. Opciones: sacarlos del sitio público (carpeta `public/` con `vercel.json`, sin verificar) o cargarlos desde el navegador con un respaldo JSON.
3. **Sin conciliación con cartolas.** Hoy se verifica a mano indicando el documento; el módulo de carga sigue pendiente, como indica la ficha de Tenpo.
4. **Sin sincronización entre dispositivos.**
5. **Sin precios ni tasas de mercado por institución:** no se encontró una fuente oficial usable. La página enlaza a la CMF y al SERNAC y deja un campo para la tasa máxima convencional, que publica la CMF cada mes.
6. **Auditoría de ChatGPT pendiente.** Nada de esto cuenta como auditado hasta que escriba su PASS o FAIL.

## Cómo revertir
La página anterior está intacta en `main` (commit `e3f4801`) y sus archivos de configuración en `legacy/`. No se modificó nada fuera de esta rama.

## Decisiones de Maximilian
1. ¿Se pasa la rama a `main` tras revisar la vista previa?
2. ¿Se sacan del sitio público las fichas con datos de las cuentas?
3. ¿Se prioriza la carga de cartolas o la sincronización entre dispositivos?

## Adenda: pestaña Financiamiento más simple y depósitos a plazo
Pedido de Maximilian: simplificar la pestaña y comparar «crédito de consumo vs. mi inversión».
- **Mis inversiones (depósitos a plazo):** monto, tasa (mensual o anual), pesos o UF, inicio y vencimiento, retiro sin costo o con pérdida de intereses. Todo lo ingresa el usuario; no hay depósitos de ejemplo.
- **Mis créditos:** crédito «Contratado» con cuotas pagadas → saldo estimado (valor presente de las cuotas restantes).
- **Cuatro comparaciones:** (1) costo diario de la deuda frente al rendimiento; (2) pagar hoy con el depósito frente a mantenerlo hasta el vencimiento; (3) extender el depósito N días frente a prepagar; (4) crédito nuevo frente a usar la inversión.
- **Supuestos (declarados en pantalla):** interés simple prorrateado por días; sin impuestos ni comisiones; UF = proyección con la variación anual que el usuario supone; el sobrante tras pagar se reinvierte a la tasa del depósito; no es asesoría financiera.
- **Comparador de ofertas simplificado:** 5 columnas, alertas cortas y detalle plegado.
- **Verificación:** 37 pruebas unitarias con cálculos a mano y 100 comprobaciones e2e (las cifras de pantalla se contrastan con el motor), sin desborde en escritorio, móvil ni modo oscuro.
- Sigue sin estar en `main`; falta auditoría de ChatGPT.

## Adenda 2: meta de ahorro y tasas de depósitos observadas
- Se agregó en la pestaña Financiamiento (no en una nueva) la tarjeta «Meta de ahorro: ¿mi estrategia alcanza?»: meta = N meses de ingreso, capital actual, ahorro mensual y depósito elegido; tres escenarios (UF 3 %, 4 %, 5 %; ahorro ×0,8, ×1, ×1,2).
- Tasas tomadas de la captura de CCB Bolsa (08-11-2026, UF, con reinversión): 91 d 0,2 %, 120 d 0,4 %, 150 d 0,5 %, 182 d 0,5 %, 270 d 1,4 %, 360 d 1,5 % reales anuales. La captura dice que **no son anticipables**: contradice el supuesto «retiro sin costo» de los depósitos generales, así que el botón «Usar en mi depósito» los deja como «pierde intereses».
- El botón «Cargar ejemplo hipotético» (ingreso $1.000.000, capital $1.000.000, ahorro $250.000) es solo ilustrativo y está rotulado así; no son datos del usuario.
- Pruebas: 39 unitarias, 108 e2e.

## Adenda 3: pestaña «Capital» (escenarios)
- **Investigación previa** (fuentes en la propia pestaña): colchón de 3 a 6 meses de gasto esencial (orientación, no norma chilena); avalancha vs. bola de nieve; el pago mínimo de tarjeta cubre sobre todo intereses (la CMF subió el mínimo desde junio de 2026, gradual hasta 2028; fórmula sin verificar en la fuente primaria).
- **Objetivo:** Capital = dinero líquido − deudas; meta = N meses de gasto esencial.
- **Estrategias × escenarios:** ahorrar, pagar deudas primero (avalancha), pedir préstamo para invertir; pesimista (ingreso −15 %, gasto +10 %, UF 3 %), realista (UF 4 %), optimista (ingreso +10 %, gasto −5 %, UF 5 %). Tarjeta: pagar total, cuota fija o mínimo (intereses + 1 % del saldo), y ventaja de pagar a N días.
- La tarjeta «Meta de ahorro» de Financiamiento se movió y amplió aquí. Sin datos de ejemplo salvo el botón rotulado «hipotético».
- Pruebas: 45 unitarias, 119 e2e. Rama `claude/rediseno-orden-financiero`; **no** pasada a `main` todavía.
