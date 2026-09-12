import { EstadoObra, TipoCuenta } from "@prisma/client";

import { LogoutButton } from "@/components/logout-button";
import { calcularMontoPagadoGastoFijo } from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";

import {
  FijosClient,
  type FixedExpenseView,
  type SourceAccountView,
} from "./fijos-client";

export const dynamic = "force-dynamic";

const monthName = new Intl.DateTimeFormat("es-AR", {
  month: "long",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

function accountName(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

export default async function FijosPage() {
  const today = new Date();
  const parts = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(today);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const period =
    (await prisma.periodo.findFirst({ where: { anio: year, mes: month } })) ??
    (await prisma.periodo.findFirst({
      orderBy: [{ anio: "desc" }, { mes: "desc" }],
    }));

  const [fixedExpenses, sourceAccounts] = await Promise.all([
    period
      ? prisma.gastoFijo.findMany({
          where: { periodo_id: period.id },
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
          <div className="flex min-h-11 items-center rounded-full bg-[#eff4ff] px-3 text-xs font-semibold capitalize">
            {periodLabel}
          </div>
          <LogoutButton compact />
        </div>
      </header>
      <FijosClient
        accounts={accounts}
        expenses={expenses}
        periodId={period?.id ?? null}
        periodLabel={periodLabel}
      />
    </div>
  );
}
