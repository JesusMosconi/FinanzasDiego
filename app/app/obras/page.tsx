import { TipoCuenta } from "@prisma/client";

import { AppHeader } from "@/components/app-header";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";
import { prisma } from "@/lib/prisma";

import { ObrasClient, type ObraView } from "./obras-client";

export const dynamic = "force-dynamic";

function nombreCuenta(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

export default async function ObrasPage() {
  const periodo = await obtenerPeriodoOperativo();
  const obrasDb = await prisma.obra.findMany({
    where: { estado: "ACTIVA" },
    include: {
      cuentas: {
        where: { tipo: TipoCuenta.ANTICIPO },
        include: {
          movimientos_origen: {
            include: {
              cuenta_destino: {
                include: { obra: { select: { cliente: true } } },
              },
            },
          },
          movimientos_destino: {
            include: {
              cuenta_origen: {
                include: { obra: { select: { cliente: true } } },
              },
            },
          },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { cliente: "asc" }],
  });

  const obras: ObraView[] = obrasDb.map((obra) => {
    const anticipo = obra.cuentas[0];
    const movimientos = new Map<
      string,
      {
        id: string;
        fecha: string;
        concepto: string;
        monto: number;
        entrada: boolean;
        contraparte: string;
      }
    >();

    for (const movimiento of anticipo?.movimientos_destino ?? []) {
      movimientos.set(movimiento.id, {
        id: movimiento.id,
        fecha: movimiento.fecha.toISOString(),
        concepto: movimiento.concepto,
        monto: movimiento.monto.toNumber(),
        entrada: true,
        contraparte: movimiento.cuenta_origen
          ? nombreCuenta(
              movimiento.cuenta_origen.tipo,
              movimiento.cuenta_origen.obra?.cliente,
            )
          : "Ingreso externo",
      });
    }
    for (const movimiento of anticipo?.movimientos_origen ?? []) {
      movimientos.set(movimiento.id, {
        id: movimiento.id,
        fecha: movimiento.fecha.toISOString(),
        concepto: movimiento.concepto,
        monto: movimiento.monto.toNumber(),
        entrada: false,
        contraparte: movimiento.cuenta_destino
          ? nombreCuenta(
              movimiento.cuenta_destino.tipo,
              movimiento.cuenta_destino.obra?.cliente,
            )
          : "Egreso directo",
      });
    }

    return {
      id: obra.id,
      cliente: obra.cliente,
      descripcion: obra.descripcion,
      saldo: anticipo?.saldo_actual.toNumber() ?? 0,
      movimientos: [...movimientos.values()].sort(
        (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
      ),
    };
  });
  const periodoLabel = periodo
    ? formatearPeriodo(periodo.anio, periodo.mes)
    : "Sin período abierto";

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={periodoLabel} />
      <ObrasClient
        obras={obras}
        periodoId={periodo?.id ?? null}
        periodoLabel={periodoLabel}
      />
    </div>
  );
}
