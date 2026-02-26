import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../services/api";
import StepVenueInfo from "../components/onboarding/StepVenueInfo";
import StepLogoUpload from "../components/onboarding/StepLogoUpload";
import StepGameCollection from "../components/onboarding/StepGameCollection";
import StepMenuSetup from "../components/onboarding/StepMenuSetup";
import StepReview from "../components/onboarding/StepReview";

const STEPS = [
  { num: 1, label: "Venue Info" },
  { num: 2, label: "Logo" },
  { num: 3, label: "Games" },
  { num: 4, label: "Menu" },
  { num: 5, label: "Review" },
];

function getToken() {
  return localStorage.getItem("gmai_token");
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  return res.json();
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { step: urlStep } = useParams();
  const [currentStep, setCurrentStep] = useState(1);
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProgress = useCallback(async () => {
    try {
      const data = await apiGet("/api/v1/onboarding/progress");
      setProgress(data);
      // Resume at the right step
      const saved = data.onboarding_step || 0;
      if (data.onboarding_completed_at) {
        setCurrentStep(5); // show review if already done
      } else if (urlStep) {
        setCurrentStep(Math.min(parseInt(urlStep, 10) || 1, 5));
      } else if (saved > 0 && saved < 6) {
        setCurrentStep(Math.min(saved + 1, 5));
      }
    } catch {
      // fallback to step 1
    }
    setLoading(false);
  }, [urlStep]);

  useEffect(() => {
    loadProgress();
  }, [loadProgress]);

  const goToStep = (step) => {
    setCurrentStep(step);
    window.scrollTo(0, 0);
  };

  const handleStep1Save = async (data) => {
    await apiPost("/api/v1/onboarding/step/1", data);
    await loadProgress();
    goToStep(2);
  };

  const handleStep2Save = async () => {
    await loadProgress();
    goToStep(3);
  };

  const handleStep2Skip = () => goToStep(3);

  const handleStep3Save = async (data) => {
    await apiPost("/api/v1/onboarding/step/3", data);
    await loadProgress();
    goToStep(4);
  };

  const handleStep4Save = async (data) => {
    await apiPost("/api/v1/onboarding/step/4", data);
    await loadProgress();
    goToStep(5);
  };

  const handleComplete = async () => {
    await apiPost("/api/v1/onboarding/complete", {});
    navigate("/games");
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#0f1923", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#8899aa", fontSize: 18 }}>Loading...</div>
      </div>
    );
  }

  const venueId = progress?.venue_id || "";

  return (
    <div style={{ minHeight: "100vh", background: "#0f1923", padding: "20px 16px 40px" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Progress Bar */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 32, gap: 0 }}>
          {STEPS.map((s, i) => (
            <div key={s.num} style={{ display: "flex", alignItems: "center", flex: i < STEPS.length - 1 ? 1 : "none" }}>
              <div
                onClick={() => {
                  const maxStep = (progress?.onboarding_step || 0) + 1;
                  if (s.num <= maxStep || s.num <= currentStep) goToStep(s.num);
                }}
                style={{
                  width: 36, height: 36, borderRadius: "50%", display: "flex",
                  alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 14,
                  background: s.num === currentStep ? "#e94560" : s.num <= (progress?.onboarding_step || 0) ? "#2ecc71" : "#2a3a4a",
                  color: "#fff", cursor: "pointer", flexShrink: 0,
                  transition: "background 0.2s",
                }}
              >
                {s.num <= (progress?.onboarding_step || 0) && s.num !== currentStep ? "✓" : s.num}
              </div>
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: 3, margin: "0 4px",
                  background: s.num <= (progress?.onboarding_step || 0) ? "#2ecc71" : "#2a3a4a",
                  transition: "background 0.2s",
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24, paddingLeft: 2, paddingRight: 2 }}>
          {STEPS.map(s => (
            <span key={s.num} style={{
              fontSize: 11, color: s.num === currentStep ? "#e94560" : "#667788",
              textAlign: "center", width: 60,
            }}>
              {s.label}
            </span>
          ))}
        </div>

        {/* Back button */}
        {currentStep > 1 && (
          <button
            onClick={() => goToStep(currentStep - 1)}
            style={{
              background: "none", border: "none", color: "#3498db",
              cursor: "pointer", fontSize: 14, marginBottom: 16, padding: 0,
            }}
          >
            ← Back
          </button>
        )}

        {/* Current Step */}
        <div style={{ background: "#111d2b", borderRadius: 12, padding: 24, border: "1px solid #2a3a4a" }}>
          {currentStep === 1 && <StepVenueInfo data={progress || {}} onSave={handleStep1Save} />}
          {currentStep === 2 && <StepLogoUpload venueId={venueId} onSave={handleStep2Save} onSkip={handleStep2Skip} />}
          {currentStep === 3 && <StepGameCollection savedGames={progress?.games} onSave={handleStep3Save} />}
          {currentStep === 4 && <StepMenuSetup savedMenu={progress?.menu} onSave={handleStep4Save} />}
          {currentStep === 5 && <StepReview data={progress || {}} onComplete={handleComplete} onEditStep={goToStep} />}
        </div>
      </div>
    </div>
  );
}
