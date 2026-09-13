"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { borrarObra, cerrarObra, crearObra, editarObra } from "@/lib/finanzas";

export type ObrasActionState = { ok: boolean; message: string };

async function hasSession() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  return Boolean(token && (await verifySessionToken(token)));
}

export async function crearObraAction(
  _state: ObrasActionState,
  formData: FormData,
): Promise<ObrasActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };

  const periodoId = String(formData.get("periodoId") ?? "");
  const cliente = String(formData.get("cliente") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  const montoInicial = Number(
    String(formData.get("montoInicial") ?? "").replace(",", "."),
  );

  if (
    !periodoId ||
    !cliente ||
    !descripcion ||
    !Number.isFinite(montoInicial) ||
    montoInicial <= 0
  ) {
    return { ok: false, message: "Revisá los datos de la obra." };
  }

  try {
    await crearObra({ cliente, descripcion, montoInicial, periodoId });
    revalidarObras();
    return { ok: true, message: "Obra creada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo crear la obra.",
    };
  }
}

export async function cerrarObraAction(
  _state: ObrasActionState,
  formData: FormData,
): Promise<ObrasActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };

  const obraId = String(formData.get("obraId") ?? "");
  const periodoId = String(formData.get("periodoId") ?? "");
  if (!obraId || !periodoId) {
    return { ok: false, message: "No se pudo identificar la obra." };
  }

  try {
    await cerrarObra(obraId, periodoId);
    revalidarObras();
    return { ok: true, message: "Obra cerrada y anticipo liquidado." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo cerrar la obra.",
    };
  }
}

export async function editarObraAction(
  _state: ObrasActionState,
  formData: FormData,
): Promise<ObrasActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const obraId = String(formData.get("obraId") ?? "");
  const cliente = String(formData.get("cliente") ?? "").trim();
  const descripcion = String(formData.get("descripcion") ?? "").trim();
  if (!obraId || !cliente || !descripcion) {
    return { ok: false, message: "Completá cliente y descripción." };
  }
  try {
    await editarObra(obraId, { cliente, descripcion });
    revalidarObras();
    return { ok: true, message: "Obra actualizada correctamente." };
  } catch {
    return { ok: false, message: "No se pudo actualizar la obra." };
  }
}

export async function borrarObraAction(
  _state: ObrasActionState,
  formData: FormData,
): Promise<ObrasActionState> {
  if (!(await hasSession())) return { ok: false, message: "La sesión venció." };
  const obraId = String(formData.get("obraId") ?? "");
  if (!obraId) return { ok: false, message: "No se pudo identificar la obra." };
  try {
    await borrarObra(obraId);
    revalidarObras();
    return { ok: true, message: "Obra eliminada correctamente." };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error ? error.message : "No se pudo eliminar la obra.",
    };
  }
}

function revalidarObras() {
  revalidatePath("/app");
  revalidatePath("/app/obras");
  revalidatePath("/app/movimientos");
  revalidatePath("/app", "layout");
}
