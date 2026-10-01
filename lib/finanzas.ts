import { EstadoObra, Prisma, TipoCobranza, TipoCuenta } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const TIPOS_CON_PERIODO = new Set<TipoCuenta>([
  TipoCuenta.CAJA_DIARIA,
  TipoCuenta.RESIDUALES,
]);

type TransactionClient = Prisma.TransactionClient;
type DecimalInput = Prisma.MovimientoUncheckedCreateInput["monto"];

export type CrearMovimientoInput = {
  cuentaOrigenId?: string | null;
  cuentaDestinoId?: string | null;
  gastoFijoId?: string | null;
  periodoId: string;
  fecha: Date | string;
  concepto: string;
  monto: DecimalInput;
  categoria: string;
  observaciones?: string | null;
};

export type CrearIngresoInput = {
  cuentaDestinoId: string;
  periodoId: string;
  monto: DecimalInput;
  concepto: string;
  fecha?: Date | string;
  categoria?: string;
  observaciones?: string | null;
  cobranza?: {
    tipo: TipoCobranza;
    obraId?: string | null;
  };
};

export type EditarMovimientoInput = Partial<CrearMovimientoInput>;

export type PagarGastoFijoInput = {
  gastoFijoId: string;
  cuentaOrigenId: string;
  periodoId: string;
  monto: DecimalInput;
  fecha?: Date | string;
  concepto?: string;
  observaciones?: string | null;
};

export type CrearGastoFijoInput = {
  grupo: string;
  obligacion: string;
  montoTotal: DecimalInput;
  venceDia: number;
  periodoId: string;
};

export type EditarGastoFijoInput = {
  gastoFijoId: string;
  grupo: string;
  obligacion: string;
  montoTotal: DecimalInput;
  venceDia: number;
};

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

export type CrearObraInput = {
  cliente: string;
  descripcion: string;
  montoInicial: DecimalInput;
  periodoId: string;
  fecha?: Date | string;
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

async function sumarMovimientosGastoFijo(
  tx: TransactionClient,
  gastoFijoId: string,
) {
  const movimientos = await tx.movimiento.aggregate({
    where: { gasto_fijo_id: gastoFijoId },
    _sum: { monto: true },
  });

  return movimientos._sum.monto ?? new Prisma.Decimal(0);
}

async function validarPeriodoAbierto(tx: TransactionClient, periodoId: string) {
  const periodo = await tx.periodo.findUnique({
    where: { id: periodoId },
    select: { cerrado: true },
  });

  if (!periodo) throw new Error("El periodo no existe.");
  if (periodo.cerrado) {
    throw new Error(
      "No se pueden registrar operaciones en un periodo cerrado.",
    );
  }
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

export async function calcularMontoPagadoGastoFijo(gastoFijoId: string) {
  return prisma.$transaction((tx) =>
    sumarMovimientosGastoFijo(tx, gastoFijoId),
  );
}

export async function crearGastoFijo(data: CrearGastoFijoInput) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoAbierto(tx, data.periodoId);
    return tx.gastoFijo.create({
      data: {
        grupo: data.grupo,
        obligacion: data.obligacion,
        monto_total: data.montoTotal,
        vence_dia: data.venceDia,
        periodo_id: data.periodoId,
      },
    });
  });
}

export async function editarGastoFijo(data: EditarGastoFijoInput) {
  return prisma.$transaction(async (tx) => {
    const gastoFijo = await tx.gastoFijo.findUniqueOrThrow({
      where: { id: data.gastoFijoId },
      select: { periodo_id: true, fecha_pago: true },
    });
    await validarPeriodoAbierto(tx, gastoFijo.periodo_id);

    const [montoPagado, ultimoPago] = await Promise.all([
      sumarMovimientosGastoFijo(tx, data.gastoFijoId),
      tx.movimiento.findFirst({
        where: { gasto_fijo_id: data.gastoFijoId },
        select: { fecha: true },
        orderBy: [{ fecha: "desc" }, { createdAt: "desc" }],
      }),
    ]);
    const montoTotal = new Prisma.Decimal(String(data.montoTotal));
    if (montoTotal.lessThan(montoPagado)) {
      throw new Error("El monto total no puede ser menor que lo ya pagado.");
    }

    const pagado = montoPagado.greaterThanOrEqualTo(montoTotal);
    return tx.gastoFijo.update({
      where: { id: data.gastoFijoId },
      data: {
        grupo: data.grupo,
        obligacion: data.obligacion,
        monto_total: montoTotal,
        vence_dia: data.venceDia,
        pagado,
        fecha_pago: pagado
          ? (gastoFijo.fecha_pago ?? ultimoPago?.fecha ?? null)
          : null,
      },
    });
  });
}

