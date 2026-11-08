import { test } from "node:test";
import assert from "node:assert/strict";
import { interpret } from "../lib/interpret.mjs";
const reply = (value) => async (url, options) => {
  assert.equal(url, "https://api.groq.com/openai/v1/chat/completions");
  const body = JSON.parse(options.body);
  assert.equal(body.response_format.json_schema.strict, true);
  assert.equal(body.model, process.env.GROQ_MODEL || "openai/gpt-oss-20b");
  assert.equal(body.messages[0].role, "system");
  assert.equal(body.tools, undefined);
  return {
    ok: true,
    json: async () => ({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(value) } },
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
test('no reintenta límites de Groq y explica el problema',async()=>{
 let calls=0;
 await assert.rejects(()=>interpret('gasté 1000 en pan','2026-11-07',[],async()=>{calls++;return {ok:false,status:429}}),/Groq alcanzó un límite/);
 assert.equal(calls,1);
});
test('rechaza JSON ilegible y respuestas truncadas de Groq',async()=>{
 await assert.rejects(()=>interpret('gasté 1000 en pan','2026-11-07',[],async()=>({ok:true,json:async()=>({choices:[{finish_reason:'stop',message:{content:'no es json'}}]})})),/ilegible/);
 await assert.rejects(()=>interpret('gasté 1000 en pan','2026-11-07',[],async()=>({ok:true,json:async()=>({choices:[{finish_reason:'length',message:{content:'{}'}}]})})),/no completó/);
});
