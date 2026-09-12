import { EstadoObra, Prisma, TipoCobranza, TipoCuenta } from "@prisma/client";

import {
  calcularMontoPagadoGastoFijo,
  crearCuenta,
  crearIngreso,
  crearMovimiento,
  crearPeriodoCuenta,
  crearTransferencia,
  pagarGastoFijo,
} from "../lib/finanzas";
import { prisma } from "../lib/prisma";

async function main() {
  const periodo =
    (await prisma.periodo.findFirst({
      where: { anio: 2026, mes: 9 },
      orderBy: { createdAt: "asc" },
    })) ?? (await prisma.periodo.create({ data: { anio: 2026, mes: 9 } }));

  const cajaDiaria =
    (await prisma.cuenta.findFirst({
      where: { tipo: TipoCuenta.CAJA_DIARIA, obra_id: null },
      orderBy: { createdAt: "asc" },
    })) ?? (await crearCuenta({ tipo: TipoCuenta.CAJA_DIARIA }));
  const residuales =
    (await prisma.cuenta.findFirst({
      where: { tipo: TipoCuenta.RESIDUALES, obra_id: null },
      orderBy: { createdAt: "asc" },
    })) ?? (await crearCuenta({ tipo: TipoCuenta.RESIDUALES }));
  const cobranzas =
    (await prisma.cuenta.findFirst({
      where: { tipo: TipoCuenta.COBRANZAS, obra_id: null },
      orderBy: { createdAt: "asc" },
    })) ?? (await crearCuenta({ tipo: TipoCuenta.COBRANZAS }));

  for (const cuenta of [cajaDiaria, residuales]) {
    const relacion = await prisma.periodoCuenta.findFirst({
      where: { periodo_id: periodo.id, cuenta_id: cuenta.id },
    });
    if (!relacion) {
      await crearPeriodoCuenta({
        periodoId: periodo.id,
        cuentaId: cuenta.id,
        saldoInicial: new Prisma.Decimal(0),
      });
    }
  }

  const obra =
    (await prisma.obra.findFirst({
      where: {
        cliente: "Cliente de prueba",
        descripcion: "Trabajo de prueba",
      },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.obra.create({
      data: {
        cliente: "Cliente de prueba",
        descripcion: "Trabajo de prueba",
        estado: EstadoObra.ACTIVA,
      },
    }));

  const anticipo =
    (await prisma.cuenta.findFirst({
      where: { tipo: TipoCuenta.ANTICIPO, obra_id: obra.id },
      orderBy: { createdAt: "asc" },
    })) ?? (await crearCuenta({ tipo: TipoCuenta.ANTICIPO, obraId: obra.id }));

  const cobranzaExistente = await prisma.cobranza.findFirst({
    where: {
      periodo_id: periodo.id,
      concepto: "Cobranza de prueba",
      tipo: TipoCobranza.MANO_OBRA,
    },
  });
  if (!cobranzaExistente) {
    await crearIngreso({
      cuentaDestinoId: cobranzas.id,
      periodoId: periodo.id,
      fecha: new Date("2026-09-05T12:00:00.000Z"),
      concepto: "Cobranza de prueba",
      monto: new Prisma.Decimal(2000),
      cobranza: { tipo: TipoCobranza.MANO_OBRA, obraId: obra.id },
    });
  } else {
    const ingresoCobranza = await prisma.movimiento.findFirst({
      where: {
        cuenta_destino_id: cobranzas.id,
        periodo_id: periodo.id,
        concepto: "Cobranza de prueba",
        categoria: "INGRESO",
      },
    });
    if (!ingresoCobranza) {
      await crearMovimiento({
        cuentaDestinoId: cobranzas.id,
        periodoId: periodo.id,
        fecha: cobranzaExistente.fecha,
        concepto: cobranzaExistente.concepto,
        monto: cobranzaExistente.monto,
        categoria: "INGRESO",
      });
    }
  }

  const gastoFijo =
    (await prisma.gastoFijo.findFirst({
      where: {
        periodo_id: periodo.id,
        grupo: "Servicios",
        obligacion: "Electricidad de prueba",
      },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.gastoFijo.create({
      data: {
        grupo: "Servicios",
        obligacion: "Electricidad de prueba",
        monto_total: new Prisma.Decimal(500),
        vence_dia: 10,
        periodo_id: periodo.id,
      },
    }));

  const pagoObjetivo = new Prisma.Decimal(300);
  const montoPagado = await calcularMontoPagadoGastoFijo(gastoFijo.id);
  if (montoPagado.lessThan(pagoObjetivo)) {
    await pagarGastoFijo({
      gastoFijoId: gastoFijo.id,
      cuentaOrigenId: cajaDiaria.id,
      periodoId: periodo.id,
      monto: pagoObjetivo.minus(montoPagado),
      fecha: new Date("2026-09-05T12:00:00.000Z"),
    });
  }

  const gastoDiario = await prisma.movimiento.findFirst({
    where: {
      periodo_id: periodo.id,
      concepto: "Gasto diario de prueba",
      categoria: "INSUMOS",
    },
  });
  if (!gastoDiario) {
    await crearMovimiento({
      cuentaOrigenId: cajaDiaria.id,
      periodoId: periodo.id,
      fecha: new Date("2026-09-06T12:00:00.000Z"),
      concepto: "Gasto diario de prueba",
      monto: new Prisma.Decimal(150),
      categoria: "INSUMOS",
    });
  }

  const transferencia = await prisma.movimiento.findFirst({
    where: {
      periodo_id: periodo.id,
      concepto: "Transferencia de prueba",
      categoria: "TRANSFERENCIA",
    },
  });
  if (!transferencia) {
    await crearTransferencia({
      cuentaOrigenId: cajaDiaria.id,
      cuentaDestinoId: residuales.id,
      periodoId: periodo.id,
      monto: new Prisma.Decimal(250),
      concepto: "Transferencia de prueba",
    });
  }

  console.log("Seed listo", {
    periodoId: periodo.id,
    cajaDiariaId: cajaDiaria.id,
    residualesId: residuales.id,
    cobranzasId: cobranzas.id,
    anticipoId: anticipo.id,
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
