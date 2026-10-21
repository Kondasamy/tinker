// Transformers' cost counts (KTD10), from Larkspur mini's shapes: what a prompt of n tokens costs.
import type { ModelConfig } from '../lm/model';

/**
 * pairs: query-key scores one head computes under the causal mask, token t looking at 0..t:
 *   n(n + 1) / 2, so it grows as n².
 * kv: numbers the KV cache holds: every layer keeps a key and a value (2) of d_model numbers
 *   (heads × head size) for each of the n tokens: n_layer × 2 × d_model × n, so it grows as n.
 */
export function costs(c: ModelConfig, n: number): { pairs: number; kv: number } {
  return { pairs: (n * (n + 1)) / 2, kv: c.n_layer * 2 * c.d_model * n };
}
