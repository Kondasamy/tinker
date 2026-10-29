// The dev page's live stage (src/dev/fairness.astro): the gate with its bar ranges, linked or split.
import { useState } from 'react';
import { GateStage, START_BARS } from './kit';

export default function DevLive({ linked }: { linked: boolean }) {
  const [bars, setBars] = useState(START_BARS);
  return <GateStage bars={bars} onBars={setBars} linked={linked} caption="Slide a bar." />;
}
