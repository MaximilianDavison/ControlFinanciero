// Configuración pública de Supabase (Project Settings → API).
// La clave anon/publishable es pública por diseño: la protege Row Level Security (ver supabase/schema.sql).
// NUNCA pongas aquí la clave service_role.
// Si dejas estos valores vacíos, la página funciona en modo local (localStorage).
window.CFG = {
  url: "",      // https://TU-PROYECTO.supabase.co
  anonKey: ""   // eyJ... (anon) o sb_publishable_...
};
