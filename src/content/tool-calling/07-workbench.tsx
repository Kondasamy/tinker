// Chapter 7: the workbench. The reader sets up a host (which MCP servers it connects, the approval gate, the refund
// limit) and matches four Larkspur requests to the setup each needs, in any order. A rule check, as in RAG's
// TypeChallenge, not a host run: every setup is judged by verdict() below, so no recorded turn is needed for any of
// the 24 reachable setups. The picture is chapter 5's host scene; the reader may switch to the JSON-RPC messages that
// connecting the chosen servers really sends (R28).
import { useEffect, useState } from 'react';
import StepRunner, { type StageProps } from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import { MCP_BOARD, connectScene } from '../../components/scenes/mcpScene';
import { rpcMessages, type Shown } from '../../components/scenes/toolSequence';
import { connect, createServer, ORDERS, SERVERS, TOOLS, type LogEntry, type ServerId } from '../../lib/tools/server';
import { DOMAINS } from '../../lib/tools/host';
import { RECORDINGS } from '../../lib/tools/turns';
import { fact } from '../../lib/tools/facts';
import { nextOf } from '../../lib/modules';
import type { Lane } from '../../lib/iso/flat';
import CALENDAR from '../../../data/tool-calling/calendar.json';
import { Fact, Messages, Stepper, money, openMessage } from './kit';

const MODULE = 'tool-calling', ID = '07-workbench';
export const SERVER_IDS = Object.keys(SERVERS) as ServerId[];
/** chapter 6's refund limits: none, one that fits a normal refund, one below it */
export const LIMITS = DOMAINS['refund-gate'].limit as (number | null)[];
const LANES: Lane[] = [{ id: 'host', name: 'Host app' }, ...SERVER_IDS.map(id => ({ id: SERVERS[id].name, name: SERVERS[id].title }))];

export interface Setup { servers: ServerId[]; gate: boolean; limit: number | null }
export interface Request { id: string; ask: string; uses: string[]; refund?: number; right: string }

const GATE = RECORDINGS['refund-gate'], INJ = RECORDINGS.injection;
const REFUND = Object.values(GATE.turns).flatMap(t => t.calls ?? []).find(c => c.name === 'issue_refund')!;
const WAITING = ORDERS.find(o => o.customer === GATE.customer && o.status === 'processing')!;
const WINDOW = CALENDAR.find(e => e.title.includes(GATE.customer!))!;
const write = (tool: string) => !TOOLS.find(t => t.name === tool)!.annotations.readOnlyHint;
const WRITE_TOOL = TOOLS.find(t => write(t.name))!.name;
const serverOf = (tool: string) => SERVER_IDS.find(id => SERVERS[id].tools.includes(tool))!;
const title = (id: ServerId) => SERVERS[id].title;

export const REQUESTS: Request[] = [
  {
    id: 'lookup', ask: INJ.ask, uses: ['get_order'],
    right: `A lookup only needs the ${title(serverOf('get_order'))} server. The gate stays on all the same: that server also brings ${WRITE_TOOL}, and this is the order whose note asked for a refund in chapter 6.`,
  },
  {
    id: 'calendar', ask: `The warehouse asks: what is on the team calendar for ${CALENDAR[0].date}?`, uses: ['get_calendar'],
    right: `Only the ${title(serverOf('get_calendar'))} server, and nothing on it changes data, so the gate has nothing to hold. Leaving the orders server off keeps ${WRITE_TOOL} out of reach entirely.`,
  },
  {
    id: 'refund', ask: GATE.ask, uses: ['get_order', WRITE_TOOL], refund: REFUND.arguments.amount as number,
    right: `${WRITE_TOOL} moves real money, so a person approves the call before it runs, and a limit that fits this ${money(REFUND.arguments.amount as number)} refund caps what any one call can do.`,
  },
  {
    id: 'delivery', ask: `${WAITING.customer} asks: order ${WAITING.id} is still ${WAITING.status}. When is our next delivery window?`, uses: ['get_order', 'get_calendar'],
    right: `Two servers, one host: the order comes from ${title(serverOf('get_order'))} and the window (${WINDOW.date}, ${WINDOW.time}) from ${title(serverOf('get_calendar'))}. The gate and the limit still guard ${WRITE_TOOL}.`,
  },
];

