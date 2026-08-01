// First-run starter content + the template board library. Everything uses
// emoji images so the app is fully usable offline from the very first launch;
// mom swaps in photos/symbols later.
import { mkProfile, mkBoard, mkButton } from './model.js';
import { NOTES } from './audio.js';
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

// ---------------- Template board library ----------------
// Each template can be added to any profile from Board settings; `emoji` is
// used for the auto-created link button.
export const TEMPLATES = {
  feelings: {
    name: 'Feelings', emoji: '😊', rows: 2, cols: 3,
    buttons: () => [
      E('happy', '😄', { color: C.social }),
      E('sad', '😢', { color: C.social }),
      E('mad', '😠', { color: C.social }),
      E('tired', '😴', { color: C.social }),
      E('sick', '🤒', { color: C.alert }),
      E('silly', '🤪', { color: C.social }),
    ],
  },
  food: {
    name: 'Food', emoji: '🍎', rows: 3, cols: 3,
    buttons: () => [
      E('apple', '🍎', { color: C.noun }),
      E('banana', '🍌', { color: C.noun }),
      E('cookie', '🍪', { color: C.noun }),
      E('milk', '🥛', { color: C.noun }),
      E('water', '💧', { color: C.noun }),
      E('juice', '🧃', { color: C.noun }),
      E('pizza', '🍕', { color: C.noun }),
      E('cereal', '🥣', { color: C.noun }),
      E('sandwich', '🥪', { color: C.noun }),
    ],
  },
  people: {
    name: 'People', emoji: '👨‍👩‍👧‍👦', rows: 3, cols: 3,
    buttons: () => [
      E('Mom', '👩', { color: C.noun }),
      E('Dad', '👨', { color: C.noun }),
      E('brother', '👦', { color: C.noun }),
      E('sister', '👧', { color: C.noun }),
      E('Grandma', '👵', { color: C.noun }),
      E('Grandpa', '👴', { color: C.noun }),
      E('teacher', '🧑‍🏫', { color: C.noun }),
      E('friend', '🧑‍🤝‍🧑', { color: C.noun }),
      E('me', '🙋', { color: C.pronoun }),
    ],
  },
  body: {
    name: 'Body & Hurt', emoji: '🤕', rows: 3, cols: 4,
    buttons: () => [
      E('it hurts', '🤕', { color: C.alert }),
      E('head', '🙆', { color: C.noun }),
      E('tummy', '🫃', { color: C.noun }),
      E('ear', '👂', { color: C.noun }),
      E('tooth', '🦷', { color: C.noun }),
      E('arm', '💪', { color: C.noun }),
      E('leg', '🦵', { color: C.noun }),
      E('hot', '🥵', { color: C.describe }),
      E('cold', '🥶', { color: C.describe }),
      E('itchy', '😣', { color: C.describe }),
      E('medicine', '💊', { color: C.noun }),
      E('doctor', '🧑‍⚕️', { color: C.noun }),
    ],
  },
  school: {
    name: 'School', emoji: '🏫', rows: 3, cols: 3,
    buttons: () => [
      E('teacher', '🧑‍🏫', { color: C.noun }),
      E('book', '📚', { color: C.noun }),
      E('backpack', '🎒', { color: C.noun }),
      E('lunch', '🍱', { color: C.noun }),
      E('recess', '🛝', { color: C.verb }),
      E('bus', '🚌', { color: C.noun }),
      E('art', '🎨', { color: C.noun }),
      E('music class', '🎶', { color: C.noun }),
      E('friend', '🧑‍🤝‍🧑', { color: C.noun }),
    ],
  },
  weather: {
    name: 'Weather', emoji: '🌤️', rows: 2, cols: 3,
    buttons: () => [
      E('sunny', '☀️', { color: C.describe }),
      E('rainy', '🌧️', { color: C.describe }),
      E('snowy', '⛄', { color: C.describe }),
      E('hot', '🥵', { color: C.describe }),
      E('cold', '🥶', { color: C.describe }),
      E('windy', '🌬️', { color: C.describe }),
    ],
  },
  music: {
    name: 'Music', emoji: '🎵', rows: 2, cols: 4,
    // Pentatonic pads - any order sounds good (no wrong notes).
    buttons: () => NOTES.map(n =>
      mkButton({
        label: n.name,
        image: { type: 'emoji', value: n.emoji },
        action: { type: 'note', freq: n.freq },
      })),
  },
};

