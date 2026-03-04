import { useState, useEffect, useCallback, useRef } from "react";
import {
  speakText,
  stopSpeaking,
  pauseSpeaking,
  resumeSpeaking,
  setRate,
  getRate,
  setOnStateChange,
  setOnRateChange,
} from "../components/ResponseDisplay";

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 2.0];

/**
 * useTeachingMode — manages step-by-step teaching with TTS.
 *
 * @param {object} sectionData - { walkthrough: [...], summary: [...] } for current tab
 * @param {string} activeTab - current tab key (setup/rules/strategy)
 * @returns hook state and controls
 */
export default function useTeachingMode(sectionData, activeTab) {
  const [currentMode, setCurrentMode] = useState(() => {
    try { return localStorage.getItem("gmai_teaching_mode") || "summary"; }
    catch { return "summary"; }
  });
  const [currentStep, setCurrentStep] = useState(0);
  const [ttsState, setTtsState] = useState("idle");
  const [playbackSpeed, setPlaybackSpeed] = useState(() => {
    const saved = getRate();
    return SPEED_OPTIONS.includes(saved) ? saved : 1.0;
  });

  const prevTabRef = useRef(activeTab);
  const prevModeRef = useRef(currentMode);

  // Get steps for current mode
  const steps = sectionData?.[currentMode] || [];
  const totalSteps = steps.length;
  const currentStepData = steps[currentStep] || null;

  // Register TTS callbacks
  useEffect(() => {
    setOnStateChange((state) => setTtsState(state));
    setOnRateChange((rate) => setPlaybackSpeed(rate));
    return () => {
      setOnStateChange(null);
      setOnRateChange(null);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Reset step when tab changes
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      stopSpeaking();
      setCurrentStep(0);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Reset step when mode changes
  useEffect(() => {
    if (prevModeRef.current !== currentMode) {
      stopSpeaking();
      setCurrentStep(0);
      prevModeRef.current = currentMode;
    }
  }, [currentMode]);

  // Persist mode to localStorage
  useEffect(() => {
    try { localStorage.setItem("gmai_teaching_mode", currentMode); }
    catch { /* ignore */ }
  }, [currentMode]);

  // Get the text to speak for the current step
  const getStepText = useCallback((step) => {
    if (!step) return "";
    if (currentMode === "walkthrough") {
      return step.text || "";
    }
    // Summary mode — combine title + bullets
    const parts = [];
    if (step.title) parts.push(step.title + ".");
    if (step.bullets) parts.push(step.bullets.join(". "));
    return parts.join(" ");
  }, [currentMode]);

  const handlePlayPause = useCallback(() => {
    if (ttsState === "playing") {
      pauseSpeaking();
    } else if (ttsState === "paused") {
      resumeSpeaking();
    } else {
      // idle or finished — play/repeat current step
      const text = getStepText(currentStepData);
      if (text) speakText(text);
    }
  }, [ttsState, currentStepData, getStepText]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      stopSpeaking();
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      stopSpeaking();
      setCurrentStep((s) => s - 1);
    }
  }, [currentStep]);

  const handleModeChange = useCallback((mode) => {
    setCurrentMode(mode);
  }, []);

  const handleSpeedChange = useCallback((speed) => {
    setRate(speed);
    setPlaybackSpeed(speed);
  }, []);

  return {
    currentMode,
    currentStep,
    totalSteps,
    currentStepData,
    steps,
    ttsState,
    playbackSpeed,
    isPlaying: ttsState === "playing",
    isPaused: ttsState === "paused",
    onPlayPause: handlePlayPause,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onModeChange: handleModeChange,
    onSpeedChange: handleSpeedChange,
    SPEED_OPTIONS,
  };
}
