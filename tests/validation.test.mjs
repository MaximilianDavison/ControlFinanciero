import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMovements } from "../lib/parse.mjs";
import { validateState, validDate } from "../lib/validation.mjs";
test("interpreta CLP, ayer, inversiones y múltiples movimientos", () => {
  const r = parseMovements(
    "ayer gasté 25 mil en supermercado e invertí 100 mil en fondo".replace(
      " e invertí",
      " y invertí",
    ),
    "2026-11-07",
  );
  assert.deepEqual(r, [
    { f: "2026-11-06", t: "Gasto", d: "supermercado", m: 25000 },
    { f: "2026-11-07", t: "Inversión", d: "fondo", m: 100000 },
  ]);
  assert.equal(
    parseMovements("recibí 1.120.000 de sueldo el 2026-11-15", "2026-11-07")[0]
      .m,
    1120000,
  );
});
test("rechaza fechas inexistentes, importes negativos y frases ambiguas", () => {
  assert.equal(validDate("2026-02-30"), false);
  for (const x of [
    "no gasté 25000 en supermercado",
    "gasté -20 en pan",
    "compré algo",
    "gasté 20 en pan el 2026-02-30",
  ])
    assert.throws(() => parseMovements(x, "2026-11-07"));
});
test("rechaza movimientos incompletos y UUID repetido antes de guardar", () => {
  const r = {
    id: "12345678-1234-1234-1234-123456789abc",
    f: "2026-11-07",
    t: "Gasto",
    d: "Pan",
    m: 1200,
  };
  const s = {
    revision: 0,
    auto: 0,
    p: { saldo: 0, tasa: 0, meses: 3 },
    rows: [r],
  };
  assert.equal(validateState(s), s);
  assert.throws(() => validateState({ ...s, rows: [r, r] }));
  assert.throws(() => validateState({ ...s, rows: [{ ...r, m: NaN }] }));
  assert.throws(() =>
    validateState({ ...s, rows: [{ ...r, f: "2026-02-30" }] }),
  );
});
