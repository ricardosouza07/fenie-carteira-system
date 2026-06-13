import type { Database } from "@/lib/supabase/types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type AuthProfile = {
  id: string;
  salespersonId: string | null;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
};

export type AuthMode = "supabase" | "dev";

export type AuthContext = {
  mode: AuthMode;
  profile: AuthProfile | null;
  warning?: string;
};
