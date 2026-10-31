# Recordatorios de pagos fijos — Diseño

**Fecha:** 2026-10-30
**Estado:** aprobado en conversación, pendiente revisión del spec
**Alcance:** bandeja in-app de pagos fijos vencidos, de hoy y próximos; creación de recordatorios puntuales; sin backend ni push.

## Problema

Hoy los pagos fijos pendientes solo se ven entrando a Presupuesto. No existe una señal global que avise que un compromiso venció o vence hoy, y el usuario puede olvidarse. La app ya modela esos compromisos como `PlanItem` con `dueDate`, pero no los surface fuera de la pantalla de Presupuesto ni permite posponerlos u ocultarlos.

## Objetivo

- Agregar una campana global en el header con un badge de pagos vencidos o que vencen hoy.
- Mostrar un panel con tres grupos: vencidos/de hoy, próximos 7 días y pospuestos/ocultos.
- Permitir que el usuario decida qué hacer con cada recordatorio: pagar, recordar mañana, posponer, ocultar, restaurar o deshacer.
- Permitir crear un recordatorio puntual con fecha, sin regla recurrente.
- Mantener todo local, sin backend, sin permisos del navegador y sin notificaciones push.

## No objetivos

- Transacciones con fecha futura o “movimientos programados”.
- Web Push, notificaciones del sistema operativo o permisos del navegador.
- Historial de notificaciones, estado “leído” o centro de actividad genérico.
- Recordatorios de ingresos esperados, metas, presupuesto o backup.
- Edición o eliminación de recordatorios desde el panel; eso se hace en Presupuesto.
- Sincronización entre dispositivos.

## Decisiones

1. **Fuente de verdad financiera:** `PlanItem`. Un recordatorio no es una transacción; es una vista sobre un compromiso pendiente.
2. **Estado del usuario:** tabla nueva `reminderStates`, separada de `PlanItem`, para no mezclar datos financieros con preferencias de visualización.
3. **Badge:** cuenta solo vencidos y de hoy. Los próximos son contexto y no inflan el badge.
4. **Próximos:** ventana de 7 días. Más allá de eso, el compromiso vive en Presupuesto.
5. **Ocultar:** por ocurrencia. Ocultar el alquiler de octubre no afecta el de noviembre.
6. **Pospuesto:** vuelve a aparecer en la fecha elegida; si el vencimiento original ya pasó, vuelve como vencido.
7. **Crear:** solo gastos fijos (`fixed_expense`), con fecha desde el inicio del mes actual en adelante.
8. **Futuro:** se modela con `PlanItem`, nunca con una transacción futura.
9. **Pago anticipado:** permitido. La fecha de la transacción por defecto es hoy, no el vencimiento futuro.
10. **Backup:** sube a esquema 2; los respaldos v1 se migran agregando `reminderStates: []`.

## Modelo de datos

### `ReminderState`

```ts
interface ReminderState {
  planItemId: UUID; // clave primaria
  snoozedUntil?: ISODate; // oculto mientras today < snoozedUntil
  hiddenAt?: ISOTimestamp; // oculto hasta que el usuario lo restaure
  updatedAt: ISOTimestamp;
}
```

Semántica:

- `snoozedUntil` es una fecha de calendario. Si es mañana, el recordatorio no aparece hoy y reaparece mañana.
- `hiddenAt` no expira. Solo se limpia con “Restaurar”, al pagar/omitir el ítem o al restaurar un backup.
- Si ambos campos están presentes, `hiddenAt` gana: el ítem queda oculto hasta que se restaure.
- Una fila por `planItemId`. No hay estados por regla recurrente.
- Si el ítem se paga, se omite o se elimina, la fila se borra dentro de la misma transacción.
- Si un ítem se oculta y luego se edita en Presupuesto, sigue oculto. La restauración es explícita.

### `PlanItem` reutilizado

No cambia el esquema de `PlanItem`. Un recordatorio puntual crea una fila con:

- `kind: 'fixed_expense'`
- `status: 'pending'`
- `recurringRuleId: undefined`
- `planId` derivado de `toMonthKey(dueDate)`

### Backup

- `CURRENT_BACKUP_SCHEMA` pasa de `1` a `2`.
- `backupSchema` incluye `data.reminderStates`.
- `migrateBackup` acepta v1 y le agrega `reminderStates: []` antes de validar.
- `backupRepo.exportAll` incluye la tabla.
- `backupRepo.replaceAll` limpia y restaura la tabla.

## Reglas de dominio

Archivo nuevo: `src/domain/reminders.ts`, funciones puras.

Entradas: `planItems`, `plans`, `reminderStates`, `today` (por defecto `todayInLima()`), `upcomingDays = 7`.

