import { describe, it, expect } from 'vitest';
import { MODULES, moduleOf, chapterHref, nextOf } from '../../src/lib/modules';
import { ALL_PAGES, HOME, RAG, TOOL_CALLING, chapterMeta } from '../../src/lib/pages';
import { FACTS, ACCESSED, fact } from '../../src/lib/tools/facts';
import { PROTOCOL_VERSION } from '../../src/lib/tools/server';

// RAG's chapter ids are a contract with every reader's saved progress (R3): never rename them.
const RAG_CHAPTERS = [
  ['01-history', 'How RAG came to be'],
  ['02-why-not-stuff-it', 'Why not stuff it all in the prompt?'],
  ['03-what-is-rag', 'What is RAG?'],
  ['04-layers', 'The layers of a RAG system'],
  ['05-accuracy', 'Making RAG accurate'],
  ['06-types', 'Types of RAG'],
  ['07-sandbox', 'Sandbox'],
];

// the roadmap (docs/plans/2026-10-25-1824-feat-last-seven-roadmap-modules-plan.md), in registry order: the seven cards
// that plan takes live, then the seven new cards that follow them (R16); each with its level and track (absent is AI)
const ROADMAP: [string, string, string?][] = [
  ['mixture-of-experts', 'Advanced'],
  ['coding-agents', 'Intermediate'],
  ['synthetic-data', 'Intermediate'],
  ['queues', 'Beginner', 'Classic tech'],
  ['encryption', 'Beginner', 'Classic tech'],
  ['compression', 'Beginner', 'Classic tech'],
  ['load-balancing', 'Intermediate', 'Classic tech'],
  ['memorisation', 'Intermediate'],
  ['video-models', 'Advanced'],
  ['recommendations', 'Intermediate'],
  ['logins', 'Beginner', 'Classic tech'],
  ['email', 'Beginner', 'Classic tech'],
  ['dependencies', 'Intermediate', 'Classic tech'],
  ['releases', 'Intermediate', 'Classic tech'],
  // docs/plans/2026-10-28-2100-feat-final-seven-roadmap-modules-plan.md takes the seven above live; these follow (KTD14)
  ['fairness', 'Intermediate'],
  ['watermarks', 'Intermediate'],
  ['prompts', 'Beginner'],
  ['rate-limits', 'Beginner', 'Classic tech'],
  ['backups', 'Beginner', 'Classic tech'],
  ['unicode', 'Beginner', 'Classic tech'],
  ['routes', 'Intermediate', 'Classic tech'],
];
/** true when every id in `ids` is in `list`, in the list's order */
const inOrder = (ids: string[], list: string[]) => {
  let at = 0;
  return ids.every(id => (at = list.indexOf(id, at) + 1) > 0);
};

