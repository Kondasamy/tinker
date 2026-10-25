// Card payments: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-four-parties',
    title: 'Four parties and a network',
    short: 'Four parties',
    intro: {
      story:
        'Larkspur sells online, and almost every customer pays by card. Ana is buying a hinge pack. Her click starts a chain of messages.',
      goal: 'Who does Ana’s card payment pass through, and who says yes?',
      learn: [
        'The four parties in a card payment, and the network between',
        'Who approves a payment',
        'How the answer comes back',
      ],
      terms: [
        ['Acquirer', 'Larkspur’s bank for cards: it takes card payments for the shop and passes them on.'],
        ['Card network', 'The scheme whose name is on the card: it routes messages between acquirers and issuers.'],
        ['Issuer', 'The customer’s bank, which gave them the card and says yes or no to each payment.'],
      ],
    },
  },
  {
    id: '02-a-hold',
    title: 'A hold, not a payment',
    short: 'A hold',
    intro: {
      story:
        'Ana’s bank said yes in a second. Larkspur’s team assumed the money was theirs. Then Mona’s order arrived, half of it on backorder.',
      goal: 'When the bank says yes, has any money moved?',
      learn: ['Authorising places a hold', 'Capture charges only what shipped', 'A hold nobody captures lapses'],
      terms: [
        [
          'Hold',
          'Money the issuer sets aside on the customer’s card after a yes: not taken yet, just not free to spend.',
        ],
        ['Capture', 'The shop telling its bank to charge some or all of a hold, usually when the goods ship.'],
      ],
    },
  },
  {
    id: '03-overnight',
    title: 'Overnight',
    short: 'Overnight',
    intro: {
      story:
        'Captured payments still aren’t money in Larkspur’s account. That happens at night, and the finance team wants to know why Ana’s payment arrives smaller.',
      goal: 'Where does the money go overnight, and who takes a fee?',
      learn: ['Settlement moves the money at a nightly cut-off', 'Three fees come off', 'The EU caps one of them'],
      terms: [
        [
          'Settlement',
          'The nightly transfer: the issuer pays, the network passes it on and Larkspur’s bank pays Larkspur.',
        ],
        ['Interchange', 'The fee the issuer keeps from each payment; EU law caps it.'],
      ],
    },
  },
  {
    id: '04-pressed-pay-twice',
    title: 'Pressed Pay twice',
    short: 'Pay twice',
    intro: {
      story:
        'The shop’s payments ran smoothly until a slow morning. Ben pressed Pay, waited, and the till tried again. Ben wrote in, cross.',
      goal: 'When a payment request gets no answer, how do you retry without charging twice?',
      learn: ['A timeout doesn’t mean it failed', 'A retry can charge twice', 'An idempotency key makes a retry safe'],
      terms: [
        ['Timeout', 'Giving up waiting for an answer: the request may still have worked.'],
        ['Idempotency key', 'A unique name sent with a request, so a retry with the same name is done only once.'],
      ],
    },
  },
  {
    id: '05-prove-its-you',
    title: 'Prove it’s you',
    short: 'Prove it',
    intro: {
      story: 'Payments are safe from retries now. But a padlock went to a thief who had only a stolen card number.',
      goal: 'How does a bank check it’s really the cardholder, and what does that cost?',
      learn: [
        '3-D Secure asks the issuer to check',
        'A challenge stops thieves and some customers',
        'Asking only on risk',
      ],
      terms: [
        ['3-D Secure', 'A check during online checkout where the customer’s bank confirms it is really them.'],
        ['Strong customer authentication', 'The EU rule: prove it with two of something you know, have or are.'],
        ['Challenge', 'The step where the customer has to prove it, such as typing a code from their phone.'],
      ],
    },
  },
  {
    id: '06-the-money-comes-back',
    title: 'The money comes back',
    short: 'Chargebacks',
    intro: {
      story:
        'Larkspur skips the check on small orders to keep checkout quick. Days later, Noor finds a padlock she never bought on her statement.',
      goal: 'When a cardholder disputes a payment, who pays it back?',
      learn: [
        'A chargeback takes the money back, days later',
        'Who bears fraud depends on 3-D Secure',
        'Chargebacks cost a fee',
      ],
      terms: [
        ['Chargeback', 'The issuer taking a disputed payment back from the shop, through its bank.'],
        ['Liability shift', 'With 3-D Secure, the issuer, not the shop, bears a stolen card’s fraud.'],
      ],
    },
  },
  {
    id: '07-checkout-policy',
    title: 'Set Larkspur’s checkout policy',
    short: 'Checkout policy',
    intro: {
      story:
        'Everything is on the bench: 3-D Secure, when to capture and the retry key, for small orders, drill presses and split baskets.',
      goal: 'Which checkout settings keep the most money without charging anyone twice?',
      learn: [
        'Different orders need different settings',
        'Friction and fraud trade against each other',
        'Why the best setting depends on the order',
      ],
      terms: [
        ['Checkout policy', 'The settings for each kind of order: 3-D Secure, when to capture, and the retry key.'],
      ],
    },
  },
];

export const PAYMENTS_MODULE: Module = {
  id: 'payments',
  title: 'Card payments',
  description:
    'Where the money goes when a customer pays by card: authorisation, capture, settlement, fees and chargebacks.',
  level: 'Beginner',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'A customer pays Larkspur Supply Co. by card; the team follows the money through holds, overnight transfers, fees, retries, fraud checks and chargebacks.',
  chapters: CHAPTERS,
  recall: RECALL,
};
