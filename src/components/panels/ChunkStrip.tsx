// Where the chunker cut the document that holds the key sentence. Shading alternates per chunk, darker where
// chunks overlap; retrieved chunks are underlined; a hard cut right after a negation is marked red.
import type { Outcome } from '../canvas/state';
import type { RagIndex } from '../../lib/rag/load';
import { locate } from '../../lib/rag/engine';
import { cutsIn } from './logic';
import './panels.css';

const AROUND = 24; // words of context shown each side of the key sentence

export default function ChunkStrip({
  out,
  index,
  sentence,
}: {
  out: Outcome | null;
  index: RagIndex | null;
  sentence: string;
}) {
  const cfg = out && index?.get(out.config.file);
  const hit = index && locate(index, sentence)[0];
  if (!cfg || !hit || !index) return <p className="note">Preparing these chunks…</p>;
  const [di, gs, ge] = hit;
  const doc = index.corpus[di];
  const from = Math.max(0, gs - AROUND),
    to = Math.min(doc.words.length, ge + AROUND);
  const spans: { id: number; s: number; e: number }[] = [];
  for (let c = 0; c < cfg.N; c++)
    if (cfg.ranges[c * 3] === di) spans.push({ id: c, s: cfg.ranges[c * 3 + 1], e: cfg.ranges[c * 3 + 2] });
  const cuts = cutsIn(
    spans.map(x => [x.s, x.e]),
    doc.words,
    from,
    to,
  );
  const got = new Set(out!.record?.context.map(c => c.id));
  const split = cuts.filter(c => c.hard && c.at > gs && c.at < ge);
  const neg = split.find(c => c.negation);

  const words = [];
  for (let p = from; p < to; p++) {
    const cut = cuts.find(c => c.at === p);
    if (cut)
      words.push(
        <span
          key={`c${p}`}
          className={`cut${cut.hard ? ' hard' : ''}${cut.negation ? ' neg' : ''}`}
          data-negation-cut={cut.negation || undefined}
          aria-hidden="true"
        >
          │
        </span>,
      );
    const cover = spans.filter(x => x.s <= p && x.e > p);
    const cls = [
      cover.length > 1 ? 'ov' : spans.indexOf(cover[0]) % 2 ? 'alt' : 'base',
      cover.some(x => got.has(x.id)) && 'got',
      p >= gs && p < ge && 'key',
    ];
    words.push(
      <span key={p} className={cls.filter(Boolean).join(' ')}>
        {doc.words[p]}
      </span>,
      ' ',
    );
  }

  return (
    <div className="chunk-strip">
      <p className="note">
        {doc.title} · {cfg.N} chunks across all documents · {out!.config.file.replace('.bin', '')}
      </p>
      <p className="strip">
        {from > 0 && '… '}
        {words}
        {to < doc.words.length && ' …'}
      </p>
      <p className="verdict-line" role="note" data-testid="cut-summary">
        {neg ? (
          <>
            <span className="dot neg" /> The cut falls right after “{doc.words[neg.at - 1]}”, splitting the key sentence
            in two.
          </>
        ) : split.length ? (
          <>
            <span className="dot hard" /> A cut splits the key sentence.
          </>
        ) : (
          <>
            <span className="dot ok" /> No cut splits the key sentence.
          </>
        )}
      </p>
      <p className="legend">
        <span className="base">chunk</span> <span className="alt">next chunk</span> <span className="ov">overlap</span>{' '}
        <span className="got">retrieved</span> <span className="key">key sentence</span>
      </p>
    </div>
  );
}
