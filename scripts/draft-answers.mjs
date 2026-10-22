// Drafts data/answers/*.json from rules; a human reviews the output before commit (KTD6). Signature grammar mirrors src/lib/rag/signature.ts.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname;
const questions = ['ch3', 'ch4', 'ch5', 'ch6'].flatMap(c =>
  JSON.parse(readFileSync(`${ROOT}data/questions/${c}.json`, 'utf8')),
);

function space(q) {
  let combos = [{ sig: '', first: 'absent' }];
  q.keyFacts.forEach((f, i) => {
    combos = combos.flatMap(c =>
      ['intact', 'split', 'absent'].map(s => ({
        sig: (i ? c.sig + '|' : '') + `${f.id}:${s}`,
        first: i ? c.first : s,
      })),
    );
  });
  let sigs = combos.flatMap(c =>
    c.first === 'absent' ? [c.sig] : ['', '@start', '@middle', '@end'].map(b => c.sig + b),
  );
  for (const k of ['stale', 'distractor']) if (q[k + 'Sentences']?.length) sigs = sigs.flatMap(s => [s, `${s}+${k}`]);
  return sigs;
}
function parse(sig) {
  const trap = sig.includes('+');
  const [body] = sig.split('+');
  const [facts, bucket = null] = body.split('@');
  return { states: facts.split('|').map(p => p.split(':')[1]), bucket, trap };
}
const A = (verdict, text, citation, why) => (why ? { verdict, text, citation, why } : { verdict, text, citation });

const MIDDLE =
  'The fact did reach the model, but in the middle of a long context, where models pay the least attention, and it was overlooked.';
const NOCONTEXT =
  'No documents reached the model, so it answered from general knowledge and made up a policy that sounds plausible.';

