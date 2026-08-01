// Web Speech API wrapper. All speech is user-gesture triggered (tap), which
// satisfies iOS Safari's autoplay rules.
let voices = [];

function loadVoices() {
  voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
}
if (window.speechSynthesis) {
  loadVoices();
  speechSynthesis.addEventListener?.('voiceschanged', loadVoices);
}

export function getVoices() {
  if (!voices.length) loadVoices();
  return voices;
}

export function speak(text, { voiceURI = '', rate = 1 } = {}) {
  if (!text || !window.speechSynthesis) return;
  speechSynthesis.cancel(); // a new tap always wins - no queue buildup
  const u = new SpeechSynthesisUtterance(text);
  const v = voices.find(v => v.voiceURI === voiceURI);
  if (v) u.voice = v;
  u.rate = rate;
  speechSynthesis.speak(u);
}
