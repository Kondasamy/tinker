// Chapter 5: a seal on the letter. Larkspur turns DKIM signing on; the reader predicts what one changed digit does,
// changes it, and watches real DKIM (rsa-sha256 over relaxed canonicalisation, the committed signature and a labelled
// demo key, verified by Web Crypto in this browser) fail; then a re-spaced copy passes. Locks and keys teaches the
// signature itself, one link away (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import type { Records } from '../../lib/email/dns';
import type { DkimResult } from '../../lib/email/dkim';
import { judge } from '../../lib/email/dmarc';
import { parse } from '../../lib/email/parse';
import {
  DOMAIN,
  RECORDS,
  SELECTOR,
  TAMPER,
  TAMPERED,
  dkimOf,
  invoiceAs,
  ipOf,
  type Version,
} from '../../lib/email/story';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, useDkim, type View } from './kit';
import type { Say } from '../../components/story/steps';

const MODULE = 'email',
  ID = '05-a-seal-on-the-letter';
export const PARTS = POST_PARTS;
export const recOf = (signed: boolean): Records => ({ ...RECORDS['spf-vendor'], dkim: signed });
const [WAS, NOW] = TAMPER.digit;
/** DKIM's verdict as pinned (the page checks it live; the engine test proves the pins) */
export const pinnedDkim = (v: Version, rec: Records): DkimResult => {
  const d = dkimOf('invoice', rec);
  return v === 'sent' || d.result === 'none' ? d : { result: TAMPERED[v] === 'pass' ? 'pass' : 'fail', domain: DOMAIN };
};

export const P1 = {
  question: `Someone on the way changes ${WAS} to ${NOW}. What does Hollis’s check say?`,
  options: [
    'It fails: the body no longer matches',
    'It passes: one digit is too small',
    'It can’t tell without asking Larkspur',
  ],
};
export const outcomeOf = () => (TAMPERED.digit === 'fail' ? 0 : 1);

export const QUIZ = {
  question: 'A supplier’s signed price list arrives with one price changed by someone on the way. What does DKIM show?',
  options: ['The signature fails', 'It passes: prices aren’t headers', 'It passes if the change is small'],
  correct: 0,
  explanation: 'The signature covers a hash of the whole body; any real change breaks it.',
  why: [
    'Right: the body hash no longer matches, so the seal fails.',
    'The body is signed too, through its hash, not only the headers.',
    'Size doesn’t matter: one changed character changes the hash completely.',
  ],
};

interface S {
  signed: boolean;
  version: Version;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'seal',
    focus: 'seal',
    visibleControls: ['seal'],
    narration: 'DKIM seals the letter: a hash of its headers and body, signed with Larkspur’s private key.',
    act: 'Turn DKIM signing on.',
    say: { block: 'dkim', text: 'The seal' },
    predicate: s => s.signed,
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Hollis’s server fetches the public key from DNS, at ${SELECTOR}._domainkey.${DOMAIN}, and checks the seal.`,
    act: 'Predict what one changed digit does.',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'tamper',
    focus: 'version',
    visibleControls: ['p1', 'version'],
    narration: 'Your pick is locked.',
    act: `Change the amount to ${NOW}.`,
    predicate: s => s.p1 !== null && s.version === 'digit',
  },
  {
    id: 'spaces',
    focus: 'version',
    visibleControls: ['out1', 'version'],
    narration: 'Real check, run here: the seal fails. Some mail servers re-space lines on the way, though.',
    act: 'Try the copy with extra spaces.',
    say: { block: 'dkim', text: 'Seal broken' },
    predicate: s => s.version === 'spaces',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['version', 'link', 'quiz'],
    narration: 'It passes. Relaxed rules tidy spaces before checking, so only a real change breaks the seal.',
    act: 'One question to finish.',
    say: { block: 'dkim', text: 'Still sealed' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does the seal cover?',
  },
];

const VERSIONS: [Version, string][] = [
  ['sent', 'As Larkspur sent it'],
  ['digit', `Amount changed to ${NOW}`],
  ['spaces', 'Re-spaced on the way'],
];

/** The stage with the invoice checked by real DKIM in this browser. */
function SealStage({ s, say, onView }: { s: S; say?: Say; onView: (v: View) => void }) {
  const rec = recOf(s.signed),
    text = invoiceAs(s.version, rec),
    live = useDkim(text, rec);
  const dkim = live ?? pinnedDkim(s.version, rec),
    v = judge(parse(text), ipOf('invoice'), rec, dkim);
  const said =
    live === undefined
      ? 'Checking the seal with real RSA…'
      : `Real DKIM check, run here: ${live === null ? 'this browser can’t run it' : live.result}. ${
          v.fate === 'inbox' ? 'It went to the inbox.' : 'It went to junk.'
        }`;
  return (
    <EmailStage
      id="invoice"
      rec={rec}
      text={text}
      verdict={v}
      show={{ spf: true, dkim: true, sorted: true }}
      said={said}
      say={say}
      view={s.view}
      onView={onView}
      caption={VERSIONS.find(([k]) => k === s.version)![1]}
    />
  );
}

export default function ASealOnTheLetter() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ signed: false, version: 'sent', view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => <SealStage s={state} say={say} onView={view => sync({ ...state, view })} />}
      controls={{
        seal: ({ state, apply }) => (
          <label className="em-row">
            <input
              type="checkbox"
              checked={state.signed}
              onChange={e => apply({ ...state, signed: e.target.checked })}
            />{' '}
            Larkspur signs with DKIM
          </label>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        version: ({ state, apply }) => (
          <fieldset className="em-row">
            <legend>The invoice as it arrived</legend>
            {VERSIONS.map(([k, name]) => (
              <label key={k}>
                <input
                  type="radio"
                  name="em-version"
                  checked={state.version === k}
                  onChange={() => apply({ ...state, version: k })}
                />{' '}
                {name}
              </label>
            ))}
          </fieldset>
        ),
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="dkim" />
          </>
        ),
        link: () => (
          <>
            <Fact id="relaxed" />
            <Fact id="lists" />
            <p className="note em-note">
              How a signature works:{' '}
              <a href="/encryption/04-sealed-with-your-key/">sealed with your key, in Locks and keys</a>.
            </p>
            <DemoNote />
          </>
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
