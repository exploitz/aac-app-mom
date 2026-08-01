// Tests for js/predict.js. Run: node --test tests/predict.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildModel, predict, applySuggestion, findWord } from '../js/predict.js';
import { mkBoard, mkButton } from '../js/model.js';

test('prediction completes the word being typed from board labels', () => {
  const model = buildModel(['cookie', 'cool ranch'], []);
  const out = predict(model, 'I want coo');
  assert.ok(out.includes('cookie'), `expected cookie in ${out}`);
  assert.ok(out.every(w => w.startsWith('coo')));
});

test('prediction uses bigrams from history for the next word', () => {
  const model = buildModel([], ['I want juice', 'I want juice', 'I want milk']);
  const out = predict(model, 'I want ');
  assert.equal(out[0], 'juice', `expected juice first, got ${out}`);
  assert.ok(out.includes('milk'));
});

test('applySuggestion replaces the partial word or appends', () => {
  assert.equal(applySuggestion('I want coo', 'cookie'), 'I want cookie ');
  assert.equal(applySuggestion('I want ', 'juice'), 'I want juice ');
  assert.equal(applySuggestion('', 'help'), 'help ');
});

test('findWord returns the tap path from home', () => {
  const home = mkBoard({ profileId: 'p', name: 'Home', rows: 1, cols: 2 });
  const food = mkBoard({ profileId: 'p', name: 'Food', rows: 1, cols: 2 });
  const snacks = mkBoard({ profileId: 'p', name: 'Snacks', rows: 1, cols: 1 });
  home.cells[0] = mkButton({ label: 'food', action: { type: 'board', boardId: food.id } });
  home.cells[1] = mkButton({ label: 'help' });
  food.cells[0] = mkButton({ label: 'snacks', action: { type: 'board', boardId: snacks.id } });
  food.cells[1] = mkButton({ label: 'apple' });
  snacks.cells[0] = mkButton({ label: 'cookie' });
  const boards = new Map([[home.id, home], [food.id, food], [snacks.id, snacks]]);

  const cookie = findWord(boards, home.id, 'cookie');
  assert.equal(cookie.length, 1);
  assert.deepEqual(cookie[0].path, ['food', 'snacks']);

  const onHome = findWord(boards, home.id, 'help');
  assert.deepEqual(onHome[0].path, []);
});

test('findWord marks words on unreachable boards', () => {
  const home = mkBoard({ profileId: 'p', name: 'Home', rows: 1, cols: 1 });
  const orphan = mkBoard({ profileId: 'p', name: 'Orphan', rows: 1, cols: 1 });
  orphan.cells[0] = mkButton({ label: 'lost' });
  const boards = new Map([[home.id, home], [orphan.id, orphan]]);
  const out = findWord(boards, home.id, 'lost');
  assert.equal(out[0].path, null);
});

test('exact matches rank before substring matches', () => {
  const home = mkBoard({ profileId: 'p', name: 'Home', rows: 1, cols: 2 });
  home.cells[0] = mkButton({ label: 'cookies and milk' });
  home.cells[1] = mkButton({ label: 'cookie' });
  const boards = new Map([[home.id, home]]);
  const out = findWord(boards, home.id, 'cookie');
  assert.equal(out[0].label, 'cookie');
});
