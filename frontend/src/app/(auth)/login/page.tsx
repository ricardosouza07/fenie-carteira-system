import { redirect } from "next/navigation";

import { LoginForm } from "@/features/auth/login-form";
import { getDefaultRouteForRole } from "@/features/auth/permissions";
import { getCurrentAuthContext } from "@/features/auth/server";

export default async function LoginPage() {
  const auth = await getCurrentAuthContext();

  if (auth.profile) {
    redirect(getDefaultRouteForRole(auth.profile.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <LoginForm />
    </main>
  );
}
