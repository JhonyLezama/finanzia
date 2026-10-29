import { addMonths, currentMonth, dueDateForMonth, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { Category, ISODate, MonthKey } from '@/domain/models';
import { auditRepo } from './audit';
import { categoryRepo } from './categories';
import { goalRepo } from './goals';
import { planRepo } from './plans';
import { recurringRepo } from './recurring';
import { transactionRepo } from './transactions';

const SAMPLE_MONTHS = 3;
const SAMPLE_OPENING_CENTS = 100000;

interface SampleMonth {
  key: MonthKey;
  isCurrent: boolean;
}

function findCategory(categories: Category[], name: string, kind: Category['kind']): Category {
  const category = categories.find((entry) => entry.name === name && entry.kind === kind);
  if (!category) {
    throw new Error(`No se encontró la categoría ${name}.`);
  }
  return category;
}

function sampleMonths(): SampleMonth[] {
  const current = currentMonth();
  const months: SampleMonth[] = [];

  for (let offset = SAMPLE_MONTHS - 1; offset >= 0; offset -= 1) {
    months.push({ key: addMonths(current, -offset), isCurrent: offset === 0 });
  }

  return months;
}

/**
 * Clamps a day to today when the month is the current one, so sample data
 * never contains future-dated movements.
 */
function sampleDate(month: SampleMonth, day: number, todayDay: number): ISODate {
  return dueDateForMonth(month.key, month.isCurrent ? Math.min(day, todayDay) : day);
}

export interface SampleDataSummary {
  months: MonthKey[];
  transactions: number;
  goals: number;
  rules: number;
}

export async function seedSampleData(): Promise<SampleDataSummary> {
  await categoryRepo.ensureDefaults();
  const categories = await categoryRepo.list();

  const vivienda = findCategory(categories, 'Vivienda', 'expense');
  const servicios = findCategory(categories, 'Servicios', 'expense');
  const suscripciones = findCategory(categories, 'Suscripciones', 'expense');
  const comida = findCategory(categories, 'Comida', 'expense');
  const transporte = findCategory(categories, 'Transporte', 'expense');
  const ocio = findCategory(categories, 'Ocio', 'expense');
  const sueldo = findCategory(categories, 'Sueldo', 'income');

  const today = todayInLima();
  const todayDay = Number(today.slice(8, 10));
  const months = sampleMonths();
  const firstMonth = months[0];
  const current = months[months.length - 1];

  if (!firstMonth || !current) {
    throw new Error('No se pudieron preparar los meses de ejemplo.');
  }

  await transactionRepo.create({
    type: 'opening',
    direction: 'in',
    amountCents: asCents(SAMPLE_OPENING_CENTS),
    date: dueDateForMonth(firstMonth.key, 1),
    description: 'Saldo inicial de ejemplo',
    source: 'opening',
  });

  await recurringRepo.create({
    name: 'Alquiler',
    kind: 'fixed_expense',
    amountCents: asCents(38000),
    categoryId: vivienda.id,
    dayOfMonth: 5,
    startMonth: firstMonth.key,
  });
  await recurringRepo.create({
    name: 'Internet',
    kind: 'fixed_expense',
    amountCents: asCents(12000),
    categoryId: servicios.id,
    dayOfMonth: 15,
    startMonth: firstMonth.key,
  });
  await recurringRepo.create({
    name: 'Netflix',
    kind: 'fixed_expense',
    amountCents: asCents(3500),
    categoryId: suscripciones.id,
    dayOfMonth: 20,
    startMonth: firstMonth.key,
  });
  await recurringRepo.create({
    name: 'Sueldo',
    kind: 'expected_income',
    amountCents: asCents(220000),
    categoryId: sueldo.id,
    dayOfMonth: 1,
    startMonth: firstMonth.key,
  });

  const emergencyGoal = await goalRepo.create({
    name: 'Fondo de emergencia',
    targetCents: asCents(300000),
  });
  const tripGoal = await goalRepo.create({
    name: 'Viaje a Cusco',
    targetCents: asCents(200000),
  });

  for (const month of months) {
    const plan = await planRepo.getOrCreate(month.key);
    await planRepo.update(
      month.key,
      {
        savingsTargetCents: asCents(30000),
        variableBudgets: [
          { categoryId: comida.id, plannedCents: asCents(60000) },
          { categoryId: transporte.id, plannedCents: asCents(30000) },
          { categoryId: ocio.id, plannedCents: asCents(20000) },
        ],
      },
      { expectedUpdatedAt: plan.updatedAt },
    );

    await goalRepo.contribute(emergencyGoal.id, {
      amountCents: asCents(20000),
      date: sampleDate(month, 20, todayDay),
      note: 'Aporte mensual de ejemplo',
    });
    await goalRepo.contribute(tripGoal.id, {
      amountCents: asCents(15000),
      date: sampleDate(month, 20, todayDay),
      note: 'Aporte mensual de ejemplo',
    });
  }

  let transactionCount = 1;

  for (const month of months.slice(0, -1)) {
    const entries = [
      {
        type: 'income' as const,
        direction: 'in' as const,
        amountCents: asCents(220000),
        date: sampleDate(month, 1, todayDay),
        categoryId: sueldo.id,
        description: 'Sueldo',
      },
      {
        type: 'expense' as const,
        direction: 'out' as const,
        amountCents: asCents(38000),
        date: sampleDate(month, 5, todayDay),
        categoryId: vivienda.id,
        description: 'Alquiler',
      },
      {
        type: 'expense' as const,
        direction: 'out' as const,
        amountCents: asCents(12000),
        date: sampleDate(month, 15, todayDay),
        categoryId: servicios.id,
        description: 'Internet',
      },
      {
        type: 'expense' as const,
        direction: 'out' as const,
        amountCents: asCents(25000),
        date: sampleDate(month, 10, todayDay),
        categoryId: comida.id,
        description: 'Mercado',
      },
      {
        type: 'expense' as const,
        direction: 'out' as const,
        amountCents: asCents(8000),
        date: sampleDate(month, 12, todayDay),
        categoryId: transporte.id,
        description: 'Transporte',
      },
    ];

    for (const entry of entries) {
      await transactionRepo.create({ ...entry, source: 'manual' });
      transactionCount += 1;
    }
  }

  const currentItems = await planRepo.ensureItems(current.key);
  const salaryItem = currentItems.find((item) => item.kind === 'expected_income');
  const rentItem = currentItems.find(
    (item) => item.kind === 'fixed_expense' && item.name === 'Alquiler',
  );

  if (salaryItem) {
    await planRepo.receiveItem(
      salaryItem.id,
      {
        amountCents: salaryItem.amountCents,
        date: sampleDate(current, 1, todayDay),
      },
      { expectedUpdatedAt: salaryItem.updatedAt },
    );
    transactionCount += 1;
  }

  if (rentItem) {
    await planRepo.payItem(
      rentItem.id,
      {
        amountCents: rentItem.amountCents,
        date: sampleDate(current, 5, todayDay),
      },
      { expectedUpdatedAt: rentItem.updatedAt },
    );
    transactionCount += 1;
  }

  for (const entry of [
    {
      amountCents: asCents(25000),
      date: sampleDate(current, 10, todayDay),
      categoryId: comida.id,
      description: 'Mercado',
    },
    {
      amountCents: asCents(8000),
      date: sampleDate(current, 12, todayDay),
      categoryId: transporte.id,
      description: 'Transporte',
    },
  ]) {
    await transactionRepo.create({
      type: 'expense',
      direction: 'out',
      source: 'manual',
      ...entry,
    });
    transactionCount += 1;
  }

  await auditRepo.log({
    action: 'seed_data',
    entity: 'settings',
    entityId: 'app',
    summary: 'Datos de ejemplo cargados: 3 meses, 2 metas y 4 reglas recurrentes.',
    after: {
      months: months.map((month) => month.key),
      goals: [emergencyGoal.id, tripGoal.id],
    },
  });

  return {
    months: months.map((month) => month.key),
    transactions: transactionCount,
    goals: 2,
    rules: 4,
  };
}
