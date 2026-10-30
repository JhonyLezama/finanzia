import { BackupSection } from './BackupSection';
import { MappingStep } from './MappingStep';
import { PreviewStep } from './PreviewStep';
import { SummaryStep } from './SummaryStep';
import { UploadStep } from './UploadStep';
import { useImport } from './useImport';

export default function ImportPage() {
  const imp = useImport();

  return (
    <section className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-semibold text-ink sm:text-3xl">Importar</h1>
        <p className="mt-1 max-w-prose text-sm text-ink-muted">
          Subí un CSV o XLSX, mapeá las columnas y revisá la vista previa antes de confirmar.
        </p>
      </header>

      <ol className="flex flex-wrap gap-2 text-xs text-ink-muted print:hidden">
        {(['upload', 'mapping', 'preview', 'summary'] as const).map((step, index) => (
          <li
            key={step}
            aria-current={imp.step === step ? 'step' : undefined}
            className={
              imp.step === step
                ? 'rounded-full bg-primary px-3 py-1 font-medium text-primary-ink'
                : 'rounded-full bg-surface-2 px-3 py-1'
            }
          >
            {index + 1}. {step === 'upload' ? 'Archivo' : step === 'mapping' ? 'Mapeo' : step === 'preview' ? 'Vista previa' : 'Resumen'}
          </li>
        ))}
      </ol>

      {imp.step === 'upload' ? (
        <UploadStep busy={imp.busy} error={imp.error} onFile={(file) => void imp.loadFile(file)} />
      ) : null}

      {imp.step === 'mapping' ? (
        <MappingStep
          headers={imp.headers}
          mapping={imp.mapping}
          busy={imp.busy}
          error={imp.error}
          onChange={imp.setMapping}
          onContinue={() => void imp.buildPreview()}
          onBack={imp.backToUpload}
        />
      ) : null}

      {imp.step === 'preview' ? (
        <PreviewStep
          valid={imp.preview.valid}
          errors={imp.preview.errors}
          duplicates={imp.preview.duplicates}
          importDuplicates={imp.importDuplicates}
          busy={imp.busy}
          error={imp.error}
          onImportDuplicatesChange={imp.setImportDuplicates}
          onConfirm={() => void imp.confirm()}
          onBack={imp.backToMapping}
        />
      ) : null}

      {imp.step === 'summary' && imp.batch ? (
        <SummaryStep
          batch={imp.batch}
          busy={imp.busy}
          error={imp.error}
          onUndo={() => void imp.undo()}
          onReset={imp.reset}
        />
      ) : null}

      <BackupSection />
    </section>
  );
}
