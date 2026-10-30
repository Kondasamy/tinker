// Before GenAI kit: the pieces several chapters share. The stage puts Larkspur's help counter (kioskScene) one tab
// from the flat view of the three bots side by side, both read off one run (bots.ts), so they never disagree; chapter
// 3 hands it the predictive-AI picture instead. The message and the replies are sentences, so they live in the story
// column (Transcript), never in the picture (R17). Every string here is React text. Every chapter shows at least one
// cited fact (tests/unit/research-coverage.test.ts); a toy number that isn't a real one says so beside it (ToyNote).
import { useId, useState, type ReactNode } from 'react';
import Cite from '../../components/story/Cite';
import IsoStage from '../../lib/iso/IsoStage';
import { filterFor } from '../../lib/iso/core.js';
import {
  KIOSK_BOARD,
  kioskFlat,
  kioskFlatLabel,
  kioskLabel,
  kioskScene,
  outcomes,
  PREDICT_BOARD,
  predictLabel,
  predictScene,
  type PredictOpts,
  STATIONS,
} from '../../components/scenes/kioskScene';
import type { Say } from '../../components/story/steps';
import type { Run } from '../../lib/before-genai/bots';
import { fact } from '../../lib/before-genai/facts';
import { chapterHref, moduleOf } from '../../lib/modules';
import { useModel } from '../transformers/kit';
import type { Model } from '../../lib/lm/model';
import META from '../../../public/data/lm/meta.json' with { type: 'json' };
import { useNarrow } from '../tool-calling/kit';
import '../tool-calling/tools.css';
import '../../components/scenes/flat.css';
import './before-genai.css';

/** A cited fact from data/before-genai/facts.json, with its source and the day it was checked. */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}

/** Said beside any toy or hand-set number, so the reader can tell it from the real figure next to it. */
export const ToyNote = () => <p className="note">A toy system with hand-set numbers, not a real one.</p>;

/** Said wherever Larkspur mini's size shows: its own count, labelled a toy, beside GPT-3's real one (KTD5). */
export const MINI_NOTE = `Larkspur mini is a toy: ${META.model.params.toLocaleString('en-US')} learned numbers, trained ahead of time on Larkspur’s documents. GPT-3 has ${fact('few-shot').value} billion.`;
export const MiniNote = () => <p className="note">{MINI_NOTE}</p>;

/** `children(model)` once Larkspur mini has loaded (a function, so nothing reads the model before then); while it
 * loads, a status; if the load failed, Retry. */
export function MiniGate({ children }: { children: (model: Model) => ReactNode }) {
  const { model, failed, retry } = useModel();
  if (model) return children(model);
  return failed ? (
    <div className="tc-status" role="alert">
      <p>Couldn’t load Larkspur mini.</p>
      <button type="button" className="chip" onClick={retry}>
        Retry
      </button>
    </div>
  ) : (
    <p className="tc-status" role="status">
      Loading Larkspur mini…
    </p>
  );
}

/** A chapter that goes deeper, as [module id, chapter index]: read from the registry, so a test can hold it live. */
export type Deeper = readonly [string, number];
/** The last reveal's hand-off to the chapter that explains how (R15). */
export function GoDeeper({ to }: { to: readonly Deeper[] }) {
  return (
    <p className="note">
      {'Go deeper: '}
      {to.map(([m, i], k) => {
        const mod = moduleOf(m),
          ch = mod.chapters[i];
        return (
          <span key={m}>
            {k > 0 && ' · '}
            <a href={chapterHref(m, ch.id)}>{`${mod.title}, chapter ${i + 1}: ${ch.title}`}</a>
          </span>
        );
      })}
    </p>
  );
}

