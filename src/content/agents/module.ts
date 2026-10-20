// AI agents, module 3: its chapters and module facts. Chapter ids are a contract with readers' saved progress: never rename one.
// Only chapters that are written are listed here; each chapter unit appends its own entry (with its `intro`) alongside its island.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';

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
