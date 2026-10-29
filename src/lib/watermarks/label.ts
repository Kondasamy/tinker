// The made-by-AI label, C2PA-shaped (KTD3): a small JSON manifest that says a model made the picture and carries
// the SHA-256 of its pixels, signed with Locks and keys' demo ECDSA key (labelled demo, data/encryption/demo-keys.json).
// Its sign-in-tests-only rule holds: the signature was made once in tests/unit/watermarks-engine.test.ts and is
// committed in pinned.json; the page only verifies. The label rides beside the pixels, so a screenshot leaves it behind.
import pinned from '../../../data/watermarks/pinned.json' with { type: 'json' };
import { ecdsaVerify } from '../encryption/real';
import { sha256 } from '../encryption/sha256';
import { fact } from './facts';
import { blur, crop, nudgePixel, type Pic } from './pixels';

export interface Manifest {
  claim_generator: string;
  title: string;
  assertions: { label: 'c2pa.actions'; data: { actions: { action: 'c2pa.created'; digitalSourceType: string }[] } }[];
  /** SHA-256 of the picture's pixels: the hard binding */
  hash: string;
}
export interface Label {
  manifest: Manifest;
  /** ECDSA P-256 over the manifest's JSON (P1363 hex) */
  signature: string;
}

export const pixelHash = (pic: Pic) => sha256(pic.px);

/** The manifest Larkspur's image tool would attach to `pic`. */
export const manifestOf = (pic: Pic, title: string, generator: string): Manifest => ({
  claim_generator: generator,
  title,
  assertions: [
    {
      label: 'c2pa.actions',
      data: { actions: [{ action: 'c2pa.created', digitalSourceType: fact('made-by-ai-type').value! }] },
    },
  ],
  hash: pixelHash(pic),
});

/** The text that is signed: the manifest's JSON as written. */
export const signedText = (m: Manifest) => JSON.stringify(m);

/** The committed label on the marked picture. */
export const LABEL = pinned.label as Label;

export interface LabelCheck {
  present: boolean;
  /** the signature verifies over the manifest with the demo public key */
  signed: boolean;
  /** the manifest's hash is this picture's hash */
  matches: boolean;
  verdict: 'no label' | 'forged label' | 'label does not match' | 'made by AI, signed';
}

/** What can happen to the picture on its way to a reader. */
export const TRIPS = ['as sent', 'one pixel', 'screenshot', 'crop', 'blur'] as const;
export type Trip = (typeof TRIPS)[number];

/** The picture and its label after a trip: a screenshot copies the pixels and leaves the label behind. */
export function travel(pic: Pic, label: Label, trip: Trip): { pic: Pic; label: Label | null } {
  if (trip === 'screenshot') return { pic: { ...pic, px: pic.px.slice() }, label: null };
  const out = trip === 'one pixel' ? nudgePixel(pic) : trip === 'crop' ? crop(pic) : trip === 'blur' ? blur(pic) : pic;
  return { pic: out, label };
}

export async function checkLabel(pic: Pic, label: Label | null): Promise<LabelCheck> {
  if (!label) return { present: false, signed: false, matches: false, verdict: 'no label' };
  const signed = await ecdsaVerify(signedText(label.manifest), label.signature),
    matches = label.manifest.hash === pixelHash(pic);
  const verdict = !signed ? 'forged label' : !matches ? 'label does not match' : 'made by AI, signed';
  return { present: true, signed, matches, verdict };
}
