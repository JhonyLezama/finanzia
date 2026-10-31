# Recordatorios de pagos fijos — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar una bandeja global de recordatorios de pagos fijos vencidos, de hoy y próximos, con acciones de pagar, posponer, ocultar y crear recordatorios puntuales, sin backend.

**Architecture:** Los recordatorios se derivan de `PlanItem` mediante funciones puras. El estado del usuario (pospuesto/oculto) vive en una tabla Dexie separada, `reminderStates`. La UI es una campana en el header con un popover accionable. El futuro se sigue modelando con `PlanItem`; las transacciones nunca llevan fecha futura.

**Tech Stack:** React 19, TypeScript, Dexie 4, dexie-react-hooks, Radix UI, Tailwind CSS 4, sonner, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-30-reminders-design.md`

## Global Constraints

- Sin backend, sin Web Push, sin permisos del navegador y sin notificaciones del sistema operativo.
- Las transacciones nunca pueden tener fecha futura. La fecha se valida en `transactionRepo` y en `PayItemDialog`.
- Todas las comparaciones de fechas usan `todayInLima()`; nunca `new Date()` local para decidir vencimientos.
- Los textos visibles van en español, con el tono existente de la app.
- Objetivos táctiles de 44 px mínimo.
- Dexie sube a versión 2; el backup sube a esquema 2 y migra v1 agregando `reminderStates: []`.
- No se agregan dependencias nuevas.
- Se reutilizan `Dialog`, `Drawer`, `Button`, `Input`, `Select`, `Money`, `Card` y los patrones de `TransactionActions`.
- Cada tarea termina con tests verdes y un commit propio.

## Review Focus

- **Medianoche en Lima:** un ítem que vence “hoy” debe seguir siendo de hoy cuando UTC ya cambió de día. Test en Task 1 con `today` fijo y e2e con fecha de Lima.
- **Plan cerrado o inexistente:** un ítem pendiente de un mes cerrado no debe aparecer ni poder crearse. Tests en Task 1 y Task 4.
- **Estado huérfano:** posponer/ocultar y luego pagar, omitir o restaurar un backup no debe dejar filas que resuciten ítems. Tests en Task 3 y Task 4.
- **Header a 320 px:** el mes largo (“Septiembre De 2026”) más campana y engranaje no debe desbordar. Test e2e en Task 8 y Task 11.
- **Pago anticipado:** pagar un recordatorio con vencimiento futuro debe registrar la transacción con fecha de hoy, nunca futura. Test en Task 5.

---

### Task 1: Dominio de recordatorios

**Files:**
- Modify: `src/domain/dates.ts`
- Modify: `src/domain/dates.test.ts`
- Modify: `src/domain/models.ts`
- Create: `src/domain/reminders.ts`
- Test: `src/domain/reminders.test.ts`

**Interfaces:**
- Consumes: `ISODate`, `MonthlyPlan`, `PlanItem`, `ReminderState`, `UUID` de `./models`.
- Produces:
  - `addDays(date: ISODate, days: number): ISODate`
  - `formatDayMonth(date: ISODate): string` → `"15/11"`
  - `ReminderStatus`, `Reminder`, `ReminderBuckets`, `BuildReminderBucketsInput`
  - `buildReminderBuckets(input: BuildReminderBucketsInput): ReminderBuckets`

- [ ] **Step 1: Write the failing `addDays` tests**

En `src/domain/dates.test.ts`, agregar al describe existente:

```ts
describe('addDays', () => {
  it('adds days across a month boundary', () => {
    expect(addDays('2026-10-30' as ISODate, 2)).toBe('2026-11-01');
  });

  it('subtracts days across a year boundary', () => {
    expect(addDays('2026-01-01' as ISODate, -1)).toBe('2025-12-31');
  });
});
```

Importar `addDays` desde `./dates`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/domain/dates.test.ts`
Expected: FAIL con “addDays is not a function” o error de export.

- [ ] **Step 3: Implement `addDays` in `src/domain/dates.ts`**

```ts
export function addDays(date: ISODate, days: number): ISODate {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10) as ISODate;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/domain/dates.test.ts`
Expected: PASS.

- [ ] **Step 5: Add `ReminderState` to `src/domain/models.ts`**

Después de `RecurringRule`:

```ts
export interface ReminderState {
  planItemId: UUID;
  snoozedUntil?: ISODate;
  hiddenAt?: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
```

- [ ] **Step 6: Write the failing reminder bucket tests**

Crear `src/domain/reminders.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { asCents } from './money';
import type {
  ISODate,
  ISOTimestamp,
  MonthlyPlan,
  PlanItem,
  ReminderState,
} from './models';
import { buildReminderBuckets, formatDayMonth } from './reminders';

const TODAY = '2026-10-30' as ISODate;
const STAMP = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function plan(id: string, status: MonthlyPlan['status'] = 'active'): MonthlyPlan {
  return {
    id: id as MonthlyPlan['id'],
    year: 2026,
    month: 10,
    status,
    savingsTargetCents: asCents(0),
    variableBudgets: [],
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function item(
  partial: Partial<PlanItem> & Pick<PlanItem, 'id' | 'name' | 'dueDate'>,
): PlanItem {
  return {
    planId: '2026-10' as PlanItem['planId'],
    kind: 'fixed_expense',
    categoryId: 'cat',
    amountCents: asCents(10000),
    status: 'pending',
    createdAt: STAMP,
    updatedAt: STAMP,
    ...partial,
  };
}

function state(
  planItemId: string,
  partial: Partial<ReminderState> = {},
): ReminderState {
  return {
    planItemId: planItemId as ReminderState['planItemId'],
    updatedAt: STAMP,
    ...partial,
  };
}

describe('buildReminderBuckets', () => {
  it('separates overdue, today, and upcoming items', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'today', name: 'Hoy', dueDate: '2026-10-30' as ISODate }),
        item({ id: 'overdue', name: 'Vencido', dueDate: '2026-10-28' as ISODate }),
        item({ id: 'soon', name: 'Pronto', dueDate: '2026-11-02' as ISODate }),
        item({ id: 'far', name: 'Lejos', dueDate: '2026-11-20' as ISODate }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['overdue', 'today']);
    expect(buckets.upcoming.map((reminder) => reminder.item.id)).toEqual(['soon']);
    expect(buckets.badgeCount).toBe(2);
  });

  it('excludes settled, skipped, income, and closed-plan items', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10'), plan('2026-09', 'closed')],
      planItems: [
        item({ id: 'settled', name: 'Pagado', dueDate: TODAY, status: 'settled' }),
        item({ id: 'skipped', name: 'Omitido', dueDate: TODAY, status: 'skipped' }),
        item({
          id: 'income',
          name: 'Sueldo',
          dueDate: TODAY,
          kind: 'expected_income',
        }),
        item({
          id: 'closed',
          name: 'Viejo',
          dueDate: '2026-09-15' as ISODate,
          planId: '2026-09' as PlanItem['planId'],
        }),
      ],
      states: [],
    });

    expect(buckets.due).toEqual([]);
    expect(buckets.badgeCount).toBe(0);
  });

  it('includes a pending item from an open previous month', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10'), plan('2026-09')],
      planItems: [
        item({
          id: 'september',
          name: 'Septiembre',
          dueDate: '2026-09-15' as ISODate,
          planId: '2026-09' as PlanItem['planId'],
        }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['september']);
  });

  it('moves snoozed and hidden items out of due/upcoming and into hidden', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'snoozed', name: 'Pospuesto', dueDate: TODAY }),
        item({ id: 'hidden', name: 'Oculto', dueDate: TODAY }),
      ],
      states: [
        state('snoozed', { snoozedUntil: '2026-10-31' as ISODate }),
        state('hidden', { hiddenAt: STAMP }),
      ],
    });

    expect(buckets.due).toEqual([]);
    expect(buckets.hidden.map((reminder) => reminder.item.id)).toEqual([
      'snoozed',
      'hidden',
    ]);
  });

  it('shows a snoozed item again when the snooze date arrives', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [item({ id: 'snoozed', name: 'Pospuesto', dueDate: TODAY })],
      states: [state('snoozed', { snoozedUntil: TODAY })],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual(['snoozed']);
  });

  it('sorts due items by date and then by amount descending', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'small', name: 'Chico', dueDate: '2026-10-28' as ISODate }),
        item({
          id: 'big',
          name: 'Grande',
          dueDate: '2026-10-28' as ISODate,
          amountCents: asCents(50000),
        }),
        item({ id: 'today', name: 'Hoy', dueDate: TODAY }),
      ],
      states: [],
    });

    expect(buckets.due.map((reminder) => reminder.item.id)).toEqual([
      'big',
      'small',
      'today',
    ]);
  });

  it('labels overdue, today, and upcoming dates', () => {
    const buckets = buildReminderBuckets({
      today: TODAY,
      plans: [plan('2026-10')],
      planItems: [
        item({ id: 'overdue', name: 'Vencido', dueDate: '2026-10-28' as ISODate }),
        item({ id: 'today', name: 'Hoy', dueDate: TODAY }),
        item({ id: 'tomorrow', name: 'Mañana', dueDate: '2026-10-31' as ISODate }),
        item({ id: 'later', name: 'Luego', dueDate: '2026-11-02' as ISODate }),
      ],
      states: [],
    });

    expect(buckets.due[0].dueLabel).toBe('Vencido hace 2 días');
    expect(buckets.due[1].dueLabel).toBe('Vence hoy');
    expect(buckets.upcoming[0].dueLabel).toBe('Vence mañana');
    expect(buckets.upcoming[1].dueLabel).toBe('Vence el 02/11');
  });

  it('formats a day and month', () => {
    expect(formatDayMonth('2026-11-02' as ISODate)).toBe('02/11');
  });
});
```

