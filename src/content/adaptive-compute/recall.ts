// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import { fact } from '../../lib/adaptive-compute/facts';
import type { RecallItem } from '../../lib/recall';

const X14 = fact('think-14x').value,
  X2 = fact('routellm-2x').value;

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'effort-edge',
    chapter: '06-per-request',
    pin: true,
    question: 'A colleague asks how to set an assistant’s effort. Which answer is right?',
    options: [
      'No setting is best for every request: send extra effort only where it changes the answer',
      'Always the highest effort: a better answer is worth any price',
      'Pick one middle setting and use it for everything',
    ],
    correct: 0,
    why: [
      'Right: thinking, looking up, checking and a bigger model each fix different requests, and cost on the rest.',
      'The budget goes on requests that never needed it, and runs out before the hard ones.',
      'A middle setting still overpays on easy requests and underpays on the hard ones.',
    ],
  },
  // 1. One setting for all
  {
    id: 'max-runs-out',
    chapter: '01-one-setting',
    question: 'A taxi firm sends its biggest van to every booking, even one person with no bags. What goes wrong?',
    options: [
      'The vans are tied up on small jobs, and big bookings wait',
      'Nothing: everyone gets the roomiest ride',
      'Single riders get a worse ride in a van',
    ],
    correct: 0,
    why: [
      'Right: the most effort for everyone spends capacity where it changes nothing.',
      'Every booking is served well until the vans run out; the waste is the problem.',
      'The ride is fine; it is the cost and the waiting that suffer.',
    ],
  },
  {
    id: 'min-wrong',
    chapter: '01-one-setting',
    question: 'An assistant runs with no extra effort at all. What is the catch?',
    options: [
      'It is cheap, but every request that needed effort comes out wrong',
      'None: easy and hard requests come out the same',
      'It costs more, because it has to retry',
    ],
    correct: 0,
    why: [
      'Right: easy requests are fine; puzzles, live facts, sums and hard reading go wrong.',
      'Hard requests need something extra; without it they fail.',
      'Without retries or checks it spends the least, and is wrong more often.',
    ],
  },
  {
    id: 'billed',
    chapter: '01-one-setting',
    question: 'A model “thinks” before answering, and the thinking is hidden. Do you pay for it?',
    options: [
      'Yes: the hidden thinking is billed like the words of the answer',
      'No: only the visible answer is billed',
      'Only if you ask to see the thinking',
    ],
    correct: 0,
    why: [
      'Right: the thinking words are generated and billed, seen or not.',
      'Hidden doesn’t mean free; every generated word costs.',
      'Showing it or not changes what you see, not what you pay.',
    ],
  },
  // 2. Think longer
  {
    id: 'think-helps',
    chapter: '02-think-longer',
    question: 'Which request gains most from letting a model think longer?',
    options: [
      'Planning a three-stop delivery route under time limits',
      'Today’s weather in Leeds',
      'What a shop’s returns window is, from its handbook',
    ],
    correct: 0,
    why: [
      'Right: it needs several steps of working out, which is what thinking adds.',
      'Today’s weather is a live fact; no thinking finds it.',
      'The handbook already gives the answer; thinking adds only cost.',
    ],
  },
  {
    id: 'think-no-facts',
    chapter: '02-think-longer',
    question: 'A bot gets a product’s price wrong. Someone suggests more thinking. Why won’t that help?',
    options: [
      'The price is a fact it doesn’t have; thinking can’t create it',
      'Thinking only helps with long questions',
      'It would help, if the effort were set high enough',
    ],
    correct: 0,
    why: [
      'Right: thinking works with what the model knows, and today’s price isn’t in it.',
      'Length isn’t it: a short puzzle still benefits from thinking.',
      'No amount of working out turns a missing fact into a known one.',
    ],
  },
  {
    id: 'think-vs-bigger',
    chapter: '02-think-longer',
    question: 'On questions a small model sometimes gets right, what can beat a much bigger model?',
    options: ['The small model, thinking longer', 'Nothing: bigger always wins', 'The small model, answering faster'],
    correct: 0,
    why: [
      `Right: in Snell et al.’s tests, extra thinking beat a model ${X14} times larger on such questions.`,
      'Not on questions within the small model’s reach; there, thinking can win for the same spend.',
      'Answering faster spends less effort, not more.',
    ],
  },
  // 3. Look it up
  {
    id: 'lookup-when',
    chapter: '03-look-it-up',
    question: 'Which request needs a look-up most?',
    options: [
      'Is the 2 pm train to York running late?',
      'How many days are in a leap year?',
      'Rewrite this email more politely',
    ],
    correct: 0,
    why: [
      'Right: whether a train is late right now lives only in a live source.',
      'A fixed fact the model already knows; a look-up adds cost for nothing.',
      'Rewriting needs no outside fact at all.',
    ],
  },
  {
    id: 'lookup-cheap',
    chapter: '03-look-it-up',
    question: 'For a question about today’s stock, why is a look-up better than a bigger model?',
    options: [
      'It brings in today’s figure, which no model has, and costs less',
      'A bigger model would know today’s stock if it were big enough',
      'They work equally well; pick the cheaper',
    ],
    correct: 0,
    why: [
      'Right: the fix is the missing fact, and fetching it is cheap.',
      'However big, a model learnt from text written before today.',
      'The bigger model still lacks today’s figure, so they don’t work equally.',
    ],
  },
  {
    id: 'lookup-puzzle',
    chapter: '03-look-it-up',
    question: 'Sending puzzles to a look-up instead of thinking: what happens?',
    options: [
      'They come out wrong: there is nothing to fetch, only working-out to do',
      'They come out right, and cheaper',
      'They come out right, but slower',
    ],
    correct: 0,
    why: [
      'Right: each kind of effort fixes its own kind of wrong answer.',
      'Cheaper, yes, but the puzzle still needs working out.',
      'A look-up can’t do the working-out a puzzle needs, at any speed.',
    ],
  },
  // 4. Check the work
  {
    id: 'check-where',
    chapter: '04-check-the-work',
    question: 'Where does a second checking pass pay for itself?',
    options: [
      'On payslip totals, where slips happen and cost money',
      'On greetings at the start of a chat',
      'On every answer, equally',
    ],
    correct: 0,
    why: [
      'Right: a check catches slips, so it pays where slips are likely and costly.',
      'Nothing in a greeting can go wrong for a checker to catch.',
      'A check costs the same everywhere but only catches something where mistakes happen.',
    ],
  },
  {
    id: 'check-cost',
    chapter: '04-check-the-work',
    question: 'What does adding a checker do to the bill?',
    options: [
      'Adds a second pass on every answer it checks',
      'Nothing: checking is free',
      'Halves it, by catching mistakes early',
    ],
    correct: 0,
    why: [
      'Right: each checked answer is worked twice, so it costs more.',
      'The checker does real work, and real work is billed.',
      'Catching mistakes saves trouble later, not the cost of the check.',
    ],
  },
  {
    id: 'check-right-already',
    chapter: '04-check-the-work',
    question: 'Answers that are already always right go through a checker too. What changes?',
    options: ['Only the bill goes up', 'They become even more right', 'They come back faster'],
    correct: 0,
    why: [
      'Right: there was nothing to catch, so the check bought nothing.',
      'Right is right: a check can’t improve an answer with no mistake in it.',
      'A second pass adds time; it never removes it.',
    ],
  },
  // 5. The bigger model
  {
    id: 'big-when',
    chapter: '05-bigger-model',
    question: 'Which request most needs the bigger model?',
    options: [
      'Does this 30-page insurance policy cover flood damage from a burst pipe?',
      'What time does the pharmacy close?',
      'Add up these four prices',
    ],
    correct: 0,
    why: [
      'Right: hard reading of long, tangled terms is where a bigger model earns its price.',
      'A handbook fact: the everyday model has it already.',
      'Sums need a check, not a bigger model.',
    ],
  },
  {
    id: 'big-not-thinking',
    chapter: '05-bigger-model',
    question: 'A model misreads hard contracts even when told to think step by step. Why?',
    options: [
      'On the hardest questions, extra thinking helps little; the model is out of its depth',
      'It didn’t think long enough; double the effort',
      'It needs a look-up of the contract first',
    ],
    correct: 0,
    why: [
      'Right: Snell et al. found the hardest questions gained little from thinking; a bigger model was the better spend.',
      'More of the same effort barely helps when the model can’t grasp the text.',
      'It already has the contract; the reading is the hard part.',
    ],
  },
  {
    id: 'big-only-there',
    chapter: '05-bigger-model',
    question: 'The bigger model gets hard reading right. Why not send everything to it?',
    options: [
      'It is the priciest per answer, and easy requests gain nothing from it',
      'It is worse at easy questions',
      'It can’t answer short questions',
    ],
    correct: 0,
    why: [
      'Right: you would pay the top price on requests the everyday model answers just as well.',
      'It answers easy ones fine; the problem is the price.',
      'It answers short questions fine, at a higher price.',
    ],
  },
  // 6. Deciding per request
  {
    id: 'route-what',
    chapter: '06-per-request',
    question: 'What does a sorter in front of the assistant do?',
    options: [
      'Reads each request and sends it only where it needs effort',
      'Answers easy requests itself, with no model',
      'Adds the most effort to every request, to be safe',
    ],
    correct: 0,
    why: [
      'Right: it decides, per request, where the effort goes.',
      'It doesn’t answer; it chooses who answers and how.',
      'That is maximum effort, the setting routing replaces.',
    ],
  },
  {
    id: 'route-saves',
    chapter: '06-per-request',
    question: 'Routing gets the same answers as maximum effort. What changes?',
    options: ['The bill: a fraction of it', 'Nothing at all', 'More answers come out right'],
    correct: 0,
    why: [
      'Right: each request gets only the effort that changes it, so the rest isn’t spent.',
      'Same answers, yes, but far less spent.',
      'Maximum effort already got them all right; routing matches it, cheaper.',
    ],
  },
  {
    id: 'route-real',
    chapter: '06-per-request',
    question: 'In RouteLLM’s tests, what did a router choosing a strong or weak model per question do?',
    options: [
      `Cut costs by over ${X2} times in some tests, with no loss in quality`,
      'Raised quality, at a higher cost',
      'Made no difference to cost',
    ],
    correct: 0,
    why: [
      'Right: sending only the hard questions to the strong model saved over half.',
      'It kept quality level and cut cost; it didn’t trade one for the other.',
      'The point was the saving, which in some tests passed half.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-easy',
    chapter: '07-workbench',
    question: 'On a tight budget, what should the easy requests get?',
    options: ['No extra effort at all', 'A check, to be sure', 'The bigger model, to be safe'],
    correct: 0,
    why: [
      'Right: they are right already, so any effort there takes from the requests that need it.',
      'A check on a right answer only adds to the bill.',
      'The top price for an answer the everyday model already gets right.',
    ],
  },
  {
    id: 'bench-one',
    chapter: '07-workbench',
    question: 'Each hard kind of request is wrong. What fixes the most within a budget?',
    options: [
      'The one kind of effort each kind needs, and no more',
      'Every kind of effort on every hard request',
      'The bigger model for all of them',
    ],
    correct: 0,
    why: [
      'Right: matching effort to the kind of wrong gets them all right for the least.',
      'Stacking every effort fixes them, and runs the budget dry.',
      'The bigger model fixes hard reading, not live facts or slips in sums.',
    ],
  },
  {
    id: 'bench-measure',
    chapter: '07-workbench',
    question: 'How do you find which effort a kind of request needs?',
    options: [
      'Try each on a sample of those requests and compare answers and cost',
      'Use whichever setting the model’s maker recommends',
      'Assume the dearest option is the best',
    ],
    correct: 0,
    why: [
      'Right: your own requests show which effort changes the answer.',
      'A maker’s default fits its average customer, not your requests.',
      'The dearest option often changes nothing for a given kind.',
    ],
  },
];
