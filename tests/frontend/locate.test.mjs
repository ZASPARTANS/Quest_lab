// "Use my location" (error E038): a slow first fix is tried once more before the page gives up, a refusal is final, and a second press while a search is
// running does not start a second search. The browser's own position call is replaced by a fake that answers as the test says.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPosition, onePerTime } from '../../frontend/src/locate.js';

const OPTIONS = { timeout_ms: 10000, retry_timeout_ms: 30000, max_age_ms: 600000 };
const fake = (...answers) => {
  const calls = [];
  const ask = async (options) => {
    calls.push(options.timeout_ms);
    const answer = answers[calls.length - 1];
    if (answer instanceof Error || answer?.code) throw answer;
    return answer;
  };
  return { ask, calls };
};

test('a first search that is too slow is tried again with the longer time, and the visitor is told', async () => {
  const { ask, calls } = fake({ code: 'timeout' }, { lat: 11.46, lon: 78.19 });
  const said = [];
  const where = await findPosition(OPTIONS, (text) => said.push(text), ask);
  assert.deepEqual(calls, [10000, 30000]);
  assert.equal(where.lat, 11.46);
  assert.equal(said.length, 2);
  assert.match(said[1], /^Still looking/);
});

test('a refusal is final: one try, no waiting', async () => {
  const { ask, calls } = fake({ code: 'denied' }, { lat: 1, lon: 1 });
  await assert.rejects(findPosition(OPTIONS, () => {}, ask), { code: 'denied' });
  assert.equal(calls.length, 1);
});

test('two slow searches in a row end as a timeout, after exactly two tries', async () => {
  const { ask, calls } = fake({ code: 'timeout' }, { code: 'timeout' });
  await assert.rejects(findPosition(OPTIONS, () => {}, ask), { code: 'timeout' });
  assert.equal(calls.length, 2);
});

test('a position that is not a number is "unavailable", never a place; a latitude past the pole is limited to the globe (cleanCoordinates)', async () => {
  await assert.rejects(findPosition(OPTIONS, () => {}, fake({ lat: Number.NaN, lon: 10 }).ask), { code: 'unavailable' });
  await assert.rejects(findPosition(OPTIONS, () => {}, fake({ lat: null, lon: 10 }).ask), { code: 'unavailable' });
  assert.equal((await findPosition(OPTIONS, () => {}, fake({ lat: 95, lon: 10 }).ask)).lat, 90);
});

test('a second press while a search is running shares it; afterwards a new press searches again', async () => {
  let runs = 0;
  let release;
  const start = onePerTime(() => { runs += 1; return new Promise((resolve) => { release = () => resolve(runs); }); });
  const first = start();
  const second = start();
  await Promise.resolve();
  assert.equal(runs, 1, 'the task started once');
  release();
  assert.deepEqual(await Promise.all([first, second]), [1, 1]);
  const third = start();
  await Promise.resolve();
  await Promise.resolve();
  release();
  assert.equal(await third, 2);
});

test('a failed search can be tried again (the guard does not stay locked)', async () => {
  let runs = 0;
  const start = onePerTime(async () => { runs += 1; if (runs === 1) throw new Error('first fails'); return 'ok'; });
  await assert.rejects(start(), /first fails/);
  assert.equal(await start(), 'ok');
});
