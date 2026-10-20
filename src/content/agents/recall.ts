// Module 3's recall bank (KTD7): the recap and the warm-up ask from it. Each item asks a chapter's idea in a new
// situation, not the chapter's own question. Claims about agents come from data/agents/facts.json (R8).
// The registry imports this bank and the e2e specs import the registry in Node, so it reads facts only, not the engine.
import type { RecallItem } from '../../lib/recall';
import { fact } from '../../lib/agents/facts';

export const RECALL: RecallItem[] = [
  // 1. Workflow or agent?
  {
    id: 'what-makes-an-agent', chapter: '01-workflow-or-agent', pin: true,
    question: 'A vendor says their returns tool is “an agent”. Which detail would show that it really is one?',
    options: [
      'It uses a language model somewhere in the process',
      'It calls tools, such as the order system and email',
      'The model picks each next step itself, from what the last tool result told it',
      'It runs many steps for one case',
    ],
    correct: 2,
    why: [
      'A workflow can use a model too, for one fixed step such as writing an email. Using a model says nothing about who picks the path.',
      'Larkspur’s script called the same tools as the agent. Tools are run by the host either way.',
      `Right. ${fact('workflow-vs-agent').claim}`,
      'A script can run many steps as well: they are just fixed in advance. Counting steps does not tell you who chose them.',
    ],
  },
  {
    id: 'routine-is-cheaper', chapter: '01-workflow-or-agent',
    question: 'The warehouse team resets a forgotten password the same way every time: check the account, send a reset link. A colleague wants an agent to do it. What does the agent add?',
    options: [
      'A better result: the model thinks about each reset',
      'Cost and nothing else: the path is known, so a workflow gets the same result for less',
      'Safety: an agent cannot make mistakes on a routine job',
    ],
    correct: 1,
    why: [
      'When the path is known, a model choosing it again each time reaches the same result. It just spends tokens getting there.',
      `Right. ${fact('simplest-first').claim}`,
      'An agent can still make mistakes, and its errors can compound. A fixed path is the more predictable one.',
    ],
  },
  {
    id: 'surprise-breaks-script', chapter: '01-workflow-or-agent',
    question: 'A delivery script always books the same courier. One day the courier’s system answers “no pickups this week”. What happens?',
    options: [
      'The script books a different courier: it knows the goal is to deliver',
      'The script stops at the failed step, because nobody wrote a step for that answer',
      'The script waits and tries again next week on its own',
    ],
    correct: 1,
    why: [
      'A script knows only its steps, not the goal behind them. Choosing another courier is a step someone would have had to write.',
      'Right. A workflow follows the path written in advance. A result nobody planned for has no next step, so it stops.',
      'Waiting and retrying is a step too. A script does it only if someone wrote it in.',
    ],
  },
  {
    id: 'when-agent-fits', chapter: '01-workflow-or-agent',
    question: 'Which of these Larkspur jobs suits an agent best?',
    options: [
      'Sending every new customer the same welcome email',
      'Working out why a big customer’s last three orders went wrong, where each answer decides what to check next',
      'Refunding any order a manager has already approved',
    ],
    correct: 1,
    why: [
      'One fixed step, the same every time. A workflow does it for less.',
      `Right. ${fact('when-agent').claim}`,
      'The decision is already made and the steps are known: look up the order, refund it, confirm. That is a workflow.',
    ],
  },
];
