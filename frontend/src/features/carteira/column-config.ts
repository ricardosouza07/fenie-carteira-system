import type {
  TableColumnOption,
  TableColumnPreset,
} from "@/components/shared/table-column-preferences";

export type CarteiraColumnId =
  | "nivel"
  | "cliente"
  | "telefone"
  | "cidade"
  | "cep"
  | "endereco"
  | "diasSemComprar"
  | "proximaCompra"
  | "ultimoPedido"
  | "vendedor"
  | "status"
  | "ultimaAcao";

export const carteiraColumns = [
  { id: "nivel", label: "Nível" },
  { id: "cliente", label: "Cliente", mandatory: true },
  { id: "telefone", label: "Telefone" },
  { id: "cidade", label: "Cidade/Bairro" },
  { id: "cep", label: "CEP" },
  { id: "endereco", label: "Endereço" },
  { id: "diasSemComprar", label: "Dias sem comprar", mandatory: true },
  { id: "proximaCompra", label: "Próxima compra" },
  { id: "ultimoPedido", label: "Último pedido" },
  { id: "vendedor", label: "Vendedor" },
  { id: "status", label: "Status" },
  { id: "ultimaAcao", label: "Última ação" },
] as const satisfies readonly TableColumnOption<CarteiraColumnId>[];

export const carteiraColumnPresets = [
  {
    id: "compacta",
    label: "Compacta",
    columns: ["cliente", "diasSemComprar", "status"],
  },
  {
    id: "operacional",
    label: "Operacional",
    columns: [
      "cliente",
      "cidade",
      "diasSemComprar",
      "proximaCompra",
      "ultimoPedido",
      "vendedor",
      "status",
    ],
  },
  {
    id: "completa",
    label: "Completa",
    columns: carteiraColumns.map((column) => column.id),
  },
] as const satisfies readonly TableColumnPreset<CarteiraColumnId>[];

export const carteiraColumnWidths: Record<CarteiraColumnId, number> = {
  nivel: 86,
  cliente: 170,
  telefone: 124,
  cidade: 120,
  cep: 88,
  endereco: 190,
  diasSemComprar: 90,
  proximaCompra: 102,
  ultimoPedido: 104,
  vendedor: 100,
  status: 110,
  ultimaAcao: 126,
};

export const CARTEIRA_COLUMNS_STORAGE_KEY =
  "fenie.table-columns.carteira.v1";
