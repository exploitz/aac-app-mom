// Edit mode: everything mom touches. Wired once via initEditor(ctx);
// ctx = { state, saveBoard, saveProfile, deleteProfileDeep, deleteBoardDeep,
//         addProfile, rerender, showPicker, toast }
import { mkButton, mkBoard, resizeCells, swapCells, uid } from './model.js';
import { getVoices, speak } from './speech.js';
import { searchSymbols, downloadSymbol, resizePhoto } from './symbols.js';
import { exportAll, importAll, shareAll } from './backup.js';
import { currentBoard, imageNode } from './board.js';
import { startRecording, stopRecording, isRecording, playBlobOnce, playSound, NOTES } from './audio.js';
import { TEMPLATES, boardFromTemplate } from './seed.js';
import * as db from './db.js';

const $ = id => document.getElementById(id);

const COLORS = ['', '#fff3bf', '#d3f9d8', '#d0ebff', '#ffdeeb', '#ffe8cc', '#ffc9c9', '#e5dbff', '#f1f3f5'];

const EMOJI = [
  '😀', '😄', '😢', '😠', '😴', '🤒', '🤪', '😊', '🥰', '😮',
  '❤️', '👍', '👎', '🙏', '💖', '🙌', '👏', '✋', '👉', '👤',
  '🍽️', '🥤', '🍎', '🍌', '🍪', '🥛', '💧', '🧃', '🍕', '🥣',
  '🥪', '🍦', '🍓', '🥕', '🧀', '🍗', '🍞', '🥚', '🌮', '🍝',
  '🚻', '🛁', '🪥', '🛏️', '👕', '👟', '🧥', '🩹', '💊', '🤕',
  '🏃', '🚶', '🧸', '🎨', '🎵', '📚', '📺', '🎮', '⚽', '🏀',
  '🚗', '🚌', '✈️', '🏠', '🏫', '🏥', '🛒', '🌳', '☀️', '🌧️',
  '⛄', '🐶', '🐱', '🐻', '⭐', '🌈', '🎂', '🎁', '🎈', '📱',
  '➕', '✅', '❌', '❓', '⏰', '🔊', '🤫', '🫂', '👨', '👩',
  '👶', '👵', '👴', '🧑', '💻', '✏️', '✂️', '🧩', '🪀', '🛝',
];

let ctx = null;

// Dialog session state for the button editor.
let editIndex = -1;
let pendingImage = null;   // {type:'emoji',value} | {type:'image',imageId} | {type:'image',blob}
let pendingColor = '';
let pendingSound = null;   // {soundId} (existing) | {blob} (fresh recording) | null

export function initEditor(context) {
  ctx = context;
  wireBanner();
  wireButtonDialog();
  wireBoardDialog();
  wireProfileDialog();
  wireAdminDialog();
}

// ---------------- Undo (session-scoped, board-level snapshots) ----------------
const undoStack = [];

function pushUndo() {
  const b = currentBoard(ctx.state);
  undoStack.push(JSON.stringify({ id: b.id, rows: b.rows, cols: b.cols, name: b.name, cells: b.cells }));
  if (undoStack.length > 25) undoStack.shift();
}

async function undo() {
  const snap = undoStack.pop();
  if (!snap) { ctx.toast('Nothing to undo'); return; }
  const s = JSON.parse(snap);
  const b = ctx.state.boards.get(s.id);
  if (!b) { ctx.toast('That board no longer exists'); return; }
  Object.assign(b, { rows: s.rows, cols: s.cols, name: s.name, cells: s.cells });
  await ctx.saveBoard(b);
  if (ctx.state.currentBoardId !== b.id) {
    ctx.state.currentBoardId = b.id;
    ctx.state.navStack = [];
  }
  ctx.toast('Undone');
  ctx.rerender();
}

// ---------------- Mode ----------------
export function enterEdit() {
  ctx.state.mode = 'edit';
  ctx.state.moveSrc = null;
  ctx.state.moveMode = false;
  undoStack.length = 0;
  $('edit-banner').hidden = false;
  ctx.rerender();
}

export function exitEdit() {
  ctx.state.mode = 'kid';
  ctx.state.moveMode = false;
  ctx.state.moveSrc = null;
  $('edit-banner').hidden = true;
  setMoveUI();
  ctx.rerender();
}

function setMoveUI() {
  $('btn-edit-move').style.background = ctx.state.moveMode ? '#ffd43b' : '';
  $('edit-banner-text').textContent = ctx.state.moveMode
    ? 'Move: tap a button, then tap where it goes'
    : 'Editing - tap a button to change it';
}