Reglas:

- Solo `kind === 'fixed_expense'`.
- Solo `status === 'pending'`.
- Solo planes con `status !== 'closed'`.
- **Vencidos/de hoy:** `dueDate <= today`.
- **Próximos:** `today < dueDate <= addDays(today, 7)`.
- Excluir ítems con `hiddenAt` o con `today < snoozedUntil`.
- Incluir meses anteriores que sigan abiertos.
- Orden: `dueDate` ascendente; desempate por `amountCents` descendente.
- `badgeCount = due.length`.
- Etiquetas: “Vencido hace N días”, “Vence hoy”, “Vence mañana”, “Vence el DD/MM”.
- Los ítems pospuestos/ocultos se devuelven en una tercera lista para el toggle, con su estado (`snoozed` o `hidden`).

Salida:

```ts
interface ReminderBuckets {
  due: Reminder[];
  upcoming: Reminder[];
  hidden: Reminder[];
  badgeCount: number;
}
```

## Repositorios

### `reminderStateRepo`

Archivo nuevo: `src/db/repositories/reminder-states.ts`.

- `list(): Promise<ReminderState[]>`
- `snooze(planItemId: UUID, until: ISODate): Promise<void>`
- `hide(planItemId: UUID): Promise<void>`
- `clear(planItemId: UUID): Promise<void>` — borra la fila. Se usa para “Restaurar”, para “Deshacer” y para la limpieza al pagar u omitir.

Todas actualizan `updatedAt` con `nowTimestamp()`. No generan auditoría: son preferencias de UI, no datos financieros.

`settleItem` y `skipItem` incluyen `db.reminderStates` en su transacción y llaman a `clear` para que un ítem liquidado u omitido no conserve estado.

### `planRepo.createItem`

Nuevo método en `src/db/repositories/plans.ts`:

```ts
interface CreatePlanItemInput {
  name: string;
  amountCents: Cents;
  categoryId: UUID;
  dueDate: ISODate;
  note?: string;
}
```

Comportamiento:

- Valida nombre, monto > 0, categoría de gasto no archivada y fecha.
- Rechaza fechas anteriores al inicio del mes actual.
- Obtiene o crea el plan del mes derivado de `dueDate`.
- Rechaza meses cerrados.
- Inserta el `PlanItem` con `kind: 'fixed_expense'`, `status: 'pending'`.
- Registra auditoría `create` / `plan_item`.
- No ejecuta `ensureItems` del mes; eso sigue siendo responsabilidad de Presupuesto.

### `settleItem`

Ajuste menor: el `source` de la transacción se deriva de `item.recurringRuleId`.

- Con regla recurrente: `'recurring'`.
- Sin regla (recordatorio puntual): `'manual'`.

Esto evita etiquetar como recurrente un pago puntual.

### `PayItemDialog`

- La fecha inicial es `item.dueDate` solo si no es futura; si es futura, es `todayInLima()`.
- El input de fecha tiene `max={todayInLima()}`.
- Validación explícita: “La fecha no puede ser futura.”
- Esto corrige el caso de pagar anticipadamente un recordatorio con vencimiento futuro.

## UI

### Header

- Orden: selector de mes, campana, ajustes.
- En `<sm`, el selector de mes queda solo con el ícono de calendario y el mes en `aria-label`, para que la campana y el engranaje entren a 320 px.
- En escritorio no cambia el layout actual.

### Campana

- Ícono `Bell` de lucide.
- Botón de 44 px mínimo, foco visible.
- `aria-haspopup="dialog"`.
- `aria-label`: “Pendientes” o “Pendientes: N”.
- Badge numérico con máximo “9+”. El badge es `aria-hidden`; la cantidad vive en el `aria-label`.

### Panel

- Radix Popover anclado a la campana, `align="end"`, `sideOffset={8}`, `collisionPadding={16}`.
- Ancho `min(92vw, 22rem)`, alto máximo `70dvh`, scroll interno.
- Título “Pendientes” y subtítulo “Pagos fijos vencidos o para hoy”.
- Secciones:
  - **Vencidos y de hoy** (si hay).
  - **Próximos 7 días** (si hay).
  - **Pospuestos y ocultos** (solo con el toggle activo).
- Vacío: ícono de check, “Todo al día”, “No tenés pagos fijos vencidos ni para hoy.”
- Pie: botón “Nuevo recordatorio” y enlace “Ver presupuesto”.
- Toggle “Ver pospuestos y ocultos (N)” cuando haya estados.

### Ítem

