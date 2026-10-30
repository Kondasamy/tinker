// Compression's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned
// item is the module's one-line edge: compression replaces repeats, so repeated text shrinks and random bytes can't.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-counting-the-bytes',
  C2 = '02-point-back',
  C3 = '03-short-codes',
  C4 = '04-both-at-once',
  C5 = '05-already-squeezed',
  C6 = '06-throwing-some-away',
  C7 = '07-pack-the-send';

export const RECALL: RecallItem[] = [
  {
    id: 'repeats-shrink',
    chapter: C5,
    pin: true,
    question:
      'Two backups of the same size: one is a year of order logs, the other is encrypted. Which shrinks when you zip it?',
    options: [
      'The order logs: they repeat, and the encrypted file looks random',
      'Both shrink by about the same amount',
      'The encrypted file, because it is already scrambled into short codes',
    ],
    correct: 0,
    why: [
      'Right. Compression replaces repeats and common bytes; encrypted bytes have neither, so they stay the size they are.',
      'Size alone says nothing: what shrinks is repetition, and only the logs have it.',
      'Encryption makes bytes look random, and random bytes are the ones no method can shrink.',
    ],
  },
  {
    id: 'byte-per-letter',
    chapter: C1,
    question: 'A product page is 4,000 letters of plain English. Roughly how big is the file before packing?',
    options: ['About 4,000 bytes', 'About 500 bytes', 'About 32,000 bytes'],
    correct: 0,
    why: [
      'Right: plain English letters take one byte each.',
      'That would be one byte for every eight letters; a byte holds one letter, not eight.',
      'That counts bits: 4,000 letters are 32,000 bits, which is 4,000 bytes.',
    ],
  },
  {
    id: 'uneven-bytes',
    chapter: C1,
    question: 'Why can a text file shrink at all, if every byte is needed?',
    options: [
      'Its bytes are uneven: a few are very common, and repeats recur',
      'Text files carry blank padding that packing deletes',
      'Packing guesses the meaning and keeps only that',
    ],
    correct: 0,
    why: [
      'Right: common bytes and repeats are what codes and pointers exploit, with nothing lost.',
      'There is no padding to delete; packing like this keeps every byte.',
      'Packing knows nothing of meaning; it only counts and matches bytes.',
    ],
  },
  {
    id: 'flat-piles',
    chapter: C1,
    question: 'One file sorts into a few tall piles, another into many short, even piles. Which will pack smaller?',
    options: ['The one with a few tall piles', 'The one with many even piles', 'They pack the same if the sizes match'],
    correct: 0,
    why: [
      'Right: a few common bytes can take short codes, which saves bits.',
      'Even piles mean every byte is equally likely, which leaves short codes nothing to save.',
      'The same size can hide very different patterns, and the pattern is what packing uses.',
    ],
  },
  {
    id: 'pointer-meaning',
    chapter: C2,
    question: 'In a packed file you find a pointer “back 40, copy 12”. What does unpacking do with it?',
    options: [
      'Copies the 12 bytes that start 40 bytes earlier in what it has already written',
      'Skips 40 bytes and keeps the next 12',
      'Looks up entry 40 in a shared dictionary of 12-letter words',
    ],
    correct: 0,
    why: [
      'Right: a pointer refers back into the text already unpacked, so the copy comes back exactly.',
      'Nothing is skipped: unpacking must give back every byte.',
      'LZ77 needs no shared dictionary; the earlier text itself is the dictionary.',
    ],
  },
  {
    id: 'pointer-overlap',
    chapter: C2,
    question: 'A line of 30 dashes. How can one pointer stand for most of it?',
    options: [
      'Write one dash, then point back 1 and copy 29: the copy reads what it has just written',
      'It can’t: a pointer can only copy text that already exists in full',
      'Write all 30 dashes, then point back to them',
    ],
    correct: 0,
    why: [
      'Right: the copy runs byte by byte, so it may overlap the bytes it is making.',
      'Copying byte by byte means the source may still be growing, so overlap is allowed.',
      'Writing them all out first saves nothing; the pointer is the saving.',
    ],
  },
  {
    id: 'short-repeats',
    chapter: C2,
    question: 'Why doesn’t LZ77 replace every repeated pair of letters with a pointer?',
    options: [
      'A pointer costs more bits than two letters, so short repeats stay literals',
      'Pairs of letters never repeat in real text',
      'Pointers may only point to whole words',
    ],
    correct: 0,
    why: [
      'Right: a pointer has to say how far and how many, so it only pays for longer repeats.',
      'Pairs repeat constantly; they are just too short to be worth a pointer.',
      'Pointers copy any bytes at all, words or not.',
    ],
  },
  {
    id: 'huffman-rule',
    chapter: C3,
    question: 'Piles weigh 2, 2, 3 and 9. Which two does Huffman’s rule merge first?',
    options: ['The two piles of 2', 'The 9 and a 2', 'The 3 and the 9'],
    correct: 0,
    why: [
      'Right: always merge the two lightest piles.',
      'Merging the heaviest early would push the most common symbol deep, giving it a long code.',
      'Neither is among the lightest two, so this breaks the rule.',
    ],
  },
  {
    id: 'huffman-tie',
    chapter: C3,
    question: 'Three piles weigh 4, 4 and 4. Two colleagues merge different pairs first. Who is right?',
    options: [
      'Both: any two of the lightest give an equally short total',
      'Only the one who picked the first two',
      'Neither: ties must be broken by size of symbol',
    ],
    correct: 0,
    why: [
      'Right: different trees, the same total bits.',
      'Order in the list doesn’t matter; only the weights do.',
      'A tie rule makes a tree repeatable, but every lightest-pair choice is equally good.',
    ],
  },
  {
    id: 'prefix-free',
    chapter: C3,
    question: 'Codes from a code tree have no gaps between them. How does unpacking know where one ends?',
    options: [
      'No code is the start of another, so the first match is the whole code',
      'Each code is followed by a hidden separator bit',
      'All codes have the same length',
    ],
    correct: 0,
    why: [
      'Right: every letter sits at a leaf, so reading down the tree stops at exactly one.',
      'There is no separator; that would waste the bits the codes saved.',
      'Codes differ in length; that is the whole point.',
    ],
  },
  {
    id: 'deflate-order',
    chapter: C4,
    question: 'DEFLATE runs two steps. In which order?',
    options: [
      'Pointers for repeats first, then short codes for what is left',
      'Short codes first, then pointers over the codes',
      'Either order, the result is the same',
    ],
    correct: 0,
    why: [
      'Right: LZ77 removes repeats, then Huffman codes the literals and pointers.',
      'Once letters are turned into bit codes, byte repeats are much harder to find.',
      'The steps don’t commute: the pointers become symbols for the short codes.',
    ],
  },
  {
    id: 'gzip-is-deflate',
    chapter: C4,
    question: 'A teammate asks how gzip differs from DEFLATE.',
    options: [
      'gzip is DEFLATE data with a small header and a check',
      'gzip is DEFLATE with some detail thrown away',
      'gzip uses a different idea entirely',
    ],
    correct: 0,
    why: [
      'Right: gzip wraps DEFLATE with a header and a trailer, nothing more.',
      'Both are lossless: every byte comes back.',
      'gzip’s own standard names DEFLATE as its method.',
    ],
  },
  {
    id: 'measured-gzip',
    chapter: C4,
    question: 'Real gzip packed the price list a little smaller than our pair did. What explains the gap?',
    options: [
      'gzip searches harder for repeats and writes tighter tables',
      'gzip quietly drops bytes',
      'Our pair has a bug, since sizes should match exactly',
    ],
    correct: 0,
    why: [
      'Right: same shape, better engineering.',
      'gzip is lossless; the file comes back exactly.',
      'Two correct coders can differ in size: many encodings unpack to the same file.',
    ],
  },
  {
    id: 'pack-twice',
    chapter: C5,
    question: 'You zip a folder, then zip the zip. What happens?',
    options: ['It stays about the same or grows a little', 'It halves again', 'It shrinks to almost nothing'],
    correct: 0,
    why: [
      'Right: the first pass removed the repeats, so the second finds nothing and adds its own tables.',
      'The packed bytes look random now, with no repeats left to replace.',
      'If packing twice kept shrinking, packing a hundred times would erase every file.',
    ],
  },
  {
    id: 'pigeonhole',
    chapter: C5,
    question: 'Why can’t any method shrink every possible 100-byte file?',
    options: [
      'There are fewer shorter files than 100-byte ones, so some can’t get a shorter twin',
      'Today’s computers aren’t fast enough yet',
      'It can, if the method is trained on enough files',
    ],
    correct: 0,
    why: [
      'Right: that is the pigeonhole, a counting fact no method gets round.',
      'Speed has nothing to do with it; it is counting.',
      'Training changes which files shrink, never whether all of them can.',
    ],
  },
  {
    id: 'entropy-eight',
    chapter: C5,
    question: 'A file measures 7.99 bits of entropy per byte. What does that tell you?',
    options: [
      'There is almost nothing left to squeeze',
      'It will shrink to about an eighth',
      'It is plain English text',
    ],
    correct: 0,
    why: [
      'Right: near 8 bits per byte means the bytes are about as unpredictable as bytes get.',
      'That would need very low entropy, around one bit per byte.',
      'Plain text measures well under 8, because its bytes are so uneven.',
    ],
  },
  {
    id: 'lossy-meaning',
    chapter: C6,
    question: 'What makes a format lossy?',
    options: [
      'It throws some detail away for good, so the file comes back close, not exact',
      'It sometimes fails and loses the whole file',
      'It is slower to unpack',
    ],
    correct: 0,
    why: [
      'Right: the loss is chosen and permanent, in exchange for a smaller file.',
      'Lossy formats are reliable; the loss is on purpose, not an accident.',
      'Speed is a different question from what comes back.',
    ],
  },
  {
    id: 'lossy-repeats',
    chapter: C6,
    question: 'Why does a picture with fewer shades pack so much smaller?',
    options: [
      'Neighbouring pixels now match, which makes repeats and common bytes',
      'Each pixel now takes fewer than eight bits on the disk directly',
      'The picture gets smaller in width and height',
    ],
    correct: 0,
    why: [
      'Right: rounding makes nearby pixels equal, and the lossless pair feeds on that.',
      'The bytes are the same size; they just repeat more, which the pair then shrinks.',
      'The picture keeps its size; only its detail changes.',
    ],
  },
  {
    id: 'lossy-text',
    chapter: C6,
    question: 'A colleague wants to send the invoice spreadsheet lossily to save space. What do you say?',
    options: [
      'No: a changed digit is a wrong invoice; numbers need lossless packing',
      'Fine, if the average difference is small',
      'Fine, since lossy is just stronger compression',
    ],
    correct: 0,
    why: [
      'Right: lossy suits what eyes forgive, never figures.',
      'A small average difference can still change one price completely.',
      'Lossy is not stronger, it is different: it changes what comes back.',
    ],
  },
  {
    id: 'bench-random',
    chapter: C7,
    question: 'On a tight budget, what is the best setting for a file of random bytes?',
    options: ['Send it as it is', 'The strongest packing on offer', 'Lossy, to make room'],
    correct: 0,
    why: [
      'Right: any packing only adds bytes to random data.',
      'Stronger packing still finds nothing to remove, and adds its tables.',
      'Random bytes might be keys or encrypted data: changing any byte breaks them.',
    ],
  },
  {
    id: 'bench-ties',
    chapter: C7,
    question: 'Two plans both fit tonight’s budget, one a few bytes smaller. Is the bigger one wrong?',
    options: [
      'No: both meet the budget, so either works',
      'Yes: only the smallest plan counts',
      'Yes: plans that fit must be identical',
    ],
    correct: 0,
    why: [
      'Right: a budget is a limit, and every plan within it works.',
      'Shaving bytes below the budget buys nothing tonight.',
      'Different settings can land under the same limit.',
    ],
  },
  {
    id: 'bench-quality',
    chapter: C7,
    question: 'The smallest setting for the picture breaks the difference limit. What do you do?',
    options: [
      'Step back to the most loss the limit allows, and save elsewhere',
      'Ship it anyway: size is what matters',
      'Send the picture as it is instead',
    ],
    correct: 0,
    why: [
      'Right: lose only what the quality budget allows.',
      'A budget has two limits; breaking either one fails the send.',
      'Sending it raw wastes the room a little loss would free.',
    ],
  },
];
