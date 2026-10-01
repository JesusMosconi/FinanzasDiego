import { EstadoObra, TipoCuenta } from "@prisma/client";
import Link from "next/link";

import { AppHeader } from "@/components/app-header";
import { calcularMontoPagadoGastoFijo } from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";

import { CerrarPeriodoButton } from "./cerrar-periodo-button";

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
const shortDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const timeFormat = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  hourCycle: "h23",
  timeZone: "America/Argentina/Buenos_Aires",
});

type IconName =
  | "activity"
  | "add"
  | "calendar"
  | "checklist"
  | "chevron"
  | "construction"
  | "dashboard"
  | "expense"
  | "income"
  | "transfer"
  | "trend";

const iconPaths: Record<IconName, React.ReactNode> = {
  activity: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
  add: <path d="M12 5v14M5 12h14" />,
  calendar: <path d="M6 3v3m12-3v3M4 8h16M5 5h14v15H5z" />,
  checklist: <path d="m4 7 2 2 3-4m2 3h9M4 15l2 2 3-4m2 3h9" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  construction: <path d="m14 6 4 4M5 19l7-7m3-8 5 5-3 3-5-5zM4 20l4-1-3-3z" />,
  dashboard: <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z" />,
  expense: <path d="M7 7h13l-2 8H9L7 4H4m6 15h.01M17 19h.01" />,
  income: <path d="M12 3v12m-5-5 5 5 5-5M5 20h14" />,
  transfer: <path d="M7 7h12l-3-3m3 3-3 3M17 17H5l3-3m-3 3 3 3" />,
  trend: <path d="m4 16 6-6 4 4 6-7m-5 0h5v5" />,
};

