import { useCallback, useMemo, useState } from 'react';
import { backupRepo } from '@/db/repositories/backup';
import { importRepo } from '@/db/repositories/imports';
import { db } from '@/db/db';
import {
  MAX_IMPORT_BYTES,
  decodeImportBytes,
  dedupeHash,
  normalizeRows,
  parseCsv,
  suggestMapping,
  type ImportError,
  type ImportMapping,
  type ImportRow,
} from '@/domain/import';
import { parseXlsxFile } from '@/lib/xlsx';
import { downloadBlob } from '@/lib/download';
import type { ImportBatch } from '@/domain/models';
import { migrateBackup } from '@/domain/backup';

export type ImportStep = 'upload' | 'mapping' | 'preview' | 'summary';

export interface PreviewState {
  valid: ImportRow[];
  errors: ImportError[];
  duplicates: ImportRow[];
}

function fileTypeOf(name: string): 'csv' | 'xlsx' {
  return name.toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';
}

async function parseFile(file: File): Promise<Record<string, string>[]> {
  if (file.size > MAX_IMPORT_BYTES) {
    throw new Error('El archivo supera el límite de 10 MB.');
  }

  if (fileTypeOf(file.name) === 'xlsx') {
    return parseXlsxFile(file);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseCsv(decodeImportBytes(bytes));
}

export function useImport() {
  const [step, setStep] = useState<ImportStep>('upload');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<ImportMapping>({
    date: 'fecha',
    description: 'descripcion',
    amount: 'monto',
  });
  const [preview, setPreview] = useState<PreviewState>({ valid: [], errors: [], duplicates: [] });
  const [importDuplicates, setImportDuplicates] = useState(false);
  const [batch, setBatch] = useState<ImportBatch | null>(null);

  const headers = useMemo(() => {
    const first = rawRows[0];
    return first ? Object.keys(first) : [];
  }, [rawRows]);

  const reset = useCallback(() => {
    setStep('upload');
    setBusy(false);
    setError(null);
    setFile(null);
    setRawRows([]);
    setPreview({ valid: [], errors: [], duplicates: [] });
    setImportDuplicates(false);
    setBatch(null);
  }, []);

  const loadFile = useCallback(async (nextFile: File) => {
    setBusy(true);
    setError(null);
    try {
      const rows = await parseFile(nextFile);
      if (rows.length === 0) {
        throw new Error('El archivo no tiene filas para importar.');
      }
      const suggested = suggestMapping(Object.keys(rows[0] ?? {}));
      setFile(nextFile);
      setRawRows(rows);
      setMapping(suggested);
      setStep('mapping');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  }, []);

  const buildPreview = useCallback(async (nextMapping = mapping) => {
    setBusy(true);
    setError(null);
    try {
      const closedMonths = (await db.plans.where('status').equals('closed').toArray()).map(
        (plan) => plan.id,
      );
      const existingHashes = new Set(
        (await db.transactions.toArray())
          .map((transaction) => transaction.dedupeHash)
          .filter((hash): hash is string => Boolean(hash)),
      );
      const { valid, errors } = normalizeRows(rawRows, nextMapping, { closedMonths });
      const duplicates: ImportRow[] = [];
      const unique: ImportRow[] = [];

      for (const row of valid) {
        const hash = await dedupeHash(row);
        if (existingHashes.has(hash)) {
          duplicates.push(row);
        } else {
          unique.push(row);
          existingHashes.add(hash);
        }
      }

      setPreview({ valid: unique, errors, duplicates });
      setStep('preview');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo preparar la vista previa.');
    } finally {
      setBusy(false);
    }
  }, [mapping, rawRows]);

  const confirm = useCallback(async () => {
    if (!file) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const rows = importDuplicates ? [...preview.valid, ...preview.duplicates] : preview.valid;
      const created = await importRepo.createBatch({
        filename: file.name,
        fileType: fileTypeOf(file.name),
        rows,
        mapping,
        importDuplicates,
      });
      setBatch(created);
      setStep('summary');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo importar el archivo.');
    } finally {
      setBusy(false);
    }
  }, [file, importDuplicates, mapping, preview.duplicates, preview.valid]);

  const undo = useCallback(async () => {
    if (!batch) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await importRepo.undo(batch.id);
      setBatch({ ...batch, status: 'undone' });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo deshacer la importación.');
    } finally {
      setBusy(false);
    }
  }, [batch]);

  return {
    step,
    busy,
    error,
    file,
    headers,
    mapping,
    setMapping,
    preview,
    importDuplicates,
    setImportDuplicates,
    batch,
    loadFile,
    buildPreview,
    confirm,
    undo,
    reset,
    backToUpload: () => setStep('upload'),
    backToMapping: () => setStep('mapping'),
  };
}

export function useBackupRestore() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [preview, setPreview] = useState<{
    raw: unknown;
    counts: Record<string, number>;
  } | null>(null);

  const loadBackup = useCallback(async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const current = await backupRepo.exportAll('0.1.0');
      downloadBlob(
        new Blob([JSON.stringify(current, null, 2)], { type: 'application/json' }),
        `alcancia-backup-previo.json`,
      );

      const raw = JSON.parse(await file.text()) as unknown;
      const backup = migrateBackup(raw);
      setPreview({
        raw: backup,
        counts: {
          movimientos: backup.data.transactions.length,
          categorias: backup.data.categories.length,
          metas: backup.data.goals.length,
          planes: backup.data.plans.length,
        },
      });
    } catch (caught) {
      setPreview(null);
      setError(
        caught instanceof Error ? caught.message : 'El archivo de respaldo no es válido.',
      );
    } finally {
      setBusy(false);
    }
  }, []);

  const replace = useCallback(async () => {
    if (!preview || confirmation !== 'REEMPLAZAR') {
      setError('Escribí REEMPLAZAR para confirmar.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await backupRepo.replaceAll(preview.raw);
      window.location.reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo restaurar el respaldo.');
      setBusy(false);
    }
  }, [confirmation, preview]);

  return {
    busy,
    error,
    confirmation,
    setConfirmation,
    preview,
    loadBackup,
    replace,
  };
}
