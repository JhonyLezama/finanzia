# Alcancía — Especificación de diseño

- **Estado:** diseño aprobado en conversación; este documento pendiente de revisión
- **Fecha:** 2026-10-29
- **Versión:** 1.0
- **Producto:** aplicación web personal de finanzas, instalable como PWA
- **Idioma:** español (Perú) · **Moneda:** PEN (soles)
- **Zona horaria:** `America/Lima`

---

## 1. Resumen ejecutivo

Alcancía convierte el prototipo de una sola página en una herramienta de finanzas personales con rigor de analista. Es una SPA local-first: los datos viven en el dispositivo, la app funciona sin conexión, se instala como PWA y no requiere cuentas ni backend.

El producto resuelve los fallos del prototipo: el ahorro mueve dinero de verdad, el presupuesto es mensual y editable, los gastos fijos se planifican y se registran sin duplicarse, y cada número es auditable. Está pensado para una persona con alfabetización financiera —por ejemplo, un economista— que quiere control, precisión y privacidad, no gamificación.

**Stack:** Vite 8, React 19, TypeScript 7, React Router 8, Tailwind 4, Dexie 4, Zod 4, React Hook Form, date-fns, Recharts, `vite-plugin-pwa`, Radix UI. Gestor: **pnpm**.

---

## 2. Contexto y problema

El prototipo actual demuestra una dirección visual sólida (verde profundo, dorado, frasco, Bricolage + DM Sans), pero tiene fallas de producto:

- Aportar a una meta no descuenta del saldo disponible.
- El “presupuesto del mes” suma todos los gastos históricos.
- La racha no se reinicia por día.
- No existen gastos fijos ni compromisos.
- Borrar no tiene confirmación ni deshacer.
- El consejo de sobregasto está hardcodeado.
- No se puede editar el presupuesto.

La app real conserva la identidad y el copy cálido, pero reemplaza la lógica por un modelo contable explícito y verificable.

---

## 3. Usuarios y criterios de éxito

### 3.1 Usuario principal

Persona que administra sus finanzas personales en Perú, con conocimiento de presupuestos, y que valora:

- exactitud y trazabilidad por encima de la decoración;
- privacidad: sus datos no salen del dispositivo;
- uso offline y en móvil;
- reportes comparables mes a mes;
- exportar a CSV para analizar en Excel.

### 3.2 Criterios de éxito

1. Registrar un gasto en menos de 10 segundos.
2. Los números reconcilian: saldo, presupuesto, fijos, metas y reportes usan una sola fuente de verdad.
3. La app funciona sin conexión después de la primera carga.
4. Se instala como PWA en Android, iOS y escritorio.
5. Un backup JSON se restaura sin pérdida y sin duplicados.
6. Un gasto fijo pagado no se cuenta dos veces.
7. Los reportes de meses cerrados no cambian retroactivamente.
8. Accesibilidad WCAG 2.2 AA en las pantallas principales.

---

## 4. Alcance

### 4.1 Dentro de la v1

- Onboarding con saldo inicial, ingreso, fijos y primera meta.
- Alta rápida, edición y borrado con deshacer de movimientos.
- Presupuesto mensual: ingresos previstos, gastos fijos, variables y ahorro.
- Recurrentes mensuales (sueldo, alquiler, internet, suscripciones).
- Metas con aportes y retiros reales.
- Reportes mensuales y anuales, gráficos y tablas.
- Importación de CSV y XLSX con mapeo, vista previa, deduplicación y deshacer por lote.
- Exportación CSV y backup/restauración JSON.
- Categorías administrables, auditoría y cierre de mes.
- PWA instalable, offline, actualización controlada y recordatorio de backup.

### 4.2 Fuera de la v1 (no objetivos)

- Cuentas, login, nube, sincronización multi-dispositivo.
- Multi-moneda en la UI (el esquema la reserva, pero solo se opera en PEN).
- Conexión bancaria automática.
- Notificaciones push con la app cerrada.
- Hábitos, rachas, retos y lecciones.
- Transacciones divididas, etiquetas y comprobantes adjuntos.
- Recurrentes semanales, quincenales o anuales.
- Exportación PDF (se usa impresión del navegador).
- Cifrado en reposo con contraseña.
- Inversiones, impuestos, facturación o P&L de negocio.

---

## 5. Principios de producto

1. **La verdad contable manda.** Si un número no se puede explicar, no se muestra.
2. **Una sola fuente de verdad.** El ledger de movimientos alimenta saldos, presupuestos y reportes.
3. **Local-first.** Sin red, sin cuentas, sin telemetría.
4. **Explícito antes que automático.** Un fijo se reserva y se confirma; no se inventa un pago.
5. **Densidad con jerarquía.** Más información por pantalla, sin ruido.
6. **Sin gamificación.** Nada de rachas, confeti ni culpa. La recompensa es claridad.
7. **Trazabilidad.** Toda mutación relevante deja registro y se puede deshacer o auditar.

---

## 6. Arquitectura de información

### 6.1 Rutas

| Ruta | Pantalla | Navegación |
|---|---|---|
| `/` | Inicio | Barra inferior / sidebar |
| `/movimientos` | Movimientos | Barra inferior / sidebar |
| `/presupuesto` | Presupuesto | Barra inferior / sidebar |
| `/reportes` | Reportes | Barra inferior / sidebar |
| `/metas` | Metas | Barra inferior / sidebar |
| `/ajustes` | Ajustes | Header / sidebar |
| `/onboarding` | Onboarding | Fuera del shell |
| `/importar` | Importación | Desde Ajustes o Movimientos |
| `/offline` | Shell offline | Fallback de primera carga |

### 6.2 Navegación

- **Móvil:** barra inferior fija con 5 destinos (Inicio, Movimientos, Presupuesto, Reportes, Metas). Ajustes en el header. FAB de alta rápida. Safe areas respetadas.
- **Escritorio:** sidebar de 240 px con los 6 destinos; contenido centrado con máximo 1200 px.
- **Atajos:** `N` nuevo movimiento, `/` buscar, `Esc` cerrar, `Ctrl/Cmd + Enter` guardar.
- El mes seleccionado y los filtros viven en la URL (`?mes=2026-10`, `?q=...`) para que atrás/adelante funcionen.
- El selector permite el mes actual y los anteriores. No se navega a meses futuros en v1; los recurrentes se generan al llegar el mes.

---

## 7. Modelo de dominio

### 7.1 Tipos base

```ts
type Cents = number;        // entero, >= 0; nunca decimales flotantes
type ISODate = string;      // YYYY-MM-DD, fecha de calendario
type MonthKey = string;     // YYYY-MM
type UUID = string;         // crypto.randomUUID()
type ISOTimestamp = string; // ISO 8601 UTC
```

- `Cents` se valida con Zod: entero, `0 <= n <= 1_000_000_000_000`.
- Las fechas de calendario no se convierten a UTC. “Hoy” se calcula con `Intl.DateTimeFormat` en `America/Lima`.
- Los IDs se generan con `crypto.randomUUID()`.

### 7.2 Entidades

#### Settings

