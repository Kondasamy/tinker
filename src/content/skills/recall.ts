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
];