export async function borrarGastoFijo(gastoFijoId: string) {
  return prisma.$transaction(async (tx) => {
    const gastoFijo = await tx.gastoFijo.findUniqueOrThrow({
      where: { id: gastoFijoId },
      select: { periodo_id: true },
    });
    await validarPeriodoAbierto(tx, gastoFijo.periodo_id);

    return tx.gastoFijo.update({
      where: { id: gastoFijoId },
      data: { archivado: true },
    });
  });
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
    await validarPeriodoAbierto(tx, data.periodoId);
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: data.cuentaOrigenId ?? null,
        cuenta_destino_id: data.cuentaDestinoId ?? null,
        gasto_fijo_id: data.gastoFijoId ?? null,
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

export async function crearIngreso(data: CrearIngresoInput) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoAbierto(tx, data.periodoId);
    const cuentaDestino = await tx.cuenta.findUniqueOrThrow({
      where: { id: data.cuentaDestinoId },
      select: { tipo: true },
    });
    const esCobranza = cuentaDestino.tipo === TipoCuenta.COBRANZAS;

    if (esCobranza && !data.cobranza) {
      throw new Error("Un ingreso a Cobranzas requiere indicar su tipo.");
    }
    if (!esCobranza && data.cobranza) {
      throw new Error("Solo los ingresos a Cobranzas generan una cobranza.");
    }

    const fecha = data.fecha ?? new Date();
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: null,
        cuenta_destino_id: data.cuentaDestinoId,
        periodo_id: data.periodoId,
        fecha,
        concepto: data.concepto,
        monto: data.monto,
        categoria: data.categoria ?? "INGRESO",
        observaciones: data.observaciones ?? null,
      },
    });
    const cobranza = esCobranza
      ? await tx.cobranza.create({
          data: {
            obra_id: data.cobranza?.obraId ?? null,
            periodo_id: data.periodoId,
            fecha,
            concepto: data.concepto,
            monto: data.monto,
            tipo: data.cobranza!.tipo,
          },
        })
      : null;

    await recalcularCuentas(tx, [data.cuentaDestinoId]);
    return { movimiento, cobranza };
  });
}

export async function editarMovimiento(
  movimientoId: string,
  data: EditarMovimientoInput,
) {
  return prisma.$transaction(async (tx) => {
    const anterior = await tx.movimiento.findUniqueOrThrow({
      where: { id: movimientoId },
      select: {
        cuenta_origen_id: true,
        cuenta_destino_id: true,
        periodo_id: true,
      },
    });
    await validarPeriodoAbierto(tx, anterior.periodo_id);
    if (data.periodoId && data.periodoId !== anterior.periodo_id) {
      await validarPeriodoAbierto(tx, data.periodoId);
    }
    const movimiento = await tx.movimiento.update({
      where: { id: movimientoId },
      data: {
        cuenta_origen_id: data.cuentaOrigenId,
        cuenta_destino_id: data.cuentaDestinoId,
        gasto_fijo_id: data.gastoFijoId,
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

export async function pagarGastoFijo(data: PagarGastoFijoInput) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoAbierto(tx, data.periodoId);
    const gastoFijo = await tx.gastoFijo.findUniqueOrThrow({
      where: { id: data.gastoFijoId },
      select: {
        obligacion: true,
        monto_total: true,
        fecha_pago: true,
        periodo_id: true,
        archivado: true,
      },
    });
    if (gastoFijo.archivado) {
      throw new Error("No se puede pagar una obligación archivada.");
    }
    if (gastoFijo.periodo_id !== data.periodoId) {
      throw new Error("La obligación no pertenece al período indicado.");
    }
    const fecha = data.fecha ?? new Date();
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: data.cuentaOrigenId,
        cuenta_destino_id: null,
        gasto_fijo_id: data.gastoFijoId,
        periodo_id: data.periodoId,
        fecha,
        concepto: data.concepto ?? `Pago de ${gastoFijo.obligacion}`,
        monto: data.monto,
        categoria: "GASTO_FIJO",
        observaciones: data.observaciones ?? null,
      },
    });

    await recalcularCuentas(tx, [data.cuentaOrigenId]);

    const montoPagado = await sumarMovimientosGastoFijo(tx, data.gastoFijoId);
    await tx.gastoFijo.update({
      where: { id: data.gastoFijoId },
      data: {
        pagado: montoPagado.greaterThanOrEqualTo(gastoFijo.monto_total),
        fecha_pago: gastoFijo.fecha_pago ?? fecha,
      },
    });

    return movimiento;
  });
}

export async function borrarMovimiento(movimientoId: string) {
  return prisma.$transaction(async (tx) => {
    const existente = await tx.movimiento.findUniqueOrThrow({
      where: { id: movimientoId },
      select: { periodo_id: true },
    });
    await validarPeriodoAbierto(tx, existente.periodo_id);
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
    await validarPeriodoAbierto(tx, data.periodoId);
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

export async function crearObra(data: CrearObraInput) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoAbierto(tx, data.periodoId);

    const obra = await tx.obra.create({
      data: {
        cliente: data.cliente,
        descripcion: data.descripcion,
        estado: EstadoObra.ACTIVA,
      },
    });
    const anticipo = await tx.cuenta.create({
      data: {
        tipo: TipoCuenta.ANTICIPO,
        obra_id: obra.id,
        saldo_actual: new Prisma.Decimal(0),
      },
    });
    const movimiento = await tx.movimiento.create({
      data: {
        cuenta_origen_id: null,
        cuenta_destino_id: anticipo.id,
        periodo_id: data.periodoId,
        fecha: data.fecha ?? new Date(),
        concepto: `Anticipo inicial - ${data.cliente}`,
        monto: data.montoInicial,
        categoria: "ANTICIPO",
      },
    });

    await recalcularSaldoCuenta(tx, anticipo.id);
    return { obra, anticipo, movimiento };
  });
}

