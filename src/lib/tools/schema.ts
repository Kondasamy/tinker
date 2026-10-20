// Checks a subset of JSON Schema (KTD9): small enough to read, and no `new Function` like ajv.
export type SchemaType = 'object' | 'string' | 'integer' | 'number' | 'boolean' | 'array';
export interface Schema {
  type?: SchemaType;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: (string | number | boolean)[];
  minimum?: number;
  maximum?: number;
  pattern?: string;
  items?: Schema;
}

const A: Record<SchemaType, string> = { object: 'an object', string: 'a string', integer: 'an integer', number: 'a number', boolean: 'a boolean', array: 'an array' };

function isType(type: SchemaType, v: unknown): boolean {
  switch (type) {
    case 'object': return typeof v === 'object' && v !== null && !Array.isArray(v);
    case 'array': return Array.isArray(v);
    case 'integer': return Number.isInteger(v);
    case 'number': return typeof v === 'number' && Number.isFinite(v);
    default: return typeof v === type;
  }
}

/** Every way `value` breaks `schema`, as plain sentences that start with the JSON path ("order_id must be an integer"). Empty means valid. */
export function validate(schema: Schema, value: unknown, path = 'arguments'): string[] {
  if (schema.type && !isType(schema.type, value)) return [`${path} must be ${A[schema.type]}`];
  const errors: string[] = [];
  if (schema.enum && !schema.enum.includes(value as string)) errors.push(`${path} must be one of: ${schema.enum.join(', ')}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) errors.push(`${path} must be at least ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) errors.push(`${path} must be at most ${schema.maximum}`);
  }
  if (typeof value === 'string' && schema.pattern && !new RegExp(schema.pattern, 'u').test(value)) errors.push(`${path} must match the pattern ${schema.pattern}`);
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => errors.push(...validate(schema.items!, v, `${path}[${i}]`)));
  if (isType('object', value)) {
    const obj = value as Record<string, unknown>, props = schema.properties ?? {};
    // Top-level fields are named bare ("order_id"), nested ones by their path ("items[1].qty").
    const at = (k: string) => (path === 'arguments' ? k : `${path}.${k}`);
    for (const k of schema.required ?? []) if (!(k in obj)) errors.push(`${at(k)} is required`);
    for (const [k, v] of Object.entries(obj)) {
      if (props[k]) errors.push(...validate(props[k], v, at(k)));
      else if (schema.additionalProperties === false) errors.push(`${at(k)} is not an allowed field`);
    }
  }
  return errors;
}
