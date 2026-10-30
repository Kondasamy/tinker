// Chapter 7: set the mail records, the workbench. The reader picks Larkspur's SPF record, DKIM on or off and the
// DMARC policy; a hand-written day of mail runs through Hollis's checks and the owner's rule is checked. The puzzle
// accepts every setting that meets the rule (WINNERS, pinned and recomputed in a test).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import { POST_PARTS } from '../../components/scenes/postScene';
import type { Policy } from '../../lib/email/dns';
import type { MessageId } from '../../lib/email/story';
import {
  DAY,
  FAKES,
  POLICIES,
  REAL,
  REASONS,
  RULE,
  SPF_OPTIONS,
  START,
  WINNERS,
  benchOf,
  fatesOf,
  meets,
  recordsOf,
  scoreOf,
  wins,
  type Bench,
} from '../../lib/email/workbench';
import { fact } from '../../lib/email/facts';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, type View } from './kit';

const MODULE = 'email',
  ID = '07-mail-records';
export const PARTS = POST_PARTS;
const ALL = { spf: true, dkim: true, dmarc: true, spam: true, sorted: true };
/** Gmail's bulk-sender line, messages a day: the made-up day sits far under it */
export const BULK = Number(fact('gmail-2024').value);

export const QUIZ = {
  question: 'Why does reject need DKIM for Larkspur’s forwarded mail?',
  options: ['Forwarding breaks SPF; only the seal still aligns', 'DKIM makes SPF pass again', 'Reject ignores SPF'],
  correct: 0,
  explanation: 'The forwarder’s server isn’t on Larkspur’s list, but the seal travels with the message.',
  why: [
    'Right: without the seal, the forward has no aligned pass, and reject bounces it.',
    'DKIM and SPF are separate checks; one can’t make the other pass.',
    'Reject counts SPF too; a forward just can’t pass it.',
  ],
};

interface S extends Bench {
  shown: MessageId;
  view: View;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'bench',
    focus: 'bench',
    visibleControls: ['score', 'bench'],
    narration: 'The workbench runs a day of Larkspur’s mail through your SPF record, DKIM and DMARC policy.',
    act: 'Meet the owner’s rule.',
    say: { block: 'dmarc', text: 'Your policy' },
    predicate: s => wins(benchOf(s)),
    hint: 'Quarantine still puts fakes in front of customers. Each real route needs a pass that aligns.',
    solution: s => ({ ...s, ...WINNERS[0] }),
  },
  {
    id: 'ties',
    focus: 'quiz',
    visibleControls: ['score', 'bench', 'quiz'],
    narration: `Yours is one of ${WINNERS.length} settings that work: with reject, ~all and -all end the same.`,
    act: 'One question to finish.',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Which check survives a forward?',
  },
];

function Score({ s }: { s: S }) {
  const b = benchOf(s),
    best = wins(b),
    { realIn, fakesSeen } = scoreOf(b);
  return (
    <div role="status" data-best={best ? '1' : '0'}>
      <p className="em-headline">
        <strong>{`${realIn}/${REAL}`}</strong>
        {' real in inboxes, '}
        <strong>{`${fakesSeen}/${FAKES}`}</strong>
        {' fakes seen '}
        <span className={`stamp ${best ? 'correct' : 'wrong'}`}>{best ? 'RULE MET' : 'RULE BROKEN'}</span>
      </p>
      <p className="note em-note">{RULE}</p>
      {best && <p className="tc-status">{`One of ${WINNERS.length} settings that work.`}</p>}
    </div>
  );
}

const FATE = { inbox: 'inbox', junk: 'junk', bounced: 'bounced' };

function BenchControls({ s, set, show }: { s: S; set: (s: S) => void; show: (s: S) => void }) {
  const b = benchOf(s),
    f = fatesOf(b);
  return (
    <div className="tc-bench">
      <section className="em-bench" aria-label="Mail records">
        <fieldset className="em-row">
          <legend>SPF record</legend>
          {SPF_OPTIONS.map(o => (
            <label key={o.id}>
              <input type="radio" name="em-b-spf" checked={b.spf === o.id} onChange={() => set({ ...s, spf: o.id })} />{' '}
              {o.name}
            </label>
          ))}
        </fieldset>
        <p className="note em-note">{REASONS.spf}</p>
        <label className="em-row">
          <input type="checkbox" checked={b.dkim} onChange={e => set({ ...s, dkim: e.target.checked })} /> Larkspur
          signs with DKIM
        </label>
        <p className="note em-note">{REASONS.dkim}</p>
        <fieldset className="em-row">
          <legend>DMARC policy</legend>
          {POLICIES.map(p => (
            <label key={p}>
              <input
                type="radio"
                name="em-b-dmarc"
                checked={b.dmarc === p}
                onChange={() => set({ ...s, dmarc: p as Policy })}
              />{' '}
              {p}
            </label>
          ))}
        </fieldset>
        <p className="note em-note">{REASONS.dmarc}</p>
      </section>
      <table className="tc-ledger">
        <caption>A day of Larkspur’s mail under your records</caption>
        <thead>
          <tr>
            <th scope="col">Message</th>
            <th scope="col">Count</th>
            <th scope="col">Ended in</th>
          </tr>
        </thead>
        <tbody>
          {DAY.map(d => {
            const ok = d.real ? f[d.id] === 'inbox' : f[d.id] === 'bounced';
            return (
              <tr key={d.id} data-msg={d.id} data-ok={ok ? 1 : 0}>
                <th scope="row">
                  <label>
                    <input
                      type="radio"
                      name="em-shown"
                      checked={s.shown === d.id}
                      onChange={() => show({ ...s, shown: d.id })}
                    />{' '}
                    {d.name}
                  </label>
                </th>
                <td>{d.count}</td>
                <td className={ok ? 'em-ok' : 'em-bad'}>{FATE[f[d.id]]}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="note em-note">{`Hand-written counts: ${REAL + FAKES} messages, far under Gmail’s bulk line of ${BULK.toLocaleString('en-US')} a day. Pick a row to see it in the picture.`}</p>
      <Fact id="gmail-2024" />
      <Fact id="gmail-2025" />
      <Fact id="softfail" />
      <DemoNote />
    </div>
  );
}

export default function MailRecords() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ ...START, shown: 'forwarded', view: 'scene', quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const b = benchOf(state);
        return (
          <EmailStage
            id={state.shown}
            rec={recordsOf(b)}
            show={ALL}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={`${DAY.find(d => d.id === state.shown)?.name ?? ''} under your records${meets(b) ? ', rule met' : ''}.`}
          />
        );
      }}
      controls={{
        score: ({ state }) => <Score s={state} />,
        // changing the bench is an attempt only while it is the puzzle
        bench: ({ state, apply, sync, focused }) => (
          <BenchControls s={state} set={focused ? apply : sync} show={sync} />
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
    />
  );
}
