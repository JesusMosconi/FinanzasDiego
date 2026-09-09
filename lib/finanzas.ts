import { EstadoObra, Prisma, TipoCuenta } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const TIPOS_CON_PERIODO = new Set<TipoCuenta>([
  TipoCuenta.CAJA_DIARIA,
  TipoCuenta.RESIDUALES,
]);

type TransactionClient = Prisma.TransactionClient;
type DecimalInput = Prisma.MovimientoUncheckedCreateInput["monto"];

export type CrearMovimientoInput = {
  cuentaOrigenId: string;
  cuentaDestinoId?: string | null;
  periodoId: string;
  fecha: Date | string;
  concepto: string;
  monto: DecimalInput;
  categoria: string;
  observaciones?: string | null;
};

export type EditarMovimientoInput = Partial<CrearMovimientoInput>;

export type CrearTransferenciaInput = {
  cuentaOrigenId: string;
  cuentaDestinoId: string;
  monto: DecimalInput;
  concepto: string;
  periodoId: string;
  fecha?: Date | string;
};

export type ValidarCuentaInput = {
  tipo: TipoCuenta;
  obraId?: string | null;
};

export type CrearPeriodoCuentaInput = {
  periodoId: string;
  cuentaId: string;
  saldoInicial: DecimalInput;
  saldoFinal?: DecimalInput | null;
};

async function recalcularSaldoCuenta(tx: TransactionClient, cuentaId: string) {
  const [entradas, salidas] = await Promise.all([
    tx.movimiento.aggregate({
      where: { cuenta_destino_id: cuentaId },
      _sum: { monto: true },
    }),
    tx.movimiento.aggregate({
      where: { cuenta_origen_id: cuentaId },
      _sum: { monto: true },
    }),
  ]);

  const saldo = (entradas._sum.monto ?? new Prisma.Decimal(0)).minus(
    salidas._sum.monto ?? new Prisma.Decimal(0),
  );

  return tx.cuenta.update({
    where: { id: cuentaId },
    data: { saldo_actual: saldo },
  });
}

async function recalcularCuentas(
  tx: TransactionClient,
  cuentaIds: Iterable<string | null | undefined>,
) {
  const idsUnicos = [...new Set(cuentaIds)].filter(
    (cuentaId): cuentaId is string => Boolean(cuentaId),
  );

  return Promise.all(
    idsUnicos.map((cuentaId) => recalcularSaldoCuenta(tx, cuentaId)),
  );
}

async function validarPeriodoCuentaConCliente(
  tx: TransactionClient,
  cuentaId: string,
) {
  const cuenta = await tx.cuenta.findUnique({
    where: { id: cuentaId },
    select: { tipo: true },
  });

  if (!cuenta) {
    throw new Error("La cuenta no existe.");
  }

  if (!TIPOS_CON_PERIODO.has(cuenta.tipo)) {
    throw new Error(
      "Solo las cuentas CAJA_DIARIA y RESIDUALES pueden asociarse a un periodo.",
    );
  }
}

export async function calcularSaldoCuenta(cuentaId: string) {
  return prisma.$transaction((tx) => recalcularSaldoCuenta(tx, cuentaId));
}

export function validarCuenta({ tipo, obraId }: ValidarCuentaInput) {
  if (obraId && tipo !== TipoCuenta.ANTICIPO) {
    throw new Error(
      "Solo una cuenta ANTICIPO puede estar asociada a una obra.",
    );
  }

  if (tipo === TipoCuenta.ANTICIPO && !obraId) {
    throw new Error("Una cuenta ANTICIPO debe estar asociada a una obra.");
  }
}

export async function validarPeriodoCuenta(cuentaId: string) {
  return prisma.$transaction((tx) =>
    validarPeriodoCuentaConCliente(tx, cuentaId),
  );
}

export async function crearCuenta({ tipo, obraId }: ValidarCuentaInput) {
  validarCuenta({ tipo, obraId });

  return prisma.cuenta.create({
    data: {
      tipo,
      obra_id: obraId ?? null,
      saldo_actual: new Prisma.Decimal(0),
    },
  });
}

