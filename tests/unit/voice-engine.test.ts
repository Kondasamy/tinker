// Voice's engine (U31): the committed clips and envelopes, the live end-of-turn detector, the latency sums, the call
// runner and the shared player.
import { beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LINES, textOf } from '../../src/lib/voice/script';
import { CLIPS, FRAME_MS, SILENCES, THRESHOLDS, detect } from '../../src/lib/voice/turns';
import { latency } from '../../src/lib/voice/latency';
import { CALLS, DEFAULT_LINE, interruptAt, runCall, type Line } from '../../src/lib/voice/engine';
import { clipStatus, playClip, setAudioFactory, stopClip, type AudioLike } from '../../src/lib/voice/audio';
import { FACTS } from '../../src/lib/voice/facts';

const DIR = path.resolve('public/data/voice');
const MP3 = fs.readdirSync(DIR).filter(f => f.endsWith('.mp3'));
const callers = LINES.filter(l => l.speaker !== 'assistant').map(l => l.id);
const line = (o: Partial<Line> = {}): Line => ({ ...DEFAULT_LINE, ...o });

describe('the clips', () => {
  it('every script line has a clip and an envelope, and nothing else is committed', () => {
    expect(MP3.map(f => f.replace('.mp3', '')).sort()).toEqual(LINES.map(l => l.id).sort());
    expect(Object.keys(CLIPS).sort()).toEqual(LINES.map(l => l.id).sort());
    for (const l of LINES) {
      const c = CLIPS[l.id];
      expect(c.parts, l.id).toHaveLength(l.parts.length);
      expect(c.env.length * FRAME_MS, l.id).toBeGreaterThanOrEqual(c.ms - FRAME_MS);
      for (const p of c.parts) expect(p.end, l.id).toBeGreaterThan(p.start);
    }
  });

  it('the clips together stay within the 800 KB budget', () => {
    const total = MP3.reduce((n, f) => n + fs.statSync(path.join(DIR, f)).size, 0);
    expect(total).toBeLessThanOrEqual(800 * 1024);
  });
});

describe('end-of-turn detection', () => {
  it('a turn only ends after a run of quiet frames as long as the silence setting', () => {
    for (const id of callers) for (const threshold of THRESHOLDS) for (const silence of SILENCES) {
      const d = detect(id, { threshold, silence }), env = CLIPS[id].env;
      if (d.gaveUp) continue;
      // the frames before the end are all quiet, for the whole setting
      for (let t = d.quietFrom!; t < d.fire; t += FRAME_MS) expect(env[t / FRAME_MS] ?? env.at(-1)!, `${id} ${threshold} ${silence}`).toBeLessThan(threshold);
      expect(d.fire - d.quietFrom!).toBe(Math.ceil(silence / FRAME_MS) * FRAME_MS);
    }
  });

  it('a pause shorter than the silence setting never ends a turn', () => {
    // Ravi's pauses are shorter than 800 ms: at 800 the whole request is one turn, at 300 his first pause ends it
    const long = detect('hesitant-caller', { threshold: 30, silence: 800 }), short = detect('hesitant-caller', { threshold: 30, silence: 300 });
    expect([long.cut, long.heard]).toEqual([false, 3]);
    expect([short.cut, short.heard]).toEqual([true, 1]);
  });

  it('the trade-off holds: the shortest setting cuts a caller off, the longest leaves dead air', () => {
    const shortest = CALLS.map(c => runCall(c.id, line({ silence: SILENCES[0], streaming: true })));
    const longest = CALLS.map(c => runCall(c.id, line({ silence: SILENCES.at(-1)!, streaming: true })));
    expect(shortest.some(r => r.problem === 'cut-off')).toBe(true);
    expect(longest.some(r => r.problem === 'dead air')).toBe(true);
    expect(longest.some(r => r.problem === 'cut-off')).toBe(false);
  });

  it('a low threshold hears the line’s hum as speech: the host gives up waiting', () => {
    expect(detect('noisy-caller', { threshold: 10, silence: 800 }).gaveUp).toBe(true);
    expect(detect('noisy-caller', { threshold: 30, silence: 800 }).gaveUp).toBe(false);
    // a high one hears Ravi’s quiet order number as silence
    expect(detect('noisy-caller', { threshold: 50, silence: 800 }).cut).toBe(true);
  });
});