```ts
{
  id: 'app';
  displayName?: string;
  currency: 'PEN';
  locale: 'es-PE';
  timezone: 'America/Lima';
  theme: 'system' | 'light' | 'dark';
  onboardingStep: 0 | 1 | 2 | 3 | 4 | 5;
  onboardingCompletedAt?: ISOTimestamp;
  lastBackupAt?: ISOTimestamp;
  backupReminderDismissedAt?: ISOTimestamp;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
```

#### Category

```ts
{
  id: UUID;
  name: string;                       // 1..40
  kind: 'expense' | 'income';
  group: 'fixed' | 'variable' | 'income';
  colorToken: string;                 // token semántico, no hex
  icon?: string;                      // nombre Lucide
  order: number;
  archived: 0 | 1;
  isDefault: 0 | 1;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
```

- `group` es `fixed` o `variable` para gastos, e `income` para ingresos.
- Nombre único por `kind` entre categorías no archivadas (comparación sin mayúsculas).
- Una categoría con movimientos no se elimina: se archiva. Las transacciones históricas conservan su `categoryId`.
- Categorías por defecto:
  - **Fijos:** Vivienda, Servicios, Suscripciones.
  - **Variables:** Comida, Transporte, Salud, Ocio, Educación, Otros.
  - **Ingresos:** Sueldo, Extra, Inversiones, Otros ingresos.

#### Transaction

```ts
{
  id: UUID;
  type: 'income' | 'expense' | 'goal_deposit' | 'goal_withdraw' | 'opening';
  direction: 'in' | 'out';
  amountCents: Cents;                 // siempre positivo
  currency: 'PEN';
  date: ISODate;
  categoryId?: UUID;
  description: string;                // 1..120
  note?: string;                      // 0..500
  goalId?: UUID;
  planItemId?: UUID;
  recurringRuleId?: UUID;
  importBatchId?: UUID;
  externalId?: string;
  dedupeHash?: string;
  source: 'manual' | 'import' | 'recurring' | 'goal' | 'opening';
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  deleted: 0 | 1;
  deletedAt?: ISOTimestamp;
}
```

**Reglas de dirección:**

| Tipo | Dirección permitida |
|---|---|
| `income` | `in` |
| `expense` | `out` |
| `goal_deposit` | `out` |
| `goal_withdraw` | `in` |
| `opening` | `in` o `out` |

- `date` no puede ser futura. Las fechas futuras se representan con `PlanItem`, no con transacciones.
- `goal_deposit` y `goal_withdraw` exigen `goalId`; el resto lo prohíbe.
- `planItemId` solo se usa para liquidar un `PlanItem` del tipo correspondiente.
- `currency` debe ser `PEN` en v1; otro valor se rechaza en la UI y en la importación.
- El borrado es lógico (`deleted = 1`); el registro permanece para auditoría y se puede restaurar.
- `dedupeHash` se indexa para detectar duplicados de importación.

#### MonthlyPlan

```ts
{
  id: MonthKey;                       // '2026-10'
  year: number;
  month: number;                      // 1..12
  status: 'active' | 'closed';
  savingsTargetCents: Cents;
  variableBudgets: Array<{ categoryId: UUID; plannedCents: Cents }>;
  snapshot?: {
    closedAt: ISOTimestamp;
    incomeCents: Cents;
    expenseCents: Cents;
    fixedCents: Cents;
    variableCents: Cents;
    savingsCents: Cents;
    availableCents: Cents;
    planExpenseCents: Cents;
  };
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  closedAt?: ISOTimestamp;
}
```

- Un plan por mes, creado on-demand al entrar por primera vez al mes.
- `variableBudgets` no admite categorías duplicadas ni categorías fijas.
- `savingsTargetCents` es el ahorro planificado del mes.
- Un plan `closed` es de solo lectura. Para modificarlo hay que reabrirlo.

#### PlanItem

```ts
{
  id: UUID;
  planId: MonthKey;
  kind: 'expected_income' | 'fixed_expense';
  name: string;                       // snapshot del nombre
  categoryId: UUID;
  amountCents: Cents;                 // planificado
  dueDate: ISODate;                   // dentro del mes del plan
  status: 'pending' | 'settled' | 'skipped';
  transactionId?: UUID;               // obligatorio si settled
  recurringRuleId?: UUID;
  note?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
```

- Generación idempotente: para un `planId` y `recurringRuleId`, no puede existir más de un item.
- `settled` exige `transactionId`; `pending` y `skipped` lo prohíben.
- `amountCents` es el plan; el monto real pagado/cobrado vive en la transacción vinculada.
- `name` se congela al crear el item para que el histórico no cambie si se renombra la plantilla.

#### RecurringRule

```ts
{
  id: UUID;
  name: string;
  kind: 'expected_income' | 'fixed_expense';
  amountCents: Cents;
  categoryId: UUID;
  dayOfMonth: number;                 // 1..31; se ajusta al último día del mes
  startMonth: MonthKey;
  endMonth?: MonthKey;
  active: 0 | 1;
  note?: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
}
```

- Solo frecuencia mensual en v1.
- Editar una regla actualiza sus `PlanItem` pendientes (nombre, monto, categoría y fecha) en todos los meses abiertos; los liquidados u omitidos no cambian.
- Pausar (`active = 0`) detiene la generación futura; los items existentes se conservan.
- Eliminar una regla elimina también sus `PlanItem` pendientes y sus recordatorios en meses abiertos; los items liquidados u omitidos y los movimientos ya registrados se conservan.

#### Goal

```ts
{
  id: UUID;
  name: string;
  targetCents: Cents;
  targetDate?: ISODate;
  status: 'active' | 'archived';
  colorToken: string;
  createdAt: ISOTimestamp;
  updatedAt: ISOTimestamp;
  completedAt?: ISOTimestamp;
}
```

- El saldo de la meta es derivado: aportes menos retiros. No existe un campo editable de “ahorrado”.
- `completedAt` se setea automáticamente cuando el saldo alcanza el objetivo y se limpia si baja.
- Una meta con movimientos no se elimina: se archiva.

#### ImportBatch

```ts
{
  id: UUID;
  filename: string;
  fileType: 'csv' | 'xlsx';
  importedAt: ISOTimestamp;
  rowCount: number;
  importedCount: number;
  skippedCount: number;
  errorCount: number;
  status: 'completed' | 'undone';
  undoneAt?: ISOTimestamp;
  mapping: Record<string, string>;
}
```

#### AuditEntry

```ts
{
  id: UUID;
  at: ISOTimestamp;
  action:
    | 'create' | 'update' | 'delete' | 'restore'
    | 'import' | 'undo_import' | 'seed_data'
    | 'close_month' | 'reopen_month'
    | 'goal_archive' | 'category_archive'
    | 'backup_export' | 'backup_import' | 'reset';
  entity: 'transaction' | 'plan' | 'plan_item' | 'goal' | 'category' | 'recurring_rule' | 'import_batch' | 'settings';
  entityId: string;
  summary: string;
  before?: unknown;
  after?: unknown;
}
```

- Append-only. No se edita ni se borra desde la UI.
- Se exporta dentro del backup JSON.
- La UI muestra los últimos 200 con búsqueda y filtro.

