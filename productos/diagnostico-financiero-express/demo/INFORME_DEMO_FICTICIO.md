# Informe de Diagnóstico Financiero Express — DEMO CON DATOS FICTICIOS

> **Ejemplo ilustrativo.** Todos los datos son inventados para mostrar el formato del entregable; no corresponden a ningún cliente real.

**Cliente:** Cliente Demo (ficticio)  
**Período:** octubre de 2026  
**Moneda:** pesos chilenos (CLP)  
**Fecha de emisión:** 2026-11-02  
**Fuente de datos:** movimientos facilitados por el cliente (no auditados); detalle en `movimientos_demo.csv`

## Resumen
| Indicador | Monto (CLP) | Notas |
|---|---:|---|
| Ingresos | 1.770.000 | Tres fuentes: dos proyectos y una mantención mensual |
| Inversión | 150.000 | Un curso de especialización |
| Costos | 385.000 | Equivalen a 21,8% de los ingresos |
| Gastos | 540.000 | Incluye 65.000 sin clasificar |
| Saldo disponible | 695.000 | Ingresos − inversión − costos − gastos; no es dinero en banco |

Los totales concilian con las 14 filas de `movimientos_demo.csv`.

## Hallazgos
1. **Un proyecto concentra gran parte del ingreso.** El proyecto más grande aporta 850.000 de 1.770.000, es decir 48,0% de los ingresos del mes; sólo 300.000 (16,9%) es recurrente.
2. **Los costos fijos mensuales pesan.** Arriendo, contador, internet, suscripciones y hosting suman 393.000, equivalentes a 22,2% de los ingresos del período.
3. **Hay gasto sin clasificar.** 65.000 (12,0% de los gastos) no tiene categoría, lo que impide saber si es evitable.

## Acciones recomendadas
| Acción | Impacto esperado | Esfuerzo | Prioridad |
|---|---|---|---|
| Clasificar los 65.000 sin categoría durante el próximo mes | Permite decidir qué parte es evitable. No se estima ahorro hasta clasificar. | Bajo | 1 |
| Ofrecer a clientes de proyecto un servicio de mantención mensual | Con un segundo cliente de mantención al valor actual, el ingreso recurrente subiría de 300.000 a 600.000 (supuesto: el cliente acepta; no está garantizado). | Medio | 2 |
| Revisar las suscripciones de software (60.000) y desactivar las que no se usen | Cada suscripción desactivada reduce el costo mensual por su valor (supuesto: no afecta la operación). | Bajo | 3 |

## Alcance y limitaciones
Este informe organiza información suministrada por el cliente y no verifica su exactitud. No constituye auditoría, asesoría tributaria ni recomendación de inversión. No se garantizan ahorros ni ingresos.
