import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Archive,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  Link2,
  LogOut,
  Menu,
  PanelLeftClose,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  TrendingUp,
  UserPlus,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/bge/ThemeToggle";

import { supabase } from "@/integrations/supabase/client";
import type { SyncStatus } from "@/lib/queries";
import { NotificationBell } from "@/components/bge/NotificationBell";
import { Button } from "@/components/ui/button";
import bgeLogoAsset from "@/assets/bge-logo.png.asset.json";

export function BgeMark({ size = 26, compact = false }: { size?: number; compact?: boolean }) {
  if (compact) {
    return (
      <span
        role="img"
        aria-label="Build, Grow & Exit"
        className="inline-flex shrink-0 rounded-sm bg-left-center bg-no-repeat"
        style={{
          width: size,
          height: size,
          backgroundImage: `url(${bgeLogoAsset.url})`,
          backgroundSize: `${size * 2.11}px ${size}px`,
        }}
      />
    );
  }

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden"
      style={{ width: size * 2.11, height: size }}
    >
      <img
        src={bgeLogoAsset.url}
        alt="Build, Grow & Exit"
        className="absolute h-full w-auto max-w-none shrink-0 object-contain object-left"
        style={{ width: size * 2.11, minWidth: size * 2.11 }}
      />
    </span>
  );
}

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/clients", label: "Current Clients", icon: ClipboardList },
  { to: "/onboarding", label: "Onboarding", icon: UserPlus },
  { to: "/todos", label: "Current To-Do List", icon: CheckSquare },
  { to: "/renewals", label: "Renewals", icon: RefreshCw },
  { to: "/upsells", label: "Upsells", icon: TrendingUp },
  { to: "/exclients", label: "Ex Clients", icon: Archive },
  { to: "/links", label: "Important Links", icon: Link2 },
  { to: "/command-centre", label: "Command Centre", icon: SlidersHorizontal },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function SyncIndicator({ status }: { status: SyncStatus }) {
  const map = {
    live: { colour: "var(--success)", label: "Live" },
    connecting: { colour: "var(--warning)", label: "Connecting" },
    error: { colour: "var(--destructive)", label: "Offline" },
  } as const;
  const item = map[status];
  return (
    <span className="hidden items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground md:inline-flex">
      <span className="size-2 rounded-full" style={{ backgroundColor: item.colour }} />
      {item.label}
    </span>
  );
}

export function AppShell({
  title,
  subtitle,
  actions,
  sync,
  compactHeader = false,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  sync: SyncStatus;
  compactHeader?: boolean;
  children: ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const navigate = useNavigate();
  const railCollapsed = compactHeader ? !sidebarHover : collapsed;

  const signOut = async () => {
    await supabase.auth.signOut();
    void navigate({ to: "/auth" });
  };

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-2">
      <div className="mb-3 flex h-14 items-center justify-center overflow-hidden py-2">
        <BgeMark size={railCollapsed ? 30 : 38} compact={railCollapsed} />
      </div>

      {NAV.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => setDrawer(false)}
          activeProps={{ className: "ember-fill shadow-ember text-primary-foreground" }}
          inactiveProps={{
            className:
              "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          }}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] font-medium transition-colors"
          title={item.label}
        >
          <item.icon className="size-4 shrink-0" />
          {!railCollapsed && <span className="truncate">{item.label}</span>}
        </Link>
      ))}

      <div className="mt-auto space-y-1">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setCollapsed((v) => !v)}
          className={cn(
            "hidden w-full justify-start px-2.5 text-[13px] text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex",
            compactHeader && "lg:hidden",
          )}
        >
          <PanelLeftClose
            className={cn("size-4 shrink-0 transition-transform", railCollapsed && "rotate-180")}
          />
          {!railCollapsed && "Collapse"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          className="w-full justify-start px-2.5 text-[13px] text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="size-4 shrink-0" />
          {!railCollapsed && "Sign out"}
        </Button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        onMouseEnter={() => compactHeader && setSidebarHover(true)}
        onMouseLeave={() => compactHeader && setSidebarHover(false)}
        className={cn(
          "sticky top-0 z-50 hidden h-screen shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-300 lg:block",
          compactHeader && "shadow-pop",
        )}
        style={{ width: railCollapsed ? 56 : 240 }}
      >
        {sidebar}
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-overlay" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-60 bg-sidebar text-sidebar-foreground">
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className={cn(
            "sticky top-0 z-30 items-center gap-2 border-b border-border bg-card/95 px-3 py-3 backdrop-blur sm:gap-3 sm:px-4",
            compactHeader ? "hidden" : "flex",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setDrawer(true)}
            className="size-8 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="size-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold">{title}</h1>
            {subtitle && (
              <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
                {subtitle}
              </p>
            )}
          </div>
          {actions}
          <ThemeToggle />
          <NotificationBell audience="team" />
          <SyncIndicator status={sync} />
        </header>

        <main
          className={cn("relative min-w-0 flex-1", compactHeader ? "p-0" : "p-3 sm:p-4 lg:p-6")}
        >
          {!compactHeader && <div className="stage-ember" aria-hidden />}
          <div className="relative z-10">{children}</div>
        </main>
      </div>
    </div>
  );
}
