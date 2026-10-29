// Every drop-down is the site's own (src/components/story/Select.tsx), drawn in ink like the home finder; the system's
// native picker never appears.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const files = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap(e =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(tsx|astro)$/.test(e.name) ? [join(dir, e.name)] : [],
  );

describe('drop-downs', () => {
  it('no page or island renders a native <select>', () => {
    const native = files('src').filter(f => /<select[\s>]/.test(readFileSync(f, 'utf8')));
    expect(native).toEqual([]);
  });
});
