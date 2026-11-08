export const TYPES = ["Ingreso", "Inversión", "Costo", "Gasto"];
export function validDate(s) {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T12:00:00Z");
  return Number.isFinite(+d) && d.toISOString().slice(0, 10) === s;
}
export function validateState(s) {
  if (
    !s ||
    !Number.isInteger(s.revision) ||
    s.revision < 0 ||
    !Array.isArray(s.rows) ||
    s.rows.length > 10000
  )
    throw Error("Estado no válido.");
  if (
    ![0, 1].includes(s.auto) ||
    !s.p ||
    typeof s.p.saldo !== "number" ||
    !Number.isFinite(s.p.saldo) ||
    s.p.saldo < 0 ||
    s.p.saldo >= 1e12 ||
    !Number.isFinite(s.p.tasa) ||
    Math.abs(s.p.tasa) >= 1000 ||
    !Number.isInteger(s.p.meses) ||
    s.p.meses < 0 ||
    s.p.meses > 120
  )
    throw Error("Parámetros no válidos.");
  const ids = new Set();
  for (const r of s.rows) {
    if (
      !r ||
      typeof r.id !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        r.id,
      ) ||
      ids.has(r.id) ||
      !validDate(r.f) ||
      !TYPES.includes(r.t) ||
      typeof r.d !== "string" ||
      !r.d.trim() ||
      r.d.length > 500 ||
      typeof r.m !== "number" ||
      !Number.isFinite(r.m) ||
      r.m <= 0 ||
      r.m >= 1e12
    )
      throw Error(
        "Completa la fecha, descripción y monto positivo de todos los movimientos.",
      );
    ids.add(r.id);
  }
  return s;
}
