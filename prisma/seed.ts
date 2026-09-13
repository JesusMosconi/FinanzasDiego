import { Prisma, TipoCuenta } from "@prisma/client";

import { prisma } from "../lib/prisma";

const TIME_ZONE = "America/Argentina/Buenos_Aires";

function obtenerPeriodoActual() {
  const partes = new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "numeric",
    timeZone: TIME_ZONE,
  }).formatToParts(new Date());

  return {
    anio: Number(partes.find((parte) => parte.type === "year")?.value),
    mes: Number(partes.find((parte) => parte.type === "month")?.value),
  };
}

async function main() {
  const { anio, mes } = obtenerPeriodoActual();

  const resultado = await prisma.$transaction(async (tx) => {
    await tx.movimiento.deleteMany();
    await tx.cobranza.deleteMany();
    await tx.gastoFijo.deleteMany();
    await tx.periodoCuenta.deleteMany();
    await tx.cuenta.deleteMany();
    await tx.obra.deleteMany();
    await tx.periodo.deleteMany();
    await tx.trabajoConfirmado.deleteMany();

    const periodo = await tx.periodo.create({ data: { anio, mes } });
    const cajaDiaria = await tx.cuenta.create({
      data: {
        tipo: TipoCuenta.CAJA_DIARIA,
        saldo_actual: new Prisma.Decimal(0),
      },
    });
    const residuales = await tx.cuenta.create({
      data: {
        tipo: TipoCuenta.RESIDUALES,
        saldo_actual: new Prisma.Decimal(0),
      },
    });
    await tx.cuenta.create({
      data: {
        tipo: TipoCuenta.COBRANZAS,
        saldo_actual: new Prisma.Decimal(0),
      },
    });

    await tx.periodoCuenta.createMany({
      data: [cajaDiaria.id, residuales.id].map((cuentaId) => ({
        periodo_id: periodo.id,
        cuenta_id: cuentaId,
        saldo_inicial: new Prisma.Decimal(0),
      })),
    });

    return { periodo: `${mes}/${anio}` };
  });

  console.log("Base reiniciada", resultado);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
