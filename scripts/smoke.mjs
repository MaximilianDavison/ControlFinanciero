import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
const origin = "http://localhost:3000";
const denied = await fetch(origin + "/api/state");
assert.equal(denied.status, 401);
const cross = await fetch(origin + "/api/state", {
  method: "PUT",
  headers: {
    origin: "https://other.invalid",
    "Content-Type": "application/json",
  },
  body: "{}",
});
assert.equal(cross.status, 403);
const chatDenied = await fetch(origin + "/api/interpret", {
  method: "POST",
  headers: { origin, "Content-Type": "application/json" },
  body: JSON.stringify({ text: "gasté 25 mil en supermercado" }),
});
assert.equal(chatDenied.status, 401);
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
});
try {
  const page = await browser.newPage();
  page.on("pageerror", (e) => console.log("Browser error: " + e.message));
  await page.goto(origin);
  await page.getByRole("heading", { name: "Control financiero" }).waitFor();
  await page.getByRole("button", { name: "Entrar", exact: true }).waitFor();
  console.log(
    "Inicio de sesión visible. API sin sesión: 401. Origen ajeno: 403.",
  );
  let writes = 0,
    state = {
      auto: 0,
      p: { saldo: 0, tasa: 0, meses: 3 },
      revision: 0,
      rows: [],
    };
  await page.route("**/api/state", async (route) => {
    if (route.request().method() === "PUT") {
      writes++;
      state = route.request().postDataJSON();
      state.revision++;
      await route.fulfill({ json: { revision: state.revision } });
    } else await route.fulfill({ json: state });
  });
  await page.route("**/api/interpret", (route) =>
    route.fulfill({
      json: {
        mode: "ai",
        message: "Revisa tu gasto.",
        rows: [{ f: "2026-11-07", t: "Gasto", d: "Supermercado", m: 25000 }],
      },
    }),
  );
  await page.goto(origin + "/tablero.html");
  await page.locator("#message").waitFor({ state: "visible" });
  await page.locator("#message").fill("Ayer gasté 25 mil en supermercado");
  await page.locator("#interpret").click();
  await page.waitForFunction(
    () => document.getElementById("preview").textContent !== "Interpretando…",
  );
  console.log(
    "Vista previa: " + (await page.locator("#preview").textContent()),
  );
  await page.locator("#confirmText").waitFor({ state: "visible" });
  assert.equal(writes, 0);
  await page.locator("#confirmText").click();
  await page.waitForFunction(() =>
    document.getElementById("cs").textContent.includes("Guardado en Neon"),
  );
  assert.equal(state.rows.length, 1);
  assert.equal(state.rows[0].m, 25000);
  await page.reload();
  await page.locator("#tb tr").waitFor();
  assert.equal(await page.locator("#tb tr").count(), 1);
  await page.screenshot({ path: "../dashboard-smoke.png", fullPage: true });
  console.log(
    "Tablero: vista previa no guarda; confirmación guarda; recarga conserva el movimiento (API simulada).",
  );
} finally {
  await browser.close();
}
