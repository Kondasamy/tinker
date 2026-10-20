// AI agents, module 3: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { WINDOW } from '../rag/module';

const CHAPTERS: Chapter[] = [
  {
    id: '01-workflow-or-agent', title: 'Workflow or agent?', short: 'Workflow or agent?',
    intro: {
      story: 'At the end of Tool calling, Larkspur’s assistant could look up orders and issue refunds, through MCP servers, behind an approval gate and a limit. Each request was one small job. Now the support lead wants to hand it whole cases: “this printer arrived cracked, sort it out.”',
      goal: 'Who should pick the steps for a case: code written in advance, or the model?',
      learn: [
        'The difference between a workflow, where code picks the path, and an agent, where the model does',
        'Why a workflow is cheaper on a case its authors foresaw',
        'Why an agent copes when a case takes a turn nobody wrote a step for',
      ],
      terms: [
        ['Goal', 'What the case should end with, such as “the customer has a working printer and knows it”. It says what, not how.'],
        ['Workflow', 'A fixed path written in code: the same calls, in the same order, every time. Larkspur’s team calls it the script.'],
        ['Agent', 'A model that works toward a goal by choosing its own next step, again and again, from what each tool result tells it.'],
      ],
    },
  },
  {
    id: '02-the-loop', title: 'The loop, and who says done', short: 'The loop',
    intro: {
      story: 'In chapter 1 the agent coped with a cracked printer that the script could not: it checked the stock and changed course. Nobody wrote its steps down. So what does an agent actually do, turn by turn, and how does it know when to stop?',
      goal: 'What happens on each turn of an agent, and who decides the case is done?',
      learn: [
        'The loop every agent runs: think, act, observe, decide',
        'Why each next step depends on what the last result said',
        'Why the model ends the run, by answering without a call, and the host’s budget is only a backstop',
      ],
      terms: [
        ['Turn', 'One pass of the model: it reads everything so far, then asks for tool calls or gives its answer.'],
        ['Loop', 'Turn after turn: the host runs each call the model asks for and sends the result back, until the model answers.'],
        ['Step budget', 'The most turns the host lets one run take. A rule in the host, not something the model decides.'],
      ],
    },
  },
  {
    id: '03-plans', title: 'Plans, and approving a plan', short: 'Plans',
    intro: {
      story: 'In chapter 2 the agent fixed the cracked printer one turn at a time, and nobody could see where it was heading until it got there. The support lead wants to know what the agent means to do before it does it, and a way to say no.',
      goal: 'How does an agent plan a case, change the plan when a result surprises it, and who gets to approve the plan?',
      learn: [
        'What a plan adds: the steps written down before any tool runs',
        'Why a plan has to change when a result surprises the agent, and what that looks like',
        'How approving a plan once replaces approving every call, and why a change goes back to the person',
        'Why approval stops a planted instruction only if someone reads the plan',
      ],
      terms: [
        ['Plan', 'The steps the model writes down before it acts, one item per tool call. The host shows it on the clipboard.'],
        ['Re-plan', 'The agent changing its plan part way, because a result told it something the plan did not expect.'],
        ['Plan approval', 'A person approves the plan once before anything runs. A call outside the approved plan comes back to them.'],
        ['Prompt injection', 'Instructions hidden in data the model reads, such as a customer email, written to make it do something else.'],
      ],
    },
  },
  {
    id: '04-budgets', title: 'Budgets and stuck loops', short: 'Budgets',
    intro: {
      story: 'In chapter 3 a person approved the agent’s plans, and a planted line got through only when nobody read them. Now a case goes wrong in a way no plan can fix: the carrier’s tracking system stops answering, and the agent keeps asking.',
      goal: 'What stops an agent that keeps trying the same thing, and what does each try cost?',
      learn: [
        'Why an agent with a failing tool can retry until the host stops it',
        'Why every turn costs more tokens than the one before',
        'How a step budget and a repeat detector stop a stuck run, and why only the detector leaves the agent a turn to tell the customer',
      ],
      terms: [
        ['Timeout', 'A tool call that gets no answer in time. The host returns it as an error result.'],
        ['Stuck loop', 'An agent asking for the same failing call, turn after turn, without getting anywhere.'],
        ['Token', 'A small piece of text, a word or part of one. Models read and write tokens, and every turn re-sends the whole context.'],
        ['Repeat detector', 'A host rule: when the same call fails the same way several times in a row, stop running it and tell the model.'],
      ],
    },
  },
  {
    id: '05-memory', title: 'Memory, and what survives it', short: 'Memory',
    intro: {
      story: 'In chapter 4 the host stopped a stuck loop, and every turn re-sent the whole history, so each one cost more. Now Monday’s storm brings five damaged orders at once. The history grows with every one, and one customer has asked for something the agent must not forget.',
      goal: 'What does an agent remember from turn to turn, and what is lost when the host cuts its history down?',
      learn: [
        'Why the context grows with every result the agent gets back',
        'What compaction saves, and what a summary can drop',
        'How pinning keeps the line that has to survive',
      ],
      terms: [
        [WINDOW[0], `${WINDOW[1]} You met it in RAG, chapter 2.`],
        ['Context budget', 'The most tokens this host lets one turn send the model. Larkspur’s team set it; it is not the size of any model’s context window.'],
        ['Compaction', 'The host replacing older history with a short summary, so later turns send less.'],
        ['Pinning', 'Keeping a line outside the summary: the host sends it every turn and never compacts it.'],
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
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['tool-calling'],
  story: 'Back at Larkspur Supply Co., the support lead now hands the assistant whole cases, not single requests, and it has to find its own way to done.',
  chapters: CHAPTERS,
  recall: RECALL,
};