describe('module registry', () => {
  it('keeps RAG’s 7 chapters, ids and titles', () => {
    expect(moduleOf('rag').chapters.map(c => [c.id, c.title])).toEqual(RAG_CHAPTERS);
  });

  it('gives every module a level, and RAG is a live Beginner module', () => {
    expect(moduleOf('rag')).toMatchObject({ level: 'Beginner', status: 'live' });
    for (const m of MODULES) expect(['Beginner', 'Intermediate', 'Advanced']).toContain(m.level);
  });

  it('has what is left of the roadmap as planned cards, in build order, each at its level and track with no chapters and no prereqs', () => {
    const planned = MODULES.filter(m => m.status === 'planned');
    expect(
      inOrder(
        planned.map(m => m.id),
        ROADMAP.map(([id]) => id),
      ),
    ).toBe(true);
    for (const m of planned) {
      const [, level, track] = ROADMAP.find(([id]) => id === m.id)!;
      expect([m.level, m.track], m.id).toEqual([level, track]);
      expect([m.chapters, m.prereqs], m.id).toEqual([[], []]);
    }
  });

  // the R16 cards stay planned through this plan; the first seven go live in turn, so a card gone from the list is live
  it('keeps the seven new roadmap cards last and in order, and every roadmap card no longer planned is live', () => {
    const planned = MODULES.filter(m => m.status === 'planned').map(m => m.id);
    expect(planned.slice(-7)).toEqual(ROADMAP.slice(-7).map(([id]) => id));
    for (const [id] of ROADMAP) if (!planned.includes(id)) expect(moduleOf(id).status, id).toBe('live');
  });

  it('says on the home page that Tinker explains how tech works, AI and classic, within 160 characters', () => {
    expect(HOME.description).toMatch(/how tech works/);
    expect(HOME.description).not.toMatch(/how AI works/);
    expect(HOME.description.length).toBeLessThan(160);
  });

  // each go-live removes one roadmap card, so the planned list shrinks but never reorders (KTD14)
  it('accepts the roadmap with any one card gone, and rejects two cards swapped', () => {
    const ids = ROADMAP.map(([id]) => id);
    for (const gone of ids)
      expect(
        inOrder(
          ids.filter(id => id !== gone),
          ids,
        ),
        gone,
      ).toBe(true);
    expect(inOrder([], ids)).toBe(true);
    expect(inOrder([ids[1], ids[0], ...ids.slice(2)], ids)).toBe(false);
    expect(inOrder(['nope'], ids)).toBe(false);
  });

  it('has tool calling as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('tool-calling')).toMatchObject({
      title: 'Tool calling & MCP',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag'],
    });
    expect(moduleOf('tool-calling').author).toEqual(moduleOf('rag').author);
  });

  it('has AI agents as a live Advanced module that recommends tool calling first', () => {
    expect(moduleOf('agents')).toMatchObject({
      title: 'AI agents',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tool-calling'],
    });
    expect(moduleOf('agents').author).toEqual(moduleOf('rag').author);
  });

  it('has evals as a live Intermediate module that recommends RAG first', () => {
    expect(moduleOf('evals')).toMatchObject({
      title: 'Evals & LLM testing',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag'],
    });
    expect(moduleOf('evals').author).toEqual(moduleOf('rag').author);
  });

  it('has guardrails as a live Intermediate module that recommends Tool calling first', () => {
    expect(moduleOf('guardrails')).toMatchObject({
      title: 'Prompt injection & guardrails',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tool-calling'],
    });
    expect(moduleOf('guardrails').author).toEqual(moduleOf('rag').author);
  });

  it('has tokens as a live Beginner module with no prerequisites, numbered 6 after guardrails', () => {
    expect(moduleOf('tokens')).toMatchObject({
      title: 'Tokens & embeddings',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('tokens').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 6),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens']);
  });

  it('has transformers as a live Advanced module that recommends Tokens first, numbered 7 after tokens', () => {
    expect(moduleOf('transformers')).toMatchObject({
      title: 'Transformer architecture',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('transformers').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 7),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers']);
  });

  it('has context as a live Intermediate module that recommends RAG and Tool calling first, numbered 8 after transformers', () => {
    expect(moduleOf('context')).toMatchObject({
      title: 'Context engineering & memory',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['rag', 'tool-calling'],
    });
    expect(moduleOf('context').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 8),
    ).toEqual(['rag', 'tool-calling', 'agents', 'evals', 'guardrails', 'tokens', 'transformers', 'context']);
  });

  it('has fine-tuning as a live Advanced module that recommends Evals and Transformers first, numbered 9 after context', () => {
    expect(moduleOf('fine-tuning')).toMatchObject({
      title: 'Fine-tuning vs prompting',
      level: 'Advanced',
      status: 'live',
      prereqs: ['evals', 'transformers'],
    });
    expect(moduleOf('fine-tuning').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 9),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
    ]);
  });

  it('has structured-outputs as a live Intermediate module that recommends Tool calling and Tokens first, numbered 10 after fine-tuning', () => {
    expect(moduleOf('structured-outputs')).toMatchObject({
      title: 'Structured outputs',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tool-calling', 'tokens'],
    });
    expect(moduleOf('structured-outputs').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 10),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
    ]);
  });

  it('has reasoning as a live Intermediate module that recommends Evals first, numbered 11 after structured-outputs', () => {
    expect(moduleOf('reasoning')).toMatchObject({
      title: 'Reasoning models & thinking budgets',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('reasoning').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 11),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
    ]);
  });

  it('has small-models as a live Advanced module that recommends Fine-tuning and Evals first, numbered 12 after reasoning', () => {
    expect(moduleOf('small-models')).toMatchObject({
      title: 'Small models: distillation & routing',
      level: 'Advanced',
      status: 'live',
      prereqs: ['fine-tuning', 'evals'],
    });
    expect(moduleOf('small-models').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 12),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
    ]);
  });

  it('has inference as a live Advanced module that recommends Transformers first, numbered 13 after small-models', () => {
    expect(moduleOf('inference')).toMatchObject({
      title: 'Inference engineering',
      level: 'Advanced',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('inference').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 13),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
    ]);
  });

  it('has observability as a live Intermediate module that recommends Evals first, numbered 14 after inference', () => {
    expect(moduleOf('observability')).toMatchObject({
      title: 'Observability & error analysis',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('observability').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 14),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
      'observability',
    ]);
  });

  it('has sandboxing as a live Advanced module that recommends Agents and Guardrails first, numbered 15 after observability', () => {
    expect(moduleOf('sandboxing')).toMatchObject({
      title: 'Agent sandboxing',
      level: 'Advanced',
      status: 'live',
      prereqs: ['agents', 'guardrails'],
    });
    expect(moduleOf('sandboxing').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 15),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
      'observability',
      'sandboxing',
    ]);
  });

  it('has multimodal as a live Intermediate module that recommends Tokens first, numbered 16 after sandboxing', () => {
    expect(moduleOf('multimodal')).toMatchObject({
      title: 'Multimodal models',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('multimodal').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 16),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
      'observability',
      'sandboxing',
      'multimodal',
    ]);
  });

  it('has voice as a live Advanced module that recommends Tool calling and Multimodal first, numbered 17', () => {
    expect(moduleOf('voice')).toMatchObject({
      title: 'Voice agents',
      level: 'Advanced',
      status: 'live',
      prereqs: ['tool-calling', 'multimodal'],
    });
    expect(moduleOf('voice').author).toEqual(moduleOf('rag').author);
    expect(
      MODULES.filter(m => m.status === 'live')
        .map(m => m.id)
        .slice(0, 17),
    ).toEqual([
      'rag',
      'tool-calling',
      'agents',
      'evals',
      'guardrails',
      'tokens',
      'transformers',
      'context',
      'fine-tuning',
      'structured-outputs',
      'reasoning',
      'small-models',
      'inference',
      'observability',
      'sandboxing',
      'multimodal',
      'voice',
    ]);
  });

  it('has pre-training as a live Intermediate module that recommends Tokens first, numbered 18', () => {
    expect(moduleOf('pre-training')).toMatchObject({
      title: 'Pre-training',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['tokens'],
    });
    expect(moduleOf('pre-training').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'pre-training')).toBe(17);
  });

  it('has post-training as a live Advanced module that recommends Fine-tuning and Evals first, numbered 19', () => {
    expect(moduleOf('post-training')).toMatchObject({
      title: 'Post-training',
      level: 'Advanced',
      status: 'live',
      prereqs: ['fine-tuning', 'evals'],
    });
    expect(moduleOf('post-training').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'post-training')).toBe(18);
  });

  it('has interpretability as a live Advanced module that recommends Transformers first, numbered 20', () => {
    expect(moduleOf('interpretability')).toMatchObject({
      title: 'Interpretability',
      level: 'Advanced',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('interpretability').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'interpretability')).toBe(19);
  });

  it('has caching as a live Beginner module with no prerequisites, numbered 21', () => {
    expect(moduleOf('caching')).toMatchObject({
      title: 'Caching & CDNs',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('caching').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'caching')).toBe(20);
  });

  it('has databases as a live Beginner module with no prerequisites, numbered 22', () => {
    expect(moduleOf('databases')).toMatchObject({
      title: 'Databases & indexes',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('databases').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'databases')).toBe(21);
  });

  it('has consistency as a live Advanced module after databases, numbered 23', () => {
    expect(moduleOf('consistency')).toMatchObject({
      title: 'Replication & consistency',
      level: 'Advanced',
      status: 'live',
      prereqs: ['databases'],
    });
    expect(moduleOf('consistency').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'consistency')).toBe(22);
  });

  it('has ab-testing as a live Beginner module after consistency, numbered 24', () => {
    expect(moduleOf('ab-testing')).toMatchObject({
      title: 'A/B testing',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('ab-testing').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'ab-testing')).toBe(23);
  });

  it('has diffusion as a live Intermediate module after ab-testing, numbered 25', () => {
    expect(moduleOf('diffusion')).toMatchObject({
      title: 'Diffusion models',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['multimodal'],
    });
    expect(moduleOf('diffusion').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'diffusion')).toBe(24);
  });

  it('has search as a live Beginner Classic tech module, numbered 26', () => {
    expect(moduleOf('search')).toMatchObject({
      title: 'Search before AI',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('search').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'search')).toBe(25);
  });

  it('has web-requests as a live Beginner Classic-tech module with no prerequisites, numbered 27', () => {
    expect(moduleOf('web-requests')).toMatchObject({
      title: 'Opening a web page',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('web-requests').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'web-requests')).toBe(26);
  });

  it('has payments as a live Beginner Classic-tech module, numbered 28', () => {
    expect(moduleOf('payments')).toMatchObject({
      title: 'Card payments',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('payments').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'payments')).toBe(27);
  });

  it('has git as a live Beginner Classic-tech module, numbered 29', () => {
    expect(moduleOf('git')).toMatchObject({
      title: 'Git',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('git').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'git')).toBe(28);
  });

  it('has calibration as a live Intermediate module that recommends Evals first, numbered 30', () => {
    expect(moduleOf('calibration')).toMatchObject({
      title: 'Calibration',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('calibration').track).toBeUndefined();
    expect(moduleOf('calibration').author).toEqual(moduleOf('rag').author);
    const live = MODULES.filter(m => m.status === 'live').map(m => m.id);
    expect(live.indexOf('calibration')).toBe(29);
  });

  it('has computer-use as a live Advanced module, numbered 31', () => {
    expect(moduleOf('computer-use')).toMatchObject({
      title: 'Computer use',
      level: 'Advanced',
      status: 'live',
      prereqs: ['agents', 'multimodal'],
    });
    expect(moduleOf('computer-use').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'computer-use')).toBe(30);
  });

  it('has diffusion-llms as a live Advanced module, numbered 32', () => {
    expect(moduleOf('diffusion-llms')).toMatchObject({
      title: 'Diffusion language models',
      level: 'Advanced',
      status: 'live',
      prereqs: ['diffusion', 'transformers'],
    });
    expect(moduleOf('diffusion-llms').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'diffusion-llms')).toBe(31);
  });

  it('has queues as a live Beginner Classic tech module, numbered 33', () => {
    expect(moduleOf('queues')).toMatchObject({
      title: 'Queues and background jobs',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('queues').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'queues')).toBe(32);
  });

  it('has compression as a live Beginner Classic tech module, numbered 34', () => {
    expect(moduleOf('compression')).toMatchObject({
      title: 'Compression',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('compression').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'compression')).toBe(33);
  });

  it('has load-balancing as a live Intermediate Classic tech module, numbered 35', () => {
    expect(moduleOf('load-balancing')).toMatchObject({
      title: 'Load balancing',
      level: 'Intermediate',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('load-balancing').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'load-balancing')).toBe(34);
  });

  it('has encryption as a live Beginner Classic tech module, numbered 36', () => {
    expect(moduleOf('encryption')).toMatchObject({
      title: 'Locks and keys',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('encryption').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'encryption')).toBe(35);
  });

  it('has coding-agents as a live Intermediate AI module after AI agents, numbered 37', () => {
    expect(moduleOf('coding-agents')).toMatchObject({
      title: 'Coding agents',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['agents'],
    });
    expect(moduleOf('coding-agents').track).toBeUndefined();
    expect(moduleOf('coding-agents').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'coding-agents')).toBe(36);
  });

  it('has synthetic-data as a live Intermediate AI module after Fine-tuning, numbered 38', () => {
    expect(moduleOf('synthetic-data')).toMatchObject({
      title: 'Synthetic data',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['fine-tuning'],
    });
    expect(moduleOf('synthetic-data').track).toBeUndefined();
    expect(moduleOf('synthetic-data').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'synthetic-data')).toBe(37);
  });

  it('has mixture-of-experts as a live Advanced AI module after Transformers, numbered 39', () => {
    expect(moduleOf('mixture-of-experts')).toMatchObject({
      title: 'Mixture of experts',
      level: 'Advanced',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('mixture-of-experts').track).toBeUndefined();
    expect(moduleOf('mixture-of-experts').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'mixture-of-experts')).toBe(38);
  });

  it('has logins as a live Beginner Classic tech module after Locks and keys, numbered 40', () => {
    expect(moduleOf('logins')).toMatchObject({
      title: 'Logins and passwords',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: ['encryption'],
    });
    expect(moduleOf('logins').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'logins')).toBe(39);
  });

  it('has email as a live Beginner Classic tech module after Opening a web page, numbered 41', () => {
    expect(moduleOf('email')).toMatchObject({
      title: 'How email arrives',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: ['web-requests'],
    });
    expect(moduleOf('email').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'email')).toBe(40);
  });

  it('has dependencies as a live Intermediate Classic tech module with no prereqs, numbered 42', () => {
    expect(moduleOf('dependencies')).toMatchObject({
      title: 'Dependencies',
      level: 'Intermediate',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('dependencies').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'dependencies')).toBe(41);
  });

  it('has releases as a live Intermediate Classic tech module with no prereqs, numbered 43', () => {
    expect(moduleOf('releases')).toMatchObject({
      title: 'Shipping a release',
      level: 'Intermediate',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('releases').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'releases')).toBe(42);
  });

  it('keeps chapter ids unique within every module', () => {
    for (const m of MODULES) expect(new Set(m.chapters.map(c => c.id)).size, m.id).toBe(m.chapters.length);
  });

  it('throws on an unknown module', () => {
    expect(() => moduleOf('nope')).toThrow();
  });

  it('links chapters per module', () => {
    expect(chapterHref('rag', '03-what-is-rag')).toBe('/rag/03-what-is-rag/');
    expect(nextOf('rag', '01-history')).toEqual({ href: '/rag/02-why-not-stuff-it/', title: 'Why not stuff it' });
    expect(nextOf('rag', '07-sandbox')).toBeUndefined();
  });
});

