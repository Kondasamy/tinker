/**
 * The share images `pnpm og` shoots: every slug, or with filters (`pnpm og home caching`) only each named slug and, for a
 * module id, its chapters (`<id>-<nn>-…`) and recap, so a module's PR commits only its own images (KTD13). RAG's chapters
 * keep their original bare names (`01-history`), so `rag` picks every `<nn>-…` slug too.
 * @param {string[]} slugs
 * @param {string[]} filters
 */
export const pick = (slugs, filters) =>
  filters.length
    ? slugs.filter(s =>
        filters.some(f => s === f || new RegExp(`^${f}-(\\d|recap$)`).test(s) || (f === 'rag' && /^\d{2}-/.test(s))),
      )
    : slugs;
