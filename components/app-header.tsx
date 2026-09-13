import Image from "next/image";

import { LogoutButton } from "@/components/logout-button";

export function AppHeader({ periodLabel }: { periodLabel: string }) {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-black/[0.04] bg-[#f8f9ff]/85 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-2xl items-center justify-between gap-2 px-4">
        <div className="flex items-center gap-2">
          <Image
            alt=""
            aria-hidden="true"
            className="h-8 w-8 rounded-full"
            height={32}
            priority
            src="/icon.png"
            width={32}
          />
          <span className="hidden text-sm font-bold tracking-tight min-[390px]:inline">
            FinanzasDiego
          </span>
        </div>
        <div className="flex min-h-11 items-center gap-2 rounded-full bg-[#eff4ff] px-3 text-xs font-semibold">
          <svg
            aria-hidden="true"
            className="h-[18px] w-[18px] text-[#00714d]"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <path d="M6 3v3m12-3v3M4 8h16M5 5h14v15H5z" />
          </svg>
          <span className="capitalize">{periodLabel}</span>
        </div>
        <LogoutButton compact />
      </div>
    </header>
  );
}
