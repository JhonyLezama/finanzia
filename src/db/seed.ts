import type { Category, ISOTimestamp } from '@/domain/models';

export interface DefaultCategorySeed {
  name: string;
  kind: Category['kind'];
  group: Category['group'];
  colorToken: string;
  icon: string;
}

export const defaultCategorySeeds: DefaultCategorySeed[] = [
  { name: 'Vivienda', kind: 'expense', group: 'fixed', colorToken: 'primary', icon: 'House' },
  { name: 'Servicios', kind: 'expense', group: 'fixed', colorToken: 'gold', icon: 'Zap' },
  {
    name: 'Suscripciones',
    kind: 'expense',
    group: 'fixed',
    colorToken: 'red',
    icon: 'Repeat',
  },
  { name: 'Comida', kind: 'expense', group: 'variable', colorToken: 'gold', icon: 'Utensils' },
  { name: 'Transporte', kind: 'expense', group: 'variable', colorToken: 'primary', icon: 'Bus' },
  { name: 'Salud', kind: 'expense', group: 'variable', colorToken: 'red', icon: 'HeartPulse' },
  { name: 'Ocio', kind: 'expense', group: 'variable', colorToken: 'gold', icon: 'Ticket' },
  {
    name: 'Educación',
    kind: 'expense',
    group: 'variable',
    colorToken: 'primary',
    icon: 'GraduationCap',
  },
  { name: 'Otros', kind: 'expense', group: 'variable', colorToken: 'ink-muted', icon: 'Shapes' },
  { name: 'Sueldo', kind: 'income', group: 'income', colorToken: 'primary', icon: 'Wallet' },
  { name: 'Extra', kind: 'income', group: 'income', colorToken: 'gold', icon: 'Sparkles' },
  {
    name: 'Inversiones',
    kind: 'income',
    group: 'income',
    colorToken: 'primary',
    icon: 'TrendingUp',
  },
  {
    name: 'Otros ingresos',
    kind: 'income',
    group: 'income',
    colorToken: 'ink-muted',
    icon: 'Coins',
  },
];

export function buildDefaultCategories(createdAt: ISOTimestamp): Category[] {
  return defaultCategorySeeds.map((seed, index) => ({
    id: crypto.randomUUID(),
    ...seed,
    order: index + 1,
    archived: 0,
    isDefault: 1,
    createdAt,
    updatedAt: createdAt,
  }));
}
