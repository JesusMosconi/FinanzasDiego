"use client";

import { useActionState, useEffect, useRef, useState } from "react";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { SelectDialog } from "@/components/select-dialog";
import { useToast } from "@/components/toast-provider";

import {
  type ActionState,
  borrarGastoFijoAction,
  crearGastoFijoAction,
  duplicarMesAnteriorAction,
  registrarPagoAction,
} from "./actions";

export type FixedExpenseView = {
  id: string;
  group: string;
  name: string;
  total: number;
  paid: number;
  dueDay: number;
  lastPayment: { amount: number; date: string; source: string } | null;
};

export type SourceAccountView = {
  id: string;
  name: string;
  balance: number;
  advance: boolean;
};

const money = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const paymentDate = new Intl.DateTimeFormat("es-AR", {
  day: "2-digit",
  month: "short",
  timeZone: "America/Argentina/Buenos_Aires",
});
const initialState: ActionState = { ok: false, message: "" };
const fixedGroups = [
  "Gastos vivienda",
  "Tarjetas Crédito, Créditos y Préstamos",
  "Laborales y salud",
  "Vehículos/Mantenimientos",
  "Cuidadoras",
] as const;

export function FijosClient({
  expenses,
  accounts,
  periodId,
  periodLabel,
}: {
  expenses: FixedExpenseView[];
  accounts: SourceAccountView[];
  periodId: string | null;
  periodLabel: string;
}) {
  const [selected, setSelected] = useState<FixedExpenseView | null>(null);
  const [creating, setCreating] = useState(false);
  const [duplicateState, duplicateAction, duplicatePending] = useActionState(
    duplicarMesAnteriorAction,
    initialState,
  );

  const total = expenses.reduce((sum, expense) => sum + expense.total, 0);
  const paid = expenses.reduce((sum, expense) => sum + expense.paid, 0);
  const pending = Math.max(total - paid, 0);
  const percentage =
    total > 0 ? Math.min(Math.round((paid / total) * 100), 100) : 0;
  const pendingCount = expenses.filter(
    (expense) => expense.paid < expense.total,
  ).length;
  const groups = [...new Set(expenses.map((expense) => expense.group))];
  const notice = duplicateState.message;
  const noticeOk = duplicateState.ok;

  return (
    <>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <section className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#45464d]">
              Control mensual
            </span>
            <h1 className="text-2xl leading-8 font-bold tracking-tight">
              Obligaciones fijas
            </h1>
            <span className="text-xs font-semibold text-[#00714d] capitalize">
              {periodLabel}
            </span>
          </div>
          <form action={duplicateAction}>
            <input name="periodoId" type="hidden" value={periodId ?? ""} />
            <button
              className="flex min-h-11 items-center gap-1.5 rounded-lg bg-[#e5eeff] px-3 text-xs font-semibold shadow-sm transition active:scale-95 disabled:opacity-50"
              disabled={!periodId || duplicatePending}
              type="submit"
            >
              <span aria-hidden="true">⧉</span>
              {duplicatePending ? "Duplicando..." : "Duplicar mes ant."}
            </button>
          </form>
        </section>

        {notice ? (
          <div
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${noticeOk ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {notice}
          </div>
        ) : null}

        <section className="space-y-2 rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#45464d]">Progreso del mes</span>
            <strong className="text-[#00714d]">{percentage}% liquidado</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#e5eeff]">
            <div
              className="h-full rounded-full bg-[#00714d] transition-all"
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-1 pt-1 text-center">
            <Metric label="Total" amount={total} />
            <Metric label="Pagado" amount={paid} green />
            <Metric
              label="Pendiente"
              amount={pending}
              red
              note={`${pendingCount} ${pendingCount === 1 ? "cuenta" : "cuentas"}`}
            />
          </div>
        </section>

        <section className="space-y-2 rounded-xl bg-[#dce9ff] p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <strong className="text-xs">Cajas disponibles para pagar</strong>
            <span className="rounded-full bg-[#6cf8bb] px-2 py-0.5 text-[10px] font-bold text-[#005236]">
              Anticipos habilitados
            </span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {accounts.map((account) => (
              <div
                className={`min-w-[118px] shrink-0 rounded-lg bg-white p-2 shadow-sm ${account.advance ? "border-l-2 border-amber-500" : ""}`}
                key={account.id}
              >
                <span className="block truncate text-[11px] text-[#45464d]">
                  {account.name}
                </span>
                <strong
                  className={
                    account.advance ? "text-sm text-amber-700" : "text-sm"
                  }
                >
                  {money.format(account.balance)}
                </strong>
              </div>
            ))}
          </div>
        </section>

        {groups.length === 0 ? (
          <section className="rounded-xl bg-white p-8 text-center shadow-sm">
            <p className="font-semibold">
              No hay obligaciones para este período
            </p>
            <p className="mt-1 text-xs text-[#45464d]">
              Podés duplicar las del mes anterior.
            </p>
          </section>
        ) : (
          groups.map((group) => {
            const groupExpenses = expenses.filter(
              (expense) => expense.group === group,
            );
            const complete = groupExpenses.filter(
              (expense) => expense.paid >= expense.total,
            ).length;
            const partial = groupExpenses.filter(
              (expense) => expense.paid > 0 && expense.paid < expense.total,
            ).length;
            return (
              <section className="space-y-1.5" key={group}>
                <div className="flex items-center justify-between px-1">
                  <h2 className="text-base font-semibold">{group}</h2>
                  <span className="text-[11px] text-[#45464d]">
                    {complete} saldadas{partial ? `, ${partial} parciales` : ""}
                  </span>
                </div>
                {groupExpenses.map((expense) => (
                  <FixedExpenseCard
                    expense={expense}
                    key={expense.id}
                    onPay={() => setSelected(expense)}
                  />
                ))}
              </section>
            );
          })
        )}
        <button
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#eff4ff] text-sm font-semibold text-[#00714d] shadow-sm transition hover:bg-[#e5eeff] active:scale-[0.99] disabled:opacity-50"
          disabled={!periodId}
          onClick={() => setCreating(true)}
          type="button"
        >
          <span aria-hidden="true" className="text-xl">
            +
          </span>
          Agregar nueva obligación
        </button>
      </main>

      {selected ? (
        <PaymentDialog
          accounts={accounts}
          expense={selected}
          onClose={() => setSelected(null)}
        />
      ) : null}
      {creating && periodId ? (
        <CreateDialog periodId={periodId} onClose={() => setCreating(false)} />
      ) : null}
    </>
  );
}

function Metric({
  label,
  amount,
  green,
  red,
  note,
}: {
  label: string;
  amount: number;
  green?: boolean;
  red?: boolean;
  note?: string;
}) {
  return (
    <div className="min-w-0 rounded-lg bg-[#eff4ff] p-1.5">
      <span
        className={`block text-[10px] ${green ? "text-[#00714d]" : red ? "text-[#ba1a1a]" : "text-[#45464d]"}`}
      >
        {label}
      </span>
      <strong
        className={`block truncate text-xs ${green ? "text-[#00714d]" : red ? "text-[#ba1a1a]" : ""}`}
      >
        {money.format(amount)}
      </strong>
      {note ? (
        <span className="block truncate text-[9px] text-[#45464d]">
          ({note})
        </span>
      ) : null}
    </div>
  );
}

function FixedExpenseCard({
  expense,
  onPay,
}: {
  expense: FixedExpenseView;
  onPay: () => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const deleteFormRef = useRef<HTMLFormElement>(null);
  const remaining = Math.max(expense.total - expense.paid, 0);
  const complete = remaining === 0;
  const partial = expense.paid > 0 && !complete;
  const percentage =
    expense.total > 0
      ? Math.min(Math.round((expense.paid / expense.total) * 100), 100)
      : 0;
  return (
    <article className="space-y-2 rounded-xl bg-white p-4 shadow-[0_1px_8px_rgba(11,28,48,0.05)]">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${complete ? "bg-[#6cf8bb]/35 text-[#00714d]" : partial ? "bg-amber-100 text-amber-800" : "bg-[#e5eeff] text-[#45464d]"}`}
          >
            {complete ? "✓" : partial ? "◔" : "○"}
          </div>
          <div className="min-w-0">
            <h3
              className={`truncate text-sm font-semibold ${complete ? "line-through opacity-70" : ""}`}
            >
              {expense.name}
            </h3>
            <span className="text-[11px] text-[#45464d]">
              Vence el {expense.dueDay} · Total {money.format(expense.total)}
            </span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <strong className={partial ? "text-sm text-amber-700" : "text-sm"}>
            {complete
              ? money.format(expense.total)
              : `${money.format(remaining)} resta`}
          </strong>
          <span
            className={`block rounded-full px-2 py-0.5 text-[10px] font-bold ${complete ? "bg-[#6cf8bb]/50 text-[#005236]" : partial ? "bg-amber-100 text-amber-800" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {complete
              ? "100% pagado"
              : partial
                ? `${percentage}% cubierto`
                : "Pendiente"}
          </span>
        </div>
      </div>
      {partial ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[#e5eeff]">
          <div
            className="h-full rounded-full bg-amber-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      ) : null}
      {expense.lastPayment ? (
        <div className="rounded-lg bg-[#eff4ff] px-3 py-2 text-[11px] text-[#45464d]">
          {money.format(expense.lastPayment.amount)} pagado el{" "}
          {paymentDate.format(new Date(expense.lastPayment.date))} desde{" "}
          {expense.lastPayment.source}
        </div>
      ) : null}
      {!complete ? (
        <button
          className={`w-full rounded-lg py-2.5 text-sm font-semibold transition active:scale-[0.98] ${partial ? "bg-[#dce9ff] text-[#0b1c30]" : "bg-[#00714d] text-white"}`}
          onClick={onPay}
          type="button"
        >
          {partial
            ? `Saldar resto (${money.format(remaining)})`
            : `Pagar ahora (${money.format(remaining)})`}
        </button>
      ) : null}
      <form
        action={borrarGastoFijoAction}
        className="flex justify-end"
        ref={deleteFormRef}
      >
        <input name="gastoFijoId" type="hidden" value={expense.id} />
        <button
          className="min-h-9 px-2 text-xs font-semibold text-[#93000a]"
          onClick={() => setConfirmingDelete(true)}
          type="button"
        >
          Eliminar obligación
        </button>
        <ConfirmDialog
          confirmLabel="Eliminar"
          danger
          description="Los pagos registrados se conservarán en el historial de movimientos."
          onClose={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            deleteFormRef.current?.requestSubmit();
          }}
          open={confirmingDelete}
          title="¿Eliminar esta obligación?"
        />
      </form>
    </article>
  );
}

function PaymentDialog({
  accounts,
  expense,
  onClose,
}: {
  accounts: SourceAccountView[];
  expense: FixedExpenseView;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    registrarPagoAction,
    initialState,
  );
  const remaining = Math.max(expense.total - expense.paid, 0);
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
        className="max-h-[90dvh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl bg-[#f8f9ff] p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
        noValidate
        onSubmit={(event) => {
          const data = new FormData(event.currentTarget);
          const amount = Number(data.get("monto"));
          const source = String(data.get("cuentaOrigenId") ?? "");
          let error = "";
          if (!Number.isFinite(amount) || amount <= 0)
            error = "Ingresá un monto mayor a cero.";
          else if (amount > remaining)
            error = "El monto supera el saldo pendiente.";
          else if (!source) error = "Seleccioná una caja de origen.";
          if (error) {
            event.preventDefault();
            setClientError(error);
          } else setClientError("");
        }}
      >
        <input name="gastoFijoId" type="hidden" value={expense.id} />
        <div className="mx-auto h-1 w-12 rounded-full bg-[#c6c6cd]" />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">{expense.name}</h2>
            <p className="text-xs text-[#45464d]">
              Saldo pendiente: <strong>{money.format(remaining)}</strong>
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
          Monto a pagar
          <input
            autoFocus
            className="mt-1 h-12 w-full rounded-xl bg-white px-3 text-lg font-bold outline-none ring-[#00714d] focus:ring-2"
            defaultValue={remaining}
            max={remaining}
            min="0.01"
            name="monto"
            required
            step="0.01"
            type="number"
          />
        </label>
        <fieldset className="space-y-2">
          <legend className="mb-2 text-xs font-semibold">
            Seleccionar caja de origen
          </legend>
          {accounts.map((account, index) => (
            <label
              className={`flex cursor-pointer items-center justify-between rounded-xl bg-white p-3 shadow-sm ${account.advance ? "border-l-2 border-amber-500" : ""}`}
              key={account.id}
            >
              <span className="flex items-center gap-2">
                <input
                  defaultChecked={index === 0}
                  className="h-4 w-4 accent-[#00714d]"
                  name="cuentaOrigenId"
                  required
                  type="radio"
                  value={account.id}
                />
                <span className="text-sm font-semibold">{account.name}</span>
              </span>
              <span className="text-xs text-[#45464d]">
                {money.format(account.balance)} disp.
              </span>
            </label>
          ))}
        </fieldset>
        {clientError || state.message ? (
          <p
            className={`rounded-lg px-3 py-2 text-xs font-semibold ${!clientError && state.ok ? "bg-[#6cf8bb]/45 text-[#005236]" : "bg-[#ffdad6] text-[#93000a]"}`}
          >
            {clientError || state.message}
          </p>
        ) : null}
        <div className="flex gap-2 pt-1">
          <button
            className="flex-1 rounded-xl bg-[#e5eeff] py-3 text-sm font-semibold"
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className="flex-1 rounded-xl bg-[#00714d] py-3 text-sm font-semibold text-white disabled:opacity-50"
            disabled={pending || accounts.length === 0}
            type="submit"
          >
            {pending ? "Registrando..." : "Confirmar pago"}
          </button>
        </div>
      </form>
    </div>
  );
}

function CreateDialog({
  periodId,
  onClose,
}: {
  periodId: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(
    crearGastoFijoAction,
    initialState,
  );
  const [group, setGroup] = useState("");
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
          const customGroup = String(data.get("grupo") ?? "").trim();
          const name = String(data.get("obligacion") ?? "").trim();
          const amount = Number(data.get("monto"));
          const dueDay = Number(data.get("venceDia"));
          let error = "";
          if (!group || (group === "OTRO" && !customGroup))
            error = "Seleccioná o escribí un grupo.";
          else if (!name) error = "Completá el nombre de la obligación.";
          else if (!Number.isFinite(amount) || amount <= 0)
            error = "Ingresá un monto mayor a cero.";
          else if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31)
            error = "Ingresá un día de vencimiento entre 1 y 31.";
          if (error) {
            event.preventDefault();
            setClientError(error);
          } else setClientError("");
        }}
      >
        <input name="periodoId" type="hidden" value={periodId} />
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Nueva obligación fija</h2>
            <p className="text-xs text-[#45464d]">
              Se agregará al período actual sin pagos registrados.
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
          Grupo
          <SelectDialog
            label="Grupo"
            name="grupoPredefinido"
            onChange={setGroup}
            options={[
              ...fixedGroups.map((fixedGroup) => ({
                value: fixedGroup,
                label: fixedGroup,
              })),
              { value: "OTRO", label: "Otro..." },
            ]}
            placeholder="Seleccionar grupo"
            value={group}
          />
        </label>
        {group === "OTRO" ? (
          <label className="block text-xs font-semibold">
            Nombre del grupo
            <input
              className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
              name="grupo"
              placeholder="Escribir otro grupo"
            />
          </label>
        ) : null}
        <label className="block text-xs font-semibold">
          Obligación
          <input
            autoFocus
            className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
            name="obligacion"
            placeholder="Ej. Electricidad"
            required
          />
        </label>
        <div className="grid grid-cols-[1fr_110px] gap-2">
          <label className="block text-xs font-semibold">
            Monto total
            <input
              className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
              min="0.01"
              name="monto"
              placeholder="0"
              required
              step="0.01"
              type="number"
            />
          </label>
          <label className="block text-xs font-semibold">
            Vence el día
            <input
              className="mt-1 h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-[#00714d] focus:ring-2"
              max="31"
              min="1"
              name="venceDia"
              required
              type="number"
            />
          </label>
        </div>
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
            {pending ? "Guardando..." : state.ok ? "Agregar otra" : "Agregar"}
          </button>
        </div>
      </form>
    </div>
  );
}
