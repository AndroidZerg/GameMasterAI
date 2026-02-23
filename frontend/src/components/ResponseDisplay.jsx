/**
 * ResponseDisplay — handles speaking text aloud via SpeechSynthesis.
 * Supports per-section reading, speed control, pause, and stop.
 */

let currentRate = 1.0;
let currentUtterance = null;
let currentText = null;
let onStateChangeCallback = null;
let onRateChangeCallback = null;

function stripMarkdownForSpeech(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')  // bold
    .replace(/\*(.+?)\*/g, '$1')       // italic
    .replace(/__(.+?)__/g, '$1')       // bold alt
    .replace(/_(.+?)_/g, '$1')         // italic alt
    .replace(/#{1,6}\s*/g, '')          // headers
    .replace(/`(.+?)`/g, '$1')        // inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // links
    .replace(/^- /gm, '')             // bullet dashes
    .replace(/^\d+[\).]\s*/gm, '')     // numbered list prefixes
    .replace(/^---.*---$/gm, '')       // player-count dividers
    .replace(/ — /g, '. ')            // em dash to pause
    .trim();
}

export function setOnStateChange(cb) {
  onStateChangeCallback = cb;
}

export function setOnRateChange(cb) {
  onRateChangeCallback = cb;
}

function notifyState(state) {
  if (onStateChangeCallback) onStateChangeCallback(state);
}

function notifyRate() {
  if (onRateChangeCallback) onRateChangeCallback(currentRate);
}

function startUtterance(cleanText) {
  if (!window.speechSynthesis) return;

  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(cleanText);
  utter.rate = currentRate;

  const voices = window.speechSynthesis.getVoices();
  const english =
    voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    voices.find((v) => v.lang.startsWith("en"));
  if (english) utter.voice = english;

  utter.onend = () => {
    currentUtterance = null;
    currentText = null;
    notifyState("idle");
  };
  utter.onerror = () => {
    currentUtterance = null;
    currentText = null;
    notifyState("idle");
  };

  currentUtterance = utter;
  window.speechSynthesis.speak(utter);
  notifyState("playing");
}

export function speakText(text) {
  if (!window.speechSynthesis) return;
  currentText = stripMarkdownForSpeech(text);
  startUtterance(currentText);
}

export function speakResponse(text, muted = false) {
  if (muted) return;
  speakText(text);
}

export function pauseSpeaking() {
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.pause();
    notifyState("paused");
  }
}

export function resumeSpeaking() {
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
    notifyState("playing");
  }
}

export function stopSpeaking() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    currentUtterance = null;
    currentText = null;
    notifyState("idle");
  }
}

export function getRate() {
  return currentRate;
}

export function setRate(rate) {
  currentRate = Math.max(0.5, Math.min(2.0, rate));
  notifyRate();
  // If currently speaking, restart at new rate
  if (currentText && window.speechSynthesis?.speaking) {
    startUtterance(currentText);
  }
}

export function speedUp() {
  setRate(currentRate + 0.25);
  return currentRate;
}

export function slowDown() {
  setRate(currentRate - 0.25);
  return currentRate;
}

export function isSpeaking() {
  return window.speechSynthesis?.speaking || false;
}

export function isPaused() {
  return window.speechSynthesis?.paused || false;
}
