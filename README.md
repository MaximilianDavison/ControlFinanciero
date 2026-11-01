# Orden financiero

Página estática (HTML + JS) con Supabase (Auth + Postgres) para el teorema **Ingresos − Inversión − Costos − Gastos = 0**.

## 1. Supabase
1. Crea un proyecto y abre **SQL Editor**; pega y ejecuta `supabase/schema.sql`.
2. **Authentication → Providers**: deja habilitado Email.
3. Crea tu usuario (Authentication → Users → Add user, con "Auto confirm") o usa "Crear cuenta" en la página.
4. Cuando tengas tu usuario, desactiva **Allow new users to sign up** (Authentication → Sign In / Providers) si es de uso personal.
5. **Project Settings → API**: copia *Project URL* y la clave *anon / publishable*.

## 2. Configuración
Edita `config.js` con esos dos valores. Es seguro commitearlos: la protección real son las políticas RLS. **Nunca** subas la clave `service_role`.

## 3. Probar en local
`npx serve .` y abre la URL que indique (no abras el archivo con doble clic: la sesión necesita http).

## 4. GitHub y Vercel
```bash
git init && git add . && git commit -m "Orden financiero"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/orden-financiero.git
git push -u origin main
```
En Vercel: **Add New → Project → importa el repo**, Framework Preset **Other**, sin Build Command ni Output Directory (se sirve la raíz). Después, en Supabase **Authentication → URL Configuration**, pon la URL de Vercel como *Site URL* y agrégala a *Redirect URLs*.

## Cómo sincroniza
Cada cambio se guarda tras 700 ms: la página compara el estado con lo último guardado y hace insert, update o delete de lo que cambió. Filas incompletas o con monto negativo no se envían hasta que las corrijas. "Restaurar datos iniciales" e "Importar" reemplazan todos tus movimientos en la nube.
