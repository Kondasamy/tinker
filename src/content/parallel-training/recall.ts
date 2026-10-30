// Many chips, one model's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';
import { BYTES } from '../../lib/parallel-training/facts';
import { BYTES_PER_PARAM as ALL } from '../../lib/parallel-training/memory';

/** training state over the weights alone */
const PER_W = ALL / BYTES.weights;

const C = {
  fit: '01-wont-fit',
  copies: '02-copies',
  shard: '03-sharding',
  pipe: '04-pipeline',
  layer: '05-inside-a-layer',
  save: '06-checkpoints',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 3. Split the copies' memory (pinned: the module's one idea)
  {
    id: 'split-trades-memory-for-waiting',
    chapter: C.shard,
    pin: true,
    question:
      'An engineer says: “Just shard everything as far as it goes, and memory is solved for free.” What is missing?',
    options: [
      'Every split saves memory by making chips send and wait more',
      'Sharding changes what the model learns',
      'Sharded memory is slower to read on the same chip',
      'Nothing: sharding is free once it is set up',
    ],
    correct: 0,
    why: [
      'Right. What a chip no longer keeps, it has to fetch or wait for, so memory is traded for waiting.',
      'The maths and the result are the same; only where each number lives changes.',
      'Each chip reads its own shard at full speed; the cost is fetching the shards it lacks.',
      'Fetching the missing pieces costs sending on every step, not once.',
    ],
  },
  // 1. It doesn't fit
  {
    id: 'training-needs-more-than-weights',
    chapter: C.fit,
    question:
      'A model’s weights take 20 GB. Roughly how much memory does training it with Adam need, before activations?',
    options: [
      `About ${20 * PER_W} GB`,
      'About 20 GB',
      `About ${(20 * (BYTES.weights + BYTES.grads)) / BYTES.weights} GB`,
    ],
    correct: 0,
    why: [
      `Right: ${ALL} bytes a parameter against ${BYTES.weights} for the weights alone, ${PER_W} times as much.`,
      'That is only the weights; training also keeps gradients and the optimiser’s numbers.',
      'Weights plus gradients is a start, but the optimiser’s state is the biggest part.',
    ],
  },
  {
    id: 'optimiser-is-the-big-part',
    chapter: C.fit,
    question: 'Of the training state an Adam run keeps for each parameter, which part is largest?',
    options: ['The optimiser state', 'The weights', 'The gradients'],
    correct: 0,
    why: [
      `Right: ${BYTES.optimiser} of the ${ALL} bytes a parameter, its own 32-bit copy of the weights plus two running averages.`,
      `Kept in 16 bits, the weights are ${BYTES.weights} bytes a parameter, the smallest part with the gradients.`,
      `Gradients are ${BYTES.grads} bytes a parameter, as small as the weights.`,
    ],
  },
  {
    id: 'one-chip-limit',
    chapter: C.fit,
    question: 'Why can’t a lab train a very large model on one chip, given enough time?',
    options: [
      'Its training state doesn’t fit in one chip’s memory',
      'One chip cannot do the maths a model needs',
      'Chips can only hold one layer each',
    ],
    correct: 0,
    why: [
      'Right: memory is the wall before time is; the state must be split across chips.',
      'Any chip can do the maths, just slowly; the state not fitting is what stops it.',
      'A chip holds as many layers as fit in its memory, not a fixed number.',
    ],
  },
  // 2. Copies and slices of data
  {
    id: 'data-parallel-average',
    chapter: C.copies,
    question: 'Four copies of a model each learn from different examples. How do they stay one model?',
    options: [
      'They average their gradients before each update',
      'Each copy updates on its own, then they vote at the end',
      'One copy trains and the others wait for its weights',
    ],
    correct: 0,
    why: [
      'Right: an all-reduce gives every copy the same mean gradient, so they all take the same step.',
      'Copies that update apart drift into different models; they must agree every step.',
      'Then only one chip works; data parallel keeps every copy training at once.',
    ],
  },
  {
    id: 'ring-bytes',
    chapter: C.copies,
    question: 'A ring all-reduce goes from 8 chips to 64. Each chip’s gradient is the same size. What does each send?',
    options: [
      'Still under twice its gradient',
      'Eight times as much as before',
      'Nothing: the biggest chip does the sum',
    ],
    correct: 0,
    why: [
      'Right: more, smaller chunks and more hops, but each chip still sends under twice its gradient.',
      'Each chip only passes to its neighbour, so its bytes don’t grow with the ring.',
      'In a ring no chip is special; each adds its share as the chunks pass by.',
    ],
  },
  {
    id: 'copies-dont-save-memory',
    chapter: C.copies,
    question: 'Does adding data-parallel copies let a model too big for one chip fit?',
    options: [
      'No: each copy still holds the whole model',
      'Yes: the model is spread over the copies',
      'Yes, once there are more copies than layers',
    ],
    correct: 0,
    why: [
      'Right: plain copies add speed, not room; each chip keeps everything.',
      'Plain copies repeat the model; spreading it needs sharding or other splits.',
      'The number of copies never changes what each one holds.',
    ],
  },
  // 3. Split the copies' memory
  {
    id: 'zero-stage-one',
    chapter: C.shard,
    question: 'Eight copies shard only their optimiser state. What does each chip now keep of it?',
    options: ['One eighth', 'All of it, compressed', 'None of it'],
    correct: 0,
    why: [
      'Right: each copy keeps its own eighth and updates only those weights’ share.',
      'Sharding cuts it into pieces, one per copy; nothing is compressed.',
      'Someone must keep each piece; every chip keeps one.',
    ],
  },
  {
    id: 'activations-dont-shard',
    chapter: C.shard,
    question: 'A team shards all its training state, yet one chip still overflows. What is likely left?',
    options: ['Activations kept for the way back', 'The gradients, which never shard', 'A spare copy of the optimiser'],
    correct: 0,
    why: [
      'Right: each chip keeps its layers’ activations, and sharding copies does not divide them.',
      'Stage 2 shards the gradients too; what remains is the activations.',
      'No spare copy exists; activations are what each layer keeps for the way back.',
    ],
  },
  // 4. Split by layers
  {
    id: 'pipeline-bubble',
    chapter: C.pipe,
    question: 'A model is split into 8 stages, with one batch at a time. What happens to most stages?',
    options: ['They sit idle, waiting for work to reach them', 'They all run at once', 'They each run the whole model'],
    correct: 0,
    why: [
      'Right: with one batch, only one stage works at a time; the rest is the bubble.',
      'A stage needs the stage before it to finish first, so they can’t all start together.',
      'Each stage holds only its own layers.',
    ],
  },
  {
    id: 'micro-batches',
    chapter: C.pipe,
    question: 'How do micro-batches shrink a pipeline’s idle time?',
    options: [
      'Stages work on different slices of the batch at once',
      'Each stage runs faster on smaller slices',
      'They skip the way back through the layers',
    ],
    correct: 0,
    why: [
      'Right: while stage 2 runs slice 1, stage 1 starts slice 2, so the line fills.',
      'The total maths is the same; what changes is how much overlaps.',
      'Every slice still goes back through the layers; only the waiting shrinks.',
    ],
  },
  {
    id: 'bubble-never-zero',
    chapter: C.pipe,
    question: 'Can enough micro-batches make a pipeline’s bubble zero?',
    options: [
      'No: the line still fills and empties once a batch',
      'Yes, once there are as many micro-batches as stages',
      'Yes, with one micro-batch per layer',
    ],
    correct: 0,
    why: [
      'Right: the bubble shrinks with more micro-batches, but the start and end always wait.',
      'With as many micro-batches as stages, almost half the time is still bubble.',
      'More micro-batches shrink it toward zero but never reach it.',
    ],
  },
  // 5. Split inside a layer
  {
    id: 'tensor-parallel-in-box',
    chapter: C.layer,
    question: 'Why do labs keep a layer’s split inside one server?',
    options: [
      'Its chips talk every layer, and the link inside a server is the fastest',
      'A server can only run one layer',
      'Layers can’t be split across servers at all',
    ],
    correct: 0,
    why: [
      'Right: a split layer waits on its link every layer, so it needs the fast one.',
      'A server runs many layers; the limit is how fast its chips can talk.',
      'They can be; it is just much slower on the link between servers.',
    ],
  },
  {
    id: 'tensor-parallel-what',
    chapter: C.layer,
    question: 'What does tensor parallel split?',
    options: [
      'The maths inside each layer, across chips',
      'The batch, into slices for copies',
      'The layers, into stages on a line',
    ],
    correct: 0,
    why: [
      'Right: each chip does part of every layer’s maths, and they swap results.',
      'Slicing the batch for copies is data parallel.',
      'Stages of layers on a line is the pipeline.',
    ],
  },
  {
    id: 'slow-link-cost',
    chapter: C.layer,
    question:
      'A layer split over two servers runs far slower than one split in a single server. Where did the time go?',
    options: ['Waiting on the slower link between servers', 'Doing twice the maths', 'Saving more checkpoints'],
    correct: 0,
    why: [
      'Right: the same all-reduces now cross a link many times slower.',
      'The maths is shared, not doubled; the time is spent talking.',
      'Saving depends on the interval, not on the split.',
    ],
  },
  // 6. A chip fails
  {
    id: 'checkpoint-interval',
    chapter: C.save,
    question: 'Why not save a checkpoint every minute, to lose the least work?',
    options: [
      'Writing it each time would eat the training time',
      'Chips fail more often when saving',
      'A checkpoint only holds the last minute',
    ],
    correct: 0,
    why: [
      'Right: each save costs minutes, so saving too often wastes more than failures do.',
      'Saving doesn’t change how often chips fail.',
      'A checkpoint holds the whole training state, whenever it is taken.',
    ],
  },
  {
    id: 'more-chips-more-failures',
    chapter: C.save,
    question: 'Why do big clusters fail more often than small ones?',
    options: [
      'Every chip can fail, so more chips mean failures sooner',
      'Big clusters use cheaper chips',
      'Chips fail when they talk too much',
    ],
    correct: 0,
    why: [
      'Right: the time between failures shrinks with every chip added.',
      'The same chips fail at the same rate each; there are just more of them.',
      'Failures come from hardware, roughly at a rate per chip, not from talking.',
    ],
  },
  {
    id: 'failure-loses-work',
    chapter: C.save,
    question: 'A chip fails three hours after the last checkpoint. What is lost?',
    options: [
      'About three hours of training, plus the restart',
      'Only that chip’s share of the work',
      'The whole run so far',
    ],
    correct: 0,
    why: [
      'Right: everyone goes back to the last save, so the work since then is redone.',
      'The chips work in step, so all of them roll back together.',
      'The checkpoint keeps everything up to it.',
    ],
  },
  // 7. Workbench
  {
    id: 'layout-fit-then-speed',
    chapter: C.bench,
    question: 'Two layouts fit in memory. How should a team pick between them?',
    options: [
      'The quicker step once lost work is counted',
      'The one using the most ZeRO',
      'The one with the most copies',
    ],
    correct: 0,
    why: [
      'Right: fitting is the bar; after that, time per step with failures counted decides.',
      'More sharding saves memory but can add sending; it is not a goal in itself.',
      'Copies alone say little; the split that waits least wins.',
    ],
  },
  {
    id: 'layouts-tie',
    chapter: C.bench,
    question: 'Two layouts differ only in ZeRO stage and take the same time a step. Is one wrong?',
    options: [
      'No: both fit, and the extra sharding adds no sending here',
      'Yes: the higher stage must be slower',
      'Yes: the lower stage can’t fit',
    ],
    correct: 0,
    why: [
      'Right: stages 1 and 2 send no more than plain copies, so time ties.',
      'Only stage 3 sends more; stages 1 and 2 send the same.',
      'If both fit, both are fine; the tie is real.',
    ],
  },
  {
    id: 'combine-splits',
    chapter: C.bench,
    question:
      'The workbench’s fastest layout uses copies, stages and a split inside each layer at once. Why combine them?',
    options: [
      'Each split fixes a different limit at a different cost',
      'More splits always run faster',
      'Combining is needed only for checkpoints',
    ],
    correct: 0,
    why: [
      'Right: layers split for memory, stages for memory across boxes, copies for speed; each has its own wait.',
      'Every split adds some waiting; past a point it slows the step.',
      'Checkpoints are separate from how the model is split.',
    ],
  },
];
