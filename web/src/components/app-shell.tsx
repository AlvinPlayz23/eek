import type React from "react";
import {
  BellIcon,
  CreditCardIcon,
  LayoutGridIcon,
  Link2Icon,
  LogOutIcon,
  Settings2Icon,
  SparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import type { Route } from "@/lib/route";

const NAV = [
  { route: "overview", label: "Overview", icon: LayoutGridIcon },
  { route: "reminders", label: "Reminders", icon: BellIcon },
  { route: "connections", label: "Connections", icon: Link2Icon },
  { route: "billing", label: "Billing", icon: CreditCardIcon },
  { route: "settings", label: "Settings", icon: Settings2Icon },
] as const satisfies ReadonlyArray<{ route: Route; label: string; icon: React.ElementType }>;

function Brand() {
  return (
    <a
      href="#/overview"
      className="flex items-center gap-2.5 rounded-[8px] outline-none focus-visible:ring-2 focus-visible:ring-brand"
    >
      <span className="grid size-[26px] place-items-center rounded-[8px] bg-brand text-white">
        <SparklesIcon className="size-3.5" />
      </span>
      <span className="text-[14px] font-medium tracking-[-0.01em] text-ink">Assistant</span>
    </a>
  );
}

function NavLink({
  route,
  label,
  icon: Icon,
  active,
}: {
  route: Route;
  label: string;
  icon: React.ElementType;
  active: boolean;
}) {
  return (
    <a
      href={`#/${route}`}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] outline-none transition-[background-color,color,box-shadow] duration-150 focus-visible:ring-2 focus-visible:ring-brand",
        active
          ? "raised font-medium text-ink"
          : "text-graphite hover:bg-mist/80 hover:text-ink"
      )}
    >
      <Icon className={cn("size-4", active ? "text-ink" : "text-ash")} />
      {label}
    </a>
  );
}

export function AppShell({
  route,
  email,
  onSignOut,
  children,
}: {
  route: Route;
  email: string | null;
  onSignOut: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-fog text-ink">
      <div className="mx-auto flex w-full max-w-[1200px]">
        <aside className="sticky top-0 hidden h-screen w-[228px] shrink-0 flex-col border-r border-hairline/80 px-4 py-6 md:flex">
          <Brand />

          <nav className="mt-8 flex flex-col gap-0.5">
            {NAV.map((item) => (
              <NavLink key={item.route} {...item} active={route === item.route} />
            ))}
          </nav>

          <div className="mt-auto flex flex-col gap-2 border-t border-hairline/80 pt-4">
            <div className="flex items-center justify-between gap-1 pl-2.5">
              <p
                className="min-w-0 truncate text-[11px] text-ash"
                title={email ?? undefined}
              >
                {email ?? "Signed in"}
              </p>
              <ThemeToggle />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="justify-start px-2.5 text-graphite"
              onClick={onSignOut}
            >
              <LogOutIcon />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-hairline/80 bg-fog/85 backdrop-blur-md md:hidden">
            <div className="flex items-center justify-between px-5 py-3">
              <Brand />
              <div className="flex items-center gap-1">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Sign out"
                  onClick={onSignOut}
                >
                  <LogOutIcon />
                </Button>
              </div>
            </div>
            <nav className="flex flex-wrap gap-1 px-4 pb-3">
              {NAV.map((item) => (
                <NavLink key={item.route} {...item} active={route === item.route} />
              ))}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-[920px] flex-1 px-5 pt-8 pb-16 md:px-10 md:pt-12">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
