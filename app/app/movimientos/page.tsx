import { TipoCuenta } from "@prisma/client";

import { LogoutButton } from "@/components/logout-button";
import { prisma } from "@/lib/prisma";

import { MovimientosList, type ActivityItem } from "./movimientos-list";

export const dynamic = "force-dynamic";

const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

function getCurrentDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}

function accountLabel(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

function transferTitle(origin: TipoCuenta, destination: TipoCuenta) {
  if (destination === TipoCuenta.RESIDUALES) return "Ingreso a Residuales";
  if (origin === TipoCuenta.RESIDUALES) return "Egreso de Residuales";
  if (destination === TipoCuenta.COBRANZAS) return "Ingreso a Cobranzas";
  if (destination === TipoCuenta.CAJA_DIARIA) return "Ingreso a Diarios";
  return "Pase entre cajas";
}

export default async function MovimientosPage() {
  const now = new Date();
  const { year, month } = getCurrentDateParts(now);
  const period =
    (await prisma.periodo.findFirst({ where: { anio: year, mes: month } })) ??
    (await prisma.periodo.findFirst({
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    }));

  const movements = period
    ? await prisma.movimiento.findMany({
        where: {
          periodo_id: period.id,
          OR: [
            {
              cuenta_origen: {
                tipo: {
                  in: [
                    TipoCuenta.CAJA_DIARIA,
                    TipoCuenta.RESIDUALES,
                    TipoCuenta.COBRANZAS,
                  ],
                },
              },
            },
            {
              cuenta_destino: {
                tipo: {
                  in: [
                    TipoCuenta.CAJA_DIARIA,
                    TipoCuenta.RESIDUALES,
                    TipoCuenta.COBRANZAS,
                  ],
                },
              },
            },
          ],
        },
        include: {
          cuenta_origen: {
            include: { obra: { select: { cliente: true } } },
          },
          cuenta_destino: {
            include: { obra: { select: { cliente: true } } },
          },
          gasto_fijo: { select: { obligacion: true } },
        },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      })
    : [];

  const items: ActivityItem[] = [
    ...movements.map((movement) => {
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
        : null;
      const fixedPayment = Boolean(movement.gasto_fijo);
      const income = !movement.cuenta_origen;
      const transfer = Boolean(
        movement.cuenta_origen && movement.cuenta_destino,
      );
      const adjustment = movement.categoria === "AJUSTE";

      return {
        id: `movement-${movement.id}`,
        date: movement.fecha.toISOString(),
        kind: income
          ? ("income" as const)
          : transfer
            ? ("transfer" as const)
            : ("expense" as const),
        title: fixedPayment
          ? `Pago de Fijo: ${movement.gasto_fijo?.obligacion}`
          : transfer && movement.cuenta_origen && movement.cuenta_destino
            ? transferTitle(
                movement.cuenta_origen.tipo,
                movement.cuenta_destino.tipo,
              )
            : movement.concepto,
        detail: fixedPayment
          ? `${origin} → Fijos`
          : destination
            ? `${origin} → ${destination}`
            : `Desde ${origin}`,
        searchText: `${movement.concepto} ${origin} ${destination ?? ""} ${movement.gasto_fijo?.obligacion ?? ""}`,
        amount: movement.monto.toNumber(),
        originType: movement.cuenta_origen?.tipo ?? null,
        destinationType: movement.cuenta_destino?.tipo ?? null,
        adjustment,
      };
    }),
  ].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));

  const periodLabel = period
    ? monthName.format(new Date(Date.UTC(period.anio, period.mes - 1, 15, 12)))
    : "Sin período";

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#f8f9ff]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#131b2e] text-sm font-bold text-white">
              FD
            </div>
            <span className="hidden text-sm font-bold tracking-tight min-[390px]:inline">
              FinanzasDiego
            </span>
          </div>
          <div className="flex min-h-11 items-center gap-2 rounded-full bg-[#eff4ff] px-3 text-xs font-semibold capitalize">
            {periodLabel}
          </div>
          <LogoutButton compact />
        </div>
      </header>

      <MovimientosList items={items} periodLabel={periodLabel} />
    </div>
  );
}
