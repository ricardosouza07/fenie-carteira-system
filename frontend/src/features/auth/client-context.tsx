"use client";

import { createContext, useContext } from "react";

import type { AuthContext } from "./types";

const AuthClientContext = createContext<AuthContext | null>(null);

export function AuthClientProvider({
  auth,
  children,
}: {
  auth: AuthContext;
  children: React.ReactNode;
}) {
  return (
    <AuthClientContext.Provider value={auth}>
      {children}
    </AuthClientContext.Provider>
  );
}

export function useAuthContext() {
  const auth = useContext(AuthClientContext);

  if (!auth) {
    throw new Error("useAuthContext deve ser usado dentro de AuthClientProvider.");
  }

  return auth;
}
