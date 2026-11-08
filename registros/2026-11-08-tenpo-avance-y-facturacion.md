# Evidencia financiera Tenpo — 2026-11-08

Fuente: tres capturas proporcionadas por el usuario el 08-11-2026. Moneda: CLP. Registro informativo; **no implica contratación ni pago**.

## Facturación proyectada
- Emisor/app: Tenpo.
- Ciclo: 21-10-2026 a 20-11-2026.
- Facturación proyectada y consumo aproximado: $20.615.
- Pendiente del mes anterior: $0.
- Vencimiento mostrado: 05-12-2026.
- Movimiento: «Anthropic Claude Sub San Francisco...»; fecha 01-11-2026; aprobado; cargo $20.615.
- Estado: transacción aprobada, facturación aún proyectada. No duplicar cargo y facturación como dos gastos distintos.

## Simulaciones de avance en cuotas
Capital simulado: $200.000. Primera cuota indicada: 05-12-2026.

| Cuotas | Valor cuota | Total | Diferencia sobre capital | Sobrecosto acumulado |
|---:|---:|---:|---:|---:|
| 2 | $105.022 | $210.044 | $10.044 | 5,022% |
| 10 | $23.843 | $238.430 | $38.430 | 19,215% |
| 17 | $15.597 | $265.149 | $65.149 | 32,5745% |
| 24 | $12.233 | $293.592 | $93.592 | 46,796% |

Nota: diferencia aritmética, sin separar intereses, comisiones, impuestos o seguros; no representa CAE ni tasa anual. La captura muestra opciones seleccionadas de 2 y 24 cuotas en distintos momentos, pero **no confirma ejecución del avance**. No registrar $200.000 como ingreso real ni como pasivo vigente hasta contar con comprobante.

## Reglas para el control financiero
- Registrar el cargo Claude como gasto/suscripción sujeto a conciliación con el estado de cuenta definitivo.
- Mantener los avances en tabla de simulaciones, separada de movimientos efectivos.
- Si se contrata: registrar entrada de caja y deuda financiera por separado; amortización del principal no equivale a ingreso operativo ni gasto duplicado.
- Validar contrato, CAE, costo total del crédito, comisiones y fecha exacta de cada vencimiento antes de decidir.
- Las capturas originales están en la conversación, no adjuntas a este archivo de GitHub.

## Requisito prioritario: carga de cartolas y conciliación

La cartola bancaria o estado de cuenta definitivo es una **fuente primaria de verificación** y debe respaldar el registro financiero. Las capturas y facturaciones proyectadas no sustituyen las cartolas oficiales.

### Documentos por tipo
1. **Débito / cuenta corriente / cuenta vista:** cartola de movimientos y saldos (abonos, transferencias, compras, retiros, comisiones).
2. **Tarjeta de crédito:** estado de cuenta mensual (compras, pagos, cuotas, intereses, comisiones, saldo facturado, deuda y vencimiento).
3. **Avances y créditos:** contrato o comprobante de desembolso, CAE/costo total y calendario de cuotas; conciliar luego con estados de cuenta.

### Flujo de carga propuesto para la aplicación (pendiente de implementar)
- Botón «Subir cartola»; seleccionar institución, producto (débito/crédito/crédito en cuotas), cuenta identificada solo por alias y últimos cuatro dígitos, y período.
- Aceptar PDF oficial y CSV/XLSX cuando la entidad permita exportarlos. Si es PDF escaneado, marcarlo para revisión manual.
- Mostrar vista previa de transacciones y solicitar confirmación antes de importar; registrar origen, fecha de carga, período y estado de conciliación.
- Detectar duplicados por cuenta, fecha, importe, descripción e identificador de operación; permitir corregir excepciones.
- Conciliar pagos de tarjeta desde débito como **traspasos/pagos de pasivo**, no como segundo gasto; distinguir capital, intereses y comisiones.
- Guardar los documentos privados en almacenamiento con acceso autenticado, cifrado y políticas de acceso. **No subir cartolas reales, números completos de cuenta, RUT, direcciones ni datos sensibles al repositorio público de GitHub.** Conservar en GitHub únicamente documentación técnica y ejemplos ficticios.
- Validar totales, saldos iniciales/finales y movimientos no conciliados; no declarar conciliación completa sin cuadratura.

### Cómo aportar cartolas mientras no exista el módulo
Descargar la cartola oficial desde la aplicación o banca web de la institución (normalmente en «Movimientos», «Cartolas» o «Estados de cuenta») y adjuntar el PDF o CSV directamente en una conversación privada para analizarlo y preparar una importación revisada. Evitar compartir contraseñas, PIN o códigos de seguridad. Antes de subir, ocultar identificadores personales que no sean necesarios. La carga directa en la aplicación ControlFinanciero **aún no está implementada**.
