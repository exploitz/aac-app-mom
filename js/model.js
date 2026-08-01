// Pure data helpers - no DOM, no IndexedDB, so they run in node tests too.
// Board shape follows Open Board Format concepts (grid of cells, buttons with
// label / vocalization / image / load-board action) so OBF export stays easy.

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

export function mkProfile({ name, style = 'simple', avatar = '🙂' } = {}) {
  return {
    id: uid(),
    name,
    style,             // 'simple' | 'sentence'
    avatar,            // emoji shown on the profile card
    homeBoardId: null,
    voiceURI: '',      // '' = device default voice
    rate: 1,
    uiSize: 'standard', // 'standard' | 'large' | 'xl' - scales controls & labels
  };
}

export function mkBoard({ profileId, name, rows, cols } = {}) {
  return {
    id: uid(),
    profileId,
    name,
    rows,
    cols,
    // cells is a fixed-length array (rows*cols) of button objects or null.
    cells: new Array(rows * cols).fill(null),
  };
}

export function mkButton({ label, speak = '', image = null, color = '', action = null, soundId = null } = {}) {
  return {
    id: uid(),
    label,
    speak,                       // spoken text override; '' = speak the label
    image,                       // {type:'emoji',value} | {type:'image',imageId} | null
    color,                       // background tint, '' = default
    soundId,                     // recorded audio; plays instead of TTS when set
    // {type:'speak'} | {type:'board', boardId} | {type:'note', freq}
    action: action || { type: 'speak' },
  };
}

export function spokenText(button) {
  return (button.speak || button.label || '').trim();
}

// Resize a board's grid, keeping existing buttons in reading order.
export function resizeCells(cells, oldCols, rows, cols) {
  const kept = cells.filter(Boolean);
  const next = new Array(rows * cols).fill(null);
  // First pass: keep buttons at their old row/col when it still exists,
  // so layouts (motor memory!) survive a grid resize.
  const leftovers = [];
  cells.forEach((btn, i) => {
    if (!btn) return;
    const r = Math.floor(i / oldCols), c = i % oldCols;
    if (r < rows && c < cols && next[r * cols + c] === null) {
      next[r * cols + c] = btn;
    } else {
      leftovers.push(btn);
    }
  });
  // Second pass: pour leftovers into the first empty cells.
  for (const btn of leftovers) {
    const slot = next.indexOf(null);
    if (slot === -1) break; // grid shrank below button count; extras drop (caller warns)
    next[slot] = btn;
  }
  return { cells: next, dropped: Math.max(0, kept.length - next.filter(Boolean).length) };
}

export function swapCells(cells, a, b) {
  const next = cells.slice();
  [next[a], next[b]] = [next[b], next[a]];
  return next;
}

// ---- Open Board Format export (one board -> .obf object) ----
// Spec: https://www.openboardformat.org/ - minimal, valid subset.
export function toOBF(board, buttonsImageUrl = () => null) {
  const buttons = [];
  const order = [];
  for (let r = 0; r < board.rows; r++) {
    const row = [];
    for (let c = 0; c < board.cols; c++) {
      const btn = board.cells[r * board.cols + c];
      if (!btn) { row.push(null); continue; }
      row.push(btn.id);
      const out = { id: btn.id, label: btn.label };
      if (btn.speak) out.vocalization = btn.speak;
      if (btn.color) out.background_color = btn.color;
      if (btn.action?.type === 'board') out.load_board = { id: btn.action.boardId };
      const url = buttonsImageUrl(btn);
      if (url) out.image_id = btn.id;
      buttons.push(out);
    }
    order.push(row);
  }
  return {
    format: 'open-board-0.1',
    id: board.id,
    name: board.name,
    buttons,
    grid: { rows: board.rows, columns: board.cols, order },
  };
}
