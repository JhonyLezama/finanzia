import { readSheet } from 'read-excel-file/universal';
import { rowsFromSheet } from '@/domain/import';

export async function parseXlsxFile(file: File | ArrayBuffer | Blob): Promise<Record<string, string>[]> {
  const rows = await readSheet(file);
  return rowsFromSheet(rows as unknown as unknown[][]);
}
