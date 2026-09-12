"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function LogoutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function logout() {
    setIsSubmitting(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <button
      aria-label={compact ? "Cerrar sesión" : undefined}
      className={
        compact
          ? "relative flex h-8 w-8 items-center justify-center rounded-full bg-[#dce9ff] text-xs font-bold text-[#0b1c30] transition hover:bg-[#d3e4fe] disabled:opacity-60"
          : "rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-100 disabled:opacity-60"
      }
      disabled={isSubmitting}
      onClick={logout}
      type="button"
    >
      {compact ? (
        <>
          D
          <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-[#00714d] ring-2 ring-white" />
        </>
      ) : isSubmitting ? (
        "Cerrando..."
      ) : (
        "Cerrar sesion"
      )}
    </button>
  );
}
