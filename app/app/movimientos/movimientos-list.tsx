"use client";

import { TipoCuenta } from "@prisma/client";
import { useMemo, useState } from "react";


export type ActivityItem = {
  id: string;
  date: string;
  kind: "income" | "expense" | "transfer";
  title: string;
  detail: string;
  searchText: string;
  amount: number;
  originType: TipoCuenta | null;
  destinationType: TipoCuenta | null;
  adjustment: boolean;
};

type BoxTab = "all" | "daily" | "residual" | "collections" | "advances";
type KindFilter = "all" | ActivityItem["kind"];

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const longDate = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
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

const tabTypes: Partial<Record<BoxTab, TipoCuenta>> = {
  daily: TipoCuenta.CAJA_DIARIA,
  residual: TipoCuenta.RESIDUALES,
  collections: TipoCuenta.COBRANZAS,
  advances: TipoCuenta.ANTICIPO,
};

function dateKey(value: string) {
  return new Date(value).toLocaleDateString("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function dateLabel(value: string) {
  const date = new Date(value);
  const today = new Date();
  const key = dateKey(value);
  const todayKey = dateKey(today.toISOString());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const suffix = longDate
    .format(date)
    .replace(/^\w/, (letter) => letter.toUpperCase());

  if (key === todayKey) return `Hoy, ${suffix.split(", ")[1] ?? suffix}`;
  if (key === dateKey(yesterday.toISOString()))
    return `Ayer, ${suffix.split(", ")[1] ?? suffix}`;
  return suffix;
}

export function MovimientosList({
  items,
  periodLabel,
}: {
  items: ActivityItem[];
  periodLabel: string;
}) {
  const [box, setBox] = useState<BoxTab>("all");
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const selectedType = tabTypes[box];

  const boxItems = useMemo(
    () =>
      selectedType
        ? items.filter(
            (item) =>
              item.originType === selectedType ||
              item.destinationType === selectedType,
          )
        : items,
    [items, selectedType],
  );

  const totals = useMemo(
    () => ({
      income: boxItems
        .filter((item) => item.kind === "income")
        .reduce((sum, item) => sum + item.amount, 0),
      expense: boxItems
        .filter((item) => item.kind === "expense" && !item.adjustment)
        .reduce((sum, item) => sum + item.amount, 0),
      transfer: boxItems
        .filter((item) => item.kind === "transfer")
        .reduce((sum, item) => sum + item.amount, 0),
    }),
    [boxItems],
  );

  const groups = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("es");
    const visible = boxItems.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!normalizedQuery ||
          `${item.title} ${item.searchText}`
            .toLocaleLowerCase("es")
            .includes(normalizedQuery)),
    );
    const grouped = new Map<string, ActivityItem[]>();
    for (const item of visible) {
      const key = dateKey(item.date);
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return [...grouped.values()];
  }, [boxItems, kind, query]);

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section className="space-y-2 pt-1">
          <div className="flex items-end justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#45464d]">
                Historial operativo
              </span>
              <h1 className="text-2xl leading-8 font-bold tracking-tight">
                Actividad
              </h1>
            </div>
            <span className="rounded-full bg-[#dce9ff] px-3 py-1.5 text-xs font-semibold capitalize">
              {periodLabel}
            </span>
          </div>
          <label className="relative flex items-center">
            <svg
              className="pointer-events-none absolute left-3 h-5 w-5 text-[#45464d]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m16 16 4 4" />
            </svg>
            <input
              className="h-11 w-full rounded-xl bg-[#eff4ff] pr-10 pl-10 text-sm outline-none transition focus:bg-[#e5eeff]"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por concepto, obra o cuenta..."
              type="search"
              value={query}
            />
          </label>
        </section>

        <section className="grid grid-cols-3 gap-1 rounded-xl bg-[#eff4ff] p-1">
          <FlowCard
            color="text-[#00714d]"
            label="Ingresos"
            amount={totals.income}
            caption="Dinero nuevo"
            prefix="+"
          />
          <FlowCard
            color="text-[#ba1a1a]"
            label="Egresos"
            amount={totals.expense}
            caption="Gastos reales"
            prefix="-"
          />
          <FlowCard
            color="text-[#188ace]"
            label="Pases"
            amount={totals.transfer}
            caption="Entre cajas"
          />
        </section>

        <section className="space-y-2">
          <div className="flex gap-1 overflow-x-auto rounded-full bg-[#e5eeff] p-1 text-xs font-semibold text-[#45464d]">
            {(
              [
                ["all", "Todos"],
                ["daily", "Diarios"],
                ["residual", "Residuales"],
                ["collections", "Cobranzas"],
                ["advances", "Anticipos"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`min-h-9 shrink-0 rounded-full px-3 transition ${box === value ? "bg-white text-[#0b1c30] shadow-sm" : "hover:text-[#0b1c30]"}`}
                onClick={() => setBox(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {(
              [
                ["all", "Todo"],
                ["income", "Ingresos"],
                ["expense", "Egresos"],
                ["transfer", "Pases"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                className={`min-h-9 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition ${kind === value ? "bg-[#131b2e] text-white shadow-sm" : "bg-[#e5eeff] text-[#0b1c30]"}`}
                onClick={() => setKind(value)}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          {groups.length === 0 ? (
            <div className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="font-semibold">
                {items.length === 0
                  ? "Todavía no hay movimientos en este período"
                  : "No hay registros para mostrar"}
              </p>
              <p className="mt-1 text-xs text-[#45464d]">
                {items.length === 0
                  ? "Usá el botón + para registrar el primero."
                  : "Probá cambiando los filtros o la búsqueda."}
              </p>
            </div>
          ) : (
            groups.map((group) => {
              const net = group.reduce((sum, item) => {
                if (item.kind === "income") return sum + item.amount;
                if (item.kind === "expense") return sum - item.amount;
                return sum;
              }, 0);
              return (
                <div className="space-y-1" key={dateKey(group[0].date)}>
                  <div className="flex items-center justify-between px-1">
                    <h2 className="text-sm font-semibold capitalize">
                      {dateLabel(group[0].date)}
                    </h2>
                    <span className="text-[11px] text-[#45464d]">
                      Neto:{" "}
                      <strong
                        className={
                          net >= 0 ? "text-[#00714d]" : "text-[#ba1a1a]"
                        }
                      >
                        {net >= 0 ? "+" : "-"}
                        {money.format(Math.abs(net))}
                      </strong>
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {group.map((item) => (
                      <ActivityCard item={item} key={item.id} />
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </section>
      </main>

    </>
  );
}

function FlowCard({
  color,
  label,
  amount,
  caption,
  prefix = "",
}: {
  color: string;
  label: string;
  amount: number;
  caption: string;
  prefix?: string;
}) {
  return (
    <article className="min-w-0 rounded-lg bg-white p-2 shadow-sm">
      <span className={`block truncate text-[11px] font-bold ${color}`}>
        {label}
      </span>
      <strong className={`block truncate text-sm ${color}`}>
        {prefix}
        {money.format(amount)}
      </strong>
      <span className="mt-0.5 block truncate text-[10px] text-[#45464d]">
        {caption}
      </span>
    </article>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const isIncome = item.kind === "income";
  const isTransfer = item.kind === "transfer";
  return (
    <article className="flex items-center justify-between gap-2 rounded-xl bg-white p-3 shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
      <div className="flex min-w-0 items-center gap-2">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg ${isIncome ? "bg-[#6cf8bb]/40 text-[#00714d]" : isTransfer ? "bg-[#cce5ff] text-[#004b73]" : item.adjustment ? "bg-[#e5eeff] text-[#45464d]" : "bg-[#ffdad6]/60 text-[#ba1a1a]"}`}
        >
          {isIncome ? "↓" : isTransfer ? "↔" : item.adjustment ? "±" : "↑"}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.title}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 text-[11px] text-[#45464d]">
              {timeFormat.format(new Date(item.date))}
            </span>
            <span className="h-1 w-1 shrink-0 rounded-full bg-[#c6c6cd]" />
            <span
              className={`truncate rounded bg-[#eff4ff] px-1.5 py-0.5 text-[11px] font-semibold ${isIncome ? "text-[#00714d]" : isTransfer ? "text-[#004b73]" : "text-[#93000a]"}`}
            >
              {item.detail}
            </span>
          </div>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <strong
          className={`block text-sm ${isIncome ? "text-[#00714d]" : "text-[#0b1c30]"}`}
        >
          {isIncome ? "+" : isTransfer ? "" : "-"}
          {money.format(item.amount)}
        </strong>
        <span
          className={`text-[10px] font-semibold ${item.adjustment ? "rounded-full bg-[#e5eeff] px-1.5 py-0.5 text-[#45464d]" : "text-[#45464d]"}`}
        >
          {item.adjustment
            ? "Ajuste"
            : isTransfer
              ? "Pase interno"
              : isIncome
                ? "Recibido"
                : "Egreso"}
        </span>
      </div>
    </article>
  );
}
