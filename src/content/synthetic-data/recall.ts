// Synthetic data's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 5. Copies of copies: the module's one pinned idea, first in the bank
  {
    id: 'copies-drift',
    chapter: '05-copies-of-copies',
    pin: true,
    question:
      'Each new version of a model trains only on text the previous version wrote. What happens over the versions?',
    options: [
      'They drift from real text, and the rare parts go first',
      'They stay the same: each copies the last faithfully',
      'They improve: each trains on cleaner text',
    ],
    correct: 0,
    why: [
      'Right: each copy learns a slightly narrower picture, and errors build up.',
      'No copy is exact; each one’s gaps and errors are passed on and added to.',
      'Model text is narrower than real text, not cleaner, so the next model learns less.',
    ],
  },
  // 1. Too few examples
  {
    id: 'rare-is-weak',
    chapter: '01-too-few-examples',
    question:
      'A travel assistant’s training chats are mostly about flights, with two about visas for rare destinations. Where will it struggle?',
    options: ['Rare visa questions', 'Flights: too much data blurs them', 'Nowhere: two examples are enough'],
    correct: 0,
    why: [
      'Right: two examples give a model little to learn an answer from.',
      'More examples of a topic make a model better at it, not worse.',
      'A model needs many examples to learn a fact reliably; two rarely do it.',
    ],
  },
  {
    id: 'counting-coverage',
    chapter: '01-too-few-examples',
    question: 'Before adding synthetic data, what should a team count first?',
    options: [
      'How many real examples each kind of request has',
      'How many words the whole dataset holds',
      'How many models they could use to write it',
    ],
    correct: 0,
    why: [
      'Right: the gaps per kind of request show where more examples would help.',
      'A big total can still hold almost nothing about a rare request.',
      'The writer comes later; first find what is missing.',
    ],
  },
  {
    id: 'rare-words',
    chapter: '01-too-few-examples',
    question: 'Why are rare requests hard for a small model even when the answer is in its training text?',
    options: [
      'Their words appear only a handful of times, so it barely learns them',
      'Rare requests are longer than common ones',
      'The model skips documents it has seen before',
    ],
    correct: 0,
    why: [
      'Right: a word seen a dozen times is a weak pattern next to one seen thousands of times.',
      'Length isn’t the issue; how often the words and facts appear is.',
      'Training reads every document; it just learns frequent patterns best.',
    ],
  },
  // 2. Ask the model to write
  {
    id: 'temperature-copies',
    chapter: '02-ask-the-model-to-write',
    question: 'A model writing quiz questions at a low temperature keeps producing the same three. What is happening?',
    options: [
      'Low temperature keeps picking the likeliest words, so replies repeat',
      'The model has run out of questions it knows',
      'Low temperature makes the model slower, not repetitive',
    ],
    correct: 0,
    why: [
      'Right: cool sampling falls into the same likely path again and again.',
      'Raising the temperature gives new questions from the same model, so it hadn’t run out.',
      'Temperature changes which words get picked, not how fast.',
    ],
  },
  {
    id: 'temperature-cost',
    chapter: '02-ask-the-model-to-write',
    question: 'What does turning the temperature up cost when writing training examples?',
    options: [
      'Replies wander off the question and lose sense',
      'Nothing: more variety is always better',
      'Every reply becomes a copy',
    ],
    correct: 0,
    why: [
      'Right: hot sampling takes unlikely words, so some replies drift off topic.',
      'Variety past a point is noise: off-topic examples teach the wrong thing.',
      'Hotter sampling makes fewer copies, not more.',
    ],
  },
  {
    id: 'synthetic-is-model-text',
    chapter: '02-ask-the-model-to-write',
    question: 'What makes training data “synthetic”?',
    options: [
      'A model wrote it, rather than people',
      'It was cleaned before training',
      'It came from a partner company',
    ],
    correct: 0,
    why: [
      'Right: synthetic data is text a model wrote to train a model.',
      'Cleaned human text is still human text.',
      'Data from elsewhere is still written by people.',
    ],
  },
  // 3. The sieve
  {
    id: 'dedupe-why',
    chapter: '03-the-sieve',
    question: 'A model wrote 500 support replies, and 200 are near-identical. Why drop them before training?',
    options: [
      'Repeats overweight one reply, so the student learns it too strongly',
      'Repeats are always wrong',
      'Training can’t read the same text twice',
    ],
    correct: 0,
    why: [
      'Right: a reply repeated 200 times counts 200 times in training.',
      'A repeated reply may be right; the problem is its weight, not its truth.',
      'Training can read repeats; that is exactly why they skew it.',
    ],
  },
  {
    id: 'filter-limit',
    chapter: '03-the-sieve',
    question: 'A fact filter keeps replies that name a product. What can still get through?',
    options: [
      'A reply naming the product with a wrong fact about it',
      'Nothing wrong: naming a product proves the reply is right',
      'Only exact copies',
    ],
    correct: 0,
    why: [
      'Right: the filter checks that a name is there, not that the claim is true.',
      'A name can sit in a fluent, wrong sentence; the filter can’t tell.',
      'Copies are dedupe’s job, and dedupe runs first.',
    ],
  },
  {
    id: 'sieve-only-removes',
    chapter: '03-the-sieve',
    question: 'After the sieve, the team has fewer examples than it hoped. What did the sieve not do?',
    options: ['Add anything new', 'Drop copies', 'Drop off-topic replies'],
    correct: 0,
    why: [
      'Right: a sieve only removes; new examples need a new source.',
      'Dropping copies is what dedupe does.',
      'Dropping replies with no product is what the fact filter does.',
    ],
  },
  // 4. The teacher's mistakes
  {
    id: 'teacher-ceiling',
    chapter: '04-the-teachers-mistakes',
    question: 'A model writes training answers about a policy it answers wrongly. What does the student learn?',
    options: ['The wrong answers, fluently', 'The right answers, by averaging', 'Nothing about the policy'],
    correct: 0,
    why: [
      'Right: the student copies its teacher, mistakes and all.',
      'Averaging many wrong guesses doesn’t produce the fact the teacher never had.',
      'It learns something: what the teacher wrote, which is the problem.',
    ],
  },
  {
    id: 'real-source',
    chapter: '04-the-teachers-mistakes',
    question: 'Where should facts for rare requests come from, if the model gets them wrong?',
    options: ['Real documents or people who know them', 'A larger batch from the same model', 'A higher temperature'],
    correct: 0,
    why: [
      'Right: a fact the writer lacks has to come from outside it.',
      'More of the same model’s answers repeat the same gaps.',
      'Heat changes which words get picked, not what the model knows.',
    ],
  },
  {
    id: 'fluent-wrong',
    chapter: '04-the-teachers-mistakes',
    question: 'Why can’t a sieve catch the teacher’s wrong answers?',
    options: [
      'They read fine and name the right products; only the fact is wrong',
      'Sieves never look at answers',
      'Wrong answers are always copies',
    ],
    correct: 0,
    why: [
      'Right: dedupe and a name check pass a fluent answer with a wrong fact.',
      'A sieve does read every answer, but checks repeats and names, not truth.',
      'A wrong answer can be unique, so dedupe keeps it.',
    ],
  },
  // 5. Copies of copies
  {
    id: 'heldout-loss',
    chapter: '05-copies-of-copies',
    question: 'How did Larkspur measure drift between generations?',
    options: [
      'Held-out loss: how surprised each model is by real text it never trained on',
      'How long each model takes to train',
      'How many words each generation writes',
    ],
    correct: 0,
    why: [
      'Right: rising held-out loss means the model reads real text worse.',
      'Training time says nothing about how well a model reads real text.',
      'Every generation wrote the same amount, so the count can’t show drift.',
    ],
  },
  {
    id: 'rare-first',
    chapter: '05-copies-of-copies',
    question: 'In Larkspur’s generations, which words did the copies get worse at guessing fastest?',
    options: ['Rare words', 'Common words', 'All words at the same rate'],
    correct: 0,
    why: [
      'Right: rare-word guesses fell far faster than guesses overall.',
      'Common words held up better: each copy saw them plenty of times.',
      'The fall was uneven: rare words led it.',
    ],
  },
  // 6. Keep the real data
  {
    id: 'accumulate-anchors',
    chapter: '06-keep-the-real-data',
    question: 'A team adds model-written examples to its data every quarter. How should it treat the original data?',
    options: [
      'Keep it in every training run, and add the new on top',
      'Swap it out for the newest examples',
      'Drop it once the model has learned it',
    ],
    correct: 0,
    why: [
      'Right: accumulating keeps the real data in the mix and anchors each run.',
      'That is replace, the arm that drifted.',
      'A model trained without it forgets it; the next model never learns it.',
    ],
  },
  {
    id: 'accumulate-limit',
    chapter: '06-keep-the-real-data',
    question: 'With the real data kept in, did Larkspur’s toy stop losing rare words entirely?',
    options: [
      'No: it slowed the loss, but rare-word guesses still fell',
      'Yes: real data stops all drift',
      'No: it lost them faster than replace',
    ],
    correct: 0,
    why: [
      'Right: loss stayed near the start, but rare-word guesses still slipped.',
      'Rare-word guesses still fell under accumulate, just more slowly.',
      'Accumulate lost them more slowly than replace, not faster.',
    ],
  },
  {
    id: 'data-mix',
    chapter: '06-keep-the-real-data',
    question: 'Replace and accumulate differ in what?',
    options: [
      'The data mix: whether real text stays in each generation’s training',
      'The model’s size',
      'The temperature used to write',
    ],
    correct: 0,
    why: [
      'Right: only what goes into training changes between the arms.',
      'Both arms train the same tiny model shape.',
      'Both arms write at the same temperature.',
    ],
  },
  // 7. Workbench
  {
    id: 'recipe-real-share',
    chapter: '07-workbench',
    question: 'Of temperature, sieve and real share, which choice moved Larkspur’s results most?',
    options: ['The real share', 'The temperature', 'The sieve'],
    correct: 0,
    why: [
      'Right: half real data kept every recipe far closer to real text.',
      'Temperature moved the results less than keeping real data did.',
      'The sieve moved the results less than keeping real data did.',
    ],
  },
  {
    id: 'two-measures',
    chapter: '07-workbench',
    question: 'Why judge a data recipe on both held-out loss and rare-word guesses?',
    options: [
      'A recipe can read common text well and still lose the rare words',
      'One of them is always enough',
      'Loss measures speed, not quality',
    ],
    correct: 0,
    why: [
      'Right: overall loss can hide what happens to the rare parts.',
      'They can disagree, so one alone can pick the wrong recipe.',
      'Loss measures how surprised a model is by real text: quality, not speed.',
    ],
  },
  {
    id: 'many-best',
    chapter: '07-workbench',
    question: 'Two recipes tie on Larkspur’s bench. What does that mean?',
    options: [
      'Either is fine for the bar the team set',
      'The bench is broken',
      'Pick the one with the higher temperature',
    ],
    correct: 0,
    why: [
      'Right: more than one recipe can clear the same bar.',
      'Ties are normal when two settings give the same result.',
      'Temperature doesn’t break a tie by itself; the measures decide.',
    ],
  },
];
