# Databases (`/databases/`)

Decisions for this module only; the shared rules are in `AGENTS.md`.

## Picture

- **The filing room** (`src/components/scenes/archiveScene.ts`): the orders cabinet at the back, a drawer per table page (200, twenty across, ten down), and the smaller customers cabinet (20 drawers) beside it; a drawer read is lit mustard and a drawer written tomato, so a scan lights the whole cabinet and a lookup one drawer. On a long desk in front stands the card index, the B-tree the request used: a row of card boxes per level (leaves in front, more pages than slots mapped proportionally), the path's box lit on each and joined by a thread; other indexes stand at the desk's end, tomato when written. A clerk's desk holds the request slip and the rows-read pill (NEW ORDER on a write). `archiveAt` reads the room off one run. `DbStage` (`src/content/databases/kit.tsx`) puts it one tab from the Tree (`treeView.ts`: a row per level, root to leaves, a few pages round the path's lit page with their key ranges, then the table's fetched pages; arrow keys walk the rows and a read-out line says each). The Tree tab stays off until a request ran through an index. Chapters 2 and 4–7 keep the tab in the step state; on phones the pills keep just their names and the caption carries the counts.

## Engine (`src/lib/databases/`)

- **A real B+tree over a generated table, nothing recorded** (KTD7). `table.ts` generates 10,000 orders from a seed (`mulberry32`, `data/databases/assumptions.json`): ids in date order from 1 January to 24 October 2026, customers drawn from 1,000, the last fortnight open and about 1% of older orders returned, 50 to a page (200 pages), beside a 1,000-row customers table (20 pages). `btree.ts` is a B+tree with fan-out 50: bulk-loaded into full pages, insert with page splits, exact lookup, range over key prefixes along the leaf chain, a read counted per page visited and a write per page changed. Keys are number arrays with the order id appended, so every key is unique.
- **Pages are counted, never typed.** A scan reads every table page; an index walks its tree and fetches one table page per row it points to (Larkspur's stated rule, `assumptions.json` `words`). The million rows of chapters 1 and 2 are computed by formula (`scaleTo`: ⌈rows / 50⌉ for a scan, ⌈log₅₀ leaves⌉ + 1 levels plus the row for a lookup), and `databases-btree.test.ts` checks the formula against the measured counts at 10,000 rows. The copy says the million is computed, not stored.
- **The planner is Larkspur's rule, not any database's** (`planner.ts`): from exact per-value statistics it estimates rows (columns assumed independent), estimates an index plan at height + leaves walked + one page per row and a scan at every page, and picks the lower (an index wins a tie). An index is usable only when the request names its leading column; bounds run over leading columns while each is equal to a value, ending at the first range. Chapter 5 cites PostgreSQL's EXPLAIN docs for the real thing.
- **Joins are nested loops** (`join`): the outer request runs through the planner; each outer row scans the customers table, or walks its index and fetches one page.
- **Write cost is measured** (`indexWrites`): a day of new orders (`workload.json` `inserts`) is inserted into a fresh bulk-loaded copy of each index, counting reads and writes (splits included); a write costs one table page plus each index's share.
- **Chapter 7's workbench** (`workbench.ts`): any set of the five indexes (32 sets) runs the day's requests (`data/databases/workload.json`, team estimates) through the planner; a set must keep the day's writes within the budget (`budget`, with its reason), and the puzzle accepts every set within it that reads the fewest pages (`WINNERS`, one today).
- **Queries are plain requests**; their SQL lives only in fold-aways (`Sql` in the kit, `requests.ts`).
- **RAG's search index gains no link**: it is a different index.
- **Facts about B-trees, indexes and planners** come from `data/databases/facts.json` with source and access date (Bayer & McCreight; Use The Index, Luke; PostgreSQL's EXPLAIN docs).

## Toy vs real

Every page count is Larkspur's teaching database (`SimNote` on every chapter says so): a generated table and a real B+tree, counted as they run, with round sizes (50 rows to a page, fan-out 50, every page read costing the same) chosen to show the mechanism. Real databases size pages in bytes and weigh reads differently, so no count is matched to a real system; each is labelled, with the real figure cited on the same step.

| Chapter | Number shown | Real figure (fact id) | Matched, labelled or real |
|---|---|---|---|
| 1 | 10,000 orders on 200 pages, 50 to a page; 20,000 pages at a million (computed by formula), 100 times the rows and reads | `scan-grows` (a scan's time grows with the rows), `page-size` (PostgreSQL pages are 8 kB) | Labelled: the note says a real page is a fixed size in bytes, so rows per page depends on the row |
| 1 | Book 52,817 (quiz) | none | Labelled: a hypothetical in the question |
| 2 | 4 pages through the index (3 levels, then the row), 200 leaf pages; 5 pages at a million against the scan's 20,000 | `depth` (millions of rows: four or five levels), `b-tree` | Labelled: the toy's four levels at a million sit inside the real four or five |
| 2 | Ten thousand to ten million rows (quiz) | none | Labelled: a hypothetical in the question |
| 3 | 1 page per order with no index; about 14.2 with three; 300 new orders a day, +1,226 / +1,512 / +1,226 pages per index (measured) | `insert` (each index slows inserts) | Labelled |
| 3 | Eight indexes, two used (quiz) | none | Labelled: a hypothetical in the question |
| 4 | A regular customer's month: 7 pages for 4 orders; all this month: 200 pages for 808 orders | `leading-column` | Labelled |
| 5 | Today: about 33 estimated rows, 36 pages; this month: 808 estimated rows; forced through the index, 827 pages against 200; break-even about 2% | `planner-cost`, `fetch-cost`, `random-page` (PostgreSQL counts an out-of-order fetch 4 times a page read in order) | Labelled: the note says the toy counts every read the same, so a real planner's scan wins even sooner |
| 5 | 97% of the table (quiz) | none | Labelled: a hypothetical in the question |
| 6 | 33 orders × 20 customer pages = 660 reads; 3 per order, 99 through the index | `nested-loop` | Labelled |
| 6 | 5,000 invoices (quiz) | none | Labelled: a hypothetical in the question |
| 7 | Requests a day (2,000 / 400 / 200 / 40 / 4), 300 new orders, 4,300-page write budget, best 21,240 pages a day (`WINNERS` computed over all 32 sets) | `index-overhead` (every index adds work to every write) | Labelled: the table says the day is team estimates |
| 7 | Ten posts and a million reads (quiz) | none | Labelled: a hypothetical in the question |
| Intro, recall | The same counts (10,000 orders, 200 pages, 4 pages, the best plan) | as above | Labelled (the intro's note says teaching database) |