/** The setup a request needs: its servers, the gate wherever a tool that changes data is connected, the narrowest limit that fits. */
export function needs(r: Request): Setup {
  const servers = SERVER_IDS.filter(id => r.uses.some(t => serverOf(t) === id));
  const writes = servers.some(id => SERVERS[id].tools.some(write));
  const limit = writes ? [...LIMITS].filter((l): l is number => l !== null && l >= (r.refund ?? 0)).sort((a, b) => a - b)[0] : LIMITS[0];
  return { servers, gate: writes, limit };
}

/** Is this setup right for the request? The first rule it breaks explains why not. */
export function verdict(r: Request, s: Setup): { ok: boolean; why: string } {
  const need = needs(r).servers;
  const missing = need.find(id => !s.servers.includes(id));
  if (missing) {
    const tool = r.uses.find(t => serverOf(t) === missing)!;
    return { ok: false, why: `This request needs ${tool}, which only the ${title(missing)} server offers. Without it the model has no tool for the job, and guesses.` };
  }
  const extra = s.servers.find(id => !need.includes(id));
  if (extra) return { ok: false, why: `The ${title(extra)} server is not needed here. Every server you connect hands the model more tools; least privilege means connecting only what the request uses.` };
  const writes = s.servers.some(id => SERVERS[id].tools.some(write));
  if (writes && !s.gate) {
    return { ok: false, why: r.uses.some(write)
      ? `${WRITE_TOOL} moves real money. With the gate off nobody sees the call before it runs, so a wrong amount, or a refund planted in a customer note, pays out at once. ${fact('mcp-human').claim}`
      : `A lookup, but the ${title(serverOf(WRITE_TOOL))} server also brings ${WRITE_TOOL}. In chapter 6 a note inside a lookup result turned a question into a refund. Keep the gate on whenever a tool that changes data is connected.` };
  }
  if (writes && s.limit === null) return { ok: false, why: `${WRITE_TOOL} has no limit, so one bad call can refund any amount. Least privilege: give it a limit.` };
  if (writes && r.refund && s.limit !== null && s.limit < r.refund) {
    return { ok: false, why: `A limit of ${money(s.limit)} refuses this ${money(r.refund)} refund: the tool would say no to the job you need it for.` };
  }
  return { ok: true, why: r.right };
}

interface S { setup: Setup; at: string; tries: Record<string, Setup>; solved: string[]; view: 'scene' | 'seq' }
const req = (s: S) => REQUESTS.find(r => r.id === s.at)!;
export const complete = (s: S) => REQUESTS.every(r => s.solved.includes(r.id));
/** Try the current setup on the selected request; a solved request stays solved. */
const tryOn = (s: S, setup = s.setup): S => {
  const r = req(s), ok = verdict(r, setup).ok;
  return { ...s, setup, tries: { ...s.tries, [r.id]: setup }, solved: ok && !s.solved.includes(r.id) ? [...s.solved, r.id] : s.solved };
};

/** What connecting the chosen servers sends: a fresh in-browser server per id, tools/list on each. */
const cache = new Map<string, Shown[]>();
function msgs(s: S): Shown[] {
  const key = s.setup.servers.join() + '|' + s.setup.limit;
  if (!cache.has(key)) {
    const log: LogEntry[] = [];
    for (const id of SERVER_IDS.filter(x => s.setup.servers.includes(x))) connect(createServer(id, { refundLimit: s.setup.limit }), log).request('tools/list');
    cache.set(key, rpcMessages(log));
  }
  return cache.get(key)!;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench', focus: 'setup', visibleControls: ['setup'],
    narration: `Last stop: the workbench. Here is Larkspur’s host app and its ${SERVER_IDS.length} MCP servers, none connected yet, with the approval gate and the refund limit from chapter 6. Connect a server to start.`,
    predicate: s => s.setup.servers.length > 0,
    hint: 'Tick one of the servers under “Connected servers”.',
  },
  {
    id: 'match', focus: 'match', visibleControls: ['match', 'setup', 'try'],
    narration: `Four requests have come in. Pick one, set the host up for exactly what it needs, and try it. Do them in any order; each one explains itself, right or wrong.`,
    predicate: complete,
    hint: 'Connect only the servers whose tools the request uses. If a connected tool can move money, keep the gate on and give it a limit that still fits the request.',
    solution: s => tryOn(s, needs(req(s))),
  },
];

function useNarrow() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const m = matchMedia('(max-width: 600px)'), f = () => setNarrow(m.matches);
    f(); m.addEventListener('change', f);
    return () => m.removeEventListener('change', f);
  }, []);
  return narrow;
}

