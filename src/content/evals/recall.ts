// Module 4's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation, not the chapter's own question. Claims about evals come from data/evals/facts.json (R5).
// The registry imports this bank and the e2e specs import the registry in Node, so it reads facts only, not the engine.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/evals/facts';

export const RECALL: RecallItem[] = [
  // 1. It worked when I tried it
  {
    id: 'whole-set-not-tries', chapter: '01-it-worked-when-i-tried-it', pin: true,
    question: 'Larkspur’s team swaps the model behind the assistant for a newer one. The support lead asks it five questions, and every answer is better than before. What shows the swap is safe to ship?',
    options: [
      'The five better answers: they came from someone who knows the questions',
      'Running the whole test set on the old and the new setup, and finding no question that passed before and fails now',
      'The newer model’s higher score on a public benchmark',
      'Asking the new model whether its answers improved',
    ],
    correct: 1,
    why: [
      'Five questions are the ones someone thought to ask. A change can fix those and break one nobody asked, as v2 did.',
      `Right. The same questions, run on both setups, show what got fixed and what broke. ${fact('eval').claim}`,
      'A public benchmark tests other tasks, not Larkspur’s questions over Larkspur’s documents. It cannot tell you which of your answers broke.',
      'The model cannot see its old answers or the answers they should be. Grading needs the expected answer, outside the model.',
    ],
  },
  {
    id: 'totals-hide-regressions', chapter: '01-it-worked-when-i-tried-it',
    question: 'A new version of the warehouse assistant passes more test questions than the old one. Can the team say nothing got worse?',
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
    id: 'what-is-a-regression', chapter: '01-it-worked-when-i-tried-it',
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
    id: 'keep-the-set-fixed', chapter: '01-it-worked-when-i-tried-it',
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
    id: 'unanswerable-cases', chapter: '02-the-test-set',
    question: 'The parts-catalogue assistant’s test set has only questions the catalogue answers. A new version starts quoting prices for parts Larkspur doesn’t sell. Why does the set miss it?',
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
    id: 'known-failures-stay', chapter: '02-the-test-set',
    question: 'Last month the travel assistant quoted an old mileage rate, and the team fixed it. What should happen to that question?',
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
    id: 'what-reference-answer-does', chapter: '02-the-test-set',
    question: 'What is a test case’s reference answer for?',
    options: [
      'It’s what the assistant is told to say',
      'It’s what the graders compare the assistant’s answer against',
      'It’s the passage the retriever should find',
      'It’s the best answer a model has given so far',
    ],
    correct: 1,
    why: [
      'The assistant never sees it. If it did, the test would only check that it can copy.',
      `Right. ${fact('reference-solution').claim}`,
      'Retrieval is checked by what reaches the model. The reference answer is about the answer at the end.',
      'A model’s answer can be wrong. The team writes the reference from the documents.',
    ],
  },
  // 3. Graders
  {
    id: 'exact-match-brittle', chapter: '03-graders',
    question: 'The reference answer is “Returns are accepted within 30 days.” The assistant answers “You have 30 days to send it back.” What does exact match say?',
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
    id: 'citation-not-support', chapter: '03-graders',
    question: 'A wrong answer about the warranty cites a real passage from the battery handbook. Which grader passes it?',
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
    id: 'rubric-shapes-judge', chapter: '03-graders',
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
    id: 'check-judge-against-people', chapter: '04-judge-the-judge',
    question: 'The team wants a model judge to grade the safety assistant’s answers. What should they do before trusting its scores?',
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
    id: 'labels-can-be-wrong', chapter: '04-judge-the-judge',
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
    id: 'swap-the-order', chapter: '04-judge-the-judge',
    question: 'A judge compares two replies to a delivery question and picks the first one. Shown in the other order, it picks the other one. What should the comparison count?',
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
];
