// The recap (R11, R14) and, with `warmup`, the short warm-up on a module intro (R13). One question at a time with Quiz;
// every answer is recorded (recordRecall), and the summary shows only after the last one.
// Everything reads localStorage, so the first render (also the server's) shows nothing and the effect fills it in.
import { useEffect, useRef, useState, type ReactNode, type Ref } from 'react';
import Quiz from './Quiz';
import { recapPool, resumeAttempt, warmupItems, UNSURE, type Attempt, type RecallItem } from '../../lib/recall';
import { completed, completedAt, loadAttempt, recallResults, recordRecall, saveAttempt } from '../../lib/progress';
import { chapterHref, moduleOf } from '../../lib/modules';
import './recap.css';

interface Props {
  module: string;
  bank: RecallItem[];
  /** the warm-up: up to three due items, a collapsed card, nothing at all when none is due */
  warmup?: boolean;
}

const newSeed = () => Math.floor(Math.random() * 2 ** 32);
const plural = (n: number, one: string, many = one + 's') => `${n} ${n === 1 ? one : many}`;

export default function Recap(props: Props) {
  return props.warmup ? <Warmup {...props} /> : <Full {...props} />;
}

function Full({ module, bank }: Props) {
  const m = moduleOf(module);
  const [att, setAtt] = useState<Attempt | 'empty' | 'none' | null>(null);
  const [retook, setRetook] = useState(false);
  useEffect(() => {
    const done = completed(module);
    if (!done.length) return setAtt('empty');
    if (!recapPool(bank, done).length) return setAtt('none');
    const saved = loadAttempt(module),
      a = resumeAttempt(saved, bank, done, newSeed());
    if (a !== saved) saveAttempt(module, a); // a resumed attempt is already stored as it is
    setAtt(a);
  }, [module, bank]);
  const go = (a: Attempt) => {
    saveAttempt(module, a);
    setAtt(a);
  };

  if (att === null) return <div className="recap" />;
  if (att === 'empty')
    return (
      <div className="recap">
        <h2>Finish a chapter first</h2>
        <p>The recap asks about chapters you have finished, and you have not finished one yet.</p>
        <p className="row">
          <a className="btn primary" href={chapterHref(module, m.chapters[0].id)}>
            Start chapter 1 →
          </a>
        </p>
      </div>
    );
  if (att === 'none')
    return (
      <div className="recap">
        <h2>No questions yet</h2>
        <p>There are no recap questions for the chapters you have finished yet. Check back after the next chapter.</p>
        <p className="row">
          <a className="btn" href={`/${module}/`}>
            Back to {m.title} →
          </a>
        </p>
      </div>
    );
  const items = att.ids.map(id => bank.find(i => i.id === id)!);
  return (
    <Questions
      module={module}
      items={items}
      pos={att.pos}
      key={att.seed}
      focusFirst={retook}
      onNext={() => go({ ...att, pos: att.pos + 1 })}
      end={
        <button
          type="button"
          className="btn primary"
          onClick={() => {
            setRetook(true);
            go(resumeAttempt(undefined, bank, completed(module), newSeed()));
          }}
        >
          Retake in a new order
        </button>
      }
    />
  );
}

