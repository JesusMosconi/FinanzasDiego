import { loadEnvConfig } from "@next/env";

import { assertDemoDatabase } from "../lib/demo-environment";

type AccountKey = "daily" | "savings" | "income";

function demoMonths() {
  const parts = new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).formatToParts(new Date());
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  const year = value("year");
  const month = value("month");
  const today = value("day");
  return [-2, -1, 0].map((offset) => {
    const date = new Date(Date.UTC(year, month - 1 + offset, 1));
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      closed: offset !== 0,
      lastDay: offset === 0 ? today : 27,
    };
  });
}

async function main() {
  loadEnvConfig(process.cwd());
  assertDemoDatabase();
  if (process.env.DEMO_SEED_CONFIRM !== "CREAR_DATOS_FICTICIOS") {
    throw new Error("Definí DEMO_SEED_CONFIRM=CREAR_DATOS_FICTICIOS.");
  }

  const { Prisma, TipoCobranza, TipoCuenta } = await import("@prisma/client");
  const { prisma } = await import("../lib/prisma");
  try {
    await prisma.$transaction(
      async (tx) => {
        const counts = await Promise.all([
          tx.periodo.count(),
          tx.cuenta.count(),
          tx.movimiento.count(),
          tx.gastoFijo.count(),
          tx.obra.count(),
          tx.cobranza.count(),
          tx.trabajoConfirmado.count(),
        ]);
        if (counts.some((count) => count !== 0)) {
          throw new Error("La base demo debe estar completamente vacía.");
        }

        const accounts = {
          daily: await tx.cuenta.create({
            data: { tipo: TipoCuenta.CAJA_DIARIA, saldo_actual: 0 },
          }),
          savings: await tx.cuenta.create({
            data: { tipo: TipoCuenta.RESIDUALES, saldo_actual: 0 },
          }),
          income: await tx.cuenta.create({
            data: { tipo: TipoCuenta.COBRANZAS, saldo_actual: 0 },
          }),
        };
        const balances: Record<AccountKey, number> = {
          daily: 0,
          savings: 0,
          income: 0,
        };

        for (const month of demoMonths()) {
          const period = await tx.periodo.create({
            data: {
              anio: month.year,
              mes: month.month,
              cerrado: month.closed,
              fecha_cierre: month.closed
                ? new Date(Date.UTC(month.year, month.month, 0, 18))
                : null,
              diferencia: month.closed ? 0 : null,
            },
          });
          const opening = { ...balances };
          const date = (day: number) =>
            new Date(
              Date.UTC(
                month.year,
                month.month - 1,
                Math.min(day, month.lastDay),
                15,
              ),
            );
          const movement = async (
            day: number,
            concept: string,
            amount: number,
            origin: AccountKey | null,
            destination: AccountKey | null,
            category: string,
            fixedExpenseId?: string,
          ) => {
            await tx.movimiento.create({
              data: {
                periodo_id: period.id,
                fecha: date(day),
                concepto: concept,
                monto: new Prisma.Decimal(amount),
                categoria: category,
                cuenta_origen_id: origin ? accounts[origin].id : null,
                cuenta_destino_id: destination
                  ? accounts[destination].id
                  : null,
                gasto_fijo_id: fixedExpenseId,
              },
            });
            if (origin) balances[origin] -= amount;
            if (destination) balances[destination] += amount;
          };

          await movement(
            3,
            "Servicios profesionales",
            880000,
            null,
            "income",
            "INGRESO",
          );
          await tx.cobranza.create({
            data: {
              periodo_id: period.id,
              fecha: date(3),
              concepto: "Servicios profesionales",
              monto: new Prisma.Decimal(880000),
              tipo: TipoCobranza.RESIDUAL,
            },
          });
          await movement(
            4,
            "Venta de artículos",
            120000,
            null,
            "daily",
            "INGRESO",
          );
          await movement(
            5,
            "Fondos para gastos del mes",
            500000,
            "income",
            "daily",
            "TRANSFERENCIA",
          );
          await movement(
            7,
            "Reserva de ahorro",
            120000,
            "income",
            "savings",
            "TRANSFERENCIA",
          );
          await movement(9, "Supermercado", 95000, "daily", null, "EGRESO");
          await movement(15, "Transporte", 45000, "daily", null, "EGRESO");
          await movement(
            23,
            "Salidas y recreación",
            40000,
            "daily",
            null,
            "EGRESO",
          );

          const rent = await tx.gastoFijo.create({
            data: {
              periodo_id: period.id,
              grupo: "Gastos vivienda",
              obligacion: "Alquiler de ejemplo",
              monto_total: 180000,
              vence_dia: 10,
            },
          });
          const internet = await tx.gastoFijo.create({
            data: {
              periodo_id: period.id,
              grupo: "Gastos vivienda",
              obligacion: "Internet",
              monto_total: 35000,
              vence_dia: 15,
            },
          });
          await tx.gastoFijo.create({
            data: {
              periodo_id: period.id,
              grupo: "Vehículos/Mantenimientos",
              obligacion: "Seguro del auto",
              monto_total: 60000,
              vence_dia: 25,
            },
          });
          await movement(
            10,
            "Pago de alquiler",
            180000,
            "daily",
            null,
            "GASTO_FIJO",
            rent.id,
          );
          await tx.gastoFijo.update({
            where: { id: rent.id },
            data: { pagado: true },
          });
          await movement(
            15,
            "Pago parcial de internet",
            15000,
            "daily",
            null,
            "GASTO_FIJO",
            internet.id,
          );

          for (const key of ["daily", "savings"] as const) {
            await tx.periodoCuenta.create({
              data: {
                periodo_id: period.id,
                cuenta_id: accounts[key].id,
                saldo_inicial: opening[key],
                saldo_final: month.closed ? balances[key] : null,
              },
            });
          }
        }

        for (const key of ["daily", "savings", "income"] as const) {
          await tx.cuenta.update({
            where: { id: accounts[key].id },
            data: { saldo_actual: balances[key] },
          });
        }
      },
      { maxWait: 15000, timeout: 60000 },
    );

    console.log("Datos ficticios creados en la base demo verificada.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
