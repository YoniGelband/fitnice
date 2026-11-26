import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconName, suggestIcons, typeIcon } from '../js/tiles.js';

test('names get the item that matches their words', () => {
  assert.equal(iconName('Walking', 'exercise'), 'sneaker');
  assert.equal(iconName('Morning run', 'exercise'), 'sneaker');
  assert.equal(iconName('Jump rope', 'exercise'), 'rope');
  assert.equal(iconName('Strength', 'exercise'), 'dumbbell');
  assert.equal(iconName('Swimming', 'exercise'), 'goggles');
  assert.equal(iconName('Chocolate', 'sweet'), 'chocolate');
  assert.equal(iconName('Donut', 'sweet'), 'pastry');
});

test('a word inside another word does not count', () => {
  assert.equal(iconName('Brunch', 'sweet'), 'treat');
  assert.equal(iconName('Pancake', 'sweet'), 'treat');
});

test('unknown names get the general icon for their kind', () => {
  assert.equal(iconName('Rowing', 'exercise'), 'stopwatch');
  assert.equal(iconName('Marshmallow', 'sweet'), 'treat');
});

test('three different suggestions, best match first', () => {
  assert.deepEqual(suggestIcons('Pilates', 'exercise'), ['mat', 'stopwatch', 'heart']);
  assert.deepEqual(suggestIcons('Rowing', 'exercise'), ['stopwatch', 'heart', 'sneaker']);
  assert.deepEqual(suggestIcons('Fudge', 'sweet'), ['treat', 'candy', 'cookie']);
});

test('a picked icon wins over the name, unless it is unknown', () => {
  assert.equal(typeIcon({ name: 'Walking', icon: 'heart' }, 'exercise'), 'heart');
  assert.equal(typeIcon({ name: 'Walking' }, 'exercise'), 'sneaker');
  assert.equal(typeIcon({ name: 'Walking', icon: 'no-such-icon' }, 'exercise'), 'sneaker');
});
