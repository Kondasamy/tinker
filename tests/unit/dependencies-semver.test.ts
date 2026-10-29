// Dependencies' semver (KTD7): written from the cited tables before the matcher. Precedence is semver.org 2.0.0's
// rule 11 example chain; the ranges are node-semver's documented expansions (the README npm's docs point to), each
// checked at its edges. https://semver.org/spec/v2.0.0.html · https://github.com/npm/node-semver#advanced-range-syntax
import { describe, expect, it } from 'vitest';
import { compare, format, maxSatisfying, parse, satisfies } from '../../src/lib/dependencies/semver';

describe('versions', () => {
  it('parses major.minor.patch and a pre-release, and prints them back', () => {
    expect(parse('1.4.2')).toEqual({ major: 1, minor: 4, patch: 2, pre: [] });
    expect(parse('1.0.0-alpha.1')).toEqual({ major: 1, minor: 0, patch: 0, pre: ['alpha', 1] });
    expect(format(parse('1.0.0-beta.11'))).toBe('1.0.0-beta.11');
    expect(format(parse('2.0.0+build.5'))).toBe('2.0.0');
  });

  it('an invalid version throws a clear error', () => {
    for (const bad of ['1.2', '01.2.3', '1.2.3.4', 'v1.2.3', '', 'one.two.three', '1.2.3-'])
      expect(() => parse(bad)).toThrow(`invalid version: "${bad}"`);
  });

  it('orders by semver.org’s example: 1.0.0-alpha < … < 1.0.0', () => {
    const chain = [
      '1.0.0-alpha',
      '1.0.0-alpha.1',
      '1.0.0-alpha.beta',
      '1.0.0-beta',
      '1.0.0-beta.2',
      '1.0.0-beta.11',
      '1.0.0-rc.1',
      '1.0.0',
    ];
    for (let i = 1; i < chain.length; i++) {
      expect(compare(chain[i - 1], chain[i])).toBe(-1);
      expect(compare(chain[i], chain[i - 1])).toBe(1);
    }
    expect(compare('1.0.0', '1.0.0')).toBe(0);
    // numbers compare as numbers, fields left to right
    expect(compare('1.10.0', '1.9.0')).toBe(1);
    expect(compare('2.0.0', '1.99.99')).toBe(1);
  });
});

describe('ranges, from the documented table', () => {
  const cases: [range: string, yes: string[], no: string[]][] = [
    // ^1.2.3 := >=1.2.3 <2.0.0-0
    ['^1.2.3', ['1.2.3', '1.2.9', '1.9.0'], ['1.2.2', '2.0.0', '2.0.0-beta.1']],
    // ^0.2.3 := >=0.2.3 <0.3.0-0
    ['^0.2.3', ['0.2.3', '0.2.9'], ['0.2.2', '0.3.0', '1.0.0']],
    // ^0.0.3 := >=0.0.3 <0.0.4-0
    ['^0.0.3', ['0.0.3'], ['0.0.4', '0.1.0']],
    // ~1.2.3 := >=1.2.3 <1.3.0-0
    ['~1.2.3', ['1.2.3', '1.2.9'], ['1.2.2', '1.3.0']],
    // ~1.2 := >=1.2.0 <1.3.0-0 (same as 1.2.x)
    ['~1.2', ['1.2.0', '1.2.9'], ['1.1.9', '1.3.0']],
    // ~1 := >=1.0.0 <2.0.0-0 (same as 1.x)
    ['~1', ['1.0.0', '1.9.9'], ['0.9.9', '2.0.0']],
    // 1.x := >=1.0.0 <2.0.0-0
    ['1.x', ['1.0.0', '1.9.9'], ['0.9.9', '2.0.0']],
    // 1.2.x := >=1.2.0 <1.3.0-0
    ['1.2.x', ['1.2.0', '1.2.9'], ['1.1.9', '1.3.0']],
    // an exact version matches only itself
    ['1.2.3', ['1.2.3'], ['1.2.4', '1.2.2']],
    ['*', ['0.0.1', '9.9.9'], []],
  ];
  for (const [range, yes, no] of cases)
    it(range, () => {
      for (const v of yes) expect(satisfies(v, range), `${v} in ${range}`).toBe(true);
      for (const v of no) expect(satisfies(v, range), `${v} not in ${range}`).toBe(false);
    });

  it('a pre-release matches only a range that names a pre-release on the same major.minor.patch', () => {
    // node-semver: >1.2.3-alpha.3 allows 1.2.3-alpha.7, and no other tuple's pre-releases
    expect(satisfies('1.2.3-alpha.7', '>1.2.3-alpha.3')).toBe(true);
    expect(satisfies('3.4.5-alpha.9', '>1.2.3-alpha.3')).toBe(false);
    expect(satisfies('1.3.0-beta.1', '^1.2.3')).toBe(false);
  });

  it('an invalid range throws', () => {
    expect(() => satisfies('1.0.0', '^banana')).toThrow('invalid range: "^banana"');
  });

  it('maxSatisfying picks the highest version a range allows, or null', () => {
    const vs = ['1.4.0', '1.4.2', '1.4.3', '1.5.0', '2.0.0'];
    expect(maxSatisfying(vs, '^1.4.2')).toBe('1.5.0');
    expect(maxSatisfying(vs, '~1.4.2')).toBe('1.4.3');
    expect(maxSatisfying(vs, '1.4.2')).toBe('1.4.2');
    expect(maxSatisfying(vs, '^3.0.0')).toBeNull();
  });
});
