// The requests the chapters ask, in plain words, with their SQL for the fold-away. Values come from the table itself
// (the regular customer, today, this month), never typed by hand.
import type { Query } from '../../lib/databases/planner';
import { MONTH, MONTH_NAME, REGULAR, TODAY, dayName, newOrders } from '../../lib/databases/table';

const DATE0 = '2026-01-01';
export const NEW = newOrders(1)[0];
const sqlDay = (d: number) => `DATE '${DATE0}' + ${d}`;

export const ONE: Query = { where: { id: 1042 } };
export const TODAYS: Query = { where: { day: [TODAY, TODAY] } };
export const MONTHS: Query = { where: { day: MONTH } };
export const MINE: Query = { where: { customer: REGULAR, day: MONTH } };

export const SQL = {
  one: 'SELECT * FROM orders WHERE id = 1042;',
  today: `SELECT * FROM orders WHERE day = ${sqlDay(TODAY)};`,
  month: `SELECT * FROM orders\nWHERE day BETWEEN ${sqlDay(MONTH[0])} AND ${sqlDay(MONTH[1])};`,
  mine: `SELECT * FROM orders\nWHERE customer = ${REGULAR}\n  AND day BETWEEN ${sqlDay(MONTH[0])} AND ${sqlDay(MONTH[1])};`,
  join: `SELECT o.*, c.*\nFROM orders o JOIN customers c ON c.id = o.customer\nWHERE o.day = ${sqlDay(TODAY)};`,
  insert: `INSERT INTO orders (id, customer, day, status)\nVALUES (${NEW.id}, ${NEW.customer}, ${sqlDay(TODAY)}, 'open');`,
  index: {
    id: 'CREATE INDEX ON orders (id);',
    customer: 'CREATE INDEX ON orders (customer);',
    customer_date: 'CREATE INDEX ON orders (customer, day);',
    date: 'CREATE INDEX ON orders (day);',
    status: 'CREATE INDEX ON orders (status);',
  },
};

export const TODAY_NAME = dayName(TODAY);
export { MONTH_NAME, REGULAR };