- [ ] **Step 7: Run the test to verify it fails**

Run: `pnpm exec vitest run src/domain/reminders.test.ts`
Expected: FAIL porque `src/domain/reminders.ts` no existe.

- [ ] **Step 8: Implement `src/domain/reminders.ts`**

```ts
import { addDays } from './dates';
import type {
  ISODate,
  MonthlyPlan,
  PlanItem,
  ReminderState,
} from './models';

export type ReminderStatus = 'overdue' | 'today' | 'upcoming';

export interface Reminder {
  item: PlanItem;
  status: ReminderStatus;
  dueLabel: string;
  daysOverdue: number;
  state?: ReminderState;
}

export interface ReminderBuckets {
  due: Reminder[];
  upcoming: Reminder[];
  hidden: Reminder[];
  badgeCount: number;
}

export interface BuildReminderBucketsInput {
  planItems: PlanItem[];
  plans: MonthlyPlan[];
  states: ReminderState[];
  today: ISODate;
  upcomingDays?: number;
}

function daysBetween(from: ISODate, to: ISODate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
}

export function formatDayMonth(date: ISODate): string {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`;
}

function dueLabel(date: ISODate, today: ISODate): string {
  const diff = daysBetween(date, today);
  if (diff > 0) {
    return `Vencido hace ${diff} ${diff === 1 ? 'día' : 'días'}`;
  }
  if (diff === 0) {
    return 'Vence hoy';
  }
  if (diff === -1) {
    return 'Vence mañana';
  }
  return `Vence el ${formatDayMonth(date)}`;
}

function isHidden(state: ReminderState | undefined, today: ISODate): boolean {
  if (!state) {
    return false;
  }
  return Boolean(state.hiddenAt) || Boolean(state.snoozedUntil && today < state.snoozedUntil);
}

export function buildReminderBuckets({
  planItems,
  plans,
  states,
  today,
  upcomingDays = 7,
}: BuildReminderBucketsInput): ReminderBuckets {
  const stateByItem = new Map(
    states.map((state) => [state.planItemId, state] as const),
  );
  const openPlanIds = new Set(
    plans.filter((plan) => plan.status !== 'closed').map((plan) => plan.id),
  );
  const horizon = addDays(today, upcomingDays);

  const candidates = planItems.filter(
    (item) =>
      item.kind === 'fixed_expense' &&
      item.status === 'pending' &&
      openPlanIds.has(item.planId),
  );

  const due: Reminder[] = [];
  const upcoming: Reminder[] = [];
  const hidden: Reminder[] = [];

  for (const item of candidates) {
    const state = stateByItem.get(item.id);
    if (isHidden(state, today)) {
      hidden.push({
        item,
        state,
        status:
          item.dueDate === today
            ? 'today'
            : item.dueDate < today
              ? 'overdue'
              : 'upcoming',
        daysOverdue: Math.max(daysBetween(item.dueDate, today), 0),
        dueLabel: dueLabel(item.dueDate, today),
      });
      continue;
    }

    if (item.dueDate <= today) {
      due.push({
        item,
        state,
        status: item.dueDate === today ? 'today' : 'overdue',
        daysOverdue: Math.max(daysBetween(item.dueDate, today), 0),
        dueLabel: dueLabel(item.dueDate, today),
      });
    } else if (item.dueDate <= horizon) {
      upcoming.push({
        item,
        state,
        status: 'upcoming',
        daysOverdue: 0,
        dueLabel: dueLabel(item.dueDate, today),
      });
    }
  }

  const byDateThenAmount = (a: Reminder, b: Reminder) =>
    a.item.dueDate.localeCompare(b.item.dueDate) ||
    b.item.amountCents - a.item.amountCents;

  due.sort(byDateThenAmount);
  upcoming.sort(byDateThenAmount);
  hidden.sort(byDateThenAmount);

  return { due, upcoming, hidden, badgeCount: due.length };
}
```

El label de “Vence el” usa `formatDayMonth`.

- [ ] **Step 9: Run the test to verify it passes**

Run: `pnpm exec vitest run src/domain/reminders.test.ts src/domain/dates.test.ts`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add src/domain/dates.ts src/domain/dates.test.ts src/domain/models.ts src/domain/reminders.ts src/domain/reminders.test.ts
git commit -m "feat: derive pending payment reminders"
```

---

### Task 2: Estado de recordatorios en Dexie

**Files:**
- Modify: `src/domain/schemas.ts`
- Modify: `src/db/db.ts`
- Create: `src/db/repositories/reminder-states.ts`
- Test: `src/db/repositories/reminder-states.test.ts`

**Interfaces:**
- Consumes: `ReminderState` de Task 1.
- Produces:
  - `reminderStateSchema`
  - `db.reminderStates: EntityTable<ReminderState, 'planItemId'>`
  - `reminderStateRepo.list()`, `.snooze(planItemId, until)`, `.hide(planItemId)`, `.clear(planItemId)`

- [ ] **Step 1: Write the failing repository tests**

