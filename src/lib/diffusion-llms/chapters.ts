// The settings the chapters ask for, kept beside the engine so the chapters, the e2e walker and the tests share them
// (the walker can't import a chapter file: it pulls in the kit's CSS).
import ASSUME from '../../../data/diffusion-llms/assumptions.json' with { type: 'json' };
import { KS, type K } from './decode';
import { fact } from './facts';

/** Chapter 4: tokens a pass, slowest first. */
export const ASKED_K: K[] = [1, 4, 16];
/** Chapter 5: the reply lengths the frame can take (the phrase fills the window's first 16 slots), and those asked. */
export const LENGTHS = [4, 8, 16] as const;
export type Len = (typeof LENGTHS)[number];
export const ASKED_LENGTHS: Len[] = [4, 16];
/** Chapter 6: the vendor's claim (its own figure), Larkspur's planning pass rate, and the fewest tokens a pass that
 * reach the claim at that rate. */
export const CLAIM = Number(fact('mercury-2').value),
  RATE: number = ASSUME.passesPerSecond;
export const NEED = KS.find(k => k * RATE >= CLAIM)!;