describe('the latency budget', () => {
  it('streaming moves the first sound earlier and leaves the model’s finish unchanged', () => {
    for (const l of LINES.filter(x => x.speaker === 'assistant')) {
      const off = latency(l.id, false), on = latency(l.id, true);
      expect(on.firstSound, l.id).toBeLessThan(off.firstSound);
      expect(on.modelDone, l.id).toBe(off.modelDone);
    }
  });
});

describe('calls', () => {
  it('a cut-off is exactly when the recording says the caller was cut off', () => {
    for (const c of CALLS) for (const threshold of THRESHOLDS) for (const silence of SILENCES) {
      const r = runCall(c.id, line({ threshold, silence }));
      expect(r.detected.cut, r.key).toBe(r.recording.verdict === 'cut-off');
    }
  });

  it('the caller cuts in during the part named, and barge-in keeps only what was said', () => {
    const slots = CLIPS['slots-reply'];
    expect(interruptAt('stop-2')).toBeGreaterThan(slots.parts[2].start);
    expect(interruptAt('stop-2')).toBeLessThan(slots.parts[2].end);
    const kept = runCall('slots', line({ bargeIn: true, point: 'stop-2' })).recording.turns.find(t => t.clip === 'slots-reply')!;
    expect(kept.kept).toBe(2);
    expect(textOf('slots-reply', kept.kept)).not.toContain('Wednesday');
    expect(runCall('slots', line({ bargeIn: false })).problem).toBe('talked-over');
  });

  it('reading back an unsure number fixes the misheard order', () => {
    expect(runCall('mishear', line()).problem).toBe('wrong');
    expect(runCall('mishear', line({ readBack: true, streaming: true, silence: 800 })).problem).toBe(null);
  });
});

describe('facts', () => {
  it('every fact has a claim and a source', () => {
    for (const f of FACTS) { expect(f.claim.length).toBeGreaterThan(20); expect(f.source).toMatch(/^https:\/\//); }
  });
});

describe('the shared player', () => {
  class Fake implements AudioLike {
    src = ''; played: string[] = []; paused = 0; fail = false;
    on: Record<string, () => void> = {};
    play() { this.played.push(this.src); return this.fail ? Promise.reject(new Error('no')) : Promise.resolve(); }
    pause() { this.paused++; }
    addEventListener(t: string, f: () => void) { this.on[t] = f; }
  }
  let fakes: Fake[] = [];
  beforeEach(() => { fakes = []; setAudioFactory(() => { const f = new Fake(); fakes.push(f); return f; }); });

  it('nothing plays until asked, and one element serves every clip', () => {
    expect(fakes).toHaveLength(0);
    expect(clipStatus('status-caller')).toBe('idle');
    playClip('status-caller');
    playClip('status-reply');
    expect(fakes).toHaveLength(1);
  });

  it('loads, then plays; starting a second clip stops the first', () => {
    playClip('status-caller');
    expect(clipStatus('status-caller')).toBe('loading');
    fakes[0].on.playing();
    expect(clipStatus('status-caller')).toBe('playing');
    playClip('status-reply');
    expect(fakes[0].paused).toBe(1);
    expect(clipStatus('status-caller')).toBe('idle');
    expect(clipStatus('status-reply')).toBe('loading');
  });

  it('stop (a step change, an unmount) silences it; the end of a clip resets it', () => {
    playClip('status-caller');
    fakes[0].on.playing();
    stopClip();
    expect(clipStatus('status-caller')).toBe('idle');
    playClip('status-reply');
    fakes[0].on.playing();
    fakes[0].on.ended();
    expect(clipStatus('status-reply')).toBe('idle');
  });

  it('a clip that fails to load settles on error, quietly', async () => {
    playClip('status-caller');
    fakes[0].on.error();
    expect(clipStatus('status-caller')).toBe('error');
    fakes[0].fail = true;
    playClip('status-reply');
    await Promise.resolve();
    await Promise.resolve();
    expect(clipStatus('status-reply')).toBe('error');
  });
});
