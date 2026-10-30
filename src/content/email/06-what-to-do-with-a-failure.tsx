// Chapter 6: what to do with a failure. DMARC asks for a pass aligned with the From domain: the fake invoice's SPF pass
// is for the forger's domain, so it fails, and the reader sets Larkspur's policy to reject. Then the forwarded copy:
// SPF fails at the forwarder, DKIM's seal survives, one aligned pass is enough (pinned). Last, the spam score: a prize
// draw passes DMARC for its own domain and still lands in junk on its words.
import StepRunner from '../../components/story/StepRunner';
import type { Step } from '../../components/story/steps';
import Quiz from '../../components/quiz/Quiz';
import Predict from '../../components/quiz/Predict';
import { Outcome } from '../tool-calling/kit';
import { POST_PARTS } from '../../components/scenes/postScene';
import type { Policy, Records } from '../../lib/email/dns';
import { domainOf, fromOf, parse } from '../../lib/email/parse';
import { SPAM_SET, scoreText, spamWords } from '../../lib/email/spam';
import { DOMAIN, FORGER, FORWARDER, MESSAGES, RECORDS, verdictOf, type MessageId } from '../../lib/email/story';
import { POLICIES } from '../../lib/email/workbench';
import { nextOf } from '../../lib/modules';
import { UNSURE } from '../../lib/recall';
import { DemoNote, EmailStage, Fact, MessagePick, type View } from './kit';

const MODULE = 'email',
  ID = '06-what-to-do-with-a-failure';
export const PARTS = POST_PARTS;
export const recOf = (dmarc: Policy): Records => ({ ...RECORDS.dkim, dmarc });
const SHOW = { spf: true, dkim: true, dmarc: true, sorted: true };
export const PRIZE = verdictOf('prize', recOf('reject'));
const PRIZE_FROM = domainOf(fromOf(parse(MESSAGES.prize)));

export const P1 = {
  question: 'Under reject, the forwarded confirmation fails SPF. What happens to it?',
  options: ['Inbox: DKIM’s seal still aligns', 'Bounced: SPF failed', 'Junk: forwarded mail is suspect'],
};
const FATES = ['inbox', 'bounced', 'junk'];
export const outcomeOf = () => FATES.indexOf(verdictOf('forwarded', recOf('reject')).fate);

export const QUIZ = {
  question:
    'A scammer sends from his own domain, passing SPF and DKIM for it, with your company in From. Your DMARC policy is reject. What happens?',
  options: [
    'It bounces: neither pass is for your domain',
    'It lands: it passed both checks',
    'It goes to junk whatever the policy',
  ],
  correct: 0,
  explanation: 'DMARC counts only passes aligned with the From domain, and yours says reject.',
  why: [
    'Right: his passes are for his own domain, so DMARC fails for yours and your policy bounces it.',
    'Both passes were for the scammer’s domain; DMARC asks about the one in From.',
    'Reject means bounce; junk is what quarantine asks for.',
  ],
};

interface S {
  dmarc: Policy;
  msg: MessageId;
  view: View;
  p1: number | null;
  quiz: number | null;
}

