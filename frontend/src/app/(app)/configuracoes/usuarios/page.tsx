import { Plus } from "lucide-react";

import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

type UserRow = {
  nome: string;
  email: string;
  perfil: string;
  status: string;
};

const columns: DataTableColumn<UserRow>[] = [
  { key: "nome", header: "Nome" },
  { key: "email", header: "E-mail" },
  { key: "perfil", header: "Perfil" },
  { key: "status", header: "Status" },
];

export default function UsuariosPage() {
  return (
    <>
      <PageHeader
        title="Usuários"
        description="Estrutura para gestão de acessos internos."
        actions={
          <Button size="sm">
            <Plus className="h-4 w-4" />
            Novo usuário
          </Button>
        }
      />
      <DataTable
        columns={columns}
        rows={[]}
        emptyTitle="Nenhum usuário carregado"
        emptyDescription="A autenticação completa será adicionada em etapa posterior."
      />
    </>
  );
}
