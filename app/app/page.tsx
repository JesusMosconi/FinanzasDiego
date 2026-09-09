import { LogoutButton } from "@/components/logout-button";

export default function AppPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-6">
      <div className="flex flex-col items-center gap-6 text-center">
        <h1 className="text-3xl font-semibold text-zinc-950">
          Finanzas Taller
        </h1>
        <LogoutButton />
      </div>
    </main>
  );
}
