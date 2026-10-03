import { loadEnvConfig } from "@next/env";

import { assertDemoDatabase } from "../lib/demo-environment";

async function main() {
  loadEnvConfig(process.cwd());
  assertDemoDatabase();

  const { prisma } = await import("../lib/prisma");
  try {
    const [periodos, cuentas, movimientos, fijos, obras, cobranzas, trabajos] =
      await Promise.all([
        prisma.periodo.count(),
        prisma.cuenta.count(),
        prisma.movimiento.count(),
        prisma.gastoFijo.count(),
        prisma.obra.count(),
        prisma.cobranza.count(),
        prisma.trabajoConfirmado.count(),
      ]);
    console.log({
      periodos,
      cuentas,
      movimientos,
      fijos,
      obras,
      cobranzas,
      trabajos,
    });
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