describe('page meta', () => {
  it('keeps every RAG share image name', () => {
    expect(ALL_PAGES.map(p => p.og).slice(0, 10)).toEqual([
      'home',
      'rag',
      ...RAG_CHAPTERS.map(([id]) => id),
      'rag-recap',
    ]);
    expect(ALL_PAGES).toContain(TOOL_CALLING);
    expect(TOOL_CALLING).toMatchObject({ path: '/tool-calling/', og: 'tool-calling' });
  });

  it('gives every page a path and its own share image', () => {
    expect(ALL_PAGES.map(p => p.path).slice(0, 10)).toEqual([
      '/',
      '/rag/',
      ...RAG_CHAPTERS.map(([id]) => `/rag/${id}/`),
      '/rag/recap/',
    ]);
    expect(new Set(ALL_PAGES.map(p => p.path)).size).toBe(ALL_PAGES.length);
    expect(new Set(ALL_PAGES.map(p => p.og)).size).toBe(ALL_PAGES.length);
  });

  it('numbers chapters from the registry, and dev fixtures borrow the module card', () => {
    expect(chapterMeta('rag', '03-what-is-rag')).toMatchObject({
      kicker: 'RAG · Chapter 3 of 7',
      title: 'What is RAG? · RAG · Tinker',
    });
    expect(chapterMeta('rag', 'dev-runner')).toBe(RAG);
    expect(HOME.path).toBe('/');
  });
});

