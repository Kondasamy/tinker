import { describe, it, expect } from 'vitest';
import { MODULES, moduleOf, moduleNumber, chapterHref, nextOf } from '../../src/lib/modules';
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
  // docs/plans/2026-10-29-1438-feat-six-ai-modules-plan.md takes the three above live and adds these (KTD12)
  ['choosing-models', 'Beginner'],
  ['on-device', 'Intermediate'],
  ['robots', 'Advanced'],
  ['rate-limits', 'Beginner', 'Classic tech'],
  ['backups', 'Beginner', 'Classic tech'],
  ['unicode', 'Beginner', 'Classic tech'],
  ['routes', 'Intermediate', 'Classic tech'],
  // docs/plans/2026-10-30-0831-feat-last-roadmap-seven-modules-plan.md takes the seven above live and adds these (KTD11)
  ['translation', 'Beginner'],
  ['open-weights', 'Intermediate'],
  ['ai-energy', 'Advanced'],
  ['clocks', 'Beginner', 'Classic tech'],
  ['gps', 'Intermediate', 'Classic tech'],
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

  // the last five cards stay planned through the seven-roadmap-modules plan; the rest go live in turn, so a card gone from the list is live
  it('keeps the five cards that stay planned last and in order, and every roadmap card no longer planned is live', () => {
    const planned = MODULES.filter(m => m.status === 'planned').map(m => m.id);
    expect(planned.slice(-5)).toEqual(ROADMAP.slice(-5).map(([id]) => id));
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
        .slice(1, 7),
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
        .slice(1, 8),
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
        .slice(1, 9),
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
        .slice(1, 10),
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
        .slice(1, 11),
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
        .slice(1, 12),
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
        .slice(1, 13),
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
        .slice(1, 14),
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
        .slice(1, 15),
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
        .slice(1, 16),
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
        .slice(1, 17),
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
        .slice(1, 18),
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
    expect(moduleNumber(moduleOf('pre-training'))).toBe(18);
  });

  it('has post-training as a live Advanced module that recommends Fine-tuning and Evals first, numbered 19', () => {
    expect(moduleOf('post-training')).toMatchObject({
      title: 'Post-training',
      level: 'Advanced',
      status: 'live',
      prereqs: ['fine-tuning', 'evals'],
    });
    expect(moduleOf('post-training').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('post-training'))).toBe(19);
  });

  it('has interpretability as a live Advanced module that recommends Transformers first, numbered 20', () => {
    expect(moduleOf('interpretability')).toMatchObject({
      title: 'Interpretability',
      level: 'Advanced',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('interpretability').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('interpretability'))).toBe(20);
  });

  it('has caching as a live Beginner module with no prerequisites, numbered 21', () => {
    expect(moduleOf('caching')).toMatchObject({
      title: 'Caching & CDNs',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('caching').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('caching'))).toBe(21);
  });

  it('has databases as a live Beginner module with no prerequisites, numbered 22', () => {
    expect(moduleOf('databases')).toMatchObject({
      title: 'Databases & indexes',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('databases').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('databases'))).toBe(22);
  });

  it('has consistency as a live Advanced module after databases, numbered 23', () => {
    expect(moduleOf('consistency')).toMatchObject({
      title: 'Replication & consistency',
      level: 'Advanced',
      status: 'live',
      prereqs: ['databases'],
    });
    expect(moduleOf('consistency').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('consistency'))).toBe(23);
  });

  it('has ab-testing as a live Beginner module after consistency, numbered 24', () => {
    expect(moduleOf('ab-testing')).toMatchObject({
      title: 'A/B testing',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('ab-testing').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('ab-testing'))).toBe(24);
  });

  it('has diffusion as a live Intermediate module after ab-testing, numbered 25', () => {
    expect(moduleOf('diffusion')).toMatchObject({
      title: 'Diffusion models',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['multimodal'],
    });
    expect(moduleOf('diffusion').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('diffusion'))).toBe(25);
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
    expect(moduleNumber(moduleOf('search'))).toBe(26);
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
    expect(moduleNumber(moduleOf('web-requests'))).toBe(27);
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
    expect(moduleNumber(moduleOf('payments'))).toBe(28);
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
    expect(moduleNumber(moduleOf('git'))).toBe(29);
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
    expect(live.indexOf('calibration')).toBe(30);
  });

  it('has computer-use as a live Advanced module, numbered 31', () => {
    expect(moduleOf('computer-use')).toMatchObject({
      title: 'Computer use',
      level: 'Advanced',
      status: 'live',
      prereqs: ['agents', 'multimodal'],
    });
    expect(moduleOf('computer-use').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('computer-use'))).toBe(31);
  });

  it('has diffusion-llms as a live Advanced module, numbered 32', () => {
    expect(moduleOf('diffusion-llms')).toMatchObject({
      title: 'Diffusion language models',
      level: 'Advanced',
      status: 'live',
      prereqs: ['diffusion', 'transformers'],
    });
    expect(moduleOf('diffusion-llms').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('diffusion-llms'))).toBe(32);
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
    expect(moduleNumber(moduleOf('queues'))).toBe(33);
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
    expect(moduleNumber(moduleOf('compression'))).toBe(34);
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
    expect(moduleNumber(moduleOf('load-balancing'))).toBe(35);
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
    expect(moduleNumber(moduleOf('encryption'))).toBe(36);
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
    expect(moduleNumber(moduleOf('coding-agents'))).toBe(37);
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
    expect(moduleNumber(moduleOf('synthetic-data'))).toBe(38);
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
    expect(moduleNumber(moduleOf('mixture-of-experts'))).toBe(39);
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
    expect(moduleNumber(moduleOf('logins'))).toBe(40);
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
    expect(moduleNumber(moduleOf('email'))).toBe(41);
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
    expect(moduleNumber(moduleOf('dependencies'))).toBe(42);
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
    expect(moduleNumber(moduleOf('releases'))).toBe(43);
  });

  it('has recommendations as a live Intermediate module with no prereqs, numbered 44', () => {
    expect(moduleOf('recommendations')).toMatchObject({
      title: 'Recommendations',
      level: 'Intermediate',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('recommendations').track).toBeUndefined();
    expect(moduleOf('recommendations').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('recommendations'))).toBe(44);
  });

  it('has memorisation as a live Intermediate module after pre-training, numbered 45', () => {
    expect(moduleOf('memorisation')).toMatchObject({
      title: 'What a model remembers',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['pre-training'],
    });
    expect(moduleOf('memorisation').track).toBeUndefined();
    expect(moduleOf('memorisation').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('memorisation'))).toBe(45);
  });

  it('has video-models as a live Advanced module after diffusion, numbered 46', () => {
    expect(moduleOf('video-models')).toMatchObject({
      title: 'Video and world models',
      level: 'Advanced',
      status: 'live',
      prereqs: ['diffusion'],
    });
    expect(moduleOf('video-models').track).toBeUndefined();
    expect(moduleOf('video-models').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('video-models'))).toBe(46);
  });

  it('has prompts as a live Beginner module after video-models, numbered 47', () => {
    expect(moduleOf('prompts')).toMatchObject({
      title: 'Writing a prompt',
      level: 'Beginner',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('prompts').track).toBeUndefined();
    expect(moduleOf('prompts').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('prompts'))).toBe(47);
  });

  it('has labelling as a live Intermediate module after prompts, numbered 48', () => {
    expect(moduleOf('labelling')).toMatchObject({
      title: 'Who labels the data',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('labelling').track).toBeUndefined();
    expect(moduleOf('labelling').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('labelling'))).toBe(48);
  });

  it('has fairness as a live Intermediate module after labelling, numbered 49', () => {
    expect(moduleOf('fairness')).toMatchObject({
      title: 'Bias and fairness',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['calibration'],
    });
    expect(moduleOf('fairness').track).toBeUndefined();
    expect(moduleOf('fairness').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('fairness'))).toBe(49);
  });

  it('has watermarks as a live Intermediate module after fairness, numbered 50', () => {
    expect(moduleOf('watermarks')).toMatchObject({
      title: 'Watermarks and made-by-AI',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['transformers'],
    });
    expect(moduleOf('watermarks').track).toBeUndefined();
    expect(moduleOf('watermarks').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('watermarks'))).toBe(50);
  });

  it('has agent-commerce as a live Advanced module after watermarks, numbered 51', () => {
    expect(moduleOf('agent-commerce')).toMatchObject({
      title: 'When the buyer is an agent',
      level: 'Advanced',
      status: 'live',
      prereqs: ['agents', 'payments'],
    });
    expect(moduleOf('agent-commerce').track).toBeUndefined();
    expect(moduleOf('agent-commerce').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('agent-commerce'))).toBe(51);
  });

  it('has parallel-training as a live Advanced module after agent-commerce, numbered 52', () => {
    expect(moduleOf('parallel-training')).toMatchObject({
      title: 'Many chips, one model',
      level: 'Advanced',
      status: 'live',
      prereqs: ['pre-training'],
    });
    expect(moduleOf('parallel-training').track).toBeUndefined();
    expect(moduleOf('parallel-training').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('parallel-training'))).toBe(52);
  });

  it('has choosing-models as a live Beginner module after parallel-training, numbered 53', () => {
    expect(moduleOf('choosing-models')).toMatchObject({
      title: 'Choosing a model',
      level: 'Beginner',
      status: 'live',
      prereqs: ['evals'],
    });
    expect(moduleOf('choosing-models').track).toBeUndefined();
    expect(moduleOf('choosing-models').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('choosing-models'))).toBe(53);
  });

  it('has rate-limits as a live Beginner Classic tech module after choosing-models, recommending Web requests first', () => {
    expect(moduleOf('rate-limits')).toMatchObject({
      title: 'Rate limits',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: ['web-requests'],
    });
    expect(moduleOf('rate-limits').author).toEqual(moduleOf('rag').author);
    expect(MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'rate-limits')).toBe(
      MODULES.filter(m => m.status === 'live').findIndex(m => m.id === 'choosing-models') + 1,
    );
  });

  it('has unicode as a live Beginner Classic tech module after parallel-training, with no prerequisites', () => {
    expect(moduleOf('unicode')).toMatchObject({
      title: 'Text and Unicode',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('unicode').author).toEqual(moduleOf('rag').author);
    const live = MODULES.filter(m => m.status === 'live').map(m => m.id);
    expect(live.indexOf('unicode')).toBeGreaterThan(live.indexOf('parallel-training'));
  });

  it('has backups as a live Beginner Classic tech module that recommends Databases, after parallel-training', () => {
    expect(moduleOf('backups')).toMatchObject({
      title: 'Backups and recovery',
      level: 'Beginner',
      track: 'Classic tech',
      status: 'live',
      prereqs: ['databases'],
    });
    expect(moduleOf('backups').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('backups'))).toBe(56);
  });

  it('has on-device as a live Intermediate module after backups, numbered 57', () => {
    expect(moduleOf('on-device')).toMatchObject({
      title: 'Models on your device',
      level: 'Intermediate',
      status: 'live',
      prereqs: ['inference'],
    });
    expect(moduleOf('on-device').track).toBeUndefined();
    expect(moduleOf('on-device').author).toEqual(moduleOf('rag').author);
    expect(moduleNumber(moduleOf('on-device'))).toBe(57);
  });

  it('has routes as a live Intermediate Classic tech module after parallel-training', () => {
    expect(moduleOf('routes')).toMatchObject({
      title: 'Finding the way',
      level: 'Intermediate',
      track: 'Classic tech',
      status: 'live',
      prereqs: [],
    });
    expect(moduleOf('routes').author).toEqual(moduleOf('rag').author);
    const live = MODULES.filter(m => m.status === 'live').map(m => m.id);
    expect(live.indexOf('routes')).toBeGreaterThan(live.indexOf('parallel-training'));
  });

  it('has robots as a live Advanced module after parallel-training', () => {
    expect(moduleOf('robots')).toMatchObject({
      title: 'Robots that act',
      level: 'Advanced',
      status: 'live',
      prereqs: ['multimodal'],
    });
    expect(moduleOf('robots').track).toBeUndefined();
    expect(moduleOf('robots').author).toEqual(moduleOf('rag').author);
    const live = MODULES.filter(m => m.status === 'live').map(m => m.id);
    expect(live.indexOf('robots')).toBeGreaterThan(live.indexOf('parallel-training'));
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

// the prequel's pages come first after home; RAG's follow, as they did before it
const AFTER_PREQUEL = ALL_PAGES.filter(p => !p.path.startsWith('/before-genai/'));

describe('module numbers', () => {
  it('numbers the prequel 0 and keeps every other module where it was', () => {
    expect(MODULES[0].id).toBe('before-genai');
    expect(moduleNumber(moduleOf('before-genai'))).toBe(0);
    expect(moduleNumber(moduleOf('rag'))).toBe(1);
    expect(moduleNumber(moduleOf('tool-calling'))).toBe(2);
    expect(moduleNumber(moduleOf('robots'))).toBe(59);
  });
});

describe('page meta', () => {
  it('keeps every RAG share image name', () => {
    expect(AFTER_PREQUEL.map(p => p.og).slice(0, 10)).toEqual([
      'home',
      'rag',
      ...RAG_CHAPTERS.map(([id]) => id),
      'rag-recap',
    ]);
    expect(ALL_PAGES).toContain(TOOL_CALLING);
    expect(TOOL_CALLING).toMatchObject({ path: '/tool-calling/', og: 'tool-calling' });
  });

  it('gives every page a path and its own share image', () => {
    expect(AFTER_PREQUEL.map(p => p.path).slice(0, 10)).toEqual([
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
