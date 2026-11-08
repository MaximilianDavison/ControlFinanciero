# Control financiero con Neon

Aplicación personal con Next.js, Neon Postgres, Neon Auth y un asistente de registro con Groq. Incluye tres pestañas: Mi dinero, Créditos y tarjetas y Radar de futuro.

## Preparar y ejecutar

1. Instala Node.js 22 o superior y ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local` y configura las variables. `DATABASE_URL` usa la conexión pooled de tu rama Neon. Para migraciones puedes definir `DATABASE_URL_UNPOOLED`.
3. Habilita Neon Auth en esa rama y configura `NEON_AUTH_BASE_URL`. Genera `NEON_AUTH_COOKIE_SECRET` con al menos 32 caracteres aleatorios.
4. Define tu correo en `ALLOWED_EMAILS`. Sin esta variable, el acceso a datos permanece cerrado. Tener cuenta en Neon o GitHub no crea una cuenta en esta aplicación.
5. Añade `http://localhost:3000` a los dominios de Neon Auth.
6. Ejecuta `npm run migrate` y luego `npm run dev`. Abre `http://localhost:3000`, crea tu cuenta con el correo autorizado y sigue la verificación de correo que solicite Neon.

`.env.local` y `.neon` están excluidos de Git. No pongas credenciales en `config.js`, HTML ni GitHub.

## Asistente

Configura `GROQ_API_KEY` en el servidor. Crea tu clave en https://console.groq.com/keys y guárdala en `.env.local`, nunca en el HTML o el chat. El modelo configurable `GROQ_MODEL` tiene por defecto `openai/gpt-oss-20b`, servido por Groq. El servicio utiliza `https://api.groq.com/openai/v1/chat/completions` con salida JSON Schema estricta; no hace llamadas a OpenAI API. Si cambias de modelo, elige uno con soporte de Structured Outputs estricto. Solo envía el texto escrito y un contexto breve de aclaraciones; no envía tu historial completo de movimientos. Documentación: https://console.groq.com/docs/structured-outputs

Ejemplo: “Ayer gasté 25 mil en supermercado e invertí 100 mil en mi fondo”. El asistente muestra propuestas y pide aclaraciones cuando faltan datos. Solo al pulsar **Confirmar y agregar** los movimientos se añaden al tablero y se envían a Neon. El modelo no ejecuta SQL ni tiene herramientas de acceso a la base. La respuesta se valida nuevamente antes de guardar.

Sin clave hay una entrada guiada limitada: “hoy gasté 25 mil en supermercado; invertí 100 mil en fondo”. Esta primera versión registra ingresos, costos, gastos y aportes de inversión en CLP. No calcula posiciones, unidades, cotizaciones ni rentabilidad por instrumento. Para consultar o modificar datos, usa el tablero.

## Créditos y tarjetas

Simula préstamos de cuota fija con tasa mensual, anual nominal o anual efectiva; cargos mensuales, costo inicial y abonos adicionales. Compara cuota, intereses, costo total, calendario de amortización y costo anual efectivo estimado. Este último es la TIR anualizada de los flujos ingresados, no la CAE contractual: puede faltar algún cargo o regla de la oferta real.

La tarjeta compara dos pagos mensuales constantes y detecta pagos que no cubren intereses y cargos. No calcula el mínimo regulatorio ni supone nuevas compras. Los abonos extra no incluyen comisiones de prepago. La simulación se limita a 600 meses. Los resultados se basan en tus supuestos y no representan ofertas bancarias.

## Radar de futuro

Usa un mes elegido de tus movimientos como base editable de ingresos, gastos y aportes de inversión; el ahorro inicial viene de tus parámetros. Si el mes está incompleto, completa sus valores manualmente. Evalúa una compra hoy y una cuota nueva frente a una caída temporal del ingreso y un gasto inesperado. Permite llevar una cuota del simulador directamente a este escenario.

El colchón es `(gastos + cuota nueva) × meses de reserva`. El flujo descuenta también los aportes de inversión; no se supone rentabilidad ni liquidez de esos aportes. Se comparan los cierres de mes con y sin tensión, incluyendo el mes 0 después de la compra. El margen mensual adicional es el mínimo de `(saldo estresado en mes m − colchón) / (m + meses de reserva)` en todo el horizonte, limitado a cero si ya se rompe el colchón. La compra máxima hoy es el mínimo saldo antes de la compra menos el colchón, limitado a cero.

Son escenarios matemáticos con datos y supuestos visibles, no una aprobación de crédito ni predicciones. Se mantienen durante la sesión, sin registrarse como movimientos ni cambiar la base de datos. Las tablas permiten comprobar cada mes. El diseño se apoya en la capacidad de pago de CMF y el fondo para imprevistos del CFPB; los enlaces están dentro de la aplicación.

## Datos

La sección de exportar/importar JSON se retiró de la interfaz y también sus manejadores. La base nueva comienza vacía; los datos de una versión anterior del navegador no se transfieren automáticamente. “Restaurar datos iniciales” mantiene su confirmación y reemplaza los movimientos por el ejemplo original.

El servidor verifica la sesión y el correo autorizado, y filtra las operaciones por usuario. Los guardados son transaccionales y usan una revisión para detectar conflictos entre pestañas o dispositivos. Ante un conflicto, no continúes editando: revisa la otra sesión antes de recargar, porque los cambios locales en conflicto no están guardados. Una fila incompleta impide el guardado hasta corregirla; revisa el estado de guardado.

## Publicar en Vercel

Importa el repositorio como **Next.js**, con `npm run build` y directorio de salida automático. Ya no se publica como página estática “Other”. GitHub Pages no puede ejecutar este servidor.

Configura las variables de `.env.example` en Vercel. Usa la rama de desarrollo para Preview y la de producción para Production, con sus correspondientes conexiones y URL de Auth. Añade el dominio HTTPS del despliegue a Neon Auth. Prueba Preview primero; aplica `migrations/001_neon.sql` a producción antes de publicar. Verifica inicio/cierre de sesión y guardado con tu cuenta. Requisitos de correo para producción: https://neon.com/docs/auth/production-checklist

## Verificación y archivos

- `npm test`: validación de movimientos, respuestas de Groq simuladas, amortización, tasas, costos y escenarios de estrés.
- `npm run build`: regenera el tablero y compila con webpack.
- `node scripts/smoke.mjs`: con el servidor local iniciado, verifica accesos sin sesión, vista previa → confirmación → recarga, eliminación del respaldo JSON, las dos pestañas nuevas, simulaciones, enlace con Radar y adaptación a móvil, con datos de usuario simulados. Requiere Chrome en la ruta indicada en el script.
- `npm run migrate`: aplica la migración SQL versionada sin borrar datos.

`index.html` es la fuente histórica del tablero. `scripts/prepare-dashboard.mjs` genera `public/tablero.html` con la API de Neon; la aplicación se abre desde `/` de Next.js. `config.js` pertenece a la versión anterior y ya no se carga. El esquema Supabase está archivado en `legacy/schema.supabase.sql`; `schema.sql` contiene el nuevo esquema Neon. Las páginas comerciales se sirven bajo `public/comercial/`. Los productos y propuestas originales permanecen en el repositorio.
