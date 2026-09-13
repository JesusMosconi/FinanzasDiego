"use server";

import { EstadoObra, TipoCobranza, TipoCuenta } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import {
  crearIngreso,
  crearMovimiento,
  crearTransferencia,
} from "@/lib/finanzas";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type NuevoRegistroState = { ok: boolean; message: string };

async function hasSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return Boolean(token && (await verifySessionToken(token)));
}

function fechaConHoraReal(dateValue: string) {
  const ahora = new Date();
  if (!dateValue) return ahora;

  const partes = new Intl.DateTimeFormat("en-CA", {
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(ahora);
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    partes.find((parte) => parte.type === tipo)?.value ?? "00";
  const hoy = `${valor("year")}-${valor("month")}-${valor("day")}`;

  if (dateValue === hoy) return ahora;
  return new Date(
    `${dateValue}T${valor("hour")}:${valor("minute")}:${valor("second")}-03:00`,
  );
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
  const date = fechaConHoraReal(dateValue);

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
      await crearMovimiento({
        cuentaOrigenId: originId,
        periodoId: periodId,
        monto: amount,
        concepto: concept,
        fecha: date,
        categoria: "EGRESO",
        observaciones: observations,
      });
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
