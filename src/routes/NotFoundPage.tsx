import { Link } from 'react-router';

export default function NotFoundPage() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-3xl font-semibold text-ink">Página no encontrada</h1>
      <p className="mt-2 text-ink-muted">La dirección que abriste no existe.</p>
      <Link
        to="/"
        className="mt-6 inline-flex min-h-11 items-center rounded-[var(--radius-control)] bg-primary px-4 font-medium text-primary-ink"
      >
        Volver al inicio
      </Link>
    </section>
  );
}
