// Recommendations: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

const CHAPTERS: Chapter[] = [
  {
    id: '01-the-bestsellers-shelf',
    title: 'The bestsellers shelf',
    short: 'Bestsellers',
    intro: {
      story:
        'Larkspur’s shop wants a “you might also need” shelf of five products. The quickest start: show everyone the bestsellers.',
      goal: 'Does one shelf for everyone find what each customer buys next?',
      learn: [
        'A shelf ranks products and shows the top five',
        'Bestsellers are the same for everyone',
        'Each customer’s hidden next order scores the shelf',
      ],
      terms: [
        ['Bestsellers', 'Products ranked by how many customers bought them; the same list for everyone.'],
        ['Hit', 'A customer’s next order, hidden from the shelf, turning up on it anyway.'],
      ],
    },
  },
  {
    id: '02-people-like-you',
    title: 'People like you',
    short: 'Like you',
    intro: {
      story:
        'Bestsellers miss most next orders. A joinery and a warehouse want different things, so the shelf should look at who is buying.',
      goal: 'Can similar customers’ baskets fill a better shelf?',
      learn: [
        'Two customers are alike when their baskets overlap',
        'Their purchases fill your shelf',
        'It finds far more next orders than bestsellers',
      ],
      terms: [
        ['Similarity', 'How much two baskets overlap, from 0 (nothing shared) to 1 (the same).'],
        ['People like you', 'A shelf filled with what the most similar customers bought.'],
      ],
    },
  },
  {
    id: '03-bought-together',
    title: 'Bought together',
    short: 'Together',
    intro: {
      story:
        'Similar customers work. Turned around, the same orders say which products go together, so a product can suggest the next.',
      goal: 'What does “bought together” put next to a product?',
      learn: [
        'Two products are alike when the same customers bought them',
        'One product in the basket suggests its neighbours',
        'Summed over a basket, it finds the most next orders',
      ],
      terms: [['Bought together', 'Products ranked by how many of the same customers bought them.']],
    },
  },
  {
    id: '04-hidden-tastes',
    title: 'Hidden tastes',
    short: 'Tastes',
    intro: {
      story:
        'Comparing every pair of customers grows slow as the shop grows. Instead, the shop squeezes all the orders into two numbers each.',
      goal: 'How can two numbers stand for a whole basket?',
      learn: [
        'Two numbers per customer and per product: a taste map',
        'A shelf ranks products pointing the same way',
        'Move the shopper and the shelf changes',
      ],
      terms: [
        ['Factors', 'Two numbers per customer and per product, found from the orders, that place each on a map.'],
        ['Taste map', 'The floor where every customer and product stands at its two numbers.'],
      ],
    },
  },
  {
    id: '05-new-shopper-new-product',
    title: 'The new shopper and the new product',
    short: 'Cold start',
    intro: {
      story:
        'A builder signs up today with no orders, and the Kestrel K3 scanner has just launched. Neither has two numbers yet.',
      goal: 'Where does the shelf put a shopper or product with no orders?',
      learn: [
        'A new shopper borrows the taste of what they pick',
        'A new product has no place until it sells',
        'A few orders rank it, but low',
      ],
      terms: [['Cold start', 'A shopper or product with no orders yet, so the shelf knows nothing about it.']],
    },
  },
  {
    id: '06-the-loop',
    title: 'The loop',
    short: 'The loop',
    intro: {
      story:
        'The shelf goes live. Customers buy from it, and the shop relearns tastes from recent orders every round. The shelf now learns from its own sales.',
      goal: 'What happens to products the shelf never shows?',
      learn: [
        'Shelf sales train the next shelf',
        'Products nobody is shown fade off the map',
        'A few random slots keep them alive',
      ],
      terms: [
        ['Feedback loop', 'The shelf shapes what sells, and what sells trains the shelf.'],
        ['Exploration', 'Shelf slots given to random products, so products off every shelf can still sell.'],
      ],
    },
  },
  {
    id: '07-tune-the-shelf',
    title: 'Tune the shelf',
    short: 'Tune it',
    intro: {
      story:
        'Before the shelf runs all season, the owner wants it set once: how much bestsellers versus tastes, and how many random slots.',
      goal: 'Which setting keeps the catalogue alive and still finds next orders?',
      learn: [
        'Tastes find more next orders than bestsellers',
        'Exploration keeps products on the map, at a price',
        'Why the best setting mixes both',
      ],
      terms: [['Workbench', 'Every setting run through the whole loop, checked against the owner’s rule.']],
    },
  },
];

export const RECOMMENDATIONS_MODULE: Module = {
  id: 'recommendations',
  title: 'Recommendations',
  description: 'Why the shop shows you this drill: what you and people like you bought, ranked, and the loop it feeds.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co. builds a “you might also need” shelf; the team learns that a recommender ranks by what people like you bought, and that what it shows shapes what gets bought next.',
  chapters: CHAPTERS,
  recall: RECALL,
};
