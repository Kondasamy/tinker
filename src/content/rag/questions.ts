// Every question in the module, chapter by chapter, for the chapters that offer them all (6 and the Sandbox).
import type { CanvasQuestion } from '../../components/canvas/state';
import ch3 from '../../../data/questions/ch3.json';
import ch4 from '../../../data/questions/ch4.json';
import ch5 from '../../../data/questions/ch5.json';
import ch6 from '../../../data/questions/ch6.json';

export const QS_ALL = [...ch3, ...ch4, ...ch5, ...ch6] as CanvasQuestion[];
export const questionById = (id: string) => QS_ALL.find(q => q.id === id)!;
