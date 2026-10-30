// Finding the way's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's edge: a map is a graph, the search is fixed, and traffic only changes the weights.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-roads-as-a-graph',
  C2 = '02-fewest-roads-or-minutes',
  C3 = '03-dijkstra',
  C4 = '04-a-star',
  C5 = '05-live-traffic',
  C6 = '06-whole-country-maps',
  C7 = '07-delivery-day';

export const RECALL: RecallItem[] = [
  {
    id: 'weights-not-search',
    chapter: C5,
    pin: true,
    question: 'A product manager asks how the app “handles traffic”. What is the honest short answer?',
    options: [
      'Traffic raises some roads’ minutes; the same shortest-path search then runs over the new numbers',
      'The app swaps in a different algorithm whenever traffic is heavy',
      'Traffic is only shown on the map; the route ignores it',
    ],
    correct: 0,
    why: [
      'Right. The map stays a graph; only the weights change, and Dijkstra or A* does the rest.',
      'No special algorithm is needed: a jammed road is just a road with more minutes.',
      'Live apps reroute around jams because the jam changes the road’s cost.',
    ],
  },
  // 1. Roads as a graph
  {
    id: 'graph-parts',
    chapter: C1,
    question: 'A metro map as a graph: what are the junctions, and what are the roads?',
    options: [
      'Stations are the junctions; the tracks between them, with their minutes, are the roads',
      'Lines are the junctions; stations are the roads',
      'Only interchange stations count; the rest are left out',
    ],
    correct: 0,
    why: [
      'Right: points where you can stop or change, joined by links that cost time.',
      'A line is a chain of links, not a point; the stations are the points.',
      'Every stop is a point the route may pass through, so every one is in the graph.',
    ],
  },
  {
    id: 'closure-no-route',
    chapter: C1,
    question: 'Both ferries to an island are cancelled. What should the route app say for a trip there?',
    options: [
      'No route, until a ferry runs again',
      'The route over the cancelled ferry, since it is shortest',
      'A route through the nearest other town',
    ],
    correct: 0,
    why: [
      'Right: with every link to the island gone, no path exists in the graph.',
      'A closed link has no way through; a route over it can’t be driven.',
      'No road reaches the island from any town, so no detour exists.',
    ],
  },
  {
    id: 'cost-is-minutes',
    chapter: C1,
    question: 'Why does each road carry minutes and not just a line on the map?',
    options: [
      'The search adds them up to compare routes',
      'They are only shown to the driver',
      'They set where the road is drawn',
    ],
    correct: 0,
    why: [
      'Right: a route’s cost is the sum of its roads’ minutes, and the search wants the smallest.',
      'The driver may see them, but the search uses them to choose.',
      'Where a road sits on the map doesn’t say how long it takes.',
    ],
  },
  // 2. Fewest roads or fewest minutes
  {
    id: 'hops-vs-minutes',
    chapter: C2,
    question: 'A route has 4 roads through the old town; another has 7 along the bypass. Which is quicker?',
    options: [
      'You can’t tell from the counts: add up each road’s minutes',
      'The 4-road one: fewer roads is always quicker',
      'The 7-road one: more roads means faster roads',
    ],
    correct: 0,
    why: [
      'Right: only the minutes decide; road counts say nothing about speed.',
      'Fewer roads can still be slower if they are slow streets.',
      'More roads isn’t faster in itself; it depends on each road’s minutes.',
    ],
  },
  {
    id: 'bfs-ignores',
    chapter: C2,
    question: 'What does breadth-first search ignore when it finds a route?',
    options: ['How long each road takes', 'How many roads the route has', 'Which junction is the goal'],
    correct: 0,
    why: [
      'Right: it counts roads, so every road weighs the same to it.',
      'Road count is exactly what it minimises.',
      'It stops when it reaches the goal, so it knows the goal.',
    ],
  },
  {
    id: 'bfs-when',
    chapter: C2,
    question: 'When is the fewest-roads route also the quickest?',
    options: ['When every road takes about the same time', 'Always', 'Only when no road is closed'],
    correct: 0,
    why: [
      'Right: if every road costs the same, fewest roads means fewest minutes.',
      'With slow and fast roads mixed, a longer list of fast roads can win.',
      'Closures change which routes exist, not whether hops match minutes.',
    ],
  },
  // 3. Dijkstra
  {
    id: 'nearest-first',
    chapter: C3,
    question: 'Which junction does Dijkstra’s algorithm settle next?',
    options: [
      'The frontier junction nearest the start, by minutes so far',
      'The junction nearest the goal',
      'The junction with the most roads',
    ],
    correct: 0,
    why: [
      'Right: cheapest first, so each settled junction’s minutes are final.',
      'Leaning toward the goal is A*’s trick; plain Dijkstra has no idea where the goal is.',
      'How many roads a junction has doesn’t decide its turn.',
    ],
  },
  {
    id: 'settled-final',
    chapter: C3,
    question: 'A junction settled at 12 minutes. Can a road found later make it 10?',
    options: [
      'No: everything left to explore is at least 12 minutes out',
      'Yes, if the later road is very short',
      'Yes, after the whole map is settled',
    ],
    correct: 0,
    why: [
      'Right: any other way passes a frontier junction already 12 or more minutes away.',
      'A later road starts from a junction at least as far out, so it can only add minutes.',
      'Settled means final; settling the rest never changes it.',
    ],
  },
  {
    id: 'dijkstra-stop',
    chapter: C3,
    question: 'When can Dijkstra stop searching for one customer’s route?',
    options: [
      'As soon as the customer’s junction settles',
      'Only after every junction is settled',
      'As soon as the customer reaches the frontier',
    ],
    correct: 0,
    why: [
      'Right: once it settles, no cheaper way to it can turn up.',
      'Junctions further out can’t improve a settled one, so finishing the map is wasted work.',
      'On the frontier it may still be reached a cheaper way; it must settle first.',
    ],
  },
  // 4. A*
  {
    id: 'astar-guess',
    chapter: C4,
    question: 'What does A* add to Dijkstra?',
    options: [
      'A guess of the minutes left to the goal',
      'A second search from the goal',
      'A shortcut between busy junctions',
    ],
    correct: 0,
    why: [
      'Right: minutes so far plus a guess of what’s left, so it leans toward the goal.',
      'Searching from both ends is a different trick; A* searches forward with a guess.',
      'Shortcuts are worked out ahead of time; A* only guesses during the search.',
    ],
  },
  {
    id: 'never-over',
    chapter: C4,
    question: 'Why use the straight-line distance at the fastest road’s speed as the guess?',
    options: [
      'It never overestimates, so A* still finds the quickest route',
      'It is the exact minutes left',
      'It makes A* look at every junction',
    ],
    correct: 0,
    why: [
      'Right: no real route beats a straight line at top speed, so the guess is never too high.',
      'Roads bend and slow down, so the real minutes are usually more.',
      'A good guess makes A* look at fewer junctions, not more.',
    ],
  },
  {
    id: 'weight-trade',
    chapter: C4,
    question: 'You raise A*’s weight from 1 to 3. What happens?',
    options: [
      'It looks at fewer junctions, and may return a slower route',
      'It finds a quicker route than before',
      'Nothing changes: the weight is cosmetic',
    ],
    correct: 0,
    why: [
      'Right: it trusts the guess more, explores less, and can give up some minutes.',
      'Weight 1 already finds the quickest; leaning harder can only match or lose.',
      'The weight changes which junction settles next, so the search changes.',
    ],
  },
  // 5. Live traffic
  {
    id: 'jam-flip',
    chapter: C5,
    question: 'A jam slowly gets worse on your route. When does the app switch routes?',
    options: [
      'Once the jammed route costs more than another way',
      'As soon as any jam appears',
      'Only when the road is closed',
    ],
    correct: 0,
    why: [
      'Right: the search keeps the cheapest; it flips when the totals cross.',
      'A small jam may still leave your route the cheapest.',
      'A jam alone can make another way cheaper long before any closure.',
    ],
  },
  {
    id: 'closure-is-infinite',
    chapter: C5,
    question: 'To the search, what is a closed road?',
    options: [
      'A road with no way through, as if its minutes were endless',
      'A road with a few extra minutes',
      'A road the driver is warned about',
    ],
    correct: 0,
    why: [
      'Right: the search can never use it, whatever the alternatives cost.',
      'Extra minutes could still be worth it; a closed road never is.',
      'A warning leaves the road usable; a closure removes it.',
    ],
  },
  // 6. Whole-country maps
  {
    id: 'precompute',
    chapter: C6,
    question: 'Why can a map app answer a cross-country route in a blink?',
    options: [
      'Shortcuts worked out ahead of time let the search skip minor junctions',
      'It runs plain Dijkstra on very fast computers',
      'It only looks at motorways',
    ],
    correct: 0,
    why: [
      'Right: contraction hierarchies pay once overnight, so each question looks at little.',
      'Plain Dijkstra on tens of millions of junctions is too slow per question.',
      'Trips start and end on small streets, so minor roads must be in the graph.',
    ],
  },
  {
    id: 'shortcut-stores',
    chapter: C6,
    question: 'What does a shortcut between two junctions store?',
    options: [
      'The quickest minutes between them, worked out in advance',
      'The straight-line distance between them',
      'A new road built between them',
    ],
    correct: 0,
    why: [
      'Right: it stands for the best real route, so using it loses nothing.',
      'A straight line is A*’s guess, not a shortcut.',
      'Nothing is built; it is a note in the app’s data.',
    ],
  },
  {
    id: 'index-same-idea',
    chapter: C6,
    question: 'How are a search engine’s index and a map’s shortcuts alike?',
    options: [
      'Both do work ahead of time so each question looks at little',
      'Both rank results by popularity',
      'Both are rebuilt on every question',
    ],
    correct: 0,
    why: [
      'Right: build once, then every question is cheap.',
      'Ranking is separate; the shared idea is preparing ahead.',
      'Rebuilding per question would throw away the whole point.',
    ],
  },
  // 7. Delivery day
  {
    id: 'pick-by-rule',
    chapter: C7,
    question: 'Your team must choose a route search. What decides it?',
    options: [
      'A rule: how many minutes you may lose, then the least looking',
      'Always the exact one',
      'Always the fastest to compute',
    ],
    correct: 0,
    why: [
      'Right: state the slack, then pick the cheapest search that meets it.',
      'Exact is safe but may cost far more than the slack needs.',
      'The fastest search can lose too many minutes.',
    ],
  },
  {
    id: 'whole-day',
    chapter: C7,
    question: 'Why check a search over a whole day of trips, not one?',
    options: [
      'A setting can look fine on one trip and lose minutes on others',
      'One trip is always enough',
      'Because closures never repeat',
    ],
    correct: 0,
    why: [
      'Right: different drops and closures expose different weaknesses.',
      'A single trip can hide where a heavy weight goes wrong.',
      'The point is coverage of many cases, not whether closures repeat.',
    ],
  },
  {
    id: 'heavy-loses',
    chapter: C7,
    question: 'A heavier weight looked at far fewer junctions than the winner. Why didn’t it win?',
    options: [
      'Its routes cost more minutes than the rule allows',
      'It found no routes at all',
      'It looked at more junctions than Dijkstra',
    ],
    correct: 0,
    why: [
      'Right: leaning too hard trades away more minutes than the slack.',
      'It found a route every time, just slower ones.',
      'It looked at fewer, which is why it is tempting.',
    ],
  },
];
