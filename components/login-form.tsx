"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const pin = formData.get("pin");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "No se pudo iniciar sesion.");
        return;
      }

      router.replace("/app");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="flex w-full flex-col gap-5" onSubmit={handleSubmit}>
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium text-zinc-800" htmlFor="pin">
          PIN
        </label>
        <input
          autoComplete="current-password"
          autoFocus
          className="h-12 rounded-md border border-zinc-300 bg-white px-4 text-lg tracking-widest text-zinc-950 outline-none transition focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10"
          id="pin"
          inputMode="numeric"
          name="pin"
          pattern="[0-9]*"
          required
          type="password"
        />
      </div>

      {error ? (
        <p aria-live="polite" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <button
        className="h-12 rounded-md bg-zinc-950 px-5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </button>
    </form>
  );
}