export async function editarObra(
  obraId: string,
  data: { cliente: string; descripcion: string },
) {
  return prisma.obra.update({
    where: { id: obraId },
    data: { cliente: data.cliente, descripcion: data.descripcion },
  });
}

export async function borrarObra(obraId: string) {
  return prisma.$transaction(async (tx) => {
    const obra = await tx.obra.findUniqueOrThrow({
      where: { id: obraId },
      include: {
        cobranzas: { select: { id: true }, take: 1 },
        cuentas: {
          where: { tipo: TipoCuenta.ANTICIPO },
          include: {
            movimientos_origen: { select: { id: true }, take: 1 },
            movimientos_destino: {
              select: {
                id: true,
                categoria: true,
                cuenta_origen_id: true,
                periodo_id: true,
              },
              take: 2,
            },
          },
          take: 2,
        },
      },
    });
    const anticipo = obra.cuentas[0];
    const movimientoInicial = anticipo?.movimientos_destino[0];
    const estaSinActividad =
      obra.cobranzas.length === 0 &&
      obra.cuentas.length === 1 &&
      anticipo.movimientos_origen.length === 0 &&
      anticipo.movimientos_destino.length === 1 &&
      movimientoInicial?.categoria === "ANTICIPO" &&
      movimientoInicial.cuenta_origen_id === null;

    if (!estaSinActividad) {
      throw new Error(
        "No se puede eliminar una obra que ya tiene actividad financiera.",
      );
    }

    await validarPeriodoAbierto(tx, movimientoInicial.periodo_id);

    await tx.movimiento.delete({ where: { id: movimientoInicial.id } });
    await tx.cuenta.delete({ where: { id: anticipo.id } });
    return tx.obra.delete({ where: { id: obra.id } });
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
      tx.movimiento.aggregate({
        where: { gasto_fijo: { periodo_id: periodoId } },
        _sum: { monto: true },
      }),
      // Un AJUSTE es una correccion aparte del gasto diario; no debe contarse en ambos lados del cierre de periodo.
      tx.movimiento.aggregate({
        where: {
          periodo_id: periodoId,
          cuenta_destino_id: null,
          cuenta_origen: { tipo: TipoCuenta.CAJA_DIARIA },
          categoria: { notIn: ["AJUSTE", "GASTO_FIJO"] },
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
      .minus(gastosFijos._sum.monto ?? cero)
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

export async function cerrarObra(obraId: string, periodoId: string) {
  return prisma.$transaction(async (tx) => {
    await validarPeriodoAbierto(tx, periodoId);

    const obra = await tx.obra.findUniqueOrThrow({
      where: { id: obraId },
      include: {
        cuentas: {
          where: { tipo: TipoCuenta.ANTICIPO },
          take: 2,
        },
      },
    });
    if (obra.estado === EstadoObra.CERRADA) {
      throw new Error("La obra ya esta cerrada.");
    }
    if (obra.cuentas.length !== 1) {
      throw new Error("La obra debe tener una unica cuenta de anticipo.");
    }

    const cuentasCobranzas = await tx.cuenta.findMany({
      where: { tipo: TipoCuenta.COBRANZAS, obra_id: null },
      orderBy: { createdAt: "asc" },
      take: 2,
    });
    if (cuentasCobranzas.length !== 1) {
      throw new Error("Debe existir una unica cuenta de Cobranzas.");
    }

    const anticipo = await recalcularSaldoCuenta(tx, obra.cuentas[0].id);
    if (anticipo.saldo_actual.lessThan(0)) {
      throw new Error("No se puede cerrar una obra con saldo negativo.");
    }

    let movimiento = null;
    if (anticipo.saldo_actual.greaterThan(0)) {
      movimiento = await tx.movimiento.create({
        data: {
          cuenta_origen_id: anticipo.id,
          cuenta_destino_id: cuentasCobranzas[0].id,
          periodo_id: periodoId,
          fecha: new Date(),
          concepto: `Liquidacion de anticipo - ${obra.cliente}`,
          monto: anticipo.saldo_actual,
          categoria: "TRANSFERENCIA",
        },
      });
      await recalcularCuentas(tx, [anticipo.id, cuentasCobranzas[0].id]);
    }

    const obraCerrada = await tx.obra.update({
      where: { id: obra.id },
      data: { estado: EstadoObra.CERRADA },
    });
    return { obra: obraCerrada, movimiento };
  });
}
