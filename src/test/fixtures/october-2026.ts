import type {
  Category,
  ISODate,
  ISOTimestamp,
  MonthKey,
  MonthlyPlan,
  PlanItem,
  Transaction,
} from '@/domain/models';

const tenantId = '2026-10';

const ids = {
  alquiler: '11111111-1111-4111-8111-111111111111',
  internet: '22222222-2222-4222-8222-222222222222',
  gym: '33333333-3333-4333-8333-333333333333',
  comida: '44444444-4444-4444-8444-444444444444',
  transporte: '55555555-5555-4555-8555-555555555555',
  sueldo: '66666666-6666-4666-8666-666666666666',
  goal: '77777777-7777-4777-8777-777777777777',
  opening: '88888888-8888-4888-8888-888888888888',
  income: '99999999-9999-4999-8999-999999999999',
  rentTx: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  foodTx: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  goalTx: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  rentItem: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  internetItem: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  gymItem: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
  rentRule: '12121212-1212-4212-8212-121212121212',
} as const;

const timestamp = `${tenantId}-01T00:00:00.000Z` as ISOTimestamp;

function category(
  id: string,
  name: string,
  kind: Category['kind'],
  group: Category['group'],
  order: number,
): Category {
  return {
    id,
    name,
    kind,
    group,
    colorToken: `token-${order}`,
    order,
    archived: 0,
    isDefault: 1,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export const octoberCategories: Category[] = [
  category(ids.alquiler, 'Vivienda', 'expense', 'fixed', 1),
  category(ids.internet, 'Servicios', 'expense', 'fixed', 2),
  category(ids.gym, 'Suscripciones', 'expense', 'fixed', 3),
  category(ids.comida, 'Comida', 'expense', 'variable', 4),
  category(ids.transporte, 'Transporte', 'expense', 'variable', 5),
  category(ids.sueldo, 'Sueldo', 'income', 'income', 6),
];

function transaction(partial: Partial<Transaction> & Pick<Transaction, 'id' | 'type' | 'direction' | 'amountCents' | 'date' | 'description'>): Transaction {
  return {
    currency: 'PEN',
    source: 'manual',
    createdAt: timestamp,
    updatedAt: timestamp,
    deleted: 0,
    ...partial,
  } as Transaction;
}

const opening = transaction({
  id: ids.opening,
  type: 'opening',
  direction: 'in',
  amountCents: 90000 as Transaction['amountCents'],
  date: '2026-09-30' as ISODate,
  description: 'Saldo inicial',
  source: 'opening',
});

const income = transaction({
  id: ids.income,
  type: 'income',
  direction: 'in',
  amountCents: 220000 as Transaction['amountCents'],
  date: '2026-10-01' as ISODate,
  categoryId: ids.sueldo,
  description: 'Sueldo',
});

const rentPayment = transaction({
  id: ids.rentTx,
  type: 'expense',
  direction: 'out',
  amountCents: 38000 as Transaction['amountCents'],
  date: '2026-10-05' as ISODate,
  categoryId: ids.alquiler,
  description: 'Alquiler',
  planItemId: ids.rentItem,
  recurringRuleId: ids.rentRule,
  source: 'recurring',
});

const foodExpense = transaction({
  id: ids.foodTx,
  type: 'expense',
  direction: 'out',
  amountCents: 25000 as Transaction['amountCents'],
  date: '2026-10-10' as ISODate,
  categoryId: ids.comida,
  description: 'Comida',
});

const goalDeposit = transaction({
  id: ids.goalTx,
  type: 'goal_deposit',
  direction: 'out',
  amountCents: 20000 as Transaction['amountCents'],
  date: '2026-10-20' as ISODate,
  goalId: ids.goal,
  description: 'Aporte viaje',
  source: 'goal',
});

const rentItem: PlanItem = {
  id: ids.rentItem,
  planId: '2026-10' as MonthKey,
  kind: 'fixed_expense',
  name: 'Alquiler',
  categoryId: ids.alquiler,
  amountCents: 38000 as PlanItem['amountCents'],
  dueDate: '2026-10-05' as ISODate,
  status: 'settled',
  transactionId: ids.rentTx,
  recurringRuleId: ids.rentRule,
  createdAt: timestamp,
  updatedAt: timestamp,
};

const internetItem: PlanItem = {
  id: ids.internetItem,
  planId: '2026-10' as MonthKey,
  kind: 'fixed_expense',
  name: 'Internet',
  categoryId: ids.internet,
  amountCents: 12000 as PlanItem['amountCents'],
  dueDate: '2026-10-15' as ISODate,
  status: 'pending',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const gymItem: PlanItem = {
  id: ids.gymItem,
  planId: '2026-10' as MonthKey,
  kind: 'fixed_expense',
  name: 'Gimnasio',
  categoryId: ids.gym,
  amountCents: 9000 as PlanItem['amountCents'],
  dueDate: '2026-10-20' as ISODate,
  status: 'skipped',
  createdAt: timestamp,
  updatedAt: timestamp,
};

const plan: MonthlyPlan = {
  id: '2026-10' as MonthKey,
  year: 2026,
  month: 10,
  status: 'active',
  savingsTargetCents: 30000 as MonthlyPlan['savingsTargetCents'],
  variableBudgets: [
    { categoryId: ids.comida, plannedCents: 60000 as MonthlyPlan['savingsTargetCents'] },
    { categoryId: ids.transporte, plannedCents: 30000 as MonthlyPlan['savingsTargetCents'] },
  ],
  createdAt: timestamp,
  updatedAt: timestamp,
};

export const octoberFixtureIds = ids;

export function fixtureOctober2026() {
  return {
    transactions: [opening, income, rentPayment, foodExpense, goalDeposit],
    plan,
    planItems: [rentItem, internetItem, gymItem],
    categories: octoberCategories,
    currentMonth: '2026-10' as MonthlyPlan['id'],
  };
}

export function fixtureTransactions() {
  return [opening, income, rentPayment, foodExpense, goalDeposit];
}
