import { EstadoObra, TipoCuenta } from "@prisma/client";

import {
  type ModalAccount,
  NuevoMovimientoProvider,
} from "@/components/nuevo-movimiento";
import { InstallAppBanner } from "@/components/install-app-banner";
import { BottomNav } from "@/components/bottom-nav";
import { PageTransition } from "@/components/page-transition";
import { ToastProvider } from "@/components/toast-provider";
import { prisma } from "@/lib/prisma";
import { obtenerPeriodoOperativo } from "@/lib/periodos";

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
  const period = await obtenerPeriodoOperativo();
  const [accounts, works] = await Promise.all([
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
  ]);

  const modalAccounts: ModalAccount[] = accounts.map((account) => ({
    id: account.id,
    name: accountName(account.tipo, account.obra?.cliente),
    type: account.tipo,
  }));
  return (
    <ToastProvider>
      <NuevoMovimientoProvider
      options={{
        periodId: period?.id ?? null,
        accounts: modalAccounts,
        works: works.map((work) => ({
          id: work.id,
          name: `${work.cliente} · ${work.descripcion}`,
        })),
      }}
      >
        <PageTransition>{children}</PageTransition>
        <BottomNav />
        <InstallAppBanner />
      </NuevoMovimientoProvider>
    </ToastProvider>
  );
}