export async function editarCuenta(
  cuentaId: string,
  data: Partial<ValidarCuentaInput>,
) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuenta.findUniqueOrThrow({
      where: { id: cuentaId },
      select: { tipo: true, obra_id: true },
    });
    const tipo = data.tipo ?? cuenta.tipo;
    const obraId = data.obraId === undefined ? cuenta.obra_id : data.obraId;

    validarCuenta({ tipo, obraId });

    return tx.cuenta.update({
      where: { id: cuentaId },
      data: { tipo, obra_id: obraId },
    });
  });
}

export async function crearPeriodoCuenta(data: CrearPeriodoCuentaInput) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoCuentaConCliente(tx, data.cuentaId);

    return tx.periodoCuenta.create({
      data: {
        periodo_id: data.periodoId,
        cuenta_id: data.cuentaId,
        saldo_inicial: data.saldoInicial,
        saldo_final: data.saldoFinal ?? null,
      },
    });
  });
}

export async function editarPeriodoCuenta(
  periodoCuentaId: string,
  data: Partial<CrearPeriodoCuentaInput>,
) {
  return prisma.$transaction(async (tx) => {
    const periodoCuenta = await tx.periodoCuenta.findUniqueOrThrow({
      where: { id: periodoCuentaId },
      select: { cuenta_id: true },
    });
    const cuentaId = data.cuentaId ?? periodoCuenta.cuenta_id;

    await validarPeriodoCuentaConCliente(tx, cuentaId);

    return tx.periodoCuenta.update({
      where: { id: periodoCuentaId },
      data: {
        periodo_id: data.periodoId,
        cuenta_id: data.cuentaId,
        saldo_inicial: data.saldoInicial,
        saldo_final: data.saldoFinal,
      },
    });
  });
}

export async function crearMovimiento(data: CrearMovimientoInput) {
  return prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: data.cuentaOrigenId,
        cuenta_destino_id: data.cuentaDestinoId ?? null,
        periodo_id: data.periodoId,
        fecha: data.fecha,
        concepto: data.concepto,
        monto: data.monto,
        categoria: data.categoria,
        observaciones: data.observaciones ?? null,
      },
    });

    await recalcularCuentas(tx, [
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ]);

    return movimiento;
  });
}

export async function editarMovimiento(
  movimientoId: string,
  data: EditarMovimientoInput,
) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.movimiento.findUniqueOrThrow({
      where: { id: movimientoId },
      select: { cuenta_origen_id: true, cuenta_destino_id: true },
    });
    const movimiento = await tx.movimiento.update({
      where: { id: movimientoId },
      data: {
        cuenta_origen_id: data.cuentaOrigenId,
        cuenta_destino_id: data.cuentaDestinoId,
        periodo_id: data.periodoId,
        fecha: data.fecha,
        concepto: data.concepto,
        monto: data.monto,
        categoria: data.categoria,
        observaciones: data.observaciones,
      },
    });

    await recalcularCuentas(tx, [
      anterior.cuenta_origen_id,
      anterior.cuenta_destino_id,
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ]);

    return movimiento;
  });
}

export async function borrarMovimiento(movimientoId: string) {
  return prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimiento.delete({
      where: { id: movimientoId },
    });

    await recalcularCuentas(tx, [
      movimiento.cuenta_origen_id,
      movimiento.cuenta_destino_id,
    ]);

    return movimiento;
  });
}

export async function crearTransferencia(data: CrearTransferenciaInput) {
  if (data.cuentaOrigenId === data.cuentaDestinoId) {
    throw new Error("Las cuentas de origen y destino deben ser distintas.");
  }

  return prisma.$transaction(async (tx) => {
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: data.cuentaOrigenId,
        cuenta_destino_id: data.cuentaDestinoId,
        periodo_id: data.periodoId,
        fecha: data.fecha ?? new Date(),
        concepto: data.concepto,
        monto: data.monto,
        categoria: "TRANSFERENCIA",
      },
    });

    await recalcularCuentas(tx, [data.cuentaOrigenId, data.cuentaDestinoId]);

    return movimiento;
  });
}

