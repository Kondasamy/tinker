// AI agents, module 3: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { WINDOW } from '../rag/module';

const CHAPTERS: Chapter[] = [
  {
    id: '01-workflow-or-agent',
    title: 'Workflow or agent?',
    short: 'Workflow or agent?',
    intro: {
      story:
        'Larkspur’s assistant can look up orders and issue refunds, one request at a time. The support lead hands it whole cases: “this printer arrived cracked, sort it out.”',
      goal: 'Who should pick the steps for a case: code written in advance, or the model?',
      learn: [
        'The difference between a workflow, where code picks the path, and an agent, where the model does',
        'Why a workflow is cheaper on a case its authors foresaw',
        'Why an agent copes when a case takes a turn nobody wrote a step for',
      ],
      terms: [
        [
          'Goal',
          'What the case should end with, such as “the customer has a working printer and knows it”. It says what, not how.',
        ],
        [
          'Workflow',
          'A fixed path written in code: the same calls, in the same order, every time. Larkspur’s team calls it the script.',
        ],
        [
          'Agent',
          'A model that works toward a goal by choosing its own next step, again and again, from what each tool result tells it.',
        ],
      ],
    },
  },
  {
    id: '02-the-loop',
    title: 'The loop, and who says done',
    short: 'The loop',
    intro: {
      story:
        'In chapter 1 the agent fixed a cracked printer with no written steps. How does it work, turn by turn, and when does it stop?',
      goal: 'What happens on each turn, and who decides the case is done?',
      learn: [
        'The loop every agent runs: think, act, observe, decide',
        'Why each next step depends on what the last result said',
        'Why the model ends the run, by answering without a call, and the host’s budget is only a safety net',
      ],
      terms: [
        ['Turn', 'One pass of the model: it reads everything so far, then asks for tool calls or gives its answer.'],
        [
          'Loop',
          'Turn after turn: the host runs each call the model asks for and sends the result back, until the model answers.',
        ],
        [
          'Step budget',
          'The most turns the host lets one run take. A rule in the host, not something the model decides.',
        ],
      ],
    },
  },
  {
    id: '03-plans',
    title: 'Plans, and approving a plan',
    short: 'Plans',
    intro: {
      story:
        'In chapter 2 nobody saw where the agent was heading until it arrived. The support lead wants its steps first, and a way to say no.',
      goal: 'How does an agent plan, change the plan when surprised, and who approves it?',
      learn: [
        'What a plan adds, and why a surprise makes the agent re-plan',
        'How approving a plan once replaces approving every call, and why a change goes back to the person',
        'Why approval stops a planted instruction only if someone reads the plan',
      ],
      terms: [
        [
          'Plan',
          'The steps the model writes down before it acts, one item per tool call. The host shows it on the clipboard.',
        ],
        [
          'Re-plan',
          'The agent changing its plan part way, because a result told it something the plan did not expect.',
        ],
        [
          'Plan approval',
          'A person approves the plan once before anything runs. A call outside the approved plan comes back to them.',
        ],
        [
          'Prompt injection',
          'Instructions hidden in data the model reads, such as a customer email, written to make it do something else.',
        ],
      ],
    },
  },
  {
    id: '04-budgets',
    title: 'Budgets and stuck loops',
    short: 'Budgets',
    intro: {
      story:
        'In chapter 3 a person approved the agent’s plans. Now the carrier’s tracking stops answering, and the agent keeps asking.',
      goal: 'What stops an agent that keeps trying the same thing, and what does each try cost?',
      learn: [
        'Why an agent with a failing tool can retry until the host stops it',
        'Why every turn costs more tokens than the one before',
        'How a step budget and a repeat detector stop a stuck run, and why only the detector leaves the agent a turn to tell the customer',
      ],
      terms: [
        ['Timeout', 'A tool call that gets no answer in time. The host returns it as an error result.'],
        ['Stuck loop', 'An agent asking for the same failing call, turn after turn, without getting anywhere.'],
        [
          'Token',
          'A small piece of text, a word or part of one. Models read and write tokens, and every turn re-sends the whole context.',
        ],
        [
          'Repeat detector',
          'A host rule: when the same call fails the same way several times in a row, stop running it and tell the model.',
        ],
      ],
    },
  },
  {
    id: '05-memory',
    title: 'Memory, and what survives it',
    short: 'Memory',
    intro: {
      story:
        'Monday’s storm brings five damaged orders at once, and one customer asks for something the agent must not forget.',
      goal: 'What does an agent remember, and what does cutting its history lose?',
      learn: [
        'Why the context grows with every result the agent gets back',
        'What compaction saves, and what a summary can drop',
        'How pinning keeps the line that has to survive',
      ],
      terms: [
        [WINDOW[0], `${WINDOW[1]} You met it in RAG, chapter 2.`],
        [
          'Context budget',
          'The most tokens this host lets one turn send the model. Larkspur’s team set it; it is not the size of any model’s context window.',
        ],
        ['Compaction', 'The host replacing older history with a short summary, so later turns send less.'],
        ['Pinning', 'Keeping a line outside the summary: the host sends it every turn and never compacts it.'],
      ],
    },
  },
  {
    id: '06-sub-agents',
    title: 'Sub-agents, and the cost of a handoff',
    short: 'Sub-agents',
    intro: {
      story: 'In chapter 5 one agent held all five storm orders in one history. Why should one agent hold them all?',
      goal: 'When should an agent hand work to helpers, and what does each handoff cost?',
      learn: [
        'How a lead agent hands one piece of a case to a helper with a clean context',
        'Why the lead’s context stays small: it gets back one line per helper, not the helper’s whole history',
        'Why the total grows anyway, and when helpers are worth it',
      ],
      terms: [
        [
          'Sub-agent',
          'A second agent the host starts for one piece of a case. Larkspur’s team calls it a helper. It has its own history and its own turns.',
        ],
        ['Lead agent', 'The agent that works the whole case and hands pieces of it to helpers.'],
        [
          'Delegate',
          'The host’s own tool for handing a piece to a helper. The lead calls it like any other tool; the host runs a helper, not a server.',
        ],
        [
          'Handoff',
          'Passing a piece of work to a helper. The helper starts again from the instructions and the tools, which costs tokens.',
        ],
      ],
    },
  },
  {
    id: '07-workbench',
    title: 'Workbench',
    short: 'Workbench',
    intro: {
      story: 'Every case from this module is on one bench, with the controls its chapter used.',
      goal: 'Given a case and a host’s settings, how will the run end, and what will it cost?',
      learn: [
        'The five ways a run ends: done, failed, waiting, stuck and out of budget',
        'Which host setting leads to which ending',
        'Reading a run’s tokens and sent emails to judge it',
      ],
      terms: [
        [
          'Ending',
          'How a run stops: the model says done, the script fails, a person has not answered, the host stops a stuck call, or the host’s budget runs out.',
        ],
        ['Ledger', 'The host’s record of what a run did that people outside see, here every email it sent.'],
      ],
    },
  },
];

export const AGENTS_MODULE: Module = {
  id: 'agents',
  title: 'AI agents',
  description: 'How an assistant goes from one request to a whole case: the loop, plans, budgets, memory and helpers.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['tool-calling'],
  story:
    'Back at Larkspur Supply Co., the support lead now hands the assistant whole cases, not single requests, and it has to find its own way to done.',
  chapters: CHAPTERS,
  recall: RECALL,
};
