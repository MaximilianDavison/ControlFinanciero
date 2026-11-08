# Control financiero con Neon

Aplicación personal con Next.js, Neon Postgres, Neon Auth y un asistente de registro con OpenAI. Conserva el tablero y los gráficos existentes.

## Preparar y ejecutar

1. Instala Node.js 22 o superior y ejecuta `npm ci`.
2. Copia `.env.example` a `.env.local` y configura las variables. `DATABASE_URL` usa la conexión pooled de tu rama Neon. Para migraciones puedes definir `DATABASE_URL_UNPOOLED`.
3. Habilita Neon Auth en esa rama y configura `NEON_AUTH_BASE_URL`. Genera `NEON_AUTH_COOKIE_SECRET` con al menos 32 caracteres aleatorios.
4. Define tu correo en `ALLOWED_EMAILS`. Sin esta variable, el acceso a datos permanece cerrado. Tener cuenta en Neon o GitHub no crea una cuenta en esta aplicación.
5. Añade `http://localhost:3000` a los dominios de Neon Auth.
6. Ejecuta `npm run migrate` y luego `npm run dev`. Abre `http://localhost:3000`, crea tu cuenta con el correo autorizado y sigue la verificación de correo que solicite Neon.

`.env.local` y `.neon` están excluidos de Git. No pongas credenciales en `config.js`, HTML ni GitHub.

## Asistente

Configura `OPENAI_API_KEY` en el servidor. El modelo configurable `OPENAI_MODEL` tiene por defecto `gpt-4o-mini`. El servicio utiliza Responses API con salida estructurada y `store:false`. Solo envía el texto escrito y un contexto breve de aclaraciones; no envía tu historial completo de movimientos.

Ejemplo: “Ayer gasté 25 mil en supermercado e invertí 100 mil en mi fondo”. El asistente muestra propuestas y pide aclaraciones cuando faltan datos. Solo al pulsar **Confirmar y agregar** los movimientos se añaden al tablero y se envían a Neon. El modelo no ejecuta SQL ni tiene herramientas de acceso a la base. La respuesta se valida nuevamente antes de guardar.

Sin clave hay una entrada guiada limitada: “hoy gasté 25 mil en supermercado; invertí 100 mil en fondo”. Esta primera versión registra ingresos, costos, gastos y aportes de inversión en CLP. No calcula posiciones, unidades, cotizaciones ni rentabilidad por instrumento. Para consultar o modificar datos, usa el tablero.

## Datos y respaldo

La base comienza vacía. Los datos de la versión anterior del navegador no se transfieren automáticamente: exporta su JSON y revisa el archivo antes de usar Importar. Importar y Restaurar reemplazan tus movimientos; guarda un respaldo primero.

El servidor verifica la sesión y el correo autorizado, y filtra las operaciones por usuario. Los guardados son transaccionales y usan una revisión para detectar conflictos entre pestañas o dispositivos. Ante un conflicto, exporta tus cambios locales y recarga. Una fila incompleta impide el guardado hasta corregirla; revisa el estado de guardado.

## Publicar en Vercel

Importa el repositorio como **Next.js**, con `npm run build` y directorio de salida automático. Ya no se publica como página estática “Other”. GitHub Pages no puede ejecutar este servidor.

Configura las variables de `.env.example` en Vercel. Usa la rama de desarrollo para Preview y la de producción para Production, con sus correspondientes conexiones y URL de Auth. Añade el dominio HTTPS del despliegue a Neon Auth. Prueba Preview primero; aplica `migrations/001_neon.sql` a producción antes de publicar. Verifica inicio/cierre de sesión y guardado con tu cuenta. Requisitos de correo para producción: https://neon.com/docs/auth/production-checklist

## Verificación y archivos

- `npm test`: validación de movimientos y respuestas del asistente, con OpenAI simulado.
- `npm run build`: regenera el tablero y compila con webpack.
- `node scripts/smoke.mjs`: con el servidor local iniciado, verifica accesos sin sesión y vista previa → confirmación → recarga con API simulada. Requiere Chrome en la ruta indicada en el script.
- `npm run migrate`: aplica la migración SQL versionada sin borrar datos.

`index.html` es la fuente histórica del tablero. `scripts/prepare-dashboard.mjs` genera `public/tablero.html` con la API de Neon; la aplicación se abre desde `/` de Next.js. `config.js` pertenece a la versión anterior y ya no se carga. El esquema Supabase está archivado en `legacy/schema.supabase.sql`; `schema.sql` contiene el nuevo esquema Neon. Las páginas comerciales se sirven bajo `public/comercial/`. Los productos y propuestas originales permanecen en el repositorio.
