import { DashboardView } from "@/features/dashboard/dashboard-view";
import { loadDashboardFromSupabase } from "@/features/dashboard/supabase-service";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const initialDashboard = await loadDashboardFromSupabase();

  return <DashboardView initialDashboard={initialDashboard} />;
}
