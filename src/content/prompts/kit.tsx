// Pieces the prompts chapters share: the stage (the docket board, or the Text tab: the assembled prompt part by part,
// the reply with who wrote it, and its grades, read off the same docket), clip-cards (KTD10: every card a button in a
// tray; Enter clips it into its slot or unclips it; a closed card says why; one toggle moves the rules card where the
// chapter opens it), one polite read-out naming the reply's grade, chapter 1's live Larkspur mini continuation, and
// cited facts. Every string is React text here; the drawing escapes its pills (esc).
import { useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import type { ModelState } from '../../lib/iso/figures';
import {
  cardsOf,
  DOCKET_BOARD,
  docketLabel,
  docketScene,
  SLOT_HEX,
  type CardSlot,
  type DocketOpts,
} from '../../components/scenes/docketScene';
import {
  blocked,
  canMoveRules,
  CHAPTER_TICKET,
  clip,
  moveRules,
  partsOf,
  unclip,
  unclipBlocked,
} from '../../lib/prompts/assemble';
import { CARDS, type Card, type Docket, type ModelId } from '../../lib/prompts/cards';
import { gradeReply, passes, type Grade } from '../../lib/prompts/grade';
import { continueText, MINI_PROMPTS, MINI_TOKENS, NORECORD, replyOf, type Reply } from '../../lib/prompts/story';
import { fact } from '../../lib/prompts/facts';
import { MODEL, useModel, type ModelStore } from '../transformers/kit';
import { useNarrow } from '../tool-calling/kit';
import { useReduced } from '../releases/kit';
import './prompts.css';

export { MODEL, modelNow, whenLoaded } from '../transformers/kit';
export { MINI_PROMPTS };

// ---- grades in words ----

/** Whether a card is on the docket now. */
export const isClipped = (d: Docket, c: Card) => (c.slot === 'rules' ? d.rules !== 'none' : d[c.slot] === c.value);

/** The machine's screen: OK when every check that applies passes, ??? when the key fact is in but something else
 * slips (or the examples' quirk turned up), !! when the key fact is missing. */
export function stateOf(g: Grade): ModelState {
  if (!g.facts) return 'bad';
  return g.format === false || g.routed === false || g.rule === false || g.quirk ? 'warn' : 'ok';
}
/** Each check that applies, in words, with whether it passed. */
export function checksOf(d: Pick<Docket, 'format'>, g: Grade): { ok: boolean; text: string }[] {
  const out = [{ ok: g.facts, text: g.facts ? 'Key fact in' : 'Key fact missing' }];
  if (g.format !== null) {
    const kind = d.format === 'json' ? 'JSON' : 'Three-line list';
    out.push({ ok: g.format, text: g.format ? `${kind} followed` : `${kind} broken` });
  }
  if (g.routed !== null) out.push({ ok: g.routed, text: g.routed ? 'Routed to the right team' : 'Routed wrong' });
  if (g.rule !== null) out.push({ ok: g.rule, text: g.rule ? 'House rule kept' : 'House rule missed' });
  if (g.quirk) out.push({ ok: false, text: 'Copies the examples’ quirk' });
  return out;
}
/** The reply's grade as one line for the read-out. */
export const gradeText = (d: Pick<Docket, 'format'>, g: Grade) =>
  `Reply: ${checksOf(d, g)
    .map(c => c.text.toLowerCase())
    .join(', ')}; ${g.words} words.`;
/** The slip's pill: the first check that failed, else the key fact. */
function slipText(d: Pick<Docket, 'format'>, g: Grade) {
  const miss = checksOf(d, g).find(c => !c.ok);
  if (!miss) return 'KEY FACT IN';
  if (!g.facts) return 'KEY FACT MISSING';
  if (g.format === false) return 'FORMAT BROKEN';
  if (g.routed === false) return 'ROUTED WRONG';
  if (g.rule === false) return 'RULE MISSED';
  return 'COPIED QUIRK';
}
const linesOf = (words: number) => Math.ceil(words / 25);
/** Who wrote a reply, as the Text tab and captions say it. */
export const byline = (r: Reply) =>
  r.source === 'recorded' ? `Recorded from ${r.by}, ${r.date}.` : `Simulated (${r.by}, ${r.date}).`;

// ---- the run: the docket sent to one ticket, or to a question set ----

export interface Run {
  ticket: string;
  reply: Reply;
  grade: Grade;
  pass: boolean;
}
export function runOf(chapter: string, d: Docket, ticket: string, model: ModelId): Run | null {
  const reply = replyOf(chapter, { ...d, ticket, model });
  if (reply === NORECORD) return null;
  const grade = gradeReply({ ...d, ticket }, reply.text);
  return { ticket, reply, grade, pass: passes(grade) };
}

/** What the board shows for a docket: the reply to the shown ticket (default the chapter ticket, or the set's first),
 * the set's runs, the picture's options and the read-out's line. Pure, for the stage, the dev page and tests. */
export function boardOf(
  chapter: string,
  d: Docket,
  { ticket, tickets, model = 'main' }: { ticket?: string; tickets?: string[]; model?: ModelId } = {},
) {
  const run = runOf(chapter, d, ticket ?? tickets?.[0] ?? CHAPTER_TICKET, model),
    runs = tickets?.map(t => runOf(chapter, d, t, model)).filter((r): r is Run => !!r),
    all = runs?.filter(r => r.pass).length ?? 0;
  const opts: DocketOpts = {
    cards: cardsOf(d),
    state: !run ? undefined : runs ? (all === runs.length ? 'ok' : all ? 'warn' : 'bad') : stateOf(run.grade),
    slip: !run
      ? null
      : {
          lines: linesOf(run.grade.words),
          facts: runs ? all === runs.length : run.grade.facts,
          text: runs ? `${all}/${runs.length} PASS` : slipText(d, run.grade),
        },
  };
  const said = !run
    ? 'No reply recorded for this docket.'
    : `${runs ? `${all} of ${runs.length} tickets pass. ` : ''}${gradeText(d, run.grade)}`;
  return { run, runs, opts, said };
}

// ---- the Text tab ----

const SLOT_NAME: Record<CardSlot, string> = {
  rules: 'House rule',
  role: 'Who you are',
  task: 'Task',
  examples: 'Examples',
  format: 'Format',
  ticket: 'Ticket',
};
function Swatch({ slot }: { slot: CardSlot }) {
  return <span className="pr-swatch" style={{ background: SLOT_HEX[slot] }} aria-hidden="true" />;
}
function Checks({ items }: { items: { ok: boolean; text: string }[] }) {
  return (
    <ul className="pr-checks">
      {items.map(c => (
        <li key={c.text} className={c.ok ? 'ok' : 'miss'}>
          <span aria-hidden="true">{c.ok ? '✓' : '✗'}</span> {c.text}
        </li>
      ))}
    </ul>
  );
}
function TextView({ d, run, runs, missing }: { d: Docket; run: Run | null; runs?: Run[]; missing: boolean }) {
  const ticket = run?.ticket ?? CHAPTER_TICKET;
  return (
    <div className="pr-text">
      <ol className="pr-parts" aria-label="The prompt, in the order the model reads it">
        {partsOf({ ...d, ticket }).map(p => (
          <li key={p.slot} data-slot={p.slot}>
            <span className="pr-slot">
              <Swatch slot={p.slot} />
              {SLOT_NAME[p.slot]}
            </span>
            <pre>{p.text}</pre>
          </li>
        ))}
      </ol>
      <section className="pr-reply" aria-label="The reply">
        {run ? (
          <>
            <p className="pr-by">{byline(run.reply)}</p>
            <pre>{run.reply.text}</pre>
            <Checks items={checksOf(d, run.grade)} />
            <p className="pr-words">{`${run.grade.words} words.`}</p>
          </>
        ) : (
          <p className="pr-by">{missing ? 'No reply recorded for this docket.' : ''}</p>
        )}
      </section>
      {runs && (
        <section className="pr-set" aria-label="The question set">
          <p className="pr-by">{`${runs.filter(r => r.pass).length} of ${runs.length} tickets pass.`}</p>
          <Checks items={runs.map(r => ({ ok: r.pass, text: `${r.ticket}: ${r.pass ? 'pass' : 'miss'}` }))} />
        </section>
      )}
    </div>
  );
}

// ---- the tray ----

function Tray({
  chapter,
  d,
  onCard,
  onMove,
}: {
  chapter: string;
  d: Docket;
  onCard: (c: Card, clipped: boolean) => void;
  onMove: () => void;
}) {
  const id = useId().replace(/[^\w-]/g, '');
  return (
    <div className="pr-tray" role="group" aria-label="Cards">
      {CARDS.map(c => {
        const on = isClipped(d, c),
          why = on ? unclipBlocked(chapter, c.slot) : blocked(chapter, c.id);
        return (
          <button
            key={c.id}
            type="button"
            className="pr-card"
            data-card={c.id}
            aria-pressed={on}
            aria-disabled={why ? true : undefined}
            aria-describedby={why ? `${id}${c.id}` : undefined}
            onClick={() => !why && onCard(c, on)}
          >
            <span className="pr-face">
              <Swatch slot={c.slot} />
              {c.label}
            </span>
            {why && (
              <span className="pr-why" id={`${id}${c.id}`}>
                {why}
              </span>
            )}
          </button>
        );
      })}
      {canMoveRules(chapter) && (
        <button
          type="button"
          className="chip pr-move"
          aria-pressed={d.rules === 'last'}
          aria-disabled={d.rules === 'none' ? true : undefined}
          onClick={() => d.rules !== 'none' && onMove()}
        >
          House rule last
        </button>
      )}
    </div>
  );
}

// ---- the stages ----

export type View = 'scene' | 'text';
const FILL = { height: '100%' };

function Tabs({ view, setView }: { view: View; setView: (v: View) => void }) {
  return (
    <div className="tc-tabs" role="group" aria-label="Show in the picture">
      <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
        Picture
      </button>
      <button type="button" className="chip" aria-pressed={view === 'text'} onClick={() => setView('text')}>
        Text
      </button>
    </div>
  );
}

/** Chapters 2–7's stage: the docket board (default) or the Text tab, one at a time, read off the same docket. Under the
 * frame: the card tray (with `onDocket`), the model chips (with `onModel`), and one polite read-out naming the reply's
 * grade after each action, cleared when `step` changes. With `tickets` the docket goes to each, and the slip counts
 * passes. With reduced motion a clipped card is simply there. */
export function DocketStage({
  chapter,
  docket: d,
  onDocket,
  ticket,
  tickets,
  model = 'main',
  onModel,
  say,
  caption,
  view: kept,
  onView,
  step,
  children,
}: {
  chapter: string;
  docket: Docket;
  /** none: the tray is hidden */
  onDocket?: (d: Docket) => void;
  /** the ticket shown; default the chapter ticket, or the set's first */
  ticket?: string;
  /** a question set: the docket goes to each (chapters 6 and 7) */
  tickets?: string[];
  model?: ModelId;
  /** none: the model chips are hidden */
  onModel?: (m: ModelId) => void;
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  step?: string | number;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow(),
    reduced = useReduced();
  const [said, setSaid] = useState('');
  const [fresh, setFresh] = useState<CardSlot | null>(null);
  useEffect(() => setSaid(''), [step]);
  useEffect(() => {
    if (!fresh) return;
    const t = setTimeout(() => setFresh(null), 450);
    return () => clearTimeout(t);
  }, [fresh]);
  const at = { ticket, tickets, model };
  const { run, runs, opts } = useMemo(
    () => boardOf(chapter, d, { ticket, tickets, model }),
    [chapter, d, ticket, tickets, model],
  );
  const send = (next: Docket, line: string, slot: CardSlot | null) => {
    onDocket?.(next);
    setFresh(slot);
    setSaid(`${line} ${boardOf(chapter, next, at).said}`);
  };
  const onCard = (c: Card, on: boolean) =>
    on
      ? send(unclip(chapter, d, c.slot), `Unclipped ${c.label}.`, null)
      : send(clip(chapter, d, c.id), `Clipped ${c.label}.`, c.slot);
  const onMove = () => {
    const next = moveRules(chapter, d);
    send(next, `House rule moved to the ${next.rules === 'last' ? 'end' : 'top'}.`, 'rules');
  };
  const pickModel = (m: ModelId) => {
    onModel?.(m);
    setSaid(`Sent to the ${m === 'main' ? 'main' : 'smaller'} model. ${boardOf(chapter, d, { ...at, model: m }).said}`);
  };
  const o: DocketOpts = {
    ...opts,
    fresh: reduced ? null : fresh,
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage pr-stage">
      <Tabs view={view} setView={setView} />
      <div className="tc-frame">
        {view === 'text' ? (
          <TextView d={d} run={run} runs={runs} missing={!run} />
        ) : (
          <IsoStage
            className="pr-board"
            board={DOCKET_BOARD}
            style={FILL}
            scene={docketScene(o)}
            label={docketLabel(o)}
          />
        )}
      </div>
      {(onDocket || onModel) && (
        <div className="pr-controls">
          {onDocket && <Tray chapter={chapter} d={d} onCard={onCard} onMove={onMove} />}
          {onModel && (
            <div className="pr-models" role="group" aria-label="Model">
              <button type="button" className="chip" aria-pressed={model === 'main'} onClick={() => pickModel('main')}>
                Main model
              </button>
              <button
                type="button"
                className="chip"
                aria-pressed={model === 'small'}
                onClick={() => pickModel('small')}
              >
                Smaller model
              </button>
            </div>
          )}
        </div>
      )}
      <p className="pr-said" role="status" aria-live="polite">
        {said}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

/** Chapter 1's stage: one instruction on the docket, and Larkspur mini continuing it live (loaded once per page
 * through Transformers' model store). The Text tab shows the instruction and its continuation. */
export function MiniStage({
  prompt,
  onPrompt,
  store = MODEL,
  say,
  caption,
  view: kept,
  onView,
  step,
  children,
}: {
  prompt: string;
  /** none: the instruction chips are hidden */
  onPrompt?: (p: string) => void;
  store?: ModelStore;
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  step?: string | number;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = kept ?? own,
    setView = onView ?? setOwn;
  const narrow = useNarrow();
  const { model, failed, retry } = useModel(store);
  const text = useMemo(() => (model ? continueText(model, prompt) : null), [model, prompt]);
  const [said, setSaid] = useState('');
  useEffect(() => setSaid(''), [step]);
  useEffect(() => {
    if (text !== null) setSaid(`Larkspur mini continued: “${text.trim()}”`);
  }, [text]);
  const o: DocketOpts = {
    cards: [{ slot: 'task', label: 'INSTRUCTION' }],
    state: text === null ? undefined : 'warn',
    slip: text === null ? null : { lines: linesOf(text.split(/\s+/).length), text: 'JUST CONTINUES' },
    scale: narrow ? 2 : 1.2,
    say,
  };
  return (
    <div className="tc-stage pr-stage">
      <Tabs view={view} setView={setView} />
      <div className="tc-frame">
        {view === 'text' ? (
          <div className="pr-text">
            <ol className="pr-parts" aria-label="The prompt">
              <li data-slot="task">
                <span className="pr-slot">
                  <Swatch slot="task" />
                  Instruction
                </span>
                <pre>{prompt}</pre>
              </li>
            </ol>
            <section className="pr-reply" aria-label="The reply">
              <p className="pr-by">{`Larkspur mini, live in your browser: its likeliest next token, ${MINI_TOKENS} times.`}</p>
              <pre>{text ?? ''}</pre>
            </section>
          </div>
        ) : (
          <IsoStage
            className="pr-board"
            board={DOCKET_BOARD}
            style={FILL}
            scene={docketScene(o)}
            label={docketLabel(o)}
          />
        )}
      </div>
      {onPrompt && (
        <div className="pr-controls">
          <div className="pr-models" role="group" aria-label="Instruction">
            {MINI_PROMPTS.map(p => (
              <button key={p} type="button" className="chip" aria-pressed={prompt === p} onClick={() => onPrompt(p)}>
                {p}
              </button>
            ))}
          </div>
        </div>
      )}
      {!model && (
        <p className="pr-load">
          {failed ? 'Larkspur mini didn’t load.' : 'Loading Larkspur mini…'}
          {failed && (
            <button type="button" className="chip" onClick={retry}>
              Retry
            </button>
          )}
        </p>
      )}
      <p className="pr-said" role="status" aria-live="polite">
        {said}
      </p>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

/** A cited fact from data/prompts/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
