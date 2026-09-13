"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectDialogOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export function SelectDialog({
  label,
  name,
  value,
  options,
  placeholder = "Seleccionar",
  onChange,
}: {
  label: string;
  name?: string;
  value: string;
  options: SelectDialogOption[];
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => triggerRef.current?.focus());
  };

  return (
    <div className="mt-1">
      {name ? <input name={name} type="hidden" value={value} /> : null}
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-11 w-full items-center justify-between gap-3 rounded-xl bg-white px-3 text-left text-sm outline-none ring-[#00714d] transition focus-visible:ring-2"
        onClick={() => setOpen(true)}
        ref={triggerRef}
        type="button"
      >
        <span className={selected ? "truncate" : "truncate text-[#6f7078]"}>
          {selected?.label ?? placeholder}
        </span>
        <svg
          aria-hidden="true"
          className="h-4 w-4 shrink-0 text-[#45464d]"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path d="m7 10 5 5 5-5" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-[90] flex items-end justify-center bg-[#213145]/60 backdrop-blur-sm sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <section
            aria-labelledby={titleId}
            aria-modal="true"
            className="max-h-[78dvh] w-full overflow-hidden rounded-t-3xl bg-[#f8f9ff] shadow-2xl sm:max-w-sm sm:rounded-2xl"
            role="dialog"
          >
            <div className="sticky top-0 z-10 bg-[#f8f9ff] px-4 pb-3 pt-2 sm:pt-4">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-[#c6c6cd] sm:hidden" />
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#00714d]">
                    Seleccionar
                  </span>
                  <h2 className="text-lg font-semibold" id={titleId}>
                    {label}
                  </h2>
                </div>
                <button
                  aria-label="Cerrar"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e5eeff] text-xl"
                  onClick={close}
                  type="button"
                >
                  ×
                </button>
              </div>
            </div>
            <div className="space-y-1 overflow-y-auto px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              {options.map((option) => {
                const active = option.value === value;
                return (
                  <button
                    aria-checked={active}
                    className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-sm transition ${active ? "bg-[#d8f5e8] font-semibold text-[#005236]" : "bg-white text-[#0b1c30] active:bg-[#e5eeff]"} disabled:cursor-not-allowed disabled:opacity-40`}
                    disabled={option.disabled}
                    key={option.value}
                    onClick={() => {
                      onChange(option.value);
                      close();
                    }}
                    role="radio"
                    type="button"
                  >
                    <span>{option.label}</span>
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#00714d] text-xs text-white"
                      >
                        ✓
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
