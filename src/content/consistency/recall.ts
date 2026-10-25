// Consistency's recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's
// idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned
// item is the module's one-line edge: copies keep a shop fast and open, and that is exactly why they can disagree;
// when they can't talk, you choose per kind of data between answering and being right.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-one-count-three-copies',
  C2 = '02-two-buyers-one-hinge',
  C3 = '03-the-link-goes-down',
  C4 = '04-quorums',
  C5 = '05-who-wins',
  C6 = '06-eventually',
  C7 = '07-stock-policy';

export const RECALL: RecallItem[] = [
  {
    id: 'answer-or-be-right',
    chapter: C3,
    pin: true,
    question:
      'A colleague says: “Our database keeps three copies in three cities, so even if a city loses its network, every copy keeps taking orders and stays exactly right.” What do you tell them?',
    options: [
      'While a copy is cut off, it must either refuse what it can’t confirm, or answer and risk disagreeing',
      'Right: three copies mean it can never be wrong',
      'Copies only disagree when a server breaks, not when the network does',
    ],
    correct: 0,
    why: [
      'Right. A cut-off copy can’t learn what the others did, so it picks between staying available and staying consistent.',
      'More copies make reads faster and survive failures, but a copy that can’t talk to the others can’t know their changes.',
      'A lost link is exactly when copies drift: each keeps working without hearing from the others.',
    ],
  },
  // 1. One count, three copies
  {
    id: 'replica-lag',
    chapter: C1,
    question:
      'A news site keeps its article in data centres on three continents. An editor fixes a typo; for a moment, readers in Asia still see it. Why?',
    options: [
      'The fix hasn’t reached the Asian copy yet',
      'Asian readers are sent an older version on purpose',
      'The fix failed and the editor must save again',
    ],
    correct: 0,
    why: [
      'Right: each copy changes when the news of the edit arrives, a little after the edit itself.',
      'Nobody chose to show old text; that copy just hasn’t received the change.',
      'The save worked; the copy that answered is behind, and will catch up on its own.',
    ],
  },
  {
    id: 'why-replicas',
    chapter: C1,
    question: 'Why would a shop keep a copy of its stock count in each region instead of one central count?',
    options: [
      'Each region answers from nearby, fast, and keeps working if another region fails',
      'Copies make the count always correct',
      'Copies save storage space',
    ],
    correct: 0,
    why: [
      'Right: replicas buy speed and survival, at the price of copies that may briefly disagree.',
      'Copies can disagree while news travels between them; one central count can’t.',
      'Three copies take three times the space, not less.',
    ],
  },
  {
    id: 'stale-meaning',
    chapter: C1,
    question: 'A flight app shows 4 seats left, though the airline’s main system says 3. What is the app’s count?',
    options: ['Stale: it hasn’t heard about the latest booking', 'Wrong forever', 'A different flight'],
    correct: 0,
    why: [
      'Right: it is an old count that will update when the booking’s news arrives.',
      'It isn’t broken for good: once the news arrives it shows 3.',
      'Same flight, two copies of its count, one of them behind.',
    ],
  },
  // 2. Two buyers, one hinge
  {
    id: 'concurrent-oversell',
    chapter: C2,
    question:
      'Two cashiers in two shops both see 1 limited sneaker left in the shared system, and both ring it up in the same second. What goes wrong?',
    options: [
      'Both read 1 before either sale was recorded, so the pair is sold twice',
      'The system is too slow; a faster one would fix it',
      'One cashier sees zero, so nothing goes wrong',
    ],
    correct: 0,
    why: [
      'Right: concurrent sales each checked the count before either changed it.',
      'Speed narrows the window but doesn’t close it: two sales in the same instant still both read 1.',
      'Neither sale had been recorded when the other checked, so both saw 1.',
    ],
  },
  {
    id: 'read-then-write',
    chapter: C2,
    question: 'Why doesn’t “check the count, then subtract one” protect the last unit when two warehouses do it?',
    options: [
      'Both can check before either subtracts',
      'Subtracting is slower than checking',
      'It does protect it, as long as the copies agree',
    ],
    correct: 0,
    why: [
      'Right: the check and the change are two moments, and another sale can fit between them.',
      'Speed isn’t the issue; the gap between checking and writing is.',
      'Even agreeing copies let two buyers both read 1 before either writes.',
    ],
  },
  {
    id: 'oversold-meaning',
    chapter: C2,
    question: 'A shop had 5 lamps and printed 6 receipts. What happened?',
    options: ['It oversold by one', 'It lost a lamp', 'One receipt was printed twice by mistake'],
    correct: 0,
    why: [
      'Right: six promises for five lamps, so one customer can’t be served.',
      'All five lamps are there; there is one promise too many.',
      'Six different customers paid; it isn’t a duplicate receipt.',
    ],
  },
  // 3. The link goes down
  {
    id: 'partition-choice',
    chapter: C3,
    question:
      'A hotel chain’s two booking servers lose their link. A guest asks the cut-off server for the last room. Which answer stays consistent?',
    options: [
      'Refuse until the link is back',
      'Book it and fix any double booking later',
      'Book it: the link always comes back quickly',
    ],
    correct: 0,
    why: [
      'Right: refusing gives up availability so two guests can’t hold the same room.',
      'That stays available, and a double booking is exactly the inconsistency.',
      'Whether the link returns fast doesn’t change what the cut-off server can know now.',
    ],
  },
  {
    id: 'partition-meaning',
    chapter: C3,
    question: 'What is a network partition?',
    options: [
      'The copies split into groups that can’t send each other messages',
      'A copy that has crashed',
      'A slow network that delivers every message late',
    ],
    correct: 0,
    why: [
      'Right: every copy keeps running, but messages across the split are lost.',
      'A crashed copy answers nobody; in a partition every copy still answers its side.',
      'Late messages still arrive; across a partition they don’t.',
    ],
  },
  {
    id: 'available-meaning',
    chapter: C3,
    question: 'In CAP, what does “available” mean?',
    options: ['Every request to a working server gets an answer', 'The answer is always correct', 'The server is fast'],
    correct: 0,
    why: [
      'Right: available means answering, even when the answer might be out of date.',
      'Correct answers are consistency; CAP says you can’t promise both in a partition.',
      'Availability is about getting an answer at all, not how quickly.',
    ],
  },
  // 4. Quorums
  {
    id: 'quorum-rule',
    chapter: C4,
    question: 'A store keeps 3 copies (N = 3) and writes to 2 (W = 2). How many must a read ask to never miss a write?',
    options: ['2: R + W must be more than N', '1: the newest copy always answers', '3: only all of them is safe'],
    correct: 0,
    why: [
      'Right: 2 + 2 is more than 3, so any read of 2 shares a copy with any write of 2.',
      '1 + 2 is only 3, so a read can land on the one copy the write skipped.',
      'Reading all 3 works, but 2 already overlaps every write of 2.',
    ],
  },
  {
    id: 'quorum-cost',
    chapter: C4,
    question: 'A team raises W from 1 to 3 out of 3. What happens when one server is unreachable?',
    options: ['Writes are refused', 'Writes get faster', 'Nothing changes'],
    correct: 0,
    why: [
      'Right: a write must now reach all three, and one is out of reach.',
      'Waiting for more servers makes a write slower, not faster.',
      'With W = 1 the write would go through; with W = 3 it can’t.',
    ],
  },
  {
    id: 'quorum-concurrent',
    chapter: C4,
    question: 'With R + W > N, can two buyers at the same moment still both get the last unit?',
    options: [
      'Yes: a quorum makes reads see finished writes, not writes still happening',
      'No: a quorum stops every clash',
      'Only if the network is down',
    ],
    correct: 0,
    why: [
      'Right: both buyers read before either write finished, so both saw 1.',
      'Quorums stop stale reads; two writes in the same instant still clash.',
      'The clash happens with the network up: both read in the same minute.',
    ],
  },
  // 5. Who wins
  {
    id: 'lww-lost',
    chapter: C5,
    question:
      'Two staff edit a product price at the same moment: one to $10, one to $12. The system keeps the latest timestamp. What happens to the other edit?',
    options: ['It is silently dropped', 'The two are averaged to $11', 'Both staff are warned'],
    correct: 0,
    why: [
      'Right: last writer wins keeps one version whole and loses the other without a warning.',
      'The rule compares timestamps; it never combines values.',
      'Nothing reports the clash; both writes succeed and one is replaced.',
    ],
  },
  {
    id: 'primary-serial',
    chapter: C5,
    question: 'Why does sending every order for the last unit to one primary stop the double sale?',
    options: [
      'The primary takes orders one at a time, so the second sees zero',
      'The primary is faster than the others',
      'The primary keeps more stock',
    ],
    correct: 0,
    why: [
      'Right: one place deciding in order means no two orders read the same count.',
      'Speed isn’t the fix; the order of decisions is.',
      'It holds the same count; it just decides alone.',
    ],
  },
  {
    id: 'primary-cost',
    chapter: C5,
    question: 'What does a single primary cost when a warehouse can’t reach it?',
    options: ['That warehouse must refuse orders', 'Nothing: it keeps selling', 'Its stock is lost'],
    correct: 0,
    why: [
      'Right: with no way to ask the primary, the warehouse can’t sell safely.',
      'Selling without the primary would bring back the double sale.',
      'The stock is fine; only the orders that can’t be checked are refused.',
    ],
  },
  // 6. Eventually
  {
    id: 'ryw-fix',
    chapter: C6,
    question:
      'You change your profile photo, reload, and see the old one. Which fix makes sure you always see your own change?',
    options: ['Answer your reads from the copy that took your write', 'Reload more often', 'Store the photo twice'],
    correct: 0,
    why: [
      'Right: the copy that took your change always has it, so read your writes holds.',
      'Reloading may land on another copy that is still behind.',
      'Two stored copies can lag just the same.',
    ],
  },
  {
    id: 'eventual-meaning',
    chapter: C6,
    question: 'A system is “eventually consistent”. What does it promise?',
    options: [
      'Once changes stop arriving, every copy ends up the same',
      'Every read is always the newest',
      'Copies never disagree',
    ],
    correct: 0,
    why: [
      'Right: copies may differ for a while, but they converge once the news arrives.',
      'That is a stronger promise; eventual consistency allows old reads in between.',
      'They can disagree, just not forever.',
    ],
  },
  {
    id: 'ryw-others',
    chapter: C6,
    question:
      'Read your writes is on. Your friend in another city reloads right after your change. Are they sure to see it?',
    options: [
      'No: the promise covers your own reads, not theirs',
      'Yes: everyone sees it at once',
      'Only if they reload twice',
    ],
    correct: 0,
    why: [
      'Right: their copy may still be behind; only your reads are sent where you wrote.',
      'Copies still lag; read your writes is a promise to the writer alone.',
      'Reloading doesn’t help until their copy has the change.',
    ],
  },
  // 7. Stock policy
  {
    id: 'per-product',
    chapter: C7,
    question:
      'A bakery sells bread (baked all day) and a single wedding cake slot per day. Its two shops lose their link. What should each shop do?',
    options: [
      'Keep selling bread; refuse cake bookings it can’t confirm',
      'Refuse everything until the link is back',
      'Keep selling both',
    ],
    correct: 0,
    why: [
      'Right: a spare loaf is easy to make good; a double-booked cake slot is not.',
      'Refusing bread loses sales for nothing, since an extra loaf is no harm.',
      'Selling the slot in both shops books two weddings for one cake.',
    ],
  },
  {
    id: 'cheap-risk',
    chapter: C7,
    question: 'Why might a shop accept the risk of overselling a cheap, plentiful item?',
    options: [
      'A short backorder costs less than refusing orders while the network is down',
      'Overselling can’t happen to cheap items',
      'Customers never notice',
    ],
    correct: 0,
    why: [
      'Right: staying available keeps the sales, and a restock covers the rare oversell.',
      'Any item can oversell; cheap ones are just easy to make good.',
      'Customers do notice a backorder; it is simply a small cost.',
    ],
  },
  {
    id: 'many-winners',
    chapter: C7,
    question:
      'Two engineers propose different settings that both never oversell and refuse the same few orders. Which is right?',
    options: ['Either: they tie on everything that was asked', 'The one with more replicas', 'The newer one'],
    correct: 0,
    why: [
      'Right: when they tie on the rule and the score, both work.',
      'More replicas wasn’t part of the rule; it doesn’t break the tie.',
      'Being newer says nothing about meeting the rule.',
    ],
  },
];