describe('every module’s facts', () => {
  const files = import.meta.glob<{ accessed: string; facts: { id: string; source: string; accessed?: string }[] }>(
    '../../data/*/facts.json',
    { eager: true, import: 'default' },
  );
  it('are sourced, and a fact re-checked on its own is dated no earlier than its file', () => {
    expect(Object.keys(files).length).toBeGreaterThan(10);
    for (const [path, d] of Object.entries(files)) {
      expect(d.accessed, path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      for (const f of d.facts) {
        expect(new URL(f.source).protocol, `${path} ${f.id}`).toBe('https:');
        if (f.accessed === undefined) continue;
        expect(f.accessed, `${path} ${f.id}`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(f.accessed >= d.accessed, `${path} ${f.id}`).toBe(true);
      }
    }
  });
});

describe('tool-calling facts (R22)', () => {
  it("gives every fact a claim, a source URL and an access date no earlier than the file's", () => {
    expect(ACCESSED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FACTS.length).toBeGreaterThan(0);
    expect(new Set(FACTS.map(f => f.id)).size).toBe(FACTS.length);
    for (const f of FACTS) {
      expect(f.claim, f.id).not.toBe('');
      expect(new URL(f.source).protocol, f.id).toBe('https:');
      // a fact re-checked on its own carries a later date than the file's
      expect(fact(f.id).accessed, f.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(fact(f.id).accessed >= ACCESSED, f.id).toBe(true);
    }
  });

  it('the MCP server model speaks the version the facts record', () => {
    expect(PROTOCOL_VERSION).toBe(fact('mcp-version').value);
  });

  it('throws on an unknown fact', () => {
    expect(() => fact('nope')).toThrow();
  });
});
