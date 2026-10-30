// Pieces the Logins and passwords chapters share: the stage (the cloakroom, or the accounts table one tab away, read
// off the same picture; the sign-in steps as lanes in chapter 6), the cracking race (KTD13: a radio group for the
// stored form, a native range for the work factor, Play and Step, one polite read-out), and cited facts. Every
// string is React text here; the cloakroom escapes its pills (esc).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import IsoStage from '../../lib/iso/IsoStage';
import FlatStage from '../../components/scenes/FlatStage';
import type { Lane, Msg } from '../../lib/iso/flat';
import {
  CLOAK_BOARD,
  cloakLabel,
  cloakScene,
  type CloakOpts,
  type Drawer,
  type DrawerState,
} from '../../components/scenes/cloakScene';
import { ACCOUNTS, LEAKED, accountOf, fingerprint, type Account } from '../../lib/logins/store';
import { FORM_NAME, LAST, TICKS, WORK, boardAt, type Form } from '../../lib/logins/race';
import { fact } from '../../lib/logins/facts';
import { useNarrow } from '../tool-calling/kit';
import Cite from '../../components/story/Cite';
import type { Say } from '../../components/story/steps';
import '../encryption/encryption.css';
import './logins.css';

// ---- numbers in words ----

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹';
/** A guess count a reader can say: 22 billion, or 1.9 × 10¹⁵ past a trillion. */
export function bigNumber(n: number): string {
  if (n < 1000) return String(Math.round(n));
  const names: [number, string][] = [
    [1e12, 'trillion'],
    [1e9, 'billion'],
    [1e6, 'million'],
    [1e3, 'thousand'],
  ];
  if (n >= 1e15) {
    const e = Math.floor(Math.log10(n));
    return `${(n / 10 ** e).toFixed(1)} × 10${[...String(e)].map(d => SUP[Number(d)]).join('')}`;
  }
  const [k, w] = names.find(([k]) => n >= k)!;
  return `${Number((n / k).toPrecision(3))} ${w}`;
}

// ---- the cabinet ----

const STATE: Record<Form, DrawerState> = { plain: 'plain', sha256: 'hashed', salted: 'salted', pbkdf2: 'slow' };
/** What the table keeps for an account in a form, as the accounts view shows it. */
export const storedOf = (a: Account, f: Form) =>
  f === 'pbkdf2' ? 'a slow, salted fingerprint' : f === 'plain' ? a.password : `${fingerprint(a, f).slice(0, 12)}…`;

/** One drawer per account in a stored form; cracked ones turn tomato, and those just cracked pop. */
export function drawersOf(f: Form, cracked: readonly string[] = [], fresh: readonly string[] = []): Drawer[] {
  return ACCOUNTS.map(a => ({
    id: a.id,
    state: cracked.includes(a.id) ? 'cracked' : STATE[f],
    stored: storedOf(a, f),
    fresh: fresh.includes(a.id),
  }));
}

/** The race's board at a tick, as the cloakroom: the thief holds the table, the cabinet counts what has cracked. */
export function raceScene(f: Form, work: number, tick: number): Omit<CloakOpts, 'scale' | 'say'> {
  const now = boardAt(f, work, tick).cracked,
    before = tick > 0 ? boardAt(f, work, tick - 1).cracked : [];
  return {
    drawers: drawersOf(
      f,
      now,
      now.filter(id => !before.includes(id)),
    ),
    table: `${now.length} OF ${ACCOUNTS.length} CRACKED`,
    tableShort: `${now.length}/${ACCOUNTS.length}`,
    thief: { label: 'HAS THE TABLE', short: 'THIEF', holds: 'table' },
  };
}

// ---- the stage ----

export interface Shown {
  scene: Omit<CloakOpts, 'scale' | 'say'>;
  caption: ReactNode;
  /** chapter 6: the sign-in steps as lanes, in place of the accounts table */
  flow?: { lanes: Lane[]; msgs: Msg[] };
}

const STATE_NAME: Record<DrawerState, string> = {
  plain: 'Readable',
  hashed: 'Fingerprint',
  salted: 'Salted fingerprint',
  slow: 'Slow fingerprint',
  cracked: 'Cracked',
};

