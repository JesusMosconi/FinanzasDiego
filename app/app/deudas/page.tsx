import { AppHeader } from "@/components/app-header";
import { obtenerDeudasPeriodo } from "@/lib/deudas";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";

export const dynamic = "force-dynamic";

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default async function DeudasPage() {
  const period = await obtenerPeriodoOperativo();
  const debts = period ? await obtenerDeudasPeriodo(period.id) : [];

  const periodLabel = period
    ? formatearPeriodo(period.anio, period.mes)
    : "Sin período";

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={periodLabel} />

      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section className="space-y-2">
          <div className="flex items-center justify-between gap-3 px-0.5">
            <div>
              <h1 className="text-base font-semibold">Deudas</h1>
              <p className="text-xs text-[#45464d]">
                Pagos pendientes del período actual
              </p>
            </div>
            {period ? (
              <a
                className="flex min-h-11 items-center gap-1.5 rounded-lg bg-[#e5eeff] px-3 text-xs font-semibold shadow-sm transition active:scale-95"
                download
                href="/api/deudas/pdf"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="1.8"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 3v12m-5-5 5 5 5-5M5 20h14" />
                </svg>
                Descargar PDF
              </a>
            ) : null}
          </div>

          {debts.length === 0 ? (
            <section className="rounded-xl bg-white p-8 text-center shadow-sm">
              <p className="font-semibold">
                No hay deudas pendientes para este período
              </p>
            </section>
          ) : (
            <div className="grid gap-2.5">
              {debts.map((debt) => (
                <article
                  className="flex items-center justify-between gap-3 rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(11,28,48,0.05)]"
                  key={debt.id}
                >
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold">
                      {debt.name}
                    </h2>
                    <p className="mt-0.5 truncate text-[11px] text-[#45464d]">
                      {debt.group}
                    </p>
                  </div>
                  <span className="shrink-0 text-[15px] font-bold text-[#93000a]">
                    {money.format(debt.pending)}
                  </span>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
