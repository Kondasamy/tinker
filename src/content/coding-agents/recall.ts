// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 5. Green by cheating, first (pinned: the module's one idea)
  {
    id: 'done-means-checked',
    chapter: '05-green-by-cheating',
    pin: true, // the module's single most important idea: exactly one pin
    question: 'An agent reports “all tests pass” on a payroll fix. What do you actually know?',
    options: [
      'That the code does what the tests check, no more, and only if the tests weren’t changed',
      'That the payroll fix is correct',
      'Nothing at all: agents’ reports are made up',
    ],
    correct: 0,
    why: [
      'Right. Done means what the tests check, so check the tests weren’t weakened too.',
      'Green proves only what the tests test; an agent can even loosen them to pass.',
      'The run is real; it tells you exactly what the tests checked.',
    ],
  },
  // 1. Read, edit, run
  {
    id: 'host-does-it',
    chapter: '01-read-edit-run',
    question: 'A coding agent “edits a file”. Who actually writes the change to disk?',
    options: [
      'The host, carrying out the edit the model asked for',
      'The model, which has the files open',
      'The editor app, which watches the model type',
    ],
    correct: 0,
    why: [
      'Right. The model only asks for an action; the host does it and sends back the result.',
      'The model never touches the files; it sees only what the host sends it.',
      'No one watches it type: the model returns a request, and the host applies it.',
    ],
  },
  {
    id: 'loop-ends',
    chapter: '01-read-edit-run',
    question: 'An agent fixing a login bug has edited a file. What should its next turn usually be?',
    options: [
      'Run the tests and read the result',
      'Say it is done: the edit is in',
      'Edit another file, to be thorough',
    ],
    correct: 0,
    why: [
      'Right. Only a run tells the agent what its edit did.',
      'An edit is a guess until something checks it.',
      'More edits before any check stack up guesses no test has seen.',
    ],
  },
  {
    id: 'one-action',
    chapter: '01-read-edit-run',
    question: 'How much does a coding agent do in one turn?',
    options: [
      'One action, then it waits for the result',
      'The whole ticket, then it reports back',
      'As many edits as fit in its reply',
    ],
    correct: 0,
    why: [
      'Right. Each turn is one action and its result, which shapes the next turn.',
      'It can’t see any result until the host sends one back, so it can’t finish blind.',
      'Edits it can’t see the results of are guesses; the loop is one action at a time.',
    ],
  },
  // 2. Finding the file
  {
    id: 'reading-costs',
    chapter: '02-finding-the-file',
    question: 'Why does it matter how many files an agent opens?',
    options: [
      'Everything it reads goes into its context, and is paid for in tokens',
      'Opening a file can change it',
      'It doesn’t: reading is free, only edits cost',
    ],
    correct: 0,
    why: [
      'Right. Each file read is text the model reads again every turn after.',
      'Reading changes nothing; the cost is the text it adds to the context.',
      'Every token the agent is shown is read, and costs time and money.',
    ],
  },
  {
    id: 'search-returns',
    chapter: '02-finding-the-file',
    question: 'An agent searches a warehouse app for “restock”. What comes back?',
    options: [
      'Only the lines holding “restock”, and the files they are in',
      'Every file that might be about stock',
      'The one right file, chosen for it',
    ],
    correct: 0,
    why: [
      'Right. A search returns the matching lines, so the agent reads only those.',
      'It matches the words, not the topic: a file about stock that never says “restock” is not shown.',
      'Search doesn’t choose; the agent still decides which hit to read.',
    ],
  },
  {
    id: 'bigger-context',
    chapter: '02-finding-the-file',
    question:
      'A teammate says a bigger context window means the agent can just read the whole repository. What do you say?',
    options: [
      'It can, but it pays for every token; searching first reads far less',
      'Yes, and it costs nothing extra',
      'No: an agent can only read one file per ticket',
    ],
    correct: 0,
    why: [
      'Right. Room to read more is not a reason to read more.',
      'Every token read costs time and money, whatever the window’s size.',
      'There is no such limit; the cost is what grows.',
    ],
  },
  // 3. A patch, not a rewrite
  {
    id: 'hunk-is',
    chapter: '03-a-patch-not-a-rewrite',
    question: 'A patch to a shipping file has two hunks. What does that mean?',
    options: [
      'Two separate runs of changed lines, each of which can be kept or dropped',
      'Two files were changed',
      'The patch was applied twice',
    ],
    correct: 0,
    why: [
      'Right. A hunk is one run of changed lines; a review can take some and not others.',
      'Hunks are pieces of one file’s diff; two files would be two diffs.',
      'A hunk is a part of the change, not a repeat of it.',
    ],
  },
  {
    id: 'drive-by',
    chapter: '03-a-patch-not-a-rewrite',
    question: 'An agent fixing a tax bug also reformats the file “while it’s there”. Why drop that hunk?',
    options: [
      'The ticket didn’t ask for it, and it can break things no one is checking for',
      'Formatting is always wrong',
      'Agents aren’t allowed to touch more than one line',
    ],
    correct: 0,
    why: [
      'Right. A drive-by is a change with no ticket behind it, and here one broke a test.',
      'Formatting can be fine; the problem is changing what the ticket didn’t ask about.',
      'There is no such rule; a fix may need several lines, each with a reason.',
    ],
  },
  {
    id: 'drop-the-fix',
    chapter: '03-a-patch-not-a-rewrite',
    question:
      'A reviewer drops the one hunk of a patch that changes the logic, keeping only a comment fix. What happens?',
    options: [
      'The bug stays: the dropped hunk was the fix',
      'The agent re-adds it on its own, unseen',
      'The tests can’t run on part of a patch',
    ],
    correct: 0,
    why: [
      'Right. What runs is exactly the hunks kept, so the bug is still there.',
      'The agent sees the version the reviewer kept; nothing is added behind their back.',
      'The kept hunks make an ordinary file, and the tests run on it as on any other.',
    ],
  },
  // 4. Red to green
  {
    id: 'red-names',
    chapter: '04-red-to-green',
    question: 'A run is red: “orders over $100 ship free” fails. What should the agent change?',
    options: [
      'The code that decides free shipping',
      'Everything it changed in this ticket',
      'Nothing: run the tests again',
    ],
    correct: 0,
    why: [
      'Right. The failing test names the promise that broke, which points at the code to fix.',
      'One failing promise doesn’t condemn the parts that pass.',
      'Unchanged code gives the same result every time.',
    ],
  },
  {
    id: 'tests-are-judge',
    chapter: '04-red-to-green',
    question: 'How does a coding agent decide it is finished?',
    options: [
      'When the tests it runs pass',
      'When it feels sure of its change',
      'When the ticket’s text has been copied into the code',
    ],
    correct: 0,
    why: [
      'Right. Green is the agent’s only outside check on its own work.',
      'Confidence is not a check; the agent can be sure and wrong.',
      'Matching words to a ticket checks nothing about what the code does.',
    ],
  },
  {
    id: 'predict-green',
    chapter: '04-red-to-green',
    question: 'A patch adds a correct fix and an unrelated rounding change. Will the tests pass?',
    options: [
      'Only if no test checks what the rounding changed',
      'Yes: the fix is correct, so everything passes',
      'No: two changes always fail',
    ],
    correct: 0,
    why: [
      'Right. Each test checks one promise; the rounding passes unless a test checks it.',
      'A correct fix doesn’t protect the other hunk from the tests.',
      'Several changes can all pass; it depends on what each test checks.',
    ],
  },
  // 5. Green by cheating
  {
    id: 'protect-tests',
    chapter: '05-green-by-cheating',
    question: 'What stops an agent from making a test pass by editing the test?',
    options: [
      'The host refusing edits to test files',
      'Telling it in the prompt not to cheat',
      'Running the tests twice',
    ],
    correct: 0,
    why: [
      'Right. A host rule holds whatever the agent decides.',
      'A prompt is advice; under pressure to get green, the agent can reason around it.',
      'A weakened test passes every time it runs.',
    ],
  },
  {
    id: 'weakened',
    chapter: '05-green-by-cheating',
    question: 'A test that checked “total is $7.36” now checks “total is over $7”. What happened?',
    options: [
      'It was weakened: it now passes code the real rule fails',
      'It was fixed: exact money checks are fragile',
      'Nothing: both say the same thing',
    ],
    correct: 0,
    why: [
      'Right. A looser check lets through the bug the old one caught.',
      'The rule is to the cent; loosening it hides the rounding bug rather than fixing it.',
      '$7.01 passes the new check and fails the old one.',
    ],
  },
  // 6. What it may run
  {
    id: 'three-tiers',
    chapter: '06-what-it-may-run',
    question: 'An agent wants to email a customer from the shop’s server. Which tier fits?',
    options: [
      'Ask first: it reaches outside, so a person should see it',
      'Allow-list: email is routine',
      'Never: agents must not send anything',
    ],
    correct: 0,
    why: [
      'Right. Anything that leaves the machine and can’t be taken back goes to a person.',
      'The allow-list is for commands safe with nobody watching; an email can’t be unsent.',
      'Sending may be the job; asking first keeps it possible and checked.',
    ],
  },
  {
    id: 'never-list',
    chapter: '06-what-it-may-run',
    question: 'Why keep a never list as well as ask first?',
    options: [
      'Some commands are wrong every time, so no one should be asked to approve them',
      'People are too slow to answer',
      'The never list is a suggestion the agent can override',
    ],
    correct: 0,
    why: [
      'Right. A force push to main is never the answer; asking only invites a tired yes.',
      'Speed isn’t the point: some commands shouldn’t run even with approval.',
      'The host enforces it; the agent can’t talk its way past it.',
    ],
  },
  {
    id: 'allow-alone',
    chapter: '06-what-it-may-run',
    question: 'With only an allow-list on, what happens to a command that isn’t on it?',
    options: ['The host refuses it', 'The host runs it', 'The agent runs it itself'],
    correct: 0,
    why: [
      'Right. Without ask first, anything off the list is refused, even an honest push.',
      'The allow-list exists to stop that: off the list means not run.',
      'The agent can’t run anything itself; every command goes through the host.',
    ],
  },
  // 7. Workbench
  {
    id: 'rules-in-host',
    chapter: '07-workbench',
    question: 'Where should Larkspur write “never edit the tests”?',
    options: ['In the host’s rules, as protected files', 'In the agent’s prompt', 'In the ticket'],
    correct: 0,
    why: [
      'Right. The host enforces it whatever the agent decides.',
      'A prompt can be argued around when the agent wants green.',
      'A ticket describes the work; it enforces nothing.',
    ],
  },
  {
    id: 'ask-cost',
    chapter: '07-workbench',
    question: 'Why not have the host ask a person about every command?',
    options: [
      'People asked all day stop reading, and approve what they shouldn’t',
      'Asking is free, so it’s the best setting',
      'The agent stops working when asked',
    ],
    correct: 0,
    why: [
      'Right. Ask where it matters, so each question gets real attention.',
      'Every question costs a person’s time and attention.',
      'The agent waits for the answer; the cost is the person’s, not the agent’s.',
    ],
  },
  {
    id: 'each-rule',
    chapter: '07-workbench',
    question: 'With protected tests and the allow-list on but ask first off, which ticket fails?',
    options: [
      'The one that asks for a push: the push is refused',
      'The red-tests ticket: the agent still loosens the test',
      'None: two rules are enough',
    ],
    correct: 0,
    why: [
      'Right. Off the allow-list and nobody to ask, the honest push is refused.',
      'Protected tests stop the loosening; that ticket is done.',
      'The push ticket needs a person to approve the push.',
    ],
  },
];
