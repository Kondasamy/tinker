// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // the module's edge, pinned (asked first in the warm-up until right)
  {
    id: 'memory-edge',
    chapter: '06-undo-the-source',
    pin: true,
    question: 'A colleague asks what makes an assistant’s memory trustworthy. Which answer is right?',
    options: [
      'Every memory names its source, so when a source goes bad you can undo everything it taught',
      'It keeps everything, so nothing important is ever lost',
      'It only ever trusts the newest thing it was told',
    ],
    correct: 0,
    why: [
      'Right: with a source on every memory, one bad source can be removed exactly, good memories kept.',
      'Keeping everything buries what matters, and keeps whatever was planted too.',
      'Newest-wins lets any recent chat or page overwrite a trusted record.',
    ],
  },
  // 1. What to keep
  {
    id: 'keep-lasting',
    chapter: '01-what-to-keep',
    question: 'A hotel’s chat assistant talks with a guest. Which line is worth remembering for their next stay?',
    options: ['They are allergic to feathers', 'They said good morning', 'They asked what time it was'],
    correct: 0,
    why: [
      'Right: it will matter on every stay, so it is a lasting fact.',
      'A greeting matters only in that chat.',
      'The time was answered then; it won’t help next time.',
    ],
  },
  {
    id: 'keep-cost',
    chapter: '01-what-to-keep',
    question: 'Why not simply remember every line of every chat?',
    options: [
      'Small talk crowds out the few facts that matter',
      'There is no cost: more memory is always better',
      'An assistant can’t store more than one chat',
    ],
    correct: 0,
    why: [
      'Right: clutter makes the useful memory harder to find and use.',
      'Clutter has a cost: the assistant must wade through it every time.',
      'Storage isn’t the limit here; what to keep is a choice.',
    ],
  },
  {
    id: 'keep-who',
    chapter: '01-what-to-keep',
    question: 'Who should decide which candidate memories to keep?',
    options: [
      'A keep rule, written for what the business needs later',
      'Nobody: keep them all and sort them later',
      'The customer, by marking each line',
    ],
    correct: 0,
    why: [
      'Right: a rule like “addresses, preferences, accounts” keeps the right things every time.',
      'Sorting later means the clutter is already shaping answers.',
      'Customers can ask to be forgotten, but marking every line isn’t their job.',
    ],
  },
  // 2. Where it came from
  {
    id: 'source-why',
    chapter: '02-where-it-came-from',
    question: 'A delivery company finds its route system gave wrong postcodes all week. What helps most?',
    options: [
      'Memories that record which system they came from',
      'Memories sorted by date',
      'Memories with the longest text',
    ],
    correct: 0,
    why: [
      'Right: then you can find every memory that system taught, and only those.',
      'A date alone mixes the bad system’s memories with good ones from the same week.',
      'Length says nothing about where a memory came from.',
    ],
  },
  {
    id: 'source-learnt',
    chapter: '02-where-it-came-from',
    question: 'The assistant learns a new memory from an older memory. What should its source be?',
    options: [
      'The older memory, so it traces back to that memory’s source',
      'Nothing: the assistant made it itself',
      'Today’s date',
    ],
    correct: 0,
    why: [
      'Right: a chain of threads leads back to the paper it all came from.',
      'Then a bad source’s influence hides inside the assistant’s own notes.',
      'A date doesn’t say what it was learnt from.',
    ],
  },
  {
    id: 'source-check',
    chapter: '02-where-it-came-from',
    question: 'A memory says a customer is banned. Before acting, what do you want to know?',
    options: ['Which source said so', 'How long the memory is', 'How many times it was used'],
    correct: 0,
    why: [
      'Right: a staff record and a stranger’s chat deserve very different trust.',
      'Length tells you nothing about whether it is true.',
      'Use counts how often it mattered, not whether it is right.',
    ],
  },
  // 3. Old and new disagree
  {
    id: 'conflict-rule',
    chapter: '03-old-and-new',
    question: 'The payroll system says Sam’s bank account is A. A newer chat says B. Which stays?',
    options: [
      'Check the trust of each source first; a newer chat shouldn’t override payroll alone',
      'B: newest always wins',
      'Both: keep them and pick one each time',
    ],
    correct: 0,
    why: [
      'Right: weigh the source first, then the date.',
      'Newest-wins lets anyone who chats change a trusted record.',
      'Two answers for one fact means a coin flip on every payment.',
    ],
  },
  {
    id: 'conflict-one',
    chapter: '03-old-and-new',
    question: 'Why keep only one memory per fact, like one address per customer?',
    options: [
      'So the assistant can’t use the stale one by mistake',
      'To save storage space',
      'Because memories can’t be updated',
    ],
    correct: 0,
    why: [
      'Right: a stale card left beside the new one can still be picked.',
      'Space isn’t the reason; a wrong answer is.',
      'Memories can be updated: the loser is replaced.',
    ],
  },
  {
    id: 'conflict-web',
    chapter: '03-old-and-new',
    question: 'A web page, newer than your handbook, states a different refund rule. What happens under good rules?',
    options: [
      'The handbook’s rule stays: it is the better source',
      'The web page wins: it is newer',
      'Both rules apply',
    ],
    correct: 0,
    why: [
      'Right: the better source wins first.',
      'Newer isn’t truer; that is how planted pages take over.',
      'Two rules that disagree can’t both apply.',
    ],
  },
  // 4. Forgetting
  {
    id: 'forget-expiry',
    chapter: '04-forgetting',
    question: 'A note says “customer on holiday, hold parcels until the 12th”. What should happen to it?',
    options: ['It should expire once it stops being true', 'Keep it forever, in case it matters', 'Delete it at once'],
    correct: 0,
    why: [
      'Right: a time-bound note gets an expiry, or it keeps holding parcels long after.',
      'Kept forever, it keeps giving a wrong answer.',
      'It matters until the 12th; deleting it at once loses that.',
    ],
  },
  {
    id: 'forget-me',
    chapter: '04-forgetting',
    question: 'A customer asks to be forgotten. Their address came from billing, their hobby from chat. What goes?',
    options: ['Both: everything about them', 'Only the chat memory', 'Only the billing memory'],
    correct: 0,
    why: [
      'Right: forgetting is about the person, whatever the source.',
      'The billing address is about them too.',
      'The chat memory is about them too.',
    ],
  },
  {
    id: 'forget-vs-undo',
    chapter: '04-forgetting',
    question: 'What is the difference between “forget me” and undoing a source?',
    options: [
      'Forget me removes everything about a person; undo removes everything from one source',
      'They are the same thing',
      'Undo removes a person; forget me removes a source',
    ],
    correct: 0,
    why: [
      'Right: one follows the person, the other follows the thread.',
      'They cut the board different ways, so they remove different cards.',
      'That has them backwards.',
    ],
  },
  // 5. A poisoned note
  {
    id: 'poison-how',
    chapter: '05-poisoned-note',
    question: 'How can an attacker get a false rule into an assistant’s memory without hacking it?',
    options: [
      'Leave it somewhere the assistant reads, like a page or a chat',
      'Only by breaking into the server',
      'They can’t: memories come only from staff',
    ],
    correct: 0,
    why: [
      'Right: an assistant that remembers what it reads can be taught by anything it reads.',
      'No break-in is needed when the assistant reads the planted text itself.',
      'Memories also come from chats and pages anyone can write.',
    ],
  },
  {
    id: 'poison-stays',
    chapter: '05-poisoned-note',
    question: 'A planted page is deleted. A week later the assistant still follows its rule. Why?',
    options: [
      'The memory is a copy that outlives the page',
      'The page is cached and still being read',
      'The assistant is broken',
    ],
    correct: 0,
    why: [
      'Right: deleting the page doesn’t delete what was learnt from it.',
      'It doesn’t need the page any more; the memory carries the rule.',
      'It is working as built: it remembers what it read.',
    ],
  },
  {
    id: 'poison-rival',
    chapter: '05-poisoned-note',
    question: 'Ranking sources stopped a planted refund rule but not a planted ID rule. Why?',
    options: ['The ID rule had no trusted card to lose to', 'The ID rule was newer', 'Ranking only works on addresses'],
    correct: 0,
    why: [
      'Right: ranking only settles conflicts; a new false rule with no rival just stays.',
      'Both came from the same page on the same day.',
      'Ranking works on any fact with a rival card.',
    ],
  },
  // 6. Undo the source
  {
    id: 'undo-what',
    chapter: '06-undo-the-source',
    question: 'You undo a bad source. A memory was learnt from one of its memories. What happens to it?',
    options: [
      'It goes too: it hangs from that source through the other memory',
      'It stays: it came from the assistant',
      'It stays until it expires',
    ],
    correct: 0,
    why: [
      'Right: the thread runs through the first memory back to the bad source.',
      'The assistant learnt it from bad data, so it is bad data too.',
      'Waiting lets it keep steering answers.',
    ],
  },
  {
    id: 'undo-vs-wipe',
    chapter: '06-undo-the-source',
    question: 'Why undo one source rather than wipe the whole memory?',
    options: ['Good memories from other sources survive', 'Wiping is impossible', 'Undo is faster to type'],
    correct: 0,
    why: [
      'Right: you lose only what the bad source taught.',
      'Wiping works, but it throws away every good memory too.',
      'Speed isn’t the point; keeping the good memories is.',
    ],
  },
  // 7. Workbench
  {
    id: 'bench-order',
    chapter: '07-workbench',
    question: 'Good keep, expiry and trust rules still left two planted cards. What finishes the job?',
    options: ['Undo the planted sources', 'Tighten the keep rule further', 'Turn memory off'],
    correct: 0,
    why: [
      'Right: rules stop most bad cards; undo by source removes the ones that got through.',
      'The planted cards looked like lasting facts, so no keep rule drops them.',
      'That loses every good memory with the bad.',
    ],
  },
  {
    id: 'bench-check',
    chapter: '07-workbench',
    question: 'What does “web pages need a check” add over ranking sources?',
    options: [
      'Web-sourced memories aren’t kept at all until checked',
      'Web pages win every conflict',
      'Nothing: it is the same rule',
    ],
    correct: 0,
    why: [
      'Right: a planted page with no rival card can’t slip in.',
      'That would be the opposite: the weakest source winning.',
      'Ranking keeps a web card when nothing contradicts it; the check doesn’t.',
    ],
  },
];
