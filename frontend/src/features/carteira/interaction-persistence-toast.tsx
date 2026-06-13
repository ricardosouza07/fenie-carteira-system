"use client";

import { cn } from "@/lib/utils";

import type { SaveInteractionSupabaseResult } from "./server-types";

export type PersistenceToast = {
  id: string;
  tone: "success" | "warning" | "danger";
  title: string;
  message: string;
};

export function buildPersistenceToast(
  result: SaveInteractionSupabaseResult,
): PersistenceToast {
  return {
    id: `save-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    tone:
      result.status === "saved"
        ? "success"
        : result.status === "local_fallback"
          ? "warning"
          : "danger",
    title:
      result.status === "saved"
        ? "Interação salva"
        : result.status === "local_fallback"
          ? "Modo local/mock"
          : "Falha no Supabase",
    message: result.message,
  };
}

export function InteractionPersistenceToastStack({
  toasts,
  onDismiss,
}: {
  toasts: PersistenceToast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-28 z-[65] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cn(
            "rounded-lg border px-3 py-2 text-sm shadow-lg",
            toast.tone === "success" &&
              "border-success bg-success text-success-foreground",
            toast.tone === "warning" &&
              "border-warning bg-warning text-warning-foreground",
            toast.tone === "danger" &&
              "border-danger-soft bg-danger-soft text-danger-soft-foreground",
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-semibold">{toast.title}</div>
              <div className="mt-0.5 text-xs opacity-85">{toast.message}</div>
            </div>
            <button
              type="button"
              className="text-xs opacity-75 transition hover:opacity-100"
              onClick={() => onDismiss(toast.id)}
              aria-label="Fechar aviso de gravação"
            >
              Fechar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
