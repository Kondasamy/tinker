// Chapter 6: who owns this padlock? Certificates and the chain. The supplier's padlock comes with a certificate
// (fixture, .example names, a toy-size signature); the reader predicts what earns trust, runs the four checks, then
// tries an impostor's card and sees which check fails. A browser runs the same checks for Opening a web page's sealed
// envelope (R17).
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { PAINT_PARTS, type PaintOpts } from '../../components/scenes/paintScene';
import { CERTS, ROOT, certOf, checkCert, trusts, type CertId } from '../../lib/encryption/certs';
import { SUPPLIER, TODAY } from '../../lib/encryption/story';
import { chapterHref, moduleOf, nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { EncryptionStage, Fact } from './kit';

const MODULE = 'encryption',
  ID = '06-who-owns-this-padlock';
export const PARTS = PAINT_PARTS;
const WEB5 = moduleOf('web-requests').chapters[4];
export const IDS = CERTS.map(c => c.id as CertId);
const NAME: Record<CertId, string> = {
  genuine: `${SUPPLIER.short}’s own`,
  'wrong-name': 'Impostor: its own name',
  expired: 'Impostor: an old, expired card',
  'unknown-root': 'Impostor: a lookalike root',
};

export const P1 = {
  question: 'The padlock comes with a card naming its owner. What makes Larkspur trust that card?',
  options: [
    'A signature from a root Larkspur already trusts',
    `${SUPPLIER.domain} printed on it`,
    'The padlock’s colour matching the card',
  ],
};
/** the genuine card passes because its root's signature checks; the name alone anyone can print */
export const outcomeOf = () => (trusts(certOf('genuine')) && !trusts(certOf('unknown-root')) ? 0 : 1);

export const QUIZ = {
  question:
    'A card is signed by a trusted root and in date, but made out to another name. Should Larkspur use its padlock?',
  options: [
    'No: it proves the padlock belongs to someone else',
    'Yes: a trusted root signed it',
    'Yes, if the padlock looks the same',
  ],
  correct: 0,
  explanation: 'A certificate vouches for one name; any other name is someone else’s padlock.',
  why: [
    'Right: the root vouched that the padlock belongs to the name on the card, and that is not the one asked for.',
    'The root’s signature is real, but it vouches for a different owner.',
    'Every padlock looks alike; only the checked card says whose it is.',
  ],
};

interface S {
  cert: CertId;
  checked: boolean;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: 'The padlock comes with a certificate: a card naming its owner, signed by a certificate authority.',
    act: 'Predict what makes Larkspur trust it.',
    say: { block: 'counter', text: 'Certificate' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'check',
    focus: 'check',
    visibleControls: ['p1', 'check'],
    narration: 'Your pick is locked. Larkspur checks four things: a trusted root, its signature, the name, the dates.',
    act: 'Check the certificate.',
    say: { block: 'us', text: 'Trusted root' },
    predicate: s => s.checked,
  },
  {
    id: 'impostor',
    focus: 'cert',
    visibleControls: ['checks', 'cert'],
    narration: 'All four pass, toy-size signature and all. Impostors can make cards too.',
    act: 'Try an impostor’s card.',
    predicate: s => s.checked && s.cert !== 'genuine',
    hint: 'Pick any card other than the supplier’s own.',
    solution: s => ({ ...s, checked: true, cert: 'wrong-name' }),
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['out1', 'cert', 'checks', 'web', 'fact', 'quiz'],
    narration: 'Each impostor fails a different check. A browser runs the same checks on every https page.',
    act: 'One question to finish.',
    say: { block: 'counter', text: 'Check fails' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose name does the root vouch for?',
  },
];

function Checks({ id }: { id: CertId }) {
  const c = certOf(id);
  return (
    <ul className="ek-checks" aria-label={`Checks on the card for ${c.subject}`}>
      {checkCert(c).map(x => (
        <li key={x.id} data-check={x.id} data-ok={x.ok ? '1' : '0'}>
          {x.said}
        </li>
      ))}
      <li className="note">{`Checked on ${TODAY}; the signature is toy size.`}</li>
    </ul>
  );
}

export function sceneOf(s: Pick<S, 'cert' | 'checked'>): Omit<PaintOpts, 'scale' | 'say' | 'names'> {
  const c = certOf(s.cert),
    ok = trusts(c);
  return {
    us: [{ kind: 'card', label: `ROOT: ${ROOT}`, short: 'ROOT', sealed: true }],
    counter: [
      { kind: 'lock', label: 'PADLOCK', open: true },
      {
        kind: 'card',
        label: s.checked ? `${c.subject} ${ok ? '✓' : '✗'}` : c.subject,
        short: s.checked ? (ok ? 'CARD ✓' : 'CARD ✗') : 'CARD',
        sealed: !s.checked || ok,
        broken: s.checked && !ok,
        lit: s.checked,
      },
    ],
    them: [],
    eve: s.cert === 'genuine' ? undefined : 'IMPOSTOR',
  };
}

export default function WhoOwnsThisPadlock() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ cert: 'genuine', checked: false, p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, say }) => (
        <EncryptionStage
          say={say}
          show={{
            scene: sceneOf(state),
            caption: state.checked
              ? `${NAME[state.cert]} card: ${trusts(certOf(state.cert)) ? 'every check passes' : 'a check fails'}.`
              : `A padlock and its card for ${SUPPLIER.domain}.`,
            toy: true,
          }}
        />
      )}
      controls={{
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        check: ({ state, apply }) => (
          <button type="button" className="big" onClick={() => apply({ ...state, checked: true })}>
            Check the certificate
          </button>
        ),
        checks: ({ state }) => <Checks id={state.cert} />,
        cert: ({ state, apply, sync, focused }) => (
          <fieldset className="ek-field">
            <legend>Card that came with the padlock</legend>
            {IDS.map(id => (
              <label key={id}>
                <input
                  type="radio"
                  name="ek-cert"
                  checked={state.cert === id}
                  onChange={() => (focused ? apply : sync)({ ...state, cert: id })}
                />{' '}
                {NAME[id]}
              </label>
            ))}
          </fieldset>
        ),
        out1: ({ state }) => <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />,
        web: () => (
          <p className="tc-fact">
            What it costs a page to set this up:{' '}
            <a href={chapterHref('web-requests', WEB5.id)}>Opening a web page chapter 5, {WEB5.title}</a>
          </p>
        ),
        fact: () => <Fact id="tls13" />,
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
