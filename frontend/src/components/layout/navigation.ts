import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CalendarClock,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  LayoutDashboard,
  Settings2,
  Target,
  UploadCloud,
  UserRoundCog,
  Users,
} from "lucide-react";

export type NavItem = {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    title: "Principal",
    items: [
      {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Minha agenda",
        href: "/agenda",
        icon: CalendarClock,
        badge: "3",
      },
      {
        title: "Carteira",
        href: "/carteira",
        icon: ClipboardList,
      },
      {
        title: "Calendario",
        href: "/calendario",
        icon: CalendarDays,
      },
    ],
  },
  {
    title: "Gestao",
    items: [
      {
        title: "Relatorios",
        href: "/relatorios",
        icon: BarChart3,
      },
      {
        title: "Metas",
        href: "/metas",
        icon: Target,
      },
      {
        title: "Importacoes",
        href: "/importacoes",
        icon: UploadCloud,
      },
    ],
  },
  {
    title: "Administracao",
    items: [
      {
        title: "Usuarios",
        href: "/configuracoes/usuarios",
        icon: Users,
      },
      {
        title: "Vendedores",
        href: "/configuracoes/vendedores",
        icon: UserRoundCog,
      },
      {
        title: "Regras",
        href: "/configuracoes/regras",
        icon: Settings2,
      },
      {
        title: "Auditoria",
        href: "/configuracoes/auditoria",
        icon: FileSpreadsheet,
      },
    ],
  },
];
