"use server";

import { EstadoObra, TipoCobranza, TipoCuenta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  crearIngreso,
  crearMovimiento,
  crearTransferencia,
  pagarGastoFijo,
} from "@/lib/finanzas";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NuevoRegistroState = { ok: boolean; message: string };

async function hasSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return Boolean(token && (await verifySessionToken(token)));
}

export async function guardarNuevoRegistro(
  _state: NuevoRegistroState,
  formData: FormData,
): Promise<NuevoRegistroState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };

  const operation = String(formData.get("operacion") ?? "");
  const periodId = String(formData.get("periodoId") ?? "");
  const concept = String(formData.get("concepto") ?? "").trim();
  const amount = Number(String(formData.get("monto") ?? "").replace(",", "."));
  const observations =
    String(formData.get("observaciones") ?? "").trim() || null;
  const dateValue = String(formData.get("fecha") ?? "");
  const date = dateValue ? new Date(`${dateValue}T12:00:00`) : new Date();

  if (!periodId || !concept || !Number.isFinite(amount) || amount <= 0) {
    return { ok: false, message: "Completá monto y concepto." };
  }

  try {
    if (operation === "ingreso") {
      const destinationId = String(formData.get("cuentaDestinoId") ?? "");
      const destination = await prisma.cuenta.findUniqueOrThrow({
        where: { id: destinationId },
        include: { obra: { select: { estado: true } } },
      });
      if (
        destination.tipo === TipoCuenta.ANTICIPO &&
        destination.obra?.estado !== EstadoObra.ACTIVA
      ) {
        return { ok: false, message: "Elegí el anticipo de una obra activa." };
      }

      const collectionType = formData.get("tipoCobranza");
      const collection =
        destination.tipo === TipoCuenta.COBRANZAS
          ? {
              tipo: collectionType as TipoCobranza,
              obraId:
                collectionType === TipoCobranza.MANO_OBRA
                  ? String(formData.get("obraId") ?? "") || null
                  : null,
            }
          : undefined;
      if (
        destination.tipo === TipoCuenta.COBRANZAS &&
        !Object.values(TipoCobranza).includes(collectionType as TipoCobranza)
      ) {
        return { ok: false, message: "Indicá el tipo de cobranza." };
      }

      await crearIngreso({
        cuentaDestinoId: destinationId,
        periodoId: periodId,
        monto: amount,
        concepto: concept,
        fecha: date,
        observaciones: observations,
        cobranza: collection,
      });
    } else if (operation === "pase") {
      const originId = String(formData.get("cuentaOrigenId") ?? "");
      const destinationId = String(formData.get("cuentaDestinoId") ?? "");
      await crearTransferencia({
        cuentaOrigenId: originId,
        cuentaDestinoId: destinationId,
        periodoId: periodId,
        monto: amount,
        concepto: concept,
        fecha: date,
      });
    } else if (operation === "egreso") {
      const originId = String(formData.get("cuentaOrigenId") ?? "");
      const fixedExpenseId = String(formData.get("gastoFijoId") ?? "");
      if (fixedExpenseId) {
        await pagarGastoFijo({
          gastoFijoId: fixedExpenseId,
          cuentaOrigenId: originId,
          periodoId: periodId,
          monto: amount,
          fecha: date,
          concepto: concept,
          observaciones: observations,
        });
      } else {
        await crearMovimiento({
          cuentaOrigenId: originId,
          periodoId: periodId,
          monto: amount,
          concepto: concept,
          fecha: date,
          categoria: String(formData.get("categoria") ?? "OTROS"),
          observaciones: observations,
        });
      }
    } else {
      return { ok: false, message: "Elegí el tipo de registro." };
    }

    revalidatePath("/app", "layout");
    return { ok: true, message: "Registro guardado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "No se pudo guardar.",
    };
  }
}
