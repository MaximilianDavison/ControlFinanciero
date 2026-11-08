import { loan, card, radar, monthSummary } from "./finance.mjs";
const $ = (id) => document.getElementById(id);
const money = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});
const compact = new Intl.NumberFormat("es-CL", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const percent = new Intl.NumberFormat("es-CL", {
  style: "percent",
  maximumFractionDigits: 2,
});
const fmt = (n) => money.format(n);
function value(id) {
  const input = $(id);
  if (input.value.trim() === "" || !Number.isFinite(input.valueAsNumber))
    throw Error("Completa todos los campos con números válidos.");
  return input.valueAsNumber;
}
const metric = (label, text, accent = false) =>
  `<div class="tool-metric${accent ? " accent" : ""}"><small>${label}</small><strong>${text}</strong></div>`;
function chart(series, { floor = null, title = "Evolución del saldo" } = {}) {
  const width = 640,
    height = 230,
    left = 66,
    right = 12,
    top = 18,
    bottom = 35;
  const points = series.flatMap((s) => s.values),
    min = Math.min(0, ...points, floor ?? 0),
    max = Math.max(1, ...points, floor ?? 0),
    span = max - min;
  const count = Math.max(1, ...series.map((s) => s.values.length - 1));
  const x = (i) => left + (i / count) * (width - left - right),
    y = (n) => top + ((max - n) / span) * (height - top - bottom);
  const grid = [0, 0.5, 1]
    .map((t) => {
      const v = min + span * t;
      return `<line x1="${left}" x2="${width - right}" y1="${y(v)}" y2="${y(v)}" stroke="currentColor" opacity=".13"/><text x="${left - 8}" y="${y(v) + 4}" text-anchor="end" font-size="10" fill="currentColor">${compact.format(v)}</text>`;
    })
    .join("");
  const paths = series
    .map(
      (s) =>
        `<polyline points="${s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")}" fill="none" stroke="${s.color}" stroke-width="2.6" stroke-linejoin="round"/>`,
    )
    .join("");
  const reserve =
    floor === null
      ? ""
      : `<line x1="${left}" x2="${width - right}" y1="${y(floor)}" y2="${y(floor)}" stroke="#b68024" stroke-width="1.5" stroke-dasharray="5 5"/>`;
  return `<svg class="tool-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title>${grid}${reserve}${paths}<text x="${left}" y="${height - 10}" font-size="10" fill="currentColor">Hoy</text><text x="${width - right}" y="${height - 10}" text-anchor="end" font-size="10" fill="currentColor">Mes ${count}</text><text x="${left}" y="11" font-size="9" fill="currentColor">CLP</text></svg><div class="tool-legend">${series.map((s) => `<span style="--line:${s.color}">${s.label}</span>`).join("")}${floor === null ? "" : '<span style="--line:#b68024">Colchón elegido</span>'}</div>`;
}
function schedule(rows) {
  return `<details><summary>Ver calendario de pagos (${rows.length} meses)</summary><div class="tool-schedule"><table><thead><tr><th>Mes</th><th>Pago</th><th>Interés</th><th>Cargos</th><th>Capital</th><th>Saldo</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${r.month}</td><td>${fmt(r.payment)}</td><td>${fmt(r.interest)}</td><td>${fmt(r.fee)}</td><td>${fmt(r.capital)}</td><td>${fmt(r.balance)}</td></tr>`).join("")}</tbody></table></div></details>`;
}
const balances = (principal, r, length) =>
  Array.from({ length: length + 1 }, (_, i) =>
    i === 0
      ? principal
      : (r.rows[i - 1]?.balance ?? (r.paidOff ? 0 : r.remaining)),
  );
let lastLoan = null,
  lastCard = null;
function drawLoan() {
  try {
    const args = {
      principal: value("loan-principal"),
      months: value("loan-months"),
      rate: value("loan-rate"),
      basis: $("loan-basis").value,
      monthlyFees: value("loan-fees"),
      upfront: value("loan-upfront"),
    };
    const normal = loan(args),
      faster = loan({ ...args, extra: value("loan-extra") });
    lastLoan = normal;
    $("loan-error").textContent = "";
    $("loan-to-radar").disabled = false;
    $("loan-results").innerHTML =
      `<div class="tool-metrics">${metric("Cuota normal, incluidos cargos", fmt(normal.firstPayment), true)}${metric("Total pagado, incluido cargo inicial", fmt(normal.totalPaid))}${metric("Intereses del crédito", fmt(normal.interest))}${metric("Costo anual efectivo estimado", normal.annualCost === null ? "—" : percent.format(normal.annualCost))}</div><p class="tool-note">Dinero neto al inicio: ${fmt(args.principal - args.upfront)}. Cargos totales: ${fmt(normal.fees)}. La última cuota puede variar por redondeo.</p><div class="tool-insight">Con el abono extra: <strong>${faster.months} meses</strong> en lugar de ${normal.months}; pagarías ${fmt(faster.totalPaid)} en total. Diferencia de costo: <strong>${fmt(normal.totalPaid - faster.totalPaid)}</strong>, sin comisión de prepago.</div>${chart(
        [
          {
            values: balances(args.principal, normal, normal.months),
            color: "#8792a2",
            label: "Cuota normal",
          },
          {
            values: balances(args.principal, faster, normal.months),
            color: "#3b7ddd",
            label: "Con abono extra",
          },
        ],
        { title: "Saldo del préstamo con cuota normal y con abono extra" },
      )}${schedule(normal.rows)}`;
  } catch (e) {
    lastLoan = null;
    $("loan-error").textContent = e.message;
    $("loan-results").replaceChildren();
    $("loan-to-radar").disabled = true;
  }
}
function drawCard() {
  try {
    const args = {
      principal: value("card-principal"),
      rate: value("card-rate"),
      payment: value("card-payment"),
      monthlyFees: value("card-fees"),
    };
    const normal = card(args),
      faster = card({ ...args, extra: value("card-extra") });
    lastCard = faster;
    $("card-error").textContent = "";
    $("card-to-radar").disabled = !faster.paidOff;
    const metrics =
      metric(
        "Con tu pago actual",
        normal.paidOff ? `${normal.months} meses` : "No se termina",
        !normal.paidOff,
      ) +
      metric(
        "Con el pago mayor",
        faster.paidOff ? `${faster.months} meses` : "No se termina",
        faster.paidOff,
      ) +
      metric(
        "Total con tu pago actual",
        normal.paidOff ? fmt(normal.totalPaid) : "—",
      ) +
      metric(
        "Total con el pago mayor",
        faster.paidOff ? fmt(faster.totalPaid) : "—",
      );
    const insight =
      normal.paidOff && faster.paidOff
        ? `El pago mayor reduce ${normal.months - faster.months} meses y ${fmt(normal.totalPaid - faster.totalPaid)} de intereses y cargos.`
        : normal.reason || faster.reason;
    const length = Math.max(normal.rows.length, faster.rows.length),
      visual =
        normal.paidOff && faster.paidOff
          ? chart(
              [
                {
                  values: balances(args.principal, normal, length),
                  color: "#8792a2",
                  label: "Pago actual",
                },
                {
                  values: balances(args.principal, faster, length),
                  color: "#3b7ddd",
                  label: "Pago mayor",
                },
              ],
              { title: "Saldo de tarjeta con dos pagos mensuales" },
            )
          : "";
    $("card-results").innerHTML =
      `<div class="tool-metrics">${metrics}</div><div class="tool-insight${normal.paidOff && faster.paidOff ? "" : " warning"}">${insight}</div><p class="tool-note">Pago mayor inicial: ${fmt(faster.firstPayment)}. Se supone la misma tasa y el mismo pago cada mes, salvo el último.</p>${visual}${faster.paidOff ? schedule(faster.rows) : ""}`;
  } catch (e) {
    lastCard = null;
    $("card-error").textContent = e.message;
    $("card-results").replaceChildren();
    $("card-to-radar").disabled = true;
  }
}
function drawRadar() {
  try {
    const args = {
      savings: value("radar-savings"),
      income: value("radar-income"),
      expenses: value("radar-expenses"),
      investments: value("radar-investments"),
      newPayment: value("radar-payment"),
      purchase: value("radar-purchase"),
      reserveMonths: value("radar-reserve"),
      horizon: value("radar-horizon"),
      incomeDrop: value("radar-drop"),
      shock: value("radar-shock"),
      shockMonth: value("radar-shock-month"),
      shockDuration: value("radar-duration"),
    };
    const r = radar(args),
      breach = r.firstBreach !== null;
    $("radar-error").textContent = "";
    const title = breach
      ? r.firstBreach === 0
        ? "La decisión toca tu colchón desde hoy"
        : `Tocarías tu colchón en el mes ${r.firstBreach}`
      : "Tu plan conserva el colchón en este escenario";
    const explanation = breach
      ? `El saldo mínimo sería ${fmt(r.minBalance)}, frente a una reserva elegida de ${fmt(r.floor)}.`
      : `Incluso con la caída de ingreso y el imprevisto, el saldo mínimo sería ${fmt(r.minBalance)}. Cambia los supuestos para probar otro escenario.`;
    const repair = breach
      ? `Manteniendo estos supuestos, harían falta ${fmt(Math.max(0, r.floor - r.minBalance))} más de ahorro inicial para cubrir la mayor brecha.${r.initialGap > 0 ? ` Ya existe una brecha de ${fmt(r.initialGap)} en el mes 0.` : ` Otra forma matemática de cerrar la brecha sería mejorar el flujo mensual en ${fmt(r.monthlyRepair)} desde el mes 1.`}`
      : `Tu plan deja ${fmt(r.monthlyRoom)} por mes de margen adicional dentro del horizonte y la reserva elegidos. No supone aprobación de un crédito.`;
    $("radar-results").innerHTML =
      `<article class="card radar-verdict"><span class="status-orb${breach ? " warning" : ""}" aria-hidden="true"></span><div><h3>${title}</h3><p>${explanation}</p></div></article><div class="radar-results-grid">${metric("Saldo mínimo bajo tensión", fmt(r.minBalance), true)}${metric("Margen mensual adicional", fmt(r.monthlyRoom))}${metric("Compra máxima hoy bajo estos supuestos", fmt(r.purchaseRoom))}${metric("Colchón que elegiste", fmt(r.floor))}</div><article class="card radar-chart-card"><h3>Dos futuros, una misma decisión</h3>${chart(
        [
          {
            values: r.rows.map((x) => x.baseline),
            color: "#8792a2",
            label: "Sin imprevisto ni caída",
          },
          {
            values: r.rows.map((x) => x.stressed),
            color: "#3b7ddd",
            label: "Bajo tensión",
          },
        ],
        {
          floor: r.floor,
          title:
            "Proyección de ahorro líquido con y sin imprevisto, comparada con el colchón",
        },
      )}<div class="radar-actions"><div><h4>La palanca que cambia tu plan</h4><p>${repair}</p></div><div><h4>Lo que entra y sale</h4><p>Flujo mensual habitual después de inversión y cuota nueva: ${fmt(r.flow)}. Saldo al final bajo tensión: ${fmt(r.ending)}. Ningún valor de esta pestaña se guarda como movimiento.</p></div></div><details style="margin-top:18px"><summary>Ver los cierres de cada mes</summary><div class="tool-schedule"><table><thead><tr><th>Mes</th><th>Ingreso escenario</th><th>Imprevisto</th><th>Sin tensión</th><th>Bajo tensión</th></tr></thead><tbody>${r.rows.map((x) => `<tr><td>${x.month === 0 ? "Hoy" : x.month}</td><td>${x.month ? fmt(x.income) : "—"}</td><td>${fmt(x.shock)}</td><td>${fmt(x.baseline)}</td><td>${fmt(x.stressed)}</td></tr>`).join("")}</tbody></table></div></details></article>`;
  } catch (e) {
    $("radar-error").textContent = e.message;
    $("radar-results").replaceChildren();
  }
}
function showTab(key, focus = false) {
  for (const button of document.querySelectorAll(".finance-tabs [role=tab]")) {
    const active = button.dataset.tab === key;
    button.setAttribute("aria-selected", String(active));
    button.tabIndex = active ? 0 : -1;
    $("panel-" + button.dataset.tab).hidden = !active;
    if (active && focus) button.focus();
  }
  if (key === "overview" && typeof window.charts === "function")
    requestAnimationFrame(window.charts);
  history.replaceState(null, "", "#" + key);
}
const tabs = [...document.querySelectorAll(".finance-tabs [role=tab]")];
tabs.forEach((button, i) => {
  button.addEventListener("click", () => showTab(button.dataset.tab));
  button.addEventListener("keydown", (e) => {
    let target = null;
    if (e.key === "ArrowRight") target = (i + 1) % tabs.length;
    if (e.key === "ArrowLeft") target = (i + tabs.length - 1) % tabs.length;
    if (e.key === "Home") target = 0;
    if (e.key === "End") target = tabs.length - 1;
    if (target !== null) {
      e.preventDefault();
      showTab(tabs[target].dataset.tab, true);
    }
  });
});
for (const [id, draw] of [
  ["loan-form", drawLoan],
  ["card-form", drawCard],
  ["radar-form", drawRadar],
]) {
  $(id).addEventListener("submit", (e) => e.preventDefault());
  $(id).addEventListener("input", draw);
  $(id).addEventListener("change", draw);
}
let currentState = null,
  initialBase = false;
const today = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Santiago",
  year: "numeric",
  month: "2-digit",
}).format(new Date());
function acceptState(s) {
  currentState = s;
  const old = $("radar-month").value,
    months = [
      ...new Set(
        (s.rows || [])
          .map((r) => r.f?.slice(0, 7))
          .filter((m) => /^\d{4}-\d{2}$/.test(m))
          .concat(today),
      ),
    ]
      .sort()
      .reverse();
  $("radar-month").replaceChildren(
    ...months.map((month) => {
      const option = document.createElement("option");
      option.value = month;
      option.textContent = month;
      return option;
    }),
  );
  $("radar-month").value = months.includes(old)
    ? old
    : months.find((m) => m < today) ||
      months.find((m) => m === today) ||
      months[0];
  if (!initialBase) {
    initialBase = true;
    useBase();
  } else
    $("radar-source").textContent =
      "El tablero cambió. Pulsa “Usar este mes” para actualizar la base sin perder tus ajustes actuales.";
}
function useBase() {
  if (!currentState) return;
  const month = $("radar-month").value,
    base = monthSummary(currentState, month);
  for (const [key, v] of Object.entries({
    savings: base.savings,
    income: base.income,
    expenses: base.expenses,
    investments: base.investments,
    reserve: Math.min(24, Math.max(0, currentState.p?.meses ?? 3)),
  }))
    $("radar-" + key).value = v;
  $("radar-source").textContent =
    `Base ${month}: ${base.count} movimientos registrados. ${month === today ? "Es el mes actual y puede estar incompleto. " : ""}${base.count ? "Revisa si representa un mes habitual." : "Sin movimientos: completa los datos antes de sacar conclusiones."} El ahorro parte del saldo que registraste.`;
  drawRadar();
}
$("radar-use-data").addEventListener("click", useBase);
$("radar-month").addEventListener("change", () => {
  $("radar-source").textContent =
    "Mes seleccionado. Pulsa “Usar este mes” para cargar sus valores.";
});
window.addEventListener("financial-state", (event) =>
  acceptState(event.detail),
);
if (window.financialState) acceptState(window.financialState);
$("loan-to-radar").addEventListener("click", () => {
  if (lastLoan) {
    $("radar-payment").value = lastLoan.firstPayment;
    drawRadar();
    showTab("radar");
    $("radar-source").textContent =
      "Cuota normal del préstamo añadida al escenario. Cuenta solo compromisos adicionales a tus gastos actuales.";
  }
});
$("card-to-radar").addEventListener("click", () => {
  if (lastCard?.paidOff) {
    $("radar-payment").value = lastCard.firstPayment;
    drawRadar();
    showTab("radar");
    $("radar-source").textContent =
      "Pago mayor de tarjeta añadido al escenario. Evita duplicarlo si ya está incluido en tus gastos.";
  }
});
drawLoan();
drawCard();
drawRadar();
showTab(
  ["overview", "creditos", "radar"].includes(location.hash.slice(1))
    ? location.hash.slice(1)
    : "overview",
);
