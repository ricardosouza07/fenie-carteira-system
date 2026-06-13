import { RelatoriosView } from "@/features/relatorios/relatorios-view";
import { loadRelatoriosFromSupabase } from "@/features/relatorios/supabase-service";

export const dynamic = "force-dynamic";

export default async function RelatoriosPage() {
  const initialRelatorios = await loadRelatoriosFromSupabase();

  return <RelatoriosView initialRelatorios={initialRelatorios} />;
}
