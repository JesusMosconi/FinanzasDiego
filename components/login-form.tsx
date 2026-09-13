"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

export function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function addDigit(digit: string) {
    setError("");
    setPin((current) => `${current}${digit}`.slice(0, 12));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!pin) {
      setError("Ingresá tu PIN para continuar.");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(body.error ?? "No se pudo iniciar sesión.");
        setPin("");
        return;
      }
      router.replace("/app");
      router.refresh();
    } catch {
      setError("No se pudo conectar. Intentá nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" noValidate onSubmit={handleSubmit}>
      <label
        className="block text-center text-xs font-bold uppercase tracking-[0.12em] text-[#45464d]"
        htmlFor="pin"
      >
        PIN de acceso
      </label>
      <input
        aria-describedby={error ? "pin-error" : undefined}
        autoComplete="off"
        className={`h-16 w-full rounded-2xl bg-[#eff4ff] px-4 text-center text-3xl font-bold tracking-[0.35em] text-[#0b1c30] outline-none ring-2 ${error ? "ring-[#ba1a1a]" : "ring-transparent"}`}
        id="pin"
        inputMode="none"
        name="pin"
        readOnly
        type="password"
        value={pin}
      />

      <div
        aria-label="Teclado numérico"
        className="mx-auto grid max-w-xs grid-cols-3 gap-2"
      >
        {keys.map((key) => (
          <button
            className="h-14 rounded-xl bg-[#eff4ff] text-xl font-bold transition hover:bg-[#dce9ff] active:scale-95"
            key={key}
            onClick={() => addDigit(key)}
            type="button"
          >
            {key}
          </button>
        ))}
        <button
          aria-label="Borrar PIN"
          className="h-14 rounded-xl bg-[#e5eeff] text-lg font-bold active:scale-95"
          onClick={() => {
            setError("");
            setPin("");
          }}
          type="button"
        >
          C
        </button>
        <button
          className="h-14 rounded-xl bg-[#eff4ff] text-xl font-bold transition hover:bg-[#dce9ff] active:scale-95"
          onClick={() => addDigit("0")}
          type="button"
        >
          0
        </button>
        <button
          aria-label="Borrar último dígito"
          className="h-14 rounded-xl bg-[#e5eeff] text-xl font-bold active:scale-95"
          onClick={() => {
            setError("");
            setPin((current) => current.slice(0, -1));
          }}
          type="button"
        >
          ⌫
        </button>
      </div>

      {error ? (
        <p
          aria-live="polite"
          className="rounded-xl bg-[#ffdad6] px-3 py-2 text-center text-sm font-semibold text-[#93000a]"
          id="pin-error"
        >
          {error}
        </p>
      ) : null}

      <button
        className="h-13 w-full rounded-xl bg-[#00714d] px-5 font-semibold text-white shadow-sm transition active:scale-[0.99] disabled:opacity-60"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Ingresando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