// ---------------- Edit-mode cell taps ----------------
export async function editCellTap(index, btn) {
  const state = ctx.state;
  if (state.moveMode) {
    if (state.moveSrc === null) {
      if (!btn) return; // must start from a real button
      state.moveSrc = index;
    } else {
      const board = currentBoard(state);
      pushUndo();
      board.cells = swapCells(board.cells, state.moveSrc, index);
      state.moveSrc = null;
      await ctx.saveBoard(board);
    }
    ctx.rerender();
    return;
  }
  openButtonDialog(index, btn);
}

// ---------------- Banner ----------------
function wireBanner() {
  $('btn-edit-done').addEventListener('click', exitEdit);
  $('btn-edit-undo').addEventListener('click', undo);
  $('btn-edit-move').addEventListener('click', () => {
    ctx.state.moveMode = !ctx.state.moveMode;
    ctx.state.moveSrc = null;
    setMoveUI();
    ctx.rerender();
  });
  $('btn-edit-add').addEventListener('click', () => {
    const board = currentBoard(ctx.state);
    const slot = board.cells.indexOf(null);
    if (slot === -1) {
      ctx.toast('No empty spaces - add rows in Board settings');
      return;
    }
    openButtonDialog(slot, null);
  });
  $('btn-edit-board').addEventListener('click', openBoardDialog);
  $('btn-edit-profile').addEventListener('click', () => openProfileDialog(ctx.state.profile));
  $('btn-edit-backup').addEventListener('click', () => ctx.openAdmin());
}

// ---------------- Button dialog ----------------
function openButtonDialog(index, btn) {
  editIndex = index;
  pendingImage = btn?.image || null;
  pendingColor = btn?.color || '';
  pendingSound = btn?.soundId ? { soundId: btn.soundId } : null;
  $('dlg-button-title').textContent = btn ? 'Edit button' : 'New button';
  $('fld-label').value = btn?.label || '';
  $('fld-speak').value = btn?.speak || '';
  $('fld-hidden').checked = !!btn?.hidden;
  $('btn-button-delete').style.display = btn ? '' : 'none';
  $('emoji-panel').hidden = true;
  $('symbol-panel').hidden = true;
  renderActionOptions(btn);
  renderColorRow();
  renderImagePreview();
  renderSoundRow();
  $('dlg-button').showModal();
  if (!btn) $('fld-label').focus();
}

function renderSoundRow() {
  const has = !!pendingSound;
  $('btn-sound-record').textContent = isRecording() ? '⏹ Stop' : (has ? '🎙 Re-record' : '🎙 Record');
  $('btn-sound-play').hidden = !has || isRecording();
  $('btn-sound-remove').hidden = !has || isRecording();
  $('sound-status').textContent = isRecording() ? 'Recording... tap Stop when done'
    : has ? 'Recorded ✓' : '';
}

function renderImagePreview() {
  const prev = $('fld-img-preview');
  prev.innerHTML = '';
  if (!pendingImage) { prev.textContent = '?'; return; }
  if (pendingImage.blob) {
    const img = document.createElement('img');
    img.alt = '';
    img.src = URL.createObjectURL(pendingImage.blob);
    prev.appendChild(img);
  } else {
    prev.appendChild(imageNode(pendingImage, ''));
  }
}

function renderColorRow() {
  const row = $('color-row');
  row.innerHTML = '';
  COLORS.forEach(c => {
    const b = document.createElement('button');
    b.type = 'button';
    b.style.background = c || '#ffffff';
    b.setAttribute('aria-label', c ? `Color ${c}` : 'No color');
    if (!c) b.textContent = '∅';
    if (c === pendingColor) b.classList.add('selected');
    b.addEventListener('click', () => { pendingColor = c; renderColorRow(); });
    row.appendChild(b);
  });
}

function renderActionOptions(btn) {
  const sel = $('fld-action');
  sel.innerHTML = '';
  sel.add(new Option('Speak', 'speak'));
  for (const board of ctx.state.boards.values()) {
    sel.add(new Option(`Open board: ${board.name}`, `board:${board.id}`));
  }
  sel.add(new Option('Open board: + New board...', 'newboard'));
  for (const n of NOTES) {
    sel.add(new Option(`♪ Play note: ${n.name}`, `note:${n.freq}`));
  }
  sel.value = btn?.action?.type === 'board' ? `board:${btn.action.boardId}`
    : btn?.action?.type === 'note' ? `note:${btn.action.freq}`
    : 'speak';
}

