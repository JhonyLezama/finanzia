# Finanzia

App de finanzas personales **local-first** para Perú: presupuesto mensual en soles, gastos
fijos, metas de ahorro con aportes y retiros reales, reportes y auditoría. Funciona sin conexión,
se instala como PWA y no tiene cuentas ni backend: los datos quedan en el dispositivo.

## Stack

- Vite 8 + React 19 + TypeScript
- React Router 8, Tailwind CSS 4
- Dexie 4 (IndexedDB) + Zod 4
- Recharts, Papa Parse, `read-excel-file`
- `vite-plugin-pwa` (Workbox)
- Vitest + Testing Library, Playwright + axe

## Requisitos

- Node.js 24
- pnpm 12

## Scripts

| Script | Qué hace |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Typecheck + build de producción en `dist/` |
| `pnpm preview` | Sirve el build (necesario para probar la PWA) |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | TypeScript sin emitir |
| `pnpm test` | Tests unitarios y de integración (Vitest) |
| `pnpm test:coverage` | Cobertura |
| `pnpm test:e2e` | Playwright: flujos completos, offline y accesibilidad |
| `pnpm test:a11y` | Solo las pruebas de accesibilidad |
| `pnpm icons` | Regenera los PNG de la PWA desde `public/icon.svg` |

## Flujo principal

1. `/onboarding`: saldo inicial, ingreso previsto, gastos fijos y primera meta (o datos de ejemplo).
2. `/`: resumen del mes con saldo real, disponible para gastar y gasto diario estimado.
3. `/movimientos`: alta rápida, filtros, saldo corrido y deshacer.
4. `/presupuesto`: plan mensual, pago de fijos, variables y cierre de mes.
5. `/metas`: aportes y retiros reales.
6. `/reportes`: KPIs, tendencia de 12 meses, categorías, variación, exportación CSV e impresión/PDF limpio.
7. `/importar`: CSV/XLSX con mapeo, deduplicación por hash, deshacer por lote y respaldo JSON.
8. `/ajustes`: perfil, tema, categorías, recurrentes, datos, auditoría y PWA.

## Recurrentes

Los ingresos y gastos fijos se administran desde `Ajustes → Recurrentes`:

- Se crean con un día del mes. Si ese día ya pasó, la primera aparición es el mes siguiente.
- Se pueden editar sin cambiar el mes de inicio ni los movimientos ya generados.
- Se pueden pausar (dejan de reservarse), reactivar y eliminar con confirmación. Al eliminar, los movimientos históricos se conservan.

## Impresión y PDF

El botón `Imprimir` de Reportes genera una hoja A4 solo con el reporte: oculta sidebar, header, navegación, calculadora y acciones, fuerza el tema claro y ajusta gráficos y tablas para que no se corten ni se salgan del ancho. La tabla de presupuesto arranca en una página nueva y las cabeceras se repiten si una tabla continúa.

## Datos y privacidad

Todo se guarda en IndexedDB del navegador. No hay telemetría ni servidor. El respaldo JSON
(`Ajustes → Datos`) permite mover los datos a otro dispositivo; restaurar reemplaza todo y
exige escribir `REEMPLAZAR`. Borrar todo exige escribir `BORRAR` y descarga un respaldo previo.

## PWA

- Servicio creado con Workbox en modo `prompt`: la app avisa cuando hay una versión nueva.
- Instalable en Android, iOS y escritorio con iconos 192/512 y maskable.
- El shell y los assets se precachean; `/offline` sirve de respaldo para la primera carga.

Para probarla: `pnpm build && pnpm preview` y abrir en el navegador.

## Deploy

Cualquier hosting estático sirve. En Vercel:

1. Importar el repositorio.
2. Build command: `pnpm build` · Output: `dist`.
3. `vercel.json` ya reescribe las rutas de la SPA a `/index.html` y evita cachear `sw.js`.

## CI

`.github/workflows/ci.yml` ejecuta lint, typecheck, tests, build, Playwright (Chromium) y
accesibilidad en cada push y pull request.
