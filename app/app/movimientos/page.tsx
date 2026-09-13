import { TipoCuenta } from "@prisma/client";

import { AppHeader } from "@/components/app-header";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";
import { prisma } from "@/lib/prisma";

import { MovimientosList, type ActivityItem } from "./movimientos-list";

export const dynamic = "force-dynamic";

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
  const period = await obtenerPeriodoOperativo();

  const movements = period
    ? await prisma.movimiento.findMany({
        where: { periodo_id: period.id },
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
    ? formatearPeriodo(period.anio, period.mes)
    : "Sin período";

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={periodLabel} />

      <MovimientosList items={items} periodLabel={periodLabel} />
    </div>
  );
}
