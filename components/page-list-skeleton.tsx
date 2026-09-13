import { BottomNav } from "@/components/bottom-nav";

type Section = "activity" | "works" | "fixed";

export function PageListSkeleton({ active }: { active: Section }) {
  return (
    <div aria-busy="true" aria-label="Cargando contenido" className="min-h-dvh animate-pulse bg-[#f8f9ff] text-[#0b1c30]">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#f8f9ff] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-2xl items-center justify-between px-4">
          <div className="h-8 w-28 rounded-lg bg-[#e5eeff]" />
          <div className="h-9 w-24 rounded-full bg-[#e5eeff]" />
          <div className="h-10 w-10 rounded-full bg-[#e5eeff]" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-[calc(5rem+env(safe-area-inset-top))]">
        <div className="space-y-2">
          <div className="h-3 w-28 rounded bg-[#dce9ff]" />
          <div className="h-8 w-48 rounded-lg bg-[#dce9ff]" />
        </div>
        <div className="h-24 rounded-xl bg-[#dce9ff]" />
        <div className="h-11 rounded-xl bg-[#e5eeff]" />
        {[0, 1, 2, 3].map((row) => (
          <div className="rounded-xl bg-white p-4 shadow-sm" key={row}>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-[#e5eeff]" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-2/3 rounded bg-[#e5eeff]" />
                <div className="h-3 w-1/2 rounded bg-[#eff4ff]" />
              </div>
              <div className="h-5 w-20 rounded bg-[#e5eeff]" />
            </div>
          </div>
        ))}
      </main>
      <BottomNav active={active} />
    </div>
  );
}
