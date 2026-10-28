// @vitest-environment happy-dom
// The clip button and the stage, mounted (U32): a playing clip stops when its button unmounts and when the step changes,
// through the one shared player with a fake audio element in place of a real one.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement, Fragment } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ClipPlayer from '../../src/components/story/ClipPlayer';
import { VoiceStage } from '../../src/content/voice/kit';
import { clipStatus, setAudioFactory, type AudioLike } from '../../src/lib/voice/audio';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

class Fake implements AudioLike {
  src = '';
  paused = 0;
  on: Record<string, () => void> = {};
  play() {
    return Promise.resolve();
  }
  pause() {
    this.paused++;
  }
  addEventListener(t: string, f: () => void) {
    this.on[t] = f;
  }
}

let fake: Fake, root: Root, host: HTMLElement;
beforeEach(() => {
  setAudioFactory(() => (fake = new Fake()));
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

const clip = createElement(ClipPlayer, { clip: 'status-caller', who: 'Dana', caption: 'Hi' });
const stage = (step: string) => createElement(VoiceStage, { step, shown: { phone: { stage: 'idle' }, caption: 'x' } });
async function press() {
  await act(async () => {
    host.querySelector<HTMLButtonElement>('.clip-btn')!.click();
  });
  act(() => fake.on.playing());
  expect(clipStatus('status-caller')).toBe('playing');
}

describe('the clip player, mounted', () => {
  it('stops its clip when it unmounts', async () => {
    act(() => root.render(clip));
    await press();
    act(() => root.render(null));
    expect(fake.paused).toBe(1);
    expect(clipStatus('status-caller')).toBe('idle');
  });

  it('the stage stops whatever is playing when the step changes', async () => {
    act(() => root.render(createElement(Fragment, null, stage('a'), clip)));
    await press();
    act(() => root.render(createElement(Fragment, null, stage('a'), clip)));
    expect(clipStatus('status-caller')).toBe('playing');
    act(() => root.render(createElement(Fragment, null, stage('b'), clip)));
    expect(fake.paused).toBe(1);
    expect(clipStatus('status-caller')).toBe('idle');
  });
});
