import { NuevoMovimientoTrigger } from "@/components/nuevo-movimiento";

type Section = "home" | "activity" | "works" | "fixed";
type IconName = "activity" | "checklist" | "construction" | "dashboard";
const iconPaths: Record<IconName, React.ReactNode> = {
  activity: <path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />,
  checklist: <path d="m4 7 2 2 3-4m2 3h9M4 15l2 2 3-4m2 3h9" />,
  construction: <path d="m14 6 4 4M5 19l7-7m3-8 5 5-3 3-5-5zM4 20l4-1-3-3z" />,
  dashboard: <path d="M4 4h7v7H4zm9 0h7v7h-7zM4 13h7v7H4zm9 0h7v7h-7z" />,
};
const items: {
  href: string;
  icon: IconName;
  label: string;
  section: Section;
}[] = [
  { href: "/app", icon: "dashboard", label: "Inicio", section: "home" },
  {
    href: "/app/movimientos",
    icon: "activity",
    label: "Actividad",
    section: "activity",
  },
  {
    href: "/app/obras",
    icon: "construction",
    label: "Obras",
    section: "works",
  },
  { href: "/app/fijos", icon: "checklist", label: "Fijos", section: "fixed" },
];
export function BottomNav({ active }: { active: Section }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.04] bg-[#f8f9ff]/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgba(0,0,0,0.05)] backdrop-blur-xl">
      <div className="relative mx-auto grid h-16 max-w-2xl grid-cols-5 items-center px-1 text-[11px]">
        <NavItem active={active === items[0].section} {...items[0]} />
        <NavItem active={active === items[1].section} {...items[1]} />
        <div aria-hidden="true" />
        <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
          <NuevoMovimientoTrigger />
        </div>
        <NavItem active={active === items[2].section} {...items[2]} />
        <NavItem active={active === items[3].section} {...items[3]} />
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
  section: Section;
}) {
  return (
    <a
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
    </a>
  );
}
