// Chapter 3: whose turn is it? The turn detector runs live over Ravi's committed envelope: the reader moves the silence
// setting through every value and sees the turn end at a pause (a cut-off) or long after (dead air). Then Ravi calls from
// a noisy site and the energy threshold gets the same treatment. Transcripts and replies are recorded per what was heard.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { DEFAULT_LINE, runCall, type CallRun } from '../../lib/voice/engine';
import { DEFAULT_DETECTOR, SILENCES, THRESHOLDS, type Silence, type Threshold } from '../../lib/voice/turns';
import { HOST, ms } from '../../lib/voice/latency';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { Outcome } from '../tool-calling/kit';
import { Fact, PlanNote, Range, RecordedNote, Transcript, VoiceStage, segmentsOf, type View } from './kit';

const MODULE = 'voice',
  ID = '03-whose-turn-is-it';
// Larkspur streams since chapter 2
const BASE = { ...DEFAULT_LINE, streaming: true };
const NOISY_SILENCE: Silence = 800;
const hesitant = (silence: Silence) => runCall('hesitant', { ...BASE, silence });
const noisy = (threshold: Threshold) => runCall('noisy', { ...BASE, threshold, silence: NOISY_SILENCE });
const SHORTEST = SILENCES[0];

interface S {
  p1: number | null;
  silence: Silence;
  seenS: Silence[];
  threshold: Threshold;
  seenT: Threshold[];
  view: View;
  quiz: number | null;
}

const P1 = {
  question: `Ravi pauses between thoughts. The line ends a turn after ${SHORTEST} ms of quiet. What happens?`,
  options: [
    'The line waits for him to finish',
    'His first pause ends his turn, and the assistant answers half a request',
    'The line hears nothing at all',
  ],
};
/** read off the detector */
export const outcome = () => (hesitant(SHORTEST).detected.cut ? 1 : 0);

const QUIZ = {
  question:
    'A clinic’s phone line keeps cutting off older callers mid-sentence. Callers who speak quickly are happy. What is the honest trade-off of a longer silence setting?',
  options: [
    'None: longer is better for everyone',
    'Fewer cut-offs, but every caller waits that much longer after they finish',
    'It only changes the cost of the call',
  ],
  correct: 1,
  explanation:
    'The line can only know a turn has ended by waiting out the silence, so the wait is added to every reply.',
  why: [
    'Every millisecond of waiting is added to every reply. Long enough, and the quick callers sit in dead air.',
    'Right. That is the trade-off: cut-offs at one end, dead air at the other. Which callers you have decides where to sit.',
    'It changes the wait, not the price: the silence happens before the model even starts.',
  ],
};

const verdict = (r: CallRun) => (r.detected.cut ? 'cut off' : r.deadAir ? 'dead air' : 'heard whole');
const said = (r: CallRun, what: string) =>
  r.detected.cut
    ? `${what}: the turn ended ${ms(r.detected.lastWord - r.detected.fire)} before Ravi finished. Cut off.`
    : `${what}: the turn ended ${ms(r.detected.fire - r.detected.lastWord)} after his last word${r.detected.gaveUp ? ' (the host gave up waiting)' : ''}; the first sound came ${ms(r.wait!)} after it${r.deadAir ? `, past Larkspur’s ${ms(HOST.deadAirMs)} limit: dead air` : ''}.`;

