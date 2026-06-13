import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: keyof T | string;
  header: string;
  align?: "left" | "center" | "right";
  className?: string;
  render?: (row: T) => React.ReactNode;
};

type DataTableProps<T> = {
  columns: DataTableColumn<T>[];
  rows: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  className?: string;
};

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  isLoading = false,
  emptyTitle = "Nenhum registro encontrado",
  emptyDescription,
  className,
}: DataTableProps<T>) {
  if (!isLoading && rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cn("rounded-lg border bg-card shadow-sm", className)}>
      <Table className="table-density-compact">
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead
                key={String(column.key)}
                className={cn(
                  column.align === "center" && "text-center",
                  column.align === "right" && "text-right",
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => (
                    <TableCell key={String(column.key)}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columns.map((column) => {
                    const content = column.render
                      ? column.render(row)
                      : row[column.key as keyof T];

                    return (
                      <TableCell
                        key={String(column.key)}
                        className={cn(
                          column.align === "center" && "text-center",
                          column.align === "right" && "text-right",
                          column.className,
                        )}
                      >
                        {content as React.ReactNode}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
        </TableBody>
      </Table>
    </div>
  );
}
