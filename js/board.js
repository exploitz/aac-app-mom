// Board rendering + kid-mode interaction. DOM only - state lives in app.js.
import { spokenText } from './model.js';
import { speak } from './speech.js';
import { playSound, playNote } from './audio.js';
import { logEvent } from './log.js';
import * as db from './db.js';

const $ = id => document.getElementById(id);

// imageId -> object URL, so blobs are fetched from IndexedDB once per session.
const imageUrlCache = new Map();

export async function imageUrl(imageId) {
  if (imageUrlCache.has(imageId)) return imageUrlCache.get(imageId);
  const blob = await db.get('images', imageId);
  if (!blob) return null;
  const url = URL.createObjectURL(blob);
  imageUrlCache.set(imageId, url);
  return url;
}

export function imageNode(image, cls = 'c-img') {
  const wrap = document.createElement('div');
  wrap.className = cls;
  if (!image) return wrap;
  if (image.type === 'emoji') {
    wrap.textContent = image.value;
  } else if (image.type === 'image') {
    const img = document.createElement('img');
    img.alt = '';
    imageUrl(image.imageId).then(url => { if (url) img.src = url; });
    wrap.appendChild(img);
  }
  return wrap;
}

export function currentBoard(state) {
  return state.boards.get(state.currentBoardId);
}

export function renderGrid(state, onCell) {
  const board = currentBoard(state);
  const grid = $('grid');
  grid.innerHTML = '';
  grid.style.gridTemplateColumns = `repeat(${board.cols}, 1fr)`;
  grid.style.gridTemplateRows = `repeat(${board.rows}, 1fr)`;
  board.cells.forEach((btn, i) => {
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.dataset.index = i;
    const maskedInKidMode = btn?.hidden && state.mode !== 'edit';
    if (btn && !maskedInKidMode) {
      cell.className = 'cell' + (btn.action?.type === 'board' ? ' folder' : '');
      if (btn.hidden) cell.classList.add('masked'); // edit mode: dimmed, still editable
      if (btn.color) cell.style.background = btn.color;
      cell.appendChild(imageNode(btn.image));
      const label = document.createElement('div');
      label.className = 'c-label';
      label.textContent = btn.label;
      cell.appendChild(label);
      cell.setAttribute('aria-label', btn.label);
    } else {
      // Empty cell, or a masked button in kid mode (space kept, invisible).
      cell.className = 'cell empty';
      if (state.mode === 'edit') {
        const hint = document.createElement('span');
        hint.className = 'add-hint';
        hint.textContent = '＋';
        cell.appendChild(hint);
        cell.setAttribute('aria-label', 'Add button here');
      } else {
        cell.disabled = true;
        cell.setAttribute('aria-hidden', 'true');
      }
    }
    if (state.mode === 'edit' && state.moveSrc === i) cell.classList.add('move-src');
    attachActivation(cell, state, () => onCell(i, maskedInKidMode ? null : btn, cell));
    grid.appendChild(cell);
  });
  $('board-title').textContent = board.name;
  $('btn-back').style.visibility = state.navStack.length ? 'visible' : 'hidden';
}

// Dwell support: with holdMs set, a press must be held before it activates -
// brushes and accidental touches do nothing. Edit mode always uses plain taps.
function attachActivation(cell, state, fire) {
  const holdMs = state.mode === 'edit' ? 0 : (state.profile.holdMs || 0);
  if (!holdMs) {
    cell.addEventListener('click', fire);
    return;
  }
  let downAt = 0;
  cell.addEventListener('pointerdown', () => {
    downAt = performance.now();
    cell.classList.add('holding');
  });
  const cancel = () => { downAt = 0; cell.classList.remove('holding'); };
  cell.addEventListener('pointerup', () => {
    const held = performance.now() - downAt;
    const ok = downAt && held >= holdMs;
    cancel();
    if (ok) fire();
  });
  cell.addEventListener('pointerleave', cancel);
  cell.addEventListener('pointercancel', cancel);
}

export function flash(cell) {
  cell.classList.remove('flash');
  // Restart the animation even on rapid re-taps.
  void cell.offsetWidth;
  cell.classList.add('flash');
}

