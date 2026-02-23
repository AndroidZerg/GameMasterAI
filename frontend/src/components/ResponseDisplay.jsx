/**
 * ResponseDisplay — handles speaking the LLM response aloud via SpeechSynthesis.
 * Called from GameTeacher when a new response arrives.
 */

function stripMarkdownForSpeech(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/__(.+?)__/g, '$1')       // bold alt
    .replace(/_(.+?)_/g, '$1')         // italic alt
    .replace(/#+\s*/g, '')             // headers
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .trim();
}

export function speakResponse(text, muted = false) {
  if (muted || !window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const cleanText = stripMarkdownForSpeech(text);
  const utter = new SpeechSynthesisUtterance(cleanText);
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
