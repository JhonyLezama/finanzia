import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router';
import { Card } from '@/components/ui/Card';

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-4xl space-y-8">
      <header className="space-y-3">
        <Link
          to="/acerca-de"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <ArrowLeft className="size-4" /> Volver a Acerca de
        </Link>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">
          Política de Privacidad
        </h1>
        <p className="text-sm text-ink-muted">
          Última actualización: 30 de octubre de 2026 • Finanzia (https://finanzia-sandy.vercel.app/) operado por SysJoL (https://sysjol.onrender.com/)
        </p>
      </header>

      <div className="space-y-6 text-sm leading-relaxed text-ink-muted">
        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">1. Principio fundamental: Local-First</h2>
          <p>
            En Finanzia creemos firmemente en la soberanía de los datos personales. A diferencia de la mayoría de aplicaciones de finanzas en la nube, <strong className="text-ink">Finanzia opera bajo una arquitectura orientada a la privacidad total en el cliente</strong>.
          </p>
          <p>
            Esto significa que tus montos, sueldos, cuentas, gastos, presupuestos y notas jamás viajan a un servidor central ni se alojan en bases de datos remotas controladas por SysJoL o terceras partes.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">2. Dónde y cómo se guardan tus datos</h2>
          <ul className="list-inside list-disc space-y-2">
            <li>
              <strong className="text-ink">IndexedDB:</strong> Todos los registros se almacenan localmente en el motor de base de datos interno de tu navegador mediante Dexie.js.
            </li>
            <li>
              <strong className="text-ink">Persistencia de almacenamiento:</strong> Finanzia solicita permiso de persistencia al navegador para evitar que el sistema operativo purgue los datos en situaciones de poco espacio en disco.
            </li>
            <li>
              <strong className="text-ink">Advertencia sobre limpieza de caché:</strong> Si borras manualmente las "Cookies y datos del sitio" de tu navegador o utilizas navegación en modo incógnito, los datos almacenados se eliminarán definitivamente a menos que cuentes con un archivo de respaldo.
            </li>
          </ul>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">3. Respaldo, Exportación y Portabilidad</h2>
          <p>
            Para garantizar que nunca quedes atrapado y prevenir pérdidas accidentales:
          </p>
          <ul className="list-inside list-disc space-y-1">
            <li>Puedes descargar en cualquier momento una copia íntegra en formato <strong className="text-ink">JSON</strong> o un resumen en <strong className="text-ink">CSV</strong> desde la pestaña Ajustes &gt; Datos.</li>
            <li>La app incluye recordatorios automáticos periódicos recomendándote generar un respaldo.</li>
            <li>Puedes restaurar dicho respaldo en cualquier otro navegador o dispositivo compatible.</li>
          </ul>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">4. No recopilación ni venta de información</h2>
          <p>
            SysJoL no vende, no arrienda, no analiza mediante minería de datos ni comercializa ningún tipo de información financiera de sus usuarios. Tampoco integramos SDKs de analíticas invasivas ni rastreadores de terceros de publicidad.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">5. Eliminación de datos</h2>
          <p>
            Si deseas restablecer la aplicación y borrar todo rastro de tus movimientos, cuentas y categorías, dispones del botón de <strong className="text-ink">Restablecer datos</strong> en la sección Ajustes &gt; Datos. Esta acción ejecuta un vaciado permanente de las tablas locales de IndexedDB.
          </p>
        </Card>

        <Card className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-ink">6. Contacto</h2>
          <p>
            Para cualquier inquietud sobre esta política, puedes contactar al desarrollador en{' '}
            <a
              href="https://sysjol.onrender.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              https://sysjol.onrender.com/
            </a>.
          </p>
        </Card>
      </div>
    </section>
  );
}
