"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { BottomNav } from "@/components/bottom-nav";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { useToast } from "@/components/toast-provider";

import {
  borrarObraAction,
  cerrarObraAction,
  crearObraAction,
  editarObraAction,
  type ObrasActionState,
} from "./actions";

export type MovimientoObraView = {
  id: string;
  fecha: string;
  concepto: string;
  monto: number;
  entrada: boolean;
  contraparte: string;
};

export type ObraView = {
  id: string;
  cliente: string;
  descripcion: string;
  saldo: number;
  movimientos: MovimientoObraView[];
};

const initialState: ObrasActionState = { ok: false, message: "" };
const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const movementDate = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "America/Argentina/Buenos_Aires",
});

export function ObrasClient({
  obras,
  periodoId,
  periodoLabel,
}: {
  obras: ObraView[];
  periodoId: string | null;
  periodoLabel: string;
}) {
  const [creando, setCreando] = useState(false);
  const saldoTotal = obras.reduce((total, obra) => total + obra.saldo, 0);

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#45464d]">
              Anticipos activos
            </span>
            <h1 className="text-2xl leading-8 font-bold tracking-tight">
              Obras
            </h1>
            <span className="text-xs font-semibold text-[#00714d] capitalize">
              {periodoLabel}
            </span>
          </div>
          <button
            className="flex min-h-11 items-center gap-1.5 rounded-lg bg-[#00714d] px-3 text-xs font-semibold text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            disabled={!periodoId}
            onClick={() => setCreando(true)}
            type="button"
          >
            <span aria-hidden="true" className="text-lg">
              +
            </span>
            Nueva obra
          </button>
        </section>

        <section className="grid grid-cols-2 gap-2 rounded-xl bg-[#dce9ff] p-4 shadow-sm">
          <Metric label="Obras activas" value={String(obras.length)} />
          <Metric
            label="Anticipos disponibles"
            value={money.format(saldoTotal)}
          />
        </section>

        {obras.length === 0 ? (
          <section className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold">No hay obras activas</p>
            <p className="mt-1 text-xs text-[#45464d]">
              Crea una obra para registrar su anticipo inicial.
            </p>
          </section>
        ) : (
          <section className="space-y-2">
            {obras.map((obra) => (
              <ObraCard key={obra.id} obra={obra} periodoId={periodoId} />
            ))}
          </section>
        )}
      </main>

      <BottomNav active="works" />

      {creando && periodoId ? (
        <CrearObraDialog
          onClose={() => setCreando(false)}
          periodoId={periodoId}
        />
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white p-3 shadow-sm">
      <span className="block text-[10px] text-[#45464d]">{label}</span>
      <strong className="mt-0.5 block truncate text-base">{value}</strong>
    </div>
  );
}

function ObraCard({
  obra,
  periodoId,
}: {
  obra: ObraView;
  periodoId: string | null;
}) {
  const [abierta, setAbierta] = useState(false);
  const [confirmingClose, setConfirmingClose] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(
    cerrarObraAction,
    initialState,
  );
  const [deleteState, deleteAction, deletePending] = useActionState(
    borrarObraAction,
    initialState,
  );
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const showToast = useToast();

  useEffect(() => {
    if (state.ok && state.message) showToast(state.message);
  }, [showToast, state]);

  useEffect(() => {
    if (deleteState.ok && deleteState.message) showToast(deleteState.message);
  }, [deleteState, showToast]);

  return (
    <article className="overflow-hidden rounded-xl bg-white shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
      <button
        aria-expanded={abierta}
        className="flex min-h-20 w-full items-center justify-between gap-3 p-4 text-left"
        onClick={() => setAbierta((actual) => !actual)}
        type="button"
      >
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold">{obra.cliente}</h2>
          <p className="truncate text-xs text-[#45464d]">{obra.descripcion}</p>
          <span className="mt-1 inline-block rounded-full bg-[#6cf8bb]/45 px-2 py-0.5 text-[10px] font-bold text-[#005236]">
            Activa
          </span>
        </div>
        <div className="shrink-0 text-right">
          <span className="block text-[10px] text-[#45464d]">Anticipo</span>
          <strong className="text-base text-[#00714d]">
            {money.format(obra.saldo)}
          </strong>
          <span className="ml-2 text-[#76777d]">{abierta ? "⌃" : "⌄"}</span>
        </div>
      </button>

      {abierta ? (
        <div className="space-y-3 border-t border-[#eff4ff] p-4">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-[0.08em] text-[#45464d]">
              Historial del anticipo
            </h3>
            {obra.movimientos.length === 0 ? (
              <p className="mt-2 rounded-lg bg-[#eff4ff] p-3 text-xs text-[#45464d]">
                Todavía no hay movimientos.
              </p>
            ) : (
              <div className="mt-2 divide-y divide-[#eff4ff]">
                {obra.movimientos.map((movimiento) => (
                  <div
                    className="flex items-center justify-between gap-2 py-2.5"
                    key={movimiento.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">
                        {movimiento.concepto}
                      </p>
                      <span className="text-[11px] text-[#45464d]">
                        {movementDate.format(new Date(movimiento.fecha))} ·{" "}
                        {movimiento.contraparte}
                      </span>
                    </div>
                    <strong
                      className={`shrink-0 text-sm ${movimiento.entrada ? "text-[#00714d]" : "text-[#93000a]"}`}
                    >
                      {movimiento.entrada ? "+" : "-"}
                      {money.format(movimiento.monto)}
                    </strong>
                  </div>
                ))}
              </div>
            )}
          </div>

          {state.message ? (
            <p
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${state.ok ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
            >
              {state.message}
            </p>
          ) : null}
          {deleteState.message ? (
            <p className="rounded-lg bg-[#ffdad6] px-3 py-2 text-xs font-semibold text-[#93000a]">
              {deleteState.message}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <button
              className="min-h-9 rounded-lg bg-[#e5eeff] px-3 text-xs font-semibold"
              onClick={() => setEditing(true)}
              type="button"
            >
              Editar obra
            </button>
            <form action={deleteAction} ref={deleteFormRef}>
              <input name="obraId" type="hidden" value={obra.id} />
              <button
                className="min-h-9 rounded-lg px-3 text-xs font-semibold text-[#93000a]"
                disabled={deletePending}
                onClick={() => setConfirmingDelete(true)}
                type="button"
              >
                Eliminar obra
              </button>
              <ConfirmDialog
                confirmLabel="Eliminar obra"
                danger
                description="Sólo se eliminará si no tiene actividad financiera además del anticipo inicial."
                onClose={() => setConfirmingDelete(false)}
                onConfirm={() => {
                  setConfirmingDelete(false);
                  deleteFormRef.current?.requestSubmit();
                }}
                open={confirmingDelete}
                pending={deletePending}
                title={`¿Eliminar la obra de ${obra.cliente}?`}
              />
            </form>
          </div>
          <form action={action} ref={closeFormRef}>
            <input name="obraId" type="hidden" value={obra.id} />
            <input name="periodoId" type="hidden" value={periodoId ?? ""} />
            <button
              className="min-h-11 w-full rounded-lg bg-[#131b2e] px-3 text-sm font-semibold text-white disabled:opacity-50"
              disabled={!periodoId || pending}
              onClick={() => setConfirmingClose(true)}
              type="button"
            >
              {pending
                ? "Cerrando..."
                : `Cerrar obra y liquidar ${money.format(Math.max(obra.saldo, 0))}`}
            </button>
            <ConfirmDialog
              confirmLabel="Cerrar obra"
              description={`El remanente de ${money.format(Math.max(obra.saldo, 0))} se transferirá a Cobranzas.`}
              onClose={() => setConfirmingClose(false)}
              onConfirm={() => {
                setConfirmingClose(false);
                closeFormRef.current?.requestSubmit();
              }}
              open={confirmingClose}
              pending={pending}
              title={`¿Cerrar la obra de ${obra.cliente}?`}
            />
          </form>
        </div>
      ) : null}
      {editing ? (
        <EditarObraDialog obra={obra} onClose={() => setEditing(false)} />
      ) : null}
    </article>
  );
}

function EditarObraDialog({
  obra,
  onClose,
}: {
  obra: ObraView;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    editarObraAction,
    initialState,
  );
  const [clientError, setClientError] = useState("");
  const showToast = useToast();

  useEffect(() => {
    if (state.ok && state.message) showToast(state.message);
  }, [showToast, state]);
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#213145]/60 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        action={action}
        className="w-full max-w-md space-y-4 rounded-2xl bg-[#f8f9ff] p-4 shadow-2xl"
        noValidate
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const error =
            !String(data.get("cliente") ?? "").trim() ||
            !String(data.get("descripcion") ?? "").trim()
              ? "Completá cliente y descripción."
              : "";
          if (error) {
            event.preventDefault();
            setClientError(error);
          } else setClientError("");
        }}
      >
        <input name="obraId" type="hidden" value={obra.id} />
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-semibold">Editar obra</h2>
            <p className="text-xs text-[#45464d]">
              El saldo y el historial no se modificarán.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eeff]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <label className="block text-xs font-semibold">
          Cliente
          <input
            autoFocus
            className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
            defaultValue={obra.cliente}
            name="cliente"
          />
        </label>
        <label className="block text-xs font-semibold">
          Descripción
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none ring-[#00714d] focus:ring-2"
            defaultValue={obra.descripcion}
            name="descripcion"
          />
        </label>
        {clientError || state.message ? (
          <p
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${!clientError && state.ok ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {clientError || state.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl bg-[#e5eeff] py-3 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-[#00714d] py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CrearObraDialog({
  periodoId,
  onClose,
}: {
  periodoId: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    crearObraAction,
    initialState,
  );
  const [clientError, setClientError] = useState("");
  const showToast = useToast();

  useEffect(() => {
    if (state.ok && state.message) showToast(state.message);
  }, [showToast, state]);

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#213145]/60 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        action={action}
        className="w-full max-w-md space-y-4 rounded-2xl bg-[#f8f9ff] p-4 shadow-2xl"
        noValidate
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const cliente = String(data.get("cliente") ?? "").trim();
          const descripcion = String(data.get("descripcion") ?? "").trim();
          const monto = Number(data.get("montoInicial"));
          let error = "";
          if (!cliente) error = "Completá el nombre del cliente.";
          else if (!descripcion) error = "Completá la descripción.";
          else if (!Number.isFinite(monto) || monto <= 0)
            error = "Ingresá un anticipo mayor a cero.";
          if (error) {
            event.preventDefault();
            setClientError(error);
          } else setClientError("");
        }}
      >
        <input name="periodoId" type="hidden" value={periodoId} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Nueva obra</h2>
            <p className="text-xs text-[#45464d]">
              Se creará una caja de Anticipo exclusiva para esta obra.
            </p>
          </div>
          <button
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e5eeff]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <label className="block text-xs font-semibold">
          Cliente
          <input
            autoFocus
            className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
            name="cliente"
            placeholder="Nombre del cliente"
            required
          />
        </label>
        <label className="block text-xs font-semibold">
          Descripción
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none ring-[#00714d] focus:ring-2"
            name="descripcion"
            placeholder="Trabajo a realizar"
            required
          />
        </label>
        <label className="block text-xs font-semibold">
          Monto inicial del anticipo
          <input
            className="mt-1 h-12 w-full rounded-xl bg-white px-3 text-lg font-bold outline-none ring-[#00714d] focus:ring-2"
            min="0.01"
            name="montoInicial"
            placeholder="0"
            required
            step="0.01"
            type="number"
          />
        </label>
        {clientError || state.message ? (
          <p
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${!clientError && state.ok ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {clientError || state.message}
          </p>
        ) : null}
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl bg-[#e5eeff] py-3 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-[#00714d] py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={pending}
            type="submit"
          >
            {pending ? "Guardando..." : state.ok ? "Crear otra" : "Crear obra"}
          </button>
        </div>
      </form>
    </div>
  );
}