### 7.3 Invariantes

1. Todo monto es entero en céntimos y positivo; la dirección define el signo.
2. Un movimiento `deleted = 1` no participa en ningún cálculo.
3. Un plan cerrado no acepta movimientos con fecha dentro de ese mes.
4. Un `PlanItem` liquidado tiene exactamente una transacción vinculada.
5. Una meta no puede retirar más de su saldo.
6. Un pago fijo no se cuenta dos veces: cuenta como gasto una sola vez, en su transacción.
7. El saldo de una meta nunca se guarda como campo editable.
8. La generación de recurrentes es idempotente.
9. Toda mutación relevante escribe una entrada de auditoría; las operaciones masivas (importación, seed, restore) escriben una sola entrada con conteos.
10. Las actualizaciones usan concurrencia optimista (`expectedUpdatedAt`); si el registro cambió en otra pestaña, se rechaza y se avisa.
11. Existe como máximo una transacción `opening` no borrada.
12. Una categoría de gasto tiene grupo `fixed` o `variable`; una de ingreso tiene grupo `income`. No se puede cambiar el grupo si la categoría está usada en un plan abierto o en una transacción.
13. Un `PlanItem` de tipo `fixed_expense` exige una categoría de grupo `fixed`; uno de tipo `expected_income` exige una categoría de grupo `income`. Las reglas recurrentes cumplen la misma restricción.
14. Un plan cerrado bloquea también la edición de sus `PlanItem`, presupuestos variables y objetivo de ahorro.
15. Una meta con saldo mayor a cero no se archiva sin retirar el saldo; la acción de archivar puede generar el retiro a disponible con confirmación.
16. Borrar una transacción vinculada a un `PlanItem` reabre el item (`pending`, sin `transactionId`) en la misma transacción de base de datos.
17. Una transacción vinculada a un `PlanItem` no puede cambiar de mes; para hacerlo hay que borrarla y reabrir el item.
18. La importación rechaza filas con fecha dentro de un mes cerrado.
19. Archivar una categoría usada por un plan abierto o por una regla activa está prohibido; primero se quita del plan o se pausa la regla.

---

## 8. Reglas financieras

### 8.1 Signo y saldo

```ts
const signed = (t: Transaction) =>
  t.direction === 'in' ? t.amountCents : -t.amountCents;

const availableCents =
  transactions.filter(t => !t.deleted).reduce((sum, t) => sum + signed(t), 0);

const goalBalanceCents = (goalId: UUID) =>
  transactions
    .filter(t =>
      !t.deleted &&
      t.goalId === goalId &&
      (t.type === 'goal_deposit' || t.type === 'goal_withdraw')
    )
    .reduce((sum, t) =>
      sum + (t.type === 'goal_deposit' ? t.amountCents : -t.amountCents), 0);

const netWorthCents =
  availableCents + goals.reduce((sum, g) => sum + goalBalanceCents(g.id), 0);
```

El saldo inicial es una transacción `opening` con dirección `in` (activo) u `out` (deuda). No se guarda en `Settings`.

### 8.2 Disponible para gastar

```ts
const pendingFixedCents =
  planItems
    .filter(i => i.planId === currentPlan.id && i.kind === 'fixed_expense' && i.status === 'pending')
    .reduce((sum, i) => sum + i.amountCents, 0);

const monthlyGoalContribCents =
  transactions
    .filter(t => !t.deleted && t.date.startsWith(currentPlan.id))
    .reduce((sum, t) =>
      sum + (t.type === 'goal_deposit' ? t.amountCents : 0)
          - (t.type === 'goal_withdraw' ? t.amountCents : 0), 0);

const remainingSavingsCents =
  Math.max(0, currentPlan.savingsTargetCents - Math.max(0, monthlyGoalContribCents));

const spendableCents =
  availableCents - pendingFixedCents - remainingSavingsCents;
```

`spendableCents` puede ser negativo. Se muestra en rojo y con un desglose emergente:

> Saldo real − fijos pendientes − ahorro pendiente.

“Disponible para gastar” solo se muestra para el mes actual. Para meses anteriores se muestra “Saldo del mes” (acumulado al último día del mes) y, si está cerrado, el snapshot. Nunca se muestra el disponible actual como si fuera el de un mes pasado.

### 8.3 Ejecución y desvío

```ts
const monthIncomeCents = sum(type === 'income', month);
const monthExpenseCents = sum(type === 'expense', month);

const fixedExpenseCents = sum(
  type === 'expense' && category.group === 'fixed',
  month
);
const variableExpenseCents = monthExpenseCents - fixedExpenseCents;

const fixedPlanCents = sum(
  planItems.kind === 'fixed_expense' && status !== 'skipped',
  plan
);
const variablePlanCents = sum(plan.variableBudgets.plannedCents);

const planExpenseCents = fixedPlanCents + variablePlanCents;
const varianceCents = monthExpenseCents - planExpenseCents;
const variancePct = planExpenseCents > 0 ? varianceCents / planExpenseCents : null;
const executionPct = planExpenseCents > 0 ? monthExpenseCents / planExpenseCents : null;
```

- Desvío positivo en gastos = sobregiro.
- Un gasto en categoría fija no vinculado a un `PlanItem` cuenta como fijo no planificado.
- Una categoría sin presupuesto cuenta con plan 0 y desvío positivo.

### 8.4 Métricas

```ts
const savingsRate =
  monthIncomeCents > 0
    ? (monthIncomeCents - monthExpenseCents) / monthIncomeCents
    : null;

const fixedCostRatio =
  monthIncomeCents > 0 ? fixedExpenseCents / monthIncomeCents : null;

const goalFundingRate =
  monthIncomeCents > 0 ? monthlyGoalContribCents / monthIncomeCents : null;
```

- **Tasa de ahorro:** ingresos menos gastos sobre ingresos. Los aportes a metas no son gasto.
- **Costo fijo:** gastos fijos sobre ingresos.
- **Financiamiento de metas:** aportes netos del mes sobre ingresos.
- Porcentajes con un decimal; `null` se muestra como “—”, nunca como 0.

### 8.5 Presupuesto mensual

El plan se compone de:

1. **Ingresos previstos:** `PlanItem` de tipo `expected_income`. Se crean desde recurrentes o manualmente.
2. **Gastos fijos:** `PlanItem` de tipo `fixed_expense`. Se reservan desde el día 1.
3. **Variables:** `variableBudgets` por categoría.
4. **Ahorro planificado:** `savingsTargetCents`.

Totales:

```ts
const incomePlanCents = sum(expected_income, plan);
const incomeActualCents = sum(income, month);
const fixedActualCents = fixedExpenseCents;
const variableActualCents = variableExpenseCents;
const savingsActualCents = monthlyGoalContribCents;
```

### 8.6 Fijos y recurrentes

