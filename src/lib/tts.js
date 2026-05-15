/**
 * Text-to-Speech utility sử dụng Web Speech API
 * Tương đương FlutterTts trong ứng dụng di động
 */

let currentRate = 0.5;

export function speak(text, rate) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = rate || currentRate;
  utterance.volume = 1.0;
  utterance.pitch = 1.0;

  // Ưu tiên giọng en-US natural
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find(
    (v) => v.lang.startsWith("en") && v.name.includes("Natural")
  ) || voices.find((v) => v.lang.startsWith("en-US"));
  if (enVoice) utterance.voice = enVoice;

  window.speechSynthesis.speak(utterance);
}

export function speakSlow(text) {
  speak(text, 0.25);
}

export function stopSpeaking() {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
