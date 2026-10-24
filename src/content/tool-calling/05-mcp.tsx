// Chapter 5: why a shared protocol. The reader sets how many AI apps and systems Larkspur has; without MCP every pair
// needs its own integration (apps × systems), with MCP each side is built once (apps + servers), both computed by
// integrations(). Then the host connects to Larkspur's MCP servers, and every JSON-RPC message is the in-browser
// server's real reply (server/discover, tools/list, resources/read, prompts/get: the stateless spec, no initialize).
// One figure at a time in a fixed frame (R28): the isometric scene, or the message sequence, chosen by the step;
// once the host is connecting, the reader may switch between them.
import StepRunner, { type StageProps } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import { MCP_BOARD, countScene, connectScene } from '../../components/scenes/mcpScene';
import { rpcMessages, type Shown } from '../../components/scenes/toolSequence';
import { connect, createServer, integrations, SERVERS, type LogEntry, type ServerId } from '../../lib/tools/server';
import { RECORDINGS } from '../../lib/tools/turns';
import { fact } from '../../lib/tools/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import type { Lane } from '../../lib/iso/flat';
import { Fact, Messages, Outcome, Stepper, openMessage, useNarrow } from './kit';

const MODULE = 'tool-calling',
  ID = '05-mcp';
const IDS = Object.keys(SERVERS) as ServerId[];
const [ORDERS_ID, CAL_ID] = IDS;
const LANES: Lane[] = [
  { id: 'host', name: 'Host app' },
  ...IDS.map(id => ({ id: SERVERS[id].name, name: SERVERS[id].title })),
];
const COUNTS = [4, 3, 2, 1]; // stepper values, most first
const TARGET = { apps: 3, systems: 4 };
const GOAL = integrations(TARGET.apps, TARGET.systems);
const PROMPT = SERVERS[ORDERS_ID].prompts[0];
// the prompt is filled in with chapter 4's refund: its order and reason
const REFUND = Object.values(RECORDINGS['refund-sequence'].turns)
  .flatMap(t => t.calls ?? [])
  .find(c => c.name === 'issue_refund')!;

type Act = ServerId | 'resource' | 'prompt';
interface S {
  apps: number;
  systems: number;
  mcp: boolean;
  p1: number | null;
  phase: 'count' | 'connect';
  acts: Act[];
  view: 'scene' | 'seq';
  quiz: number | null;
}

/** Replays the reader's actions against fresh in-browser servers: every message is computed, none typed. */
function mcpLog(acts: Act[]): LogEntry[] {
  const log: LogEntry[] = [];
  const clients: Partial<Record<ServerId, ReturnType<typeof connect>>> = {};
  for (const a of acts) {
    if (a === 'resource' || a === 'prompt') {
      const c = clients[ORDERS_ID]!;
      if (a === 'resource') {
        const list = c.request('resources/list');
        const res =
          'result' in list
            ? (list.result.resources as { uri: string; name: string }[]).find(r => r.name.startsWith('refund-policy'))
            : undefined;
        if (res) c.request('resources/read', { uri: res.uri });
      } else {
        c.request('prompts/list');
        c.request('prompts/get', {
          name: PROMPT,
          arguments: { order_id: String(REFUND.arguments.order_id), reason: String(REFUND.arguments.reason) },
        });
      }
      continue;
    }
    const c = (clients[a] = connect(createServer(a), log));
    c.request('server/discover'); // optional: learn the server's versions first
    c.request('tools/list');
  }
  return log;
}
const cache = new Map<string, Shown[]>();
const msgs = (s: S) => {
  const k = s.acts.join();
  if (!cache.has(k)) cache.set(k, rpcMessages(mcpLog(s.acts)));
  return cache.get(k)!;
};
const has = (s: S, a: Act) => s.acts.includes(a);
const add = (s: S, a: Act): S => (has(s, a) ? s : { ...s, acts: [...s.acts, a] });

const P1 = {
  question: `With MCP, how many integrations do ${TARGET.apps} apps and ${TARGET.systems} systems need?`,
  options: [
    `${GOAL.without}: still one per pair`,
    `${GOAL.with}: each app builds its MCP side once, and each system one MCP server`,
    '1: MCP is a hub that everything plugs into',
  ],
};
const OUT1 = 1;

// this chapter's pictures are drawn by mcpScene directly, with no named parts for a callout
export const PARTS: readonly string[] = [];