- Un gasto fijo se reserva como `pending` al crear el plan del mes.
- Al marcar **Pagar**, se abre un diálogo con monto (por defecto el planificado), fecha (por defecto el vencimiento o hoy) y nota. Se crea una transacción `expense` con `planItemId`, `source = 'recurring'` y se marca el item como `settled`.
- La transacción vinculada hereda el tipo y la categoría del `PlanItem`; solo se editan monto, fecha, descripción y nota. No se puede cambiar de mes.
- Si el monto real difiere del planificado, el desvío queda visible.
- **Omitir** marca el item como `skipped` y deja de reservar presupuesto.
- Un ingreso previsto se marca **Recibido** con el mismo patrón; crea una transacción `income`.
- No hay auto-posteo: un fijo no se registra hasta que el usuario confirma el pago.
- Si un mes anterior tiene fijos pendientes, Inicio muestra “Atrasados”. No se arrastran automáticamente al mes actual.

### 8.7 Metas

- **Aportar:** transacción `goal_deposit`, dirección `out`; baja el disponible y sube la meta.
- **Retirar:** transacción `goal_withdraw`, dirección `in`; sube el disponible y baja la meta.
- Validaciones:
  - monto > 0;
  - retiro ≤ saldo de la meta;
  - fecha no futura y no perteneciente a un mes cerrado.
- Si un aporte deja `spendableCents` negativo, se advierte y se pide confirmación; no se bloquea.
- Progreso = saldo / objetivo.
- Ritmo mensual = promedio de aportes netos de los últimos 3 meses con actividad.
- Fecha estimada = hoy + (objetivo − saldo) / ritmo, si el ritmo es > 0. Si no, “Sin ritmo”.

### 8.8 Cierre de mes

- Requisitos para cerrar:
  - el mes ya terminó (no se cierra el mes en curso);
  - no hay `PlanItem` pendientes (se pueden liquidar u omitir);
  - el usuario confirma.
- Al cerrar:
  - `status = 'closed'`, `closedAt`, `snapshot` con los totales del mes;
  - se bloquea cualquier alta/edición/borrado con fecha en ese mes;
  - se escribe auditoría `close_month`.
- **Reabrir** exige confirmación, deja `status = 'active'`, conserva el snapshot anterior hasta el próximo cierre y escribe auditoría `reopen_month`.
- Los reportes de meses cerrados usan el snapshot; los meses abiertos se calculan en vivo.

---

## 9. Flujos de usuario

### 9.1 Onboarding

1. **Bienvenida:** propuesta de valor y elección “Empezar de cero” o “Probar con datos de ejemplo”.
2. **Perfil:** nombre (opcional) y saldo inicial (a favor o deuda). Se crea una transacción `opening`.
3. **Ingreso:** monto, descripción (“Sueldo”) y día del mes. Crea una `RecurringRule` `expected_income`. Se puede omitir.
4. **Gastos fijos:** hasta 5 filas con nombre, monto, día y categoría. Crean `RecurringRule` `fixed_expense`. Se puede omitir.
5. **Primera meta:** nombre, objetivo y fecha opcional. Se puede omitir.
6. **Listo:** checklist de próximos pasos y acceso a Inicio.

Cada paso persiste su entidad y `onboardingStep`; si se recarga, se retoma. Al finalizar se setea `onboardingCompletedAt` y se crea el plan del mes actual con sus items recurrentes.

**Datos de ejemplo:** 3 meses de movimientos, 2 metas, 3 fijos y presupuestos variables. Se identifican como ejemplo y se pueden borrar desde Ajustes.

### 9.2 Inicio

- Header con selector de mes, saludo y acceso a Ajustes.
- KPIs: saldo real, disponible para gastar (con desglose), ejecutado del mes, tasa de ahorro.
- Barra apilada del plan: fijos pagados, fijos pendientes, variable ejecutado, ahorro aportado.
- Próximos compromisos (5) con vencimiento y acción Pagar.
- Metas activas (2) con progreso compacto.
- Últimos 5 movimientos.
- Checklist de onboarding si aún no hay datos.
- Banner offline y recordatorio de backup si corresponde.
- FAB de alta rápida.

### 9.3 Movimientos

- Toolbar: mes, búsqueda, filtros (tipo, categoría, origen), exportar.
- Resumen: ingresos, gastos, ahorro neto, saldo final del mes.
- Escritorio: tabla con fecha, descripción, categoría, origen, monto, saldo corrido y acciones.
- Móvil: lista agrupada por fecha, con monto y categoría.
- El saldo corrido parte del saldo acumulado antes del mes y suma cada movimiento.
- Click en fila abre el drawer de edición; menú con Editar, Duplicar, Eliminar.
- Eliminar muestra toast con **Deshacer** durante 5 segundos.
- Alta/edición: tipo Gasto/Ingreso, monto, fecha (hoy por defecto), categoría, descripción, nota. Enter guarda; Esc cierra.
- Vacío: estado con CTA para crear el primer movimiento.

### 9.4 Presupuesto

- Header: mes, “Copiar mes anterior”, “Cerrar mes” o “Reabrir mes”.
- Resumen: plan de gastos, ejecutado, desvío, ahorro planificado vs aportado, disponible para gastar.
- **Ingresos:** previstos vs recibidos; agregar ingreso de este mes o recurrente.
- **Fijos:** lista con vencimiento, plan, estado, pagado y acciones Pagar/Omitir. Agregar fijo recurrente o solo de este mes.
- **Variables:** filas por categoría con presupuesto editable, ejecutado, restante y barra. Agregar categoría al presupuesto.
- **Ahorro:** objetivo editable, aportado, restante y vínculo a Metas.
- Tabla de totales: plan vs real vs desvío, por fijos, variables, ingresos y ahorro.
- Copiar mes anterior copia presupuestos variables y objetivo de ahorro; los fijos e ingresos se regeneran desde recurrentes.
- Mes cerrado: banner de solo lectura y acción Reabrir.

### 9.5 Reportes

- Selector de mes o año.
- KPIs: ingresos, gastos, ahorro neto, tasa de ahorro, costo fijo, ejecución.
- Gráfico de tendencia de 12 meses (ingresos, gastos, tasa de ahorro).
- Fijos vs variables (barras apiladas).
- Categorías (barras horizontales, top 8 + Otros).
- Tabla de presupuesto vs real por categoría con desvío y %.
- Tabla anual: mes, ingresos, gastos, ahorro, tasa.
- Exportar CSV del período y de la tabla anual.
- Impresión limpia (`@media print`) sin navegación.

### 9.6 Metas

- Resumen: ahorrado total, objetivo total, progreso global.
- Cards por meta: nombre, saldo/objetivo, barra, ritmo, fecha estimada, acciones Aportar/Retirar.
- Detalle: historial de aportes y retiros, editar, archivar.
- Nueva meta: nombre, objetivo, fecha opcional.
- Aportar/Retirar: monto, fecha, nota. Validaciones de saldo y advertencia si el disponible queda negativo.
- Meta cumplida: badge y opción de archivar; si tiene saldo, se ofrece retirarlo a disponible en la misma acción. El historial se conserva.

### 9.7 Ajustes

