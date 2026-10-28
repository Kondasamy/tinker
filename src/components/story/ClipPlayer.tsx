// A clip button and its caption (KTD11, R18). Every clip plays through the one shared player (src/lib/voice/audio.ts):
// nothing plays until the reader presses Play, starting a clip stops any other, and unmounting stops this one. The
// caption is always in the page, so a reader with the sound off (or a clip that won't load) reads the line instead.
import { useEffect, useSyncExternalStore } from 'react';
import { clipStatus, playClip, playing, stopClip, subscribe } from '../../lib/voice/audio';

interface Props {
  clip: string;
  who: string;
  caption: string;
}

export default function ClipPlayer({ clip, who, caption }: Props) {
  const status = useSyncExternalStore(
    subscribe,
    () => clipStatus(clip),
    () => 'idle' as const,
  );
  useEffect(
    () => () => {
      if (playing() === clip) stopClip();
    },
    [clip],
  );
  const on = status === 'playing' || status === 'loading';
  return (
    <div className="clip" data-clip={clip} data-state={status}>
      <button
        type="button"
        className="chip clip-btn"
        aria-pressed={on}
        aria-busy={status === 'loading'}
        aria-label={`${on ? 'Stop' : 'Play'} ${who}’s line`}
        onClick={() => (on ? stopClip() : playClip(clip))}
      >
        <span aria-hidden="true">{status === 'loading' ? '…' : on ? '■' : '▶'}</span>{' '}
        {status === 'loading' ? 'Loading' : on ? 'Stop' : 'Play'}
      </button>
      <p className="clip-caption">
        <strong>{who}:</strong> “{caption}”
      </p>
      {status === 'error' && (
        <p className="clip-note" role="status">
          Sound unavailable: the words are above.
        </p>
      )}
    </div>
  );
}
