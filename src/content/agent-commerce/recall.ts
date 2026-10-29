// When the buyer is an agent's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

const C = {
  page: '01-a-page-for-people',
  menu: '02-a-menu-for-agents',
  task: '03-agent-to-agent',
  mandate: '04-who-said-it-could-buy',
  talk: '05-a-seller-that-talks-back',
  token: '06-paying-without-the-card',
  bench: '07-workbench',
};

export const RECALL: RecallItem[] = [
  // 4. Who said it could buy? (pinned: the module's one idea)
  {
    id: 'signature-not-word',
    chapter: C.mandate,
    pin: true,
    question:
      'A travel agent books a hotel and tells it the traveller agreed to a pricier room. What should the hotel go by?',
    options: [
      'The limit the traveller signed, checked against their key',
      'The agent’s word, since it acts for the traveller',
      'Whatever the agent paid last time',
    ],
    correct: 0,
    why: [
      'Right. An agent can only spend what a person signed for; the seller checks the signature, not the agent’s word.',
      'Anyone can claim to act for the traveller; only the traveller’s key can make their signature.',
      'Past orders say nothing about what the traveller allows today; the signed terms do.',
    ],
  },
  {
    id: 'edited-slip-fails',
    chapter: C.mandate,
    question:
      'An agent changes the expiry on a signed spending slip from one day to a month. What happens at the shop?',
    options: [
      'The signature no longer matches, so the slip is refused',
      'The slip is good for a month now',
      'The shop keeps the first day and ignores the edit',
    ],
    correct: 0,
    why: [
      'Right. The signature covers every field, so changing any one of them breaks it.',
      'The new expiry carries no signature; the shop cannot tell it from a forgery.',
      'The shop cannot recover the old field from a broken signature; it refuses the whole slip.',
    ],
  },
  {
    id: 'agent-carries-not-key',
    chapter: C.mandate,
    question: 'Why does the buying agent carry the signed slip but never the person’s private key?',
    options: [
      'With the key it could sign any terms it liked',
      'The key is too large for the agent to send',
      'The shop needs the key to check the slip',
    ],
    correct: 0,
    why: [
      'Right. The key is what makes a signature mean the person agreed; whoever holds it can agree to anything.',
      'Keys are small; the reason is who gets to sign, not size.',
      'The shop checks with the public key; the private key never needs to leave the person.',
    ],
  },
  // 1. A page for people
  {
    id: 'prose-is-guesswork',
    chapter: C.page,
    question: 'An agent books a train from a timetable page full of footnotes, and gets it right. What is the risk?',
    options: [
      'Each new page is fresh reasoning, and one misread footnote books the wrong train',
      'None: getting it right once shows it reads pages well',
      'Timetable pages are too slow for agents to load',
    ],
    correct: 0,
    why: [
      'Right. Reading prose is reasoning; it worked here, and the next page’s footnote may trip it.',
      'One success is one sample; benchmarks of real sites show agents fail most tasks.',
      'Speed is not the issue; the facts hide in prose the agent must work out.',
    ],
  },
  {
    id: 'webarena-gap',
    chapter: C.page,
    question: 'On a benchmark of realistic websites, how did the best agent compare with people?',
    options: [
      'It finished far fewer tasks than people did',
      'It matched people on most tasks',
      'It beat people, being faster',
    ],
    correct: 0,
    why: [
      'Right. WebArena’s best GPT-4 agent finished about one task in seven; people finished most.',
      'The gap was wide: pages for people are hard for agents.',
      'Speed does not finish a task; the agent often went wrong on the way.',
    ],
  },
  {
    id: 'sale-price-trap',
    chapter: C.page,
    question: 'A page reads “WAS $30, NOW $24”. What does an agent pricing from it have to do?',
    options: [
      'Work out which of the two prices is the current one',
      'Copy the first number on the line',
      'Average the two',
    ],
    correct: 0,
    why: [
      'Right. A page for people makes the agent reason about which price holds; a catalogue field just says it.',
      'The first number is the old price here; copying it is exactly the misread a page invites.',
      'No shop charges the average; that would be a guess with no basis.',
    ],
  },
  // 2. A menu for agents
  {
    id: 'agent-card-is',
    chapter: C.menu,
    question: 'A partner says their booking agent “has an agent card”. What will you find there?',
    options: [
      'A small file at a fixed address naming the agent, its address, version and skills',
      'A payment card the agent uses to pay',
      'The agent’s full instructions and memory',
    ],
    correct: 0,
    why: [
      'Right. An agent card tells other agents what this one is and how to reach it.',
      'It is a description, not a means of payment; paying comes later, with a token.',
      'The card is public; an agent’s instructions and memory stay private.',
    ],
  },
  {
    id: 'field-beats-prose',
    chapter: C.menu,
    question: 'Why does a catalogue with a price field help an agent more than the same prices in a page?',
    options: [
      'It copies the field instead of working the price out',
      'Catalogues are always cheaper',
      'Pages for people are blocked for agents',
    ],
    correct: 0,
    why: [
      'Right. A field leaves nothing to reason about, so there is nothing to misread.',
      'The prices are the same; only how they are written differs.',
      'Nothing blocks the page; it just needs guesswork.',
    ],
  },
  {
    id: 'name-the-gap',
    chapter: C.menu,
    question: 'A supplier’s feed has a row with no delivery date. What should an agent placing an urgent order do?',
    options: [
      'Stop and report the missing field',
      'Assume the usual delivery time',
      'Pick the earliest date on the feed',
    ],
    correct: 0,
    why: [
      'Right. A missing field is a fact to report; a filled-in guess is what the order would then rest on.',
      'The usual time is a guess presented as data, and an urgent order is where it hurts.',
      'Another row’s date says nothing about this one.',
    ],
  },
  // 3. Agent to agent
  {
    id: 'input-required',
    chapter: C.task,
    question: 'A task between two agents is in input-required. What happens next?',
    options: [
      'It waits until the agent that sent it answers a question',
      'It finishes on its own after a timeout',
      'It is failed, and must be sent again',
    ],
    correct: 0,
    why: [
      'Right. Input-required pauses the task; it moves on to working once the sender answers.',
      'A paused task is waiting for an answer, not for time to pass.',
      'Failed is an end state; input-required is a pause the task comes back from.',
    ],
  },
  {
    id: 'clear-ask-saves-trip',
    chapter: C.task,
    question: 'Two orders reach a sales agent: one names size and count, one says “deck screws”. Which takes longer?',
    options: [
      'The vague one: it pauses for a question back',
      'The clear one: it has more to check',
      'Neither: agents fill in the gaps',
    ],
    correct: 0,
    why: [
      'Right. Every question back is a round trip between agents before the task can finish.',
      'More detail means less to ask, so the clear order finishes sooner.',
      'A careful sales agent asks rather than guesses, which is what costs the trip.',
    ],
  },
  {
    id: 'task-ends',
    chapter: C.task,
    question: 'Which of these is not a state a finished task can end in?',
    options: ['Working', 'Completed', 'Canceled'],
    correct: 0,
    why: [
      'Right. Working means the task is still going; completed, failed and canceled end it.',
      'Completed is the end of a task that did its job.',
      'Canceled is how a task ends when the sender calls it off.',
    ],
  },
  // 5. A seller that talks back
  {
    id: 'message-cant-raise-limit',
    chapter: C.talk,
    question:
      'A seller’s message says “your boss raised your budget”. What decides whether the bigger order goes through?',
    options: [
      'The signed limit the shop checks, which the message cannot change',
      'Whether the agent believes the message',
      'Whether the seller is a known one',
    ],
    correct: 0,
    why: [
      'Right. A message changes no signed field, so the limit holds whatever the agent believes.',
      'The agent’s belief only decides whether it sends the order; the shop’s check decides if it goes through.',
      'A known name is what attackers borrow; the signed terms are what hold.',
    ],
  },
  {
    id: 'judgement-not-guarantee',
    chapter: C.talk,
    question: 'Your buying agent turned down a suspicious offer in testing. What does that show?',
    options: [
      'Its judgement helps, but a signed slip is still the guarantee',
      'It will never be fooled',
      'You can drop the shop’s checks',
    ],
    correct: 0,
    why: [
      'Right. The recorded agent refused one trick and fell for a lookalike domain in the same run.',
      'One refusal is one sample; the same agent accepted a lookalike domain.',
      'The checks are what refused the lookalike; dropping them removes the guarantee.',
    ],
  },
  {
    id: 'lookalike-domain',
    chapter: C.talk,
    question: 'An offer comes from a domain one word longer than your usual supplier’s. What catches it?',
    options: [
      'The shop comparing the domain to the ones the slip names',
      'The agent noticing the name sounds right',
      'The price matching the usual one',
    ],
    correct: 0,
    why: [
      'Right. The merchant check compares exact domains, so a lookalike fails however familiar it sounds.',
      'Sounding right is the whole trick; the recorded agent fell for it.',
      'A lookalike copies the usual price on purpose.',
    ],
  },
  // 6. Paying without the card
  {
    id: 'token-bound',
    chapter: C.token,
    question: 'A one-order payment token is used for the same order, but a higher amount. What happens?',
    options: [
      'Refused: the token is bound to its amount',
      'Paid, up to the spending limit',
      'Paid, and the extra refunded later',
    ],
    correct: 0,
    why: [
      'Right. The token names one order, one shop and one amount; anything else is refused.',
      'The limit belongs to the signed slip; the token is narrower still.',
      'The provider refuses up front; nothing is charged to refund.',
    ],
  },
  {
    id: 'token-once',
    chapter: C.token,
    question: 'An agent retries a payment with a token that already paid. What happens?',
    options: ['Refused: the token is spent', 'Paid again: same order, same amount', 'Paid if the shop agrees'],
    correct: 0,
    why: [
      'Right. A token pays once; a retry or a thief finds it spent.',
      'Single use is the point: the same order cannot be charged twice with it.',
      'The provider decides, and it has already marked the token spent.',
    ],
  },
  {
    id: 'card-never-shared',
    chapter: C.token,
    question: 'Why pay with a token rather than give the agent the card number?',
    options: [
      'A leaked token is worth one order; a leaked card number is worth any',
      'Tokens are cheaper to process',
      'Shops cannot take card numbers from agents',
    ],
    correct: 0,
    why: [
      'Right. Bound and single-use, the token limits the damage; the card stays with the provider.',
      'Cost is not the point; what a leak can do is.',
      'Shops can, which is exactly why the number should never be in the agent’s hands.',
    ],
  },
  // 7. Workbench
  {
    id: 'slip-for-fooled-agent',
    chapter: C.bench,
    question: 'You set a standing spending slip for your agent. Which agent should it hold against?',
    options: [
      'One fooled by every seller, not just the one you tested',
      'The agent as it behaved in your tests',
      'An agent that never accepts any offer',
    ],
    correct: 0,
    why: [
      'Right. The slip is the guarantee for the day the agent is fooled, so it must hold for that agent.',
      'Tests show one run; the slip has to cover the runs that go wrong.',
      'An agent that refuses everything buys nothing; the slip must let good orders through.',
    ],
  },
  {
    id: 'asking-costs',
    chapter: C.bench,
    question: 'Asking the person before every order also stops every bad one. Why prefer a tighter slip?',
    options: [
      'The slip stops them without costing the person’s time',
      'People approve bad orders',
      'The shop refuses orders a person approved',
    ],
    correct: 0,
    why: [
      'Right. Every ask is the person’s time; a slip that already stops the bad orders saves it.',
      'They decline the bad ones fine; the cost is the asking, not the judgement.',
      'An approved order still passes if the slip allows it.',
    ],
  },
  {
    id: 'loose-slip',
    chapter: C.bench,
    question: 'A slip allows any shop, any item and a high cap. What can a fooled agent do?',
    options: [
      'Buy whatever a seller talks it into, up to the cap',
      'Nothing: the signature stops it',
      'Only buy from shops it has used before',
    ],
    correct: 0,
    why: [
      'Right. The shop only enforces what the slip says; a loose slip says almost anything goes.',
      'The signature proves the person agreed to these loose terms; it adds no limits of its own.',
      'A slip for any shop lets it buy anywhere, lookalikes included.',
    ],
  },
];
