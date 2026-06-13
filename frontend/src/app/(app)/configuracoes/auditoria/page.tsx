import { DataTable, type DataTableColumn } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";

type AuditRow = {
  data: string;
  usuario: string;
  acao: string;
  entidade: string;
};

const columns: DataTableColumn<AuditRow>[] = [
  { key: "data", header: "Data" },
  { key: "usuario", header: "Usuário" },
  { key: "acao", header: "Ação" },
  { key: "entidade", header: "Entidade" },
];

export default function AuditoriaPage() {
  return (
    <>
      <PageHeader
        title="Auditoria"
        description="Base visual para rastrear importações, exportações e ações críticas."
      />
      <DataTable
        columns={columns}
        rows={[]}
        emptyTitle="Nenhum evento de auditoria"
        emptyDescription="Os logs serão criados quando as operações funcionais forem implementadas."
      />
    </>
  );
}
