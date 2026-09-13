"use client";

import {
  createContext,
  useActionState,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  guardarNuevoRegistro,
  type NuevoRegistroState,
} from "@/app/app/nuevo-registro-actions";
import { SelectDialog } from "@/components/select-dialog";
import { useToast } from "@/components/toast-provider";

export type ModalAccount = {
  id: string;
  name: string;
  type: "CAJA_DIARIA" | "RESIDUALES" | "COBRANZAS" | "ANTICIPO";
};

type ModalOptions = {
  periodId: string | null;
  accounts: ModalAccount[];
  works: { id: string; name: string }[];
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
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#00714d] text-white shadow-lg transition active:scale-95 disabled:opacity-50"
      disabled={!open}
      onClick={() => open?.()}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-7 w-7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.4"
        viewBox="0 0 24 24"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
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
  const [originId, setOriginId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [collectionType, setCollectionType] = useState("MANO_OBRA");
  const [clientError, setClientError] = useState("");
  const [state, action, pending] = useActionState(
    guardarNuevoRegistro,
    initialState,
  );
  const showToast = useToast();

  useEffect(() => {
    if (state.ok && state.message) showToast(state.message);
  }, [showToast, state]);
  const destination = options.accounts.find(
    (account) => account.id === destinationId,
  );
  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div
      aria-modal="true"
      className="app-modal-backdrop fixed inset-0 z-[60] flex items-center justify-center bg-[#213145]/60 p-4 backdrop-blur-sm"
      role="dialog"
    >
      <form
        action={action}
        className="app-modal-panel h-[min(720px,92dvh)] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-[#f8f9ff] p-4 shadow-2xl"
        noValidate
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const amount = Number(data.get("monto"));
          const concept = String(data.get("concepto") ?? "").trim();
          const origin = String(data.get("cuentaOrigenId") ?? "");
          const destination = String(data.get("cuentaDestinoId") ?? "");
          let error = "";
          if (!Number.isFinite(amount) || amount <= 0)
            error = "Ingresá un monto mayor a cero.";
          else if (!data.get("fecha")) error = "Seleccioná una fecha.";
          else if (!concept) error = "Completá el concepto.";
          else if (operation !== "ingreso" && !origin)
            error = "Seleccioná la caja de origen.";
          else if (operation !== "egreso" && !destination)
            error = "Seleccioná la caja de destino.";
          else if (operation === "pase" && origin === destination)
            error = "Las cajas de origen y destino deben ser distintas.";
          if (error) {
            event.preventDefault();
            setClientError(error);
          } else setClientError("");
        }}
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
          <CategoryAccountSelect
            label="Caja de origen"
            name="cuentaOrigenId"
            accounts={options.accounts}
            value={originId}
            onChange={setOriginId}
          />
        ) : null}
        {operation !== "egreso" ? (
          <CategoryAccountSelect
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
              <SelectDialog
                label="Tipo de cobranza"
                name="tipoCobranza"
                onChange={setCollectionType}
                options={[
                  { value: "MANO_OBRA", label: "Mano de obra" },
                  { value: "RESIDUAL", label: "Residual" },
                  { value: "FAMILIA", label: "Aporte familiar" },
                ]}
                value={collectionType}
              />
            </label>
            {collectionType === "MANO_OBRA" ? (
              <WorkSelect works={options.works} />
            ) : null}
          </div>
        ) : null}

        <label className="block text-xs font-semibold">
          Observaciones (opcional)
          <textarea
            className="mt-1 min-h-20 w-full resize-none rounded-xl bg-white p-3 text-sm outline-none focus:ring-2 focus:ring-[#00714d]"
            name="observaciones"
          />
        </label>
        {clientError || state.message ? (
          <p
            aria-live="polite"
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

function CategoryAccountSelect({
  label,
  name,
  accounts,
  value,
  onChange,
}: {
  label: string;
  name: string;
  accounts: ModalAccount[];
  value: string;
  onChange: (value: string) => void;
}) {
  const selected = accounts.find((account) => account.id === value);
  const [category, setCategory] = useState(selected?.type ?? "");
  const categories = [
    ["CAJA_DIARIA", "Diarios"],
    ["RESIDUALES", "Residuales"],
    ["COBRANZAS", "Cobranzas"],
    ["ANTICIPO", "Anticipo"],
  ] as const;
  const advances = accounts.filter((account) => account.type === "ANTICIPO");

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold">
        {label}
        <SelectDialog
          label={label}
          onChange={(type) => {
            setCategory(type);
            onChange(
              type === "ANTICIPO"
                ? ""
                : (accounts.find((account) => account.type === type)?.id ?? ""),
            );
          }}
          options={categories.map(([type, categoryLabel]) => ({
            value: type,
            label: categoryLabel,
            disabled: !accounts.some((account) => account.type === type),
          }))}
          placeholder="Seleccionar caja"
          value={category}
        />
      </label>
      {category === "ANTICIPO" ? (
        <label className="block text-xs font-semibold">
          Anticipo activo
          <SelectDialog
            label="Anticipo activo"
            onChange={onChange}
            options={advances.map((account) => ({
              value: account.id,
              label: account.name.replace(/^Anticipo · /, ""),
            }))}
            placeholder="Seleccionar anticipo"
            value={value}
          />
        </label>
      ) : null}
      <input name={name} type="hidden" value={value} />
    </div>
  );
}

function WorkSelect({ works }: { works: { id: string; name: string }[] }) {
  const [value, setValue] = useState("");

  return (
    <label className="block text-xs font-semibold">
      Obra asociada (opcional)
      <SelectDialog
        label="Obra asociada"
        name="obraId"
        onChange={setValue}
        options={[
          { value: "", label: "Sin obra asociada" },
          ...works.map((work) => ({ value: work.id, label: work.name })),
        ]}
        value={value}
      />
    </label>
  );
}