function wireButtonDialog() {
  $('btn-button-cancel').addEventListener('click', () => $('dlg-button').close());

  // Voice recording
  $('btn-sound-record').addEventListener('click', async () => {
    if (isRecording()) {
      try {
        const blob = await stopRecording();
        pendingSound = { blob };
      } catch {
        ctx.toast('Recording failed');
      }
    } else {
      try {
        await startRecording();
      } catch {
        ctx.toast('Microphone not available - check permissions');
      }
    }
    renderSoundRow();
  });
  $('btn-sound-play').addEventListener('click', async () => {
    if (pendingSound?.blob) playBlobOnce(pendingSound.blob);
    else if (pendingSound?.soundId) playSound(pendingSound.soundId);
  });
  $('btn-sound-remove').addEventListener('click', () => {
    pendingSound = null;
    renderSoundRow();
  });

  // Emoji picker
  $('btn-img-emoji').addEventListener('click', () => {
    const panel = $('emoji-panel');
    panel.hidden = !panel.hidden;
    $('symbol-panel').hidden = true;
    if (!panel.hidden && !panel.childElementCount) {
      EMOJI.forEach(e => {
        const b = document.createElement('button');
        b.type = 'button';
        b.textContent = e;
        b.setAttribute('aria-label', `Emoji ${e}`);
        b.addEventListener('click', () => {
          pendingImage = { type: 'emoji', value: e };
          renderImagePreview();
          panel.hidden = true;
        });
        panel.appendChild(b);
      });
      const custom = document.createElement('div');
      custom.className = 'emoji-custom';
      const input = document.createElement('input');
      input.placeholder = 'Or paste any emoji here';
      input.setAttribute('aria-label', 'Custom emoji');
      const use = document.createElement('button');
      use.type = 'button';
      use.textContent = 'Use';
      use.addEventListener('click', () => {
        const v = input.value.trim();
        if (!v) return;
        pendingImage = { type: 'emoji', value: v };
        renderImagePreview();
        panel.hidden = true;
      });
      custom.append(input, use);
      panel.appendChild(custom);
    }
  });

  // Photo
  $('btn-img-photo').addEventListener('click', () => $('fld-photo').click());
  $('fld-photo').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const blob = await resizePhoto(file);
      pendingImage = { type: 'image', blob };
      renderImagePreview();
    } catch {
      ctx.toast('Could not read that photo');
    }
  });

  // Symbol search
  $('btn-img-symbol').addEventListener('click', () => {
    const panel = $('symbol-panel');
    panel.hidden = !panel.hidden;
    $('emoji-panel').hidden = true;
    if (!panel.hidden) {
      $('fld-symbol-q').value = $('fld-label').value;
      $('fld-symbol-q').focus();
    }
  });
  $('btn-symbol-go').addEventListener('click', runSymbolSearch);
  $('fld-symbol-q').addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); runSymbolSearch(); }
  });

  $('btn-button-delete').addEventListener('click', async () => {
    const board = currentBoard(ctx.state);
    pushUndo();
    board.cells[editIndex] = null;
    await ctx.saveBoard(board);
    $('dlg-button').close();
    ctx.rerender();
  });

  $('form-button').addEventListener('submit', async e => {
    e.preventDefault();
    await saveButton();
  });
}

async function runSymbolSearch() {
  const results = $('symbol-results');
  results.innerHTML = '<p class="hint">Searching...</p>';
  try {
    const items = await searchSymbols($('fld-symbol-q').value);
    results.innerHTML = '';
    if (!items.length) { results.innerHTML = '<p class="hint">No symbols found</p>'; return; }
    items.forEach(it => {
      const b = document.createElement('button');
      b.type = 'button';
      const img = document.createElement('img');
      img.src = it.url;
      img.alt = '';
      b.setAttribute('aria-label', 'Choose this symbol');
      b.appendChild(img);
      b.addEventListener('click', async () => {
        try {
          const blob = await downloadSymbol(it.url);
          pendingImage = { type: 'image', blob };
          renderImagePreview();
          $('symbol-panel').hidden = true;
        } catch {
          ctx.toast('Could not download symbol');
        }
      });
      results.appendChild(b);
    });
  } catch {
    results.innerHTML = '<p class="hint">Search needs an internet connection</p>';
  }
}

