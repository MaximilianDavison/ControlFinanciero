// Matemática de escenarios; no utiliza IA ni registra movimientos.
export const cents = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
function number(n, name, min = 0, max = 1e10) {
  if (typeof n !== "number" || !Number.isFinite(n) || n < min || n > max)
    throw Error(`${name}: ingresa un número entre ${min} y ${max}.`);
  return n;
}
function integer(n, name, min, max) {
  number(n, name, min, max);
  if (!Number.isInteger(n)) throw Error(`${name}: usa un número entero.`);
  return n;
}
export function monthlyRate(percent, basis = "monthly") {
  number(percent, "Tasa", 0, 1000);
  if (basis === "monthly") return percent / 100;
  if (basis === "annual-nominal") return percent / 1200;
  if (basis === "annual-effective")
    return Math.expm1(Math.log1p(percent / 100) / 12);
  throw Error("Selecciona una base de tasa válida.");
}
export function annualCost(netReceived, payments) {
  if (!(netReceived > 0) || !payments.length) return null;
  const present = (r) =>
    payments.reduce((s, p, i) => s + p / Math.pow(1 + r, i + 1), 0);
  if (Math.abs(present(0) - netReceived) < 0.01) return 0;
  if (present(0) < netReceived) return null;
  let lo = 0,
    hi = 1;
  while (present(hi) > netReceived && hi < 1024) hi *= 2;
  if (present(hi) > netReceived) return null;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (present(mid) > netReceived) lo = mid;
    else hi = mid;
  }
  const annual = Math.expm1(12 * Math.log1p((lo + hi) / 2));
  return Number.isFinite(annual) ? annual : null;
}
function summarize(principal, rows, upfront = 0, paidOff = true) {
  const installments = cents(rows.reduce((s, r) => s + r.payment, 0));
  return {
    rows,
    months: rows.length,
    paidOff,
    installments,
    totalPaid: cents(installments + upfront),
    interest: cents(rows.reduce((s, r) => s + r.interest, 0)),
    fees: cents(upfront + rows.reduce((s, r) => s + r.fee, 0)),
    cost: cents(installments + upfront - principal),
    annualCost: paidOff
      ? annualCost(
          principal - upfront,
          rows.map((r) => r.payment),
        )
      : null,
    firstPayment: rows[0]?.payment || 0,
    remaining: rows.at(-1)?.balance ?? principal,
  };
}
export function loan({
  principal,
  rate,
  basis = "monthly",
  months,
  monthlyFees = 0,
  upfront = 0,
  extra = 0,
}) {
  number(principal, "Monto", 1);
  integer(months, "Plazo", 1, 600);
  number(monthlyFees, "Cargos mensuales");
  number(upfront, "Cargo inicial");
  number(extra, "Abono adicional");
  if (upfront >= principal)
    throw Error("El cargo inicial debe ser menor que el monto recibido.");
  const r = monthlyRate(rate, basis),
    base = cents(
      r === 0
        ? principal / months
        : (principal * r) / -Math.expm1(-months * Math.log1p(r)),
    );
  let balance = cents(principal);
  const rows = [];
  for (let i = 1; i <= months && balance > 0; i++) {
    const interest = cents(balance * r),
      scheduled = cents(base + extra);
    const capital =
      i === months
        ? balance
        : Math.min(balance, Math.max(0, cents(scheduled - interest)));
    const payment = cents(capital + interest + monthlyFees);
    balance = cents(balance - capital);
    rows.push({
      month: i,
      payment,
      capital,
      interest,
      fee: monthlyFees,
      balance,
    });
  }
  return {
    ...summarize(principal, rows, upfront),
    principal,
    scheduledPayment: cents(base + monthlyFees + extra),
  };
}
export function card({
  principal,
  rate,
  payment,
  monthlyFees = 0,
  extra = 0,
  maxMonths = 600,
}) {
  number(principal, "Deuda", 1);
  number(payment, "Pago mensual", 0.01);
  number(monthlyFees, "Cargos mensuales");
  number(extra, "Abono adicional");
  integer(maxMonths, "Horizonte", 1, 600);
  const r = monthlyRate(rate),
    pay = cents(payment + extra);
  let balance = cents(principal);
  const rows = [];
  if (pay <= cents(balance * r) + monthlyFees)
    return {
      ...summarize(principal, [], 0, false),
      reason: "El pago no cubre intereses y cargos: la deuda no disminuye.",
    };
  for (let i = 1; i <= maxMonths && balance > 0; i++) {
    const interest = cents(balance * r),
      actual = Math.min(pay, cents(balance + interest + monthlyFees));
    const capital = cents(actual - interest - monthlyFees);
    balance = cents(balance - capital);
    rows.push({
      month: i,
      payment: actual,
      capital,
      interest,
      fee: monthlyFees,
      balance,
    });
  }
  return {
    ...summarize(principal, rows, 0, balance === 0),
    reason: balance
      ? "La deuda no termina dentro de 600 meses con este pago."
      : null,
  };
}
export function monthSummary(state, month) {
  const totals = { Ingreso: 0, Inversión: 0, Costo: 0, Gasto: 0 };
  let count = 0;
  for (const r of state?.rows || []) {
    if (
      r.f?.slice(0, 7) === month &&
      Object.hasOwn(totals, r.t) &&
      Number.isFinite(r.m) &&
      r.m >= 0
    ) {
      totals[r.t] += r.m;
      count++;
    }
  }
  return {
    income: cents(totals.Ingreso),
    expenses: cents(totals.Costo + totals.Gasto),
    investments: cents(totals["Inversión"]),
    count,
    savings: Number(state?.p?.saldo) || 0,
  };
}
export function radar({
  savings,
  income,
  expenses,
  investments = 0,
  newPayment = 0,
  purchase = 0,
  reserveMonths = 3,
  horizon = 12,
  incomeDrop = 20,
  shock = 0,
  shockMonth = 2,
  shockDuration = 3,
}) {
  for (const [k, v] of Object.entries({
    savings,
    income,
    expenses,
    investments,
    newPayment,
    purchase,
    shock,
  }))
    number(v, k);
  integer(reserveMonths, "Meses de colchón", 0, 24);
  integer(horizon, "Horizonte", 1, 60);
  number(incomeDrop, "Caída de ingreso", 0, 100);
  integer(shockMonth, "Mes del imprevisto", 1, horizon);
  integer(shockDuration, "Meses de caída", 1, 60);
  const floor = cents((expenses + newPayment) * reserveMonths),
    flow = cents(income - expenses - investments - newPayment);
  let baseline = cents(savings - purchase),
    stressed = baseline;
  const rows = [{ month: 0, baseline, stressed, income: 0, shock: 0 }];
  for (let m = 1; m <= horizon; m++) {
    const reduced = m >= shockMonth && m < shockMonth + shockDuration;
    const earned = cents(income * (reduced ? 1 - incomeDrop / 100 : 1)),
      unexpected = m === shockMonth ? shock : 0;
    baseline = cents(baseline + flow);
    stressed = cents(
      stressed + earned - expenses - investments - newPayment - unexpected,
    );
    rows.push({
      month: m,
      baseline,
      stressed,
      income: earned,
      shock: unexpected,
    });
  }
  const minBalance = Math.min(...rows.map((r) => r.stressed));
  const breach = rows.find((r) => r.stressed < floor);
  const limits = rows
    .filter((r) => r.month + reserveMonths > 0)
    .map((r) => (r.stressed - floor) / (r.month + reserveMonths));
  const monthlyRoom = breach ? 0 : Math.floor(Math.max(0, Math.min(...limits))*100)/100;
  const purchaseRoom = cents(Math.max(0, minBalance + purchase - floor));
  const initialGap = cents(Math.max(0, floor - (savings - purchase)));
  const monthlyRepair = cents(
    Math.max(
      0,
      ...rows
        .filter((r) => r.month > 0)
        .map((r) => (floor - r.stressed) / r.month),
    ),
  );
  return {
    rows,
    floor,
    flow,
    minBalance: cents(minBalance),
    firstBreach: breach ? breach.month : null,
    monthlyRoom,
    purchaseRoom,
    initialGap,
    monthlyRepair,
    ending: rows.at(-1).stressed,
  };
}
