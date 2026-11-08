import pg from "pg";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
const owner = "integration-" + randomUUID();
try {
  await db.connect();
  await db.query("BEGIN");
  await db.query("INSERT INTO public.parametros(user_id) VALUES($1)", [owner]);
  await db.query(
    "INSERT INTO public.movimientos(id,user_id,fecha,tipo,descripcion,monto) VALUES($1,$2,$3,$4,$5,$6)",
    [randomUUID(), owner, "2026-11-07", "Gasto", "Prueba transaccional", 25000],
  );
  assert.equal(
    (
      await db.query("SELECT monto FROM public.movimientos WHERE user_id=$1", [
        owner,
      ])
    ).rows[0].monto,
    "25000.00",
  );
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.movimientos WHERE user_id=$1",
        [owner + "-other"],
      )
    ).rows[0].n,
    0,
  );
  await assert.rejects(() =>
    db.query(
      "INSERT INTO public.movimientos(id,user_id,fecha,tipo,descripcion,monto) VALUES($1,$2,$3,$4,$5,$6)",
      [randomUUID(), owner, "2026-11-07", "Gasto", "Inválido", -1],
    ),
  );
  await db.query("ROLLBACK");
  assert.equal(
    (
      await db.query(
        "SELECT count(*)::int n FROM public.parametros WHERE user_id=$1",
        [owner],
      )
    ).rows[0].n,
    0,
  );
  console.log(
    "Neon real: escritura, filtro por propietario, restricción de monto y rollback verificados. Sin registros de prueba persistidos.",
  );
} finally {
  await db.end();
}