/** The accounts table: one row per drawer, from the same picture. */
export function AccountsView({ o }: { o: Shown['scene'] }) {
  return (
    <table className="tc-ledger lg-accounts">
      <caption>The accounts table (demo accounts)</caption>
      <thead>
        <tr>
          <th scope="col">Account</th>
          <th scope="col">Keeps</th>
          <th scope="col">State</th>
        </tr>
      </thead>
      <tbody>
        {o.drawers.map(d => (
          <tr key={d.id} data-account={d.id} data-state={d.state}>
            <th scope="row">{accountOf(d.id).name}</th>
            <td>
              <code>{d.stored ?? ''}</code>
            </td>
            <td className={d.state === 'cracked' ? 'bad' : undefined}>{STATE_NAME[d.state]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** The chapters' stage: the cloakroom (default) or the precise view. The tab is the reader's view, out of progress. */
export function LoginsStage({ show, say }: { show: Shown; say?: Say }) {
  const [view, setView] = useState<'scene' | 'detail'>('scene');
  const scale = useNarrow() ? 2 : 1.2;
  const o: CloakOpts = { ...show.scene, say, scale };
  return (
    <div className="tc-stage lg-stage">
      <div className="tc-tabs" role="group" aria-label="Show in the picture">
        <button type="button" className="chip" aria-pressed={view === 'scene'} onClick={() => setView('scene')}>
          Picture
        </button>
        <button type="button" className="chip" aria-pressed={view === 'detail'} onClick={() => setView('detail')}>
          {show.flow ? 'Sign-in steps' : 'Accounts'}
        </button>
      </div>
      <div className="tc-frame">
        {view === 'scene' ? (
          <IsoStage
            className="cloak"
            board={CLOAK_BOARD}
            style={{ height: '100%' }}
            scene={cloakScene(o)}
            label={cloakLabel(o)}
          />
        ) : show.flow ? (
          <FlatStage lanes={show.flow.lanes} msgs={show.flow.msgs} />
        ) : (
          <AccountsView o={show.scene} />
        )}
      </div>
      <p className="tc-caption">
        <span className="txt">{show.caption}</span>
      </p>
    </div>
  );
}

// ---- the cracking race (KTD13) ----

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
export interface Race {
  form: Form;
  work: number;
  tick: number;
}
/** The read-out: what has cracked after a tick, and how many guesses it took. */
export function raceSaid({ form, work, tick }: Race): string {
  const b = boardAt(form, work, tick);
  if (form === 'plain') return `No cracking needed: all ${ACCOUNTS.length} passwords read at once.`;
  return `After ${TICKS[tick].label}: ${b.cracked.length} of ${ACCOUNTS.length} cracked, ${bigNumber(b.guesses)} guesses.`;
}

/** The race's controls: the stored form (radios), the work factor (a native range, PBKDF2 only), Play and Step, and
 * one polite status line that speaks on each press and when an account cracks, never on every tick. */
export function RaceControls({
  race,
  forms,
  onChange,
}: {
  race: Race;
  /** the stored forms the reader may pick between; one form hides the radios */
  forms: Form[];
  onChange: (r: Race) => void;
}) {
  const [playing, setPlaying] = useState(false);
  const [said, setSaid] = useState(() => raceSaid(race));
  const live = useRef(race),
    change = useRef(onChange);
  live.current = race;
  change.current = onChange;
  const set = (r: Race) => {
    change.current(r);
    setSaid(raceSaid(r));
  };
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      const r = live.current;
      if (r.tick >= LAST) {
        setPlaying(false);
        setSaid(raceSaid(r));
        return;
      }
      const next = { ...r, tick: r.tick + 1 },
        grew = boardAt(r.form, r.work, next.tick).cracked.length > boardAt(r.form, r.work, r.tick).cracked.length;
      change.current(next);
      // a crack or the finish is a milestone the read-out names
      if (grew || next.tick === LAST) setSaid(raceSaid(next));
      if (next.tick === LAST) setPlaying(false);
    }, 700);
    return () => clearInterval(id);
  }, [playing]);
  const play = () => {
    if (reduced()) return set({ ...race, tick: LAST });
    if (race.tick >= LAST) set({ ...race, tick: 0 });
    setPlaying(true);
  };
  const w = Math.max(0, WORK.indexOf(race.work));
  return (
    <div className="lg-race" data-tick={race.tick} data-form={race.form}>
      {forms.length > 1 && (
        <fieldset className="ek-field">
          <legend>Stored as</legend>
          {forms.map(f => (
            <label key={f}>
              <input
                type="radio"
                name="lg-form"
                checked={race.form === f}
                onChange={() => {
                  setPlaying(false);
                  set({ ...race, form: f, tick: 0 });
                }}
              />
              {FORM_NAME[f]}
            </label>
          ))}
        </fieldset>
      )}
      {race.form === 'pbkdf2' && (
        <div className="ek-field lg-work">
          <label htmlFor="lg-work">{`Work factor: ${race.work.toLocaleString('en-GB')} rounds`}</label>
          <input
            id="lg-work"
            type="range"
            min={0}
            max={WORK.length - 1}
            step={1}
            value={w}
            aria-valuetext={`${race.work.toLocaleString('en-GB')} rounds`}
            onChange={e => {
              setPlaying(false);
              set({ ...race, work: WORK[Number(e.target.value)], tick: 0 });
            }}
          />
        </div>
      )}
      <div className="lg-buttons">
        <button type="button" className="big" onClick={play} disabled={playing}>
          {race.tick >= LAST ? 'Play again' : 'Play'}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            set({ ...race, tick: Math.min(LAST, race.tick + 1) });
          }}
          disabled={race.tick >= LAST}
        >
          Step
        </button>
      </div>
      <p className="lg-said" role="status">
        {said}
      </p>
      <p className="note ek-note">
        {`Demo accounts and a ${LEAKED.length}-password stand-in for a leaked list. Guess rates from one dated graphics-card benchmark; a password off the list is an estimate of trying every combination.`}
      </p>
    </div>
  );
}

// ---- facts ----

/** A cited fact from data/logins/facts.json, with its source and the day it was checked (R5). */
export function Fact({ id }: { id: string }) {
  const f = fact(id);
  return (
    <p className="tc-fact">
      {f.claim} <Cite title={new URL(f.source).hostname} href={f.source} checked={f.accessed} />
    </p>
  );
}
