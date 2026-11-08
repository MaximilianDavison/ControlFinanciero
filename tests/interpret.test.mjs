import { test } from "node:test";
import assert from "node:assert/strict";
import { interpret } from "../lib/interpret.mjs";
const reply = (value) => async (url, options) => {
  assert.equal(url, "https://api.openai.com/v1/responses");
  const body = JSON.parse(options.body);
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.equal(body.tools, undefined);
  return {
    ok: true,
    json: async () => ({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: JSON.stringify(value) }],
        },
      ],
    }),
  };
};
test("IA entrega propuestas validadas sin guardar ni ejecutar herramientas", async () => {
  const proposal = {
    message: "Revisa tu gasto.",
    rows: [{ f: "2026-11-07", t: "Gasto", d: "Supermercado", m: 25000 }],
  };
  assert.deepEqual(
    await interpret(
      "gasté 25 mil en supermercado",
      "2026-11-07",
      [],
      reply(proposal),
    ),
    proposal,
  );
});
test("IA puede pedir aclaración sin crear un movimiento", async () => {
  const proposal = { message: "¿Cuánto gastaste?", rows: [] };
  assert.deepEqual(
    await interpret("compré pan", "2026-11-07", [], reply(proposal)),
    proposal,
  );
});
test("rechaza respuesta IA con fecha o importe inválidos", async () => {
  await assert.rejects(() =>
    interpret(
      "gasto",
      "2026-11-07",
      [],
      reply({
        message: "ok",
        rows: [{ f: "2026-02-30", t: "Gasto", d: "Pan", m: -1 }],
      }),
    ),
  );
});
