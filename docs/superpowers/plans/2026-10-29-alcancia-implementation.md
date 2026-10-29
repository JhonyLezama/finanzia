# Alcancía v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Alcancía v1: a professional, local-first personal finance PWA with monthly budgeting, fixed commitments, real savings goals, reports, CSV/XLSX import, and JSON backup.

**Architecture:** Vite SPA with a pure TypeScript domain layer, Dexie/IndexedDB persistence behind repositories, React 19 UI with React Router, and a Workbox service worker. No backend; all data stays on the device.

**Tech Stack:** pnpm 12, Node 24, Vite 8, React 19, TypeScript 7, React Router 8, Tailwind 4, Dexie 4, Zod 4, React Hook Form, date-fns, Recharts, `vite-plugin-pwa`, Radix UI, Sonner, Papa Parse, `read-excel-file`, Vitest, Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-29-alcancia-design.md`

## Global Constraints

- **Package manager: pnpm 12.15 only.** Never use npm or yarn. Commit `pnpm-lock.yaml`.
- **Node 24.x**; declare `"engines": { "node": ">=24 <25" }` and `"packageManager": "pnpm@12.15.0"`.
- **Versions:** Vite 8.3.5, `@vitejs/plugin-react` 6.1.2, React 19.3.1, TypeScript 7.0.2, React Router 8.5.1, Tailwind 4.3.3, Dexie 4.4.7, Zod 4.6.7, RHF 7.91, date-fns 4.4.0, Recharts 3.10.1, `vite-plugin-pwa` 2.0.0, Radix UI 1.8.1, Sonner 2.0.8, Vitest 5.0.5, Playwright 1.64.1.
- **Money:** integer cents (`Cents` branded type), always positive amounts plus `direction: 'in' | 'out'`. Never store or calculate money with floats. Format with `Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' })`.
- **Dates:** calendar dates as `YYYY-MM-DD`; months as `YYYY-MM`; timezone `America/Lima`; no future-dated transactions.
- **Language/currency:** Spanish (Peru), PEN only in v1. The schema reserves `currency`, but no multi-currency UI.
- **Data:** local-first, no backend, no analytics, no telemetry, no runtime Google Fonts. Financial data only in IndexedDB; `localStorage` only mirrors the theme for first paint.
- **Every write** goes through a repository, validates with Zod, uses optimistic concurrency (`expectedUpdatedAt`), and writes an audit entry in the same Dexie transaction.
- **Closed months are immutable:** no create/edit/delete of transactions, plan items, budgets, savings target, or imports dated inside a closed month.
- **Accessibility:** WCAG 2.2 AA, 44×44 px targets, visible focus, keyboard support, chart data tables, `aria-live` only for toasts/updates.
- **UI copy:** Spanish (Peru), professional, no emojis, no gamification.
- **Tests:** TDD for domain and repositories. Every task ends with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and a Conventional Commit.

## Review Focus

These are the input classes most likely to break a real user; each has a test in the owning task.

1. **Month-end and leap-year due dates** (day 31 in April, February 29 in 2028, December→January rollover). Expected: the due date clamps to the last day of the month, never overflows into the next month. Tests in Tasks 4, 5, 9.
2. **Mixed decimal separators and currency noise** (`1.234,56`, `1,234.56`, `S/ 1 234,56`, `0`, `-5`, `abc`) in forms and CSV/XLSX import. Expected: the same cents value or a specific validation error, never a silent wrong amount. Tests in Tasks 4, 16.
3. **Editing or deleting a transaction linked to a fixed commitment or expected income.** Expected: deleting reopens the plan item, the reserve returns, and the amount is not double-counted. Tests in Tasks 8, 9, 13.
4. **Closed-month writes from any path** (manual, quick add, import, goal transfer, recurring payment). Expected: every path rejects the write with a clear message and leaves data unchanged. Tests in Tasks 8, 9, 16.
5. **Import deduplication and backup replacement.** Expected: importing the same row twice skips the duplicate, undo removes exactly the batch, and a JSON restore replaces all data without leaving orphan records. Tests in Task 16.

---

## File Structure

```text
src/
  app/
    App.tsx
    router.tsx
    providers.tsx
  components/
    ui/           # Button, Input, Money, Card, ProgressBar, Dialog, Drawer, Select, Chip, EmptyState, Table
    layout/       # AppShell, Sidebar, BottomNav, Header, PageHeader
    charts/       # BarChart, LineChart, ChartTable
    feedback/     # ErrorBoundary, OfflineBanner, LoadingState
  domain/
    models.ts     # TS interfaces from the spec
    schemas.ts    # Zod schemas and inferred types
    money.ts
    dates.ts
    budget.ts
    recurring.ts
    goals.ts
    reports.ts
    import.ts
    backup.ts
  db/
    db.ts
    schema.ts
    seed.ts
    test-utils.ts
    repositories/
      settings.ts
      categories.ts
      transactions.ts
      plans.ts
      recurring.ts
      goals.ts
      imports.ts
      audit.ts
      backup.ts
  features/
    onboarding/
    dashboard/
    transactions/
    budget/
    goals/
    reports/
    import/
    settings/
  hooks/
    useMonth.ts
    useSettings.ts
    useTheme.ts
  lib/
    ids.ts
    dates.ts
    csv.ts
    xlsx.ts
    crypto.ts
    download.ts
  routes/
    DashboardPage.tsx
    TransactionsPage.tsx
    BudgetPage.tsx
    ReportsPage.tsx
    GoalsPage.tsx
    SettingsPage.tsx
    OnboardingPage.tsx
    ImportPage.tsx
    OfflinePage.tsx
    NotFoundPage.tsx
  styles/
    tokens.css
    globals.css
  test/
    setup.ts
    a11y.ts
  e2e/
    onboarding.spec.ts
    transactions.spec.ts
    budget.spec.ts
    goals.spec.ts
    import-backup.spec.ts
    offline.spec.ts
    a11y.spec.ts
  scripts/
    generate-icons.ts
public/
  icon.svg
  icons/ (192, 512, maskable, apple-touch)
```

---

## Task 1: Scaffold, tooling, and base app

**Files:**
- Create: `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `.prettierrc`, `.gitignore`, `.nvmrc`, `index.html`, `src/main.tsx`, `src/app/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`, `src/styles/globals.css`
- Test: `src/app/App.test.tsx`

**Interfaces:**
- Produces: `App` default export rendering the app shell placeholder; test setup with `@testing-library/jest-dom`; path alias `@/` → `src/`.

- [ ] **Step 1: Create the package manifest and install dependencies**

Create `package.json` with `"type": "module"`, `"private": true`, scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:a11y": "playwright test e2e/a11y.spec.ts",
    "format": "prettier --write ."
  }
}
```

Install with pnpm:

```bash
pnpm add react@19.3.1 react-dom@19.3.1 react-router@8.5.1 dexie@4.4.7 dexie-react-hooks@4.4.0 zod@4.6.7 react-hook-form@7.91.0 @hookform/resolvers@6.0.2 date-fns@4.4.0 recharts@3.10.1 sonner@2.0.8 lucide-react@1.64.0 radix-ui@1.8.1 papaparse@5.7.0 read-excel-file@9.3.14 clsx tailwind-merge
pnpm add -D vite@8.3.5 @vitejs/plugin-react@6.1.2 typescript@7.0.2 @types/react@19.3.0 @types/react-dom@19.3.0 @types/node tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 vite-plugin-pwa@2.0.0 workbox-window@7.4.1 vitest@5.0.5 jsdom@30.1.3 @testing-library/react@16.3.3 @testing-library/jest-dom@7.0.1 @testing-library/user-event@14.6.8 jest-axe@11.0.0 @types/jest-axe@3.5.9 fast-check@4.10.2 fake-indexeddb@6.2.6 @playwright/test@1.64.1 @axe-core/playwright@4.14.0 eslint@10.13.0 @eslint/js typescript-eslint eslint-plugin-react-hooks eslint-plugin-jsx-a11y prettier@3.9.10 @types/papaparse @fontsource-variable/bricolage-grotesque@5.3.0 @fontsource-variable/dm-sans@5.3.0 @fontsource/dm-mono@5.3.0
```

