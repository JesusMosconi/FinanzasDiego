import { EstadoObra, TipoCuenta } from "@prisma/client";

import { AppHeader } from "@/components/app-header";
import { calcularMontoPagadoGastoFijo } from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";
import { formatearPeriodo, obtenerPeriodoOperativo } from "@/lib/periodos";

import {
  FijosClient,
  type FixedExpenseView,
  type SourceAccountView,
} from "./fijos-client";

export const dynamic = "force-dynamic";

function accountName(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

export default async function FijosPage() {
  const period = await obtenerPeriodoOperativo();

  const [fixedExpenses, sourceAccounts] = await Promise.all([
    period
      ? prisma.gastoFijo.findMany({
          where: { periodo_id: period.id, archivado: false },
          include: {
            movimientos: {
              include: {
                cuenta_origen: {
                  include: { obra: { select: { cliente: true } } },
                },
              },
              orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
              take: 1,
            },
          },
          orderBy: [{ grupo: "asc" }, { vence_dia: "asc" }],
        })
      : [],
    prisma.cuenta.findMany({
      where: {
        OR: [
          {
            tipo: {
              in: [
                TipoCuenta.CAJA_DIARIA,
                TipoCuenta.RESIDUALES,
                TipoCuenta.COBRANZAS,
              ],
            },
          },
          { tipo: TipoCuenta.ANTICIPO, obra: { estado: EstadoObra.ACTIVA } },
        ],
      },
      include: { obra: { select: { cliente: true } } },
      orderBy: { tipo: "asc" },
    }),
  ]);

  const paidAmounts = await Promise.all(
    fixedExpenses.map((expense) => calcularMontoPagadoGastoFijo(expense.id)),
  );

  const expenses: FixedExpenseView[] = fixedExpenses.map((expense, index) => {
    const lastPayment = expense.movimientos[0];
    return {
      id: expense.id,
      group: expense.grupo,
      name: expense.obligacion,
      total: expense.monto_total.toNumber(),
      paid: paidAmounts[index].toNumber(),
      dueDay: expense.vence_dia,
      lastPayment: lastPayment
        ? {
            amount: lastPayment.monto.toNumber(),
            date: lastPayment.fecha.toISOString(),
            source: lastPayment.cuenta_origen
              ? accountName(
                  lastPayment.cuenta_origen.tipo,
                  lastPayment.cuenta_origen.obra?.cliente,
                )
              : "Ingreso externo",
          }
        : null,
    };
  });

  const accounts: SourceAccountView[] = sourceAccounts.map((account) => ({
    id: account.id,
    name: accountName(account.tipo, account.obra?.cliente),
    balance: account.saldo_actual.toNumber(),
    advance: account.tipo === TipoCuenta.ANTICIPO,
  }));

  const periodLabel = period
    ? formatearPeriodo(period.anio, period.mes)
    : "Sin período";

  return (
    <div className="min-h-dvh bg-[#f8f9ff] text-[#0b1c30]">
      <AppHeader periodLabel={periodLabel} />
      <FijosClient
        accounts={accounts}
        expenses={expenses}
        periodId={period?.id ?? null}
        periodLabel={periodLabel}
      />
    </div>
  );
}
