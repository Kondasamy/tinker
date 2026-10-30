// Choosing a model's three machines and Larkspur's 20 questions (KTD2, KTD3): hand-set, made-up numbers, never a real
// model. Every count the chapters show is read off these files here, so copy never types one.
import data from '../../../data/choosing-models/machines.json' with { type: 'json' };
import qs from '../../../data/choosing-models/questions.json' with { type: 'json' };

export type MachineId = 'A' | 'B' | 'C';
export const IDS: MachineId[] = ['A', 'B', 'C'];
export interface Machine {
  id: MachineId;
  name: string;
  /** the version Larkspur calls, pinned */
  version: string;
  /** score on the public test, out of 100 */
  public: number;
  /** US dollars per million tokens, in and out */
  priceIn: number;
  priceOut: number;
  /** seconds to the first word */
  ttft: number;
  /** words per second once it starts */
  wps: number;
}
export const MACHINES = data.machines as Machine[];
export const machineOf = (id: MachineId) => MACHINES.find(m => m.id === id)!;
/** Said wherever the machines show (R6, R13). */
export const NOTE = data.note;

/** Machine C's new version (chapter 6): the same price and speed, a new public score. */
export const NEXT: Machine = {
  ...machineOf(data.next.of as MachineId),
  version: data.next.version,
  public: data.next.public,
};

export interface Question {
  id: string;
  text: string;
  pass: Record<string, number>;
}
export const QUESTIONS = qs.questions as Question[];
export const QUESTIONS_NOTE = qs.note;
/** Larkspur's bar: questions of the 20 a machine must pass to be used for support replies */
export const BAR = qs.bar;
/** a typical support reply: tokens in and out, words, and replies a month */
export const REPLY = qs.reply;

/** Questions passed of the 20, by a machine's id or a version (c-2026-11). */
export const passesOf = (key: string) => QUESTIONS.filter(q => q.pass[key] === 1).length;
/** The questions whose result changed between two versions, and which way. */
export const changed = (from: string, to: string) =>
  QUESTIONS.filter(q => q.pass[from] !== q.pass[to]).map(q => ({ ...q, now: q.pass[to] === 1 }));

/** Where a chapter's quality comes from: the public test, Larkspur's 20, or Larkspur's 20 with C's new version. */
export type Source = 'public' | 'larkspur' | 'next';
/** The machine each id stands for in a source (C is its new version under `next`). */
export const machineIn = (id: MachineId, source: Source) =>
  source === 'next' && id === NEXT.id ? NEXT : machineOf(id);
/** A machine's quality in a source, 0 to 1. */
export const qualityOf = (id: MachineId, source: Source) =>
  source === 'public'
    ? machineOf(id).public / 100
    : passesOf(source === 'next' && id === NEXT.id ? NEXT.version : id) / QUESTIONS.length;
/** Ids best first by a score; ties keep A, B, C order. */
export const rank = (score: (id: MachineId) => number) => [...IDS].sort((a, b) => score(b) - score(a));