function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function accountName(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

function movementTitle(
  categoria: string,
  concepto: string,
  origen: TipoCuenta,
  destino?: TipoCuenta | null,
) {
  if (categoria !== "TRANSFERENCIA" || !destino) return concepto;
  if (destino === TipoCuenta.RESIDUALES) return "Ingreso a Residuales";
  if (origen === TipoCuenta.RESIDUALES) return "Egreso de Residuales";
  if (destino === TipoCuenta.COBRANZAS) return "Ingreso a Cobranzas";
  if (destino === TipoCuenta.CAJA_DIARIA) return "Ingreso a Diarios";
  return concepto;
}

function displayDate(date: Date, today: Date) {
  const options = { timeZone: "America/Argentina/Buenos_Aires" } as const;
  const dateKey = date.toLocaleDateString("en-CA", options);
  const todayKey = today.toLocaleDateString("en-CA", options);
  if (dateKey === todayKey) return `Hoy, ${timeFormat.format(date)}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  return dateKey === yesterday.toLocaleDateString("en-CA", options)
    ? "Ayer"
    : shortDate.format(date);
}

export default async function AppPage() {
  const today = new Date();
  const [period, accounts] = await Promise.all([
    obtenerPeriodoOperativo(today),
    prisma.cuenta.findMany({
      include: { obra: { select: { cliente: true, estado: true } } },
    }),
  ]);

  const [periodMovements, previousPeriod, pendingFixedExpenses] = period
    ? await Promise.all([
        prisma.movimiento.findMany({
          where: { periodo_id: period.id },
          include: {
            cuenta_origen: { include: { obra: { select: { cliente: true } } } },
            cuenta_destino: {
              include: { obra: { select: { cliente: true } } },
            },
            gasto_fijo: { select: { obligacion: true } },
          },
          orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
        }),
        prisma.periodo.findFirst({
          where: {
            OR: [
              { anio: { lt: period.anio } },
              { anio: period.anio, mes: { lt: period.mes } },
            ],
          },
          include: { periodo_cuentas: true },
          orderBy: [{ anio: "desc" }, { mes: "desc" }],
        }),
        prisma.gastoFijo.findMany({
          where: { periodo_id: period.id, pagado: false, archivado: false },
        }),
      ])
    : [[], null, []];

  const pendingPaidAmounts = await Promise.all(
    pendingFixedExpenses.map((expense) =>
      calcularMontoPagadoGastoFijo(expense.id),
    ),
  );
  const pendingPaymentsTotal = pendingFixedExpenses.reduce(
    (total, expense, index) =>
      total +
      Math.max(
        expense.monto_total.toNumber() - pendingPaidAmounts[index].toNumber(),
        0,
      ),
    0,
  );

  const dailyAccounts = accounts.filter(
    (account) => account.tipo === TipoCuenta.CAJA_DIARIA,
  );
  const residualAccounts = accounts.filter(
    (account) => account.tipo === TipoCuenta.RESIDUALES,
  );
  const collectionAccounts = accounts.filter(
    (account) => account.tipo === TipoCuenta.COBRANZAS,
  );
  const advanceAccounts = accounts.filter(
    (account) =>
      account.tipo === TipoCuenta.ANTICIPO &&
      account.obra?.estado === EstadoObra.ACTIVA,
  );
  const sumBalances = (items: typeof accounts) =>
    items.reduce((sum, account) => sum + account.saldo_actual.toNumber(), 0);
  const dailyBalance = sumBalances(dailyAccounts);
  const residualBalance = sumBalances(residualAccounts);
  const advanceBalance = sumBalances(advanceAccounts);
  const collectionBalance = sumBalances(collectionAccounts);
  const netWorth =
    dailyBalance + residualBalance + advanceBalance + collectionBalance;
  const previousBalance =
    previousPeriod?.periodo_cuentas.reduce(
      (sum, item) => sum + (item.saldo_final?.toNumber() ?? 0),
      0,
    ) ?? null;
  const change = previousBalance === null ? null : netWorth - previousBalance;

  const weeklyExpenses = [0, 0, 0, 0];
  let dailySpentToday = 0;
  const todayKey = today.toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
  for (const movement of periodMovements) {
    if (movement.cuenta_destino_id !== null) continue;
    const day = Number(
      movement.fecha.toLocaleDateString("en", {
        day: "numeric",
        timeZone: "America/Argentina/Buenos_Aires",
      }),
    );
    weeklyExpenses[Math.min(Math.floor((day - 1) / 7), 3)] +=
      movement.monto.toNumber();
    const movementKey = movement.fecha.toLocaleDateString("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
    });
    if (
      movement.cuenta_origen?.tipo === TipoCuenta.CAJA_DIARIA &&
      movementKey === todayKey
    )
      dailySpentToday += movement.monto.toNumber();
  }
  const weeklyTotal = weeklyExpenses.reduce((sum, value) => sum + value, 0);
  const maxWeek = Math.max(...weeklyExpenses, 1);
  const periodLabel = period
    ? formatearPeriodo(period.anio, period.mes)
    : "Sin período";
  const allocatedTypes = [
    dailyAccounts,
    residualAccounts,
    advanceAccounts,
    collectionAccounts,
  ].filter((group) => group.length > 0).length;

  const activity = [
    ...periodMovements.map((movement) => {
      const origin = movement.cuenta_origen
        ? accountName(
            movement.cuenta_origen.tipo,
            movement.cuenta_origen.obra?.cliente,
          )
        : "Ingreso externo";
      const destination = movement.cuenta_destino
        ? accountName(
            movement.cuenta_destino.tipo,
            movement.cuenta_destino.obra?.cliente,
          )
        : movement.gasto_fijo
          ? `Fijos · ${movement.gasto_fijo.obligacion}`
          : null;
      const isIncome = !movement.cuenta_origen;
      const isTransfer = Boolean(
        movement.cuenta_origen && movement.cuenta_destino,
      );
      return {
        id: movement.id,
        date: movement.fecha,
        title: movementTitle(
          movement.categoria,
          movement.concepto,
          movement.cuenta_origen?.tipo ?? TipoCuenta.COBRANZAS,
          movement.cuenta_destino?.tipo,
        ),
        trace: destination ? `${origin} → ${destination}` : origin,
        amount: movement.monto.toNumber(),
        positive: isIncome,
        icon: (isIncome
          ? "income"
          : isTransfer
            ? "transfer"
            : "expense") as IconName,
      };
    }),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);

  const boxes = [
    {
      label: "Caja 1 · Diarios",
      amount: dailyBalance,
      color: "bg-[#566176]",
      badge:
        dailySpentToday > 0
          ? `Hoy: -${money.format(dailySpentToday)}`
          : "Sin gastos hoy",
      badgeClass:
        dailySpentToday > 0
          ? "bg-[#ffdad6] text-[#93000a]"
          : "bg-[#eff4ff] text-[#45464d]",
      description: "Gastos corrientes y compras del día",
    },
    {
      label: "Caja 2 · Residuales",
      amount: residualBalance,
      color: "bg-[#00714d]",
      badge: "Fondo libre",
      badgeClass: "bg-[#e5eeff] text-[#006c49]",
      description: "Ahorro resguardado y excedentes seguros",
    },
    {
      label: "Caja 3 · Anticipos",
      amount: advanceBalance,
      color: "bg-[#188ace]",
      badge: `${advanceAccounts.length} ${advanceAccounts.length === 1 ? "obra" : "obras"}`,
      badgeClass: "bg-[#cce5ff] text-[#004b73]",
      description: "Fondos asignados a obras activas",
    },
    {
      label: "Caja 4 · Cobranzas",
      amount: collectionBalance,
      color: "bg-[#131b2e]",
      badge: "Por repartir",
      badgeClass: "bg-[#6cf8bb] text-[#005236]",
      description: "Mano de obra y aportes listos para distribuir",
    },
  ];

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={periodLabel} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section className="relative overflow-hidden rounded-2xl bg-[#131b2e] p-4 text-white shadow-sm">
          <div className="pointer-events-none absolute -bottom-8 -right-6 h-36 w-36 rounded-full bg-[#6ffbbe]/15 blur-2xl" />
          <div className="relative flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#bec6e0]">
              Patrimonio consolidado
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2 py-1 text-[11px] font-bold text-[#dae2fd]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#6ffbbe]" />
              <span className="capitalize">{periodLabel}</span>
            </span>
          </div>
          <div className="relative mt-2 flex items-baseline gap-2">
            <span className="text-[28px] leading-9 font-bold tracking-[-0.02em]">
              {money.format(netWorth)}
            </span>
            <span className="text-[11px] font-bold text-[#bec6e0]">ARS</span>
          </div>
          <div className="relative mt-3 flex items-center justify-between border-t border-white/10 pt-3 text-[11px] font-bold">
            <span
              className={
                change !== null && change >= 0
                  ? "flex items-center gap-1.5 text-[#6ffbbe]"
                  : "flex items-center gap-1.5 text-[#ffdad6]"
              }
            >
              <Icon name="trend" className="h-4 w-4" />
              {change === null
                ? "Sin cierre anterior"
                : `${change >= 0 ? "+" : ""}${money.format(change)} vs. mes anterior`}
            </span>
            <span className="text-[#bec6e0]">
              {allocatedTypes}/4 cajas asignadas
            </span>
          </div>
        </section>

        <Link
          className="relative overflow-hidden rounded-2xl bg-[#ffdad6] p-4 text-[#93000a] shadow-sm"
          href="/app/deudas"
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]">
              Pagos pendientes
            </span>
            <Icon name="expense" className="h-5 w-5" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-[28px] leading-9 font-bold tracking-[-0.02em]">
              {money.format(pendingPaymentsTotal)}
            </span>
            <span className="text-[11px] font-bold">ARS</span>
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[#93000a]/15 pt-3 text-[11px] font-bold">
            <span>
              {pendingFixedExpenses.length === 0
                ? "Sin pagos pendientes"
                : `${pendingFixedExpenses.length} ${pendingFixedExpenses.length === 1 ? "obligación" : "obligaciones"}`}
            </span>
            <span className="flex items-center gap-0.5">
              Ver deudas
              <Icon name="chevron" className="h-4 w-4" />
            </span>
          </div>
        </Link>

        <section className="space-y-1">
          <div className="flex items-center justify-between px-0.5">
            <h1 className="text-base font-semibold">Cajas y asignaciones</h1>
            <span className="text-[11px] font-bold text-[#45464d]">
              {allocatedTypes === 4
                ? "Todas activas"
                : `${allocatedTypes} tipos activos`}
            </span>
          </div>
          <div className="grid gap-2.5">
            {boxes.map((box) => (
              <article
                key={box.label}
                className="relative overflow-hidden rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(11,28,48,0.05)]"
              >
                <div
                  className={`absolute inset-y-0 left-0 w-1.5 ${box.color}`}
                />
                <div className="flex items-start justify-between gap-3 pl-1.5">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`h-2 w-2 rounded-full ${box.color}`} />
                      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#45464d]">
                        {box.label}
                      </span>
                    </div>
                    <p className="mt-0.5 text-2xl leading-8 font-bold tracking-tight">
                      {money.format(box.amount)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-1 text-[11px] font-bold ${box.badgeClass}`}
                  >
                    {box.badge}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between pl-1.5 text-xs text-[#45464d]">
                  <span>{box.description}</span>
                  <Icon
                    name="chevron"
                    className="h-[18px] w-[18px] text-[#76777d]"
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-2 rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Ritmo semanal</h2>
            <span className="text-xs font-semibold text-[#45464d]">
              Total: {money.format(weeklyTotal)}
            </span>
          </div>
          <div className="grid grid-cols-4 gap-2 pt-1">
            {weeklyExpenses.map((value, index) => {
              const height =
                value === 0 ? 5 : Math.max((value / maxWeek) * 100, 14);
              return (
                <div className="flex flex-col items-center gap-1.5" key={index}>
                  <div className="flex h-20 w-full items-end rounded-md bg-[#eff4ff] p-1">
                    <div
                      className={`w-full rounded-sm ${index === 1 ? "bg-[#00714d]" : value === 0 ? "bg-[#c6c6cd]/50" : "bg-[#566176]/70"}`}
                      style={{ height: `${height}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-bold text-[#45464d]">
                    Sem {index + 1}
                  </span>
                  <span
                    className={`text-[11px] font-bold ${value === 0 ? "text-[#76777d]" : "text-[#0b1c30]"}`}
                  >
                    {value === 0 ? "—" : `$${compactMoney.format(value)}`}
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        <section className="flex items-center justify-between gap-3 rounded-xl bg-[#e5eeff] p-4 shadow-sm">
          <div className="min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#00714d]">
              {period?.cerrado ? "Resultado del cierre" : "Cierre del período"}
            </span>
            <p className="truncate text-base font-bold">
              {period?.cerrado && period.diferencia
                ? money.format(period.diferencia.toNumber())
                : "Pendiente"}{" "}
              <span className="text-xs font-normal text-[#45464d]">
                {period?.cerrado
                  ? "diferencia registrada"
                  : "el período sigue abierto"}
              </span>
            </p>
          </div>
          {period ? (
            <CerrarPeriodoButton
              periodoId={period.id}
              periodoLabel={periodLabel}
            />
          ) : null}
        </section>

        <section className="space-y-1 pb-2">
          <div className="flex items-center justify-between px-0.5">
            <h2 className="text-base font-semibold">Última actividad</h2>
            <a
              className="flex items-center gap-0.5 text-xs font-semibold text-[#00714d]"
              href="/app/movimientos"
            >
              Ver todo
              <Icon name="chevron" className="h-4 w-4" />
            </a>
          </div>
          <div className="divide-y divide-[#eff4ff] overflow-hidden rounded-xl bg-white shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
            {activity.length === 0 ? (
              <p className="p-6 text-center text-sm text-[#45464d]">
                Todavía no hay actividad en este período.
              </p>
            ) : (
              activity.map((item) => (
                <article
                  className="flex items-center justify-between gap-2 p-4"
                  key={`${item.icon}-${item.id}`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.positive ? "bg-[#6cf8bb] text-[#005236]" : item.icon === "transfer" ? "bg-[#e5eeff] text-[#0b1c30]" : "bg-[#ffdad6] text-[#93000a]"}`}
                    >
                      <Icon name={item.icon} className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {item.title}
                      </p>
                      <span className="mt-0.5 inline-block max-w-full truncate rounded bg-[#eff4ff] px-1.5 py-0.5 text-[11px] font-bold text-[#45464d]">
                        {item.trace}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span
                      className={`text-[15px] font-bold ${item.positive ? "text-[#00714d]" : "text-[#0b1c30]"}`}
                    >
                      {item.positive ? "+" : "-"}
                      {money.format(item.amount)}
                    </span>
                    <p className="text-xs text-[#76777d]">
                      {displayDate(item.date, today)}
                    </p>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