- **Perfil:** nombre.
- **Preferencias:** tema (sistema/claro/oscuro), locale, moneda PEN (solo lectura).
- **Categorías:** listar, crear, editar, archivar; fijos/variables/ingresos.
- **Recurrentes:** listar, crear, editar, pausar.
- **Datos:** exportar JSON, exportar CSV, importar JSON, uso de almacenamiento, persistencia, último backup.
- **PWA:** instalar, estado de instalación, actualizar.
- **Auditoría:** últimos 200 eventos con búsqueda; exportar.
- **Acerca de:** versión, esquema, privacidad.
- **Zona peligrosa:** borrar todos los datos (confirmación escrita “BORRAR”), con exportación forzada previa.

### 9.8 Importación

1. **Archivo:** arrastrar o elegir `.csv`, `.txt` o `.xlsx` (máximo 10 MB).
2. **Mapeo:** fecha, descripción, monto (una columna con signo) o débito/crédito; categoría y ID externo opcionales. Formato de fecha y separador decimal automáticos con opción manual.
3. **Vista previa:** primeras 10 filas normalizadas, conteo de válidas, inválidas y duplicadas, errores por fila.
4. **Confirmar:** importación local por lotes; barra de progreso.
5. **Resumen:** importados, omitidos, errores; “Ver movimientos” y “Deshacer importación”.

- Codificación: UTF-8 con fallback a Windows-1252.
- Separadores: coma, punto y coma o tabulación.
- Duplicados: hash de fecha + monto + descripción normalizada + ID externo. Por defecto se omiten; se puede importar igualmente.
- Filas inválidas no se importan; se muestran con número de fila y motivo.
- Las categorías desconocidas quedan sin categoría y se avisa con un acceso directo al filtro.

---

## 10. Sistema visual

### 10.1 Dirección

Se evoluciona la identidad del prototipo: verde profundo, dorado y off-white, con una ejecución más precisa y densa. El frasco deja de ser el héroe y pasa a ser un acento de marca y un indicador de progreso. La sensación debe ser **herramienta financiera seria**, no app de juego.

### 10.2 Tipografía

| Uso | Fuente | Pesos |
|---|---|---|
| Títulos y KPIs | Bricolage Grotesque Variable | 600, 800 |
| UI y texto | DM Sans Variable | 400, 500, 700 |
| Cifras tabulares | DM Mono | 400, 500 |

- Fuentes autohospedadas con Fontsource; sin requests a Google en runtime.
- Cifras con `font-variant-numeric: tabular-nums`; montos alineados a la derecha.
- Escala: 12, 13, 14, 16, 18, 20, 24, 30, 38, 48 px.
- Interlineado: 1.2 en display, 1.45 en cuerpo.

### 10.3 Tokens de color

**Claro**

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#F3F5F2` | Fondo |
| `--surface` | `#FFFFFF` | Cards, tablas |
| `--surface-2` | `#E9EEE9` | Filas alternas, inputs |
| `--ink` | `#102A24` | Texto principal |
| `--ink-muted` | `#536A63` | Texto secundario |
| `--line` | `#D8E0DA` | Bordes |
| `--primary` | `#14624F` | Acción, positivo |
| `--primary-ink` | `#FFFFFF` | Texto sobre primary |
| `--gold` | `#D99A1F` | Ahorro, metas |
| `--gold-ink` | `#8A5A00` | Texto dorado accesible |
| `--red` | `#B23A48` | Negativo, sobregiro |
| `--red-soft` | `#F7E6E8` | Fondo de alerta |
| `--focus` | `#14624F` | Foco |

**Oscuro**

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0B1512` | Fondo |
| `--surface` | `#12211C` | Cards, tablas |
| `--surface-2` | `#182B24` | Filas alternas, inputs |
| `--ink` | `#E8F1EC` | Texto principal |
| `--ink-muted` | `#9AAEA6` | Texto secundario |
| `--line` | `#263A33` | Bordes |
| `--primary` | `#5ACCA9` | Acción, positivo |
| `--primary-ink` | `#062019` | Texto sobre primary |
| `--gold` | `#E8B54A` | Ahorro, metas |
| `--gold-ink` | `#E8B54A` | Texto dorado accesible |
| `--red` | `#F07E92` | Negativo, sobregiro |
| `--red-soft` | `#3A1D24` | Fondo de alerta |
| `--focus` | `#5ACCA9` | Foco |

Todos los pares de texto cumplen AA (≥ 4.5:1) en sus superficies; los verificados incluyen `ink-muted` 5.82:1 en claro y 7.13:1 en oscuro, `red` 5.85:1 en claro y 6.43:1 en oscuro. `--gold` se usa para rellenos (barras, frasco); el texto dorado usa `--gold-ink`.

### 10.4 Layout y densidad

- Base de 4 px; gutters de 16 px en móvil y 24–32 px en escritorio.
- Sidebar 240 px; contenido máximo 1200 px.
- Header 56 px móvil / 64 px escritorio.
- Barra inferior 64 px + safe area.
- Filas de tabla 44 px; targets táctiles mínimos 44×44.
- Cards con radio 12 px; modales 16 px; inputs y botones 10 px.
- Bordes de 1 px; sombras solo en overlays.
- Breakpoints: 640, 768, 1024, 1280.
- Tablas en escritorio; cards en móvil.
- El frasco se usa en onboarding, metas y estados vacíos; en Inicio es compacto.

### 10.5 Componentes

- Botones: primario, secundario, ghost, peligro; tamaños 36/44.
- Inputs con prefijo `S/`, separador decimal y mensaje de error.
- Selector de mes con flechas y calendario.
- KPI card con etiqueta, valor, delta opcional y tooltip de fórmula.
- Barra de progreso con umbrales: normal, advertencia (> 80%), exceso (> 100%).
- Chip de desvío: positivo/negativo/neutro con texto, no solo color.
- Tabla de datos con header sticky, caption y columnas numéricas alineadas a la derecha.
- Dialog y drawer accesibles (Radix), con foco atrapado y retorno.
- Toast (Sonner) con acción Deshacer.
- Tabs/segmented control.
- Estado vacío con título, explicación y CTA.
- Gráficos con toggle “Ver tabla” y resumen textual.
- Jarra SVG compacta para metas.

### 10.6 Movimiento

- 150 ms en hover y foco; 200 ms en entradas; 120 ms en salidas.
- Curva `ease-out`; sin rebotes ni confeti.
- Respetar `prefers-reduced-motion`.
- Nada de animaciones que oculten cambios de saldo.

### 10.7 Accesibilidad

- WCAG 2.2 AA.
- Landmarks semánticos, skip link, títulos jerárquicos.
- Foco visible de 2 px con offset 2.
- Formularios con label, `aria-describedby` para errores y resumen de errores.
- Diálogos con foco atrapado y retorno al disparador.
- Tablas con `<caption>` y headers.
- Gráficos con tabla de datos y resumen textual.
- `aria-live` solo para toasts y actualizaciones, nunca para toda la vista.
- Color no es el único indicador: los estados llevan texto e icono.
- Atajos documentados en Ajustes; se ignoran cuando el foco está en un input, textarea o select.

### 10.8 Copy