export const STEPS: Step<S>[] = [
  {
    id: 'align',
    focus: 'pick',
    visibleControls: ['pick'],
    narration: 'DMARC asks one more thing: did SPF or DKIM pass for the From line’s own domain? That’s alignment.',
    act: 'Pick the fake invoice.',
    say: { block: 'dmarc', text: 'Alignment' },
    predicate: s => s.msg === 'forged',
  },
  {
    id: 'policy',
    focus: 'policy',
    visibleControls: ['policy'],
    narration: `DMARC fails: SPF passed for ${FORGER}, not ${DOMAIN}. Larkspur’s policy says what receivers do next.`,
    act: 'Set the policy to reject.',
    predicate: s => s.msg === 'forged' && s.dmarc === 'reject',
  },
  {
    id: 'predict',
    focus: 'p1',
    visibleControls: ['p1'],
    narration: `Bounced. Now a copy forwarded through ${FORWARDER}, whose server isn’t on Larkspur’s SPF list.`,
    act: 'Predict its fate under reject.',
    say: { block: 'bounce', text: 'Bounced' },
    predicate: s => s.p1 !== null,
  },
  {
    id: 'forward',
    focus: 'pick',
    visibleControls: ['p1', 'pick'],
    narration: 'Your pick is locked.',
    act: 'Pick the forwarded copy.',
    predicate: s => s.p1 !== null && s.msg === 'forwarded' && s.dmarc === 'reject',
  },
  {
    id: 'spam',
    focus: 'pick',
    visibleControls: ['out1', 'pick'],
    narration:
      'Inbox: the seal survived the trip, and one aligned pass is enough. Last comes a spam score, from the words.',
    act: 'Pick the prize draw.',
    say: { block: 'dkim', text: 'Seal survived' },
    predicate: s => s.msg === 'prize',
  },
  {
    id: 'quiz',
    focus: 'quiz',
    visibleControls: ['bulk', 'quiz'],
    narration: `DMARC passes for ${PRIZE_FROM}, yet it scores ${scoreText(PRIZE.score)}: junk. Passing proves who sent it, not that you want it.`,
    act: 'One question to finish.',
    say: { block: 'spam', text: 'Spammy words' },
    predicate: s => s.quiz === QUIZ.correct || s.quiz === UNSURE,
    hint: 'Whose domain did his passes vouch for?',
  },
];

export default function WhatToDoWithAFailure() {
  return (
    <StepRunner<S>
      module={MODULE}
      chapter={ID}
      steps={STEPS}
      initial={{ dmarc: 'none', msg: 'invoice', view: 'scene', p1: null, quiz: null }}
      next={nextOf(MODULE, ID)}
      stage={({ state, sync, say }) => {
        const rec = recOf(state.dmarc),
          v = verdictOf(state.msg, rec),
          words = spamWords(parse(MESSAGES[state.msg]));
        return (
          <EmailStage
            id={state.msg}
            rec={rec}
            verdict={v}
            show={{ ...SHOW, spam: state.msg === 'prize' }}
            say={say}
            view={state.view}
            onView={view => sync({ ...state, view })}
            caption={`DMARC policy: ${state.dmarc}. ${
              words.length ? `Spammy words: ${words.join(', ')}.` : `Envelope domain: ${v.spfDomain}.`
            }`}
          />
        );
      }}
      controls={{
        pick: ({ state, apply }) => (
          <MessagePick
            ids={['invoice', 'forged', 'forwarded', 'prize']}
            value={state.msg}
            onPick={msg => apply({ ...state, msg })}
          />
        ),
        policy: ({ state, apply }) => (
          <fieldset className="em-row">
            <legend>Larkspur’s DMARC policy</legend>
            {POLICIES.map(p => (
              <label key={p}>
                <input
                  type="radio"
                  name="em-policy"
                  checked={state.dmarc === p}
                  onChange={() => apply({ ...state, dmarc: p })}
                />{' '}
                {p}
              </label>
            ))}
            <p className="em-record">{`_dmarc.${DOMAIN}: v=DMARC1; p=${state.dmarc}`}</p>
          </fieldset>
        ),
        p1: ({ state, apply }) => <Predict {...P1} value={state.p1} onPredict={i => apply({ ...state, p1: i })} />,
        out1: ({ state }) => (
          <>
            <Outcome {...P1} prediction={state.p1} outcome={outcomeOf()} />
            <Fact id="dmarc" />
          </>
        ),
        bulk: () => (
          <>
            <p className="note em-note">{`A toy spam filter: it counts words over ${SPAM_SET} hand-written messages. Real filters learn from far more, and watch how often people report a sender:`}</p>
            <Fact id="spam-rate" />
            <Fact id="yahoo-2024" />
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