Crear `src/db/repositories/reminder-states.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import type { ISODate, UUID } from '@/domain/models';
import { resetDb } from '../test-utils';
import { reminderStateRepo } from './reminder-states';

const ITEM_ID = '11111111-1111-4111-8111-111111111111' as UUID;
const TOMORROW = '2026-10-31' as ISODate;

beforeEach(async () => {
  await resetDb();
});

describe('reminderStateRepo', () => {
  it('snoozes an item until a date', async () => {
    const state = await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    expect(state).toMatchObject({ planItemId: ITEM_ID, snoozedUntil: TOMORROW });
    expect(await reminderStateRepo.list()).toHaveLength(1);
  });

  it('hides an item and clears a previous snooze', async () => {
    await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    const state = await reminderStateRepo.hide(ITEM_ID);
    expect(state.hiddenAt).toBeTruthy();
    expect(state.snoozedUntil).toBeUndefined();
  });

  it('snoozing clears a previous hide', async () => {
    await reminderStateRepo.hide(ITEM_ID);
    const state = await reminderStateRepo.snooze(ITEM_ID, TOMORROW);
    expect(state.snoozedUntil).toBe(TOMORROW);
    expect(state.hiddenAt).toBeUndefined();
  });

  it('clears the state', async () => {
    await reminderStateRepo.hide(ITEM_ID);
    await reminderStateRepo.clear(ITEM_ID);
    expect(await reminderStateRepo.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/db/repositories/reminder-states.test.ts`
Expected: FAIL porque el repositorio no existe.

- [ ] **Step 3: Add `reminderStateSchema` to `src/domain/schemas.ts`**

```ts
export const reminderStateSchema = z.object({
  planItemId: uuidSchema,
  snoozedUntil: isoDateSchema.optional(),
  hiddenAt: timestampSchema.optional(),
  updatedAt: timestampSchema,
});
```

- [ ] **Step 4: Add the table to `src/db/db.ts`**

- Importar `ReminderState` desde `@/domain/models`.
- Declarar `reminderStates!: EntityTable<ReminderState, 'planItemId'>;`.
- Después de `this.version(1).stores({...})`, agregar:

```ts
this.version(2).stores({
  reminderStates: 'planItemId',
});
```

- [ ] **Step 5: Implement `src/db/repositories/reminder-states.ts`**

```ts
import { db, nowTimestamp } from '../db';
import { reminderStateSchema } from '@/domain/schemas';
import type { ISODate, ReminderState, UUID } from '@/domain/models';

export const reminderStateRepo = {
  async list(): Promise<ReminderState[]> {
    return db.reminderStates.toArray();
  },

  async snooze(planItemId: UUID, until: ISODate): Promise<ReminderState> {
    const state = reminderStateSchema.parse({
      planItemId,
      snoozedUntil: until,
      updatedAt: nowTimestamp(),
    }) as ReminderState;
    await db.reminderStates.put(state);
    return state;
  },

  async hide(planItemId: UUID): Promise<ReminderState> {
    const state = reminderStateSchema.parse({
      planItemId,
      hiddenAt: nowTimestamp(),
      updatedAt: nowTimestamp(),
    }) as ReminderState;
    await db.reminderStates.put(state);
    return state;
  },

  async clear(planItemId: UUID): Promise<void> {
    await db.reminderStates.delete(planItemId);
  },
};
```

`put` reemplaza la fila completa, así que `snooze` limpia `hiddenAt` y `hide` limpia `snoozedUntil`.

- [ ] **Step 6: Run the test to verify it passes**

Run: `pnpm exec vitest run src/db/repositories/reminder-states.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/schemas.ts src/db/db.ts src/db/repositories/reminder-states.ts src/db/repositories/reminder-states.test.ts
git commit -m "feat: persist reminder snooze and hide state"
```

---

### Task 3: Backup v2 con migración v1

**Files:**
- Modify: `src/domain/models.ts`
- Modify: `src/domain/schemas.ts`
- Modify: `src/domain/backup.ts`
- Modify: `src/db/repositories/backup.ts`
- Test: `src/db/repositories/backup.test.ts`

**Interfaces:**
- Consumes: `ReminderState` de Task 1, `reminderStateRepo` de Task 2.
- Produces:
  - `Backup.schemaVersion: 2`
  - `BackupData.reminderStates: ReminderState[]`
  - `CURRENT_BACKUP_SCHEMA = 2`
  - `migrateBackup` acepta v1 y devuelve v2 con `reminderStates: []`.

- [ ] **Step 1: Write the failing backup tests**

En `src/db/repositories/backup.test.ts`, agregar:

```ts
import { migrateBackup } from '@/domain/backup';
import type { ISODate, UUID } from '@/domain/models';
import { reminderStateRepo } from './reminder-states';

it('round-trips reminder states', async () => {
  const itemId = '11111111-1111-4111-8111-111111111111' as UUID;
  await reminderStateRepo.snooze(itemId, '2026-10-31' as ISODate);

  const backup = await backupRepo.exportAll('1.0.0');
  expect(backup.schemaVersion).toBe(2);
  expect(backup.data.reminderStates).toHaveLength(1);

  await resetDb();
  await backupRepo.replaceAll(backup);
  expect(await reminderStateRepo.list()).toHaveLength(1);
});

it('migrates a v1 backup by adding an empty reminder state list', async () => {
  const backup = await backupRepo.exportAll('1.0.0');
  const legacy = JSON.parse(JSON.stringify(backup)) as Record<string, unknown>;
  legacy.schemaVersion = 1;
  delete (legacy.data as Record<string, unknown>).reminderStates;

  const migrated = migrateBackup(legacy);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.data.reminderStates).toEqual([]);
});

it('rejects an unknown backup schema version', async () => {
  const backup = await backupRepo.exportAll('1.0.0');
  expect(() =>
    migrateBackup({ ...backup, schemaVersion: 3 } as unknown),
  ).toThrow(/esquema/i);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/db/repositories/backup.test.ts`
Expected: FAIL porque `reminderStates` no existe en el backup.

- [ ] **Step 3: Update the domain types and schemas**

En `src/domain/models.ts`:

```ts
export interface BackupData {
  // ...campos existentes
  reminderStates: ReminderState[];
}

export interface Backup {
  schemaVersion: 2;
  appVersion: string;
  exportedAt: ISOTimestamp;
  data: BackupData;
}
```

En `src/domain/schemas.ts`, dentro de `backupSchema`:

```ts
schemaVersion: z.literal(2),
// ...
reminderStates: z.array(reminderStateSchema),
```

- [ ] **Step 4: Implement the migration in `src/domain/backup.ts`**

```ts
export const CURRENT_BACKUP_SCHEMA = 2 as const;

export function migrateBackup(raw: unknown): Backup {
  if (raw && typeof raw === 'object' && 'schemaVersion' in raw) {
    const version = (raw as { schemaVersion?: unknown }).schemaVersion;

    if (version === 1) {
      const legacy = raw as {
        data?: Record<string, unknown>;
      } & Record<string, unknown>;
      return parseBackup({
        ...legacy,
        schemaVersion: 2,
        data: { ...(legacy.data ?? {}), reminderStates: [] },
      });
    }

    if (version !== CURRENT_BACKUP_SCHEMA) {
      throw new Error('Este respaldo usa un esquema que esta versión no puede migrar.');
    }
  }

  return parseBackup(raw);
}
```

