// Text and Unicode's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's edge: every character is a number, UTF-8 writes it in 1 to 4 bytes, and text breaks
// when the reader uses a different table from the writer.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-letters-are-numbers',
  C2 = '02-one-number-for-every-character',
  C3 = '03-utf-8',
  C4 = '04-the-wrong-table',
  C5 = '05-one-emoji-many-numbers',
  C6 = '06-same-look-different-bytes',
  C7 = '07-workbench';

export const RECALL: RecallItem[] = [
  {
    id: 'reader-table',
    chapter: C4,
    pin: true,
    question: 'A supplier’s invoice shows “MÃ¼ller” where the order said “Müller”. Where is the bug?',
    options: [
      'The reader used a different table from the writer: UTF-8 bytes read as Latin-1',
      'The invoice file lost the umlaut on the way',
      'The supplier’s font has no ü',
    ],
    correct: 0,
    why: [
      'Right: ü’s two UTF-8 bytes were read as two Latin-1 characters; the bytes themselves are fine.',
      'Nothing was lost: Ã and ¼ are ü’s two bytes, read with the wrong table.',
      'A letter missing from the font shows as a box or a blank, never as a regular pair like Ã¼.',
    ],
  },
  {
    id: 'letters-numbers',
    chapter: C1,
    question: 'A colleague asks what a text file holds, deep down. What do you say?',
    options: [
      'Numbers, one or more per character, and a table says which is which',
      'Tiny pictures of each letter',
      'The letters themselves, which the disk can store directly',
    ],
    correct: 0,
    why: [
      'Right: a file holds only numbers; a character table turns them into letters.',
      'Pictures of letters come from a font when the text is shown, not from the file.',
      'A disk stores only bits; letters exist only through a table that numbers them.',
    ],
  },
  {
    id: 'ascii-size',
    chapter: C1,
    question: 'Why can’t plain ASCII store the name “Zoë”?',
    options: [
      'ASCII’s 128 characters have no ë',
      'ASCII can’t store capital letters',
      'Names need a database, not a character table',
    ],
    correct: 0,
    why: [
      'Right: ASCII covers English letters, digits and punctuation only, numbered 0 to 127.',
      'Capital letters are in ASCII: Z is 90.',
      'A database still stores the name as numbers from some character table.',
    ],
  },
  {
    id: 'byte-row',
    chapter: C1,
    question: 'In ASCII, how many bytes does the word “pallet” take?',
    options: ['Six, one per letter', 'One for the whole word', 'Forty-eight'],
    correct: 0,
    why: [
      'Right: each ASCII letter is one byte.',
      'A byte holds one number from 0 to 255, so one letter, not a word.',
      'Forty-eight is the bits: six bytes of eight bits each.',
    ],
  },
  {
    id: 'one-table',
    chapter: C2,
    question: 'A Greek customer’s name shows the same in the shop, the warehouse and the bank. Why?',
    options: [
      'Unicode gives each Greek letter one code point every program shares',
      'Each program ships its own Greek table, and they happen to agree',
      'Greek letters are stored as pictures',
    ],
    correct: 0,
    why: [
      'Right: one table, one number per character, for every program.',
      'Separate tables per program were the problem Unicode replaced.',
      'Text is stored as numbers; pictures come from fonts when it is shown.',
    ],
  },
  {
    id: 'past-255',
    chapter: C2,
    question: 'The 🙂 emoji is code point U+1F642. Can one byte hold that number?',
    options: ['No: it is far past 255', 'Yes: emoji are small numbers', 'Only on phones'],
    correct: 0,
    why: [
      'Right: U+1F642 is 128,578, and a byte stops at 255.',
      'Emoji sit high in Unicode, past U+FFFF.',
      'Code points are the same on every device; only the drawing changes.',
    ],
  },
  {
    id: 'code-point',
    chapter: C2,
    question: 'What does “U+00EB” name?',
    options: ['A character’s code point, here ë', 'A byte in a file', 'A font'],
    correct: 0,
    why: [
      'Right: U+ then a base-16 number is how Unicode writes a code point; 00EB is ë.',
      'Bytes are how UTF-8 writes the code point, which can take several.',
      'Fonts draw characters; code points name them.',
    ],
  },
  {
    id: 'ascii-unchanged',
    chapter: C3,
    question: 'An old system only understands ASCII. Can it read a UTF-8 file of plain English?',
    options: [
      'Yes: UTF-8 writes ASCII characters as the same single bytes',
      'No: UTF-8 doubles every byte',
      'Only after converting the file',
    ],
    correct: 0,
    why: [
      'Right: plain English in UTF-8 is byte for byte the same as ASCII.',
      'UTF-8 keeps ASCII at one byte; two bytes each is UTF-16, a different scheme.',
      'There is nothing to convert: the bytes are already identical.',
    ],
  },
  {
    id: 'utf8-widths',
    chapter: C3,
    question: 'Which takes the most bytes in UTF-8?',
    options: ['🙂', '中', 'é'],
    correct: 0,
    why: [
      'Right: 🙂 is past U+FFFF, so it takes four bytes.',
      '中 takes three bytes: it is below U+FFFF.',
      'é takes two bytes.',
    ],
  },
  {
    id: 'lead-byte',
    chapter: C3,
    question: 'A program reads a UTF-8 byte starting 1110. What does it know?',
    options: [
      'It starts a character three bytes long',
      'It is an ASCII letter',
      'It is a mistake: bytes never start with 1',
    ],
    correct: 0,
    why: [
      'Right: a lead byte’s top bits say how many bytes the character takes.',
      'ASCII bytes start with 0.',
      'Every byte past ASCII starts with 1; that is how UTF-8 marks them.',
    ],
  },
  {
    id: 'same-bytes',
    chapter: C4,
    question: 'A label prints “cafÃ©”. Should you fix the bytes in the database?',
    options: [
      'No: the bytes are right; fix the program reading them',
      'Yes: replace Ã© with é in every row',
      'Yes: strip all accents so it can’t happen again',
    ],
    correct: 0,
    why: [
      'Right: the stored UTF-8 is fine; the reader’s table is wrong.',
      'Rewriting good bytes to suit a broken reader breaks every correct reader.',
      'Stripping accents changes people’s names and hides the real bug.',
    ],
  },
  {
    id: 'signature',
    chapter: C4,
    question: 'Which sign in garbled text most often means UTF-8 read as Latin-1?',
    options: ['Ã or Â followed by another symbol', 'A row of question marks', 'Empty boxes'],
    correct: 0,
    why: [
      'Right: UTF-8’s two-byte lead bytes show up as Ã or Â in Latin-1.',
      'Question marks usually mean the reader couldn’t map a character at all.',
      'Boxes mean the font has no picture for a character the text does hold.',
    ],
  },
  {
    id: 'emoji-length',
    chapter: C5,
    question: 'A username box limits .length to 10. Why might 6 emoji be refused?',
    options: [
      '.length counts 16-bit code units, and most emoji take two each',
      'Emoji are not allowed in usernames',
      'The box counts bytes',
    ],
    correct: 0,
    why: [
      'Right: past U+FFFF a character is two code units, so six emoji count as twelve.',
      'Nothing in Unicode forbids emoji; the count is what tripped.',
      'JavaScript’s .length counts code units, not bytes.',
    ],
  },
  {
    id: 'grapheme',
    chapter: C5,
    question: 'How do you count what a person sees as characters?',
    options: ['Count graphemes, with Intl.Segmenter', 'Count .length', 'Count bytes and divide by two'],
    correct: 0,
    why: [
      'Right: graphemes are what readers see; Intl.Segmenter splits them.',
      '.length counts code units, which overcounts emoji and accents.',
      'Bytes per character vary from one to four, and a grapheme can be many.',
    ],
  },
  {
    id: 'zwj',
    chapter: C5,
    question: 'A family emoji is several people joined. What joins them?',
    options: ['Zero-width joiners between the people', 'A special font', 'Nothing: it is one code point'],
    correct: 0,
    why: [
      'Right: invisible U+200D joiners glue the people into one picture.',
      'Fonts draw the joined picture, but the joiners are in the text.',
      'It is several code points, which is why its lengths differ.',
    ],
  },
  {
    id: 'normalise',
    chapter: C6,
    question: 'A login fails for “Renée” typed on one device, though the account is “Renée”. First thing to try?',
    options: [
      'Normalise both to NFC before comparing',
      'Make passwords case-insensitive',
      'Tell the user to retype more carefully',
    ],
    correct: 0,
    why: [
      'Right: the é may be one code point or e plus an accent; NFC makes them the same.',
      'Case has nothing to do with it: the letters look the same but differ in code points.',
      'The user typed it right; their device sent another form of the same letter.',
    ],
  },
  {
    id: 'homograph',
    chapter: C6,
    question: 'An email links to an address that looks exactly like yours. What could be going on?',
    options: [
      'A lookalike letter from another script: a homograph',
      'Nothing: if it looks the same, it is the same',
      'The font is drawing it differently',
    ],
    correct: 0,
    why: [
      'Right: a Cyrillic а looks like a Latin a but is another code point.',
      'Computers compare code points, not looks, so a lookalike is a different address.',
      'The font draws both the same way; that is exactly the trick.',
    ],
  },
  {
    id: 'nfc-limits',
    chapter: C6,
    question: 'Does normalising to NFC turn a Cyrillic а into a Latin a?',
    options: [
      'No: they are different letters, not two forms of one',
      'Yes: NFC merges lookalikes',
      'Only in web addresses',
    ],
    correct: 0,
    why: [
      'Right: NFC joins forms of the same letter; lookalikes are different letters.',
      'Spotting lookalikes takes a separate check against Unicode’s list of lookalike letters.',
      'NFC works the same on any text.',
    ],
  },
  {
    id: 'count-store',
    chapter: C7,
    question: 'A database column holds 100 bytes. What should the form’s limit count?',
    options: ['Bytes, after normalising', 'Graphemes', 'JavaScript’s .length'],
    correct: 0,
    why: [
      'Right: count what the store counts, so nothing the form accepts can overflow.',
      'One grapheme can hold any number of accents, so it has no byte limit.',
      '.length counts code units, and one can be three bytes of UTF-8.',
    ],
  },
  {
    id: 'code-point-limit',
    chapter: C7,
    question: 'A form allows 25 code points. At most how many UTF-8 bytes can that be?',
    options: ['100', '25', '50'],
    correct: 0,
    why: [
      'Right: a code point takes up to four bytes.',
      'One byte each holds only for ASCII.',
      'Two bytes each covers Greek or Cyrillic, but not Chinese or emoji.',
    ],
  },
  {
    id: 'normalise-match',
    chapter: C7,
    question: 'Two sign-ups for “José Núñez” didn’t merge. Which setting would have caught it?',
    options: ['Normalising to NFC before saving', 'A shorter name limit', 'Counting graphemes'],
    correct: 0,
    why: [
      'Right: one was typed with combining accents; NFC makes both the same code points.',
      'A shorter limit turns names away; it doesn’t make two forms match.',
      'Counting graphemes changes the limit, not what is stored.',
    ],
  },
];
