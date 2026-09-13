"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

const INSTALL_PREFERENCE_KEY = "finanzas-diego-install-prompt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in window.navigator &&
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true)
  );
}

export function InstallAppBanner() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALL_PREFERENCE_KEY)) {
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      localStorage.setItem(INSTALL_PREFERENCE_KEY, "installed");
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(INSTALL_PREFERENCE_KEY, "dismissed");
    setInstallPrompt(null);
  };

  const install = async () => {
    if (!installPrompt) return;

    setIsInstalling(true);
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "dismissed") {
      localStorage.setItem(INSTALL_PREFERENCE_KEY, "dismissed");
    }

    setInstallPrompt(null);
    setIsInstalling(false);
  };

  if (!installPrompt) return null;

  return (
    <aside
      aria-label="Instalar aplicación"
      className="fixed inset-x-4 bottom-[calc(6rem+env(safe-area-inset-bottom))] z-[60] mx-auto max-w-md rounded-2xl border border-black/10 bg-[#111111] p-4 text-white shadow-2xl shadow-black/25"
    >
      <div className="flex items-start gap-3">
        <Image
          alt=""
          aria-hidden="true"
          className="h-12 w-12 shrink-0 rounded-xl"
          height="48"
          src="/icons/icon-192.png"
          width="48"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold">Instalar FinanzasDiego</p>
          <p className="mt-1 text-xs leading-5 text-white/70">
            Accedé desde tu pantalla de inicio como una app.
          </p>
        </div>
        <button
          aria-label="No volver a mostrar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
          onClick={dismiss}
          type="button"
        >
          <svg aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>
      <button
        className="mt-3 flex min-h-12 w-full items-center justify-center rounded-xl bg-[#ff6a00] px-4 text-sm font-bold text-white transition hover:bg-[#e85f00] disabled:cursor-wait disabled:opacity-70"
        disabled={isInstalling}
        onClick={() => void install()}
        type="button"
      >
        {isInstalling ? "Abriendo instalación…" : "Instalar app"}
      </button>
    </aside>
  );
}
