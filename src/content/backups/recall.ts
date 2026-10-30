// Backups' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea
// in a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: a backup counts only when a restore works.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-one-copy-is-no-copy',
  C2 = '02-how-often',
  C3 = '03-full-and-since-last',
  C4 = '04-not-in-the-same-building',
  C5 = '05-ransomware',
  C6 = '06-test-the-restore',
  C7 = '07-workbench';

export const RECALL: RecallItem[] = [
  {
    id: 'restore-counts',
    chapter: C6,
    pin: true,
    question:
      'Your team’s backup dashboard has been green every night for a year. A manager asks if the data is safe. What do you say?',
    options: [
      'Only if we have restored a copy recently and it worked',
      'Yes: a year of green nights proves it',
      'Yes, as long as there are many copies',
    ],
    correct: 0,
    why: [
      'Right. A backup counts only when a restore works, and only a test restore shows that.',
      'Green means the job ran; it says nothing about whether its copies read back.',
      'Many copies from a broken job are many broken copies.',
    ],
  },
  // 1. One copy is no copy
  {
    id: 'one-copy',
    chapter: C1,
    question:
      'A shop’s whole price list lives in one spreadsheet on the manager’s laptop. The laptop dies. What is left?',
    options: ['Nothing, unless a copy was kept elsewhere', 'The spreadsheet: it saves itself', 'Last week’s version'],
    correct: 0,
    why: [
      'Right. With one copy, losing the disk loses the data.',
      'Saving writes to the same laptop, so it dies with it.',
      'There is only a last week’s version if someone copied it somewhere.',
    ],
  },
  {
    id: 'what-is-lost',
    chapter: C1,
    question: 'A blog is copied every Sunday. Its disk dies on Thursday. What is lost?',
    options: ['Everything written since Sunday’s copy', 'Only Thursday’s posts', 'Nothing: Sunday’s copy covers it'],
    correct: 0,
    why: [
      'Right. A restore brings back Sunday; everything after exists nowhere else.',
      'Monday to Wednesday were only on the dead disk too.',
      'Sunday’s copy holds nothing written after Sunday.',
    ],
  },
  {
    id: 'mirror-not-backup',
    chapter: C1,
    question: 'A server has two disks that mirror each other. Someone deletes the orders table. What happens?',
    options: ['Both disks lose the table at once', 'The second disk keeps the table', 'The server refuses the delete'],
    correct: 0,
    why: [
      'Right. A mirror copies every change at once, deletes included, so it is not a backup.',
      'The mirror copies the delete straight away; it guards against a dead disk, not a mistake.',
      'A server does what it is told; a delete is a normal command.',
    ],
  },
  // 2. How often
  {
    id: 'rpo-gap',
    chapter: C2,
    question: 'A team copies its database every 15 minutes. What is the most a crash can lose?',
    options: ['About 15 minutes of work', 'Nothing at all', 'A day of work'],
    correct: 0,
    why: [
      'Right. The gap between copies caps the loss: the RPO.',
      'Work since the last copy is only on the live disk.',
      'A day is the gap for nightly copies, not fifteen-minute ones.',
    ],
  },
  {
    id: 'rpo-choice',
    chapter: C2,
    question:
      'A payroll team says losing a day of edits is fine; a ticket shop says ten minutes is too much. What differs?',
    options: ['Their RPO, so their copy schedules', 'Nothing: both need hourly copies', 'Only how big their disks are'],
    correct: 0,
    why: [
      'Right. How much you can afford to lose sets how often you copy.',
      'Copying hourly is waste for payroll and too slow for tickets.',
      'Disk size doesn’t change how much recent work a crash loses.',
    ],
  },
  {
    id: 'more-often-cost',
    chapter: C2,
    question: 'Why not copy every minute, always?',
    options: [
      'Each copy costs storage and time',
      'Copies every minute lose more data',
      'Databases can’t be copied that often',
    ],
    correct: 0,
    why: [
      'Right. More copies lose less, but every copy has a price.',
      'More copies lose less work, not more.',
      'Many systems copy changes continuously; the limit is cost, not ability.',
    ],
  },
  // 3. Full and since-last
  {
    id: 'incremental-needs',
    chapter: C3,
    question: 'To restore Friday’s incremental copy, what do you need?',
    options: [
      'The last full copy and every incremental up to Friday',
      'Friday’s incremental alone',
      'Only the last full copy',
    ],
    correct: 0,
    why: [
      'Right. An incremental holds only the changes; the chain rebuilds the rest.',
      'Friday’s copy has only Friday’s changes, not the data under them.',
      'The full copy stops at its own day; the changes after it are in the incrementals.',
    ],
  },
  {
    id: 'missing-link',
    chapter: C3,
    question:
      'Monday is a full copy; Tuesday to Thursday are incrementals. Wednesday’s won’t read. How far can you restore?',
    options: ['To Tuesday', 'To Thursday', 'Only to Monday'],
    correct: 0,
    why: [
      'Right. The chain stops at the first link that won’t read.',
      'Thursday’s changes sit on top of Wednesday’s, which is gone.',
      'Tuesday’s link still reads, so the restore gets that far.',
    ],
  },
  {
    id: 'why-incremental',
    chapter: C3,
    question: 'Why do teams use incremental copies at all?',
    options: ['They are smaller and quicker to take', 'They restore faster', 'They never need a full copy'],
    correct: 0,
    why: [
      'Right. Copying only the changes saves storage and time.',
      'A restore reads more pieces, so it is slower, not faster.',
      'Every chain starts from a full copy.',
    ],
  },
  // 4. Not in the same building
  {
    id: 'same-building',
    chapter: C4,
    question: 'An office backs up to a drive on the shelf above its server. What does a burst pipe in that room leave?',
    options: ['Possibly nothing', 'The drive: it is a separate device', 'Everything up to the last copy'],
    correct: 0,
    why: [
      'Right. A copy in the same room shares that room’s disasters.',
      'A separate device in the same room still gets wet.',
      'That needs a copy the water can’t reach.',
    ],
  },
  {
    id: 'three-two-one',
    chapter: C4,
    question: 'What does the 3-2-1 rule ask for?',
    options: [
      'Three copies, on two kinds of storage, one off-site',
      'Three backups a day, two people, one restore',
      'Three disks mirrored, two servers, one site',
    ],
    correct: 0,
    why: [
      'Right. Enough copies, different kinds of storage, and one away from the building.',
      'The numbers count copies, kinds of storage and places, not how often.',
      'Mirrors on one site share one site’s disasters.',
    ],
  },
  {
    id: 'how-far',
    chapter: C4,
    question: 'How far away should an off-site copy be?',
    options: [
      'Far enough that one disaster can’t reach both',
      'In the next room',
      'Anywhere, as long as it is a different disk',
    ],
    correct: 0,
    why: [
      'Right. Off-site means out of reach of the same fire, flood or outage.',
      'The next room can burn with the first.',
      'A different disk in the same place shares the place’s fate.',
    ],
  },
  // 5. Ransomware
  {
    id: 'online-reachable',
    chapter: C5,
    question:
      'A firm’s backups sync to a cloud drive mapped on every office PC. Ransomware hits one PC. What about the backups?',
    options: [
      'They can be encrypted too',
      'They are safe: they are in the cloud',
      'Only the PC’s own files are touched',
    ],
    correct: 0,
    why: [
      'Right. A drive every PC can reach is a drive the ransomware can reach.',
      'In the cloud is still online and writable from the infected PC.',
      'Ransomware spreads to whatever the PC can write to.',
    ],
  },
  {
    id: 'offline-copy',
    chapter: C5,
    question: 'What makes a backup safe from ransomware?',
    options: ['Nothing on the network can change it', 'It is encrypted', 'It is in another city'],
    correct: 0,
    why: [
      'Right. Offline or locked copies are out of an attacker’s reach.',
      'Encryption hides it from thieves, but ransomware can still encrypt or delete it.',
      'Another city doesn’t help if the network still reaches it.',
    ],
  },
  {
    id: 'offline-cost',
    chapter: C5,
    question: 'A team’s only offline copy goes to a vault once a week. What is the catch?',
    options: ['It can be up to a week old', 'Ransomware can reach the vault', 'Offline copies can’t be restored'],
    correct: 0,
    why: [
      'Right. Offline is safe but only as new as its last trip.',
      'Offline means the network can’t reach it.',
      'Offline copies restore; they just take longer to fetch.',
    ],
  },
  // 6. Test the restore
  {
    id: 'silent-failure',
    chapter: C6,
    question: 'A backup job ran nightly for months, but nobody ever restored a copy. What do you actually know?',
    options: ['That the job ran, not that it restores', 'That every copy is good', 'That only the newest copy is good'],
    correct: 0,
    why: [
      'Right. Running and restoring are different; only a test restore checks the second.',
      'A job can finish and write copies nobody can read back.',
      'Untested, the newest copy is as unknown as the rest.',
    ],
  },
  {
    id: 'rto',
    chapter: C6,
    question: 'A restore takes 9 hours and the shop can be down for 4 at most. What is wrong?',
    options: ['The restore is slower than the RTO allows', 'The copies are too old', 'Nothing, the data comes back'],
    correct: 0,
    why: [
      'Right. The RTO caps time down; this restore blows through it.',
      'Age is the RPO; this is about how long the restore takes.',
      'The data comes back five hours after the shop needed it.',
    ],
  },
  {
    id: 'test-often',
    chapter: C6,
    question: 'Why test restores on a schedule, not once?',
    options: [
      'A job can break any day; testing finds it soon after',
      'One good test proves it forever',
      'Tests make the copies faster',
    ],
    correct: 0,
    why: [
      'Right. A regular test caps how long a broken job goes unnoticed.',
      'The job can change or break after the test.',
      'Tests check copies; they don’t speed them up.',
    ],
  },
  // 7. Workbench
  {
    id: 'each-disaster',
    chapter: C7,
    question:
      'A plan has hourly copies in the server room and a warehouse copy over the network. Which disaster does it fail?',
    options: ['Ransomware', 'A dead disk', 'A server-room fire'],
    correct: 0,
    why: [
      'Right. Every copy is online, so ransomware reaches them all.',
      'The server room’s copies cover a dead disk.',
      'The warehouse copy covers a fire.',
    ],
  },
  {
    id: 'chain-length',
    chapter: C7,
    question: 'Hourly incremental copies make a restore too slow. What is the cheapest fix?',
    options: ['Take full copies more often, so chains stay short', 'Copy less often', 'Add a second warehouse'],
    correct: 0,
    why: [
      'Right. Shorter chains read fewer links, so restores finish sooner.',
      'Copying less often loses more work instead.',
      'Another place adds cost without shortening the chain.',
    ],
  },
  {
    id: 'cheap-safe',
    chapter: C7,
    question: 'Is the most expensive backup plan always the safest?',
    options: [
      'No: where copies live matters more than how many',
      'Yes: more copies always means safer',
      'Yes: full copies are always safer',
    ],
    correct: 0,
    why: [
      'Right. Hourly copies in one room cost a lot and still lose everything to a fire.',
      'Many copies in one reachable place share one fate.',
      'Full copies restore faster, but they burn and encrypt like any other.',
    ],
  },
];