const FILL = { height: '100%' };
function Stage({ state, sync, inspect }: StageProps<S>) {
  const scale = useNarrow() ? 1.8 : 1;
  const { servers, gate, limit } = state.setup;
  const on = SERVER_IDS.filter(id => servers.includes(id));
  const ms = msgs(state);
  return (
    <div className="tc-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={state.view === 'scene'} onClick={() => sync({ ...state, view: 'scene' })}>Picture</button>
        <button type="button" className="chip" aria-pressed={state.view === 'seq'} onClick={() => sync({ ...state, view: 'seq' })}>Messages ({ms.length})</button>
      </div>
      <div className="tc-frame">
        {state.view === 'scene'
          ? <IsoStage board={MCP_BOARD} style={FILL}
              scene={connectScene({ servers: SERVER_IDS.map(id => ({ name: title(id).toUpperCase(), connected: servers.includes(id) })), host: gate ? 'HOST · GATE ON' : 'HOST · GATE OFF', scale })}
              label={`The host app, approval gate ${gate ? 'on' : 'off'}, refund limit ${limit === null ? 'none' : money(limit)}. Connected: ${on.map(title).join(', ') || 'none yet'}.`} />
          : <FlatStage lanes={LANES} msgs={ms} onPick={openMessage(inspect)} />}
      </div>
    </div>
  );
}

const LIMIT_OF = (l: number | null) => l === null ? 'No limit' : `Up to ${money(l)}`;

export default function Workbench() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ setup: { servers: [], gate: false, limit: null }, at: REQUESTS[0].id, tries: {}, solved: [], view: 'scene' }}
      next={nextOf(MODULE, ID)}
      stage={p => <Stage {...p} />}
      controls={{
        // changing the setup is never a miss: only trying it on a request is
        setup: ({ state, sync }) => {
          const set = (setup: Partial<Setup>) => sync({ ...state, setup: { ...state.setup, ...setup } });
          return (
            <div className="tc-bench">
              <fieldset className="tc-pick">
                <legend>Connected servers</legend>
                {SERVER_IDS.map(id => (
                  <label key={id}>
                    <input type="checkbox" checked={state.setup.servers.includes(id)}
                      onChange={e => set({ servers: e.target.checked ? [...state.setup.servers, id] : state.setup.servers.filter(x => x !== id) })} />
                    <span>{title(id)}: {SERVERS[id].tools.join(', ')}</span>
                  </label>
                ))}
              </fieldset>
              <label className="tc-check">
                <input type="checkbox" checked={state.setup.gate} onChange={e => set({ gate: e.target.checked })} />
                <span>Approval gate: calls that change data wait for a person</span>
              </label>
              <Stepper label={`Refund limit for ${WRITE_TOOL}`} values={LIMITS} value={state.setup.limit} show={LIMIT_OF}
                down="− Lower" up="+ Raise" onChange={limit => set({ limit })} />
            </div>
          );
        },
        match: ({ state, sync }) => {
          const r = req(state);
          return (
            <div className="challenge">
              <div className="opts" role="group" aria-label="Requests">
                {REQUESTS.map((q, i) => (
                  <button key={q.id} type="button" className="chip" aria-pressed={q.id === r.id} data-solved={state.solved.includes(q.id) || undefined}
                    aria-label={`Request ${i + 1}${state.solved.includes(q.id) ? ', done' : ''}`} onClick={() => sync({ ...state, at: q.id })}>
                    {state.solved.includes(q.id) ? '✓' : i + 1}
                  </button>
                ))}
              </div>
              <p className="tc-ask">Request {REQUESTS.indexOf(r) + 1} of {REQUESTS.length}. “{r.ask}”</p>
            </div>
          );
        },
        // the verdict sits under the setup it judged
        try: ({ state, apply }) => {
          const r = req(state), tried = state.tries[r.id], v = tried && verdict(r, tried), done = state.solved.includes(r.id);
          return (
            <>
              {!done && <button type="button" className="big" onClick={() => apply(tryOn(state))}>Try this setup on request {REQUESTS.indexOf(r) + 1}</button>}
              {v && (
                <div className="feedback" role="status">
                  {done ? <span className="stamp correct">RIGHT</span> : <span className="stamp wrong">NOT QUITE</span>}
                  <p>{done ? r.right : v.why}</p>
                </div>
              )}
            </>
          );
        },
      }}
      inspectPanel="messages"
      panels={{
        messages: { title: 'MCP messages', render: s => <><Messages lanes={LANES} msgs={msgs(s)} upTo={msgs(s).length} /><Fact id="mcp-human" /></> },
      }}
    />
  );
}