/** The flat view: the three bots' lanes side by side (stacked under 600px), pills only. */
export function BotsFlat({ run }: { run: Run }) {
  const prefix = `bg${useId().replace(/[^\w-]/g, '')}-`,
    label = kioskFlatLabel(run);
  const svg = (s: { svg: string; w: number; h: number }, cls: string, id: string) => (
    <svg className={cls} viewBox={`0 0 ${s.w} ${s.h}`} role="img" aria-label={label}>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: the ink filter, built from numbers */}
      <defs dangerouslySetInnerHTML={{ __html: filterFor(1, prefix + id) }} />
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: SVG markup the kit built, every string escaped (esc) */}
      <g filter={`url(#${prefix + id})`} dangerouslySetInnerHTML={{ __html: s.svg }} />
    </svg>
  );
  return (
    <figure className="flat bg-flat">
      {svg(kioskFlat(run), 'flat-wide', 'w')}
      {svg(kioskFlat(run, true), 'flat-phone', 'p')}
    </figure>
  );
}

export type View = 'scene' | 'flat';
const FILL = { height: '100%' };
/** The chapters' stage: the help counter (default) or the bots side by side, one at a time. With `predict`, the
 * picture is chapter 3's spam filter and shelf, and there is no second view. `children` go under the frame. */
export function BeforeGenaiStage({
  run,
  predict,
  say,
  caption,
  view: kept,
  onView,
  children,
}: {
  run: Run;
  predict?: Omit<PredictOpts, 'scale' | 'say'>;
  say?: Say;
  caption: ReactNode;
  view?: View;
  onView?: (v: View) => void;
  children?: ReactNode;
}) {
  const [own, setOwn] = useState<View>('scene');
  const view = predict ? 'scene' : (kept ?? own),
    setView = onView ?? setOwn,
    scale = useNarrow() ? 2 : 1.2;
  return (
    <div className="tc-stage bg-stage">
      {!predict && (
        <div className="tc-tabs" role="group" aria-label="Show in the picture">
          <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
            Picture
          </button>
          <button type="button" className="chip" aria-pressed={view === 'flat'} onClick={() => setView('flat')}>
            Side by side
          </button>
        </div>
      )}
      <div className="tc-frame">
        {predict ? (
          <IsoStage
            board={PREDICT_BOARD}
            style={FILL}
            scene={predictScene({ ...predict, say, scale })}
            label={predictLabel(predict)}
          />
        ) : view === 'flat' ? (
          <BotsFlat run={run} />
        ) : (
          <IsoStage
            board={KIOSK_BOARD}
            style={FILL}
            scene={kioskScene({ run, say, scale })}
            label={kioskLabel({ run })}
          />
        )}
      </div>
      {children}
      <p className="tc-caption">
        <span className="txt">{caption}</span>
      </p>
    </div>
  );
}

const SAID = { answered: '', 'fell back': ' (fell back)', 'not recorded': '' } as const;
/** The story column's transcript: the customer's message and each bot's reply, quoted, as text. `bots` limits which
 * bots speak (default all three); GenAI's line names its recorded model, or says it isn't recorded yet. */
export function Transcript({ run, bots }: { run: Run; bots?: readonly (typeof STATIONS)[number]['id'][] }) {
  const out = outcomes(run),
    shown = STATIONS.filter(s => !bots || bots.includes(s.id));
  const reply = {
    script: run.scripted.reply,
    sorter: run.intent.reply,
    genai: run.genai.recorded ? run.genai.reply : '',
  };
  return (
    <dl className="bg-transcript">
      <div className="bg-line customer">
        <dt>Customer</dt>
        <dd>
          <q>{run.message.text}</q>
        </dd>
      </div>
      {shown.map(s => (
        <div key={s.id} className={`bg-line ${s.id}`} data-outcome={out[s.id]}>
          <dt>{`${s.name}${SAID[out[s.id]]}`}</dt>
          <dd>
            {run.genai.recorded || s.id !== 'genai' ? (
              <q>{reply[s.id]}</q>
            ) : (
              <span className="note">Not recorded yet.</span>
            )}
            {s.id === 'genai' && run.genai.recorded && (
              <span className="bg-model">{` Recorded from ${run.genai.model}, ${run.genai.date}.`}</span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