// Speak a button: recorded audio wins, device TTS otherwise.
function speakButton(state, btn) {
  const text = spokenText(btn);
  if (btn.soundId) playSound(btn.soundId).then(ok => { if (!ok) speak(text, state.profile); });
  else speak(text, state.profile);
  return text;
}

// ---- Kid-mode tap ----
export function kidTap(state, btn, cell) {
  if (!btn) return;
  flash(cell);
  if (btn.action?.type === 'board') {
    navigateTo(state, btn.action.boardId);
    return;
  }
  if (btn.action?.type === 'note') {
    playNote(btn.action.freq);
    return;
  }
  if (state.profile.style === 'sentence') {
    state.sentence.push({ label: btn.label, speak: spokenText(btn), image: btn.image });
    renderSentence(state);
    speakButton(state, btn); // the word sounds as it lands in the bar
  } else {
    logEvent(state.profile.id, 'word', speakButton(state, btn));
  }
}

// ---- Sidebar: Quick Fires + board shortcuts ----
export function renderSidebar(state, onQuickFireEdit) {
  const bar = document.getElementById('sidebar');
  bar.hidden = state.profile.sidebar === false;
  if (bar.hidden) return;
  bar.innerHTML = '';

  const header = (text) => {
    const h = document.createElement('div');
    h.className = 'sb-header';
    h.textContent = text;
    bar.appendChild(h);
  };

  header('⚡ Quick');
  (state.profile.quickFires || []).forEach((qf, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-btn';
    b.appendChild(imageNode(qf.image, 'sb-img'));
    const label = document.createElement('span');
    label.textContent = qf.label;
    b.appendChild(label);
    b.setAttribute('aria-label', spokenText(qf));
    attachActivation(b, state, () => {
      if (state.mode === 'edit') { onQuickFireEdit(i, qf); return; }
      flash(b);
      logEvent(state.profile.id, 'quickfire', speakButton(state, qf));
    });
    bar.appendChild(b);
  });
  if (state.mode === 'edit') {
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'sb-btn sb-add';
    add.textContent = '＋';
    add.setAttribute('aria-label', 'Add quick phrase');
    add.addEventListener('click', () => onQuickFireEdit(-1, null));
    bar.appendChild(add);
  }

  header('Boards');
  const boards = [...state.boards.values()]
    .sort((a, b) => (a.id === state.profile.homeBoardId ? -1 : b.id === state.profile.homeBoardId ? 1 : a.name.localeCompare(b.name)));
  for (const board of boards) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'sb-btn sb-board' + (board.id === state.currentBoardId ? ' current' : '');
    const icon = document.createElement('span');
    icon.className = 'sb-img';
    icon.textContent = board.id === state.profile.homeBoardId ? '🏠' : '📋';
    const label = document.createElement('span');
    label.textContent = board.name;
    b.append(icon, label);
    b.setAttribute('aria-label', `Go to ${board.name}`);
    attachActivation(b, state, () => {
      state.currentBoardId = board.id;
      state.navStack = [];
      state.rerender();
    });
    bar.appendChild(b);
  }
}

export function navigateTo(state, boardId) {
  if (!state.boards.has(boardId)) return;
  state.navStack.push(state.currentBoardId);
  state.currentBoardId = boardId;
  state.rerender();
}

export function goBack(state) {
  if (!state.navStack.length) return;
  state.currentBoardId = state.navStack.pop();
  state.rerender();
}

// ---- Sentence bar ----
export function renderSentence(state) {
  const bar = $('sentence-bar');
  const isSentence = state.profile?.style === 'sentence';
  bar.hidden = !isSentence;
  $('board-title').style.display = isSentence ? 'none' : '';
  if (!isSentence) return;
  const words = $('sentence-words');
  words.innerHTML = '';
  state.sentence.forEach(w => {
    const el = document.createElement('span');
    el.className = 'word';
    el.appendChild(imageNode(w.image, 'w-img'));
    const t = document.createElement('span');
    t.textContent = w.label;
    el.appendChild(t);
    words.appendChild(el);
  });
  words.scrollLeft = words.scrollWidth;
}

export function speakSentence(state) {
  const text = state.sentence.map(w => w.speak).join(' ');
  if (text) {
    speak(text, state.profile);
    logEvent(state.profile.id, 'sentence', text);
  }
}
