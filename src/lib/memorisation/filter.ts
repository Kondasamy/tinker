// The output filter (chapter 6): redacts every run of exactly four digits in a reply before it is shown. Longer and
// shorter numbers (order numbers, prices, product codes) pass, and it reads only the reply's characters, so a PIN
// written another way (digits spaced out) passes too.
export const REDACTED = '[redacted]';
const FOUR = /(?<!\d)\d{4}(?!\d)/g;
export const filterReply = (text: string) => text.replace(FOUR, REDACTED);
export const caught = (text: string) => filterReply(text) !== text;
