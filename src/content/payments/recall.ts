// Card payments' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's one-line edge: a payment is a hold, a promise and a later transfer, and every party
// takes a fee.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-four-parties',
  C2 = '02-a-hold',
  C3 = '03-overnight',
  C4 = '04-pressed-pay-twice',
  C5 = '05-prove-its-you',
  C6 = '06-the-money-comes-back',
  C7 = '07-checkout-policy';

export const RECALL: RecallItem[] = [
  {
    id: 'hold-promise-transfer',
    chapter: C3,
    pin: true,
    question:
      'A colleague says: “The card terminal beeped approved, so the money is in our account and it’s all ours.” What do you tell them?',
    options: [
      'Approved is a hold; the money moves later, at settlement, and each party in the chain takes a fee',
      'Right: approved means the money has arrived in full',
      'Approved means the money arrives in full once the goods ship',
    ],
    correct: 0,
    why: [
      'Right. The yes only sets money aside; the shop captures it, it settles overnight, and fees come off on the way.',
      'Approval is the customer’s bank promising the money, not sending it.',
      'Capture at shipment starts the charge, but the money arrives at settlement, less the fees.',
    ],
  },
  // 1. Four parties and a network
  {
    id: 'who-approves',
    chapter: C1,
    question: 'A bike shop in Lyon takes a card from a bank in Milan. Whose “yes” does the payment need?',
    options: ['The Milan bank that issued the card', 'The bike shop’s bank in Lyon', 'The card network'],
    correct: 0,
    why: [
      'Right: the issuer knows the cardholder’s money, so it decides.',
      'The shop’s bank, the acquirer, passes the request on; it can’t see the customer’s account.',
      'The network routes the request between the banks; it doesn’t hold the account.',
    ],
  },
  {
    id: 'acquirer-role',
    chapter: C1,
    question: 'What does a shop’s acquirer do in a card payment?',
    options: [
      'Takes the shop’s card payments and passes them into the card network',
      'Gives cards to shoppers',
      'Decides whether the shopper has enough money',
    ],
    correct: 0,
    why: [
      'Right: it is the shop’s bank for cards, on the shop’s side of the chain.',
      'That is the issuer, on the shopper’s side.',
      'The issuer decides; the acquirer only forwards the request and the answer.',
    ],
  },
  {
    id: 'network-role',
    chapter: C1,
    question: 'Why does a card payment pass through a card network at all?',
    options: [
      'It connects thousands of shops’ banks to thousands of card-issuing banks',
      'It keeps the cardholder’s money until the goods arrive',
      'It prints the cards',
    ],
    correct: 0,
    why: [
      'Right: without it, every acquirer would need a link to every issuer.',
      'The money stays at the issuer until settlement; the network routes messages and settles between banks.',
      'Cards come from the issuer; the network is the scheme that routes the payments.',
    ],
  },
  // 2. A hold, not a payment
  {
    id: 'hold-not-charge',
    chapter: C2,
    question:
      'A petrol pump puts a hold on your card before you fill up, then you buy less than that. What leaves your account?',
    options: ['Only what the fuel cost', 'The whole hold, refunded later', 'Nothing until next month'],
    correct: 0,
    why: [
      'Right: the station captures what you bought, and the rest of the hold is let go.',
      'A hold isn’t taken, so there is nothing to refund; only the capture is charged.',
      'The captured amount is charged and settles within days, not at month’s end.',
    ],
  },
  {
    id: 'partial-capture',
    chapter: C2,
    question:
      'An online shop sends half an order now and the rest next week. When should it charge for the second half?',
    options: [
      'When it ships, capturing just that part',
      'All of it today, to be safe',
      'Only after the customer confirms delivery',
    ],
    correct: 0,
    why: [
      'Right: capture what shipped, and keep the rest held until it ships.',
      'Charging for goods not yet sent means refunding them, and losing the fees, if they never ship.',
      'Shops capture at shipment; waiting for delivery would risk the hold lapsing first.',
    ],
  },
  {
    id: 'hold-lapse',
    chapter: C2,
    question: 'A hotel never captures a hold it placed. What happens to the held money?',
    options: [
      'The hold lapses after a while and the money is free again',
      'It goes to the hotel after a month',
      'It is lost',
    ],
    correct: 0,
    why: [
      'Right: an uncaptured hold expires, and the customer can spend the money again.',
      'Only a capture moves money to the hotel; a hold alone never does.',
      'Held money never leaves the account, so it can’t be lost.',
    ],
  },
  // 3. Overnight
  {
    id: 'settlement-when',
    chapter: C3,
    question: 'A café takes card payments all day. When does the money reach its account?',
    options: [
      'After the nightly settlement, less the fees',
      'The moment each card is tapped',
      'Only when the café asks for it',
    ],
    correct: 0,
    why: [
      'Right: the day’s captures settle in a batch after the cut-off, with fees taken off.',
      'The tap gets a yes, a hold; money moves later.',
      'Settlement runs on its own schedule; the café doesn’t have to ask.',
    ],
  },
  {
    id: 'interchange-who',
    chapter: C3,
    question: 'Who keeps the interchange fee on a card payment?',
    options: ['The cardholder’s bank, the issuer', 'The shop', 'The card network'],
    correct: 0,
    why: [
      'Right: interchange flows to the issuer, out of what the shop is paid.',
      'The shop pays fees; it doesn’t receive interchange.',
      'The network takes its own scheme fee; interchange goes to the issuer.',
    ],
  },
  {
    id: 'interchange-cap',
    chapter: C3,
    question: 'Under EU rules, why is the interchange on a consumer debit card payment small?',
    options: [
      'EU law caps it at a share of the payment',
      'Debit cards have no fees at all',
      'The shop chooses the fee',
    ],
    correct: 0,
    why: [
      'Right: Regulation 2015/751 caps interchange on consumer debit and credit cards.',
      'There are fees, just capped ones, plus the scheme’s and the acquirer’s.',
      'The shop can choose its acquirer, but interchange is set by the schemes within the EU cap.',
    ],
  },
  // 4. Pressed Pay twice
  {
    id: 'timeout-worked',
    chapter: C4,
    question: 'A shop’s payment request times out. What should it assume about the payment?',
    options: [
      'It may have gone through; only the answer is missing',
      'It failed, so charge again with a new request',
      'It was refused',
    ],
    correct: 0,
    why: [
      'Right: a timeout means no answer, not no payment.',
      'A fresh request without the same key can charge the customer twice.',
      'A refusal is an answer; a timeout is the lack of one.',
    ],
  },
  {
    id: 'key-same',
    chapter: C4,
    question: 'For an idempotency key to stop a double charge, what must the retry send?',
    options: ['The same key as the first request', 'A new key, so the bank sees it fresh', 'No key at all'],
    correct: 0,
    why: [
      'Right: the same key tells the bank it already has this payment.',
      'A new key makes the retry look like a second payment.',
      'Without a key the bank can’t tell a retry from a new payment.',
    ],
  },
  {
    id: 'double-cost',
    chapter: C4,
    question: 'A customer is charged twice and disputes the second charge. What does that cost the shop?',
    options: [
      'The money back, plus a chargeback fee and the fees already paid',
      'Nothing: the money just goes back',
      'Only the customer’s goodwill',
    ],
    correct: 0,
    why: [
      'Right: a chargeback returns the money, and the shop pays a fee on top of the fees it already lost.',
      'Chargebacks carry a fee, and the payment’s own fees aren’t returned.',
      'Goodwill too, but the chargeback costs real money.',
    ],
  },
  // 5. Prove it's you
  {
    id: 'sca-two',
    chapter: C5,
    question: 'Which pair counts as strong customer authentication?',
    options: ['A code sent to your phone and your PIN', 'Your card number and expiry date', 'Your name and address'],
    correct: 0,
    why: [
      'Right: something you have (the phone) and something you know (the PIN), independent of each other.',
      'Both are printed on the card, so one stolen card gives away both.',
      'These are details anyone might find; they prove nothing you have, know or are.',
    ],
  },
  {
    id: 'challenge-cost',
    chapter: C5,
    question: 'A shop turns on a 3-D Secure challenge for every order. What should it expect?',
    options: [
      'Fewer frauds, and some honest customers giving up',
      'Fewer frauds and no other change',
      'More sales, since customers feel safe',
    ],
    correct: 0,
    why: [
      'Right: a challenge stops thieves but adds a step some honest customers abandon.',
      'Every extra step at checkout loses some shoppers.',
      'Some may feel safer, but a challenge is friction, and friction loses sales.',
    ],
  },
  {
    id: 'low-value',
    chapter: C5,
    question: 'Under EU rules, when may a small online payment skip strong customer authentication?',
    options: [
      'When it is at or under €30 and recent skipped payments stay within limits',
      'Never: every payment must be checked',
      'Whenever the shop wants',
    ],
    correct: 0,
    why: [
      'Right: the low-value exemption allows it, within a running total or count since the last check.',
      'The EU rules include exemptions, such as low value and low risk.',
      'Exemptions have conditions, and the issuer can still ask for the check.',
    ],
  },
  // 6. The money comes back
  {
    id: 'chargeback-what',
    chapter: C6,
    question: 'What is a chargeback?',
    options: [
      'The card’s issuer taking a disputed payment back from the shop',
      'A refund the shop chooses to give',
      'A fee for paying by card',
    ],
    correct: 0,
    why: [
      'Right: the cardholder disputes, and the money comes back through the chain from the shop.',
      'A refund is the shop’s choice; a chargeback is forced through the issuer.',
      'A chargeback reverses a payment, though it brings a fee with it.',
    ],
  },
  {
    id: 'liability',
    chapter: C6,
    question: 'A stolen card passed 3-D Secure, and the real cardholder disputes it. Who usually bears the loss?',
    options: ['The issuer', 'The shop', 'The cardholder'],
    correct: 0,
    why: [
      'Right: an authenticated payment is protected from fraud disputes, so the issuer bears it.',
      'The shop is protected when the payment was authenticated with 3-D Secure.',
      'The cardholder didn’t buy it and gets the money back.',
    ],
  },
  {
    id: 'chargeback-later',
    chapter: C6,
    question: 'Why can a shop lose money on an order weeks after it was paid?',
    options: [
      'The cardholder can dispute it later, and a chargeback takes it back',
      'The bank re-checks every payment each month',
      'Settlement can be reversed at random',
    ],
    correct: 0,
    why: [
      'Right: disputes arrive days or weeks after the payment settled.',
      'Banks don’t recheck payments; a cardholder’s dispute starts a chargeback.',
      'Nothing is reversed at random; a chargeback needs a dispute.',
    ],
  },
  // 7. Checkout policy
  {
    id: 'policy-per-kind',
    chapter: C7,
    question: 'Why might a shop skip the challenge on cheap orders but keep it on expensive ones?',
    options: [
      'On cheap orders lost customers cost more than fraud; on expensive ones fraud costs more',
      'Cheap orders can’t be fraud',
      'The law forbids challenges on cheap orders',
    ],
    correct: 0,
    why: [
      'Right: each kind of order gets the check it can afford.',
      'Thieves buy cheap things too; the fraud is just cheaper to absorb.',
      'The law allows a check at any amount; the exemption is a choice.',
    ],
  },
  {
    id: 'capture-late-ship',
    chapter: C7,
    question: 'A product ships two weeks after the order, after a hold would lapse. What helps?',
    options: [
      'Capture at order, or get a new authorisation at shipment',
      'Wait: the hold lasts as long as needed',
      'Capture twice',
    ],
    correct: 0,
    why: [
      'Right: either charge early or ask again, knowing the new request can be refused.',
      'Holds lapse after a set time; a late capture needs a fresh yes.',
      'Two captures would charge the customer twice.',
    ],
  },
  {
    id: 'key-always',
    chapter: C7,
    question: 'Is there any kind of order where turning off the retry key makes sense?',
    options: [
      'No: retries happen on every kind, and the key costs nothing',
      'Yes, on small orders',
      'Yes, on orders that ship later',
    ],
    correct: 0,
    why: [
      'Right: any order can time out, and the key only stops a double charge.',
      'A double charge on a small order still means a dispute and a fee.',
      'When the order ships has nothing to do with retrying its request.',
    ],
  },
];
