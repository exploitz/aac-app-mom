// Word Finder, type-to-talk keyboard, and the usage-history panel.
// Wired once via initTools(ctx) - same ctx contract as the editor.
import { buildModel, predict, applySuggestion, findWord } from './predict.js';
import { speak } from './speech.js';
import { navigateTo } from './board.js';
import { logEvent, getLogs, clearLogs, exportCSV } from './log.js';
import * as db from './db.js';

const $ = id => document.getElementById(id);

let ctx = null;
let model = null; // rebuilt when the keyboard opens (labels/history may change)

export function initTools(context) {
  ctx = context;
  wireFinder();
  wireKeyboard();
  wireHistory();
}

// ---------------- Word Finder ----------------
function wireFinder() {
  $('btn-find').addEventListener('click', () => {
    $('fld-find').value = '';
    $('find-results').innerHTML = '<p class="hint">Type to search every board.</p>';
    $('dlg-find').showModal();
    $('fld-find').focus();
  });
  $('fld-find').addEventListener('input', renderFindResults);
}

function renderFindResults() {
  const out = $('find-results');
  const state = ctx.state;
  const results = findWord(state.boards, state.profile.homeBoardId, $('fld-find').value).slice(0, 12);
  out.innerHTML = '';
  if (!results.length) {
    out.innerHTML = '<p class="hint">No matches - you can add it as a new button.</p>';
    return;
  }
  for (const r of results) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'find-row';
    const word = document.createElement('strong');
    word.textContent = r.label;
    const path = document.createElement('span');
    path.className = 'find-path';
    path.textContent = r.path === null
      ? `on "${r.boardName}" (not linked from Home)`
      : r.path.length === 0 ? 'on Home' : ['Home', ...r.path].join(' > ');
    row.append(word, path);
    row.addEventListener('click', () => {
      $('dlg-find').close();
      goToButton(r);
    });
    out.appendChild(row);
  }
}

function goToButton(result) {
  const state = ctx.state;
  if (state.currentBoardId !== result.boardId) {
    // Jump straight there; the path display taught the real route.
    navigateTo(state, result.boardId);
  }
  // Pulse the found button so eyes land on it.
  requestAnimationFrame(() => {
    const board = state.boards.get(result.boardId);
    const idx = board.cells.findIndex(c => c?.id === result.buttonId);
    const cell = document.querySelector(`#grid .cell[data-index="${idx}"]`);
    if (cell) {
      cell.classList.add('found');
      setTimeout(() => cell.classList.remove('found'), 2600);
    }
  });
}

// ---------------- Keyboard (type to talk) ----------------
async function openKeyboard() {
  const state = ctx.state;
  const labels = [];
  for (const b of state.boards.values()) {
    for (const c of b.cells) if (c && c.action?.type !== 'board') labels.push(c.label);
  }
  const history = (await getLogs(state.profile.id, 300)).map(l => l.text);
  model = buildModel(labels, history);
  $('kb-text').value = '';
  renderChips();
  $('view-board').hidden = true;
  $('view-keyboard').hidden = false;
  $('kb-text').focus();
}

function closeKeyboard() {
  $('view-keyboard').hidden = true;
  $('view-board').hidden = false;
}

function renderChips() {
  const chips = $('kb-chips');
  chips.innerHTML = '';
  for (const word of predict(model, $('kb-text').value, 5)) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = word;
    chip.addEventListener('click', () => {
      $('kb-text').value = applySuggestion($('kb-text').value, word);
      $('kb-text').focus();
      renderChips();
    });
    chips.appendChild(chip);
  }
}

function wireKeyboard() {
  $('btn-keyboard').addEventListener('click', openKeyboard);
  $('btn-kb-close').addEventListener('click', closeKeyboard);
  $('kb-text').addEventListener('input', renderChips);
  $('btn-kb-clear').addEventListener('click', () => { $('kb-text').value = ''; renderChips(); });
  $('btn-kb-speak').addEventListener('click', () => {
    const text = $('kb-text').value.trim();
    if (!text) return;
    speak(text, ctx.state.profile);
    logEvent(ctx.state.profile.id, 'keyboard', text);
  });
}

// ---------------- History / data log ----------------
export async function renderHistory() {
  const list = $('history-list');
  const profiles = new Map((await db.getAll('profiles')).map(p => [p.id, p]));
  const logs = await getLogs(null, 12);
  list.innerHTML = logs.length ? '' : '<p class="hint">Nothing yet.</p>';
  for (const l of logs) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'find-row';
    const text = document.createElement('strong');
    text.textContent = l.text;
    const meta = document.createElement('span');
    meta.className = 'find-path';
    const when = new Date(l.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
    meta.textContent = `${profiles.get(l.profileId)?.name || '?'} - ${when}`;
    row.append(text, meta);
    row.addEventListener('click', () => speak(l.text, ctx.state.profile || {}));
    list.appendChild(row);
  }
}

function wireHistory() {
  $('btn-log-export').addEventListener('click', async () => {
    const profiles = new Map((await db.getAll('profiles')).map(p => [p.id, p]));
    const n = await exportCSV(profiles);
    ctx.toast(`Exported ${n} entries`);
  });
  $('btn-log-clear').addEventListener('click', async () => {
    if (!confirm('Clear the whole speech log?')) return;
    const n = await clearLogs();
    ctx.toast(`Cleared ${n} entries`);
    renderHistory();
  });
}
