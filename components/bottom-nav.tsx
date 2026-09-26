"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NuevoMovimientoTrigger } from "@/components/nuevo-movimiento";

type IconName =
  "activity" | "checklist" | "construction" | "dashboard" | "deudas";
const iconPaths: Record<IconName, React.ReactNode> = {
  activity: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
  checklist: <path d="m4 7 2 2 3-4m2 3h9M4 15l2 2 3-4m2 3h9" />,
  construction: <path d="m14 6 4 4M5 19l7-7m3-8 5 5-3 3-5-5zM4 20l4-1-3-3z" />,
  dashboard: <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z" />,
  deudas: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6m0 4h.01" />
    </>
  ),
};
const items: {
  href: string;
  icon: IconName;
  label: string;
}[] = [
  { href: "/app", icon: "dashboard", label: "Inicio" },
  {
    href: "/app/movimientos",
    icon: "activity",
    label: "Actividad",
  },
  {
    href: "/app/obras",
    icon: "construction",
    label: "Obras",
  },
  { href: "/app/fijos", icon: "checklist", label: "Fijos" },
  { href: "/app/deudas", icon: "deudas", label: "Deudas" },
];
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.04] bg-[#f8f9ff]/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <div className="relative mx-auto grid h-16 max-w-2xl grid-cols-7 items-center px-1 text-[11px]">
        <NavItem active={pathname === items[0].href} {...items[0]} />
        <NavItem active={pathname === items[1].href} {...items[1]} />
        <NavItem active={pathname === items[2].href} {...items[2]} />
        <div aria-hidden="true" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <NuevoMovimientoTrigger />
        </div>
        <NavItem active={pathname === items[3].href} {...items[3]} />
        <NavItem active={pathname === items[4].href} {...items[4]} />
        <div aria-hidden="true" />
      </div>
    </nav>
  );
}
function NavItem({
  active,
  href,
  icon,
  label,
}: {
  active: boolean;
  href: string;
  icon: IconName;
  label: string;
}) {
  return (
    <Link
      aria-current={active ? "page" : undefined}
      className={`flex h-16 min-w-0 flex-col items-center justify-center gap-0.5 ${active ? "font-bold text-[#00714d]" : "text-[#45464d]"}`}
      href={href}
    >
      <svg
        aria-hidden="true"
        className="h-[22px] w-[22px]"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
        viewBox="0 0 24 24"
      >
        {iconPaths[icon]}
      </svg>
      <span>{label}</span>
    </Link>
  );
}
