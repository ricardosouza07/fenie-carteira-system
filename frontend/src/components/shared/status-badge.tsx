import { Badge } from "@/components/ui/badge";

export type StatusKind =
  | "saudavel"
  | "atencao"
  | "risco"
  | "inativo"
  | "nao_trabalhado"
  | "contatado"
  | "aguardando"
  | "convertido"
  | "visita"
  | "adimplente"
  | "inadimplente"
  | "bloqueado"
  | "negociacao";

const statusConfig: Record<
  StatusKind,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  saudavel: { label: "Saudável", variant: "success" },
  atencao: { label: "Atenção", variant: "warning" },
  risco: { label: "Risco", variant: "danger" },
  inativo: { label: "Inativo antigo", variant: "muted" },
  nao_trabalhado: { label: "Não trabalhado", variant: "muted" },
  contatado: { label: "Contatado", variant: "info" },
  aguardando: { label: "Aguardando retorno", variant: "warning" },
  convertido: { label: "Convertido", variant: "success" },
  visita: { label: "Visita encaminhada", variant: "info" },
  adimplente: { label: "Adimplente", variant: "success" },
  inadimplente: { label: "Inadimplente", variant: "danger" },
  bloqueado: { label: "Bloqueado", variant: "danger" },
  negociacao: { label: "Em negociação", variant: "warning" },
};

type StatusBadgeProps = {
  status: StatusKind;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