- [ ] **Step 2: Create configuration**

`vite.config.ts`: React plugin, Tailwind plugin, `resolve.alias['@'] = '/src'`, Vitest `environment: 'jsdom'`, `setupFiles: './src/test/setup.ts'`, `css: true`.

`tsconfig.json`: references `tsconfig.app.json` and `tsconfig.node.json`. App config: `strict: true`, `noUncheckedIndexedAccess: true`, `target: "ES2022"`, `moduleResolution: "bundler"`, `jsx: "react-jsx"`, `paths: { "@/*": ["./src/*"] }`.

`.gitignore`: `node_modules`, `dist`, `coverage`, `playwright-report`, `test-results`, `.DS_Store`, `*.local`.

`index.html`: `<div id="root"></div>`, title `Alcancía`, theme-color meta.

- [ ] **Step 3: Write the failing smoke test**

```tsx
// src/app/App.test.tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App';

describe('App', () => {
  it('renders the Alcancía shell', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: /alcancía/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `pnpm test -- src/app/App.test.tsx`
Expected: FAIL because `App.tsx` does not exist.

- [ ] **Step 5: Implement the minimal app**

Create `src/main.tsx` importing `./styles/globals.css` and rendering `<App />`; `src/app/App.tsx` with `<h1>Alcancía</h1>`; `src/styles/globals.css` with `@import "tailwindcss";`.

- [ ] **Step 6: Run lint, typecheck, and tests**

Run: `pnpm lint && pnpm typecheck && pnpm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "chore: scaffold Vite React app with pnpm and tests"
```

---

## Task 2: Design tokens and UI primitives

**Files:**
- Create: `src/styles/tokens.css`, `src/lib/cn.ts`, `src/components/ui/Button.tsx`, `Input.tsx`, `Money.tsx`, `Card.tsx`, `ProgressBar.tsx`, `Chip.tsx`, `EmptyState.tsx`, `Dialog.tsx`, `Drawer.tsx`, `Select.tsx`
- Test: `src/components/ui/Button.test.tsx`, `src/components/ui/Money.test.tsx`, `src/components/ui/ProgressBar.test.tsx`

**Interfaces:**
- Consumes: `formatPEN` from Task 4 is not available yet; use a local placeholder `formatPEN` in `Money.tsx` and replace it in Task 4. **Do not import Task 4 code yet.**
- Produces: `Button({ variant: 'primary'|'secondary'|'ghost'|'danger'; size?: 'sm'|'md'; ... })`, `Input`, `Money({ cents, direction?, signed? })`, `ProgressBar({ value: number; tone?: 'ok'|'warn'|'bad' })`, `Dialog`, `Drawer`, `Select`, `Chip`, `EmptyState`.

- [ ] **Step 1: Create tokens**

`src/styles/tokens.css` with the light/dark CSS variables from the spec (bg, surface, surface-2, ink, ink-muted, line, primary, primary-ink, gold, gold-ink, red, red-soft, focus). Map them in `@theme` for Tailwind 4. Import tokens from `globals.css`.

- [ ] **Step 2: Write failing primitive tests**

```tsx
it('renders a primary button and handles clicks', async () => {
  const onClick = vi.fn();
  render(<Button onClick={onClick}>Guardar</Button>);
  await userEvent.click(screen.getByRole('button', { name: 'Guardar' }));
  expect(onClick).toHaveBeenCalledOnce();
});

it('formats cents as PEN', () => {
  render(<Money cents={123456} />);
  expect(screen.getByText('S/ 1,234.56')).toBeInTheDocument();
});