export const STEPS: Step<S>[] = [
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['ravi', 'p1'],
    narration:
      'A turn is one person’s stretch of talking. The line has to decide when the caller’s turn is over; deciding from the audio when someone is speaking is voice activity detection (VAD). Larkspur’s detector ends a turn after a set stretch of quiet: the silence setting. Ravi wants to change a delivery address, and he pauses while he thinks. Before you run it:',
    predicate: s => s.p1 !== null,
  },
  {
    id: 'silence',
    focus: 'silence',
    visibleControls: ['p1', 'silence'],
    narration:
      'Move the silence setting through every value. The Timeline tab shows Ravi’s voice, the mark where his turn ended, and the reply.',
    setup: s => ({ ...s, seenS: [...new Set([...s.seenS, s.silence])] }),
    predicate: s => SILENCES.every(v => s.seenS.includes(v)),
    hint: 'Drag the slider, or use the arrow keys, until you have tried every value.',
  },
  {
    id: 'noisy',
    focus: 'threshold',
    visibleControls: ['threshold'],
    narration: `Short settings cut Ravi off (a cut-off: answering before the caller finished); the longest leaves dead air, a silence that runs on too long. Larkspur settles on ${ms(NOISY_SILENCE)}. Now Ravi calls from a building site, machinery humming, and says his order number quietly. What counts as quiet is the energy threshold: how loud a moment must be to count as speech. Move it through every value.`,
    setup: s => ({ ...s, seenT: [...new Set([...s.seenT, s.threshold])] }),
    predicate: s => THRESHOLDS.every(v => s.seenT.includes(v)),
    hint: 'Try the lowest, middle and highest threshold.',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['outcome', 'quiz'],
    narration:
      'Too low a threshold hears the hum as speech, so the turn never ends and the host gives up; too high, and Ravi’s quiet order number counts as silence. Real voice APIs expose these same two settings:',
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'What does every caller pay for a longer wait?',
  },
];

export default function WhoseTurnIsIt() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{
        p1: null,
        silence: DEFAULT_DETECTOR.silence,
        seenS: [],
        threshold: DEFAULT_DETECTOR.threshold,
        seenT: [],
        view: 'scene',
        quiz: null,
      }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, focus }) => {
        const onNoisy = focus === 'threshold' || (focus === 'quiz' && state.seenT.length > 0);
        const r = onNoisy ? noisy(state.threshold) : hesitant(state.silence),
          ran = onNoisy || state.seenS.length > 0;
        return (
          <VoiceStage
            step={focus}
            view={state.view}
            onView={view => sync({ ...state, view })}
            shown={{
              phone: ran ? { stage: 'reply', wait: r.wait, interrupt: r.detected.cut } : { stage: 'caller' },
              timeline: ran ? segmentsOf(r) : undefined,
              caption: ran
                ? said(r, onNoisy ? `Threshold ${state.threshold}` : `Silence ${ms(state.silence)}`)
                : 'Ravi’s call, ready to run.',
            }}
          />
        );
      }}
      controls={{
        ravi: () => <Transcript run={hesitant(SILENCES.at(-1)!)} note={false} />,
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        silence: ({ state, sync }) => {
          const r = hesitant(state.silence);
          return (
            <>
              <Range
                label="Silence setting"
                values={SILENCES}
                value={state.silence}
                show={ms}
                onChange={v =>
                  sync({ ...state, silence: v, seenS: [...new Set([...state.seenS, v])], view: 'timeline' })
                }
              />
              <table className="tc-ledger" style={{ marginTop: 10 }}>
                <caption>Ravi’s call at each setting you have tried</caption>
                <tbody>
                  {SILENCES.map(v => (
                    <tr key={v} data-silence={v}>
                      <th scope="row">{ms(v)}</th>
                      <td>{state.seenS.includes(v) ? verdict(hesitant(v)) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Transcript run={r} />
              <PlanNote />
            </>
          );
        },
        threshold: ({ state, sync }) => (
          <>
            <Range
              label="Energy threshold"
              values={THRESHOLDS}
              value={state.threshold}
              show={String}
              onChange={v =>
                sync({ ...state, threshold: v, seenT: [...new Set([...state.seenT, v])], view: 'timeline' })
              }
            />
            <table className="tc-ledger" style={{ marginTop: 10 }}>
              <caption>Ravi’s noisy call at each threshold you have tried</caption>
              <tbody>
                {THRESHOLDS.map(v => (
                  <tr key={v} data-threshold={v}>
                    <th scope="row">{v}</th>
                    <td>{state.seenT.includes(v) ? verdict(noisy(v)) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Transcript run={noisy(state.threshold)} />
            <p className="vo-note">The threshold is in this site’s own units: the energy of each 20 ms of the clip.</p>
          </>
        ),
        outcome: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcome()} />
            <Fact id="openai-vad-settings" />
            <Fact id="gemini-silence" />
            <RecordedNote />
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
