"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { Button } from "@/components/ui/button";
import { AuthClientProvider } from "@/features/auth/client-context";
import type { AuthContext } from "@/features/auth/types";
import { GamificationProvider } from "@/features/gamification/gamification-provider";
import { cn } from "@/lib/utils";

type AppShellProps = {
  auth: AuthContext;
  children: React.ReactNode;
};

export function AppShell({ auth, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <AuthClientProvider auth={auth}>
      <GamificationProvider>
        <div className="min-h-screen bg-background">
          <div className="hidden lg:fixed lg:inset-y-0 lg:flex">
            <Sidebar auth={auth} />
          </div>

          {mobileOpen ? (
            <div className="fixed inset-0 z-40 lg:hidden">
              <div
                className="absolute inset-0 bg-foreground/35"
                onClick={() => setMobileOpen(false)}
              />
              <div className="absolute inset-y-0 left-0 flex">
                <Sidebar auth={auth} onNavigate={() => setMobileOpen(false)} />
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="absolute left-[17rem] top-3"
                onClick={() => setMobileOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : null}

          <div className={cn("lg:pl-64")}>
            <Topbar auth={auth} onMenuClick={() => setMobileOpen(true)} />
            <main className="min-h-[calc(100vh-4rem)] px-4 py-5 lg:px-6">
              <div className="mx-auto w-full max-w-[1500px]">{children}</div>
            </main>
          </div>
        </div>
      </GamificationProvider>
    </AuthClientProvider>
  );
}
