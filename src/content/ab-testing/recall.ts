// A/B testing's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned
// item is the module's one-line edge: a significant result can still be luck, and peeking hands luck more chances.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'peek-luck',
    chapter: '04-peeking',
    pin: true,
    question:
      'A colleague checks a running test every hour and stops it the first time it shows a significant win. “It was significant, so it’s real.” What do you tell them?',
    options: [
      'Every look is another chance for luck to cross the line, so stopping on the first win makes false wins far more likely',
      'They are right: significant means real',
      'Checking often is safer, because problems show up sooner',
    ],
    correct: 0,
    why: [
      'Right: one look at a planned end keeps false wins near the level, but stopping at the first of many looks lets luck choose the moment.',
      'Significant means bigger than luck usually makes on one look; with many looks, luck gets there much more often.',
      'Looking often can catch a broken test, but stopping on a win at any look inflates false wins.',
    ],
  },
  // 1. Did it work?
  {
    id: 'random-split',
    chapter: '01-did-it-work',
    question:
      'A gym tests a new app screen by showing it to members who opt in to “try new features”. Those members visit more. Why can’t the gym credit the screen?',
    options: [
      'Members who opt in may already be keener, so the split was not random',
      'Too few members saw the old screen',
      'Visits are the wrong thing to measure',
    ],
    correct: 0,
    why: [
      'Right: the members chose themselves, so keenness rides along with the screen and the two can’t be told apart.',
      'Group sizes matter less than how people were chosen; self-chosen groups differ in more than the screen.',
      'Visits may be a fine measure; the problem is who ended up in each group.',
    ],
  },
  {
    id: 'interval-zero',
    chapter: '01-did-it-work',
    question: 'A test reports B minus A as +0.8 points, with an interval from −0.4 to +2.0. What does that tell you?',
    options: [
      'B might be better, but zero is inside the interval, so no difference is still plausible',
      'B is 0.8 points better, for sure',
      'B is worse, because the interval starts below zero',
    ],
    correct: 0,
    why: [
      'Right: the interval is where the true difference most likely sits, and it still includes zero.',
      'The single number is the best guess, but the interval shows how far off it could be.',
      'Part of the interval is below zero, but most of it is above; it doesn’t say B is worse.',
    ],
  },
  {
    id: 'control-variant',
    chapter: '01-did-it-work',
    question: 'In a test of a new newsletter subject line against the usual one, which is the control?',
    options: ['The usual subject line', 'The new subject line', 'Whichever gets more opens'],
    correct: 0,
    why: [
      'Right: the control is what you have today, kept as the yardstick.',
      'The new line is the variant, the change being judged.',
      'The roles are set before the test, not by the result.',
    ],
  },
  // 2. Luck
  {
    id: 'aa-purpose',
    chapter: '02-luck',
    question: 'A team runs its homepage against an identical copy of itself for a week. What can that show them?',
    options: [
      'How big the gaps from luck alone are, and whether the test setup is sound',
      'Nothing: identical pages can’t differ',
      'Which homepage is better',
    ],
    correct: 0,
    why: [
      'Right: an A/A test measures noise, and a setup that calls far more than a few winners is broken.',
      'Identical pages still show gaps, because different people happen to land on each.',
      'Both pages are the same, so there is nothing to be better.',
    ],
  },
  {
    id: 'aa-rate',
    chapter: '02-luck',
    question: 'Out of 200 A/A tests at a 5% level, about how many would you expect to call a winner?',
    options: ['About 10', 'None', 'About 100'],
    correct: 0,
    why: [
      'Right: at a 5% level luck crosses the line about 1 time in 20, so about 10 of 200.',
      'Identical groups still differ by chance, and now and then by enough to look significant.',
      'Half would mean the test is a coin toss; the level keeps false wins near 1 in 20.',
    ],
  },
  {
    id: 'noise-word',
    chapter: '02-luck',
    question:
      'Two branches of a bakery sell 212 and 198 croissants on the same ordinary Tuesday. What is the gap most likely?',
    options: ['Noise: day-to-day luck in who walked in', 'Proof one branch bakes better', 'A counting error'],
    correct: 0,
    why: [
      'Right: with nothing changed, small gaps like this are the usual scatter of who happened to come.',
      'One day’s gap this small is what luck makes, so it can’t prove a difference in baking.',
      'Counts can be wrong, but ordinary scatter explains the gap without any mistake.',
    ],
  },
  // 3. How many shoppers?
  {
    id: 'underpowered-silence',
    chapter: '03-how-many-shoppers',
    question:
      'A small website tests a new sign-up form for two days, sees no significant change and drops the idea. What went wrong?',
    options: [
      'Two days was probably too few visitors to find a modest change, so “no change” proves little',
      'Nothing: no significant change means no change',
      'They should have tested five forms at once',
    ],
    correct: 0,
    why: [
      'Right: an underpowered test misses most real changes, so its silence is weak evidence.',
      'A test without enough visitors usually finds nothing even when there is something.',
      'More forms add more chances for false wins and split the visitors further.',
    ],
  },
  {
    id: 'smaller-needs-more',
    chapter: '03-how-many-shoppers',
    question: 'To find a change half as big, roughly how many more visitors does a test need?',
    options: ['About four times as many', 'Twice as many', 'The same number'],
    correct: 0,
    why: [
      'Right: the change is squared in the sample size rule, so halving it multiplies the visitors by four.',
      'Twice is the natural guess, but the size needed grows with the square of how small the change is.',
      'Smaller changes hide in the noise, so they always need more visitors.',
    ],
  },
  {
    id: 'plan-size-first',
    chapter: '03-how-many-shoppers',
    question: 'When should a team work out how many visitors a test needs?',
    options: ['Before it starts', 'Once the result looks interesting', 'Only if the result is not significant'],
    correct: 0,
    why: [
      'Right: the size, and so the length, is set in advance, from the smallest change worth finding.',
      'Choosing the size after seeing the result lets the result pick when to stop.',
      'Sizing only after a miss is peeking by another name.',
    ],
  },
  // 4. Peeking
  {
    id: 'fixed-horizon',
    chapter: '04-peeking',
    question: 'What does running a test to a fixed horizon mean?',
    options: [
      'Setting its length in advance and reading the result once, at the end',
      'Stopping it the moment the result is significant',
      'Running it until the interval is narrow enough to please everyone',
    ],
    correct: 0,
    why: [
      'Right: one planned look keeps false wins near the level.',
      'Stopping on the first significant look is peeking, the opposite of a fixed horizon.',
      'A moving goal lets the data decide when to stop, which is peeking again.',
    ],
  },
  {
    id: 'early-lead',
    chapter: '04-peeking',
    question:
      'On day 3 of a planned 14, the new design leads with a significant result. The team wants to ship now. What is the risk?',
    options: [
      'Early leads often fade: an early significant look is much likelier to be luck than one at the planned end',
      'None: significant is significant',
      'Shipping early costs a little revenue, nothing more',
    ],
    correct: 0,
    why: [
      'Right: with few visitors the result swings, and a lead that crosses the line early often falls back.',
      'Significance on one planned look and on the best of many looks are not the same thing.',
      'The real cost is shipping a change that may do nothing at all.',
    ],
  },
  {
    id: 'watch-safely',
    chapter: '04-peeking',
    question: 'A team must be able to watch results every day. What lets them do that and still trust a win?',
    options: [
      'Methods built for watching, whose results stay valid however often you look',
      'Lowering the bar so wins come sooner',
      'Checking twice a day instead of once',
    ],
    correct: 0,
    why: [
      'Right: these methods are designed so a win still means what it says, however often you look.',
      'A lower bar makes luck win even more often.',
      'More looks add more chances for luck, not fewer.',
    ],
  },
  // 5. Twenty colours
  {
    id: 'many-metrics',
    chapter: '05-twenty-colours',
    question:
      'A test tracks 40 metrics. One of them, time on the help page, shows a significant change. What is the sensible first reaction?',
    options: [
      'Treat it with doubt: with 40 metrics, one false win is likely',
      'Celebrate: a significant change was found',
      'Drop the other 39 metrics from the report',
    ],
    correct: 0,
    why: [
      'Right: each metric is another comparison, so one striking result among 40 is what luck tends to produce.',
      'One significant result among many is weak evidence on its own.',
      'Hiding the other comparisons makes the lucky one look more convincing, not more real.',
    ],
  },
  {
    id: 'correction-cost',
    chapter: '05-twenty-colours',
    question: 'A correction for many comparisons cuts false wins. What does it cost?',
    options: [
      'Power: with a stricter bar for each test, real changes are missed more often',
      'Nothing at all',
      'It makes every test take exactly twice as long',
    ],
    correct: 0,
    why: [
      'Right: raising the bar for each comparison means a real but small change clears it less often.',
      'A stricter bar always trades some power for fewer false wins.',
      'It changes the bar, not the length; the test runs as long as it was planned to.',
    ],
  },
  {
    id: 'decide-in-advance',
    chapter: '05-twenty-colours',
    question: 'How can a team avoid the twenty-colours trap before a test even starts?',
    options: [
      'Decide in advance which comparison decides the test, and correct for any extra ones',
      'Add more colours so the best one stands out',
      'Look at the results first, then pick the metric that moved',
    ],
    correct: 0,
    why: [
      'Right: one pre-chosen comparison keeps false wins near the level, and a correction covers the rest.',
      'More colours mean more chances for a lucky winner.',
      'Picking the metric after seeing results is the trap itself.',
    ],
  },
  // 6. Guardrails
  {
    id: 'guardrail-example',
    chapter: '06-guardrails',
    question:
      'A food-delivery app tests a bigger “Order again” button; orders go up. Which would make a good guardrail metric?',
    options: ['Refunds and complaints per order', 'Orders, measured again', 'The button’s colour'],
    correct: 0,
    why: [
      'Right: a guardrail watches what must not get worse while the primary metric rises.',
      'Orders are the primary metric; measuring them again can’t show what the win costs.',
      'The colour is part of the change, not a measure of its effect.',
    ],
  },
  {
    id: 'moved-not-business',
    chapter: '06-guardrails',
    question: 'A pop-up raises sign-ups by 8%, but cancellations in the first week rise just as much. What happened?',
    options: [
      'The metric moved but the business didn’t: the extra sign-ups don’t stay',
      'A clear win: sign-ups were the goal',
      'The test was broken, because two numbers moved',
    ],
    correct: 0,
    why: [
      'Right: the primary metric rose, and a guardrail shows the gain leaking out the other side.',
      'Sign-ups that cancel within a week don’t help the business the test was meant to serve.',
      'A change can move several numbers at once; that is why guardrails are watched.',
    ],
  },
  {
    id: 'ship-rule-guardrail',
    chapter: '06-guardrails',
    question: 'When should a variant ship?',
    options: [
      'When the primary metric wins and every guardrail holds',
      'When the primary metric wins, whatever else happens',
      'When at least one metric improves',
    ],
    correct: 0,
    why: [
      'Right: a win that breaks a guardrail trades one number for another.',
      'Ignoring the guardrails is how a banner that floods returns gets shipped.',
      'With enough metrics one will improve by luck alone.',
    ],
  },
  // 7. Ship or stop
  {
    id: 'rule-first',
    chapter: '07-ship-or-stop',
    question: 'Why write the decision rule before the results come in?',
    options: [
      'So the results can’t bend the rule to fit what people hoped for',
      'So the test runs faster',
      'Because the results are easier to read with a rule',
    ],
    correct: 0,
    why: [
      'Right: a rule fixed in advance treats every result the same way, wanted or not.',
      'The rule decides what happens after the test; it doesn’t change how long it runs.',
      'It may help reading, but its job is to stop hopes from choosing the decision.',
    ],
  },
  {
    id: 'lucky-ship',
    chapter: '07-ship-or-stop',
    question: 'A team follows its rule perfectly for a year. Will every change it ships truly work?',
    options: [
      'No: at a 5% level, about 1 in 20 changes that do nothing will still pass',
      'Yes: the rule only ships significant results',
      'Yes, as long as no one peeked',
    ],
    correct: 0,
    why: [
      'Right: a good rule keeps false wins rare, not impossible.',
      'Significant results can still be luck; the level sets how often.',
      'Not peeking keeps false wins near the level, but the level is not zero.',
    ],
  },
  {
    id: 'stop-vs-keep',
    chapter: '07-ship-or-stop',
    question:
      'A well-powered test with plenty of shoppers finds no significant difference. Under the module’s rule, what happens?',
    options: [
      'Stop: it had enough shoppers to find a change worth having, and found none',
      'Keep testing until it becomes significant',
      'Ship it, since it did no harm',
    ],
    correct: 0,
    why: [
      'Right: a test that could have found the change and didn’t is good evidence the change is too small to matter.',
      'Running on until it turns significant is peeking by another name.',
      'Shipping needs a win, not just the absence of harm.',
    ],
  },
];
