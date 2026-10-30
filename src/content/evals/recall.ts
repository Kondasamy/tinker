// Module 4's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation, not the chapter's own question. Claims about evals come from data/evals/facts.json (R5).
// The registry imports this bank and the e2e specs import the registry in Node, so it reads facts only, not the engine.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/evals/facts';

export const RECALL: RecallItem[] = [
  // 1. It worked when I tried it
  {
    id: 'whole-set-not-tries',
    chapter: '01-it-worked-when-i-tried-it',
    pin: true,
    question:
      'Larkspur’s team swaps the model behind the assistant for a newer one. The support lead asks it five questions, and every answer is better than before. What shows the swap is safe to ship?',
    options: [
      'The five better answers: they came from someone who knows the questions',
      'Running the whole test set on the old and the new setup, and finding no question that passed before and fails now',
      'The newer model’s higher score on a public test set',
      'Asking the new model whether its answers improved',
    ],
    correct: 1,
    why: [
      'Five questions are the ones someone thought to ask. A change can fix those and break one nobody asked, as v2 did.',
      `Right. The same questions, run on both setups, show what got fixed and what broke. ${fact('eval').claim}`,
      'A public test set covers other tasks, not Larkspur’s questions over Larkspur’s documents. It cannot tell you which of your answers broke.',
      'The model cannot see its old answers or the answers they should be. Grading needs the expected answer, outside the model.',
    ],
  },
  {
    id: 'totals-hide-regressions',
    chapter: '01-it-worked-when-i-tried-it',
    question:
      'A new version of the warehouse assistant passes more test questions than the old one. Can the team say nothing got worse?',
    options: [
      'Yes: a higher total means every question did at least as well',
      'No: it can fix some questions and break others, so compare them one by one',
      'Yes, as long as the total went up by more than one question',
      'No: totals mean nothing, only the questions someone tried count',
    ],
    correct: 1,
    why: [
      'A total adds fixes and breaks together. Two fixes and one break still show a higher total.',
      'Right. Only a question-by-question comparison shows a question that used to pass and now fails.',
      'The size of the gain does not matter: any number of fixes can hide a break.',
      'The total is useful, it just is not enough. Tried questions are the weaker evidence: they cover what someone thought to ask.',
    ],
  },
  {
    id: 'what-is-a-regression',
    chapter: '01-it-worked-when-i-tried-it',
    question: 'The team shortens the assistant’s instructions. Which of these is a regression?',
    options: [
      'A question that failed before the change and still fails',
      'A question that passed before the change and fails after it',
      'A new question added to the test set that fails',
      'A question that failed before the change and passes now',
    ],
    correct: 1,
    why: [
      'Something that never worked did not get worse. It is a failure to fix, not a regression.',
      'Right. A regression is something that used to work and stopped, because of the change.',
      'A new question has no “before”. It shows a gap, not something the change broke.',
      'That is a fix: the change made it work.',
    ],
  },
  {
    id: 'keep-the-set-fixed',
    chapter: '01-it-worked-when-i-tried-it',
    question: 'Why does the team run the same test questions on every version, instead of fresh questions each time?',
    options: [
      'So two versions’ results compare, question by question',
      'Because a test set, once written, should never change',
      'So the model learns the right answers',
      'It doesn’t matter which questions run, as long as there are enough of them',
    ],
    correct: 0,
    why: [
      'Right. A question run on both versions shows whether that question got better or worse. Fresh questions only give two unrelated scores.',
      `The set grows: ${fact('look-at-data').claim} It stays the same between two versions you compare.`,
      'Running a test does not teach the model anything. The model is the same before and after the test.',
      'With different questions, a lower score could mean harder questions, not a worse version.',
    ],
  },
  // 2. The test set
  {
    id: 'unanswerable-cases',
    chapter: '02-the-test-set',
    question:
      'The parts-catalogue assistant’s test set has only questions the catalogue answers. A new version starts quoting prices for parts Larkspur doesn’t sell. Why does the set miss it?',
    options: [
      'It has no case the catalogue can’t answer, where the right answer is to say so',
      'The set is too small: more catalogue questions would catch it',
      'Made-up prices can only be caught by a person',
      'It doesn’t miss it: a version that makes things up fails every case',
    ],
    correct: 0,
    why: [
      'Right. Making things up shows only where the documents are silent, so the set needs cases there, each with “say so” as its answer.',
      'More questions the catalogue answers still never ask about a part it doesn’t list. Size doesn’t fill a gap in kind.',
      'A case whose reference answer is “the catalogue doesn’t list this” catches it with an ordinary grader.',
      'Where a document answers, the new version can still answer right. It only goes wrong where nothing does.',
    ],
  },
  {
    id: 'known-failures-stay',
    chapter: '02-the-test-set',
    question:
      'Last month the travel assistant quoted an old mileage rate, and the team fixed it. What should happen to that question?',
    options: [
      'Drop it: it’s fixed now',
      'Add it to the test set with the current rate as its reference answer, so the old mistake can’t come back unseen',
      'Keep it in a separate list for the person who fixed it',
      'Add it without a reference answer: the grader will know the rate',
    ],
    correct: 1,
    why: [
      'A fix can be undone by the next change, and then nobody would notice. That is what a regression is.',
      `Right. A known failure is one of the best cases there is. ${fact('start-from-failures').claim}`,
      'A list nobody runs catches nothing. In the test set, it runs on every change.',
      'A grader compares against the reference answer. Without one, the case can’t pass or fail.',
    ],
  },
  {
    id: 'what-reference-answer-does',
    chapter: '02-the-test-set',
    question: 'What is a test case’s reference answer for?',
    options: [
      'It’s what the assistant is told to say',
      'It’s what the graders compare the assistant’s answer against',
      'It’s the passage the document search should find',
      'It’s the best answer a model has given so far',
    ],
    correct: 1,
    why: [
      'The assistant never sees it. If it did, the test would only check that it can copy.',
      `Right. ${fact('reference-solution').claim}`,
      'The search is checked by what reaches the model. The reference answer is about the answer at the end.',
      'A model’s answer can be wrong. The team writes the reference from the documents.',
    ],
  },
  // 3. Graders
  {
    id: 'exact-match-brittle',
    chapter: '03-graders',
    question:
      'The reference answer is “Returns are accepted within 30 days.” The assistant answers “You have 30 days to send it back.” What does exact match say?',
    options: [
      'Pass: the answer is right',
      'Fail: the words differ, though the meaning is the same',
      'Pass: it contains “30 days”',
      'It can’t grade it without a citation',
    ],
    correct: 1,
    why: [
      'Exact match doesn’t read meaning. It compares words.',
      `Right. ${fact('code-graders').claim}`,
      'That is the key-fact check. Exact match needs every word to match.',
      'Exact match doesn’t look at citations. That is a different check.',
    ],
  },
  {
    id: 'citation-not-support',
    chapter: '03-graders',
    question:
      'A wrong answer about the warranty cites a real passage from the battery handbook. Which grader passes it?',
    options: [
      'Has a citation',
      'Contains the key fact',
      'A person who reads the passage',
      'None: a real citation means a right answer',
    ],
    correct: 0,
    why: [
      'Right. It checks that a passage is named, not that the passage says what the answer says.',
      'The wrong answer lacks the key fact’s phrase, so this check fails it.',
      'A person who reads the passage sees it is about something else.',
      'A real passage can be the wrong one. Chapter 3’s third answer cited one and was still wrong.',
    ],
  },
  {
    id: 'rubric-shapes-judge',
    chapter: '03-graders',
    question: 'A model judge’s rubric asks “Is the answer polite and easy to read?” What will it let through?',
    options: [
      'Nothing: a model judge reads for meaning',
      'A polite, readable answer that is wrong',
      'Only answers with typos',
      'Answers without a citation',
    ],
    correct: 1,
    why: [
      'It reads for what its rubric asks. This rubric never asks whether the answer is right.',
      'Right. A judge grades what the rubric asks. A made-up policy can be perfectly polite.',
      'Typos are the one thing this rubric would catch.',
      'The rubric doesn’t ask about citations, so it won’t catch a missing one, but it won’t fail them either.',
    ],
  },
  // 4. Judge the judge
  {
    id: 'check-judge-against-people',
    chapter: '04-judge-the-judge',
    question:
      'The team wants a model judge to grade the safety assistant’s answers. What should they do before trusting its scores?',
    options: [
      'Nothing: a strong model grades well',
      'Have people label a set of answers, and measure how often the judge agrees with them',
      'Ask the judge how confident it is',
      'Run the judge twice and check it gives the same scores',
    ],
    correct: 1,
    why: [
      'Under rubric r1 the judge passed made-up policies people failed. A strong model still grades what its rubric asks.',
      `Right. ${fact('model-graders').claim}`,
      'A judge can be confident and wrong. Only an outside check shows how often it is right.',
      'Repeating it shows whether it is consistent, not whether it is right. It could be wrong the same way twice.',
    ],
  },
  {
    id: 'labels-can-be-wrong',
    chapter: '04-judge-the-judge',
    question: 'The judge and a person disagree on an answer about the parking policy. Who is right?',
    options: [
      'The person, always: labels are the truth',
      'The judge: it read the documents',
      'Check the answer against the documents: either can be wrong',
      'Neither: drop the answer from the set',
    ],
    correct: 2,
    why: [
      'People are the best grader, but they make mistakes. In chapter 4 most of r2’s disagreements were the people’s.',
      'The judge got some wrong too. Its verdict is what you are checking.',
      'Right. A disagreement is a reason to look. The reference answer settles it.',
      'A disagreement is the most useful case there is: it shows where the judge or the labels need fixing.',
    ],
  },
  {
    id: 'swap-the-order',
    chapter: '04-judge-the-judge',
    question:
      'A judge compares two replies to a delivery question and picks the first one. Shown in the other order, it picks the other one. What should the comparison count?',
    options: [
      'The first verdict: that was the real order',
      'A tie: the win didn’t hold both ways',
      'The second verdict: it is the latest',
      'Run it until one reply wins twice in a row',
    ],
    correct: 1,
    why: [
      'Neither order is the real one. The pick followed the position, not the reply.',
      `Right. ${fact('swap-orders').claim}`,
      'The second order is no fairer than the first.',
      'Running it again in the same orders only repeats the bias.',
    ],
  },
  // 5. Grading the path
  {
    id: 'reply-is-not-the-outcome',
    chapter: '05-grading-the-path',
    question:
      'Larkspur’s assistant is asked to cancel an order. It replies “Your order is cancelled.” The test checks that the reply contains “cancelled”. What can that test miss?',
    options: [
      'Nothing: the reply says the order is cancelled',
      'An order that is still open in the order system',
      'A reply that is too long',
      'A typo in the order number in the reply',
    ],
    correct: 1,
    why: [
      'The reply is what the assistant says, not what it did. In chapter 5 a right reply sat on top of a refund nobody asked for.',
      `Right. ${fact('outcome-is-state').claim}`,
      'Length is a style question. The risk here is that nothing was cancelled.',
      'A typo would show in the reply. An order left open shows only in the order system.',
    ],
  },
  {
    id: 'forbid-not-script',
    chapter: '05-grading-the-path',
    question: 'The team adds a path check to the order-status tests. Which rule fits best?',
    options: [
      'The run must call exactly these tools, in exactly this order',
      'The run must never call a tool that changes money or orders when the request only asks a question',
      'The run must make as few calls as possible',
      'The run must call every tool it was offered',
    ],
    correct: 1,
    why: [
      `A fixed script fails a run that found another good way. ${fact('grade-output-not-steps').claim}`,
      'Right. It fails the call that does harm, and leaves the assistant free to reach the answer its own way.',
      'Fewer calls is a cost question. A single refund call is few, and still wrong.',
      'Calling a tool it didn’t need is exactly the mistake the planted note caused.',
    ],
  },
  {
    id: 'judge-reads-words',
    chapter: '05-grading-the-path',
    question:
      'A run refunds an order nobody asked about, and its reply never mentions it. Which grader can still catch it?',
    options: [
      'A model judge reading the reply with a strict rubric',
      'A code check that the reply has the delivery date',
      'A check of the ledger after the run',
      'None: if the reply is silent, nothing can tell',
    ],
    correct: 2,
    why: [
      'A judge reads the words it is given. In chapter 5 r2 caught the refund only because the reply mentioned it.',
      'The date is in the reply either way: this grader passed the planted-note run.',
      'Right. The ledger shows the refund whatever the reply says.',
      'The refund is in the order system. A state check looks there.',
    ],
  },
  // 6. Run it twice
  {
    id: 'one-try-says-little',
    chapter: '06-run-it-twice',
    question:
      'A case fails once in the nightly test run. Nothing changed since yesterday, when it passed. What is the first thing to do?',
    options: [
      'Roll back yesterday’s change',
      'Run the case several more times and see how often it passes',
      'Delete the case: it is broken',
      'Nothing: one failure is noise',
    ],
    correct: 1,
    why: [
      'Nothing changed, so there is nothing to roll back. The same case can pass and fail across tries.',
      `Right. ${fact('trial').claim} Several trials show whether it is flaky, and how often it fails.`,
      'A case that sometimes fails is telling you the assistant sometimes fails. Keep it.',
      'It may be noise, or a case that fails one time in three for real customers. More trials tell them apart.',
    ],
  },
  {
    id: 'pass-at-vs-hat',
    chapter: '06-run-it-twice',
    question: 'A case passes on 2 of its 5 trials. Which is true?',
    options: [
      'pass@5 and pass^5 both fail it',
      'pass@5 passes it; pass^5 fails it',
      'pass@5 fails it; pass^5 passes it',
      'Both pass it: it passed twice',
    ],
    correct: 1,
    why: [
      `pass@5 needs only one passing trial. ${fact('pass-at-k').claim}`,
      `Right. One pass is enough for pass@5; pass^5 needs all five. ${fact('pass-hat-k').claim}`,
      'That is the wrong way round: pass^5 is the stricter one.',
      'pass^5 needs every trial to pass, and three failed.',
    ],
  },
  {
    id: 'small-suite-steps',
    chapter: '06-run-it-twice',
    question:
      'Suppose another company’s parts-catalogue assistant has a test set of 20 questions. A new version scores 5 points higher. What could explain that, with nothing better about it?',
    options: [
      'Nothing: 5 points is a real gain',
      'One flaky question that happened to pass this time',
      'The test set got easier on its own',
      'The judge got stricter',
    ],
    correct: 1,
    why: [
      'With 20 questions, one question is 5 points. A single flip makes the whole gain.',
      'Right. In a small test set one question is a big step; run each case more than once before you believe it.',
      'The questions did not change between the runs.',
      'A stricter judge would lower the score, not raise it.',
    ],
  },
  // 7. Release day
  {
    id: 'gate-needs-no-regressions',
    chapter: '07-release-day',
    question:
      'The parts-catalogue assistant ships any version that passes 70% of its test set. A new version passes 80%, and one question the shipped version answered now fails. What does the gate do, and what should it do?',
    options: [
      'Ships it, and that is fine: 80% clears the bar',
      'Ships it, but it should stop: a rule that no question that passed before may fail would block it',
      'Blocks it: 80% is too close to the bar',
      'Blocks it, because any failing question blocks a version',
    ],
    correct: 1,
    why: [
      'The bar counts passes, not which ones. A break hides inside a higher total, as v2’s did.',
      'Right. A pass-rate bar alone lets a regression through; the no-regressions rule names the broken question.',
      'A pass rate over the bar is over the bar; this gate has no margin rule.',
      'Only a no-regressions rule blocks on a question, and only on one that passed before. A question that always failed blocks nothing.',
    ],
  },
  {
    id: 'gate-trusts-grader',
    chapter: '07-release-day',
    question:
      'A team’s release gate is graded by a model judge nobody has checked against people. A version that answers with no documents at all clears the gate. What went wrong?',
    options: [
      'The bar was set too low',
      'The judge passes answers it should fail, and the gate trusts whatever grades it',
      'The test set has too many questions',
      'Nothing: the judge decided the answers were good enough',
    ],
    correct: 1,
    why: [
      'If the judge passes every answer, any bar is cleared. Raising it changes nothing.',
      'Right. A gate is only as good as its grader: check the judge against people’s labels before it decides releases.',
      'More questions give a fairer score; they don’t make a lenient judge stricter.',
      `A judge can pass made-up answers that sound fine. ${fact('model-graders').claim}`,
    ],
  },
  {
    id: 'gate-one-run',
    chapter: '07-release-day',
    question:
      'The returns assistant’s gate grades one run of each question. A version clears it by one question. What would make the call more trustworthy?',
    options: [
      'Nothing: the run is the run',
      'Run it again and ship if either run clears the gate',
      'Grade several trials of each question and count a pass only if every trial passes',
      'Lower the bar so the result is less close',
    ],
    correct: 2,
    why: [
      'A case can pass one try and fail the next with nothing changed, so one run may be luck.',
      'Shipping on the better of two runs is pass@k: it asks whether it can pass, not whether it will.',
      `Right. That is pass^k. ${fact('pass-hat-k').claim}`,
      'Moving the bar hides the doubt instead of removing it: the close question is still a coin toss.',
    ],
  },
];
