// Structured outputs' recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-asking-nicely',
  C2 = '02-a-schema-is-a-contract',
  C3 = '03-the-mask',
  C4 = '04-tokens-are-not-characters',
  C5 = '05-choices-from-a-list',
  C6 = '06-valid-isnt-right',
  C7 = '07-workbench';

const ITEMS: RecallItem[] = [
  // 1. Asking nicely
  {
    id: 'prompt-is-not-a-guarantee',
    chapter: C1,
    question: 'An invoice bot is told “Reply only in CSV.” In testing it always does. What is the risk in production?',
    options: [
      'None: if it always did in testing, it always will',
      'One answer in many can still break the format, and whatever reads it breaks too',
      'CSV is harder than JSON, so it will fail often',
    ],
    correct: 1,
    why: [
      'Testing shows it is likely, not that it is certain. A prompt asks; it doesn’t enforce.',
      'Right. An instruction shifts the odds. Only something that limits what can be written makes a guarantee.',
      'The format isn’t the issue; the missing guarantee is, for CSV and JSON alike.',
    ],
  },
  {
    id: 'model-writes-what-it-learned',
    chapter: C1,
    question: 'A model trained only on support emails is asked for YAML. Why might it write an email instead?',
    options: [
      'It is refusing on purpose',
      'It writes what its training made likely, and it has never seen YAML',
      'YAML is blocked by its tokenizer',
    ],
    correct: 1,
    why: [
      'Nothing refuses: the model scores next tokens, and email text scores high.',
      'Right. As Larkspur mini wrote prose when asked for JSON: a model can only lean on the patterns it learned.',
      'A byte-level tokenizer can spell any text; YAML just isn’t likely to this model.',
    ],
  },
  {
    id: 'reader-is-a-program',
    chapter: C1,
    question: 'Why does a broken format matter more when a program, not a person, reads the answer?',
    options: [
      'Programs read faster',
      'A person can make sense of a near miss; a parser fails on one wrong character',
      'Programs ignore formatting',
    ],
    correct: 1,
    why: [
      'Speed isn’t the issue; tolerance is.',
      'Right. A person reads around a stray word; JSON.parse throws.',
      'It is the opposite: a parser depends entirely on the format.',
    ],
  },
  // 2. A schema is a contract
  {
    id: 'check-after-costs',
    chapter: C2,
    question:
      'A booking bot’s answers are validated, and a failure triggers a retry. Its bill doubles one week. What is a likely cause?',
    options: [
      'The schema check itself is expensive to run',
      'More answers failed the check, and every retry was a whole answer paid for again',
      'Validation makes the model write longer answers',
    ],
    correct: 1,
    why: [
      'A schema check is cheap code on the host. The cost is the model’s tokens.',
      'Right. A check after the answer can only send it back; each retry repeats the full cost.',
      'The model never sees the check; its answers are as long as before.',
    ],
  },
  {
    id: 'schema-says-shape',
    chapter: C2,
    question: 'What does a JSON schema for a delivery answer say?',
    options: [
      'What the delivery date really is',
      'Which fields the answer has, each one’s type and the values allowed',
      'How the model should think about the question',
    ],
    correct: 1,
    why: [
      'A schema knows nothing about the delivery; it describes the shape of an answer.',
      'Right. It is a contract on the shape: fields, types, allowed values.',
      'A schema constrains the output, not the reasoning behind it.',
    ],
  },
  {
    id: 'retry-no-guarantee',
    chapter: C2,
    question: 'A team sets up to five retries. Does that guarantee a valid answer?',
    options: [
      'Yes, five is always enough',
      'No: each retry is another draw that can fail too, and the fifth failure still leaves nothing',
      'Yes, because the model learns from each failure',
    ],
    correct: 1,
    why: [
      'Larkspur mini failed every try; nothing caps how many a draw can fail.',
      'Right. Retries lower the odds of failure without ever reaching zero, and they add cost and delay.',
      'Nothing is learned between tries; the weights don’t change.',
    ],
  },
  // 3. The mask
  {
    id: 'mask-is-the-guarantee',
    chapter: C3,
    pin: true, // the module's single most important idea
    question: 'A provider promises answers that always match your schema. How can it promise that?',
    options: [
      'It checks each answer and retries until one passes',
      'At every step it blocks the tokens the schema doesn’t allow, so nothing else can be written',
      'Its models are trained never to make format mistakes',
    ],
    correct: 1,
    why: [
      'Retries can fail forever; they can’t back a promise.',
      'Right. A mask over the vocabulary at each step: only text the schema accepts can come out.',
      'Training lowers the odds; only the mask makes it certain.',
    ],
  },
  {
    id: 'blocked-mass-moves',
    chapter: C3,
    question: 'At one step the model’s favourite token is blocked. What does it write?',
    options: [
      'The blocked token, flagged as an error',
      'The likeliest allowed token: the blocked ones’ probability is shared out over the allowed ones',
      'Nothing until the schema changes',
    ],
    correct: 1,
    why: [
      'A blocked token has zero probability; it can’t be written.',
      'Right. The mask removes blocked tokens and rescales the rest, keeping their order.',
      'Every step writes a token; a schema compiler makes sure one is always allowed.',
    ],
  },
  {
    id: 'mask-changes-each-step',
    chapter: C3,
    question: 'Is the set of allowed tokens the same at every step of an answer?',
    options: [
      'Yes, the schema is fixed so the mask is too',
      'No: it depends on what has been written so far, e.g. only a brace at the start, only a value’s letters inside it',
      'Yes, it is every token in the schema’s field names',
    ],
    correct: 1,
    why: [
      'The schema is fixed, but where the answer stands in it moves every step.',
      'Right. The mask is worked out fresh from the grammar’s state at each step.',
      'Field names are only part of it; values, quotes and braces each have their turn.',
    ],
  },
  // 4. Tokens are not characters
  {
    id: 'every-byte-checked',
    chapter: C4,
    question: 'A field allows letters only. Is the token “ The” (with a leading space) allowed inside it?',
    options: [
      'Yes: it is mostly letters',
      'No: the mask checks every byte, and the space breaks the rule',
      'Yes: only a token’s first character is checked',
    ],
    correct: 1,
    why: [
      'Mostly isn’t enough; one bad byte blocks the whole token.',
      'Right. A token passes only if all of its bytes keep the grammar valid.',
      'Checking only the first character would let a token smuggle a forbidden one in behind it.',
    ],
  },
  {
    id: 'cap-blocks-long-tokens',
    chapter: C4,
    question: 'A name field has 3 characters of room left. Which tokens can still be written?',
    options: [
      'Any token starting with a letter',
      'Tokens of up to 3 allowed characters, or the closing quote',
      'Only single characters',
    ],
    correct: 1,
    why: [
      'A 6-letter token would run past the cap; it is blocked even though its first letter fits.',
      'Right. The whole token has to fit in the room left.',
      'Two- and three-character tokens fit too, so they stay allowed.',
    ],
  },
  {
    id: 'trailing-space',
    chapter: C4,
    question:
      'A prompt template ends with a space: “Answer: ”. The model’s first words come out odd. Why, and what fixes it?',
    options: [
      'The space is invisible to the model; the template is fine',
      'Words usually carry their space at the front of the token, so a lone trailing space is a split the model rarely saw; token healing backs up over it',
      'The model can’t read punctuation before a space',
    ],
    correct: 1,
    why: [
      'The space is its own token, and it changes what the model predicts next.',
      'Right. Token healing lets the first token start with the space, the way training text was split.',
      'Punctuation is read fine; the problem is where the token boundary falls.',
    ],
  },
  // 5. Choices from a list
  {
    id: 'enum-gives-pick',
    chapter: C5,
    question: 'A priority field changes from free text to a list: low, medium, high. What changes?',
    options: [
      'The model now knows each ticket’s true priority',
      'Every answer is one of the three values; which one follows the model’s preference among them',
      'Nothing: the model may still write “urgent”',
    ],
    correct: 1,
    why: [
      'A list adds no knowledge; it limits what can be written.',
      'Right. A free answer becomes a pick, which the program can always act on.',
      'Under the mask, “urgent” is blocked: tokens outside the list can’t be written.',
    ],
  },
  {
    id: 'preference-not-knowledge',
    chapter: C5,
    question: 'Larkspur mini picks “delayed” for an order it has never heard of. Where does that pick come from?',
    options: [
      'The order system',
      'Its preference from training text, at the step where the values part ways',
      'The order of the values in the list',
    ],
    correct: 1,
    why: [
      'The model can’t see the order system; only a tool call could.',
      'Right. The allowed tokens split the probability, and the likeliest value wins.',
      'The order didn’t decide it: “delayed” was second in the list.',
    ],
  },
  {
    id: 'draws-vary',
    chapter: C5,
    question: 'The same prompt and list give “on time” once and “delayed” the next time. How?',
    options: [
      'The schema changed between runs',
      'Each answer was a random draw by the values’ shares, not the likeliest pick',
      'The mask failed once',
    ],
    correct: 1,
    why: [
      'Nothing changed in the schema; the draw did.',
      'Right. With sampling, a less likely value still comes up in proportion to its share.',
      'Both answers fit the schema; the mask worked both times.',
    ],
  },
  // 6. Valid isn't right
  {
    id: 'valid-not-true',
    chapter: C6,
    question: 'A schema forces an “amount” field. The model doesn’t know the amount. What comes back?',
    options: ['An error saying the amount is unknown', 'A valid number that is probably wrong', 'An empty field'],
    correct: 1,
    why: [
      'The mask allows only numbers there, so it can’t say “unknown” unless the schema allows it.',
      'Right. The mask forces a well-formed value; nothing makes it true.',
      'A required number can’t be empty; the mask makes the model write one.',
    ],
  },
  {
    id: 'cut-off-breaks',
    chapter: C6,
    question: 'A JSON answer stops at the output token limit halfway through. What does the program get?',
    options: [
      'Valid JSON with the fields so far',
      'Text that doesn’t parse: an object that never closed',
      'The model finishes it on the next request automatically',
    ],
    correct: 1,
    why: [
      'Half an object has no closing brace; it isn’t valid JSON.',
      'Right. Providers warn that a cut-off answer may not match the schema; check why it stopped before parsing.',
      'Nothing finishes it unless you ask again with more room.',
    ],
  },
  {
    id: 'refusal-outside-schema',
    chapter: C6,
    question: 'A request with a strict schema is refused by the model. What should the program do first?',
    options: [
      'Parse it as usual: the schema guarantees the shape',
      'Check whether it is a refusal before parsing, because a refusal may not follow the schema',
      'Retry until the model agrees',
    ],
    correct: 1,
    why: [
      'Providers say the refusal takes precedence over the schema, so parsing blindly can fail.',
      'Right. Look at the stop reason or refusal field, then parse.',
      'Retrying a refusal mostly repeats it, and costs every time.',
    ],
  },
  // 7. Workbench
  {
    id: 'facts-from-the-system',
    chapter: C7,
    question: 'A shipping bot’s schema has: carrier, tracking number, and a reply tone. Which should the model fill?',
    options: [
      'All three: the mask keeps them valid',
      'The tone: it is the model’s decision; carrier and tracking come from the order system',
      'None: models shouldn’t fill schemas',
    ],
    correct: 1,
    why: [
      'Valid isn’t right: a forced tracking number is a guess.',
      'Right. A schema is for what the model decides; facts come from the system that holds them.',
      'The model’s decisions belong in a schema; that is what structured outputs are for.',
    ],
  },
  {
    id: 'small-schema-fits',
    chapter: C7,
    question: 'Why did asking Larkspur mini for two fields fail every order, even with lists?',
    options: [
      'Lists can’t be combined',
      'The answer needed more tokens than its window had left, so it was cut off',
      'The second field was always wrong',
    ],
    correct: 1,
    why: [
      'Two lists combine fine; the room ran out.',
      'Right. Every field costs tokens; a schema has to fit the room the answer has.',
      'It never got to be wrong: it was cut off before it closed.',
    ],
  },
  {
    id: 'read-both-columns',
    chapter: C7,
    question: 'A results table shows every answer valid, half of them right. What do you report?',
    options: [
      '100%: every answer is valid',
      '50% right: validity and correctness are measured separately',
      '0%: an answer that is wrong is invalid',
    ],
    correct: 1,
    why: [
      'Valid only means the shape fits; it says nothing about the values.',
      'Right. Report both, and fix correctness with knowledge or tools, not the mask.',
      'A wrong answer can be perfectly valid, which is chapter 6’s point.',
    ],
  },
];

/** The items are written with the answer second; turn each one's options so the answer's place varies from item to item. */
function rotate(it: RecallItem, k: number): RecallItem {
  const n = it.options.length,
    by = (k + n - it.correct) % n;
  const turn = (xs: string[]) => xs.map((_, i) => xs[(i - by + n) % n]);
  return { ...it, options: turn(it.options), why: turn(it.why), correct: (it.correct + by) % n };
}
// the pinned item goes first in the bank, as the registry test asks (sort is stable, so the rest keep their order)
export const RECALL: RecallItem[] = ITEMS.map(rotate).sort((a, b) => Number(!!b.pin) - Number(!!a.pin));
