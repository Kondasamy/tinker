// Writing a prompt's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  continues: '01-it-only-continues',
  say: '02-say-what-you-want',
  show: '03-show-dont-tell',
  shape: '04-put-it-in-a-shape',
  order: '05-order-and-emphasis',
  test: '06-test-it-like-code',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 6. Test it like code (pinned: the module's one idea)
  {
    id: 'question-set',
    chapter: C.test,
    pin: true,
    question: 'You reword a prompt and the reply you were looking at improves. How do you know the change is better?',
    options: [
      'Run both versions on the same set of graded cases and compare',
      'The reply you looked at is better, so it is',
      'Ask the model which prompt it prefers',
      'Check that the new prompt is longer and more detailed',
    ],
    correct: 0,
    why: [
      'Right: a prompt is tested like code, on fixed cases graded the same way each time.',
      'One case can improve while others you didn’t look at get worse.',
      'A model’s preference isn’t a measurement of its replies.',
      'Length is a cost, not a sign of quality; extra words can help or hurt.',
    ],
  },
  {
    id: 'per-model',
    chapter: C.test,
    question: 'Your prompt passes every case on one model. Finance wants to switch to a cheaper model. What now?',
    options: [
      'Rerun the question set on the cheaper model before switching',
      'Switch: a prompt that works works everywhere',
      'Switch, and make the prompt longer to be safe',
    ],
    correct: 0,
    why: [
      'Right: a prompt’s results belong to the model they were measured on.',
      'Models differ; the same prompt can pass fewer cases on another one.',
      'Longer isn’t safer; only rerunning the cases tells you.',
    ],
  },
  {
    id: 'grader',
    chapter: C.test,
    question: 'What does a grader in a prompt’s question set do?',
    options: [
      'Checks each reply against what that case needs, the same way every time',
      'Writes a better reply for the model to copy',
      'Rewrites the prompt until it passes',
    ],
    correct: 0,
    why: [
      'Right: a grader is a fixed check, so two prompt versions are scored alike.',
      'That would be an example, not a grader; graders only check.',
      'Changing the prompt is your job; the grader only scores it.',
    ],
  },
  // 1. It only continues text
  {
    id: 'base-continues',
    chapter: C.continues,
    question: 'A model trained only on recipes gets “Translate this into French:”. What does it most likely write?',
    options: ['More recipe-like text', 'A French translation', 'A refusal saying it can’t translate'],
    correct: 0,
    why: [
      'Right: a plain model continues text with what its training made likeliest.',
      'Following instructions is a skill it was never trained on.',
      'Refusing is also a learned behaviour; a plain model just continues.',
    ],
  },
  {
    id: 'instruction-tuning',
    chapter: C.continues,
    question: 'What makes a chat model follow instructions where a plain one doesn’t?',
    options: [
      'Extra training on instructions paired with good replies',
      'A longer prompt',
      'A bigger vocabulary of words',
    ],
    correct: 0,
    why: [
      'Right: instruction tuning teaches it that an instruction is followed by an answer.',
      'More text gives a plain model more to continue, not a new skill.',
      'Knowing more words doesn’t teach it what to do with an instruction.',
    ],
  },
  {
    id: 'prompt-is-text',
    chapter: C.continues,
    question: 'Underneath, what is a prompt to the model?',
    options: [
      'Text it writes the next words after',
      'A command it runs step by step',
      'A search query over its training documents',
    ],
    correct: 0,
    why: [
      'Right: every model, chat or not, predicts what comes after the text it is given.',
      'Nothing runs the prompt like a program; the model writes what plausibly follows.',
      'The model keeps no copy of its documents to search, only learned patterns.',
    ],
  },
  // 2. Say what you want
  {
    id: 'clear-task',
    chapter: C.say,
    question: 'A prompt asks “Write a product description.” The copy never mentions the battery life you sell on. Fix?',
    options: [
      'Say who it is for and that it must state the battery life',
      'Add “You are a world-class copywriter.”',
      'Ask for three versions and pick one',
    ],
    correct: 0,
    why: [
      'Right: a clear task says what the reply must contain.',
      'A role changes the voice, but the model still can’t guess what matters to you.',
      'Three guesses are still guesses; none is told about the battery.',
    ],
  },
  {
    id: 'invented',
    chapter: C.say,
    question: 'A vague support prompt gets a confident reply with a phone number nobody gave it. What happened?',
    options: [
      'The model filled the gap with something plausible',
      'The model looked the number up online',
      'The number came from the customer’s ticket',
    ],
    correct: 0,
    why: [
      'Right: missing facts get filled with likely-sounding ones, so give the facts in the prompt.',
      'A model writing a reply doesn’t browse; it writes what sounds right.',
      'If the ticket had it, it wouldn’t be invented; this one was made up.',
    ],
  },
  {
    id: 'role-not-enough',
    chapter: C.say,
    question: 'What does a role line such as “You write replies for Acme’s support desk” mostly change?',
    options: ['The reply’s voice and stance', 'Which facts the model knows', 'Whether the reply is correct'],
    correct: 0,
    why: [
      'Right: a role sets who is speaking, not what the facts are.',
      'Naming a company doesn’t give the model its policies.',
      'A reply can sound on-brand and still be wrong.',
    ],
  },
  // 3. Show, don't tell
  {
    id: 'examples-style',
    chapter: C.show,
    question: 'Your team’s replies have a tone that’s hard to describe. Quickest way to get it?',
    options: [
      'Put a few real replies in the prompt as examples',
      'Describe the tone in a long paragraph',
      'Ask for a friendly tone',
    ],
    correct: 0,
    why: [
      'Right: examples show a style the model copies, no description needed.',
      'A description can work, but it takes many words and still leaves room to guess.',
      'Friendly is one word for many tones; the model picks its own.',
    ],
  },
  {
    id: 'quirk-copied',
    chapter: C.show,
    question: 'Every example in a prompt happens to end with a joke. What will replies do?',
    options: ['Often end with a joke too', 'Ignore it: jokes aren’t part of the task', 'Refuse to joke'],
    correct: 0,
    why: [
      'Right: a model copies what all its examples share, wanted or not.',
      'The model can’t tell which shared habits you meant; it copies them all.',
      'Nothing in the examples asks for refusing; they show the opposite.',
    ],
  },
  {
    id: 'vary-examples',
    chapter: C.show,
    question: 'How should you pick the examples in a prompt?',
    options: [
      'Vary them, so the only thing they share is what you want',
      'Pick the three most similar, for consistency',
      'Pick the longest, so it learns more',
    ],
    correct: 0,
    why: [
      'Right: whatever every example shares gets copied, so share only the intended parts.',
      'Similar examples share accidental habits too, and those get copied.',
      'Long examples cost tokens and can push replies longer.',
    ],
  },
  // 4. Put it in a shape
  {
    id: 'json-for-programs',
    chapter: C.shape,
    question: 'A spreadsheet tool needs a model’s answer as a name and a price. Which shape?',
    options: ['JSON with a name field and a price field', 'A friendly sentence with both in it', 'A bulleted list'],
    correct: 0,
    why: [
      'Right: named fields are what a program can parse reliably.',
      'A sentence reads well to people but a program has to guess where each value is.',
      'A list helps people; the program still has to guess which line is which.',
    ],
  },
  {
    id: 'asking-not-enforcing',
    chapter: C.shape,
    question: 'Your prompt asks for JSON and it worked in testing. Is that enough for a program in production?',
    options: [
      'No: parse strictly, and use structured outputs where offered',
      'Yes: it worked, so it always will',
      'Yes, if the prompt says JSON in capitals',
    ],
    correct: 0,
    why: [
      'Right: a format line asks; only a check, or a schema the model must follow, makes it sure.',
      'A model can add text or break the shape on a rare reply.',
      'Emphasis makes slips rarer, not impossible.',
    ],
  },
  {
    id: 'format-line',
    chapter: C.shape,
    question: 'What does a format line in a prompt do?',
    options: ['Says the shape the reply must take', 'Guarantees the reply parses', 'Changes the facts in the reply'],
    correct: 0,
    why: [
      'Right: it describes the shape, such as three lines or JSON.',
      'It asks for a shape; nothing in a prompt can guarantee it.',
      'The task and the facts you give decide content; the format line decides shape.',
    ],
  },
  // 5. Order and emphasis
  {
    id: 'rule-last',
    chapter: C.order,
    question: 'A long prompt has a must-follow rule near the top, then pages of documents. Where should the rule go?',
    options: [
      'Also at the end, after the documents',
      'Only at the top: it is read first',
      'In the middle of the documents',
    ],
    correct: 0,
    why: [
      'Right: models use the end of a long input best, and then you test it.',
      'Read first isn’t used best; pages after it can drown it out.',
      'The middle of a long input is where models use information worst.',
    ],
  },
  {
    id: 'simulated-label',
    chapter: C.order,
    question: 'A chapter’s replies are simulated by stated rules. What does that tell you?',
    options: [
      'The effect is true because a rule makes it so; the cited research is the evidence',
      'A real model was measured doing this',
      'The replies are random',
    ],
    correct: 0,
    why: [
      'Right: a simulation shows a known behaviour; it measures nothing itself.',
      'Simulated means no model wrote them, so nothing was measured.',
      'The rules are fixed, so the same prompt always gets the same reply.',
    ],
  },
  {
    id: 'test-order',
    chapter: C.order,
    question: 'A strong model kept your rule wherever you put it. What follows?',
    options: [
      'Keep the rule last anyway, and test the order you ship',
      'Order never matters',
      'Put rules on top from now on',
    ],
    correct: 0,
    why: [
      'Right: one model in one test isn’t every model or every prompt length.',
      'One result doesn’t make position irrelevant for longer prompts or other models.',
      'Nothing showed the top was better; the end is the safer default.',
    ],
  },
  // 7. Workbench
  {
    id: 'tokens-cost',
    chapter: C.bench,
    question: 'Two prompts pass every test case. One is twice as long. Which ships?',
    options: [
      'The shorter: every token is paid for on every request',
      'The longer: more detail is safer',
      'Either: length is free',
    ],
    correct: 0,
    why: [
      'Right: with quality equal, the shorter prompt costs less and runs faster.',
      'If the extra detail added no passes, it only adds cost.',
      'Prompts are priced by tokens, on every single request.',
    ],
  },
  {
    id: 'examples-earn',
    chapter: C.bench,
    question: 'Adding examples to a passing prompt changes no results. Keep them?',
    options: [
      'Drop them: they cost tokens and add nothing here',
      'Keep them: examples always help',
      'Add more until something changes',
    ],
    correct: 0,
    why: [
      'Right: a part that adds no passes is only cost.',
      'Examples help when the model needs a style or shape shown; here it didn’t.',
      'Adding parts at random makes the prompt longer, not better.',
    ],
  },
  {
    id: 'before-shipping',
    chapter: C.bench,
    question: 'Your prompt passes your six test cases. What comes next?',
    options: [
      'Grow the set with more real cases and rerun on the model you ship',
      'Ship: six of six is proof',
      'Reword it until it sounds better',
    ],
    correct: 0,
    why: [
      'Right: six cases are a start; more cases catch what they miss.',
      'Six cases can’t cover every customer you will see.',
      'Sounding better isn’t passing more; only the cases tell you.',
    ],
  },
];
