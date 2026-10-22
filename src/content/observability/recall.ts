// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 2. The first failure (the pinned item comes first in the bank)
  {
    id: 'first-not-last',
    chapter: '02-first-failure',
    pin: true, // the module's single most important idea: exactly one pin
    question:
      'A travel assistant booked the wrong hotel. Its trace shows: search found the right hotel, the model then called the booking tool with another hotel’s id, the tool booked it, and the reply confirmed it. Where should the note go?',
    options: [
      'On the reply: that is where the customer saw the mistake',
      'On the model call that passed the wrong id: the first step that went wrong',
      'On the booking tool: it booked the wrong hotel',
      'On the search: it is the first step of the trace',
    ],
    correct: 1,
    why: [
      'The reply is where the failure shows, not where it began. Fixing the reply’s wording would leave the wrong booking.',
      'Right. Everything after the bad call follows from it. Note the first span that went wrong, and the later ones explain themselves.',
      'The tool did what it was asked: it booked the id it was given. The mistake was in what it was given.',
      'The search found the right hotel. Being first in the trace doesn’t make a step wrong.',
    ],
  },
  {
    id: 'downstream-noise',
    chapter: '02-first-failure',
    question:
      'A trace has three spans that look wrong: a search that found an old passage, a model call that quoted it, and a reply with the old figure. How many separate problems should the note record?',
    options: [
      'Three: one per wrong-looking span',
      'One: the search, since the other two follow from it',
      'None until a customer complains',
    ],
    correct: 1,
    why: [
      'Counting every symptom triples one failure, and the tally then overstates it.',
      'Right. The later spans went wrong because of the first. One trace, one first failure.',
      'A trace that shows a wrong answer is evidence already; waiting for a complaint means missing the quiet failures.',
    ],
  },
  {
    id: 'reply-is-symptom',
    chapter: '02-first-failure',
    question:
      'Two traces end in the same wrong reply. In one, retrieval found an old passage; in the other, the model ignored a correct passage. Are they the same failure?',
    options: [
      'Yes: the replies are identical',
      'No: they went wrong at different spans, so they need different fixes',
      'It can’t be told from traces',
    ],
    correct: 1,
    why: [
      'The same symptom can have different causes. Grouping by the reply would hide that.',
      'Right. One needs the index fixed, the other the prompt or the model. The first failure tells them apart.',
      'This is exactly what a trace shows: which step did what.',
    ],
  },
  // 1. What the assistant did
  {
    id: 'trace-vs-log',
    chapter: '01-what-it-did',
    question:
      'An engineer says the assistant’s logs show the question and the reply, so a trace adds nothing. What does a trace add?',
    options: [
      'Nothing: the question and the reply are the whole story',
      'Every step between them, nested and timed: what was retrieved, which tools were called with what, and what the model was given',
      'Only timings, for speeding things up',
    ],
    correct: 1,
    why: [
      'The reply alone can’t tell you why it was wrong. The steps between hold the cause.',
      'Right. A trace is the request’s whole path, a span per step, so you can see what the model saw and did.',
      'Timings are one part of it. Each span also records what the step did.',
    ],
  },
  {
    id: 'span-parent',
    chapter: '01-what-it-did',
    question: 'In a waterfall, one bar spans the whole width above all the others. What is it?',
    options: ['The slowest step', 'The whole run: the parent span every step sits inside', 'A step that failed'],
    correct: 1,
    why: [
      'It is the longest bar because it contains every step, not because one step was slow.',
      'Right. Spans nest: the run is the parent, and retrieval, model calls, tool calls and the reply are its children.',
      'Its length says nothing about failure; failures are found by reading what each span did.',
    ],
  },
  {
    id: 'where-time-goes',
    chapter: '01-what-it-did',
    question:
      'A product manager wants the assistant to answer faster. In a trace like chapter 1’s, where is the time most likely to go?',
    options: ['The order lookup', 'The model calls', 'Sending the reply'],
    correct: 1,
    why: [
      'In these traces the tool call took a fraction of the time the model calls did.',
      'Right. The model calls were the long bars. A waterfall shows that at a glance.',
      'Sending the reply was the shortest bar of all.',
    ],
  },
  // 3. Open coding
  {
    id: 'notes-before-categories',
    chapter: '03-open-coding',
    question:
      'A new team lead hands reviewers a fixed list of five failure categories to tick on day one. What is the risk?',
    options: [
      'None: a list makes reviews faster and consistent',
      'The list was written before anyone read the traces, so failures that don’t fit it get forced into it or missed',
      'Reviewers might disagree about the categories',
    ],
    correct: 1,
    why: [
      'Fast, consistent ticking of the wrong categories measures the wrong things.',
      'Right. Open coding comes first: free notes show what really goes wrong, and the categories come from them.',
      'Disagreement is worth having, but the bigger problem is categories that don’t match the data.',
    ],
  },
  {
    id: 'who-codes',
    chapter: '03-open-coding',
    question: 'Who should write the notes on a legal assistant’s failed traces?',
    options: [
      'Any engineer on the team',
      'Someone who knows what a good legal answer looks like',
      'A model, so it scales',
    ],
    correct: 1,
    why: [
      'An engineer can read the spans, but may not spot a subtly wrong legal answer.',
      'Right. A domain expert knows when an answer is wrong, which is the whole job.',
      'A model’s suggestions can help later, but you check them against notes a person wrote first.',
    ],
  },
  {
    id: 'notes-private',
    chapter: '03-open-coding',
    question: 'Your notes in chapter 3 were never marked right or wrong. Why?',
    options: [
      'Because there is no right note: a note records what you saw, in your words',
      'Because notes don’t matter',
      'Because the site couldn’t check them',
    ],
    correct: 0,
    why: [
      'Right. Open coding is observation, not a quiz. The check comes later, when notes are grouped.',
      'They matter a great deal: the groups in chapter 4 were built from them.',
      'Grading free text isn’t the point; a note is good if it says what you saw.',
    ],
  },
  // 4. Axial coding
  {
    id: 'group-by-cause',
    chapter: '04-axial-coding',
    question: 'Two notes read “quoted last year’s price” and “old warranty length”. Should they share a group?',
    options: [
      'No: one is about prices and one about warranties',
      'Yes: both came from answering out of an old passage',
      'Only if they came from the same customer',
    ],
    correct: 1,
    why: [
      'Grouping by topic hides the shared cause, and the shared fix.',
      'Right. Axial coding groups by what went wrong. One fix, the index, covers both.',
      'Who asked doesn’t change what failed.',
    ],
  },
  {
    id: 'names-free',
    chapter: '04-axial-coding',
    question: 'Two reviewers sort the same traces into the same groups but name them differently. Did they agree?',
    options: [
      'No: the names differ',
      'Yes: the same traces are together; the names are labels',
      'Only if they used the same number of words',
    ],
    correct: 1,
    why: [
      'Names can be agreed afterwards. What matters is which traces belong together.',
      'Right. A grouping is the same when the same traces share a group, whatever each group is called.',
      'Wording is not the test.',
    ],
  },
  {
    id: 'count-the-modes',
    chapter: '04-axial-coding',
    question: 'Why count the traces in each failure mode?',
    options: [
      'To report a single accuracy number',
      'To see how often each kind of failure happens, so you can choose what to fix',
      'Counting is optional decoration',
    ],
    correct: 1,
    why: [
      'A single number hides which kinds of failure make it up.',
      'Right. Counts turn a pile of notes into a picture you can act on.',
      'Without counts, the loudest failure wins, not the most common or harmful one.',
    ],
  },
  // 5. Which ones matter
  {
    id: 'frequency-harm',
    chapter: '05-what-matters',
    question:
      'A support bot fails in two ways: 40 times it says “I don’t know” to easy questions, and 8 times it promises refunds it can’t give. Which do you fix first?',
    options: [
      'The “I don’t know” replies: they happen five times as often',
      'Weigh both: if a false promise does much more harm, eight of them can outweigh forty “I don’t know”s',
      'Whichever is easier, always',
    ],
    correct: 1,
    why: [
      'Frequency alone leaves out what each failure costs.',
      'Right. How often times how much harm decides the order, as with the stale passages in chapter 5.',
      'Effort matters too, but a cheap fix for a harmless failure can leave the costly one live.',
    ],
  },
  {
    id: 'harm-rating',
    chapter: '05-what-matters',
    question: 'Where did the harm ratings in chapter 5 come from?',
    options: [
      'A model measured them',
      'The team rated each mode, with a reason, from what the failure costs a customer',
      'They are industry standard scores',
    ],
    correct: 1,
    why: [
      'Nothing here was measured: the traces and ratings are written by hand to show the method.',
      'Right. Harm is a judgement about your business, so the team makes it and writes down why.',
      'There is no standard: the same failure costs different businesses different amounts.',
    ],
  },
  {
    id: 'one-fix',
    chapter: '05-what-matters',
    question: 'Why pick one failure mode to fix, rather than all five at once?',
    options: [
      'You can see whether the fix worked, and the next day’s traces show what to do next',
      'Fixing more than one is impossible',
      'One fix always solves all modes',
    ],
    correct: 0,
    why: [
      'Right. One change at a time keeps cause and effect clear, and the loop repeats.',
      'Several fixes can ship together, but then you can’t tell which one helped.',
      'Different modes have different causes; one fix rarely covers them all.',
    ],
  },
  // 6. From trace to test
  {
    id: 'trace-becomes-case',
    chapter: '06-trace-to-test',
    question: 'You fixed a bug a customer’s trace showed. Why turn that trace into an eval case too?',
    options: [
      'So a later change that brings the bug back fails the suite before customers see it',
      'Because the eval suite needs more cases to look complete',
      'There’s no need: the bug is fixed',
    ],
    correct: 0,
    why: [
      'Right. A case from a real failure guards against that failure coming back.',
      'More cases for their own sake add noise; cases from real failures test what matters.',
      'Fixed today isn’t fixed for good. Later changes can break it again.',
    ],
  },
  {
    id: 'citation-not-enough',
    chapter: '06-trace-to-test',
    question: 'The old-passage answers had citations. Which grader caught them?',
    options: ['Has a citation', 'Contains the key fact', 'Both'],
    correct: 1,
    why: [
      'They cited a passage, just last year’s. The citation check passed them.',
      'Right. The reference’s key fact (this year’s figure) was missing, so that grader failed them.',
      'Only one of the two failed them; that’s why a case needs the right grader.',
    ],
  },
  {
    id: 'fix-only-its-mode',
    chapter: '06-trace-to-test',
    question: 'A wrong-order-number trace was added as a case. On the version with the rebuilt index, does it pass?',
    options: [
      'Yes: the new version is better everywhere',
      'No: the fix changed retrieval, and that trace failed at the tool call',
      'It can’t be graded',
    ],
    correct: 1,
    why: [
      'A fix improves what it targets; other modes stay as they were.',
      'Right. A case keeps failing until its own mode is fixed, which is what makes it useful.',
      'It grades like any other: key fact and citation against its reference.',
    ],
  },
  // 7. Workbench
  {
    id: 'wrong-label-wrong-fix',
    chapter: '07-workbench',
    question: 'A reviewer in a hurry labels every failed trace “search missed the passage”. What happens to the tally?',
    options: [
      'Nothing important: labels are only names',
      'It points at the wrong fix: the real modes vanish into one bin',
      'The tally corrects itself',
    ],
    correct: 1,
    why: [
      'Labels drive the counts, and the counts drive the fix.',
      'Right. The tally is only as good as the labels under it.',
      'Nothing corrects a tally but better labels.',
    ],
  },
  {
    id: 'new-day-new-top',
    chapter: '07-workbench',
    question:
      'The old-passage fix shipped. Why read a new day’s traces instead of fixing the next mode on yesterday’s list?',
    options: [
      'Traffic changes, and a fix changes what fails; the new day shows what matters now',
      'Yesterday’s list is always wrong',
      'There’s no reason; use the old list',
    ],
    correct: 0,
    why: [
      'Right. Error analysis is a loop: read, label, count, fix, then read again.',
      'Yesterday’s list was right for yesterday. It just isn’t current.',
      'The old list doesn’t know what the fix changed.',
    ],
  },
  {
    id: 'ties',
    chapter: '07-workbench',
    question: 'Two modes tie for the most harm on the new day. What then?',
    options: [
      'Either is a sound pick; choose by cost of the fix or what customers report',
      'Fix neither until one is ahead',
      'The tally must be wrong',
    ],
    correct: 0,
    why: [
      'Right. A tie means the numbers don’t decide; other reasons do.',
      'Waiting leaves both failures live.',
      'Ties happen; they don’t mean a mistake.',
    ],
  },
];
