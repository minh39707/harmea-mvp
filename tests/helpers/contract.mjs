import assert from 'node:assert/strict';

export function validateSchema(value, definition, contract, path = '$') {
  const schema = definition.$ref
    ? contract.components.schemas[definition.$ref.split('/').at(-1)]
    : definition;
  if (schema.anyOf) {
    assert.ok(
      schema.anyOf.some(branch => {
        try {
          validateSchema(value, branch, contract, path);
          return true;
        } catch {
          return false;
        }
      }),
      `${path} did not match any allowed schema`
    );
    return;
  }
  if (schema.oneOf) {
    let matches = 0;
    for (const branch of schema.oneOf) {
      try {
        validateSchema(value, branch, contract, path);
        matches++;
      } catch {}
    }
    assert.equal(matches, 1, `${path} must match exactly one schema`);
    return;
  }
  if (schema.allOf) {
    for (const branch of schema.allOf) validateSchema(value, branch, contract, path);
  }
  if (schema.const !== undefined) assert.equal(value, schema.const, `${path} constant`);
  if (schema.enum) assert.ok(schema.enum.includes(value), `${path} enum`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    assert.ok(
      types.includes(value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value) ||
        (types.includes('integer') && Number.isInteger(value)),
      `${path} type`
    );
  }
  if (value === null) return;
  if (schema.type === 'object') {
    assert.ok(value && typeof value === 'object' && !Array.isArray(value), `${path} object`);
    for (const key of schema.required ?? []) assert.ok(key in value, `${path}.${key} required`);
    if (schema.minProperties !== undefined)
      assert.ok(Object.keys(value).length >= schema.minProperties, `${path} minProperties`);
    if (schema.additionalProperties === false)
      for (const key of Object.keys(value))
        assert.ok(key in (schema.properties ?? {}), `${path}.${key} additional property`);
    for (const [key, child] of Object.entries(schema.properties ?? {}))
      if (key in value) validateSchema(value[key], child, contract, `${path}.${key}`);
  }
  if (schema.type === 'array') {
    assert.ok(Array.isArray(value), `${path} array`);
    if (schema.minItems !== undefined)
      assert.ok(value.length >= schema.minItems, `${path} minItems`);
    if (schema.maxItems !== undefined)
      assert.ok(value.length <= schema.maxItems, `${path} maxItems`);
    for (const [index, item] of value.entries())
      validateSchema(item, schema.items, contract, `${path}[${index}]`);
  }
  if (typeof value === 'string') {
    if (schema.pattern) assert.match(value, new RegExp(schema.pattern), `${path} pattern`);
    if (schema.minLength !== undefined)
      assert.ok(value.length >= schema.minLength, `${path} minLength`);
    if (schema.maxLength !== undefined)
      assert.ok(value.length <= schema.maxLength, `${path} maxLength`);
    if (schema.format === 'date-time')
      assert.ok(Number.isFinite(Date.parse(value)), `${path} date-time`);
    if (schema.format === 'uuid')
      assert.match(
        value,
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        `${path} uuid`
      );
    if (schema.format === 'email')
      assert.match(value, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, `${path} email`);
  }
  if (typeof value === 'number') {
    if (schema.minimum !== undefined) assert.ok(value >= schema.minimum, `${path} minimum`);
    if (schema.maximum !== undefined) assert.ok(value <= schema.maximum, `${path} maximum`);
    if (schema.type === 'integer') assert.ok(Number.isInteger(value), `${path} integer`);
  }
}

export function validateNamedSchema(value, name, contract) {
  validateSchema(value, { $ref: `#/components/schemas/${name}` }, contract);
}
