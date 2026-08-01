// Pure-logic tests for js/model.js. Run: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkProfile, mkBoard, mkButton, spokenText, resizeCells, swapCells, toOBF } from '../js/model.js';

const btn = label => mkButton({ label });

test('spokenText prefers the speak override, falls back to label', () => {
  assert.equal(spokenText(mkButton({ label: 'I love you', speak: 'I love you so much' })), 'I love you so much');
  assert.equal(spokenText(mkButton({ label: 'eat' })), 'eat');
  assert.equal(spokenText(mkButton({ label: '  ' })), '');
});

test('swapCells swaps two positions without mutating the original', () => {
  const a = btn('a'), b = btn('b');
  const cells = [a, null, b];
  const next = swapCells(cells, 0, 2);
  assert.equal(next[0], b);
  assert.equal(next[2], a);
  assert.equal(cells[0], a, 'original untouched');
});

test('resizeCells keeps buttons at their row/col when growing', () => {
  // 2x2: [a b / c d] -> 3x3 must keep a@(0,0) b@(0,1) c@(1,0) d@(1,1)
  const [a, b, c, d] = ['a', 'b', 'c', 'd'].map(btn);
  const { cells, dropped } = resizeCells([a, b, c, d], 2, 3, 3);
  assert.equal(dropped, 0);
  assert.equal(cells.length, 9);
  assert.equal(cells[0], a);
  assert.equal(cells[1], b);
  assert.equal(cells[3], c);
  assert.equal(cells[4], d);
  assert.equal(cells[2], null);
});

test('resizeCells pours overflow into empty slots when shrinking, reports drops', () => {
  const btns = ['a', 'b', 'c', 'd', 'e', 'f'].map(btn);
  // 2x3 -> 2x2: only 4 slots for 6 buttons; 2 drop, none silently vanish
  const { cells, dropped } = resizeCells(btns, 3, 2, 2);
  assert.equal(cells.length, 4);
  assert.equal(cells.filter(Boolean).length, 4);
  assert.equal(dropped, 2);
});

test('toOBF produces a valid open-board-0.1 structure', () => {
  const p = mkProfile({ name: 'Test' });
  const board = mkBoard({ profileId: p.id, name: 'Home', rows: 1, cols: 2 });
  const speakBtn = mkButton({ label: 'eat', speak: 'I want to eat', color: '#d3f9d8' });
  const folderBtn = mkButton({ label: 'food', action: { type: 'board', boardId: 'b2' } });
  board.cells[0] = speakBtn;
  board.cells[1] = folderBtn;
  const obf = toOBF(board);
  assert.equal(obf.format, 'open-board-0.1');
  assert.equal(obf.grid.rows, 1);
  assert.equal(obf.grid.columns, 2);
  assert.deepEqual(obf.grid.order, [[speakBtn.id, folderBtn.id]]);
  const out = obf.buttons.find(b => b.id === speakBtn.id);
  assert.equal(out.vocalization, 'I want to eat');
  assert.equal(out.background_color, '#d3f9d8');
  const folder = obf.buttons.find(b => b.id === folderBtn.id);
  assert.deepEqual(folder.load_board, { id: 'b2' });
});

test('mkBoard cells length matches rows*cols and starts empty', () => {
  const board = mkBoard({ profileId: 'p', name: 'B', rows: 3, cols: 4 });
  assert.equal(board.cells.length, 12);
  assert.ok(board.cells.every(c => c === null));
});