- Tono profesional, directo y cálido en los vacíos.
- Términos: “Disponible para gastar”, “Comprometido”, “Pagado”, “Pendiente”, “Omitido”, “Ejecutado”, “Plan”, “Desvío”, “Tasa de ahorro”, “Costo fijo”.
- Tooltips con la fórmula exacta.
- Errores específicos: “El retiro supera el saldo de la meta”, no “Error”.
- Sin emojis, sin signos de exclamación en datos, sin culpa.

---

## 11. Arquitectura técnica

### 11.1 Stack definitivo

| Área | Elección |
|---|---|
| Build | Vite 8.3.5 + `@vitejs/plugin-react` 6.1.2 |
| UI | React 19.3.1 + TypeScript 7.0.2 |
| Routing | React Router 8.5.1 |
| Estilos | Tailwind CSS 4.3.3 + `@tailwindcss/vite` |
| Persistencia | Dexie 4.4.7 + `dexie-react-hooks` 4.4.0 |
| Validación | Zod 4.6.7 |
| Formularios | React Hook Form 7.91 + `@hookform/resolvers` 6.0.2 |
| Fechas | date-fns 4.4.0 |
| Gráficos | Recharts 3.10.1 |
| PWA | `vite-plugin-pwa` 2.0.0 + Workbox 7.4.1 |
| Componentes | Radix UI 1.8.1 + Lucide 1.64 + Sonner 2.0.8 |
| Fuentes | `@fontsource-variable/bricolage-grotesque` 5.3 + `@fontsource-variable/dm-sans` 5.3 + `@fontsource/dm-mono` 5.3 |
| Importación | Papa Parse 5.7 + `read-excel-file` 9.3.14 |
| Tests | Vitest 5 + Testing Library 16.3 + jest-dom 7 + user-event 14.6 + jest-axe 11 + fast-check 4.10 + Playwright 1.64.1 + axe 4.14 |
| Calidad | ESLint 10 + Prettier 3.9 |
| Gestor | **pnpm 12.15** |
| Node | 24.x |

### 11.2 Estructura de carpetas

```text
src/
  app/
    router.tsx
    providers.tsx
    App.tsx
  components/
    ui/                 # Button, Input, Dialog, Table, Toast...
    layout/             # Shell, Sidebar, BottomNav, Header
    charts/             # wrappers de Recharts + tabla accesible
    feedback/           # EmptyState, ErrorState, OfflineBanner
  features/
    onboarding/
    dashboard/
    transactions/
    budget/
    goals/
    reports/
    import/
    settings/
    categories/
    recurring/
  domain/
    money.ts
    dates.ts
    budget.ts
    goals.ts
    recurring.ts
    reports.ts
    import.ts
    backup.ts
  db/
    db.ts
    schema.ts
    repositories/
      transactions.ts
      plans.ts
      goals.ts
      categories.ts
      recurring.ts
      settings.ts
      audit.ts
      imports.ts
  hooks/
  lib/
    ids.ts
    format.ts
    csv.ts
    crypto.ts
  styles/
    tokens.css
    globals.css
  test/
  e2e/
  scripts/
    generate-icons.ts
  public/
```

### 11.3 Capas

1. **Dominio puro:** funciones sin React ni Dexie. Entran datos, salen resultados. Se testea con Vitest.
2. **Persistencia:** repositorios Dexie. Toda escritura pasa por aquí; validan Zod, aplican concurrencia optimista y escriben auditoría en la misma transacción.
3. **Aplicación:** hooks con `useLiveQuery`, casos de uso y estados de carga/error.
4. **UI:** rutas, componentes, formularios y accesibilidad. No accede a IndexedDB directamente.

### 11.4 Persistencia y migraciones

- Dexie con versiones incrementales y funciones `upgrade`.
- `meta.schemaVersion` refleja la versión actual.
- Cada migración tiene test con `fake-indexeddb`.
- El backup JSON incluye `schemaVersion`; al importar se valida y, si es anterior, se migra antes de reemplazar.
- Concurrencia optimista: `update` y `delete` reciben `expectedUpdatedAt`; si no coincide, lanzan `ConflictError` y la UI avisa.

### 11.5 Estado

- Dexie es la fuente de verdad; `useLiveQuery` alimenta las pantallas.
- Sin Redux ni Zustand para datos financieros.
- Contextos solo para tema, settings y toasts.
- Estado de UI local; filtros y mes en la URL.
- Formularios con React Hook Form + Zod.

### 11.6 PWA y offline

- `vite-plugin-pwa` con `registerType: 'prompt'`.
- Manifest: nombre, iconos 192/512/maskable/apple-touch, `display: standalone`, `theme_color`, `background_color`, shortcuts “Nuevo movimiento” y “Presupuesto”.
- Service worker: precache del shell; `navigateFallback: '/index.html'`; `cleanupOutdatedCaches`; sin caché de datos (viven en IndexedDB).
- Actualización: banner “Nueva versión disponible · Actualizar”; no se fuerza mientras hay un diálogo abierto.
- Offline: banner cuando `navigator.onLine === false`; la app sigue operativa.
- Tema sin flash: el tema elegido se refleja en `localStorage` para aplicarlo antes del primer paint; la fuente de verdad sigue en Settings.
- Persistencia: `navigator.storage.persist()` al terminar el onboarding; estado visible en Ajustes.
- iOS: `apple-touch-icon`, `apple-mobile-web-app-capable`, safe areas e instrucciones de instalación.
- Recordatorio de backup: si nunca se exportó y pasaron 30 días desde el onboarding, o si el último backup tiene más de 30 días. Se muestra como banner descartable por 7 días.

### 11.7 Rendimiento

- Rutas lazy; Recharts solo en `/reportes`.
- Presupuesto de JS inicial: ≤ 250 KB gzip sin gráficos; gráficos ≤ 120 KB adicionales.
- Fuentes subset y `font-display: swap`.
- Tablas largas: paginación por mes y virtualización solo si hace falta.
- Consultas Dexie con índices por fecha, tipo y categoría.
- Lighthouse móvil: Performance ≥ 85, Accessibility 100, PWA instalable.

### 11.8 Seguridad y privacidad

- Sin backend, sin analytics, sin telemetría, sin fuentes externas en runtime.
- Datos en IndexedDB del dispositivo, sin cifrado en reposo (limitación documentada).
- La app recomienda bloqueo del sistema y backups periódicos.
- Importación y exportación 100% locales.
- No se ejecuta HTML de archivos importados; todo se escapa.

### 11.9 Despliegue

- Build estático: `pnpm build` genera `dist/`.
- Hosting: Vercel estático (o Cloudflare Pages / Netlify) con HTTPS. Sin funciones serverless.
- SPA rewrite: todas las rutas que no sean assets se resuelven a `/index.html`.
  - Vercel: `vercel.json` con `rewrites`.
  - Cloudflare Pages / Netlify: `_redirects` con `/* /index.html 200`.
- `dist/` se puede servir desde cualquier hosting estático; no hay variables de entorno ni secretos.
- El service worker y la instalación PWA requieren HTTPS (o `localhost`).
- CI publica el artefacto `dist/`; el deploy queda como paso manual o automático en la rama principal.
- Repositorio Git con Conventional Commits y CI en GitHub Actions.

