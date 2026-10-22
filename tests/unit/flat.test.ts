import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { flatScene, flatLabel, type Lane, type Msg } from '../../src/lib/iso/flat';
import FlatStage from '../../src/components/scenes/FlatStage';

const LANES: Lane[] = [{ id: 'emp', name: 'Employee' }, { id: 'host', name: 'Host app' }, { id: 'model', name: 'Model' }];
const MSGS: Msg[] = [
  { from: 'emp', to: 'host', kind: 'request', text: 'Where is order 1042?' },
  { from: 'host', to: 'model', kind: 'request', text: 'question + 2 tools' },
  { from: 'model', to: 'host', kind: 'result', text: 'get_order(1042)', stamp: 'APPROVED' },
  { from: 'host', to: 'emp', kind: 'error', text: 'Order not found' },
];
const arrows = (svg: string) => [...svg.matchAll(/class="arrow" data-from="(\w+)" data-to="(\w+)"/g)].map(m => [m[1], m[2]]);

describe('flat sequence kit', () => {
  it('draws one arrow per message, between the right lanes', () => {
    const { svg } = flatScene(LANES, MSGS);
    expect(arrows(svg)).toEqual(MSGS.map(m => [m.from, m.to]));
    // each arrow runs from its sender's lane centre toward the receiver's
    const xs = [...svg.matchAll(/class="arrow"[^>]*><path d="M([\d.]+) [\d.]+L([\d.]+)/g)].map(m => [+m[1], +m[2]]);
    const lx = Object.fromEntries([...svg.matchAll(/class="lane" data-lane="(\w+)" data-x="([\d.]+)"/g)].map(m => [m[1], +m[2]]));
    xs.forEach(([a, b], i) => expect(Math.sign(b - a)).toBe(Math.sign(lx[MSGS[i].to] - lx[MSGS[i].from])));
  });

  it('shows only the messages up to the step', () => {
    expect(arrows(flatScene(LANES, MSGS, { upTo: 2 }).svg)).toHaveLength(2);
    // the frame is sized for the whole sequence, so it never resizes as messages arrive
    expect(flatScene(LANES, MSGS, { upTo: 1 }).h).toBe(flatScene(LANES, MSGS).h);
  });

  it('escapes message text', () => {
    const { svg } = flatScene(LANES, [{ from: 'emp', to: 'host', kind: 'blocked', text: '<img onerror=alert(1)>' }]);
    expect(svg).not.toContain('<img');
    expect(svg).toContain('&lt;img onerror=alert(1)&gt;');
  });

  it('lets clicks pass through every pill and stamp', () => {
    const { svg } = flatScene(LANES, MSGS);
    const pills = [...svg.matchAll(/<g class="(pill|stamp)[^"]*"[^>]*>/g)].map(m => m[0]);
    expect(pills.length).toBe(LANES.length + 1);
    for (const p of pills) expect(p).toContain('pointer-events="none"');
  });

  it('stacks lanes and shows one message on a phone', () => {
    const desk = flatScene(LANES, MSGS), phone = flatScene(LANES, MSGS, { phone: true, upTo: 3 });
    expect(arrows(phone.svg)).toEqual([['model', 'host']]);   // the latest message shown
    expect(arrows(flatScene(LANES, MSGS, { phone: true, upTo: 3, focus: 0 }).svg)).toEqual([['emp', 'host']]);
    expect(phone.h / phone.w).toBeGreaterThan(desk.h / desk.w);   // taller than wide: lanes run down the page
    expect(phone.svg.match(/class="lane"/g)).toHaveLength(LANES.length);
  });

  it('summarises the sequence in words', () => {
    expect(flatLabel(LANES, MSGS, 2)).toBe('Sequence across 3 lanes: Employee, Host app, Model. 2 of 4 messages so far. '
      + '1: Employee to Host app, request, "Where is order 1042?". 2: Host app to Model, request, "question + 2 tools".');
    expect(flatLabel(LANES, MSGS, 3)).toContain('result, "get_order(1042)", stamped approved');
    expect(flatLabel(LANES, MSGS, 0)).toContain('No messages yet.');
  });

  it('renders a stage with role img, a regenerated label and a wobble filter', () => {
    const html = renderToString(createElement(FlatStage, { lanes: LANES, msgs: MSGS, upTo: 1 }));
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Sequence across 3 lanes: Employee, Host app, Model. 1 of 4 messages so far.');
    expect(html).toMatch(/<filter id="flat[^"]*hand"/);
    expect(html).toMatch(/filter="url\(#flat[^"]*hand\)"/);
    expect(html).toContain('Next');
  });

  it('names each card with its visible words in order, the stamp after them, and the full text when cut (label in name)', () => {
    const long: Msg = { from: 'host', to: 'model', kind: 'blocked', text: 'allow-list: send_email to audit@example.net stopped', stamp: 'REFUSED' };
    const { svg } = flatScene(LANES, [long], { pick: true });
    const name = svg.match(/aria-label="([^"]+)"/)![1];
    const shown = svg.match(/class="card[\s\S]*?<text[^>]*>([^<]+)<\/text>/)![1].replace(/^× /, '');
    expect(shown).toMatch(/…$/);
    expect(name).toContain(`${shown}, refused. In full: ${long.text}`);
    // a space between the card's words and its stamp keeps them apart in the accessible text
    expect(svg).toMatch(/<\/text> <g class="stamp"/);
  });
});
