import { currentUser } from "../../../lib/auth.js";
import { pool } from "../../../lib/db.js";
import { validateState } from "../../../lib/validation.mjs";
export const dynamic = "force-dynamic";
const response = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  const u = await currentUser();
  if (!u)
    return response({ error: "Inicia sesión con un correo autorizado." }, 401);
  try {
    const result = await pool.query(
      `SELECT p.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('id',m.id,'f',to_char(m.fecha,'YYYY-MM-DD'),'t',m.tipo,'d',m.descripcion,'m',m.monto) ORDER BY m.fecha,m.id) FROM public.movimientos m WHERE m.user_id=p.user_id),'[]'::jsonb) AS rows FROM public.parametros p WHERE user_id=$1`,
      [u.id],
    );
    const p = result.rows[0];
    return response(
      p
        ? {
            auto: p.inversion_auto ? 1 : 0,
            p: {
              saldo: +p.saldo_ahorro,
              tasa: +p.tasa_anual,
              meses: p.meses_fondo,
            },
            revision: p.revision,
            rows: p.rows,
          }
        : {
            auto: 0,
            p: { saldo: 0, tasa: 0, meses: 3 },
            revision: 0,
            rows: [],
          },
    );
  } catch {
    return response(
      {
        error: "No se pudo cargar Neon. Revisa la conexión y las migraciones.",
      },
      503,
    );
  }
}
export async function PUT(req) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return response({ error: "Origen no permitido." }, 403);
  const u = await currentUser();
  if (!u)
    return response({ error: "Inicia sesión con un correo autorizado." }, 401);
  if (+(req.headers.get("content-length") || 0) > 2000000)
    return response({ error: "Demasiados datos." }, 413);
  let s;
  try {
    s = validateState(await req.json());
  } catch (e) {
    return response({ error: e.message }, 400);
  }
  const db = await pool.connect();
  try {
    await db.query("BEGIN");
    await db.query(
      "INSERT INTO public.parametros(user_id) VALUES($1) ON CONFLICT DO NOTHING",
      [u.id],
    );
    const locked = await db.query(
      "SELECT revision FROM public.parametros WHERE user_id=$1 FOR UPDATE",
      [u.id],
    );
    if (locked.rows[0].revision !== s.revision) {
      await db.query("ROLLBACK");
      return response(
        {
          error:
            "Hay cambios de otra pestaña o dispositivo. Exporta tus cambios y recarga antes de continuar.",
        },
        409,
      );
    }
    const rows = s.rows.map((r) => ({
      ...r,
      d: r.d.trim(),
      m: Math.round(r.m * 100) / 100,
    }));
    await db.query(
      "DELETE FROM public.movimientos WHERE user_id=$1 AND NOT(id=ANY($2::uuid[]))",
      [u.id, rows.map((r) => r.id)],
    );
    if (rows.length)
      await db.query(
        `INSERT INTO public.movimientos(id,user_id,fecha,tipo,descripcion,monto) SELECT x.id,$1,x.f,x.t,x.d,x.m FROM jsonb_to_recordset($2::jsonb) AS x(id uuid,f date,t text,d text,m numeric) ON CONFLICT(id) DO UPDATE SET fecha=excluded.fecha,tipo=excluded.tipo,descripcion=excluded.descripcion,monto=excluded.monto,updated_at=now() WHERE movimientos.user_id=$1`,
        [u.id, JSON.stringify(rows)],
      );
    // Un identificador ajeno no se puede insertar ni modificar silenciosamente.
    const owned = await db.query(
      "SELECT count(*)::int AS n FROM public.movimientos WHERE user_id=$1",
      [u.id],
    );
    if (owned.rows[0].n !== rows.length)
      throw Error("Movimiento no autorizado");
    await db.query(
      "UPDATE public.parametros SET saldo_ahorro=$2,tasa_anual=$3,meses_fondo=$4,inversion_auto=$5,revision=revision+1,updated_at=now() WHERE user_id=$1",
      [u.id, s.p.saldo, s.p.tasa, s.p.meses, !!s.auto],
    );
    await db.query("COMMIT");
    return response({ revision: s.revision + 1 });
  } catch {
    await db.query("ROLLBACK");
    return response(
      { error: "No se guardaron los cambios. Inténtalo nuevamente." },
      503,
    );
  } finally {
    db.release();
  }
}
