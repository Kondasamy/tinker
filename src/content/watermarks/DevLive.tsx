// The dev page's live stage (src/dev/watermarks.astro): the reply under the lamp, with rewording open or not.
import { useState } from 'react';
import { REPLY_IDS, UvStage, type Lamp } from './kit';

export default function DevLive({ reword }: { reword: boolean }) {
  const [lamp, setLamp] = useState<Lamp>(0);
  const [ids, setIds] = useState(REPLY_IDS);
  return (
    <UvStage
      ids={ids}
      lamp={lamp}
      onLamp={setLamp}
      onIds={reword ? setIds : undefined}
      caption={reword ? 'Swap a token.' : 'Sweep the lamp.'}
    />
  );
}
