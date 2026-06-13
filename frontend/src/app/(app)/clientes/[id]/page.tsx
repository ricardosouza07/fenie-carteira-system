import { ClienteDetailView } from "@/features/clientes/cliente-detail-view";
import { loadClienteDetailFromSupabase } from "@/features/clientes/supabase-service";
import { carteiraClients } from "@/features/carteira/mock-clients";

type ClientePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ClientePage({ params }: ClientePageProps) {
  const { id } = await params;
  const detail = await loadClienteDetailFromSupabase(id);
  const client =
    detail.client ?? carteiraClients.find((item) => item.id === id) ?? null;

  return (
    <ClienteDetailView
      clientId={id}
      initialClient={client}
      initialDetail={detail}
    />
  );
}
