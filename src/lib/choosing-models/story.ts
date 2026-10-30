// How each chapter names the machines' quality: the public test's score, or questions passed of Larkspur's 20 (with C's
// new version in chapter 6). The pills, the Scores tab and the captions all read it from here.
import { IDS, NEXT, QUESTIONS, machineOf, passesOf, type MachineId, type Source } from './machines';

const each = (f: (id: MachineId) => string) =>
  Object.fromEntries(IDS.map(id => [id, f(id)])) as Record<MachineId, string>;
const N = QUESTIONS.length;
/** passed of the 20, by machine, in a source */
export const passedIn = (id: MachineId, source: Source) =>
  passesOf(source === 'next' && id === NEXT.id ? NEXT.version : id);

export function qualityText(source: Source) {
  if (source === 'public')
    return {
      name: 'Public test',
      text: each(id => `${machineOf(id).public}`),
      pills: each(id => `${id} · ${machineOf(id).public}`),
    };
  return {
    name: source === 'next' ? `Larkspur’s ${N}, C new` : `Larkspur’s ${N}`,
    text: each(id => `${passedIn(id, source)} of ${N}`),
    pills: each(id => `${id}${source === 'next' && id === NEXT.id ? ' NEW' : ''} · ${passedIn(id, source)}/${N}`),
  };
}
