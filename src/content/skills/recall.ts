// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'skill-edge',
    chapter: '02-label-and-folder',
    pin: true,
    question: 'A colleague asks what a skill is. Which answer is right?',
    options: [
      'A folder the assistant opens only when a task needs it; only its label is in every prompt',
      'A longer prompt with every rule, sent with each request',
      'A program the assistant runs instead of answering',
    ],
    correct: 0,
    why: [
      'Right: the label is always there so the model can choose; the folder’s body loads only when picked.',
      'That is the long prompt skills replace: every rule in every request.',
      'A skill can hold scripts, but it is mainly instructions the model reads when the task calls for it.',
    ],
  },
  // 1. The long prompt
  {
    id: 'long-prompt-cost',
    chapter: '01-the-long-prompt',
    question:
      'A help-desk bot’s prompt holds the full staff handbook. Most questions are about holiday days. What does each question cost?',
    options: [
      'The whole handbook, sent again with every question',
      'Only the holiday pages, since that is what people ask',
      'Nothing after the first question: the model keeps the handbook',
    ],
    correct: 0,
    why: [
      'Right: a prompt is sent in full with every request, however little of it the question needs.',
      'A prompt can’t send part of itself; choosing pages per question is what skills add.',
      'The model keeps nothing between requests; the prompt goes in each time.',
    ],
  },
  {
    id: 'long-prompt-buried',
    chapter: '01-the-long-prompt',
    question:
      'A team keeps adding rules to one prompt, and answers about one rule get worse. What is the likeliest reason?',
    options: [
      'The rule is buried among many rules the question doesn’t need',
      'The prompt got too short to hold the rule',
      'The model skips rules it has seen before',
    ],
    correct: 0,
    why: [
      'Right: every extra rule is more for the model to wade through, so the one that matters is easier to miss.',
      'Adding rules makes the prompt longer, not shorter.',
      'The model reads the prompt fresh each time; it doesn’t skip what it has seen.',
    ],
  },
  {
    id: 'long-prompt-fix',
    chapter: '01-the-long-prompt',
    question: 'A bank’s assistant has one long prompt for loans, cards and fraud. What change helps most?',
    options: [
      'Split the rules by task and load only the task a question needs',
      'Write the same rules in capital letters so they stand out',
      'Repeat the most important rules twice in the prompt',
    ],
    correct: 0,
    why: [
      'Right: loading only the task at hand keeps the prompt short and the needed rule in view.',
      'Shouting a rule doesn’t remove the rules around it that bury it.',
      'Repeating rules makes the prompt longer still.',
    ],
  },
  // 2. A label and a folder
  {
    id: 'skill-installed',
    chapter: '02-label-and-folder',
    question: 'A coding assistant has 30 skills installed. You ask it to fix one test. What is read in?',
    options: [
      'All 30 labels, and the body of the one skill that matches',
      'All 30 skills in full, because they are installed',
      'No labels at all until you name a skill',
    ],
    correct: 0,
    why: [
      'Right: labels are always in the prompt; a body is read in only when its skill is picked.',
      'Installed isn’t loaded: bodies stay in their folders until picked.',
      'Without the labels the model couldn’t choose; they are always there.',
    ],
  },
  {
    id: 'skill-many',
    chapter: '02-label-and-folder',
    question: 'Why can a team install many skills without slowing every request much?',
    options: [
      'Each skill adds only its short label until it is used',
      'Skills are kept on another server and cost nothing ever',
      'The model reads only the first few skills installed',
    ],
    correct: 0,
    why: [
      'Right: until a skill is picked, its label is all it costs.',
      'A picked skill’s body does cost words; it just isn’t paid when unused.',
      'The model sees every label, not only the first few.',
    ],
  },
  // 3. Picking the binder
  {
    id: 'label-decides',
    chapter: '03-picking-the-binder',
    question:
      'A recipes skill has the description “Kitchen stuff.” Users ask for a vegetarian lasagne and it never opens. Why?',
    options: [
      'The description doesn’t say what it does or when to use it, so nothing matches',
      'The recipes inside are too short',
      'Skills only open when the user names them',
    ],
    correct: 0,
    why: [
      'Right: the model chooses from the description alone, and this one names no task a request would mention.',
      'The recipes are read only after the skill opens, so they can’t help it open.',
      'The model picks skills itself by matching the request to the descriptions.',
    ],
  },
  {
    id: 'label-sharp',
    chapter: '03-picking-the-binder',
    question: 'Which description gives a travel-booking skill the best chance of being picked?',
    options: [
      'Book flights and hotels; use when someone asks to travel, book a trip or change a booking',
      'Travel',
      'A very useful skill that helps with many things',
    ],
    correct: 0,
    why: [
      'Right: it says what the skill does and when, in the words requests use.',
      'One word gives the model little to match against.',
      'Vague praise names no task, so no request matches it.',
    ],
  },
  {
    id: 'label-not-body',
    chapter: '03-picking-the-binder',
    question: 'A skill never gets picked. A teammate rewrites its long instructions. Will that help?',
    options: [
      'No: the instructions are read only after it is picked; fix the description',
      'Yes: better instructions make the model trust the skill',
      'Yes: longer instructions make it more likely to match',
    ],
    correct: 0,
    why: [
      'Right: picking happens on the description, before any instructions are read.',
      'The model never sees the instructions while choosing.',
      'Length inside the folder has no effect on the choice.',
    ],
  },
  // 4. Steps, not facts
  {
    id: 'script-runs',
    chapter: '04-steps-not-facts',
    question: 'A spreadsheet skill has a script that sums a column. The assistant runs it. What reaches the prompt?',
    options: ['The sum it prints', 'The script’s whole code', 'Nothing, since scripts never cost words'],
    correct: 0,
    why: [
      'Right: a run happens outside the prompt, and only its output is read in.',
      'The code stays in the skill’s folder when the script runs.',
      'The output is read in, so it does cost a few words.',
    ],
  },
  {
    id: 'script-steps',
    chapter: '04-steps-not-facts',
    question: 'Besides facts, what can a skill hold?',
    options: [
      'Steps to follow, and scripts the assistant can run',
      'Only a list of facts the model doesn’t know',
      'Only its one-line label',
    ],
    correct: 0,
    why: [
      'Right: a skill is a folder of instructions, procedures and files, scripts included.',
      'Facts are one thing a skill holds; procedures and scripts are others.',
      'The label is only what rides in every prompt; the folder holds the rest.',
    ],
  },
  {
    id: 'script-read',
    chapter: '04-steps-not-facts',
    question: 'Why is running a calculator script better than reading its code into the prompt?',
    options: [
      'The answer costs a few words instead of the whole program, and it is worked out exactly',
      'Reading code is not allowed in a prompt',
      'Running it makes the model remember the code',
    ],
    correct: 0,
    why: [
      'Right: only the output is read, and the sum comes from code, not from the model’s guess.',
      'Code can be read into a prompt; it is just costly and the model still has to work it out.',
      'The model keeps nothing between requests, run or read.',
    ],
  },
  // 5. Two skills fight
  {
    id: 'overlap-wrong',
    chapter: '05-two-skills-fight',
    question: 'Billing questions keep opening a Payments skill. Both labels mention “card”. Why?',
    options: [
      'The labels overlap, so both fit and the wrong one wins',
      'The Billing skill’s instructions are too short',
      'The model opens skills at random',
    ],
    correct: 0,
    why: [
      'Right: shared words make two labels fit one question, and the one sharing more wins.',
      'Instructions are read only after a skill opens; they don’t decide which opens.',
      'The choice follows the labels, not chance.',
    ],
  },
  {
    id: 'overlap-fix',
    chapter: '05-two-skills-fight',
    question: 'Two skills fight over the same tickets. What is the fix?',
    options: [
      'Sharpen each label to name only its own tasks',
      'Add the other skill’s words to both labels',
      'Install a third skill to settle it',
    ],
    correct: 0,
    why: [
      'Right: labels that don’t share words send each ticket one way.',
      'More shared words make the overlap worse.',
      'A third label adds another rival, not a referee.',
    ],
  },
  {
    id: 'overlap-check',
    chapter: '05-two-skills-fight',
    question: 'After sharpening a label so it stops stealing tickets, what should you check?',
    options: [
      'That the skill still catches its own tickets',
      'Nothing: a shorter label always works',
      'That the label is as long as the others',
    ],
    correct: 0,
    why: [
      'Right: a label cut too far can miss the tickets it was meant for.',
      'Too short a label can lose its own tickets, as a vague one does.',
      'Length doesn’t matter; naming its own tasks does.',
    ],
  },
  // 6. A skill from outside
  {
    id: 'outside-read',
    chapter: '06-a-skill-from-outside',
    question: 'A free “Slide maker” skill is shared in a forum. Before installing it, you should…',
    options: [
      'Read every file in it, scripts too',
      'Check that its label sounds helpful',
      'Install it and watch what it does',
    ],
    correct: 0,
    why: [
      'Right: its instructions and scripts would run with the assistant’s access, so read them first.',
      'A helpful label can sit on top of harmful instructions.',
      'Watching after installing means any harm has already happened.',
    ],
  },
  {
    id: 'outside-access',
    chapter: '06-a-skill-from-outside',
    question: 'Why can a downloaded skill do harm, when it is only text and scripts?',
    options: [
      'The assistant follows its instructions with all the access it has',
      'Skills run on the vendor’s servers',
      'It can’t: skills only change how answers sound',
    ],
    correct: 0,
    why: [
      'Right: the assistant obeys the skill with its own tools and data, so text becomes action.',
      'An installed skill runs where the assistant runs, with its access.',
      'Skills give instructions and run code, which can do much more than change wording.',
    ],
  },
  {
    id: 'outside-label',
    chapter: '06-a-skill-from-outside',
    question: 'A downloaded skill’s label looks fine. Is that enough to trust it?',
    options: [
      'No: the label is one line; the harm can sit in its other files',
      'Yes: the label is what the assistant follows',
      'Yes: harmful skills are blocked automatically',
    ],
    correct: 0,
    why: [
      'Right: only the label is short and visible; the body and scripts hold what gets done.',
      'The label only decides when it opens; the body says what to do.',
      'Nothing guarantees a downloaded skill is checked for you.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-long',
    chapter: '07-workbench',
    question: 'A team makes every skill’s label a long list of every word customers might use. What happens?',
    options: [
      'Labels overlap and steal tickets, and every prompt grows',
      'Every question finds its skill',
      'Nothing changes, since labels are free',
    ],
    correct: 0,
    why: [
      'Right: shared words make labels fight, and every label is paid for on every request.',
      'Catch-all labels fit questions meant for other skills.',
      'Every label rides in every prompt, so its length costs on every request.',
    ],
  },
  {
    id: 'bench-sharp',
    chapter: '07-workbench',
    question: 'What makes a skill label good?',
    options: [
      'It says what the skill does and when to use it, in the words requests use',
      'It is as short as possible, one word if it can be',
      'It is friendly and enthusiastic',
    ],
    correct: 0,
    why: [
      'Right: that is what the model matches a request against.',
      'One word is too vague to match, so the skill gets missed.',
      'Tone doesn’t help matching; named tasks do.',
    ],
  },
  {
    id: 'bench-score',
    chapter: '07-workbench',
    question: 'Two label sets both send every request to the right skill. Which is better?',
    options: [
      'The one with fewer words, since labels ride in every prompt',
      'The longer one, since it covers more',
      'Either: once every pick is right, length doesn’t matter',
    ],
    correct: 0,
    why: [
      'Right: with picks equal, fewer label words is less paid on every request.',
      'Extra coverage buys nothing once every pick is right, and costs words.',
      'Length is paid on every request, so it still matters.',
    ],
  },
];