// Single-fact questions: correct / split / absent / middle answers, plus a trap answer for stale or look-alike evidence.
const SINGLE = {
  'refund-enterprise': {
    correct: A(
      'correct',
      'No. The refund policy does not apply to enterprise contracts. Enterprise customers who want money back raise a billing dispute with their account manager, who reviews it within ten business days.',
      'The refund policy does NOT apply to enterprise contracts.',
    ),
    split: A(
      'wrong',
      'Yes. Enterprise customers can request a refund within 30 days of delivery, the same as standard customers.',
      'Standard customers may request a refund within 30 days of delivery.',
      'The sentence was cut after "does NOT", so the model never read the exception whole and fell back on the general 30-day rule.',
    ),
    absent: A(
      'notfound',
      "I can't find anything about refunds for enterprise customers in the documents provided. Their account manager is the best person to ask.",
      null,
      'No chunk containing the enterprise exception reached the model.',
    ),
    middle: A(
      'wrong',
      'Yes. Enterprise customers can request a refund within 30 days of delivery, like any other customer.',
      'Standard customers may request a refund within 30 days of delivery.',
      'The enterprise exception sat in the middle of a long context and was overlooked, so the model answered from the general 30-day rule.',
    ),
    nocontext: A(
      'madeup',
      'Yes. Enterprise customers can get a full refund within 60 days of purchase, no questions asked.',
      null,
      NOCONTEXT,
    ),
  },
  'standard-refund-window': {
    correct: A(
      'correct',
      'Standard customers can request a refund within 30 days of delivery.',
      'Standard customers may request a refund within 30 days of delivery.',
    ),
    split: A(
      'notfound',
      'The policy says standard customers may request a refund "within 30", but the text is cut off there, so I can\'t confirm 30 of what or counted from when.',
      null,
      'The sentence was split across chunks, so the model saw the number without its unit or start date and hedged.',
    ),
    absent: A(
      'wrong',
      'Refunds are processed within seven business days and go back to the original payment method.',
      'Card refunds usually appear within seven business days.',
      'The 30-day rule never reached the model, so it answered with a different timeline from the same policy.',
    ),
    middle: A(
      'wrong',
      'Refunds are processed within seven business days and go back to the original payment method.',
      'Card refunds usually appear within seven business days.',
      MIDDLE + ' The model answered with a different timeline instead.',
    ),
    nocontext: A('madeup', 'Standard customers have 14 days from purchase to ask for a refund.', null, NOCONTEXT),
  },
  'dock-door-red-light': {
    correct: A(
      'correct',
      'No. Never open a dock door showing a red light. The red light means no trailer is in place at that door.',
      'Never open a dock door showing a red light.',
    ),
    split: A(
      'wrong',
      'Yes. A red light only means no trailer is in place at that door, so check the bay is clear and then open it.',
      'Dock doors: dock door sensors show a red light when a trailer is not in place.',
      'The word "Never" was cut into a different chunk, so the model saw what red means but not the rule against opening the door.',
    ),
    absent: A(
      'notfound',
      "I can't find guidance on dock door sensor lights in the documents provided. Ask your shift lead before opening the door.",
      null,
      'The safety rule about red lights never reached the model.',
    ),
    middle: A(
      'notfound',
      "The documents say a red light means no trailer is in place, but I couldn't find a clear rule on whether you may open the door.",
      'Dock doors: dock door sensors show a red light when a trailer is not in place.',
      MIDDLE,
    ),
    nocontext: A(
      'madeup',
      'Yes. A red light just means the door is locked; press the override button on the control panel to open it.',
      null,
      NOCONTEXT,
    ),
  },
  'stale-hotel-limit': {
    correct: A(
      'correct',
      'Lodging on work trips is reimbursed up to $210 per night before taxes in most cities, and up to $290 per night in high-cost cities listed on the travel desk page.',
      'Lodging on work trips is reimbursed up to $210 per night before taxes in most cities and up to $290 per night in high-cost cities listed on the travel desk page.',
    ),
    correctWithTrap: A(
      'correct',
      'Under the 2025 travel policy, lodging is reimbursed up to $210 per night before taxes in most cities and up to $290 in high-cost cities. The older $150 limit comes from the 2018 policy and no longer applies.',
      'Lodging on work trips is reimbursed up to $210 per night before taxes in most cities and up to $290 per night in high-cost cities listed on the travel desk page.',
    ),
    split: A(
      'notfound',
      "The documents mention $210 per night before taxes in most cities and $290 in high-cost cities, but the passage is cut off, so I can't confirm those are the hotel limits.",
      null,
      'The sentence was split, so the model saw the amounts without what they apply to and hedged.',
    ),
    absent: A(
      'notfound',
      "I can't find a nightly hotel limit in the documents provided. The travel desk should be able to confirm it.",
      null,
      'Neither travel policy reached the model.',
    ),
    middle: A('notfound', "I can't find a clear nightly hotel limit in the documents provided.", null, MIDDLE),
    trap: A(
      'wrong',
      'The hotel limit for business travel is $150 per night, including taxes.',
      'Hotel nightly limit for business travel: the nightly hotel limit for business travel is $150 per night, including taxes.',
    ),
    trapWhy: {
      absent: 'Only the retired 2018 travel policy reached the model, so it gave an out-of-date limit.',
      split:
        'The 2025 limit was cut across chunks while the 2018 sentence arrived whole, so the model used the old figure.',
      late: 'The 2018 policy came ahead of the 2025 one in the context, and the model went with the first limit it read.',
    },
    nocontext: A(
      'madeup',
      'The hotel limit for business travel is $250 per night in all cities, including taxes.',
      null,
      NOCONTEXT,
    ),
  },
  'card-data-retention': {
    correct: A(
      'correct',
      "Larkspur never stores full card numbers. It keeps only the last four digits and the expiry month, for 90 days after the customer's last order.",
      'Card numbers are passed directly to our payment processor, and we keep only the last four digits and the expiry month for 90 days after the last order.',
    ),
    correctWithTrap: A(
      'correct',
      "Larkspur keeps only the last four digits and the expiry month of a customer's card, for 90 days after the last order. The two-year figure in the security review notes is about synthetic demo cards, not customer data.",
      'Card numbers are passed directly to our payment processor, and we keep only the last four digits and the expiry month for 90 days after the last order.',
    ),
    split: A(
      'notfound',
      "Larkspur never stores full card numbers; they are passed to the payment processor. The documents don't say how long any remaining card details are kept.",
      'Payment data: Larkspur never stores full card numbers.',
      'The sentence was cut before "90 days", so the retention period never reached the model.',
    ),
    absent: A(
      'notfound',
      "I can't find how long customer payment card data is kept in the documents provided.",
      null,
      "The security policy's card retention rule never reached the model.",
    ),
    middle: A(
      'notfound',
      "I can't find a clear retention period for payment card data in the documents provided.",
      null,
      MIDDLE,
    ),
    trap: A(
      'wrong',
      'Larkspur keeps customer payment card data for two years.',
      'We discussed how long Larkspur keeps customer payment card data samples in the demo environment and agreed to keep those payment card data samples for two years so sales demos look realistic.',
    ),
    trapWhy: {
      absent:
        'Only the meeting note about demo card samples reached the model; its wording matches the question, but it is about synthetic test data.',
      split:
        'The real retention rule was cut across chunks while the look-alike demo-data note arrived whole, so the model used it.',
      late: 'The look-alike demo-data note came ahead of the real policy in the context, and the model went with it.',
    },
    nocontext: A('madeup', 'Larkspur keeps customer card data for seven years to meet tax rules.', null, NOCONTEXT),
  },
  'same-day-cutoff': {
    correct: A(
      'correct',
      'Orders for in-stock items placed before 2 p.m. Central time on a business day ship the same day; orders placed later ship the next business day.',
      'Same-day shipping: orders for in-stock items placed before 2 p.m. Central time on a business day ship the same day; orders placed later ship the next business day.',
    ),
    split: A(
      'wrong',
      'Orders placed before 2 p.m. Central time on a business day ship the same day.',
      null,
      'The start of the sentence was cut off, so the model dropped the condition that only in-stock items qualify.',
    ),
    absent: A(
      'notfound',
      "The documents say orders ship on business days only, but I can't find a same-day cutoff time.",
      null,
      'The same-day rule in the shipping policy never reached the model.',
    ),
    middle: A('notfound', "I can't find a same-day shipping cutoff in the documents provided.", null, MIDDLE),
    nocontext: A(
      'madeup',
      'Same-day shipping is available for orders placed before 5 p.m. Eastern time, including weekends.',
      null,
      NOCONTEXT,
    ),
  },
  'vague-outage': {
    correct: A(
      'correct',
      "For a Portal outage outside business hours, page the on-call engineer through the Duty Desk line at extension 4410. Don't email the engineering team; email isn't monitored at night.",
      'For Portal outages outside business hours, page the on-call engineer through the Duty Desk line at extension 4410.',
    ),
    split: A(
      'notfound',
      "Extension 4410 reaches the Duty Desk, which pages the on-call engineer, but I can't tell from this excerpt whether that is the right contact for your problem.",
      null,
      'The sentence was split, so the model saw the number without the "Portal outages outside business hours" condition and hedged.',
    ),
    absent: A(
      'wrong',
      'Contact the support desk. It is staffed from 7 a.m. to 7 p.m. Central time on business days.',
      'Hours: the support desk is staffed from 7 a.m. to 7 p.m. Central time on business days.',
      'The vague question matched general support text instead of the after-hours outage rule, so the model pointed to a desk that is closed at night.',
    ),
    middle: A(
      'wrong',
      'Contact the support desk. It is staffed from 7 a.m. to 7 p.m. Central time on business days.',
      'Hours: the support desk is staffed from 7 a.m. to 7 p.m. Central time on business days.',
      MIDDLE + ' The model answered from general support text instead.',
    ),
    nocontext: A('madeup', 'Call the IT helpdesk at extension 1000. It is staffed around the clock.', null, NOCONTEXT),
  },
  'k2-volume-price': {
    correct: A(
      'correct',
      'A Kestrel K2 handheld scanner costs $410 per unit when you order 50 or more.',
      '| Kestrel K2 handheld scanner | KS-K2 | $480 | $445 | $410 |',
    ),
    split: A(
      'wrong',
      'The Kestrel K2 handheld scanner is $480 per unit.',
      null,
      'The table row was split, so the model saw the K2 name with only the first price column and missed the 50+ price.',
    ),
    absent: A(
      'notfound',
      "I can't find a price for the Kestrel K2 at 50 or more units in the documents provided.",
      null,
      'The K2 row of the price list never reached the model.',
    ),
    middle: A(
      'notfound',
      "I can't find a clear 50+ unit price for the Kestrel K2 in the documents provided.",
      null,
      MIDDLE,
    ),
    nocontext: A('madeup', 'The Kestrel K2 costs $399 per unit for orders of 50 or more.', null, NOCONTEXT),
  },
  'dock-sensor-warranty': {
    correct: A(
      'correct',
      'The DS-100 dock door sensor is warranted against defects in materials and workmanship for three years from the date of shipment. Batteries are covered for one year.',
      'The DS-100 dock door sensor is warranted against defects in materials and workmanship for a period of three years from the date of shipment.',
    ),
    split: A(
      'wrong',
      'The dock door sensor warranty lasts one year.',
      'Batteries are warranted for one year.',
      'The sentence was cut before "three years", so the only period the model saw was the one-year battery warranty.',
    ),
    absent: A(
      'notfound',
      "I can't find the dock door sensor warranty terms in the documents provided.",
      null,
      'The warranty text never reached the model.',
    ),
    middle: A(
      'notfound',
      "I can't find a clear warranty period for the dock door sensor in the documents provided.",
      null,
      MIDDLE,
    ),
    nocontext: A(
      'madeup',
      'The dock door sensor comes with a five-year warranty, including the battery.',
      null,
      NOCONTEXT,
    ),
  },
  'customer-success-lead': {
    correct: A(
      'correct',
      'Ingrid Vasquez-Lund leads the Customer Success team.',
      'The Customer Success team is led by Ingrid Vasquez-Lund.',
    ),
    split: A(
      'wrong',
      'The Customer Success team is led by Dmitri Halvorsen, the Chief Revenue Officer.',
      'Under the Chief Revenue Officer are the Sales team and the Customer Success team.',
      'The name was cut off after "led by", so the model named the executive above the team instead.',
    ),
    absent: A(
      'notfound',
      "The documents describe what the Customer Success team does but don't name who leads it.",
      null,
      'The org chart line naming the lead never reached the model.',
    ),
    middle: A('notfound', "I can't find who leads the Customer Success team in the documents provided.", null, MIDDLE),
    nocontext: A(
      'madeup',
      'The Customer Success team is led by Sarah Mitchell, VP of Customer Experience.',
      null,
      NOCONTEXT,
    ),
  },
};

