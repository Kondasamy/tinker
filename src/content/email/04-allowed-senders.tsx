// Chapter 4: the list of allowed senders. Larkspur publishes SPF: its confirmation passes, the fake reminder sent with
// Larkspur's envelope fails. The newsletter, sent by a vendor, fails too until the record includes the vendor's list
// (a puzzle: every record that passes the newsletter and fails the reminder is accepted). Then the reader predicts SPF
// on the fake invoice, whose envelope names the forger's own domain: a pass.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import type { Records } from '../../lib/email/dns';
import { FORGER, VENDOR, ipOf, verdictOf, type MessageId } from '../../lib/email/story';
import { SPF_OPTIONS } from '../../lib/email/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, MessagePick, type View } from './kit';

const MODULE = 'email',
  ID = '04-allowed-senders';
export const PARTS = POST_PARTS;
export const recOf = (spf: string): Records => ({
  spf: SPF_OPTIONS.find(o => o.id === spf)?.record ?? null,
  dkim: false,
  dmarc: null,
});
const SHOW = { spf: true, sorted: true };
export const OWN = SPF_OPTIONS.find(o => o.id === 'own')!;
/** a record the puzzle accepts: the newsletter passes SPF and the fake reminder does not */
export const fixes = (spf: string) =>
  verdictOf('newsletter', recOf(spf)).spf === 'pass' && verdictOf('spoofed', recOf(spf)).spf !== 'pass';
export const WINNERS = SPF_OPTIONS.map(o => o.id).filter(fixes);

export const P1 = {
  question: `The fake invoice’s envelope names ${FORGER}. What does SPF say?`,
  options: ['Pass: that domain lists its own server', 'Fail: it isn’t Larkspur', 'Nothing: SPF has no answer'],
};
export const outcomeOf = (spf: string) => {
  const r = verdictOf('forged', recOf(spf)).spf;
  return r === 'pass' ? 0 : r === 'fail' ? 1 : 2;
};

export const QUIZ = {
  question:
    'A shop’s SPF record lists only its own servers. A scammer sends from his own domain, with the shop’s name in From. What does SPF say?',
  options: ['Pass, for the scammer’s domain', 'Fail: From names the shop', 'Softfail: it looks suspicious'],
  correct: 0,
  explanation: 'SPF checks the envelope’s domain, which the scammer owns.',
  why: [
    'Right: his domain lists his server, so SPF passes for it; the shop’s record never comes up.',
    'SPF never reads the From line, only the envelope sender’s domain.',
    'Softfail is what a record says about an unlisted server; his server is listed by his own record.',
  ],
};

interface S {
  spf: string;
  msg: MessageId;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'publish',
    focus: 'spf',
    visibleControls: ['spf'],
    narration: 'SPF is a DNS record listing the servers allowed to send mail for a domain.',
    act: `Publish ${OWN.name}.`,
    say: { block: 'spf', text: 'Allowed list' },
    predicate: s => s.spf === 'own',
  },
  {
    id: 'spoof',
    focus: 'pick',
    visibleControls: ['spf', 'pick'],
    narration: `The confirmation passes, from ${ipOf('order')}. A stranger at ${ipOf('spoofed')} using Larkspur’s envelope would not.`,
    act: 'Pick the fake reminder.',
    predicate: s => s.msg === 'spoofed' && s.spf === 'own',
  },
  {
    id: 'vendor',
    focus: 'spf',
    visibleControls: ['spf'],
    narration: `Junk. But the newsletter goes out through ${VENDOR.name}, whose servers aren’t listed.`,
    act: 'Pick a record the newsletter passes and the fake fails.',
    say: { block: 'spf', text: 'Not listed' },
    setup: s => ({ ...s, msg: 'newsletter' }),
    predicate: s => fixes(s.spf),
    hint: `An include adds ${VENDOR.name}’s own list to Larkspur’s.`,
    solution: s => ({ ...s, spf: 'vendor' }),
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `An include added ${VENDOR.name}’s list. Now the fake invoice: its envelope names ${FORGER}.`,
    act: 'Predict its SPF result.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'show',
    focus: 'pick',
    visibleControls: ['p1', 'pick'],
    narration: 'Your pick is locked.',
    act: 'Pick the fake invoice.',
    predicate: s => s.p1 !== null && s.msg === 'forged',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'quiz'],
    narration: `Pass, for ${FORGER}. SPF checks the envelope’s domain, never the From line Hollis reads.`,
    act: 'One question to finish.',
    say: { block: 'spf', text: 'Wrong domain' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose domain does the envelope name?',
  },
];

export default function AllowedSenders() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ spf: 'none', msg: 'order', view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const rec = recOf(state.spf),
          v = verdictOf(state.msg, rec);
        return (
          <EmailStage
            id={state.msg}
            rec={rec}
            verdict={v}
            show={SHOW}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={`SPF checked ${v.spfDomain} for ${ipOf(state.msg)}: ${v.spf}.`}
          />
        );
      }}
      controls={{
        spf: ({ state, apply }) => (
          <fieldset className="em-row">
            <legend>Larkspur’s SPF record</legend>
            {SPF_OPTIONS.map(o => (
              <label key={o.id}>
                <input
                  type="radio"
                  name="em-spf"
                  checked={state.spf === o.id}
                  onChange={() => apply({ ...state, spf: o.id })}
                />{' '}
                {o.name}
              </label>
            ))}
            <p className="em-record">{recOf(state.spf).spf ?? 'No record published.'}</p>
          </fieldset>
        ),
        pick: ({ state, apply }) => (
          <MessagePick
            ids={['order', 'spoofed', 'newsletter', 'forged']}
            value={state.msg}
            onPick={msg => apply({ ...state, msg })}
          />
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf(state.spf)} />
            <Fact id="spf" />
            <Fact id="softfail" />
          </>
        ),
        quiz: ({ state, apply, sync }) => (
          <>
            <DemoNote />
            <Quiz
              {...QUIZ}
              unsure
              value={state.quiz}
              onAnswer={(_, q) => apply({ ...state, quiz: q })}
              onUnsure={() => sync({ ...state, quiz: UNSURE })}
            />
          </>
        ),
      }}
    />
  );
}
