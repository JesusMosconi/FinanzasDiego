"use server";

import { EstadoObra, TipoCuenta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import {
  borrarGastoFijo,
  calcularMontoPagadoGastoFijo,
  crearGastoFijo,
  editarGastoFijo,
  pagarGastoFijo,
} from "@/lib/finanzas";
import { prisma } from "@/lib/prisma";

export type ActionState = { ok: boolean; message: string };

async function hasSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return Boolean(token && (await verifySessionToken(token)));
}

export async function crearGastoFijoAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const periodoId = String(formData.get("periodoId") ?? "");
  const grupoPredefinido = String(
    formData.get("grupoPredefinido") ?? "",
  ).trim();
  const grupo =
    grupoPredefinido === "OTRO"
      ? String(formData.get("grupo") ?? "").trim()
      : grupoPredefinido;
  const obligacion = String(formData.get("obligacion") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").replace(",", "."));
  const venceDia = Number(formData.get("venceDia"));

  if (
    !periodoId ||
    !grupo ||
    !obligacion ||
    !Number.isFinite(monto) ||
    monto <= 0 ||
    !Number.isInteger(venceDia) ||
    venceDia < 1 ||
    venceDia > 31
  ) {
    return { ok: false, message: "Revisá los datos de la obligación." };
  }

  try {
    await crearGastoFijo({
      grupo,
      obligacion,
      montoTotal: monto,
      venceDia,
      periodoId,
    });
    revalidatePath("/app/fijos");
    return { ok: true, message: "Obligación agregada correctamente." };
  } catch {
    return { ok: false, message: "No se pudo agregar la obligación." };
  }
}

export async function editarGastoFijoAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const gastoFijoId = String(formData.get("gastoFijoId") ?? "");
  const grupoPredefinido = String(
    formData.get("grupoPredefinido") ?? "",
  ).trim();
  const grupo =
    grupoPredefinido === "OTRO"
      ? String(formData.get("grupo") ?? "").trim()
      : grupoPredefinido;
  const obligacion = String(formData.get("obligacion") ?? "").trim();
  const monto = Number(String(formData.get("monto") ?? "").replace(",", "."));
  const venceDia = Number(formData.get("venceDia"));

  if (
    !gastoFijoId ||
    !grupo ||
    !obligacion ||
    !Number.isFinite(monto) ||
    monto <= 0 ||
    !Number.isInteger(venceDia) ||
    venceDia < 1 ||
    venceDia > 31
  ) {
    return { ok: false, message: "Revisá los datos de la obligación." };
  }

  try {
    await editarGastoFijo({
      gastoFijoId,
      grupo,
      obligacion,
      montoTotal: monto,
      venceDia,
    });
    revalidatePath("/app");
    revalidatePath("/app/deudas");
    revalidatePath("/app/fijos");
    revalidatePath("/app/movimientos");
    return { ok: true, message: "Obligación actualizada correctamente." };
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "El monto total no puede ser menor que lo ya pagado."
    ) {
      return { ok: false, message: error.message };
    }
    return { ok: false, message: "No se pudo actualizar la obligación." };
  }
}

export async function borrarGastoFijoAction(formData: FormData) {
  if (!(await hasSession())) return;
  const gastoFijoId = String(formData.get("gastoFijoId") ?? "");
  if (!gastoFijoId) return;

  await borrarGastoFijo(gastoFijoId);
  revalidatePath("/app");
  revalidatePath("/app/movimientos");
  revalidatePath("/app/fijos");
}

export async function registrarPagoAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const gastoFijoId = String(formData.get("gastoFijoId") ?? "");
  const cuentaOrigenId = String(formData.get("cuentaOrigenId") ?? "");
  const montoText = String(formData.get("monto") ?? "").replace(",", ".");
  const monto = Number(montoText);

  if (
    !gastoFijoId ||
    !cuentaOrigenId ||
    !Number.isFinite(monto) ||
    monto <= 0
  ) {
    return { ok: false, message: "Completá el monto y la caja de origen." };
  }

  try {
    const [fixedExpense, paidAmount, sourceAccount] = await Promise.all([
      prisma.gastoFijo.findUniqueOrThrow({
        where: { id: gastoFijoId },
        select: { monto_total: true, periodo_id: true, archivado: true },
      }),
      calcularMontoPagadoGastoFijo(gastoFijoId),
      prisma.cuenta.findUniqueOrThrow({
        where: { id: cuentaOrigenId },
        include: { obra: { select: { estado: true } } },
      }),
    ]);
    const remaining = fixedExpense.monto_total.minus(paidAmount);

    if (fixedExpense.archivado) {
      return { ok: false, message: "Esta obligación está archivada." };
    }
    if (remaining.lessThanOrEqualTo(0)) {
      return { ok: false, message: "Esta obligación ya está saldada." };
    }
    if (monto > remaining.toNumber()) {
      return { ok: false, message: "El monto supera el saldo pendiente." };
    }
    if (
      sourceAccount.tipo === TipoCuenta.ANTICIPO &&
      sourceAccount.obra?.estado !== EstadoObra.ACTIVA
    ) {
      return { ok: false, message: "Elegí el anticipo de una obra activa." };
    }

    await pagarGastoFijo({
      gastoFijoId,
      cuentaOrigenId,
      periodoId: fixedExpense.periodo_id,
      monto,
    });
    revalidatePath("/app");
    revalidatePath("/app/movimientos");
    revalidatePath("/app/fijos");
    return { ok: true, message: "Pago registrado correctamente." };
  } catch {
    return { ok: false, message: "No se pudo registrar el pago." };
  }
}

export async function duplicarMesAnteriorAction(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const periodoId = String(formData.get("periodoId") ?? "");
  if (!periodoId)
    return { ok: false, message: "No hay un período seleccionado." };

  try {
    const currentPeriod = await prisma.periodo.findUniqueOrThrow({
      where: { id: periodoId },
      include: {
        _count: {
          select: {
            gastos_fijos: { where: { archivado: false } },
          },
        },
      },
    });
    if (currentPeriod.cerrado) {
      return { ok: false, message: "El período seleccionado está cerrado." };
    }
    if (currentPeriod._count.gastos_fijos > 0) {
      return { ok: false, message: "El período actual ya tiene obligaciones." };
    }

    const previousMonth = currentPeriod.mes === 1 ? 12 : currentPeriod.mes - 1;
    const previousYear =
      currentPeriod.mes === 1 ? currentPeriod.anio - 1 : currentPeriod.anio;
    const previousExpenses = await prisma.gastoFijo.findMany({
      where: {
        archivado: false,
        periodo: { anio: previousYear, mes: previousMonth },
      },
      select: {
        grupo: true,
        obligacion: true,
        monto_total: true,
        vence_dia: true,
      },
    });

    if (previousExpenses.length === 0) {
      return {
        ok: false,
        message: "El mes anterior no tiene obligaciones para duplicar.",
      };
    }

    await prisma.gastoFijo.createMany({
      data: previousExpenses.map((expense) => ({
        grupo: expense.grupo,
        obligacion: expense.obligacion,
        monto_total: expense.monto_total,
        vence_dia: expense.vence_dia,
        periodo_id: periodoId,
      })),
    });
    revalidatePath("/app/fijos");
    return { ok: true, message: "Lista duplicada desde el mes anterior." };
  } catch {
    return { ok: false, message: "No se pudo duplicar el mes anterior." };
  }
}
