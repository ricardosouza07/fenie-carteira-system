import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";

import { portfolioStatusLabels } from "./portfolio-status";
import type { PortfolioStatus } from "./types";

const portfolioStatusVariants: Record<
  PortfolioStatus,
  ComponentProps<typeof Badge>["variant"]
> = {
  ativo: "success",
  fechou_salao: "danger",
  mudou_de_ramo: "warning",
  sem_potencial: "muted",
  duplicado: "outline",
  arquivado: "muted",
};

export function PortfolioStatusBadge({
  status,
}: {
  status: PortfolioStatus;
}) {
  return (
    <Badge variant={portfolioStatusVariants[status]}>
      {portfolioStatusLabels[status]}
    </Badge>
  );
}
