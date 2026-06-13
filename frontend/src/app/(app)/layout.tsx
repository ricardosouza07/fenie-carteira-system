import { AppShell } from "@/components/layout/app-shell";
import { getCurrentAuthContext } from "@/features/auth/server";
import { redirect } from "next/navigation";

export default async function InternalLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const auth = await getCurrentAuthContext();

  if (!auth.profile) {
    redirect("/login");
  }

  return <AppShell auth={auth}>{children}</AppShell>;
}
