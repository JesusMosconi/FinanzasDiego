"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";

import { cerrarPeriodoAction, type CerrarPeriodoState } from "./actions";

const initialState: CerrarPeriodoState = { ok: false, message: "" };

export function CerrarPeriodoButton({
  periodoId,
  periodoLabel,
}: {
  periodoId: string;
  periodoLabel: string;
}) {
  const [state, action, pending] = useActionState(
    cerrarPeriodoAction,
    initialState,
  );
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const showToast = useToast();

  useEffect(() => {
    if (state.ok && state.message) showToast(state.message);
  }, [showToast, state]);

  return (
    <form action={action} className="shrink-0 text-right" ref={formRef}>
      <input name="periodoId" type="hidden" value={periodoId} />
      <button
        className="flex items-center gap-1 rounded-lg bg-[#131b2e] px-3 py-2.5 text-xs font-semibold text-white disabled:opacity-50"
        disabled={pending}
        onClick={() => setConfirming(true)}
        type="button"
      >
        {pending ? "Cerrando..." : "Cerrar mes"}
        <span aria-hidden="true">›</span>
      </button>
      {state.message && !state.ok ? (
        <span className="mt-1 block max-w-36 text-[10px] font-semibold text-[#93000a]">
          {state.message}
        </span>
      ) : null}
      <ConfirmDialog
        confirmLabel="Cerrar mes"
        description={`Se guardarán los saldos finales de ${periodoLabel} y se abrirá el mes siguiente.`}
        onClose={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          formRef.current?.requestSubmit();
        }}
        open={confirming}
        pending={pending}
        title="¿Cerrar este mes?"
      />
    </form>
  );
}