export function boardFromTemplate(key, profileId) {
  const t = TEMPLATES[key];
  if (!t) return null;
  const board = mkBoard({ profileId, name: t.name, rows: t.rows, cols: t.cols });
  fill(board, t.buttons());
  return board;
}

// Always-available instant phrases for the sidebar (TD Snap calls these
// Quickfires). Filled into any profile that doesn't have its own yet.
export function defaultQuickFires() {
  return [
    E('wait', '🖐', { speak: 'Wait please' }),
    E('help', '🙋', { speak: 'I need help' }),
    E('break', '😮‍💨', { speak: 'I need a break' }),
    E('come here', '👋', { speak: 'Come here please' }),
    E('I love you', '❤️', {}),
  ];
}

const link = (template, board) =>
  E(template.name.toLowerCase(), template.emoji, { action: { type: 'board', boardId: board.id } });

export async function seedIfEmpty() {
  const profiles = await db.getAll('profiles');
  if (profiles.length) return false;
  const boards = [];

  // ---- Profile A: simple board (SoundingBoard-style, but TTS-voiced) ----
  // Placeholder names - mom renames these to the kids' real names in
  // Grown-ups -> Settings.
  const pa = mkProfile({ name: 'Sibling 1', style: 'simple', avatar: '🐻' });
  const aHome = mkBoard({ profileId: pa.id, name: 'Home', rows: 4, cols: 3 });
  const aFeel = boardFromTemplate('feelings', pa.id);
  const aMusic = boardFromTemplate('music', pa.id);
  const aBody = boardFromTemplate('body', pa.id);
  fill(aHome, [
    E('eat', '🍽️', { color: C.verb }),
    E('drink', '🥤', { color: C.verb }),
    E('more', '➕', { color: C.describe }),
    E('all done', '✅', { color: C.describe }),
    E('help', '🙋', { color: C.alert }),
    E('bathroom', '🚻', { color: C.noun }),
    E('outside', '🌳', { color: C.noun }),
    E('I love you', '❤️', { color: C.social }),
    link(TEMPLATES.feelings, aFeel),
    link(TEMPLATES.body, aBody),
    link(TEMPLATES.music, aMusic),
  ]);
  pa.homeBoardId = aHome.id;
  boards.push(aHome, aFeel, aMusic, aBody);

  // ---- Profile B: core words + sentence bar (TD Snap-style) ----
  const pb = mkProfile({ name: 'Sibling 2', style: 'sentence', avatar: '⭐' });
  const bHome = mkBoard({ profileId: pb.id, name: 'Home', rows: 5, cols: 5 });
  const bFood = boardFromTemplate('food', pb.id);
  const bFeel = boardFromTemplate('feelings', pb.id);
  const bPeople = boardFromTemplate('people', pb.id);
  const bBody = boardFromTemplate('body', pb.id);
  const bMusic = boardFromTemplate('music', pb.id);
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
    link(TEMPLATES.food, bFood),
    link(TEMPLATES.feelings, bFeel),
    link(TEMPLATES.people, bPeople),
    link(TEMPLATES.body, bBody),
    link(TEMPLATES.music, bMusic),
  ]);
  pb.homeBoardId = bHome.id;
  boards.push(bHome, bFood, bFeel, bPeople, bBody, bMusic);

  for (const p of [pa, pb]) await db.put('profiles', p);
  for (const b of boards) await db.put('boards', b);
  return true;
}
