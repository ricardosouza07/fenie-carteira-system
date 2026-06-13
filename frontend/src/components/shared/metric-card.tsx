import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardTone = "default" | "success" | "warning" | "danger" | "info";

const toneMap: Record<MetricCardTone, string> = {
  default: "text-primary",
  success: "text-success-foreground",
  warning: "text-warning-foreground",
  danger: "text-danger-soft-foreground",
  info: "text-info-foreground",
};

type MetricCardProps = {
  label: string;
  value: string;
  hint?: string;
  icon?: LucideIcon;
  tone?: MetricCardTone;
};

export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: MetricCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex min-h-28 items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <div className="mt-2 text-2xl font-semibold tracking-normal text-foreground">
            {value}
          </div>
          {hint ? (
            <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted",
              toneMap[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
