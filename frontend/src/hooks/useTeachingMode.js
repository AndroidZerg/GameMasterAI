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

const SPEED_OPTIONS = [0.75, 1.0, 1.25];

/**
 * useTeachingMode — manages step-by-step teaching with TTS.
 * Step -1 = Table of Contents (visual only, no TTS).
 *
 * @param {object} sectionData - { walkthrough: [...], summary: [...] } for current tab
 * @param {string} activeTab - current tab key
 * @returns hook state and controls
 */
export default function useTeachingMode(sectionData, activeTab) {
  const [currentMode, setCurrentMode] = useState(() => {
    try { return localStorage.getItem("gmai_teaching_mode") || "summary"; }
    catch { return "summary"; }
  });
  // -1 = TOC screen, 0..N-1 = actual steps
  const [currentStep, setCurrentStep] = useState(-1);
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
  const currentStepData = currentStep >= 0 ? (steps[currentStep] || null) : null;
  const showingTOC = currentStep === -1;

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

  // Reset to TOC when tab changes
  useEffect(() => {
    if (prevTabRef.current !== activeTab) {
      stopSpeaking();
      setCurrentStep(-1);
      prevTabRef.current = activeTab;
    }
  }, [activeTab]);

  // Reset to TOC when mode changes
  useEffect(() => {
    if (prevModeRef.current !== currentMode) {
      stopSpeaking();
      setCurrentStep(-1);
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
      // Read title first, then body text
      const parts = [];
      if (step.title) parts.push(step.title + ".");
      if (step.text) parts.push(step.text);
      return parts.join(" ");
    }
    // Summary mode — combine title + bullets
    const parts = [];
    if (step.title) parts.push(step.title + ".");
    if (step.bullets) parts.push(step.bullets.join(". "));
    return parts.join(" ");
  }, [currentMode]);

  const handlePlayPause = useCallback(() => {
    // No TTS on TOC screen
    if (showingTOC) return;
    if (ttsState === "playing") {
      pauseSpeaking();
    } else if (ttsState === "paused") {
      resumeSpeaking();
    } else {
      const text = getStepText(currentStepData);
      if (text) speakText(text);
    }
  }, [ttsState, currentStepData, getStepText, showingTOC]);

  const handleNext = useCallback(() => {
    if (showingTOC) {
      // TOC → step 0
      stopSpeaking();
      setCurrentStep(0);
    } else if (currentStep < totalSteps - 1) {
      stopSpeaking();
      setCurrentStep((s) => s + 1);
    }
  }, [currentStep, totalSteps, showingTOC]);

  const handlePrevious = useCallback(() => {
    if (currentStep === 0) {
      // Step 0 → back to TOC
      stopSpeaking();
      setCurrentStep(-1);
    } else if (currentStep > 0) {
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

  const resetStep = useCallback(() => {
    stopSpeaking();
    setCurrentStep(-1);
  }, []);

  // Jump to a specific step (used by TOC clicks)
  const goToStep = useCallback((stepIndex) => {
    stopSpeaking();
    setCurrentStep(stepIndex);
  }, []);

  return {
    currentMode,
    currentStep,
    totalSteps,
    currentStepData,
    steps,
    ttsState,
    playbackSpeed,
    showingTOC,
    isPlaying: ttsState === "playing",
    isPaused: ttsState === "paused",
    onPlayPause: handlePlayPause,
    onNext: handleNext,
    onPrevious: handlePrevious,
    onModeChange: handleModeChange,
    onSpeedChange: handleSpeedChange,
    resetStep,
    goToStep,
    SPEED_OPTIONS,
  };
}
