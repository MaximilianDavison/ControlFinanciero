import { validDate } from "./validation.mjs";
// Entrada guiada sin proveedor de IA: rechaza frases que no reconoce.
export function parseMovements(text, today) {
  if (typeof text !== "string" || text.length > 2000 || !validDate(today))
    throw Error("Escribe hasta 2000 caracteres y una fecha válida.");
  const parts = text
    .trim()
    .split(
      /\s*;\s*|\s+(?:y|e)\s+(?=(?:hoy |ayer )?(?:gast[eé]|invert[ií]|recib[ií]|pagu[eé]))/i,
    );
  if (parts.length > 10)
    throw Error("Ingresa hasta diez movimientos a la vez.");
  return parts.map((part) => {
    const match = part.match(
      /^(?:(hoy|ayer)\s+)?(gast[eé]|invert[ií]|recib[ií]|pagu[eé])\s+(\d+(?:\.\d{3})*(?:,\d{1,2})?)\s*(mil|mill[oó]n|millones)?\s*(?:pesos|clp)?\s+(?:en|de|por)\s+(.+?)(?:\s+el\s+(\d{4}-\d{2}-\d{2}))?\.?$/i,
    );
    if (!match)
      throw Error(
        "Usa, por ejemplo: “hoy gasté 25 mil en supermercado” o “recibí 800000 de sueldo el 2026-11-07”. Separa movimientos con punto y coma.",
      );
    let [, relative, verb, amount, scale, description, date] = match;
    if (
      /\b(no|quiz[aá]s|tal vez|si |usd|d[oó]lares|eur|euros)\b/i.test(
        description,
      )
    )
      throw Error(
        "Aclara el movimiento: esta entrada guiada registra montos en CLP.",
      );
    let m = Number(amount.replaceAll(".", "").replace(",", "."));
    if (scale) m *= scale.toLowerCase() === "mil" ? 1000 : 1000000;
    if (!(m > 0 && m < 1e12))
      throw Error("El monto debe ser positivo y menor a un billón de pesos.");
    let f = date || today;
    if (!date && relative?.toLowerCase() === "ayer") {
      const d = new Date(today + "T12:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      f = d.toISOString().slice(0, 10);
    }
    if (!validDate(f)) throw Error("La fecha no es válida.");
    const v = verb
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
    return {
      f,
      t: v === "inverti" ? "Inversión" : v === "recibi" ? "Ingreso" : "Gasto",
      d: description.trim(),
      m: Math.round(m * 100) / 100,
    };
  });
}