export const QUIZ = {
  question:
    'Larkspur’s refund policy is a document the assistant should consult. How should the orders server offer it?',
  options: [
    'As a tool, so the model runs it',
    'As a resource: data the host can read and give the model as context',
    'As a prompt, so a person picks it from a menu',
    'It can’t: MCP only carries tools',
  ],
  correct: 1,
  explanation: fact('mcp-features').claim,
  why: [
    'A tool does something when the model calls it, but a policy is something to read, not to run.',
    'Right: data and context are resources, and you read the policy with resources/read.',
    `A prompt is a message template for a person, like ${PROMPT}, while the policy itself is data.`,
    'Servers offer three features, not one, and you just read the policy through the same connection.',
  ],
};

export const STEPS: Step<S>[] = [
  {
    id: 'tangle',
    focus: 'size',
    visibleControls: ['size', 'counts'],
    narration: 'Each app needs its own integration with each system.',
    act: `Step up to ${TARGET.apps} apps and ${TARGET.systems} systems.`,
    predicate: s => s.apps === TARGET.apps && s.systems === TARGET.systems,
    hint: `Press “+ More” on each until there are ${TARGET.apps} apps and ${TARGET.systems} systems.`,
  },
  {
    id: 'predict-mcp',
    focus: 'p1',
    visibleControls: ['counts', 'p1'],
    narration: `${GOAL.without} integrations, each custom and each to maintain. MCP is one shared way for apps and systems to talk.`,
    act: 'Predict before you switch it on.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'mcp',
    focus: 'mcp',
    visibleControls: ['p1', 'mcp', 'counts'],
    narration: 'Your pick is locked.',
    act: 'Switch the picture to MCP.',
    predicate: s => s.mcp,
  },
  {
    id: 'connect',
    focus: 'orders',
    visibleControls: ['out1', 'counts', 'orders'],
    narration: 'Each app speaks MCP once and each system gets one MCP server. Larkspur’s assistant is the host.',
    act: 'Connect it to the orders server.',
    predicate: s => has(s, ORDERS_ID),
  },
  {
    id: 'discover',
    focus: CAL_ID,
    visibleControls: [CAL_ID],
    opensDrawer: null,
    setup: s => ({ ...s, view: 'seq' }),
    narration:
      'Its MCP client sent server/discover, then tools/list: JSON-RPC requests, each with its own version, no handshake.',
    act: 'Open a message, then connect the calendar server.',
    predicate: s => has(s, CAL_ID),
  },
  {
    id: 'explore',
    focus: 'explore',
    visibleControls: ['explore'],
    narration: 'MCP servers offer tools, resources and prompts. The orders server offers all three.',
    act: `Read its refund policy, a resource, and get its ${PROMPT} prompt.`,
    predicate: s => has(s, 'resource') && has(s, 'prompt'),
    hint: 'Press both buttons, then open the newest messages in the drawer.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['quiz'],
    opensDrawer: 'messages',
    narration: 'The policy came back as text, the prompt as a message to start from; the drawer has both.',
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Is a policy something to run, something to read, or a message template?',
  },
];

const FILL = { height: '100%' }; // fill the fixed frame; the viewBox keeps the drawing's shape
function Stage({ state, sync, inspect }: StageProps<S>) {
  const scale = useNarrow() ? 1.8 : 1; // phones: bigger pills
  const n = integrations(state.apps, state.systems);
  const picture =
    state.phase === 'count' ? (
      <IsoStage
        board={MCP_BOARD}
        style={FILL}
        scene={countScene({ ...state, scale })}
        label={`${state.apps} AI app${state.apps === 1 ? '' : 's'} and ${state.systems} system${state.systems === 1 ? '' : 's'}: ${state.mcp ? `one MCP plug on each, ${n.with} integrations` : `every app wired to every system, ${n.without} custom integrations`}.`}
      />
    ) : (
      <IsoStage
        board={MCP_BOARD}
        style={FILL}
        scene={connectScene({
          servers: IDS.map(id => ({ name: SERVERS[id].title.toUpperCase(), connected: has(state, id) })),
          scale,
        })}
        label={`The host app and ${IDS.length} MCP servers. Connected: ${
          IDS.filter(id => has(state, id))
            .map(id => SERVERS[id].title)
            .join(', ') || 'none yet'
        }.`}
      />
    );
  const ms = msgs(state);
  return (
    <div className="tc-stage">
      {/* the tabs are always there, so the picture never jumps when they arrive; no messages until a server connects */}
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button
          type="button"
          className="chip"
          aria-pressed={state.view === 'scene' || state.phase === 'count'}
          onClick={() => sync({ ...state, view: 'scene' })}
        >
          Picture
        </button>
        <button
          type="button"
          className="chip"
          disabled={state.phase === 'count'}
          aria-pressed={state.view === 'seq' && state.phase === 'connect'}
          onClick={() => sync({ ...state, view: 'seq' })}
        >
          Messages ({state.phase === 'count' ? 0 : ms.length})
        </button>
      </div>
      <div className="tc-frame">
        {state.view === 'scene' || state.phase === 'count' ? (
          picture
        ) : (
          <FlatStage lanes={LANES} msgs={ms} onPick={openMessage(inspect)} />
        )}
      </div>
    </div>
  );
}

