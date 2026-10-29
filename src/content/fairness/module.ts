// Bias and fairness: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never
// rename one. Region names come from the applicants' data (R13).
import type { Chapter, Module } from '../../lib/modules';
import { B_WEIGHT } from '../../lib/fairness/fit';
import { RULES } from '../../lib/fairness/workbench';
import { REGION_NAMES, runOf } from '../../lib/fairness/story';
import { RECALL } from './recall';

const { A, B } = REGION_NAMES;
const RIGHT = Math.round((1 - runOf().all.error) * 100);
const GAP_MAX = Math.round(RULES.gapMax * 100);
/** how many times the sample fix counts region B, in words */
export const TIMES = B_WEIGHT === 3 ? 'three times' : `${B_WEIGHT} times`;

const CHAPTERS: Chapter[] = [
  {
    id: '01-right-on-average',
    title: 'Right on average',
    short: 'On average',
    intro: {
      story: `Builders ask Larkspur for a trade account: goods now, pay later. A model checks each application, and it is right ${RIGHT}% of the time.`,
      goal: 'Is a check that is right on average right for everyone?',
      learn: [
        'How a score and a bar make a decision',
        'Why one accuracy number hides groups',
        'What the two regions are',
      ],
      terms: [
        ['Score', 'The check’s guess of an applicant’s chance of repaying, from 0 to 1.'],
        ['Bar', 'The score at or above which the check approves. Here one bar serves both regions.'],
        ['Wrong decision', 'Approving someone who didn’t repay, or turning down someone who would have.'],
      ],
    },
  },
  {
    id: '02-errors-by-group',
    title: 'Errors group by group',
    short: 'By group',
    intro: {
      story: `A wrong decision is one of two kinds. Turn down a builder who would have repaid, and Larkspur loses the trade and the builder loses the account.`,
      goal: 'Who is wrongly turned down, region by region?',
      learn: ['The two kinds of wrong decision', `Why ${B}’s repayers fare worse`, 'Why one bar moves both regions'],
      terms: [
        ['False decline', 'Turning down an applicant who would have repaid.'],
        ['False approval', 'Approving an applicant who then didn’t repay.'],
      ],
    },
  },
  {
    id: '03-where-skew-comes-from',
    title: 'Where the skew comes from',
    short: 'The skew',
    intro: {
      story: `Whether each applicant repaid follows one rule: years trading, late payments, order size and postcode. The rule never reads the region. Yet ${B} fares worse.`,
      goal: `Why does the check turn down ${B}’s repayers more often?`,
      learn: ['How a field can stand in for a group', 'Why base rates differ', 'Why a small group’s rates jump'],
      terms: [
        ['Proxy', 'A field that stands in for another. Here the postcode stands in for the region.'],
        ['Base rate', 'The share of a group who repaid.'],
        ['Thin sample', 'A group with few people, whose rates jump with each one.'],
      ],
    },
  },
  {
    id: '04-dropping-the-column',
    title: 'Dropping the column',
    short: 'Drop the column',
    intro: {
      story:
        'The team’s first idea: stop the check reading the region field. If it can’t see the region, surely it can’t treat regions differently?',
      goal: 'Does dropping the region field close the gap?',
      learn: [
        'Why a dropped field comes back through a proxy',
        'What dropping the proxy costs',
        'Why “blind” isn’t fair',
      ],
      terms: [
        ['Field', 'One piece of an application the check reads, such as years trading or postcode.'],
        ['Gap', `How many points more often ${B}’s repayers are turned down than ${A}’s.`],
      ],
    },
  },
  {
    id: '05-one-bar-or-two',
    title: 'One bar or two',
    short: 'Two bars',
    intro: {
      story:
        'Hiding fields didn’t work. Larkspur tries the other lever: a separate bar for each region, set after the check is fitted.',
      goal: 'Can a bar per region even out who is wrongly turned down?',
      learn: [
        'How a bar per region evens false declines',
        'What it costs in wrong approvals',
        'Where the law comes in',
      ],
      terms: [
        ['Per-group bar', 'A separate approval bar for each group.'],
        ['Equal opportunity', 'Among people who would repay, each group is turned down equally often.'],
      ],
    },
  },
  {
    id: '06-every-kind',
    title: 'You can’t have every kind',
    short: 'Every kind',
    intro: {
      story:
        'Equal false declines is one kind of fair. The credit team also wants approvals equally trustworthy in both regions, and equal false approvals.',
      goal: 'Can one pair of bars make every kind equal at once?',
      learn: ['Three kinds of fair', 'Why base rates make them clash', 'Why a team must choose one'],
      terms: [
        ['Precision', 'Of those approved, the share who repaid.'],
        ['Impossibility result', 'A proof that some fairness goals cannot all hold at once.'],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench: a fair enough check',
    short: 'Workbench',
    intro: {
      story: `The credit team sets its rule: false declines in ${A} and ${B} within ${GAP_MAX} points of each other. Then the fewest wrong decisions.`,
      goal: 'Which fields, fix and bars keep the rule with the fewest wrong decisions?',
      learn: ['How fields, fix and bars trade', 'Why the best setting uses two bars', 'What to check before shipping'],
      terms: [
        ['Sample fix', `Counting ${B}’s applicants ${TIMES} in the fit, so both regions weigh the same.`],
        ['Workbench', 'The chapter’s free-play bench: change the setting and see every result.'],
      ],
    },
  },
];

export const FAIRNESS_MODULE: Module = {
  id: 'fairness',
  title: 'Bias and fairness',
  description: 'Who a model gets wrong: error rates group by group, where the skew comes from, and what a fix costs.',
  level: 'Intermediate',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['calibration'],
  story: `Larkspur Supply Co.’s trade-account check approves builders for credit terms, and applicants from ${B} are turned down more often than those from ${A}.`,
  chapters: CHAPTERS,
  recall: RECALL,
};
