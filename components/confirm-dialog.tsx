"use client";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending = false,
  danger = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  pending?: boolean;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!open) return null;
  return (
    <div
      aria-modal="true"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#213145]/60 p-4 backdrop-blur-sm"
      role="alertdialog"
    >
      <section className="w-full max-w-sm space-y-4 rounded-2xl bg-[#f8f9ff] p-5 shadow-2xl">
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-1 text-sm text-[#45464d]">{description}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex-1 rounded-xl bg-[#e5eeff] py-3 text-sm font-semibold"
            disabled={pending}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={`flex-1 rounded-xl py-3 text-sm font-semibold text-white disabled:opacity-50 ${danger ? "bg-[#ba1a1a]" : "bg-[#131b2e]"}`}
            disabled={pending}
            onClick={onConfirm}
            type="button"
          >
            {pending ? "Procesando..." : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
