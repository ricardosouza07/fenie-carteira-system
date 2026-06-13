"use client";

import { Bell, CalendarDays, Menu, Search } from "lucide-react";

import { SearchInput } from "@/components/shared/search-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/features/auth/permissions";
import type { AuthContext } from "@/features/auth/types";
import { getCurrentPeriod } from "@/lib/current-period";

type TopbarProps = {
  auth: AuthContext;
  onMenuClick: () => void;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join("") || "U";
}

export function Topbar({ auth, onMenuClick }: TopbarProps) {
  const profile = auth.profile;
  const currentPeriod = getCurrentPeriod();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="hidden min-w-0 flex-1 items-center gap-3 md:flex">
        <div className="relative w-full max-w-md">
          <SearchInput
            placeholder="Busca rapida"
            aria-label="Busca rapida"
            icon={<Search className="h-4 w-4" />}
          />
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        {auth.mode === "dev" ? (
          <Badge variant="warning" className="hidden sm:inline-flex">
            Dev/mock
          </Badge>
        ) : null}
        <div
          className="hidden items-center gap-1.5 rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground sm:flex"
          title="Competência atual usada como período inicial dos indicadores"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Competência: {currentPeriod.label}</span>
        </div>
        <Button variant="ghost" size="icon" aria-label="Notificacoes">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="hidden min-w-0 text-right md:block">
          <div className="max-w-36 truncate text-xs font-semibold text-foreground">
            {profile?.name ?? "Usuario"}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {profile ? roleLabels[profile.role] : "Sem perfil"}
          </div>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-xs font-semibold text-primary-foreground">
          {initials(profile?.name ?? "Usuario")}
        </div>
      </div>
    </header>
  );
}
