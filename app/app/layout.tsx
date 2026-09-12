import { EstadoObra, TipoCuenta } from "@prisma/client";

import {
  type ModalAccount,
  NuevoMovimientoProvider,
} from "@/components/nuevo-movimiento";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function accountName(tipo: TipoCuenta, cliente?: string | null) {
  if (tipo === TipoCuenta.CAJA_DIARIA) return "Diarios";
  if (tipo === TipoCuenta.RESIDUALES) return "Residuales";
  if (tipo === TipoCuenta.COBRANZAS) return "Cobranzas";
  return cliente ? `Anticipo · ${cliente}` : "Anticipo";
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
  const [accounts, works, fixedExpenses] = await Promise.all([
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
    }),
    prisma.obra.findMany({
      where: { estado: EstadoObra.ACTIVA },
      select: { id: true, cliente: true, descripcion: true },
      orderBy: { cliente: "asc" },
    }),
    period
      ? prisma.gastoFijo.findMany({
          where: { periodo_id: period.id, pagado: false },
          select: { id: true, obligacion: true },
          orderBy: { obligacion: "asc" },
        })
      : [],
  ]);

  const modalAccounts: ModalAccount[] = accounts.map((account) => ({
    id: account.id,
    name: accountName(account.tipo, account.obra?.cliente),
    type: account.tipo,
  }));
  return (
    <NuevoMovimientoProvider
      options={{
        periodId: period?.id ?? null,
        accounts: modalAccounts,
        works: works.map((work) => ({
          id: work.id,
          name: `${work.cliente} · ${work.descripcion}`,
        })),
        fixedExpenses: fixedExpenses.map((expense) => ({
          id: expense.id,
          name: expense.obligacion,
        })),
      }}
    >
      {children}
    </NuevoMovimientoProvider>
  );
}
