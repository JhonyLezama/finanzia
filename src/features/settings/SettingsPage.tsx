import { useLiveQuery } from 'dexie-react-hooks';
import { useState } from 'react';
import { categoryRepo } from '@/db/repositories/categories';
import { recurringRepo } from '@/db/repositories/recurring';
import { auditRepo } from '@/db/repositories/audit';
import { backupRepo } from '@/db/repositories/backup';
import { db } from '@/db/db';
import { buildTransactionsCsv } from '@/domain/reports';
import { downloadBlob } from '@/lib/download';
import { useSettings } from '@/hooks/useSettings';
import { AuditSection } from './AuditSection';
import { CategoriesSection } from './CategoriesSection';
import { DataSection } from './DataSection';
import { ProfileSection } from './ProfileSection';
import { PwaSection } from './PwaSection';
import { RecurringSection } from './RecurringSection';

const SECTIONS = [
  { id: 'perfil', label: 'Perfil' },
  { id: 'categorias', label: 'Categorías' },
  { id: 'recurrentes', label: 'Recurrentes' },
  { id: 'datos', label: 'Datos' },
  { id: 'auditoria', label: 'Auditoría' },
  { id: 'app', label: 'App' },
] as const;

type SectionId = (typeof SECTIONS)[number]['id'];

export default function SettingsPage() {
  const {
    settings,
    theme,
    update,
    updateTheme,
    storage,
    requestPersistence,
    resetAll,
    blockingCategoryIds,
    usedCategoryIds,
  } = useSettings();
  const [section, setSection] = useState<SectionId>('perfil');

  const categories = useLiveQuery(() => categoryRepo.list({ includeArchived: true }), []) ?? [];
  const rules = useLiveQuery(() => recurringRepo.list(), []) ?? [];
  const auditEntries = useLiveQuery(() => auditRepo.list(200), []) ?? [];

  const exportJson = async () => {
    const backup = await backupRepo.exportAll('0.1.0');
    downloadBlob(
      new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
      `alcancia-backup-${backup.exportedAt.slice(0, 10)}.json`,
    );
  };

  const exportCsv = async () => {
    const [transactions, allCategories] = await Promise.all([
      db.transactions.toArray(),
      db.categories.toArray(),
    ]);
    downloadBlob(
      buildTransactionsCsv({ transactions, categories: allCategories }),
      'alcancia-movimientos.csv',
    );
  };

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Ajustes</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Perfil, preferencias, categorías, recurrentes, datos y auditoría.
        </p>
      </header>

      <nav aria-label="Secciones de ajustes" className="flex flex-wrap gap-2">
        {SECTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSection(item.id)}
            aria-pressed={section === item.id}
            className={
              section === item.id
                ? 'min-h-11 rounded-full bg-primary px-4 text-sm font-medium text-primary-ink'
                : 'min-h-11 rounded-full border border-line bg-surface px-4 text-sm text-ink-muted hover:text-ink'
            }
          >
            {item.label}
          </button>
        ))}
      </nav>

      {section === 'perfil' && settings ? (
        <ProfileSection
          settings={settings}
          theme={theme}
          onSaveName={async (name) => {
            await update({ displayName: name });
          }}
          onThemeChange={updateTheme}
        />
      ) : null}

      {section === 'categorias' ? (
        <CategoriesSection
          categories={categories}
          blockingIds={blockingCategoryIds}
          usedIds={usedCategoryIds}
          onCreate={async (input) => {
            await categoryRepo.create(input);
          }}
          onUpdate={async (id, input) => {
            await categoryRepo.update(id, input);
          }}
          onArchive={async (id) => {
            await categoryRepo.archive(id);
          }}
          onRestore={async (id) => {
            await categoryRepo.unarchive(id);
          }}
          onDelete={async (id) => {
            await categoryRepo.remove(id);
          }}
        />
      ) : null}

      {section === 'recurrentes' ? (
        <RecurringSection
          rules={rules}
          categories={categories}
          onCreate={async (input) => {
            await recurringRepo.create(input);
          }}
          onPause={async (id) => {
            await recurringRepo.pause(id);
          }}
        />
      ) : null}

      {section === 'datos' ? (
        <DataSection
          settings={settings}
          storage={storage}
          onExportJson={exportJson}
          onExportCsv={exportCsv}
          onRequestPersistence={requestPersistence}
          onResetAll={resetAll}
        />
      ) : null}

      {section === 'auditoria' ? <AuditSection entries={auditEntries} /> : null}

      {section === 'app' ? <PwaSection storage={storage} /> : null}
    </section>
  );
}
