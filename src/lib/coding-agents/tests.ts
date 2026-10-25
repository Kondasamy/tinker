// Larkspur's tests, run live (KTD8): a version of the test file's checks over a version of the discount code. Pass and
// fail are computed here every time, never recorded. A check that throws fails.
import { BASE, CODE, TESTS, version, type Check, type DiscountModule } from './repo';

export interface TestResult {
  id: string;
  name: string;
  pass: boolean;
}

const checksOf = (testVid: string) => version(TESTS, testVid).mod.TESTS as Check[];
/** The test ids in file order (every version of the test file keeps them). */
export const TEST_IDS = checksOf(BASE[TESTS]).map(t => t.id);
export const TEST_NAMES = Object.fromEntries(checksOf(BASE[TESTS]).map(t => [t.id, t.name]));

/** Run a version of the tests over a version of the code. */
export function runTests(codeVid: string, testVid = BASE[TESTS]): TestResult[] {
  const m = version(CODE, codeVid).mod as DiscountModule;
  return checksOf(testVid).map(t => {
    let pass = false;
    try {
      pass = t.check(m);
    } catch {}
    return { id: t.id, name: t.name, pass };
  });
}
export const allPass = (r: TestResult[]) => r.every(t => t.pass);
/** What a run reports back to the agent: `pass`, or `fail=` and the failing ids. */
export const verdict = (r: TestResult[]) =>
  allPass(r)
    ? 'pass'
    : `fail=${r
        .filter(t => !t.pass)
        .map(t => t.id)
        .join('+')}`;
