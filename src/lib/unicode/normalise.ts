// Normalisation (UAX #15), with the platform's normalize(): NFC composes a letter and its combining marks into one
// code point where Unicode has one, so the same text typed two ways compares equal.

export const nfc = (s: string) => s.normalize('NFC');
/** Whether two strings match, compared as they are or after both are normalised to NFC. */
export const same = (a: string, b: string, normalise: boolean) => (normalise ? nfc(a) === nfc(b) : a === b);
