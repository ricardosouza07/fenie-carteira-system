"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type TableColumnOption<ColumnId extends string> = {
  id: ColumnId;
  label: string;
  description?: string;
  mandatory?: boolean;
};

export type TableColumnPreset<ColumnId extends string> = {
  id: string;
  label: string;
  columns: readonly ColumnId[];
};

type UseTableColumnPreferencesInput<ColumnId extends string> = {
  storageKey: string;
  userScope?: string | null;
  columns: readonly TableColumnOption<ColumnId>[];
  presets: readonly TableColumnPreset<ColumnId>[];
  defaultPresetId: string;
};

function sameColumns<ColumnId extends string>(
  first: readonly ColumnId[],
  second: readonly ColumnId[],
) {
  return (
    first.length === second.length &&
    first.every((column, index) => column === second[index])
  );
}

export function useTableColumnPreferences<ColumnId extends string>({
  storageKey,
  userScope,
  columns,
  presets,
  defaultPresetId,
}: UseTableColumnPreferencesInput<ColumnId>) {
  const allowedColumns = useMemo(
    () => new Set(columns.map((column) => column.id)),
    [columns],
  );
  const mandatoryColumns = useMemo(
    () => columns.filter((column) => column.mandatory).map((column) => column.id),
    [columns],
  );
  const defaultColumns = useMemo(
    () =>
      presets.find((preset) => preset.id === defaultPresetId)?.columns ??
      columns.map((column) => column.id),
    [columns, defaultPresetId, presets],
  );
  const scopedStorageKey = `${storageKey}:${userScope ?? "browser"}`;
  const normalizeColumns = useCallback(
    (input: readonly ColumnId[]) => {
      const selected = new Set(
        input.filter((column) => allowedColumns.has(column)),
      );

      for (const mandatoryColumn of mandatoryColumns) {
        selected.add(mandatoryColumn);
      }

      return columns
        .map((column) => column.id)
        .filter((column) => selected.has(column));
    },
    [allowedColumns, columns, mandatoryColumns],
  );
  const [visibleColumns, setVisibleColumns] = useState<ColumnId[]>(() =>
    normalizeColumns(defaultColumns),
  );
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }

      try {
        const storedValue = window.localStorage.getItem(scopedStorageKey);
        const parsedValue = storedValue
          ? (JSON.parse(storedValue) as unknown)
          : null;
        const storedColumns = Array.isArray(parsedValue)
          ? parsedValue.filter(
              (value): value is ColumnId => typeof value === "string",
            )
          : defaultColumns;

        setVisibleColumns(normalizeColumns(storedColumns));
      } catch {
        setVisibleColumns(normalizeColumns(defaultColumns));
      } finally {
        setHydratedStorageKey(scopedStorageKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [defaultColumns, normalizeColumns, scopedStorageKey]);

  useEffect(() => {
    if (hydratedStorageKey !== scopedStorageKey) {
      return;
    }

    try {
      window.localStorage.setItem(
        scopedStorageKey,
        JSON.stringify(visibleColumns),
      );
    } catch {
      // Browsers with blocked storage still keep the preference for this mount.
    }
  }, [hydratedStorageKey, scopedStorageKey, visibleColumns]);

  const visibleColumnSet = useMemo(
    () => new Set(visibleColumns),
    [visibleColumns],
  );
  const activePresetId =
    presets.find((preset) =>
      sameColumns(normalizeColumns(preset.columns), visibleColumns),
    )?.id ?? null;

  function toggleColumn(columnId: ColumnId) {
    const option = columns.find((column) => column.id === columnId);

    if (option?.mandatory) {
      return;
    }

    setVisibleColumns((current) =>
      normalizeColumns(
        current.includes(columnId)
          ? current.filter((column) => column !== columnId)
          : [...current, columnId],
      ),
    );
  }

  function applyPreset(presetId: string) {
    const preset = presets.find((item) => item.id === presetId);

    if (preset) {
      setVisibleColumns(normalizeColumns(preset.columns));
    }
  }

  return {
    activePresetId,
    applyPreset,
    isHydrated: hydratedStorageKey === scopedStorageKey,
    toggleColumn,
    visibleColumns,
    visibleColumnSet,
  };
}
