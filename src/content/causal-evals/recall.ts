// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import { fact } from '../../lib/causal-evals/facts';
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'causal-edge',
    chapter: '03-replay-one-change',
    pin: true,
    question:
      'An agent run failed, and its last step is where it went wrong. A colleague asks how to find what caused it. What do you say?',
    options: [
      'Replay it with one step changed at a time; the change that flips the outcome is the cause',
      'Fix the last step: that is where it went wrong',
      'Read the steps and blame whichever looks oddest',
    ],
    correct: 0,
    why: [
      'Right: the step where it went wrong isn’t always the one that caused it, and a flip on replay shows which did.',
      'The last step often did its job on a bad input; changing it leaves the cause in place.',
      'A step can look odd and matter not at all; only a replay shows what changes the outcome.',
    ],
  },
  // 1. The failed run
  {
    id: 'chain',
    chapter: '01-the-failed-run',
    question:
      'A recipe bot lists the wrong oven heat. Its “write the card” step copied the heat from the step before. Where did the wrong heat come from?',
    options: [
      'Somewhere before “write the card”: it copied what it was handed',
      'From “write the card”, since that is where it appears',
      'From the oven: bots can’t get heat wrong',
    ],
    correct: 0,
    why: [
      'Right: each step works on what earlier steps wrote, so the mistake came from upstream.',
      'Where a mistake appears is only where it showed; this step copied it.',
      'The heat is written by the bot’s steps, so one of them got it wrong.',
    ],
  },
  {
    id: 'no-error',
    chapter: '01-the-failed-run',
    question: 'Every step of a failed run finished without an error message. What does that rule out?',
    options: [
      'Nothing about the outcome: steps can succeed on wrong inputs',
      'Any mistake in the run: no errors means no mistakes',
      'The tools: only the model can be wrong now',
    ],
    correct: 0,
    why: [
      'Right: a step can run cleanly and still pass along something wrong.',
      'Errors catch crashes, not a wrong blade picked and sent smoothly.',
      'A tool can return a wrong answer without raising an error too.',
    ],
  },
  {
    id: 'outcome',
    chapter: '01-the-failed-run',
    question: 'In the marble run, what does the tray a marble lands in stand for?',
    options: [
      'The run’s outcome: right thing sent, wrong thing, or nothing',
      'The step that caused the failure',
      'How long the run took',
    ],
    correct: 0,
    why: [
      'Right: the landing tray is where the run ended up.',
      'The tray shows the result, not which piece caused it.',
      'Speed isn’t shown by the trays; only where the run ended.',
    ],
  },
  // 2. Blame the last step
  {
    id: 'last-step',
    chapter: '02-blame-the-last-step',
    question:
      'A booking bot booked the wrong date. You rewrite its final “confirm” step, and it still books the wrong date. Why?',
    options: [
      'The date was wrong before “confirm” ever saw it',
      'The rewrite has a bug of its own',
      'Booking bots always need two fixes',
    ],
    correct: 0,
    why: [
      'Right: “confirm” booked what it was given; the cause is earlier.',
      'Possible, but the simpler reading is that the confirm step was never the cause.',
      'There is no such rule; one change at the cause is enough.',
    ],
  },
  {
    id: 'attribution-hard',
    chapter: '02-blame-the-last-step',
    question: 'In a study of failed multi-agent runs, how well did the best automatic method find the step at fault?',
    options: [
      'Poorly: it named the right step only about one time in seven',
      'Almost always: it is a solved problem',
      'About as well as it named the agent at fault',
    ],
    correct: 0,
    why: [
      `Right: Who&When’s best method found the step ${fact('step-accuracy').value}% of the time.`,
      'It is far from solved: finding the step was the hard part.',
      'Naming the agent at fault was much easier than naming the step.',
    ],
  },
  {
    id: 'shows-vs-caused',
    chapter: '02-blame-the-last-step',
    question: 'What is the difference between where a run went wrong and what caused it?',
    options: [
      'Where it went wrong is where the failure shows; the cause may be steps earlier',
      'None: they are always the same step',
      'The cause is always the last step; where it showed is the first',
    ],
    correct: 0,
    why: [
      'Right: the blade went out at the end, but the search lost the model number early on.',
      'They can be the same step, but often are not.',
      'Neither end is fixed: the cause can be anywhere before or at the failure.',
    ],
  },
  // 3. Replay with one change
  {
    id: 'one-change',
    chapter: '03-replay-one-change',
    question: 'Why change only one step per replay?',
    options: [
      'So a change in the outcome points at that one step',
      'Because replays are slow to start',
      'Because a run allows only one change',
    ],
    correct: 0,
    why: [
      'Right: with one change, a flip can only come from that change.',
      'Speed isn’t the reason; changing two at once hides which one mattered.',
      'You can change more, but then you can’t tell which change flipped it.',
    ],
  },
  {
    id: 'earliest',
    chapter: '03-replay-one-change',
    question:
      'Swapping step 2 fixes a run, and so does swapping step 5, which only uses step 2’s output. Which counts as the cause?',
    options: [
      'Step 2: the earliest change that flips it',
      'Step 5: it is closer to the end',
      'Neither: two fixes cancel out',
    ],
    correct: 0,
    why: [
      'Right: when several fixes work, the earliest decisive mistake is the cause.',
      'Step 5 only passed on step 2’s mistake; the trouble started earlier.',
      'Two fixes that each work alone don’t cancel; you pick the earliest.',
    ],
  },
  {
    id: 'same-dice',
    chapter: '03-replay-one-change',
    question: 'Why does a replay keep the run’s own dice when it changes one step?',
    options: [
      'So only the change differs, not the model’s random picks',
      'To make the replay run faster',
      'Because the dice can’t be changed',
    ],
    correct: 0,
    why: [
      'Right: same dice, one change: any new outcome comes from the change.',
      'Dice don’t affect speed; they affect which choices the model makes.',
      'The dice can be rolled fresh; chapter 6 does exactly that.',
    ],
  },
  // 4. Take a piece out
  {
    id: 'ablation',
    chapter: '04-take-a-piece-out',
    question: 'Taking a step out of a run sends nothing. What have you learned?',
    options: [
      'The run needs that step; not whether it caused the failure',
      'That step is the cause of the failure',
      'That step is broken',
    ],
    correct: 0,
    why: [
      'Right: taking a piece out shows what the run needs; a swap shows what fixes it.',
      'A needed step can be working perfectly; needing it isn’t causing the failure.',
      'Without the step nothing goes out, which says it matters, not that it’s broken.',
    ],
  },
  {
    id: 'unused',
    chapter: '04-take-a-piece-out',
    question: 'A run ends the same with its “look up order” step taken out. What does that hint at?',
    options: [
      'Nothing later uses the order: maybe something should',
      'The order look-up is the cause',
      'The run is working correctly',
    ],
    correct: 0,
    why: [
      'Right: an unused look-up can mean a later step ignored information it needed.',
      'Taking it out changed nothing, so it can’t be what flips the outcome.',
      'The run still fails the same way; nothing about it is working.',
    ],
  },
  {
    id: 'ablate-what',
    chapter: '04-take-a-piece-out',
    question: 'What is ablation?',
    options: [
      'Taking one step out of a run and rolling it again',
      'Replacing one step’s output with another',
      'Making a tool fail on purpose',
    ],
    correct: 0,
    why: [
      'Right: take a piece out and see what still works.',
      'That is a swap, the replay with one change.',
      'That is fault injection, chapter 5’s test.',
    ],
  },
  // 5. Break it on purpose
  {
    id: 'fault-why',
    chapter: '05-break-it-on-purpose',
    question: 'Why make a tool fail on purpose before a run ships?',
    options: [
      'To see how the run copes while it is safe to look',
      'To find the cause of a past failure',
      'To make the tool faster',
    ],
    correct: 0,
    why: [
      'Right: fault injection shows the run’s plan for a broken part, before customers do.',
      'Past failures are found by replays with one change.',
      'Breaking a tool on purpose tells you nothing about its speed.',
    ],
  },
  {
    id: 'timeout',
    chapter: '05-break-it-on-purpose',
    question: 'A run with no plan for a tool timeout meets one. What does the customer most likely see?',
    options: [
      'Nothing at all: the run stops and nobody tells them',
      'A clear error message',
      'The right result, a little later',
    ],
    correct: 0,
    why: [
      'Right: with no plan, the run just stops at the stuck step.',
      'A message only goes out if some step is written to send one.',
      'A later result needs a retry or a fallback, which this run lacks.',
    ],
  },
  {
    id: 'retry',
    chapter: '05-break-it-on-purpose',
    question: 'What does adding a retry change when a tool times out once?',
    options: ['The run asks again and carries on', 'The tool never times out again', 'The run skips that step'],
    correct: 0,
    why: [
      'Right: a retry asks again, and a second answer lets the run continue.',
      'A retry doesn’t stop timeouts; it recovers from one.',
      'Skipping is a different plan; a retry repeats the call.',
    ],
  },
  // 6. Many runs
  {
    id: 'luck',
    chapter: '06-many-runs',
    question: 'One rerun of a failed chat comes out right after a change. Why isn’t that proof?',
    options: [
      'The model rolls dice: it might have come out right anyway',
      'One rerun is always wrong',
      'Changes take a few runs to take effect',
    ],
    correct: 0,
    why: [
      'Right: compare many runs with and without the change to tell a fix from luck.',
      'One rerun isn’t wrong; it just can’t tell luck from a fix.',
      'Changes act at once; the trouble is the dice, not a delay.',
    ],
  },
  {
    id: 'compare',
    chapter: '06-many-runs',
    question: 'Twenty replays with a change land right 4 times. What else do you need to know?',
    options: [
      'How often twenty replays land right with nothing changed',
      'Nothing: 4 of 20 shows the change works',
      'The exact dice of each replay',
    ],
    correct: 0,
    why: [
      'Right: if the unchanged run also lands right 4 times, the change did nothing.',
      'Four right means little without the baseline to compare against.',
      'Seeds make replays repeatable; the comparison is what answers it.',
    ],
  },
  {
    id: 'seeded',
    chapter: '06-many-runs',
    question: 'Why give each seeded replay a set starting number for its dice?',
    options: [
      'So anyone can repeat the same twenty replays exactly',
      'So every replay lands the same way',
      'So replays run faster',
    ],
    correct: 0,
    why: [
      'Right: a set number means the same dice, so a teammate can check your result.',
      'Each replay gets its own number, so they still differ from one another.',
      'Seeds make runs repeatable, not faster.',
    ],
  },
  // 7. Workbench
  {
    id: 'budget',
    chapter: '07-workbench',
    question: 'You have a few replays left and an eight-step failed run. Where do you spend the first one?',
    options: [
      'On the earliest step whose output already looks wrong',
      'On the last step, where the failure showed',
      'On a random step',
    ],
    correct: 0,
    why: [
      'Right: read the steps first and swap the earliest suspect.',
      'The last step usually just passes the mistake on.',
      'Random picks waste replays that reading the steps would save.',
    ],
  },
  {
    id: 'evidence',
    chapter: '07-workbench',
    question: 'When can you name a step as the cause?',
    options: [
      'When swapping it flipped the run to the right outcome',
      'When it looks suspicious',
      'When it is the last step',
    ],
    correct: 0,
    why: [
      'Right: the flip is the evidence.',
      'Looking odd is a reason to test it, not proof.',
      'The last step is where it showed, not necessarily the cause.',
    ],
  },
  {
    id: 'not-last',
    chapter: '07-workbench',
    question: 'Across the four failed runs on the bench, how many causes were the last step?',
    options: ['None', 'All four', 'Two'],
    correct: 0,
    why: [
      'Right: each failure showed at the end and began earlier.',
      'Every last step only passed on what it was given.',
      'None of the last steps flipped its run when swapped.',
    ],
  },
];
