/**
 * ResponseDisplay — handles speaking the LLM response aloud via SpeechSynthesis.
 * Called from GameTeacher when a new response arrives.
 */

export function speakResponse(text, muted = false) {
  if (muted || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = 0.9;

  // Pick a good English voice if available
  const voices = window.speechSynthesis.getVoices();
  const english =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (english) utter.voice = english;

  window.speechSynthesis.speak(utter);
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
