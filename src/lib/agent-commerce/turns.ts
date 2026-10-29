// The recorded agent turns (KTD4), one reviewed file per chapter that has them, named after the chapter. A file's
// `meta` names the model and date; a turn marked `simulated` came from simulate.ts (KTD13).
import type { BuyerTurn, ReadTurn, Recording, SellerTurn } from './seen';

export * from './seen';

const files = import.meta.glob<Recording<unknown>>('/data/agent-commerce/turns/*.json', {
  eager: true,
  import: 'default',
});
export const RECORDINGS: Record<string, Recording<unknown>> = Object.fromEntries(
  Object.entries(files).map(([path, rec]) => [path.slice(path.lastIndexOf('/') + 1, -'.json'.length), rec]),
);
const of = <T>(name: string) => (RECORDINGS[name] ?? { meta: { model: '', accessed: '' }, turns: {} }) as Recording<T>;
export const PAGE_TURNS = of<ReadTurn>('01-a-page-for-people');
export const MENU_TURNS = of<ReadTurn>('02-a-menu-for-agents');
export const TASK_TURNS = of<SellerTurn>('03-agent-to-agent');
export const OFFER_TURNS = of<BuyerTurn>('05-a-seller-that-talks-back');
