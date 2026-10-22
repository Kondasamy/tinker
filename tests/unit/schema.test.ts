import { describe, expect, it } from 'vitest';
import { validate, type Schema } from '../../src/lib/tools/schema';
import { TOOLS } from '../../src/lib/tools/server';

const schemaOf = (name: string) => TOOLS.find(t => t.name === name)!.inputSchema as Schema;
const getOrder = schemaOf('get_order'),
  refund = schemaOf('issue_refund');

describe('validate (a subset of JSON Schema)', () => {
  it('a string where an integer belongs fails with its path', () => {
    expect(validate(getOrder, { order_id: '1042' })).toEqual(['order_id must be an integer']);
    expect(validate(getOrder, { order_id: 1042.5 })).toEqual(['order_id must be an integer']);
  });

  it('a missing required field fails with its path', () => {
    expect(validate(getOrder, {})).toEqual(['order_id is required']);
    const nested: Schema = {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: { type: 'object', properties: { qty: { type: 'integer' } }, required: ['qty'] },
        },
      },
    };
    expect(validate(nested, { items: [{ qty: 1 }, {}] })).toEqual(['items[1].qty is required']);
  });

  it('an extra field fails under additionalProperties: false', () => {
    expect(validate(getOrder, { order_id: 1042, rush: true })).toEqual(['rush is not an allowed field']);
  });

  it('an enum mismatch lists the allowed values', () => {
    expect(validate(refund, { order_id: 1042, amount: 10, reason: 'angry' })).toEqual([
      'reason must be one of: damaged, wrong_item, late, customer_request',
    ]);
  });

  it('checks minimum, maximum and pattern', () => {
    expect(validate(getOrder, { order_id: 99 })).toEqual(['order_id must be at least 1000']);
    expect(validate(getOrder, { order_id: 10000 })).toEqual(['order_id must be at most 9999']);
    expect(validate(schemaOf('get_calendar'), { date: 'next Tuesday' })).toEqual([
      'date must match the pattern ^\\d{4}-\\d{2}-\\d{2}$',
    ]);
  });

  it('names the whole input when it is not an object', () => {
    expect(validate(getOrder, '1042')).toEqual(['arguments must be an object']);
    expect(validate(getOrder, [1042])).toEqual(['arguments must be an object']);
    expect(validate(getOrder, null)).toEqual(['arguments must be an object']);
  });

  it('a valid object passes', () => {
    expect(validate(getOrder, { order_id: 1042 })).toEqual([]);
    expect(validate(refund, { order_id: 1042, amount: 310, reason: 'damaged' })).toEqual([]);
    expect(validate({ type: 'boolean' }, true)).toEqual([]);
    expect(validate({ type: 'number' }, 3)).toEqual([]);
  });
});
