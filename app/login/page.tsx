import { cookies } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function LoginPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (token && (await verifySessionToken(token))) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#f8f9ff] px-4 py-8 text-[#0b1c30]">
      <section className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-[0_12px_40px_rgba(11,28,48,0.10)]">
        <div className="mb-6 text-center">
          <Image
            alt="Logo de FinanzasDiego"
            className="mx-auto mb-3 h-16 w-16 rounded-full"
            height={64}
            priority
            src="/icon.png"
            width={64}
          />
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#00714d]">
            FinanzasDiego
          </p>
          <h1 className="mt-1 text-2xl font-bold">Bienvenido</h1>
          <p className="mt-1 text-sm text-[#45464d]">
            Ingresá tu PIN para acceder a tus finanzas.
          </p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
