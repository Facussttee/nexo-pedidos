import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../js/views/operator.js', import.meta.url), 'utf8');
const start = source.indexOf('function parseOperatorWeight(');
const end = source.indexOf('export function renderOperatorView', start);
const parse = vm.runInNewContext(source.slice(start, end) + '; parseOperatorWeight;');
test('preparation weight always means kg and accepts decimal comma', () => {
  assert.equal(parse('2150', true), 2150);
  assert.equal(parse('50', true), 50);
  assert.equal(parse('1,450', true), 1.45);
  assert.equal(parse('0.5', true), 0.5);
});
test('preparation rejects unresolved kg and fractional units', () => {
  for (const value of ['', '0', '-1', 'Infinity', 'NaN', 'abc']) assert.equal(parse(value, true), null);
  assert.equal(parse('1.5', false), null);
  assert.equal(parse('2', false), 2);
});
