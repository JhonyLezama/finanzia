import { ArrowLeftRight, ChartColumn, House, Target, Wallet, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
}

export const navItems: NavItem[] = [
  { to: '/', label: 'Inicio', icon: House, end: true },
  { to: '/movimientos', label: 'Movimientos', icon: ArrowLeftRight },
  { to: '/presupuesto', label: 'Presupuesto', icon: Wallet },
  { to: '/reportes', label: 'Reportes', icon: ChartColumn },
  { to: '/metas', label: 'Metas', icon: Target },
];
