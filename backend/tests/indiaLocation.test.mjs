import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { containsIndiaLocation, isIndiaBasedJob } = require('../src/utils/indiaLocation.js');

test('containsIndiaLocation detects explicit India locations', () => {
  assert.equal(containsIndiaLocation('Remote - India'), true);
  assert.equal(containsIndiaLocation('Bengaluru, Karnataka, India'), true);
});

test('containsIndiaLocation detects common Indian cities when country is omitted', () => {
  assert.equal(containsIndiaLocation('Pune (Hybrid)'), true);
  assert.equal(containsIndiaLocation('Gurugram office'), true);
});

test('containsIndiaLocation does not match non-India text accidentally', () => {
  assert.equal(containsIndiaLocation('Indianapolis, Indiana, United States'), false);
  assert.equal(containsIndiaLocation('Vilnius, Lithuania'), false);
});

test('isIndiaBasedJob checks job and nested detail location fields', () => {
  assert.equal(isIndiaBasedJob({ location: 'Mumbai, Maharashtra' }), true);
  assert.equal(isIndiaBasedJob({ details: { location: 'Hyderabad' } }), true);
  assert.equal(isIndiaBasedJob({ country: 'IN' }), true);
  assert.equal(isIndiaBasedJob({ location: 'Leuven, Belgium' }), false);
});