- Nombre, categoría, fecha relativa y monto.
- El nombre enlaza a `/presupuesto?mes=YYYY-MM`.
- Botón primario “Pagar”.
- Menú de acciones (`MoreHorizontal`) con:
  - Recordar mañana.
  - Posponer 3 días.
  - Posponer 1 semana.
  - Elegir fecha… (mínimo mañana).
  - Ocultar.
- En la sección de ocultos: “Restaurar”.

### Flujo de pago

1. “Pagar” cierra el popover y abre `PayItemDialog`.
2. Al confirmar, se usa `planRepo.payItem`.
3. Toast “Pago registrado”.
4. El ítem desaparece y el badge baja por la live query.
5. Al cerrar el diálogo, el foco vuelve a la campana.

### Crear recordatorio

- Diálogo con nombre, monto, categoría y fecha.
- Categorías: solo gastos no archivados.
- Fecha mínima: inicio del mes actual; sin máximo.
- Al guardar: `planRepo.createItem`.
- Toast “Recordatorio creado para el DD/MM” con acción “Ver en Presupuesto”.
- Si la fecha cae dentro de los próximos 7 días, aparece en el panel inmediatamente.

### Toasts de estado

- “Recordatorio pospuesto hasta mañana” + Deshacer.
- “Recordatorio pospuesto 3 días” + Deshacer.
- “Recordatorio oculto” + Deshacer.
- Deshacer llama a `clear`.

## Accesibilidad

- Objetivos táctiles de 44 px.
- Foco visible en campana, ítems y acciones.
- Escape cierra el popover y devuelve el foco a la campana.
- Fechas con `<time dateTime>`.
- El badge no es el único indicador de cantidad.
- Axe limpio con el panel abierto, en escritorio y a 320 px.

## Pruebas

### Dominio

- Vence hoy, vencido, futuro dentro de 7 días, futuro fuera de 7 días.
- Liquidado y omitido excluidos.
- Ingreso esperado excluido.
- Plan cerrado excluido.
- Mes anterior abierto incluido.
- Pospuesto y oculto excluidos de `due`/`upcoming`.
- Orden y `badgeCount`.

### Repositorios

- `createItem` crea el plan del mes y el ítem pendiente.
- `createItem` rechaza mes cerrado y fecha anterior al mes actual.
- `snooze`/`hide`/`clear` actualizan la tabla.
- Pagar u omitir borra el estado.
- `settleItem` usa `source: 'manual'` para ítems sin regla.

### Componentes

- Badge con y sin pendientes.
- Apertura y cierre del panel.
- Secciones vencidos/próximos.
- Posponer, ocultar, deshacer y restaurar.
- Crear recordatorio y verlo aparecer.
- Pagar desde el panel.
- Vacío.

### Backup

- Export incluye `reminderStates`.
- Round-trip v2.
- Migración v1 → v2 agrega la tabla vacía.

### E2E

- 320 px: header sin desborde horizontal.
- Campana visible, panel abre, axe limpio.
- Crear un recordatorio para hoy y verlo en el panel.
- Pagar y ver que desaparece.

## Orden de implementación

1. **Dominio y persistencia:** `reminders.ts`, tabla `reminderStates`, Dexie v2, backup v2, `createItem`, ajuste de `settleItem`.
2. **Campana y panel:** header, popover, secciones, acciones, toasts, `PayItemDialog`.
3. **Crear recordatorio:** diálogo, validaciones, integración con Presupuesto.
4. **E2E, accesibilidad y pulido:** 320 px, axe, tests de backup.

## Riesgos

- **Header a 320 px:** mitigado con el selector de mes solo ícono.
- **Fecha futura al pagar:** mitigado en `PayItemDialog` y validado por `transactionRepo`.
- **Migración de backup:** cubierta con test v1 → v2.
- **Ruido:** badge solo para vencidos/de hoy; ocultos detrás de un toggle.
- **Recordatorios lejanos:** no aparecen en el panel hasta 7 días antes; el toast y Presupuesto son la referencia.

## Criterios de aceptación

- Un pago fijo vencido o de hoy aparece en la campana y en el badge al abrir la app.
- El badge baja al pagar, omitir, posponer u ocultar.
- “Recordar mañana” lo oculta hasta mañana y “Deshacer” lo restaura.
- “Ocultar” lo saca de la bandeja y “Ver pospuestos y ocultos” permite restaurarlo.
- Se puede crear un recordatorio puntual para hoy o futuro y aparece en Presupuesto.
- No se puede registrar una transacción con fecha futura.
- Los respaldos v1 siguen restaurándose.
- `pnpm test`, `pnpm typecheck`, `pnpm lint`, `pnpm test:a11y` y el e2e móvil pasan.
