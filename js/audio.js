// Sound: recorded-voice playback, mic recording, and the music synth.
// All entry points are user-gesture triggered, which satisfies mobile autoplay rules.
import * as db from './db.js';

// ---------------- Recorded sounds ----------------
const soundUrlCache = new Map(); // soundId -> object URL
let currentAudio = null;

export async function playSound(soundId) {
  let url = soundUrlCache.get(soundId);
  if (!url) {
    const blob = await db.get('sounds', soundId);
    if (!blob) return false;
    url = URL.createObjectURL(blob);
    soundUrlCache.set(soundId, url);
  }
  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(url);
  await currentAudio.play().catch(() => {});
  return true;
}

export function playBlobOnce(blob) {
  if (currentAudio) currentAudio.pause();
  currentAudio = new Audio(URL.createObjectURL(blob));
  const cleanup = () => URL.revokeObjectURL(currentAudio.src);
  currentAudio.addEventListener('ended', cleanup, { once: true });
  return currentAudio.play().catch(() => {});
}

// ---------------- Recording ----------------
let recorder = null;
let recChunks = [];

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  recChunks = [];
  // Let the browser pick its native container (mp4/AAC on iOS, webm on Chrome).
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
  recorder.start();
}

export function stopRecording() {
  return new Promise((resolve, reject) => {
    if (!recorder || recorder.state === 'inactive') { reject(new Error('not recording')); return; }
    recorder.onstop = () => {
      recorder.stream.getTracks().forEach(t => t.stop());
      resolve(new Blob(recChunks, { type: recorder.mimeType || 'audio/webm' }));
      recorder = null;
    };
    recorder.stop();
  });
}

export function isRecording() {
  return !!recorder && recorder.state === 'recording';
}

// ---------------- Music synth ----------------
// Pentatonic scale: any combination of these notes sounds musical - the
// AUMI principle of "no wrong notes".
export const NOTES = [
  { name: 'C', freq: 261.63, emoji: '🔴' },
  { name: 'D', freq: 293.66, emoji: '🟠' },
  { name: 'E', freq: 329.63, emoji: '🟡' },
  { name: 'G', freq: 392.00, emoji: '🟢' },
  { name: 'A', freq: 440.00, emoji: '🔵' },
  { name: 'high C', freq: 523.25, emoji: '🟣' },
  { name: 'drum', freq: 0, emoji: '🥁' },
  { name: 'chime', freq: 1046.5, emoji: '✨' },
];

let audioCtx = null;
function ctx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window['webkitAudioContext'])();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playNote(freq) {
  const ac = ctx();
  const now = ac.currentTime;
  const gain = ac.createGain();
  gain.connect(ac.destination);

  if (freq === 0) {
    // Drum: a burst of filtered noise with a fast decay.
    const len = ac.sampleRate * 0.25;
    const buf = ac.createBuffer(1, len, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ac.createBufferSource();
    src.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 220;
    src.connect(filter).connect(gain);
    gain.gain.setValueAtTime(0.9, now);
    src.start(now);
    return;
  }

  // Two detuned oscillators for warmth, soft attack, natural decay.
  for (const detune of [0, 4]) {
    const osc = ac.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    osc.detune.value = detune;
    osc.connect(gain);
    osc.start(now);
    osc.stop(now + 1.2);
  }
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.5, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
}
