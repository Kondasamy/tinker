// How email arrives' recall bank: the recap and the warm-up ask from it. Three items per chapter, each asking the
// chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
// The pinned item is the module's one-line edge: anyone can write any From line; SPF, DKIM and DMARC are how the
// receiver checks it.
import type { RecallItem } from '../../lib/recall';

const C1 = '01-envelope-and-letter',
  C2 = '02-who-takes-it-next',
  C3 = '03-anyone-can-write-from',
  C4 = '04-allowed-senders',
  C5 = '05-a-seal-on-the-letter',
  C6 = '06-what-to-do-with-a-failure',
  C7 = '07-mail-records';

export const RECALL: RecallItem[] = [
  {
    id: 'from-is-typed',
    chapter: C6,
    pin: true,
    question:
      'Your finance team gets an email from your CEO asking for an urgent transfer. It looks right. What decides whether it is really from your company?',
    options: [
      'Whether SPF or DKIM passes for your domain, and DMARC says what to do if not',
      'The From line: it shows the CEO’s address',
      'The CEO’s usual signature at the bottom',
    ],
    correct: 0,
    why: [
      'Right: anyone can write any From line; only checks aligned with your domain tie it to you.',
      'The sender types the From line, so it proves nothing on its own.',
      'A signature in the text is typed too; a forger copies it easily.',
    ],
  },
  // 1. An envelope and a letter
  {
    id: 'envelope-vs-header',
    chapter: C1,
    question: 'A mail server delivers a message. Which address does it use to decide where it goes?',
    options: ['The envelope’s recipient', 'The To line in the headers', 'The From line'],
    correct: 0,
    why: [
      'Right: servers deliver by the envelope; the headers are for the reader.',
      'The To line is shown to the reader; it can differ from where the message goes, as with Bcc.',
      'From names the writer, not the recipient.',
    ],
  },
  {
    id: 'bounces-address',
    chapter: C1,
    question:
      'A newsletter’s From line says news@shop.example, but bounces go to a different address. Is that a sign of fraud?',
    options: ['No: envelope and From often differ', 'Yes: real mail always matches', 'Yes: servers would refuse it'],
    correct: 0,
    why: [
      'Right: senders often send bounces to one address and replies to another.',
      'Plenty of real mail has a different envelope sender, as Larkspur’s own does.',
      'No server checks that they match.',
    ],
  },
  {
    id: 'unvouched-junk',
    chapter: C1,
    question: 'A company’s real receipts keep landing in customers’ junk. What is a likely first cause?',
    options: ['Nothing vouches for its mail yet', 'The receipts are too short', 'Customers’ mail apps are broken'],
    correct: 0,
    why: [
      'Right: big mail providers distrust mail nothing vouches for.',
      'Length alone doesn’t send real mail to junk.',
      'Many customers seeing the same thing points at the sender, not each app.',
    ],
  },
  // 2. Who takes it next
  {
    id: 'mx-finds-server',
    chapter: C2,
    question:
      'Your server must send a message to someone at clinic.example. How does it find the server to hand it to?',
    options: [
      'It looks up clinic.example’s MX record',
      'It asks the sender’s own server',
      'It tries every server it knows',
    ],
    correct: 0,
    why: [
      'Right: the MX record names the server that accepts the domain’s mail.',
      'The sender’s server is the one asking; it needs the receiver’s.',
      'DNS answers directly; there is no trying around.',
    ],
  },
  {
    id: 'bottom-first',
    chapter: C2,
    question: 'You want to know which server a message left first. Where do you look?',
    options: ['The bottom Received line', 'The top Received line', 'The Date line'],
    correct: 0,
    why: [
      'Right: each server stamps on top, so the oldest postmark is at the bottom.',
      'The top postmark is the newest, stamped by your own side.',
      'Date is what the sender’s software wrote; it names no server.',
    ],
  },
  {
    id: 'forward-hops',
    chapter: C2,
    question: 'A message went through a forwarding address before reaching you. What do its postmarks show?',
    options: [
      'Extra hops through the forwarder’s servers',
      'The same hops as sent direct',
      'No hops: forwarding hides them',
    ],
    correct: 0,
    why: [
      'Right: each forwarding server takes it and stamps it too.',
      'The forwarder adds its own handovers, so the road is longer.',
      'Forwarding adds postmarks; it doesn’t strip them.',
    ],
  },
  // 3. Anyone can write From
  {
    id: 'smtp-trusts',
    chapter: C3,
    question: 'Without any checks, what does a receiving mail server do with a From line it has never seen?',
    options: ['Takes it as written', 'Asks the named company to confirm', 'Refuses it'],
    correct: 0,
    why: [
      'Right: SMTP itself accepts whatever From the sender writes.',
      'No such call happens; that is what the DNS checks replace.',
      'Unknown From lines are normal; nothing refuses them by default.',
    ],
  },
  {
    id: 'lookalike-domain',
    chapter: C3,
    question:
      'A fake invoice uses its own domain, billing-shop.example, for bounces, and your shop’s name in From. Why might it reach the inbox?',
    options: ['Its own domain vouches for its own server', 'It copied your logo', 'Mail servers trust invoices'],
    correct: 0,
    why: [
      'Right: a pass for the forger’s domain looks like “someone vouched”, unless the receiver asks whose domain.',
      'Logos are in the body; servers don’t judge them.',
      'Servers don’t know what an invoice is.',
    ],
  },
  {
    id: 'top-postmarks',
    chapter: C3,
    question: 'A forger can write fake Received lines too. Which postmarks can you still trust?',
    options: ['The ones your own provider’s servers added, at the top', 'All of them', 'Only the bottom one'],
    correct: 0,
    why: [
      'Right: your own servers stamp on top as they take it; lines below came from the sender’s side.',
      'Lower lines can be typed by the sender before sending.',
      'The bottom line is the easiest for a forger to fake.',
    ],
  },
  // 4. The list of allowed senders
  {
    id: 'spf-envelope',
    chapter: C4,
    question: 'SPF checks one domain against the sending server. Which domain?',
    options: ['The envelope sender’s', 'The From line’s', 'The recipient’s'],
    correct: 0,
    why: [
      'Right: SPF reads MAIL FROM, the envelope, never the From line.',
      'This is why SPF alone can’t stop a forged From line.',
      'The recipient’s domain is where it is going, not who sent it.',
    ],
  },
  {
    id: 'spf-include',
    chapter: C4,
    question: 'A company starts sending its receipts through a mail vendor. What must its SPF record gain?',
    options: ['An include of the vendor’s list', 'A second SPF record', '+all, so anyone may send'],
    correct: 0,
    why: [
      'Right: include adds the vendor’s servers to the company’s list.',
      'A domain may have only one SPF record; two break the check.',
      '+all lets every server on earth pass, forgers included.',
    ],
  },
  {
    id: 'plus-all',
    chapter: C4,
    question: 'A record ends in +all. What does that do for a forger using your envelope?',
    options: ['Lets him pass SPF', 'Fails him harder', 'Nothing'],
    correct: 0,
    why: [
      'Right: +all says every server is allowed.',
      'That is -all; +all is the opposite.',
      'It changes everything: every unlisted server now passes.',
    ],
  },
  // 5. A seal on the letter
  {
    id: 'dkim-body',
    chapter: C5,
    question: 'Someone changes a delivery address in a signed email on its way. What does the DKIM check show?',
    options: ['It fails', 'It passes: addresses aren’t checked', 'It passes, since the sender is real'],
    correct: 0,
    why: [
      'Right: the body’s fingerprint is in the seal, so any real change breaks it.',
      'The whole body is covered, address included.',
      'DKIM checks the message, not just who sent it.',
    ],
  },
  {
    id: 'dkim-key',
    chapter: C5,
    question: 'Where does the receiver find the key to check a DKIM signature?',
    options: [
      'In the signing domain’s DNS, under its selector',
      'Attached to the email',
      'From the recipient’s provider',
    ],
    correct: 0,
    why: [
      'Right: the public key sits at selector._domainkey.domain.',
      'A key sent with the email could be the forger’s own.',
      'The signer publishes the key; the receiver fetches it.',
    ],
  },
  {
    id: 'dkim-lists',
    chapter: C5,
    question: 'A mailing list adds a footer to every message it passes on. What happens to the original DKIM seal?',
    options: ['It breaks', 'It still passes: footers don’t count', 'The list re-signs as the original sender'],
    correct: 0,
    why: [
      'Right: the body changed, so its fingerprint no longer matches.',
      'The footer is part of the body, which the seal covers.',
      'The list doesn’t hold the sender’s private key.',
    ],
  },
  // 6. What to do with a failure
  {
    id: 'dmarc-align',
    chapter: C6,
    question:
      'A message passes SPF for mailer.example, and its From line says bank.example. Does DMARC pass for the bank?',
    options: ['No: the pass isn’t aligned with bank.example', 'Yes: SPF passed', 'Yes, if the spam score is low'],
    correct: 0,
    why: [
      'Right: DMARC counts only passes for the From line’s own domain.',
      'Any domain can pass its own SPF; DMARC asks which domain.',
      'The spam score is a separate step after DMARC.',
    ],
  },
  {
    id: 'quarantine-junk',
    chapter: C6,
    question: 'A domain’s DMARC policy is quarantine. Where does a failing fake go?',
    options: ['The recipient’s junk folder', 'Bounced back', 'The inbox, with a warning'],
    correct: 0,
    why: [
      'Right: quarantine asks receivers to treat it as suspicious, usually junk.',
      'Bouncing is what reject asks for.',
      'Quarantine keeps it out of the inbox.',
    ],
  },
  {
    id: 'authenticated-spam',
    chapter: C6,
    question: 'A lottery spam passes SPF, DKIM and DMARC for its own domain. Is it safe to trust?',
    options: [
      'No: it proves who sent it, not that it’s wanted',
      'Yes: it passed every check',
      'Yes, if it reached the inbox',
    ],
    correct: 0,
    why: [
      'Right: passing shows the domain is real; the spam filter judges the content.',
      'Spammers can own real domains and set up all three.',
      'The spam score can still send it to junk, and some get through.',
    ],
  },
  // 7. Set the mail records
  {
    id: 'reject-needs-routes',
    chapter: C7,
    question:
      'A company jumps straight to DMARC reject. Its newsletter vendor isn’t in SPF and doesn’t sign. What happens?',
    options: ['The newsletter bounces', 'The newsletter lands as before', 'Only fakes are affected'],
    correct: 0,
    why: [
      'Right: with no aligned pass, reject bounces the company’s own newsletter.',
      'Reject applies to any mail that fails alignment, real or fake.',
      'The policy can’t tell real from fake; only the checks can.',
    ],
  },
  {
    id: 'quarantine-not-enough',
    chapter: C7,
    question: 'Why might quarantine not be enough against fake invoices?',
    options: ['Customers still find them in junk', 'Quarantine lets them into the inbox', 'Quarantine turns off SPF'],
    correct: 0,
    why: [
      'Right: junk is still in front of the customer, who might open it.',
      'Quarantine keeps them out of the inbox, but not out of reach.',
      'SPF still runs; the policy only says what to do on a failure.',
    ],
  },
  {
    id: 'softfail-tie',
    chapter: C7,
    question: 'With DMARC at reject, does it matter whether SPF ends in ~all or -all?',
    options: [
      'Little: neither is a pass, so DMARC fails either way',
      'Yes: ~all lets fakes through',
      'Yes: -all bounces real mail',
    ],
    correct: 0,
    why: [
      'Right: DMARC needs a pass; softfail and fail both aren’t one.',
      'A softfail is not a pass, so DMARC still fails the fake.',
      'Real mail from listed servers passes under either.',
    ],
  },
];