function Warmup({ module, bank }: Props) {
  const m = moduleOf(module);
  const [items, setItems] = useState<RecallItem[]>([]);
  const [next, setNext] = useState(-1);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(0);
  const [hidden, setHidden] = useState(false);
  const box = useRef<HTMLElement>(null);
  useEffect(() => {
    const due = warmupItems(bank, completedAt(module), recallResults(module), Date.now());
    const done = completed(module);
    setItems(due);
    setNext(m.chapters.findIndex(c => !done.includes(c.id)));
    // the home page's Continue links here when a warm-up is due
    const hash = () => {
      if (due.length && location.hash === '#warmup') setOpen(true);
    };
    hash();
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, [module, bank, m]);
  useEffect(() => {
    if (open) box.current?.scrollIntoView({ block: 'start' });
  }, [open]);

  if (!items.length || hidden) return null;
  // skipping leaves the warm-up due for the next visit: nothing is saved
  const skip =
    next >= 0 ? (
      <a className="btn" href={chapterHref(module, m.chapters[next].id)}>
        Skip to chapter {next + 1} →
      </a>
    ) : (
      <button type="button" className="btn" onClick={() => setHidden(true)}>
        Skip for now
      </button>
    );
  return (
    <section className="recap warmup" aria-labelledby="warmup-h" ref={box}>
      <p className="kicker">Warm-up</p>
      <h3 id="warmup-h">{plural(items.length, 'quick question')} from chapters you finished</h3>
      <p className="lead">Recalling what you learned after a break is what makes it stick. Nothing is graded.</p>
      {open ? (
        <>
          <Questions
            module={module}
            items={items}
            pos={pos}
            onNext={() => setPos(p => p + 1)}
            focusFirst
            short
            end={
              next >= 0 && (
                <a className="btn primary" href={chapterHref(module, m.chapters[next].id)}>
                  Continue: chapter {next + 1} →
                </a>
              )
            }
          />
          {pos < items.length && <p className="row">{skip}</p>}
        </>
      ) : (
        <p className="row">
          <button type="button" className="btn primary" aria-expanded="false" onClick={() => setOpen(true)}>
            Start the warm-up
          </button>
          {skip}
        </p>
      )}
    </section>
  );
}

interface QProps {
  module: string;
  items: RecallItem[];
  pos: number;
  onNext: () => void;
  /** shown under the summary (Retake, or the warm-up's way on) */
  end: ReactNode;
  focusFirst?: boolean;
  short?: boolean;
}

function Questions({ module, items, pos, onNext, end, focusFirst, short }: QProps) {
  const [pick, setPick] = useState<number | null>(null);
  const head = useRef<HTMLElement>(null);
  const moved = useRef(focusFirst);
  // after "Next" (or opening the warm-up), focus the new question's count, or the summary heading
  useEffect(() => {
    if (moved.current) head.current?.focus();
    moved.current = true;
  }, [pos]);
  const H = short ? 'h4' : 'h2';

  if (pos >= items.length) {
    const r = recallResults(module),
      chapters = moduleOf(module).chapters;
    const right = items.filter(i => r[i.id]?.right),
      unsure = items.filter(i => r[i.id]?.unsure);
    const missed = items.filter(i => !r[i.id]?.right && !r[i.id]?.unsure);
    const ch = (id: string) => chapters.findIndex(c => c.id === id);
    const back = [...new Set(missed.map(i => i.chapter))].sort((a, b) => ch(a) - ch(b));
    return (
      <div className="recap summary">
        <H tabIndex={-1} ref={head as Ref<HTMLHeadingElement>}>
          {right.length === items.length
            ? `All ${plural(items.length, 'answer')} right. You remembered every one.`
            : 'How you did'}
        </H>
        <dl className="tally">
          <div>
            <dt>{right.length}</dt>
            <dd>right</dd>
          </div>
          <div>
            <dt>{unsure.length}</dt>
            <dd>not sure</dd>
          </div>
          <div>
            <dt>{missed.length}</dt>
            <dd>missed</dd>
          </div>
        </dl>
        {back.length > 0 && (
          <>
            <p>Worth another look:</p>
            <ul className="missed">
              {back.map(id => (
                <li key={id}>
                  <a href={chapterHref(module, id)}>
                    Chapter {ch(id) + 1}: {chapters[ch(id)]?.title ?? id}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="row">{end}</p>
      </div>
    );
  }

  const it = items[pos],
    last = pos === items.length - 1;
  const answer = (right: boolean, unsure = false) => {
    if (pick !== null) return;
    recordRecall(module, it.id, { right, unsure });
  };
  return (
    <div className="recap" data-item={it.id}>
      <p className="count" tabIndex={-1} ref={head as Ref<HTMLParagraphElement>}>
        Question {pos + 1} of {items.length}
      </p>
      <Quiz
        key={it.id}
        question={it.question}
        options={it.options}
        correct={it.correct}
        why={it.why}
        explanation={it.why[it.correct]}
        unsure
        locked
        value={pick}
        onAnswer={(right, i) => {
          answer(right);
          setPick(i);
        }}
        onUnsure={() => {
          answer(false, true);
          setPick(UNSURE);
        }}
      />
      {pick !== null && (
        <p className="row">
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              setPick(null);
              onNext();
            }}
          >
            {last ? 'See how you did →' : 'Next question →'}
          </button>
        </p>
      )}
    </div>
  );
}
