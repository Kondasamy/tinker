// Finding the way: the module's registry entry and chapters. Chapter ids are a contract with readers' saved progress:
// never rename one.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { JUNCTIONS } from '../../lib/routes/graph';
import { DELIVERIES } from '../../lib/routes/workbench';

const CHAPTERS: Chapter[] = [
  {
    id: '01-roads-as-a-graph',
    title: 'Roads as a graph',
    short: 'A graph',
    intro: {
      story:
        'Larkspur’s van leaves the depot every morning for a customer across the river. The delivery app picks its way through town.',
      goal: 'What does a map look like to the app?',
      learn: [
        'A map is junctions joined by roads',
        'Each road carries its minutes',
        'A closed road is simply gone from the graph',
      ],
      terms: [
        ['Graph', 'Points joined by lines: here, junctions joined by roads.'],
        ['Junction', 'A point in the graph where roads meet.'],
        ['Cost', 'What a road takes to drive: here, its minutes.'],
      ],
    },
  },
  {
    id: '02-fewest-roads-or-minutes',
    title: 'Fewest roads or fewest minutes',
    short: 'Roads or minutes',
    intro: {
      story: 'The app can count roads or add up minutes. Your driver wants the quickest way, not the shortest list.',
      goal: 'Is the route with the fewest roads also the quickest?',
      learn: [
        'Breadth-first search finds the fewest roads',
        'It ignores how long each road takes',
        'Minutes need a search that adds them up',
      ],
      terms: [
        [
          'Breadth-first search',
          'A search that spreads out one road at a time, so it finds the route with fewest roads.',
        ],
        ['Hop', 'One road taken: a hop count is how many roads a route uses.'],
      ],
    },
  },
  {
    id: '03-dijkstra',
    title: 'Dijkstra: nearest first',
    short: 'Dijkstra',
    intro: {
      story: 'To find the quickest way, the app runs Dijkstra’s algorithm from the depot, one junction at a time.',
      goal: 'In what order does Dijkstra’s algorithm settle the town?',
      learn: [
        'The frontier holds junctions reached but not settled',
        'The cheapest one settles next, and is final',
        'It stops when the customer settles',
      ],
      terms: [
        ['Frontier', 'Junctions the search has reached by some road but not yet settled.'],
        ['Settle', 'Fix a junction’s quickest minutes from the depot for good.'],
        [
          'Dijkstra’s algorithm',
          'Settle the frontier junction nearest the depot, over and over, until the goal settles.',
        ],
      ],
    },
  },
  {
    id: '04-a-star',
    title: 'A*: lean toward the goal',
    short: 'A*',
    intro: {
      story: 'Dijkstra settled junctions behind the depot that lead nowhere near the customer. The app can do better.',
      goal: 'How can a search look at fewer junctions and still find the quickest way?',
      learn: [
        'A* adds a guess of the minutes left',
        'A guess that never overestimates keeps the route exact',
        'Weighting the guess trades minutes for speed',
      ],
      terms: [
        ['A*', 'Dijkstra plus a guess of the minutes still to go, so it leans toward the goal.'],
        ['Heuristic', 'The guess: here, the straight-line distance at the fastest road’s pace.'],
        ['Weight', 'How hard the search trusts its guess; above 1 it may give up a few minutes.'],
      ],
    },
  },
  {
    id: '05-live-traffic',
    title: 'Live traffic',
    short: 'Traffic',
    intro: {
      story: 'Mid-morning, a lorry unloads on the ring road by Lock and the cars back up. The van hasn’t left yet.',
      goal: 'What changes inside the app when a road jams?',
      learn: [
        'A jam raises one road’s minutes',
        'The same search then finds a new route',
        'A closure is a road with no way through',
      ],
      terms: [['Jam', 'Slow traffic on a road: its minutes go up, nothing else changes.']],
    },
  },
  {
    id: '06-whole-country-maps',
    title: 'Whole-country maps',
    short: 'Big maps',
    intro: {
      story: `Larkspur’s town has ${JUNCTIONS.length} junctions. A country’s map has millions, and drivers want an answer at once.`,
      goal: 'How does a map app answer fast on a map that big?',
      learn: [
        'Plain Dijkstra looks at too much',
        'Shortcuts are worked out ahead of time',
        'A route question then uses the shortcuts',
      ],
      terms: [
        ['Shortcut', 'A made-up road between two junctions that stores the quickest minutes between them.'],
        [
          'Contraction hierarchies',
          'A method that adds shortcuts ahead of time, so a route question skips minor junctions.',
        ],
      ],
    },
  },
  {
    id: '07-delivery-day',
    title: 'Plan the delivery day',
    short: 'Delivery day',
    intro: {
      story: `Tomorrow’s van has ${DELIVERIES.length} drops, with roadworks and jams on the way. You pick the search the app runs.`,
      goal: 'Which search keeps every drop quick while looking at the fewest junctions?',
      learn: ['Exact searches look at more', 'Leaning too hard costs minutes', 'Pick by the rule, not by habit'],
      terms: [['Workbench', 'Every setting at once, run over the whole day, checked against the rule.']],
    },
  },
];

export const ROUTES_MODULE: Module = {
  id: 'routes',
  title: 'Finding the way',
  description:
    'How a map app picks your route: roads as a graph, Dijkstra’s nearest-first search, A*, and live traffic that changes it.',
  level: 'Intermediate',
  track: 'Classic tech',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: [],
  story:
    'Larkspur Supply Co.’s delivery van crosses town each morning; you close roads, jam the ring road and watch the app find the way.',
  chapters: CHAPTERS,
  recall: RECALL,
};
