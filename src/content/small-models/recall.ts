// Small models' recall bank: the recap and the warm-up ask from it. Each item asks a chapter's idea in a new situation;
// every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's one idea, pinned: route the easy ones, fall back when unsure, and let the gate decide
  {
    id: 'cascade-shape',
    chapter: '05-fall-back-when-unsure',
    pin: true,
    question:
      'A travel site wants to cut its model bill. Most questions are “what time is check-in?”; a few are tangled refund disputes. What setup fits?',
    options: [
      'Switch everything to the small model: most questions are easy',
      'Small model first; send unsure answers up to the large one; check the setup against all-large with the eval before switching',
      'Keep everything on the large model: any small-model mistake is a risk',
      'Ask the small model and the large model every time and show the longer answer',
    ],
    correct: 1,
    why: [
      'The tangled disputes are where a small model fails, and nothing would catch those failures.',
      'Right. The easy majority goes cheap, the unsure answers fall back, and the eval proves nothing the large model got right is lost.',
      'Safe but costly: the large model answers questions the small one gets right at a fraction of the price.',
      'Paying for both models on every question costs more than the large one alone, and a longer answer is not a righter one.',
    ],
  },
  // 1. Big model, small model
  {
    id: 'work-follows-weights',
    chapter: '01-big-model-small-model',
    question:
      'A phone app swaps a 7-billion-weight model for a 1-billion-weight one of the same design. Roughly how much work does each token now take?',
    options: [
      'About a seventh: the work per token follows the number of weights',
      'The same: a token is a token',
      'More: a smaller model has to think harder',
      'It depends only on how long the answer is',
    ],
    correct: 0,
    why: [
      'Right. Writing one token means a multiplication for most weights, so a seventh of the weights is about a seventh of the work.',
      'Each token runs through every layer of the model; fewer weights means fewer multiplications for that token.',
      'A model does not choose how hard to work on a token: its shape fixes the multiplications.',
      'Length sets how many tokens; the model’s size sets the work for each one.',
    ],
  },
  {
    id: 'small-less-sure',
    chapter: '01-big-model-small-model',
    question:
      'A small model and a big one, trained on the same text, both continue “Your order ships within two business…”. What do you expect?',
    options: [
      'Completely different words: small models have their own vocabulary',
      'Much the same pieces near the top, with the small one less sure and sometimes a different first pick',
      'Exactly the same five, with the same odds',
      'The small one refuses to answer',
    ],
    correct: 1,
    why: [
      'Here both read the same pieces of text; a smaller model knows the same words, it just holds less about how they go together.',
      'Right. The smaller model has room for less, so its odds are flatter and its top pick slips more often.',
      'Fewer weights can’t hold everything the big model holds, so the odds differ.',
      'A language model always gives odds for the next piece; size changes the odds, not whether it answers.',
    ],
  },
  {
    id: 'size-is-weights',
    chapter: '01-big-model-small-model',
    question: 'A vendor says its new model is “8B”. What is being counted?',
    options: [
      'The weights: about 8 billion numbers inside the model',
      'The words it was trained on',
      'The words it can read at once',
      'The bytes its answers take',
    ],
    correct: 0,
    why: [
      'Right. A model’s size is its count of weights, and the work per token and the memory it needs follow from it.',
      'Training data is counted separately, usually in tokens, and is far larger than the model.',
      'That is the context window, measured in tokens, not the model’s size.',
      'An answer’s size depends on the answer, not on the model.',
    ],
  },
  // 2. Learning from a teacher
  {
    id: 'soft-targets-why',
    chapter: '02-learning-from-a-teacher',
    question:
      'Training a small speech model, a team uses the big model’s odds for every word (“cat 70%, cap 20%, cab 5%”) instead of just “cat”. Why?',
    options: [
      'The odds show which wrong answers are nearly right, which the single right answer hides',
      'The big model’s odds are always more correct than the labels',
      'It makes training need no data at all',
      'Odds are smaller to store than the right answer',
    ],
    correct: 0,
    why: [
      'Right. “cap is close, cab less so” is extra information in every example, so the student learns more per example.',
      'The teacher can be wrong; distillation usually mixes in a little weight on the true answer for that reason.',
      'The student still needs text to read: the teacher gives odds on that text.',
      'A whole set of odds is more to store than one answer; it is used because it teaches more.',
    ],
  },
  {
    id: 'student-trails-teacher',
    chapter: '02-learning-from-a-teacher',
    question:
      'After distillation, a student a third the size of its teacher is scored on text neither trained on. What is the usual result?',
    options: [
      'Its loss is a little worse than the teacher’s',
      'Its loss is three times the teacher’s',
      'Its loss beats the teacher’s',
      'The same loss: it copied the teacher',
    ],
    correct: 0,
    why: [
      'Right. The student holds less, so it trails, but learning the teacher’s odds keeps it close.',
      'Loss does not scale with size like that; a well-taught student stays near its teacher.',
      'A student learning from a teacher rarely beats it; the teacher is its ceiling on that text.',
      'It copies the odds as well as its size allows, which is not perfectly.',
    ],
  },
  {
    id: 'temperature-role',
    chapter: '02-learning-from-a-teacher',
    question: 'In distillation, why raise the temperature of the teacher’s odds?',
    options: [
      'To spread the odds out, so the near-misses carry enough weight to learn from',
      'To make the teacher pick a different top answer',
      'To make training faster on a hot machine',
      'To make the student write more creative answers later',
    ],
    correct: 0,
    why: [
      'Right. At a higher temperature the 1% options grow, so the student sees which wrong answers are close.',
      'Temperature reshapes the odds but keeps their order: the top pick stays on top.',
      'It is a number in the maths, not the hardware’s heat.',
      'It is used while teaching; the student answers at whatever temperature it is run at later.',
    ],
  },
  // 3. How close is the student
  {
    id: 'agreement-not-accuracy',
    chapter: '03-how-close-is-the-student',
    question:
      'A distilled model agrees with its teacher’s top pick 95% of the time on held-out text. Can you ship it in the teacher’s place?',
    options: [
      'Not yet: agreement says it copies the teacher; whether its answers are right needs the eval',
      'Yes: 95% agreement means 95% correct answers',
      'No: anything under 100% agreement is useless',
      'Yes, if it agrees on the training text too',
    ],
    correct: 0,
    why: [
      'Right. Agreement measures closeness to the teacher, token by token; the eval measures answers people care about.',
      'The teacher is not always right, and one changed token can change an answer.',
      'A small model never matches exactly; the question is whether the differences change the answers.',
      'Training text says even less: the student saw it.',
    ],
  },
  {
    id: 'kl-meaning',
    chapter: '03-how-close-is-the-student',
    question:
      'Two students have the same agreement with their teacher, but student B’s KL divergence is twice student A’s. What differs?',
    options: [
      'B spreads its bets less like the teacher, even where its top pick matches',
      'B is twice as often wrong',
      'B is twice the size',
      'Nothing that matters: only the top pick counts',
    ],
    correct: 0,
    why: [
      'Right. KL compares whole sets of odds, so it sees differences the top pick hides.',
      'Same agreement means the same share of matching top picks; KL is about the rest of the odds.',
      'KL compares odds, not sizes.',
      'When answers are sampled, or a router reads confidence, the rest of the odds matters too.',
    ],
  },
  {
    id: 'held-out-why',
    chapter: '03-how-close-is-the-student',
    question: 'Why measure a student on held-out text rather than on its training text?',
    options: [
      'It saw the training text, so closeness there can be memory; held-out text shows what carries over',
      'Held-out text is shorter, so it is faster',
      'The training text was deleted after training',
      'Students only work on new text',
    ],
    correct: 0,
    why: [
      'Right. New text tests what it learnt, not what it remembers.',
      'Speed is not the reason; the held-out set is chosen to be unseen.',
      'The text still exists; the point is that the model has already seen it.',
      'A student works on any text; on seen text its score just flatters it.',
    ],
  },
  // 4. Send it the easy ones
  {
    id: 'small-fails-where',
    chapter: '04-send-it-the-easy-ones',
    question:
      'An HR assistant has a small tier and a large one. Which question is the small tier most likely to get wrong?',
    options: [
      '“How many vacation days do I get?”, stated in one line of the handbook',
      '“My manager left and my project moved teams. Who signs my leave now?”',
      '“What’s the HR office’s phone number?”',
      '“When is payday?”',
    ],
    correct: 1,
    why: [
      'A fact stated in one line is a lookup; small models handle those.',
      'Right. It needs two hops and a guess at what was meant: where small models stumble.',
      'A single stated fact: a lookup.',
      'A single stated fact: a lookup.',
    ],
  },
  {
    id: 'relative-cost',
    chapter: '04-send-it-the-easy-ones',
    question:
      'Say a small model costs a fifth of a large one per token. A team sends 100 questions to the small one instead of the large one. What does that cost, in large answers?',
    options: ['About 20', 'About 100', 'About 500', 'Nothing'],
    correct: 0,
    why: [
      'Right. 100 answers at a fifth each is about 20 large answers, if answers are about the same length.',
      'That is what all-large would cost.',
      'That multiplies by five instead of dividing.',
      'A small model is cheaper, not free.',
    ],
  },
  {
    id: 'same-docs-differ',
    chapter: '04-send-it-the-easy-ones',
    question: 'Both tiers read the same retrieved documents, yet the small one picks an out-of-date policy. Why?',
    options: [
      'Reading well is part of answering: a smaller model is worse at weighing two passages that disagree',
      'The small tier was sent older documents',
      'Small models can only read one document',
      'It must have been a retrieval bug',
    ],
    correct: 0,
    why: [
      'Right. Retrieval hands both the same passages; telling the 2025 policy from the 2018 one is the model’s job.',
      'They were handed the same passages; the difference is in the reading.',
      'It reads every passage it is sent; it weighs them less well.',
      'Retrieval was the same for both, so the difference is the model.',
    ],
  },
  // 5. Fall back when unsure
  {
    id: 'confident-wrong',
    chapter: '05-fall-back-when-unsure',
    question:
      'A router sends answers up below confidence 0.8. One wrong answer had confidence 0.85. What happens to it?',
    options: [
      'It reaches the customer: the router only sees confidence, not correctness',
      'The router notices it is wrong and sends it up',
      'The large model checks every answer anyway',
      'It is dropped and the customer gets no answer',
    ],
    correct: 0,
    why: [
      'Right. A confident wrong answer passes any threshold below its score; only the eval would show it.',
      'The router never knows the right answer; it reads the score.',
      'In a cascade the large model answers only what is sent up.',
      'Answers over the threshold go out as they are.',
    ],
  },
  {
    id: 'threshold-too-high',
    chapter: '05-fall-back-when-unsure',
    question:
      'A team sets its cascade’s threshold so high that every answer goes up. How does that compare with sending everything to the large model directly?',
    options: [
      'Same answers, higher cost: it pays for the small try on every question too',
      'Better answers: two models looked at each question',
      'Cheaper: the small model did some of the work',
      'Exactly the same in every way',
    ],
    correct: 0,
    why: [
      'Right. Every question pays for the small answer and then the large one.',
      'The large model’s answer is the one sent; the small try adds nothing.',
      'The small try is wasted when every answer goes up.',
      'The answers match, but the bill does not.',
    ],
  },
  {
    id: 'stand-in-score',
    chapter: '05-fall-back-when-unsure',
    question: 'In this module the small tier’s confidence scores were set by hand. What would a real system use?',
    options: [
      'A score it computes, such as the model’s own odds for its answer, or a trained router; it must be checked like any grader',
      'The answer’s length',
      'Nothing: a real system has no way to tell',
      'The customer’s rating, before the answer is sent',
    ],
    correct: 0,
    why: [
      'Right. Real cascades and routers learn or compute a score, and its threshold is tuned against an eval.',
      'Length says little about whether an answer is right.',
      'There are ways: the model’s odds, a separate scorer, or a trained router.',
      'The customer rates after reading, too late to route.',
    ],
  },
  // 6. Gate the switch
  {
    id: 'gate-catches-regression',
    chapter: '06-gate-the-switch',
    question:
      'A cheaper router scores 91% against a 90% bar, but one question the large model got right now fails. With “no regressions” on, what does the gate say?',
    options: [
      'Don’t ship: a question that passed on the baseline regressed',
      'Ship: 91% is over the bar',
      'Ship: one question is noise',
      'The gate can’t compare different models',
    ],
    correct: 0,
    why: [
      'Right. The no-regressions rule catches exactly the answer the cheaper setup broke.',
      'The pass rate is only one of the two rules.',
      'The rule exists because one lost answer can be the one that matters.',
      'The gate compares answers to the same questions, whatever produced them.',
    ],
  },
  {
    id: 'baseline-choice',
    chapter: '06-gate-the-switch',
    question: 'Why gate the router against all-large, not against all-small?',
    options: [
      'All-large is what ships today: the router must not lose what customers already get',
      'All-small is cheaper, so it is a better baseline',
      'The baseline should be the worst version',
      'The gate needs the most expensive version',
    ],
    correct: 0,
    why: [
      'Right. The baseline is the version in production; a candidate is judged on what it would change for customers.',
      'Cost is a reason to try the router, not a reference for its answers.',
      'Beating the worst version proves little.',
      'Price is not the reason; it is the version that ships today.',
    ],
  },
  {
    id: 'cheapest-that-ships',
    chapter: '06-gate-the-switch',
    question:
      'Two router settings both pass the gate; one costs 8 and the other 14. All-large costs 12. Which do you ship?',
    options: [
      'The one costing 8',
      'The one costing 14: more answers went up',
      'Neither: keep all-large',
      'Whichever has the higher threshold',
    ],
    correct: 0,
    why: [
      'Right. Both pass the same gate, so the cheaper one gives the same guarantee for less.',
      'Sending more up costs more without passing anything the gate measures.',
      'The gate says the router is safe; keeping all-large wastes the saving.',
      'A higher threshold only adds cost once the gate is passed.',
    ],
  },
  // 7. The routing policy
  {
    id: 'policy-per-kind',
    chapter: '07-routing-policy',
    question: 'A bank sorts questions into balance lookups, fee disputes and fraud reports. Which policy fits?',
    options: [
      'Lookups to the small model, disputes through the router, fraud to the large model',
      'Everything through one router with one threshold',
      'Fraud to the small model: it is fastest',
      'Everything to the large model',
    ],
    correct: 0,
    why: [
      'Right. Each kind gets the cheapest setup that keeps its answers right; where every small answer would go up anyway, skip the router.',
      'One threshold works, but kinds that never need the large model still pay to be checked, and kinds that always need it pay twice.',
      'The hardest, costliest-to-get-wrong kind needs the strongest model.',
      'Safe, but it pays large prices for lookups the small model gets right.',
    ],
  },
  {
    id: 'router-waste',
    chapter: '07-routing-policy',
    question:
      'For one kind of question, the small model is unsure every time, so the router sends all of them up. What should the policy do for that kind?',
    options: [
      'Send them straight to the large model',
      'Keep the router: it is safer',
      'Send them to the small model',
      'Lower the threshold until some stay small',
    ],
    correct: 0,
    why: [
      'Right. Every small try is wasted; going straight to the large tier gives the same answers for less.',
      'The router adds nothing but the small try’s cost here.',
      'The small model gets these wrong; that is why it is unsure.',
      'The small answers that would stay are the wrong ones.',
    ],
  },
  {
    id: 'score-weights',
    chapter: '07-routing-policy',
    question:
      'A team scores a routing policy as points per right answer minus cost. If it doubled the points for a right answer, what would happen?',
    options: [
      'Policies that spend more for right answers would win more often',
      'Nothing: the best policy never changes',
      'The cheapest policy would always win',
      'Cost would stop mattering at all',
    ],
    correct: 0,
    why: [
      'Right. The weight says what a right answer is worth against a large call; raise it and spending on the large tier pays off sooner.',
      'The best policy depends on that weight; it is the team’s choice, and the bench says why it was set.',
      'Cheaper wins more often when right answers are worth less, not more.',
      'Cost still counts; it just weighs less against right answers.',
    ],
  },
];
