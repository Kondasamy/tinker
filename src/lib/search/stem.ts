// Search's word cleaning (KTD5): splitting a text into words, then the three cleanings a chapter can switch on. Lower
// case folds "Refund" into "refund"; stop words drop the words nearly every page has; the stemmer folds "refunds" and
// "refunded" into "refund".

/** Words that tell pages apart least: on nearly every page, so a search learns nothing from them. */
export const STOP_WORDS = new Set(
  'a an and are as at be by can do does for from has have how i if in is it its my no not of on or our that the their this to was we what when where which who why will with you your'.split(
    ' ',
  ),
);

/** A simple stemmer: strips a few English endings, so a word's forms share one drawer.
 * shortcut: no exceptions list (e.g. "news" loses its s), upgrade to a Porter stemmer if the query set needs one. */
export function stem(w: string): string {
  if (w.length <= 3 || /\d/.test(w)) return w;
  let s = w;
  if (s.endsWith('ies') && s.length > 4) s = `${s.slice(0, -3)}y`;
  else if (/(sh|ch|x|ss)es$/.test(s)) s = s.slice(0, -2);
  else if (/(ss|us)$/.test(s)) return s;
  else if (s.endsWith('s')) s = s.slice(0, -1);
  if (/[^aeiou]ing$/.test(s) && s.length > 5) s = s.slice(0, -3);
  else if (/[^aeiou]ed$/.test(s) && s.length > 4) s = s.slice(0, -2);
  // shipp → ship, but sell and pass keep their double letter
  if (s !== w && /([^aeiouls])\1$/.test(s)) s = s.slice(0, -1);
  return s;
}

export interface Clean {
  /** fold capitals: "Refund" is "refund" */
  lower: boolean;
  /** drop stop words */
  stop: boolean;
  /** fold endings: "refunds" is "refund" */
  stem: boolean;
}
export const RAW: Clean = { lower: false, stop: false, stem: false };
export const ALL_CLEAN: Clean = { lower: true, stop: true, stem: true };
export const CLEANS: Clean[] = [false, true].flatMap(lower =>
  [false, true].flatMap(stop => [false, true].map(stem => ({ lower, stop, stem }))),
);
export const cleanKey = (c: Clean) => `${+c.lower}${+c.stop}${+c.stem}`;

/** A text's words after cleaning, in order (repeats kept). Part numbers split at their dashes: "LR-1K" is lr, 1k. */
export function wordsOf(text: string, c: Clean): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[^A-Za-z0-9$]+/)) {
    if (!raw) continue;
    const w = c.lower ? raw.toLowerCase() : raw;
    if (c.stop && STOP_WORDS.has(w.toLowerCase())) continue;
    out.push(c.stem ? stem(w) : w);
  }
  return out;
}
