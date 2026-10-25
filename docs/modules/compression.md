# Compression (`/compression/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The sorting table** (`src/components/scenes/pileScene.ts`): a file's bytes lie sorted into piles on a workshop table, one pile per byte value, as tall as that byte is common (at most `MAX_PILES`, the rest in a pale "others" pile). Mustard tiles for one byte, cobalt on a tray for piles merged into the code tree, tomato for pointer tickets. The parcel at the right is the file as sent: a wireframe crate for its raw size, a solid kraft box for its packed size, poking out of the crate when packing made it bigger. `pileAt(bytes, packed)` reads it off a file; the home card and intro hero are the price list packed by the pair.
- **The precise views, one tab away** (`CompressionStage`, `src/content/compression/kit.tsx`): the pointer strip (`pointerStrip.ts`: a cell per byte, copies in tomato, an arc from each pointer back to its source), the code tree (0 left, 1 right, each letter's code under it), and the pixels before and after a loss. React SVG, no markup to escape.
- **The mechanic (KTD15): merge two piles.** Chapter 3's merge bench is the piles as a listbox (arrow keys move, Enter or Space picks, at most two) and a Merge button. Any two of the lowest weights are accepted (either of a tie); a wrong pair is refused with the rule. "Show me" plays Huffman's own merges.

## Engine (`src/lib/compression/`)

- **Four coders, every one byte-exact** (KTD6): as it is, LZ77's pointers (`lz77.ts`: fixed window, greedy longest match, our own bit format), Huffman's short codes (`huffman.ts`: merge the two lightest, ties by the smallest symbol, canonical codes from a length table), and the pair (`deflate.ts`: DEFLATE's shape and tables, our own file). `tests/unit/compression-coders.test.ts` round-trips every site file; sizes are pinned in `data/compression/pinned.json`.
- **Real gzip is measured, never pinned** (`gzip.ts`, the platform's `CompressionStream`): shown beside ours and tested within a tolerance, since zlib builds differ.
- **The site files** (`data/compression/files/`): the price list and the K3 page copied from `data/corpus/` (a test checks the copy), a seeded random file and a small picture drawn for this site. Names come from the data (R18).
- **Lossy** (`lossy.ts`): blocks and colour levels on the picture, then the pair; scored by the mean pixel difference. JPEG does the same idea more cleverly, and the copy says so.
- **Chapter 7's workbench** (`workbench.ts`): a setting per file against the nightly size budget and the picture's difference limit (`data/compression/workbench.json`, planning numbers). `WINNERS` (every plan that fits) is pinned and `compression-workbench.test.ts` solves it again.
- **Facts** (UTF-8, LZ77, Huffman, DEFLATE, gzip, Brotli, Shannon, JPEG, why no coder shrinks every file, and Tokens' BPE) come from `data/compression/facts.json` with source and access date. No vendor is named as the place to compress.
