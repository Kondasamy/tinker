import { describe, expect, it } from 'vitest';
import { markTerms, unmarked, type Segment } from '../../src/components/story/terms';

const words = (segs: Segment[]) => segs.map(s => (typeof s === 'string' ? s : `[${s.text}]`)).join('');
const WINDOW = ['Context window', 'How much a model reads.'] as const;
const LLM = ['LLM', 'A language model.'] as const;

describe('markTerms', () => {
  it('marks a term once, at its first use in step order', () => {
    const out = markTerms(['No terms here.', 'An LLM reads. The LLM writes.', 'Another LLM.'], [LLM]);
    expect(out.map(words)).toEqual(['No terms here.', 'An [LLM] reads. The LLM writes.', 'Another LLM.']);
  });

  it('matches a plural and a possessive, case-insensitively', () => {
    expect(words(markTerms(['Two LLMs talk.'], [LLM])[0])).toBe('Two [LLMs] talk.');
    expect(words(markTerms(["the context window's size"], [WINDOW])[0])).toBe("the [context window]'s size");
  });

  it('never matches inside another word', () => {
    expect(markTerms(['a fragment of text'], [['RAG', 'x']])[0]).toEqual(['a fragment of text']);
    expect(markTerms(['re-ranked'], [['ranked', 'x']])[0]).toEqual(['re-ranked']);
  });

  it('lets the longer of two overlapping terms win', () => {
    const out = markTerms(['The context window is full.', 'Some context.'], [['Context', 'short'], WINDOW]);
    expect(out.map(words)).toEqual(['The [context window] is full.', 'Some [context].']);
  });

  it('leaves narration without matches unchanged, including empty text', () => {
    expect(markTerms(['Plain.', ''], [])).toEqual([['Plain.'], ['']]);
  });

  it('keeps the definition with the mark', () => {
    const mark = markTerms(['an LLM'], [LLM])[0][1];
    expect(mark).toEqual({ term: 'LLM', def: 'A language model.', text: 'LLM' });
  });
});

describe('unmarked', () => {
  it('lists the terms no narration uses', () => {
    expect(unmarked(['An LLM.'], [LLM, WINDOW])).toEqual(['Context window']);
  });
});