function single(q, sig) {
  const t = SINGLE[q.id];
  const {
    states: [s],
    bucket,
    trap,
  } = parse(sig);
  if (trap) {
    if (s === 'intact' && bucket !== 'middle' && bucket !== 'end') return t.correctWithTrap;
    const why = s === 'absent' ? t.trapWhy.absent : s === 'split' ? t.trapWhy.split : t.trapWhy.late;
    return { ...t.trap, why };
  }
  if (s === 'absent') return t.absent;
  if (s === 'split') return t.split;
  return bucket === 'middle' ? t.middle : t.correct;
}

const PAY = {
  'cards-and-pos': {
    whole: 'company credit cards and purchase orders for approved accounts',
    part: 'company credit cards',
    name: 'credit cards and purchase orders',
  },
  'bank-transfer': { whole: 'bank transfer for invoices over $2,000', part: 'bank transfer', name: 'bank transfer' },
  'digital-wallet': {
    whole: 'digital wallets, added in 2025 for card-paying customers',
    part: 'digital wallets',
    name: 'digital wallets',
  },
};
const list = xs => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
function payment(q, sig) {
  const { states, bucket } = parse(sig);
  const facts = q.keyFacts.map((f, i) => ({
    ...f,
    s: i === 0 && bucket === 'middle' && states[0] !== 'absent' ? 'missed' : states[i],
  }));
  const seen = facts.filter(f => f.s === 'intact' || f.s === 'split');
  if (!seen.length) {
    const missedFirst = facts[0].s === 'missed';
    return A(
      'notfound',
      "I can't find which payment methods the Portal accepts in the documents provided.",
      null,
      missedFirst ? MIDDLE : 'None of the payment-method answers in the ordering FAQ reached the model.',
    );
  }
  const text = `The Portal accepts ${seen.map(f => (f.s === 'intact' ? PAY[f.id].whole : PAY[f.id].part)).join(', plus ')}.`;
  const firstWhole = facts.find(f => f.s === 'intact');
  const citation = firstWhole ? firstWhole.sentence : null;
  if (facts.every(f => f.s === 'intact')) return A('correct', text, citation);
  const notes = [];
  const absent = facts.filter(f => f.s === 'absent').map(f => PAY[f.id].name);
  const split = facts.filter(f => f.s === 'split').map(f => PAY[f.id].name);
  if (absent.length) notes.push(`the ${list(absent)} answer${absent.length > 1 ? 's' : ''} never reached the model`);
  if (split.length)
    notes.push(
      `the ${list(split)} answer${split.length > 1 ? 's were' : ' was'} cut across chunks, so details were lost`,
    );
  if (facts[0].s === 'missed')
    notes.push('the credit card and purchase order answer sat in the middle of a long context and was overlooked');
  const why = `The list is incomplete: ${notes.join('; ')}.`;
  return A('wrong', text, citation, why);
}

