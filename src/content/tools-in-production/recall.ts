// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'tools-edge',
    chapter: '04-a-fingerprint',
    pin: true,
    question: 'A colleague asks for the two rules of running many tools from outside servers. Which pair is right?',
    options: [
      'Load tools only when needed, and check each one is still the tool you approved',
      'Load every tool up front, and trust any server once it is connected',
      'Use as few servers as possible, and never update them',
    ],
    correct: 0,
    why: [
      'Right: loading on demand keeps prompts small and picks sharp, and a check catches a tool that changed under you.',
      'Loading everything crowds the prompt, and a connected server can still change or poison its tools later.',
      'Fewer servers help a little, but servers change their tools whether you update or not.',
    ],
  },
  // 1. Sixty tools, one prompt
  {
    id: 'every-definition',
    chapter: '01-sixty-tools',
    question:
      'A shop bot has 90 tools loaded. A customer asks one question about opening hours. What goes to the model?',
    options: [
      'All 90 tool definitions, with that one question',
      'Only the opening-hours tool',
      'No tools: the question needs none',
    ],
    correct: 0,
    why: [
      'Right: loaded tools ride along with every request, needed or not.',
      'Choosing tools per request is what a tool search adds; loaded tools all go in.',
      'The model only sees which tools exist through their definitions, so all of them are sent.',
    ],
  },
  {
    id: 'look-alikes',
    chapter: '01-sixty-tools',
    question:
      'With 150 tools loaded, an agent keeps calling “create_invoice” when asked to send an existing one. What is the likely cause?',
    options: [
      'Too many similar tools in view, so a look-alike gets picked',
      'The invoice server is down',
      'The agent needs even more tools to choose from',
    ],
    correct: 0,
    why: [
      'Right: picks get worse as the number of tools grows, and near-twins get confused first.',
      'A server being down makes a call fail; it doesn’t change which tool is chosen.',
      'More tools adds more look-alikes, which makes the confusion worse.',
    ],
  },
  {
    id: 'tokens-before-work',
    chapter: '01-sixty-tools',
    question: 'Why can a bot with many tools cost a lot even for a one-word reply?',
    options: [
      'Every tool definition is read on every request, before any work',
      'Tools charge a fee each time they are listed',
      'The reply is longer when more tools exist',
    ],
    correct: 0,
    why: [
      'Right: definitions are tokens in the prompt, paid for on every request.',
      'The cost is the model reading the definitions, not a fee from the tool.',
      'The reply can be short; it’s the prompt that grows with the tools.',
    ],
  },
  // 2. Fetch when needed
  {
    id: 'lazy-what',
    chapter: '02-fetch-when-needed',
    question: 'With lazy loading, what sits in the prompt before a request is read?',
    options: [
      'The tool search, plus any few tools kept always loaded',
      'Every tool’s definition, ready to use',
      'Nothing at all: the model guesses which tools exist',
    ],
    correct: 0,
    why: [
      'Right: the search is always there; the rest wait until a search finds them.',
      'That is loading everything, which lazy loading replaces.',
      'The model needs the search tool in view to find the others.',
    ],
  },
  {
    id: 'lazy-tradeoff',
    chapter: '02-fetch-when-needed',
    question: 'What does a tool search cost in exchange for the tokens it saves?',
    options: [
      'An extra step per request: search first, then call',
      'Nothing: it is strictly free',
      'Every tool must be loaded twice',
    ],
    correct: 0,
    why: [
      'Right: the model searches, then calls, so a request takes one more step.',
      'The search tool itself is in every prompt, and searching takes a turn.',
      'Each found tool loads once, only when found.',
    ],
  },
  {
    id: 'lazy-findable',
    chapter: '02-fetch-when-needed',
    question:
      'Tools load only when a search finds them. A tool is never used though people need it. What should you fix first?',
    options: [
      'Its name and description, so a search can match how people ask',
      'Load every tool up front again',
      'Move the tool to its own server',
    ],
    correct: 0,
    why: [
      'Right: a search matches words, so a tool described in other words is never found.',
      'That brings back the crowded prompt for one tool’s sake.',
      'Which server holds it doesn’t change whether the search matches it.',
    ],
  },
  // 3. The tool changed
  {
    id: 'servers-change',
    chapter: '03-the-tool-changed',
    question:
      'You approved a CRM server’s tools in March. In May its “lookup” tool takes a new required input. Who decided that?',
    options: ['The server’s owner, without asking you', 'You, when you approved it in March', 'The model'],
    correct: 0,
    why: [
      'Right: a server can change its tools whenever its owner likes.',
      'Your approval covered March’s tool, not whatever it becomes.',
      'The model only reads tools; it never changes a server.',
    ],
  },
  {
    id: 'drift-breaks',
    chapter: '03-the-tool-changed',
    question: 'Overnight a shipping tool renames “zip” to “postal_code”. What breaks first?',
    options: [
      'Calls written for “zip”, which the tool no longer takes',
      'Nothing: names of inputs don’t matter',
      'The whole server goes offline',
    ],
    correct: 0,
    why: [
      'Right: anything still sending the old input name now fails.',
      'Inputs are matched by name, so a rename changes what a call must send.',
      'The rest of the server keeps working; one tool changed.',
    ],
  },
  {
    id: 'drift-notice',
    chapter: '03-the-tool-changed',
    question: 'How does your assistant learn that a tool it uses has changed?',
    options: [
      'Only if something compares it with what you approved',
      'The model always notices and asks',
      'The server must ask your permission first',
    ],
    correct: 0,
    why: [
      'Right: without a check of your own, the new tool is used as if approved.',
      'The model reads whatever tool it is given, old or new.',
      'A server may change its tools without asking; at best it notifies.',
    ],
  },
  // 4. A fingerprint per tool
  {
    id: 'print-covers',
    chapter: '04-a-fingerprint',
    question: 'A tool’s fingerprint covers its name and inputs. Its description changes. Is the change caught?',
    options: [
      'Only if the print covers the description too, which it should',
      'Yes, always: a name is enough',
      'No change to a description matters',
    ],
    correct: 0,
    why: [
      'Right: the description is what the model reads, so the print must include it.',
      'A print of the name alone misses every change to the description.',
      'Descriptions steer the model, and hidden orders live there.',
    ],
  },
  {
    id: 'pin-holds',
    chapter: '04-a-fingerprint',
    question: 'A pinned tool’s print no longer matches. What should happen next?',
    options: [
      'It waits until a person approves the new version',
      'It is used, with a warning in a log',
      'The whole server is removed',
    ],
    correct: 0,
    why: [
      'Right: a pin holds the change back for someone to read and approve.',
      'A warning nobody reads still lets the changed tool run.',
      'Holding back the one tool is enough; the other tools still match.',
    ],
  },
  {
    id: 'pin-cost',
    chapter: '04-a-fingerprint',
    question: 'What does pinning a server’s tools cost?',
    options: [
      'Harmless changes are held too, until someone approves them',
      'Nothing at all',
      'Every request runs twice as slowly',
    ],
    correct: 0,
    why: [
      'Right: a pin can’t tell a harmless rename from a harmful one, so both wait for a person.',
      'Held tools mean requests that need them wait.',
      'Checking a print is quick; the cost is the waiting, not the speed.',
    ],
  },
  // 5. Hidden instructions
  {
    id: 'model-reads-all',
    chapter: '05-hidden-instructions',
    question: 'An app shows tools by their first line only. Who reads the rest of each description?',
    options: ['The model, every word', 'Nobody: it is just a comment', 'Only the server'],
    correct: 0,
    why: [
      'Right: the whole description goes into the prompt, including what people never see.',
      'Descriptions are written for the model, which takes them as guidance.',
      'The server wrote it; the model is the one that reads it.',
    ],
  },
  {
    id: 'pin-not-safety',
    chapter: '05-hidden-instructions',
    question: 'A server’s tool hid orders from day one, and you pinned it. What did the pin achieve?',
    options: [
      'It keeps the hidden orders exactly as you approved them',
      'It removed the hidden orders',
      'It blocks the server',
    ],
    correct: 0,
    why: [
      'Right: a pin checks for change, so approved poison stays approved.',
      'A pin never edits a tool; it only compares prints.',
      'A pin only holds changed tools; this one never changed.',
    ],
  },
  {
    id: 'poison-defence',
    chapter: '05-hidden-instructions',
    question: 'What stops a poisoned tool description?',
    options: [
      'Reading the full description before trusting the server, and refusing what hides orders',
      'Loading the tool only when needed',
      'Signing in to the server with your own pass',
    ],
    correct: 0,
    why: [
      'Right: the description itself is the attack, so a person must read it and bar the server.',
      'Loading later still loads the poisoned description when the tool is found.',
      'A sign-in decides who calls; it doesn’t clean what a tool says.',
    ],
  },
  // 6. Who is calling
  {
    id: 'shared-key',
    chapter: '06-who-is-calling',
    question: 'Why is one shared key across every server risky?',
    options: [
      'A copy taken from one server opens all the others',
      'Shared keys expire faster',
      'Servers can’t read shared keys',
    ],
    correct: 0,
    why: [
      'Right: a key not tied to one server works wherever it is accepted.',
      'Expiry isn’t the problem; reach is.',
      'They read it fine, which is exactly the trouble.',
    ],
  },
  {
    id: 'pass-names',
    chapter: '06-who-is-calling',
    question: 'A file server gets a pass issued for a chat server. What must it do?',
    options: [
      'Refuse it: the pass names another server',
      'Accept it: it’s a valid pass',
      'Forward it to the chat server',
    ],
    correct: 0,
    why: [
      'Right: a server only takes passes issued for itself.',
      'Valid somewhere isn’t valid here; the pass names its server.',
      'Passing on another server’s pass is exactly what the rules forbid.',
    ],
  },
  {
    id: 'on-behalf',
    chapter: '06-who-is-calling',
    question: 'With each server’s own sign-in, whose rights does the assistant act with?',
    options: [
      'The person who signed in, at that one server',
      'The company’s admin, everywhere',
      'The model’s own account',
    ],
    correct: 0,
    why: [
      'Right: the pass carries one person’s permission for one server.',
      'An admin key everywhere is the shared key the sign-in replaces.',
      'The model has no account; it acts with the pass it was given.',
    ],
  },
  // 7. Workbench
  {
    id: 'bar-vs-pin',
    chapter: '07-workbench',
    question: 'One server’s tool changes mid-week to hide orders; another hid them from the start. What fits each?',
    options: ['Pin the first; stop trusting the second', 'Pin both', 'Stop trusting both'],
    correct: 0,
    why: [
      'Right: a pin catches a change; only barring stops poison you already approved.',
      'Pinning the second keeps its hidden orders as approved.',
      'Barring the first loses its good requests when a pin would do.',
    ],
  },
  {
    id: 'pin-everything',
    chapter: '07-workbench',
    question: 'Why not simply pin every server?',
    options: [
      'Harmless changes then hold requests back until someone approves them',
      'Pins make leaks more likely',
      'Pins load every tool up front',
    ],
    correct: 0,
    why: [
      'Right: each held tool means requests that wait, so pin where changes are risky.',
      'Pins only refuse changed tools; they never let more through.',
      'Pinning and lazy loading are separate choices.',
    ],
  },
  {
    id: 'order-of-rules',
    chapter: '07-workbench',
    question:
      'A setup finishes more requests but leaks once. Another finishes fewer and never leaks. Which is better here?',
    options: ['The one that never leaks', 'The one that finishes more', 'They are equal'],
    correct: 0,
    why: [
      'Right: the rule puts no leaks first, then requests done, then tokens.',
      'One leak can send a customer list away; more requests don’t make up for it.',
      'The rule ranks leaks first, so they are not equal.',
    ],
  },
];
