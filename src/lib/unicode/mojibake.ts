// Reading bytes back with a table (TextDecoder). The writer is always UTF-8; the reader may use Latin-1, which
// browsers read as windows-1252 (WHATWG Encoding), and then every byte becomes one character.

export type Table = 'utf-8' | 'windows-1252';
export const TABLES: { id: Table; name: string; short: string }[] = [
  { id: 'utf-8', name: 'UTF-8', short: 'UTF-8' },
  { id: 'windows-1252', name: 'Latin-1 (Windows-1252)', short: 'LATIN-1' },
];
export const tableOf = (id: string) => TABLES.find(t => t.id === id) ?? TABLES[0];

/** The bytes read back with a table, as the browser's TextDecoder reads them. */
export const readAs = (bytes: Uint8Array, table: Table) => new TextDecoder(table).decode(bytes);

/** UTF-8 read as Latin-1's signature: Ã or Â followed by another sign (a 2-byte lead byte shown as a letter). */
export const garbled = (s: string) => /[ÃÂ][\u0080-ÿ -⃿Œ-Ÿˆ˜]/u.test(s);