export default function Mcp() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        apps: 1,
        systems: IDS.length,
        mcp: false,
        p1: null,
        phase: 'count',
        acts: [],
        view: 'scene',
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={p => <Stage {...p} />}
      controls={{
        size: ({ state, sync }) => (
          <>
            <Stepper
              label="AI apps"
              values={COUNTS}
              value={state.apps}
              show={String}
              down="− Fewer"
              up="+ More"
              onChange={v => sync({ ...state, apps: v })}
            />
            <Stepper
              label="Systems with tools"
              values={COUNTS}
              value={state.systems}
              show={String}
              down="− Fewer"
              up="+ More"
              onChange={v => sync({ ...state, systems: v })}
            />
          </>
        ),
        counts: ({ state }) => {
          const n = integrations(state.apps, state.systems);
          return (
            <div className="tc-count" aria-live="polite">
              <div data-count="without">
                <b>{n.without}</b>
                <span>
                  without MCP: {state.apps} apps × {state.systems} systems
                </span>
              </div>
              {state.mcp && (
                <div data-count="with">
                  <b>{n.with}</b>
                  <span>
                    with MCP: {state.apps} apps + {state.systems} servers
                  </span>
                </div>
              )}
            </div>
          );
        },
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        mcp: ({ state, apply }) => (
          <label className="tc-check">
            <input type="checkbox" checked={state.mcp} onChange={e => apply({ ...state, mcp: e.target.checked })} />
            <span>Use MCP: one standard plug on every app and every system</span>
          </label>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={OUT1} />,
        // entering the host scene: the next step connects one host to Larkspur's servers
        [ORDERS_ID]: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply(add({ ...state, phase: 'connect' }, ORDERS_ID))}>
            Connect the {SERVERS[ORDERS_ID].title} server
          </button>
        ),
        [CAL_ID]: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply(add(state, CAL_ID))}>
            Connect the {SERVERS[CAL_ID].title} server
          </button>
        ),
        explore: ({ state, sync }) => (
          <div className="opts">
            <button
              type="button"
              className="chip"
              aria-pressed={has(state, 'resource')}
              onClick={() => sync(add(state, 'resource'))}
            >
              Read the refund policy (resource)
            </button>
            <button
              type="button"
              className="chip"
              aria-pressed={has(state, 'prompt')}
              onClick={() => sync(add(state, 'prompt'))}
            >
              Get the {PROMPT} prompt
            </button>
          </div>
        ),
        quiz: ({ state, apply, sync }) => (
          <Quiz
            {...QUIZ}
            unsure
            value={state.quiz}
            onAnswer={(_, q) => apply({ ...state, quiz: q })}
            onUnsure={() => sync({ ...state, quiz: UNSURE })}
          />
        ),
      }}
      inspectPanel="messages"
      panels={{
        messages: {
          title: 'MCP messages',
          render: s => (
            <>
              <Messages lanes={LANES} msgs={msgs(s)} upTo={msgs(s).length} />
              <Fact id="mcp-roles" />
              <Fact id="mcp-discover" />
              <Fact id="mcp-methods" />
              <Fact id="mcp-stateless" />
              <Fact id="mcp-jsonrpc" />
              <Fact id="mcp-auth" />
              <Fact id="mcp-version" />
            </>
          ),
        },
      }}
    />
  );
}
