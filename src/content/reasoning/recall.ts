// Reasoning's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 6. Measure, then pick (pinned: the module's one idea)
  {
    id: 'lowest-effort-that-passes', chapter: '06-measure-then-pick', pin: true,
    question: 'A bank’s assistant answers balance questions and also explains loan repayment schedules. How should the team set its effort?',
    options: [
      'High for everything: more thinking is never wrong',
      'Run each kind of question through the evals at every effort, and pick the lowest effort that passes for each',
      'Low for everything: thinking is just cost',
      'Whatever the provider’s default is',
    ],
    correct: 1,
    why: [
      'High effort costs the most and can make simple answers worse by overthinking. “Never wrong” is exactly what the evals disprove.',
      'Right. Each kind gets its own measured setting: the cheapest one that clears the bar without breaking what already worked.',
      'The repayment schedules need several steps; low effort will get some wrong. Thinking pays for itself where questions have steps.',
      'A default is a guess about the average workload, not yours. Only your own evals show where it is too much or too little.',
    ],
  },
  {
    id: 'gate-regressions', chapter: '06-measure-then-pick',
    question: 'A higher effort raises a set’s pass rate from 70% to 85%, but two questions that passed with no thinking now fail. A gate with a no-regressions rule is on. What does it say?',
    options: ['Ship: 85% is over the bar', 'Hold: questions that worked before now fail', 'Ship, because the average went up', 'Hold, because 85% is not 100%'],
    correct: 1,
    why: [
      'The bar is only half the rule. The no-regressions half looks question by question.',
      'Right. The rule exists to catch exactly this: an overall gain that hides answers it broke.',
      'An average can rise while specific customers get worse answers. The rule looks at each question.',
      'The bar here is a set threshold, not perfection. It is the regressions that hold it back.',
    ],
  },
  {
    id: 'sweep-per-kind', chapter: '06-measure-then-pick',
    question: 'Why sweep each kind of question on its own instead of all of them together?',
    options: [
      'Because different kinds need different effort, and a mix hides that',
      'Because the gate can only take a few questions at a time',
      'Because sweeping is cheaper in small batches',
    ],
    correct: 0,
    why: [
      'Right. Lookups pass at no thinking and multi-step questions need more; one number for all of them would overpay on one and underpay on the other.',
      'The gate takes any number of questions. Splitting is about what the result can tell you.',
      'Cost is the same either way. The reason is that one setting can’t fit every kind.',
    ],
  },
  // 1. Answer now or think first
  {
    id: 'thinking-what', chapter: '01-answer-now-or-think-first',
    question: 'A colleague says a reasoning model “looks things up while it thinks”. What does it actually do in its thinking?',
    options: [
      'Writes out its working, step by step, before it writes the answer',
      'Searches the web for a better answer',
      'Waits so the answer feels more considered',
      'Runs the question through a second, bigger model',
    ],
    correct: 0,
    why: [
      'Right. Thinking is text the model writes first; the answer then follows from it.',
      'Fetching documents is retrieval or a tool call, which is a separate step. Thinking works on what the model already has.',
      'The wait comes from writing the thinking tokens, not from a pause added for effect.',
      'It is the same model writing more before it answers.',
    ],
  },
  {
    id: 'where-thinking-helps', chapter: '01-answer-now-or-think-first',
    question: 'Which question is most likely to get a different, better answer when the model thinks first?',
    options: [
      'What is the office’s street address?',
      'If a customer buys 3 desks at the 10-unit price minus a 5% loyalty discount, what do they pay?',
      'Who leads the design team?',
    ],
    correct: 1,
    why: [
      'One fact read off a page: there is no working to write out.',
      'Right. Several steps in a row (pick a price, apply a discount, multiply), each one a chance to slip.',
      'A lookup: the answer is a name on a page, so thinking first has nothing to fix.',
    ],
  },
  {
    id: 'same-docs-new-answer', chapter: '01-answer-now-or-think-first',
    question: 'The assistant had the same price list both times, yet only the thinking answer applied the per-line rule. Why?',
    options: [
      'The thinking step fetched a newer price list',
      'Writing the steps out made it use a sentence it had read but skipped when answering at once',
      'The thinking answer was luckier',
    ],
    correct: 1,
    why: [
      'Nothing new was fetched; the documents were identical.',
      'Right. The rule was in front of it both times. Working step by step is what brought it into the answer.',
      'The difference follows from the steps the thinking wrote out, not chance.',
    ],
  },
  // 2. Thinking is tokens
  {
    id: 'thinking-billed', chapter: '02-thinking-is-tokens',
    question: 'An API shows you only a short summary of the model’s thinking. What are you billed for?',
    options: ['Only the summary you see', 'The full thinking the model wrote, as output tokens', 'Nothing: thinking is free', 'The thinking, at the price of input tokens'],
    correct: 1,
    why: [
      'The summary is what you see, not what was written. The full thinking is what you pay for.',
      'Right. Thinking is written by the model, so it is billed as output, all of it.',
      'Every token the model writes costs money, thinking included.',
      'Thinking is written by the model, which makes it output, not input.',
    ],
  },
  {
    id: 'thinking-wait', chapter: '02-thinking-is-tokens',
    question: 'A customer complains the assistant got slower after thinking was turned on. Why?',
    options: [
      'The model writes every thinking token before the first word of its answer',
      'Thinking runs on slower servers',
      'The answer itself got much longer',
    ],
    correct: 0,
    why: [
      'Right. The wait is the thinking and the answer, one token after another, and the thinking comes first.',
      'It is the same model writing more tokens. The extra wait comes from the extra tokens.',
      'The answers barely changed length. The new tokens were the thinking, written first.',
    ],
  },
  {
    id: 'cost-scales', chapter: '02-thinking-is-tokens',
    question: 'Thinking doubles the output tokens on each question. What happens to the output part of the bill?',
    options: ['It roughly doubles', 'It stays the same, because thinking is hidden', 'It only grows for questions that were answered wrong'],
    correct: 0,
    why: [
      'Right. Output is billed per token, and thinking is output.',
      'Hidden from the reader does not mean free. You pay for the full thinking.',
      'Thinking happens on every question at that effort, right or wrong, and each one is billed.',
    ],
  },
  // 3. The effort dial
  {
    id: 'rises-then-flattens', chapter: '03-the-effort-dial',
    question: 'A team sweeps its hardest questions: accuracy goes 40%, 70%, 85%, 85% from none to high. What should they take from the last step?',
    options: [
      'High is the best: it is at least as good as medium',
      'Medium already gets what high gets, for less: the gain has flattened',
      'Something is broken: accuracy should keep rising',
    ],
    correct: 1,
    why: [
      'As good, but not better, and it costs more tokens and more time. “At least as good” isn’t the same as worth it.',
      'Right. Accuracy rose, then flattened. Past the point where it flattens, more thinking only costs more.',
      'Flattening is the usual shape: once the steps are worked out, more thinking has little left to fix.',
    ],
  },
  {
    id: 'what-effort-is', chapter: '03-the-effort-dial',
    question: 'What does the effort setting tell a reasoning model?',
    options: ['Which documents to read', 'How much work to put into the answer, thinking included', 'How long the answer must be', 'Which model to use'],
    correct: 1,
    why: [
      'Documents come from retrieval, a separate step from how hard the model works on them.',
      'Right. It is one setting for how much the model works, which mostly shows up as more or less thinking.',
      'It shapes the thinking more than the answer’s length; a short answer can follow a long think.',
      'It is the same model at every effort.',
    ],
  },
  {
    id: 'sweep-fair', chapter: '03-the-effort-dial',
    question: 'Why run the same questions at every effort level rather than a few different questions at each?',
    options: [
      'So the only thing that changes is the effort, and the comparison is fair',
      'Because each question can only be asked once per level',
      'To spend less on the test',
    ],
    correct: 0,
    why: [
      'Right. A sweep holds the questions fixed, so a change in accuracy can only come from the setting.',
      'There is no such limit. Asking the same questions is a choice for a fair comparison.',
      'It costs the same or more. The point is to compare like with like.',
    ],
  },
  // 4. When more thinking hurts
  {
    id: 'overthinking', chapter: '04-when-more-thinking-hurts',
    question: 'An assistant answers “How many rooms are booked?” correctly at low effort, but at high effort it starts calculating cleaning schedules from a note in the booking and answers wrong. What is going on?',
    options: [
      'Overthinking: the extra thinking chased a detail that has nothing to do with the question',
      'The high-effort model is a weaker model',
      'The booking data changed between the two runs',
    ],
    correct: 0,
    why: [
      'Right. Longer reasoning found a distractor and built on it. Simple questions with stray details are where this shows.',
      'It is the same model at a different setting. The change is how long it thinks, not which model thinks.',
      'Nothing changed but the effort. The wrong turn is in the thinking itself.',
    ],
  },
  {
    id: 'high-not-safe', chapter: '04-when-more-thinking-hurts',
    question: 'Someone proposes “high effort everywhere, to be safe”. What is the strongest reason against it?',
    options: [
      'It costs more and waits longer, and on simple questions with distractors it can lower accuracy',
      'High effort is not available in most APIs',
      'High effort makes answers too long to read',
    ],
    correct: 0,
    why: [
      'Right. It is not even safe: the questions you thought were easy are where extra thinking can go wrong.',
      'The current APIs do offer high effort. The problem is what it does, not whether it exists.',
      'The answers stay short; it is the thinking that grows, and with it cost, wait and the chance to wander.',
    ],
  },
  {
    id: 'recorded-not-measured', chapter: '04-when-more-thinking-hurts',
    question: 'The overthinking answers in this module were written by hand. What do they show?',
    options: [
      'A pattern a research paper measured on real reasoning models, illustrated on Larkspur’s questions',
      'Measured results from a real model on these exact questions',
      'Nothing real: overthinking is made up',
    ],
    correct: 0,
    why: [
      'Right. They illustrate inverse scaling, which Gema and colleagues found on tasks like counting with distractors; the module cites it.',
      'They were written for the site, not measured; the chapter says so.',
      'The pattern is measured in the cited paper. Only these examples are hand-written.',
    ],
  },
  // 5. Effort is a hint
  {
    id: 'effort-hint', chapter: '05-effort-is-a-hint',
    question: 'At the same high effort, a password-reset question gets a few thinking tokens and a refund calculation gets hundreds. Why?',
    options: [
      'Effort is a hint: the model decides how much each question needs',
      'The password question hit a token limit',
      'One of them ran at the wrong effort',
    ],
    correct: 0,
    why: [
      'Right. Effort sets how willing the model is to think; how much it thinks depends on the question.',
      'No limit was hit. The model simply had little to work out.',
      'Both ran at high. The same setting gives different amounts of thinking.',
    ],
  },
  {
    id: 'budget-tokens', chapter: '05-effort-is-a-hint',
    question: 'A team’s code sets a fixed thinking budget of 10,000 tokens on every request. On newer models, what replaces it?',
    options: [
      'Adaptive thinking with an effort level',
      'A longer system prompt',
      'Nothing: fixed budgets are the only way',
    ],
    correct: 0,
    why: [
      'Right. Newer models decide how much to think per request, steered by an effort level; the fixed budget is deprecated or rejected.',
      'A prompt can nudge thinking, but the control the APIs offer is the effort setting.',
      'The fixed budget is on its way out on newer models; effort takes its place.',
    ],
  },
  {
    id: 'max-tokens', chapter: '05-effort-is-a-hint',
    question: 'Effort is only a hint. What still puts a hard ceiling on how much a reply can write?',
    options: ['max_tokens, which counts thinking and answer together', 'The effort level', 'The number of documents sent'],
    correct: 0,
    why: [
      'Right. max_tokens is the hard limit on all output, thinking included; leave room for both.',
      'Effort steers; it does not guarantee a count. That is what “a hint” means.',
      'Documents are input. The ceiling on what the model writes is max_tokens.',
    ],
  },
  // 7. Workbench
  {
    id: 'mixed-plan', chapter: '07-workbench',
    question: 'A travel assistant answers “What time is check-in?” and also works out multi-city fares with layovers. What plan fits?',
    options: [
      'No thinking for check-in questions, more effort for fare calculations, each checked by the evals',
      'High for both, to be safe',
      'Medium for both, as a compromise',
    ],
    correct: 0,
    why: [
      'Right. Each kind gets the lowest effort that its evals say is enough.',
      'Check-in times gain nothing from thinking and wait longer for it. “Safe” costs on every question.',
      'A compromise overpays on lookups and may underpay on fares. Each kind can have its own setting.',
    ],
  },
  {
    id: 'read-together', chapter: '07-workbench',
    question: 'Two plans get the same number of answers right. How do you choose?',
    options: ['The one that costs less and makes customers wait less', 'The one with more effort, for safety', 'Either: accuracy is all that matters'],
    correct: 0,
    why: [
      'Right. With accuracy tied, cost and wait decide.',
      'More effort with no gain in accuracy only adds cost and wait, and can add overthinking.',
      'Customers feel the wait and the business pays the cost. Accuracy first, then those.',
    ],
  },
  {
    id: 'many-winners', chapter: '07-workbench',
    question: 'Why might the workbench accept more than one plan as best?',
    options: [
      'Different plans can tie on accuracy and cost',
      'Because it doesn’t check the plan',
      'Because any plan with high somewhere passes',
    ],
    correct: 0,
    why: [
      'Right. Every plan tied for the best result works; there is no single hand-picked answer.',
      'It checks each plan against the best accuracy and the lowest cost any plan reaches.',
      'High effort raises cost and can lower accuracy; it is no shortcut to a pass.',
    ],
  },
];
