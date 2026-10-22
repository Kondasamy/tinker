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
        'Larkspur’s agent no longer just calls tools: it runs code. It reads and writes files and reaches the network to do a task. If a planted instruction takes it over, that code runs with whatever access the agent has. Chapter 1 runs the same task two ways.',
      goal: 'The same task runs on the host and in a sandbox. What changes when an attack is inside it?',
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
        ['Sandbox', fact('filesystem-isolation').claim],
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
        'The sandbox stopped the attack in chapter 1. Now look at one wall of it: the filesystem. What the agent can read and write is set by what the sandbox mounts, and how.',
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
        'Files are one wall; the network is the other. In chapter 1 the attack’s last move was a request to an outside host. That is how data leaves. Now set what the sandbox can reach.',
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
        'The agent’s task needs Larkspur’s API token to call the API. But if the token sits where the agent can read it, a compromised agent can read it too, and send it out. Where should the secret live?',
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
        'The allow-list from chapter 3 lets the agent reach Larkspur’s own API. That door is open on purpose. But an attack can use an open door too: it can hide stolen data inside a request to an allowed host.',
      goal: 'If the only host the agent can reach is Larkspur’s own, can an attack still get data out?',
      learn: [
        'How an allow-listed host becomes a channel for exfiltration',
        'Why this is Guardrails’ lethal trifecta: private data, untrusted content, a way out',
        'That the fix is to remove one leg, and what that costs',
      ],
      terms: [
        ['Allowed door', 'A host the proxy lets the agent reach for a real reason, which an attack can also use.'],
        ['Lethal trifecta', fact('allowed-domain-leak').claim],
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
        'Before sandboxing, a careful team asked a person to approve almost every action the agent took. That is slow, and people wave things through. The sandbox changes the maths: the boundary does the enforcing.',
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
        'You have every control: the sandbox, the mounts, the egress, where the secret lives and who approves what. The red team runs every attack and every ordinary task against your policy at once.',
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
  author: { name: 'Kondasamy Jayaraman', url: 'https://kondasamy.com' },
  prereqs: ['agents', 'guardrails'],
  story:
    'Larkspur Supply Co.’s agent now runs code to do its work, so where it runs and what it can reach decide what a compromised agent can do.',
  chapters: CHAPTERS,
  recall: RECALL,
};
