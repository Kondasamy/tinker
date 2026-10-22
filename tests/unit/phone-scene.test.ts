// The phone desk and the call timeline (U32): the bubble rides the belt for the stage shown, the stations light in turn,
// speech-to-speech folds the ear and the mouth into the model, the stopwatch names the wait; the timeline lays both
// voices out as lanes with the end-of-turn marks and reads each turn out with its gap in ms; the clip button never plays
// on its own and always keeps its caption.
import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import IsoStage from '../../src/lib/iso/IsoStage';
import {
  PHONE_BOARD,
  phoneLabel,
  phoneScene,
  phoneState,
  type PhoneOpts,
} from '../../src/components/scenes/phoneScene';
import { callTimeline, segmentName } from '../../src/components/scenes/callTimeline';
import ClipPlayer from '../../src/components/story/ClipPlayer';
import { CallTimeline, VoiceStage, segmentsOf } from '../../src/content/voice/kit';
import { DEFAULT_LINE, runCall } from '../../src/lib/voice/engine';

const draw = (o: PhoneOpts) =>
  renderToString(createElement(IsoStage, { board: PHONE_BOARD, scene: phoneScene(o), label: phoneLabel(o) }));

describe('the phone desk', () => {
  it('idle: four stations, no bubble, the stopwatch at rest', () => {
    const svg = draw({ stage: 'idle' });
    for (const k of ['phone', 'ear', 'model', 'mouth', 'watch']) expect(svg).toContain(`class="${k}"`);
    expect(svg).not.toContain('class="bubble"');
    expect(svg).toContain('EAR · SPEECH-TO-TEXT');
    expect(svg).toContain('MOUTH · TEXT-TO-SPEECH');
    expect(phoneLabel({ stage: 'idle' })).toContain('Nothing on the line yet');
  });

  it('each stage puts the right bubble on the right belt and lights its station', () => {
    const at = (stage: PhoneOpts['stage']) => phoneState({ stage });
    expect(at('caller').bubbles).toEqual([{ belt: 'phone-ear', kind: 'audio', who: 'caller' }]);
    expect(at('stt').bubbles).toEqual([{ belt: 'ear-model', kind: 'text', who: 'caller' }]);
    expect(at('tts').bubbles).toEqual([{ belt: 'model-mouth', kind: 'text', who: 'assistant' }]);
    expect(at('reply').bubbles).toEqual([{ belt: 'mouth-phone', kind: 'audio', who: 'assistant' }]);
    expect(at('stt').busy).toBe('ear');
    const svg = draw({ stage: 'stt', unsure: true });
    expect(svg).toContain('data-belt="ear-model"');
    expect(svg).toContain('data-unsure="1"');
  });

  it('speech-to-speech: no ear or mouth, one model hears and speaks', () => {
    const svg = draw({ stage: 'reply', mode: 's2s' });
    expect(svg).not.toContain('class="ear"');
    expect(svg).not.toContain('class="mouth"');
    expect(svg).toContain('SPEECH-TO-SPEECH MODEL');
    expect(phoneState({ stage: 'reply', mode: 's2s' }).bubbles).toEqual([
      { belt: 'model-phone', kind: 'audio', who: 'assistant' },
    ]);
  });

  it('barge-in: the caller’s voice and the reply on the line at once; stopped, the mouth says so', () => {
    expect(phoneState({ stage: 'reply', interrupt: true }).bubbles).toHaveLength(2);
    expect(draw({ stage: 'reply', interrupt: true, stopped: true })).toContain('STOPPED');
    expect(draw({ stage: 'reply', interrupt: true })).toContain('TALKING OVER');
  });

  it('the stopwatch names the wait; phones keep short pills', () => {
    expect(draw({ stage: 'reply', wait: 1830 })).toContain('WAIT 1.83 s');
    const phone = draw({ stage: 'idle', scale: 2 });
    expect(phone).toContain('>EAR<');
    expect(phone).not.toContain('SPEECH-TO-TEXT');
  });
});

describe('the call timeline', () => {
  const run = runCall('hesitant', { ...DEFAULT_LINE, silence: 800, streaming: true });
  const segs = segmentsOf(run);
  it('the caller’s turn, the end-of-turn mark, then the reply after the wait', () => {
    const t = callTimeline(segs.segments, segs.marks);
    expect(t.segs.map(s => s.lane)).toEqual(['caller', 'assistant']);
    expect(t.marks.map(m => m.kind)).toContain('turn-end');
    expect(t.segs[1].x).toBeGreaterThan(t.segs[0].x + t.segs[0].w);
    expect(segmentName(segs.segments, 1)).toMatch(/gap of 1\.\d\d s after the caller’s last word/);
  });

  it('renders one focusable turn at a time, with a read-out line', () => {
    const html = renderToString(createElement(CallTimeline, segs));
    expect(html.match(/role="listitem"/g)).toHaveLength(2);
    expect(html.match(/tabindex="0"/gi)).toHaveLength(1);
    expect(html).toContain('arrow keys');
  });
});

describe('the cut-in on the timeline', () => {
  const callerCut = (point: 'stop-2' | 'stop-3', bargeIn: boolean) =>
    segmentsOf(
      runCall('slots', { ...DEFAULT_LINE, streaming: true, silence: 800, point, bargeIn }),
      point,
    ).segments.filter(s => s.lane === 'caller')[1];
  it('without barge-in, Dana cuts in where the reader picked', () => {
    const two = callerCut('stop-2', false),
      three = callerCut('stop-3', false);
    expect(two).toBeDefined();
    expect(two.at).toBeLessThan(three.at);
  });
  it('with barge-in, the cut-in sits where the host stopped', () => {
    expect(callerCut('stop-2', true).at).toBe(callerCut('stop-2', false).at);
  });
});

describe('the clip player', () => {
  it('shows Play, not pressed, and the caption, before anything plays', () => {
    const html = renderToString(
      createElement(ClipPlayer, { clip: 'status-caller', who: 'Dana', caption: 'Hi <b>there</b>' }),
    );
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain('Play');
    expect(html).toContain('Hi &lt;b&gt;there&lt;/b&gt;');
    expect(html).not.toContain('<audio');
  });

  it('the stage escapes its caption', () => {
    const html = renderToString(
      createElement(VoiceStage, { shown: { phone: { stage: 'idle' }, caption: '<i>x</i>' } }),
    );
    expect(html).toContain('&lt;i&gt;x&lt;/i&gt;');
  });
});
