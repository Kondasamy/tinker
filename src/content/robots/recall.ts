// Robots that act's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why`.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  {
    id: 'corrections-where-it-goes',
    chapter: '05-mistakes-snowball',
    pin: true,
    question:
      'A robot copied from demos works until one small error leaves it somewhere no demo went. What fixes that best?',
    options: [
      'Have a person label the right move where the robot itself ended up',
      'Record more perfect demos of the usual path',
      'Make the robot move more slowly',
    ],
    correct: 0,
    why: [
      'Right: corrections cover the frames the policy reaches, which perfect demos never show.',
      'Perfect demos stay on the usual path, so the off-path frames are still missing.',
      'Slower moves reach the same unknown spot; the policy still has nothing to copy there.',
    ],
  },
  // 1. See, decide, move
  {
    id: 'loop-repeats',
    chapter: '01-see-decide-move',
    question: 'A delivery robot is told the route once. Why does it still need its camera on the way?',
    options: [
      'It looks again before every move, so it can react to what changed',
      'Only to record video for later',
      'It doesn’t: the route decides every move',
    ],
    correct: 0,
    why: [
      'Right: it looks again before every move.',
      'The camera feeds every decision, not just a recording.',
      'A route can’t see a person stepping out; the loop can.',
    ],
  },
  {
    id: 'loop-speed',
    chapter: '01-see-decide-move',
    question: 'Why do robot arms run their loop many times a second?',
    options: [
      'Small, frequent moves catch errors before they grow',
      'Motors only work at high speed',
      'To finish the task in fewer moves',
    ],
    correct: 0,
    why: [
      'Right: a quick next look notices a small error while it is still small.',
      'Motor speed isn’t the reason; how often the robot looks and decides is.',
      'More turns means more small moves, not fewer.',
    ],
  },
  {
    id: 'loop-order',
    chapter: '01-see-decide-move',
    question: 'What does a robot’s control loop do each time round, in order?',
    options: ['See, decide, move', 'Move, then see if it worked, once', 'Plan the whole task, then move'],
    correct: 0,
    why: [
      'Right: look, pick one action, take it, and start again.',
      'Seeing comes first; and it repeats, not once.',
      'A loop decides one step at a time from the latest look.',
    ],
  },
  // 2. What the camera gives
  {
    id: 'state-from-frame',
    chapter: '02-what-the-camera-gives',
    question: 'A shelf robot’s camera misses a thin glass panel. What does its policy do near it?',
    options: ['Treats the space as empty', 'Senses something is wrong and stops', 'Asks a person'],
    correct: 0,
    why: [
      'Right: the policy knows only the state the camera gives.',
      'Nothing in its state says “wrong”; the panel simply isn’t there for it.',
      'It can’t know to ask about something it never saw.',
    ],
  },
  {
    id: 'state-small',
    chapter: '02-what-the-camera-gives',
    question: 'Why turn a camera frame into a small grid before deciding?',
    options: [
      'A few facts, like where the target is and what blocks the way, are enough to pick a move',
      'Grids look better in reports',
      'Policies can’t read numbers',
    ],
    correct: 0,
    why: [
      'Right: the state keeps what the decision needs and drops the rest.',
      'It is about deciding, not presentation.',
      'The grid is numbers too; it is just fewer of them.',
    ],
  },
  {
    id: 'policy-role',
    chapter: '02-what-the-camera-gives',
    question: 'In a robot, what is the policy?',
    options: ['The part that picks the next move from the state', 'The camera', 'The company’s safety rules'],
    correct: 0,
    why: [
      'Right: state in, action out, every turn.',
      'The camera gives the frame; the policy decides what to do with it.',
      'Here policy means the decision-maker, not a rulebook for staff.',
    ],
  },
  // 3. Rules break
  {
    id: 'rule-blind',
    chapter: '03-rules-break',
    question: 'A packing arm repeats saved positions. The supplier changes box sizes. What happens?',
    options: ['It reaches where the old boxes were', 'It adapts to the new sizes', 'It stops and asks for new boxes'],
    correct: 0,
    why: [
      'Right: a fixed list of moves never looks, so it repeats the old layout.',
      'Saved positions don’t read the camera, so nothing tells them the boxes changed.',
      'It has no way to notice; it just runs the list.',
    ],
  },
  {
    id: 'rule-scale',
    chapter: '03-rules-break',
    question: 'Why don’t hand-written rules scale to a busy warehouse?',
    options: [
      'Every new layout needs a person to write another rule',
      'Rules run too slowly',
      'Robots can store only a few rules',
    ],
    correct: 0,
    why: [
      'Right: layouts keep changing, and someone has to write each rule.',
      'A rule runs fast; it just runs the wrong moves on a new layout.',
      'Storage isn’t the limit; people’s time to write them is.',
    ],
  },
  {
    id: 'rule-when',
    chapter: '03-rules-break',
    question: 'When is a fixed rule a fine choice?',
    options: [
      'When every part arrives in exactly the same place, every time',
      'When layouts change daily',
      'Never: rules always fail',
    ],
    correct: 0,
    why: [
      'Right: a fixed jig and fixed positions suit a fixed rule.',
      'Changing layouts are exactly where a fixed rule breaks.',
      'On a fixed layout a rule works well; it is the changes that break it.',
    ],
  },
  // 4. Show it
  {
    id: 'demo-lookup',
    chapter: '04-show-it',
    question: 'A copy-what-you-did policy sees a frame. What does it do?',
    options: [
      'Finds the most similar recorded frame and repeats that move',
      'Works out the best move from physics',
      'Asks the person who drove the demo',
    ],
    correct: 0,
    why: [
      'Right: nearest neighbour is lookup over the demos.',
      'It knows no physics; it only has the recorded frames and moves.',
      'The demos are already recorded; nobody is asked at run time.',
    ],
  },
  {
    id: 'demo-coverage',
    chapter: '04-show-it',
    question: 'A copied policy keeps failing when the part sits in a corner. Cheapest fix?',
    options: ['Record demos with the part in a corner', 'Write a corner rule', 'Run the policy faster'],
    correct: 0,
    why: [
      'Right: new demos add the frames it was missing.',
      'That brings back the rule problem: someone must write every case.',
      'Speed repeats the same wrong move sooner.',
    ],
  },
  {
    id: 'demo-diminishing',
    chapter: '04-show-it',
    question: 'Going from 4 to 8 similar demos barely helped. Why?',
    options: [
      'The new demos mostly showed frames the first four already covered',
      'Policies forget old demos',
      'Eight is too many to look up',
    ],
    correct: 0,
    why: [
      'Right: only new kinds of frames add anything to copy.',
      'Lookup keeps every demo; nothing is forgotten.',
      'Looking up eight demos is easy; they just add little new.',
    ],
  },
  // 5. Mistakes snowball
  {
    id: 'snowball-why',
    chapter: '05-mistakes-snowball',
    question: 'Why can one small slip ruin a whole run of a copied policy?',
    options: [
      'It lands on a frame no demo showed, copies a wrong move, and drifts further',
      'The slip wipes its memory',
      'Slips break the motors',
    ],
    correct: 0,
    why: [
      'Right: each wrong move leads to another unfamiliar frame, so errors snowball.',
      'Nothing is wiped; the policy just has nothing similar to copy.',
      'The hardware is fine; the trouble is what it decides next.',
    ],
  },
  {
    id: 'snowball-dagger',
    chapter: '05-mistakes-snowball',
    question: 'In DAgger, whose frames get labelled?',
    options: [
      'The frames the policy itself reaches',
      'Only the expert’s own demo frames',
      'Random frames from the internet',
    ],
    correct: 0,
    why: [
      'Right: run the policy, label where it went, add them, repeat.',
      'The expert’s frames are the demos; DAgger adds the policy’s.',
      'The labels come from the policy’s own runs on the task.',
    ],
  },
  // 6. Practice in a game first
  {
    id: 'sim-gap',
    chapter: '06-practice-in-a-game',
    question: 'A robot trained only in a bright simulator fails in a dim real warehouse. What is that called?',
    options: ['The sim-to-real gap', 'Overfitting to demos', 'A slip'],
    correct: 0,
    why: [
      'Right: the simulator got the light wrong, and the real bay shows it.',
      'The trouble is the practice world, not too few demos.',
      'A slip is a move going too far; this is the camera and the light.',
    ],
  },
  {
    id: 'sim-randomise',
    chapter: '06-practice-in-a-game',
    question: 'How does domain randomisation help a robot trained in simulation?',
    options: [
      'Varied practice makes the real world look like one more variation',
      'It makes the simulator photo-real',
      'It removes the need for any real testing',
    ],
    correct: 0,
    why: [
      'Right: if practice covered many lights, the real light is nothing new.',
      'Tobin et al. used unrealistic textures on purpose; variety mattered, not realism.',
      'Real testing still finds what the simulator never varied.',
    ],
  },
  {
    id: 'sim-cheap',
    chapter: '06-practice-in-a-game',
    question: 'Why practise in a simulator at all?',
    options: [
      'Thousands of tries cost no one’s time and break nothing',
      'Simulators are always accurate',
      'Real robots can’t learn',
    ],
    correct: 0,
    why: [
      'Right: practice is free and safe there; the gap to the real world is the price.',
      'They are never exact; that gap is why randomising helps.',
      'Real robots learn from demos and corrections too; simulation adds cheap practice.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-cost',
    chapter: '07-workbench',
    question: 'Demos and corrections cost people’s time; simulated practice doesn’t. What order makes sense?',
    options: [
      'Use free practice first, then add only the demos and corrections still needed',
      'Record as many demos as possible first',
      'Skip practice: real demos are always better',
    ],
    correct: 0,
    why: [
      'Right: spend people’s time only where free practice falls short.',
      'Past a few, more similar demos added little here.',
      'Without varied practice, no number of demos covered dim light.',
    ],
  },
  {
    id: 'bench-rollout',
    chapter: '07-workbench',
    question: 'A policy clears 19 of 20 simulated bins. What next?',
    options: [
      'Test in real bays and keep correcting where it fails',
      'Ship it everywhere: 19 of 20 is proof',
      'Throw it out: one bin failed',
    ],
    correct: 0,
    why: [
      'Right: a simulated score is a start; real bays show what it missed.',
      'Twenty simulated bins can’t show every real bay.',
      'One miss is a frame to correct, not a reason to start over.',
    ],
  },
  {
    id: 'bench-corrections',
    chapter: '07-workbench',
    question: 'With only one demo, what lifted the bench most cheaply?',
    options: ['A round of corrections plus varied practice', 'Seven more demos', 'Nothing could help one demo'],
    correct: 0,
    why: [
      'Right: corrections fill the frames one demo missed, and practice covers the light.',
      'More demos help too, but each costs a full run of people’s time.',
      'One demo plus corrections and practice cleared nearly every bin.',
    ],
  },
];
