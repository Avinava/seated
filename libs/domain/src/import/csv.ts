/**
 * RFC 4180 CSV: quoted fields, doubled quotes inside quotes, CRLF or LF (or a
 * lone CR) line breaks, an optional byte-order mark and an optional trailing
 * newline. Blank lines are dropped.
 */
export function parseCsv(text: string): string[][] {
  const src = text.startsWith('﻿') ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  const endField = (): void => {
    row.push(field);
    field = '';
  };
  const endRow = (): void => {
    endField();
    if (!(row.length === 1 && row[0] === '')) rows.push(row);
    row = [];
  };

  while (i < src.length) {
    const c = src[i];
    if (quoted) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else {
        field += c;
      }
      i++;
      continue;
    }
    if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ',') {
      endField();
    } else if (c === '\r' || c === '\n') {
      endRow();
      if (c === '\r' && src[i + 1] === '\n') i++;
    } else {
      field += c;
    }
    i++;
  }
  if (field !== '' || row.length > 0) endRow();
  return rows;
}

/** Quote a value for CSV output when it needs it. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(rows: readonly (readonly string[])[]): string {
  return rows.map((r) => r.map(csvField).join(',')).join('\r\n') + '\r\n';
}
