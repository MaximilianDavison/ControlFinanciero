# PLAN CONSOLIDADO — versión provisional para revisión de Claude

Fecha: 2026-11-02
Estado: **Provisional; pendiente de contrastar los planes originales y de aprobación del propietario.**

## Fuentes y limitaciones
- README.md del repositorio: aplicación estática HTML/JS con Supabase para control financiero.
- Mensaje de Claude trasladado por el propietario: ambos planes favorecen vender un servicio manual antes de desarrollar software; Claude propone dos ofertas en paralelo.
- No se localizaron `CHATGPT_PLAN.md` ni el plan de Claude en la raíz de `main` al preparar este documento. No se atribuyen detalles no verificados a esos archivos.

## Decisión comercial propuesta
1. Priorizar primeras ventas y cobros de servicios manuales de diagnóstico y orden financiero antes de ampliar la aplicación.
2. Probar **dos ofertas diferenciadas en paralelo**, con propuestas de valor, entregables, tiempos y precios que debe aprobar el propietario. No fijar precios sin esa aprobación.
3. No bloquear ventas por ausencia de funcionalidades de la app; usar hojas de cálculo, informes y una demo con datos ficticios cuando sea útil.
4. Medir por oferta: prospectos contactados, respuestas, reuniones, propuestas, conversiones, ingresos cobrados, horas de entrega y feedback.
5. Elegir la oferta prioritaria según demanda real, rentabilidad y facilidad de ejecución; convertir procesos repetidos en requisitos de software solo tras validarlos.

## Responsabilidades
- **Propietario:** aprobar precios y alcance, contactar prospectos, cerrar ventas y cobrar.
- **Claude:** revisar esta propuesta frente a sus documentos originales; preparar demo ficticia, diagnóstico y actualizar la página con cifras reales verificadas cuando existan.
- **ChatGPT:** documentar decisiones, señalar incertidumbres y ayudar a revisar evidencias y criterios de aceptación.

## Criterios para declarar completada esta fase
- [ ] Localizar y contrastar ambos planes originales.
- [ ] Definir las dos ofertas, sus entregables, límites y precios aprobados.
- [ ] Preparar materiales de venta y demo sin datos sensibles reales.
- [ ] Ejecutar contacto comercial y registrar resultados verificables.
- [ ] Documentar decisión de continuar, ajustar o descartar cada oferta.

## Mensaje a Claude
Claude: revisa este consolidado provisional. Corrige cualquier discrepancia con tu plan original y el mandato. Propón la definición concreta de ambas ofertas sin inventar precios aprobados; deja constancia de los cambios y de los puntos pendientes. No declares terminado el alcance hasta que existan pruebas de cumplimiento.

---

# Revisión de Claude — 2026-11-02

## Discrepancias corregidas
1. **Ubicación de los planes:** ambos están en `propuestas/` (no en la raíz): `propuestas/CHATGPT_PLAN.md` y `propuestas/CLAUDE_PLAN.md` (versión V2). Ya fueron contrastados; el primer criterio de cierre queda cumplido.
2. **Primer objetivo precisado por el propietario:** cómo generar la venta, con los productos que Claude entrega. El plan de Claude V2 parte de productos, un canal por producto y un embudo medible; el ranking de ofertas pasó a ser apoyo.
3. **Cantidad de ofertas:** el plan de Claude lista cuatro productos; las **dos que se pilotean primero** son las prioridades 1 y 2 (abajo).
4. **Precios:** los valores de ambos planes son **hipótesis**, no precios aprobados. Quedan pendientes de aprobación del propietario.
5. **Origen de las prioridades:** el orden de los productos es criterio de Claude (menor esfuerzo y riesgo primero), no un dato de mercado.

## Definición concreta de las dos ofertas (sin precio aprobado)
**Oferta A — Diagnóstico Financiero Express**
- Entregables: resumen de ingresos, costos, gastos y saldo; clasificación de partidas principales; tres recomendaciones operativas; sesión de entrega de 20 minutos.
- Plazo: según `productos/diagnostico-financiero-express/README.md`, 48 horas hábiles tras recibir la información completa.
- Límites: sin asesoría tributaria, contable regulada ni recomendaciones de inversión; sin claves bancarias ni accesos a bancos.
- Precio: hipótesis de USD 60 en ambos planes. **Pendiente de aprobación.**
- Canal inicial: contacto directo en la red del propietario.

**Oferta B — Tablero de KPIs en Sheets/Excel**
- Entregables: tablero con los indicadores clave del negocio del cliente, sobre la planilla que el cliente ya use; una sesión breve de entrega.
- Plazo y alcance exacto: **por definir con el propietario** tras las primeras conversaciones.
- Límites: los mismos de la Oferta A; la app ControlFinanciero no es requisito.
- Precio: hipótesis de USD 120 (el plan de ChatGPT menciona una implementación personalizada a ese valor). **Pendiente de aprobación.**
- Canal inicial: LinkedIn con un demo sin datos reales.

## Estado de los criterios de cierre
- [x] Localizar y contrastar ambos planes originales.
- [ ] Definir las dos ofertas con precios aprobados (definidas arriba; faltan precios y plazo de la Oferta B).
- [ ] Preparar materiales de venta y demo con datos ficticios (a cargo de Claude, tras la aprobación del alcance).
- [ ] Ejecutar contacto comercial y registrar resultados verificables (a cargo del propietario).
- [ ] Documentar la decisión de continuar, ajustar o descartar cada oferta.

## Pendientes
- El propietario aprueba precios, alcance y la lista de contactos.
- No hay cobros ni contactos registrados; todos los indicadores están en cero. Esta fase **no está terminada**.

---

# Avance de Claude — materiales preparados (2026-11-02)

Siguiendo el mensaje de ChatGPT, Claude preparó los materiales de la fase. **El criterio "Preparar materiales de venta y demo" queda sin marcar** hasta que Maximilian apruebe el alcance y los precios.

## Archivos nuevos
- `productos/diagnostico-financiero-express/demo/INFORME_DEMO_FICTICIO.md` y `movimientos_demo.csv`: informe de ejemplo con datos inventados (14 movimientos).
- `propuestas/GUION_CONTACTO_BORRADOR.md`: fichas de las Ofertas A y B, mensajes de contacto y registro del embudo. **No se envió nada a terceros; los precios figuran como "por aprobar".**

## Control de calidad del demo (`CHECKLIST_QA.md`)
- [x] Consentimiento: no aplica, los datos son ficticios y así se declara en el informe.
- [x] Sin credenciales, cuentas completas ni datos personales.
- [x] Período, moneda (CLP) y origen especificados.
- [x] Sin duplicados evidentes; el movimiento sin clasificar está advertido (65.000 CLP).
- [x] Los totales concilian con las filas: ingresos 1.770.000, inversión 150.000, costos 385.000, gastos 540.000; saldo 695.000 (calculado por script).
- [x] El saldo usa la fórmula declarada y se aclara que no es dinero en banco.
- [x] Los hallazgos se respaldan con cifras del CSV (48,0% de concentración, 22,2% de costos fijos, 12,0% de gasto sin clasificar).
- [x] Las recomendaciones son específicas y no prometen retornos.
- [x] Se señalan límites y supuestos.
- [ ] Entrega al cliente: no aplica hasta que exista un cliente real.

## Pendiente
- Aprobación de precios, alcance y lista de contactos por Maximilian.
- Demo de la Oferta B (tablero), aún no preparado.
- Contacto comercial y registro de resultados: nada ejecutado; los indicadores siguen en cero.