---

## 12. Importación, exportación y backup

### 12.1 Importación CSV/XLSX

- Formatos: `.csv`, `.txt`, `.xlsx`; máximo 10 MB.
- CSV con Papa Parse; XLSX con `read-excel-file`.
- Codificación UTF-8 con fallback Windows-1252.
- Mapeo de columnas: fecha, descripción, monto con signo o débito/crédito, categoría e ID externo.
- Detección automática de formato de fecha y separador decimal, con override.
- Normalización: fecha ISO, monto en céntimos, descripción recortada, tipo según signo.
- Deduplicación: `SHA-256(date | amountCents | descriptionNormalized | externalId)`.
- Vista previa con válidas, inválidas y duplicadas; errores por fila.
- Importación por lotes; `ImportBatch` para deshacer todo el lote.
- Categorías desconocidas: se dejan sin categoría y se avisa.

### 12.2 Exportación CSV

- Transacciones del período.
- Presupuesto vs real.
- Resumen anual.
- Metas y aportes.
- Codificación UTF-8 con BOM, delimitador `;` para compatibilidad con Excel en español; comillas según RFC 4180.
- Nombres: `alcancia-movimientos-2026-10.csv`, etc.

### 12.3 Backup JSON

```json
{
  "schemaVersion": 1,
  "appVersion": "1.0.0",
  "exportedAt": "2026-10-29T12:00:00.000Z",
  "data": {
    "settings": {},
    "categories": [],
    "transactions": [],
    "plans": [],
    "planItems": [],
    "recurringRules": [],
    "goals": [],
    "importBatches": [],
    "auditLog": []
  }
}
```

- La importación **reemplaza** todos los datos; no fusiona. Antes de reemplazar se descarga automáticamente un backup del estado actual.
- Validación Zod completa y migración si el esquema es anterior.
- Confirmación escrita “REEMPLAZAR”.
- Al terminar, recarga la app y registra auditoría `backup_import`.

---

## 13. Manejo de errores y casos borde

| Caso | Comportamiento |
|---|---|
| IndexedDB bloqueado o no disponible | Pantalla explicativa; la app no opera; opción de reintentar y de exportar si es posible. |
| Cuota de almacenamiento excedida | Error claro, sugerencia de exportar y limpiar; nunca se pierde el dato silenciosamente. |
| Migración fallida | Se conserva la base anterior; pantalla de recuperación con exportación y reset confirmado. |
| Importación con filas inválidas | Se importan solo las válidas; resumen con filas y motivos. |
| Duplicados | Se omiten por defecto; opción de importar igualmente. |
| Fecha futura en movimiento | Rechazada; se sugiere crear un compromiso en el presupuesto. |
| Mes cerrado | Alta/edición/borrado bloqueados; se ofrece reabrir. |
| Importación con filas de un mes cerrado | Esas filas se rechazan con motivo; el resto se puede importar. |
| Borrar una transacción vinculada a un fijo/ingreso previsto | El `PlanItem` vuelve a `pending` y se libera la reserva. |
| Mover una transacción vinculada a otro mes | Bloqueado; hay que borrarla y reabrir el item. |
| Retiro mayor al saldo de la meta | Rechazado con mensaje específico. |
| Archivar una meta con saldo | Se ofrece retirar el saldo a disponible y archivar en una sola acción; no se oculta dinero. |
| Aporte que deja disponible negativo | Advertencia y confirmación; se permite. |
| Categoría con movimientos | Solo se archiva, no se elimina. |
| Cambiar el grupo de una categoría usada | Bloqueado; se crea una categoría nueva. |
| Edición concurrente en otra pestaña | `ConflictError`; mensaje “Este registro cambió en otra pestaña” y recarga del dato. |
| Día 31 en mes corto | El vencimiento se ajusta al último día del mes. |
| Año bisiesto | Tests específicos para febrero. |
| Monto con coma o punto decimal | Se normaliza antes de convertir a céntimos. |
| Backup de esquema anterior | Se migra antes de reemplazar. |
| Service worker viejo | Banner de actualización; `cleanupOutdatedCaches`. |
| PWA en iOS sin instalación | Instrucciones en Ajustes; la app funciona igual en navegador. |

---

## 14. Testing y calidad

### 14.1 Unitarios (Vitest)

- `money`: parseo, formato, coma/punto, límites, negativos, redondeo.
- `dates`: month keys, fin de mes, año bisiesto, “hoy” en Lima.
- `budget`: disponible, spendable, fijos/variables, desvío, tasas, pendientes.
- `recurring`: generación idempotente, rango, pausa, día 31, mes copiado.
- `goals`: aportes, retiros, saldo, progreso, ritmo, fecha estimada, sobre-retiro.
- `import`: CSV, XLSX, mapeo, fechas, decimales, dedupe, inválidas, undo.
- `backup`: round-trip, validación, migración.
- `close month`: snapshot, bloqueo, reapertura.
- Propiedades con `fast-check` para invariantes de dinero y meses.

### 14.2 Integración

- Repositorios Dexie con `fake-indexeddb`: CRUD, soft delete, auditoría, concurrencia, migraciones.
- Componentes con Testing Library: formularios, tablas, diálogos, estados vacíos, errores.
- Accesibilidad de componentes con `jest-axe`.

### 14.3 E2E (Playwright)

- Onboarding completo y con datos de ejemplo.
- Alta rápida → edición → borrado → deshacer.
- Pago de fijo → verificación de presupuesto y saldo.
- Cierre y reapertura de mes.
- Aporte y retiro de meta → verificación de disponible y meta.
- Importación CSV → dedupe → undo.
- Exportar JSON → reset → importar → datos restaurados.
- Offline: cargar, desconectar, navegar, agregar, recargar, persistencia.
- PWA: manifest, service worker registrado, instalación.
- axe en Inicio, Movimientos, Presupuesto, Reportes y Metas.

### 14.4 Comandos y CI

```bash
pnpm dev
pnpm build
pnpm preview
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm test:e2e
pnpm test:a11y
```

- GitHub Actions: instalar con pnpm, cachear store, lint, typecheck, test, build y E2E.
- Cobertura: dominio ≥ 90%; global ≥ 80%.
- Bundle budget verificado en CI.
- Sin `console.error` en producción.

---

## 15. Entrega por hitos

### Hito 0 — Fundación y PWA

Scaffold con pnpm, Vite, React, TypeScript, Tailwind, router, tokens, layout responsive, Dexie inicial, CI, iconos, manifest y service worker. Validar instalación y offline con un build real.
**Salida:** `pnpm build` pasa; la app se instala y recarga offline.

### Hito 1 — Onboarding y ajustes

Settings, categorías por defecto, saldo inicial, ingreso, fijos, primera meta, datos de ejemplo, tema y navegación.
**Salida:** un usuario nuevo completa el onboarding y llega a Inicio con datos coherentes.

### Hito 2 — Movimientos

Repositorios, alta rápida, listado, filtros, búsqueda, saldo corrido, edición, borrado con undo y auditoría.
**Salida:** CRUD completo con tests y sin pérdida de datos.

