"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";

import { navSections } from "@/components/layout/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { logoutAction } from "@/features/auth/actions";
import { filterNavSectionsForRole, roleLabels } from "@/features/auth/permissions";
import type { AuthContext } from "@/features/auth/types";
import { cn } from "@/lib/utils";

type SidebarProps = {
  auth: AuthContext;
  className?: string;
  onNavigate?: () => void;
};

export function Sidebar({ auth, className, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const profile = auth.profile;
  const visibleSections = profile
    ? filterNavSectionsForRole(navSections, profile.role)
    : [];

  return (
    <aside
      className={cn(
        "flex h-full w-64 shrink-0 flex-col border-r bg-card",
        className,
      )}
    >
      <div className="flex h-16 items-center gap-3 border-b px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-md border bg-background text-sm font-bold text-primary">
          F
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            Fenie PRO
          </div>
          <div className="truncate text-xs text-muted-foreground">
            Central de Carteira
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
        {visibleSections.map((section) => (
          <div key={section.title}>
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section.title}
            </div>
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex h-9 items-center gap-3 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      isActive &&
                        "bg-accent text-accent-foreground shadow-[inset_3px_0_0_var(--primary)]",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {item.badge ? (
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                        {item.badge}
                      </Badge>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-3 rounded-md bg-muted px-3 py-2">
          <div className="truncate text-xs font-semibold text-foreground">
            {profile?.name ?? "Usuario"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {profile ? roleLabels[profile.role] : "Sem perfil"}
          </div>
          {auth.mode === "dev" ? (
            <div className="mt-1 text-[11px] font-medium text-warning-foreground">
              Modo dev/mock
            </div>
          ) : null}
        </div>
        <Separator className="mb-3" />
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="w-full justify-start text-muted-foreground"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </Button>
        </form>
      </div>
    </aside>
  );
}
