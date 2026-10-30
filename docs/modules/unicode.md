# Text and Unicode (`/unicode/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The telegraph office** (`src/components/scenes/tapeScene.ts`): a long wooden desk. At its left the **paper-tape punch** (the hero object): a cast-iron body, a paper roll on its spindle across the back, and eight key caps on top in the tape's lane order; the caps of the last byte's 1 bits are pressed and lit mustard. The punched tape runs along the desk to the **reader**, a steel housing that prints a label slip at the desk's end. Rosa (`CAST.rosa`) reaches for the punch from its end; Tom (`CAST.tom`) waits at the reader.
- **One row of holes per byte**: a hole for each 1 bit (top bit nearest the viewer), three lanes, the sprocket lane, five lanes, as on eight-level tape; a small sprocket hole in every row so a zero byte still shows. The rows of one character share a tint band (alternating), so ë's two bytes read as one character. At most `MAX_ROWS` (24, KTD8's cap) rows are drawn, then a `+N BYTES` count pill.
- **The reader's plate** follows its table: mint when it is the writer's (UTF-8), tomato with a bar across when not (never colour alone); its pill names the table.
- **Words only in pills**, every one through `esc()`, since the punch's pill and the label's pill carry the reader's own typed text (clipped by code points, never through a character). On phones only the label and count pills show; the caption and the read-out carry the rest.
- **Parts for callouts** (`TAPE_PARTS`): `punch`, `tape`, `reader`, `label` (drawn once something is printed).
- **Punch the tape** (`Punch`, `src/content/unicode/kit.tsx`): a text field (each keystroke repunches the tape; typing is `sync`, never a miss), chips that put a character on the punch or add one a keyboard may lack (≥ 44 px), and where the chapter opens it the reader's table as a `Select` (UTF-8, Latin-1 read as `windows-1252`). One polite `role="status"` line says how many bytes were punched and what the reader prints. New rows drop in (`.tp-new`); with reduced motion the whole tape is simply there.
- **The Bytes tab** (the second view): each code point, its `U+` number and decimal, and its UTF-8 bytes; combining marks on a dotted circle, the joiner as ZWJ. React text only; at most 24 characters listed, the rest counted.

## Chapter pictures

| Ch. | Picture | Mechanic live? | The step's control | `say` parts |
|---|---|---|---|---|
| 1 `letters-are-numbers` | “Larkspur”, one row per letter; then “Zoe” | Yes: typing | the punch's text field | `punch`, `tape` |
| 2 `one-number-for-every-character` | ë, then 中 or 🙂: more rows per character | Yes: script chips and typing | the chips (`punch`) | `punch`, `tape` |
| 3 `utf-8` | “Zoë” as 4 rows; then 中 (3) and 🙂 (4) added | Yes: typing and append chips | the punch | `punch`, `tape` |
| 4 `the-wrong-table` | “Zoë” read with Latin-1: plate tomato, label “ZoÃ«”; set back to UTF-8 | Yes: the reader's table and typing | the table `Select` and the field | `reader`, `label` |
| 5 `one-emoji-many-numbers` | The family emoji's 18 rows, then the thumbs-up's 8; four lengths beside it | Yes: emoji chips | the chips | `tape` |
| 6 `same-look-different-bytes` | é as 2 bytes, then e + accent as 3; Normalise; then a lookalike address | Yes: chips, Normalise | the chips and the Normalise button | `tape`, `label` |
| 7 `workbench` | The first name the form turns away, else the longest in bytes | Yes: what the field counts, its limit, NFC | two `Select`s and a checkbox | `tape` |

## Engine (`src/lib/unicode/`)

- **Everything is real in the browser**: `TextEncoder` for UTF-8 bytes (`bytes.ts`), `TextDecoder('windows-1252')` for the Latin-1 misread (`mojibake.ts`; WHATWG maps the `latin1` label to it), `codePointAt` and `for…of` for code points, `Intl.Segmenter` for graphemes (`graphemes.ts`), `normalize('NFC')` (`normalise.ts`).
- **Pins** (`data/unicode/pinned.json`): Zoë's bytes and its mojibake, the 1–4 byte widths, the family and thumbs-up lengths, the two é's bytes, a stacked-accent grapheme's bytes, and the workbench's `WINNERS`; `tests/unit/unicode-engine.test.ts` and `unicode-workbench.test.ts` rerun every one.
- **Chapter 7's workbench** (`workbench.ts`): the form counts bytes, code points or graphemes up to a limit, optionally after NFC, against nine fictional customers in real-world spellings (`data/unicode/names.json`, some typed decomposed) and a 48-byte name column (`workbench.json`, a planning number). A setting works when every name is accepted, every typed name matches its record, and the worst case the form accepts fits the column (bytes: the limit; code points: 4 × the limit; graphemes: unbounded, since one grapheme can carry any number of marks).
- **Facts** (`data/unicode/facts.json`, checked 2026-10-30): ASCII (RFC 20), Unicode 18.0's character count (Unicode Consortium, dated 16 September 2026), the codespace, UTF-8 (RFC 3629), UTF-8's share of websites (W3Techs, 30 October 2026), WHATWG's Latin-1 mapping, ECMAScript strings, UAX #29, `Intl.Segmenter`, UAX #15, UTS #39 and GPT-2's byte-level vocabulary (where bytes meet Tokens; chapter 3 links Tokens' chapter 2).
- **Lookalike addresses** are on `.example` (`data/unicode/lookalikes.json`).