- [ ] **Step 5: Update `src/db/repositories/backup.ts`**

- Agregar `db.reminderStates` a `BACKUP_TABLES`.
- Agregar `reminderStates` al `Promise.all` y al objeto `data`.
- Cambiar `schemaVersion: 1` a `schemaVersion: 2`.
- En `replaceAll`, agregar `if (backup.data.reminderStates.length) await db.reminderStates.bulkPut(backup.data.reminderStates);`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/db/repositories/backup.test.ts src/domain/schemas.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/domain/models.ts src/domain/schemas.ts src/domain/backup.ts src/db/repositories/backup.ts src/db/repositories/backup.test.ts
git commit -m "feat: back up reminder state with v1 migration"
```

---

### Task 4: Crear recordatorios puntuales y limpiar estado

**Files:**
- Modify: `src/db/repositories/plans.ts`
- Test: `src/db/repositories/plans.test.ts`

**Interfaces:**
- Consumes: `db.reminderStates` de Task 2, `reminderStateRepo` de Task 2.
- Produces:
  - `CreatePlanItemInput`
  - `planRepo.createItem(input: CreatePlanItemInput): Promise<PlanItem>`
  - `settleItem` usa `source: item.recurringRuleId ? 'recurring' : 'manual'`.
  - `payItem` y `skipItem` borran la fila de `reminderStates`.

- [ ] **Step 1: Write the failing repository tests**

Agregar a `src/db/repositories/plans.test.ts`:

```ts
import { addMonths, currentMonth, todayInLima } from '@/domain/dates';
import { reminderStateRepo } from './reminder-states';

describe('planRepo.createItem', () => {
  it('creates a pending one-off fixed expense in the current month', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });

    expect(item).toMatchObject({
      name: 'Cena especial',
      kind: 'fixed_expense',
      status: 'pending',
      dueDate: todayInLima(),
      planId: currentMonth(),
    });
    expect(item.recurringRuleId).toBeUndefined();
    expect(await db.plans.get(currentMonth())).toBeTruthy();
  });

  it('rejects a date before the current month', async () => {
    const previous = addMonths(currentMonth(), -1);
    await expect(
      planRepo.createItem({
        name: 'Viejo',
        amountCents: asCents(10000),
        categoryId: comida.id,
        dueDate: `${previous}-01` as ISODate,
      }),
    ).rejects.toThrow(/anterior al mes actual/i);
  });

  it('rejects a closed month', async () => {
    await planRepo.getOrCreate(currentMonth());
    await db.plans.update(currentMonth(), { status: 'closed' });

    await expect(
      planRepo.createItem({
        name: 'Cerrado',
        amountCents: asCents(10000),
        categoryId: comida.id,
        dueDate: todayInLima(),
      }),
    ).rejects.toThrow(/cerrado/i);
  });

  it('rejects an income category', async () => {
    await expect(
      planRepo.createItem({
        name: 'Sueldo',
        amountCents: asCents(10000),
        categoryId: sueldo.id,
        dueDate: todayInLima(),
      }),
    ).rejects.toThrow(/gasto/i);
  });
});

