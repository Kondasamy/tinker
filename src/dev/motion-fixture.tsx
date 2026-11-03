// The living-scene sample (dev page /dev/motion and tests/unit/motion.test.ts): a crate that slides between two pads and
// opens its lid, one draggable hit target with its twin buttons, and a close-up on the crate's pad. The pattern a
// module's stage follows: scene(prev, state, t, view) → { still, moving }, the still memoised per target state.
import { useMemo, useState } from 'react';
import IsoStage, { type SceneCtx } from '../lib/iso/IsoStage';
import HitLayer, { type Drag, type Hit } from '../lib/iso/hits';
import { box, on, PALS, PZ, rectUV, shape, tag } from '../lib/iso/core.js';
import { BH } from '../lib/iso/shared';
import {
  closeUpZoom,
  lerpPt,
  openness,
  pillScale,
  useCloseUp,
  useSceneMotion,
  type Scene,
  type SceneView,
} from '../lib/iso/motion';

export const SAMPLE_BOARD: [number, number, number, number] = [0, 0, 120, 60];
type Pad = 'pad-a' | 'pad-b';
export interface Sample {
  spot: Pad;
  open: boolean;
}
export const SAMPLE_PARTS = ['pad-a', 'pad-b', 'crate'] as const;
const PAD: Record<Pad, number[]> = { 'pad-a': [30, 30], 'pad-b': [90, 30] };
const NAME: Record<Pad, string> = { 'pad-a': 'A', 'pad-b': 'B' };
const footprint = (x: number, y: number, r: number, z = BH) => [
  [x - r, y - r, z],
  [x + r, y + r, z + 16],
];
export const SAMPLE_HITS: Hit[] = [
  { part: 'crate', at: footprint(30, 30, 8), kind: 'drag' },
  { part: 'pad-a', at: footprint(30, 30, 12), kind: 'drop' },
  { part: 'pad-b', at: footprint(90, 30, 12), kind: 'drop' },
];

const crate = ([x, y]: number[], open: number) =>
  `<g data-prop="crate">${box(x - 8, y - 8, BH, x + 8, y + 8, BH + 12, PALS.mustard)}${box(x - 8, y - 8, BH + 12 + open * 8, x + 8, y + 8, BH + 14 + open * 8, PALS.tomato)}</g>`;

function art(s: Sample, v: SceneView, withCrate: boolean) {
  return (_: SceneCtx) => {
    let out = '';
    for (const p of ['pad-a', 'pad-b'] as Pad[]) {
      const [x, y] = PAD[p];
      out += `<g data-prop="${p}">${shape(on(PZ(BH + 0.1), rectUV(x - 12, y - 12, x + 12, y + 12)), PALS.mint.l)}</g>`;
    }
    if (withCrate) out += crate(PAD[s.spot], +s.open);
    for (const p of ['pad-a', 'pad-b'] as Pad[]) {
      const k = pillScale(p, v);
      if (k) out += tag([...PAD[p], BH + 20], 0, -16, NAME[p], s.spot === p, k);
    }
    return out;
  };
}

/** The sample at rest: what IsoStage draws for state s with no motion and no zoom. */
export const sampleStill = (s: Sample) => art(s, { zoomT: 0 }, true);

/** The sample's living scene: mid-motion the crate is in flight, drawn only in the moving layer. */
export const sampleScene: Scene<Sample> = (prev, s, t, v) =>
  t >= 1
    ? { still: art(s, v, true), moving: '' }
    : {
        still: art(s, v, false),
        moving: () => crate(lerpPt(PAD[prev.spot], PAD[s.spot], t), openness(prev.open, s.open, t)),
      };

const other = (p: Pad): Pad => (p === 'pad-a' ? 'pad-b' : 'pad-a');

export default function MotionFixture() {
  const [s, setS] = useState<Sample>({ spot: 'pad-a', open: false });
  const [closeUp, setCloseUp] = useState(false);
  const [status, setStatus] = useState('The crate sits on pad A, lid shut.');
  const [drag, setDrag] = useState<Drag | null>(null);
  const { prev, t } = useSceneMotion(s, 700);
  const target = useMemo(
    () => (closeUp ? closeUpZoom(SAMPLE_BOARD, footprint(...(PAD[s.spot] as [number, number]), 12)) : undefined),
    [closeUp, s.spot],
  );
  const { zoom, zoomT } = useCloseUp(target, s);
  const view: SceneView = { closeUp: closeUp ? [s.spot] : undefined, zoomT };
  const sc = sampleScene(prev, s, t, view);
  // the filtered still changes only with the target state, the end of the motion and zoom in or out
  const still = useMemo(() => (drag ? art(s, view, false) : sc.still), [s, t >= 1, zoomT > 0, !!drag]);
  const moving = drag
    ? () => `<g transform="translate(${drag.dx.toFixed(1)} ${drag.dy.toFixed(1)})">${crate(PAD[s.spot], +s.open)}</g>`
    : sc.moving;

  /** the one handler: the twin buttons and the drag both come here */
  const act = (part: string, to?: string) => {
    setCloseUp(false);
    if (part !== 'crate' || !to || to === s.spot) return;
    if (s.open) {
      const why = 'Shut the lid before moving the crate.';
      setStatus(why);
      return why;
    }
    setS({ ...s, spot: to as Pad });
    setStatus(`The crate slid to pad ${NAME[to as Pad]}.`);
  };
  const hits = SAMPLE_HITS.map(h =>
    h.part === 'crate' ? { ...h, at: footprint(...(PAD[s.spot] as [number, number]), 8) } : h,
  );

  return (
    <div className="motion-fixture">
      <IsoStage board={SAMPLE_BOARD} scene={still} moving={moving} zoom={zoom} label="A crate on two pads">
        <HitLayer
          board={SAMPLE_BOARD}
          hits={hits}
          busy={t < 1 || !!zoom}
          act={act}
          legal={() => !s.open}
          onDrag={setDrag}
          pulse={s}
        />
      </IsoStage>
      <div className="twins">
        <button type="button" onClick={() => act('crate', other(s.spot))}>
          Move to pad {NAME[other(s.spot)]}
        </button>
        <button
          type="button"
          onClick={() => {
            setCloseUp(false);
            setS({ ...s, open: !s.open });
            setStatus(s.open ? 'The lid is shut.' : 'The lid is open.');
          }}
        >
          {s.open ? 'Shut lid' : 'Open lid'}
        </button>
        <button type="button" onClick={() => setCloseUp(!closeUp)}>
          {closeUp ? 'Pull back' : 'Close up'}
        </button>
      </div>
      <p role="status">{status}</p>
    </div>
  );
}
