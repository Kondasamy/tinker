// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'undo-edge',
    chapter: '05-risky-step-last',
    pin: true,
    question:
      'A colleague asks for the two rules that make an agent’s multi-step job safe to stop halfway. Which pair?',
    options: [
      'Give every step an opposite step, and do the step you can’t undo last',
      'Retry every step until it works, and never undo anything',
      'Run all the steps at once, so none is ever half done',
    ],
    correct: 0,
    why: [
      'Right: opposites take a half-done run back, and the step with no opposite is never reached by a failure.',
      'Some failures never clear, and retrying a step whose answer was lost can do it twice.',
      'Steps on different systems still finish at different moments; one can fail while others went through.',
    ],
  },
  // 1. Halfway done
  {
    id: 'failure-stops',
    chapter: '01-halfway-done',
    question:
      'An onboarding bot created the account and sent the welcome email, then setting up payroll failed. What stands?',
    options: [
      'The account and the welcome email, with no payroll',
      'Nothing: the failure rolled the others back',
      'Everything: payroll will set itself up later',
    ],
    correct: 0,
    why: [
      'Right: each step finished on its own system, and a later failure doesn’t reach back to them.',
      'Separate systems have no shared undo; something has to run the opposite steps.',
      'Nothing retries by itself; the new hire waits half set up.',
    ],
  },
  {
    id: 'worst-place',
    chapter: '01-halfway-done',
    question: 'Why is a half-finished return worse than one that never started?',
    options: [
      'Its finished steps promise things the missing step never delivers',
      'It costs more tokens to run',
      'It can’t be seen in the logs',
    ],
    correct: 0,
    why: [
      'Right: Ana has a refund and an email about a pickup that never comes.',
      'The harm is in the world, not the bill: money moved and a promise was made.',
      'The log shows it plainly; the trouble is what the finished steps did.',
    ],
  },
  {
    id: 'what-next',
    chapter: '01-halfway-done',
    question: 'Step four of five failed. What are the two ways to leave the job whole?',
    options: [
      'Finish the missing steps, or undo the finished ones',
      'Delete the log, or restart the server',
      'Wait, or tell the customer it worked',
    ],
    correct: 0,
    why: [
      'Right: go forward to done, or back to nothing; anything between is half done.',
      'Neither changes what the finished steps did out in the world.',
      'Waiting leaves it half done, and saying it worked makes it worse.',
    ],
  },
  // 2. Save points
  {
    id: 'restart-redo',
    chapter: '02-save-points',
    question: 'A bot that books three couriers crashes after the second. It kept no record. What does its restart do?',
    options: ['Books all three again: two couriers come twice', 'Books only the third', 'Cancels the first two'],
    correct: 0,
    why: [
      'Right: with no record it can’t tell what it did, so it starts from the top.',
      'Only a save point would tell it the first two were done.',
      'It doesn’t know they exist, so it can’t cancel them.',
    ],
  },
  {
    id: 'what-saved',
    chapter: '02-save-points',
    question: 'What does a save point write down?',
    options: [
      'Each step as it finishes, so a restart knows where to carry on',
      'The whole database, every minute',
      'Only the steps that failed',
    ],
    correct: 0,
    why: [
      'Right: a short log of finished steps is what lets a restart resume instead of redo.',
      'A full copy is a backup; it doesn’t say which steps of this job are done.',
      'Failed steps did nothing; it’s the finished ones the restart must not repeat.',
    ],
  },
  {
    id: 'saves-not-undo',
    chapter: '02-save-points',
    question: 'Save points are on, and the courier refuses for good. Do save points fix it?',
    options: [
      'No: they help a restart carry on, but the finished steps still need undoing',
      'Yes: the log undoes the steps',
      'Yes: the restart books a different courier',
    ],
    correct: 0,
    why: [
      'Right: a log says what was done; only opposite steps take it back.',
      'A log records; it doesn’t charge back a refund.',
      'Nothing in a save point chooses a new courier.',
    ],
  },
  // 3. The opposite step
  {
    id: 'opposite-of-hold',
    chapter: '03-the-opposite-step',
    question: 'A bot put a $200 hold on a card. What is its opposite step?',
    options: ['Release the $200 hold', 'Put another $200 hold on the card', 'Set the card’s balance to last week’s'],
    correct: 0,
    why: [
      'Right: it cancels what the hold meant and nothing else.',
      'That repeats the step: now $400 is held.',
      'Last week’s balance would wipe every other payment since: undo the meaning, not the state.',
    ],
  },
  {
    id: 'undo-order',
    chapter: '03-the-opposite-step',
    question: 'Steps ran: reserve stock, charge card, book van. The van fails. In what order do the opposites run?',
    options: [
      'Refund the card, then release the stock',
      'Release the stock, then refund the card',
      'Book the van again',
    ],
    correct: 0,
    why: [
      'Right: newest first, so each undo finds the world as its step left it.',
      'Oldest first undoes the stock while the charge for it still stands.',
      'The van failed; undoing is about the steps that went through.',
    ],
  },
  {
    id: 'semantic',
    chapter: '03-the-opposite-step',
    question: 'Why not undo a seat booking by restoring the seat count from before it?',
    options: [
      'Others may have booked since: restoring the count would wipe their seats',
      'Counts can’t be saved',
      'It would be too slow',
    ],
    correct: 0,
    why: [
      'Right: an opposite step cancels your booking; it doesn’t rewind everyone else’s.',
      'Counts save fine; the trouble is what changed since.',
      'Speed isn’t the issue; correctness is.',
    ],
  },
  // 4. Some things can't be undone
  {
    id: 'no-unsend',
    chapter: '04-cant-undo',
    question: 'A bot texted a customer “your order shipped”, then the shipment was cancelled. What now?',
    options: ['Text a correction', 'Delete the text from the bot’s outbox', 'Nothing: the next text will fix it'],
    correct: 0,
    why: [
      'Right: a read text can’t be unread, so a follow-up amends it.',
      'The outbox copy goes; the customer’s copy stays.',
      'The customer believes the first text until told otherwise.',
    ],
  },
  {
    id: 'no-opposite',
    chapter: '04-cant-undo',
    question: 'Which of these steps has no true opposite?',
    options: ['Printing and posting a cheque', 'Reserving a meeting room', 'Adding a row to a spreadsheet'],
    correct: 0,
    why: [
      'Right: once it’s in the post, the best you can do is a stop-payment note after it.',
      'A room reservation can be cancelled.',
      'A row can be deleted.',
    ],
  },
  {
    id: 'follow-up-cost',
    chapter: '04-cant-undo',
    question: 'The assistant sends Ana a follow-up letter. Is the harm gone?',
    options: [
      'Less, not gone: she still got a wrong email first',
      'Yes: the second cancels the first',
      'No: the follow-up makes it worse',
    ],
    correct: 0,
    why: [
      'Right: two letters are better than one wrong one, and still a muddle.',
      'She read the first; a second can’t erase that.',
      'A correction helps; silence would leave her waiting for a pickup.',
    ],
  },
  // 5. Do the risky step last
  {
    id: 'which-last',
    chapter: '05-risky-step-last',
    question: 'A signup runs: create account, charge card, send welcome email. Which order is safest?',
    options: [
      'Account, card, then the email last',
      'Email first, so the customer knows quickly',
      'Card first, so nothing is free',
    ],
    correct: 0,
    why: [
      'Right: the email can’t be unsent, so it waits until the steps that can fail have worked.',
      'An early email promises an account a later failure may never deliver.',
      'The card can be refunded; it’s the email that has no opposite.',
    ],
  },
  {
    id: 'last-needs-none',
    chapter: '05-risky-step-last',
    question: 'Why does the last step need no opposite?',
    options: ['Nothing after it can fail and force an undo', 'Last steps never fail', 'The log undoes it'],
    correct: 0,
    why: [
      'Right: an undo is only ever needed for a step something later failed after.',
      'It can fail; then it did nothing, and the earlier steps are undone.',
      'A log records; it never undoes.',
    ],
  },
  // 6. Only once
  {
    id: 'timeout-not-fail',
    chapter: '06-only-once',
    question: 'A payment call times out. What do you know?',
    options: ['Nothing yet: it may have gone through', 'It failed', 'It went through'],
    correct: 0,
    why: [
      'Right: a timeout means no answer, not no payment.',
      'The far side may have paid and lost the reply.',
      'It may equally have never arrived.',
    ],
  },
  {
    id: 'key-does',
    chapter: '06-only-once',
    question: 'What does an idempotency key let the far side do?',
    options: ['Spot a retry and send back the first answer', 'Run the request faster', 'Undo the request later'],
    correct: 0,
    why: [
      'Right: the same key means the same request, so it’s done once.',
      'It changes nothing about speed.',
      'It prevents a double; undoing is an opposite step’s job.',
    ],
  },
  {
    id: 'key-choice',
    chapter: '06-only-once',
    question: 'Which is the better idempotency key for Ana’s refund?',
    options: ['A random string made once for this refund', 'Ana’s email address', 'Today’s date'],
    correct: 0,
    why: [
      'Right: unique to this one request, and it gives nothing about Ana away.',
      'It is personal data, and every refund she ever gets would share it.',
      'Every refund today would look like the same request.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-rule',
    chapter: '07-workbench',
    question: 'Your setup survives every refusal but still double-pays on lost answers. What is missing?',
    options: ['A key', 'A second letter', 'Moving the post box'],
    correct: 0,
    why: [
      'Right: a key turns a retry after a lost answer into the same request.',
      'A letter amends an email; it doesn’t stop a second payment.',
      'Order decides what a failure reaches; it doesn’t stop a retry repeating.',
    ],
  },
  {
    id: 'bench-crash',
    chapter: '07-workbench',
    question: 'A setup with keys but no save points restarts after a crash. Why can steps still double?',
    options: [
      'With no log, the restart sends fresh requests with fresh keys',
      'Keys expire the moment the assistant crashes',
      'A crash undoes every finished step',
    ],
    correct: 0,
    why: [
      'Right: the keys live in the log; without it the restart can’t reuse them.',
      'Keys are kept for a day or more; the restart simply doesn’t know them.',
      'A crash undoes nothing; the finished steps still stand.',
    ],
  },
  {
    id: 'bench-letter',
    chapter: '07-workbench',
    question: 'With the post box last, does the second-letter switch change the score?',
    options: ['No: a failure never reaches a sent email', 'Yes: it halves the harm', 'Yes: it adds a failure'],
    correct: 0,
    why: [
      'Right: the email only goes once everything else worked, so nothing needs amending.',
      'There’s no wrong email left to amend.',
      'The letter only runs after a failure reaches a sent email.',
    ],
  },
];
