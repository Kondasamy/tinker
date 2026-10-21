// The module's recall bank (KTD7): the recap and the warm-up ask from it. Three to five items per chapter, each asking
// the chapter's idea in a new situation. Every wrong option is a real misconception, and every option has a `why` line.
import type { RecallItem } from '../../lib/recall';

export const RECALL: RecallItem[] = [
  // 1. Where the code runs
  {
    id: 'sandbox-is-boundary', chapter: '01-where-it-runs', pin: true,   // the module's single most important idea: exactly one pin
    question: 'A team adds a line to the agent’s instructions: “never read files outside your task.” Is the agent’s code now safe to run on a laptop with the developer’s full access?',
    options: [
      'Yes: the instruction tells the agent what it may touch, so it stays in bounds',
      'No: an instruction is advice the model can be talked out of; a sandbox is a boundary the operating system enforces whatever the agent is told',
      'Yes, as long as the line is repeated at the end of the prompt',
      'No: you must turn the agent off entirely',
    ],
    correct: 1,
    why: [
      'A planted instruction can override your instruction, and then the code runs with full access anyway. The limit has to sit outside the model.',
      'Right. A sandbox is enforced by the OS, so it holds even when a prompt injection takes the agent over. Wording cannot do that.',
      'Wording is not the weak spot: the model cannot tell your instructions from an attacker’s, so no phrasing makes the rule reliable.',
      'The agent is useful; the point is to run it inside a boundary, not to stop running it.',
    ],
  },
  {
    id: 'same-attack-two-places', chapter: '01-where-it-runs',
    question: 'The same compromised task runs once on the host and once in a sandbox. On the host it sends a file out; in the sandbox it does not. Why?',
    options: [
      'The model behaved differently the second time',
      'The sandbox stopped the action from outside the model, so the same request was refused',
      'The sandbox rewrote the attacker’s instructions',
      'The file happened to be missing the second time',
    ],
    correct: 1,
    why: [
      'The agent proposed the same action both times. What changed is what the environment allowed.',
      'Right. The boundary is outside the model: it refuses the action regardless of how the agent was persuaded to try it.',
      'The sandbox does not read or change instructions; it just limits what an action can reach.',
      'Nothing about the files changed; the sandbox refused the outbound request.',
    ],
  },
  // 2. Files
  {
    id: 'hidden-vs-readonly', chapter: '02-files',
    question: 'An agent builds a report. It must read a template and write the result, but a secrets file sits in the same tree. What is the right filesystem policy?',
    options: [
      'Mount everything writable so nothing breaks',
      'Expose the template read-only, the output directory writable, and hide the secrets file',
      'Hide everything, including the template',
      'Mount the whole disk read-only',
    ],
    correct: 1,
    why: [
      'A writable everything lets a compromised agent change files it should never touch, and read the secret.',
      'Right. Least privilege: read-only where it only reads, writable where it must write, hidden where it should see nothing.',
      'Hiding the template breaks the task; the goal is least privilege, not no access.',
      'Read-only everywhere stops the agent writing its output, so the task fails.',
    ],
  },
  {
    id: 'default-broad', chapter: '02-files',
    question: 'A developer turns on a sandbox and assumes credential files like ~/.ssh are now safe from the agent. Is that assumption right?',
    options: [
      'Yes: a sandbox hides all sensitive files by default',
      'No: by default a sandbox can read most of the machine, so files you don’t want read must be hidden on purpose',
      'Yes, because SSH keys are always protected by the OS',
      'No: a sandbox blocks all reads until you allow each one',
    ],
    correct: 1,
    why: [
      'The default read is broad, not locked down; nothing hides those files unless you say so.',
      'Right. The sandbox’s default lets commands read most of the disk, including credential files, so protecting them is a step you take.',
      'The OS does not single out SSH keys; the sandbox reads them like any other file unless told not to.',
      'Reads are not blocked by default; writes are the more restricted side.',
    ],
  },
  // 3. Network
  {
    id: 'egress-tradeoff', chapter: '03-network',
    question: 'A team sets the agent’s egress to “off” so nothing can leak. The agent’s task needs to call the company API. What happens?',
    options: [
      'The task runs fine: internal APIs are always allowed',
      'The task is blocked too: egress off stops the real API call as well as any leak, so it’s a false block',
      'Only the leak is stopped; the API call still goes through',
      'The agent finds another way to the API on its own',
    ],
    correct: 1,
    why: [
      'Egress off means no outbound network at all; it does not know which host is friendly.',
      'Right. Off is the bluntest setting: it stops leaks and the task’s own requests alike. An allow-list keeps the friendly host open.',
      'There is no exception for the API; off blocks every outbound request.',
      'The agent cannot route around the sandbox’s network boundary.',
    ],
  },
  {
    id: 'allowlist-proxy', chapter: '03-network',
    question: 'What does an allow-list through a proxy give you that “egress off” and “egress open” do not?',
    options: [
      'Nothing: it is just “open” with extra steps',
      'The friendly hosts the task needs stay reachable while every other host is blocked',
      'It inspects the contents of every request for secrets',
      'It makes the agent faster',
    ],
    correct: 1,
    why: [
      'Open allows everything, including the attacker’s host; the allow-list does not.',
      'Right. The allow-list is the middle setting: the task’s hosts work, the rest are refused.',
      'A basic proxy decides by hostname, not by reading the encrypted contents of the request.',
      'Speed is not the point; the boundary is about which hosts are reachable.',
    ],
  },
  // 4. Secrets
  {
    id: 'secret-location', chapter: '04-secrets',
    question: 'The agent needs an API token. A colleague puts it in an environment variable inside the sandbox “so the agent can use it.” What is the risk?',
    options: [
      'None: the sandbox protects the environment',
      'A compromised agent can read the variable and send the token out; better to let a proxy hold it and add it only on allowed requests',
      'The token will expire faster inside the sandbox',
      'The agent cannot read environment variables at all',
    ],
    correct: 1,
    why: [
      'The sandbox does not hide its own environment from the code running in it.',
      'Right. If the agent can read the secret, so can an attacker who takes it over. Keeping it with the proxy means the agent never sees it.',
      'Where the token lives does not change when it expires.',
      'Code in the sandbox can read its environment; that is the problem here.',
    ],
  },
  {
    id: 'proxy-injects', chapter: '04-secrets',
    question: 'With the secret held by the proxy, the agent still manages to call the company API successfully. How, if it never sees the token?',
    options: [
      'It guessed the token',
      'The proxy adds the real token to the agent’s request on the way out, only for allowed hosts',
      'The API stopped requiring a token',
      'The sandbox copied the token into the agent’s memory',
    ],
    correct: 1,
    why: [
      'Nothing is guessed; the agent’s request simply has no token in it.',
      'Right. The proxy injects the credential on allowed outbound requests, so the call authenticates without the agent ever holding the secret.',
      'The API still needs the token; the proxy supplies it.',
      'The sandbox does not reveal the secret to the agent; that would defeat the point.',
    ],
  },
  // 5. An allowed door still leaks
  {
    id: 'allowed-door-leak', chapter: '05-allowed-door',
    question: 'An agent may only reach the company’s own API host. A colleague says “so data can’t leak.” What do you tell them?',
    options: [
      'Agreed: if the only host is ours, nothing can get out',
      'An attack can hide stolen data inside a request to the allowed host, so the allow-list alone does not stop a leak',
      'Agreed, as long as the API uses HTTPS',
      'Turn off the agent’s network entirely',
    ],
    correct: 1,
    why: [
      'An allowed door is still a door: a request to it can carry data the attacker chose.',
      'Right. The allow-list decides which host, not what the request contains; a smuggled record leaves through the open door.',
      'Encryption hides the request from the network, not from the host that receives it, and the proxy cannot read inside it anyway.',
      'Off would stop the leak and the real work; the reliable fix is to remove a leg of the trifecta.',
    ],
  },
  {
    id: 'break-a-leg', chapter: '05-allowed-door',
    question: 'The lethal trifecta is private data, untrusted content, and a way out. The agent has all three. What is the most reliable fix for the allowed-door leak?',
    options: [
      'Add a longer instruction telling the agent not to leak',
      'Remove one leg: for example, don’t mount the private data the task doesn’t need',
      'Switch to a smarter model',
      'Allow more hosts so the agent has options',
    ],
    correct: 1,
    why: [
      'An instruction is the leg the attacker already controls; it cannot be relied on.',
      'Right. Take away any one leg and the attack cannot complete. Not mounting data the task doesn’t need is least privilege and costs nothing here.',
      'A smarter model still reads untrusted text as text; the trifecta is structural, not about model quality.',
      'More hosts means more doors out, which makes the leak easier, not harder.',
    ],
  },
  // 6. Fewer prompts, same safety
  {
    id: 'fewer-prompts', chapter: '06-fewer-prompts',
    question: 'A team used to approve almost every action the agent took. After adding a sandbox, far fewer approvals are needed. Why is that still safe?',
    options: [
      'It isn’t: fewer prompts always means less safety',
      'The boundary enforces the limits, so most actions can run freely; a person is asked only when an action would cross the boundary',
      'The agent now approves its own actions',
      'The sandbox approves actions faster than a person could',
    ],
    correct: 1,
    why: [
      'Safety came from the limit, not from the clicking. The sandbox supplies the limit without the clicks.',
      'Right. Inside the boundary actions are already safe; the prompt is saved for the moments that would leave it. Anthropic found this cuts prompts sharply.',
      'The agent does not approve itself; the sandbox decides what is in bounds.',
      'It is not about speed; it is about the boundary doing the enforcing so a person is needed less often.',
    ],
  },
  {
    id: 'approve-the-crossing', chapter: '06-fewer-prompts',
    question: 'A person is asked to approve a fetch to a host the allow-list would block. They are busy and click yes. What have they done?',
    options: [
      'Nothing risky: the sandbox still protects them',
      'They have let an action cross the boundary the sandbox existed to hold, handing the safety back to their own attention',
      'Overridden the model’s instructions',
      'Permanently added the host to the allow-list',
    ],
    correct: 1,
    why: [
      'Approving the crossing is exactly the moment the boundary stops protecting them.',
      'Right. The boundary was the safe default; a yes on a crossing is only as good as the reading behind it, and busy people wave things through.',
      'They acted on the sandbox, not the model; the question is whether the action leaves the boundary.',
      'A single approval lets this request out; it does not rewrite the policy.',
    ],
  },
  // 7. Red-team the sandbox
  {
    id: 'suite-measures-known', chapter: '07-red-team',
    question: 'A sandbox policy now stops every attack in the red team’s suite and blocks no ordinary task. Is the agent safe?',
    options: [
      'Yes: a 0% attack success rate means no attack can get through',
      'Only against the attacks in the suite: add each new attack, rerun both suites on every change, and ship only when neither rate gets worse',
      'Yes, as long as a person also approves every action',
      'Not until every control is at its strictest',
    ],
    correct: 1,
    why: [
      'The rate is over the attacks someone thought of; a new one may still get through. A sandbox reduces risk but is not a complete boundary.',
      'Right. The suites are an eval: they measure known attacks and real tasks, and they grow as new attacks are found. A gate on both rates stops a change that makes either worse.',
      'Approvals add prompt fatigue without proving safety against new attacks, and not every action is a boundary crossing.',
      'Strictest settings block real tasks (false blocks) without proving safety against attacks nobody has written.',
    ],
  },
  {
    id: 'read-both-rates', chapter: '07-red-team',
    question: 'Policy A stops every attack but blocks half the ordinary tasks. Policy B stops every attack and blocks none. Which do you ship, and why?',
    options: [
      'A, because blocking more is safer',
      'B: both stop every attack, so the one that blocks fewer real tasks is the better policy',
      'Neither: any false block means the policy failed',
      'A, because a stricter policy always wins',
    ],
    correct: 1,
    why: [
      'Blocking real work is a cost, not extra safety; both policies are equally safe against these attacks.',
      'Right. Read the two rates together: at equal attack safety, the lower false-block rate wins.',
      'Some trade-offs force a few false blocks; the goal is the fewest, not zero at any cost.',
      'Stricter is not automatically better when it blocks the work the agent exists to do.',
    ],
  },
];
