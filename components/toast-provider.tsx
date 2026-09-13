"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

type ToastVariant = "success" | "error";
type Toast = { id: number; message: string; variant: ToastVariant };
type ToastContextValue = (message: string, variant?: ToastVariant) => void;

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      setToast({ id: Date.now(), message, variant });
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  return (
    <ToastContext value={showToast}>
      {children}
      {toast ? (
        <div
          aria-atomic="true"
          aria-live="polite"
          className={`fixed inset-x-4 top-[calc(4.75rem+env(safe-area-inset-top))] z-[90] mx-auto flex min-h-12 max-w-md items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold shadow-xl ${toast.variant === "success" ? "border-[#00714d]/20 bg-[#d9ffed] text-[#005236]" : "border-[#93000a]/20 bg-[#ffdad6] text-[#93000a]"}`}
          key={toast.id}
          role={toast.variant === "error" ? "alert" : "status"}
        >
          <span aria-hidden="true" className="text-base">
            {toast.variant === "success" ? "✓" : "!"}
          </span>
          <span className="min-w-0 flex-1">{toast.message}</span>
          <button
            aria-label="Cerrar notificación"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-current/70"
            onClick={() => setToast(null)}
            type="button"
          >
            ×
          </button>
        </div>
      ) : null}
    </ToastContext>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast debe usarse dentro de ToastProvider.");
  return context;
}
