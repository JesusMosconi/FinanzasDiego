"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { cerrarPeriodo } from "@/lib/finanzas";

export type CerrarPeriodoState = { ok: boolean; message: string };

export async function cerrarPeriodoAction(
  _state: CerrarPeriodoState,
  formData: FormData,
): Promise<CerrarPeriodoState> {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token || !(await verifySessionToken(token))) {
    return { ok: false, message: "La sesión venció." };
  }

  const periodoId = String(formData.get("periodoId") ?? "");
  if (!periodoId) {
    return { ok: false, message: "No hay un período abierto para cerrar." };
  }

  try {
    await cerrarPeriodo(periodoId);
    revalidatePath("/app", "layout");
    return { ok: true, message: "Mes cerrado correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo cerrar el mes.",
    };
  }
}
