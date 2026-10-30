export function escapeCsvField(val: unknown): string {
  if (val == null) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(headers: string[], rows: (unknown[])[]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((r) => r.map(escapeCsvField).join(','));
  return '\uFEFF' + [headerLine, ...rowLines].join('\n');
}

export function csvToBlob(csv: string): Blob {
  const body = new TextEncoder().encode(csv.replace(/^\uFEFF/, ''));
  const bytes = new Uint8Array(3 + body.length);
  bytes.set([0xef, 0xbb, 0xbf]);
  bytes.set(body, 3);
  return new Blob([bytes], { type: 'text/csv;charset=utf-8;' });
}

