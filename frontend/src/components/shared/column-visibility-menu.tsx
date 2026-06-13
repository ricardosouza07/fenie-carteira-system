"use client";

import { Check, ChevronDown, Columns3 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  TableColumnOption,
  TableColumnPreset,
} from "./table-column-preferences";

type ColumnVisibilityMenuProps<ColumnId extends string> = {
  columns: readonly TableColumnOption<ColumnId>[];
  presets: readonly TableColumnPreset<ColumnId>[];
  visibleColumns: ReadonlySet<ColumnId>;
  activePresetId: string | null;
  onToggle: (columnId: ColumnId) => void;
  onPresetChange: (presetId: string) => void;
};

export function ColumnVisibilityMenu<ColumnId extends string>({
  columns,
  presets,
  visibleColumns,
  activePresetId,
  onToggle,
  onPresetChange,
}: ColumnVisibilityMenuProps<ColumnId>) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Columns3 className="h-4 w-4" />
        Colunas
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </Button>

      {open ? (
        <div
          role="dialog"
          aria-label="Configurar colunas da tabela"
          className="fixed inset-x-4 top-20 z-50 rounded-md border bg-card p-3 shadow-lg sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:z-30 sm:w-[min(360px,calc(100vw-2rem))]"
        >
          <div className="mb-3">
            <div className="text-sm font-semibold text-foreground">
              Colunas visíveis
            </div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Escolha uma visão rápida ou ajuste os campos.
            </div>
          </div>

          <div className="mb-3 grid grid-cols-3 gap-1 rounded-md bg-muted p-1">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={cn(
                  "min-h-8 rounded px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                  activePresetId === preset.id &&
                    "bg-card text-foreground shadow-sm",
                )}
                onClick={() => onPresetChange(preset.id)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className="max-h-[min(420px,60vh)] space-y-1 overflow-y-auto pr-1">
            {columns.map((column) => {
              const checked = visibleColumns.has(column.id);

              return (
                <label
                  key={column.id}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-muted",
                    column.mandatory && "cursor-default",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={column.mandatory}
                    onChange={() => onToggle(column.id)}
                    className="sr-only"
                  />
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                      checked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-card",
                      column.mandatory && "opacity-70",
                    )}
                  >
                    {checked ? <Check className="h-3 w-3" /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">
                      {column.label}
                    </span>
                    {column.mandatory || column.description ? (
                      <span className="block text-xs text-muted-foreground">
                        {column.mandatory
                          ? "Sempre visível"
                          : column.description}
                      </span>
                    ) : null}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
