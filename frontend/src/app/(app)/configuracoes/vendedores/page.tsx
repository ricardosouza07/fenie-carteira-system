import { Plus } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

type SellerRow = {
  vendedor: string;
  aliases: string;
  usuario: string;
  tipo: string;
};

const columns: DataTableColumn<SellerRow>[] = [
  { key: "vendedor", header: "Vendedor" },
  { key: "aliases", header: "Aliases da planilha" },
  { key: "usuario", header: "Usuário vinculado" },
  { key: "tipo", header: "Tipo" },
];

export default function VendedoresPage() {
  return (
    <>
      <PageHeader
        title="Vendedores"
        description="Mapeamento visual entre nomes da planilha e usuários internos."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo vendedor
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={[]}
        emptyTitle="Nenhum vendedor mapeado"
        emptyDescription="O mapeamento será usado quando a importação XLSX estiver conectada."
      />
    </>
  );
}
