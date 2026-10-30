// Recommendations' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The
// pinned item is the module's one-line edge: a recommender ranks by what people like you bought, and what it shows
// shapes what gets bought next.
import type { RecallItem } from '../../lib/recall';
import data from '../../../data/recommendations/workbench.json' with { type: 'json' };

// read off the bench's data, not workbench.ts, which would pull the loop into every page's registry
const COVERAGE_MIN = data.coverageMin;

const C1 = '01-the-bestsellers-shelf',
  C2 = '02-people-like-you',
  C3 = '03-bought-together',
  C4 = '04-hidden-tastes',
  C5 = '05-new-shopper-new-product',
  C6 = '06-the-loop',
  C7 = '07-tune-the-shelf';

export const RECALL: RecallItem[] = [
  {
    id: 'like-you-and-the-loop',
    chapter: C6,
    pin: true,
    question:
      'A colleague says: “Our recommender just reflects what customers want; it doesn’t change anything.” What do you tell them?',
    options: [
      'It ranks by what people like them bought, and what it shows shapes what they buy next',
      'Right: it only measures taste',
      'It changes things only when it makes a mistake',
    ],
    correct: 0,
    why: [
      'Right. Sales come from what the shelf showed, and those sales train the next shelf.',
      'Customers mostly buy what they are shown, so the data reflects the shelf as much as their taste.',
      'Even a perfect ranking narrows what sells, because unshown products get no orders.',
    ],
  },
  {
    id: 'bestsellers-same',
    chapter: C1,
    question: 'A hardware site shows every visitor its five bestsellers. Who does it help least?',
    options: [
      'Visitors whose needs are unlike the average customer’s',
      'Visitors who already own the bestsellers',
      'Nobody: bestsellers suit everyone',
    ],
    correct: 0,
    why: [
      'Right: one ranking for everyone fits the average and misses everyone different.',
      'The shelf skips what they own, so they see the next bestsellers, still not their own taste.',
      'Most customers’ next orders are not bestsellers; that is why the shelf misses them.',
    ],
  },
  {
    id: 'held-out',
    chapter: C1,
    question: 'How can you tell whether a shelf is any good before it goes live?',
    options: [
      'Hide each customer’s last order and count how often the shelf shows it',
      'Ask the team which shelf looks best',
      'Check that the shelf always shows five products',
    ],
    correct: 0,
    why: [
      'Right: the hidden order is a real next purchase the shelf never saw, so a hit is honest.',
      'Looks are not purchases; a shelf can look sensible and still miss what people buy.',
      'Every shelf shows five; the question is whether the right five.',
    ],
  },
  {
    id: 'search-vs-shelf',
    chapter: C1,
    question: 'How is a “you might also need” shelf different from a search box?',
    options: [
      'The shelf ranks without anything typed: only past orders',
      'The shelf ranks pages by the words in them',
      'There is no difference: both rank by popularity',
    ],
    correct: 0,
    why: [
      'Right: search ranks by the query; a shelf has no query, only behaviour.',
      'That is search: matching typed words against text.',
      'Neither has to use popularity; search uses the query, a shelf uses orders.',
    ],
  },
  {
    id: 'alike-baskets',
    chapter: C2,
    question: 'Two customers bought four of the same five products. What does “people like you” do with that?',
    options: [
      'Shows each one what the other bought and they didn’t',
      'Shows both the shop’s bestsellers',
      'Shows each the products they share',
    ],
    correct: 0,
    why: [
      'Right: the overlap makes them alike, the difference is the suggestion.',
      'Bestsellers ignore who is alike; that is the shelf this method replaces.',
      'They own the shared products already; the shelf skips them.',
    ],
  },
  {
    id: 'similarity-zero',
    chapter: C2,
    question: 'Two customers share no products at all. What is their similarity?',
    options: ['0', '1', 'It depends on how many orders each has'],
    correct: 0,
    why: [
      'Right: similarity counts what two baskets share, and they share nothing.',
      '1 means identical baskets, the opposite case.',
      'Basket size scales the score, but zero shared is zero whatever the sizes.',
    ],
  },
  {
    id: 'no-orders-like-you',
    chapter: C2,
    question: 'A customer has never ordered. What can “people like you” show them?',
    options: [
      'Only a fallback like bestsellers: nobody can be alike yet',
      'The most similar customer’s orders',
      'Random products',
    ],
    correct: 0,
    why: [
      'Right: with an empty basket, every similarity is zero, so the shop falls back.',
      'With nothing bought, no other customer is more similar than any other.',
      'Random products are a choice the shop could make, but not what this method gives.',
    ],
  },
  {
    id: 'together-one',
    chapter: C3,
    question: 'A first-time visitor adds a tent to their basket. What can “bought together” suggest right away?',
    options: [
      'What other tent buyers bought, like sleeping mats',
      'Nothing until the visitor has a history',
      'The week’s bestsellers',
    ],
    correct: 0,
    why: [
      'Right: product similarity comes from everyone else’s orders, so one product is enough.',
      'The product, not the visitor, carries the history here.',
      'Bestsellers ignore the tent, the one clue the visitor gave.',
    ],
  },
  {
    id: 'together-alike',
    chapter: C3,
    question: 'When are two products alike for “bought together”?',
    options: [
      'When many of the same customers bought both',
      'When they sit in the same aisle',
      'When they have similar names',
    ],
    correct: 0,
    why: [
      'Right: it reads only the orders, not what the products are.',
      'Aisles are not in the data it uses; products from two aisles can be alike.',
      'Names play no part; only who bought what does.',
    ],
  },
  {
    id: 'together-basket',
    chapter: C3,
    question: 'How does “bought together” fill a shelf for a whole basket?',
    options: [
      'It adds up each product’s similarity to everything in the basket',
      'It uses only the newest product',
      'It picks the product with the most buyers',
    ],
    correct: 0,
    why: [
      'Right: a product close to many basket items scores highest.',
      'Using one item throws away the rest of the basket’s clues.',
      'That is popularity, not similarity to the basket.',
    ],
  },
  {
    id: 'taste-direction',
    chapter: C4,
    question: 'On a taste map, what puts a product at the top of your shelf?',
    options: [
      'It points the same way as your two numbers',
      'It sits nearest the middle of the map',
      'It has the most orders',
    ],
    correct: 0,
    why: [
      'Right: the score multiplies your numbers by the product’s, so a shared direction wins.',
      'The middle is not special; only the direction a product points from it scores.',
      'Order counts are bestsellers; the map ranks by taste.',
    ],
  },
  {
    id: 'factors-from-orders',
    chapter: C4,
    question: 'Where do a customer’s two numbers come from?',
    options: [
      'From their orders, worked out alongside every product’s two numbers',
      'From a survey of what they like',
      'From the aisle they shop in most, set by hand',
    ],
    correct: 0,
    why: [
      'Right: the numbers are chosen so customer times product matches who bought what.',
      'Nobody is asked; the numbers come only from orders.',
      'Nothing is set by hand; aisles are not in the data the numbers come from.',
    ],
  },
  {
    id: 'factors-why',
    chapter: C4,
    question: 'Why squeeze a shop’s orders into two numbers per customer and product?',
    options: [
      'Scoring becomes one quick multiply, and the map can be drawn',
      'Two numbers always find more next orders than other methods',
      'It stops customers seeing products they own',
    ],
    correct: 0,
    why: [
      'Right: comparing every pair of customers grows slow; two numbers each stay small.',
      'Here bought together found more; two numbers trade some accuracy for size.',
      'Skipping owned products is a separate rule every shelf applies.',
    ],
  },
  {
    id: 'cold-shopper',
    chapter: C5,
    question: 'A new shopper picks a drill and a toolbox at sign-up. Where do they land on the taste map?',
    options: ['Between the drill and the toolbox', 'At the middle of the map', 'Nowhere until they order'],
    correct: 0,
    why: [
      'Right: their two numbers are the average of the products they picked.',
      'The middle would ignore what they just told the shop.',
      'Their picks are enough to place them, even with no orders.',
    ],
  },
  {
    id: 'cold-product',
    chapter: C5,
    question: 'A product launched today has no orders. What does the taste shelf do with it?',
    options: ['Never shows it: it has no two numbers', 'Shows it first, as new', 'Shows it to everyone once'],
    correct: 0,
    why: [
      'Right: a product earns its numbers from orders, so it can’t rank yet.',
      'Newness is not part of the score; with no numbers it can’t score at all.',
      'Only a deliberate choice, like exploration, would show it.',
    ],
  },
  {
    id: 'few-orders',
    chapter: C5,
    question: 'The new scanner gets its first three orders. Why is it still on few shelves?',
    options: [
      'Three orders give it small numbers, so it ranks low',
      'It is still missing from the catalogue',
      'Shelves only change once a month',
    ],
    correct: 0,
    why: [
      'Right: it now has a place on the map, but established products outrank it.',
      'It is in the catalogue; it simply has little evidence behind it.',
      'The shelf re-ranks as soon as the numbers change.',
    ],
  },
  {
    id: 'loop-fade',
    chapter: C6,
    question: 'The shop relearns tastes from recent orders. What happens to a product no shelf shows?',
    options: [
      'It gets no orders, loses its place, and is never shown',
      'It rises, as a rare product',
      'Nothing: its old orders keep it forever',
    ],
    correct: 0,
    why: [
      'Right: with no recent orders it has no numbers, so no taste can point at it.',
      'Rarity earns nothing here; only orders do.',
      'Once its old orders are too old to count, nothing is left to keep it.',
    ],
  },
  {
    id: 'explore-slot',
    chapter: C6,
    question: 'What does one random slot on every shelf do over many rounds?',
    options: [
      'Keeps unshown products selling, so they stay on the map',
      'Finds more next orders than a ranked slot',
      'Nothing, since shoppers ignore random products',
    ],
    correct: 0,
    why: [
      'Right: some shoppers buy a random product they like, which keeps its orders coming.',
      'A random product fits less often than a ranked one; the slot costs hits.',
      'Shoppers buy random products they like, which is the point.',
    ],
  },
  {
    id: 'loop-data',
    chapter: C6,
    question: 'A shelf’s sales rise after launch. Does that prove it learned customers’ taste?',
    options: [
      'No: people buy what they are shown, so sales partly reflect the shelf',
      'Yes: sales are taste',
      'Yes, if the shop relearns often',
    ],
    correct: 0,
    why: [
      'Right: the shelf picked what they saw, so their buys are not a clean measure.',
      'Sales measure what was shown as much as what was wanted.',
      'Relearning from shelf sales feeds the loop; it doesn’t remove it.',
    ],
  },
  {
    id: 'bench-tradeoff',
    chapter: C7,
    question: 'What does a random shelf slot cost, and what does it buy?',
    options: [
      'It costs some hits and keeps more products alive',
      'It costs nothing and finds more hits',
      'It costs products and finds more hits',
    ],
    correct: 0,
    why: [
      'Right: a random product fits less often, but unshown products keep selling.',
      'A random slot fits shoppers less often than a ranked one, so hits fall.',
      'That is backwards: exploration keeps products on the map.',
    ],
  },
  {
    id: 'bench-blend',
    chapter: C7,
    question: 'Why mix bestsellers into a taste shelf at all?',
    options: [
      'Bestsellers are a safe guess where a shopper’s taste is thin',
      'Bestsellers always find more next orders',
      'Mixing hides the feedback loop',
    ],
    correct: 0,
    why: [
      'Right: a blend leans on popularity where taste has little evidence.',
      'Alone, bestsellers found the fewest next orders here.',
      'No blend escapes the loop; only showing unshown products does.',
    ],
  },
  {
    id: 'bench-rule',
    chapter: C7,
    question: `The owner says: “Keep ${COVERAGE_MIN} products on the map, then find the most next orders.” Which setting fails?`,
    options: [
      'Any setting with no random slots',
      'All bestsellers with two random slots',
      'Half and half with one random slot',
    ],
    correct: 0,
    why: [
      'Right: without exploration, the loop drops too many products off the map.',
      'Random slots keep products alive; this one passes the floor.',
      'One random slot is enough to keep the floor here.',
    ],
  },
];
