// Board rendering + kid-mode interaction. DOM only - state lives in app.js.
import { spokenText } from './model.js';
import { speak } from './speech.js';
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
    if (btn) {
      cell.className = 'cell' + (btn.action?.type === 'board' ? ' folder' : '');
      if (btn.color) cell.style.background = btn.color;
      cell.appendChild(imageNode(btn.image));
      const label = document.createElement('div');
      label.className = 'c-label';
      label.textContent = btn.label;
      cell.appendChild(label);
      cell.setAttribute('aria-label', btn.label);
    } else {
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
    cell.addEventListener('click', () => onCell(i, btn, cell));
    grid.appendChild(cell);
  });
  $('board-title').textContent = board.name;
  $('btn-back').style.visibility = state.navStack.length ? 'visible' : 'hidden';
}

export function flash(cell) {
  cell.classList.remove('flash');
  // Restart the animation even on rapid re-taps.
  void cell.offsetWidth;
  cell.classList.add('flash');
}

// ---- Kid-mode tap ----
export function kidTap(state, btn, cell) {
  if (!btn) return;
  flash(cell);
  if (btn.action?.type === 'board') {
    navigateTo(state, btn.action.boardId);
    return;
  }
  const text = spokenText(btn);
  if (state.profile.style === 'sentence') {
    state.sentence.push({ label: btn.label, speak: text, image: btn.image });
    renderSentence(state);
    speak(text, state.profile); // speak the word as it lands in the bar
  } else {
    speak(text, state.profile);
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
  if (text) speak(text, state.profile);
}
