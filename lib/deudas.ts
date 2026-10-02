import "server-only";

import { prisma } from "@/lib/prisma";

export async function obtenerDeudasPeriodo(periodoId: string) {
  const expenses = await prisma.gastoFijo.findMany({
    where: {
      periodo_id: periodoId,
      pagado: false,
      archivado: false,
    },
    include: {
      movimientos: { select: { monto: true } },
    },
  });

  return expenses
    .map((expense) => {
      const paid = expense.movimientos.reduce(
        (sum, movement) => sum + movement.monto.toNumber(),
        0,
      );
      return {
        id: expense.id,
        group: expense.grupo,
        name: expense.obligacion,
        pending: Math.max(expense.monto_total.toNumber() - paid, 0),
      };
    })
    .sort((a, b) => b.pending - a.pending);
}
