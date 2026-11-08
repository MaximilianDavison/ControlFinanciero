import { currentUser } from "../../../lib/auth.js";
import { parseMovements } from "../../../lib/parse.mjs";
import { interpret } from "../../../lib/interpret.mjs";
export async function POST(req) {
  if (req.headers.get("origin") !== new URL(req.url).origin)
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  if (!(await currentUser()))
    return Response.json(
      { error: "Inicia sesión con un correo autorizado." },
      { status: 401 },
    );
  try {
    const { text, history = [] } = await req.json();
    const now = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Santiago",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const data = process.env.GROQ_API_KEY
      ? { ...(await interpret(text, now, history)), mode: "ai" }
      : {
          rows: parseMovements(text, now),
          message:
            "Modo guiado: configura Groq para conversar con lenguaje más libre.",
          mode: "guided",
        };
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return Response.json(
      {
        error:
          e.name === "TimeoutError"
            ? "Groq tardó demasiado. Inténtalo nuevamente."
            : e.message,
      },
      { status: 400 },
    );
  }
}
