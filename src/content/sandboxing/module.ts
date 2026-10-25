// Agent sandboxing, module 15: its chapters and registry entry. Chapter ids are a contract with readers' saved
// progress: never rename one. Each chapter's `intro` is the story column's opening context; its island is picked by
// src/pages/sandboxing/[chapter].astro.
import type { Chapter, Module } from '../../lib/modules';
import { RECALL } from './recall';
import { fact } from '../../lib/sandboxing/facts';

const CHAPTERS: Chapter[] = [
  {
    id: '01-where-it-runs',
    title: 'Where the code runs',
    short: 'Where it runs',
    intro: {
      story:
        'Larkspur’s agent now runs code that reads files and calls the network. If a planted note takes it over, that code keeps the agent’s access.',
      goal: 'What changes when the same attack runs on the host, then in a sandbox?',
      learn: [
        'What a sandbox is: a box the operating system holds the agent’s code inside',
        'Why the same attack that succeeds on the host is stopped in the sandbox',
        'That the sandbox sits outside the model, so it works however the attack is worded',
      ],
      terms: [
        [
          'Agent',
          'A model that runs a task in a loop: it calls tools, reads what they return, and decides the next step.',
        ],
        [
          'Sandbox',
          'A boundary the operating system enforces around the agent’s code, limiting which files and hosts it can reach.',
        ],
        ['Exfiltration', 'Private data carried out of the sandbox to somewhere it should not go.'],
        ['Host', 'The real machine, with the developer’s full access to files and the network.'],
      ],
    },
  },
  {
    id: '02-files',
    title: 'Files',
    short: 'Files',
    intro: {
      story:
        'Chapter 1’s sandbox stopped the attack. Now one wall: the filesystem. What the agent can read and write depends on what the sandbox mounts.',
      goal: 'What does the sandbox mount, read-only or writable, and what does it hide?',
      learn: [
        'Mounts: the paths the sandbox exposes, each read-only or writable',
        'Why a write to a read-only mount, and a read of a hidden path, are refused',
        'That the default is broad: what you do not want read must be hidden on purpose',
      ],
      terms: [
        ['Mount', 'A path the sandbox exposes to the agent, as read-only or writable.'],
        ['Read-only', 'A mount the agent can read but not change.'],
        ['Hidden path', 'A path the sandbox does not expose at all; a read of it is refused.'],
        ['Least privilege', 'Giving the agent only the files and access the task needs, and nothing more.'],
      ],
    },
  },
  {
    id: '03-network',
    title: 'Network',
    short: 'Network',
    intro: {
      story:
        'Files are one wall; the network is the other. In chapter 1 the attack’s last move was a request to an outside host: that is how data leaves.',
      goal: 'With egress off, then an allow-list through a proxy, what can the agent reach?',
      learn: [
        'Egress: the agent’s outbound network, which can be off, open, or an allow-list',
        'How a proxy lets only allow-listed hosts out and blocks the rest',
        'Why too tight an allow-list blocks the real task, and the trade-off that makes',
      ],
      terms: [
        ['Egress', 'Outbound network access: the requests the agent can send out of the sandbox.'],
        ['Proxy', fact('proxy').claim],
        ['Allow-list', 'The only hosts the proxy lets requests reach; everything else is blocked.'],
        ['False block', 'An ordinary task the defences stop: a real request the allow-list refused.'],
      ],
    },
  },
  {
    id: '04-secrets',
    title: 'Secrets',
    short: 'Secrets',
    intro: {
      story:
        'The task needs Larkspur’s API token. Wherever the agent can read it, a compromised agent can read it too, and send it out.',
      goal: 'With the egress open, does moving the secret out of the sandbox stop it being stolen?',
      learn: [
        'Why a secret in the sandbox’s environment can be read by a compromised agent',
        'How a proxy holds the secret and adds it only on allowed requests, so the agent never sees it',
        'That keeping secrets out of the agent is a defence the network layer cannot give',
      ],
      terms: [
        ['Secret', 'A credential such as an API token, which authenticates Larkspur’s requests.'],
        ['Environment', 'The variables and files a program can read while it runs, inside the sandbox.'],
        ['Proxy-injected secret', fact('credentials-outside').claim],
      ],
    },
  },
  {
    id: '05-allowed-door',
    title: 'An allowed door still leaks',
    short: 'Allowed door',
    intro: {
      story:
        'Chapter 3’s allow-list lets the agent reach Larkspur’s own API, on purpose. An attack can use that open door too.',
      goal: 'If the agent can reach only Larkspur’s own host, can an attack still get data out?',
      learn: [
        'How an allow-listed host becomes a channel for exfiltration',
        'Why this is Guardrails’ lethal trifecta: private data, untrusted content, a way out',
        'That the fix is to remove one leg, and what that costs',
      ],
      terms: [
        ['Allowed door', 'A host the proxy lets the agent reach for a real reason, which an attack can also use.'],
        [
          'Lethal trifecta',
          'Private data, untrusted content and a way out, together in one agent: with all three, an attack can steal data.',
        ],
        ['Break a leg', 'Removing one of the three legs of the trifecta, which is the only reliable fix.'],
      ],
    },
  },
  {
    id: '06-fewer-prompts',
    title: 'Fewer prompts, same safety',
    short: 'Fewer prompts',
    intro: {
      story:
        'Before sandboxing, careful teams approved almost every agent action. That is slow, and tired people wave things through. A sandbox moves the enforcing into the boundary.',
      goal: 'With a sandbox boundary, which actions still need a person, and which can run freely?',
      learn: [
        'Why a sandbox lets most actions run without a prompt',
        'That a person is asked only when an action would cross the boundary',
        'Why approving a boundary crossing hands the safety back to a tired human',
      ],
      terms: [
        ['Approval', 'A person who says yes or no to an action before it runs.'],
        ['Boundary crossing', 'An action the sandbox would stop, such as a fetch to a host not on the allow-list.'],
        ['Prompt fatigue', 'When a person approves so many actions that they stop reading them.'],
      ],
    },
  },
  {
    id: '07-red-team',
    title: 'Red-team the sandbox',
    short: 'Red team',
    intro: {
      story:
        'You hold every control: mounts, egress, where the secret lives, approvals. The red team runs every attack and ordinary task against your policy.',
      goal: 'Which sandbox policy stops every attack and still lets every ordinary task run?',
      learn: [
        'How to run an attack suite and a task suite under one policy',
        'How to read attack success rate and false-block rate together',
        'Why a clean run proves less than it seems, and what a release gate adds',
      ],
      terms: [
        ['Red team', 'People who attack a system on purpose, before real attackers do, to find what gets through.'],
        ['Attack suite', 'The fixed set of attacks, each with a check of whether its goal was met.'],
        ['Task suite', 'The fixed set of ordinary tasks, each with a check that the task finished.'],
        ['Minimal policy', 'A policy that stops every attack while blocking the fewest ordinary tasks.'],
      ],
    },
  },
];

export const SANDBOXING_MODULE: Module = {
  id: 'sandboxing',
  title: 'Agent sandboxing',
  description:
    'Where an agent’s code runs, and what it can reach: a sandbox, its files, and the network it can or can’t call out to.',
  level: 'Advanced',
  status: 'live',
  author: { name: 'Samy (Kondasamy Jayaraman)', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'guardrails'],
  story:
    'Larkspur Supply Co.’s agent now runs code to do its work, so where it runs and what it can reach decide what a compromised agent can do.',
  chapters: CHAPTERS,
  recall: RECALL,
};