it('marks progress above 100% as bad', () => {
  render(<ProgressBar value={120} />);
  expect(screen.getByRole('progressbar')).toHaveAttribute('data-tone', 'bad');
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `pnpm test -- src/components/ui`
Expected: FAIL because components do not exist.

- [ ] **Step 4: Implement primitives**

Use `cn()` (`clsx` + `tailwind-merge`). Buttons and inputs meet 44 px targets. `Money` uses `Intl.NumberFormat('es-PE')`. `ProgressBar` clamps width, sets `role="progressbar"`, `aria-valuenow`, and `data-tone` (`ok` < 80, `warn` 80–100, `bad` > 100). `Dialog`/`Drawer` use Radix with focus trap and title.

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/components/ui`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components src/styles src/lib
git commit -m "feat: add design tokens and accessible UI primitives"
```

---

## Task 3: App shell, router, theme, and error boundary

**Files:**
- Create: `src/app/router.tsx`, `src/app/providers.tsx`, `src/app/App.tsx` (replace), `src/components/layout/AppShell.tsx`, `Sidebar.tsx`, `BottomNav.tsx`, `Header.tsx`, `src/components/feedback/ErrorBoundary.tsx`, `OfflineBanner.tsx`, `src/hooks/useTheme.ts`, `src/routes/*.tsx` placeholders
- Test: `src/app/router.test.tsx`

**Interfaces:**
- Consumes: UI primitives from Task 2.
- Produces: routes `/`, `/movimientos`, `/presupuesto`, `/reportes`, `/metas`, `/ajustes`, `/onboarding`, `/importar`, `/offline`; `useTheme()` with `theme`, `setTheme`, `resolvedTheme`.

- [ ] **Step 1: Write the failing navigation test**

```tsx
it('navigates between primary destinations and marks the active one', async () => {
  render(<RouterProvider router={createTestRouter()} />);
  await userEvent.click(screen.getByRole('link', { name: 'Presupuesto' }));
  expect(await screen.findByRole('heading', { name: /presupuesto/i })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Presupuesto' })).toHaveAttribute('aria-current', 'page');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/app/router.test.tsx`
Expected: FAIL because router/routes do not exist.

- [ ] **Step 3: Implement router, shell, and theme**

Use `createBrowserRouter` with lazy route components and an error boundary. `AppShell` renders a 240 px sidebar at `lg` and a 5-item bottom nav below it, plus a header with month selector placeholder and settings link. Theme provider reads `localStorage` mirror, falls back to `prefers-color-scheme`, sets `data-theme` on `document.documentElement`. Add an offline banner using `navigator.onLine` and `online`/`offline` events. Placeholder pages render an `<h1>` matching their route.

- [ ] **Step 4: Run tests and typecheck**

Run: `pnpm test -- src/app/router.test.tsx && pnpm typecheck`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app src/components/layout src/components/feedback src/hooks src/routes
git commit -m "feat: add app shell, routes, theme, and offline banner"
```

---

## Task 4: Domain models, schemas, money, and dates

**Files:**
- Create: `src/domain/models.ts`, `src/domain/schemas.ts`, `src/domain/money.ts`, `src/domain/dates.ts`, `src/domain/money.test.ts`, `src/domain/dates.test.ts`, `src/domain/schemas.test.ts`
- Modify: `src/components/ui/Money.tsx` to import `formatPEN`

**Interfaces:**
- Produces:
```ts
type Cents = number & { readonly __brand: 'Cents' };
type ISODate = string & { readonly __brand: 'ISODate' };
type MonthKey = string & { readonly __brand: 'MonthKey' };
const MAX_CENTS = 1_000_000_000_000;
function asCents(n: number): Cents;
function parseAmountInput(raw: string): Cents;
function formatPEN(cents: Cents, opts?: { sign?: boolean }): string;
function formatPercent(value: number | null, digits?: number): string;
function todayInLima(now?: Date): ISODate;
function toMonthKey(date: ISODate): MonthKey;
function monthKeyFromParts(year: number, month: number): MonthKey;
function parseMonthKey(key: MonthKey): { year: number; month: number };
function addMonths(key: MonthKey, delta: number): MonthKey;
function monthRange(key: MonthKey): { start: ISODate; end: ISODate };
function dueDateForMonth(key: MonthKey, dayOfMonth: number): ISODate;
function formatMonthLong(key: MonthKey): string;
function formatDateShort(date: ISODate): string;
function isFutureDate(date: ISODate, today?: ISODate): boolean;
function isDateInMonth(date: ISODate, key: MonthKey): boolean;
function monthsBetween(start: MonthKey, end: MonthKey): MonthKey[];
```
- Models and Zod schemas for `Settings`, `Category`, `Transaction`, `MonthlyPlan`, `PlanItem`, `RecurringRule`, `Goal`, `ImportBatch`, `AuditEntry`, `Backup`, exactly as the spec.

- [ ] **Step 1: Write failing money tests**

```ts
it.each([
  ['1,234.56', 123456],
  ['1.234,56', 123456],
  ['S/ 1 234,56', 123456],
  ['  60,5 ', 6050],
])('parses %s as %i cents', (raw, expected) => {
  expect(parseAmountInput(raw)).toBe(expected);
});

it.each(['0', '-5', 'abc', ''])('rejects %s', raw => {
  expect(() => parseAmountInput(raw)).toThrow();
});
```

- [ ] **Step 2: Run money tests to verify they fail**

Run: `pnpm test -- src/domain/money.test.ts`
Expected: FAIL because `parseAmountInput` does not exist.

- [ ] **Step 3: Implement money and dates**

Implement `parseAmountInput`: trim, remove `S/`, spaces and NBSP; if both `.` and `,` exist, the last separator is decimal and the other is thousands; if only one exists and it is followed by 1–2 digits, it is decimal, otherwise thousands; reject non-numeric, ≤0, and > `MAX_CENTS`. `formatPEN` uses `Intl.NumberFormat('es-PE')`.

Implement dates with pure year/month math. `dueDateForMonth` clamps to the last day. `todayInLima` uses `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' })`.

- [ ] **Step 4: Write failing date and schema tests**

```ts
it('clamps day 31 to the last day of the month', () => {
  expect(dueDateForMonth('2026-04' as MonthKey, 31)).toBe('2026-04-30');
  expect(dueDateForMonth('2028-02' as MonthKey, 31)).toBe('2028-02-29');
});

it('rolls over December to January', () => {
  expect(addMonths('2026-12' as MonthKey, 1)).toBe('2027-01');
});

it('computes today in Lima, not UTC', () => {
  expect(todayInLima(new Date('2026-10-29T03:00:00Z'))).toBe('2026-10-28');
});

it('rejects a future transaction date', () => {
  expect(isFutureDate('2026-10-30' as ISODate, '2026-10-29' as ISODate)).toBe(true);
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/domain`
Expected: PASS (including schema validation of a valid and invalid transaction).

- [ ] **Step 6: Replace the Money placeholder**

Update `src/components/ui/Money.tsx` to import `formatPEN` from `@/domain/money`; update its test to use the real formatter.

- [ ] **Step 7: Commit**

```bash
git add src/domain src/components/ui/Money.tsx
git commit -m "feat: add domain models, cents money, and Lima calendar dates"
```

---

## Task 5: Budget and recurring engines

**Files:**
- Create: `src/domain/budget.ts`, `src/domain/recurring.ts`, `src/domain/budget.test.ts`, `src/domain/recurring.test.ts`

**Interfaces:**
- Consumes: models, `Cents`, `MonthKey`, `ISODate`, `dueDateForMonth`, `isDateInMonth`.
- Produces:
```ts
interface BudgetSnapshot {
  availableCents: Cents;
  pendingFixedCents: Cents;
  remainingSavingsCents: Cents;
  spendableCents: Cents;
  monthIncomeCents: Cents;
  monthExpenseCents: Cents;
  fixedExpenseCents: Cents;
  variableExpenseCents: Cents;
  fixedPlanCents: Cents;
  variablePlanCents: Cents;
  planExpenseCents: Cents;
  varianceCents: number;
  variancePct: number | null;
  executionPct: number | null;
  savingsRate: number | null;
  fixedCostRatio: number | null;
  goalFundingRate: number | null;
  monthlyGoalContribCents: Cents;
}
function computeBudgetSnapshot(input: {
  transactions: Transaction[];
  plan: MonthlyPlan;
  planItems: PlanItem[];
  categories: Category[];
  currentMonth: MonthKey;
}): BudgetSnapshot;
function computeVariance(actualCents: Cents, planCents: Cents): { varianceCents: number; variancePct: number | null };
function computeSavingsRate(incomeCents: Cents, expenseCents: Cents): number | null;
function generatePlanItemsForMonth(input: {
  month: MonthKey;
  rules: RecurringRule[];
  existing: PlanItem[];
  categories: Category[];
}): Array<Omit<PlanItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>>;
```

- [ ] **Step 1: Write the failing budget test using the spec example**

```ts
it('computes available, spendable, and variance for October 2026', () => {
  const snap = computeBudgetSnapshot(fixtureOctober2026());
  expect(snap.availableCents).toBe(227000);
  expect(snap.pendingFixedCents).toBe(12000);
  expect(snap.remainingSavingsCents).toBe(10000);
  expect(snap.spendableCents).toBe(205000);
  expect(snap.monthExpenseCents).toBe(63000);
  expect(snap.fixedExpenseCents).toBe(38000);
  expect(snap.variableExpenseCents).toBe(25000);
  expect(snap.varianceCents).toBe(-77000);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm test -- src/domain/budget.test.ts`
Expected: FAIL because `computeBudgetSnapshot` does not exist.

- [ ] **Step 3: Implement the budget engine**

Implement the formulas exactly as section 8 of the spec. Classify fixed vs variable by `category.group`; `categoryId === undefined` is variable. Exclude skipped plan items from `fixedPlanCents`; include pending in both `fixedPlanCents` and `pendingFixedCents`. `remainingSavings` uses `Math.max(0, target - Math.max(0, netGoalContrib))`.

- [ ] **Step 4: Write failing recurring tests**

```ts
it('generates one item per rule and is idempotent', () => {
  const first = generatePlanItemsForMonth({ month: '2026-10' as MonthKey, rules, existing: [], categories });
  const second = generatePlanItemsForMonth({ month: '2026-10' as MonthKey, rules, existing: firstAsItems(first), categories });
  expect(first).toHaveLength(2);
  expect(second).toHaveLength(0);
});

it('clamps day 31 and skips inactive or out-of-range rules', () => {
  const items = generatePlanItemsForMonth({ month: '2026-04' as MonthKey, rules, existing: [], categories });
  expect(items.find(i => i.recurringRuleId === 'rent')?.dueDate).toBe('2026-04-30');
});
```

- [ ] **Step 5: Run recurring tests to verify they fail, then implement**

Run: `pnpm test -- src/domain/recurring.test.ts`
Expected: FAIL. Implement generation with idempotency key `planId + recurringRuleId`, active rules, `startMonth <= month <= endMonth`, category group validation, due date clamp. Rerun: PASS.

- [ ] **Step 6: Run all domain tests and commit**

Run: `pnpm test -- src/domain`
Expected: PASS.

```bash
git add src/domain
git commit -m "feat: add budget and recurring domain engines"
```

---

## Task 6: Goals and reports engines

**Files:**
- Create: `src/domain/goals.ts`, `src/domain/reports.ts`, `src/domain/goals.test.ts`, `src/domain/reports.test.ts`

**Interfaces:**
- Consumes: models, money, dates, budget.
- Produces:
```ts
interface GoalSummary {
  savedCents: Cents;
  targetCents: Cents;
  progress: number;
  remainingCents: Cents;
  paceCents: Cents;
  projectedDate: ISODate | null;
}
function goalBalance(goalId: UUID, transactions: Transaction[]): Cents;
function goalSummary(goal: Goal, transactions: Transaction[], today: ISODate): GoalSummary;
function assertCanWithdraw(goal: Goal, transactions: Transaction[], amountCents: Cents): void;
interface MonthlyReport { incomeCents; expenseCents; savingsCents; savingsRate; fixedCents; variableCents; budgetVariance; rows: BudgetVarianceRow[] }
function buildMonthlyReport(input: ReportInput): MonthlyReport;
function buildAnnualReport(input: ReportInput): AnnualReport;
function buildCategoryBreakdown(input: ReportInput): CategoryBreakdownRow[];
```

- [ ] **Step 1: Write failing goal tests**

```ts
it('computes balance from deposits minus withdrawals', () => {
  expect(goalBalance('g1', [
    tx({ type: 'goal_deposit', goalId: 'g1', amountCents: 25000 }),
    tx({ type: 'goal_withdraw', goalId: 'g1', amountCents: 5000 }),
  ])).toBe(20000);
});

it('rejects a withdrawal above the goal balance', () => {
  expect(() => assertCanWithdraw(goal, [deposit(10000)], 10001)).toThrow(/saldo/i);
});

it('projects a completion date from the last three months of pace', () => {
  expect(goalSummary(goal, cadence([10000, 10000, 10000]), '2026-10-29').projectedDate).toBe('2027-01-29');
});
```

- [ ] **Step 2: Run goal tests to verify they fail, then implement**

Run: `pnpm test -- src/domain/goals.test.ts`
Expected: FAIL. Implement `goalBalance`, `goalSummary` (progress, remaining, pace, projection), and `assertCanWithdraw`. Rerun: PASS.

- [ ] **Step 3: Write failing report tests**

```ts
it('builds a monthly report with fixed and variable splits', () => {
  const report = buildMonthlyReport(fixtureOctober2026());
  expect(report.incomeCents).toBe(220000);
  expect(report.expenseCents).toBe(63000);
  expect(report.fixedCents).toBe(38000);
  expect(report.variableCents).toBe(25000);
  expect(report.savingsRate).toBeCloseTo(0.7136, 4);
});
```

- [ ] **Step 4: Run report tests to verify they fail, then implement**

Run: `pnpm test -- src/domain/reports.test.ts`
Expected: FAIL. Implement monthly/annual aggregation and category breakdown using `computeBudgetSnapshot`. Rerun: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/domain
git commit -m "feat: add goal and report domain engines"
```

---

## Task 7: Dexie schema, settings, categories, and audit

**Files:**
- Create: `src/db/db.ts`, `src/db/schema.ts`, `src/db/seed.ts`, `src/db/test-utils.ts`, `src/db/repositories/settings.ts`, `categories.ts`, `audit.ts`, `src/db/repositories/settings.test.ts`, `categories.test.ts`, `audit.test.ts`
- Modify: `src/domain/schemas.ts` if Zod inference needs DB-friendly types

**Interfaces:**
- Consumes: domain models/schemas.
- Produces:
```ts
class AlcanciaDB extends Dexie { /* tables from spec Annex A */ }
const db: AlcanciaDB;
async function resetDb(): Promise<void>;
class ConflictError extends Error {}
interface Ctx { expectedUpdatedAt?: string }
const settingsRepo: { get(): Promise<Settings>; update(patch, ctx?): Promise<Settings>; completeOnboarding(): Promise<Settings> };
const categoryRepo: { list(opts?): Promise<Category[]>; create(input): Promise<Category>; update(id, patch, ctx): Promise<Category>; archive(id): Promise<void>; ensureDefaults(): Promise<void> };
const auditRepo: { log(entry: Omit<AuditEntry, 'id' | 'at'>): Promise<void>; list(limit?: number): Promise<AuditEntry[]> };
```

- [ ] **Step 1: Write failing schema/repository tests**

```ts
it('creates the database and seeds default categories once', async () => {
  await resetDb();
  await categoryRepo.ensureDefaults();
  await categoryRepo.ensureDefaults();
  expect(await categoryRepo.list()).toHaveLength(13);
});

it('rejects a stale update', async () => {
  const created = await categoryRepo.create({ name: 'Mascotas', kind: 'expense', group: 'variable' });
  await categoryRepo.update(created.id, { name: 'Pets' }, { expectedUpdatedAt: created.updatedAt });
  await expect(
    categoryRepo.update(created.id, { name: 'Otra' }, { expectedUpdatedAt: created.updatedAt })
  ).rejects.toBeInstanceOf(ConflictError);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/db/repositories`
Expected: FAIL because db/repositories do not exist.

- [ ] **Step 3: Implement the Dexie schema and repositories**

Use the exact stores from spec Annex A. `db.version(1).stores({...})`. Wrap writes in `db.transaction('rw', ...)`. `settingsRepo.get()` creates the singleton if missing. `categoryRepo.ensureDefaults()` inserts the 13 default categories only if the table is empty. `archive` sets `archived = 1` and writes audit. Add `resetDb()` that closes/deletes the DB and recreates it.

- [ ] **Step 4: Add audit tests**

```ts
it('writes an audit entry for category creation', async () => {
  const category = await categoryRepo.create({ name: 'Mascotas', kind: 'expense', group: 'variable' });
  const entries = await auditRepo.list();
  expect(entries[0]).toMatchObject({ action: 'create', entity: 'category', entityId: category.id });
});
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm test -- src/db`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/db
git commit -m "feat: add Dexie schema, settings, categories, and audit repositories"
```

---

## Task 8: Transaction repository and linked-item integrity

**Files:**
- Create: `src/db/repositories/transactions.ts`, `src/db/repositories/transactions.test.ts`
- Modify: `src/db/repositories/audit.ts` if action types need broadening

**Interfaces:**
- Consumes: `db`, domain schemas, `ConflictError`, `auditRepo`.
- Produces:
```ts
interface TransactionInput {
  type: Transaction['type'];
  direction: Transaction['direction'];
  amountCents: Cents;
  date: ISODate;
  categoryId?: UUID;
  description: string;
  note?: string;
  goalId?: UUID;
  planItemId?: UUID;
  source: Transaction['source'];
}
const transactionRepo: {
  listByMonth(month: MonthKey): Promise<Transaction[]>;
  listAll(): Promise<Transaction[]>;
  create(input: TransactionInput): Promise<Transaction>;
  update(id: UUID, patch: Partial<TransactionInput>, ctx: { expectedUpdatedAt: string }): Promise<Transaction>;
  softDelete(id: UUID, ctx: { expectedUpdatedAt: string }): Promise<void>;
  restore(id: UUID): Promise<void>;
  findByPlanItem(planItemId: UUID): Promise<Transaction | undefined>;
  countByCategory(categoryId: UUID): Promise<number>;
};
```

- [ ] **Step 1: Write failing transaction tests**

```ts
it('creates an expense and writes audit', async () => {
  const tx = await transactionRepo.create(expenseInput({ amountCents: asCents(6000), description: 'Cine' }));
  expect(tx.direction).toBe('out');
  expect(tx.deleted).toBe(0);
  expect((await auditRepo.list())[0].action).toBe('create');
});

it('rejects a future date', async () => {
  await expect(transactionRepo.create(expenseInput({ date: tomorrow() }))).rejects.toThrow(/futura/i);
});

it('rejects a date inside a closed month', async () => {
  await planRepo.close('2026-09');
  await expect(transactionRepo.create(expenseInput({ date: '2026-09-15' }))).rejects.toThrow(/cerrado/i);
});

it('reopens the plan item when its linked transaction is deleted', async () => {
  const { item, transaction } = await planRepo.payItem(rentItem.id, { amountCents: asCents(38000), date: today() }, ctx(item));
  await transactionRepo.softDelete(transaction.id, { expectedUpdatedAt: transaction.updatedAt });
  const reopened = await db.planItems.get(item.id);
  expect(reopened).toMatchObject({ status: 'pending' });
  expect(reopened?.transactionId).toBeUndefined();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm test -- src/db/repositories/transactions.test.ts`
Expected: FAIL because the repository does not exist.

- [ ] **Step 3: Implement validation and writes**

Validate with Zod, enforce sign rules, category kind/group, `goalId` rules, `planItemId` match, no future date, and closed-month check (`plans.get(month)?.status === 'closed'`). On `softDelete`, if the transaction has `planItemId`, reopen the plan item in the same Dexie transaction. Write audit. On `update`, reject month changes for linked transactions. Use `expectedUpdatedAt`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm test -- src/db/repositories/transactions.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories
git commit -m "feat: add transaction repository with linked-item integrity"
```

---

## Task 9: Plan and recurring repositories, month close

**Files:**
- Create: `src/db/repositories/plans.ts`, `src/db/repositories/recurring.ts`, `src/db/repositories/plans.test.ts`, `src/db/repositories/recurring.test.ts`

**Interfaces:**
- Consumes: `generatePlanItemsForMonth`, `computeBudgetSnapshot`, `db`, `transactionRepo`, `auditRepo`.
- Produces:
```ts
const planRepo: {
  getOrCreate(month: MonthKey): Promise<MonthlyPlan>;
  update(month: MonthKey, patch: Partial<MonthlyPlan>, ctx: { expectedUpdatedAt: string }): Promise<MonthlyPlan>;
  copyFromPrevious(month: MonthKey): Promise<MonthlyPlan>;
  ensureItems(month: MonthKey): Promise<PlanItem[]>;
  payItem(itemId: UUID, input: { amountCents: Cents; date: ISODate; description?: string }, ctx: { expectedUpdatedAt: string }): Promise<{ item: PlanItem; transaction: Transaction }>;
  receiveItem(itemId: UUID, input: { amountCents: Cents; date: ISODate; description?: string }, ctx: { expectedUpdatedAt: string }): Promise<{ item: PlanItem; transaction: Transaction }>;
  skipItem(itemId: UUID, ctx: { expectedUpdatedAt: string }): Promise<PlanItem>;
  close(month: MonthKey): Promise<MonthlyPlan>;
  reopen(month: MonthKey): Promise<MonthlyPlan>;
};
const recurringRepo: {
  list(): Promise<RecurringRule[]>;
  create(input: RecurringRuleInput): Promise<RecurringRule>;
  update(id: UUID, patch: Partial<RecurringRuleInput>, ctx: { expectedUpdatedAt: string }): Promise<RecurringRule>;
  pause(id: UUID): Promise<void>;
  remove(id: UUID): Promise<void>;
};
```

- [ ] **Step 1: Write failing plan tests**

```ts
it('creates a plan and generates recurring items idempotently', async () => {
  const plan = await planRepo.getOrCreate('2026-10' as MonthKey);
  const first = await planRepo.ensureItems('2026-10' as MonthKey);
  const second = await planRepo.ensureItems('2026-10' as MonthKey);
  expect(first).toHaveLength(2);
  expect(second).toHaveLength(0);
  expect(plan.status).toBe('active');
});

it('pays a fixed item and settles it', async () => {
  const { item, transaction } = await planRepo.payItem(rentItem.id, { amountCents: asCents(38000), date: '2026-10-05' as ISODate }, ctx(rentItem));
  expect(item.status).toBe('settled');
  expect(item.transactionId).toBe(transaction.id);
  expect(transaction.planItemId).toBe(item.id);
});

it('rejects paying the same item twice', async () => {
  await expect(planRepo.payItem(rentItem.id, { amountCents: asCents(38000), date: '2026-10-05' as ISODate }, ctx(rentItem)))
    .rejects.toThrow(/liquidado/i);
});

it('closes a past month with a snapshot and reopens it', async () => {
  await markAllItemsSettledOrSkipped('2026-09');
  const closed = await planRepo.close('2026-09' as MonthKey);
  expect(closed.status).toBe('closed');
  expect(closed.snapshot?.expenseCents).toBe(63000);
  const reopened = await planRepo.reopen('2026-09' as MonthKey);
  expect(reopened.status).toBe('active');
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/db/repositories/plans.test.ts`
Expected: FAIL. Implement `getOrCreate`, `ensureItems`, `payItem`, `receiveItem`, `skipItem`, `copyFromPrevious` (variable budgets + savings target only), `close` (month ended, no pending items, snapshot, audit), `reopen` (audit). Rerun: PASS.

- [ ] **Step 3: Write failing recurring tests**

```ts
it('does not alter existing plan items when a rule changes', async () => {
  const before = await db.planItems.where('recurringRuleId').equals(rule.id).first();
  await recurringRepo.update(rule.id, { amountCents: asCents(40000) }, ctx(rule));
  const after = await db.planItems.get(before!.id);
  expect(after?.amountCents).toBe(before?.amountCents);
});

it('pauses future generation', async () => {
  await recurringRepo.pause(rule.id);
  await planRepo.getOrCreate('2026-11' as MonthKey);
  const items = await planRepo.ensureItems('2026-11' as MonthKey);
  expect(items.some(i => i.recurringRuleId === rule.id)).toBe(false);
});
```

- [ ] **Step 4: Run recurring tests to verify they fail, then implement**

Run: `pnpm test -- src/db/repositories/recurring.test.ts`
Expected: FAIL. Implement CRUD with category group validation and audit. Rerun: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/db/repositories
git commit -m "feat: add monthly plans, recurring rules, and month close"
```

---

## Task 10: Goal repository

**Files:**
- Create: `src/db/repositories/goals.ts`, `src/db/repositories/goals.test.ts`

**Interfaces:**
- Consumes: `goalBalance`, `goalSummary`, `transactionRepo`, `db`, `auditRepo`.
- Produces:
```ts
const goalRepo: {
  list(opts?: { includeArchived?: boolean }): Promise<Goal[]>;
  get(id: UUID): Promise<Goal>;
  create(input: { name: string; targetCents: Cents; targetDate?: ISODate }): Promise<Goal>;
  update(id: UUID, patch: Partial<Goal>, ctx: { expectedUpdatedAt: string }): Promise<Goal>;
  contribute(id: UUID, input: { amountCents: Cents; date: ISODate; note?: string }): Promise<{ goal: Goal; transaction: Transaction }>;
  withdraw(id: UUID, input: { amountCents: Cents; date: ISODate; note?: string }): Promise<{ goal: Goal; transaction: Transaction }>;
  archive(id: UUID, opts: { withdrawToAvailable: boolean }): Promise<Goal>;
};
```

- [ ] **Step 1: Write failing goal tests**

```ts
it('contributes to a goal and reduces available', async () => {
  const before = await availableCents();
  const { goal, transaction } = await goalRepo.contribute(goal.id, { amountCents: asCents(30000), date: '2026-10-20' as ISODate });
  expect(await availableCents()).toBe(before - 30000);
  expect(goalBalance(goal.id, await transactionRepo.listAll())).toBe(30000);
  expect(transaction.type).toBe('goal_deposit');
});

it('rejects withdrawing more than the goal balance', async () => {
  await expect(goalRepo.withdraw(goal.id, { amountCents: asCents(30001), date: '2026-10-20' as ISODate }))
    .rejects.toThrow(/saldo/i);
});

it('archives a goal with balance by withdrawing to available', async () => {
  const archived = await goalRepo.archive(goal.id, { withdrawToAvailable: true });
  expect(archived.status).toBe('archived');
  expect(await availableCents()).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/db/repositories/goals.test.ts`
Expected: FAIL. Implement contributions/withdrawals as transactions in the same Dexie transaction as the goal status update; update `completedAt`; audit; archive with optional withdrawal. Rerun: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/db/repositories
git commit -m "feat: add savings goals with real transfers"
```

---

## Task 11: Onboarding

**Files:**
- Create: `src/features/onboarding/OnboardingPage.tsx`, `steps/WelcomeStep.tsx`, `ProfileStep.tsx`, `IncomeStep.tsx`, `FixedStep.tsx`, `GoalStep.tsx`, `DoneStep.tsx`, `useOnboarding.ts`, `onboarding.test.tsx`
- Modify: `src/routes/OnboardingPage.tsx` to render the feature

**Interfaces:**
- Consumes: `settingsRepo`, `categoryRepo`, `transactionRepo`, `recurringRepo`, `goalRepo`, `planRepo`.
- Produces: completed onboarding with opening transaction, optional recurring income/fixed rules, optional first goal, and current-month plan.

- [ ] **Step 1: Write the failing onboarding test**

```tsx
it('completes onboarding and creates the opening balance, rules, goal, and plan', async () => {
  render(<OnboardingPage />);
  await userEvent.click(screen.getByRole('button', { name: /empezar de cero/i }));
  await userEvent.type(screen.getByLabelText(/nombre/i), 'Ana');
  await userEvent.type(screen.getByLabelText(/saldo inicial/i), '1000');
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
  await userEvent.type(screen.getByLabelText(/ingreso mensual/i), '2200');
  await userEvent.click(screen.getByRole('button', { name: /continuar/i }));
  await userEvent.click(screen.getByRole('button', { name: /omitir/i }));
  await userEvent.click(screen.getByRole('button', { name: /omitir/i }));
  await userEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));

  expect((await transactionRepo.listAll()).some(t => t.type === 'opening')).toBe(true);
  expect(await recurringRepo.list()).toHaveLength(1);
  expect(await settingsRepo.get()).toMatchObject({ onboardingCompletedAt: expect.any(String) });
  expect(await planRepo.getOrCreate(currentMonth())).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/features/onboarding`
Expected: FAIL because the feature does not exist.

- [ ] **Step 3: Implement the flow**

Persist `onboardingStep` after each step. Create the opening transaction with `source = 'opening'` and direction `in`/`out`. Create recurring rules with categories. Create the first goal. On finish, set `onboardingCompletedAt` and call `planRepo.getOrCreate(currentMonth())` + `ensureItems`. Add a "datos de ejemplo" path that seeds 3 months via a dedicated repository function and audits one `seed_data` entry.

- [ ] **Step 4: Run tests and commit**

Run: `pnpm test -- src/features/onboarding`
Expected: PASS.

```bash
git add src/features/onboarding src/routes/OnboardingPage.tsx
git commit -m "feat: add onboarding with opening balance, income, fixed costs, and first goal"
```

---

## Task 12: Transactions screen

**Files:**
- Create: `src/features/transactions/TransactionsPage.tsx`, `TransactionList.tsx`, `TransactionRow.tsx`, `TransactionDrawer.tsx`, `QuickAdd.tsx`, `TransactionFilters.tsx`, `useTransactions.ts`, `transactions.test.tsx`
- Modify: `src/routes/TransactionsPage.tsx`, `src/components/layout/AppShell.tsx` FAB

**Interfaces:**
- Consumes: `transactionRepo`, `categoryRepo`, `formatPEN`, `formatDateShort`, `useLiveQuery`.
- Produces: `/movimientos` with month/search/type/category filters, summary, running balance, create/edit/delete with undo.

- [ ] **Step 1: Write failing screen tests**

```tsx
it('adds an expense and shows it in the list', async () => {
  render(<TransactionsPage />);
  await userEvent.click(screen.getByRole('button', { name: /nuevo movimiento/i }));
  await userEvent.type(screen.getByLabelText(/monto/i), '60');
  await userEvent.click(screen.getByRole('button', { name: /ocio/i }));
  await userEvent.type(screen.getByLabelText(/descripción/i), 'Cine');
  await userEvent.click(screen.getByRole('button', { name: /guardar/i }));
  expect(await screen.findByText('Cine')).toBeInTheDocument();
  expect(screen.getByText('−S/ 60.00')).toBeInTheDocument();
});

it('deletes with undo', async () => {
  render(<TransactionsPage />);
  await userEvent.click(screen.getByRole('button', { name: /acciones de cine/i }));
  await userEvent.click(screen.getByRole('menuitem', { name: /eliminar/i }));
  await userEvent.click(screen.getByRole('button', { name: /deshacer/i }));
  expect(await screen.findByText('Cine')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/features/transactions`
Expected: FAIL. Implement the list, filters in URL params, summary strip, running balance, drawer form (RHF + Zod), keyboard shortcuts, delete toast with 5s undo. Rerun: PASS.

- [ ] **Step 3: Verify closed-month behavior in the UI**

Add a test: navigating to a closed month hides the "Nuevo movimiento" action and shows "Mes cerrado". Run: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/transactions src/routes/TransactionsPage.tsx src/components/layout
git commit -m "feat: add transactions screen with filters, running balance, and undo"
```

---

## Task 13: Budget screen

**Files:**
- Create: `src/features/budget/BudgetPage.tsx`, `PlanSummary.tsx`, `IncomeSection.tsx`, `FixedSection.tsx`, `VariableSection.tsx`, `SavingsSection.tsx`, `PayItemDialog.tsx`, `CopyMonthDialog.tsx`, `CloseMonthDialog.tsx`, `useBudget.ts`, `budget.test.tsx`
- Modify: `src/routes/BudgetPage.tsx`

**Interfaces:**
- Consumes: `planRepo`, `recurringRepo`, `computeBudgetSnapshot`, `categoryRepo`, `formatPEN`.
- Produces: `/presupuesto` with plan vs actual, fixed payment/skip, variable budgets, savings target, copy previous, close/reopen.

- [ ] **Step 1: Write failing budget tests**

```tsx
it('pays a fixed item and updates executed and available', async () => {
  render(<BudgetPage />);
  await userEvent.click(screen.getByRole('button', { name: /pagar alquiler/i }));
  await userEvent.click(screen.getByRole('button', { name: /confirmar pago/i }));
  expect(await screen.findByText(/pagado/i)).toBeInTheDocument();
  expect(screen.getByText('−S/ 380.00')).toBeInTheDocument();
});

it('edits a variable budget inline and persists it', async () => {
  render(<BudgetPage />);
  const input = screen.getByLabelText(/presupuesto de comida/i);
  await userEvent.clear(input);
  await userEvent.type(input, '300');
  await userEvent.tab();
  expect(await db.plans.get(currentMonth())).toMatchObject({ variableBudgets: expect.arrayContaining([{ categoryId: 'food', plannedCents: 30000 }]) });
});

it('shows a closed month as read-only', async () => {
  await planRepo.close(previousMonth());
  render(<BudgetPage />);
  expect(screen.getByText(/mes cerrado/i)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /pagar/i })).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/features/budget`
Expected: FAIL. Implement the sections, inline budget editing, pay/skip/receive dialogs, copy previous, close/reopen, and totals. Rerun: PASS.

- [ ] **Step 3: Verify no double counting**

Add a test: after paying a fixed item, the variable spent excludes it and the transaction appears once in the ledger. Run: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/features/budget src/routes/BudgetPage.tsx
git commit -m "feat: add budget screen with fixed commitments and month close"
```

---

## Task 14: Goals screen

**Files:**
- Create: `src/features/goals/GoalsPage.tsx`, `GoalCard.tsx`, `GoalDialog.tsx`, `GoalDetail.tsx`, `ContributeDialog.tsx`, `WithdrawDialog.tsx`, `useGoals.ts`, `goals.test.tsx`
- Modify: `src/routes/GoalsPage.tsx`

**Interfaces:**
- Consumes: `goalRepo`, `goalSummary`, `formatPEN`, `formatDateShort`.
- Produces: `/metas` with summary, cards, contribute/withdraw, detail, archive.

- [ ] **Step 1: Write failing goal screen tests**

```tsx
it('contributes to a goal and updates progress', async () => {
  render(<GoalsPage />);
  await userEvent.click(screen.getByRole('button', { name: /aportar a viaje a cusco/i }));
  await userEvent.type(screen.getByLabelText(/monto/i), '50');
  await userEvent.click(screen.getByRole('button', { name: /confirmar aporte/i }));
  expect(await screen.findByText(/S\/ 170.00/)).toBeInTheDocument();
});

it('prevents withdrawing more than the goal balance', async () => {
  render(<GoalsPage />);
  await userEvent.click(screen.getByRole('button', { name: /retirar de viaje a cusco/i }));
  await userEvent.type(screen.getByLabelText(/monto/i), '999');
  await userEvent.click(screen.getByRole('button', { name: /confirmar retiro/i }));
  expect(await screen.findByText(/supera el saldo/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/features/goals`
Expected: FAIL. Implement cards, dialogs, detail history, archive with withdraw-to-available. Rerun: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/goals src/routes/GoalsPage.tsx
git commit -m "feat: add goals screen with real deposits and withdrawals"
```

---

## Task 15: Reports, charts, and CSV export

**Files:**
- Create: `src/features/reports/ReportsPage.tsx`, `KpiGrid.tsx`, `TrendChart.tsx`, `CategoryChart.tsx`, `BudgetVarianceTable.tsx`, `AnnualTable.tsx`, `useReports.ts`, `reports.test.tsx`; `src/components/charts/ChartTable.tsx`; `src/lib/csv.ts`; `src/lib/download.ts`
- Modify: `src/routes/ReportsPage.tsx`

**Interfaces:**
- Consumes: `buildMonthlyReport`, `buildAnnualReport`, `buildCategoryBreakdown`, `formatPEN`.
- Produces: `/reportes` with month/year selector, KPIs, lazy-loaded Recharts, data tables, CSV downloads.

- [ ] **Step 1: Write failing report tests**

```tsx
it('shows monthly KPIs and a table alternative for the chart', async () => {
  render(<ReportsPage />);
  expect(await screen.findByText(/tasa de ahorro/i)).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /ver tabla/i }));
  expect(screen.getByRole('table', { name: /tendencia/i })).toBeInTheDocument();
});

it('exports a CSV with BOM and comma delimiter', async () => {
  const blob = await buildTransactionsCsv(fixtureOctober2026());
  const text = await blob.text();
  expect(text.startsWith('\uFEFF')).toBe(true);
  expect(text.split('\n')[0]).toBe('fecha,descripcion,categoria,tipo,monto,moneda,origen,nota');
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/features/reports`
Expected: FAIL. Implement reports, lazy-load Recharts, chart table toggle, print styles, CSV generation. Rerun: PASS.

- [ ] **Step 3: Verify bundle split**

Run: `pnpm build`
Expected: Recharts is in a separate chunk for `/reportes`; initial JS is within the 250 KB gzip budget (document the measured size in the PR/commit message).

- [ ] **Step 4: Commit**

```bash
git add src/features/reports src/components/charts src/lib
git commit -m "feat: add reports, accessible charts, and CSV export"
```

---

## Task 16: Import CSV/XLSX, dedupe, undo, and JSON backup

**Files:**
- Create: `src/features/import/ImportPage.tsx`, `UploadStep.tsx`, `MappingStep.tsx`, `PreviewStep.tsx`, `SummaryStep.tsx`, `useImport.ts`, `import.test.tsx`; `src/domain/import.ts`, `src/domain/backup.ts`, `src/lib/xlsx.ts`, `src/lib/crypto.ts`, `src/db/repositories/imports.ts`, `src/db/repositories/backup.ts`, tests; fixtures `src/test/fixtures/*.csv`, `*.xlsx`
- Modify: `src/routes/ImportPage.tsx`, `src/features/settings/SettingsPage.tsx` (import/export entry points)

**Interfaces:**
- Consumes: `transactionRepo`, `categoryRepo`, `db`, `parseAmountInput`, `todayInLima`.
- Produces:
```ts
function normalizeRows(rows: Record<string, string>[], mapping: ImportMapping): { valid: ImportRow[]; errors: ImportError[] };
async function dedupeHash(row: ImportRow): Promise<string>;
const importRepo: {
  createBatch(input: { filename: string; fileType: 'csv' | 'xlsx'; rows: ImportRow[]; mapping: ImportMapping }): Promise<ImportBatch>;
  undo(batchId: UUID): Promise<void>;
};
const backupRepo: {
  exportAll(appVersion: string): Promise<Backup>;
  replaceAll(backup: Backup): Promise<void>;
};
```

- [ ] **Step 1: Write failing import tests**

```ts
it('normalizes dates, amounts, and directions from CSV rows', () => {
  const rows = parseCsv('fecha,descripcion,monto\n28/10/2026,Cine,-60,00');
  const { valid, errors } = normalizeRows(rows, { date: 'fecha', description: 'descripcion', amount: 'monto' });
  expect(valid[0]).toMatchObject({ date: '2026-10-28', amountCents: 6000, direction: 'out' });
  expect(errors).toHaveLength(0);
});

it('deduplicates the same row on a second import', async () => {
  const batch = await importRepo.createBatch({ filename: 'bank.csv', fileType: 'csv', rows: [row], mapping });
  const second = await importRepo.createBatch({ filename: 'bank.csv', fileType: 'csv', rows: [row], mapping });
  expect(batch.importedCount).toBe(1);
  expect(second.skippedCount).toBe(1);
});

it('rejects rows inside a closed month', async () => {
  await planRepo.close('2026-09');
  const { valid, errors } = normalizeRows([{ date: '2026-09-15', description: 'X', amount: '-10' }], mapping);
  expect(valid).toHaveLength(0);
  expect(errors[0].reason).toMatch(/cerrado/i);
});

it('undoes an import batch and restores counts', async () => {
  const batch = await importRepo.createBatch({ filename: 'bank.csv', fileType: 'csv', rows: [row], mapping });
  await importRepo.undo(batch.id);
  expect(await transactionRepo.listAll()).toHaveLength(0);
  expect((await db.importBatches.get(batch.id))?.status).toBe('undone');
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement CSV and XLSX parsing**

Run: `pnpm test -- src/domain/import.test.ts src/db/repositories/imports.test.ts`
Expected: FAIL. Implement Papa Parse with delimiter detection and Windows-1252 fallback; `read-excel-file` for XLSX; date/amount/debit-credit mapping; SHA-256 dedupe; batch insert; undo. Rerun: PASS.

- [ ] **Step 3: Write failing backup tests**

```ts
it('round-trips a backup and replaces all data', async () => {
  const backup = await backupRepo.exportAll('1.0.0');
  await resetDb();
  await backupRepo.replaceAll(backup);
  expect(await transactionRepo.listAll()).toHaveLength(backup.data.transactions.length);
});

it('rejects an invalid backup schema', async () => {
  await expect(backupRepo.replaceAll({ nope: true } as never)).rejects.toThrow();
});
```

- [ ] **Step 4: Implement backup and the import UI**

Run tests until PASS. The import UI has file upload, mapping, preview (valid/invalid/duplicates), confirm, summary, and undo. The JSON import flow forces a current backup download, validates, previews counts, requires typed `REEMPLAZAR`, replaces, and reloads.

- [ ] **Step 5: Commit**

```bash
git add src/features/import src/routes/ImportPage.tsx src/domain/import.ts src/domain/backup.ts src/lib src/db/repositories/imports.ts src/db/repositories/backup.ts src/test/fixtures
git commit -m "feat: add CSV/XLSX import with dedupe and JSON backup restore"
```

---

## Task 17: Settings, categories, recurring, audit, and PWA controls

**Files:**
- Create: `src/features/settings/SettingsPage.tsx`, `ProfileSection.tsx`, `CategoriesSection.tsx`, `RecurringSection.tsx`, `DataSection.tsx`, `AuditSection.tsx`, `PwaSection.tsx`, `settings.test.tsx`; `src/hooks/useSettings.ts`
- Modify: `src/routes/SettingsPage.tsx`, `src/components/layout/Header.tsx`

**Interfaces:**
- Consumes: all repositories, `settingsRepo`, `categoryRepo`, `recurringRepo`, `auditRepo`, `backupRepo`, `useTheme`.
- Produces: `/ajustes` with profile, preferences, categories, recurring, data, audit, PWA install/update, danger zone.

- [ ] **Step 1: Write failing settings tests**

```tsx
it('archives a category and hides it from new budgets', async () => {
  render(<SettingsPage />);
  await userEvent.click(screen.getByRole('button', { name: /categorías/i }));
  await userEvent.click(screen.getByRole('button', { name: /archivar ocio/i }));
  expect(await categoryRepo.list()).not.toContainEqual(expect.objectContaining({ name: 'Ocio', archived: 0 }));
});

it('pauses a recurring rule', async () => {
  render(<SettingsPage />);
  await userEvent.click(screen.getByRole('button', { name: /recurrentes/i }));
  await userEvent.click(screen.getByRole('button', { name: /pausar alquiler/i }));
  expect((await recurringRepo.list()).find(r => r.name === 'Alquiler')?.active).toBe(0);
});
```

- [ ] **Step 2: Run tests to verify they fail, then implement**

Run: `pnpm test -- src/features/settings`
Expected: FAIL. Implement sections, confirmations, archive restrictions, audit list with search, theme toggle, data export/import, PWA install prompt, storage persistence, backup reminder. Rerun: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/features/settings src/routes/SettingsPage.tsx src/hooks src/components/layout/Header.tsx
git commit -m "feat: add settings, categories, recurring rules, audit, and PWA controls"
```

---

## Task 18: PWA offline/update, E2E, accessibility, performance, and deploy

**Files:**
- Create: `src/features/pwa/UpdatePrompt.tsx`, `src/features/pwa/InstallPrompt.tsx`, `public/icon.svg`, `scripts/generate-icons.ts`, `vite.config.ts` PWA config, `vercel.json`, `playwright.config.ts`, `e2e/*.spec.ts`, `.github/workflows/ci.yml`, `README.md`
- Modify: `src/app/providers.tsx`, `src/components/feedback/OfflineBanner.tsx`, `index.html`

**Interfaces:**
- Consumes: all previous tasks.
- Produces: installable PWA with offline shell, update prompt, manifest, icons, E2E/a11y coverage, CI, deploy config.

- [ ] **Step 1: Configure PWA and icons**

Add `vite-plugin-pwa` with `registerType: 'prompt'`, manifest (name, short_name, description, theme/background, display standalone, icons 192/512/maskable, shortcuts), `workbox` precache of JS/CSS/HTML/woff2/png/svg/ico, `navigateFallback: '/index.html'`, `cleanupOutdatedCaches: true`. Generate PNG icons from `public/icon.svg` with `sharp` (add `sharp` as a dev dependency) via `pnpm icons`. Add `apple-touch-icon`, theme-color meta, and `apple-mobile-web-app-capable`.

- [ ] **Step 2: Add update/offline UI**

`UpdatePrompt` uses `virtual:pwa-register/react`; show a persistent banner with "Actualizar" only when a new SW is waiting. `OfflineBanner` shows "Sin conexión. Tus datos siguen acá." Test that the app still navigates offline using Playwright.

- [ ] **Step 3: Write E2E tests**

```ts
test('complete onboarding, add expense, pay fixed, and see reconciled dashboard', async ({ page }) => {
  await page.goto('/');
  await completeOnboarding(page);
  await addExpense(page, 'Cine', '60');
  await page.getByRole('link', { name: 'Presupuesto' }).click();
  await page.getByRole('button', { name: /pagar alquiler/i }).click();
  await page.getByRole('button', { name: /confirmar pago/i }).click();
  await page.getByRole('link', { name: 'Inicio' }).click();
  await expect(page.getByText('−S/ 440.00')).toBeVisible();
});
```

Add tests for delete/undo, goal contribute/withdraw, close/reopen, CSV import/dedupe/undo, JSON backup restore, and offline reload.

- [ ] **Step 4: Add accessibility tests**

Run axe on `/`, `/movimientos`, `/presupuesto`, `/reportes`, `/metas`; expect zero violations. Add a keyboard-only test for the quick-add dialog and tab navigation.

- [ ] **Step 5: Run quality gates**

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm test:e2e
pnpm test:a11y
```

Expected: all pass; domain coverage ≥ 90%, global ≥ 80%; initial JS within budget; Lighthouse mobile Performance ≥ 85, Accessibility 100, PWA installable.

- [ ] **Step 6: Add CI and deploy config**

GitHub Actions with pnpm cache: install, lint, typecheck, test, build, Playwright. `vercel.json` rewrites all non-asset routes to `/index.html`. Document deploy in `README.md` (`pnpm build` → `dist/`).

- [ ] **Step 7: Commit**

```bash
git add .
git commit -m "feat: complete PWA, offline, E2E, accessibility, and deploy"
```

---

## Final Verification

Before declaring v1 done, run the spec's definition of done:

- [ ] Onboarding → first expense in under 10 seconds.
- [ ] Saldo, disponible, presupuesto, fijos, metas y reportes reconcilian.
- [ ] Pagar un fijo no lo cuenta dos veces.
- [ ] Aportar/retirar de una meta mueve el disponible en la dirección correcta.
- [ ] Un mes cerrado es inmutable desde UI, importación y metas.
- [ ] La app funciona offline, se instala y sobrevive a una recarga.
- [ ] Backup JSON restaura todos los datos.
- [ ] Importar un CSV real detecta duplicados y permite deshacer el lote.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm test:e2e`, `pnpm test:a11y` pasan.
- [ ] Deploy estático con HTTPS y SPA rewrite verificado en móvil y escritorio.
