import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export default async function LoginPage() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (token && (await verifySessionToken(token))) {
    redirect("/app");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <section className="w-full max-w-sm">
        <div className="mb-8">
          <p className="mb-2 text-sm font-medium text-zinc-500">
            Finanzas Taller
          </p>
          <h1 className="text-3xl font-semibold text-zinc-950">Ingresar</h1>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