### Hito 3 — Presupuesto

Plan mensual, generación de recurrentes, fijos pendientes/pagados/omitidos, variables, ahorro, copiar mes, cierre y reapertura.
**Salida:** plan vs real correcto; un fijo pagado no se duplica.

### Hito 4 — Metas y reportes

Aportes/retiros reales, progreso, ritmo, fecha estimada, reportes mensuales/anuales, gráficos y export CSV.
**Salida:** saldo, meta y reportes reconcilian.

### Hito 5 — Importación y backup

Importación CSV/XLSX con mapeo, preview, dedupe y undo; export JSON/CSV; restauración; persistencia y recordatorio.
**Salida:** importar un extracto real y restaurar un backup sin pérdida.

### Hito 6 — QA y lanzamiento

Unitarios, integración, E2E, axe, Lighthouse, bundle budget, documentación y deploy estático.
**Salida:** todos los gates verdes; app desplegada y verificada en móvil y escritorio.

---

## 16. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| Desalojo de IndexedDB | `navigator.storage.persist()`, recordatorio de backup, exportación fácil. |
| Recharts pesa demasiado | Carga lazy solo en Reportes; si excede el presupuesto, SVG propio. |
| Variabilidad de CSV bancarios | Mapeo manual, preview, detección de formatos, dedupe y undo por lote. |
| Pérdida de datos al importar/reset | Backup automático previo, confirmación escrita y auditoría. |
| Service worker con caché viejo | `registerType: 'prompt'`, `cleanupOutdatedCaches`, aviso de actualización. |
| Complejidad del cierre de mes | Bloqueo simple, snapshot y reapertura auditada. |
| Fechas y zonas horarias | Fechas ISO sin hora, “hoy” en `America/Lima`, tests de borde. |
| Precisión monetaria | Céntimos enteros, branded type, property tests. |
| Accesibilidad de gráficos | Tabla de datos y resumen textual siempre disponibles. |
| Scope creep | No objetivos explícitos; hábitos, push, sync y multi-moneda quedan fuera. |

---

## 17. Decisiones y no objetivos

### Decisiones

1. **Vite + React** en lugar de Next.js: la app es 100% cliente y no necesita SSR, API routes ni SEO.
2. **Local-first sin backend**: privacidad, offline y costo cero.
3. **Un solo bolsillo** más metas; sin cuentas múltiples.
4. **Fijos pendientes, no auto-posteados**: el usuario confirma el pago.
5. **Un plan mensual** con ingresos previstos, fijos, variables y ahorro.
6. **Cierre de mes** con bloqueo y snapshot.
7. **JSON restore reemplaza**, no fusiona.
8. **Multi-moneda solo en el esquema**, no en la UI.
9. **Sin gamificación**: se elimina Aprender de la v1.
10. **Sin cifrado en reposo** en v1; se documenta la limitación.

### No objetivos

Cuentas, nube, sync, push, hábitos, split/tags/adjuntos, recurrentes no mensuales, PDF, inversiones, impuestos, facturación, P&L de negocio, cifrado con contraseña.

---

## 18. Definición de terminado

La v1 está terminada cuando:

1. Un usuario nuevo puede completar el onboarding y registrar su primer gasto en menos de 10 segundos.
2. Saldo, disponible, presupuesto, fijos, metas y reportes reconcilian entre sí.
3. Un fijo pagado no se cuenta dos veces.
4. Un aporte a meta baja el disponible y sube la meta; un retiro hace lo inverso.
5. Los meses cerrados son inmutables y sus reportes coinciden con el snapshot.
6. La app funciona offline, se instala como PWA y sobrevive a una recarga.
7. Exportar e importar un backup JSON restaura todos los datos.
8. Importar un CSV real detecta duplicados y permite deshacer el lote.
9. Los tests unitarios, de integración y E2E pasan; accesibilidad AA y Lighthouse cumplen.
10. El build de producción se despliega en un hosting estático con HTTPS y queda usable en móvil y escritorio.

---

## Anexo A — Esquema Dexie

```ts
db.version(1).stores({
  settings: 'id',
  categories: 'id, kind, group, archived, order',
  transactions:
    'id, date, type, categoryId, goalId, planItemId, importBatchId, dedupeHash, deleted, updatedAt, [type+date], [categoryId+date]',
  plans: 'id, year, month, status',
  planItems: 'id, planId, kind, status, dueDate, recurringRuleId, [planId+recurringRuleId]',
  recurringRules: 'id, kind, active, startMonth',
  goals: 'id, status, createdAt',
  importBatches: 'id, importedAt, status',
  auditLog: 'id, at, entity, entityId',
  meta: 'key',
});
```

- `archived` y `active` se guardan como `0 | 1` porque IndexedDB no indexa booleanos.
- `deleted` también es `0 | 1`; `deletedAt` conserva la fecha.
- Los índices compuestos permiten filtrar por tipo y mes sin recorrer toda la tabla.

## Anexo B — Ejemplo de cálculo

Mes de octubre de 2026:

- Saldo inicial: S/ 1,000.00
- Ingreso recibido: S/ 2,200.00
- Alquiler pagado: S/ 380.00
- Internet pendiente: S/ 120.00
- Comida: S/ 250.00
- Aporte a meta: S/ 300.00
- Objetivo de ahorro: S/ 400.00

```text
available = 1000 + 2200 - 380 - 250 - 300 = 2270.00
pendingFixed = 120.00
monthlyGoalContrib = 300.00
remainingSavings = 400 - 300 = 100.00
spendable = 2270 - 120 - 100 = 2050.00
monthExpenses = 380 + 250 = 630.00
fixedExpenses = 380.00
variableExpenses = 250.00
```

El aporte de S/ 300 no es gasto: baja el disponible y sube la meta. El internet pendiente reserva S/ 120 y el ahorro restante reserva S/ 100.

## Anexo C — CSV de exportación

- Delimitador `,`.
- UTF-8 con BOM.
- Fechas `YYYY-MM-DD`.
- Montos con dos decimales y punto decimal (`1234.56`), sin separador de miles.
- Cabeceras en español.
- Los campos con comas, comillas o saltos de línea se escapan según RFC 4180.

Ejemplo de movimientos:

```csv
fecha,descripcion,categoria,tipo,monto,moneda,origen,nota
2026-10-28,Cine,Ocio,gasto,60.00,PEN,manual,
2026-10-23,Pago del mes,Sueldo,ingreso,2200.00,PEN,manual,
```

## Anexo D — Categorías por defecto

| Nombre | Tipo | Grupo |
|---|---|---|
| Vivienda | Gasto | Fijo |
| Servicios | Gasto | Fijo |
| Suscripciones | Gasto | Fijo |
| Comida | Gasto | Variable |
| Transporte | Gasto | Variable |
| Salud | Gasto | Variable |
| Ocio | Gasto | Variable |
| Educación | Gasto | Variable |
| Otros | Gasto | Variable |
| Sueldo | Ingreso | Ingreso |
| Extra | Ingreso | Ingreso |
| Inversiones | Ingreso | Ingreso |
| Otros ingresos | Ingreso | Ingreso |
