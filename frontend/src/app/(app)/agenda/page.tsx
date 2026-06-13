import { AgendaView } from "@/features/agenda/agenda-view";
import { loadAgendaFromSupabase } from "@/features/agenda/supabase-service";

export default async function AgendaPage() {
  const initialAgenda = await loadAgendaFromSupabase();

  return <AgendaView initialAgenda={initialAgenda} />;
}
