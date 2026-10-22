// Facts about serving models for module 13 (R5), each checked against its source. Copy quotes them from here, never by hand.
import data from '../../../data/inference/facts.json' with { type: 'json' };
import { factsOf } from '../tools/facts';

export const { ACCESSED, FACTS, fact } = factsOf(data);

/** The open model chapter 2 scales up to and the simulated server runs: its published shape (fact `opt-13b`). */
export const OPEN_MODEL = JSON.parse(fact('opt-13b').value!) as {
  params: number;
  n_layer: number;
  n_head: number;
  d_model: number;
  ctx: number;
};
