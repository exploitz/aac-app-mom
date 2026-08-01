// App glue: state, views, event wiring, persistence context for the editor.
import * as db from './db.js';
import { mkProfile, mkBoard } from './model.js';
import { seedIfEmpty } from './seed.js';
import { renderGrid, renderSentence, kidTap, goBack, speakSentence } from './board.js';
import { initEditor, enterEdit, editCellTap, renderAdminProfiles } from './editor.js';
import { initTools, renderHistory } from './tools.js';

const $ = id => document.getElementById(id);

const state = {
  profile: null,
  boards: new Map(),
  currentBoardId: null,
  navStack: [],
  mode: 'kid',
  moveMode: false,
  moveSrc: null,
  sentence: [],
  rerender,
};

// ---------------- Rendering ----------------
function rerender() {
  if (!state.profile) return;
  document.body.dataset.uisize = state.profile.uiSize || 'standard';
  renderSentence(state);
  renderGrid(state, onCell);
}

function onCell(index, btn, cellEl) {
  if (state.mode === 'edit') {
    editCellTap(index, btn);
  } else {
    kidTap(state, btn, cellEl);
  }
}

function show(viewId) {
  $('view-profiles').hidden = viewId !== 'view-profiles';
  $('view-board').hidden = viewId !== 'view-board';
}

async function showPicker() {
  state.profile = null;
  const profiles = await db.getAll('profiles');
  const list = $('profile-list');
  list.innerHTML = '';
  profiles.forEach(p => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'profile-card';
    const avatar = document.createElement('span');
    avatar.className = 'avatar';
    avatar.textContent = p.avatar;
    const name = document.createElement('span');
    name.textContent = p.name;
    const sub = document.createElement('span');
    sub.className = 'sub';
    sub.textContent = p.style === 'sentence' ? 'builds sentences' : 'tap to speak';
    card.append(avatar, name, sub);
    card.addEventListener('click', () => openProfile(p));
    list.appendChild(card);
  });
  show('view-profiles');
}

async function openProfile(profile) {
  state.profile = profile;
  state.boards = new Map((await db.boardsForProfile(profile.id)).map(b => [b.id, b]));
  state.currentBoardId = profile.homeBoardId;
  state.navStack = [];
  state.sentence = [];
  state.mode = 'kid';
  $('edit-banner').hidden = true;
  if (!state.boards.has(state.currentBoardId)) {
    // Self-heal a profile whose home board went missing.
    const home = mkBoard({ profileId: profile.id, name: 'Home', rows: 3, cols: 3 });
    profile.homeBoardId = home.id;
    await db.put('boards', home);
    await db.put('profiles', profile);
    state.boards.set(home.id, home);
    state.currentBoardId = home.id;
  }
  show('view-board');
  rerender();
}

// ---------------- Toast ----------------
let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

// Blobs owned by a board's buttons (photos, recordings) die with the board.
async function deleteBoardMedia(board) {
  for (const cell of board.cells) {
    if (!cell) continue;
    if (cell.image?.type === 'image' && cell.image.imageId) await db.del('images', cell.image.imageId);
    if (cell.soundId) await db.del('sounds', cell.soundId);
  }
}

// ---------------- Editor context ----------------
const ctx = {
  state,
  toast,
  rerender,
  showPicker,
  openAdmin() {
    renderAdminProfiles();
    renderHistory();
    $('dlg-admin').showModal();
  },
  async saveBoard(board) {
    await db.put('boards', board);
    state.boards.set(board.id, board);
  },
  async saveProfile(profile) {
    await db.put('profiles', profile);
    if (state.profile?.id === profile.id) state.profile = profile;
  },
  async deleteBoardDeep(board) {
    await deleteBoardMedia(board);
    await db.del('boards', board.id);
    state.boards.delete(board.id);
    // Any button that opened this board falls back to speaking its label.
    for (const b of state.boards.values()) {
      let changed = false;
      b.cells.forEach(cell => {
        if (cell?.action?.type === 'board' && cell.action.boardId === board.id) {
          cell.action = { type: 'speak' };
          changed = true;
        }
      });
      if (changed) await this.saveBoard(b);
    }
    state.navStack = state.navStack.filter(id => id !== board.id);
    if (state.currentBoardId === board.id) {
      state.currentBoardId = state.profile.homeBoardId;
      state.navStack = [];
    }
  },
  async deleteProfileDeep(profile) {
    for (const b of await db.boardsForProfile(profile.id)) {
      await deleteBoardMedia(b);
      await db.del('boards', b.id);
    }
    await db.del('profiles', profile.id);
  },
  async addProfile(name) {
    const profile = mkProfile({ name, style: 'simple', avatar: '🙂' });
    const home = mkBoard({ profileId: profile.id, name: 'Home', rows: 3, cols: 3 });
    profile.homeBoardId = home.id;
    await db.put('profiles', profile);
    await db.put('boards', home);
    return profile;
  },
};

// ---------------- Static event wiring ----------------
function wire() {
  $('btn-back').addEventListener('click', () => goBack(state));

  // Hold the gear ~1.2s to enter edit mode (kids' quick taps won't trigger it).
  let gearTimer = null;
  const gear = $('btn-gear');
  const cancelGear = () => { clearTimeout(gearTimer); gearTimer = null; };
  gear.addEventListener('pointerdown', () => {
    cancelGear();
    gearTimer = setTimeout(() => { cancelGear(); enterEdit(); }, 1200);
  });
  gear.addEventListener('pointerup', cancelGear);
  gear.addEventListener('pointerleave', cancelGear);
  gear.addEventListener('contextmenu', e => e.preventDefault());
  gear.addEventListener('click', () => {
    if (state.mode !== 'edit') toast('Hold the gear for a moment to edit');
  });

  const words = $('sentence-words');
  words.addEventListener('click', () => speakSentence(state));
  words.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); speakSentence(state); }
  });
  $('btn-word-delete').addEventListener('click', () => {
    state.sentence.pop();
    renderSentence(state);
  });
  $('btn-sentence-clear').addEventListener('click', () => {
    state.sentence = [];
    renderSentence(state);
  });

  $('btn-picker-settings').addEventListener('click', () => ctx.openAdmin());
  $('dlg-admin').addEventListener('close', () => {
    // Profiles may have been added/renamed/deleted.
    if (!state.profile) showPicker();
  });
}

// ---------------- Boot ----------------
async function main() {
  initEditor(ctx);
  initTools(ctx);
  wire();
  await seedIfEmpty();
  await showPicker();
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('sw.js'); } catch { /* offline still works after first successful visit */ }
  }
}

main();
