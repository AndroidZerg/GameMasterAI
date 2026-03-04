import { useState, useRef, useEffect } from "react";

/**
 * TeachingNavBar — fixed bottom navigation bar for teaching mode.
 * Appears on Setup, Rules, Strategy tabs.
 */
export default function TeachingNavBar({
  currentStep,
  totalSteps,
  isPlaying,
  isPaused,
  currentMode,
  playbackSpeed,
  onModeChange,
  onPrevious,
  onPlayPause,
  onNext,
  onSpeedChange,
  speedOptions,
}) {
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const modeRef = useRef(null);
  const speedRef = useRef(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (modeRef.current && !modeRef.current.contains(e.target)) setShowModeMenu(false);
      if (speedRef.current && !speedRef.current.contains(e.target)) setShowSpeedMenu(false);
    };
    document.addEventListener("pointerdown", handler);
    return () => document.removeEventListener("pointerdown", handler);
  }, []);

  const isActive = isPlaying || isPaused;
  const canPrev = currentStep > 0;
  const canNext = currentStep < totalSteps - 1;
  const isLegacy = currentMode === "legacy";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        background: "rgba(0,0,0,0.88)",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        padding: "8px 12px",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: isLegacy ? "center" : "space-between",
        gap: "6px",
        backdropFilter: "blur(12px)",
      }}
    >
      {/* Left — Teaching Mode toggle (hidden in legacy) */}
      {!isLegacy && (
        <div ref={modeRef} style={{ position: "relative" }}>
          <button
            onClick={() => { setShowModeMenu(!showModeMenu); setShowSpeedMenu(false); }}
            style={{
              minWidth: "44px",
              minHeight: "44px",
              padding: "6px 12px",
              borderRadius: "8px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            {currentMode === "walkthrough" ? "Walkthrough" : "Summary"}
            <span style={{ fontSize: "0.6rem" }}>▼</span>
          </button>

          {showModeMenu && (
            <div
              style={{
                position: "absolute",
                bottom: "100%",
                left: 0,
                marginBottom: "6px",
                background: "#1a1a2e",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px",
                overflow: "hidden",
                minWidth: "170px",
                boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
              }}
            >
              <ModeOption
                label="Walkthrough"
                desc="Step-by-step guided"
                active={currentMode === "walkthrough"}
                onClick={() => { onModeChange("walkthrough"); setShowModeMenu(false); }}
              />
              <ModeOption
                label="Summary"
                desc="Bullet reference"
                active={currentMode === "summary"}
                onClick={() => { onModeChange("summary"); setShowModeMenu(false); }}
              />
            </div>
          )}
        </div>
      )}

      {/* Center — Playback controls */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
        {/* Previous (hidden in legacy) */}
        {!isLegacy && (
          <button
            onClick={onPrevious}
            disabled={!canPrev}
            style={{
              ...navBtn,
              opacity: canPrev ? 1 : 0.3,
              cursor: canPrev ? "pointer" : "default",
            }}
            title="Previous step"
            aria-label="Previous step"
          >
            ◀
          </button>
        )}

        {/* Play / Pause */}
        <button
          onClick={onPlayPause}
          style={{
            ...navBtn,
            width: "48px",
            height: "48px",
            borderRadius: "50%",
            background: isActive ? "var(--accent, #e94560)" : "rgba(255,255,255,0.12)",
            color: "#fff",
            fontSize: "1.2rem",
          }}
          title={isPlaying ? "Pause" : isPaused ? "Resume" : "Play"}
          aria-label={isPlaying ? "Pause" : isPaused ? "Resume" : "Play step"}
        >
          {isPlaying ? "⏸" : "▶"}
        </button>

        {/* Next (hidden in legacy) */}
        {!isLegacy && (
          <button
            onClick={onNext}
            disabled={!canNext}
            style={{
              ...navBtn,
              opacity: canNext ? 1 : 0.3,
              cursor: canNext ? "pointer" : "default",
            }}
            title="Next step"
            aria-label="Next step"
          >
            ▶
          </button>
        )}
      </div>

      {/* Step indicator (hidden in legacy) */}
      {!isLegacy && (
        <div
          style={{
            color: "rgba(255,255,255,0.5)",
            fontSize: "0.75rem",
            fontFamily: "monospace",
            minWidth: "40px",
            textAlign: "center",
          }}
        >
          {totalSteps > 0 ? `${currentStep + 1}/${totalSteps}` : "—"}
        </div>
      )}

      {/* Right — Speed */}
      <div ref={speedRef} style={{ position: "relative" }}>
        <button
          onClick={() => { setShowSpeedMenu(!showSpeedMenu); setShowModeMenu(false); }}
          style={{
            minWidth: "44px",
            minHeight: "44px",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            fontSize: "0.8rem",
            fontWeight: 600,
            fontFamily: "monospace",
            cursor: "pointer",
          }}
        >
          {playbackSpeed}x
        </button>

        {showSpeedMenu && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              right: 0,
              marginBottom: "6px",
              background: "#1a1a2e",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "10px",
              overflow: "hidden",
              minWidth: "80px",
              boxShadow: "0 -4px 20px rgba(0,0,0,0.4)",
            }}
          >
            {(speedOptions || [0.75, 1.0, 1.25, 1.5, 2.0]).map((speed) => (
              <button
                key={speed}
                onClick={() => { onSpeedChange(speed); setShowSpeedMenu(false); }}
                style={{
                  display: "block",
                  width: "100%",
                  padding: "10px 16px",
                  border: "none",
                  background: playbackSpeed === speed ? "var(--accent, #e94560)" : "transparent",
                  color: playbackSpeed === speed ? "#fff" : "rgba(255,255,255,0.7)",
                  fontFamily: "monospace",
                  fontSize: "0.85rem",
                  fontWeight: playbackSpeed === speed ? 700 : 400,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {speed === playbackSpeed ? "✓ " : "  "}{speed}x
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mode option row ─────────────────────── */
function ModeOption({ label, desc, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        width: "100%",
        padding: "12px 14px",
        border: "none",
        background: active ? "var(--accent, #e94560)" : "transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.7)",
        cursor: "pointer",
        textAlign: "left",
        fontSize: "0.85rem",
      }}
    >
      <span style={{ fontSize: "1rem" }}>{active ? "●" : "○"}</span>
      <div>
        <div style={{ fontWeight: 600 }}>{label}</div>
        <div style={{ fontSize: "0.7rem", opacity: 0.7, marginTop: "2px" }}>{desc}</div>
      </div>
    </button>
  );
}

/* ── Shared button base ───────────────────── */
const navBtn = {
  minWidth: "44px",
  minHeight: "44px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  border: "none",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: "8px",
  fontSize: "1rem",
  cursor: "pointer",
};