describe('one-off payments', () => {
  it('records a manual source and clears reminder state', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });
    await reminderStateRepo.hide(item.id);

    const { transaction } = await planRepo.payItem(
      item.id,
      { amountCents: item.amountCents, date: todayInLima() },
      { expectedUpdatedAt: item.updatedAt },
    );

    expect(transaction.source).toBe('manual');
    expect(await reminderStateRepo.list()).toEqual([]);
  });

  it('clears reminder state when an item is skipped', async () => {
    const item = await planRepo.createItem({
      name: 'Cena especial',
      amountCents: asCents(15000),
      categoryId: comida.id,
      dueDate: todayInLima(),
    });
    await reminderStateRepo.snooze(
      item.id,
      todayInLima(new Date(Date.now() + 86_400_000)),
    );

    await planRepo.skipItem(item.id, { expectedUpdatedAt: item.updatedAt });
    expect(await reminderStateRepo.list()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/db/repositories/plans.test.ts`
Expected: FAIL porque `createItem` no existe.

- [ ] **Step 3: Implement `CreatePlanItemInput` and `createItem`**

En `src/db/repositories/plans.ts`, ampliar los imports existentes (no agregar líneas duplicadas):

```ts
import { addMonths, currentMonth, monthRange, parseMonthKey, todayInLima, toMonthKey } from '@/domain/dates';
// planItemSchema ya está importado desde '@/domain/schemas'.

export interface CreatePlanItemInput {
  name: string;
  amountCents: Cents;
  categoryId: UUID;
  dueDate: ISODate;
  note?: string;
}

// dentro de planRepo:
async createItem(input: CreatePlanItemInput): Promise<PlanItem> {
  const month = toMonthKey(input.dueDate);
  const startOfMonth = monthRange(currentMonth()).start;
  const name = input.name.trim();

  if (!name) {
    throw new Error('El nombre es obligatorio.');
  }
  if (input.dueDate < startOfMonth) {
    throw new Error('La fecha no puede ser anterior al mes actual.');
  }

  const category = await db.categories.get(input.categoryId);
  if (!category || category.kind !== 'expense' || category.archived === 1) {
    throw new Error('Elegí una categoría de gasto activa.');
  }

  await planRepo.getOrCreate(month);

  return db.transaction(
    'rw',
    [db.plans, db.planItems, db.categories, db.auditLog],
    async () => {
      const plan = await db.plans.get(month);
      if (!plan) {
        throw new Error('El plan no existe.');
      }
      if (plan.status === 'closed') {
        throw new Error('El mes está cerrado y no admite cambios.');
      }

      const now = nowTimestamp();
      const item = planItemSchema.parse({
        id: crypto.randomUUID(),
        planId: month,
        kind: 'fixed_expense',
        name,
        categoryId: input.categoryId,
        amountCents: input.amountCents,
        dueDate: input.dueDate,
        status: 'pending',
        note: input.note?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      }) as PlanItem;

      await db.planItems.add(item);
      await auditRepo.log({
        action: 'create',
        entity: 'plan_item',
        entityId: item.id,
        summary: `Compromiso creado: ${item.name}`,
        after: item,
      });

      return item;
    },
  );
},
```

- [ ] **Step 4: Update `PLAN_TABLES`, `settleItem`, and `skipItem`**

- Agregar `db.reminderStates` a `PLAN_TABLES`.
- En `settleItem`, cambiar `source: 'recurring'` por:

```ts
source: item.recurringRuleId ? 'recurring' : 'manual',
```

- En `settleItem`, antes de devolver:

```ts
await db.reminderStates.delete(item.id);
```

- En `skipItem`, agregar `db.reminderStates` a la transacción y borrar la fila antes de devolver:

```ts
await db.reminderStates.delete(itemId);
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/db/repositories/plans.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db/repositories/plans.ts src/db/repositories/plans.test.ts
git commit -m "feat: create one-off payment reminders"
```

---

### Task 5: Corregir fechas futuras al pagar

**Files:**
- Modify: `src/features/budget/PayItemDialog.tsx`
- Test: `src/features/budget/PayItemDialog.test.tsx`

**Interfaces:**
- Consumes: `todayInLima`, `PayItemDialogProps`.
- Produces: fecha inicial nunca futura; validación “La fecha no puede ser futura.”

- [ ] **Step 1: Write the failing dialog test**

Crear `src/features/budget/PayItemDialog.test.tsx`:

```tsx
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { ISOTimestamp, PlanItem } from '@/domain/models';
import { PayItemDialog } from './PayItemDialog';

const STAMP = '2026-10-01T00:00:00.000Z' as ISOTimestamp;

function item(dueDate: PlanItem['dueDate']): PlanItem {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    planId: '2026-10' as PlanItem['planId'],
    kind: 'fixed_expense',
    name: 'Alquiler',
    categoryId: '22222222-2222-4222-8222-222222222222',
    amountCents: asCents(38000),
    dueDate,
    status: 'pending',
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

describe('PayItemDialog', () => {
  it('defaults a future due date to today and blocks future dates', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const tomorrow = addDays(todayInLima(), 1);

    render(
      <PayItemDialog
        open
        onOpenChange={() => {}}
        item={item(tomorrow)}
        onConfirm={onConfirm}
      />,
    );

    const date = screen.getByLabelText('Fecha');
    expect(date).toHaveValue(todayInLima());
    expect(date).toHaveAttribute('max', todayInLima());

    fireEvent.change(date, { target: { value: tomorrow } });
    await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no puede ser futura/i);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('keeps a past due date', () => {
    const yesterday = addDays(todayInLima(), -1);

    render(
      <PayItemDialog
        open
        onOpenChange={() => {}}
        item={item(yesterday)}
        onConfirm={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Fecha')).toHaveValue(yesterday);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/budget/PayItemDialog.test.tsx`
Expected: FAIL porque la fecha inicial es `tomorrow`.

- [ ] **Step 3: Implement the fix**

En `PayItemForm`:

```ts
const today = todayInLima();
const [date, setDate] = useState<ISODate>(() => {
  const initial = item.dueDate || today;
  return initial > today ? today : initial;
});
```

Antes de `setBusy(true)`:

```ts
if (date > today) {
  setError('La fecha no puede ser futura.');
  return;
}
```

Y usar `max={today}` en el input.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/features/budget/PayItemDialog.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/budget/PayItemDialog.tsx src/features/budget/PayItemDialog.test.tsx
git commit -m "fix: never record a future payment date"
```

---

### Task 6: Centralizar el Toaster

**Files:**
- Modify: `src/components/layout/AppShell.tsx`
- Modify: `src/features/transactions/TransactionsPage.tsx`
- Modify: `src/features/goals/GoalsPage.tsx`
- Modify: `src/features/transactions/transactions.test.tsx`

**Interfaces:**
- Consumes: `sonner`.
- Produces: un único `<Toaster />` en `AppShell`; las páginas dejan de montarlo.

- [ ] **Step 1: Remove the page-level Toasters**

- En `TransactionsPage.tsx`, quitar `import { Toaster } from 'sonner';` y `<Toaster ... />`.
- En `GoalsPage.tsx`, lo mismo.

- [ ] **Step 2: Add the global Toaster**

En `AppShell.tsx`:

```tsx
import { Toaster } from 'sonner';
```

Dentro del `div` raíz, antes de cerrar:

```tsx
<Toaster position="bottom-right" richColors />
```

- [ ] **Step 3: Update the transactions test wrapper**

En `transactions.test.tsx`:

```tsx
import { Toaster } from 'sonner';
```

Y en `renderTransactions`:

```tsx
<MemoryRouter initialEntries={[initialEntry]}>
  <Toaster />
  <Routes>
    <Route path="/movimientos" element={<TransactionsPage />} />
  </Routes>
</MemoryRouter>
```

- [ ] **Step 4: Run the affected tests**

Run: `pnpm exec vitest run src/features/transactions/transactions.test.tsx src/features/goals/goals.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/AppShell.tsx src/features/transactions/TransactionsPage.tsx src/features/goals/GoalsPage.tsx src/features/transactions/transactions.test.tsx
git commit -m "refactor: mount a single global toaster"
```

---

### Task 7: Hook `useReminders`

**Files:**
- Create: `src/features/reminders/useReminders.ts`
- Test: `src/features/reminders/useReminders.test.tsx`

**Interfaces:**
- Consumes: `buildReminderBuckets`, `reminderStateRepo`, `planRepo`, `todayInLima`, `addDays`, `formatDayMonth`, `toMonthKey`.
- Produces:

```ts
export interface UseRemindersResult {
  buckets: ReminderBuckets | null;
  isLoading: boolean;
  snooze: (item: PlanItem, until: ISODate, message: string) => Promise<void>;
  hide: (item: PlanItem) => Promise<void>;
  restore: (item: PlanItem) => Promise<void>;
  pay: (item: PlanItem, input: PayItemInput) => Promise<void>;
  create: (input: CreatePlanItemInput) => Promise<PlanItem>;
}

export function useReminders(): UseRemindersResult;
```

- [ ] **Step 1: Write the failing hook tests**

Crear `src/features/reminders/useReminders.test.tsx`:

```tsx
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
import { db, nowTimestamp } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { settingsRepo } from '@/db/repositories/settings';
import { resetDb } from '@/db/test-utils';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import { useReminders } from './useReminders';

function wrapper({ children }: { children: ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

async function seedItem(name = 'Cena') {
  const categories = await categoryRepo.list();
  const food = categories.find((category) => category.name === 'Comida')!;
  return planRepo.createItem({
    name,
    amountCents: asCents(6000),
    categoryId: food.id,
    dueDate: todayInLima(),
  });
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  await settingsRepo.update({
    onboardingCompletedAt: nowTimestamp(),
  });
});

describe('useReminders', () => {
  it('loads due items and snoozes them', async () => {
    const item = await seedItem();
    const { result } = renderHook(() => useReminders(), { wrapper });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
    expect(result.current.buckets?.badgeCount).toBe(1);

    await act(async () => {
      await result.current.snooze(item, addDays(todayInLima(), 1), 'Pospuesto');
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(0));
    expect(result.current.buckets?.hidden).toHaveLength(1);

    await act(async () => {
      await result.current.restore(item);
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
  });

  it('hides an item and pays it', async () => {
    const item = await seedItem();
    const { result } = renderHook(() => useReminders(), { wrapper });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));

    await act(async () => {
      await result.current.hide(item);
    });
    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(0));

    await act(async () => {
      await result.current.pay(item, {
        amountCents: item.amountCents,
        date: todayInLima(),
      });
    });

    await waitFor(() => expect(result.current.buckets?.hidden).toHaveLength(0));
    expect(await db.transactions.count()).toBe(1);
  });

  it('creates a one-off reminder', async () => {
    const categories = await categoryRepo.list();
    const food = categories.find((category) => category.name === 'Comida')!;
    const { result } = renderHook(() => useReminders(), { wrapper });

    await act(async () => {
      await result.current.create({
        name: 'Cine',
        amountCents: asCents(6000),
        categoryId: food.id,
        dueDate: todayInLima(),
      });
    });

    await waitFor(() => expect(result.current.buckets?.due).toHaveLength(1));
    expect(result.current.buckets?.due[0].item.name).toBe('Cine');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/reminders/useReminders.test.tsx`
Expected: FAIL porque el hook no existe.

- [ ] **Step 3: Implement `useReminders`**

Puntos exactos:

- `const navigate = useNavigate();`
- `const ensured = useRef(false);`
- `useEffect` de una sola ejecución:
  - leer `db.settings.get('app')`;
  - si no hay `onboardingCompletedAt`, salir;
  - `await planRepo.getOrCreate(currentMonth());`
  - `await planRepo.ensureItems(currentMonth());`
  - capturar errores con `.catch(() => {})`.
- `const buckets = useLiveQuery(async () => { ... }, [], null);`
  - leer `db.planItems.where('status').equals('pending').toArray()`, `db.plans.toArray()`, `db.reminderStates.toArray()`;
  - llamar `buildReminderBuckets({ planItems, plans, states, today: todayInLima() })`.
- `isLoading: buckets === null`.
- `snooze`: `reminderStateRepo.snooze(item.id, until)` y toast `message` con acción “Deshacer” que llama `reminderStateRepo.clear(item.id)`.
- `hide`: `reminderStateRepo.hide(item.id)` y toast “Recordatorio oculto” con “Deshacer”.
- `restore`: `reminderStateRepo.clear(item.id)`.
- `pay`: `planRepo.payItem(item.id, input, { expectedUpdatedAt: item.updatedAt })` y toast “Pago registrado”.
- `create`: `planRepo.createItem(input)`; toast `` `Recordatorio creado para ${formatDayMonth(input.dueDate)}` `` con acción “Ver en Presupuesto” que navega a `` `/presupuesto?mes=${toMonthKey(input.dueDate)}` ``.
- Envolver las acciones en `useCallback`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/features/reminders/useReminders.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/features/reminders/useReminders.ts src/features/reminders/useReminders.test.tsx
git commit -m "feat: add reminders hook"
```

---

### Task 8: Campana, panel y pago

**Files:**
- Create: `src/features/reminders/ReminderBell.tsx`
- Create: `src/features/reminders/ReminderPanel.tsx`
- Create: `src/features/reminders/ReminderItem.tsx`
- Modify: `src/components/layout/Header.tsx`
- Test: `src/features/reminders/reminders.test.tsx`

**Interfaces:**
- Consumes: `useReminders`, `PayItemDialog`, `Money`, `Chip`, `Button`, `formatDayMonth`.
- Produces:
  - `ReminderBell`
  - `ReminderPanel({ buckets, isLoading, onPay })`
  - `ReminderItem({ reminder, category, onPay })`

- [ ] **Step 1: Write the failing UI tests**

Crear `src/features/reminders/reminders.test.tsx` con:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { Toaster } from 'sonner';
import { beforeEach, describe, expect, it } from 'vitest';
import { Header } from '@/components/layout/Header';
import { db, nowTimestamp } from '@/db/db';
import { categoryRepo } from '@/db/repositories/categories';
import { planRepo } from '@/db/repositories/plans';
import { settingsRepo } from '@/db/repositories/settings';
import { resetDb } from '@/db/test-utils';
import { addDays, todayInLima } from '@/domain/dates';
import { asCents } from '@/domain/money';
import type { ISODate } from '@/domain/models';

async function seedItem(dueDate: ISODate = todayInLima(), name = 'Cena') {
  const categories = await categoryRepo.list();
  const food = categories.find((category) => category.name === 'Comida')!;
  return planRepo.createItem({
    name,
    amountCents: asCents(6000),
    categoryId: food.id,
    dueDate,
  });
}

function renderHeader() {
  return render(
    <MemoryRouter>
      <Toaster />
      <Header />
    </MemoryRouter>,
  );
}

beforeEach(async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  await settingsRepo.update({
    onboardingCompletedAt: nowTimestamp(),
  });
});

describe('reminder bell', () => {
  it('shows the badge and the due item', async () => {
    await seedItem();
    renderHeader();

    const bell = await screen.findByRole('button', { name: 'Pendientes: 1' });
    await userEvent.click(bell);

    expect(await screen.findByRole('region', { name: 'Pendientes' })).toBeInTheDocument();
    expect(screen.getByText('Cena')).toBeInTheDocument();
    expect(screen.getByText('Vence hoy')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Pagar' })).toBeInTheDocument();
  });

  it('shows an empty state when there is nothing due', async () => {
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
    expect(await screen.findByText('Todo al día')).toBeInTheDocument();
  });

  it('shows upcoming items without counting them in the badge', async () => {
    await seedItem(addDays(todayInLima(), 2), 'Internet');
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
    expect(await screen.findByText('Próximos 7 días')).toBeInTheDocument();
    expect(screen.getByText('Internet')).toBeInTheDocument();
  });

  it('pays an item from the panel', async () => {
    const item = await seedItem();
    renderHeader();

    await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Pagar' }));

    expect(await screen.findByRole('heading', { name: /pagar cena/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }));

    await waitFor(async () => {
      expect(await db.planItems.get(item.id)).toMatchObject({ status: 'settled' });
    });
    expect(await db.transactions.count()).toBe(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: FAIL porque `Header` no tiene campana.

- [ ] **Step 3: Implement `ReminderItem`**

Props:

```ts
interface ReminderItemProps {
  reminder: Reminder;
  category?: Category;
  onPay: (item: PlanItem) => void;
  onNavigate: () => void;
}
```

Render:

- `<li>` con `flex min-w-0 items-start gap-3 px-4 py-3`.
- Bloque izquierdo `min-w-0 flex-1`:
  - `<time dateTime={item.dueDate}>{reminder.dueLabel}</time>`.
  - `<Chip tone="neutral">{category.name}</Chip>` si hay categoría.
  - `<Link to={`/presupuesto?mes=${item.planId}`} onClick={onNavigate} className="block truncate ...">{item.name}</Link>`.
- Bloque derecho:
  - `<Money cents={item.amountCents} direction="out" className="text-sm font-semibold text-ink" />`.
  - `<Button size="sm" variant="secondary" onClick={() => onPay(item)}>Pagar</Button>`.

- [ ] **Step 4: Implement `ReminderPanel`**

Props:

```ts
interface ReminderPanelProps {
  buckets: ReminderBuckets | null;
  isLoading: boolean;
  categories: Category[];
  onPay: (item: PlanItem) => void;
  onNavigate: () => void;
}
```

- `<section aria-label="Pendientes" className="...">`.
- Título “Pendientes” y subtítulo “Pagos fijos vencidos o para hoy”.
- Si `isLoading`: `<p className="...">Cargando…</p>`.
- Si no hay `due` ni `upcoming`: estado vacío “Todo al día”.
- Sección “Vencidos y de hoy” con `<ul aria-label="Vencidos y de hoy">`.
- Sección “Próximos 7 días” con `<ul aria-label="Próximos 7 días">`.
- Cada lista mapea `ReminderItem` con la categoría resuelta por `categoryMap`.
- `onNavigate` se propaga a cada `ReminderItem` y al enlace “Ver presupuesto” para cerrar el popover.

- [ ] **Step 5: Implement `ReminderBell`**

- `const { buckets, isLoading, pay } = useReminders();`
- `const [open, setOpen] = useState(false);`
- `const [payItem, setPayItem] = useState<PlanItem | null>(null);`
- `const bellRef = useRef<HTMLButtonElement>(null);`
- `const categories = useLiveQuery(() => categoryRepo.list(), []) ?? [];`
- `const count = buckets?.badgeCount ?? 0;`
- Radix `Popover.Root` + `Popover.Trigger asChild` con un `<button ref={bellRef} type="button" aria-haspopup="dialog" aria-label={count > 0 ? `Pendientes: ${count}` : 'Pendientes'} className="...">`.
- Badge: `<span aria-hidden="true" className="...">{count > 9 ? '9+' : count}</span>` solo si `!isLoading && count > 0`.
- `Popover.Portal` + `Popover.Content` con `role="dialog"`, `align="end"`, `sideOffset={8}`, `collisionPadding={16}`, `aria-label="Pendientes"`, ancho `w-[min(92vw,22rem)]`, `max-h-[70dvh] overflow-y-auto`.
- `onPay`: `setOpen(false); setPayItem(item);`.
- Pasar `buckets`, `isLoading`, `categories`, `onPay` y `onNavigate={() => setOpen(false)}` a `ReminderPanel`.
- `PayItemDialog` fuera del popover:
  - `open={payItem !== null}`,
  - `onOpenChange={(next) => { if (!next) { setPayItem(null); bellRef.current?.focus(); } }}`,
  - `onConfirm={async (input) => { if (payItem) await pay(payItem, input); }}`.

- [ ] **Step 6: Integrate into `Header`**

- Importar `ReminderBell`.
- Insertar `<ReminderBell />` entre el botón de mes y el link de Ajustes.
- Cambiar el botón de mes para que en móvil sea solo ícono:

```tsx
<button
  type="button"
  disabled
  aria-label={`Cambiar mes (próximamente): ${monthLabel}`}
  className="inline-flex size-11 items-center justify-center rounded-[var(--radius-control)] border border-line bg-surface text-sm text-ink-muted sm:min-h-11 sm:w-auto sm:gap-2 sm:px-3"
>
  <CalendarDays className="size-4" aria-hidden="true" />
  <span className="hidden capitalize sm:inline">{monthLabel}</span>
</button>
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/features/reminders/ReminderBell.tsx src/features/reminders/ReminderPanel.tsx src/features/reminders/ReminderItem.tsx src/components/layout/Header.tsx src/features/reminders/reminders.test.tsx
git commit -m "feat: add pending payments bell"
```

---

### Task 9: Posponer, ocultar y restaurar

**Files:**
- Modify: `src/features/reminders/ReminderItem.tsx`
- Modify: `src/features/reminders/ReminderPanel.tsx`
- Modify: `src/features/reminders/ReminderBell.tsx`
- Modify: `src/features/reminders/reminders.test.tsx`

**Interfaces:**
- Consumes: `snooze`, `hide`, `restore` de `useReminders`.
- Produces:
  - Menú de acciones por ítem.
  - Toggle “Ver pospuestos y ocultos (N)”.
  - Diálogo “Elegir fecha…”.

- [ ] **Step 1: Write the failing action tests**

Agregar a `reminders.test.tsx`:

```tsx
it('snoozes an item and undoes it', async () => {
  await seedItem();
  renderHeader();

  await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
  await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: /recordar mañana/i }));

  expect(await screen.findByText(/pospuesto hasta mañana/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /deshacer/i }));

  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Pendientes: 1' })).toBeInTheDocument(),
  );
});

it('hides an item, shows it in the hidden section, and restores it', async () => {
  await seedItem();
  renderHeader();

  await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
  await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: /ocultar/i }));

  await userEvent.click(
    await screen.findByRole('button', { name: /ver pospuestos y ocultos \(1\)/i }),
  );
  expect(await screen.findByText('Cena')).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: /restaurar/i }));
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Pendientes: 1' })).toBeInTheDocument(),
  );
});

it('snoozes until a custom date', async () => {
  await seedItem();
  renderHeader();

  await userEvent.click(await screen.findByRole('button', { name: 'Pendientes: 1' }));
  await userEvent.click(screen.getByRole('button', { name: /acciones de cena/i }));
  await userEvent.click(await screen.findByRole('menuitem', { name: /elegir fecha/i }));

  const date = screen.getByLabelText('Fecha');
  fireEvent.change(date, { target: { value: addDays(todayInLima(), 3) } });
  await userEvent.click(screen.getByRole('button', { name: /posponer/i }));

  await waitFor(() =>
    expect(screen.queryByRole('button', { name: 'Pendientes: 1' })).not.toBeInTheDocument(),
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: FAIL porque no existe el menú de acciones.

- [ ] **Step 3: Add the actions menu to `ReminderItem`**

Props nuevas:

```ts
onSnooze: (item: PlanItem, until: ISODate, message: string) => void;
onChooseDate: (item: PlanItem) => void;
onHide: (item: PlanItem) => void;
onRestore?: (item: PlanItem) => void;
isHiddenView?: boolean;
```

- Si `isHiddenView`, renderizar `<Button size="sm" variant="secondary" onClick={() => onRestore?.(item)}>Restaurar</Button>` y no mostrar “Pagar”.
- Si no, junto a “Pagar”, agregar `DropdownMenu.Root` con trigger `MoreHorizontal` de `size-11` y `aria-label={`Acciones de ${item.name}`}`.
- Items del menú:
  - “Recordar mañana” → `onSnooze(item, addDays(todayInLima(), 1), 'Recordatorio pospuesto hasta mañana')`.
  - “Posponer 3 días” → `onSnooze(item, addDays(todayInLima(), 3), 'Recordatorio pospuesto 3 días')`.
  - “Posponer 1 semana” → `onSnooze(item, addDays(todayInLima(), 7), 'Recordatorio pospuesto 1 semana')`.
  - “Elegir fecha…” → `onChooseDate(item)`.
  - “Ocultar” → `onHide(item)`.

- [ ] **Step 4: Add the hidden toggle to `ReminderPanel`**

Props nuevas:

```ts
showHidden: boolean;
onToggleHidden: () => void;
onSnooze: ReminderItemProps['onSnooze'];
onChooseDate: ReminderItemProps['onChooseDate'];
onHide: ReminderItemProps['onHide'];
onRestore: ReminderItemProps['onRestore'];
```

- Debajo de las secciones, si `buckets.hidden.length > 0`, mostrar un botón:
  `Ver pospuestos y ocultos ({buckets.hidden.length})`.
- Si `showHidden`, renderizar `<ul aria-label="Pospuestos y ocultos">` con `ReminderItem` en modo `isHiddenView`.

- [ ] **Step 5: Add state and dialogs to `ReminderBell`**

- `const [showHidden, setShowHidden] = useState(false);`
- `const [snoozeTarget, setSnoozeTarget] = useState<PlanItem | null>(null);`
- `const [snoozeDate, setSnoozeDate] = useState(addDays(todayInLima(), 1));`
- `onChooseDate`: `setOpen(false); setSnoozeDate(addDays(todayInLima(), 1)); setSnoozeTarget(item);`
- Diálogo de fecha:
  - Título “Posponer recordatorio”.
  - `<Input type="date" min={addDays(todayInLima(), 1)} value={snoozeDate} onChange={...} />`.
  - Botón “Posponer” que llama `snooze(snoozeTarget, snoozeDate, \`Recordatorio pospuesto hasta el ${formatDayMonth(snoozeDate)}\`)`, cierra y enfoca la campana.
- Pasar las acciones al `ReminderPanel`.

- [ ] **Step 6: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/features/reminders/ReminderItem.tsx src/features/reminders/ReminderPanel.tsx src/features/reminders/ReminderBell.tsx src/features/reminders/reminders.test.tsx
git commit -m "feat: snooze and hide payment reminders"
```

---

### Task 10: Crear recordatorio puntual

**Files:**
- Create: `src/features/reminders/ReminderDialog.tsx`
- Modify: `src/features/reminders/ReminderPanel.tsx`
- Modify: `src/features/reminders/ReminderBell.tsx`
- Modify: `src/features/reminders/reminders.test.tsx`

**Interfaces:**
- Consumes: `create` de `useReminders`, `categoryRepo`, `monthRange`, `currentMonth`, `todayInLima`, `parseAmountInput`.
- Produces: `ReminderDialog({ open, onOpenChange, onCreate })`.

- [ ] **Step 1: Write the failing create test**

Agregar a `reminders.test.tsx`:

```tsx
it('creates a one-off reminder from the panel', async () => {
  renderHeader();

  await userEvent.click(await screen.findByRole('button', { name: 'Pendientes' }));
  await userEvent.click(screen.getByRole('button', { name: /nuevo recordatorio/i }));

  await userEvent.type(screen.getByLabelText('Nombre'), 'Cine');
  await userEvent.type(screen.getByLabelText('Monto'), '60');
  await userEvent.selectOptions(
    screen.getByLabelText('Categoría'),
    screen.getByRole('option', { name: 'Comida' }),
  );
  await userEvent.click(screen.getByRole('button', { name: /guardar recordatorio/i }));

  expect(await screen.findByText(/recordatorio creado/i)).toBeInTheDocument();

  await userEvent.click(screen.getByRole('button', { name: 'Pendientes: 1' }));
  expect(await screen.findByText('Cine')).toBeInTheDocument();
});
```

Nota: el `<option>` de categoría usa el nombre como texto; el test lo selecciona por rol `option`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: FAIL porque no existe “Nuevo recordatorio”.

- [ ] **Step 3: Implement `ReminderDialog`**

Props:

```ts
interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: CreatePlanItemInput) => Promise<void>;
}
```

- `useLiveQuery(() => categoryRepo.list(), [])` y filtrar `kind === 'expense' && archived === 0`.
- Campos:
  - Nombre: `Input id="reminder-name"`, label “Nombre”.
  - Monto: `Input id="reminder-amount" inputMode="decimal"`, label “Monto”.
  - Categoría: `Select id="reminder-category"`, label “Categoría”, opción vacía “Elegí una categoría”.
  - Fecha: `Input id="reminder-date" type="date" min={monthRange(currentMonth()).start}`, label “Fecha”.
- Estado inicial: `const [dueDate, setDueDate] = useState<ISODate>(todayInLima());` para que el formulario abra con la fecha de hoy.
- Validación local:
  - nombre no vacío;
  - `parseAmountInput(amount)`;
  - categoría elegida;
  - fecha no vacía.
- En error, `<div role="alert">`.
- Botón “Guardar recordatorio” con `loading`.
- Al guardar: `await onCreate({ name, amountCents, categoryId, dueDate })`, limpiar y cerrar.
- `Dialog` con título “Nuevo recordatorio”.

- [ ] **Step 4: Wire the dialog into `ReminderPanel` and `ReminderBell`**

- `ReminderPanel` recibe `onCreate: () => void`.
- Al pie, `<Button variant="secondary" className="w-full" onClick={onCreate}>Nuevo recordatorio</Button>`.
- `ReminderBell`:
  - `const [createOpen, setCreateOpen] = useState(false);`
  - `onCreate`: `setOpen(false); setCreateOpen(true);`
  - Renderizar `<ReminderDialog open={createOpen} onOpenChange={...} onCreate={async (input) => { await create(input); }} />`.
  - Al cerrar, enfocar la campana.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/features/reminders/reminders.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/features/reminders/ReminderDialog.tsx src/features/reminders/ReminderPanel.tsx src/features/reminders/ReminderBell.tsx src/features/reminders/reminders.test.tsx
git commit -m "feat: create one-off reminders from the bell"
```

---

### Task 11: E2E móvil y verificación final

**Files:**
- Create: `e2e/reminders.spec.ts`
- Modify: `e2e/a11y.spec.ts` si hace falta para cubrir la campana cerrada.

**Interfaces:**
- Consumes: la app completa.
- Produces: cobertura e2e a 320 px, axe con el panel abierto y flujo crear → pagar.

- [ ] **Step 1: Write the e2e test**

Crear `e2e/reminders.spec.ts`:

```ts
import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 320, height: 720 } });

async function completeOnboarding(page: import('@playwright/test').Page) {
  await page.goto('/onboarding');
  await page.getByRole('button', { name: 'Empezar de cero' }).click();
  await page.getByLabel(/tu nombre/i).fill('Ana');
  await page.getByLabel('Saldo inicial').fill('1000');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByLabel('Ingreso mensual').fill('2200');
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.getByRole('button', { name: 'Omitir por ahora' }).click();
  await page.getByRole('button', { name: 'Ir al inicio' }).click();
}

test('creates and pays a reminder without overflowing the mobile viewport', async ({
  page,
}) => {
  await completeOnboarding(page);

  const bell = page.getByRole('button', { name: /^Pendientes/ });
  await expect(bell).toBeVisible();
  await bell.click();

  await page.getByRole('button', { name: 'Nuevo recordatorio' }).click();
  await page.getByLabel('Nombre').fill('Cena');
  await page.getByLabel('Monto').fill('60');
  await page.getByLabel('Categoría').selectOption({ label: 'Comida' });

  const today = new Date().toLocaleDateString('en-CA', {
    timeZone: 'America/Lima',
  });
  await page.getByLabel('Fecha').fill(today);
  await page.getByRole('button', { name: 'Guardar recordatorio' }).click();

  await expect(page.getByText(/recordatorio creado/i)).toBeVisible();

  await bell.click();
  await expect(page.getByText('Cena')).toBeVisible();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);

  await page
    .getByRole('listitem')
    .filter({ hasText: 'Cena' })
    .getByRole('button', { name: 'Pagar' })
    .click();
  await page.getByRole('button', { name: 'Confirmar pago' }).click();
  await expect(page.getByText('Cena')).toHaveCount(0);
});
```

- [ ] **Step 2: Run the e2e test**

Run: `pnpm exec playwright test e2e/reminders.spec.ts`
Expected: PASS.

- [ ] **Step 3: Run the full verification**

Run: `pnpm test`
Expected: todos los tests verdes.

Run: `pnpm typecheck`
Expected: sin errores.

Run: `pnpm lint`
Expected: sin errores.

Run: `pnpm exec playwright test e2e/reminders.spec.ts e2e/a11y.spec.ts e2e/mobile.spec.ts`
Expected: todos verdes.

- [ ] **Step 4: Commit**

```bash
git add e2e/reminders.spec.ts e2e/a11y.spec.ts
git commit -m "test: cover reminders on mobile"
```

---

## Self-Review

- **Spec coverage:** dominio (Task 1), persistencia (Task 2), backup (Task 3), crear/limpiar (Task 4), pago anticipado (Task 5), Toaster global (Task 6), hook (Task 7), campana/panel/pago (Task 8), posponer/ocultar/restaurar (Task 9), crear recordatorio (Task 10), e2e (Task 11).
- **Type consistency:** `Reminder`, `ReminderBuckets`, `ReminderState`, `CreatePlanItemInput`, `UseRemindersResult` se definen una vez y se reutilizan.
- **Review Focus:** cada línea tiene test en la tarea que posee el código (Task 1, 4, 3/4, 8/11, 5).
- **Scope:** no hay push, backend, movimientos futuros ni historial.
