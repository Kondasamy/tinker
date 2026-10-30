// Queues' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the chapter's idea in
// a new situation. Every wrong option is a real misconception, and every option has a `why` line. The pinned item is
// the module's one-line edge: a queue keeps work safe while it waits, and any job may run twice.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-waiting-at-the-till',
  C2 = '02-a-ticket-and-a-worker',
  C3 = '03-when-the-line-grows',
  C4 = '04-try-again-later',
  C5 = '05-ran-twice',
  C6 = '06-the-job-that-never-works',
  C7 = '07-sale-day';

export const RECALL: RecallItem[] = [
  {
    id: 'safe-but-twice',
    chapter: C5,
    pin: true,
    question:
      'A colleague says: “Our jobs go through a queue now, so each one runs exactly once, even if a worker crashes.” What do you tell them?',
    options: [
      'The queue keeps the job safe, but a crash can make it run twice, so the job must be safe to repeat',
      'Right: a queue guarantees every job runs exactly once',
      'A crash loses the job; the queue can’t bring it back',
    ],
    correct: 0,
    why: [
      'Right. A job that never says done comes back when its lease runs out, so it may run again.',
      'Queues promise at least once: a job whose worker vanished is delivered again, even if its work was done.',
      'The job stays on the queue, hidden by its lease, and returns once the lease runs out.',
    ],
  },
  // 1. Waiting at the till
  {
    id: 'inline-wait',
    chapter: C1,
    question:
      'A signup page creates the account, then sends a welcome email before it answers. The email service is slow today. What do new users see?',
    options: ['A signup page that hangs', 'An instant signup, and a late email', 'An error, every time'],
    correct: 0,
    why: [
      'Right: work inside the request makes the page wait for it, however slow it is.',
      'That is what a queue gives you; here the email is sent inside the request, so the page waits.',
      'Slow isn’t failed: the page waits for the email, then answers.',
    ],
  },
  {
    id: 'inline-crowd',
    chapter: C1,
    question:
      'A server handles four requests at a time, each doing two seconds of work inside it. Forty arrive at once. How long does the last one wait?',
    options: ['About twenty seconds', 'Two seconds, like the others', 'It can never be answered'],
    correct: 0,
    why: [
      'Right: it waits for nine rounds of four ahead of it, then its own two seconds.',
      'Each request waits for the ones ahead of it, so the wait grows with the crowd.',
      'It is answered, just late: the crowd queues up and is served in turn.',
    ],
  },
  {
    id: 'inline-why-move',
    chapter: C1,
    question: 'Why move a report’s PDF rendering out of the web request?',
    options: [
      'So the page answers at once and the rendering waits its turn elsewhere',
      'So the PDF renders faster',
      'So the PDF never fails',
    ],
    correct: 0,
    why: [
      'Right: the user stops waiting on the slow work; it is done in the background.',
      'Moving work doesn’t make it faster; it moves the wait off the person.',
      'It can still fail; a queue just lets it be retried without the user watching.',
    ],
  },
  // 2. A ticket and a worker
  {
    id: 'queue-answer',
    chapter: C2,
    question: 'A shop puts “send the invoice” on a queue. When does the customer’s page answer?',
    options: ['As soon as the job is on the queue', 'When the invoice is sent', 'When a worker is free'],
    correct: 0,
    why: [
      'Right: putting a job on the queue is quick, and that is all the page waits for.',
      'Sending happens later, in a worker; the page doesn’t wait for it.',
      'A free worker matters to the job, not to the page, which has already answered.',
    ],
  },
  {
    id: 'worker-one',
    chapter: C2,
    question: 'One worker serves a queue of image resizes. Five arrive at once. What happens?',
    options: [
      'The worker takes them one by one; the rest wait on the queue',
      'All five are lost but one',
      'The worker resizes all five at the same moment',
    ],
    correct: 0,
    why: [
      'Right: the queue holds them, and the worker takes the next when it finishes one.',
      'Nothing is lost: waiting jobs stay on the queue until a worker takes them.',
      'A worker does one job at a time; more at once needs more workers.',
    ],
  },
  {
    id: 'queue-holds',
    chapter: C2,
    question: 'The only worker is restarted for five minutes. What happens to jobs added meanwhile?',
    options: ['They wait on the queue until it is back', 'They are dropped', 'The page waits for the worker'],
    correct: 0,
    why: [
      'Right: a queue keeps the work safe while no worker can take it.',
      'Holding jobs until a worker is free is exactly the queue’s job.',
      'The page answered when the job went on the queue; it doesn’t wait for the worker.',
    ],
  },
  // 3. When the line grows
  {
    id: 'rates',
    chapter: C3,
    question: 'Jobs arrive at 60 a minute; workers finish 50 a minute. What happens over an hour?',
    options: ['The backlog grows by about 600', 'The backlog stays small', 'The workers speed up to match'],
    correct: 0,
    why: [
      'Right: ten more arrive than finish each minute, so the line grows without end.',
      'A line stays small only when service keeps up with arrivals.',
      'Workers have a fixed pace; only more workers or faster jobs raise the service rate.',
    ],
  },
  {
    id: 'drain',
    chapter: C3,
    question:
      'A backlog of 300 builds up during a morning rush. Arrivals drop to 20 a minute; workers finish 30. What happens?',
    options: ['It drains, about 10 a minute', 'It stays at 300 for good', 'It grows, because 300 is too many'],
    correct: 0,
    why: [
      'Right: service beats arrivals by 10 a minute, so the line shrinks at that pace.',
      'A backlog shrinks whenever service is faster than arrivals.',
      'Its size doesn’t matter; the rates decide whether it grows or shrinks.',
    ],
  },
  {
    id: 'more-workers',
    chapter: C3,
    question: 'Each worker sends 5 emails a second. 18 a second need sending. How many workers keep up?',
    options: ['At least 4', '3', '18'],
    correct: 0,
    why: [
      'Right: 4 workers send 20 a second, a little more than arrive.',
      '3 workers send 15 a second, so 3 a second pile up.',
      'Each worker handles 5 a second, not 1; 18 would be far more than needed.',
    ],
  },
  // 4. Try again later
  {
    id: 'backoff-why',
    chapter: C4,
    question: 'A payment service is down for ten minutes. Your jobs retry every second, five tries each. What happens?',
    options: [
      'Every job uses up its tries in five seconds and is given up on',
      'They all succeed when it comes back',
      'They wait quietly for it',
    ],
    correct: 0,
    why: [
      'Right: retries at once burn through the tries long before a ten-minute outage ends.',
      'They gave up within seconds, long before the service returned.',
      'Retrying at once isn’t waiting; each try is spent against a service that is still down.',
    ],
  },
  {
    id: 'backoff-shape',
    chapter: C4,
    question: 'With backoff, a job waits 1, 2, 4, 8 minutes between tries. Why not 1, 1, 1, 1?',
    options: [
      'Growing waits cover a long outage with the same few tries',
      'Longer waits make each try more likely to work by themselves',
      'It makes the queue shorter',
    ],
    correct: 0,
    why: [
      'Right: four tries now span 15 minutes instead of 4, so a longer outage can pass.',
      'A try works when the service is back; waiting longer just gives it time to come back.',
      'The queue holds the same jobs; backoff spreads out when they are tried.',
    ],
  },
  {
    id: 'jitter-why',
    chapter: C4,
    question: 'A thousand apps fail at the same second and all back off by exactly 2, 4, 8 seconds. What goes wrong?',
    options: [
      'They all retry at the same moments, in bursts',
      'Nothing: backoff alone is enough',
      'They retry less often than they should',
    ],
    correct: 0,
    why: [
      'Right: identical waits keep them in step; jitter adds a random part to break the bursts up.',
      'Backoff thins the retries, but clients that failed together still retry together.',
      'How often isn’t the problem; it is that they all come at once.',
    ],
  },
  // 5. Ran twice
  {
    id: 'lease-back',
    chapter: C5,
    question: 'A worker takes a job with a 30-second lease and is unplugged 10 seconds in. What happens to the job?',
    options: ['It reappears about 20 seconds later for another worker', 'It is gone for good', 'It reappears at once'],
    correct: 0,
    why: [
      'Right: it stays hidden until the lease runs out, then comes back.',
      'The queue still has it; the lease only hides it for a while.',
      'The queue can’t tell the worker died, so it waits for the lease to run out.',
    ],
  },
  {
    id: 'idempotent-what',
    chapter: C5,
    question: 'Which job is idempotent?',
    options: [
      '“Set order 42’s status to shipped”',
      '“Add one to the shipped count”',
      '“Send a ‘your order shipped’ email”',
    ],
    correct: 0,
    why: [
      'Right: setting a status twice leaves it the same as setting it once.',
      'Adding one twice counts two; a repeat changes the result.',
      'Sending twice sends two emails, unless the job checks first.',
    ],
  },
  {
    id: 'lease-short',
    chapter: C5,
    question: 'Jobs take 2 minutes, but the lease is 1 minute. What happens?',
    options: [
      'Each job comes back while it is still running, and runs again',
      'Jobs finish faster',
      'Nothing: the lease is only a guess',
    ],
    correct: 0,
    why: [
      'Right: the lease runs out mid-job, so another worker takes it too.',
      'The work takes as long as it takes; a short lease only makes it repeat.',
      'The queue acts on the lease: when it runs out, the job is visible again.',
    ],
  },
  // 6. The job that never works
  {
    id: 'poison',
    chapter: C6,
    question:
      'One job crashes its worker every time, because its file is corrupt. With unlimited retries, what happens?',
    options: [
      'It keeps coming back and wasting workers, forever',
      'It works on the third try',
      'The queue fixes the file',
    ],
    correct: 0,
    why: [
      'Right: a poison job never succeeds, so unlimited retries just repeat the failure.',
      'Retrying a corrupt file reads the same corrupt file.',
      'A queue only delivers jobs; it can’t repair one.',
    ],
  },
  {
    id: 'dlq-for',
    chapter: C6,
    question: 'What is a dead-letter queue for?',
    options: [
      'Keeping jobs that ran out of tries, for a person to look at',
      'Deleting failed jobs',
      'Retrying failed jobs faster',
    ],
    correct: 0,
    why: [
      'Right: the job is set aside, not lost, so someone can fix it and send it back.',
      'Nothing is deleted; it is moved out of the way, still kept.',
      'It stops the retrying; it doesn’t speed it up.',
    ],
  },
  {
    id: 'tries-balance',
    chapter: C6,
    question: 'Why not set the most tries to 1, so poison jobs leave at once?',
    options: [
      'A passing failure, like a short outage, would dead-letter good jobs too',
      'One try is always enough',
      'The queue doesn’t allow 1',
    ],
    correct: 0,
    why: [
      'Right: enough tries ride out passing trouble; the limit only catches jobs that never work.',
      'Good jobs fail sometimes too, and a retry later usually works.',
      'Any limit works; 1 just gives good jobs no second chance.',
    ],
  },
  // 7. Run the sale day
  {
    id: 'lease-size',
    chapter: C7,
    question: 'Video encodes take up to 10 minutes. Which lease fits best?',
    options: ['A little over 10 minutes', '2 minutes, so crashes recover fast', '3 hours, to be safe'],
    correct: 0,
    why: [
      'Right: every encode finishes inside it, and a crashed one is back soon after.',
      'A 2-minute lease runs every encode again and again until it is given up.',
      'A crashed encode would sit hidden for hours, and jobs can still run twice anyway.',
    ],
  },
  {
    id: 'bench-ties',
    chapter: C7,
    question: 'Two settings both meet the owner’s rule with the same number of workers. Which is right?',
    options: [
      'Either: both are equally good by that rule',
      'Only the one with the most tries',
      'Neither: there is only ever one right answer',
    ],
    correct: 0,
    why: [
      'Right: when the rule and the cost agree, more than one setting can win.',
      'More tries isn’t better by itself; it only matters if the rule needs it.',
      'Settings that score the same against the rule are equally good.',
    ],
  },
  {
    id: 'bench-workers',
    chapter: C7,
    question: 'Adding workers keeps waits short. Why not run as many as possible?',
    options: ['Each worker costs money, busy or idle', 'More workers lose jobs', 'More workers make jobs run twice'],
    correct: 0,
    why: [
      'Right: past the number that keeps up, extra workers mostly sit idle, and cost the same.',
      'Workers don’t lose jobs; the queue holds them whatever the count.',
      'Running twice comes from leases and crashes, not from how many workers there are.',
    ],
  },
];
