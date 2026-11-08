BEGIN;
CREATE TABLE IF NOT EXISTS public.parametros (
 user_id text PRIMARY KEY,
 saldo_ahorro numeric(14,2) NOT NULL DEFAULT 0 CHECK(saldo_ahorro>=0),
 tasa_anual numeric(6,3) NOT NULL DEFAULT 0,
 meses_fondo integer NOT NULL DEFAULT 3 CHECK(meses_fondo BETWEEN 0 AND 120),
 inversion_auto boolean NOT NULL DEFAULT false,
 revision integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.movimientos (
 id uuid PRIMARY KEY,
 user_id text NOT NULL REFERENCES public.parametros(user_id),
 fecha date NOT NULL,
 tipo text NOT NULL CHECK(tipo IN ('Ingreso','Inversión','Costo','Gasto')),
 descripcion text NOT NULL CHECK(length(btrim(descripcion)) BETWEEN 1 AND 500),
 monto numeric(14,2) NOT NULL CHECK(monto>0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS movimientos_user_fecha_idx ON public.movimientos(user_id,fecha);
-- Acceso exclusivamente desde el servidor, que filtra por la sesión verificada.
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.parametros,public.movimientos FROM PUBLIC;
COMMIT;
