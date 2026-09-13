"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!compact || !open) return;
    function closeMenu(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenu);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [compact, open]);

  async function logout() {
    setIsSubmitting(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  if (compact) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          aria-expanded={open}
          aria-haspopup="menu"
          aria-label="Abrir menú de usuario"
          className="relative flex h-8 w-8 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-bold text-[#0b1c30] transition hover:bg-[#d3e4fe]"
          onClick={() => setOpen((value) => !value)}
          type="button"
        >
          D
          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-[#00714d] ring-2 ring-white" />
        </button>
        {open ? (
          <div
            className="absolute top-10 right-0 w-40 rounded-xl border border-black/[0.05] bg-white p-1.5 shadow-xl"
            role="menu"
          >
            <button
              className="min-h-10 w-full rounded-lg px-3 text-left text-sm font-semibold text-[#93000a] hover:bg-[#ffdad6]/50 disabled:opacity-60"
              disabled={isSubmitting}
              onClick={logout}
              role="menuitem"
              type="button"
            >
              {isSubmitting ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <button
      className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60"
      disabled={isSubmitting}
      onClick={logout}
      type="button"
    >
      {isSubmitting ? "Cerrando..." : "Cerrar sesión"}
    </button>
  );
}
