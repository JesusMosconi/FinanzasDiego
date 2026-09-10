import { EstadoObra, Prisma, TipoCobranza, TipoCuenta } from "@prisma/client";

import {
  crearCuenta,
  crearMovimiento,
  crearPeriodoCuenta,
  crearTransferencia,
  pagarGastoFijo,
} from "../lib/finanzas";
import { prisma } from "../lib/prisma";

async function main() {
  const periodo = await prisma.periodo.create({
    data: {
      anio: 2026,
      mes: 9,
    },
  });

  const cajaDiaria = await crearCuenta({ tipo: TipoCuenta.CAJA_DIARIA });
  const residuales = await crearCuenta({ tipo: TipoCuenta.RESIDUALES });

  await crearPeriodoCuenta({
    periodoId: periodo.id,
    cuentaId: cajaDiaria.id,
    saldoInicial: new Prisma.Decimal(0),
  });
  await crearPeriodoCuenta({
    periodoId: periodo.id,
    cuentaId: residuales.id,
    saldoInicial: new Prisma.Decimal(0),
  });

  const obra = await prisma.obra.create({
    data: {
      cliente: "Cliente de prueba",
      descripcion: "Trabajo de prueba",
      estado: EstadoObra.ACTIVA,
    },
  });

  await prisma.cobranza.create({
    data: {
      obra_id: obra.id,
      periodo_id: periodo.id,
      fecha: new Date("2026-09-05T12:00:00.000Z"),
      concepto: "Cobranza de prueba",
      monto: new Prisma.Decimal(2000),
      tipo: TipoCobranza.MANO_OBRA,
    },
  });

  const gastoFijo = await prisma.gastoFijo.create({
    data: {
      grupo: "Servicios",
      obligacion: "Electricidad de prueba",
      monto_total: new Prisma.Decimal(500),
      vence_dia: 10,
      periodo_id: periodo.id,
    },
  });

  await pagarGastoFijo({
    gastoFijoId: gastoFijo.id,
    cuentaOrigenId: cajaDiaria.id,
    periodoId: periodo.id,
    monto: new Prisma.Decimal(300),
  });

  await crearMovimiento({
    cuentaOrigenId: cajaDiaria.id,
    periodoId: periodo.id,
    fecha: new Date("2026-09-06T12:00:00.000Z"),
    concepto: "Gasto diario de prueba",
    monto: new Prisma.Decimal(150),
    categoria: "INSUMOS",
  });

  await crearTransferencia({
    cuentaOrigenId: cajaDiaria.id,
    cuentaDestinoId: residuales.id,
    periodoId: periodo.id,
    monto: new Prisma.Decimal(250),
    concepto: "Transferencia de prueba",
  });

  console.log("Seed creado", {
    periodoId: periodo.id,
    cajaDiariaId: cajaDiaria.id,
    residualesId: residuales.id,
    obraId: obra.id,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
