import type { NavSection } from "@/components/layout/navigation";

import type { AuthProfile, UserRole } from "./types";

export const devProfile: AuthProfile = {
  id: "dev-user",
  salespersonId: null,
  name: "Modo desenvolvimento",
  email: "dev@fenie.local",
  role: "admin",
  active: true,
};

export const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  supervisor: "Supervisor",
  operador_interno: "Operador interno",
  vendedor_interno: "Vendedor interno (legado)",
  vendedor_externo: "Vendedor externo (sem acesso)",
};

type RouteRule = {
  prefix: string;
  roles: UserRole[];
};

const authenticatedRoles: UserRole[] = [
  "admin",
  "supervisor",
  "operador_interno",
  "vendedor_interno",
  "vendedor_externo",
];

const internalRoles: UserRole[] = ["admin", "supervisor", "operador_interno"];

const routeRules: RouteRule[] = [
  { prefix: "/acesso-negado", roles: authenticatedRoles },
  { prefix: "/clientes", roles: internalRoles },
  {
    prefix: "/configuracoes/usuarios",
    roles: ["admin"],
  },
  {
    prefix: "/configuracoes/auditoria",
    roles: ["admin"],
  },
  {
    prefix: "/configuracoes/vendedores",
    roles: ["admin", "supervisor"],
  },
  {
    prefix: "/configuracoes/regras",
    roles: ["admin", "supervisor"],
  },
  {
    prefix: "/dashboard",
    roles: internalRoles,
  },
  {
    prefix: "/relatorios",
    roles: internalRoles,
  },
  {
    prefix: "/metas",
    roles: ["admin", "supervisor"],
  },
  {
    prefix: "/importacoes",
    roles: ["admin", "supervisor"],
  },
  {
    prefix: "/calendario",
    roles: internalRoles,
  },
  {
    prefix: "/carteira",
    roles: internalRoles,
  },
  {
    prefix: "/agenda",
    roles: internalRoles,
  },
];

function normalizePathname(pathname: string) {
  if (pathname === "/") {
    return "/dashboard";
  }

  return pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;
}

function matchesPrefix(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function getDefaultRouteForRole(role: UserRole) {
  return internalRoles.includes(role) ? "/dashboard" : "/acesso-negado";
}

export function isRouteAllowedForRole(pathname: string, role: UserRole) {
  if (role === "admin") {
    return true;
  }

  const normalized = normalizePathname(pathname);
  const rule = routeRules.find((item) => matchesPrefix(normalized, item.prefix));

  if (!rule) {
    return false;
  }

  return rule.roles.includes(role);
}

export function getDeniedRedirectForRole(role: UserRole) {
  return getDefaultRouteForRole(role);
}

export function filterNavSectionsForRole(
  sections: NavSection[],
  role: UserRole,
) {
  if (role === "admin") {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        isRouteAllowedForRole(item.href, role),
      ),
    }))
    .filter((section) => section.items.length > 0);
}
