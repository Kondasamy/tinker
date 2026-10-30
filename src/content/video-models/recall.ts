// Video and world models' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  frames: '01-many-pictures',
  next: '02-guess-the-next-frame',
  two: '03-one-frame-is-not-enough',
  key: '04-press-a-key',
  drift: '05-drift',
  big: '06-the-big-ones',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 5. Drift (pinned: the module's one idea)
  {
    id: 'drift-piles-up',
    chapter: C.drift,
    pin: true,
    question: 'A team’s world model guesses each next frame almost perfectly, yet a long run goes wrong. Why?',
    options: [
      'Each frame is guessed from its own earlier guesses, so small errors pile up',
      'The model forgets its training after a few hundred frames',
      'Long runs use a different, weaker model',
      'One-step accuracy is measured wrongly by everyone',
    ],
    correct: 0,
    why: [
      'Right. Fed its own guesses, the model starts every frame from the last frame’s small slips and adds new ones.',
      'Weights do not fade during a run; what changes is that its input is now its own output.',
      'It is the same model; only its input changes, from real frames to guessed ones.',
      'One-step accuracy is real; it simply measures guesses from real frames, which a long run no longer has.',
    ],
  },
  // 1. A film is many pictures
  {
    id: 'video-is-frames',
    chapter: C.frames,
    question: 'A colleague asks what a video file really holds. What do you tell them?',
    options: [
      'A row of still pictures, shown one after another, usually packed',
      'One picture with motion instructions laid over it',
      'A recording of light that has no separate pictures in it',
    ],
    correct: 0,
    why: [
      'Right. Frames are still pictures; the frame rate says how many show each second.',
      'Motion comes from frames changing; codecs may store differences, but they rebuild whole frames.',
      'Digital video is sampled into frames; that is what a frame rate counts.',
    ],
  },
  {
    id: 'raw-video-is-big',
    chapter: C.frames,
    question: 'Why is raw HD video so large compared with a photo?',
    options: [
      'It holds a full picture for every frame, many frames a second',
      'Video pixels take more bytes than photo pixels',
      'Video files store sound for every pixel',
    ],
    correct: 0,
    why: [
      'Right. Bytes a frame times frames a second adds up fast.',
      'A video pixel takes the same few bytes as a photo’s; there are just many more frames.',
      'Sound is a separate, much smaller track.',
    ],
  },
  {
    id: 'frames-repeat',
    chapter: C.frames,
    question: 'A webcam films someone talking against a still wall. What makes that video pack well?',
    options: [
      'Most of each frame repeats the last one',
      'Faces have fewer pixels than walls',
      'Webcams record fewer frames when people talk',
    ],
    correct: 0,
    why: [
      'Right. A coder can point back to what it already sent, and the wall barely changes.',
      'Every frame has the same number of pixels whatever is in it.',
      'The frame rate stays put; repeats inside the frames are what pack away.',
    ],
  },
  // 2. Guess the next frame
  {
    id: 'score-changed-cells',
    chapter: C.next,
    question: 'A vendor says its world model gets 99.9% of pixels right. What do you ask?',
    options: [
      'How many of the pixels that changed did it get right?',
      'How many pixels are in each frame?',
      'Was it trained on more than a million frames?',
    ],
    correct: 0,
    why: [
      'Right. Copying the last frame gets almost every pixel right; the changed ones test the model.',
      'Frame size doesn’t change the trap: still pixels are free marks at any size.',
      'Training size says nothing about whether the score counts free marks.',
    ],
  },
  {
    id: 'world-model-inputs',
    chapter: C.next,
    question: 'What does a world model read before it draws the next frame?',
    options: [
      'Its latest frames, and in a simulator the action taken',
      'A written description of the next frame',
      'Every frame it was trained on',
    ],
    correct: 0,
    why: [
      'Right. Recent frames (and the action) are its input; the next frame is its output.',
      'Some video models take text prompts, but a world model works from frames.',
      'Training frames shaped its weights; at run time it reads only recent frames.',
    ],
  },
  {
    id: 'copy-baseline',
    chapter: C.next,
    question: 'In a scene where little moves, which simple trick already scores high on next-frame accuracy?',
    options: ['Copying the last frame', 'Drawing a blank frame', 'Picking a random training frame'],
    correct: 0,
    why: [
      'Right. Most cells don’t change, so a copy gets them right for free.',
      'A blank frame misses everything that is there.',
      'A random frame from elsewhere matches little of this scene.',
    ],
  },
  // 3. One frame is not enough
  {
    id: 'still-hides-direction',
    chapter: C.two,
    question: 'A photo shows a ball in mid-air. What can’t the photo tell you?',
    options: ['Which way the ball is moving', 'Where the ball is', 'How big the ball looks'],
    correct: 0,
    why: [
      'Right. Direction needs two moments; one still shows a place, not a path.',
      'Its place is exactly what a still shows.',
      'Size is in the picture too.',
    ],
  },
  {
    id: 'context-frames',
    chapter: C.two,
    question: 'Why do world models read more than the latest frame?',
    options: [
      'Earlier frames show how things are moving',
      'One frame is too small to hold a picture',
      'It makes them run faster',
    ],
    correct: 0,
    why: [
      'Right. Motion lives in the difference between frames.',
      'One frame holds a whole picture; it lacks motion, not pixels.',
      'More frames to read is more work, not less.',
    ],
  },
  {
    id: 'one-frame-guess',
    chapter: C.two,
    question: 'A one-frame model sees a car mid-road. What will its guess of the next frame often do?',
    options: [
      'Put the car where cars there usually go, right or wrong',
      'Always leave the car where it is',
      'Draw the car in both directions at once, every time',
    ],
    correct: 0,
    why: [
      'Right. Without motion it can only bet on what is common, and sometimes bets wrong.',
      'It learned that cars move, so it guesses a move; it just can’t tell which way.',
      'It may split the bet sometimes, but not every time.',
    ],
  },
  // 4. Press a key
  {
    id: 'action-is-input',
    chapter: C.key,
    question: 'How does a playable world model react to your controller?',
    options: [
      'Your button is fed in beside the frames, and the next frame comes out',
      'A game engine moves your character; the model only paints it',
      'It guesses from your character’s motion what you meant',
    ],
    correct: 0,
    why: [
      'Right. The action is part of the input, so it shapes the next frame.',
      'In a world model there is no engine: the model draws the next frame itself.',
      'Without the button as input, it could not tell what you pressed.',
    ],
  },
  {
    id: 'dream-no-camera',
    chapter: C.key,
    question: 'What does it mean to drive “inside the model”?',
    options: [
      'Every frame you see is drawn by the model, with no camera checking',
      'A camera films the real robot while the model labels it',
      'The model replays recorded footage of real drives',
    ],
    correct: 0,
    why: [
      'Right. That is the dream: frames from frames, with no real ones coming in.',
      'Then the frames would be real; in a dream they are the model’s.',
      'Replays can’t follow new moves; a world model draws frames for any move.',
    ],
  },
  {
    id: 'real-is-referee',
    chapter: C.key,
    question: 'Larkspur’s dream and the real floor disagree about where the robot is. Which do you trust?',
    options: ['The real floor', 'The dream: it is newer', 'Whichever looks more likely'],
    correct: 0,
    why: [
      'Right. The model only guesses at the world; the real floor is what happened.',
      'Newer doesn’t mean truer; the dream is a guess.',
      'Looking likely is exactly how a wrong guess can fool you.',
    ],
  },
  // 5. Drift (continued)
  {
    id: 'resync-fixes',
    chapter: C.drift,
    question: 'A long dream has started to smear. What pulls it back?',
    options: [
      'Swapping in a real frame, so it guesses from the truth again',
      'Running the same model twice on each frame',
      'Lowering the frame rate',
    ],
    correct: 0,
    why: [
      'Right. A re-sync replaces the drifted frame with a real one.',
      'Running it twice repeats the same guess from the same drifted frames.',
      'Fewer frames per second still each rest on the last guess.',
    ],
  },
  {
    id: 'drift-elsewhere',
    chapter: C.drift,
    question: 'Where else does drift show up the same way?',
    options: [
      'Any model that feeds its own outputs back in, like writing text a word at a time',
      'Only in pictures, because pixels are noisy',
      'Only in models that are too small',
    ],
    correct: 0,
    why: [
      'Right. Whenever outputs become inputs, errors can carry forward.',
      'It is about feeding outputs back, not about pixels.',
      'Large world models fight it too: GameNGen trains on noisy past frames to resist it.',
    ],
  },
  // 6. The big ones
  {
    id: 'big-context',
    chapter: C.big,
    question: 'Why do large world models read seconds of past frames, not just two?',
    options: [
      'More past frames show more of what really happened',
      'Long context is needed to load the model',
      'Each frame is too small to read alone',
    ],
    correct: 0,
    why: [
      'Right. More real history gives the model more to lean on before it guesses.',
      'Context is what the model reads per guess, not how it loads.',
      'Frames are large; the point is what earlier frames remember.',
    ],
  },
  {
    id: 'whole-clip',
    chapter: C.big,
    question: 'Some video models make a whole clip at once. What problem does that sidestep?',
    options: [
      'Frames resting on earlier frames’ mistakes',
      'Needing any training video',
      'Needing a powerful computer',
    ],
    correct: 0,
    why: [
      'Right. Made together, the frames can agree with each other from the start.',
      'They still learn from large amounts of video.',
      'They are large models; making clips at once doesn’t make them cheap.',
    ],
  },
  {
    id: 'denoise-frames',
    chapter: C.big,
    question: 'How do many large video models draw their frames?',
    options: [
      'By denoising, as diffusion models draw pictures',
      'By copying the nearest clip from training',
      'By drawing outlines, then filling colours',
    ],
    correct: 0,
    why: [
      'Right. They start from noise and remove it step by step.',
      'They make new frames; copying is a failure they guard against.',
      'There is no outline stage; noise is cleared everywhere at once.',
    ],
  },
  // 7. Workbench
  {
    id: 'real-frames-cost',
    chapter: C.bench,
    question: 'A simulator plan re-syncs every step and is always right. Why is that pointless?',
    options: [
      'Every frame is real, so you ran the real thing anyway',
      'It runs the model too many times',
      'It drifts more than other plans',
    ],
    correct: 0,
    why: [
      'Right. A simulator earns its keep by replacing real frames; this one replaces none.',
      'It never runs the model; real frames replace every guess.',
      'With a real frame every step there is nothing to drift.',
    ],
  },
  {
    id: 'cheapest-passing',
    chapter: C.bench,
    question: 'Two plans clear the accuracy bar. How do you choose?',
    options: [
      'The one with the lower real cost',
      'The one with the higher accuracy, whatever it costs',
      'The one with more context frames',
    ],
    correct: 0,
    why: [
      'Right. Once the bar is met, extra accuracy isn’t what you are buying.',
      'Past the bar, more accuracy only adds cost the team didn’t ask for.',
      'Context is a means, not the goal; judge plans by result and cost.',
    ],
  },
  {
    id: 'context-vs-resync',
    chapter: C.bench,
    question: 'A one-frame model fails the bar however often it re-syncs. What does that tell you?',
    options: [
      'Re-sync can’t fix what one frame can’t see: which way things move',
      'It needs a re-sync every half step',
      'The bar is set wrongly',
    ],
    correct: 0,
    why: [
      'Right. Even after a real frame it still guesses direction blind.',
      'Re-syncing only restores where things are, not which way they go.',
      'The two-frame model clears the same bar, so the bar is fair.',
    ],
  },
];
