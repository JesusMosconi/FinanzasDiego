"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { SelectDialog } from "@/components/select-dialog";

export type HistoricalActivity = {
  id: string;
  date: string;
  title: string;
  detail: string;
  searchText: string;
  amount: number;
  kind: "income" | "expense" | "transfer";
};

type PeriodOption = { id: string; label: string };
type KindFilter = "all" | HistoricalActivity["kind"];

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const date = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function HistoricalPeriodSelect({
  periods,
  selectedId,
}: {
  periods: PeriodOption[];
  selectedId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <div className={pending ? "opacity-60" : undefined}>
      <SelectDialog
        label="Período histórico"
        onChange={(periodId) => {
          startTransition(() => {
            router.push(
              `/app/historial?periodo=${encodeURIComponent(periodId)}`,
            );
          });
        }}
        options={periods.map((period) => ({
          value: period.id,
          label: period.label,
        }))}
        value={selectedId}
      />
    </div>
  );
}

export function HistoricalActivityList({
  items,
}: {
  items: HistoricalActivity[];
}) {
  const [kind, setKind] = useState<KindFilter>("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("es");
    return items.filter(
      (item) =>
        (kind === "all" || item.kind === kind) &&
        (!normalized ||
          `${item.title} ${item.searchText}`
            .toLocaleLowerCase("es")
            .includes(normalized)),
    );
  }, [items, kind, query]);
  const displayed = expanded ? visible : visible.slice(0, 4);

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">Movimientos del período</h2>
        <p className="text-xs text-[#45464d]">
          Consulta completa de la actividad registrada
        </p>
      </div>
      <input
        className="h-11 w-full rounded-xl bg-[#eff4ff] px-3 text-sm outline-none transition focus:bg-[#e5eeff]"
        onChange={(event) => {
          setQuery(event.target.value);
          setExpanded(false);
        }}
        placeholder="Buscar por concepto, obra o cuenta..."
        type="search"
        value={query}
      />
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
            className={`min-h-9 whitespace-nowrap rounded-full px-4 text-xs font-semibold transition ${kind === value ? "bg-[#131b2e] text-white shadow-sm" : "bg-[#e5eeff] text-[#0b1c30]"}`}
            key={value}
            onClick={() => {
              setKind(value);
              setExpanded(false);
            }}
            type="button"
          >
            {label}
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <p className="font-semibold">No hay registros para mostrar</p>
        </div>
      ) : (
        <div className="divide-y divide-[#eff4ff] overflow-hidden rounded-xl bg-white shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
          {displayed.map((item) => (
            <article
              className="flex items-center justify-between gap-3 p-4"
              key={item.id}
            >
              <div className="min-w-0">
                <h3 className="truncate text-sm font-semibold">{item.title}</h3>
                <p className="mt-0.5 truncate text-[11px] text-[#45464d]">
                  {item.detail} · {date.format(new Date(item.date))}
                </p>
              </div>
              <strong
                className={`shrink-0 text-sm ${item.kind === "income" ? "text-[#00714d]" : item.kind === "expense" ? "text-[#93000a]" : "text-[#188ace]"}`}
              >
                {item.kind === "income"
                  ? "+"
                  : item.kind === "expense"
                    ? "-"
                    : ""}
                {money.format(item.amount)}
              </strong>
            </article>
          ))}
        </div>
      )}
      {visible.length > 4 ? (
        <button
          className="min-h-11 w-full rounded-xl bg-[#e5eeff] px-4 text-sm font-semibold text-[#0b1c30] transition active:scale-[0.98]"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded
            ? "Ver menos"
            : `Ver todos los movimientos (${visible.length})`}
        </button>
      ) : null}
    </section>
  );
}