async function saveButton() {
  const state = ctx.state;
  const board = currentBoard(state);
  pushUndo();
  const existing = board.cells[editIndex];
  const btn = existing || mkButton({ label: '' });

  btn.label = $('fld-label').value.trim();
  btn.speak = $('fld-speak').value.trim();
  btn.color = pendingColor;
  btn.hidden = $('fld-hidden').checked;

  // Persist a newly picked photo/symbol blob.
  if (pendingImage?.blob) {
    const imageId = uid();
    await db.put('images', pendingImage.blob, imageId);
    pendingImage = { type: 'image', imageId };
  }
  btn.image = pendingImage;

  // Persist a fresh recording; clean up a replaced/removed one.
  if (existing?.soundId && pendingSound?.soundId !== existing.soundId) {
    await db.del('sounds', existing.soundId);
  }
  if (pendingSound?.blob) {
    const soundId = uid();
    await db.put('sounds', pendingSound.blob, soundId);
    pendingSound = { soundId };
  }
  btn.soundId = pendingSound?.soundId || null;

  const actionValue = $('fld-action').value;
  if (actionValue === 'speak') {
    btn.action = { type: 'speak' };
  } else if (actionValue.startsWith('note:')) {
    btn.action = { type: 'note', freq: +actionValue.slice('note:'.length) };
  } else if (actionValue === 'newboard') {
    const name = prompt('Name for the new board:', btn.label || 'New board');
    if (name) {
      const nb = mkBoard({ profileId: state.profile.id, name, rows: 3, cols: 3 });
      await ctx.saveBoard(nb);
      state.boards.set(nb.id, nb);
      btn.action = { type: 'board', boardId: nb.id };
    } else {
      btn.action = { type: 'speak' };
    }
  } else {
    btn.action = { type: 'board', boardId: actionValue.slice('board:'.length) };
  }

  board.cells[editIndex] = btn;
  await ctx.saveBoard(board);
  $('dlg-button').close();
  ctx.rerender();
}

// ---------------- Board dialog ----------------
function openBoardDialog() {
  const board = currentBoard(ctx.state);
  $('fld-board-name').value = board.name;
  $('fld-cols').value = board.cols;
  $('fld-rows').value = board.rows;
  const isHome = board.id === ctx.state.profile.homeBoardId;
  $('btn-board-delete').style.display = isHome ? 'none' : '';
  const tsel = $('fld-template');
  tsel.innerHTML = '';
  tsel.add(new Option('Blank board', 'blank'));
  for (const [key, t] of Object.entries(TEMPLATES)) {
    tsel.add(new Option(`${t.emoji} ${t.name}`, key));
  }
  $('dlg-board').showModal();
}

async function addTemplateBoard() {
  const state = ctx.state;
  const key = $('fld-template').value;
  let nb;
  if (key === 'blank') {
    const name = prompt('Name for the new board:', 'New board');
    if (!name) return;
    nb = mkBoard({ profileId: state.profile.id, name, rows: 3, cols: 3 });
  } else {
    nb = boardFromTemplate(key, state.profile.id);
  }
  await ctx.saveBoard(nb);
  state.boards.set(nb.id, nb);
  // Link it from the first empty cell of the current board.
  const board = currentBoard(state);
  const slot = board.cells.indexOf(null);
  const emoji = key === 'blank' ? '📋' : TEMPLATES[key].emoji;
  if (slot !== -1) pushUndo();
  if (slot !== -1) {
    board.cells[slot] = mkButton({
      label: nb.name.toLowerCase(),
      image: { type: 'emoji', value: emoji },
      action: { type: 'board', boardId: nb.id },
    });
    await ctx.saveBoard(board);
    ctx.toast(`"${nb.name}" added and linked`);
  } else {
    ctx.toast(`"${nb.name}" added - no empty space here, point any button at it`);
  }
  $('dlg-board').close();
  ctx.rerender();
}

function wireBoardDialog() {
  $('btn-board-cancel').addEventListener('click', () => $('dlg-board').close());
  $('btn-template-add').addEventListener('click', addTemplateBoard);
  $('btn-board-delete').addEventListener('click', async () => {
    const board = currentBoard(ctx.state);
    if (!confirm(`Delete the board "${board.name}"? Buttons that opened it will speak instead.`)) return;
    await ctx.deleteBoardDeep(board);
    $('dlg-board').close();
    ctx.rerender();
  });
  $('form-board').addEventListener('submit', async e => {
    e.preventDefault();
    const board = currentBoard(ctx.state);
    pushUndo();
    const rows = Math.max(1, Math.min(10, +$('fld-rows').value || board.rows));
    const cols = Math.max(1, Math.min(10, +$('fld-cols').value || board.cols));
    board.name = $('fld-board-name').value.trim() || board.name;
    if (rows !== board.rows || cols !== board.cols) {
      const { cells, dropped } = resizeCells(board.cells, board.cols, rows, cols);
      board.cells = cells;
      board.rows = rows;
      board.cols = cols;
      if (dropped) ctx.toast(`${dropped} button(s) did not fit and were removed`);
    }
    await ctx.saveBoard(board);
    $('dlg-board').close();
    ctx.rerender();
  });
}

