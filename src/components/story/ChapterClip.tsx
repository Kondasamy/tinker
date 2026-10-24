// A chapter's opener clip (KTD9): a silent HyperFrames render of the chapter's own scene, in public/video/<module>/.
// Nothing loads or plays until the reader presses play; the lines are always on the page as text, so the clip is
// optional, and a clip that can't load (offline, blocked) leaves its poster and lines. The lines are drawn into the
// frame, so the captions track is offered but off.
import { useState } from 'react';

interface Props {
  module: string;
  chapter: string;
  lines: string[];
}

export default function ChapterClip({ module, chapter, lines }: Props) {
  const [failed, setFailed] = useState(false);
  const base = `/video/${module}/${chapter}`;
  return (
    <figure className="chapter-clip">
      {failed ? (
        <img src={`${base}.jpg`} alt="" width={1280} height={720} />
      ) : (
        <video
          src={`${base}.mp4`}
          poster={`${base}.jpg`}
          preload="none"
          controls
          muted
          playsInline
          width={1280}
          height={720}
          aria-label="Opening clip, silent; its lines are below"
          onError={() => setFailed(true)}
        >
          <track kind="captions" src={`${base}.vtt`} srcLang="en" label="English" />
        </video>
      )}
      <figcaption>
        <ol className="clip-lines">
          {lines.map(l => (
            <li key={l}>{l}</li>
          ))}
        </ol>
      </figcaption>
    </figure>
  );
}
