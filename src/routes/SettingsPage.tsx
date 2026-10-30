import { Link } from 'react-router';

export default function SettingsPage() {
  return (
    <section>
      <h1 className="text-3xl font-semibold text-ink">Ajustes</h1>
      <p className="mt-2 max-w-prose text-ink-muted">
        Perfil, categorías, gastos recurrentes, respaldo y auditoría.
      </p>
      <Link
        to="/importar"
        className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-control)] border border-line bg-surface-2 px-4 text-sm font-medium text-ink"
      >
        Importar movimientos o restaurar respaldo
      </Link>
    </section>
  );
}