// ---------------- Profile dialog ----------------
let profileBeingEdited = null;

export function openProfileDialog(profile) {
  profileBeingEdited = profile;
  $('fld-profile-name').value = profile.name;
  $('fld-avatar').value = profile.avatar;
  $('fld-style').value = profile.style;
  $('fld-uisize').value = profile.uiSize || 'standard';
  $('fld-holdms').value = String(profile.holdMs || 0);
  $('fld-rate').value = profile.rate;
  $('rate-value').textContent = `(${profile.rate}x)`;
  const sel = $('fld-voice');
  sel.innerHTML = '';
  sel.add(new Option('Device default', ''));
  getVoices().forEach(v => sel.add(new Option(`${v.name} (${v.lang})`, v.voiceURI)));
  sel.value = [...sel.options].some(o => o.value === profile.voiceURI) ? profile.voiceURI : '';
  $('dlg-profile').showModal();
}

function wireProfileDialog() {
  $('btn-profile-cancel').addEventListener('click', () => $('dlg-profile').close());
  $('fld-rate').addEventListener('input', () => {
    $('rate-value').textContent = `(${$('fld-rate').value}x)`;
  });
  $('btn-voice-test').addEventListener('click', () => {
    speak('Hi! This is how I sound.', { voiceURI: $('fld-voice').value, rate: +$('fld-rate').value });
  });
  $('btn-profile-delete').addEventListener('click', async () => {
    if (!confirm(`Delete "${profileBeingEdited.name}" and all of their boards?`)) return;
    await ctx.deleteProfileDeep(profileBeingEdited);
    $('dlg-profile').close();
    ctx.showPicker();
  });
  $('form-profile').addEventListener('submit', async e => {
    e.preventDefault();
    const p = profileBeingEdited;
    p.name = $('fld-profile-name').value.trim() || p.name;
    p.avatar = $('fld-avatar').value.trim() || p.avatar;
    p.style = $('fld-style').value;
    p.uiSize = $('fld-uisize').value;
    p.holdMs = +$('fld-holdms').value;
    p.voiceURI = $('fld-voice').value;
    p.rate = +$('fld-rate').value;
    await ctx.saveProfile(p);
    $('dlg-profile').close();
    if (ctx.state.profile?.id === p.id) ctx.rerender();
    renderAdminProfiles();
  });
}

// ---------------- Admin (grown-ups) dialog ----------------
export function renderAdminProfiles() {
  const list = $('admin-profile-list');
  if (!list) return;
  db.getAll('profiles').then(profiles => {
    list.innerHTML = '';
    profiles.forEach(p => {
      const row = document.createElement('div');
      row.className = 'admin-row';
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = `${p.avatar} ${p.name}`;
      const edit = document.createElement('button');
      edit.type = 'button';
      edit.textContent = 'Settings';
      edit.addEventListener('click', () => openProfileDialog(p));
      row.append(name, edit);
      list.appendChild(row);
    });
  });
}

function wireAdminDialog() {
  $('btn-admin-add-profile').addEventListener('click', async () => {
    const name = prompt('Name for the new profile:');
    if (!name) return;
    await ctx.addProfile(name);
    renderAdminProfiles();
    ctx.toast(`Profile "${name}" added`);
  });
  $('btn-export').addEventListener('click', async () => {
    const n = await exportAll();
    ctx.toast(`Backup saved (${n.boards} boards, ${n.images} pictures)`);
  });
  $('btn-share').addEventListener('click', async () => {
    const ok = await shareAll();
    if (!ok) ctx.toast('Sharing not supported here - use Save backup instead');
  });
  $('btn-import').addEventListener('click', () => $('fld-import').click());
  $('fld-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('Restoring replaces EVERYTHING currently in the app with the backup. Continue?')) return;
    try {
      const n = await importAll(file);
      ctx.toast(`Restored ${n.profiles} profiles, ${n.boards} boards`);
      $('dlg-admin').close();
      location.reload();
    } catch (err) {
      ctx.toast(err.message || 'That file is not a valid backup');
    }
  });
}
