// The dev page's live stages (src/dev/prompts.astro): clip cards in a chapter, or chapter 1's live continuation.
import { useState } from 'react';
import { START } from '../../lib/prompts/assemble';
import { TICKETS, type ModelId } from '../../lib/prompts/cards';
import { DocketStage, MINI_PROMPTS, MiniStage } from './kit';

const ALL = TICKETS.map(t => t.id);

export default function DevLive({ chapter }: { chapter: string }) {
  const [d, setD] = useState(START[chapter]);
  const [model, setModel] = useState<ModelId>('main');
  const [prompt, setPrompt] = useState(MINI_PROMPTS[0]);
  if (!START[chapter]) return <MiniStage prompt={prompt} onPrompt={setPrompt} caption="Larkspur mini, live." />;
  return (
    <DocketStage
      chapter={chapter}
      docket={d}
      onDocket={setD}
      tickets={chapter >= '06' ? ALL : undefined}
      model={model}
      onModel={chapter.startsWith('06') ? setModel : undefined}
      caption="Clip a card."
    />
  );
}
