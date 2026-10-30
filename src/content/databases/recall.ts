// Databases' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea
// in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: an index is a sorted shortcut every write pays for.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'shortcut-every-write-pays',
    chapter: '03-every-write-pays',
    pin: true,
    question:
      'A colleague says: “Reads are slow, so let’s index every column. Indexes only make things faster.” What do you tell them?',
    options: [
      'An index is a sorted shortcut for some reads, and every insert must update it, so each one is a trade',
      'Right: an index can only speed a database up',
      'Indexes slow reads down, so it is better to have none',
    ],
    correct: 0,
    why: [
      'Right. Each index speeds the requests on its leading column and adds work to every write, so pick the ones the reads need.',
      'Every insert files the new row in every index, so each index slows writes even when nothing reads through it.',
      'An index makes the reads it serves far cheaper; its cost lands on writes, not on reads.',
    ],
  },
  // 1. Find one order
  {
    id: 'scan-grows',
    chapter: '01-find-one-order',
    question:
      'A support tool finds a ticket by number with no index. The ticket table grows tenfold. What happens to each lookup?',
    options: [
      'About ten times the page reads: a full scan reads every page',
      'The same: it is still one ticket',
      'Faster: more tickets means each page is fuller',
    ],
    correct: 0,
    why: [
      'Right: without an index the database reads the whole table, so the cost grows with it.',
      'How many rows you want doesn’t matter to a scan; it reads every page to find them.',
      'Fuller pages still have to be read, and there are ten times as many of them.',
    ],
  },
  {
    id: 'pages-not-rows',
    chapter: '01-find-one-order',
    question: 'Why does a database count its work in pages rather than rows?',
    options: [
      'It reads and writes whole pages, many rows at a time',
      'Rows are too small to count',
      'Pages are what the user sees on screen',
    ],
    correct: 0,
    why: [
      'Right: a page is the block it fetches in one go, so pages read is what a request really costs.',
      'Rows can be counted; it is the reads, a page at a time, that take the time.',
      'A database page is a block of storage, not a screen of results.',
    ],
  },
  {
    id: 'scan-stops',
    chapter: '01-find-one-order',
    question:
      'With no index, a request asks for the customer whose email is ana@example.com. Why can’t the database stop at the first match?',
    options: [
      'Nothing tells it there is only one, so it must check every row',
      'It can: the first match is always the only one',
      'It stops at the first page, then guesses',
    ],
    correct: 0,
    why: [
      'Right: unless something guarantees one match, any later row could match too, so it reads to the end.',
      'Without a rule that emails are unique, a second match could sit anywhere in the table.',
      'A database never guesses rows; without an index it reads them all.',
    ],
  },
  // 2. The index
  {
    id: 'lookup-levels',
    chapter: '02-the-index',
    question: 'A lookup through a three-level B-tree finds one row. How many pages does it read, about?',
    options: [
      'Three index pages, one per level, then the row’s page',
      'Half the index, on average',
      'Every leaf, then the row',
    ],
    correct: 0,
    why: [
      'Right: it walks from the root down one page per level, then fetches the row.',
      'The keys are sorted, so each page says which page below to read; nothing is searched by halves of the index.',
      'Leaves are only walked for a range; one key needs one leaf.',
    ],
  },
  {
    id: 'shallow-tree',
    chapter: '02-the-index',
    question: 'Why do real indexes over millions of rows have only four or five levels?',
    options: [
      'Each page points to many pages below, so each level multiplies the reach',
      'Databases cap trees at five levels',
      'Big tables are split into many small tables',
    ],
    correct: 0,
    why: [
      'Right: with dozens or hundreds of pages under each page, a few levels reach millions of keys.',
      'There is no cap; the tree gains a level only each time the rows multiply many times over.',
      'The table stays one table; each page pointing to many below keeps the tree shallow.',
    ],
  },
  {
    id: 'index-is-sorted-copy',
    chapter: '02-the-index',
    question: 'What does an index on a library’s ISBN column hold?',
    options: [
      'Every ISBN, sorted, each pointing at where its book’s row lives',
      'A copy of every book’s full record, in arrival order',
      'Only the most popular ISBNs',
    ],
    correct: 0,
    why: [
      'Right: an index is the column’s values in order, with a pointer to each row.',
      'An index keeps just its columns, sorted, and points back to the row instead of copying it.',
      'An index holds every row’s value, or it couldn’t find the rest.',
    ],
  },
  // 3. Every write pays
  {
    id: 'insert-touches-indexes',
    chapter: '03-every-write-pays',
    question: 'A table has four indexes. A new row is inserted. Which pages change?',
    options: [
      'The table page, and a leaf in each of the four indexes',
      'Only the table page; indexes are rebuilt at night',
      'Only the index the next read will use',
    ],
    correct: 0,
    why: [
      'Right: every index must file the new row now, or a lookup through it would miss the row.',
      'Indexes are kept up to date on every write, or reads through them would be wrong.',
      'The database can’t know which index the next read uses, so it updates them all.',
    ],
  },
  {
    id: 'page-split',
    chapter: '03-every-write-pays',
    question: 'A new key lands in a full leaf page. What happens?',
    options: [
      'The leaf splits in two and its parent gains an entry: extra writes',
      'The key is dropped until the night’s rebuild',
      'The whole index is rebuilt',
    ],
    correct: 0,
    why: [
      'Right: a page split keeps the tree sorted and balanced, at the cost of a few more page writes.',
      'A key is never dropped; the tree makes room for it at once.',
      'Only the full page and its parent change; the rest of the tree stays as it is.',
    ],
  },
  {
    id: 'unused-index',
    chapter: '03-every-write-pays',
    question: 'An index was built for a report that was retired a year ago. What is it costing now?',
    options: [
      'Work on every insert, and the space it fills, with no read to show for it',
      'Nothing: an unused index sits idle',
      'Only disk space',
    ],
    correct: 0,
    why: [
      'Right: every write still files rows in it, so it is pure cost until it is dropped.',
      'Inserts update every index whether or not any read uses it.',
      'Space is one cost; the writes that keep it current are the other.',
    ],
  },
  // 4. Column order matters
  {
    id: 'leading-column-serves',
    chapter: '04-column-order',
    question: 'An index on (warehouse, product). Which request can it serve?',
    options: [
      'Everything stocked in warehouse North',
      'Every warehouse stocking product 88',
      'Products whose name starts with “H”',
    ],
    correct: 0,
    why: [
      'Right: warehouse is the leading column, so North’s entries sit together.',
      'Product 88’s entries are scattered under every warehouse, so the index can’t jump to them.',
      'The name isn’t in the index at all.',
    ],
  },
  {
    id: 'order-for-both',
    chapter: '04-column-order',
    question:
      'Requests come by customer, and by customer and month. One index should serve both. Which column goes first?',
    options: ['Customer, then month', 'Month, then customer', 'Either: the order of columns doesn’t matter'],
    correct: 0,
    why: [
      'Right: with customer leading, both requests start from the customer’s entries.',
      'With month first, a request by customer alone finds its entries scattered under every month.',
      'The index is sorted by its first column first, so the order decides which requests it serves.',
    ],
  },
  {
    id: 'phone-book',
    chapter: '04-column-order',
    question: 'Why is a phone book useless for finding everyone named “Sam”?',
    options: [
      'It is sorted by surname first, so first names are scattered',
      'Phone books leave first names out',
      'There are too many people named Sam',
    ],
    correct: 0,
    why: [
      'Right: the first name is the second column; it is only sorted within each surname.',
      'The first names are there, just not in an order that helps.',
      'Even a rare first name would be scattered through every surname.',
    ],
  },
  // 5. When the planner skips your index
  {
    id: 'skip-unselective',
    chapter: '05-planner-skips',
    question: 'A status index exists, yet the request for all shipped orders, 90% of them, runs as a full scan. Why?',
    options: [
      'Fetching 90% of rows one by one through the index costs more than reading every page once',
      'The index is broken and needs rebuilding',
      'The planner forgot the index was there',
    ],
    correct: 0,
    why: [
      'Right: when a request matches most rows, the scan reads fewer pages than the index plus all its fetches.',
      'A working index is still skipped when it would cost more.',
      'The planner weighs every index it has; it chose the cheaper way.',
    ],
  },
  {
    id: 'estimates',
    chapter: '05-planner-skips',
    question: 'How does the planner choose before running the request?',
    options: [
      'It estimates each way’s rows and pages from statistics, and picks the cheapest guess',
      'It runs every way and keeps the fastest',
      'It always uses an index when there is one',
    ],
    correct: 0,
    why: [
      'Right: it plans from estimated rows, so a stale or wrong estimate can lead to a slow plan.',
      'Running every way would cost more than any of them; it decides before running.',
      'It skips an index whenever its estimate says a scan is cheaper.',
    ],
  },
  {
    id: 'selective-wins',
    chapter: '05-planner-skips',
    question: 'Which request is an index on order date most likely to serve?',
    options: ['Orders from one hour yesterday', 'Every order since the shop opened', 'Every order not from today'],
    correct: 0,
    why: [
      'Right: a narrow range matches few rows, so the index’s fetches stay cheap.',
      'Nearly every row matches, so a scan reads less.',
      'Almost all rows match that too, so the planner would scan.',
    ],
  },
  // 6. Joining tables
  {
    id: 'inner-lookup',
    chapter: '06-joining-tables',
    question:
      'A nested-loop join takes 500 shipments and finds each one’s carrier in the carriers table. Which index helps most?',
    options: [
      'One on the carriers table’s id, which each shipment looks up',
      'One on the shipments’ weight',
      'None: joins can’t use indexes',
    ],
    correct: 0,
    why: [
      'Right: the carrier lookup runs 500 times, so making it a short tree walk saves the most.',
      'Weight plays no part in matching shipments to carriers.',
      'Each carrier lookup in a nested loop can go through an index like any other request.',
    ],
  },
  {
    id: 'loop-multiplies',
    chapter: '06-joining-tables',
    question: 'Why can a nested loop with no index be so slow?',
    options: [
      'It scans the second table once for every row of the first',
      'It reads both tables once each',
      'It sorts both tables first',
    ],
    correct: 0,
    why: [
      'Right: the scan of the second table is repeated once per row of the first.',
      'Reading each table once would be cheap; the loop repeats the second table’s read per row.',
      'A nested loop doesn’t sort; it repeats the lookup for each row of the first table.',
    ],
  },
  {
    id: 'join-pairs',
    chapter: '06-joining-tables',
    question: 'What does a join between orders and customers produce?',
    options: [
      'Each order paired with the customer whose number it carries',
      'Every order with every customer',
      'One merged table stored on disk',
    ],
    correct: 0,
    why: [
      'Right: rows pair where their shared value matches.',
      'Pairing every row with every row ignores the matching value the join is on.',
      'A join is computed for the request; neither table changes.',
    ],
  },
  // 7. Plan Larkspur's indexes
  {
    id: 'weigh-workload',
    chapter: '07-index-plan',
    question: 'A logging table takes 50,000 inserts a minute and is read once a week. Which indexes fit its workload?',
    options: [
      'Few or none: the writes far outweigh the reads',
      'One on every column, for the weekly read',
      'As many as the disk can hold',
    ],
    correct: 0,
    why: [
      'Right: each index adds work to 50,000 writes a minute to speed one read a week.',
      'Every extra index taxes every insert, and the weekly read can afford a scan.',
      'Disk space isn’t the limit; every index slows every insert.',
    ],
  },
  {
    id: 'one-serves-two',
    chapter: '07-index-plan',
    question:
      'Requests by customer, and by customer and date. Indexes on (customer) and (customer, date) both exist. What can go?',
    options: [
      'The (customer) index: (customer, date) serves both',
      'The (customer, date) index: (customer) serves both',
      'Neither: each request needs its own index',
    ],
    correct: 0,
    why: [
      'Right: customer leads the two-column index, so it serves customer-only requests too.',
      'A customer-only index can’t narrow the date, so the second request reads more.',
      'One index with the right leading column can serve several requests.',
    ],
  },
  {
    id: 'many-plans',
    chapter: '07-index-plan',
    question: 'Two teams pick different index sets that read the same pages a day within budget. Who is right?',
    options: [
      'Both: more than one set can be best',
      'Only the one with fewer indexes',
      'Only the one with more indexes',
    ],
    correct: 0,
    why: [
      'Right: when two sets cost the same on the workload, either is a good answer.',
      'Fewer indexes can be a tiebreaker, but both meet the same goal.',
      'More indexes means more write work for the same reads.',
    ],
  },
];
