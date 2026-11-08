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
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
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
  assert.equal(
    await page.getByText("Respaldo (exportar / importar JSON)").count(),
    0,
  );
  assert.equal(await page.locator("#ex,#im,#js").count(), 0);
  await page.getByRole("tab", { name: "Créditos y tarjetas" }).click();
  await page.locator("#loan-results .tool-metric").first().waitFor();
  assert.match(await page.locator("#loan-results").textContent(), /94.560/);
  await page.locator("#loan-rate").fill("0");
  assert.match(await page.locator("#loan-results").textContent(), /83.333/);
  await page.locator("#card-payment").fill("1000");
  assert.match(
    await page.locator("#card-results").textContent(),
    /no cubre intereses/,
  );
  await page.locator("#card-payment").fill("30000");
  await page.screenshot({ path: "../creditos-desktop.png", fullPage: true });
  await page.locator("#loan-to-radar").click();
  assert.equal(
    await page
      .getByRole("tab", { name: "Radar de futuro" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.ok(Number(await page.locator("#radar-payment").inputValue()) > 0);
  await page.locator("#radar-month").selectOption("2026-11");
  await page.locator("#radar-use-data").click();
  assert.equal(await page.locator("#radar-expenses").inputValue(), "25000");
  for (const [id, n] of Object.entries({
    "radar-savings": 1000000,
    "radar-income": 500000,
    "radar-expenses": 300000,
    "radar-investments": 50000,
    "radar-payment": 0,
    "radar-purchase": 100000,
    "radar-reserve": 2,
    "radar-horizon": 3,
    "radar-drop": 20,
    "radar-shock": 200000,
    "radar-shock-month": 2,
    "radar-duration": 1,
  }))
    await page.locator("#" + id).fill(String(n));
  assert.match(await page.locator("#radar-results").textContent(), /75.000/);
  assert.match(await page.locator("#radar-results").textContent(), /400.000/);
  await page.screenshot({ path: "../radar-desktop.png", fullPage: true });
  const afterSimulation = writes;
  await page.locator("#radar-purchase").fill("2000000");
  assert.match(await page.locator("#radar-results").textContent(), /desde hoy/);
  assert.equal(writes, afterSimulation);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "../radar-mobile.png", fullPage: true });
  await page.getByRole("tab", { name: "Radar de futuro" }).focus();
  await page.keyboard.press("ArrowLeft");
  assert.equal(
    await page
      .getByRole("tab", { name: "Créditos y tarjetas" })
      .getAttribute("aria-selected"),
    "true",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("tab", { name: "Mi dinero" }).click();
  assert.equal(await page.locator("#tb tr").count(), 1);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "../dashboard-smoke.png", fullPage: true });
  console.log(
    "Tablero, dos pestañas, simuladores, Radar con datos, navegación por teclado y móvil aprobados; las simulaciones no escriben movimientos (API simulada).",
  );
} finally {
  await browser.close();
}
