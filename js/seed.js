// First-run starter content. Everything uses emoji images so the app is fully
// usable offline from the very first launch; mom swaps in photos/symbols later.
import { mkProfile, mkBoard, mkButton } from './model.js';
import * as db from './db.js';

// Modified Fitzgerald key (loose): pronouns yellow, verbs green, describing
// blue, social pink, nouns orange, alerts red.
const C = {
  pronoun: '#fff3bf',
  verb: '#d3f9d8',
  describe: '#d0ebff',
  social: '#ffdeeb',
  noun: '#ffe8cc',
  alert: '#ffc9c9',
};

const E = (label, emoji, opts = {}) =>
  mkButton({ label, image: { type: 'emoji', value: emoji }, ...opts });

function fill(board, buttons) {
  buttons.forEach((b, i) => { board.cells[i] = b; });
  return board;
}

export async function seedIfEmpty() {
  const profiles = await db.getAll('profiles');
  if (profiles.length) return false;

  // ---- Profile A: simple board (SoundingBoard-style, but TTS-voiced) ----
  // Placeholder names - mom renames these to the kids' real names in
  // Grown-ups -> Settings.
  const pa = mkProfile({ name: 'Sibling 1', style: 'simple', avatar: '🐻' });
  const aHome = mkBoard({ profileId: pa.id, name: 'Home', rows: 3, cols: 3 });
  const aFeel = mkBoard({ profileId: pa.id, name: 'Feelings', rows: 2, cols: 3 });
  fill(aFeel, [
    E('happy', '😄', { color: C.social }),
    E('sad', '😢', { color: C.social }),
    E('mad', '😠', { color: C.social }),
    E('tired', '😴', { color: C.social }),
    E('sick', '🤒', { color: C.alert }),
    E('silly', '🤪', { color: C.social }),
  ]);
  fill(aHome, [
    E('eat', '🍽️', { color: C.verb }),
    E('drink', '🥤', { color: C.verb }),
    E('more', '➕', { color: C.describe }),
    E('all done', '✅', { color: C.describe }),
    E('help', '🙋', { color: C.alert }),
    E('bathroom', '🚻', { color: C.noun }),
    E('outside', '🌳', { color: C.noun }),
    E('feelings', '😊', { action: { type: 'board', boardId: aFeel.id } }),
    E('I love you', '❤️', { color: C.social }),
  ]);
  pa.homeBoardId = aHome.id;

  // ---- Profile B: core words + sentence bar (TD Snap-style) ----
  const pb = mkProfile({ name: 'Sibling 2', style: 'sentence', avatar: '⭐' });
  const bHome = mkBoard({ profileId: pb.id, name: 'Home', rows: 4, cols: 5 });
  const bFood = mkBoard({ profileId: pb.id, name: 'Food', rows: 3, cols: 3 });
  const bFeel = mkBoard({ profileId: pb.id, name: 'Feelings', rows: 2, cols: 3 });
  fill(bFood, [
    E('apple', '🍎', { color: C.noun }),
    E('banana', '🍌', { color: C.noun }),
    E('cookie', '🍪', { color: C.noun }),
    E('milk', '🥛', { color: C.noun }),
    E('water', '💧', { color: C.noun }),
    E('juice', '🧃', { color: C.noun }),
    E('pizza', '🍕', { color: C.noun }),
    E('cereal', '🥣', { color: C.noun }),
    E('sandwich', '🥪', { color: C.noun }),
  ]);
  fill(bFeel, [
    E('happy', '😄', { color: C.social }),
    E('sad', '😢', { color: C.social }),
    E('mad', '😠', { color: C.social }),
    E('tired', '😴', { color: C.social }),
    E('sick', '🤒', { color: C.alert }),
    E('silly', '🤪', { color: C.social }),
  ]);
  fill(bHome, [
    E('I', '👤', { color: C.pronoun }),
    E('you', '👉', { color: C.pronoun }),
    E('want', '🙌', { color: C.verb }),
    E('like', '👍', { color: C.verb }),
    E('go', '🏃', { color: C.verb }),
    E('stop', '✋', { color: C.alert }),
    E('help', '🙋', { color: C.alert }),
    E('more', '➕', { color: C.describe }),
    E('all done', '✅', { color: C.describe }),
    E('yes', '😊', { color: C.social }),
    E('no', '🙅', { color: C.social }),
    E('please', '🙏', { color: C.social }),
    E('thank you', '💖', { color: C.social }),
    E('eat', '🍽️', { color: C.verb }),
    E('drink', '🥤', { color: C.verb }),
    E('play', '🧸', { color: C.verb }),
    E('bathroom', '🚻', { color: C.noun }),
    E('outside', '🌳', { color: C.noun }),
    E('food', '🍎', { action: { type: 'board', boardId: bFood.id } }),
    E('feelings', '😊', { action: { type: 'board', boardId: bFeel.id } }),
  ]);
  pb.homeBoardId = bHome.id;

  for (const p of [pa, pb]) await db.put('profiles', p);
  for (const b of [aHome, aFeel, bHome, bFood, bFeel]) await db.put('boards', b);
  return true;
}
