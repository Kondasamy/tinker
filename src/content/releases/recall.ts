// Releases' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea
// in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: ship to a few first, watch, and keep a way back that is faster than a fix.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-straight-to-everyone',
  C2 = '02-tests-on-every-change',
  C3 = '03-a-few-first',
  C4 = '04-deploy-now-switch-on-later',
  C5 = '05-back-it-out',
  C6 = '06-step-by-step',
  C7 = '07-release-plan';

export const RECALL: RecallItem[] = [
  {
    id: 'few-watch-way-back',
    chapter: C6,
    pin: true,
    question:
      'A colleague says: “Our tests pass, so let’s ship the new search to everyone, and fix anything that breaks.” What do you tell them?',
    options: [
      'Ship to a few first, watch their errors, and keep a way back that is faster than a fix',
      'Right: passing tests mean it is safe for everyone',
      'Wait until a test exists for every possible bug',
    ],
    correct: 0,
    why: [
      'Right. Few customers meet a bug, the check sees it, and the way back ends it in minutes.',
      'Tests only catch the bugs someone wrote a test for; the rest reach every customer at once.',
      'Nobody can test every bug; a canary and a fast way back cover the ones tests miss.',
    ],
  },
  // 1. Straight to everyone
  {
    id: 'all-at-once',
    chapter: C1,
    question: 'A game ships an update to every player at once, and it corrupts some saves. Who is affected?',
    options: ['Every player who loads a save before it is undone', 'Only the testers', 'Only players who report it'],
    correct: 0,
    why: [
      'Right: everyone got the update together, so everyone can meet the bug.',
      'Testers saw it before release; this bug got past them to everyone.',
      'Reports lag the harm: many more meet it than say so.',
    ],
  },
  {
    id: 'rollback-takes-time',
    chapter: C1,
    question: 'A team pulls a rollback the moment errors spike. Why do errors keep coming for a few minutes?',
    options: [
      'Putting the old version back on every server takes time',
      'The rollback is broken',
      'Errors always lag the screen by an hour',
    ],
    correct: 0,
    why: [
      'Right: until each server runs the old version again, the bug keeps serving customers.',
      'A working rollback still takes minutes; nothing is broken.',
      'Errors are counted as they happen; the delay is the rollback itself.',
    ],
  },
  {
    id: 'harm-grows',
    chapter: C1,
    question:
      'Two bad releases hit everyone. One is rolled back in 2 minutes, the other in 20. Which hurt more people?',
    options: ['The 20-minute one, about ten times more', 'The same: both reached everyone', 'The 2-minute one'],
    correct: 0,
    why: [
      'Right: harm piles up every minute the bad version runs.',
      'Both reached everyone, but the harm grows with each minute it stays.',
      'A faster way back means fewer failed minutes, not more.',
    ],
  },
  // 2. Tests on every change
  {
    id: 'green-not-safe',
    chapter: C2,
    question: 'Every gate in the pipeline is green. What does that prove?',
    options: ['Every test someone wrote passed', 'The change has no bugs', 'Customers will like the change'],
    correct: 0,
    why: [
      'Right: tests check what they were written to check, and nothing else.',
      'A bug no test looks at passes every gate.',
      'Tests check behaviour, not whether customers like it.',
    ],
  },
  {
    id: 'gate-stops',
    chapter: C2,
    question: 'A test checks that a discount never makes a price negative. A change breaks that. What happens?',
    options: ['The pipeline stops the change at that test', 'It ships, then the test runs', 'The test is skipped'],
    correct: 0,
    why: [
      'Right: a failing gate stops the change before any customer sees it.',
      'Tests run before shipping; that is the point of the pipeline.',
      'A pipeline runs every gate in order; nothing is skipped.',
    ],
  },
  {
    id: 'add-a-test',
    chapter: C2,
    question: 'A bug in the address form reached customers. How do you make sure the pipeline stops it next time?',
    options: ['Write a test that checks that form', 'Run the pipeline twice', 'Add another build gate'],
    correct: 0,
    why: [
      'Right: once a test checks it, a gate can stop it.',
      'Running the same tests again finds the same nothing.',
      'A build gate checks the code can be built into a working program, not that the form works.',
    ],
  },
  // 3. A few first
  {
    id: 'canary-luck',
    chapter: C3,
    question:
      'A canary of 8 users had 1 error after two minutes; the rest are at 1%. The team rolls back. What happened?',
    options: [
      'Maybe nothing: 1 in 8 can be luck, a false alarm',
      'The new version is certainly broken',
      'The canary was too big',
    ],
    correct: 0,
    why: [
      'Right: so few users make one unlucky error look like a 12% rate.',
      'One error in eight is too few to say the version is worse.',
      'A small canary is what makes luck loud here, not a big one.',
    ],
  },
  {
    id: 'bake-longer',
    chapter: C3,
    question: 'The canary check keeps ringing for changes that turn out fine. What helps most?',
    options: [
      'Bake longer, or use a bigger canary, so the check sees more requests',
      'Lower the threshold so it rings sooner',
      'Skip the check for small changes',
    ],
    correct: 0,
    why: [
      'Right: more requests make luck smaller next to a real gap.',
      'A stricter check rings even more often by luck.',
      'Small changes have bugs too; dropping the check loses the canary’s point.',
    ],
  },
  {
    id: 'small-miss',
    chapter: C3,
    question:
      'A change fails 1.5% of payments against 1% before. The canary check rings only at 2 in 100 worse. What happens?',
    options: ['It passes the check: a miss', 'It rings at once', 'It is stopped by the pipeline'],
    correct: 0,
    why: [
      'Right: half a point is under the threshold, so it looks like luck and ships.',
      'The gap is smaller than the check’s threshold, so it does not ring.',
      'The pipeline only stops bugs that a test checks.',
    ],
  },
  // 4. Deploy now, switch on later
  {
    id: 'deploy-vs-release',
    chapter: C4,
    question: 'New code is deployed with its flag off. Who uses it?',
    options: [
      'Nobody, until the flag is switched on',
      'Everyone, since it is deployed',
      'Only the developers’ test servers',
    ],
    correct: 0,
    why: [
      'Right: deploying puts the code out; the flag decides who sees it.',
      'With its flag off, deployed code is not used by anyone.',
      'It is on the real servers, just switched off.',
    ],
  },
  {
    id: 'flag-fast',
    chapter: C4,
    question: 'A feature behind a flag starts failing. What is the fastest way back?',
    options: ['Switch the flag off', 'Roll back the whole deploy', 'Ship a fix'],
    correct: 0,
    why: [
      'Right: every server reads the flag, so it goes back within a minute.',
      'A rollback works but takes longer than flipping a switch.',
      'A fix has to be written and shipped while customers keep failing.',
    ],
  },
  {
    id: 'flag-share',
    chapter: C4,
    question: 'A team turns a feature’s flag on for 10% of users. What is that like?',
    options: ['A canary, controlled by a switch instead of a deploy', 'A full release', 'A test in the pipeline'],
    correct: 0,
    why: [
      'Right: a few users get it first, and the share changes without shipping code.',
      'Nine in ten users still don’t see it.',
      'Real users see it; a pipeline test runs before anyone does.',
    ],
  },
  // 5. Back it out
  {
    id: 'migration-no-back',
    chapter: C5,
    question:
      'A release moved orders into a new table and dropped the old one. It has a bug. Why can’t they roll back?',
    options: [
      'The old version reads the old table, which is gone',
      'Rollbacks never work for databases',
      'The new table is too big to copy',
    ],
    correct: 0,
    why: [
      'Right: the old code has nothing to read, so going back breaks it worse.',
      'Database changes can roll back when the old layout is kept beside the new.',
      'Size isn’t the problem; the old code can’t find its data.',
    ],
  },
  {
    id: 'expand-contract',
    chapter: C5,
    question: 'What is the order of an expand-and-contract change?',
    options: [
      'Add the new beside the old, move everyone over, then remove the old',
      'Remove the old, then add the new',
      'Add the new, and keep both for ever',
    ],
    correct: 0,
    why: [
      'Right: while both exist, either version works, so the way back stays open.',
      'Removing first breaks the old version, and with it the way back.',
      'Never contracting leaves two copies to keep in step.',
    ],
  },
  {
    id: 'plan-way-back',
    chapter: C5,
    question: 'When should a team plan how to undo a change?',
    options: ['Before it ships', 'After the first error', 'Only for big changes'],
    correct: 0,
    why: [
      'Right: some changes, like data migrations, can only be undone if planned that way.',
      'By then a change that moved data may have no way back.',
      'Small migrations can block a rollback as surely as big ones.',
    ],
  },
  // 6. Step by step
  {
    id: 'stage-check',
    chapter: C6,
    question: 'A staged rollout goes 1%, 10%, 50%, 100%. When does its check run?',
    options: ['At the end of each stage, before the next step up', 'Only once, at 100%', 'Before the rollout starts'],
    correct: 0,
    why: [
      'Right: each step up waits for the stage before it to look healthy.',
      'At 100% everyone already has it; there is no one left to compare with.',
      'The check needs real users on the new version to compare.',
    ],
  },
  {
    id: 'auto-rollback',
    chapter: C6,
    question: 'A rollout’s check rings at 2 am and the change is rolled back before anyone wakes. What did that?',
    options: ['An automatic rollback, started by the check', 'A customer complaint', 'The pipeline'],
    correct: 0,
    why: [
      'Right: the rollout watches its own numbers and pulls the lever itself.',
      'Complaints come later; the check saw the numbers first.',
      'The pipeline ran before shipping; this happened after.',
    ],
  },
  {
    id: 'stages-limit',
    chapter: C6,
    question: 'Why does a staged rollout hurt fewer people than releasing to everyone?',
    options: [
      'A bad change is stopped while only a small share has it',
      'Bugs are less likely in staged releases',
      'Each stage fixes the bugs of the last',
    ],
    correct: 0,
    why: [
      'Right: the bug is the same, but few customers meet it before it stops.',
      'The code is the same either way; only who meets it changes.',
      'Stages don’t fix anything; they limit who meets the bug.',
    ],
  },
  // 7. Plan the release
  {
    id: 'no-check',
    chapter: C7,
    question: 'A rollout has stages but no automatic check. A bad change ships. What happens?',
    options: ['It climbs every stage to everyone', 'It stops at the first stage', 'The flag switches off by itself'],
    correct: 0,
    why: [
      'Right: without a check, nothing tells the rollout to stop.',
      'Stopping needs a check or a person watching.',
      'A flag only goes off when someone, or a check, switches it.',
    ],
  },
  {
    id: 'too-strict',
    chapter: C7,
    question: 'A team sets its canary check to ring at any difference at all. What goes wrong?',
    options: [
      'Good changes are rolled back by luck, and nothing ships',
      'Bad changes get through',
      'Nothing: stricter is always safer',
    ],
    correct: 0,
    why: [
      'Right: small samples always differ a little, so the check rings for nothing.',
      'A strict check catches bad changes; it also catches good ones.',
      'Too strict has its own cost: false alarms that block every release.',
    ],
  },
  {
    id: 'trade-off',
    chapter: C7,
    question: 'A team wants fewer customers hurt by bad releases and good ones out sooner. What gives both?',
    options: [
      'A canary big enough to judge quickly, a check, and a flag for a fast way back',
      'Releasing to everyone at once',
      'A very long bake at every stage',
    ],
    correct: 0,
    why: [
      'Right: a bigger sample decides sooner, and a flag cuts the way back to a minute.',
      'Everyone at once is fast, but every bug reaches every customer.',
      'Long bakes are safe but keep good changes waiting.',
    ],
  },
];
