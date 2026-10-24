// pnpm og takes slug filters, so a module's go-live shoots only its own share images and home's (KTD13)
import { describe, it, expect } from 'vitest';
import { pick } from '../../scripts/og-filter.mjs';

const SLUGS = [
  'home',
  'rag',
  '01-history',
  'rag-recap',
  'tool-calling',
  'tool-calling-01-ask',
  'caching',
  'caching-02-ttl',
  'caching-recap',
];

describe('og slug filter', () => {
  it('shoots every slug with no filter', () => {
    expect(pick(SLUGS, [])).toEqual(SLUGS);
  });

  it('shoots a module’s intro, chapters and recap, and home, and nothing else', () => {
    expect(pick(SLUGS, ['home', 'caching'])).toEqual(['home', 'caching', 'caching-02-ttl', 'caching-recap']);
  });

  it('matches whole ids, never a prefix of another id', () => {
    expect(pick(SLUGS, ['tool'])).toEqual([]);
    expect(pick(['diffusion', 'diffusion-01-noise', 'diffusion-llms', 'diffusion-llms-recap'], ['diffusion'])).toEqual([
      'diffusion',
      'diffusion-01-noise',
    ]);
    expect(pick(SLUGS, ['01-history'])).toEqual(['01-history']);
  });
});
