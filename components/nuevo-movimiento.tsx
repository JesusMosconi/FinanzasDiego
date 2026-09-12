"use client";

import { createContext, useActionState, useContext, useState } from "react";

import {
  guardarNuevoRegistro,
  type NuevoRegistroState,
} from "@/app/app/nuevo-registro-actions";

export type ModalAccount = {
  id: string;
  name: string;
  type: "CAJA_DIARIA" | "RESIDUALES" | "COBRANZAS" | "ANTICIPO";
};

type ModalOptions = {
  periodId: string | null;
  accounts: ModalAccount[];
  works: { id: string; name: string }[];
  fixedExpenses: { id: string; name: string }[];
};

const ModalContext = createContext<(() => void) | null>(null);
const initialState: NuevoRegistroState = { ok: false, message: "" };

export function NuevoMovimientoProvider({
  children,
  options,
}: {
  children: React.ReactNode;
  options: ModalOptions;
}) {
  const [open, setOpen] = useState(false);
  return (
    <ModalContext value={() => setOpen(true)}>
      {children}
      {open ? (
        <NuevoMovimientoDialog
          options={options}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </ModalContext>
  );
}

export function NuevoMovimientoTrigger() {
  const open = useContext(ModalContext);
  return (
    <button
      aria-label="Agregar nuevo registro"
      className="flex h-12 w-12 items-center justify-center rounded-full bg-[#00714d] text-2xl text-white shadow-lg transition active:scale-95 disabled:opacity-50"
      disabled={!open}
      onClick={() => open?.()}
      type="button"
    >
      +
    </button>
  );
}

function NuevoMovimientoDialog({
  options,
  onClose,
}: {
  options: ModalOptions;
  onClose: () => void;
}) {
  const [operation, setOperation] = useState<"ingreso" | "egreso" | "pase">(
    "egreso",
  );
  const [destinationId, setDestinationId] = useState("");
  const [fixedExpenseId, setFixedExpenseId] = useState("");
  const [collectionType, setCollectionType] = useState("MANO_OBRA");
  const [state, action, pending] = useActionState(
    guardarNuevoRegistro,
    initialState,
  );
  const destination = options.accounts.find(
    (account) => account.id === destinationId,
  );
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-[#213145]/60 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        action={action}
        className="max-h-[92dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-[#f8f9ff] p-4 shadow-2xl"
      >
        <input name="periodoId" type="hidden" value={options.periodId ?? ""} />
        <input name="operacion" type="hidden" value={operation} />
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#00714d]">
              Carga rápida
            </span>
            <h2 className="text-xl font-semibold">Nuevo registro</h2>
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

        <div className="grid grid-cols-3 rounded-full bg-[#e5eeff] p-1 text-xs font-semibold">
          {(
            [
              ["ingreso", "Ingreso"],
              ["egreso", "Egreso"],
              ["pase", "Pase"],
            ] as const
          ).map(([value, label]) => (
            <button
              className={`min-h-9 rounded-full ${operation === value ? "bg-white shadow-sm" : "text-[#45464d]"}`}
              key={value}
              onClick={() => setOperation(value)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[1fr_130px] gap-2">
          <label className="text-xs font-semibold">
            Monto
            <input
              autoFocus
              className="mt-1 h-12 w-full rounded-xl bg-white px-3 text-lg font-bold outline-none focus:ring-2 focus:ring-[#00714d]"
              min="0.01"
              name="monto"
              placeholder="0"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="text-xs font-semibold">
            Fecha
            <input
              className="mt-1 h-12 w-full rounded-xl bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-[#00714d]"
              defaultValue={today}
              name="fecha"
              required
              type="date"
            />
          </label>
        </div>
        <label className="block text-xs font-semibold">
          Concepto
          <input
            className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-[#00714d]"
            name="concepto"
            placeholder={
              operation === "ingreso"
                ? "Ej. Cobro de trabajo"
                : operation === "pase"
                  ? "Ej. Fondo semanal"
                  : "Ej. Compra de materiales"
            }
            required
          />
        </label>

        {operation !== "ingreso" ? (
          <AccountSelect
            label="Caja de origen"
            name="cuentaOrigenId"
            accounts={options.accounts}
          />
        ) : null}
        {operation !== "egreso" ? (
          <AccountSelect
            label={
              operation === "ingreso" ? "Caja donde entra" : "Caja de destino"
            }
            name="cuentaDestinoId"
            accounts={options.accounts}
            value={destinationId}
            onChange={setDestinationId}
          />
        ) : null}

        {operation === "ingreso" && destination?.type === "COBRANZAS" ? (
          <div className="space-y-3 rounded-xl bg-[#dce9ff] p-3">
            <label className="block text-xs font-semibold">
              Tipo de cobranza
              <select
                className="mt-1 h-11 w-full rounded-lg bg-white px-3"
                name="tipoCobranza"
                onChange={(event) => setCollectionType(event.target.value)}
                value={collectionType}
              >
                <option value="MANO_OBRA">Mano de obra</option>
                <option value="RESIDUAL">Residual</option>
                <option value="FAMILIA">Aporte familiar</option>
              </select>
            </label>
            {collectionType === "MANO_OBRA" ? (
              <label className="block text-xs font-semibold">
                Obra asociada (opcional)
                <select
                  className="mt-1 h-11 w-full rounded-lg bg-white px-3"
                  name="obraId"
                >
                  <option value="">Sin obra asociada</option>
                  {options.works.map((work) => (
                    <option key={work.id} value={work.id}>
                      {work.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
          </div>
        ) : null}

        {operation === "egreso" ? (
          <div className="space-y-3">
            <label className="block text-xs font-semibold">
              Categoría
              <select
                className="mt-1 h-11 w-full rounded-xl bg-white px-3"
                name="categoria"
              >
                <option value="INSUMOS">Insumos</option>
                <option value="COMBUSTIBLE">Combustible</option>
                <option value="AJUSTE">Ajuste</option>
                <option value="OTROS">Otros</option>
              </select>
            </label>
            <label className="block text-xs font-semibold">
              Imputar a Fijos (opcional)
              <select
                className="mt-1 h-11 w-full rounded-xl bg-white px-3"
                name="gastoFijoId"
                onChange={(event) => setFixedExpenseId(event.target.value)}
                value={fixedExpenseId}
              >
                <option value="">No es un pago fijo</option>
                {options.fixedExpenses.map((expense) => (
                  <option key={expense.id} value={expense.id}>
                    {expense.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <label className="block text-xs font-semibold">
          Observaciones (opcional)
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#00714d]"
            name="observaciones"
          />
        </label>
        {state.message ? (
          <p
            aria-live="polite"
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${state.ok ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {state.message}
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
            disabled={pending || !options.periodId}
            type="submit"
          >
            {pending ? "Guardando..." : state.ok ? "Guardar otro" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function AccountSelect({
  label,
  name,
  accounts,
  value,
  onChange,
}: {
  label: string;
  name: string;
  accounts: ModalAccount[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-semibold">
      {label}
      <select
        className="mt-1 h-11 w-full rounded-xl bg-white px-3"
        name={name}
        onChange={
          onChange ? (event) => onChange(event.target.value) : undefined
        }
        required
        value={value}
      >
        <option value="">Seleccionar caja</option>
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </select>
    </label>
  );
}
