// Pure logic (node-testable): word prediction and cross-board word finding.
// Prediction ranks the child's OWN vocabulary first - board labels and words
// they actually use beat any generic list.

// Small core fallback so prediction works even on a fresh profile.
const CORE = ('I you it we they want like go stop help more all done yes no please thank ' +
  'eat drink play outside bathroom home school mom dad love happy sad mad tired sick ' +
  'hurt big little hot cold up down in out on off my your the a is am are was to and ' +
  'not can will do get make come see look turn open close give need feel water food ' +
  'music book ball car dog cat bed now later again finished good bad fun new').split(' ');

const tokenize = text => text.toLowerCase().match(/[a-z']+/g) || [];

// Build a prediction model from the profile's button labels + usage history.
export function buildModel(labels = [], history = []) {
  const weight = new Map();
  const bump = (w, n) => weight.set(w, (weight.get(w) || 0) + n);
  for (const w of CORE) bump(w, 1);
  for (const label of labels) for (const w of tokenize(label)) bump(w, 4);
  const bigrams = new Map();
  for (const sentence of history) {
    const words = tokenize(sentence);
    words.forEach((w, i) => {
      bump(w, 3);
      if (i > 0) {
        const prev = words[i - 1];
        if (!bigrams.has(prev)) bigrams.set(prev, new Map());
        const next = bigrams.get(prev);
        next.set(w, (next.get(w) || 0) + 1);
      }
    });
  }
  return { weight, bigrams };
}

// Suggestions for the current input. Completes the word being typed, or
// predicts the next word after a space (bigrams first, then frequency).
export function predict(model, input, max = 5) {
  const endsSpace = /\s$/.test(input) || input === '';
  const words = tokenize(input);
  const current = endsSpace ? '' : (words[words.length - 1] || '');
  const prev = endsSpace ? words[words.length - 1] : words[words.length - 2];

  const candidates = new Map(); // word -> score
  if (prev && model.bigrams.has(prev)) {
    for (const [w, n] of model.bigrams.get(prev)) candidates.set(w, n * 100);
  }
  for (const [w, n] of model.weight) {
    if (!candidates.has(w)) candidates.set(w, n);
  }
  return [...candidates.entries()]
    .filter(([w]) => w !== current && (!current || w.startsWith(current)))
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([w]) => w);
}

// Apply a chosen suggestion to the input text.
export function applySuggestion(input, word) {
  if (/\s$/.test(input) || input === '') return input + word + ' ';
  return input.replace(/[^\s]+$/, word) + ' ';
}

// ---- Word Finder ----
// BFS over the board-link graph so results carry the tap path from home.
export function findWord(boardsMap, homeBoardId, query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  // Shortest path (as folder-label hops) from home to every board.
  const paths = new Map([[homeBoardId, []]]);
  const queue = [homeBoardId];
  while (queue.length) {
    const id = queue.shift();
    const board = boardsMap.get(id);
    if (!board) continue;
    for (const cell of board.cells) {
      if (cell?.action?.type === 'board' && !paths.has(cell.action.boardId)) {
        paths.set(cell.action.boardId, [...paths.get(id), cell.label]);
        queue.push(cell.action.boardId);
      }
    }
  }
  const results = [];
  for (const [id, board] of boardsMap) {
    for (const cell of board.cells) {
      if (!cell || cell.action?.type === 'board') continue;
      if (cell.label.toLowerCase().includes(q)) {
        results.push({
          buttonId: cell.id,
          label: cell.label,
          boardId: id,
          boardName: board.name,
          path: paths.get(id) ?? null, // null = unreachable from home
        });
      }
    }
  }
  // Exact matches first, then reachable, then shortest path.
  return results.sort((a, b) =>
    (b.label.toLowerCase() === q) - (a.label.toLowerCase() === q) ||
    (a.path === null) - (b.path === null) ||
    (a.path?.length ?? 99) - (b.path?.length ?? 99));
}
