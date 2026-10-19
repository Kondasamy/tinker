// Chapter 6's RAG types and question cards, in their own module so the Sandbox can use them without
// pulling chapter 6's whole island into its bundle.
import type { BlockType } from '../../lib/iso/blocks';
import type { Knobs } from '../../components/canvas/state';

/** RAG types the learner can run; each is the blocks it attaches to the chapter-5 track, plus the knobs it sets. */
export const TYPES: { id: string; label: string; blocks: BlockType[]; knobs?: Partial<Knobs> }[] = [
  { id: 'naive', label: 'Naive / advanced', blocks: [] },
  { id: 'agentic', label: 'Agentic', blocks: ['agent'] },
  { id: 'graph', label: 'GraphRAG', blocks: ['graph'] },
  { id: 'selfcheck', label: 'Self-correcting', blocks: [], knobs: { grade: true } },
  // sentence chunks keep a table row or a PDF paragraph whole; the parsers start off and the learner turns them on
  { id: 'multimodal', label: 'Multimodal', blocks: [], knobs: { strategy: 'sentence', size: 32 } },
];
/** Question cards for the comparison; `mm` cards answer from a table, PDF or image and show under Multimodal only. */
export const CARDS: { q: string; label: string; short: string; mm?: boolean }[] = [
  { q: 'refund-enterprise', label: 'Can enterprise customers get a refund?', short: 'Enterprise refund' },
  { q: 'stale-hotel-limit', label: 'What is the hotel limit per night?', short: 'Hotel limit' },
  { q: 'standard-refund-window', label: 'How long do standard customers have to ask for a refund?', short: 'Refund window' },
  { q: 'kestrel-purchase-approver', label: 'Who approves purchases for the team that owns the Kestrel K2 scanner integration?', short: 'Kestrel approver' },
  { q: 'card-data-retention', label: 'How long does Larkspur keep customer payment card data?', short: 'Card data' },
  { q: 'k2-volume-price', label: 'How much is a Kestrel K2 scanner per unit at 50 or more? (price table)', short: 'K2 price', mm: true },
  { q: 'dock-sensor-warranty', label: 'How long is the dock door sensor warranty? (vendor PDF)', short: 'Sensor warranty', mm: true },
  { q: 'customer-success-lead', label: 'Who leads the Customer Success team? (org chart image)', short: 'Customer Success lead', mm: true },
];
