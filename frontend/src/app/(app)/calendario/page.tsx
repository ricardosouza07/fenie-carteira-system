import { CalendarioView } from "@/features/calendario/calendario-view";
import { loadCalendarioFromSupabase } from "@/features/calendario/supabase-service";

export const dynamic = "force-dynamic";

export default async function CalendarioPage() {
  const initialCalendario = await loadCalendarioFromSupabase();

  return <CalendarioView initialCalendario={initialCalendario} />;
}