function kestrel(q, sig) {
  const {
    states: [a, b],
    bucket,
  } = parse(sig);
  const owner = q.keyFacts[0].sentence,
    approver = q.keyFacts[1].sentence;
  const aOk = a === 'intact' && bucket !== 'middle',
    bOk = b === 'intact';
  const aWhy =
    a === 'absent'
      ? 'The first hop, which team owns the Kestrel K2 integration, never reached the model.'
      : a === 'split'
        ? 'The ownership sentence was cut across chunks, so the model could not link the Kestrel K2 integration to Fulfillment Systems.'
        : 'The ownership sentence sat in the middle of a long context and was overlooked, so the model could not make the first hop.';
  const bWhy =
    b === 'absent'
      ? 'The second hop, who approves Fulfillment Systems purchases, never reached the model.'
      : 'The approver sentence was cut across chunks, so the model could not read who approves Fulfillment Systems purchases.';
  if (aOk && bOk)
    return A(
      'correct',
      "Tomasz Rehnquist, Director of Warehouse Technology. The Kestrel K2 scanner integration is owned by the Fulfillment Systems team, and he approves that team's purchases.",
      approver,
    );
  if (aOk)
    return A(
      'notfound',
      "The Kestrel K2 scanner integration is owned by the Fulfillment Systems team, but the documents I have don't say who approves that team's purchases.",
      owner,
      bWhy,
    );
  if (bOk)
    return A(
      'notfound',
      "Purchases for the Fulfillment Systems team are approved by Tomasz Rehnquist, but I can't tell from these documents which team owns the Kestrel K2 integration.",
      approver,
      aWhy,
    );
  if (b === 'split')
    return A(
      'notfound',
      "Purchases above $1,000 are approved by the budget owner of the requesting team, but I can't tell who that is for the Kestrel K2 integration.",
      'Purchases above $1,000 need approval from the budget owner of the requesting team.',
      `Neither hop arrived whole. ${aWhy} ${bWhy}`,
    );
  return A(
    'notfound',
    "I can't find who owns the Kestrel K2 scanner integration or who approves its purchases in the documents provided.",
    null,
    `Neither hop arrived whole. ${aWhy} ${bWhy}`,
  );
}

const NOCTX = {
  'payment-methods': A(
    'madeup',
    'The Portal accepts credit cards, PayPal and cryptocurrency for all accounts.',
    null,
    NOCONTEXT,
  ),
  'kestrel-purchase-approver': A(
    'madeup',
    'Purchases for the Kestrel K2 integration are approved by the IT Procurement Manager.',
    null,
    NOCONTEXT,
  ),
};

mkdirSync(`${ROOT}data/answers`, { recursive: true });
for (const q of questions) {
  const fn = q.id === 'payment-methods' ? payment : q.id === 'kestrel-purchase-approver' ? kestrel : single;
  const table = { nocontext: SINGLE[q.id]?.nocontext ?? NOCTX[q.id] };
  for (const sig of space(q)) table[sig] = fn(q, sig);
  writeFileSync(`${ROOT}data/answers/${q.id}.json`, JSON.stringify(table, null, 2) + '\n');
  console.log(q.id, Object.keys(table).length);
}
