import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loan,
  card,
  radar,
  monthlyRate,
  monthSummary,
  annualCost,
} from "../lib/finance.mjs";
const close = (a, b, tolerance = 0.02) =>
  assert.ok(Math.abs(a - b) < tolerance, `${a} != ${b}`);
test("préstamo sin interés: capital, cargos y última cuota cierran", () => {
  const r = loan({
    principal: 100000,
    rate: 0,
    months: 10,
    monthlyFees: 100,
    upfront: 1000,
  });
  assert.equal(r.firstPayment, 10100);
  assert.equal(r.totalPaid, 102000);
  assert.equal(r.cost, 2000);
  assert.equal(r.interest, 0);
  assert.equal(r.remaining, 0);
  assert.ok(r.annualCost > 0);
  close(
    r.rows.reduce((s, x) => s + x.capital, 0),
    100000,
  );
});
test("cuota fija conocida y abono acelerado reducen plazo e intereses", () => {
  const args = { principal: 1000000, rate: 2, months: 12 };
  const base = loan(args),
    faster = loan({ ...args, extra: 50000 });
  close(base.firstPayment, 94559.6);
  assert.equal(base.months, 12);
  assert.equal(base.remaining, 0);
  assert.ok(faster.months < base.months);
  assert.ok(faster.interest < base.interest);
  close(
    base.rows.reduce((s, x) => s + x.capital, 0),
    args.principal,
  );
});
test("bases de tasa anual no se confunden con tasa mensual", () => {
  close(monthlyRate(24, "annual-nominal"), 0.02, 0.000001);
  close(
    monthlyRate(12, "annual-effective"),
    Math.pow(1.12, 1 / 12) - 1,
    0.000001,
  );
  assert.equal(annualCost(100, [50, 50]), 0);
  assert.throws(() => monthlyRate(-1));
  assert.throws(() => monthlyRate(2, "foo"));
});
test("tarjeta: detecta pago insuficiente y limita horizonte", () => {
  assert.equal(
    card({ principal: 100000, rate: 2, payment: 2000 }).paidOff,
    false,
  );
  const fee = card({
    principal: 100000,
    rate: 2,
    payment: 2500,
    monthlyFees: 500,
  });
  assert.equal(fee.paidOff, false);
  const free = card({ principal: 100000, rate: 0, payment: 30000 });
  assert.equal(free.months, 4);
  assert.equal(free.rows.at(-1).payment, 10000);
  assert.equal(free.totalPaid, 100000);
  assert.equal(
    card({ principal: 1000000, rate: 0, payment: 1, maxMonths: 12 }).paidOff,
    false,
  );
});
test("mes base usa solo movimientos reales de ese mes y tipos correctos", () => {
  const r = monthSummary(
    {
      p: { saldo: 500 },
      rows: [
        { f: "2026-10-01", t: "Ingreso", m: 1000 },
        { f: "2026-10-02", t: "Costo", m: 200 },
        { f: "2026-10-03", t: "Gasto", m: 100 },
        { f: "2026-10-04", t: "Inversión", m: 50 },
        { f: "2026-11-01", t: "Ingreso", m: 9000 },
      ],
    },
    "2026-10",
  );
  assert.deepEqual(r, {
    income: 1000,
    expenses: 300,
    investments: 50,
    count: 4,
    savings: 500,
  });
});
test("Radar calcula caída temporal, golpe único y saldos verificables", () => {
  const r = radar({
    savings: 1000000,
    income: 500000,
    expenses: 300000,
    investments: 50000,
    newPayment: 0,
    purchase: 100000,
    reserveMonths: 2,
    horizon: 3,
    incomeDrop: 20,
    shock: 200000,
    shockMonth: 2,
    shockDuration: 1,
  });
  assert.equal(r.rows[0].stressed, 900000);
  assert.equal(r.rows[1].stressed, 1050000);
  assert.equal(r.rows[2].stressed, 900000);
  assert.equal(r.rows[3].stressed, 1050000);
  assert.equal(r.floor, 600000);
  assert.equal(r.firstBreach, null);
  assert.equal(r.purchaseRoom, 400000);
  assert.equal(r.monthlyRoom, 75000);
});
test("Radar no ofrece margen si se rompe el colchón, incluso hoy", () => {
  const r = radar({
    savings: 0,
    income: 100000,
    expenses: 0,
    purchase: 1000,
    reserveMonths: 0,
    horizon: 2,
    incomeDrop: 0,
    shock: 0,
    shockMonth: 1,
    shockDuration: 1,
  });
  assert.equal(r.firstBreach, 0);
  assert.equal(r.monthlyRoom, 0);
});
test('el margen calculado conserva el colchón incluso al reservar para esa cuota',()=>{
 const args={savings:1000000,income:500000,expenses:300000,investments:50000,newPayment:0,purchase:100000,reserveMonths:2,horizon:7,incomeDrop:17,shock:231001,shockMonth:2,shockDuration:2};
 const base=radar(args),withRoom=radar({...args,newPayment:base.monthlyRoom});
 assert.equal(withRoom.firstBreach,null);
});
test("simulaciones rechazan vacíos, negativos, plazos inválidos y cargos excesivos", () => {
  for (const months of [0, 1.5, 601])
    assert.throws(() => loan({ principal: 100000, rate: 2, months }));
  assert.throws(() =>
    loan({ principal: 100000, rate: 2, months: 12, upfront: 100000 }),
  );
  assert.throws(() => card({ principal: 100000, rate: 2, payment: NaN }));
  assert.throws(() =>
    radar({ savings: 0, income: 0, expenses: 0, horizon: 1, shockMonth: 2 }),
  );
});