export async function cerrarPeriodo(periodoId: string) {
  return prisma.$transaction(async (tx) => {
    const periodo = await tx.periodo.findUniqueOrThrow({
      where: { id: periodoId },
      include: {
        periodo_cuentas: {
          include: { cuenta: { select: { tipo: true } } },
        },
      },
    });

    if (periodo.cerrado) {
      throw new Error("El periodo ya esta cerrado.");
    }

    for (const periodoCuenta of periodo.periodo_cuentas) {
      if (!TIPOS_CON_PERIODO.has(periodoCuenta.cuenta.tipo)) {
        throw new Error(
          "El periodo contiene una cuenta que no participa del cierre.",
        );
      }
    }

    const [cobranzas, gastosFijos, gastosDiarios, ajustes] = await Promise.all([
      tx.cobranza.aggregate({
        where: { periodo_id: periodoId },
        _sum: { monto: true },
      }),
      tx.gastoFijo.aggregate({
        where: { periodo_id: periodoId },
        _sum: { monto_pagado: true },
      }),
      // Un AJUSTE es una correccion aparte del gasto diario; no debe contarse en ambos lados del cierre de periodo.
      tx.movimiento.aggregate({
        where: {
          periodo_id: periodoId,
          cuenta_destino_id: null,
          cuenta_origen: { tipo: TipoCuenta.CAJA_DIARIA },
          categoria: { not: "AJUSTE" },
        },
        _sum: { monto: true },
      }),
      tx.movimiento.aggregate({
        where: { periodo_id: periodoId, categoria: "AJUSTE" },
        _sum: { monto: true },
      }),
    ]);

    const cero = new Prisma.Decimal(0);
    const diferencia = (cobranzas._sum.monto ?? cero)
      .minus(gastosFijos._sum.monto_pagado ?? cero)
      .minus(gastosDiarios._sum.monto ?? cero)
      .minus(ajustes._sum.monto ?? cero);

    const saldosFinales = new Map<string, Prisma.Decimal>();

    for (const periodoCuenta of periodo.periodo_cuentas) {
      const cuenta = await recalcularSaldoCuenta(tx, periodoCuenta.cuenta_id);

      saldosFinales.set(periodoCuenta.cuenta_id, cuenta.saldo_actual);
      await tx.periodoCuenta.update({
        where: { id: periodoCuenta.id },
        data: { saldo_final: cuenta.saldo_actual },
      });
    }

    const siguienteMes = periodo.mes === 12 ? 1 : periodo.mes + 1;
    const siguienteAnio = periodo.mes === 12 ? periodo.anio + 1 : periodo.anio;
    let periodoSiguiente = await tx.periodo.findFirst({
      where: { anio: siguienteAnio, mes: siguienteMes },
    });

    periodoSiguiente ??= await tx.periodo.create({
      data: { anio: siguienteAnio, mes: siguienteMes },
    });

    for (const [cuentaId, saldoFinal] of saldosFinales) {
      const siguientePeriodoCuenta = await tx.periodoCuenta.findFirst({
        where: {
          periodo_id: periodoSiguiente.id,
          cuenta_id: cuentaId,
        },
      });

      if (siguientePeriodoCuenta) {
        await tx.periodoCuenta.update({
          where: { id: siguientePeriodoCuenta.id },
          data: { saldo_inicial: saldoFinal },
        });
      } else {
        await validarPeriodoCuentaConCliente(tx, cuentaId);
        await tx.periodoCuenta.create({
          data: {
            periodo_id: periodoSiguiente.id,
            cuenta_id: cuentaId,
            saldo_inicial: saldoFinal,
          },
        });
      }
    }

    return tx.periodo.update({
      where: { id: periodoId },
      data: {
        cerrado: true,
        fecha_cierre: new Date(),
        diferencia,
      },
    });
  });
}

export async function cerrarObra(obraId: string) {
  return prisma.obra.update({
    where: { id: obraId },
    data: { estado: EstadoObra.CERRADA },
  });
}
