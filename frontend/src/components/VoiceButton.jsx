import { useState, useRef } from "react";

/**
 * VoiceButton — browser-native speech recognition via Web Speech API.
 * Tap to start listening, speech is transcribed and auto-submitted.
 * Hides itself if speech recognition is not supported.
 */
export default function VoiceButton({ onResult, disabled }) {
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);

  const SpeechRecognition =
    typeof window !== "undefined" &&
    (window.SpeechRecognition || window.webkitSpeechRecognition);

  if (!SpeechRecognition) return null;

  const toggleListening = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const text = event.results[0][0].transcript;
      setListening(false);
      if (text && onResult) onResult(text);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  };

  return (
    <button
      onClick={toggleListening}
      disabled={disabled}
      style={{
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        border: "none",
        background: listening ? "var(--accent-dark)" : "var(--accent)",
        color: "#fff",
        fontSize: "1.4rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: disabled ? "not-allowed" : "pointer",
        animation: listening ? "pulse 1s infinite" : "none",
        flexShrink: 0,
      }}
      title={listening ? "Stop listening" : "Tap to speak"}
    >
      🎤
    </button>
  );
}
