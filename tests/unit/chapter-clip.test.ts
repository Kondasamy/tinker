// @vitest-environment happy-dom
// A chapter's opener clip and the header around it: the clip never plays unasked and falls back to its poster and lines;
// only a chapter with a clip gets the Pictures / Words switch and folds its longer intro text (.more).
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import ChapterClip from '../../src/components/story/ChapterClip';
import { ChapterIntro } from '../../src/components/story/StepRunner';
import { moduleOf, type Chapter } from '../../src/lib/modules';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root, host: HTMLElement;
beforeEach(() => {
  localStorage.clear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  delete document.documentElement.dataset.reading;
});

const LINES = ['The model never read your files', 'So it makes things up'];
const clip = () =>
  act(() => root.render(createElement(ChapterClip, { module: 'rag', chapter: '03-what-is-rag', lines: LINES })));

describe('ChapterClip', () => {
  it('loads nothing and plays nothing until pressed', () => {
    clip();
    const v = host.querySelector('video')!;
    expect(v.getAttribute('preload')).toBe('none');
    expect(v.hasAttribute('autoplay')).toBe(false);
    expect(v.hasAttribute('controls')).toBe(true);
    expect(v.getAttribute('src')).toBe('/video/rag/03-what-is-rag.mp4');
    expect(v.getAttribute('poster')).toBe('/video/rag/03-what-is-rag.jpg');
    expect(v.querySelector('track[kind="captions"]')?.getAttribute('src')).toBe('/video/rag/03-what-is-rag.vtt');
  });
  it('shows its lines as text', () => {
    clip();
    expect([...host.querySelectorAll('.clip-lines li')].map(li => li.textContent)).toEqual(LINES);
  });
  it('falls back to the poster and the lines when the video fails', () => {
    clip();
    act(() => host.querySelector('video')!.dispatchEvent(new Event('error')));
    expect(host.querySelector('video')).toBeNull();
    expect(host.querySelector('img')?.getAttribute('src')).toBe('/video/rag/03-what-is-rag.jpg');
    expect(host.querySelectorAll('.clip-lines li')).toHaveLength(LINES.length);
  });
});

describe('ChapterIntro', () => {
  const plain = moduleOf('tokens').chapters[0];
  const withClip: Chapter = { ...plain, intro: { ...plain.intro, clip: LINES } };
  const intro = (ch: Chapter) =>
    act(() => root.render(createElement(ChapterIntro, { module: 'tokens', ch, n: 0, total: 7 })));

  it('a chapter without a clip keeps its whole header and gets no switch', () => {
    document.documentElement.dataset.reading = 'visual';
    intro(plain);
    expect(host.querySelector('.reading')).toBeNull();
    expect(host.querySelector('video')).toBeNull();
    expect(host.querySelector('.more')).toBeNull();
    expect(host.querySelector('.story')?.textContent).toBe(plain.intro.story);
  });
  it('a chapter with a clip shows it and marks its longer text .more', () => {
    intro(withClip);
    expect(host.querySelector('video')).not.toBeNull();
    for (const sel of ['.story', '.learn', '.how'])
      expect(host.querySelector(sel)?.classList.contains('more')).toBe(true);
    expect(host.querySelector('h1')?.classList.contains('more')).toBe(false);
    expect(host.querySelector('.goal')?.classList.contains('more')).toBe(false);
  });
  it('the switch sets the reading mode, remembers it and tells the page', () => {
    intro(withClip);
    let told = 0;
    const f = () => told++;
    window.addEventListener('tinker-reading', f);
    act(() => (host.querySelector('.reading [data-mode="words"]') as HTMLButtonElement).click());
    window.removeEventListener('tinker-reading', f);
    expect(document.documentElement.dataset.reading).toBe('words');
    expect(localStorage.getItem('tinker-reading')).toBe('words');
    expect(told).toBe(1);
    expect(host.querySelector('.reading [data-mode="words"]')?.getAttribute('aria-pressed')).toBe('true');
  });
});
