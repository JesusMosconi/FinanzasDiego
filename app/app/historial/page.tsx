import { TipoCuenta } from "@prisma/client";

import { AppHeader } from "@/components/app-header";
import {
  esEgresoReal,
  esIngresoComputable,
  esLiquidacionObra,
} from "@/lib/movimientos-estadisticas";
import { prisma } from "@/lib/prisma";
import { formatearPeriodo } from "@/lib/periodos";

import {
  HistoricalActivityList,
  HistoricalPeriodSelect,
  type HistoricalActivity,
} from "./historial-client";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const compactMoney = new Intl.NumberFormat("es-AR", {
  notation: "compact",
  maximumFractionDigits: 0,
});

function accountLabel(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

function periodWhere(anio: number, mes: number) {
  return {
    OR: [{ anio: { lt: anio } }, { anio, mes: { lte: mes } }],
  };
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string | string[] }>;
}) {
  const query = await searchParams;
  const requestedId = typeof query.periodo === "string" ? query.periodo : null;
  const periods = await prisma.periodo.findMany({
    where: { cerrado: true },
    orderBy: [{ anio: "desc" }, { mes: "desc" }],
  });
  const selected =
    periods.find((period) => period.id === requestedId) ?? periods[0] ?? null;

  if (!selected) {
    return (
      <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
        <AppHeader periodLabel="Sin historial" />
        <main className="mx-auto w-full max-w-2xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
          <section className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="font-semibold">Todavía no hay períodos cerrados</h1>
            <p className="mt-1 text-xs text-[#45464d]">
              El historial estará disponible después del primer cierre mensual.
            </p>
          </section>
        </main>
      </div>
    );
  }

  const selectedIndex = periods.findIndex(
    (period) => period.id === selected.id,
  );
  const previous = periods[selectedIndex + 1] ?? null;
  const [
    movements,
    cumulativeMovements,
    previousCumulative,
    previousMovements,
    fixedExpenses,
  ] = await Promise.all([
    prisma.movimiento.findMany({
      where: { periodo_id: selected.id },
      include: {
        cuenta_origen: { include: { obra: { select: { cliente: true } } } },
        cuenta_destino: { include: { obra: { select: { cliente: true } } } },
        gasto_fijo: { select: { obligacion: true } },
      },
      orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
    }),
    prisma.movimiento.findMany({
      where: { periodo: periodWhere(selected.anio, selected.mes) },
      select: {
        monto: true,
        cuenta_origen_id: true,
        cuenta_destino_id: true,
        cuenta_origen: { select: { tipo: true } },
        cuenta_destino: { select: { tipo: true } },
      },
    }),
    previous
      ? prisma.movimiento.findMany({
          where: { periodo: periodWhere(previous.anio, previous.mes) },
          select: {
            monto: true,
            cuenta_origen_id: true,
            cuenta_destino_id: true,
          },
        })
      : Promise.resolve([]),
    previous
      ? prisma.movimiento.findMany({
          where: { periodo_id: previous.id },
          include: {
            cuenta_origen: { select: { tipo: true } },
            cuenta_destino: { select: { tipo: true } },
          },
        })
      : Promise.resolve([]),
    prisma.gastoFijo.findMany({
      where: { periodo_id: selected.id },
      include: { movimientos: { select: { monto: true } } },
    }),
  ]);

  const incomes = movements.filter(esIngresoComputable);
  const expenses = movements.filter(esEgresoReal);
  const transfers = movements.filter(
    (movement) =>
      movement.cuenta_origen_id &&
      movement.cuenta_destino_id &&
      !esLiquidacionObra(movement),
  );
  const incomeTotal = incomes.reduce(
    (sum, movement) => sum + movement.monto.toNumber(),
    0,
  );
  const expenseTotal = expenses.reduce(
    (sum, movement) => sum + movement.monto.toNumber(),
    0,
  );
  const result = incomeTotal - expenseTotal;
  const previousIncomeTotal = previousMovements
    .filter(esIngresoComputable)
    .reduce((sum, movement) => sum + movement.monto.toNumber(), 0);
  const previousExpenseTotal = previousMovements
    .filter(esEgresoReal)
    .reduce((sum, movement) => sum + movement.monto.toNumber(), 0);
  const previousResult = previous
    ? previousIncomeTotal - previousExpenseTotal
    : null;

  const balances: Record<TipoCuenta, number> = {
    CAJA_DIARIA: 0,
    RESIDUALES: 0,
    COBRANZAS: 0,
    ANTICIPO: 0,
  };
  for (const movement of cumulativeMovements) {
    const amount = movement.monto.toNumber();
    if (movement.cuenta_origen) balances[movement.cuenta_origen.tipo] -= amount;
    if (movement.cuenta_destino)
      balances[movement.cuenta_destino.tipo] += amount;
  }
  const patrimonio = Object.values(balances).reduce(
    (sum, balance) => sum + balance,
    0,
  );
  const previousPatrimony = previous
    ? previousCumulative.reduce((sum, movement) => {
        const amount = movement.monto.toNumber();
        if (!movement.cuenta_origen_id) return sum + amount;
        if (!movement.cuenta_destino_id) return sum - amount;
        return sum;
      }, 0)
    : null;

  const weeklyExpenses = [0, 0, 0, 0, 0];
  for (const movement of expenses) {
    const day = Number(
      movement.fecha.toLocaleDateString("en", {
        day: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    );
    weeklyExpenses[Math.min(Math.floor((day - 1) / 7), 4)] +=
      movement.monto.toNumber();
  }
  const maxWeek = Math.max(...weeklyExpenses, 1);

  const activeFixedExpenses = fixedExpenses.filter(
    (expense) => !expense.archivado,
  );
  const fixedPaid = fixedExpenses.reduce(
    (sum, expense) =>
      sum +
      expense.movimientos.reduce(
        (subtotal, movement) => subtotal + movement.monto.toNumber(),
        0,
      ),
    0,
  );
  const fixedPending = activeFixedExpenses.reduce((sum, expense) => {
    const paid = expense.movimientos.reduce(
      (subtotal, movement) => subtotal + movement.monto.toNumber(),
      0,
    );
    return sum + Math.max(expense.monto_total.toNumber() - paid, 0);
  }, 0);
  const fixedCommitted = fixedPaid + fixedPending;
  const fixedPercentage =
    fixedCommitted > 0
      ? Math.min(Math.round((fixedPaid / fixedCommitted) * 100), 100)
      : 0;
  const topExpenses = [...expenses]
    .sort((a, b) => b.monto.comparedTo(a.monto))
    .slice(0, 5);

  const activity: HistoricalActivity[] = movements.map((movement) => {
    const origin = movement.cuenta_origen
      ? accountLabel(
          movement.cuenta_origen.tipo,
          movement.cuenta_origen.obra?.cliente,
        )
      : "Ingreso externo";
    const destination = movement.cuenta_destino
      ? accountLabel(
          movement.cuenta_destino.tipo,
          movement.cuenta_destino.obra?.cliente,
        )
      : movement.gasto_fijo
        ? `Fijos · ${movement.gasto_fijo.obligacion}`
        : null;
    const kind =
      !movement.cuenta_origen_id || esLiquidacionObra(movement)
        ? "income"
        : movement.cuenta_destino_id
          ? "transfer"
          : "expense";
    return {
      id: movement.id,
      date: movement.fecha.toISOString(),
      title: movement.gasto_fijo
        ? `Pago de Fijo: ${movement.gasto_fijo.obligacion}`
        : movement.concepto,
      detail: destination ? `${origin} → ${destination}` : `Desde ${origin}`,
      searchText: `${movement.concepto} ${origin} ${destination ?? ""}`,
      amount: movement.monto.toNumber(),
      kind,
    };
  });

  const selectedLabel = formatearPeriodo(selected.anio, selected.mes);
  const patrimonyComparison =
    previousPatrimony === null ? null : patrimonio - previousPatrimony;
  const resultComparison =
    previousResult === null ? null : result - previousResult;
  const summary = [
    {
      label: "Ingresos computables",
      value: incomeTotal,
      tone: "text-[#00714d]",
    },
    { label: "Egresos", value: expenseTotal, tone: "text-[#93000a]" },
    {
      label: "Resultado neto",
      value: result,
      tone: result >= 0 ? "text-[#00714d]" : "text-[#93000a]",
    },
    {
      label: "Movimientos",
      value: movements.length,
      count: true,
      tone: "text-[#0b1c30]",
    },
  ];

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={selectedLabel} />
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section>
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#45464d]">
            Consulta de solo lectura
          </span>
          <h1 className="text-2xl leading-8 font-bold tracking-tight">
            Historial
          </h1>
          <HistoricalPeriodSelect
            periods={periods.map((period) => ({
              id: period.id,
              label: formatearPeriodo(period.anio, period.mes),
            }))}
            selectedId={selected.id}
          />
        </section>

        <section className="grid grid-cols-2 gap-2">
          {summary.map((item) => (
            <article
              className="rounded-xl bg-white p-4 shadow-sm"
              key={item.label}
            >
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#45464d]">
                {item.label}
              </span>
              <strong className={`mt-1 block text-xl ${item.tone}`}>
                {item.count ? item.value : money.format(item.value)}
              </strong>
            </article>
          ))}
        </section>

        <section className="rounded-2xl bg-[#131b2e] p-4 text-white shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#bec6e0]">
            Patrimonio al cierre
          </span>
          <strong className="mt-1 block text-[28px] leading-9">
            {money.format(patrimonio)}
          </strong>
          <p
            className={`mt-2 text-xs font-semibold ${patrimonyComparison !== null && patrimonyComparison >= 0 ? "text-[#6ffbbe]" : "text-[#ffdad6]"}`}
          >
            {patrimonyComparison === null
              ? "Sin cierre anterior para comparar"
              : `${patrimonyComparison >= 0 ? "+" : ""}${money.format(patrimonyComparison)} respecto de ${formatearPeriodo(previous!.anio, previous!.mes)}`}
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Saldos por caja</h2>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["Diarios", balances.CAJA_DIARIA],
                ["Residuales", balances.RESIDUALES],
                ["Cobranzas", balances.COBRANZAS],
                ["Anticipos", balances.ANTICIPO],
              ] as const
            ).map(([label, value]) => (
              <article
                className="rounded-xl bg-white p-4 shadow-sm"
                key={label}
              >
                <span className="text-xs text-[#45464d]">{label}</span>
                <strong className="mt-1 block text-base">
                  {money.format(value)}
                </strong>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Gastos por semana</h2>
            <span className="text-xs font-semibold">
              {money.format(expenseTotal)}
            </span>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weeklyExpenses.map((value, index) => (
              <div className="flex flex-col items-center gap-1" key={index}>
                <div className="flex h-20 w-full items-end rounded-md bg-[#eff4ff] p-1">
                  <div
                    className="w-full rounded-sm bg-[#566176]/70"
                    style={{
                      height: `${value === 0 ? 5 : Math.max((value / maxWeek) * 100, 14)}%`,
                    }}
                  />
                </div>
                <span className="text-[10px] font-bold text-[#45464d]">
                  Sem {index + 1}
                </span>
                <span
                  className={`text-[10px] font-bold ${value === 0 ? "text-[#76777d]" : "text-[#0b1c30]"}`}
                >
                  {value === 0 ? "—" : `$${compactMoney.format(value)}`}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <h2 className="text-base font-semibold">Obligaciones fijas</h2>
            <strong className="text-[#00714d]">
              {fixedPercentage}% liquidado
            </strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5eeff]">
            <div
              className="h-full rounded-full bg-[#00714d]"
              style={{ width: `${fixedPercentage}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="block text-[10px] text-[#45464d]">
                Comprometido
              </span>
              <strong className="text-xs">
                {money.format(fixedCommitted)}
              </strong>
            </div>
            <div>
              <span className="block text-[10px] text-[#45464d]">Pagado</span>
              <strong className="text-xs text-[#00714d]">
                {money.format(fixedPaid)}
              </strong>
            </div>
            <div>
              <span className="block text-[10px] text-[#45464d]">
                Pendiente
              </span>
              <strong className="text-xs text-[#93000a]">
                {money.format(fixedPending)}
              </strong>
            </div>
          </div>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-semibold">Principales egresos</h2>
          <div className="divide-y divide-[#eff4ff] overflow-hidden rounded-xl bg-white shadow-sm">
            {topExpenses.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#45464d]">
                No hubo egresos en este período.
              </p>
            ) : (
              topExpenses.map((movement) => (
                <article
                  className="flex items-center justify-between gap-3 p-4"
                  key={movement.id}
                >
                  <span className="truncate text-sm font-semibold">
                    {movement.concepto}
                  </span>
                  <strong className="shrink-0 text-sm text-[#93000a]">
                    {money.format(movement.monto.toNumber())}
                  </strong>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="rounded-xl bg-[#e5eeff] p-4 shadow-sm">
          <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#00714d]">
            Comparación mensual
          </span>
          <p className="mt-1 text-sm font-semibold">
            {previous
              ? `${selectedLabel} tuvo un resultado ${resultComparison! >= 0 ? "superior" : "inferior"} al de ${formatearPeriodo(previous.anio, previous.mes)} por ${money.format(Math.abs(resultComparison!))}.`
              : "Este es el primer período disponible para comparar."}
          </p>
          <p className="mt-1 text-xs text-[#45464d]">
            {incomes.length} ingresos · {expenses.length} egresos ·{" "}
            {transfers.length} pases internos
          </p>
        </section>

        <HistoricalActivityList items={activity} />
      </main>
    </div>
  );
}
