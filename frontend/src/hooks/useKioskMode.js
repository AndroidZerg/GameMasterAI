import { useState, useEffect, useCallback, useRef } from "react";

const IDLE_TIMEOUT = 3 * 60 * 1000; // 3 minutes
const PROMPT_DURATION = 10 * 1000; // 10 seconds

export function isKioskMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get("kiosk") === "true";
}

export function getTableNumber() {
  const params = new URLSearchParams(window.location.search);
  return params.get("table") || null;
}

export function useKioskMode(navigateToHome) {
  const [kiosk] = useState(() => isKioskMode());
  const [showIdlePrompt, setShowIdlePrompt] = useState(false);
  const idleTimerRef = useRef(null);
  const promptTimerRef = useRef(null);

  const resetIdleTimer = useCallback(() => {
    if (!kiosk) return;
    setShowIdlePrompt(false);
    clearTimeout(idleTimerRef.current);
    clearTimeout(promptTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setShowIdlePrompt(true);
      promptTimerRef.current = setTimeout(() => {
        setShowIdlePrompt(false);
        // Clear recently played in kiosk mode
        try { localStorage.removeItem("gmai_recent"); } catch {}
        if (navigateToHome) navigateToHome();
      }, PROMPT_DURATION);
    }, IDLE_TIMEOUT);
  }, [kiosk, navigateToHome]);

  const dismissIdlePrompt = useCallback(() => {
    setShowIdlePrompt(false);
    resetIdleTimer();
  }, [resetIdleTimer]);

  useEffect(() => {
    if (!kiosk) return;

    // Request fullscreen on first tap
    const requestFullscreen = () => {
      const el = document.documentElement;
      if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      document.removeEventListener("click", requestFullscreen);
    };
    document.addEventListener("click", requestFullscreen, { once: true });

    // Block right-click
    const blockContextMenu = (e) => e.preventDefault();
    document.addEventListener("contextmenu", blockContextMenu);

    // Prevent swipe-back navigation
    const preventSwipeBack = (e) => {
      if (e.touches && e.touches.length === 1) {
        const x = e.touches[0].clientX;
        if (x < 25 || x > window.innerWidth - 25) {
          e.preventDefault();
        }
      }
    };
    document.addEventListener("touchstart", preventSwipeBack, { passive: false });

    // Add kiosk class to body
    document.body.classList.add("kiosk-mode");

    // Idle detection
    const events = ["click", "touchstart", "keydown", "scroll", "mousemove"];
    events.forEach((evt) => document.addEventListener(evt, resetIdleTimer, { passive: true }));
    resetIdleTimer();

    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("touchstart", preventSwipeBack);
      document.body.classList.remove("kiosk-mode");
      events.forEach((evt) => document.removeEventListener(evt, resetIdleTimer));
      clearTimeout(idleTimerRef.current);
      clearTimeout(promptTimerRef.current);
    };
  }, [kiosk, resetIdleTimer]);

  return { kiosk, showIdlePrompt, dismissIdlePrompt };
}
