// Tests for frontend/src/geo.js. Run: docker compose -f docker/compose.yaml run --rm frontend-tests
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { splitAtDateLine } from '../../frontend/src/geo.js';

test('a line that does not cross the date line is kept whole', () => {
  const line = [[0, 0], [10, 5], [20, 10]];
  assert.deepEqual(splitAtDateLine([line]), [line]);
});

test('a line crossing the date line is cut in two, so nothing is drawn across the map', () => {
  const line = [[170, 60], [179, 61], [-179, 62], [-170, 63]];
  assert.deepEqual(splitAtDateLine([line]), [[[170, 60], [179, 61]], [[-179, 62], [-170, 63]]]);
});

test('single points left over after a cut are dropped, empty input gives empty output', () => {
  assert.deepEqual(splitAtDateLine([[[179, 0], [-179, 0]]]), []);
  assert.deepEqual(splitAtDateLine([]), []);
});

test('a long but real jump can be allowed with a bigger limit', () => {
  assert.equal(splitAtDateLine([[[0, 0], [100, 0]]], 90).length, 0);
  assert.equal(splitAtDateLine([[[0, 0], [100, 0]]], 180).length, 1);
});
