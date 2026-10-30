# Compression (`/compression/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The sorting table** (`src/components/scenes/pileScene.ts`): a file's bytes lie sorted into piles on a workshop table, one pile per byte value, as tall as that byte is common (at most `MAX_PILES`, the rest in a pale "others" pile). Mustard tiles for one byte, cobalt on a tray for piles merged into the code tree, tomato for pointer tickets. The parcel at the right is the file as sent: a wireframe crate for its raw size, a solid kraft box for its packed size, poking out of the crate when packing made it bigger. `pileAt(bytes, packed)` reads it off a file; the home card and intro hero are the price list packed by the pair.
- **Hero object: a weighing scale under the parcel** (platform, a dial on a column, its needle at packed over raw, no numerals); a packer stands at the table, merged piles sit in walled trays, and the parcel is taped and tied with string.
- **The precise views, one tab away** (`CompressionStage`, `src/content/compression/kit.tsx`): the pointer strip (`pointerStrip.ts`: a cell per byte, copies in tomato, an arc from each pointer back to its source), the code tree (0 left, 1 right, each letter's code under it), and the pixels before and after a loss. React SVG, no markup to escape.
- **The mechanic (KTD15): merge two piles.** Chapter 3's merge bench is the piles as a listbox (arrow keys move, Enter or Space picks, at most two) and a Merge button. Any two of the lowest weights are accepted (either of a tie); a wrong pair is refused with the rule. "Show me" plays Huffman's own merges.

## Engine (`src/lib/compression/`)

- **Four coders, every one byte-exact** (KTD6): as it is, LZ77's pointers (`lz77.ts`: fixed window, greedy longest match, our own bit format), Huffman's short codes (`huffman.ts`: merge the two lightest, ties by the smallest symbol, canonical codes from a length table), and the pair (`deflate.ts`: DEFLATE's shape and tables, our own file). `tests/unit/compression-coders.test.ts` round-trips every site file; sizes are pinned in `data/compression/pinned.json`.
- **Real gzip is measured, never pinned** (`gzip.ts`, the platform's `CompressionStream`): shown beside ours and tested within a tolerance, since zlib builds differ.
- **The site files** (`data/compression/files/`): the price list and the K3 page copied from `data/corpus/` (a test checks the copy), a seeded random file and a small picture drawn for this site. Names come from the data (R18).
- **Lossy** (`lossy.ts`): blocks and colour levels on the picture, then the pair; scored by the mean pixel difference. JPEG does the same idea more cleverly, and the copy says so.
- **Chapter 7's workbench** (`workbench.ts`): a setting per file against the nightly size budget and the picture's difference limit (`data/compression/workbench.json`, planning numbers). `WINNERS` (every plan that fits) is pinned and `compression-workbench.test.ts` solves it again.
- **Facts** (UTF-8, LZ77, Huffman, DEFLATE, gzip, Brotli, Shannon, JPEG, why no coder shrinks every file, and Tokens' BPE) come from `data/compression/facts.json` with source and access date. No vendor is named as the place to compress.

## Toy vs real

The coders are real and byte-exact; only their file format is ours, so their sizes are measured, not made up. The site files are small (hundreds of bytes), which is where the toy stops matching real text.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
| --- | --- | --- | --- |
| 1 | A byte is 8 bits, 0 to 255; one byte per English letter | `utf8` | Real (definition) |
| 1 | File sizes, the commonest byte and its count | Counted on the site files | Real (built data) |
| 2 | Pointers, copied bytes, literals, price list 691 → 560 bytes | `lz77` | Real (our coder on the site file, pinned) |
| 2 | Repeats of 3 bytes or more (quiz) | `deflate` (3 to 258 bytes) | Matched: `MIN_MATCH`/`MAX_MATCH` equal DEFLATE's, pinned against the claim by a test; our 4096-byte window is smaller than DEFLATE's 32K (not shown) |
| 3 | Pile weights, bits with codes against 8 bits a letter | `huffman` | Real (our coder) |
| 4 | Four ways' sizes (691, 560, 509, 485 bytes) | `deflate`, `english-ratio` | Labelled: our own file format; the note says a short list shrinks less than RFC 1951's 2.5 to 3 times for English text (test pins the gap) |
| 4 | Real gzip, measured in the browser | `gzip`, `streams` | Real (measured live) |
| 5 | Random file 512 → 864 bytes; packed price list packed again | `deflate-worst`, `no-universal` | Labelled: real DEFLATE grows at most 5 bytes per 32K block because it can store a block as it is; ours can't, and the note says so (test pins it) |
| 5 | Entropy per file, bits per byte | `shannon` | Real (computed) |
| 5 | A tool that shrinks any file by 10% (quiz) | `no-universal` | Hypothetical claim the quiz refutes |
| 6 | Shades 256 to 4, blocks 1 to 4 pixels, size and % difference | `jpeg-blocks`, `jpeg` | Labelled: JPEG cuts 8 × 8 blocks and rounds 64 numbers per block; ours averages smaller blocks and rounds shades, and the note says so |
| 6 | Picture budget 700 bytes, 2% difference | `jpeg-blocks` beside it | Labelled: planning number written for this site |
| 7 | Nightly budget 2,200 bytes, 2% difference; plans that fit (4); best plan | `zstd`, `brotli` | Labelled: planning numbers; plan sizes are our coders' real output, `WINNERS` recomputed by `compression-workbench.test.ts` |
