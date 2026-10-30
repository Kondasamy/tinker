// The dev page's live stage (src/dev/choosing-models.astro): the steelyard with all three poises.
import { useState } from 'react';
import { rowsOf } from '../../lib/choosing-models/score';
import { qualityText } from '../../lib/choosing-models/story';
import { NONE, SteelyardStage } from './kit';

const ROWS = rowsOf('larkspur');

export default function DevLive() {
  const [w, setW] = useState(NONE);
  return (
    <SteelyardStage
      rows={ROWS}
      weights={w}
      onWeights={setW}
      quality={qualityText('larkspur')}
      pills={qualityText('larkspur').pills}
      caption="Slide a poise."
    />
  );
}
